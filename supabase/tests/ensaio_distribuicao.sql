-- Ensaio da migration 20261127184612_distribuicao_leads (rodado em 27/11/2026: 30/30). Cole DEPOIS do corpo da migration (sem begin/commit),
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
  ('00000000-0000-0000-0000-0000000000dd', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dd.ensaio@exemplo.com'),
  ('00000000-0000-0000-0000-0000000000cc', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cc.ensaio@exemplo.com');
insert into public.perfis (id, empresa_id, email, role, nome) values
  ('00000000-0000-0000-0000-0000000000bb', '8976ddf9-5560-471e-81ca-cfb1839b5713', 'bb.ensaio@exemplo.com', 'vendedor', 'Bruno Ensaio'),
  ('00000000-0000-0000-0000-0000000000dd', '8976ddf9-5560-471e-81ca-cfb1839b5713', 'dd.ensaio@exemplo.com', 'vendedor', 'Diana Ensaio'),
  ('00000000-0000-0000-0000-0000000000cc', '9b6de084-cbba-4093-9abf-b7d271f08c31', 'cc.ensaio@exemplo.com', 'vendedor', 'Criae Ensaio');

-- ===== ADMIN configura =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"6b82b2d4-8df3-4f5e-889e-4ca24ce4b27a","role":"authenticated"}', true);
select private._t('A1 admin: liga sem ninguém (esperado ERRO)', $q$select public.distribuicao_salvar(true, '{}', '[]')::text$q$);
select private._t('A2 admin: participante de outra empresa (esperado ERRO)', $q$select public.distribuicao_salvar(true, array['00000000-0000-0000-0000-0000000000cc']::uuid[], '[]')::text$q$);
select private._t('A3 admin: regra com gente fora da roleta (esperado ERRO)', $q$select public.distribuicao_salvar(true, array['00000000-0000-0000-0000-0000000000bb']::uuid[], '[{"origem":"Google Ads","membros":["00000000-0000-0000-0000-0000000000dd"]}]')::text$q$);
select private._t('A4 admin: salva Bruno+Diana, Google Ads só Diana (esperado vazio)', $q$select public.distribuicao_salvar(true, array['00000000-0000-0000-0000-0000000000bb','00000000-0000-0000-0000-0000000000dd']::uuid[], '[{"origem":"Google Ads","membros":["00000000-0000-0000-0000-0000000000dd"]}]')::text$q$);
select private._t('A5 admin: vê participantes (esperado 2)', $q$select count(*) from distribuicao_membros where participa$q$);
select private._t('A6 admin: vê regras (esperado 1)', $q$select count(*) from distribuicao_regras$q$);
select private._t('A7 admin: escreve direto na tabela (esperado ERRO)', $q$with x as (insert into distribuicao_regras (empresa_id, origem, membros) values ('8976ddf9-5560-471e-81ca-cfb1839b5713','X',array['00000000-0000-0000-0000-0000000000bb']::uuid[]) returning 1) select count(*) from x$q$);
select private._t('A8 admin: cadastro manual sem responsável não passa pela roleta (esperado null)', $q$with x as (insert into leads (empresa_id, nome, origem) values ('8976ddf9-5560-471e-81ca-cfb1839b5713','Manual Ensaio','Site') returning vendedor_id) select vendedor_id::text from x$q$);
reset role;

-- ===== INTEGRAÇÃO (sem usuário logado, como webhook e WhatsApp) =====
select set_config('request.jwt.claims', '', true);
select private._t('W1 1º lead Site (esperado ...bb)', $q$with x as (insert into leads (empresa_id, nome, origem) values ('8976ddf9-5560-471e-81ca-cfb1839b5713','Ens 1','Site') returning vendedor_id) select vendedor_id::text from x$q$);
select private._t('W2 2º lead Site (esperado ...dd)', $q$with x as (insert into leads (empresa_id, nome, origem) values ('8976ddf9-5560-471e-81ca-cfb1839b5713','Ens 2','Site') returning vendedor_id) select vendedor_id::text from x$q$);
select private._t('W3 3º lead Site (esperado ...bb)', $q$with x as (insert into leads (empresa_id, nome, origem) values ('8976ddf9-5560-471e-81ca-cfb1839b5713','Ens 3','Site') returning vendedor_id) select vendedor_id::text from x$q$);
select private._t('W4 lead "google ads " cai na regra (esperado ...dd)', $q$with x as (insert into leads (empresa_id, nome, origem) values ('8976ddf9-5560-471e-81ca-cfb1839b5713','Ens 4','google ads ') returning vendedor_id) select vendedor_id::text from x$q$);
select private._t('W5 lead já com responsável fica com ele (esperado ...bb)', $q$with x as (insert into leads (empresa_id, nome, origem, vendedor_id) values ('8976ddf9-5560-471e-81ca-cfb1839b5713','Ens 5','Site','00000000-0000-0000-0000-0000000000bb') returning vendedor_id) select vendedor_id::text from x$q$);
select private._t('W6 histórico "pela roleta" (esperado 4)', $q$select count(*) from lead_atividades a join leads l on l.id=a.lead_id where l.nome like 'Ens %' and a.tipo='distribuicao' and a.descricao like 'Distribuído para % pela roleta'$q$);
select private._t('W7 contagem: Bruno 2, Diana 2 (esperado 2,2)', $q$select string_agg(recebidos::text, ',' order by perfil_id) from distribuicao_membros where empresa_id='8976ddf9-5560-471e-81ca-cfb1839b5713'$q$);
select private._t('W8 Criaê sem roleta ligada (esperado null)', $q$with x as (insert into leads (empresa_id, nome, origem) values ('9b6de084-cbba-4093-9abf-b7d271f08c31','Ens C','Site') returning vendedor_id) select vendedor_id::text from x$q$);

-- ===== VENDEDOR =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000bb","role":"authenticated"}', true);
select private._t('V1 vendedor: muda a roleta (esperado ERRO)', $q$select public.distribuicao_salvar(true, array['00000000-0000-0000-0000-0000000000bb']::uuid[], '[]')::text$q$);
select private._t('V2 vendedor: distribui (esperado ERRO)', $q$select public.distribuir_sem_responsavel()::text$q$);
select private._t('V3 vendedor: vê participantes (esperado 2)', $q$select count(*) from distribuicao_membros where participa$q$);
select private._t('V4 vendedor: sai da fila sozinho (esperado ERRO)', $q$with x as (update distribuicao_membros set participa=false where perfil_id='00000000-0000-0000-0000-0000000000bb' returning 1) select count(*) from x$q$);
reset role;

-- ===== OUTRA EMPRESA =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000cc","role":"authenticated"}', true);
select private._t('O1 Criaê: vê participantes da Dons (esperado 0)', $q$select count(*) from distribuicao_membros$q$);
select private._t('O2 Criaê: vê regras da Dons (esperado 0)', $q$select count(*) from distribuicao_regras$q$);
reset role;

-- ===== ADMIN distribui os sem responsável e desliga =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"6b82b2d4-8df3-4f5e-889e-4ca24ce4b27a","role":"authenticated"}', true);
select private._t('D1 admin: distribui sem responsável (esperado >= 1)', $q$select public.distribuir_sem_responsavel()::text$q$);
select private._t('D2 sobrou lead em aberto sem dono (esperado 0)', $q$select count(*) from leads where empresa_id='8976ddf9-5560-471e-81ca-cfb1839b5713' and vendedor_id is null and situacao='aberto' and anonimizado_em is null$q$);
select private._t('D3 admin: desliga (esperado vazio)', $q$select public.distribuicao_salvar(false, array['00000000-0000-0000-0000-0000000000bb']::uuid[], '[]')::text$q$);
select private._t('D4 Diana saiu mas mantém histórico (esperado f,2)', $q$select participa::text || ',' || recebidos from distribuicao_membros where perfil_id='00000000-0000-0000-0000-0000000000dd'$q$);
select private._t('D5 registro na auditoria (esperado 2)', $q$select count(*) from logs_auditoria where acao='distribuicao' and created_at > now() - interval '1 minute'$q$);
reset role;
select set_config('request.jwt.claims', '', true);
select private._t('D6 roleta desligada: lead da integração fica sem dono (esperado null)', $q$with x as (insert into leads (empresa_id, nome, origem) values ('8976ddf9-5560-471e-81ca-cfb1839b5713','Ens 6','Site') returning vendedor_id) select vendedor_id::text from x$q$);

-- ===== ANÔNIMO =====
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select private._t('N1 anon: vê participantes (esperado ERRO ou 0)', $q$select count(*) from distribuicao_membros$q$);
select private._t('N2 anon: salva (esperado ERRO)', $q$select public.distribuicao_salvar(true, '{}', '[]')::text$q$);
reset role;

do $$
declare r text;
begin
  select string_agg(label || ' => ' || res, E'\n' order by ord) into r from private._ensaio;
  raise exception E'RESULTADOS (rollback forçado):\n%', r;
end $$;
