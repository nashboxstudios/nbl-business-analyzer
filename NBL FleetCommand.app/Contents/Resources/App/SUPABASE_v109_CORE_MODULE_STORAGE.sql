-- NBL FleetCommand v109
-- Run once in Supabase Dashboard -> SQL Editor before deploying v109.
-- Adds record-level storage for Maintenance, Recruitment, Finance, Audit, and Meetings.

begin;

create table if not exists public.nbl_fc_maintenance_records (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  record_type text not null check (record_type in ('settings','tractor','service')),
  record_key text not null,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (organization_id, record_type, record_key)
);

create table if not exists public.nbl_fc_recruitment_records (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  record_type text not null check (record_type in ('settings','candidate')),
  record_key text not null,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (organization_id, record_type, record_key)
);

create table if not exists public.nbl_fc_finance_records (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  record_type text not null check (record_type in ('driver_pay_settings','payroll_profile','payroll_period','settlement_settings','settlement_statement')),
  record_key text not null,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (organization_id, record_type, record_key)
);

create table if not exists public.nbl_fc_audit_records (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  record_type text not null check (record_type in ('settings','audit','finding')),
  record_key text not null,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (organization_id, record_type, record_key)
);

create table if not exists public.nbl_fc_meeting_records (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  record_type text not null check (record_type in ('settings','inspection','management_item')),
  record_key text not null,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (organization_id, record_type, record_key)
);

create index if not exists nbl_fc_maintenance_records_lookup_idx on public.nbl_fc_maintenance_records (organization_id, record_type, updated_at desc);
create index if not exists nbl_fc_recruitment_records_lookup_idx on public.nbl_fc_recruitment_records (organization_id, record_type, updated_at desc);
create index if not exists nbl_fc_finance_records_lookup_idx on public.nbl_fc_finance_records (organization_id, record_type, updated_at desc);
create index if not exists nbl_fc_audit_records_lookup_idx on public.nbl_fc_audit_records (organization_id, record_type, updated_at desc);
create index if not exists nbl_fc_meeting_records_lookup_idx on public.nbl_fc_meeting_records (organization_id, record_type, updated_at desc);

alter table public.nbl_fc_maintenance_records enable row level security;
alter table public.nbl_fc_recruitment_records enable row level security;
alter table public.nbl_fc_finance_records enable row level security;
alter table public.nbl_fc_audit_records enable row level security;
alter table public.nbl_fc_meeting_records enable row level security;

grant select, insert, update, delete on public.nbl_fc_maintenance_records to authenticated;
grant select, insert, update, delete on public.nbl_fc_recruitment_records to authenticated;
grant select, insert, update, delete on public.nbl_fc_finance_records to authenticated;
grant select, insert, update, delete on public.nbl_fc_audit_records to authenticated;
grant select, insert, update, delete on public.nbl_fc_meeting_records to authenticated;

drop policy if exists nbl_fc_maintenance_records_member_access on public.nbl_fc_maintenance_records;
create policy nbl_fc_maintenance_records_member_access on public.nbl_fc_maintenance_records
  for all to authenticated
  using (exists (select 1 from public.organization_members m where m.organization_id = nbl_fc_maintenance_records.organization_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('owner','operations')))
  with check (exists (select 1 from public.organization_members m where m.organization_id = nbl_fc_maintenance_records.organization_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('owner','operations')));

drop policy if exists nbl_fc_recruitment_records_member_access on public.nbl_fc_recruitment_records;
create policy nbl_fc_recruitment_records_member_access on public.nbl_fc_recruitment_records
  for all to authenticated
  using (exists (select 1 from public.organization_members m where m.organization_id = nbl_fc_recruitment_records.organization_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('owner','operations')))
  with check (exists (select 1 from public.organization_members m where m.organization_id = nbl_fc_recruitment_records.organization_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('owner','operations')));

drop policy if exists nbl_fc_audit_records_member_access on public.nbl_fc_audit_records;
create policy nbl_fc_audit_records_member_access on public.nbl_fc_audit_records
  for all to authenticated
  using (exists (select 1 from public.organization_members m where m.organization_id = nbl_fc_audit_records.organization_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('owner','operations')))
  with check (exists (select 1 from public.organization_members m where m.organization_id = nbl_fc_audit_records.organization_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('owner','operations')));

drop policy if exists nbl_fc_meeting_records_member_access on public.nbl_fc_meeting_records;
create policy nbl_fc_meeting_records_member_access on public.nbl_fc_meeting_records
  for all to authenticated
  using (exists (select 1 from public.organization_members m where m.organization_id = nbl_fc_meeting_records.organization_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('owner','operations')))
  with check (exists (select 1 from public.organization_members m where m.organization_id = nbl_fc_meeting_records.organization_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('owner','operations')));

drop policy if exists nbl_fc_finance_records_owner_access on public.nbl_fc_finance_records;
create policy nbl_fc_finance_records_owner_access on public.nbl_fc_finance_records
  for all to authenticated
  using (exists (select 1 from public.organization_members m where m.organization_id = nbl_fc_finance_records.organization_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role = 'owner'))
  with check (exists (select 1 from public.organization_members m where m.organization_id = nbl_fc_finance_records.organization_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role = 'owner'));

commit;
