const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({headless:true,...(process.env.NBL_TEST_BROWSER?{executablePath:process.env.NBL_TEST_BROWSER}:{}),args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const openSection=async title=>{const detail=page.locator('#rtModal details').filter({has:page.getByText(title,{exact:true})});if(!await detail.evaluate(x=>x.open))await detail.locator('summary').click();};
const sample={id:'test_fixture',name:'Test Alex',location:'Atlanta',recruitmentStatus:'In Progress',createdAt:'2026-09-30',documents:{slot1:{path:'org/original/doc.pdf',label:'Original CDL'}},testPipeline:{stage:'Screening',stageReviewed:false,history:[{at:'2026-10-04T01:00:00Z',action:'Copied from Recruitment'}]},_cloudUpdatedAt:'2026-10-04T01:00:00Z'};
let records=[sample],fail=false,productionWrites=0,testWrites=0,session=true;
await page.addInitScript(()=>localStorage.setItem('nbl_supabase_session_v1',JSON.stringify({access_token:'test-only',user:{id:'test-user',email:'test@example.test'},expires_at:4102444800})));
await page.route('https://tjpcabnhaxaiecnbnrhm.supabase.co/**',async route=>{
 const req=route.request(),u=new URL(req.url()),path=u.pathname;let data=[];
 if(path.includes('/organization_members'))data=[{organization_id:'org',role:'owner',status:'active',module_permissions:{}}];
 else if(path.includes('/organizations'))data=[{id:'org',name:'Test Organization'}];
 else if(path.includes('/profiles'))data=[{user_id:'test-user',full_name:'Test Reviewer'}];
 else if(path.includes('/nbl_fc_recruitment_test_records')){
  if(req.method()==='GET')data=[{record_type:'settings',payload:{}},...records.map(c=>({record_type:'candidate',record_key:c.id,payload:c,updated_at:c._cloudUpdatedAt}))];
  else {testWrites++;if(fail)return route.fulfill({status:500,json:{message:'Intentional browser save failure'}});const row=req.postDataJSON();let i=records.findIndex(c=>c.id===u.searchParams.get('record_key')?.slice(3));if(req.method()==='PATCH'&&records[i]._cloudUpdatedAt!==u.searchParams.get('updated_at').slice(3))data=[];else{const saved={...row.payload,_cloudUpdatedAt:row.updated_at};if(i>=0)records[i]=saved;else records.push(saved);data=[{payload:saved,updated_at:row.updated_at}];}}
 }else if(path.includes('/nbl_fc_recruitment_records')){if(req.method()!=='GET')productionWrites++;data=[{record_type:'settings',payload:{version:11}},{record_type:'candidate',record_key:'production-fixture',payload:{id:'production-fixture',name:'Production Unchanged',recruitmentStatus:'In Progress'}}];}
 else if(path.includes('/nbl_fc_module_snapshots'))data=[];
 else if(path.includes('/nbl_fc_'))data=[{record_type:'settings',record_key:'main',payload:{}}];
 return route.fulfill({json:data});
});
await page.route('**/api/**',route=>route.fulfill({json:route.request().url().includes('/api/hr/parse-application')?{ok:true,fields:{name:'Test Alex',email:'driver@example.test',address:'Current address',cdlNumber:'TEST1234',dob:'1983-04-14'}}:{ok:true,configured:false,authenticated:false}}));
await page.goto(process.env.NBL_TEST_URL||'http://127.0.0.1:8130/index.html');
await page.locator('#cloudLoginOverlay').waitFor({state:'hidden'});
await page.locator('[data-screen="recruitment-test"]').click();await page.getByRole('button',{name:'Test Alex',exact:true}).click();
await page.locator('#rtModal').waitFor({state:'visible'});assert(await page.locator('#rtModal').evaluate(x=>x.open));assert.equal(await page.locator('#rtModal details[open]').count(),0);
const titles=await page.locator('#rtModal details summary').allTextContents();assert(titles.indexOf('Hiring Summary')+1===titles.indexOf('Ops Interview'));assert.equal(await page.locator('#rtModal details').filter({has:page.locator('summary', {hasText:'Ops Interview'})}).locator('[data-rt-field]').count(),4);assert.equal(await page.locator('#rtModal details').filter({has:page.locator('summary', {hasText:'Driver Qualifications'})}).locator('#rt_doubles').count(),0);assert.deepEqual(titles.slice(-3),['Onboarding Tasks','Training','Document Upload']);assert.equal(titles.filter(x=>x==='Onboarding Tasks').length,1);
await openSection('Current Stage & Next Action');await page.locator('#rt_testPipeline_stageReviewed').check();await page.locator('#rtSave').click();await page.getByText('Draft saved to Recruitment – Test.',{exact:true}).waitFor();
await page.locator('#rtAdvance').click();assert.match(await page.locator('#rtMessage').textContent(),/Complete before advancing/);
await page.locator('#rtClose').click();await page.getByRole('button',{name:'Test Alex',exact:true}).click();assert(await page.locator('#rt_testPipeline_stage').count()===0,'Stage review stays saved');
await openSection('Screening Interview');
for(const [k,v] of Object.entries({date:'2026-10-04',interviewer:'Reviewer',experience:'Five years tractor-trailer',availability:'Mon-Fri days',payExpectation:'$30/hr',doublesNotes:'No prior doubles',possibleShifts:'Day and night; Ops will assign final shift'}))await page.locator('#rt_testPipeline_screening_'+k).fill(v);
for(const [k,v] of Object.entries({peak:'Yes',safety:'No',criminal:'Yes',consent:'Yes',documents:'Yes',decision:'Proceed',doublesTrainingWilling:'Yes',shiftAvailabilityAccepted:'Yes'}))await page.locator('#rt_testPipeline_screening_'+k).selectOption(v);
for(const k of ['processExplained','shiftsExplained'])await page.locator('#rt_testPipeline_screening_'+k).check();
fail=true;await page.locator('#rtSave').click();await page.waitForFunction(()=>document.querySelector('#rtMessage').textContent.includes('Intentional browser save failure'));assert.equal(await page.locator('#rt_testPipeline_screening_experience').inputValue(),'Five years tractor-trailer');fail=false;
await page.locator('#rtAdvance').click();await page.waitForFunction(()=>document.querySelector('#rtMessage').textContent.includes('Saved and moved to Background'));assert.equal(records[0].testPipeline.stage,'Background & Drug Screen');
await openSection('Background & Drug Screen');await page.locator('#rt_testPipeline_background_applicationSent').fill('2026-10-04');await page.locator('#rt_testPipeline_background_drugStatus').selectOption('Pending');await page.locator('#rt_testPipeline_background_readyForOps').check();await page.locator('#rtAdvance').click();await page.waitForFunction(()=>document.querySelector('#rtMessage').textContent.includes('Saved and moved to Ops'));
await openSection('Ops Interview');for(const [k,v] of Object.entries({date:'2026-10-05',agreedDays:'Mon-Fri',dispatchAgreement:'6 AM–4 PM shift; approx 6 AM dispatch, explained and agreed',doublesAgreement:'Pull and assemble doubles, explained and agreed'}))await page.locator('#rt_testPipeline_ops_'+k).fill(v);
await page.locator('#rtSave').click();await page.getByText('Draft saved to Recruitment – Test.',{exact:true}).waitFor();
await page.locator('#rt_testPipeline_ops_dispatchAgreement').fill('');await page.locator('#rtAdvance').click();assert.match(await page.locator('#rtMessage').textContent(),/Dispatch schedule/);
await page.locator('#rt_testPipeline_ops_dispatchAgreement').fill('8 AM dispatch explained and agreed');
await openSection('Hiring Summary');const popupPromise=page.waitForEvent('popup');await page.locator('#rtSummary').click();const popup=await popupPromise;await popup.waitForLoadState();const report=await popup.locator('body').textContent();assert(report.includes('Five years tractor-trailer'));assert(report.includes('FADV status'));assert(!report.includes('8 AM dispatch'));for(const x of ['Road test status','Medical card expiry','Proposed start date','Equipment fam'])assert(!report.includes(x));await popup.close();
await page.screenshot({path:'/tmp/recruitment-test-desktop.png',fullPage:true});
await page.locator('#rtClose').click();await page.locator('[data-screen="hr"]').click();await page.getByText('Production Unchanged',{exact:true}).first().waitFor();assert.equal(productionWrites,0);
await page.locator('[data-screen="recruitment-test"]').click();await page.getByRole('button',{name:'Test Alex',exact:true}).click();assert.equal(await page.locator('#rtModal details[open]').count(),0);await openSection('Ops Interview');await page.locator('#rt_testPipeline_ops_dispatchAgreement').waitFor();assert.equal(await page.locator('#rt_testPipeline_ops_dispatchAgreement').inputValue(),'6 AM–4 PM shift; approx 6 AM dispatch, explained and agreed','Unsaved changes remain draft');
for(const width of [320,390,430]){
 await page.setViewportSize({width,height:844});assert(await page.locator('#rtModal').evaluate(x=>x.scrollWidth<=x.clientWidth+1),'No modal horizontal overflow at '+width);
 assert.equal(await page.locator('#rt_name').evaluate(x=>getComputedStyle(x).fontSize),'16px');
 assert.equal(await page.locator('#rtImportFile').evaluate(x=>x.closest('details').querySelector('summary').textContent),'Candidate Details');
}
await openSection('Candidate Details');await page.locator('#rtImportFile').setInputFiles({name:'First Advantage.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF')});await page.waitForFunction(()=>document.querySelector('#rtMessage').textContent.includes('Driver data added'));assert.equal(await page.locator('#rt_cdlNumber').inputValue(),'TEST1234');await page.locator('#rtSave').click();await page.getByText('Draft saved to Recruitment – Test.',{exact:true}).waitFor();assert.equal(records[0].cdlNumber,'TEST1234');assert.equal(records[0].testPipeline.ops.date,'2026-10-05');
await openSection('Hiring Summary');const phonePopupPromise=page.waitForEvent('popup');await page.locator('#rtSummaryPhone').click();const phonePopup=await phonePopupPromise;await phonePopup.waitForLoadState();await phonePopup.setViewportSize({width:390,height:844});assert(await phonePopup.locator('body').evaluate(x=>x.classList.contains('phone-report')));assert(await phonePopup.locator('body').evaluate(x=>x.scrollWidth<=window.innerWidth+1));assert.equal(await phonePopup.locator('.facts').first().evaluate(x=>getComputedStyle(x).gridTemplateColumns.split(' ').length),1);await phonePopup.pdf({path:'/tmp/recruitment-summary-phone.pdf',preferCSSPageSize:true,printBackground:true});await phonePopup.close();
await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/recruitment-test-mobile.png',fullPage:true});
await page.locator('#rtClose').click();await page.evaluate(()=>window.NBLRecruitmentTest.reset());assert.equal(await page.locator('#rtModal').count(),0);
assert.equal(errors.length,0,errors.join('\n'));assert(testWrites>=5);await browser.close();console.log('PASS browser navigation, production isolation, persisted drafts, failures, mandatory gates, early Ops, changed schedule, summary exclusions, section order, mobile, reset');
})().catch(e=>{console.error(e);process.exit(1)});
