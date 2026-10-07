-- Isolated recruitment sandbox. This migration never updates production candidates.
create table if not exists public.nbl_fc_recruitment_test_records (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  record_type text not null check (record_type in ('candidate','settings')),
  record_key text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  primary key (organization_id,record_type,record_key),
  check (record_type <> 'candidate' or (left(record_key,5)='test_' and coalesce(payload->>'id'=record_key,false)))
);
alter table public.nbl_fc_recruitment_test_records enable row level security;
revoke all on public.nbl_fc_recruitment_test_records from anon;
revoke delete,truncate on public.nbl_fc_recruitment_test_records from authenticated;
grant select,insert,update on public.nbl_fc_recruitment_test_records to authenticated;
drop policy if exists recruitment_test_member_access on public.nbl_fc_recruitment_test_records;
create policy recruitment_test_member_access on public.nbl_fc_recruitment_test_records
  for all to authenticated
  using (exists (select 1 from public.organization_members m
    where m.organization_id=nbl_fc_recruitment_test_records.organization_id
      and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('owner','operations')))
  with check (exists (select 1 from public.organization_members m
    where m.organization_id=nbl_fc_recruitment_test_records.organization_id
      and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('owner','operations')));

-- One-time snapshot per organization. Re-running this script preserves test edits.
with new_workspaces as (
  insert into public.nbl_fc_recruitment_test_records(organization_id,record_type,record_key,payload)
  select distinct organization_id,'settings','main',jsonb_build_object('version',1,'seededAt',now())
  from public.nbl_fc_recruitment_records
  on conflict do nothing returning organization_id
)
insert into public.nbl_fc_recruitment_test_records(organization_id,record_type,record_key,payload)
select r.organization_id,'candidate','test_'||r.record_key,
  (r.payload - 'ssnFull' - 'ssn' - 'socialSecurityNumber') || jsonb_build_object(
    'id','test_'||r.record_key,'originalCandidateId',r.record_key,
    'roadTestForm',coalesce(r.payload->'roadTestForm','{}'::jsonb)-'ssnFull'-'ssn'-'socialSecurityNumber',
    'testPipeline',jsonb_build_object('version',1,'stageReviewed',false,
      'stage',case
        when r.payload->>'recruitmentStatus'='Hired' then 'Regular Employee'
        when r.payload->>'offerLetter'='Accepted' then 'Training'
        when r.payload->>'roadTest'='Pass' then 'Offer & Onboarding'
        when r.payload->>'roadTest'='Scheduled' then 'Road Test'
        when nullif(r.payload->>'opsInterview','') is not null then 'Ops Interview'
        when nullif(r.payload->>'screeningInterview','') is not null then 'Background & Drug Screen'
        else 'Screening' end,
      'history',jsonb_build_array(jsonb_build_object('at',now(),'action','Copied from Recruitment; suggested stage needs review'))))
from public.nbl_fc_recruitment_records r join new_workspaces w using(organization_id)
where r.record_type='candidate'
on conflict do nothing;
