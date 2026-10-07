-- NBL FleetCommand v111
-- Run once in Supabase Dashboard -> SQL Editor after the v110 recruitment documents script.
-- Expands the private recruitment bucket to accept the document types supported by v111.

begin;

update storage.buckets
set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/heic',
    'image/heif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
where id = 'nbl-recruitment-documents';

commit;
