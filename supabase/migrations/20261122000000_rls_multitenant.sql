-- =====================================================================
-- Dons CRM — RLS multi-tenant
-- ---------------------------------------------------------------------
-- Problema: RLS desligado em empresas/leads/perfis/etapas_funil e o papel
-- `anon` com todos os privilégios em todas as tabelas. Qualquer pessoa com a
-- chave publishable (pública, vai no JS do site) lia/alterava/apagava tudo.
-- Além disso havia policies "permitir tudo para autenticados" e policies
-- que consultavam `perfis` dentro de `perfis` (recursão infinita).
--
-- Solução:
--   1. Funções auxiliares SECURITY DEFINER num schema NÃO exposto (private),
--      que leem o perfil do usuário sem passar pelo RLS → sem recursão.
--   2. Remove todas as policies antigas e cria um conjunto único e limpo.
--   3. Liga RLS em todas as tabelas.
--   4. Tira todos os privilégios de `anon` e TRUNCATE/TRIGGER/REFERENCES de
--      `authenticated` (TRUNCATE ignora RLS).
--   5. Triggers que impedem escalada de privilégio (cargo/empresa/plano).
--
-- Regras de acesso:
--   superadmin → tudo
--   admin      → tudo da própria empresa (dados, funil, equipe, identidade
--                visual), mas não altera plano/validade/ativo/token
--   vendedor   → leads atribuídos a ele ou sem dono, anotações da empresa,
--                as próprias tarefas; lê a empresa, o funil e a equipe
--   anon       → nada (webhook e convite usam a service key no servidor)
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Funções auxiliares
-- ---------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.minha_empresa_id()
returns uuid language sql stable security definer set search_path = ''
as $$ select empresa_id from public.perfis where id = (select auth.uid()) $$;

create or replace function private.meu_cargo()
returns text language sql stable security definer set search_path = ''
as $$ select role from public.perfis where id = (select auth.uid()) $$;

create or replace function private.is_superadmin()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce((select role = 'superadmin' from public.perfis where id = (select auth.uid())), false) $$;

create or replace function private.is_admin_da_empresa(alvo uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.perfis
    where id = (select auth.uid()) and role = 'admin' and empresa_id = alvo
  )
$$;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;

-- Funções antigas (baseadas em tenants/profiles) não podem ser chamadas pela API
revoke execute on function public.get_user_role()      from public, anon, authenticated;
revoke execute on function public.get_user_tenant_id() from public, anon, authenticated;
revoke execute on function public.is_superadmin()      from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Remove todas as policies existentes das tabelas do app
-- ---------------------------------------------------------------------
do $$
declare p record;
begin
  for p in
    select tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in ('empresas','perfis','etapas_funil','leads','lead_anotacoes',
                        'tarefas','lead_movimentos','logs_auditoria','tenants','profiles')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 3. Privilégios
-- ---------------------------------------------------------------------
revoke all on public.empresas, public.perfis, public.etapas_funil, public.leads,
              public.lead_anotacoes, public.tarefas, public.lead_movimentos,
              public.logs_auditoria, public.tenants, public.profiles
  from anon;

revoke truncate, trigger, references
  on public.empresas, public.perfis, public.etapas_funil, public.leads,
     public.lead_anotacoes, public.tarefas, public.lead_movimentos,
     public.logs_auditoria
  from authenticated;

-- Tabelas legadas (tenants/profiles) — sem uso pelo app atual; fecha totalmente.
revoke all on public.tenants, public.profiles from authenticated;

-- Novas tabelas criadas no futuro não ganham privilégios para anon automaticamente
alter default privileges in schema public revoke all on tables from anon;

-- ---------------------------------------------------------------------
-- 4. Liga RLS em tudo
-- ---------------------------------------------------------------------
alter table public.empresas        enable row level security;
alter table public.perfis          enable row level security;
alter table public.etapas_funil    enable row level security;
alter table public.leads           enable row level security;
alter table public.lead_anotacoes  enable row level security;
alter table public.tarefas         enable row level security;
alter table public.lead_movimentos enable row level security;
alter table public.logs_auditoria  enable row level security;
alter table public.tenants         enable row level security;
alter table public.profiles        enable row level security;

-- ---------------------------------------------------------------------
-- 5. Policies
-- ---------------------------------------------------------------------

-- EMPRESAS
create policy empresas_select on public.empresas for select to authenticated
  using ( id = (select private.minha_empresa_id()) or (select private.is_superadmin()) );
create policy empresas_insert on public.empresas for insert to authenticated
  with check ( (select private.is_superadmin()) );
create policy empresas_update on public.empresas for update to authenticated
  using      ( (select private.is_superadmin()) or private.is_admin_da_empresa(id) )
  with check ( (select private.is_superadmin()) or private.is_admin_da_empresa(id) );
create policy empresas_delete on public.empresas for delete to authenticated
  using ( (select private.is_superadmin()) );

-- PERFIS
create policy perfis_select on public.perfis for select to authenticated
  using ( id = (select auth.uid())
          or empresa_id = (select private.minha_empresa_id())
          or (select private.is_superadmin()) );
create policy perfis_insert on public.perfis for insert to authenticated
  with check ( (select private.is_superadmin()) );
create policy perfis_update on public.perfis for update to authenticated
  using      ( id = (select auth.uid()) or private.is_admin_da_empresa(empresa_id) or (select private.is_superadmin()) )
  with check ( id = (select auth.uid()) or private.is_admin_da_empresa(empresa_id) or (select private.is_superadmin()) );
create policy perfis_delete on public.perfis for delete to authenticated
  using ( (private.is_admin_da_empresa(empresa_id) and id <> (select auth.uid()))
          or (select private.is_superadmin()) );

-- ETAPAS DO FUNIL
create policy etapas_select on public.etapas_funil for select to authenticated
  using ( empresa_id = (select private.minha_empresa_id()) or (select private.is_superadmin()) );
create policy etapas_insert on public.etapas_funil for insert to authenticated
  with check ( private.is_admin_da_empresa(empresa_id) or (select private.is_superadmin()) );
create policy etapas_update on public.etapas_funil for update to authenticated
  using      ( private.is_admin_da_empresa(empresa_id) or (select private.is_superadmin()) )
  with check ( private.is_admin_da_empresa(empresa_id) or (select private.is_superadmin()) );
create policy etapas_delete on public.etapas_funil for delete to authenticated
  using ( private.is_admin_da_empresa(empresa_id) or (select private.is_superadmin()) );

-- LEADS (admin: todos da empresa; vendedor: os seus ou sem dono)
create policy leads_select on public.leads for select to authenticated
  using ( (select private.is_superadmin())
          or ( empresa_id = (select private.minha_empresa_id())
               and ( (select private.meu_cargo()) = 'admin'
                     or vendedor_id = (select auth.uid())
                     or vendedor_id is null ) ) );
create policy leads_insert on public.leads for insert to authenticated
  with check ( (select private.is_superadmin())
               or empresa_id = (select private.minha_empresa_id()) );
create policy leads_update on public.leads for update to authenticated
  using ( (select private.is_superadmin())
          or ( empresa_id = (select private.minha_empresa_id())
               and ( (select private.meu_cargo()) = 'admin'
                     or vendedor_id = (select auth.uid())
                     or vendedor_id is null ) ) )
  with check ( (select private.is_superadmin())
               or empresa_id = (select private.minha_empresa_id()) );
create policy leads_delete on public.leads for delete to authenticated
  using ( (select private.is_superadmin()) or private.is_admin_da_empresa(empresa_id) );

-- ANOTAÇÕES DOS LEADS
create policy anotacoes_select on public.lead_anotacoes for select to authenticated
  using ( empresa_id = (select private.minha_empresa_id()) or (select private.is_superadmin()) );
create policy anotacoes_insert on public.lead_anotacoes for insert to authenticated
  with check ( (empresa_id = (select private.minha_empresa_id()) and usuario_id = (select auth.uid()))
               or (select private.is_superadmin()) );
create policy anotacoes_delete on public.lead_anotacoes for delete to authenticated
  using ( (empresa_id = (select private.minha_empresa_id())
           and (usuario_id = (select auth.uid()) or (select private.meu_cargo()) = 'admin'))
          or (select private.is_superadmin()) );

-- TAREFAS (admin: todas da empresa; vendedor: as suas)
create policy tarefas_all on public.tarefas for all to authenticated
  using ( (select private.is_superadmin())
          or ( empresa_id = (select private.minha_empresa_id())
               and ( (select private.meu_cargo()) = 'admin' or vendedor_id = (select auth.uid()) ) ) )
  with check ( (select private.is_superadmin())
               or ( empresa_id = (select private.minha_empresa_id())
                    and ( (select private.meu_cargo()) = 'admin' or vendedor_id = (select auth.uid()) ) ) );

-- MOVIMENTOS (visíveis se o lead for visível — usa o RLS de leads)
create policy movimentos_select on public.lead_movimentos for select to authenticated
  using ( exists (select 1 from public.leads l where l.id = lead_id) );
create policy movimentos_insert on public.lead_movimentos for insert to authenticated
  with check ( usuario_id = (select auth.uid())
               and exists (select 1 from public.leads l where l.id = lead_id) );

-- LOGS DE AUDITORIA
create policy logs_select on public.logs_auditoria for select to authenticated
  using ( private.is_admin_da_empresa(empresa_id) or (select private.is_superadmin()) );
create policy logs_insert on public.logs_auditoria for insert to authenticated
  with check ( usuario_id = (select auth.uid())
               and (empresa_id = (select private.minha_empresa_id()) or (select private.is_superadmin())) );

-- tenants/profiles: RLS ligado, sem policies → inacessíveis pela API.

-- ---------------------------------------------------------------------
-- 6. Triggers contra escalada de privilégio
-- ---------------------------------------------------------------------

-- 6a. Perfis: ninguém altera o próprio cargo/empresa; admin só define
--     'admin'/'vendedor' para membros da própria empresa; ninguém além do
--     superadmin cria superadmin. Service role e migrations passam livre.
create or replace function public.check_perfil_update()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if current_user in ('postgres', 'service_role', 'supabase_admin') or private.is_superadmin() then
    return new;
  end if;

  if new.empresa_id is distinct from old.empresa_id then
    raise exception 'Acesso negado: não é permitido alterar a empresa de um perfil.';
  end if;

  if new.role is distinct from old.role then
    if old.id = (select auth.uid()) then
      raise exception 'Acesso negado: não é permitido alterar o próprio cargo.';
    end if;
    if not private.is_admin_da_empresa(old.empresa_id)
       or new.role not in ('admin', 'vendedor')
       or old.role = 'superadmin' then
      raise exception 'Acesso negado: alteração de cargo não permitida.';
    end if;
  end if;

  return new;
end;
$$;
-- (o trigger tr_check_perfil_update já existe e passa a usar esta versão)

-- 6b. Empresas: campos comerciais/sensíveis só o superadmin altera.
create or replace function public.check_empresa_update()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if current_user in ('postgres', 'service_role', 'supabase_admin') or private.is_superadmin() then
    return new;
  end if;

  if new.ativo         is distinct from old.ativo
  or new.valido_ate    is distinct from old.valido_ate
  or new.plano         is distinct from old.plano
  or new.status        is distinct from old.status
  or new.webhook_token is distinct from old.webhook_token
  or new.email         is distinct from old.email then
    raise exception 'Acesso negado: apenas o suporte pode alterar plano, validade, status ou token.';
  end if;

  return new;
end;
$$;

drop trigger if exists tr_check_empresa_update on public.empresas;
create trigger tr_check_empresa_update
  before update on public.empresas
  for each row execute function public.check_empresa_update();

revoke execute on function public.check_perfil_update()  from public, anon, authenticated;
revoke execute on function public.check_empresa_update() from public, anon, authenticated;

commit;
