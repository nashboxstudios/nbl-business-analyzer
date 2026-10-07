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
    const response=await fetch(`${SUPABASE_URL}${path}`,{...options,headers});
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
    const qs=new URLSearchParams({organization_id:`eq.${organizationId}`,select:'module_key,data,source_version,updated_at',order:'module_key.asc'});
    const rows=await authFetch(`/rest/v1/module_snapshots?${qs}`);
    const out={};
    for(const row of rows||[]) out[row.module_key]=row;
    return out;
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

  function rowsByType(rows,type){return (rows||[]).filter(row=>row.record_type===type).map(row=>row.payload||{});}
  function keyedRows(rows,type){const out={};for(const row of rows||[])if(row.record_type===type)out[row.record_key]=row.payload||{};return out;}
  function oneRow(rows,type){return (rows||[]).find(row=>row.record_type===type)?.payload||{};}

  async function getMaintenanceData(organizationId){const rows=await getRecordDomain('nbl_fc_maintenance_records',organizationId);return {version:2,...oneRow(rows,'settings'),tractors:rowsByType(rows,'tractor'),records:rowsByType(rows,'service'),recordCount:rows.length};}
  async function saveMaintenanceData(organizationId,data){const records=[{recordType:'settings',recordKey:'main',payload:{version:2}},...(data?.tractors||[]).map((x,i)=>({recordType:'tractor',recordKey:String(x.id||x.tractorNumber||`tractor_${i}`),payload:x})),...(data?.records||[]).map((x,i)=>({recordType:'service',recordKey:String(x.id||`service_${i}`),payload:x}))];return replaceRecordDomain('nbl_fc_maintenance_records',organizationId,records,['settings','tractor','service']);}

  async function getRecruitmentData(organizationId){const rows=await getRecordDomain('nbl_fc_recruitment_records',organizationId);return {version:11,...oneRow(rows,'settings'),candidates:rowsByType(rows,'candidate'),recordCount:rows.length};}
  async function saveRecruitmentData(organizationId,data){const settings={version:11,recruitmentLayout:data?.recruitmentLayout||{},updatedAt:data?.updatedAt||null,cloudPrivacy:data?.cloudPrivacy||{fullSsnStored:false}};const records=[{recordType:'settings',recordKey:'main',payload:settings},...(data?.candidates||[]).map((x,i)=>({recordType:'candidate',recordKey:String(x.id||x.fedexId||`candidate_${i}`),payload:x}))];return replaceRecordDomain('nbl_fc_recruitment_records',organizationId,records,['settings','candidate']);}

  async function getFinanceData(organizationId){const rows=await getRecordDomain('nbl_fc_finance_records',organizationId);const payrollSettings=oneRow(rows,'driver_pay_settings'),settlementSettings=oneRow(rows,'settlement_settings');return {payroll:{version:2,...payrollSettings,profiles:keyedRows(rows,'payroll_profile'),periods:keyedRows(rows,'payroll_period')},settlement:{...settlementSettings,catalog:rowsByType(rows,'settlement_statement')},recordCount:rows.length};}
  async function saveDriverPayData(organizationId,data){const records=[{recordType:'driver_pay_settings',recordKey:'main',payload:{version:2,dhMappings:data?.dhMappings||{}}},...Object.entries(data?.profiles||{}).map(([key,payload])=>({recordType:'payroll_profile',recordKey:key,payload})),...Object.entries(data?.periods||{}).map(([key,payload])=>({recordType:'payroll_period',recordKey:key,payload}))];return replaceRecordDomain('nbl_fc_finance_records',organizationId,records,['driver_pay_settings','payroll_profile','payroll_period']);}
  async function saveSettlementData(organizationId,data){const records=[{recordType:'settlement_settings',recordKey:'main',payload:{version:data?.version||92,currentStatementId:data?.currentStatementId||null,analysisStatementId:data?.analysisStatementId||null,updatedAt:data?.updatedAt||null}},...(data?.catalog||[]).map((x,i)=>({recordType:'settlement_statement',recordKey:String(x.id||x.relativePath||x.fingerprint||`statement_${i}`),payload:x}))];return replaceRecordDomain('nbl_fc_finance_records',organizationId,records,['settlement_settings','settlement_statement']);}

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
  async function uploadRecruitmentDocument(organizationId,candidateId,documentType,file){
    if(!file)throw new Error('Choose a document to upload.');
    const extension=(String(file.name||'').toLowerCase().match(/\.[a-z0-9]+$/)||[''])[0];
    const mimeByExtension={'.pdf':'application/pdf','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.heic':'image/heic','.heif':'image/heif','.doc':'application/msword','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
    const allowedExtensions=new Set(Object.keys(mimeByExtension));
    if(!allowedExtensions.has(extension))throw new Error('Use a PDF, JPEG, PNG, HEIC, DOC, or DOCX file.');
    const mimeType=mimeByExtension[extension];
    if(Number(file.size)>10*1024*1024)throw new Error('The document must be 10 MB or smaller.');
    const type=String(documentType||'document').replace(/[^a-zA-Z0-9_-]+/g,'_').slice(0,40)||'document',safeName=String(file.name||`${type}${extension}`).replace(/[^a-zA-Z0-9._-]+/g,'_').slice(-120),path=`${organizationId}/${candidateId}/${type}/${Date.now()}_${safeName}`;
    await storageRequest(`/storage/v1/object/nbl-recruitment-documents/${encodeStoragePath(path)}`,{method:'POST',headers:{'Content-Type':mimeType,'cache-control':'3600','x-upsert':'false'},body:file});
    return {path,fileName:file.name||safeName,mimeType,size:Number(file.size)||0,uploadedAt:new Date().toISOString()};
  }
  async function getRecruitmentDocumentUrl(path){
    const data=await authFetch(`/storage/v1/object/sign/nbl-recruitment-documents/${encodeStoragePath(path)}`,{method:'POST',body:JSON.stringify({expiresIn:120})});
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
    url:SUPABASE_URL,
    publishableKey:SUPABASE_PUBLISHABLE_KEY,
    signIn,signOut,getSession,getMembership,getProfile,saveProfile,updatePassword,getSnapshots,saveSnapshot,getSafetyData,saveSafetyData,getDailyDispatchBoards,saveDailyDispatchBoard,getMaintenanceData,saveMaintenanceData,getRecruitmentData,saveRecruitmentData,getFinanceData,saveDriverPayData,saveSettlementData,getAuditData,saveAuditData,getMeetingData,saveMeetingData,uploadRecruitmentDocument,getRecruitmentDocumentUrl,deleteRecruitmentDocument,clearSession
  };
})();
