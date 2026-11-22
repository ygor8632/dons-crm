-- Ensaio da migration 20261122202742_metas_relatorios. Cole DEPOIS do corpo da migration
-- (sem begin/commit), tudo num único BEGIN; o último bloco lança erro com os resultados,
-- forçando o ROLLBACK. IDs de 22/11/2026: admin 6b82b2d4 (Dons tech 8976ddf9), superadmin
-- 29d9c75d, outra empresa Criaê 9b6de084. Usuários e leads de teste somem no rollback.
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

insert into auth.users (id, instance_id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000bb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'vendedor.ensaio@exemplo.com'),
  ('00000000-0000-0000-0000-0000000000cc', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'criae.ensaio@exemplo.com');
insert into public.perfis (id, empresa_id, email, role) values
  ('00000000-0000-0000-0000-0000000000bb', '8976ddf9-5560-471e-81ca-cfb1839b5713', 'vendedor.ensaio@exemplo.com', 'vendedor'),
  ('00000000-0000-0000-0000-0000000000cc', '9b6de084-cbba-4093-9abf-b7d271f08c31', 'criae.ensaio@exemplo.com', 'vendedor');

-- ===== Como postgres =====
select private._t('C1 carga inicial: todo lead com etapa tem movimento (esperado 0 sem)', $q$select count(*) from leads l where etapa_id is not null and not exists (select 1 from lead_movimentos m where m.lead_id = l.id)$q$);
select private._t('C2 lead novo gera movimento inicial (esperado 1)', $q$with x as (insert into leads (id, nome, empresa_id, etapa_id) values ('00000000-0000-0000-0000-0000000000d2', 'Lead sem dono', '8976ddf9-5560-471e-81ca-cfb1839b5713', (select id from etapas_funil where empresa_id = '8976ddf9-5560-471e-81ca-cfb1839b5713' order by ordem limit 1)) returning id) select count(*) from x$q$);
select private._t('C3 movimento do lead novo (esperado 1)', $q$select count(*) from lead_movimentos where lead_id = '00000000-0000-0000-0000-0000000000d2' and de_etapa_id is null$q$);
select private._t('C4 mês que não é dia 1 (esperado ERRO)', $q$with x as (insert into metas (empresa_id, mes, valor) values ('8976ddf9-5560-471e-81ca-cfb1839b5713', '2026-11-15', 10) returning 1) select count(*) from x$q$);
select private._t('C5 meta sem valor nem quantidade (esperado ERRO)', $q$with x as (insert into metas (empresa_id, mes) values ('8976ddf9-5560-471e-81ca-cfb1839b5713', '2026-12-01') returning 1) select count(*) from x$q$);

-- ===== ADMIN (Dons tech) =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"6b82b2d4-8df3-4f5e-889e-4ca24ce4b27a","role":"authenticated"}', true);
select private._t('A1 admin: meta da empresa (esperado 1)', $q$with x as (insert into metas (empresa_id, usuario_id, mes, valor) values ('8976ddf9-5560-471e-81ca-cfb1839b5713', null, '2026-11-01', 50000) returning 1) select count(*) from x$q$);
select private._t('A2 admin: meta do vendedor (esperado 1)', $q$with x as (insert into metas (empresa_id, usuario_id, mes, valor, quantidade) values ('8976ddf9-5560-471e-81ca-cfb1839b5713', '00000000-0000-0000-0000-0000000000bb', '2026-11-01', 20000, 5) returning 1) select count(*) from x$q$);
select private._t('A3 admin: meta da empresa repetida no mês (esperado ERRO)', $q$with x as (insert into metas (empresa_id, usuario_id, mes, valor) values ('8976ddf9-5560-471e-81ca-cfb1839b5713', null, '2026-11-01', 1) returning 1) select count(*) from x$q$);
select private._t('A4 admin: meta em outra empresa (esperado ERRO)', $q$with x as (insert into metas (empresa_id, mes, valor) values ('9b6de084-cbba-4093-9abf-b7d271f08c31', '2026-11-01', 1) returning 1) select count(*) from x$q$);
select private._t('A5 admin: meta para pessoa de outra empresa (esperado ERRO)', $q$with x as (insert into metas (empresa_id, usuario_id, mes, valor) values ('8976ddf9-5560-471e-81ca-cfb1839b5713', '00000000-0000-0000-0000-0000000000cc', '2026-11-01', 1) returning 1) select count(*) from x$q$);
select private._t('A6 admin: mover etapa grava movimento com o usuário (esperado 1)', $q$with x as (update leads set etapa_id = (select id from etapas_funil where empresa_id = '8976ddf9-5560-471e-81ca-cfb1839b5713' order by ordem limit 1 offset 1) where id = '00000000-0000-0000-0000-0000000000d2' returning 1) select (select count(*) from x)::text$q$);
select private._t('A6b movimento gravado (esperado 1)', $q$select count(*) from lead_movimentos where lead_id = '00000000-0000-0000-0000-0000000000d2' and usuario_id = auth.uid()$q$);
select private._t('A7 admin: atualizar valor da meta (esperado 1)', $q$with x as (update metas set valor = 60000 where usuario_id is null and mes = '2026-11-01' returning 1) select count(*) from x$q$);
select private._t('A8 admin: saude_empresas (esperado ERRO)', $q$select count(*) from saude_empresas()$q$);
reset role;

-- ===== VENDEDOR (Dons tech) =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000bb","role":"authenticated"}', true);
select private._t('V1 vendedor: lê as metas da empresa (esperado 2)', $q$select count(*) from metas where mes = '2026-11-01'$q$);
select private._t('V2 vendedor: cria meta (esperado ERRO)', $q$with x as (insert into metas (empresa_id, usuario_id, mes, valor) values ('8976ddf9-5560-471e-81ca-cfb1839b5713', auth.uid(), '2026-12-01', 1) returning 1) select count(*) from x$q$);
select private._t('V3 vendedor: altera a própria meta (esperado 0)', $q$with x as (update metas set valor = 1 where usuario_id = auth.uid() returning 1) select count(*) from x$q$);
select private._t('V4 vendedor: vê movimentos do lead sem dono (esperado 2)', $q$select count(*) from lead_movimentos where lead_id = '00000000-0000-0000-0000-0000000000d2'$q$);
select private._t('V5 vendedor: saude_empresas (esperado ERRO)', $q$select count(*) from saude_empresas()$q$);
reset role;

-- ===== VENDEDOR de outra empresa (Criaê) =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000cc","role":"authenticated"}', true);
select private._t('X1 outra empresa: lê metas da Dons (esperado 0)', $q$select count(*) from metas where empresa_id = '8976ddf9-5560-471e-81ca-cfb1839b5713'$q$);
reset role;

-- ===== SUPERADMIN =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"29d9c75d-1600-4d13-bf08-a82bbf01595e","role":"authenticated"}', true);
select private._t('S1 superadmin: saude_empresas devolve uma linha por empresa (esperado t)', $q$select ((select count(*) from saude_empresas()) = (select count(*) from empresas))::text$q$);
select private._t('S2 superadmin: amostra da Dons tech', $q$select row(s.*)::text from saude_empresas() s where s.empresa_id = '8976ddf9-5560-471e-81ca-cfb1839b5713'$q$);
reset role;

-- ===== ANÔNIMO =====
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select private._t('N1 anon: lê metas (esperado ERRO ou 0)', $q$select count(*) from metas$q$);
select private._t('N2 anon: saude_empresas (esperado ERRO)', $q$select count(*) from saude_empresas()$q$);
reset role;

do $$
declare r text;
begin
  select string_agg(label || ' => ' || res, E'\n' order by ord) into r from private._ensaio;
  raise exception E'RESULTADOS (rollback forçado):\n%', r;
end $$;
