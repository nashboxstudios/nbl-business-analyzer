-- Run SUPABASE_IFTA_REPORTS.sql first. All fixtures are synthetic and rolled back.
begin;
select set_config('test.org',(select organization_id::text from public.organization_members where role='owner' and status='active' limit 1),true);
select set_config('test.owner',(select user_id::text from public.organization_members where organization_id=current_setting('test.org')::uuid and role='owner' and status='active' limit 1),true);
select set_config('test.ops',(select user_id::text from public.organization_members where organization_id=current_setting('test.org')::uuid and role='operations' and status='active' limit 1),true);
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.owner'),'role','authenticated')::text,true);
insert into public.module_snapshots(organization_id,module_key,data,source_version)
values(current_setting('test.org')::uuid,'ifta:2099-Q4','{"key":"2099-Q4","rows":[],"notes":"synthetic IFTA fixture"}','ifta-test');
do $$ begin
 if not exists(select 1 from public.module_snapshots where module_key='ifta:2099-Q4') then raise exception 'Owner cannot read IFTA';end if;
 update public.module_snapshots set data=data||'{"testUpdated":true}' where module_key='ifta:2099-Q4';
 if not exists(select 1 from public.module_snapshots where module_key='ifta:2099-Q4' and data->>'testUpdated'='true') then raise exception 'Owner cannot update IFTA';end if;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.ops'),'role','authenticated')::text,true);
do $$ declare n integer; begin
 if exists(select 1 from public.module_snapshots where module_key='ifta:2099-Q4') then raise exception 'Operations can read IFTA';end if;
 update public.module_snapshots set data='{}' where module_key='ifta:2099-Q4';get diagnostics n=row_count;
 if n<>0 then raise exception 'Operations can update IFTA';end if;
 begin
  insert into public.module_snapshots(organization_id,module_key,data) values(current_setting('test.org')::uuid,'ifta:2099-Q3','{}');
  raise exception 'Operations can insert IFTA';
 exception when insufficient_privilege then null;end;
end $$;
set local request.jwt.claims='{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
do $$ begin
 if exists(select 1 from public.module_snapshots where module_key='ifta:2099-Q4') then raise exception 'Outsider can read IFTA';end if;
 begin
  insert into public.module_snapshots(organization_id,module_key,data) values(current_setting('test.org')::uuid,'ifta:2099-Q2','{}');
  raise exception 'Outsider can insert IFTA';
 exception when insufficient_privilege then null;end;
end $$;
rollback;
select 'PASS owner IFTA read/write, non-owner and outsider denial; all fixture writes rolled back' as result;
