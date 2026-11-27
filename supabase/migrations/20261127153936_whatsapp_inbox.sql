-- =====================================================================
-- Caixa de entrada do WhatsApp (API oficial da Meta, número de cada cliente)
-- 1. whatsapp_contas: o número conectado de cada empresa (IDs públicos da
--    Meta, status e o "verify token" do webhook). Token de acesso e App
--    Secret ficam no Vault (wa_token:<conta>, wa_app_secret:<conta>) e só a
--    service role lê, por whatsapp_segredos().
-- 2. whatsapp_conversas: uma por contato (wa_id) por empresa, ligada ao lead.
--    Visível para o admin, para o responsável e, se sem responsável, para a
--    equipe da empresa. A equipe só altera responsável, não lidas e status.
-- 3. whatsapp_mensagens: entrada e saída, com status de entrega. Gravadas só
--    pelas Edge Functions (service role).
-- 4. whatsapp_conectar() / whatsapp_desconectar(): só o admin da empresa.
-- 5. Realtime nas conversas e mensagens (respeita o RLS).
-- =====================================================================

-- 1. Contas -------------------------------------------------------------
create table if not exists public.whatsapp_contas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null unique references public.empresas(id) on delete cascade,
  phone_number_id text not null unique check (phone_number_id ~ '^[0-9]{5,30}$'),
  waba_id text not null check (waba_id ~ '^[0-9]{5,30}$'),
  numero text check (char_length(numero) <= 40),
  nome_verificado text check (char_length(nome_verificado) <= 120),
  verify_token text not null default encode(extensions.gen_random_bytes(16), 'hex'),
  status text not null default 'pendente' check (status in ('pendente', 'conectado', 'erro')),
  status_detalhe text check (char_length(status_detalhe) <= 300),
  ultimo_evento_em timestamptz,
  created_at timestamptz not null default now()
);
alter table public.whatsapp_contas enable row level security;
revoke all on public.whatsapp_contas from anon, authenticated;
grant select on public.whatsapp_contas to authenticated;
drop policy if exists whatsapp_contas_select on public.whatsapp_contas;
create policy whatsapp_contas_select on public.whatsapp_contas for select to authenticated
  using ( empresa_id = (select private.minha_empresa_id()) or (select private.is_superadmin()) );

-- 2. Conversas ----------------------------------------------------------
create table if not exists public.whatsapp_conversas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  wa_id text not null check (wa_id ~ '^[0-9]{8,20}$'),
  nome_contato text check (char_length(nome_contato) <= 120),
  lead_id uuid references public.leads(id) on delete set null,
  responsavel_id uuid references public.perfis(id) on delete set null,
  status text not null default 'aberta' check (status in ('aberta', 'arquivada')),
  nao_lidas integer not null default 0 check (nao_lidas >= 0),
  ultima_previa text check (char_length(ultima_previa) <= 160),
  ultima_mensagem_em timestamptz,
  -- Última mensagem do contato: abre a janela de 24h para texto livre
  ultima_entrada_em timestamptz,
  created_at timestamptz not null default now(),
  unique (empresa_id, wa_id)
);
create index if not exists whatsapp_conversas_lista on public.whatsapp_conversas (empresa_id, ultima_mensagem_em desc);
create index if not exists whatsapp_conversas_lead on public.whatsapp_conversas (lead_id);

create or replace function private.pode_ver_conversa(c public.whatsapp_conversas)
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.is_superadmin()
      or ( c.empresa_id = private.minha_empresa_id()
           and ( private.meu_cargo() = 'admin' or c.responsavel_id = auth.uid() or c.responsavel_id is null ) )
$$;
revoke all on function private.pode_ver_conversa(public.whatsapp_conversas) from public, anon;
grant execute on function private.pode_ver_conversa(public.whatsapp_conversas) to authenticated;

alter table public.whatsapp_conversas enable row level security;
revoke all on public.whatsapp_conversas from anon, authenticated;
grant select on public.whatsapp_conversas to authenticated;
grant update (responsavel_id, nao_lidas, status) on public.whatsapp_conversas to authenticated;
drop policy if exists whatsapp_conversas_select on public.whatsapp_conversas;
create policy whatsapp_conversas_select on public.whatsapp_conversas for select to authenticated
  using ( private.pode_ver_conversa(whatsapp_conversas) );
drop policy if exists whatsapp_conversas_update on public.whatsapp_conversas;
create policy whatsapp_conversas_update on public.whatsapp_conversas for update to authenticated
  using ( private.pode_ver_conversa(whatsapp_conversas) )
  -- Vendedor só assume para si ou devolve para a fila; admin distribui
  with check ( (select private.is_superadmin())
               or ( empresa_id = (select private.minha_empresa_id())
                    and ( (select private.meu_cargo()) = 'admin' or responsavel_id is null or responsavel_id = (select auth.uid()) ) ) );

-- Responsável precisa ser da mesma empresa
create or replace function private.validar_responsavel_conversa()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.responsavel_id is not null
     and not exists (select 1 from public.perfis p where p.id = new.responsavel_id and p.empresa_id = new.empresa_id) then
    raise exception 'Responsável precisa ser da mesma empresa' using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function private.validar_responsavel_conversa() from public, anon, authenticated;
drop trigger if exists whatsapp_conversas_responsavel on public.whatsapp_conversas;
create trigger whatsapp_conversas_responsavel before insert or update of responsavel_id on public.whatsapp_conversas
  for each row execute function private.validar_responsavel_conversa();

-- 3. Mensagens ----------------------------------------------------------
create table if not exists public.whatsapp_mensagens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  conversa_id uuid not null references public.whatsapp_conversas(id) on delete cascade,
  wa_message_id text unique,
  direcao text not null check (direcao in ('entrada', 'saida')),
  tipo text not null default 'text' check (tipo in ('text', 'image', 'audio', 'video', 'document', 'sticker', 'location', 'contacts', 'template', 'reaction', 'outro')),
  texto text check (char_length(texto) <= 4096),
  midia_id text,
  midia_mime text,
  midia_nome text,
  status text not null default 'recebida' check (status in ('recebida', 'enviando', 'enviada', 'entregue', 'lida', 'falhou')),
  erro text check (char_length(erro) <= 500),
  autor_id uuid references public.perfis(id) on delete set null,
  criado_em timestamptz not null default now()
);
create index if not exists whatsapp_mensagens_conversa on public.whatsapp_mensagens (conversa_id, criado_em);

alter table public.whatsapp_mensagens enable row level security;
revoke all on public.whatsapp_mensagens from anon, authenticated;
grant select on public.whatsapp_mensagens to authenticated;
drop policy if exists whatsapp_mensagens_select on public.whatsapp_mensagens;
create policy whatsapp_mensagens_select on public.whatsapp_mensagens for select to authenticated
  using ( exists (select 1 from public.whatsapp_conversas c where c.id = whatsapp_mensagens.conversa_id) );

-- 4. Conectar / desconectar (admin) e segredos (service role) -------------
create or replace function private.guardar_segredo(nome text, valor text)
returns void language plpgsql security definer set search_path = ''
as $$
declare existente uuid;
begin
  select id into existente from vault.secrets where name = nome;
  if existente is null then perform vault.create_secret(valor, nome);
  else perform vault.update_secret(existente, valor); end if;
end $$;
revoke all on function private.guardar_segredo(text, text) from public, anon, authenticated;

create or replace function public.whatsapp_conectar(p_phone_number_id text, p_waba_id text, p_token text, p_app_secret text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_emp uuid; v_id uuid;
begin
  v_emp := private.minha_empresa_id();
  if v_emp is null or not private.is_admin_da_empresa(v_emp) then
    raise exception 'Só o administrador da empresa conecta o WhatsApp' using errcode = '42501';
  end if;
  if coalesce(p_phone_number_id, '') !~ '^[0-9]{5,30}$' or coalesce(p_waba_id, '') !~ '^[0-9]{5,30}$' then
    raise exception 'IDs da Meta inválidos: use só os números' using errcode = '22023';
  end if;
  if char_length(coalesce(p_token, '')) < 20 or char_length(p_token) > 2000 then
    raise exception 'Token de acesso inválido' using errcode = '22023';
  end if;
  if coalesce(p_app_secret, '') !~ '^[0-9a-f]{32}$' then
    raise exception 'App Secret inválido (32 caracteres)' using errcode = '22023';
  end if;

  insert into public.whatsapp_contas (empresa_id, phone_number_id, waba_id, status, status_detalhe)
  values (v_emp, p_phone_number_id, p_waba_id, 'pendente', null)
  on conflict (empresa_id) do update
    set phone_number_id = excluded.phone_number_id, waba_id = excluded.waba_id, status = 'pendente', status_detalhe = null
  returning id into v_id;

  perform private.guardar_segredo('wa_token:' || v_id, trim(p_token));
  perform private.guardar_segredo('wa_app_secret:' || v_id, p_app_secret);

  insert into public.logs_auditoria (empresa_id, usuario_id, acao, entidade, entidade_id, detalhes)
  values (v_emp, auth.uid(), 'conectou_whatsapp', 'whatsapp', v_id, 'Número ' || p_phone_number_id);
  return v_id;
end $$;
revoke all on function public.whatsapp_conectar(text, text, text, text) from public, anon;
grant execute on function public.whatsapp_conectar(text, text, text, text) to authenticated;

create or replace function public.whatsapp_desconectar()
returns void language plpgsql security definer set search_path = ''
as $$
declare v_emp uuid; v_id uuid;
begin
  v_emp := private.minha_empresa_id();
  if v_emp is null or not private.is_admin_da_empresa(v_emp) then
    raise exception 'Só o administrador da empresa desconecta o WhatsApp' using errcode = '42501';
  end if;
  select id into v_id from public.whatsapp_contas where empresa_id = v_emp;
  if v_id is null then return; end if;
  delete from vault.secrets where name in ('wa_token:' || v_id, 'wa_app_secret:' || v_id);
  delete from public.whatsapp_contas where id = v_id;
  insert into public.logs_auditoria (empresa_id, usuario_id, acao, entidade, entidade_id, detalhes)
  values (v_emp, auth.uid(), 'desconectou_whatsapp', 'whatsapp', v_id, 'Conversas mantidas');
end $$;
revoke all on function public.whatsapp_desconectar() from public, anon;
grant execute on function public.whatsapp_desconectar() to authenticated;

create or replace function public.whatsapp_segredos(p_conta uuid)
returns table (token text, app_secret text) language sql stable security definer set search_path = ''
as $$
  select (select decrypted_secret from vault.decrypted_secrets where name = 'wa_token:' || p_conta),
         (select decrypted_secret from vault.decrypted_secrets where name = 'wa_app_secret:' || p_conta)
$$;
revoke all on function public.whatsapp_segredos(uuid) from public, anon, authenticated;
grant execute on function public.whatsapp_segredos(uuid) to service_role;

-- 5. Realtime -------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'whatsapp_conversas') then
      alter publication supabase_realtime add table public.whatsapp_conversas;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'whatsapp_mensagens') then
      alter publication supabase_realtime add table public.whatsapp_mensagens;
    end if;
  end if;
end $$;
