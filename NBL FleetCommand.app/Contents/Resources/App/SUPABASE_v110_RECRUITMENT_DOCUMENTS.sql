-- NBL FleetCommand v110
-- Run once in Supabase Dashboard -> SQL Editor before deploying v110.
-- Creates a private bucket for CDL and Medical Card documents.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'nbl-recruitment-documents',
  'nbl-recruitment-documents',
  false,
  10485760,
  array['application/pdf','image/jpeg','image/png']::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists nbl_recruitment_documents_select on storage.objects;
create policy nbl_recruitment_documents_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'nbl-recruitment-documents'
    and exists (
      select 1 from public.organization_members m
      where m.organization_id::text = (storage.foldername(name))[1]
        and m.user_id = (select auth.uid())
        and m.status = 'active'
        and m.role in ('owner','operations')
    )
  );

drop policy if exists nbl_recruitment_documents_insert on storage.objects;
create policy nbl_recruitment_documents_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'nbl-recruitment-documents'
    and exists (
      select 1 from public.organization_members m
      where m.organization_id::text = (storage.foldername(name))[1]
        and m.user_id = (select auth.uid())
        and m.status = 'active'
        and m.role in ('owner','operations')
    )
  );

drop policy if exists nbl_recruitment_documents_update on storage.objects;
create policy nbl_recruitment_documents_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'nbl-recruitment-documents'
    and exists (
      select 1 from public.organization_members m
      where m.organization_id::text = (storage.foldername(name))[1]
        and m.user_id = (select auth.uid())
        and m.status = 'active'
        and m.role in ('owner','operations')
    )
  )
  with check (
    bucket_id = 'nbl-recruitment-documents'
    and exists (
      select 1 from public.organization_members m
      where m.organization_id::text = (storage.foldername(name))[1]
        and m.user_id = (select auth.uid())
        and m.status = 'active'
        and m.role in ('owner','operations')
    )
  );

drop policy if exists nbl_recruitment_documents_delete on storage.objects;
create policy nbl_recruitment_documents_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'nbl-recruitment-documents'
    and exists (
      select 1 from public.organization_members m
      where m.organization_id::text = (storage.foldername(name))[1]
        and m.user_id = (select auth.uid())
        and m.status = 'active'
        and m.role in ('owner','operations')
    )
  );

commit;
