-- Aplicada em 22/11/2026.
-- Usuários de teste (perfis caem em cascata; leads/tarefas/anotações ficam sem dono via SET NULL)
delete from auth.users
where email in ('suporte@donstech.com.br', 'teste@donstech.com.br');

-- Schema legado (tenants/profiles) — substituído por empresas/perfis
alter table public.leads drop constraint if exists leads_tenant_id_fkey;
alter table public.leads drop column if exists tenant_id;
drop table if exists public.profiles;
drop table if exists public.tenants;
drop function if exists public.get_user_role();
drop function if exists public.get_user_tenant_id();
drop function if exists public.is_superadmin();
