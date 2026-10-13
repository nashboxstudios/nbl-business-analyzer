const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../app.js'),'utf8');
const state={safety:{startDate:'2026-10-01',endDate:'2026-10-13',scorecards:[],performanceEvents:[],speedingEvents:[],assignments:{},dismissals:{},driverRecords:{}}};
const box={state,console,Date,Math,Map,Set,Number,String,Array,fmtNum:n=>String(n),escapeHtml:s=>String(s??''),displayPersonName:s=>String(s||'')};
vm.createContext(box);
function load(name){
  const start=source.search(new RegExp('^  (?:async )?function '+name+'\\(','m'));assert(start>=0,name);
  const tail=source.slice(start),next=tail.slice(1).search(/\n  (?:async )?function /);
  vm.runInContext(next<0?tail:tail.slice(0,next+1),box);
}
for(const name of ['isoLocal','safetyDriverName','safetyDriverId','safetyEventId','safetyEventDriver','safetyEventType','safetyEventTime','safetyEventVehicle','safetyEventMediaUrl','safetyAllEvents','safetyNormalizedType','safetyBehaviorWeight','safetyMotiveDismissed','safetyDismissal','safetyScoreBand','safetyScorecardMiles','safetyAdjustedScore','safetyIncidentRecord','safetyRecordForDriver','recordCurrentSafetySnapshots','safetyDriverSnapshots','safetyDismissalHtml','safetyTopIncidents','safetySeverityRank','safetyCanonicalType','safetyReportIncidentRows'])load(name);

const notDismissed=['invalid','false_positive','false positive','valid','coachable','coached','pending_review','reviewed','undismissed','not_dismissed','dismiss',''];
for(const status of notDismissed)assert.equal(box.safetyMotiveDismissed({status}),false,status);
assert.equal(box.safetyMotiveDismissed({status:' DIsMissEd '}),true);
assert.equal(box.safetyMotiveDismissed({coaching_status:'dismissed',status:'invalid'}),true);
assert.equal(box.safetyMotiveDismissed({coaching_status:'coachable',status:'dismissed'}),false);
assert.equal(box.safetyMotiveDismissed({coaching_status:'coached',status:'invalid'}),false);
assert.equal(box.safetyMotiveDismissed({coaching_status:'',status:'dismissed'}),true);
assert.equal(box.safetyMotiveDismissed({metadata:{coaching_status:' dismissed '},status:'valid'}),true);
assert.equal(box.safetyMotiveDismissed({coaching_status:'pending_review',metadata:{coaching_status:'dismissed'},dismissed:true,is_dismissed:true}),false);
assert.equal(box.safetyMotiveDismissed({dismissed:true,is_dismissed:true}),false);
assert.equal(box.safetyMotiveDismissed(null),false);
assert.equal(box.safetyMotiveDismissed({status:{value:'dismissed'}}),false);

const event=(id,status,coaching_status,driver={id:42,name:'Synthetic Driver'})=>({id,status,coaching_status,driver,start_time:'2026-10-07T12:00:00Z',metadata:{severity:'high'},max_over_speed_in_kph:16,duration:60});
state.safety.speedingEvents=[event(1,'invalid','coachable'),event(2,'valid','coached'),event(3,'invalid','dismissed'),event(4,'false_positive','pending_review'),{...event(6,'invalid','pending_review'),dismissed:true,is_dismissed:true}];
state.safety.performanceEvents=[{...event(5,'invalid','coachable',null),type:'distraction'}];
state.safety.assignments={'performance:5':{id:'42',name:'Synthetic Driver'}};
state.safety.dismissals={'speeding:1':{dismissed:true},'performance:5':{dismissed:true}};
state.safety.scorecards=[{driver:{id:42,name:'Synthetic Driver'},score:100,total_kilometers:1609.344}];
const all=box.safetyAllEvents(),active=all.filter(item=>!box.safetyDismissal(item).dismissed);
assert.equal(active.length,5);
assert.equal(active.filter(item=>item.source==='speeding').length,4);
assert.equal(box.safetyDismissal(all.find(item=>item.event.id===1)).dismissed,false,'legacy local override ignored');
assert.equal(box.safetyDismissal(all.find(item=>item.event.id===5)).dismissed,false,'assigned event retains active status');
assert.match(box.safetyDismissalHtml(all.find(item=>item.event.id===1)),/Not dismissed/);
assert.match(box.safetyDismissalHtml(all.find(item=>item.event.id===3)),/Dismissed in Motive/);
assert.ok(!source.includes('data-safety-dismiss')&&!source.includes('toggleSafetyDismissal'),'local dismissal controls removed');
const top=JSON.parse(JSON.stringify(box.safetyTopIncidents('42',all)));
assert.deepEqual(top,[{type:'speeding',count:4},{type:'distraction',count:1}]);
const adjusted=box.safetyAdjustedScore(state.safety.scorecards[0],all);
assert.equal(adjusted.count,1);assert.ok(adjusted.score<100,'active assigned event changes adjusted score');
box.recordCurrentSafetySnapshots();
const snapshot=state.safety.driverRecords['42'].snapshots[0];
assert.equal(snapshot.activeIncidentCount,5);assert.equal(snapshot.dismissedIncidentCount,1);assert.equal(snapshot.incidentCounts.speeding,4);
const report=box.safetyReportIncidentRows('42');
assert.equal(report.length,5);assert.equal(report.filter(r=>r.type==='speeding').length,4);
assert.ok(report.some(r=>r.key==='speeding:1'),'invalid coachable speeding is included in PDF');
assert.ok(!report.some(r=>r.key==='speeding:3'),'explicit Motive dismissal is excluded from PDF');
// A restore/reclassification in Motive replaces the current period's saved snapshot.
state.safety.speedingEvents[2].coaching_status='coachable';box.recordCurrentSafetySnapshots();
assert.equal(state.safety.driverRecords['42'].snapshots.length,1);
assert.equal(state.safety.driverRecords['42'].snapshots[0].incidentCounts.speeding,5);
console.log('Safety dismissal checks passed: exact Motive status, coaching precedence, legacy overrides, active counts, Top 3 Incidents, score adjustments, snapshot refresh and PDF inclusion.');

