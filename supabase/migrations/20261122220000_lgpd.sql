-- =====================================================================
-- LGPD no produto
-- 1. leads: base legal do tratamento, data do consentimento, "não contatar"
--    (oposição do titular) e marca de anonimização.
-- 2. logs_auditoria vira o registro de acessos: só inserção (ninguém altera
--    nem apaga), com entidade_id para achar "quem acessou este contato".
-- 3. Triggers gravam no registro, do lado do banco, exclusões de lead e
--    mudanças de base legal / não contatar.
-- 4. anonimizar_lead(): atende o pedido de eliminação do titular mantendo
--    os números do funil (valor, etapa, datas). Só admin da empresa.
-- =====================================================================

begin;

-- 1. Colunas de privacidade no lead ------------------------------------
alter table public.leads
  add column if not exists base_legal text
    check (base_legal in ('consentimento', 'contrato', 'legitimo_interesse', 'obrigacao_legal')),
  add column if not exists consentimento_em timestamptz,
  add column if not exists nao_contatar boolean not null default false,
  add column if not exists anonimizado_em timestamptz;

comment on column public.leads.base_legal is 'Base legal (LGPD art. 7º): consentimento, contrato (procedimentos preliminares), legitimo_interesse, obrigacao_legal';
comment on column public.leads.nao_contatar is 'Titular pediu para não ser mais contatado (oposição, art. 18 §2º)';

-- 2. Registro de acessos -------------------------------------------------
alter table public.logs_auditoria add column if not exists entidade_id uuid;
alter table public.logs_auditoria drop constraint if exists logs_acao_tamanho;
alter table public.logs_auditoria add constraint logs_acao_tamanho
  check (char_length(acao) between 1 and 40 and char_length(entidade) between 1 and 40 and char_length(coalesce(detalhes, '')) <= 300);
create index if not exists logs_empresa_data on public.logs_auditoria (empresa_id, created_at desc);
create index if not exists logs_entidade_data on public.logs_auditoria (entidade_id, created_at desc);

-- Só leitura (admin/superadmin, pela policy existente) e inserção do próprio usuário
revoke update, delete, truncate on public.logs_auditoria from public, anon, authenticated;
grant select, insert on public.logs_auditoria to authenticated;
drop policy if exists logs_update on public.logs_auditoria;
drop policy if exists logs_delete on public.logs_auditoria;

-- 3. Triggers do registro ------------------------------------------------
create or replace function private.registrar_privacidade_lead()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    -- Empresa sendo excluída (cascata): não há onde registrar
    if not exists (select 1 from public.empresas where id = old.empresa_id) then return old; end if;
    insert into public.logs_auditoria (empresa_id, usuario_id, acao, entidade, entidade_id, detalhes)
    values (old.empresa_id, auth.uid(), 'excluiu', 'lead', old.id, 'Contato excluído');
    return old;
  end if;
  -- Anonimização registra a si mesma em anonimizar_lead()
  if new.anonimizado_em is distinct from old.anonimizado_em then return new; end if;
  if new.base_legal is distinct from old.base_legal then
    insert into public.logs_auditoria (empresa_id, usuario_id, acao, entidade, entidade_id, detalhes)
    values (new.empresa_id, auth.uid(), 'base_legal', 'lead', new.id, 'Base legal: ' || coalesce(new.base_legal, 'não informada'));
  end if;
  if new.nao_contatar is distinct from old.nao_contatar then
    insert into public.logs_auditoria (empresa_id, usuario_id, acao, entidade, entidade_id, detalhes)
    values (new.empresa_id, auth.uid(), 'nao_contatar', 'lead', new.id, case when new.nao_contatar then 'Marcado para não contatar' else 'Pode voltar a ser contatado' end);
  end if;
  return new;
end $$;
revoke all on function private.registrar_privacidade_lead() from public, anon, authenticated;

drop trigger if exists leads_privacidade_upd on public.leads;
create trigger leads_privacidade_upd
  after update of base_legal, nao_contatar on public.leads
  for each row execute function private.registrar_privacidade_lead();
drop trigger if exists leads_privacidade_del on public.leads;
create trigger leads_privacidade_del
  after delete on public.leads
  for each row execute function private.registrar_privacidade_lead();

-- 4. Anonimização -------------------------------------------------------
create or replace function public.anonimizar_lead(alvo uuid, motivo text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_emp uuid;
begin
  select empresa_id into v_emp from public.leads where id = alvo;
  if v_emp is null then
    raise exception 'Contato não encontrado' using errcode = 'P0002';
  end if;
  if not (private.is_admin_da_empresa(v_emp) or private.is_superadmin()) then
    raise exception 'Só o administrador da empresa pode anonimizar contatos' using errcode = '42501';
  end if;

  update public.leads
     set nome = 'Contato removido', email = null, telefone = null, documento = null,
         consentimento_em = null, nao_contatar = true, anonimizado_em = now()
   where id = alvo;
  delete from public.lead_anotacoes where lead_id = alvo;
  delete from public.tarefas where lead_id = alvo and not concluida;
  update public.tarefas set descricao = 'Follow-up' where lead_id = alvo;
  update public.lead_atividades set descricao = null where lead_id = alvo;

  insert into public.logs_auditoria (empresa_id, usuario_id, acao, entidade, entidade_id, detalhes)
  values (v_emp, auth.uid(), 'anonimizou', 'lead', alvo, left(coalesce(nullif(trim(motivo), ''), 'Pedido do titular'), 200));
end $$;
revoke all on function public.anonimizar_lead(uuid, text) from public, anon;
grant execute on function public.anonimizar_lead(uuid, text) to authenticated;

commit;
