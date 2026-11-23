-- Ensaio da migration 20261123025936_lgpd. Cole DEPOIS do corpo da migration
-- (sem begin/commit), tudo num único BEGIN; o último bloco lança erro com os resultados,
-- forçando o ROLLBACK. IDs de 22/11/2026: admin 6b82b2d4 (Dons tech 8976ddf9), superadmin
-- 29d9c75d, outra empresa Criaê 9b6de084. Usuários e leads de teste somem no rollback.
-- Rodado em 23/11/2026 antes de aplicar: 27/27 conforme o esperado.

create table private._ensaio (ord serial, label text, res text);
create function private._t(label text, q text) returns void language plpgsql as $f$
declare v text;
begin
  begin
    execute q into v;
    insert into private._ensaio(label, res) values (label, coalesce(v, '(null)'));
  exception when others then
    insert into private._ensaio(label, res) values (label, 'ERRO: ' || sqlerrm);
  end;
end $f$;
grant usage on schema private to anon;
grant execute on function private._t(text, text) to anon, authenticated, service_role;
grant insert on private._ensaio to anon, authenticated, service_role;
grant usage on sequence private._ensaio_ord_seq to anon, authenticated, service_role;

insert into auth.users (id, instance_id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000bb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'vendedor.ensaio@exemplo.com'),
  ('00000000-0000-0000-0000-0000000000cc', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'criae.ensaio@exemplo.com');
insert into public.perfis (id, empresa_id, email, role) values
  ('00000000-0000-0000-0000-0000000000bb', '8976ddf9-5560-471e-81ca-cfb1839b5713', 'vendedor.ensaio@exemplo.com', 'vendedor'),
  ('00000000-0000-0000-0000-0000000000cc', '9b6de084-cbba-4093-9abf-b7d271f08c31', 'criae.ensaio@exemplo.com', 'vendedor');

-- Leads de teste: um do vendedor com anotação e tarefas, outro sem dono, um na Criaê
insert into public.leads (id, nome, empresa_id, vendedor_id, telefone, email, documento) values
  ('00000000-0000-0000-0000-0000000000d1', 'Maria Teste', '8976ddf9-5560-471e-81ca-cfb1839b5713', '00000000-0000-0000-0000-0000000000bb', '11999990000', 'maria@exemplo.com', '12345678900'),
  ('00000000-0000-0000-0000-0000000000d2', 'Lead sem dono', '8976ddf9-5560-471e-81ca-cfb1839b5713', null, '11988887777', null, null),
  ('00000000-0000-0000-0000-0000000000d3', 'Lead da Criaê', '9b6de084-cbba-4093-9abf-b7d271f08c31', null, '21988887777', null, null);
insert into public.lead_anotacoes (lead_id, empresa_id, usuario_id, texto) values ('00000000-0000-0000-0000-0000000000d1', '8976ddf9-5560-471e-81ca-cfb1839b5713', '00000000-0000-0000-0000-0000000000bb', 'Maria pediu orçamento');
insert into public.tarefas (lead_id, empresa_id, vendedor_id, descricao, data_vencimento, concluida) values
  ('00000000-0000-0000-0000-0000000000d1', '8976ddf9-5560-471e-81ca-cfb1839b5713', '00000000-0000-0000-0000-0000000000bb', 'Ligar para Maria', now() + interval '1 day', false),
  ('00000000-0000-0000-0000-0000000000d1', '8976ddf9-5560-471e-81ca-cfb1839b5713', '00000000-0000-0000-0000-0000000000bb', 'WhatsApp Maria', now() - interval '1 day', true);

-- ===== Como postgres =====
select private._t('C1 base legal inválida (esperado ERRO)', $q$with x as (update leads set base_legal = 'xpto' where id = '00000000-0000-0000-0000-0000000000d1' returning 1) select count(*) from x$q$);
select private._t('C2 leads existentes ficam com nao_contatar = false (esperado 0)', $q$select count(*) from leads where nao_contatar$q$);

-- ===== VENDEDOR (Dons tech) =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000bb","role":"authenticated"}', true);
select private._t('V1 vendedor: define base legal do seu lead (esperado 1)', $q$with x as (update leads set base_legal = 'consentimento', consentimento_em = now() where id = '00000000-0000-0000-0000-0000000000d1' returning 1) select count(*) from x$q$);
select private._t('V2 vendedor: registra que abriu a ficha (esperado 1)', $q$with x as (insert into logs_auditoria (empresa_id, usuario_id, acao, entidade, entidade_id) values ('8976ddf9-5560-471e-81ca-cfb1839b5713', auth.uid(), 'visualizou', 'lead', '00000000-0000-0000-0000-0000000000d1') returning 1) select count(*) from x$q$);
select private._t('V3 vendedor: registro em nome de outra pessoa (esperado ERRO)', $q$with x as (insert into logs_auditoria (empresa_id, usuario_id, acao, entidade) values ('8976ddf9-5560-471e-81ca-cfb1839b5713', '6b82b2d4-8df3-4f5e-889e-4ca24ce4b27a', 'visualizou', 'lead') returning 1) select count(*) from x$q$);
select private._t('V4 vendedor: lê o registro de acessos (esperado 0)', $q$select count(*) from logs_auditoria$q$);
select private._t('V5 vendedor: anonimiza (esperado ERRO)', $q$select public.anonimizar_lead('00000000-0000-0000-0000-0000000000d1')::text$q$);
select private._t('V6 vendedor: apaga registro (esperado ERRO ou 0)', $q$with x as (delete from logs_auditoria returning 1) select count(*) from x$q$);
reset role;

-- ===== ADMIN (Dons tech) =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"6b82b2d4-8df3-4f5e-889e-4ca24ce4b27a","role":"authenticated"}', true);
select private._t('A1 admin: vê a mudança de base legal no registro, com autor (esperado 1)', $q$select count(*) from logs_auditoria where entidade_id = '00000000-0000-0000-0000-0000000000d1' and acao = 'base_legal' and usuario_id = '00000000-0000-0000-0000-0000000000bb'$q$);
select private._t('A2 admin: vê o acesso do vendedor (esperado 1)', $q$select count(*) from logs_auditoria where entidade_id = '00000000-0000-0000-0000-0000000000d1' and acao = 'visualizou'$q$);
select private._t('A3 admin: marca não contatar e registra (esperado 1)', $q$with x as (update leads set nao_contatar = true where id = '00000000-0000-0000-0000-0000000000d2' returning 1) select (select count(*) from x)::text$q$);
select private._t('A3b registro do não contatar (esperado 1)', $q$select count(*) from logs_auditoria where entidade_id = '00000000-0000-0000-0000-0000000000d2' and acao = 'nao_contatar'$q$);
select private._t('A4 admin: altera registro (esperado ERRO ou 0)', $q$with x as (update logs_auditoria set detalhes = 'x' returning 1) select count(*) from x$q$);
select private._t('A5 admin: apaga registro (esperado ERRO ou 0)', $q$with x as (delete from logs_auditoria returning 1) select count(*) from x$q$);
select private._t('A6 admin: anonimiza lead da empresa (esperado vazio)', $q$select public.anonimizar_lead('00000000-0000-0000-0000-0000000000d1', 'Pedido por e-mail')::text$q$);
select private._t('A7 lead anonimizado sem dados pessoais (esperado t)', $q$select (nome = 'Contato removido' and email is null and telefone is null and documento is null and chave_telefone is null and nao_contatar and anonimizado_em is not null)::text from leads where id = '00000000-0000-0000-0000-0000000000d1'$q$);
select private._t('A8 anotações apagadas e tarefas pendentes removidas (esperado 0|1)', $q$select (select count(*) from lead_anotacoes where lead_id = '00000000-0000-0000-0000-0000000000d1') || '|' || (select count(*) from tarefas where lead_id = '00000000-0000-0000-0000-0000000000d1')$q$);
select private._t('A9 tarefa concluída sem texto pessoal (esperado Follow-up)', $q$select descricao from tarefas where lead_id = '00000000-0000-0000-0000-0000000000d1'$q$);
select private._t('A10 registro da anonimização com motivo (esperado Pedido por e-mail)', $q$select detalhes from logs_auditoria where entidade_id = '00000000-0000-0000-0000-0000000000d1' and acao = 'anonimizou'$q$);
select private._t('A11 anonimização não gera registro duplicado de não contatar (esperado 0)', $q$select count(*) from logs_auditoria where entidade_id = '00000000-0000-0000-0000-0000000000d1' and acao = 'nao_contatar'$q$);
select private._t('A12 admin: anonimiza lead de outra empresa (esperado ERRO)', $q$select public.anonimizar_lead('00000000-0000-0000-0000-0000000000d3')::text$q$);
-- A exclusão e a conferência ficam em chamadas separadas: numa mesma instrução, o trigger AFTER ainda não aparece.
select private._t('A13a admin: exclui lead (esperado 1)', $q$with x as (delete from leads where id = '00000000-0000-0000-0000-0000000000d2' returning 1) select count(*) from x$q$);
select private._t('A13b registro da exclusão sem o nome, com autor (esperado excluiu | Contato excluído)', $q$select string_agg(acao || ' | ' || detalhes, '; ') from logs_auditoria where entidade_id = '00000000-0000-0000-0000-0000000000d2'$q$);
reset role;

-- ===== ANÔNIMO =====
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select private._t('N1 anon: anonimiza (esperado ERRO)', $q$select public.anonimizar_lead('00000000-0000-0000-0000-0000000000d3')::text$q$);
select private._t('N2 anon: lê registro (esperado ERRO ou 0)', $q$select count(*) from logs_auditoria$q$);
reset role;

do $$
declare r text;
begin
  select string_agg(label || ' => ' || res, E'\n' order by ord) into r from private._ensaio;
  raise exception E'RESULTADOS (rollback forçado):\n%', r;
end $$;
