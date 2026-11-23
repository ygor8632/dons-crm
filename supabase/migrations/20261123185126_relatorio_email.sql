-- =====================================================================
-- Relatório mensal por e-mail
-- 1. empresas: relatorio_email_ativo (padrão ligado) e até 5 e-mails extras
--    que o admin cadastra (dono, diretoria). Os admins sempre recebem.
-- 2. relatorios_enviados: registro de cada envio (mensal ou prévia). Um índice
--    único impede mandar o mesmo mês duas vezes para a mesma empresa.
--    Leitura: admin da empresa e superadmin. Escrita: só a função de envio
--    (service role).
-- 3. Token do agendamento no Vault: o pg_cron manda o token no cabeçalho e a
--    Edge Function confere com relatorio_token_valido() (só service role).
--    O token é gerado aqui dentro e nunca sai do banco.
-- 4. pg_cron: dia 1, 11:00 UTC (8h de Brasília), chama a Edge Function
--    relatorio-mensal pelo pg_net.
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- 1. Preferências na empresa ------------------------------------------
create or replace function private.emails_validos(lista text[])
returns boolean language sql immutable set search_path = ''
as $$
  select coalesce(bool_and(e ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(e) <= 254), true)
  from unnest(lista) e
$$;

alter table public.empresas
  add column if not exists relatorio_email_ativo boolean not null default true,
  add column if not exists relatorio_emails_extras text[] not null default '{}';

alter table public.empresas drop constraint if exists empresas_relatorio_emails_extras_ok;
alter table public.empresas add constraint empresas_relatorio_emails_extras_ok
  check (cardinality(relatorio_emails_extras) <= 5 and private.emails_validos(relatorio_emails_extras));

-- 2. Registro de envios ------------------------------------------------
create table if not exists public.relatorios_enviados (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  mes date not null check (extract(day from mes) = 1),
  tipo text not null check (tipo in ('mensal', 'previa')),
  destinatarios integer not null default 0,
  erro text check (char_length(erro) <= 500),
  enviado_em timestamptz not null default now()
);
create unique index if not exists relatorios_enviados_um_por_mes
  on public.relatorios_enviados (empresa_id, mes) where tipo = 'mensal' and erro is null;
create index if not exists relatorios_enviados_empresa on public.relatorios_enviados (empresa_id, enviado_em desc);

alter table public.relatorios_enviados enable row level security;
revoke all on public.relatorios_enviados from anon, authenticated;
grant select on public.relatorios_enviados to authenticated;
drop policy if exists relatorios_enviados_select on public.relatorios_enviados;
create policy relatorios_enviados_select on public.relatorios_enviados for select to authenticated
  using ( private.is_admin_da_empresa(empresa_id) or (select private.is_superadmin()) );

-- 3. Token do agendamento ----------------------------------------------
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'relatorio_cron_token') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'relatorio_cron_token', 'Token que o pg_cron envia para a Edge Function relatorio-mensal');
  end if;
end $$;

create or replace function public.relatorio_token_valido(token text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'relatorio_cron_token' and decrypted_secret = token)
$$;
revoke all on function public.relatorio_token_valido(text) from public, anon, authenticated;
grant execute on function public.relatorio_token_valido(text) to service_role;

-- 4. Agendamento --------------------------------------------------------
create or replace function private.disparar_relatorio_mensal(simular boolean default false)
returns bigint language plpgsql security definer set search_path = ''
as $$
declare token text;
begin
  select decrypted_secret into token from vault.decrypted_secrets where name = 'relatorio_cron_token';
  return net.http_post(
    url := 'https://wvsbtrgwkzdqkjcexdsh.supabase.co/functions/v1/relatorio-mensal',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-relatorio-token', token),
    body := jsonb_build_object('modo', 'mensal', 'simular', simular),
    timeout_milliseconds := 60000
  );
end $$;
revoke all on function private.disparar_relatorio_mensal(boolean) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'relatorio-mensal') then
    perform cron.unschedule('relatorio-mensal');
  end if;
  perform cron.schedule('relatorio-mensal', '0 11 1 * *', 'select private.disparar_relatorio_mensal()');
end $$;
