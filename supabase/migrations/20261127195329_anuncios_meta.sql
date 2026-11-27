-- =====================================================================
-- Anúncios da Meta: Lead Ads (formulário instantâneo) e Click-to-WhatsApp
-- 1. leads.campanha e leads.anuncio: de qual campanha/anúncio o lead veio
--    (Lead Ads, Click-to-WhatsApp ou utm_campaign do formulário do site).
-- 2. whatsapp_conversas: anúncio que abriu a conversa (título, link, quando).
--    Conversa iniciada por anúncio é gratuita por 72h na tabela da Meta.
-- 3. meta_contas: Página do Facebook conectada por empresa (manual, como o
--    WhatsApp). Token da Página e App Secret no Vault.
-- 4. meta_leads: registro de cada lead recebido do formulário (deduplica o
--    reenvio da Meta e mostra ao admin o que chegou, com erro se houve).
-- Leitura: admin da empresa (meta_*) / membros (campos novos de leads e
-- conversas seguem o RLS que já existe). Escrita: só service role e RPCs.
-- =====================================================================

-- 1. Campanha no lead --------------------------------------------------------
alter table public.leads
  add column if not exists campanha text check (char_length(campanha) <= 200),
  add column if not exists anuncio text check (char_length(anuncio) <= 200);
grant select (campanha, anuncio), insert (campanha, anuncio), update (campanha, anuncio) on public.leads to authenticated;
create index if not exists leads_empresa_campanha on public.leads (empresa_id, campanha) where campanha is not null;

-- 2. Anúncio que abriu a conversa no WhatsApp ----------------------------------
alter table public.whatsapp_conversas
  add column if not exists anuncio_titulo text check (char_length(anuncio_titulo) <= 300),
  add column if not exists anuncio_url text check (char_length(anuncio_url) <= 1000),
  add column if not exists anuncio_em timestamptz;

-- 3. Página conectada -------------------------------------------------------------
create table if not exists public.meta_contas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null unique references public.empresas(id) on delete cascade,
  page_id text not null unique check (page_id ~ '^[0-9]{5,30}$'),
  page_nome text check (char_length(page_nome) <= 200),
  verify_token text not null default encode(extensions.gen_random_bytes(16), 'hex'),
  status text not null default 'pendente' check (status in ('pendente', 'conectado', 'erro')),
  status_detalhe text check (char_length(status_detalhe) <= 300),
  ultimo_evento_em timestamptz,
  created_at timestamptz not null default now()
);
alter table public.meta_contas enable row level security;
revoke all on public.meta_contas from anon, authenticated;
grant select on public.meta_contas to authenticated;
drop policy if exists meta_contas_select on public.meta_contas;
create policy meta_contas_select on public.meta_contas for select to authenticated
  using ( private.is_admin_da_empresa(empresa_id) or (select private.is_superadmin()) );

-- 4. Leads recebidos dos formulários ------------------------------------------------
create table if not exists public.meta_leads (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  leadgen_id text not null unique check (leadgen_id ~ '^[0-9]{5,40}$'),
  form_id text check (char_length(form_id) <= 40),
  formulario text check (char_length(formulario) <= 200),
  campanha text check (char_length(campanha) <= 200),
  anuncio text check (char_length(anuncio) <= 200),
  lead_id uuid references public.leads(id) on delete set null,
  resultado text not null default 'pendente' check (resultado in ('pendente', 'criado', 'duplicado', 'erro')),
  erro text check (char_length(erro) <= 500),
  recebido_em timestamptz not null default now()
);
create index if not exists meta_leads_empresa on public.meta_leads (empresa_id, recebido_em desc);
alter table public.meta_leads enable row level security;
revoke all on public.meta_leads from anon, authenticated;
grant select on public.meta_leads to authenticated;
drop policy if exists meta_leads_select on public.meta_leads;
create policy meta_leads_select on public.meta_leads for select to authenticated
  using ( private.is_admin_da_empresa(empresa_id) or (select private.is_superadmin()) );

-- 5. Conectar / desconectar (admin) e segredos (service role) -----------------------
-- p_app_secret nulo: reaproveita o App Secret do WhatsApp da empresa (mesmo app da Meta).
create or replace function public.meta_conectar(p_page_id text, p_token text, p_app_secret text default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_emp uuid; v_id uuid; v_segredo text := nullif(trim(coalesce(p_app_secret, '')), '');
begin
  v_emp := private.minha_empresa_id();
  if v_emp is null or not private.is_admin_da_empresa(v_emp) then
    raise exception 'Só o administrador da empresa conecta os anúncios' using errcode = '42501';
  end if;
  if coalesce(p_page_id, '') !~ '^[0-9]{5,30}$' then
    raise exception 'ID da Página inválido: use só os números' using errcode = '22023';
  end if;
  if char_length(coalesce(p_token, '')) < 20 or char_length(p_token) > 2000 then
    raise exception 'Token de acesso inválido' using errcode = '22023';
  end if;
  if v_segredo is null then
    select s.decrypted_secret into v_segredo
      from public.whatsapp_contas w join vault.decrypted_secrets s on s.name = 'wa_app_secret:' || w.id
     where w.empresa_id = v_emp;
    if v_segredo is null then
      raise exception 'Informe o App Secret do app da Meta' using errcode = '22023';
    end if;
  end if;
  if lower(v_segredo) !~ '^[0-9a-f]{32}$' then
    raise exception 'App Secret inválido (32 caracteres)' using errcode = '22023';
  end if;

  insert into public.meta_contas (empresa_id, page_id, status, status_detalhe)
  values (v_emp, p_page_id, 'pendente', null)
  on conflict (empresa_id) do update
    set page_id = excluded.page_id, status = 'pendente', status_detalhe = null, page_nome = null
  returning id into v_id;

  perform private.guardar_segredo('meta_token:' || v_id, trim(p_token));
  perform private.guardar_segredo('meta_app_secret:' || v_id, lower(v_segredo));

  insert into public.logs_auditoria (empresa_id, usuario_id, acao, entidade, entidade_id, detalhes)
  values (v_emp, auth.uid(), 'conectou_anuncios_meta', 'meta', v_id, 'Página ' || p_page_id);
  return v_id;
end $$;
revoke all on function public.meta_conectar(text, text, text) from public, anon;
grant execute on function public.meta_conectar(text, text, text) to authenticated;

create or replace function public.meta_desconectar()
returns void language plpgsql security definer set search_path = ''
as $$
declare v_emp uuid; v_id uuid;
begin
  v_emp := private.minha_empresa_id();
  if v_emp is null or not private.is_admin_da_empresa(v_emp) then
    raise exception 'Só o administrador da empresa desconecta os anúncios' using errcode = '42501';
  end if;
  select id into v_id from public.meta_contas where empresa_id = v_emp;
  if v_id is null then return; end if;
  delete from vault.secrets where name in ('meta_token:' || v_id, 'meta_app_secret:' || v_id);
  delete from public.meta_contas where id = v_id;
  insert into public.logs_auditoria (empresa_id, usuario_id, acao, entidade, entidade_id, detalhes)
  values (v_emp, auth.uid(), 'desconectou_anuncios_meta', 'meta', v_id, 'Leads recebidos mantidos');
end $$;
revoke all on function public.meta_desconectar() from public, anon;
grant execute on function public.meta_desconectar() to authenticated;

create or replace function public.meta_segredos(p_conta uuid)
returns table (token text, app_secret text) language sql stable security definer set search_path = ''
as $$
  select (select decrypted_secret from vault.decrypted_secrets where name = 'meta_token:' || p_conta),
         (select decrypted_secret from vault.decrypted_secrets where name = 'meta_app_secret:' || p_conta)
$$;
revoke all on function public.meta_segredos(uuid) from public, anon, authenticated;
grant execute on function public.meta_segredos(uuid) to service_role;
