-- NBL FleetCommand v108
-- Run once in Supabase Dashboard -> SQL Editor before deploying v108.

begin;

create table if not exists public.safety_event_actions (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_key text not null,
  assigned_driver_id text,
  assigned_driver_name text,
  assigned_employee_id text,
  incident jsonb,
  assigned_at timestamptz,
  assigned_by uuid references auth.users(id) on delete set null,
  dismissed boolean not null default false,
  dismissal_updated_at timestamptz,
  dismissal_updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (organization_id, event_key)
);

create table if not exists public.safety_driver_records (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  driver_id text not null,
  driver_name text,
  employee_id text,
  record jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (organization_id, driver_id)
);

create table if not exists public.safety_event_history (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_key text not null,
  action_type text not null check (action_type in ('assign', 'reassign', 'dismiss', 'restore')),
  action_data jsonb not null default '{}'::jsonb,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_dispatch_boards (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  dispatch_date date not null,
  saved_at timestamptz not null default now(),
  saved_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (organization_id, dispatch_date)
);

create table if not exists public.daily_dispatch_rows (
  organization_id uuid not null,
  dispatch_date date not null,
  route_id text not null,
  route_name text not null default '',
  origin text not null default '',
  hub text not null default 'Other',
  call_status text not null default 'not_received' check (call_status in ('received', 'not_received')),
  dispatch_status text not null default '' check (dispatch_status in ('', 'accepted', 'declined')),
  driver_id text,
  driver_name text,
  refusals jsonb not null default '[]'::jsonb check (jsonb_typeof(refusals) = 'array'),
  decline_reason text not null default '' check (decline_reason in ('', 'driver_unavailable', 'truck_unavailable', 'other')),
  decline_driver_id text,
  decline_driver_name text,
  decline_tractor_id text,
  decline_tractor_number text,
  decline_other text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (organization_id, dispatch_date, route_id),
  foreign key (organization_id, dispatch_date)
    references public.daily_dispatch_boards(organization_id, dispatch_date)
    on delete cascade
);

create index if not exists safety_event_actions_driver_idx
  on public.safety_event_actions (organization_id, assigned_driver_id)
  where assigned_driver_id is not null;
create index if not exists safety_event_history_org_event_idx
  on public.safety_event_history (organization_id, event_key, created_at desc);
create index if not exists daily_dispatch_boards_date_idx
  on public.daily_dispatch_boards (organization_id, dispatch_date desc);
create index if not exists daily_dispatch_rows_hub_idx
  on public.daily_dispatch_rows (organization_id, dispatch_date, hub);
create index if not exists organization_members_user_org_active_idx
  on public.organization_members (user_id, organization_id)
  where status = 'active';

alter table public.safety_event_actions enable row level security;
alter table public.safety_driver_records enable row level security;
alter table public.safety_event_history enable row level security;
alter table public.daily_dispatch_boards enable row level security;
alter table public.daily_dispatch_rows enable row level security;

grant select, insert, update, delete on public.safety_event_actions to authenticated;
grant select, insert, update, delete on public.safety_driver_records to authenticated;
grant select, insert on public.safety_event_history to authenticated;
grant usage, select on sequence public.safety_event_history_id_seq to authenticated;
grant select, insert, update, delete on public.daily_dispatch_boards to authenticated;
grant select, insert, update, delete on public.daily_dispatch_rows to authenticated;

drop policy if exists safety_event_actions_select on public.safety_event_actions;
create policy safety_event_actions_select on public.safety_event_actions
  for select to authenticated
  using (exists (
    select 1 from public.organization_members m
    where m.organization_id = safety_event_actions.organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role in ('owner', 'operations')
  ));
drop policy if exists safety_event_actions_insert on public.safety_event_actions;
create policy safety_event_actions_insert on public.safety_event_actions
  for insert to authenticated
  with check (exists (
    select 1 from public.organization_members m
    where m.organization_id = safety_event_actions.organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role in ('owner', 'operations')
  ));
drop policy if exists safety_event_actions_update on public.safety_event_actions;
create policy safety_event_actions_update on public.safety_event_actions
  for update to authenticated
  using (exists (
    select 1 from public.organization_members m
    where m.organization_id = safety_event_actions.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
      and m.role in ('owner', 'operations')
  ))
  with check (exists (
    select 1 from public.organization_members m
    where m.organization_id = safety_event_actions.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
      and m.role in ('owner', 'operations')
  ));
drop policy if exists safety_event_actions_delete on public.safety_event_actions;
create policy safety_event_actions_delete on public.safety_event_actions
  for delete to authenticated
  using (exists (
    select 1 from public.organization_members m
    where m.organization_id = safety_event_actions.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
      and m.role in ('owner', 'operations')
  ));

drop policy if exists safety_driver_records_select on public.safety_driver_records;
create policy safety_driver_records_select on public.safety_driver_records
  for select to authenticated
  using (exists (
    select 1 from public.organization_members m
    where m.organization_id = safety_driver_records.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
      and m.role in ('owner', 'operations')
  ));
drop policy if exists safety_driver_records_insert on public.safety_driver_records;
create policy safety_driver_records_insert on public.safety_driver_records
  for insert to authenticated
  with check (exists (
    select 1 from public.organization_members m
    where m.organization_id = safety_driver_records.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
      and m.role in ('owner', 'operations')
  ));
drop policy if exists safety_driver_records_update on public.safety_driver_records;
create policy safety_driver_records_update on public.safety_driver_records
  for update to authenticated
  using (exists (
    select 1 from public.organization_members m
    where m.organization_id = safety_driver_records.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
      and m.role in ('owner', 'operations')
  ))
  with check (exists (
    select 1 from public.organization_members m
    where m.organization_id = safety_driver_records.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
      and m.role in ('owner', 'operations')
  ));
drop policy if exists safety_driver_records_delete on public.safety_driver_records;
create policy safety_driver_records_delete on public.safety_driver_records
  for delete to authenticated
  using (exists (
    select 1 from public.organization_members m
    where m.organization_id = safety_driver_records.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
      and m.role in ('owner', 'operations')
  ));

drop policy if exists safety_event_history_select on public.safety_event_history;
create policy safety_event_history_select on public.safety_event_history
  for select to authenticated
  using (exists (
    select 1 from public.organization_members m
    where m.organization_id = safety_event_history.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
      and m.role in ('owner', 'operations')
  ));
drop policy if exists safety_event_history_insert on public.safety_event_history;
create policy safety_event_history_insert on public.safety_event_history
  for insert to authenticated
  with check (exists (
    select 1 from public.organization_members m
    where m.organization_id = safety_event_history.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
      and m.role in ('owner', 'operations')
  ));

drop policy if exists daily_dispatch_boards_select on public.daily_dispatch_boards;
create policy daily_dispatch_boards_select on public.daily_dispatch_boards
  for select to authenticated
  using (exists (
    select 1 from public.organization_members m
    where m.organization_id = daily_dispatch_boards.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
      and m.role in ('owner', 'operations')
  ));
drop policy if exists daily_dispatch_boards_insert on public.daily_dispatch_boards;
create policy daily_dispatch_boards_insert on public.daily_dispatch_boards
  for insert to authenticated
  with check (exists (
    select 1 from public.organization_members m
    where m.organization_id = daily_dispatch_boards.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
      and m.role in ('owner', 'operations')
  ));
drop policy if exists daily_dispatch_boards_update on public.daily_dispatch_boards;
create policy daily_dispatch_boards_update on public.daily_dispatch_boards
  for update to authenticated
  using (exists (
    select 1 from public.organization_members m
    where m.organization_id = daily_dispatch_boards.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
      and m.role in ('owner', 'operations')
  ))
  with check (exists (
    select 1 from public.organization_members m
    where m.organization_id = daily_dispatch_boards.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
      and m.role in ('owner', 'operations')
  ));
drop policy if exists daily_dispatch_boards_delete on public.daily_dispatch_boards;
create policy daily_dispatch_boards_delete on public.daily_dispatch_boards
  for delete to authenticated
  using (exists (
    select 1 from public.organization_members m
    where m.organization_id = daily_dispatch_boards.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
      and m.role in ('owner', 'operations')
  ));

drop policy if exists daily_dispatch_rows_select on public.daily_dispatch_rows;
create policy daily_dispatch_rows_select on public.daily_dispatch_rows
  for select to authenticated
  using (exists (
    select 1 from public.organization_members m
    where m.organization_id = daily_dispatch_rows.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
      and m.role in ('owner', 'operations')
  ));
drop policy if exists daily_dispatch_rows_insert on public.daily_dispatch_rows;
create policy daily_dispatch_rows_insert on public.daily_dispatch_rows
  for insert to authenticated
  with check (exists (
    select 1 from public.organization_members m
    where m.organization_id = daily_dispatch_rows.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
      and m.role in ('owner', 'operations')
  ));
drop policy if exists daily_dispatch_rows_update on public.daily_dispatch_rows;
create policy daily_dispatch_rows_update on public.daily_dispatch_rows
  for update to authenticated
  using (exists (
    select 1 from public.organization_members m
    where m.organization_id = daily_dispatch_rows.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
      and m.role in ('owner', 'operations')
  ))
  with check (exists (
    select 1 from public.organization_members m
    where m.organization_id = daily_dispatch_rows.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
      and m.role in ('owner', 'operations')
  ));
drop policy if exists daily_dispatch_rows_delete on public.daily_dispatch_rows;
create policy daily_dispatch_rows_delete on public.daily_dispatch_rows
  for delete to authenticated
  using (exists (
    select 1 from public.organization_members m
    where m.organization_id = daily_dispatch_rows.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
      and m.role in ('owner', 'operations')
  ));

commit;
