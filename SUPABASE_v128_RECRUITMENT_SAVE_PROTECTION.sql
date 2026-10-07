-- Recruitment: retain existing organization/role policies and restrict deletes
-- to the single candidate named by the explicit Delete action.
begin;
drop policy if exists nbl_fc_recruitment_explicit_delete on public.nbl_fc_recruitment_records;
create policy nbl_fc_recruitment_explicit_delete
  on public.nbl_fc_recruitment_records
  as restrictive for delete to authenticated
  using (
    record_type = 'candidate'
    and record_key = (
      coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb
      ->> 'x-nbl-recruitment-delete'
    )
  );
commit;
