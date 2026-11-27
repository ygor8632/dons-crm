-- Ensaio da migration 20261127153936_whatsapp_inbox. Cole DEPOIS do corpo da migration
-- (sem begin/commit), tudo num único BEGIN; o último bloco lança erro com os resultados,
-- forçando o ROLLBACK. IDs de 22/11/2026: admin 6b82b2d4 (Dons tech 8976ddf9), superadmin
-- 29d9c75d, outra empresa Criaê 9b6de084. Usuários e leads de teste somem no rollback.
-- Rodado em 27/11/2026 antes de aplicar: 29/29 conforme o esperado.

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

-- Conversas de teste na Dons tech: sem responsável, do admin, do vendedor
insert into public.whatsapp_conversas (id, empresa_id, wa_id, nome_contato, responsavel_id) values
  ('00000000-0000-0000-0000-0000000000e1', '8976ddf9-5560-471e-81ca-cfb1839b5713', '5511999990001', 'Fila', null),
  ('00000000-0000-0000-0000-0000000000e2', '8976ddf9-5560-471e-81ca-cfb1839b5713', '5511999990002', 'Do admin', '6b82b2d4-8df3-4f5e-889e-4ca24ce4b27a'),
  ('00000000-0000-0000-0000-0000000000e3', '8976ddf9-5560-471e-81ca-cfb1839b5713', '5511999990003', 'Do vendedor', '00000000-0000-0000-0000-0000000000bb');
insert into public.whatsapp_mensagens (empresa_id, conversa_id, direcao, texto) values
  ('8976ddf9-5560-471e-81ca-cfb1839b5713', '00000000-0000-0000-0000-0000000000e1', 'entrada', 'oi'),
  ('8976ddf9-5560-471e-81ca-cfb1839b5713', '00000000-0000-0000-0000-0000000000e2', 'entrada', 'oi admin'),
  ('8976ddf9-5560-471e-81ca-cfb1839b5713', '00000000-0000-0000-0000-0000000000e3', 'entrada', 'oi vendedor');

-- ===== Como postgres =====
select private._t('C1 phone_number_id com letras (esperado ERRO)', $q$with x as (insert into whatsapp_contas (empresa_id, phone_number_id, waba_id) values ('9b6de084-cbba-4093-9abf-b7d271f08c31', 'abc', '123456') returning 1) select count(*) from x$q$);
select private._t('C2 realtime publica as duas tabelas (esperado 2)', $q$select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and tablename in ('whatsapp_conversas', 'whatsapp_mensagens')$q$);
select private._t('C3 responsável de outra empresa (esperado ERRO)', $q$with x as (update whatsapp_conversas set responsavel_id = '00000000-0000-0000-0000-0000000000cc' where id = '00000000-0000-0000-0000-0000000000e1' returning 1) select count(*) from x$q$);

-- ===== ADMIN (Dons tech) =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"6b82b2d4-8df3-4f5e-889e-4ca24ce4b27a","role":"authenticated"}', true);
select private._t('A1 admin: App Secret inválido (esperado ERRO)', $q$select public.whatsapp_conectar('1234567890', '9876543210', 'EAAtokendeteste000000000000', 'nao-e-hex')::text$q$);
select private._t('A2 admin: conecta (esperado uuid)', $q$select (public.whatsapp_conectar('1234567890', '9876543210', 'EAAtokendeteste000000000000', '0123456789abcdef0123456789abcdef') is not null)::text$q$);
select private._t('A3 admin: vê a conta, status pendente (esperado pendente)', $q$select status from whatsapp_contas$q$);
select private._t('A4 admin: lê os segredos (esperado ERRO)', $q$select count(*) from public.whatsapp_segredos((select id from whatsapp_contas limit 1))$q$);
select private._t('A5 admin: vê as 3 conversas (esperado 3)', $q$select count(*) from whatsapp_conversas$q$);
select private._t('A6 admin: passa a conversa da fila para o vendedor (esperado 1)', $q$with x as (update whatsapp_conversas set responsavel_id = '00000000-0000-0000-0000-0000000000bb' where id = '00000000-0000-0000-0000-0000000000e1' returning 1) select count(*) from x$q$);
select private._t('A7 admin: grava mensagem direto (esperado ERRO)', $q$with x as (insert into whatsapp_mensagens (empresa_id, conversa_id, direcao, texto) values ('8976ddf9-5560-471e-81ca-cfb1839b5713', '00000000-0000-0000-0000-0000000000e1', 'saida', 'x') returning 1) select count(*) from x$q$);
select private._t('A8 admin: altera a conta direto (esperado ERRO ou 0)', $q$with x as (update whatsapp_contas set status = 'conectado' returning 1) select count(*) from x$q$);
reset role;

select private._t('P1 segredos guardados no Vault (esperado 2)', $q$select count(*) from vault.decrypted_secrets where name in ('wa_token:' || (select id from whatsapp_contas where empresa_id = '8976ddf9-5560-471e-81ca-cfb1839b5713'), 'wa_app_secret:' || (select id from whatsapp_contas where empresa_id = '8976ddf9-5560-471e-81ca-cfb1839b5713'))$q$);
select private._t('P2 whatsapp_segredos devolve o token (esperado EAAtokendeteste000000000000)', $q$select token from public.whatsapp_segredos((select id from whatsapp_contas where empresa_id = '8976ddf9-5560-471e-81ca-cfb1839b5713'))$q$);

-- ===== VENDEDOR (Dons tech) =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000bb","role":"authenticated"}', true);
select private._t('V1 vendedor: conecta (esperado ERRO)', $q$select public.whatsapp_conectar('1234567890', '9876543210', 'EAAtokendeteste000000000000', '0123456789abcdef0123456789abcdef')::text$q$);
select private._t('V2 vendedor: vê que há número conectado (esperado 1)', $q$select count(*) from whatsapp_contas$q$);
select private._t('V3 vendedor: vê as suas (e1 agora é dele, e3) e não a do admin (esperado 2)', $q$select count(*) from whatsapp_conversas$q$);
select private._t('V4 vendedor: mensagens da conversa do admin (esperado 0)', $q$select count(*) from whatsapp_mensagens where conversa_id = '00000000-0000-0000-0000-0000000000e2'$q$);
select private._t('V5 vendedor: devolve e1 para a fila (esperado 1)', $q$with x as (update whatsapp_conversas set responsavel_id = null where id = '00000000-0000-0000-0000-0000000000e1' returning 1) select count(*) from x$q$);
select private._t('V6 vendedor: passa e3 para o admin (esperado ERRO)', $q$with x as (update whatsapp_conversas set responsavel_id = '6b82b2d4-8df3-4f5e-889e-4ca24ce4b27a' where id = '00000000-0000-0000-0000-0000000000e3' returning 1) select count(*) from x$q$);
select private._t('V7 vendedor: zera não lidas (esperado 1)', $q$with x as (update whatsapp_conversas set nao_lidas = 0 where id = '00000000-0000-0000-0000-0000000000e3' returning 1) select count(*) from x$q$);
select private._t('V8 vendedor: muda a prévia (esperado ERRO)', $q$with x as (update whatsapp_conversas set ultima_previa = 'x' where id = '00000000-0000-0000-0000-0000000000e3' returning 1) select count(*) from x$q$);
select private._t('V9 vendedor: desconecta (esperado ERRO)', $q$select public.whatsapp_desconectar()::text$q$);
reset role;

-- ===== OUTRA EMPRESA (Criaê) =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000cc","role":"authenticated"}', true);
select private._t('O1 outra empresa: conversas e conta da Dons (esperado 0|0)', $q$select (select count(*) from whatsapp_conversas) || '|' || (select count(*) from whatsapp_contas)$q$);
reset role;

-- ===== SUPERADMIN =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"29d9c75d-1600-4d13-bf08-a82bbf01595e","role":"authenticated"}', true);
select private._t('S1 superadmin: vê as conversas (esperado >= 3)', $q$select count(*) from whatsapp_conversas$q$);
reset role;

-- ===== ADMIN desconecta =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"6b82b2d4-8df3-4f5e-889e-4ca24ce4b27a","role":"authenticated"}', true);
select private._t('D1 admin: desconecta (esperado vazio)', $q$select public.whatsapp_desconectar()::text$q$);
select private._t('D2 conversas continuam (esperado 3)', $q$select count(*) from whatsapp_conversas$q$);
reset role;
select private._t('D3 conta e segredos apagados (esperado 0|0)', $q$select (select count(*) from whatsapp_contas where empresa_id = '8976ddf9-5560-471e-81ca-cfb1839b5713') || '|' || (select count(*) from vault.secrets where name like 'wa\_token:%' or name like 'wa\_app\_secret:%')$q$);

-- ===== ANÔNIMO =====
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select private._t('N1 anon: conversas (esperado ERRO ou 0)', $q$select count(*) from whatsapp_conversas$q$);
select private._t('N2 anon: conecta (esperado ERRO)', $q$select public.whatsapp_conectar('1', '1', 'x', 'x')::text$q$);
reset role;

do $$
declare r text;
begin
  select string_agg(label || ' => ' || res, E'\n' order by ord) into r from private._ensaio;
  raise exception E'RESULTADOS (rollback forçado):\n%', r;
end $$;
