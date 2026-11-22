-- =====================================================================
-- Dons CRM — Frente "Adoção e registro"
-- ---------------------------------------------------------------------
-- 1. leads: situação (aberto/ganho/perdido), motivo de perda, data de
--    fechamento, probabilidade própria, CPF/CNPJ, desde quando está na
--    etapa, última atividade e chave de telefone para achar duplicados.
-- 2. etapas_funil: probabilidade padrão e prazo (dias) para "parado".
-- 3. lead_atividades: registro do que aconteceu com o lead (clique no
--    WhatsApp, mudança de etapa, ganho/perdido, contato repetido pelo
--    webhook, importação). Visível para quem vê o lead.
-- 4. modelos_mensagem: mensagens prontas de WhatsApp por etapa.
-- 5. Triggers: mudar de etapa reinicia o "desde"; anotação, tarefa e
--    atividade atualizam a última atividade do lead.
-- A coluna legada leads.status (sem uso no app) fica como está.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Chave de telefone: DDD + 8 últimos dígitos, sem o 55 e sem o nono
-- dígito, para que "(11) 99999-0000" e "+55 11 9999-0000" coincidam.
-- ---------------------------------------------------------------------
create or replace function public.chave_telefone(tel text)
returns text language sql immutable parallel safe set search_path = ''
as $$
  with d as (select regexp_replace(coalesce(tel, ''), '\D', '', 'g') as v),
       s as (select case when length(v) >= 12 and left(v, 2) = '55' then substr(v, 3) else v end as v from d)
  select case
           when length(v) >= 10 then left(v, 2) || right(v, 8)
           when length(v) >= 8 then right(v, 8)
           else null
         end
  from s
$$;
grant execute on function public.chave_telefone(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- 1. leads
-- ---------------------------------------------------------------------
alter table public.leads
  add column if not exists situacao text not null default 'aberto',
  add column if not exists motivo_perda text,
  add column if not exists fechado_em timestamptz,
  add column if not exists probabilidade smallint,
  add column if not exists documento text,
  add column if not exists etapa_desde timestamptz not null default now(),
  add column if not exists ultima_atividade_em timestamptz not null default now(),
  add column if not exists chave_telefone text generated always as (public.chave_telefone(telefone)) stored;

do $$ begin
  alter table public.leads add constraint leads_situacao_valida check (situacao in ('aberto', 'ganho', 'perdido'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.leads add constraint leads_probabilidade_valida check (probabilidade is null or probabilidade between 0 and 100);
exception when duplicate_object then null; end $$;

-- Leads antigos: o "desde" e a última atividade partem da criação
update public.leads set etapa_desde = created_at, ultima_atividade_em = created_at
  where etapa_desde > created_at;

create index if not exists leads_empresa_chave_tel on public.leads (empresa_id, chave_telefone);
create index if not exists leads_empresa_email on public.leads (empresa_id, lower(email));

-- ---------------------------------------------------------------------
-- 2. etapas_funil
-- ---------------------------------------------------------------------
alter table public.etapas_funil
  add column if not exists probabilidade smallint,
  add column if not exists dias_parado smallint default 7;

do $$ begin
  alter table public.etapas_funil add constraint etapas_probabilidade_valida check (probabilidade is null or probabilidade between 0 and 100);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.etapas_funil add constraint etapas_dias_parado_valido check (dias_parado is null or dias_parado between 1 and 365);
exception when duplicate_object then null; end $$;

-- Probabilidade inicial: proporcional à posição no funil (a última etapa = 100%)
update public.etapas_funil e
   set probabilidade = round(100.0 * e.ordem / nullif(m.maior, 0))
  from (select empresa_id, max(ordem) maior from public.etapas_funil group by empresa_id) m
 where m.empresa_id = e.empresa_id and e.probabilidade is null;

-- ---------------------------------------------------------------------
-- 3. lead_atividades
-- ---------------------------------------------------------------------
create table if not exists public.lead_atividades (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  usuario_id uuid default auth.uid(),
  tipo text not null check (tipo in ('whatsapp', 'ligacao', 'email', 'etapa', 'ganho', 'perdido', 'reaberto', 'webhook', 'importacao')),
  descricao text,
  created_at timestamptz not null default now()
);
create index if not exists lead_atividades_lead on public.lead_atividades (lead_id, created_at desc);

alter table public.lead_atividades enable row level security;
revoke all on public.lead_atividades from anon;
grant select, insert, delete on public.lead_atividades to authenticated;

drop policy if exists atividades_select on public.lead_atividades;
drop policy if exists atividades_insert on public.lead_atividades;
drop policy if exists atividades_delete on public.lead_atividades;
-- Ver: quem vê o lead (o RLS de leads decide)
create policy atividades_select on public.lead_atividades for select to authenticated
  using ( (select private.is_superadmin())
          or ( empresa_id = (select private.minha_empresa_id())
               and exists (select 1 from public.leads l where l.id = lead_atividades.lead_id) ) );
-- Registrar: em nome próprio, num lead visível da própria empresa
create policy atividades_insert on public.lead_atividades for insert to authenticated
  with check ( (select private.is_superadmin())
               or ( empresa_id = (select private.minha_empresa_id())
                    and usuario_id = (select auth.uid())
                    and exists (select 1 from public.leads l where l.id = lead_atividades.lead_id and l.empresa_id = lead_atividades.empresa_id) ) );
-- Apagar: só admin da empresa
create policy atividades_delete on public.lead_atividades for delete to authenticated
  using ( (select private.is_superadmin()) or private.is_admin_da_empresa(empresa_id) );

-- ---------------------------------------------------------------------
-- 4. modelos_mensagem
-- ---------------------------------------------------------------------
create table if not exists public.modelos_mensagem (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  etapa_id uuid references public.etapas_funil(id) on delete set null,
  titulo text not null check (length(titulo) between 1 and 80),
  texto text not null check (length(texto) between 1 and 1000),
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists modelos_empresa on public.modelos_mensagem (empresa_id, ordem);

alter table public.modelos_mensagem enable row level security;
revoke all on public.modelos_mensagem from anon;
grant select, insert, update, delete on public.modelos_mensagem to authenticated;

drop policy if exists modelos_select on public.modelos_mensagem;
drop policy if exists modelos_escrita on public.modelos_mensagem;
create policy modelos_select on public.modelos_mensagem for select to authenticated
  using ( empresa_id = (select private.minha_empresa_id()) or (select private.is_superadmin()) );
create policy modelos_escrita on public.modelos_mensagem for all to authenticated
  using ( (select private.is_superadmin()) or private.is_admin_da_empresa(empresa_id) )
  with check ( (select private.is_superadmin()) or private.is_admin_da_empresa(empresa_id) );

-- ---------------------------------------------------------------------
-- 5. Triggers
-- ---------------------------------------------------------------------
-- Mudou de etapa ou de situação: atualiza datas
create or replace function public.leads_antes_de_atualizar()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.etapa_id is distinct from old.etapa_id then
    new.etapa_desde := now();
    new.ultima_atividade_em := now();
  end if;
  if new.situacao is distinct from old.situacao then
    new.ultima_atividade_em := now();
    if new.situacao in ('ganho', 'perdido') then
      new.fechado_em := now();
    else
      new.fechado_em := null;
      new.motivo_perda := null;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists tr_leads_antes_de_atualizar on public.leads;
create trigger tr_leads_antes_de_atualizar before update on public.leads
  for each row execute function public.leads_antes_de_atualizar();

-- Anotação, tarefa ou atividade nova: o lead teve atividade agora.
-- SECURITY DEFINER e restrito a esta coluna: o vendedor pode anotar num lead
-- da empresa mesmo sem poder editar o lead inteiro.
create or replace function public.lead_teve_atividade()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.lead_id is not null then
    update public.leads set ultima_atividade_em = now() where id = new.lead_id;
  end if;
  return new;
end;
$$;
revoke execute on function public.leads_antes_de_atualizar() from public, anon, authenticated;
revoke execute on function public.lead_teve_atividade() from public, anon, authenticated;

drop trigger if exists tr_anotacao_atividade on public.lead_anotacoes;
create trigger tr_anotacao_atividade after insert on public.lead_anotacoes
  for each row execute function public.lead_teve_atividade();
drop trigger if exists tr_tarefa_atividade on public.tarefas;
create trigger tr_tarefa_atividade after insert or update of concluida on public.tarefas
  for each row execute function public.lead_teve_atividade();
drop trigger if exists tr_atividade_atividade on public.lead_atividades;
create trigger tr_atividade_atividade after insert on public.lead_atividades
  for each row execute function public.lead_teve_atividade();

commit;
