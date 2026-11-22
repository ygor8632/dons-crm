-- Ensaio da migration 20261122045640_marca_storage. Cole DEPOIS do corpo da migration
-- (sem begin/commit), tudo dentro de um único BEGIN. O último bloco lança um erro de propósito
-- com os resultados, o que força o ROLLBACK de tudo: nada fica gravado.
-- IDs de 22/11/2026: superadmin 29d9c75d, admin 6b82b2d4 (empresa Dons tech 8976ddf9),
-- outra empresa (Criaê) 9b6de084. O vendedor é criado aqui e some no rollback.

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

-- Vendedor temporário na Dons tech
insert into auth.users (id, instance_id, aud, role, email)
values ('00000000-0000-0000-0000-0000000000bb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'vendedor.ensaio@exemplo.com');
insert into public.perfis (id, empresa_id, email, role)
values ('00000000-0000-0000-0000-0000000000bb', '8976ddf9-5560-471e-81ca-cfb1839b5713', 'vendedor.ensaio@exemplo.com', 'vendedor');

-- Arquivos já existentes nas duas empresas (criados como postgres, sem RLS)
insert into storage.objects (bucket_id, name) values
  ('marca', '8976ddf9-5560-471e-81ca-cfb1839b5713/logo-seed.webp'),
  ('marca', '9b6de084-cbba-4093-9abf-b7d271f08c31/logo-seed.webp');

-- Libera DELETE direto em storage.objects só nesta transação (o RLS continua valendo)
select set_config('storage.allow_delete_query', 'true', true);

-- ===== ADMIN (Dons tech) =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"6b82b2d4-8df3-4f5e-889e-4ca24ce4b27a","role":"authenticated"}', true);
select private._t('A1 admin: envia arquivo na própria pasta (esperado 1)', $q$with x as (insert into storage.objects (bucket_id, name) values ('marca', '8976ddf9-5560-471e-81ca-cfb1839b5713/fundo-1.webp') returning 1) select count(*) from x$q$);
select private._t('A2 admin: envia na pasta de outra empresa (esperado ERRO)', $q$with x as (insert into storage.objects (bucket_id, name) values ('marca', '9b6de084-cbba-4093-9abf-b7d271f08c31/fundo-1.webp') returning 1) select count(*) from x$q$);
select private._t('A3 admin: envia fora de pasta (esperado ERRO)', $q$with x as (insert into storage.objects (bucket_id, name) values ('marca', 'solto.webp') returning 1) select count(*) from x$q$);
select private._t('A4 admin: vê só os arquivos da própria empresa (esperado 2)', $q$select count(*) from storage.objects where bucket_id = 'marca'$q$);
select private._t('A5 admin: apaga arquivo da própria pasta (esperado 1)', $q$with x as (delete from storage.objects where name = '8976ddf9-5560-471e-81ca-cfb1839b5713/logo-seed.webp' returning 1) select count(*) from x$q$);
select private._t('A6 admin: apaga arquivo de outra empresa (esperado 0)', $q$with x as (delete from storage.objects where name = '9b6de084-cbba-4093-9abf-b7d271f08c31/logo-seed.webp' returning 1) select count(*) from x$q$);
select private._t('A7 admin: grava fundo_url da própria empresa (esperado 1)', $q$with x as (update public.empresas set fundo_url = '8976ddf9-5560-471e-81ca-cfb1839b5713/fundo-1.webp' where id = '8976ddf9-5560-471e-81ca-cfb1839b5713' returning 1) select count(*) from x$q$);
select private._t('A8 admin: grava fundo_url de outra empresa (esperado 0)', $q$with x as (update public.empresas set fundo_url = 'x' where id = '9b6de084-cbba-4093-9abf-b7d271f08c31' returning 1) select count(*) from x$q$);
select private._t('A9 admin: troca arquivo de bucket para outra empresa (esperado 0 ou ERRO)', $q$with x as (update storage.objects set name = '9b6de084-cbba-4093-9abf-b7d271f08c31/roubado.webp' where name = '8976ddf9-5560-471e-81ca-cfb1839b5713/fundo-1.webp' returning 1) select count(*) from x$q$);
reset role;

-- ===== VENDEDOR (Dons tech) =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000bb","role":"authenticated"}', true);
select private._t('V1 vendedor: lê arquivos da própria empresa (esperado 1)', $q$select count(*) from storage.objects where bucket_id = 'marca'$q$);
select private._t('V2 vendedor: envia arquivo (esperado ERRO)', $q$with x as (insert into storage.objects (bucket_id, name) values ('marca', '8976ddf9-5560-471e-81ca-cfb1839b5713/v.webp') returning 1) select count(*) from x$q$);
select private._t('V3 vendedor: apaga arquivo (esperado 0)', $q$with x as (delete from storage.objects where bucket_id = 'marca' returning 1) select count(*) from x$q$);
select private._t('V4 vendedor: grava fundo_url (esperado 0)', $q$with x as (update public.empresas set fundo_url = 'x' where id = '8976ddf9-5560-471e-81ca-cfb1839b5713' returning 1) select count(*) from x$q$);
reset role;

-- ===== SUPERADMIN =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"29d9c75d-1600-4d13-bf08-a82bbf01595e","role":"authenticated"}', true);
select private._t('S1 superadmin: envia na pasta de outra empresa (esperado 1)', $q$with x as (insert into storage.objects (bucket_id, name) values ('marca', '9b6de084-cbba-4093-9abf-b7d271f08c31/fundo-2.webp') returning 1) select count(*) from x$q$);
select private._t('S2 superadmin: vê todos os arquivos (esperado 3)', $q$select count(*) from storage.objects where bucket_id = 'marca'$q$);
reset role;

-- ===== ANÔNIMO =====
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select private._t('N1 anon: lista arquivos (esperado 0 ou ERRO)', $q$select count(*) from storage.objects where bucket_id = 'marca'$q$);
select private._t('N2 anon: envia arquivo (esperado ERRO)', $q$with x as (insert into storage.objects (bucket_id, name) values ('marca', '8976ddf9-5560-471e-81ca-cfb1839b5713/anon.webp') returning 1) select count(*) from x$q$);
reset role;

-- ===== Configuração do bucket =====
select private._t('B1 bucket privado, 5 MB, sem SVG', $q$select format('public=%s limite=%s tipos=%s', public, file_size_limit, allowed_mime_types) from storage.buckets where id = 'marca'$q$);

do $$
declare r text;
begin
  select string_agg(label || ' => ' || res, E'\n' order by ord) into r from private._ensaio;
  raise exception E'RESULTADOS (rollback forçado):\n%', r;
end $$;
