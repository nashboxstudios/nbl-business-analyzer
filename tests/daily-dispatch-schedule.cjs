const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../app.js'),'utf8');
const state={dispatch:{runs:[],dailyBoards:{}},dailyDispatchHubOpen:{},cloud:{structured:{dailyDispatch:true},organization:{id:'test-org'}}};
const sandbox={state,Date,JSON,Number,String,Array,Map,Set,encodeURIComponent,decodeURIComponent,
  dateAtNoon:iso=>{const date=new Date(`${iso}T12:00:00`);return isNaN(date)?null:date;},
  dispatchDriver:id=>({id,active:!!id}),dispatchDriverIsActive:d=>!!d?.active,verifyMotiveDriversForWork:async()=>true,
  dispatchLocations:()=>[{id:'marietta',name:'Marietta'}]};
vm.createContext(sandbox);
vm.runInContext(source.slice(source.indexOf("  const DAILY_DISPATCH_HUBS="),source.indexOf('  function exportDispatchExcel()')),sandbox);
const routes=[
 {id:'norcross',name:'Norcross - Chat',locationId:'marietta',type:'assigned',days:[1,2,3,4],primaryDriverId:'primary'},
 {id:'weekday',type:'assigned',days:[1,2,3,4,5],primaryDriverId:'weekday-driver'},
 {id:'weekend',type:'assigned',days:['5','6','0'],primaryDriverId:'weekend-driver'},
 {id:'daily',type:'assigned',days:[0,1,2,3,4,5,6],primaryDriverId:'daily-driver'},
 {id:'empty',type:'assigned',days:[],primaryDriverId:'empty-driver'},
 {id:'missing',type:'assigned',primaryDriverId:'missing-driver'},
 {id:'urr',type:'unassigned',days:[0,1,2,3,4,5,6],primaryDriverId:'ignore'},
 {id:'spot',type:'spot',days:[0,1,2,3,4,5,6],primaryDriverId:'ignore'}
];
state.dispatch.runs=routes;
// Exercise every selected weekday under multiple deployment/client time zones.
for(const zone of ['UTC','America/Chicago','America/Los_Angeles','Asia/Kolkata']){
 process.env.TZ=zone;
 for(let day=0;day<7;day++){
  const date=`2026-10-${String(4+day).padStart(2,'0')}`,rows=sandbox.dailyDispatchRows(date);
  for(const route of routes){
   const row=rows.find(r=>r.routeId===route.id),accepted=route.type==='assigned'&&(route.days||[]).map(Number).includes(day);
   assert.equal(row.dispatchStatus,accepted?'accepted':'',`${zone}: ${route.id} ${date}`);
   assert.equal(row.callStatus,accepted?'received':'not_received');
   assert.equal(row.driverId,accepted?route.primaryDriverId:'');
   assert.equal(row.notScheduled,route.type==='assigned'&&!accepted);
  }
 }
 assert(sandbox.dailyDispatchDefaultRows('not-a-date').every(r=>r.dispatchStatus===''));
 assert(sandbox.dailyDispatchDefaultRows('').every(r=>r.driverId===''));
}
// Schedule edits affect newly initialized dates. Saved dispatch history is authoritative.
const saved={routeId:'norcross',routeName:'Historical Norcross',callStatus:'received',dispatchStatus:'declined',driverId:'',refusals:[{driverId:'first',note:'Unavailable'}],declineReason:'other',declineOther:'Recorded reason'};
state.dispatch.dailyBoards['2026-10-09']={date:'2026-10-09',rows:[saved],savedAt:'2026-10-09T12:00:00Z'};
const before=JSON.stringify(state.dispatch.dailyBoards);
let reopened=sandbox.dailyDispatchRows('2026-10-09')[0];
assert.equal(reopened.dispatchStatus,'declined');assert.equal(reopened.declineOther,'Recorded reason');assert.equal(reopened.refusals[0].note,'Unavailable');
saved.dispatchStatus='accepted';saved.driverId='replacement';
reopened=sandbox.dailyDispatchRows('2026-10-09')[0];
assert.equal(reopened.dispatchStatus,'accepted');assert.equal(reopened.driverId,'replacement');
saved.dispatchStatus='declined';saved.driverId='';assert.equal(JSON.stringify(state.dispatch.dailyBoards),before);
routes[0].days=[5];assert.equal(sandbox.dailyDispatchRows('2026-10-16')[0].dispatchStatus,'accepted');
routes[0].days=[1,2,3,4];delete state.dispatch.dailyBoards['2026-10-09'];

// Use lightweight DOM controls to exercise the real board control and save handlers.
const classes=()=>({values:new Set(),toggle(name,on){if(on)this.values.add(name);else this.values.delete(name);}});
const element=value=>({value,classList:classes(),textContent:'',querySelector(){return null;}});
function tableRow(row){
 const controls={
  '[data-daily-call]':element(row.callStatus),
  '[data-daily-status]':element(row.dispatchStatus),
  '[data-daily-driver]':element(row.driverId),
  '[data-daily-add-refusal]':element(''),
  '[data-daily-decline-details]':element(''),
  '[data-daily-decline-reason]':element(row.declineReason),
  '[data-daily-not-scheduled-label]':element(''),
  '[data-daily-refusals]':{dataset:{dailyRefusals:encodeURIComponent(JSON.stringify(row.refusals))}},
  '[data-daily-refusal-chips]':element('')
 };
 const blank=element('');controls['[data-daily-status]'].querySelector=()=>blank;
 return {controls,blank,classList:classes(),dataset:{routeId:row.routeId,routeName:row.routeName,routeHub:row.hub,routeOrigin:row.origin,dailyNotScheduled:String(row.notScheduled)},querySelector:selector=>controls[selector]||null,querySelectorAll:()=>[]};
}
const off=tableRow(sandbox.dailyDispatchRows('2026-10-09')[0]),on=tableRow(sandbox.dailyDispatchRows('2026-10-05')[0]);
let domRows=[off,on];const cards=element(''),counter=element(''),dateInput=element('2026-10-09');
sandbox.$=id=>({dailyDispatchCards:cards,dailyDispatchDeclineCount:counter,dailyDispatchDateInput:dateInput}[id]||null);
sandbox.document={querySelectorAll:selector=>selector.includes('tr[data-daily-route-row]')?domRows:[]};
sandbox.fmtNum=String;
sandbox.dailyRefusalChips=()=>'';
sandbox.updateDailyDispatchBoardControls();
assert.equal(off.blank.textContent,'Not Scheduled');assert(off.classList.values.has('daily-not-scheduled'));
assert(off.controls['[data-daily-status]'].disabled);assert(off.controls['[data-daily-driver]'].disabled);
assert.equal(on.controls['[data-daily-status]'].value,'accepted');assert(!on.controls['[data-daily-driver]'].disabled);
assert.match(cards.innerHTML,/Accepted<\/span><strong>1<\/strong>/);assert.equal(counter.textContent,'0');
// An actual exceptional call can be recorded without auto-accepting it.
off.controls['[data-daily-call]'].value='received';sandbox.updateDailyDispatchBoardControls();
assert.equal(off.controls['[data-daily-status]'].value,'');assert.equal(off.blank.textContent,'—');
assert(!off.classList.values.has('daily-not-scheduled'));assert(!off.controls['[data-daily-status]'].disabled);
off.controls['[data-daily-call]'].value='not_received';sandbox.updateDailyDispatchBoardControls();

// The off-day blank outcome survives saving; an on-day decline is not reset.
let persisted=null;const alerts=[];
sandbox.window={NBLCloud:{saveDailyDispatchBoard:async(org,board)=>{assert.equal(org,'test-org');persisted=board;}}};
sandbox.cloudConnected=()=>true;sandbox.saveDispatchData=async()=>true;
sandbox.dispatchDriver=id=>({name:id});sandbox.dispatchTractor=()=>null;
sandbox.showAlert=(message,type)=>alerts.push({message,type});sandbox.fmtDate=String;sandbox.setScreen=()=>{};sandbox.renderDailyDispatch=()=>{};
domRows=[off];
(async()=>{
 await sandbox.saveDailyDispatchBoard();assert(persisted);assert.equal(persisted.rows[0].dispatchStatus,'');assert.equal(persisted.rows[0].driverId,'');assert.equal(persisted.rows[0].callStatus,'not_received');
 assert.equal(sandbox.dailyDispatchRows('2026-10-09')[0].dispatchStatus,'');
 console.log('PASS all weekdays in 4 time zones; per-run schedules; empty/missing schedules; URR/spot defaults; saved history; off-day label/controls/counters; exceptional calls; save/reopen');
})().catch(error=>{console.error(error);process.exitCode=1;});
