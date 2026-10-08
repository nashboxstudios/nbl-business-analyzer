const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const E=require('../recruitment-test.js');
const seed=()=>E.normalize({id:'test_a',name:'Alex',recruitmentStatus:'In Progress',testPipeline:{stage:'Screening',stageReviewed:true}});
const duplicate={id:'test_sample',name:'Jordan Sample',email:'driver@example.test',phone:'615-555-0100',fedexId:'12345',cdlNumber:'AB-123',cdlIssuingState:'TN'};
assert.deepEqual(E.duplicateMatches({...duplicate,id:'test_new',name:' SAMPLE,  Jordan ',phone:'+1 (615) 555-0100'},[duplicate])[0].reasons,['Name','Email','Phone','FedEx ID','CDL']);
assert.equal(E.duplicateMatches(duplicate,[duplicate]).length,0,'Self is not duplicate');
assert.equal(E.duplicateMatches({...duplicate,id:'test_new'},[{...duplicate,deletedAt:'2026-10-05'}]).length,0,'Deleted records excluded');
assert.equal(E.duplicateMatches({id:'test_blank',name:'',email:'',phone:''},[{id:'test_other'}]).length,0,'Blanks do not match');
assert.deepEqual(E.duplicateMatches({id:'test_new',name:'Different Person',cdlNumber:'AB123',cdlIssuingState:'GA'},[duplicate]),[],'Different issuing states do not match CDL alone');
assert.deepEqual(E.duplicateMatches({id:'test_new',name:'Different Person',phone:'555'},[{id:'test_other',phone:'555'}]),[],'Partial phone numbers do not match');
const c=seed(),p=c.testPipeline;
assert(E.validate(c).length>5,'Incomplete screening cannot advance');
Object.assign(p.screening,{interviewer:'Reviewer',date:'2026-10-04',experience:'5 years',availability:'Days, Mon-Fri',payExpectation:'$30/hr',peak:'Yes',doublesNotes:'Will obtain endorsement',safety:'No',criminal:'Yes',consent:'Yes',documents:'Yes',decision:'Proceed',processExplained:true,shiftsExplained:true,doublesTrainingWilling:'Yes',possibleShifts:'Day and night shifts',shiftAvailabilityAccepted:'Yes'});
assert.deepEqual(E.validate(c),[],'Criminal answer recorded without automatic disqualification');
p.stage='Background & Drug Screen';Object.assign(p.background,{applicationSent:'2026-10-04',drugStatus:'Pending',readyForOps:true,fadvStatus:'In Progress'});
assert.deepEqual(E.validate(c),[],'Manager may advance before FADV or drug result complete');
p.stage='Ops Interview';Object.assign(p.ops,{date:'2026-10-05',agreedDays:'Mon-Fri',dispatchAgreement:'6 AM dispatch; 6 AM–4 PM shift explained and accepted',doublesAgreement:'Pulling and assembling doubles explained and accepted'});E.recordOpsAgreements(c,'Ops');
assert.deepEqual(E.validate(c),[]);delete p.ops.date;assert(E.validate(c).includes('Ops interview date'));p.ops.date='2026-10-05';
const previous=E.normalize(c);p.ops.dispatchAgreement='8 AM dispatch accepted';E.reconcile(previous,c);assert.equal(p.ops.confirmedSchedule,undefined);assert(E.validate(c).length>0);
p.onHold=true;assert(E.validate(c).includes('Resume this candidate from Hold'));p.onHold=false;E.recordOpsAgreements(c,'Ops');
p.stage='Road Test';c.roadTest='Pass';Object.assign(c.roadTestForm,{date:'2026-10-06',testAdminName:'Road Reviewer',timeFrom:'09:15',timeTo:'10:30'});assert.deepEqual(E.validate(c),[]);
delete c.roadTestForm.timeFrom;assert(E.validate(c).includes('Road test time from'));c.roadTestForm.timeFrom='09:15';
p.stage='Offer & Onboarding';c.offerLetter='Accepted';c.startDate='2026-10-10';Object.assign(p.onboarding,{adp:'Sent',sf:'Complete',motive:'Sent'});assert.deepEqual(E.validate(c),[]);
p.stage='Training';Object.assign(p.training,{trainer:'Trainer',completedDate:'2026-10-12',result:'Complete'});assert(E.validate(c).includes('FADV: Complete'));p.background.fadvStatus='Complete';p.background.drugStatus='Pass';assert.deepEqual(E.validate(c),[]);
// The updated questionnaire is distinct from legacy willingness / shift checkboxes.
const oldScreening=E.normalize({id:'test_old_screening',testPipeline:{stage:'Screening',stageReviewed:true,screening:{...p.screening,doublesTrainingWilling:undefined,possibleShifts:undefined,shiftAvailabilityAccepted:undefined,doublesWilling:'Yes'}}});
assert(E.validate(oldScreening).includes('Doubles endorsement and training willingness'));
const legacyOps={agreedDays:'Mon-Fri',shiftStart:'06:00',shiftEnd:'16:00',dispatchTime:'06:00',doublesRequired:'May be required',scheduleAccepted:'Yes',doublesAccepted:'Yes',notes:'Keep prior notes'};
legacyOps.confirmedSchedule=JSON.stringify(['Mon-Fri','06:00','16:00','06:00','May be required']);
const migrated=E.normalize({id:'test_legacy',testPipeline:{stage:'Road Test',ops:legacyOps}});
assert(migrated.testPipeline.ops.dispatchAgreement.includes('06:00'));
assert(migrated.testPipeline.ops.doublesAgreement.includes('assembly'));
assert.equal(migrated.testPipeline.ops.notes,'Keep prior notes');assert.equal(migrated.testPipeline.ops.confirmedSchedule,E.scheduleKey(migrated));
const unconfirmed=E.normalize({id:'test_unconfirmed',testPipeline:{ops:{...legacyOps,scheduleAccepted:'No'}}});assert.equal(unconfirmed.testPipeline.ops.dispatchAgreement,'');
const escaped=E.summaryHtml({...c,name:'<script>unsafe</script>',ssnFull:'SECRET_SSN',medicalCardExpiry:'SECRET_MEDICAL',email:'EXCLUDED_EMAIL',address:'EXCLUDED_ADDRESS',dob:'EXCLUDED_DOB',cdlNumber:'EXCLUDED_CDL',cdlIssuingState:'EXCLUDED_CDL_STATE',cdlExpiry:'EXCLUDED_CDL_EXPIRY',offerLetter:'SECRET_OFFER',testPipeline:{...p,screening:{...p.screening,notes:'<img src=x onerror=alert(1)>'}}});
assert(escaped.includes('&lt;script&gt;unsafe&lt;/script&gt;'));assert(!escaped.includes('<script>unsafe'));
for(const heading of ['Interview Summary','Candidate Details','Background &amp; Drug Screen','Screening Interview'])assert(escaped.includes('<h2>'+heading+'</h2>'));
for(const text of ['SECRET_SSN','SECRET_MEDICAL','SECRET_OFFER','Ops Interview','Position &amp; Offer','EXCLUDED_EMAIL','EXCLUDED_ADDRESS','EXCLUDED_DOB','EXCLUDED_CDL','Driver Qualifications','Application sent','Drug screen email sent',E.APPLICATION_PROCESS.split('\n')[0]])assert(!escaped.includes(text));
assert(escaped.includes('FADV status'));
assert(escaped.includes('&lt;img src=x onerror=alert(1)&gt;'));

// Exercise real cloud wrapper with simulated REST, including stale token and failure.
let fail=false;const rows=new Map([['test_a',{record_type:'candidate',record_key:'test_a',payload:seed(),updated_at:'2026-10-04T01:00:00.123456+00:00'}]]),requests=[];
const session={access_token:'test-token',user:{id:'test-user'},expires_at:4102444800};
const sandbox={window:{},localStorage:{getItem:()=>JSON.stringify(session)},URLSearchParams,AbortController,setTimeout,clearTimeout,Date,JSON,Number,String,Math,Set,Map,Uint8Array,TextEncoder,fetch:async(url,opts={})=>{
 const u=new URL(url);if(u.pathname==='/rest/v1/organization_members')return {ok:true,text:async()=>JSON.stringify([{organization_id:'org',role:'owner',status:'active'}])};if(u.pathname==='/rest/v1/organizations')return {ok:true,text:async()=>JSON.stringify([{id:'org'}])};assert.equal(u.pathname,'/rest/v1/nbl_fc_recruitment_test_records');requests.push(opts.method||'GET');let data;
 if(fail)return{ok:false,status:500,text:async()=>JSON.stringify({message:'Intentional save failure'})};
 if(!opts.method){const id=u.searchParams.get('record_key')?.slice(3),old=rows.get(id);data=id?(old&&!old.payload.deletedAt&&old.updated_at===u.searchParams.get('updated_at').slice(3)?[old]:[]):[{record_type:'settings',payload:{}},...rows.values()];}
 else if(opts.method==='PATCH'){const id=u.searchParams.get('record_key').slice(3),old=rows.get(id);assert.equal(u.searchParams.get('organization_id'),'eq.org');assert.equal(u.searchParams.get('payload->>deletedAt'),'is.null');if(!old||old.payload.deletedAt||old.updated_at!==u.searchParams.get('updated_at').slice(3))data=[];else{const next={...old,...JSON.parse(opts.body)};rows.set(id,next);data=[next];}}
 else if(opts.method==='POST'){const x=JSON.parse(opts.body);assert.equal(x.organization_id,'org');assert(!rows.has(x.record_key));rows.set(x.record_key,x);data=[x];}
 else throw Error('Unexpected method');return {ok:true,text:async()=>JSON.stringify(data)};
}};vm.runInNewContext(fs.readFileSync(require.resolve('../cloud.js'),'utf8'),sandbox);
(async()=>{const api=sandbox.window.NBLCloud,initial=await api.getRecruitmentTestData('org');assert.equal(initial.candidates.length,1);const a=initial.candidates[0];a.name='Updated';a.ssnFull='sensitive';a.roadTestForm={ssnFull:'sensitive'};const result=await api.saveRecruitmentTestCandidate('org',a,a._cloudUpdatedAt);assert.equal(result.name,'Updated');assert(!result.ssnFull);assert(!result.roadTestForm.ssnFull);await assert.rejects(api.saveRecruitmentTestCandidate('org',a,a._cloudUpdatedAt),/changed/);assert.equal(rows.get('test_a').payload.name,'Updated');fail=true;await assert.rejects(api.saveRecruitmentTestCandidate('org',result,result._cloudUpdatedAt),/Intentional/);assert.equal(rows.size,1);fail=false;await api.saveRecruitmentTestCandidate('org',{id:'test_b',name:'Blair'});assert.equal(rows.size,2);await assert.rejects(api.saveRecruitmentTestCandidate('org',{id:'production_a'}),/test candidate ID/);const before=JSON.stringify(rows.get('test_a').payload);await assert.rejects(api.deleteRecruitmentTestCandidate('org','test_a',a._cloudUpdatedAt),/changed/);assert.equal(JSON.stringify(rows.get('test_a').payload),before);fail=true;await assert.rejects(api.deleteRecruitmentTestCandidate('org','test_a',result._cloudUpdatedAt),/Intentional/);fail=false;await api.deleteRecruitmentTestCandidate('org','test_a',result._cloudUpdatedAt);assert(rows.get('test_a').payload.deletedAt);assert.equal(rows.get('test_a').payload.deletedBy,'test-user');assert.equal(rows.get('test_a').payload.name,'Updated');assert.equal(rows.size,2);assert.equal((await api.getRecruitmentTestData('org')).candidates.length,1);await assert.rejects(api.saveRecruitmentTestCandidate('org',result,result._cloudUpdatedAt),/changed/);await assert.rejects(api.saveRecruitmentTestCandidate('org',{...result,_cloudUpdatedAt:rows.get('test_a').updated_at},rows.get('test_a').updated_at),/changed/);await assert.rejects(api.deleteRecruitmentTestCandidate('org','production_a',result._cloudUpdatedAt),/saved candidate/);assert(!requests.includes('DELETE'));console.log('PASS stage gates, early Ops, hold, Ops text agreements, legacy conversion, summary escaping/content, final checks, test-only persistence, conflict/failure, SSN stripping, additive insert');})().catch(e=>{console.error(e);process.exit(1)});

// Overview uses only recorded answers, carries review notes, and appears once before supporting details.
const overviewCandidate=E.normalize({name:'Jordan Example',location:'Test Terminal',doubles:'Yes With Experience',hiringSummary:{fedexExperience:'2 years'},testPipeline:{screening:{experienceRequirement:'Meets 1 in 3',experience:'18 months',payExpectation:'$30/hr',possibleShifts:'Nights',availability:'Mon-Fri',doublesNotes:'6 months',safety:'Yes',safetyNotes:'One incident under review',criminal:'No',sexOffender:'Yes',sexOffenderNotes:'Review pending'}}});
const before=JSON.stringify(overviewCandidate),overview=E.interviewSummary(overviewCandidate);
for(const value of ['Test Terminal','Meets 1 in 3','18 months','2 years','$30/hr','Nights','Mon-Fri','6 months','One incident under review','felony/misdemeanor: None reported','sex offender: Reported; Review pending'])assert(overview.includes(value),value);
for(const format of ['letter','phone']){
 const html=E.summaryHtml(overviewCandidate,undefined,format),details=html.split('<div class="supporting-details">')[1];
 assert(html.indexOf('<h2>Interview Summary</h2>')<html.indexOf('<h2>Candidate Details</h2>'));
 for(const value of ['Test Terminal','18 months','2 years','$30/hr','Nights','6 months','One incident under review','Review pending'])assert(!details.includes(value),'Repeated '+value);
 assert(html.includes('.supporting-details{break-before:page'));
}
assert.equal(JSON.stringify(overviewCandidate),before,'Export never changes candidate data');
const missing=E.interviewSummary({name:'Blank'});assert(missing.includes('sex offender: Not recorded'));assert(!missing.includes('None reported'));
assert(!E.interviewSummary({testPipeline:{screening:{experience:'10 years'}}}).includes('Meets'),'No inferred experience eligibility');
assert.throws(()=>E.summaryHtml({...overviewCandidate,hiringSummary:{interviewSummary:'x'.repeat(601)}}),/too long/);
assert.equal(E.interviewSummary({...overviewCandidate,hiringSummary:{interviewSummary:'  Reviewed concise summary.  '}}),'Reviewed concise summary.');
assert(E.summaryHtml({...overviewCandidate,hiringSummary:{interviewSummary:'<img src=x>'}}).includes('&lt;img src=x&gt;'));
