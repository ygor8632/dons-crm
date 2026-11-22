-- Ensaio da migration 20261122180051_adocao_registro. Cole DEPOIS do corpo da migration
-- (sem begin/commit), tudo num único BEGIN; o último bloco lança erro com os resultados,
-- forçando o ROLLBACK. IDs de 22/11/2026: admin 6b82b2d4 (Dons tech 8976ddf9),
-- outra empresa Criaê 9b6de084. Vendedor e leads de teste somem no rollback.
-- Rodado em 22/11/2026 antes de aplicar: 25/25 conforme o esperado.

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

insert into auth.users (id, instance_id, aud, role, email)
values ('00000000-0000-0000-0000-0000000000bb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'vendedor.ensaio@exemplo.com');
insert into public.perfis (id, empresa_id, email, role)
values ('00000000-0000-0000-0000-0000000000bb', '8976ddf9-5560-471e-81ca-cfb1839b5713', 'vendedor.ensaio@exemplo.com', 'vendedor');

-- Leads de teste: um do admin (Dons), um sem dono (Dons), um na Criaê
insert into public.leads (id, nome, empresa_id, vendedor_id, telefone, created_at) values
  ('00000000-0000-0000-0000-0000000000d1', 'Lead do admin', '8976ddf9-5560-471e-81ca-cfb1839b5713', '6b82b2d4-8df3-4f5e-889e-4ca24ce4b27a', '+55 (11) 99999-0000', now() - interval '10 days'),
  ('00000000-0000-0000-0000-0000000000d2', 'Lead sem dono', '8976ddf9-5560-471e-81ca-cfb1839b5713', null, '11 9999-0000', now() - interval '10 days'),
  ('00000000-0000-0000-0000-0000000000d3', 'Lead da Criaê', '9b6de084-cbba-4093-9abf-b7d271f08c31', null, '21988887777', now());

-- ===== Funções e colunas (como postgres) =====
select private._t('C1 chave_telefone: formatos com e sem 55/9º dígito coincidem (esperado t)', $q$select (public.chave_telefone('+55 (11) 99999-0000') = public.chave_telefone('11 9999-0000'))::text$q$);
select private._t('C2 chave gerada nos leads de teste (esperado 1199990000)', $q$select chave_telefone from leads where id = '00000000-0000-0000-0000-0000000000d1'$q$);
select private._t('C3 situação inválida é recusada (esperado ERRO)', $q$with x as (update leads set situacao = 'xpto' where id = '00000000-0000-0000-0000-0000000000d1' returning 1) select count(*) from x$q$);
select private._t('C4 etapas ganharam probabilidade (esperado > 0)', $q$select count(*) from etapas_funil where probabilidade is not null$q$);
select private._t('C5 leads reais: etapa_desde = created_at (esperado true)', $q$select bool_and(etapa_desde = created_at)::text from leads where id::text not like '00000000%'$q$);

-- ===== ADMIN (Dons tech) =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"6b82b2d4-8df3-4f5e-889e-4ca24ce4b27a","role":"authenticated"}', true);
select private._t('A1 admin: mover etapa reinicia etapa_desde (esperado t)', $q$with x as (update leads set etapa_id = (select id from etapas_funil where empresa_id = '8976ddf9-5560-471e-81ca-cfb1839b5713' order by ordem desc limit 1) where id = '00000000-0000-0000-0000-0000000000d1' returning etapa_desde) select (min(etapa_desde) > now() - interval '1 minute')::text from x$q$);
select private._t('A2 admin: marcar perdido grava fechado_em (esperado t)', $q$with x as (update leads set situacao = 'perdido', motivo_perda = 'Preço' where id = '00000000-0000-0000-0000-0000000000d1' returning fechado_em) select (min(fechado_em) is not null)::text from x$q$);
select private._t('A3 admin: reabrir limpa motivo e fechado_em (esperado t)', $q$with x as (update leads set situacao = 'aberto' where id = '00000000-0000-0000-0000-0000000000d1' returning fechado_em, motivo_perda) select (bool_and(fechado_em is null and motivo_perda is null))::text from x$q$);
select private._t('A4 admin: registra atividade em lead da empresa (esperado 1)', $q$with x as (insert into lead_atividades (empresa_id, lead_id, usuario_id, tipo, descricao) values ('8976ddf9-5560-471e-81ca-cfb1839b5713', '00000000-0000-0000-0000-0000000000d1', auth.uid(), 'whatsapp', 'teste') returning 1) select count(*) from x$q$);
select private._t('A5 admin: atividade em lead de outra empresa (esperado ERRO)', $q$with x as (insert into lead_atividades (empresa_id, lead_id, usuario_id, tipo) values ('8976ddf9-5560-471e-81ca-cfb1839b5713', '00000000-0000-0000-0000-0000000000d3', auth.uid(), 'whatsapp') returning 1) select count(*) from x$q$);
select private._t('A6 admin: atividade em nome de outra pessoa (esperado ERRO)', $q$with x as (insert into lead_atividades (empresa_id, lead_id, usuario_id, tipo) values ('8976ddf9-5560-471e-81ca-cfb1839b5713', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000bb', 'whatsapp') returning 1) select count(*) from x$q$);
select private._t('A7 admin: cria modelo de mensagem (esperado 1)', $q$with x as (insert into modelos_mensagem (empresa_id, titulo, texto) values ('8976ddf9-5560-471e-81ca-cfb1839b5713', 'Primeiro contato', 'Olá {nome}') returning 1) select count(*) from x$q$);
select private._t('A8 admin: cria modelo em outra empresa (esperado ERRO)', $q$with x as (insert into modelos_mensagem (empresa_id, titulo, texto) values ('9b6de084-cbba-4093-9abf-b7d271f08c31', 'x', 'y') returning 1) select count(*) from x$q$);
select private._t('A9 admin: altera prazo de parado da etapa (esperado >= 1)', $q$with x as (update etapas_funil set dias_parado = 5 where empresa_id = '8976ddf9-5560-471e-81ca-cfb1839b5713' returning 1) select count(*) from x$q$);
reset role;

-- ===== VENDEDOR (Dons tech) =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000bb","role":"authenticated"}', true);
select private._t('V1 vendedor: vê atividades só de leads visíveis (esperado 0, a do lead do admin está oculta)', $q$select count(*) from lead_atividades where lead_id = '00000000-0000-0000-0000-0000000000d1'$q$);
select private._t('V2 vendedor: registra atividade em lead sem dono (esperado 1)', $q$with x as (insert into lead_atividades (empresa_id, lead_id, usuario_id, tipo) values ('8976ddf9-5560-471e-81ca-cfb1839b5713', '00000000-0000-0000-0000-0000000000d2', auth.uid(), 'whatsapp') returning 1) select count(*) from x$q$);
select private._t('V3 vendedor: atividade em lead de outro vendedor (esperado ERRO)', $q$with x as (insert into lead_atividades (empresa_id, lead_id, usuario_id, tipo) values ('8976ddf9-5560-471e-81ca-cfb1839b5713', '00000000-0000-0000-0000-0000000000d1', auth.uid(), 'whatsapp') returning 1) select count(*) from x$q$);
select private._t('V4 vendedor: lê modelos da empresa (esperado 1)', $q$select count(*) from modelos_mensagem$q$);
select private._t('V5 vendedor: cria modelo (esperado ERRO)', $q$with x as (insert into modelos_mensagem (empresa_id, titulo, texto) values ('8976ddf9-5560-471e-81ca-cfb1839b5713', 'x', 'y') returning 1) select count(*) from x$q$);
select private._t('V6 vendedor: apaga atividade (esperado 0)', $q$with x as (delete from lead_atividades returning 1) select count(*) from x$q$);
select private._t('V7a vendedor: cria anotação em lead sem dono (esperado 1)', $q$with x as (insert into lead_anotacoes (lead_id, empresa_id, usuario_id, texto) values ('00000000-0000-0000-0000-0000000000d2', '8976ddf9-5560-471e-81ca-cfb1839b5713', auth.uid(), 'ligou') returning 1) select count(*) from x$q$);
select private._t('V7b anotação atualizou ultima_atividade_em (esperado true)', $q$select (ultima_atividade_em > now() - interval '1 minute')::text from leads where id = '00000000-0000-0000-0000-0000000000d2'$q$);
select private._t('V8 vendedor: altera probabilidade da etapa (esperado 0)', $q$with x as (update etapas_funil set probabilidade = 1 returning 1) select count(*) from x$q$);
reset role;

-- ===== ANÔNIMO =====
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select private._t('N1 anon: lê atividades (esperado ERRO ou 0)', $q$select count(*) from lead_atividades$q$);
select private._t('N2 anon: lê modelos (esperado ERRO ou 0)', $q$select count(*) from modelos_mensagem$q$);
reset role;

do $$
declare r text;
begin
  select string_agg(label || ' => ' || res, E'\n' order by ord) into r from private._ensaio;
  raise exception E'RESULTADOS (rollback forçado):\n%', r;
end $$;
