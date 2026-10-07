const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../app.js'),'utf8');
const state={motive:{configured:true,driversLoaded:true,drivers:[]},dispatch:{drivers:[],runs:[],assignments:[],dailyBoards:{},savedPlans:[],locations:[{id:'nashville',name:'Nashville'}],activeLocationId:'nashville'},hr:{candidates:[]},safety:{scorecards:[]},catalog:[],dispatchLoaded:true};
let alerts=[],saved=0,confirms=0;
const elements={dispatchRunPrimaryDriverInput:{value:'',innerHTML:''}};
const box={state,Date,JSON,Number,String,Array,Map,Set,Math,encodeURIComponent,decodeURIComponent,
 console,$:id=>elements[id]||null,escapeHtml:s=>String(s??''),displayPersonName:s=>String(s||''),
 normalizeRecruitmentStatus:s=>s,showAlert:(s)=>alerts.push(s),canAccessModuleKey:()=>true,saveDispatchData:async()=>{saved++;return true;},confirm:()=>{confirms++;return true;},
 renderDispatch:()=>{},renderDailyDispatch:()=>{},setScreen:()=>{},uid:s=>s+'_'+Math.random(),dateAtNoon:iso=>{const d=new Date(iso+'T12:00:00');return isNaN(d)?null:d;}};
vm.createContext(box);
function load(name){
 const re=new RegExp('^  (?:async )?function '+name+'\\(','m'),start=source.search(re);assert(start>=0,name);
 const tail=source.slice(start),next=tail.slice(1).search(/\n  (?:async )?function /);
 const code=next<0?tail:tail.slice(0,next+1);vm.runInContext(code,box);
}
for(const f of ['dispatchNameKey','dispatchPersonNameKey','motiveDriverEmployeeId','motiveDriverIsActive','motiveMatchesForDriver','driverIsEligibleForWork','dispatchDriver','dispatchDriverIsActive','dispatchLocations','dispatchActiveLocation','dispatchActiveLocationId','dispatchActiveLocationName','dispatchDriverLocationId','dispatchDriverLocationName','dispatchDriversForLocation','dispatchDriverAvailable','clearInactiveLiveDispatchAssignments','dispatchLocationForDomicile','settlementDispatchDrivers','syncSharedDriverRoster','availableDispatchDrivers','dispatchExistingByFedexId','dispatchRunSort','dispatchRuns','dispatchRun','dispatchOriginAllowed','assignDispatchDriver','dispatchAssignment','dispatchDriverAssignment','dispatchPrimaryAssignments','loadSelectedDispatchPlan','populateDispatchPrimaryDriverSelect','dailyDispatchDriverOptions','dailyDispatchDefaultRows','dailyDispatchRunScheduled','dailyDispatchHub','safetyDriverPool','safetyDriverName','safetyDriverId','refreshMotiveDriverDirectory','verifyMotiveDriversForWork'])load(f);
vm.runInContext('const DISPATCH_DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];',box);
const active={id:10,employee_id:'100',name:'Alex Active',status:'active'},inactive={id:20,employee_id:'200',name:'Pat Inactive',status:'deactivated'};
state.motive.drivers=[active,inactive];
const a={id:'active',fedexId:'100',name:'Alex Active',active:true,motiveDriverId:'10',locationId:'nashville',availability:[1],origins:['*']};
const i={id:'inactive',fedexId:'200',name:'Pat Old Name',active:true,motiveStatus:'active',motiveDriverId:'20',locationId:'nashville',availability:[1],origins:['*']};
state.dispatch.drivers=[a,i];state.dispatch.runs=[{id:'run',name:'Route',type:'assigned',locationId:'nashville',days:[1],primaryDriverId:'inactive'}];
state.dispatch.assignments=[{runId:'run',day:1,driverId:'inactive'}];
state.dispatch.dailyBoards={'2026-10-05':{rows:[{routeId:'run',driverId:'inactive',dispatchStatus:'accepted'}]}};
state.dispatch.savedPlans=[{id:'plan',runs:[{id:'run',primaryDriverId:'inactive'}],assignments:[{runId:'run',driverId:'inactive',day:1}]}];
state.hr.candidates=[{name:'Pat Inactive',fedexId:'200',recruitmentStatus:'Hired'}];
state.catalog=[{result:{names:{'200':'Pat Inactive'}}}];
const history=JSON.stringify([state.dispatch.dailyBoards,state.dispatch.savedPlans]);
assert(!box.dispatchDriverIsActive(i),'Live Motive overrides stale local active=true');
assert(!box.dispatchDriverAvailable(i,1));assert.equal(box.dispatchAssignment('run',1),undefined);
assert.equal(box.dispatchDriversForLocation('nashville').length,1);
assert(!box.dailyDispatchDriverOptions().includes('Pat Old Name'));
assert.match(box.dailyDispatchDriverOptions('inactive'),/selected disabled/,'Historical selection is display-only');
box.populateDispatchPrimaryDriverSelect('nashville','inactive');assert.equal(elements.dispatchRunPrimaryDriverInput.value,'');assert(!elements.dispatchRunPrimaryDriverInput.innerHTML.includes('Pat Old Name'));
assert.equal(box.dailyDispatchDefaultRows('2026-10-05')[0].dispatchStatus,'');
assert.equal(box.dispatchPrimaryAssignments('nashville').length,0);
state.safety.scorecards=[{driver:{id:20,name:'Pat Inactive',driver_company_id:'200'}}];
assert(!box.safetyDriverPool().some(d=>d.employeeId==='200'),'Scorecards cannot reintroduce inactive drivers');
assert(!box.availableDispatchDrivers().some(d=>d.fedexId==='200'));
box.syncSharedDriverRoster();assert.equal(i.active,false);assert.equal(state.dispatch.runs[0].primaryDriverId,'');assert.equal(state.dispatch.assignments.length,0);
assert.equal(JSON.stringify([state.dispatch.dailyBoards,state.dispatch.savedPlans]),history,'History remains byte-for-byte unchanged');
// An unavailable directory must never make an old inactive flag active again.
state.motive.drivers=[];state.motive.driversLoaded=false;box.syncSharedDriverRoster();assert.equal(i.active,false);
// Unverified startup drivers are hidden, but their existing plans are not deleted while loading.
state.dispatch.assignments=[{runId:'run',day:1,driverId:'active'}];state.dispatch.runs[0].primaryDriverId='active';box.syncSharedDriverRoster();assert.equal(state.dispatch.assignments.length,1);assert.equal(state.dispatch.runs[0].primaryDriverId,'active');
// Identity matching: do not substitute somebody with the same name but another employee ID.
state.motive.drivers=[active,{id:30,employee_id:'300',name:'Pat Inactive',status:'active'},inactive];state.motive.driversLoaded=true;
assert(!box.driverIsEligibleForWork({fedexId:'200',name:'Pat Inactive'}));
assert(!box.driverIsEligibleForWork({fedexId:'999',name:'Alex Active'}));assert(!box.driverIsEligibleForWork({fedexId:'200',motiveDriverId:'10',name:'Alex Active'}),'Conflicting stable identity IDs cannot bypass the inactive status');
assert(!box.driverIsEligibleForWork({name:'Pat Inactive'}),'Ambiguous full-name match is unavailable');
assert(!box.motiveDriverIsActive({status:''}));assert(!box.motiveDriverIsActive({status:'pending'}));
assert(box.motiveDriverIsActive({status:' ACTIVE '}));
assert(!box.driverIsEligibleForWork({id:'fresh',name:'New Hire'}),'Not in complete Motive directory');
// Reactivation requires a positive Motive status and does not restore old assignments.
inactive.status='active';box.syncSharedDriverRoster();assert.equal(i.active,true);inactive.status='deactivated';box.syncSharedDriverRoster();assert.equal(i.active,false);
box.localApi=async()=>({ok:true,drivers:[active,inactive]});
(async()=>{
 await box.assignDispatchDriver('inactive','run',1);assert(alerts.at(-1).includes('inactive'));assert.equal(confirms,0,'Schedule overrides cannot bypass inactivity');assert(!state.dispatch.assignments.some(x=>x.driverId==='inactive'));
 await box.assignDispatchDriver('active','run',1);assert(state.dispatch.assignments.some(x=>x.driverId==='active'));
 box.dispatchSelectedPlan=()=>({...state.dispatch.savedPlans[0],locationId:'nashville',name:'Historical Plan'});box.dispatchClone=x=>JSON.parse(JSON.stringify(x));box.dispatchTractors=()=>[];await box.loadSelectedDispatchPlan();assert.equal(state.dispatch.runs[0].primaryDriverId,'');assert.equal(state.dispatch.assignments.length,0,'Loading saved plans cannot restore inactive coverage');
 const retained=JSON.stringify(state.motive.drivers);box.localApi=async()=>{throw Error('Directory denied');};assert.equal(await box.verifyMotiveDriversForWork(),false);assert.equal(JSON.stringify(state.motive.drivers),retained);
 box.localApi=async()=>({ok:true,drivers:null});assert.equal(await box.refreshMotiveDriverDirectory(),false);assert.equal(JSON.stringify(state.motive.drivers),retained);
 assert.equal(JSON.stringify([state.dispatch.dailyBoards,state.dispatch.savedPlans]),history);
 console.log('PASS status authority, renamed IDs, stale Hired/settlements, selectors, inactive defaults/coverage, history preservation, startup/failure, ambiguity, reactivation, assignment overrides');
})().catch(error=>{console.error(error);process.exitCode=1;});
