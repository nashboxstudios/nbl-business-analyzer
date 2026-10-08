const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/index.html','utf8').replace(/<script[\s\S]*?<\/script>/g,'');
const until=async f=>{for(let i=0;i<300;i++){if(f())return;await new Promise(r=>setTimeout(r,10));}throw Error('Timed out: '+f);};
async function setup({role='owner',failSave=false,stale=false}={}){
 const dom=new JSDOM(html,{url:'http://localhost:8130',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document,requests=[],saved=new Map(),dbValues=new Map();
 w.structuredClone=structuredClone;w.AbortController=global.AbortController;w.TextEncoder=global.TextEncoder;w.TextDecoder=global.TextDecoder;w.matchMedia=()=>({matches:false,addEventListener(){}});w.scrollTo=()=>{};w.confirm=()=>true;
 w.indexedDB={open(){const req={};setTimeout(()=>{req.result={objectStoreNames:{contains:()=>true},transaction(){const tx={objectStore(){return {get(key){const read={};setTimeout(()=>{read.result=dbValues.get(key);read.onsuccess?.();},0);return read;},put(value,key){dbValues.set(key,value);setTimeout(()=>tx.oncomplete?.(),0);}}}};return tx;}};req.onsuccess?.();},0);return req;}};
 w.localStorage.setItem('nbl_supabase_session_v1',JSON.stringify({access_token:'test-only',user:{id:'fixture'},expires_at:4102444800}));
 const initial={module_key:'ivmr',updated_at:'original',data:{facilityDirectorySource:{encoding:'gzip-base64',content:'synthetic-private-content',facility_count:2},locations:{locations:[{id:'custom',spot:'377,370',city:'Murfreesboro',state:'TN',aliases:['Murfreesboro'],lat:36,lon:-86,radius_miles:8}]},current:{rawTrips:[{id:'raw',distance:10}],trips:[{id:'built',origin_destination:'Retained report',distance:10}],formatBuilt:true,loadedAt:'fixture'}}};
 saved.set('ivmr',structuredClone(initial));
 w.fetch=async(url,opts={})=>{
   const u=new URL(url,w.location.href),p=u.pathname;requests.push({p,method:opts.method||'GET'});let data=[];
   const response=(data,status=200)=>({ok:status===200,status,text:async()=>JSON.stringify(data),json:async()=>data});
   if(p==='/api/ivmr/facility-directory')return response({ok:true,source_date:'2025-02-14',facilities:[{number:'370',abbreviation:'TEST',facility_name:'EAST MURFREESBORO',facility_type:'STATION',address1:'100 Main Road',city:'MURFREESBORO',state:'TN',postal_code:'37000'},{number:'999',abbreviation:'NEW',facility_name:'NEW CITY',facility_type:'STATION',address1:'200 Main Road',city:'NEW CITY',state:'TN',postal_code:'37000'}]});
   if(p.startsWith('/api/'))return response({ok:true,configured:false});
   if(p.endsWith('/organization_members'))data=[{organization_id:'org',role,status:'active'}];
   else if(p.endsWith('/organizations'))data=[{id:'org'}];
   else if(p.endsWith('/profiles'))data=[];
   else if(p.endsWith('/module_snapshots')){
     if(!opts.method)data=[initial];
     else{
       if(failSave)return response({message:'Synthetic save failure'},500);
       if(stale||u.searchParams.get('updated_at')!=='eq.original')data=[];
       else{const row=JSON.parse(opts.body);saved.set('ivmr',row);data=[row];}
     }
   }else if(p.includes('/nbl_fc_'))data=[{record_type:'settings',record_key:'main',payload:{}}];
   return response(data);
 };
 for(const file of ['core.js','cloud.js','recruitment-test.js','ifta.js','ivmr-directory.js','app.js'])w.eval(fs.readFileSync(root+'/'+file,'utf8'));
 await until(()=>d.getElementById('cloudLoginOverlay').classList.contains('hidden'));
 d.querySelector('[data-screen="ivmr"]').click();
 return {dom,w,d,requests,saved};
}
(async()=>{
 const t=await setup(),$=id=>t.d.getElementById(id);
 await until(()=>$('ivmrDirectoryNote').textContent.includes('Imported'));
 const result=t.saved.get('ivmr').data;assert.equal(result.locations.locations[0].spot,'377,370');assert.equal(result.locations.locations[0].lat,36);assert.equal(result.locations.locations.length,2);assert.deepEqual(result.current.trips,[{id:'built',origin_destination:'Retained report',distance:10}]);assert(!result.current.formatBuilt);assert.deepEqual(result.facilityDirectorySource,{encoding:'gzip-base64',content:'synthetic-private-content',facility_count:2});
 assert($('ivmrLocationTable').textContent.includes('100 Main Road'));
 $('ivmrLocationSearch').value='NEW';$('ivmrLocationSearch').dispatchEvent(new t.w.Event('input',{bubbles:true}));assert.equal(t.d.querySelectorAll('#ivmrLocationTable tbody tr').length,1);assert(!$('ivmrLocationTable').textContent.includes('377,370'));
 $('ivmrLocationSearch').value='';$('ivmrLocationSearch').dispatchEvent(new t.w.Event('input',{bubbles:true}));
 t.d.querySelector('[data-ivmr-location-edit="custom"]').click();assert.equal($('ivmrLocationAddressInput').value,'100 Main Road, MURFREESBORO, TN, 37000');assert.equal($('ivmrLocationSpotInput').value,'377,370');
 t.dom.window.close();
 for(const settings of [{failSave:true},{stale:true}]){
  const f=await setup(settings),note=f.d.getElementById('ivmrDirectoryNote');await until(()=>note.textContent.includes('not saved'));
  assert.equal(f.d.querySelectorAll('#ivmrLocationTable tbody tr').length,1);assert.equal(f.saved.get('ivmr').updated_at,'original');assert.equal(f.saved.get('ivmr').data.current.formatBuilt,true);f.dom.window.close();
 }
 const ops=await setup({role:'operations'});await new Promise(r=>setTimeout(r,30));assert(!ops.requests.some(x=>x.p==='/api/ivmr/facility-directory'));ops.dom.window.close();
 console.log('PASS automatic directory import, preserved numbers/reports, persistence, search/edit, failed-save rollback, concurrency guard and owner access');
})().catch(e=>{console.error(e);process.exit(1);});
