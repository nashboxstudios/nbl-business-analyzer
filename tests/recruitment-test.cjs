const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const E=require('../recruitment-test.js');
const seed=()=>E.normalize({id:'test_a',name:'Alex',recruitmentStatus:'In Progress',testPipeline:{stage:'Screening',stageReviewed:true}});
const c=seed(),p=c.testPipeline;
assert(E.validate(c).length>5,'Incomplete screening cannot advance');
Object.assign(p.screening,{interviewer:'Reviewer',date:'2026-10-04',experience:'5 years',availability:'Days, Mon-Fri',payExpectation:'$30/hr',peak:'Yes',doublesNotes:'Will obtain endorsement',safety:'No',criminal:'Yes',consent:'Yes',documents:'Yes',decision:'Proceed',processExplained:true,shiftsExplained:true});
assert.deepEqual(E.validate(c),[],'Criminal answer recorded without automatic disqualification');
p.stage='Background & Drug Screen';Object.assign(p.background,{applicationSent:'2026-10-04',drugStatus:'Pending',readyForOps:true,fadvStatus:'In Progress'});
assert.deepEqual(E.validate(c),[],'Manager may advance before FADV or drug result complete');
p.stage='Ops Interview';Object.assign(p.ops,{interviewer:'Ops',date:'2026-10-05',agreedDays:'Mon-Fri',shiftStart:'06:00',shiftEnd:'16:00',dispatchTime:'06:00',doublesRequired:'May be required',scheduleAccepted:'Yes',doublesAccepted:'Yes',decision:'Proceed'});p.ops.confirmedSchedule=E.scheduleKey(c);
assert.deepEqual(E.validate(c),[]);
const previous=E.normalize(c);p.ops.dispatchTime='08:00';E.reconcile(previous,c);assert.equal(p.ops.scheduleAccepted,'');assert(E.validate(c).length>0);
p.onHold=true;assert(E.validate(c).includes('Resume this candidate from Hold'));p.onHold=false;Object.assign(p.ops,{scheduleAccepted:'Yes',doublesAccepted:'Yes',confirmedSchedule:E.scheduleKey(c)});
p.stage='Road Test';c.roadTest='Pass';Object.assign(c.roadTestForm,{date:'2026-10-06',testAdminName:'Road Reviewer'});assert.deepEqual(E.validate(c),[]);
p.stage='Offer & Onboarding';c.offerLetter='Accepted';c.startDate='2026-10-10';Object.assign(p.onboarding,{adp:'Sent',sf:'Complete',motive:'Sent'});assert.deepEqual(E.validate(c),[]);
p.stage='Training';Object.assign(p.training,{trainer:'Trainer',completedDate:'2026-10-12',result:'Complete'});assert(E.validate(c).includes('FADV: Complete'));p.background.fadvStatus='Complete';p.background.drugStatus='Pass';assert.deepEqual(E.validate(c),[]);
// Exercise real cloud wrapper with simulated REST, including stale token and failure.
let fail=false;const rows=new Map([['test_a',{record_type:'candidate',record_key:'test_a',payload:seed(),updated_at:'2026-10-04T01:00:00.123456+00:00'}]]),requests=[];
const session={access_token:'test-token',user:{id:'test-user'},expires_at:4102444800};
const sandbox={window:{},localStorage:{getItem:()=>JSON.stringify(session)},URLSearchParams,AbortController,setTimeout,clearTimeout,Date,JSON,Number,String,Math,Set,Map,Uint8Array,TextEncoder,fetch:async(url,opts={})=>{
 const u=new URL(url);assert.equal(u.pathname,'/rest/v1/nbl_fc_recruitment_test_records');requests.push(opts.method||'GET');let data;
 if(fail)return{ok:false,status:500,text:async()=>JSON.stringify({message:'Intentional save failure'})};
 if(!opts.method)data=[{record_type:'settings',payload:{}},...rows.values()];
 else if(opts.method==='PATCH'){const id=u.searchParams.get('record_key').slice(3),old=rows.get(id);assert.equal(u.searchParams.get('organization_id'),'eq.org');if(old.updated_at!==u.searchParams.get('updated_at').slice(3))data=[];else{const next={...old,...JSON.parse(opts.body)};rows.set(id,next);data=[next];}}
 else if(opts.method==='POST'){const x=JSON.parse(opts.body);assert.equal(x.organization_id,'org');assert(!rows.has(x.record_key));rows.set(x.record_key,x);data=[x];}
 else throw Error('Unexpected method');return {ok:true,text:async()=>JSON.stringify(data)};
}};vm.runInNewContext(fs.readFileSync(require.resolve('../cloud.js'),'utf8'),sandbox);
(async()=>{const api=sandbox.window.NBLCloud,initial=await api.getRecruitmentTestData('org');assert.equal(initial.candidates.length,1);const a=initial.candidates[0];a.name='Updated';a.ssnFull='sensitive';a.roadTestForm={ssnFull:'sensitive'};const result=await api.saveRecruitmentTestCandidate('org',a,a._cloudUpdatedAt);assert.equal(result.name,'Updated');assert(!result.ssnFull);assert(!result.roadTestForm.ssnFull);await assert.rejects(api.saveRecruitmentTestCandidate('org',a,a._cloudUpdatedAt),/changed/);assert.equal(rows.get('test_a').payload.name,'Updated');fail=true;await assert.rejects(api.saveRecruitmentTestCandidate('org',result,result._cloudUpdatedAt),/Intentional/);assert.equal(rows.size,1);fail=false;await api.saveRecruitmentTestCandidate('org',{id:'test_b',name:'Blair'});assert.equal(rows.size,2);await assert.rejects(api.saveRecruitmentTestCandidate('org',{id:'production_a'}),/test candidate ID/);assert(!requests.includes('DELETE'));console.log('PASS stage gates, early Ops, hold, schedule invalidation, final checks, test-only persistence, conflict/failure, SSN stripping, additive insert');})().catch(e=>{console.error(e);process.exit(1)});
