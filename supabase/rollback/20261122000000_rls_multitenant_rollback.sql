-- ROLLBACK DE EMERGÊNCIA da migration 20261122000000_rls_multitenant.sql
-- Use só se o painel parar de funcionar depois de aplicar o RLS.
-- Desliga o RLS para que usuários LOGADOS voltem a acessar como antes.
-- NÃO devolve privilégios ao papel anon (visitantes continuam bloqueados),
-- então o banco não volta a ficar totalmente aberto.

begin;

alter table public.empresas        disable row level security;
alter table public.perfis          disable row level security;
alter table public.etapas_funil    disable row level security;
alter table public.leads           disable row level security;
alter table public.lead_anotacoes  disable row level security;
alter table public.tarefas         disable row level security;
alter table public.lead_movimentos disable row level security;
alter table public.logs_auditoria  disable row level security;

commit;
