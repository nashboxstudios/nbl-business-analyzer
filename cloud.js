(function(){
  'use strict';

  const SUPABASE_URL='https://tjpcabnhaxaiecnbnrhm.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY='sb_publishable_AQBDWZQ-xtLG7-XRw1Ustw_zrUEA18E';
  const SESSION_KEY='nbl_supabase_session_v1';

  function loadSession(){
    try{ const raw=localStorage.getItem(SESSION_KEY); return raw?JSON.parse(raw):null; }
    catch(_){ return null; }
  }
  function saveSession(session){
    if(!session){ localStorage.removeItem(SESSION_KEY); return null; }
    const expiresIn=Number(session.expires_in)||3600;
    const normalized={...session,expires_at:Number(session.expires_at)||Math.floor(Date.now()/1000)+expiresIn};
    localStorage.setItem(SESSION_KEY,JSON.stringify(normalized));
    return normalized;
  }
  function clearSession(){ localStorage.removeItem(SESSION_KEY); }

  async function request(path,options={}){
    const headers={apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json',...(options.headers||{})};
    if(options.accessToken) headers.Authorization=`Bearer ${options.accessToken}`;
    const controller=new AbortController();
    const timeoutMs=Number(options.timeoutMs)||25000;
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    let response;
    try{
      const {accessToken:_,timeoutMs:__,...fetchOptions}=options;
      response=await fetch(`${SUPABASE_URL}${path}`,{...fetchOptions,headers,signal:controller.signal});
    }catch(err){
      if(err?.name==='AbortError') throw new Error('NBL Cloud took too long to respond. The app will continue and you can retry Cloud Sync.');
      throw err;
    }finally{ clearTimeout(timer); }
    const text=await response.text();
    let data=null;
    if(text){ try{ data=JSON.parse(text); }catch(_){ data=text; } }
    if(!response.ok){
      const msg=(data&&typeof data==='object'&&(data.msg||data.message||data.error_description||data.error))||`Supabase request failed (${response.status})`;
      const err=new Error(String(msg)); err.status=response.status; err.data=data; throw err;
    }
    return data;
  }

  async function signIn(email,password){
    const session=await request('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});
    return saveSession(session);
  }

  async function refreshSession(session){
    if(!session?.refresh_token) throw new Error('No refresh token is available.');
    const refreshed=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:session.refresh_token})});
    return saveSession(refreshed);
  }

  async function getSession(){
    let session=loadSession();
    if(!session?.access_token) return null;
    const now=Math.floor(Date.now()/1000);
    if(!session.expires_at || session.expires_at-now<90){
      try{ session=await refreshSession(session); }
      catch(err){ clearSession(); return null; }
    }
    return session;
  }

  async function authFetch(path,options={}){
    let session=await getSession();
    if(!session) throw new Error('Your NBL cloud session has expired. Please sign in again.');
    try{ return await request(path,{...options,accessToken:session.access_token}); }
    catch(err){
      if(err.status!==401) throw err;
      session=await refreshSession(session);
      return request(path,{...options,accessToken:session.access_token});
    }
  }

  async function getMembership(){
    const session=await getSession();
    const user=session?.user;
    if(!user?.id) return null;
    const qs=new URLSearchParams({user_id:`eq.${user.id}`,status:'eq.active',select:'organization_id,role,status,module_permissions',limit:'1'});
    const rows=await authFetch(`/rest/v1/organization_members?${qs}`);
    if(!Array.isArray(rows)||!rows.length) return null;
    const membership=rows[0];
    const oq=new URLSearchParams({id:`eq.${membership.organization_id}`,select:'id,name,slug',limit:'1'});
    const orgRows=await authFetch(`/rest/v1/organizations?${oq}`);
    membership.organization=Array.isArray(orgRows)&&orgRows.length?orgRows[0]:null;
    return membership;
  }


  async function getProfile(){
    const session=await getSession();
    const user=session?.user;
    if(!user?.id) return null;
    const qs=new URLSearchParams({user_id:`eq.${user.id}`,select:'user_id,full_name,created_at,updated_at',limit:'1'});
    const rows=await authFetch(`/rest/v1/profiles?${qs}`);
    return Array.isArray(rows)&&rows.length?rows[0]:null;
  }

  async function saveProfile(fullName){
    const session=await getSession();
    const user=session?.user;
    if(!user?.id) throw new Error('Sign in before updating your profile.');
    const body=[{user_id:user.id,full_name:String(fullName||'').trim()||null,updated_at:new Date().toISOString()}];
    const rows=await authFetch('/rest/v1/profiles?on_conflict=user_id',{
      method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(body)
    });
    return Array.isArray(rows)&&rows.length?rows[0]:body[0];
  }

  async function updatePassword(password){
    const value=String(password||'');
    if(value.length<10) throw new Error('Use a password with at least 10 characters.');
    const session=await getSession();
    if(!session?.access_token) throw new Error('Sign in before changing your password.');
    const user=await request('/auth/v1/user',{method:'PUT',accessToken:session.access_token,body:JSON.stringify({password:value})});
    const current=loadSession();
    if(current) saveSession({...current,user});
    return user;
  }

  async function getSnapshots(organizationId){
    const qs=new URLSearchParams({organization_id:`eq.${organizationId}`,module_key:'not.like.ifta:%',select:'module_key,data,source_version,updated_at',order:'module_key.asc'});
    const rows=await authFetch(`/rest/v1/module_snapshots?${qs}`);
    const out={};
    for(const row of rows||[]) out[row.module_key]=row;
    return out;
  }

  function iftaModuleKey(key){
    if(!/^(20\d{2}|2100)-Q[1-4]$/.test(String(key)))throw new Error('Invalid IFTA quarter.');
    return 'ifta:'+key;
  }
  async function getIftaFuelCatalog(organizationId){
    const catalog=[];
    // Page settlement rows explicitly; payroll records and REST row limits must
    // never silently truncate a historical quarterly fuel report.
    for(let offset=0;offset<100000;offset+=500){
      const qs=new URLSearchParams({organization_id:`eq.${organizationId}`,record_type:'eq.settlement_statement',select:'record_key,payload',order:'record_key.asc',limit:'500',offset:String(offset)});
      const rows=await authFetch(`/rest/v1/nbl_fc_finance_records?${qs}`);
      for(const row of rows||[])catalog.push({id:row.record_key,fileName:row.payload?.fileName||row.record_key,settlementDate:row.payload?.settlementDate||'',result:{fuelPurchases:row.payload?.result?.fuelPurchases||[]}});
      if(!rows||rows.length<500)return catalog;
    }
    throw new Error('Settlement catalog exceeded the IFTA retrieval limit. No partial report was calculated.');
  }
  async function getIftaReport(organizationId,key){
    const qs=new URLSearchParams({organization_id:`eq.${organizationId}`,module_key:`eq.${iftaModuleKey(key)}`,select:'data,updated_at'});
    const rows=await authFetch(`/rest/v1/module_snapshots?${qs}`);
    return rows?.[0]||null;
  }
  async function saveIftaReport(organizationId,key,data,expectedUpdatedAt=null){
    const moduleKey=iftaModuleKey(key),session=await getSession();
    const body={data,source_version:'ifta-1',updated_by:session?.user?.id||null,updated_at:new Date().toISOString()};
    let rows;
    if(expectedUpdatedAt){
      const qs=new URLSearchParams({organization_id:`eq.${organizationId}`,module_key:`eq.${moduleKey}`,updated_at:`eq.${expectedUpdatedAt}`});
      rows=await authFetch(`/rest/v1/module_snapshots?${qs}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(body)});
      if(!rows?.length)throw new Error('This quarter changed in another session. Reload it before saving.');
    }else{
      rows=await authFetch('/rest/v1/module_snapshots',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({...body,organization_id:organizationId,module_key:moduleKey})});
    }
    if(!rows?.[0])throw new Error('IFTA report was not saved.');
    return rows[0];
  }

  async function saveSnapshot(organizationId,moduleKey,data,sourceVersion='100'){
    const session=await getSession();
    const body=[{
      organization_id:organizationId,
      module_key:moduleKey,
      data:data==null?{}:data,
      source_version:String(sourceVersion||'100'),
      updated_by:session?.user?.id||null,
      updated_at:new Date().toISOString()
    }];
    const query='?on_conflict=organization_id,module_key';
    const rows=await authFetch(`/rest/v1/module_snapshots${query}`,{
      method:'POST',
      headers:{Prefer:'resolution=merge-duplicates,return=representation'},
      body:JSON.stringify(body)
    });
    return Array.isArray(rows)?rows[0]:rows;
  }

  async function getSafetyData(organizationId){
    const actionQs=new URLSearchParams({organization_id:`eq.${organizationId}`,select:'event_key,assigned_driver_id,assigned_driver_name,assigned_employee_id,incident,assigned_at,assigned_by,dismissed,dismissal_updated_at,dismissal_updated_by,updated_at'});
    const recordQs=new URLSearchParams({organization_id:`eq.${organizationId}`,select:'driver_id,driver_name,employee_id,record,updated_at'});
    const [actions,records]=await Promise.all([
      authFetch(`/rest/v1/safety_event_actions?${actionQs}`),
      authFetch(`/rest/v1/safety_driver_records?${recordQs}`)
    ]);
    const assignments={},dismissals={},driverRecords={};
    for(const row of actions||[]){
      if(row.assigned_driver_id) assignments[row.event_key]={id:row.assigned_driver_id,name:row.assigned_driver_name||'',employeeId:row.assigned_employee_id||'',assignedAt:row.assigned_at||row.updated_at,assignedBy:row.assigned_by||'',incident:row.incident||null};
      if(row.dismissed) dismissals[row.event_key]={dismissed:true,updatedAt:row.dismissal_updated_at||row.updated_at,updatedBy:row.dismissal_updated_by||''};
    }
    for(const row of records||[]) if(row.driver_id) driverRecords[row.driver_id]=row.record&&typeof row.record==='object'?row.record:{};
    return {assignments,dismissals,driverRecords,actionCount:(actions||[]).length,recordCount:(records||[]).length};
  }

  async function saveSafetyData(organizationId,safetyData,historyEntry=null){
    const session=await getSession(),userId=session?.user?.id||null,now=new Date().toISOString();
    const assignments=safetyData?.assignments||{},dismissals=safetyData?.dismissals||{};
    const keys=[...new Set([...Object.keys(assignments),...Object.keys(dismissals)])];
    if(keys.length){
      const rows=keys.map(key=>{const a=assignments[key]||{},d=dismissals[key]||{};return {organization_id:organizationId,event_key:key,assigned_driver_id:a.id||null,assigned_driver_name:a.name||null,assigned_employee_id:a.employeeId||null,incident:a.incident||null,assigned_at:a.assignedAt||null,assigned_by:a.assignedBy||null,dismissed:!!d.dismissed,dismissal_updated_at:d.updatedAt||null,dismissal_updated_by:d.updatedBy||null,updated_at:now,updated_by:userId};});
      await authFetch('/rest/v1/safety_event_actions?on_conflict=organization_id,event_key',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,missing=default,return=minimal'},body:JSON.stringify(rows)});
    }
    const records=Object.entries(safetyData?.driverRecords||{}).map(([driverId,record])=>({organization_id:organizationId,driver_id:driverId,driver_name:record?.name||null,employee_id:record?.employeeId||null,record:record||{},updated_at:now,updated_by:userId}));
    if(records.length) await authFetch('/rest/v1/safety_driver_records?on_conflict=organization_id,driver_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,missing=default,return=minimal'},body:JSON.stringify(records)});
    if(historyEntry?.eventKey&&historyEntry?.actionType){
      await authFetch('/rest/v1/safety_event_history',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify([{organization_id:organizationId,event_key:historyEntry.eventKey,action_type:historyEntry.actionType,action_data:historyEntry.actionData||{},actor_id:userId}])});
    }
    return {savedAt:now,eventCount:keys.length,recordCount:records.length};
  }

  async function getDailyDispatchBoards(organizationId){
    const boardQs=new URLSearchParams({organization_id:`eq.${organizationId}`,select:'dispatch_date,saved_at,saved_by,updated_at',order:'dispatch_date.asc'});
    const rowQs=new URLSearchParams({organization_id:`eq.${organizationId}`,select:'dispatch_date,route_id,route_name,origin,hub,call_status,dispatch_status,driver_id,driver_name,refusals,decline_reason,decline_driver_id,decline_driver_name,decline_tractor_id,decline_tractor_number,decline_other,updated_at',order:'dispatch_date.asc,route_id.asc'});
    const [boards,rows]=await Promise.all([
      authFetch(`/rest/v1/daily_dispatch_boards?${boardQs}`),
      authFetch(`/rest/v1/daily_dispatch_rows?${rowQs}`)
    ]);
    const out={};
    for(const board of boards||[]) out[board.dispatch_date]={date:board.dispatch_date,rows:[],savedAt:board.saved_at||board.updated_at};
    for(const row of rows||[]){
      const board=out[row.dispatch_date]||(out[row.dispatch_date]={date:row.dispatch_date,rows:[],savedAt:row.updated_at});
      board.rows.push({routeId:row.route_id,routeName:row.route_name||'',origin:row.origin||'',hub:row.hub||'Other',callStatus:row.call_status||'not_received',dispatchStatus:row.dispatch_status||'',driverId:row.driver_id||'',driverName:row.driver_name||'',refusals:Array.isArray(row.refusals)?row.refusals:[],declineReason:row.decline_reason||'',declineDriverId:row.decline_driver_id||'',declineDriverName:row.decline_driver_name||'',declineTractorId:row.decline_tractor_id||'',declineTractorNumber:row.decline_tractor_number||'',declineOther:row.decline_other||''});
    }
    return out;
  }

  async function saveDailyDispatchBoard(organizationId,board){
    const session=await getSession(),userId=session?.user?.id||null,now=new Date().toISOString(),date=String(board?.date||'');
    if(!date) throw new Error('A dispatch date is required.');
    await authFetch('/rest/v1/daily_dispatch_boards?on_conflict=organization_id,dispatch_date',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify([{organization_id:organizationId,dispatch_date:date,saved_at:board.savedAt||now,saved_by:userId,updated_at:now}])});
    const rows=(board.rows||[]).map(row=>({organization_id:organizationId,dispatch_date:date,route_id:String(row.routeId||''),route_name:row.routeName||'',origin:row.origin||'',hub:row.hub||'Other',call_status:row.callStatus||'not_received',dispatch_status:row.dispatchStatus||'',driver_id:row.driverId||null,driver_name:row.driverName||null,refusals:Array.isArray(row.refusals)?row.refusals:[],decline_reason:row.declineReason||'',decline_driver_id:row.declineDriverId||null,decline_driver_name:row.declineDriverName||null,decline_tractor_id:row.declineTractorId||null,decline_tractor_number:row.declineTractorNumber||null,decline_other:row.declineOther||'',updated_at:now,updated_by:userId})).filter(row=>row.route_id);
    if(rows.length) await authFetch('/rest/v1/daily_dispatch_rows?on_conflict=organization_id,dispatch_date,route_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(rows)});
    const cleanup=new URLSearchParams({organization_id:`eq.${organizationId}`,dispatch_date:`eq.${date}`});
    if(rows.length) cleanup.set('route_id',`not.in.(${rows.map(row=>`"${String(row.route_id).replaceAll('"','\\"')}"`).join(',')})`);
    await authFetch(`/rest/v1/daily_dispatch_rows?${cleanup}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});
    return {date,rows:board.rows||[],savedAt:board.savedAt||now};
  }

  async function getRecordDomain(table,organizationId){
    const qs=new URLSearchParams({organization_id:`eq.${organizationId}`,select:'record_type,record_key,payload,updated_at',order:'record_type.asc,record_key.asc'});
    return await authFetch(`/rest/v1/${table}?${qs}`)||[];
  }
  async function getRecordDomainTypes(table,organizationId,types){
    const qs=new URLSearchParams({organization_id:`eq.${organizationId}`,select:'record_type,record_key,payload,updated_at',order:'record_type.asc,record_key.asc'});
    if(Array.isArray(types)&&types.length)qs.set('record_type',`in.(${types.join(',')})`);
    return await authFetch(`/rest/v1/${table}?${qs}`)||[];
  }

  function postgrestQuotedList(values){
    return values.map(value=>`"${String(value).replaceAll('\\','\\\\').replaceAll('"','\\"')}"`).join(',');
  }

  async function replaceRecordDomain(table,organizationId,records,recordTypes){
    const session=await getSession(),userId=session?.user?.id||null,now=new Date().toISOString();
    const normalized=(records||[]).map(row=>({organization_id:organizationId,record_type:String(row.recordType||''),record_key:String(row.recordKey||''),payload:row.payload&&typeof row.payload==='object'?row.payload:{},updated_at:now,updated_by:userId})).filter(row=>row.record_type&&row.record_key);
    if(normalized.length) await authFetch(`/rest/v1/${table}?on_conflict=organization_id,record_type,record_key`,{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(normalized)});
    for(const type of recordTypes){
      const keep=normalized.filter(row=>row.record_type===type).map(row=>row.record_key);
      const qs=new URLSearchParams({organization_id:`eq.${organizationId}`,record_type:`eq.${type}`});
      if(keep.length) qs.set('record_key',`not.in.(${postgrestQuotedList(keep)})`);
      await authFetch(`/rest/v1/${table}?${qs}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});
    }
    return {savedAt:now,count:normalized.length};
  }

  async function upsertRecordRows(table,organizationId,records){
    const session=await getSession(),userId=session?.user?.id||null,now=new Date().toISOString();
    const rows=(records||[]).map(row=>({organization_id:organizationId,record_type:String(row.recordType||''),record_key:String(row.recordKey||''),payload:row.payload&&typeof row.payload==='object'?row.payload:{},updated_at:now,updated_by:userId})).filter(row=>row.record_type&&row.record_key);
    // Keep each request modest. Settlement payloads contain detailed trip data,
    // so one unbounded request becomes slower and less reliable as history grows.
    let batch=[],batchBytes=0;
    const flush=async()=>{
      if(!batch.length)return;
      await authFetch(`/rest/v1/${table}?on_conflict=organization_id,record_type,record_key`,{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(batch)});
      batch=[];batchBytes=0;
    };
    for(const row of rows){
      const bytes=JSON.stringify(row).length;
      if(batch.length&&(batch.length>=5||batchBytes+bytes>500000))await flush();
      batch.push(row);batchBytes+=bytes;
    }
    await flush();
    return {savedAt:now,count:rows.length};
  }

  function rowsByType(rows,type){return (rows||[]).filter(row=>row.record_type===type).map(row=>row.payload||{});}
  function keyedRows(rows,type){const out={};for(const row of rows||[])if(row.record_type===type)out[row.record_key]=row.payload||{};return out;}
  function oneRow(rows,type){return (rows||[]).find(row=>row.record_type===type)?.payload||{};}

  async function getMaintenanceData(organizationId){const rows=await getRecordDomainTypes('nbl_fc_maintenance_records',organizationId,['settings','tractor','service','task']);return {version:3,...oneRow(rows,'settings'),tractors:rowsByType(rows,'tractor'),records:rowsByType(rows,'service'),faultCodes:[],tasks:rowsByType(rows,'task'),recordCount:rows.length};}
  async function saveMaintenanceData(organizationId,data){const records=[{recordType:'settings',recordKey:'main',payload:{version:3}},...(data?.tractors||[]).map((x,i)=>({recordType:'tractor',recordKey:String(x.id||x.tractorNumber||`tractor_${i}`),payload:x})),...(data?.records||[]).map((x,i)=>({recordType:'service',recordKey:String(x.id||`service_${i}`),payload:x})),...(data?.tasks||[]).map((x,i)=>({recordType:'task',recordKey:String(x.id||`task_${i}`),payload:x}))];return replaceRecordDomain('nbl_fc_maintenance_records',organizationId,records,['settings','tractor','service','task']);}
  async function saveMaintenanceFaults(organizationId,faults){const session=await getSession(),userId=session?.user?.id||null,now=new Date().toISOString(),rows=(faults||[]).filter(x=>x?.id!=null).map(x=>({organization_id:organizationId,record_type:'fault',record_key:String(x.id),payload:x,updated_at:now,updated_by:userId}));if(rows.length)await authFetch('/rest/v1/nbl_fc_maintenance_records?on_conflict=organization_id,record_type,record_key',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(rows)});return {savedAt:now,count:rows.length};}

  async function recruitmentIsReadOnly(){
    const membership=await getMembership();
    return membership?.role==='operations'&&membership?.module_permissions?.access_role==='lead_driver';
  }
  async function getRecruitmentOperationalData(organizationId,source){
    const rows=await authFetch('/rest/v1/rpc/get_recruitment_operational',{method:'POST',body:JSON.stringify({target_org:organizationId,source_name:source})});
    return {version:11,candidates:Array.isArray(rows)?rows:[],recordCount:Array.isArray(rows)?rows.length:0,readOnly:true};
  }
  async function getRecruitmentData(organizationId){if(await recruitmentIsReadOnly())return getRecruitmentOperationalData(organizationId,'archive');const rows=await getRecordDomain('nbl_fc_recruitment_records',organizationId);return {version:11,...oneRow(rows,'settings'),candidates:rowsByType(rows,'candidate'),recordCount:rows.length};}
  async function saveRecruitmentData(organizationId,data,options={}){
    const settings={version:11,recruitmentLayout:data?.recruitmentLayout||{},updatedAt:data?.updatedAt||null,cloudPrivacy:data?.cloudPrivacy||{fullSsnStored:false}};
    const ids=new Set((options.candidateIds||[]).map(String));
    const candidates=(data?.candidates||[]).filter(x=>options.full===true||ids.has(String(x.id||'')));
    for(const id of ids)if(!candidates.some(x=>String(x.id||'')===id))throw new Error('Candidate to save could not be found.');
    const records=[{recordType:'settings',recordKey:'main',payload:settings},...candidates.map(x=>{
      if(!x.id)throw new Error('Candidate ID is required to save Recruitment data.');
      return {recordType:'candidate',recordKey:String(x.id),payload:x};
    })];
    // Never delete candidates absent from a browser's list. Ordinary saves write
    // only the edited candidate; full is reserved for explicit data imports.
    return upsertRecordRows('nbl_fc_recruitment_records',organizationId,records);
  }
  async function deleteRecruitmentCandidate(organizationId,candidateId){
    if(!candidateId)throw new Error('Candidate ID is required to delete a record.');
    const qs=new URLSearchParams({organization_id:`eq.${organizationId}`,record_type:'eq.candidate',record_key:`eq.${candidateId}`,select:'record_key'});
    const rows=await authFetch(`/rest/v1/nbl_fc_recruitment_records?${qs}`,{method:'DELETE',headers:{Prefer:'return=representation','x-nbl-recruitment-delete':String(candidateId)}});
    if(!Array.isArray(rows)||rows.length!==1||rows[0].record_key!==String(candidateId))throw new Error('Candidate was not deleted. Refresh Recruitment and try again.');
    return true;
  }

  async function getRecruitmentTestData(organizationId){
    if(await recruitmentIsReadOnly())return getRecruitmentOperationalData(organizationId,'active');
    const rows=await getRecordDomain('nbl_fc_recruitment_test_records',organizationId);
    if(!rows.some(r=>r.record_type==='settings'))throw new Error('Recruitment Test has not been initialized for this organization.');
    return {candidates:rows.filter(r=>r.record_type==='candidate'&&!r.payload?.deletedAt).map(r=>({...r.payload,_cloudUpdatedAt:r.updated_at}))};
  }
  async function saveRecruitmentTestCandidate(organizationId,candidate,expectedUpdatedAt){
    if(!organizationId||!String(candidate?.id||'').startsWith('test_'))throw new Error('A test candidate ID and organization are required.');
    if(candidate.deletedAt)throw new Error('This candidate has been deleted. Refresh Recruitment.');
    const session=await getSession();if(!session)throw new Error('Please sign in again.');
    const payload=JSON.parse(JSON.stringify(candidate));delete payload._cloudUpdatedAt;
    for(const obj of [payload,payload.roadTestForm||{}])for(const key of ['ssnFull','ssn','socialSecurityNumber'])delete obj[key];
    const row={payload,updated_at:new Date(Math.max(Date.now(),(Date.parse(expectedUpdatedAt)||0)+1)).toISOString(),updated_by:session.user.id};
    let rows;
    if(expectedUpdatedAt){
      const qs=new URLSearchParams({organization_id:`eq.${organizationId}`,record_type:'eq.candidate',record_key:`eq.${candidate.id}`,updated_at:`eq.${expectedUpdatedAt}`,'payload->>deletedAt':'is.null',select:'payload,updated_at'});
      rows=await authFetch(`/rest/v1/nbl_fc_recruitment_test_records?${qs}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(row)});
    }else{
      rows=await authFetch('/rest/v1/nbl_fc_recruitment_test_records?select=payload,updated_at',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({...row,organization_id:organizationId,record_type:'candidate',record_key:candidate.id})});
    }
    if(!Array.isArray(rows)||rows.length!==1)throw new Error('This candidate changed or was deleted in another session. Refresh Recruitment before saving again.');
    return {...rows[0].payload,_cloudUpdatedAt:rows[0].updated_at};
  }

  // Reversible deletion uses the existing organization RLS and a version check.
  // Preserve the stored payload and shared document objects; never use a list replacement.
  async function deleteRecruitmentTestCandidate(organizationId,candidateId,expectedUpdatedAt){
    if(!organizationId||!String(candidateId||'').startsWith('test_')||!expectedUpdatedAt)throw new Error('A saved candidate and its version are required to delete.');
    const session=await getSession();if(!session)throw new Error('Please sign in again.');
    const qs=new URLSearchParams({organization_id:`eq.${organizationId}`,record_type:'eq.candidate',record_key:`eq.${candidateId}`,updated_at:`eq.${expectedUpdatedAt}`,'payload->>deletedAt':'is.null',select:'record_key,payload,updated_at'});
    const current=await authFetch(`/rest/v1/nbl_fc_recruitment_test_records?${qs}`);
    if(!Array.isArray(current)||current.length!==1||current[0].record_key!==candidateId||current[0].payload?.deletedAt||current[0].updated_at!==expectedUpdatedAt)throw new Error('This candidate changed or was deleted in another session. Close and refresh before deleting.');
    const deletedAt=new Date(Math.max(Date.now(),(Date.parse(expectedUpdatedAt)||0)+1)).toISOString();
    const payload={...current[0].payload,deletedAt,deletedBy:session.user.id};
    const rows=await authFetch(`/rest/v1/nbl_fc_recruitment_test_records?${qs}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({payload,updated_at:deletedAt,updated_by:session.user.id})});
    if(!Array.isArray(rows)||rows.length!==1||rows[0].record_key!==candidateId||rows[0].payload?.deletedAt!==deletedAt)throw new Error('Candidate was not deleted. Close and refresh Recruitment before trying again.');
    return true;
  }

  async function getFinanceData(organizationId){const rows=await getRecordDomain('nbl_fc_finance_records',organizationId);const payrollSettings=oneRow(rows,'driver_pay_settings'),settlementSettings=oneRow(rows,'settlement_settings');return {payroll:{version:2,...payrollSettings,profiles:keyedRows(rows,'payroll_profile'),periods:keyedRows(rows,'payroll_period')},settlement:{...settlementSettings,catalog:rowsByType(rows,'settlement_statement')},recordCount:rows.length};}
  async function saveDriverPayData(organizationId,data){const records=[{recordType:'driver_pay_settings',recordKey:'main',payload:{version:2,dhMappings:data?.dhMappings||{}}},...Object.entries(data?.profiles||{}).map(([key,payload])=>({recordType:'payroll_profile',recordKey:key,payload})),...Object.entries(data?.periods||{}).map(([key,payload])=>({recordType:'payroll_period',recordKey:key,payload}))];return replaceRecordDomain('nbl_fc_finance_records',organizationId,records,['driver_pay_settings','payroll_profile','payroll_period']);}
  function settlementSettings(data){return {version:data?.version||92,currentStatementId:data?.currentStatementId||null,analysisStatementId:data?.analysisStatementId||null,updatedAt:data?.updatedAt||new Date().toISOString()};}
  function settlementRecord(x,i=0){return {recordType:'settlement_statement',recordKey:String(x?.id||x?.relativePath||x?.fingerprint||`statement_${i}`),payload:x||{}};}
  async function saveSettlementChanges(organizationId,data){
    const records=[{recordType:'settlement_settings',recordKey:'main',payload:settlementSettings(data)},...(data?.statements||[]).map(settlementRecord)];
    const result=await upsertRecordRows('nbl_fc_finance_records',organizationId,records);
    const deleteKeys=[...new Set((data?.deleteKeys||[]).map(String).filter(Boolean))];
    if(deleteKeys.length){
      const qs=new URLSearchParams({organization_id:`eq.${organizationId}`,record_type:'eq.settlement_statement',record_key:`in.(${postgrestQuotedList(deleteKeys)})`});
      await authFetch(`/rest/v1/nbl_fc_finance_records?${qs}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});
    }
    return {...result,deleted:deleteKeys.length};
  }
  async function saveSettlementData(organizationId,data){
    const catalog=data?.catalog||[];
    const result=await saveSettlementChanges(organizationId,{...settlementSettings(data),statements:catalog});
    const keep=catalog.map((x,i)=>settlementRecord(x,i).recordKey);
    const qs=new URLSearchParams({organization_id:`eq.${organizationId}`,record_type:'eq.settlement_statement'});
    if(keep.length)qs.set('record_key',`not.in.(${postgrestQuotedList(keep)})`);
    await authFetch(`/rest/v1/nbl_fc_finance_records?${qs}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});
    return result;
  }

  async function getAuditData(organizationId){const rows=await getRecordDomain('nbl_fc_audit_records',organizationId);return {version:1,...oneRow(rows,'settings'),audits:rowsByType(rows,'audit'),findings:rowsByType(rows,'finding'),recordCount:rows.length};}
  async function saveAuditData(organizationId,data){const records=[{recordType:'settings',recordKey:'main',payload:{version:1,activeTab:data?.activeTab||'dashboard',selectedAuditId:data?.selectedAuditId||''}},...(data?.audits||[]).map((x,i)=>({recordType:'audit',recordKey:String(x.id||`audit_${i}`),payload:x})),...(data?.findings||[]).map((x,i)=>({recordType:'finding',recordKey:String(x.id||`finding_${i}`),payload:x}))];return replaceRecordDomain('nbl_fc_audit_records',organizationId,records,['settings','audit','finding']);}

  async function getMeetingData(organizationId){const rows=await getRecordDomain('nbl_fc_meeting_records',organizationId);return {version:2,...oneRow(rows,'settings'),inspections:rowsByType(rows,'inspection'),managementItems:rowsByType(rows,'management_item'),recordCount:rows.length};}
  async function saveMeetingData(organizationId,data){const records=[{recordType:'settings',recordKey:'main',payload:{version:2,layoutVersion:data?.layoutVersion||1,columnWidths:data?.columnWidths||{}}},...(data?.inspections||[]).map((x,i)=>({recordType:'inspection',recordKey:String(x.id||`inspection_${i}`),payload:x})),...(data?.managementItems||[]).map((x,i)=>({recordType:'management_item',recordKey:String(x.id||`management_${i}`),payload:x}))];return replaceRecordDomain('nbl_fc_meeting_records',organizationId,records,['settings','inspection','management_item']);}

  function encodeStoragePath(path){return String(path||'').split('/').map(encodeURIComponent).join('/');}
  async function storageRequest(path,options={}){
    let session=await getSession();if(!session)throw new Error('Your NBL cloud session has expired. Please sign in again.');
    const send=async active=>{const response=await fetch(`${SUPABASE_URL}${path}`,{...options,headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${active.access_token}`,...(options.headers||{})}});const text=await response.text();let data=null;if(text){try{data=JSON.parse(text);}catch(_){data=text;}}if(!response.ok){const message=data&&typeof data==='object'?(data.message||data.error||data.msg):data;const err=new Error(String(message||`Storage request failed (${response.status})`));err.status=response.status;throw err;}return data;};
    try{return await send(session);}catch(err){if(err.status!==401)throw err;session=await refreshSession(session);return send(session);}
  }
  const RECRUITMENT_BUCKETS=new Set(['nbl-recruitment-documents','nbl-recruitment-general-documents']);
  function recruitmentDocumentBucket(document){
    const bucket=typeof document==='object'?document.bucket||'nbl-recruitment-documents':'nbl-recruitment-documents';
    if(!RECRUITMENT_BUCKETS.has(bucket))throw new Error('Unknown recruitment document location.');
    return bucket;
  }
  async function uploadRecruitmentDocument(organizationId,candidateId,documentType,file,classification='sensitive'){
    if(!file)throw new Error('Choose a document to upload.');
    const extension=(String(file.name||'').toLowerCase().match(/\.[a-z0-9]+$/)||[''])[0];
    const mimeByExtension={'.pdf':'application/pdf','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.heic':'image/heic','.heif':'image/heif','.doc':'application/msword','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
    const allowedExtensions=new Set(Object.keys(mimeByExtension));
    if(!allowedExtensions.has(extension))throw new Error('Use a PDF, JPEG, PNG, HEIC, DOC, or DOCX file.');
    const mimeType=mimeByExtension[extension];
    if(!['sensitive','general'].includes(classification))throw new Error('Choose Sensitive or General document access.');
    const bucket=classification==='general'?'nbl-recruitment-general-documents':'nbl-recruitment-documents';
    if(Number(file.size)>10*1024*1024)throw new Error('The document must be 10 MB or smaller.');
    const type=String(documentType||'document').replace(/[^a-zA-Z0-9_-]+/g,'_').slice(0,40)||'document',safeName=String(file.name||`${type}${extension}`).replace(/[^a-zA-Z0-9._-]+/g,'_').slice(-120),path=`${organizationId}/${candidateId}/${type}/${Date.now()}_${safeName}`;
    await storageRequest(`/storage/v1/object/${bucket}/${encodeStoragePath(path)}`,{method:'POST',headers:{'Content-Type':mimeType,'cache-control':'0','x-upsert':'false'},body:file});
    return {bucket,classification,path,fileName:file.name||safeName,mimeType,size:Number(file.size)||0,uploadedAt:new Date().toISOString()};
  }
  async function getRecruitmentDocumentUrl(document){
    const path=typeof document==='object'?document.path:document,bucket=recruitmentDocumentBucket(document);
    const data=await authFetch(`/storage/v1/object/sign/${bucket}/${encodeStoragePath(path)}`,{method:'POST',body:JSON.stringify({expiresIn:120})});
    const signed=data?.signedURL||data?.signedUrl;if(!signed)throw new Error('Could not create a secure document link.');
    return /^https?:\/\//i.test(signed)?signed:`${SUPABASE_URL}/storage/v1${signed.startsWith('/')?'':'/'}${signed}`;
  }
  async function deleteRecruitmentDocument(path){if(!path)return true;await storageRequest(`/storage/v1/object/nbl-recruitment-documents/${encodeStoragePath(path)}`,{method:'DELETE'});return true;}

  async function signOut(){
    const session=loadSession();
    try{
      if(session?.access_token) await request('/auth/v1/logout',{method:'POST',accessToken:session.access_token,body:'{}'});
    }catch(_){ /* local sign-out must still succeed */ }
    clearSession();
  }

  window.NBLCloud={
    getIftaReport,saveIftaReport,getIftaFuelCatalog,
    url:SUPABASE_URL,
    publishableKey:SUPABASE_PUBLISHABLE_KEY,
    signIn,signOut,getSession,getMembership,getProfile,saveProfile,updatePassword,getSnapshots,saveSnapshot,getSafetyData,saveSafetyData,getDailyDispatchBoards,saveDailyDispatchBoard,getMaintenanceData,saveMaintenanceData,saveMaintenanceFaults,getRecruitmentData,saveRecruitmentData,deleteRecruitmentCandidate,getRecruitmentTestData,saveRecruitmentTestCandidate,deleteRecruitmentTestCandidate,getFinanceData,saveDriverPayData,saveSettlementData,saveSettlementChanges,getAuditData,saveAuditData,getMeetingData,saveMeetingData,uploadRecruitmentDocument,getRecruitmentDocumentUrl,deleteRecruitmentDocument,clearSession
  };
})();
