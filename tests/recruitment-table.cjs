const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),{JSDOM}=require('jsdom');
const E=require('../recruitment-test.js'),root=path.resolve(__dirname,'..');
const candidate=(id,name,location,stage,date,dueDate,assignedTo,nextAction)=>E.normalize({id:'test_'+id,name,location,createdAt:'2000-01-01',recruitmentStatus:'In Progress',testPipeline:{stage,stageReviewed:true,screening:{date},dueDate,assignedTo,nextAction}});
const fixtures=[candidate('z','Zoe','Nashville','Road Test','2026-09-24','2026-10-20','Zed','Road test'),candidate('a','Alex','Atlanta','Screening','2026-10-02','2026-10-10','Amy','Application'),candidate('m','Maya','Marietta','Ops Interview','','','','')];
assert.equal(E.daysInProcess(fixtures[0],'2026-10-04'),10);assert.equal(E.daysInProcess(fixtures[1],'2026-10-04'),2);assert.equal(E.daysInProcess(fixtures[2],'2026-10-04'),null);
assert.equal(E.daysInProcess(candidate('dst','DST','','Screening','2026-03-07'),'2026-03-09'),2);
assert.equal(E.daysInProcess(candidate('same','Same','','Screening','2026-10-04'),'2026-10-04'),0);
assert.equal(E.daysInProcess(candidate('future','Future','','Screening','2026-10-10'),'2026-10-04'),0);
assert.equal(E.daysInProcess(candidate('invalid','Invalid','','Screening','2026-02-30'),'2026-10-04'),null);
const asc=['test_a','test_z','test_m'],desc=['test_z','test_a','test_m'];
for(const key of ['nextAction','dueDate','assignedTo','days']){
 assert.deepEqual(E.sortCandidates(fixtures,key,'asc','2026-10-04').map(c=>c.id),asc,key);
 assert.deepEqual(E.sortCandidates(fixtures,key,'desc','2026-10-04').map(c=>c.id),desc,key);
}
assert.deepEqual(E.sortCandidates(fixtures,'stage').map(c=>c.id),['test_a','test_m','test_z']);
assert.deepEqual(fixtures.map(c=>c.id),['test_z','test_a','test_m'],'Sorting must not mutate stored records');
const w=new JSDOM('<div id="recruitmentTestScreen"></div>',{url:'http://localhost:8130/index.html',runScripts:'outside-only'}).window,d=w.document;
w.NBLCloud={getRecruitmentTestData:async()=>({candidates:fixtures})};
w.eval(fs.readFileSync(root+'/recruitment-test.js','utf8'));
w.NBLRecruitmentTest.init({getContext:()=>({orgId:'org',connected:true,allowed:true,userName:'Test'})});
const rows=()=>[...d.querySelectorAll('[data-rt-edit]')].map(x=>x.dataset.rtEdit);
(async()=>{
 await w.NBLRecruitmentTest.open();assert.deepEqual(rows(),['test_a','test_m','test_z']);assert.equal(d.querySelectorAll('[data-rt-sort]').length,7);
 for(const [key] of E.TABLE_COLUMNS){
  d.querySelector(`[data-rt-sort="${key}"]`).click();
  // Name starts ascending, so its first click selects descending.
  const direction=key==='name'?'desc':'asc';assert.deepEqual(rows(),E.sortCandidates(fixtures,key,direction).map(c=>c.id));
  assert.equal(d.querySelector(`[data-rt-sort="${key}"]`).closest('th').getAttribute('aria-sort'),direction==='asc'?'ascending':'descending');
  d.querySelector(`[data-rt-sort="${key}"]`).click();assert.deepEqual(rows(),E.sortCandidates(fixtures,key,direction==='asc'?'desc':'asc').map(c=>c.id));
 }
 const maya=d.querySelector('[data-rt-edit="test_m"]').closest('tr');assert.equal(maya.lastElementChild.textContent,'—');
 const search=d.getElementById('rtSearch');search.value='Alex';search.dispatchEvent(new w.Event('input'));assert.deepEqual(rows(),['test_a']);assert.equal(d.querySelector('[data-rt-sort="days"]').closest('th').getAttribute('aria-sort'),'descending');
 search.value='';search.dispatchEvent(new w.Event('input'));await w.NBLRecruitmentTest.open(true);assert.deepEqual(rows(),E.sortCandidates(fixtures,'days','desc').map(c=>c.id));
 if(process.env.NBL_QA_TABLE_HTML){
  fs.writeFileSync(process.env.NBL_QA_TABLE_HTML,`<!doctype html><html><head><meta charset="utf-8"><style>${fs.readFileSync(root+'/styles.css','utf8')}\n${fs.readFileSync(root+'/recruitment-test.css','utf8')}\n@page{size:1440px 1400px;margin:24px}body{padding:24px}#recruitmentTestScreen{width:1250px}.rt-table-wrap{max-height:none}</style></head><body>${d.body.innerHTML}</body></html>`);
 }
 w.NBLRecruitmentTest.reset();await w.NBLRecruitmentTest.open();assert.deepEqual(rows(),['test_a','test_m','test_z']);
 for(const [doubles,color] of [['No','#a92323'],['Yes No Experience','#946800'],['Yes With Experience','#157344']])assert(E.summaryHtml({...fixtures[0],doubles}).includes('color:'+color));
 const report=E.summaryHtml(fixtures[0]);assert(report.includes('--purple:#5B2A86'));assert(report.includes('--orange:#F15A24'));assert(report.includes('nashbox-logistics-logo.png'));assert(report.includes('print-color-adjust:exact'));
 console.log('PASS seven-column sort toggles, missing values last, numeric/calendar day counts, workflow stage ordering, filters/refresh/reset, brand summary');w.close();
})().catch(e=>{console.error(e);w.close();process.exit(1)});
