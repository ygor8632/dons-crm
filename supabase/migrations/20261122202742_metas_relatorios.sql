-- =====================================================================
-- Metas e relatórios
-- 1. metas: meta mensal de vendas (R$ e/ou quantidade) por vendedor ou da
--    empresa toda (usuario_id nulo). Todos da empresa leem; só admin grava.
-- 2. lead_movimentos passa a ser gravado por trigger (toda mudança de etapa,
--    venha do app, do webhook ou de outro lugar), para medir tempo por etapa
--    e conversão entre etapas. Carga inicial: uma linha por lead, na etapa
--    atual, desde etapa_desde.
-- 3. saude_empresas(): números de adoção por cliente para o superadmin
--    (usuários ativos, leads novos, sem próximo passo, atrasados, parados).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. metas
-- ---------------------------------------------------------------------
create table if not exists public.metas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  usuario_id uuid references public.perfis(id) on delete cascade,
  mes date not null check (extract(day from mes) = 1),
  valor numeric(14, 2) check (valor is null or valor >= 0),
  quantidade integer check (quantidade is null or quantidade >= 0),
  created_at timestamptz not null default now(),
  constraint metas_alguma_meta check (valor is not null or quantidade is not null),
  constraint metas_unica unique nulls not distinct (empresa_id, usuario_id, mes)
);
create index if not exists metas_empresa_mes on public.metas (empresa_id, mes);
create index if not exists metas_usuario on public.metas (usuario_id);

alter table public.metas enable row level security;
revoke all on public.metas from anon;
grant select, insert, update, delete on public.metas to authenticated;

create policy metas_select on public.metas for select to authenticated
  using ( empresa_id = (select private.minha_empresa_id()) or (select private.is_superadmin()) );
create policy metas_escrita on public.metas for all to authenticated
  using ( private.is_admin_da_empresa(empresa_id) or (select private.is_superadmin()) )
  with check ( (private.is_admin_da_empresa(empresa_id)
                and (usuario_id is null or exists (select 1 from public.perfis p where p.id = metas.usuario_id and p.empresa_id = metas.empresa_id)))
               or (select private.is_superadmin()) );

-- ---------------------------------------------------------------------
-- 2. lead_movimentos por trigger
-- ---------------------------------------------------------------------
create index if not exists lead_movimentos_lead_data on public.lead_movimentos (lead_id, created_at);

create or replace function private.registrar_movimento()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.etapa_id is not null then
      insert into public.lead_movimentos (lead_id, de_etapa_id, para_etapa_id, usuario_id, created_at)
      values (new.id, null, new.etapa_id, auth.uid(), coalesce(new.etapa_desde, new.created_at, now()));
    end if;
  elsif new.etapa_id is distinct from old.etapa_id then
    insert into public.lead_movimentos (lead_id, de_etapa_id, para_etapa_id, usuario_id)
    values (new.id, old.etapa_id, new.etapa_id, auth.uid());
  end if;
  return null;
end $$;
revoke all on function private.registrar_movimento() from public, anon, authenticated;

drop trigger if exists leads_registrar_movimento on public.leads;
create trigger leads_registrar_movimento
  after insert or update of etapa_id on public.leads
  for each row execute function private.registrar_movimento();

-- Carga inicial (só leads que ainda não têm movimento)
insert into public.lead_movimentos (lead_id, de_etapa_id, para_etapa_id, usuario_id, created_at)
select l.id, null, l.etapa_id, null, coalesce(l.etapa_desde, l.created_at)
from public.leads l
where l.etapa_id is not null
  and not exists (select 1 from public.lead_movimentos m where m.lead_id = l.id);

-- ---------------------------------------------------------------------
-- 3. saude_empresas (só superadmin)
-- ---------------------------------------------------------------------
create or replace function public.saude_empresas()
returns table (
  empresa_id uuid,
  usuarios integer,
  ativos_7d integer,
  leads_7d integer,
  leads_7d_anterior integer,
  abertos integer,
  sem_proximo_passo integer,
  atrasados integer,
  parados integer,
  ultima_atividade timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.is_superadmin() then
    raise exception 'Apenas o superadmin pode ver a saúde dos clientes.' using errcode = '42501';
  end if;

  return query
  with finais as (
    select distinct on (e.empresa_id) e.empresa_id, e.id
    from public.etapas_funil e order by e.empresa_id, e.ordem desc
  ),
  acoes as (
    select a.empresa_id, a.usuario_id, a.created_at from public.lead_atividades a where a.usuario_id is not null
    union all
    select n.empresa_id, n.usuario_id, n.created_at from public.lead_anotacoes n where n.usuario_id is not null
    union all
    select t.empresa_id, t.vendedor_id, t.created_at from public.tarefas t where t.vendedor_id is not null
    union all
    select l.empresa_id, m.usuario_id, m.created_at from public.lead_movimentos m join public.leads l on l.id = m.lead_id where m.usuario_id is not null
  ),
  abertos as (
    select l.*, e.dias_parado
    from public.leads l
    left join public.etapas_funil e on e.id = l.etapa_id
    left join finais f on f.empresa_id = l.empresa_id
    where l.situacao = 'aberto' and l.etapa_id is distinct from f.id
  )
  select
    emp.id,
    (select count(*)::int from public.perfis p where p.empresa_id = emp.id),
    (select count(distinct x.usuario_id)::int from acoes x where x.empresa_id = emp.id and x.created_at > now() - interval '7 days'),
    (select count(*)::int from public.leads l where l.empresa_id = emp.id and l.created_at > now() - interval '7 days'),
    (select count(*)::int from public.leads l where l.empresa_id = emp.id and l.created_at <= now() - interval '7 days' and l.created_at > now() - interval '14 days'),
    (select count(*)::int from abertos a where a.empresa_id = emp.id),
    (select count(*)::int from abertos a where a.empresa_id = emp.id
       and not exists (select 1 from public.tarefas t where t.lead_id = a.id and not coalesce(t.concluida, false))),
    (select count(*)::int from public.tarefas t join abertos a on a.id = t.lead_id
       where t.empresa_id = emp.id and not coalesce(t.concluida, false) and t.data_vencimento < now()),
    (select count(*)::int from abertos a where a.empresa_id = emp.id and a.dias_parado is not null
       and coalesce(a.ultima_atividade_em, a.etapa_desde, a.created_at) < now() - make_interval(days => a.dias_parado)),
    (select max(x.created_at) from acoes x where x.empresa_id = emp.id)
  from public.empresas emp;
end $$;
revoke all on function public.saude_empresas() from public, anon;
grant execute on function public.saude_empresas() to authenticated;

commit;
