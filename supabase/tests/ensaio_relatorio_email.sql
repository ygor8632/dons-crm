-- Ensaio da migration 20261123185126_relatorio_email. Cole DEPOIS do corpo da migration
-- (sem begin/commit), tudo num único BEGIN; o último bloco lança erro com os resultados,
-- forçando o ROLLBACK. IDs de 22/11/2026: admin 6b82b2d4 (Dons tech 8976ddf9), superadmin
-- 29d9c75d, outra empresa Criaê 9b6de084. Usuários e leads de teste somem no rollback.
-- Rodado em 23/11/2026 antes de aplicar: 18/18 conforme o esperado.

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

insert into public.relatorios_enviados (empresa_id, mes, tipo, destinatarios) values ('8976ddf9-5560-471e-81ca-cfb1839b5713', '2026-10-01', 'mensal', 2);

-- ===== Como postgres =====
select private._t('C1 e-mail extra inválido (esperado ERRO)', $q$with x as (update empresas set relatorio_emails_extras = array['nao-e-email'] where id = '8976ddf9-5560-471e-81ca-cfb1839b5713' returning 1) select count(*) from x$q$);
select private._t('C2 seis e-mails extras (esperado ERRO)', $q$with x as (update empresas set relatorio_emails_extras = array['a@b.co','c@b.co','d@b.co','e@b.co','f@b.co','g@b.co'] where id = '8976ddf9-5560-471e-81ca-cfb1839b5713' returning 1) select count(*) from x$q$);
select private._t('C3 empresas começam com envio ligado (esperado 0 desligadas)', $q$select count(*) from empresas where not relatorio_email_ativo$q$);
select private._t('C4 agendamento criado dia 1 às 11h UTC (esperado 0 11 1 * *)', $q$select schedule from cron.job where jobname = 'relatorio-mensal'$q$);
select private._t('C5 token guardado no Vault e válido (esperado t)', $q$select public.relatorio_token_valido((select decrypted_secret from vault.decrypted_secrets where name = 'relatorio_cron_token'))::text$q$);
select private._t('C6 mesmo mês duas vezes (esperado ERRO)', $q$with x as (insert into relatorios_enviados (empresa_id, mes, tipo) values ('8976ddf9-5560-471e-81ca-cfb1839b5713', '2026-10-01', 'mensal') returning 1) select count(*) from x$q$);
select private._t('C7 prévia do mesmo mês é permitida (esperado 1)', $q$with x as (insert into relatorios_enviados (empresa_id, mes, tipo) values ('8976ddf9-5560-471e-81ca-cfb1839b5713', '2026-10-01', 'previa') returning 1) select count(*) from x$q$);

-- ===== ADMIN (Dons tech) =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"6b82b2d4-8df3-4f5e-889e-4ca24ce4b27a","role":"authenticated"}', true);
select private._t('A1 admin: desliga o envio e cadastra extras (esperado 1)', $q$with x as (update empresas set relatorio_email_ativo = false, relatorio_emails_extras = array['dono@exemplo.com'] where id = '8976ddf9-5560-471e-81ca-cfb1839b5713' returning 1) select count(*) from x$q$);
select private._t('A2 admin: vê os envios da empresa (esperado 2)', $q$select count(*) from relatorios_enviados$q$);
select private._t('A3 admin: grava um envio (esperado ERRO)', $q$with x as (insert into relatorios_enviados (empresa_id, mes, tipo) values ('8976ddf9-5560-471e-81ca-cfb1839b5713', '2026-09-01', 'mensal') returning 1) select count(*) from x$q$);
select private._t('A4 admin: testa o token (esperado ERRO)', $q$select public.relatorio_token_valido('x')::text$q$);
select private._t('A5 admin: dispara o envio (esperado ERRO)', $q$select private.disparar_relatorio_mensal()::text$q$);
reset role;

-- ===== VENDEDOR (Dons tech) =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000bb","role":"authenticated"}', true);
select private._t('V1 vendedor: vê envios (esperado 0)', $q$select count(*) from relatorios_enviados$q$);
select private._t('V2 vendedor: muda o envio (esperado 0)', $q$with x as (update empresas set relatorio_email_ativo = true where id = '8976ddf9-5560-471e-81ca-cfb1839b5713' returning 1) select count(*) from x$q$);
reset role;

-- ===== OUTRA EMPRESA (Criaê) =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000cc","role":"authenticated"}', true);
select private._t('O1 outra empresa: vê envios da Dons (esperado 0)', $q$select count(*) from relatorios_enviados$q$);
reset role;

-- ===== SUPERADMIN =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"29d9c75d-1600-4d13-bf08-a82bbf01595e","role":"authenticated"}', true);
select private._t('S1 superadmin: vê envios (esperado >= 2)', $q$select count(*) from relatorios_enviados$q$);
reset role;

-- ===== ANÔNIMO =====
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select private._t('N1 anon: vê envios (esperado ERRO ou 0)', $q$select count(*) from relatorios_enviados$q$);
select private._t('N2 anon: testa o token (esperado ERRO)', $q$select public.relatorio_token_valido('x')::text$q$);
reset role;

do $$
declare r text;
begin
  select string_agg(label || ' => ' || res, E'\n' order by ord) into r from private._ensaio;
  raise exception E'RESULTADOS (rollback forçado):\n%', r;
end $$;
