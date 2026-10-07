-- Preserve all candidate records and document objects. Existing uploads are restricted.
create or replace function private.can_manage_recruitment(target_org uuid)
returns boolean language sql stable security invoker set search_path = '' as $$
  select exists (select 1 from public.organization_members m
    where m.organization_id=target_org and m.user_id=(select auth.uid()) and m.status='active'
      and (m.role='owner' or (m.role='operations'
        and coalesce(m.module_permissions->>'access_role','operations')='operations')));
$$;
revoke all on function private.can_manage_recruitment(uuid) from public, anon;
grant execute on function private.can_manage_recruitment(uuid) to authenticated;

-- Restrictive policies also constrain any older permissive policy, including snapshots.
do $$ declare table_name text; begin
  foreach table_name in array array['nbl_fc_recruitment_records','nbl_fc_recruitment_test_records','hr_candidates','hr_candidate_sensitive','hr_road_tests'] loop
    execute format('drop policy if exists recruitment_hiring_staff_only on public.%I',table_name);
    execute format('create policy recruitment_hiring_staff_only on public.%I as restrictive for all to authenticated using (private.can_manage_recruitment(organization_id)) with check (private.can_manage_recruitment(organization_id))',table_name);
    execute format('revoke truncate, references, trigger on public.%I from anon, authenticated',table_name);
  end loop;
end $$;
drop policy if exists recruitment_snapshot_hiring_staff_only on public.module_snapshots;
create policy recruitment_snapshot_hiring_staff_only on public.module_snapshots as restrictive
for all to authenticated
using (module_key not in ('hr','recruitment','recruitment-test') or private.can_manage_recruitment(organization_id))
with check (module_key not in ('hr','recruitment','recruitment-test') or private.can_manage_recruitment(organization_id));

-- Structured SSNs are never accepted into candidate JSON, even via direct REST writes.
create or replace function private.strip_recruitment_ssn(value jsonb)
returns jsonb language plpgsql immutable security invoker set search_path='' as $$
declare result jsonb; k text; v jsonb;
begin
  if jsonb_typeof(value)='object' then
    result='{}'::jsonb;
    for k,v in select key,val from jsonb_each(value) as e(key,val) loop
      if lower(regexp_replace(k,'[^a-zA-Z]','','g')) not in ('ssn','ssnfull','fullssn','socialsecuritynumber','socialsecurity') then
        result=result||jsonb_build_object(k,private.strip_recruitment_ssn(v));
      end if;
    end loop;
    return result;
  elsif jsonb_typeof(value)='array' then
    select coalesce(jsonb_agg(private.strip_recruitment_ssn(val) order by ord),'[]'::jsonb)
    into result from jsonb_array_elements(value) with ordinality as e(val,ord);
    return result;
  end if;
  return value;
end $$;
revoke all on function private.strip_recruitment_ssn(jsonb) from public, anon;
grant execute on function private.strip_recruitment_ssn(jsonb) to authenticated;
grant execute on function private.strip_recruitment_ssn(jsonb) to service_role;
create or replace function private.recruitment_strip_ssn_trigger()
returns trigger language plpgsql security invoker set search_path='' as $$
begin new.payload=private.strip_recruitment_ssn(new.payload);return new;end $$;
revoke all on function private.recruitment_strip_ssn_trigger() from public, anon, authenticated;
do $$ declare table_name text; begin
  foreach table_name in array array['nbl_fc_recruitment_records','nbl_fc_recruitment_test_records'] loop
    execute format('drop trigger if exists recruitment_strip_ssn on public.%I',table_name);
    execute format('create trigger recruitment_strip_ssn before insert or update on public.%I for each row execute function private.recruitment_strip_ssn_trigger()',table_name);
  end loop;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('nbl-recruitment-general-documents','nbl-recruitment-general-documents',false,10485760,
array['application/pdf','image/jpeg','image/png','image/heic','image/heif','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict(id) do update set public=false;
update storage.buckets set public=false where id='nbl-recruitment-documents';
drop policy if exists recruitment_sensitive_staff_only on storage.objects;
create policy recruitment_sensitive_staff_only on storage.objects as restrictive
for all to authenticated
using (bucket_id<>'nbl-recruitment-documents' or exists(select 1 from public.organization_members m
where m.organization_id::text=(storage.foldername(objects.name))[1] and m.user_id=(select auth.uid())
and m.status='active' and (m.role='owner' or (m.role='operations' and coalesce(m.module_permissions->>'access_role','operations')='operations'))))
with check (bucket_id<>'nbl-recruitment-documents' or exists(select 1 from public.organization_members m
where m.organization_id::text=(storage.foldername(objects.name))[1] and m.user_id=(select auth.uid())
and m.status='active' and (m.role='owner' or (m.role='operations' and coalesce(m.module_permissions->>'access_role','operations')='operations'))));
drop policy if exists recruitment_general_read on storage.objects;
create policy recruitment_general_read on storage.objects for select to authenticated
using (bucket_id='nbl-recruitment-general-documents' and exists(select 1 from public.organization_members m
where m.organization_id::text=(storage.foldername(objects.name))[1] and m.user_id=(select auth.uid())
and m.status='active' and m.role in ('owner','operations')));
drop policy if exists recruitment_general_insert on storage.objects;
create policy recruitment_general_insert on storage.objects for insert to authenticated
with check (bucket_id='nbl-recruitment-general-documents' and exists(select 1 from public.organization_members m
where m.organization_id::text=(storage.foldername(objects.name))[1] and private.can_manage_recruitment(m.organization_id)));

-- This privileged lookup is deliberately private and returns a fixed allowlist only.
-- It cannot return raw candidate JSON, arbitrary tables, identifiers, screening or pay.
create or replace function private.read_recruitment_operational(target_org uuid, source_name text)
returns setof jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if source_name not in ('active','archive') or not exists(select 1 from public.organization_members m
    where m.organization_id=target_org and m.user_id=(select auth.uid()) and m.status='active'
      and m.role in ('owner','operations')) then
    raise insufficient_privilege using message='Recruitment operational access is required.';
  end if;
  return query
  with records as (
    select r.payload,r.updated_at from public.nbl_fc_recruitment_test_records r
      where source_name='active' and r.organization_id=target_org and r.record_type='candidate'
    union all
    select r.payload,r.updated_at from public.nbl_fc_recruitment_records r
      where source_name='archive' and r.organization_id=target_org and r.record_type='candidate'
  )
  select jsonb_strip_nulls(jsonb_build_object(
    'id',payload->'id','name',payload->'name','location',coalesce(payload->'location',payload->'domicile'),
    'domicile',coalesce(payload->'domicile',payload->'location'),'fedexId',payload->'fedexId',
    'recruitmentStatus',payload->'recruitmentStatus','startDate',payload->'startDate',
    'doubles',payload->'doubles','roadTest',payload->'roadTest',
    'documents',coalesce((select jsonb_object_agg(d.key,jsonb_build_object('bucket',d.value->'bucket',
      'path',d.value->'path','label',d.value->'label','fileName',d.value->'fileName','expiry',d.value->'expiry'))
      from jsonb_each(case when jsonb_typeof(payload->'documents')='object' then payload->'documents' else '{}'::jsonb end) d
      where d.value->>'bucket'='nbl-recruitment-general-documents'
        and d.value->>'path' like target_org::text||'/%'),'{}'::jsonb),
    'testPipeline',jsonb_build_object('stage',payload#>'{testPipeline,stage}',
      'stageReviewed',payload#>'{testPipeline,stageReviewed}','dueDate',payload#>'{testPipeline,dueDate}',
      'assignedTo',payload#>'{testPipeline,assignedTo}','onHold',payload#>'{testPipeline,onHold}',
      'screening',jsonb_build_object('date',payload#>'{testPipeline,screening,date}'),
      'ops',jsonb_build_object('agreedDays',payload#>'{testPipeline,ops,agreedDays}',
        'dispatchAgreement',payload#>'{testPipeline,ops,dispatchAgreement}',
        'doublesAgreement',payload#>'{testPipeline,ops,doublesAgreement}'),
      'training',jsonb_build_object('startDate',payload#>'{testPipeline,training,startDate}',
        'trainer',payload#>'{testPipeline,training,trainer}','result',payload#>'{testPipeline,training,result}',
        'completedDate',payload#>'{testPipeline,training,completedDate}'),
      'onboarding',jsonb_build_object('adp',payload#>'{testPipeline,onboarding,adp}',
        'sf',payload#>'{testPipeline,onboarding,sf}','motive',payload#>'{testPipeline,onboarding,motive}',
        'handbook',payload#>'{testPipeline,onboarding,handbook}',
        'connectTeams',payload#>'{testPipeline,onboarding,connectTeams}','eVerify',payload#>'{testPipeline,onboarding,eVerify}')
    )))
  from records where payload->>'deletedAt' is null;
end $$;
revoke all on function private.read_recruitment_operational(uuid,text) from public, anon;
grant execute on function private.read_recruitment_operational(uuid,text) to authenticated;
create or replace function public.get_recruitment_operational(target_org uuid,source_name text)
returns setof jsonb language sql stable security invoker set search_path='' as $$
  select * from private.read_recruitment_operational(target_org,source_name);
$$;
revoke all on function public.get_recruitment_operational(uuid,text) from public, anon;
grant execute on function public.get_recruitment_operational(uuid,text) to authenticated;
