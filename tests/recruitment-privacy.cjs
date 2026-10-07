const {JSDOM}=require('jsdom'),fs=require('fs'),assert=require('node:assert/strict');
const dom=new JSDOM('<div id="recruitmentTestScreen"></div>',{url:'https://example.test',runScripts:'outside-only'}),w=dom.window,d=w.document;
w.AbortController=global.AbortController;w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};w.confirm=()=>true;
let lead=true,requests=[],context={orgId:'org',connected:true,allowed:true,canWrite:false},popup;
const general={bucket:'nbl-recruitment-general-documents',path:'org/test_fixture/training.pdf',label:'Training plan'};
const safe={id:'test_fixture',name:'Synthetic Driver',location:'Nashville',documents:{general},testPipeline:{stage:'Training',stageReviewed:true,ops:{agreedDays:'Mon-Fri'},onboarding:{adp:'Sent'},training:{result:'In Progress'}}};
let raw={...safe,dob:'RESTRICTED_CANARY',cdlNumber:'RESTRICTED_CANARY',email:'RESTRICTED_CANARY',documents:{...safe.documents,sensitive:{path:'org/test_fixture/application.pdf',label:'RESTRICTED_CANARY'}},_cloudUpdatedAt:'2026-10-07T00:00:00Z'};
w.localStorage.setItem('nbl_supabase_session_v1',JSON.stringify({access_token:'fixture',user:{id:'fixture'},expires_at:4102444800}));
w.open=()=>popup={location:{href:''},close(){}};
w.fetch=async(url,opts={})=>{
 const u=new URL(url,w.location.href);requests.push({path:u.pathname,method:opts.method||'GET',body:opts.body});let data;
 if(u.pathname.endsWith('/organization_members'))data=[{organization_id:'org',role:lead?'operations':'owner',module_permissions:lead?{access_role:'lead_driver'}:{}}];
 else if(u.pathname.endsWith('/organizations'))data=[{id:'org'}];
 else if(u.pathname.endsWith('/rpc/get_recruitment_operational')){assert(lead);data=[safe];}
 else if(u.pathname.includes('/nbl_fc_recruitment')){
  if(lead)return {ok:false,status:403,text:async()=>JSON.stringify({message:'Hiring access denied'})};
  if(opts.method){const row=JSON.parse(opts.body);raw={...row.payload,_cloudUpdatedAt:row.updated_at};data=[{payload:raw,updated_at:row.updated_at}];}
  else data=[{record_type:'settings',payload:{}},{record_type:'candidate',payload:raw,updated_at:raw._cloudUpdatedAt}];
 }else if(u.pathname.includes('/storage/v1/object/sign/'))data={signedURL:'/object/sign/synthetic'};
 else if(u.pathname.includes('/storage/v1/object/'))data={};
 else throw new Error('Unexpected request '+u.pathname);
 return {ok:true,text:async()=>JSON.stringify(data)};
};
for(const file of ['cloud.js','recruitment-test.js'])w.eval(fs.readFileSync(require('path').join(__dirname,'..',file),'utf8'));
const $=id=>d.getElementById(id),until=async f=>{for(let i=0;i<150;i++){if(f())return;await new Promise(r=>setTimeout(r,10));}throw Error('Timeout');};
(async()=>{
 w.NBLRecruitmentTest.init({getContext:()=>context});await w.NBLRecruitmentTest.open();
 assert.equal($('rtAdd'),null);d.querySelector('[data-rt-edit]').click();
 assert.equal(d.querySelectorAll('#rtModal details[open]').length,0);
 assert(!$('rtModal').textContent.includes('RESTRICTED_CANARY'));for(const id of ['rtSave','rtDelete','rtImport','rtSummary','rtUpload','rt_dob','rt_cdlNumber'])assert.equal($(id),null);
 d.querySelector('[data-rt-view]').click();await until(()=>popup.location.href);const signed=requests.find(r=>r.path.includes('/object/sign/'));assert(signed.path.includes(general.bucket));assert.equal(JSON.parse(signed.body).expiresIn,120);
 assert(!requests.some(r=>r.path.includes('/nbl_fc_recruitment')),'Lead never requests raw candidate tables');
 await assert.rejects(w.NBLCloud.saveRecruitmentTestCandidate('org',{id:'test_fixture'}),/Hiring access denied/);
 await assert.rejects(w.NBLCloud.getRecruitmentDocumentUrl({bucket:'unexpected',path:'org/file'}),/Unknown/);
 lead=false;context={...context,canWrite:true};w.NBLRecruitmentTest.reset();await w.NBLRecruitmentTest.open();d.querySelector('[data-rt-edit]').click();
 assert.equal($('rtDocAccess').value,'sensitive');assert($('rtModal').textContent.includes('RESTRICTED_CANARY'),'Owner keeps restricted details');
 const sensitiveSection=[...d.querySelectorAll('details')].find(x=>x.querySelector('summary').textContent==='Sensitive Documents');assert(sensitiveSection.textContent.includes('RESTRICTED_CANARY'));
 $('rtDocLabel').value='Training plan';Object.defineProperty($('rtDocFile'),'files',{value:[{name:'training.pdf',size:4}],configurable:true});$('rtDocAccess').value='general';
 const uploads=()=>requests.filter(r=>r.path.includes('/storage/v1/object/')&&!r.path.includes('/sign/')).length;
 const before=uploads();$('rtUpload').click();assert.equal(uploads(),before);assert.match($('rtMessage').textContent,/Review the document/);
 $('rtDocReviewed').checked=true;$('rtUpload').click();await until(()=>$('rtMessage').textContent.includes('Document uploaded'));
 assert.equal(uploads(),before+1);const uploaded=Object.values(raw.documents).find(x=>x.uploadedAt);assert.equal(uploaded.bucket,general.bucket);assert.equal(uploaded.classification,'general');
 await w.NBLCloud.uploadRecruitmentDocument('org','test_fixture','legacy',{name:'legacy.pdf',size:4});assert(requests.at(-1).path.includes('/nbl-recruitment-documents/'),'Old callers default to sensitive');
 console.log('PASS read-only Lead profile, no raw-table fetch, separate document sections, sensitive default, reviewed General upload, bucket-aware expiring links');dom.window.close();
})().catch(e=>{console.error(e);dom.window.close();process.exit(1)});
