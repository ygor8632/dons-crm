-- =====================================================================
-- Templates por segmento e checklist de implantação
-- 1. empresas.segmento: template aplicado na criação (clinica, imobiliaria…).
-- 2. empresas.motivos_perda: motivos oferecidos ao marcar um lead como
--    perdido (null = lista padrão do app). O admin da empresa edita.
-- 3. empresas.implantacao: itens do checklist marcados à mão pela Dons
--    ({"treinamento": "2026-11-23T…", "inicio": "…"}). Só o superadmin
--    altera segmento e implantacao; para os outros, o trigger mantém o valor.
-- 4. checklist_implantacao(): o que dá para medir sozinho, por empresa
--    (só superadmin).
-- =====================================================================

begin;

alter table public.empresas
  add column if not exists segmento text,
  add column if not exists motivos_perda text[],
  add column if not exists implantacao jsonb not null default '{}'::jsonb;

alter table public.empresas drop constraint if exists empresas_segmento_tamanho;
alter table public.empresas add constraint empresas_segmento_tamanho check (segmento is null or char_length(segmento) between 1 and 40);
alter table public.empresas drop constraint if exists empresas_motivos_perda_tamanho;
alter table public.empresas add constraint empresas_motivos_perda_tamanho
  check (motivos_perda is null or (cardinality(motivos_perda) between 1 and 12 and char_length(array_to_string(motivos_perda, '|')) <= 700));
alter table public.empresas drop constraint if exists empresas_implantacao_objeto;
alter table public.empresas add constraint empresas_implantacao_objeto check (jsonb_typeof(implantacao) = 'object');

-- Segmento e checklist são da Dons: admin da empresa não altera
create or replace function private.proteger_implantacao()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_superadmin() and coalesce(auth.role(), '') <> 'service_role' and auth.uid() is not null then
    new.segmento := old.segmento;
    new.implantacao := old.implantacao;
  end if;
  return new;
end $$;
revoke all on function private.proteger_implantacao() from public, anon, authenticated;

drop trigger if exists empresas_proteger_implantacao on public.empresas;
create trigger empresas_proteger_implantacao
  before update of segmento, implantacao on public.empresas
  for each row execute function private.proteger_implantacao();

-- Itens medidos automaticamente
create or replace function public.checklist_implantacao()
returns table (
  empresa_id uuid,
  tem_logo boolean,
  etapas integer,
  membros integer,
  acessaram integer,
  importados integer,
  leads_webhook integer,
  modelos integer,
  leads integer
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.is_superadmin() then
    raise exception 'Apenas o superadmin pode ver o checklist de implantação.' using errcode = '42501';
  end if;

  return query
  select
    emp.id,
    (emp.logo_url is not null and emp.logo_url <> ''),
    (select count(*)::int from public.etapas_funil e where e.empresa_id = emp.id),
    (select count(*)::int from public.perfis p where p.empresa_id = emp.id),
    (select count(*)::int from public.perfis p join auth.users u on u.id = p.id
       where p.empresa_id = emp.id and u.last_sign_in_at is not null),
    (select count(distinct a.lead_id)::int from public.lead_atividades a where a.empresa_id = emp.id and a.tipo = 'importacao'),
    (select count(distinct a.lead_id)::int from public.lead_atividades a where a.empresa_id = emp.id and a.tipo = 'webhook'),
    (select count(*)::int from public.modelos_mensagem m where m.empresa_id = emp.id),
    (select count(*)::int from public.leads l where l.empresa_id = emp.id)
  from public.empresas emp;
end $$;
revoke all on function public.checklist_implantacao() from public, anon;
grant execute on function public.checklist_implantacao() to authenticated;

commit;
