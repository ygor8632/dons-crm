-- Ensaio da migration 20261123141539_templates_implantacao. Cole DEPOIS do corpo da migration
-- (sem begin/commit), tudo num único BEGIN; o último bloco lança erro com os resultados,
-- forçando o ROLLBACK. IDs de 22/11/2026: admin 6b82b2d4 (Dons tech 8976ddf9), superadmin
-- 29d9c75d, outra empresa Criaê 9b6de084. Usuários e leads de teste somem no rollback.
-- Rodado em 23/11/2026 antes de aplicar: 15/15 conforme o esperado.

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

insert into public.leads (id, nome, empresa_id) values ('00000000-0000-0000-0000-0000000000d1', 'Lead importado', '8976ddf9-5560-471e-81ca-cfb1839b5713');
insert into public.lead_atividades (empresa_id, lead_id, usuario_id, tipo) values ('8976ddf9-5560-471e-81ca-cfb1839b5713', '00000000-0000-0000-0000-0000000000d1', null, 'importacao');

-- ===== Como postgres =====
select private._t('C1 motivos vazios (esperado ERRO)', $q$with x as (update empresas set motivos_perda = '{}' where id = '8976ddf9-5560-471e-81ca-cfb1839b5713' returning 1) select count(*) from x$q$);
select private._t('C2 implantacao que não é objeto (esperado ERRO)', $q$with x as (update empresas set implantacao = '[]' where id = '8976ddf9-5560-471e-81ca-cfb1839b5713' returning 1) select count(*) from x$q$);
select private._t('C3 empresas existentes com implantacao {} (esperado 0)', $q$select count(*) from empresas where implantacao <> '{}'::jsonb$q$);

-- ===== ADMIN (Dons tech) =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"6b82b2d4-8df3-4f5e-889e-4ca24ce4b27a","role":"authenticated"}', true);
select private._t('A1 admin: edita motivos de perda (esperado {Preço,Prazo})', $q$with x as (update empresas set motivos_perda = array['Preço','Prazo'] where id = '8976ddf9-5560-471e-81ca-cfb1839b5713' returning motivos_perda) select (select motivos_perda from x)::text$q$);
select private._t('A2 admin: tenta marcar o checklist (esperado {})', $q$with x as (update empresas set implantacao = '{"treinamento":"x"}' where id = '8976ddf9-5560-471e-81ca-cfb1839b5713' returning implantacao) select (select implantacao from x)::text$q$);
select private._t('A3 admin: tenta mudar o segmento (esperado (null))', $q$with x as (update empresas set segmento = 'clinica' where id = '8976ddf9-5560-471e-81ca-cfb1839b5713' returning segmento) select (select segmento from x)$q$);
select private._t('A4 admin: checklist (esperado ERRO)', $q$select count(*) from checklist_implantacao()$q$);
select private._t('A5 admin: motivos de outra empresa (esperado 0)', $q$with x as (update empresas set motivos_perda = array['x'] where id = '9b6de084-cbba-4093-9abf-b7d271f08c31' returning 1) select count(*) from x$q$);
reset role;

-- ===== VENDEDOR (Dons tech) =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000bb","role":"authenticated"}', true);
select private._t('V1 vendedor: edita motivos (esperado 0)', $q$with x as (update empresas set motivos_perda = array['x'] where id = '8976ddf9-5560-471e-81ca-cfb1839b5713' returning 1) select count(*) from x$q$);
reset role;

-- ===== SUPERADMIN =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"29d9c75d-1600-4d13-bf08-a82bbf01595e","role":"authenticated"}', true);
select private._t('S1 superadmin: marca treinamento (esperado treinamento)', $q$with x as (update empresas set implantacao = implantacao || '{"treinamento":"2026-11-23"}' where id = '8976ddf9-5560-471e-81ca-cfb1839b5713' returning implantacao) select string_agg(k, ',') from x, jsonb_object_keys(x.implantacao) k$q$);
select private._t('S2 superadmin: define segmento (esperado clinica)', $q$with x as (update empresas set segmento = 'clinica' where id = '8976ddf9-5560-471e-81ca-cfb1839b5713' returning segmento) select (select segmento from x)$q$);
select private._t('S3 superadmin: checklist com uma linha por empresa (esperado t)', $q$select ((select count(*) from checklist_implantacao()) = (select count(*) from empresas))::text$q$);
select private._t('S4 superadmin: Dons tech conta o lead importado (esperado >= 1)', $q$select importados::text from checklist_implantacao() where empresa_id = '8976ddf9-5560-471e-81ca-cfb1839b5713'$q$);
select private._t('S5 superadmin: amostra da Dons tech', $q$select row(c.*)::text from checklist_implantacao() c where c.empresa_id = '8976ddf9-5560-471e-81ca-cfb1839b5713'$q$);
reset role;

-- ===== ANÔNIMO =====
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select private._t('N1 anon: checklist (esperado ERRO)', $q$select count(*) from checklist_implantacao()$q$);
reset role;

do $$
declare r text;
begin
  select string_agg(label || ' => ' || res, E'\n' order by ord) into r from private._ensaio;
  raise exception E'RESULTADOS (rollback forçado):\n%', r;
end $$;
