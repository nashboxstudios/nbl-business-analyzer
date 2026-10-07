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

  async function getSnapshots(organizationId){
    const qs=new URLSearchParams({organization_id:`eq.${organizationId}`,select:'module_key,data,source_version,updated_at',order:'module_key.asc'});
    const rows=await authFetch(`/rest/v1/module_snapshots?${qs}`);
    const out={};
    for(const row of rows||[]) out[row.module_key]=row;
    return out;
  }

  async function saveSnapshot(organizationId,moduleKey,data,sourceVersion='77'){
    const session=await getSession();
    const body=[{
      organization_id:organizationId,
      module_key:moduleKey,
      data:data==null?{}:data,
      source_version:String(sourceVersion||'77'),
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
    signIn,signOut,getSession,getMembership,getSnapshots,saveSnapshot,clearSession
  };
})();
