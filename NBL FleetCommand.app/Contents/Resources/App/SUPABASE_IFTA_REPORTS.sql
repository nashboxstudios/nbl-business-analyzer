-- IFTA reports include finance-derived fuel transactions. Constrain all existing
-- permissive snapshot policies without broadening access to any other module.
alter table public.module_snapshots drop constraint if exists module_snapshots_module_key_check;
alter table public.module_snapshots add constraint module_snapshots_module_key_check
check (module_key in ('dashboard','safety','hr','driver_pay','maintenance','meetings','audit','dispatch','settlement','ivmr')
  or module_key ~ '^ifta:(20[0-9]{2}|2100)-Q[1-4]$');
drop policy if exists ifta_reports_owner_only on public.module_snapshots;
create policy ifta_reports_owner_only on public.module_snapshots as restrictive
for all to authenticated
using (module_key not like 'ifta:%' or exists (
  select 1 from public.organization_members m
  where m.organization_id = module_snapshots.organization_id
    and m.user_id = (select auth.uid()) and m.status = 'active' and m.role = 'owner'
))
with check (module_key not like 'ifta:%' or exists (
  select 1 from public.organization_members m
  where m.organization_id = module_snapshots.organization_id
    and m.user_id = (select auth.uid()) and m.status = 'active' and m.role = 'owner'
));
