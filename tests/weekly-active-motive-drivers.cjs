const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(process.argv[2]||require.resolve('../app.js'),'utf8');
const active={id:10,employee_id:'100',name:'Active Driver',status:'active'};
const inactive={id:20,employee_id:'200',name:'Inactive Driver',status:'deactivated'};
const a={id:'a',fedexId:'100',motiveDriverId:'10',name:active.name,active:true,motiveStatus:'active',locationId:'nashville',availability:[1]};
const i={id:'i',fedexId:'200',motiveDriverId:'20',name:inactive.name,active:true,motiveStatus:'active',locationId:'nashville',availability:[1]};
const unknown={id:'u',fedexId:'999',name:'Unverified Hire',active:true,motiveStatus:'active',locationId:'nashville'};
const state={currentScreen:'home',finance:{unlocked:true},catalog:[],hr:{candidates:[{name:inactive.name,fedexId:'200',recruitmentStatus:'Hired'},{name:unknown.name,fedexId:'999',recruitmentStatus:'Hired'}]},
 motive:{configured:false,driversLoaded:false,drivers:[],driversError:''},dispatchLoaded:true,
 dispatch:{locations:[{id:'nashville',name:'Nashville'}],activeLocationId:'nashville',drivers:[a,i,unknown],runs:[],assignments:[],dailyBoards:{old:{rows:[{driverId:'i'}]}},savedPlans:[{assignments:[{driverId:'i'}]}]}};
const elements={};
function element(){return {value:'',innerHTML:'',textContent:'',classList:{toggle(){},contains(){return true;}},querySelector(selector){return this[selector]||(this[selector]=element());},querySelectorAll(){return [];}};}
const $=id=>elements[id]||(elements[id]=element());
const zeroStats={required:0,covered:0,open:0,coverage:0,perDay:Array.from({length:7},(_,day)=>({required:0,name:String(day),openRuns:[]}))};
const box={state,console,Date,JSON,Number,String,Array,Map,Set,Math,encodeURIComponent,decodeURIComponent,$,
 document:{querySelectorAll:()=>[]},escapeHtml:s=>String(s??''),displayPersonName:String,fmtNum:String,fmtDate:String,
 normalizeRecruitmentStatus:s=>s,canAccessModuleKey:()=>true,canAccessScreen:()=>true,ensureScreenCloudData:()=>{},hasWorkspace:()=>true,workspaceLabel:()=>'',isFinanceScreen:()=>false,cloudConnected:()=>false,isOwnerAccount:()=>true,
 saveDispatchData:async()=>true,showAlert:()=>{},renderDailyDispatch:()=>{},syncDispatchTractorMetadataFromMotive:()=>{},wireDispatchDragDrop:()=>{},renderDispatchPlanControls:()=>{},
 dispatchCoverageStats:()=>zeroStats,buildOptimizedDispatchAssignments:()=>[],dispatchEconomics:()=>({runs:[],drivers:box.dispatchDriversForLocation().map(driver=>({driver,assignedDays:0})),milesComplete:true,weeklyMiles:0,lostMiles:0})};
vm.createContext(box);
function load(name){const start=source.search(new RegExp('^  (?:async )?function '+name+'\\(','m'));assert(start>=0,name);const tail=source.slice(start),next=tail.slice(1).search(/\n  (?:async )?function /);vm.runInContext(next<0?tail:tail.slice(0,next+1),box);}
for(const name of ['dispatchNameKey','dispatchPersonNameKey','motiveDriverEmployeeId','motiveDriverIsActive','motiveMatchesForDriver','driverIsEligibleForWork','dispatchDriverDirectoryMessage','dispatchDriver','dispatchDriverIsActive','dispatchLocations','dispatchActiveLocation','dispatchActiveLocationId','dispatchActiveLocationName','dispatchDriverLocationId','dispatchDriverLocationName','dispatchDriversForLocation','dispatchDriverAvailable','clearInactiveLiveDispatchAssignments','dispatchLocationForDomicile','settlementDispatchDrivers','syncSharedDriverRoster','availableDispatchDrivers','dispatchExistingByFedexId','dispatchExistingSettlementDriver','fillDispatchLocationSelect','dispatchAvailabilityLabel','renderDispatchDriverRosterModal','dispatchRunSort','dispatchRuns','dispatchTractors','dispatchTractorLocationId','dispatchTractorsForLocation','dispatchDriverCardHtml','renderDispatch','refreshMotiveDriverDirectory','verifyMotiveDriversForWork','setScreen','openDispatchDriverRosterModal'])load(name);
vm.runInContext('const DISPATCH_DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];',box);
function assertVisible(names){box.renderDispatch();box.renderDispatchDriverRosterModal();const pool=$('dispatchDriverPool').innerHTML,roster=$('dispatchCurrentRosterTable').querySelector('tbody').innerHTML,available=$('dispatchSettlementDriversTable').querySelector('tbody').innerHTML;
 for(const driver of [a,i,unknown])for(const [label,html] of [['pool',pool],['roster',roster],['available',available]])assert.equal(html.includes(driver.name),names.includes(driver.name),`${label}: ${driver.name}`);}
// Initial configured=false must not admit saved active flags or Hired candidates.
assertVisible([]);
state.motive.drivers=[active,inactive];state.motive.driversLoaded=true;state.motive.driversLastSync='2026-10-14T01:00:00Z';assertVisible([a.name]);
assert.equal(box.motiveDriverEmployeeId({company_id:'100'}),'','A Motive company ID is not an employee ID');
state.motive.driversLoaded=false;assertVisible([]);state.motive.driversLoaded=true;
state.motive.driversLoading=true;assertVisible([]);assert.match($('dispatchMotiveState').textContent,/Checking/);state.motive.driversLoading=false;
const history=JSON.stringify([state.dispatch.dailyBoards,state.dispatch.savedPlans]);
(async()=>{
 // Every planner entry refreshes, including before the connection-status request finishes.
 const refresh=box.refreshMotiveDriverDirectory;let requests=0;
 box.refreshMotiveDriverDirectory=()=>{requests++;return Promise.resolve(true);};
 box.setScreen('dispatch');assert.equal(requests,1);box.setScreen('dispatch');assert.equal(requests,1);
 box.setScreen('home');box.setScreen('dispatch');assert.equal(requests,2);
 box.openModal=()=>{};box.openDispatchDriverRosterModal();assert.equal(requests,3);box.refreshMotiveDriverDirectory=refresh;
 // A failed refresh must hide even cached active drivers and block assignments when configured=false.
 state.dispatch.assignments=[{runId:'r',day:1,driverId:'a'}];
 box.localApi=async()=>{throw Error('Directory unavailable');};assert.equal(await box.verifyMotiveDriversForWork(),false);
 state.dispatch.runs=[];assertVisible([]);box.syncSharedDriverRoster();assert.equal(state.dispatch.assignments.length,1,'Failure does not delete unverified current work');
 // Recovery displays active records; a subsequent Motive deactivation removes them immediately.
 box.localApi=async()=>({ok:true,drivers:[active,inactive]});assert.equal(await box.refreshMotiveDriverDirectory(),true);assertVisible([a.name]);
 box.localApi=async()=>({ok:true,drivers:[{...active,status:'deactivated'},inactive]});assert.equal(await box.refreshMotiveDriverDirectory(),true);assertVisible([]);assert.equal(state.dispatch.assignments.length,0);
 // Successful empty directory also hides all saved records without altering history.
 box.localApi=async()=>({ok:true,drivers:[]});assert.equal(await box.refreshMotiveDriverDirectory(),true);assertVisible([]);
 assert.equal(JSON.stringify([state.dispatch.dailyBoards,state.dispatch.savedPlans]),history);
 console.log('PASS weekly pool and roster active-only; startup/loading/failure closed; navigation refresh; disconnected save blocked; recovery/deactivation; history preserved');
})().catch(err=>{console.error(err);process.exitCode=1;});
