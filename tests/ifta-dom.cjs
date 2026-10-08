const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/index.html','utf8').replace(/<script[\s\S]*?<\/script>/g,'');
const until=async f=>{for(let i=0;i<200;i++){if(f())return;await new Promise(r=>setTimeout(r,10));}throw Error('Timed out: '+f);};
async function setup(role='owner'){
 const dom=new JSDOM(html,{url:'http://localhost:8130',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document,requests=[],saved=new Map(),dbValues=new Map();let failSave=false,mileageError=false,blobDownloads=0;
 w.AbortController=global.AbortController;w.TextEncoder=global.TextEncoder;w.TextDecoder=global.TextDecoder;w.matchMedia=()=>({matches:false,addEventListener(){}});w.scrollTo=()=>{};w.confirm=()=>true;w.URL.createObjectURL=()=>{blobDownloads++;return 'blob:synthetic'};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};
 w.indexedDB={open(){const req={};setTimeout(()=>{req.result={objectStoreNames:{contains:()=>true},transaction(){const tx={objectStore(){return {get(key){const read={};setTimeout(()=>{read.result=dbValues.get(key);read.onsuccess?.();},0);return read;},put(value,key){dbValues.set(key,value);setTimeout(()=>tx.oncomplete?.(),0);}}}};return tx;}};req.onsuccess?.();},0);return req;}};
 w.localStorage.setItem('nbl_supabase_session_v1',JSON.stringify({access_token:'test-only',user:{id:'fixture'},expires_at:4102444800}));
 const statement={fileName:'Test statement.csv',settlementDate:'2026-10-09',result:{fuelPurchases:[{date:'30-SEP-2026',qty:20.5,state:'TN',vehicle:'fixture',ticket:'123',vendor:'Synthetic vendor'},{date:'01-OCT-2026',qty:99,state:'GA',vehicle:'fixture',ticket:'456'}]}};
 w.fetch=async(url,opts={})=>{
   const u=new URL(url,w.location.href),p=u.pathname;requests.push({p,query:u.searchParams.toString(),method:opts.method||'GET'});let data=[];
   const response=(data,status=200)=>({ok:status===200,status,text:async()=>JSON.stringify(data),json:async()=>data,blob:async()=>new w.Blob(['synthetic xlsx'])});
   if(p==='/api/ifta/mileage'){if(mileageError)return response({error:'Synthetic mileage failure'},502);const q=Number(u.searchParams.get('quarter'));return response({ok:true,units:'miles',start_date:q===3?'2026-07-01':'2026-04-01',end_date:q===3?'2026-09-30':'2026-06-30',trips:q===3?[{id:1,date:'2026-07-01',jurisdiction:'TN',distance:100,vehicle:{number:'fixture'}}]:[]});}
   if(p==='/api/ifta/export'){const body=JSON.parse(opts.body);assert(body.fuelReviewed&&body.mileageReviewed);return response({});}
   if(p.startsWith('/api/'))return response({ok:true,configured:false});
   if(p.endsWith('/organization_members'))data=[{organization_id:'org',role,status:'active'}];
   else if(p.endsWith('/organizations'))data=[{id:'org'}];
   else if(p.endsWith('/profiles'))data=[];
   else if(p.endsWith('/module_snapshots')){
     const key=u.searchParams.get('module_key')?.slice(3);
     if(!opts.method)data=key&&saved.has(key)?[saved.get(key)]:[];
     else{if(failSave)return response({message:'Synthetic save failure'},500);const body=JSON.parse(opts.body),moduleKey=body.module_key||key;const old=saved.get(moduleKey);if(opts.method==='PATCH'&&old?.updated_at!==u.searchParams.get('updated_at')?.slice(3))data=[];else{saved.set(moduleKey,{...body,updated_at:body.updated_at});data=[saved.get(moduleKey)];}}
   }else if(p.endsWith('/nbl_fc_finance_records')&&u.searchParams.get('record_type')==='eq.settlement_statement')data=[{record_key:'test-statement',payload:statement}];
   else if(p.includes('/nbl_fc_'))data=[{record_type:'settings',record_key:'main',payload:{}}];
   return response(data);
 };
 for(const file of ['core.js','cloud.js','recruitment-test.js','ifta.js','app.js'])w.eval(fs.readFileSync(root+'/'+file,'utf8'));
 await until(()=>d.getElementById('cloudLoginOverlay').classList.contains('hidden'));
 return {dom,w,d,saved,requests,get downloads(){return blobDownloads},set failSave(v){failSave=v},set mileageError(v){mileageError=v}};
}
(async()=>{
 const t=await setup(),{w,d}=t,$=id=>d.getElementById(id),change=(id,value)=>{const el=$(id);if(el.type==='checkbox')el.checked=value;else el.value=value;el.dispatchEvent(new w.Event('change',{bubbles:true}));};
 d.querySelector('[data-screen="ifta"]').click();assert(!$('financeSecurityModal').classList.contains('hidden'));assert($('iftaScreen').classList.contains('hidden'),'IFTA respects Finance lock');
 $('financeNewCode').value=$('financeConfirmCode').value='1234';$('financeSetupForm').dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));
 await until(()=>!$('iftaScreen').classList.contains('hidden')&&!$('iftaGenerate').disabled);
 assert.equal($('pageTitle').textContent,'IFTA');assert($('emptyState').classList.contains('hidden'));assert($('saveBtn').classList.contains('hidden'));
 change('iftaYear','2026');await until(()=>!$('iftaGenerate').disabled);change('iftaQuarter','3');await until(()=>!$('iftaGenerate').disabled);
 $('iftaGenerate').click();await until(()=>$('iftaStats').textContent.includes('1 fuel purchases'));
 assert.equal(d.querySelectorAll('#iftaRows tr').length,1);assert($('iftaRows').textContent.includes('20.50'));assert($('iftaExport').disabled);
 const taxable=d.querySelector('[data-ifta-taxable]');taxable.value='90';taxable.dispatchEvent(new w.Event('change',{bubbles:true}));change('iftaMileageReviewed',true);change('iftaFuelReviewed',true);change('iftaNotes','Synthetic exemption reference');assert(!$('iftaExport').disabled);
 $('iftaSave').click();await until(()=>$('iftaMessage').textContent==='Quarter saved.');assert.equal(t.saved.get('ifta:2026-Q3').data.rows[0].taxableMiles,90);
 $('iftaExport').click();await until(()=>t.downloads===1&&!$('iftaGenerate').disabled);
 change('iftaQuarter','2');await until(()=>!$('iftaGenerate').disabled);assert(!$('iftaStats').textContent.includes('1 fuel purchases'),'Quarter change clears previous data');assert($('iftaExport').disabled);
 change('iftaQuarter','3');await until(()=>$('iftaStats').textContent.includes('Saved'));assert.equal(d.querySelector('[data-ifta-taxable]').value,'90');assert.equal($('iftaNotes').value,'Synthetic exemption reference');assert(!$('iftaExport').disabled);
 const include=d.querySelector('[data-ifta-fuel]');include.checked=false;include.dispatchEvent(new w.Event('change',{bubbles:true}));assert($('iftaRows').textContent.includes('0.00'));assert(!$('iftaFuelReviewed').checked);assert($('iftaExport').disabled);
 t.failSave=true;$('iftaSave').click();await until(()=>$('iftaMessage').textContent.includes('Synthetic save failure'));assert.equal(d.querySelector('[data-ifta-fuel]').checked,false,'Failed saves retain draft');t.failSave=false;
 t.mileageError=true;$('iftaGenerate').click();await until(()=>$('iftaMessage').textContent.includes('Synthetic mileage failure'));assert.equal(d.querySelector('[data-ifta-taxable]').value,'90','Failed generation retains prior report');t.mileageError=false;
 t.saved.get('ifta:2026-Q3').updated_at='changed-elsewhere';$('iftaSave').click();await until(()=>$('iftaMessage').textContent.includes('another session'));assert.equal(d.querySelector('[data-ifta-fuel]').checked,false);
 const expectedSavedAt=t.saved.get('ifta:2026-Q3').updated_at;assert.equal(expectedSavedAt,'changed-elsewhere','Stale save rejected');
 assert(!t.requests.some(r=>r.method==='DELETE'),'No existing records deleted');
 w.NBLIFTA.reset();t.dom.window.close();
 const lead=await setup('operations');assert(lead.d.querySelector('[data-screen="ifta"]').classList.contains('hidden'),'Non-owner IFTA navigation denied');lead.dom.window.close();
 console.log('PASS full-app Compliance navigation, Finance lock, owner-only access, generation, review/edit/exclusion, exact quarter reload, XLSX download, retained drafts, stale-save conflicts and no deletions');
})().catch(e=>{console.error(e);process.exit(1)});
