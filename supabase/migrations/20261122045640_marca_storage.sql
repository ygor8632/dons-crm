-- =====================================================================
-- Dons CRM — Identidade visual com upload (logo + imagem de fundo)
-- ---------------------------------------------------------------------
-- 1. empresas.fundo_url: imagem de fundo do painel da empresa.
--    Guarda o CAMINHO do objeto no bucket `marca` (ex.: "<empresa_id>/fundo-123.webp").
--    logo_url passa a aceitar o mesmo formato; URLs http(s) antigas continuam valendo.
--    O app gera links assinados (bucket privado) ao carregar o painel.
-- 2. Bucket privado `marca`, com arquivos em `marca/<empresa_id>/...`:
--      leitura   → membros da empresa e superadmin
--      gravação  → admin da empresa e superadmin
--    Só PNG, JPEG e WebP, até 5 MB (SVG fica de fora: pode carregar script).
-- Os campos de identidade visual não estão na lista bloqueada do trigger
-- check_empresa_update, então o admin da empresa pode alterá-los.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Coluna
-- ---------------------------------------------------------------------
alter table public.empresas add column if not exists fundo_url text;

comment on column public.empresas.fundo_url is
  'Imagem de fundo do painel: caminho no bucket privado "marca" (<empresa_id>/arquivo) ou URL http(s).';
comment on column public.empresas.logo_url is
  'Logo: caminho no bucket privado "marca" (<empresa_id>/arquivo) ou URL http(s) legada.';

-- ---------------------------------------------------------------------
-- 2. Bucket
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('marca', 'marca', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------
-- 3. Função auxiliar: o usuário pode gravar na pasta desta empresa?
--    Recebe o nome da pasta como texto (evita erro de cast com pastas inválidas).
-- ---------------------------------------------------------------------
create or replace function private.pode_gravar_marca(pasta text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.is_superadmin()
      or exists (
        select 1 from public.perfis
        where id = (select auth.uid())
          and role = 'admin'
          and empresa_id::text = pasta
      )
$$;

create or replace function private.pode_ler_marca(pasta text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.is_superadmin()
      or exists (
        select 1 from public.perfis
        where id = (select auth.uid())
          and empresa_id::text = pasta
      )
$$;

revoke all on function private.pode_gravar_marca(text), private.pode_ler_marca(text) from public, anon;
grant execute on function private.pode_gravar_marca(text), private.pode_ler_marca(text) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- 4. Policies em storage.objects (somente para o bucket `marca`)
-- ---------------------------------------------------------------------
drop policy if exists marca_select on storage.objects;
drop policy if exists marca_insert on storage.objects;
drop policy if exists marca_update on storage.objects;
drop policy if exists marca_delete on storage.objects;

create policy marca_select on storage.objects for select to authenticated
  using ( bucket_id = 'marca' and private.pode_ler_marca((storage.foldername(name))[1]) );

create policy marca_insert on storage.objects for insert to authenticated
  with check ( bucket_id = 'marca' and private.pode_gravar_marca((storage.foldername(name))[1]) );

create policy marca_update on storage.objects for update to authenticated
  using      ( bucket_id = 'marca' and private.pode_gravar_marca((storage.foldername(name))[1]) )
  with check ( bucket_id = 'marca' and private.pode_gravar_marca((storage.foldername(name))[1]) );

create policy marca_delete on storage.objects for delete to authenticated
  using ( bucket_id = 'marca' and private.pode_gravar_marca((storage.foldername(name))[1]) );

commit;
