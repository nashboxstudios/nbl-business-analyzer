-- NBL FleetCommand v113: allow Motive fault codes and maintenance tasks
-- in the existing organization-scoped maintenance store.
begin;

alter table public.nbl_fc_maintenance_records
  drop constraint if exists nbl_fc_maintenance_records_record_type_check;

alter table public.nbl_fc_maintenance_records
  add constraint nbl_fc_maintenance_records_record_type_check
  check (record_type in ('settings','tractor','service','fault','task')) not valid;

alter table public.nbl_fc_maintenance_records
  validate constraint nbl_fc_maintenance_records_record_type_check;

commit;
