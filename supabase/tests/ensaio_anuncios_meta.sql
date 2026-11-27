-- Ensaio da migration 20261127195329_anuncios_meta (rodado em 27/11/2026: 31/31). Cole DEPOIS do corpo da migration (sem begin/commit),
-- tudo num único BEGIN; o último bloco lança erro com os resultados, forçando o ROLLBACK.
-- IDs: admin 6b82b2d4 (Dons tech 8976ddf9), superadmin 29d9c75d, outra empresa Criaê 9b6de084.

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
  ('00000000-0000-0000-0000-0000000000bb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bb.ensaio@exemplo.com'),
  ('00000000-0000-0000-0000-0000000000cc', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cc.ensaio@exemplo.com');
insert into public.perfis (id, empresa_id, email, role) values
  ('00000000-0000-0000-0000-0000000000bb', '8976ddf9-5560-471e-81ca-cfb1839b5713', 'bb.ensaio@exemplo.com', 'vendedor'),
  ('00000000-0000-0000-0000-0000000000cc', '9b6de084-cbba-4093-9abf-b7d271f08c31', 'cc.ensaio@exemplo.com', 'admin');

-- ===== ADMIN (Dons tech) =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"6b82b2d4-8df3-4f5e-889e-4ca24ce4b27a","role":"authenticated"}', true);
select private._t('A1 página com letras (esperado ERRO)', $q$select public.meta_conectar('abc123', repeat('t', 40), repeat('a', 32))::text$q$);
select private._t('A2 token curto (esperado ERRO)', $q$select public.meta_conectar('1234567890', 'curto', repeat('a', 32))::text$q$);
select private._t('A3 sem App Secret e sem WhatsApp (esperado ERRO)', $q$select public.meta_conectar('1234567890', repeat('t', 40), null)::text$q$);
select private._t('A4 App Secret inválido (esperado ERRO)', $q$select public.meta_conectar('1234567890', repeat('t', 40), 'xyz')::text$q$);
select private._t('A5 conecta (esperado uuid)', $q$select (public.meta_conectar('1234567890', repeat('t', 40), repeat('A', 32)) is not null)::text$q$);
select private._t('A6 admin vê a conta (esperado 1,pendente)', $q$select count(*) || ',' || min(status) from meta_contas$q$);
select private._t('A7 admin lê os segredos (esperado ERRO)', $q$select token from public.meta_segredos((select id from meta_contas limit 1))$q$);
select private._t('A8 admin grava em meta_leads (esperado ERRO)', $q$with x as (insert into meta_leads (empresa_id, leadgen_id) values ('8976ddf9-5560-471e-81ca-cfb1839b5713','123456789') returning 1) select count(*) from x$q$);
select private._t('A9 lead com campanha (esperado Black Friday)', $q$with x as (insert into leads (empresa_id, nome, origem, campanha, anuncio) values ('8976ddf9-5560-471e-81ca-cfb1839b5713','Ens Campanha','Facebook Ads','Black Friday','Vídeo 1') returning campanha) select campanha from x$q$);
select private._t('A10 campanha gigante (esperado ERRO)', $q$with x as (insert into leads (empresa_id, nome, campanha) values ('8976ddf9-5560-471e-81ca-cfb1839b5713','Ens X', repeat('c', 201)) returning 1) select count(*) from x$q$);
reset role;

-- ===== Como postgres (service) =====
select private._t('P1 segredo guardado em minúsculas (esperado t)', $q$select (app_secret = repeat('a', 32) and token = repeat('t', 40))::text from public.meta_segredos((select id from meta_contas where empresa_id='8976ddf9-5560-471e-81ca-cfb1839b5713'))$q$);
select private._t('P2 verify_token gerado (esperado 32)', $q$select char_length(verify_token)::text from meta_contas where empresa_id='8976ddf9-5560-471e-81ca-cfb1839b5713'$q$);
insert into public.meta_leads (empresa_id, leadgen_id, resultado) values ('8976ddf9-5560-471e-81ca-cfb1839b5713', '900000000001', 'criado');
select private._t('P3 leadgen repetido (esperado ERRO)', $q$with x as (insert into meta_leads (empresa_id, leadgen_id) values ('8976ddf9-5560-471e-81ca-cfb1839b5713','900000000001') returning 1) select count(*) from x$q$);
select private._t('P4 conversa com anúncio (esperado ok)', $q$select (count(*) >= 0)::text from whatsapp_conversas where anuncio_em is null$q$);
-- WhatsApp da Criaê com App Secret, para reaproveitar
insert into public.whatsapp_contas (empresa_id, phone_number_id, waba_id) values ('9b6de084-cbba-4093-9abf-b7d271f08c31', '888000000001', '888000000002');
select private.guardar_segredo('wa_app_secret:' || (select id from public.whatsapp_contas where phone_number_id = '888000000001'), repeat('b', 32));

-- ===== VENDEDOR (Dons tech) =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000bb","role":"authenticated"}', true);
select private._t('V1 vendedor conecta (esperado ERRO)', $q$select public.meta_conectar('1234567899', repeat('t', 40), repeat('a', 32))::text$q$);
select private._t('V2 vendedor vê a conta (esperado 0)', $q$select count(*) from meta_contas$q$);
select private._t('V3 vendedor vê leads recebidos (esperado 0)', $q$select count(*) from meta_leads$q$);
select private._t('V4 vendedor desconecta (esperado ERRO)', $q$select public.meta_desconectar()::text$q$);
select private._t('V5 vendedor lê a campanha dos leads (esperado ok)', $q$select (count(campanha) >= 0)::text from leads$q$);
reset role;

-- ===== ADMIN da Criaê: reaproveita o App Secret do WhatsApp =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000cc","role":"authenticated"}', true);
select private._t('C1 Criaê não vê a conta da Dons (esperado 0)', $q$select count(*) from meta_contas$q$);
select private._t('C2 Criaê não vê os leads recebidos da Dons (esperado 0)', $q$select count(*) from meta_leads$q$);
select private._t('C3 mesma Página de outra empresa (esperado ERRO)', $q$select public.meta_conectar('1234567890', repeat('t', 40), repeat('c', 32))::text$q$);
select private._t('C4 conecta sem App Secret (reaproveita o do WhatsApp) (esperado t)', $q$select (public.meta_conectar('5555555555', repeat('u', 40), null) is not null)::text$q$);
reset role;
select private._t('C5 App Secret copiado do WhatsApp (esperado t)', $q$select (app_secret = repeat('b', 32))::text from public.meta_segredos((select id from meta_contas where page_id='5555555555'))$q$);

-- ===== ADMIN desconecta =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"6b82b2d4-8df3-4f5e-889e-4ca24ce4b27a","role":"authenticated"}', true);
select private._t('D1 admin desconecta (esperado vazio)', $q$select public.meta_desconectar()::text$q$);
select private._t('D2 conta removida (esperado 0)', $q$select count(*) from meta_contas$q$);
select private._t('D3 histórico de leads recebidos mantido (esperado 1)', $q$select count(*) from meta_leads$q$);
reset role;
select private._t('D4 segredos apagados do cofre (esperado 0)', $q$select count(*) from vault.secrets s where s.name like 'meta_%' and not exists (select 1 from meta_contas c where s.name like '%' || c.id::text)$q$);
select private._t('D5 auditoria (esperado 3)', $q$select count(*) from logs_auditoria where acao like '%anuncios_meta' and created_at > now() - interval '1 minute'$q$);

-- ===== ANÔNIMO =====
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select private._t('N1 anon conecta (esperado ERRO)', $q$select public.meta_conectar('1234567890', repeat('t', 40), repeat('a', 32))::text$q$);
select private._t('N2 anon vê contas (esperado ERRO ou 0)', $q$select count(*) from meta_contas$q$);
reset role;

do $$
declare r text;
begin
  select string_agg(label || ' => ' || res, E'\n' order by ord) into r from private._ensaio;
  raise exception E'RESULTADOS (rollback forçado):\n%', r;
end $$;
