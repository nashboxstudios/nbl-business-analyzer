-- Synthetic fixtures only; everything is rolled back. No existing candidate is modified.
begin;
-- Discover test account IDs from membership roles; do not publish account identifiers.
select set_config('test.org',m.organization_id::text,true)
from public.organization_members m where m.status='active' and m.module_permissions->>'access_role'='lead_driver' limit 1;
select set_config('test.owner',(select user_id::text from public.organization_members where organization_id=current_setting('test.org')::uuid and role='owner' and status='active' limit 1),true);
select set_config('test.ops',(select user_id::text from public.organization_members where organization_id=current_setting('test.org')::uuid and role='operations' and coalesce(module_permissions->>'access_role','operations')='operations' and status='active' limit 1),true);
select set_config('test.lead',(select user_id::text from public.organization_members where organization_id=current_setting('test.org')::uuid and module_permissions->>'access_role'='lead_driver' and status='active' limit 1),true);
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.owner'),'role','authenticated')::text,true);
insert into public.nbl_fc_recruitment_test_records(organization_id,record_type,record_key,payload)
values (current_setting('test.org')::uuid,'candidate','test_privacy_v140_rollback',
replace('{"id":"test_privacy_v140_rollback","name":"Privacy Fixture","location":"Nashville","dob":"RESTRICTED_CANARY","cdlNumber":"RESTRICTED_CANARY","email":"RESTRICTED_CANARY","address":"RESTRICTED_CANARY","notes":"RESTRICTED_CANARY","ssnFull":"123456789","ssnLast4":"6789","unknown":{"ssn":"123456789","privateNotes":"RESTRICTED_CANARY"},"roadTestForm":{"socialSecurityNumber":"123456789"},"hiringSummary":{"proposedPay":"RESTRICTED_CANARY"},"documents":{"sensitive":{"path":"__fixture_org__/fixture/sensitive.pdf","label":"RESTRICTED_CANARY"},"general":{"bucket":"nbl-recruitment-general-documents","path":"__fixture_org__/fixture/general.pdf","label":"Training checklist"}},"testPipeline":{"stage":"Training","history":[{"notes":"RESTRICTED_CANARY"}],"screening":{"date":"2026-10-07","criminalNotes":"RESTRICTED_CANARY"},"background":{"notes":"RESTRICTED_CANARY"},"ops":{"agreedDays":"Mon-Fri","notes":"RESTRICTED_CANARY"},"training":{"trainer":"Fixture Trainer","notes":"RESTRICTED_CANARY"},"onboarding":{"adp":"Sent","notes":"RESTRICTED_CANARY"}}}','__fixture_org__',current_setting('test.org'))::jsonb);
insert into storage.objects(bucket_id,name) values
('nbl-recruitment-documents',current_setting('test.org')||'/fixture/privacy_v140_sensitive'),
('nbl-recruitment-general-documents',current_setting('test.org')||'/fixture/privacy_v140_general');
do $$ declare p jsonb; begin
  select payload into p from public.nbl_fc_recruitment_test_records where record_key='test_privacy_v140_rollback';
  if p::text like '%123456789%' or p->>'ssnLast4'<>'6789' then raise exception 'SSN stripping failed';end if;
  if not private.can_manage_recruitment(current_setting('test.org')::uuid) then raise exception 'Owner denied';end if;
  if (select count(*) from storage.objects where name like '%privacy_v140_%')<>2 then raise exception 'Owner document access failed';end if;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.lead'),'role','authenticated')::text,true);
do $$ declare p jsonb; n integer; begin
  if private.can_manage_recruitment(current_setting('test.org')::uuid) then raise exception 'Lead has hiring access';end if;
  if exists(select 1 from public.nbl_fc_recruitment_test_records) or exists(select 1 from public.nbl_fc_recruitment_records) then raise exception 'Lead read raw records';end if;
  if exists(select 1 from public.module_snapshots where module_key='hr') then raise exception 'Lead read HR snapshot';end if;
  select x into p from public.get_recruitment_operational(current_setting('test.org')::uuid,'active') x where x->>'id'='test_privacy_v140_rollback';
  if p is null or p::text like '%RESTRICTED_CANARY%' or p::text like '%123456789%' or p::text like '%6789%' then raise exception 'Operational projection leaked or missing';end if;
  if p#>>'{testPipeline,ops,agreedDays}'<>'Mon-Fri' or not(p->'documents' ? 'general') or p->'documents' ? 'sensitive' then raise exception 'Operational fields incorrect';end if;
  update public.nbl_fc_recruitment_test_records set payload='{}' where record_key='test_privacy_v140_rollback';
  get diagnostics n=row_count;if n<>0 then raise exception 'Lead modified candidate';end if;
  if (select count(*) from storage.objects where name like '%privacy_v140_sensitive')<>0 or (select count(*) from storage.objects where name like '%privacy_v140_general')<>1 then raise exception 'Lead document access incorrect';end if;
  begin
    insert into storage.objects(bucket_id,name) values('nbl-recruitment-general-documents',current_setting('test.org')||'/fixture/lead_write');
    raise exception 'Lead uploaded document';
  exception when insufficient_privilege then null;end;
  begin
    perform * from public.get_recruitment_operational('00000000-0000-0000-0000-000000000001','active');
    raise exception 'Cross-organization RPC accepted';
  exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.ops'),'role','authenticated')::text,true);
do $$ begin
  if not exists(select 1 from public.nbl_fc_recruitment_test_records where record_key='test_privacy_v140_rollback') then raise exception 'Ops raw access lost';end if;
  if (select count(*) from storage.objects where name like '%privacy_v140_%')<>2 then raise exception 'Ops document access lost';end if;
end $$;
set local request.jwt.claims='{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
do $$ begin
  if exists(select 1 from public.nbl_fc_recruitment_test_records) or exists(select 1 from storage.objects where name like '%privacy_v140_%') then raise exception 'Outsider access';end if;
  begin
    perform * from public.get_recruitment_operational(current_setting('test.org')::uuid,'active');
    raise exception 'Outsider RPC accepted';
  exception when insufficient_privilege then null;end;
end $$;
rollback;
select 'PASS owner/Ops access, Lead redaction/read-only, private/general storage, cross-org and outsider denial, recursive SSN stripping; all fixtures rolled back' as result;
