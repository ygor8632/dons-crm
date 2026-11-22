-- Ensaio da migration de RLS. Cole DEPOIS do corpo da migration (sem begin/commit),
-- tudo dentro de um único BEGIN. O último bloco lança um erro de propósito com os
-- resultados, o que força o ROLLBACK de tudo — nada fica gravado.
-- IDs: superadmin 29d9c75d, admin 6b82b2d4, vendedor 26a70f3b (empresa 8976ddf9),
--      outra empresa (Criaê) 9b6de084.

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

-- Dados de teste em OUTRA empresa, para provar o isolamento
insert into public.leads (id, nome, empresa_id) values ('00000000-0000-0000-0000-0000000000aa', 'Lead de outra empresa', '9b6de084-cbba-4093-9abf-b7d271f08c31');

-- ===== SUPERADMIN =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"29d9c75d-1600-4d13-bf08-a82bbf01595e","role":"authenticated"}', true);
select private._t('S1 superadmin: login lê o próprio cargo', $q$select role from perfis where id = auth.uid()$q$);
select private._t('S2 superadmin: vê todas as empresas (esperado 4)', $q$select count(*) from empresas$q$);
select private._t('S3 superadmin: vê todos os leads (esperado 9)', $q$select count(*) from leads$q$);
select private._t('S4 superadmin: vê todos os perfis (esperado 3)', $q$select count(*) from perfis$q$);
select private._t('S5 superadmin: suspende outra empresa (esperado 1)', $q$with x as (update empresas set ativo = false where id = '9b6de084-cbba-4093-9abf-b7d271f08c31' returning 1) select count(*) from x$q$);
select private._t('S6 superadmin: cria empresa (esperado 1)', $q$with x as (insert into empresas (nome, email, plano) values ('Ensaio', 'ensaio@x.com', 'trial') returning 1) select count(*) from x$q$);
select private._t('S7 superadmin: cria etapa em outra empresa (esperado 1)', $q$with x as (insert into etapas_funil (empresa_id, nome, ordem) values ('9b6de084-cbba-4093-9abf-b7d271f08c31', 'Nova', 1) returning 1) select count(*) from x$q$);
reset role;

-- ===== ADMIN (Dons tech) =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"6b82b2d4-8df3-4f5e-889e-4ca24ce4b27a","role":"authenticated"}', true);
select private._t('D1 admin: login lê o próprio cargo', $q$select role from perfis where id = auth.uid()$q$);
select private._t('D2 admin: vê só a própria empresa (esperado 1)', $q$select count(*) from empresas$q$);
select private._t('D3 admin: leads da empresa com join de vendedor (esperado 8)', $q$select count(*) from leads l left join perfis p on p.id = l.vendedor_id$q$);
select private._t('D4 admin: NÃO vê lead de outra empresa (esperado 0)', $q$select count(*) from leads where empresa_id = '9b6de084-cbba-4093-9abf-b7d271f08c31'$q$);
select private._t('D5 admin: vê a equipe (esperado 3)', $q$select count(*) from perfis$q$);
select private._t('D6 admin: vê o funil (esperado 4)', $q$select count(*) from etapas_funil$q$);
select private._t('D7 admin: altera identidade visual (esperado 1)', $q$with x as (update empresas set cor_primaria = cor_primaria, nome = nome where id = '8976ddf9-5560-471e-81ca-cfb1839b5713' returning 1) select count(*) from x$q$);
select private._t('D8 admin: tenta se reativar/alterar validade (esperado ERRO)', $q$with x as (update empresas set valido_ate = now() + interval '10 years' where id = '8976ddf9-5560-471e-81ca-cfb1839b5713' returning 1) select count(*) from x$q$);
select private._t('D9 admin: tenta trocar webhook_token (esperado ERRO)', $q$with x as (update empresas set webhook_token = gen_random_uuid() where id = '8976ddf9-5560-471e-81ca-cfb1839b5713' returning 1) select count(*) from x$q$);
select private._t('D10 admin: tenta alterar outra empresa (esperado 0)', $q$with x as (update empresas set nome = 'hack' where id = '9b6de084-cbba-4093-9abf-b7d271f08c31' returning 1) select count(*) from x$q$);
select private._t('D11 admin: promove vendedor a admin (esperado 1)', $q$with x as (update perfis set role = 'admin' where id = '26a70f3b-bde4-4f73-9297-230b90bca400' returning 1) select count(*) from x$q$);
select private._t('D12 admin: volta vendedor ao cargo original (esperado 1)', $q$with x as (update perfis set role = 'vendedor' where id = '26a70f3b-bde4-4f73-9297-230b90bca400' returning 1) select count(*) from x$q$);
select private._t('D13 admin: tenta criar superadmin (esperado ERRO)', $q$with x as (update perfis set role = 'superadmin' where id = '26a70f3b-bde4-4f73-9297-230b90bca400' returning 1) select count(*) from x$q$);
select private._t('D14 admin: tenta mudar o próprio cargo (esperado ERRO)', $q$with x as (update perfis set role = 'superadmin' where id = auth.uid() returning 1) select count(*) from x$q$);
select private._t('D15 admin: cria etapa no funil (esperado 1)', $q$with x as (insert into etapas_funil (empresa_id, nome, ordem) values ('8976ddf9-5560-471e-81ca-cfb1839b5713', 'Ensaio', 99) returning 1) select count(*) from x$q$);
select private._t('D16 admin: tenta remover a si mesmo (esperado 0)', $q$with x as (delete from perfis where id = auth.uid() returning 1) select count(*) from x$q$);
select private._t('D17 admin: TRUNCATE (esperado ERRO)', $q$truncate leads$q$);
reset role;

-- ===== VENDEDOR (Dons tech) =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"26a70f3b-bde4-4f73-9297-230b90bca400","role":"authenticated"}', true);
select private._t('V1 vendedor: login lê o próprio cargo', $q$select role from perfis where id = auth.uid()$q$);
select private._t('V2 vendedor: vê os seus leads + sem dono (esperado 6)', $q$select count(*) from leads$q$);
select private._t('V3 vendedor: vê a empresa (esperado 1)', $q$select count(*) from empresas$q$);
select private._t('V4 vendedor: vê o funil (esperado 5 = 4 + etapa do D15)', $q$select count(*) from etapas_funil$q$);
select private._t('V5 vendedor: cria lead na própria empresa (esperado 1)', $q$with x as (insert into leads (nome, empresa_id) values ('Ensaio', '8976ddf9-5560-471e-81ca-cfb1839b5713') returning 1) select count(*) from x$q$);
select private._t('V6 vendedor: tenta criar lead em outra empresa (esperado ERRO)', $q$with x as (insert into leads (nome, empresa_id) values ('Hack', '9b6de084-cbba-4093-9abf-b7d271f08c31') returning 1) select count(*) from x$q$);
select private._t('V7 vendedor: tenta virar superadmin (esperado ERRO)', $q$with x as (update perfis set role = 'superadmin' where id = auth.uid() returning 1) select count(*) from x$q$);
select private._t('V8 vendedor: tenta alterar a empresa (esperado 0)', $q$with x as (update empresas set nome = 'hack' returning 1) select count(*) from x$q$);
select private._t('V9 vendedor: tenta apagar etapa (esperado 0)', $q$with x as (delete from etapas_funil returning 1) select count(*) from x$q$);
select private._t('V10 vendedor: tenta remover colega (esperado 0)', $q$with x as (delete from perfis where id <> auth.uid() returning 1) select count(*) from x$q$);
reset role;

-- ===== VISITANTE SEM LOGIN =====
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select private._t('A1 anon: lê leads (esperado ERRO)', $q$select count(*) from leads$q$);
select private._t('A2 anon: lê empresas/tokens (esperado ERRO)', $q$select count(*) from empresas$q$);
select private._t('A3 anon: altera perfis (esperado ERRO)', $q$with x as (update perfis set role = 'superadmin' returning 1) select count(*) from x$q$);
select private._t('A4 anon: apaga leads (esperado ERRO)', $q$with x as (delete from leads returning 1) select count(*) from x$q$);
reset role;

-- ===== SERVICE ROLE (webhook / convite no servidor) =====
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select private._t('R1 service: lê todos os leads (esperado 10)', $q$select count(*) from leads$q$);
select private._t('R2 service: upsert de perfil com cargo (esperado 1)', $q$with x as (update perfis set role = 'vendedor' where id = '26a70f3b-bde4-4f73-9297-230b90bca400' returning 1) select count(*) from x$q$);
select private._t('R3 service: webhook acha empresa pelo token (esperado 1)', $q$select count(*) from empresas where id = '8976ddf9-5560-471e-81ca-cfb1839b5713'$q$);
reset role;

-- Resultado + ROLLBACK forçado
do $f$ begin
  raise exception 'RESULTADO_ENSAIO %', (select json_agg(json_build_object('teste', label, 'resultado', res) order by ord) from private._ensaio);
end $f$;
