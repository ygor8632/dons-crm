-- =====================================================================
-- Distribuição automática de leads (roleta)
-- 1. empresas.distribuicao_ativa: liga a roleta (padrão desligada).
-- 2. distribuicao_membros: quem entra na roleta e quando recebeu o último
--    lead. A vez é de quem está há mais tempo sem receber (justo mesmo
--    quando alguém entra ou sai da fila).
-- 3. distribuicao_regras: por origem ("Google Ads" → só Carlos e Bia).
--    Origem sem regra vai para todos os participantes.
-- 4. Trigger em leads: lead SEM responsável criado por integração
--    (webhook, WhatsApp; sem usuário logado) recebe o próximo da vez e
--    ganha uma atividade "distribuicao" no histórico. Cadastro manual e
--    importação feitos por alguém logado não passam pela roleta.
-- 5. RPCs do admin: distribuicao_salvar (config inteira, atômica) e
--    distribuir_sem_responsavel (roda a roleta nos leads em aberto sem dono).
-- Leitura: membros da empresa. Escrita: só pelas funções (admin).
-- =====================================================================

-- 1. Liga/desliga ----------------------------------------------------------
alter table public.empresas add column if not exists distribuicao_ativa boolean not null default false;

-- Atividade nova no histórico
alter table public.lead_atividades drop constraint if exists lead_atividades_tipo_check;
alter table public.lead_atividades add constraint lead_atividades_tipo_check
  check (tipo in ('whatsapp', 'ligacao', 'email', 'etapa', 'ganho', 'perdido', 'reaberto', 'webhook', 'importacao', 'distribuicao'));

-- 2. Participantes ------------------------------------------------------------
create table if not exists public.distribuicao_membros (
  perfil_id uuid primary key references public.perfis(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  participa boolean not null default true,
  ultimo_lead_em timestamptz,
  recebidos integer not null default 0
);
create index if not exists distribuicao_membros_empresa on public.distribuicao_membros (empresa_id, participa, ultimo_lead_em);

alter table public.distribuicao_membros enable row level security;
revoke all on public.distribuicao_membros from anon, authenticated;
grant select on public.distribuicao_membros to authenticated;
drop policy if exists distribuicao_membros_select on public.distribuicao_membros;
create policy distribuicao_membros_select on public.distribuicao_membros for select to authenticated
  using ( empresa_id = (select private.minha_empresa_id()) or (select private.is_superadmin()) );

-- 3. Regras por origem ----------------------------------------------------------
create table if not exists public.distribuicao_regras (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  origem text not null check (char_length(btrim(origem)) between 1 and 60),
  membros uuid[] not null check (cardinality(membros) between 1 and 50),
  ordem integer not null default 0
);
create unique index if not exists distribuicao_regras_origem on public.distribuicao_regras (empresa_id, lower(btrim(origem)));

alter table public.distribuicao_regras enable row level security;
revoke all on public.distribuicao_regras from anon, authenticated;
grant select on public.distribuicao_regras to authenticated;
drop policy if exists distribuicao_regras_select on public.distribuicao_regras;
create policy distribuicao_regras_select on public.distribuicao_regras for select to authenticated
  using ( empresa_id = (select private.minha_empresa_id()) or (select private.is_superadmin()) );

-- 4. Escolha do próximo ----------------------------------------------------------
-- Candidatos: participantes da empresa (que ainda são da empresa); se a origem
-- tiver regra, só os da regra. Vez de quem recebeu há mais tempo.
create or replace function private.proximo_da_roleta(p_empresa uuid, p_origem text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_regra uuid[];
  v_escolhido uuid;
begin
  -- Serializa a roleta por empresa: dois leads ao mesmo tempo não caem no mesmo vendedor
  perform pg_advisory_xact_lock(hashtext('roleta:' || p_empresa::text));

  select r.membros into v_regra from public.distribuicao_regras r
   where r.empresa_id = p_empresa and lower(btrim(r.origem)) = lower(btrim(coalesce(p_origem, '')))
   limit 1;

  select m.perfil_id into v_escolhido
    from public.distribuicao_membros m
    join public.perfis p on p.id = m.perfil_id and p.empresa_id = p_empresa
   where m.empresa_id = p_empresa and m.participa
     and (v_regra is null or m.perfil_id = any (v_regra))
   order by m.ultimo_lead_em asc nulls first, m.perfil_id
   limit 1;

  if v_escolhido is not null then
    update public.distribuicao_membros set ultimo_lead_em = clock_timestamp(), recebidos = recebidos + 1 where perfil_id = v_escolhido;
  end if;
  return v_escolhido;
end $$;
revoke all on function private.proximo_da_roleta(uuid, text) from public, anon, authenticated;

create or replace function private.distribuir_lead_novo()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.vendedor_id is null and (select auth.uid()) is null
     and exists (select 1 from public.empresas e where e.id = new.empresa_id and e.distribuicao_ativa) then
    new.vendedor_id := private.proximo_da_roleta(new.empresa_id, new.origem);
    if new.vendedor_id is not null then
      -- Marca para o trigger AFTER registrar no histórico
      perform set_config('dons.roleta', coalesce(nullif(current_setting('dons.roleta', true), ''), '') || new.id::text || ',', true);
    end if;
  end if;
  return new;
end $$;
revoke all on function private.distribuir_lead_novo() from public, anon, authenticated;

create or replace function private.registrar_distribuicao()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if position(new.id::text in coalesce(current_setting('dons.roleta', true), '')) > 0 then
    insert into public.lead_atividades (empresa_id, lead_id, usuario_id, tipo, descricao)
    values (new.empresa_id, new.id, null, 'distribuicao',
            'Distribuído para ' || coalesce((select nullif(btrim(p.nome), '') from public.perfis p where p.id = new.vendedor_id), 'um vendedor') || ' pela roleta');
  end if;
  return new;
end $$;
revoke all on function private.registrar_distribuicao() from public, anon, authenticated;

drop trigger if exists leads_distribuir on public.leads;
create trigger leads_distribuir before insert on public.leads for each row execute function private.distribuir_lead_novo();
drop trigger if exists leads_distribuicao_historico on public.leads;
create trigger leads_distribuicao_historico after insert on public.leads for each row execute function private.registrar_distribuicao();

-- 5. Configuração (admin) -----------------------------------------------------------
-- p_membros: perfis que participam. p_regras: [{ "origem": "Google Ads", "membros": [uuid, ...] }]
create or replace function public.distribuicao_salvar(p_ativa boolean, p_membros uuid[], p_regras jsonb default '[]')
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_empresa uuid := private.minha_empresa_id();
  v_regra jsonb;
  v_membros uuid[];
  v_ordem integer := 0;
begin
  if v_empresa is null or not private.is_admin_da_empresa(v_empresa) then
    raise exception 'Só o administrador configura a distribuição.' using errcode = '42501';
  end if;
  p_membros := coalesce(p_membros, '{}');
  if exists (select 1 from unnest(p_membros) u where not exists (select 1 from public.perfis p where p.id = u and p.empresa_id = v_empresa)) then
    raise exception 'Participante que não é da empresa.' using errcode = '22023';
  end if;
  if p_ativa and cardinality(p_membros) = 0 then
    raise exception 'Escolha ao menos uma pessoa para receber leads.' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_regras, '[]')) <> 'array' or jsonb_array_length(coalesce(p_regras, '[]')) > 30 then
    raise exception 'Regras inválidas.' using errcode = '22023';
  end if;

  update public.empresas set distribuicao_ativa = p_ativa where id = v_empresa;

  -- Participantes: mantém o histórico (último lead, recebidos) de quem continua
  insert into public.distribuicao_membros (perfil_id, empresa_id, participa)
  select u, v_empresa, true from unnest(p_membros) u
  on conflict (perfil_id) do update set participa = true, empresa_id = excluded.empresa_id;
  update public.distribuicao_membros set participa = false where empresa_id = v_empresa and not (perfil_id = any (p_membros));

  -- Regras: substitui todas
  delete from public.distribuicao_regras where empresa_id = v_empresa;
  for v_regra in select * from jsonb_array_elements(coalesce(p_regras, '[]')) loop
    select coalesce(array_agg(distinct x::uuid), '{}') into v_membros from jsonb_array_elements_text(v_regra->'membros') x;
    if exists (select 1 from unnest(v_membros) u where not (u = any (p_membros))) then
      raise exception 'Regra de "%" tem gente fora da roleta.', v_regra->>'origem' using errcode = '22023';
    end if;
    insert into public.distribuicao_regras (empresa_id, origem, membros, ordem)
    values (v_empresa, btrim(v_regra->>'origem'), v_membros, v_ordem);
    v_ordem := v_ordem + 1;
  end loop;

  insert into public.logs_auditoria (empresa_id, usuario_id, acao, entidade, entidade_id, detalhes)
  values (v_empresa, (select auth.uid()), 'distribuicao', 'empresa', v_empresa,
          (case when p_ativa then 'Roleta ligada' else 'Roleta desligada' end) || ' · ' || cardinality(p_membros) || ' participante(s) · ' || v_ordem || ' regra(s)');
end $$;
revoke all on function public.distribuicao_salvar(boolean, uuid[], jsonb) from public, anon;
grant execute on function public.distribuicao_salvar(boolean, uuid[], jsonb) to authenticated;

-- Roda a roleta nos leads em aberto sem responsável (mais antigos primeiro).
create or replace function public.distribuir_sem_responsavel()
returns integer language plpgsql security definer set search_path = ''
as $$
declare
  v_empresa uuid := private.minha_empresa_id();
  v_lead record;
  v_vendedor uuid;
  v_total integer := 0;
begin
  if v_empresa is null or not private.is_admin_da_empresa(v_empresa) then
    raise exception 'Só o administrador distribui leads.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.distribuicao_membros where empresa_id = v_empresa and participa) then
    raise exception 'Escolha quem participa da roleta antes.' using errcode = '22023';
  end if;
  for v_lead in
    select id, origem from public.leads
     where empresa_id = v_empresa and vendedor_id is null and situacao = 'aberto' and anonimizado_em is null
     order by created_at
     limit 1000
  loop
    v_vendedor := private.proximo_da_roleta(v_empresa, v_lead.origem);
    exit when v_vendedor is null;
    update public.leads set vendedor_id = v_vendedor where id = v_lead.id;
    insert into public.lead_atividades (empresa_id, lead_id, usuario_id, tipo, descricao)
    values (v_empresa, v_lead.id, (select auth.uid()), 'distribuicao',
            'Distribuído para ' || coalesce((select nullif(btrim(p.nome), '') from public.perfis p where p.id = v_vendedor), 'um vendedor') || ' pela roleta');
    v_total := v_total + 1;
  end loop;
  -- Conversas do WhatsApp sem responsável acompanham o novo dono do lead
  update public.whatsapp_conversas c set responsavel_id = l.vendedor_id
    from public.leads l
   where c.lead_id = l.id and c.empresa_id = v_empresa and c.responsavel_id is null and l.vendedor_id is not null;
  return v_total;
end $$;
revoke all on function public.distribuir_sem_responsavel() from public, anon;
grant execute on function public.distribuir_sem_responsavel() to authenticated;
