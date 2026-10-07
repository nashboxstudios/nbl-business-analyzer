/* Recruitment Test owns its records and never calls production recruitment saves. */
(function(root){
'use strict';
const STAGES=['Screening','Background & Drug Screen','Ops Interview','Road Test','Offer & Onboarding','Training','Regular Employee'];
const clone=x=>JSON.parse(JSON.stringify(x));
const OPS_FIELDS=['agreedDays','dispatchAgreement','doublesAgreement'];
const scheduleKey=c=>JSON.stringify(OPS_FIELDS.map(k=>c.testPipeline?.ops?.[k]||''));
const legacyScheduleKey=c=>JSON.stringify(['agreedDays','shiftStart','shiftEnd','dispatchTime','doublesRequired'].map(k=>c.testPipeline?.ops?.[k]||''));
const SCREENING_QUESTIONS={
 experience:'FedEx requires 1 year of tractor-trailer experience in the last 3 years, or 5 in the last 10. Can you tell me more about your work experience?',
 availability:'Do you prefer a day or night shift? And what days are your available?',
 payExpectation:'What are your expectations in terms of pay?',
 peak:'During the peak season, generally from mid-Nov to early January, will you be available to work upto 6 days/week?',
 doublesNotes:'Do you have experience pulling doubles? If yes, how much experience, and when was the last time you regularly drove doubles?',
 doublesTrainingWilling:'If No, Are you willing to get a doubles endorsement and be trained to pull doubles?',
 shifts:'Following are the possible shifts (Mention The Shifts). However, your shift will be determined by the operations manager and it will be communicated during the interview with them. Are you ok with this?',
 safety:'Do you have any records on your CDL, such as at fault accidents, failed or refused drug screening, license suspensions etc.?',
 criminal:'Have you ever been convicted of, pled guilty or no contest to a felony or misdemeanor?',
 consent:'Are you willing to undergo a background check and DOT drug screen?',
 documents:'Do you have valid CDL and Medical card?'
};
const APPLICATION_PROCESS='We will send you an email with the background check application.\nIn the application you have to enter your information. It also asks about your work experience. Put in only your tractor trailer work ex, along with a relevant contact who can verify it. Example: your dispatch manager, HR manager etc.\nAfter you complete the application, you’ll get another email for your drug screen. The link is valid for 5 days, after which it expires and you’ll have to do the paperwork again. So please get it done within 5 days.';
const escapeHtml=x=>String(x??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
const opsComplete=c=>OPS_FIELDS.every(k=>String(c.testPipeline?.ops?.[k]||'').trim());
function recordOpsAgreements(c,by){
 const o=c.testPipeline.ops;
 if(!opsComplete(c)){delete o.confirmedSchedule;return c;}
 if(o.confirmedSchedule!==scheduleKey(c)){o.confirmedSchedule=scheduleKey(c);o.confirmedAt=new Date().toISOString();o.confirmedBy=by;}
 return c;
}
function normalize(c){
 c=clone(c);const p=c.testPipeline=c.testPipeline||{};
 p.stage=STAGES.includes(p.stage)?p.stage:'Screening';p.history=p.history||[];
 for(const k of ['screening','background','ops','training','onboarding'])p[k]=p[k]||{};
 c.roadTestForm=c.roadTestForm||{};c.hiringSummary=c.hiringSummary||{};c.documents=c.documents||{};
 if(c.location===undefined)c.location=c.domicile||'';
 if(c.medicalCardExpiry===undefined)c.medicalCardExpiry=c.medCardExpiry||'';
 if(c.hiringSummary.proposedPay===undefined)c.hiringSummary.proposedPay=c.hiringSummary.payRate==null?'':String(c.hiringSummary.payRate)+(c.hiringSummary.payBasis?' / '+c.hiringSummary.payBasis:'');
 for(const [key,legacy] of [['adp','adp'],['sf','safetyForward'],['motive','motiveOnboarding'],['handbook','employeeHandbook'],['connectTeams','connectTeams'],['eVerify','eVerify']])if(p.onboarding[key]===undefined)p.onboarding[key]=c[legacy]||'';
 if(!['No','Yes No Experience','Yes With Experience',''].includes(c.doubles||'')){c.legacyDoubles=c.doubles;c.doubles='';}

 const o=p.ops,legacyConfirmed=o.confirmedSchedule===legacyScheduleKey(c);
 const migrating=o.dispatchAgreement===undefined||o.doublesAgreement===undefined;
 if(o.dispatchAgreement===undefined)o.dispatchAgreement=legacyConfirmed&&o.scheduleAccepted==='Yes'?`Shift ${o.shiftStart||'—'} to ${o.shiftEnd||'—'}; approximate dispatch ${o.dispatchTime||'—'}. Explained and agreed upon.`:'';
 if(o.doublesAgreement===undefined)o.doublesAgreement=legacyConfirmed&&o.doublesAccepted==='Yes'?(o.doublesRequired==='Not required'?'Doubles are not required for this assignment. Explained and agreed upon.':`${o.doublesRequired||'Doubles may be required'}, including assembly of two trailers and a dolly. Explained and agreed upon.`):'';
 if(migrating&&legacyConfirmed&&opsComplete(c))o.confirmedSchedule=scheduleKey(c);
 if(p.background.fadvStatus===undefined)p.background.fadvStatus=c.fadvStatus||'';
 if(p.background.drugStatus===undefined)p.background.drugStatus=c.drugTest||c.drugScreen||'';
 return c;
}
function reconcile(previous,c){
 if(previous&&scheduleKey(previous)!==scheduleKey(c))delete c.testPipeline.ops.confirmedSchedule;
 return c;
}
function validate(c){
 const p=c.testPipeline,s=p.screening,o=p.ops,b=p.background,r=c.roadTestForm,errors=[];
 const need=(value,label)=>{if(!String(value||'').trim())errors.push(label);};
 if(STAGES.indexOf(p.stage)>STAGES.indexOf('Ops Interview')&&p.stage!=='Regular Employee'&&(!opsComplete(c)||o.confirmedSchedule!==scheduleKey(c)))errors.push('Confirm the current Ops schedule and doubles requirement');
 if(p.onHold)errors.push('Resume this candidate from Hold');
 if(c.recruitmentStatus==='Rejected'||c.recruitmentStatus==='Terminated')errors.push('Candidate must be In Progress');
 if(!p.stageReviewed)errors.push('Review and confirm the suggested current stage');
 if(p.stage==='Screening'){
  for(const [k,l] of [['interviewer','Screening interviewer'],['date','Screening date'],['experience','Tractor-trailer experience'],['availability','Shift and day availability'],['payExpectation','Expected pay'],['peak','Peak availability'],['doublesNotes','Doubles experience and last regularly driven'],['doublesTrainingWilling','Doubles endorsement and training willingness'],['possibleShifts','Possible shifts discussed'],['shiftAvailabilityAccepted','Possible shift acceptance'],['safety','Safety record answer'],['criminal','Felony / misdemeanor answer'],['consent','Background and drug-screen consent answer'],['documents','Valid CDL and medical card answer']])need(s[k],l);
  if(s.decision!=='Proceed')errors.push('Screening decision: Proceed');
  if(!s.processExplained)errors.push('Confirm application process explained');
  if(!s.shiftsExplained)errors.push('Confirm available shifts explained');
 }else if(p.stage==='Background & Drug Screen'){
  need(b.applicationSent,'Application sent date');need(b.drugStatus,'Drug screen status');
  if(!b.readyForOps)errors.push('Manager confirmation: ready for Ops');
 }else if(p.stage==='Ops Interview'){
  need(o.date,'Ops interview date');
  for(const [k,l] of [['agreedDays','Work days agreed upon'],['dispatchAgreement','Dispatch schedule times explained and agreed upon'],['doublesAgreement','Doubles requirement explained and agreed upon']])need(o[k],l);
  if(o.confirmedSchedule!==scheduleKey(c))errors.push('Save the recorded Ops agreements');
 }else if(p.stage==='Road Test'){
  if(c.roadTest!=='Pass')errors.push('Road test: Pass');need(r.date,'Road test date');need(r.testAdminName,'Road test administrator');need(r.timeFrom,'Road test time from');need(r.timeTo,'Road test time to');
 }else if(p.stage==='Offer & Onboarding'){
  if(c.offerLetter!=='Accepted')errors.push('Offer: Accepted');need(c.startDate,'Start date');
  for(const k of ['adp','sf','motive'])if(p.onboarding[k]!=='Sent'&&p.onboarding[k]!=='Complete')errors.push(`${k.toUpperCase()} access sent`);
 }else if(p.stage==='Training'){
  need(p.training.completedDate,'Training completion date');need(p.training.trainer,'Trainer');
  if(p.training.result!=='Complete')errors.push('Training result: Complete');
  if(b.fadvStatus!=='Complete')errors.push('FADV: Complete');if(b.drugStatus!=='Pass')errors.push('Drug screen: Pass');
 }else errors.push('Already a regular employee');
 return errors;
}
const TABLE_COLUMNS=[['name','Name'],['location','Location'],['stage','Current Stage'],['nextAction','Next Action'],['dueDate','Due Date'],['assignedTo','Assigned To'],['days','Days in Process']];
// Calendar days avoid off-by-one results from midnight, time zones, or DST.
function calendarDay(value){
 const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||''));if(!m)return null;
 const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));
 return d.getUTCFullYear()===+m[1]&&d.getUTCMonth()===+m[2]-1&&d.getUTCDate()===+m[3]?d.getTime()/86400000:null;
}
function daysInProcess(c,today){
 const now=new Date();today=today||`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
 const start=calendarDay(c.testPipeline?.screening?.date),end=calendarDay(today);
 return start===null||end===null?null:Math.max(0,end-start);
}
function sortCandidates(candidates,key='name',direction='asc',today){
 const collator=new Intl.Collator('en-US',{numeric:true,sensitivity:'base'});
 const v=c=>key==='days'?daysInProcess(c,today):key==='stage'?STAGES.indexOf(c.testPipeline?.stage):['name','location'].includes(key)?c[key]:c.testPipeline?.[key];
 const missing=x=>x===undefined||x===null||String(x).trim()==='';
 return [...candidates].sort((a,b)=>{
  const x=v(a),y=v(b);if(missing(x)||missing(y))return missing(x)?(missing(y)?0:1):-1;
  const result=typeof x==='number'&&typeof y==='number'?x-y:collator.compare(String(x),String(y));
  return direction==='desc'?-result:result;
 });
}
function summaryHtml(candidate,logoUrl='assets/nashbox-logistics-logo.png',format='letter'){
 const phone=format==='phone';
 const c=normalize(candidate),p=c.testPipeline,s=p.screening,b=p.background,e=escapeHtml;
 const shown=v=>v===undefined||v===null||String(v).trim()===''?'Not recorded':String(v);
 const date=v=>{if(!v)return 'Not recorded';const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v);return m?`${m[2]}/${m[3]}/${m[1]}`:v;};
 const value=v=>e(shown(v));
 const fact=(label,v)=>`<div class="fact"><dt>${e(label)}</dt><dd>${value(v)}</dd></div>`;
 const facts=rows=>`<dl class="facts">${rows.map(x=>fact(...x)).join('')}</dl>`;
 const question=(title,prompt,answer,details)=>`<article class="question"><h3>${e(title)}</h3>${prompt?`<p class="prompt">${e(prompt)}</p>`:''}<p class="answer">${value(answer)}</p>${details?`<p class="detail">${e(details)}</p>`:''}</article>`;
 const yesNo=v=>v?'Yes':'Not recorded';
 const doublesColor=c.doubles==='No'?'#a92323':c.doubles==='Yes With Experience'?'#157344':'#946800';
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ops Manager Hiring Summary - ${e(c.name)}</title><style>
 *{box-sizing:border-box}:root{--purple:#5B2A86;--purple-dark:#35164E;--orange:#F15A24;--text:#30283A;--muted:#756C7D;--line:#E7E0EA}body{margin:0;background:#F8F6FA;color:var(--text);font:14px/1.5 Arial,sans-serif}
 .toolbar{max-width:900px;margin:22px auto 12px;display:flex;align-items:center;gap:14px;padding:0 12px}.toolbar button{padding:11px 18px;border:0;border-radius:8px;background:var(--orange);color:#fff;font:inherit;font-weight:bold;cursor:pointer}.toolbar span{font-size:12px;color:var(--muted)}
 .report{max-width:900px;margin:0 auto 30px;padding:36px 42px;background:#fff;box-shadow:0 6px 24px #35164E14}.report-header{display:flex;gap:22px;align-items:center;border-bottom:2px solid var(--purple-dark);padding-bottom:18px;margin-bottom:22px}.report-header img{width:76px;height:76px;object-fit:contain;flex-shrink:0}.header-copy{min-width:0}.brand{font-size:12px;letter-spacing:.1em;font-weight:bold;color:var(--purple)}.report-label{font-size:11px;color:var(--muted);margin:5px 0 10px}h1{font-size:27px;line-height:1.2;margin:0 0 8px;color:var(--purple-dark);overflow-wrap:anywhere}.subtitle{color:var(--muted);margin:0}
 .report-section{margin-top:25px}h2{font-size:18px;color:var(--purple-dark);background:#EEE8F2;border-left:4px solid var(--orange);margin:0 0 14px;padding:9px 12px;break-after:avoid;print-color-adjust:exact;-webkit-print-color-adjust:exact}.facts{display:grid;grid-template-columns:1fr 1fr;gap:10px 18px;margin:0}.fact{min-width:0;break-inside:avoid;background:#F8F6FA;padding:10px 12px;border-radius:4px;print-color-adjust:exact;-webkit-print-color-adjust:exact}dt{font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:.03em;color:var(--muted)}dd{margin:3px 0 0;font-size:14px;white-space:pre-wrap;overflow-wrap:anywhere}
 .question{border-bottom:1px solid var(--line);padding:0 0 14px;margin:0 0 16px;break-inside:avoid}.question h3{font-size:14px;margin:0 0 5px;color:var(--purple-dark);break-after:avoid}.prompt{font-size:12px;color:var(--muted);margin:0 0 7px;break-after:avoid}.answer{margin:0;font-size:14px;white-space:pre-wrap;overflow-wrap:anywhere}.detail{margin:8px 0 0;font-size:13px;white-space:pre-wrap;overflow-wrap:anywhere}.status{font-weight:bold;color:${doublesColor}}.instructions{font-size:12px;line-height:1.5;white-space:pre-line;color:var(--muted)}.interview-meta{margin-bottom:18px}.footnote{font-size:11px;color:var(--muted);border-top:1px solid var(--line);padding-top:14px;margin-top:24px}
 @media(max-width:600px){body{font-size:16px}.answer,dd{font-size:16px}.prompt{font-size:14px}.report{padding:24px 18px}.report-header{gap:12px}.report-header img{width:48px;height:48px}.facts{grid-template-columns:1fr}h1{font-size:24px}.toolbar{flex-wrap:wrap}}
 @media print{@page{size:letter;margin:16mm}body{background:#fff;font-size:11pt}.toolbar{display:none}.report{max-width:none;box-shadow:none;padding:0;margin:0}.report-header{break-inside:avoid}.facts{grid-template-columns:1fr 1fr}h1{font-size:23pt}h2{font-size:14pt}.question h3{font-size:11pt}.answer,dd{font-size:11pt}.prompt{font-size:9pt}.report-section{margin-top:18px}h1,h2,h3{break-after:avoid}.fact{break-inside:avoid;padding:8px 10px}.facts{gap:8px 16px}.question{padding-bottom:10px;margin-bottom:10px}.interview-meta{margin-bottom:14px}.instructions{font-size:9pt}.footnote{margin-top:16px;padding-top:10px}}

 .phone-report .report{max-width:408px;padding:20px 16px}.phone-report .facts{grid-template-columns:1fr}.phone-report .report-header{gap:12px}.phone-report .report-header img{width:48px;height:48px}.phone-report h1{font-size:24px}.phone-report .answer,.phone-report dd{font-size:16px}.phone-report .prompt{font-size:14px}.phone-report .toolbar{max-width:408px;flex-wrap:wrap}
 @media print{@page phone{size:108mm 192mm;margin:8mm}.phone-report{page:phone}.phone-report .report{max-width:none;padding:0}.phone-report .facts{grid-template-columns:1fr;gap:8px}.phone-report h1{font-size:20pt}.phone-report h2{font-size:15pt;padding:8px 10px}.phone-report .question h3{font-size:12pt}.phone-report .answer,.phone-report dd{font-size:12pt}.phone-report .prompt,.phone-report .detail{font-size:10.5pt}.phone-report .instructions{font-size:10pt}.phone-report .report-header{margin-bottom:16px;padding-bottom:12px}.phone-report .brand{font-size:9pt}.phone-report .subtitle{font-size:10.5pt}.phone-report dt{font-size:9pt}}
 </style></head><body${phone?' class="phone-report"':''}><div class="toolbar"><button type="button" onclick="window.print()">${phone?'Print / Save Phone PDF':'Print / Save PDF'}</button><span>${phone?'Phone format · Single column · ':''}Share this summary with the Ops Manager.</span></div><main class="report"><header class="report-header"><img src="${e(logoUrl)}" alt="Nashbox Logistics"><div class="header-copy"><div class="brand">NASHBOX LOGISTICS</div><p class="report-label">Recruitment – Test${phone?' · Prepared '+e(new Date().toLocaleDateString('en-US')):''}</p><h1>${value(c.name)}</h1><p class="subtitle">Hiring Summary for the Ops Manager · ${value(c.location)}</p></div></header>
 <section class="report-section"><h2>Candidate Details</h2>${facts([['Name',c.name],['Location',c.location],['Email',c.email],['Phone',c.phone],['Current address',c.address],['FedEx ID',c.fedexId]])}</section>
 <section class="report-section"><h2>Driver Qualifications</h2>${facts([['Date of birth',date(c.dob)],['CDL number',c.cdlNumber],['CDL state',c.cdlIssuingState],['CDL expiry',date(c.cdlExpiry)]])}</section>
 <section class="report-section"><h2>Background &amp; Drug Screen</h2>${facts([['FADV status',b.fadvStatus],['Application sent',date(b.applicationSent)],['Drug screen status',b.drugStatus],['Drug screen email sent',date(b.drugSent)],['Manager ready for Ops',yesNo(b.readyForOps)]])}${b.notes?question('Background / drug-screen notes','',b.notes):''}</section>
 <section class="report-section"><h2>Screening Interview</h2><div class="interview-meta">${facts([['Interview date',date(s.date)],['Interviewer',s.interviewer],['Screening decision',s.decision]])}</div>
 ${question('CDL & Experience',SCREENING_QUESTIONS.experience,s.experience)}
 ${question('Expectations — Work Timing',SCREENING_QUESTIONS.availability,s.availability)}
 ${question('Expectations — Pay',SCREENING_QUESTIONS.payExpectation,s.payExpectation)}
 ${question('Peak Schedule',SCREENING_QUESTIONS.peak,s.peak)}
 ${question('Doubles Experience',SCREENING_QUESTIONS.doublesNotes,s.doublesNotes)}
 <article class="question"><h3>Doubles Endorsement &amp; Experience</h3><p class="answer status">${value(c.doubles)}</p></article>
 ${question('Doubles Endorsement & Training',SCREENING_QUESTIONS.doublesTrainingWilling,s.doublesTrainingWilling)}
 ${question('Shift Availability',SCREENING_QUESTIONS.shifts,s.possibleShifts,`Candidate OK with shifts / final assignment: ${shown(s.shiftAvailabilityAccepted)}. Shifts explained: ${yesNo(s.shiftsExplained)}.`)}
 ${question('Safety Record',SCREENING_QUESTIONS.safety,s.safety,s.safetyNotes)}
 ${question('Felony or Misdemeanor',SCREENING_QUESTIONS.criminal,s.criminal,s.criminalNotes)}
 ${question('Background Check',SCREENING_QUESTIONS.consent,s.consent)}
 ${question('Valid Documents',SCREENING_QUESTIONS.documents,s.documents)}
 ${question('Application Process Explained','',yesNo(s.processExplained))}<p class="instructions">${e(APPLICATION_PROCESS)}</p>
 ${question('Screening Interview Notes','',s.notes)}</section>${phone?'':`<p class="footnote">Prepared ${e(new Date().toLocaleDateString('en-US'))} · Missing answers are shown as “Not recorded”.</p>`}</main></body></html>`;
}

const engine={STAGES,normalize,reconcile,validate,scheduleKey,recordOpsAgreements,SCREENING_QUESTIONS,APPLICATION_PROCESS,summaryHtml,TABLE_COLUMNS,daysInProcess,sortCandidates};
if(typeof module!=='undefined'&&module.exports)module.exports=engine;
if(!root.document)return;
const esc=x=>String(x??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
let bridge,records=[],workspace='',generation=0,draft=null,busy=false,loaded=false,editingGeneration=0,search='',filter='In Progress',stageFilter='',sortKey='name',sortDirection='asc';
const ctx=()=>bridge?.getContext()||{};
const get=(o,path)=>path.split('.').reduce((v,k)=>v?.[k],o);
function put(o,path,v){const keys=path.split('.');let x=o;keys.slice(0,-1).forEach(k=>x=x[k]||(x[k]={}));x[keys.at(-1)]=v;}
const el=id=>document.getElementById(id);
function field(path,label,type='text',options){
 const val=get(draft,path)??'',id='rt_'+path.replaceAll('.','_');
 let input=options?`<select id="${id}" data-rt-field="${path}"><option value="">Choose…</option>${[...new Set([...options,...(val&&!options.includes(val)?[val]:[])])].map(x=>`<option${x===val?' selected':''}>${esc(x)}</option>`).join('')}</select>`:type==='textarea'?`<textarea id="${id}" rows="3" data-rt-field="${path}">${esc(val)}</textarea>`:type==='checkbox'?`<input id="${id}" type="checkbox" data-rt-field="${path}"${val?' checked':''}>`:`<input id="${id}" type="${type}" data-rt-field="${path}" value="${esc(val)}">`;
 return `<label class="rt-field ${type==='textarea'?'rt-wide':''} ${type==='checkbox'?'rt-check':''}" for="${id}"><span>${esc(label)}</span>${input}</label>`;
}
const f=(k,l,t='text',opts)=>field(k,l,t,opts);
const pf=(section,k,l,t='text',opts)=>f(`testPipeline.${section}.${k}`,l,t,opts);
const yes=['Yes','No'];const decisions=['Proceed','Hold','Do Not Proceed'];
const section=(title,html,open=false)=>`<details class="rt-section"${open?' open':''}><summary>${esc(title)}</summary><div class="rt-grid">${html}</div></details>`;
function message(msg,error=false){const x=el('rtMessage');if(x){x.textContent=msg;x.classList.toggle('rt-error',error);x.setAttribute('role',error?'alert':'status');}}
function checkContext(org,gen){if(ctx().orgId!==org||generation!==gen||!ctx().connected||!ctx().allowed)throw new Error('Your workspace changed. Reopen Recruitment – Test.');}
async function open(force=false){
 const c=ctx(),host=el('recruitmentTestScreen');if(!host)return;
 if(!c.connected||!c.allowed||!c.orgId){reset();host.innerHTML='<div class="card"><h2>Recruitment – Test</h2><p>Sign in to NBL Cloud with Recruitment access to use this module.</p></div>';return;}
 if(workspace!==c.orgId){reset();workspace=c.orgId;}
 if(loaded&&!force){render();return;}
 const org=workspace,gen=generation;host.innerHTML='<div class="card">Loading test candidates…</div>';
 try{const data=await root.NBLCloud.getRecruitmentTestData(org);checkContext(org,gen);records=data.candidates.map(normalize);loaded=true;render();}
 catch(e){if(generation!==gen)return;host.innerHTML=`<div class="card"><h2>Recruitment – Test</h2><p class="rt-error">${esc(e.message)}</p><button class="button" id="rtRetry">Retry</button></div>`;el('rtRetry').onclick=()=>open(true);}
}
function render(){
 const host=el('recruitmentTestScreen');if(!host)return;
 const matches=sortCandidates(records.filter(c=>(!filter||c.recruitmentStatus===filter||filter==='In Progress'&&!['Hired','Rejected','Terminated'].includes(c.recruitmentStatus))&&(!stageFilter||c.testPipeline.stage===stageFilter)&&`${c.name} ${c.location||''}`.toLowerCase().includes(search.toLowerCase())),sortKey,sortDirection);
 host.innerHTML=`<div class="card rt-banner"><h2>Recruitment – Test</h2><p>Work with a separate copy of candidates. Changes here are saved to the test module. Review the suggested stage for each copied candidate.</p><div class="rt-toolbar"><button class="button primary" id="rtAdd">Add Test Candidate</button><button class="button secondary" id="rtRefresh">Refresh</button></div></div><div class="rt-stage-counts">${STAGES.map(s=>`<button class="rt-stage-chip${stageFilter===s?' active':''}" data-rt-stage="${s}">${s}<strong>${records.filter(c=>c.testPipeline.stage===s).length}</strong></button>`).join('')}</div><div class="card"><div class="rt-toolbar"><input id="rtSearch" aria-label="Search test candidates" placeholder="Search name or location" value="${esc(search)}"><select id="rtGroup" aria-label="Candidate group"><option value="">All groups</option>${['In Progress','Hired','Rejected','Terminated'].map(s=>`<option${s===filter?' selected':''}>${s}</option>`).join('')}</select><span>${matches.length} of ${records.length} test candidates</span></div><div class="rt-table-wrap"><table class="rt-table"><thead><tr>${TABLE_COLUMNS.map(([key,label])=>`<th scope="col" aria-sort="${key===sortKey?(sortDirection==='asc'?'ascending':'descending'):'none'}"><button type="button" class="rt-sort${key===sortKey?' active':''}" data-rt-sort="${key}" aria-label="Sort by ${label}${key===sortKey?(sortDirection==='asc'?', descending next':', ascending next'):''}"><span>${label}</span><span class="rt-sort-indicator" aria-hidden="true">${key===sortKey?(sortDirection==='asc'?'▲':'▼'):'↕'}</span></button></th>`).join('')}</tr></thead><tbody>${matches.map(c=>{const p=c.testPipeline,days=daysInProcess(c);return `<tr><td><button class="rt-link" data-rt-edit="${esc(c.id)}">${esc(c.name||'Unnamed candidate')}</button>${p.onHold?'<span class="rt-badge">On Hold</span>':''}${!p.stageReviewed?'<small>Stage needs review</small>':''}</td><td>${esc(c.location||'—')}</td><td>${esc(p.stage)}</td><td>${esc(p.nextAction||'—')}</td><td>${esc(p.dueDate||'—')}</td><td>${esc(p.assignedTo||'—')}</td><td>${days===null?'—':days}</td></tr>`;}).join('')||'<tr><td colspan="7">No matching candidates.</td></tr>'}</tbody></table></div></div>`;
 host.querySelectorAll('[data-rt-sort]').forEach(x=>x.onclick=()=>{sortDirection=sortKey===x.dataset.rtSort&&sortDirection==='asc'?'desc':'asc';sortKey=x.dataset.rtSort;render();host.querySelector(`[data-rt-sort="${sortKey}"]`)?.focus();});
 el('rtAdd').onclick=()=>edit();el('rtRefresh').onclick=()=>open(true);
 el('rtSearch').oninput=e=>{search=e.target.value;const pos=e.target.selectionStart;render();el('rtSearch').focus();el('rtSearch').setSelectionRange(pos,pos);};
 el('rtGroup').onchange=e=>{filter=e.target.value;render();};
 host.querySelectorAll('[data-rt-stage]').forEach(x=>x.onclick=()=>{stageFilter=stageFilter===x.dataset.rtStage?'':x.dataset.rtStage;render();});
 host.querySelectorAll('[data-rt-edit]').forEach(x=>x.onclick=()=>edit(x.dataset.rtEdit));
}
function edit(id){
 if(busy||!ctx().connected||!ctx().allowed)return;
 draft=normalize(id?records.find(c=>c.id===id):{id:'test_'+root.crypto.randomUUID(),name:'',createdAt:new Date().toISOString(),recruitmentStatus:'In Progress',testPipeline:{stage:'Screening',stageReviewed:true,history:[]}});editingGeneration=generation;
 let modal=el('rtModal');if(!modal){modal=document.createElement('dialog');modal.id='rtModal';modal.className='rt-modal';document.body.append(modal);modal.addEventListener('cancel',e=>{e.preventDefault();close();});}modal.innerHTML=profile();bindProfile();if(!modal.open)modal.showModal();
}
function profile(){
 const p=draft.testPipeline;
 const summary=`<p class="rt-wide">A summary for the Ops Manager combining Candidate Details, Driver Qualifications, Background &amp; Drug Screen, and Screening Interview.</p><button type="button" class="button secondary" id="rtSummary">Print / Save PDF</button><button type="button" class="button secondary" id="rtSummaryPhone">Phone PDF</button>`;
 const importer=`<div class="rt-wide rt-import-box"><h3>Import First Advantage Application</h3><p>Choose the driver’s First Advantage PDF to fill detected name, contact, current address, DOB, FedEx ID, and CDL details. Review the imported values, then Save Draft.</p><label class="rt-field" for="rtImportFile"><span>First Advantage PDF (up to 15 MB)</span><input type="file" id="rtImportFile" accept=".pdf,application/pdf"></label><button type="button" class="button secondary" id="rtImport">Read First Advantage PDF</button></div>`;
 const histories=p.history.slice().reverse().map(h=>`<li>${esc(new Date(h.at).toLocaleString())} — ${esc(h.action)}${h.by?' · '+esc(h.by):''}</li>`).join('');
 const docs=Object.entries(draft.documents).filter(([,d])=>d?.path).map(([k,d])=>`<div class="rt-doc"><span>${esc(d.label||d.fileName||k)}</span><button type="button" data-rt-view="${esc(k)}">View</button><button type="button" data-rt-remove="${esc(k)}">Remove from test copy</button></div>`).join('');
 return `<form id="rtForm"><div class="rt-modal-header"><div><small>Recruitment – Test</small><h2>${esc(draft.name||'New Test Candidate')}</h2></div><button type="button" class="button secondary" id="rtClose" aria-label="Close candidate">Close</button></div><div id="rtMessage" aria-live="polite"></div>
 ${section('Candidate Details',importer+f('name','Name')+f('email','Email','email')+f('phone','Phone','tel')+f('location','Location')+f('address','Current address')+f('fedexId','FedEx ID'),true)}
 ${section('Current Stage & Next Action',`<p class="rt-wide"><strong>Current Stage: ${esc(p.stage)}</strong>${p.onHold?' · On Hold':''}. ${p.stageReviewed?'':'Suggested from existing records; review before advancing.'}</p>`+(!p.stageReviewed?f('testPipeline.stage','Confirm starting stage','text',STAGES)+f('testPipeline.stageReviewed','I reviewed this starting stage','checkbox'):'')+f('testPipeline.nextAction','Next action')+f('testPipeline.dueDate','Due date','date')+f('testPipeline.assignedTo','Assigned to')+f('testPipeline.onHold','On Hold','checkbox')+f('testPipeline.holdReason','Hold reason','textarea')+f('recruitmentStatus','Candidate group','text',['In Progress','Rejected','Terminated',...(p.stage==='Regular Employee'?['Hired']:[])])+`<div class="rt-wide"><h3>Stage history</h3><ol class="rt-history">${histories||'<li>No stage changes yet.</li>'}</ol></div>`,true)}
 ${section('Driver Qualifications',f('dob','Date of birth','date')+f('medicalCardExpiry','Medical card expiry','date')+f('cdlNumber','CDL number')+f('cdlIssuingState','CDL state')+f('cdlExpiry','CDL expiry','date'))}
 ${section('Screening Interview',
  pf('screening','date','Interview date','date')+pf('screening','interviewer','Interviewer')+
  pf('screening','experience',SCREENING_QUESTIONS.experience,'textarea')+
  pf('screening','availability',SCREENING_QUESTIONS.availability,'textarea')+
  pf('screening','payExpectation',SCREENING_QUESTIONS.payExpectation)+
  pf('screening','peak',SCREENING_QUESTIONS.peak,'text',yes)+
  pf('screening','doublesNotes',SCREENING_QUESTIONS.doublesNotes,'textarea')+
  f('doubles','Doubles endorsement & experience','text',['No','Yes No Experience','Yes With Experience'])+
  pf('screening','doublesTrainingWilling',SCREENING_QUESTIONS.doublesTrainingWilling,'text',['Yes','No','Not Applicable'])+
  `<p class="rt-wide rt-help" data-rt-question="shifts">${esc(SCREENING_QUESTIONS.shifts)}</p>`+
  pf('screening','possibleShifts','Possible shifts discussed','textarea')+
  pf('screening','shiftAvailabilityAccepted','Is the candidate OK with the possible shifts and Ops assigning the final shift?','text',yes)+
  pf('screening','shiftsExplained','Possible shifts and final shift assignment explained','checkbox')+
  pf('screening','safety',SCREENING_QUESTIONS.safety,'text',yes)+pf('screening','safetyNotes','Safety record details','textarea')+
  pf('screening','criminal',SCREENING_QUESTIONS.criminal,'text',yes)+pf('screening','criminalNotes','Candidate explanation / review notes','textarea')+
  pf('screening','consent',SCREENING_QUESTIONS.consent,'text',yes)+pf('screening','documents',SCREENING_QUESTIONS.documents,'text',yes)+
  `<div class="rt-wide rt-instructions"><h3>Explain the Application Process</h3><p>${esc(APPLICATION_PROCESS)}</p></div>`+
  pf('screening','processExplained','Application and drug-screen process explained','checkbox')+
  pf('screening','decision','Decision','text',decisions)+pf('screening','notes','Interview notes','textarea'),p.stage==='Screening')}
 ${section('Background & Drug Screen',pf('background','applicationSent','FADV application sent','date')+pf('background','fadvStatus','FADV status','text',['Not Sent','Sent','In Progress','Stuck','Complete'])+pf('background','drugStatus','Drug screen status','text',['Not Sent','Sent','Scheduled','Pending','Pass','Fail'])+pf('background','drugSent','Drug screen email sent','date')+pf('background','readyForOps','Manager: application has progressed enough to schedule Ops','checkbox')+pf('background','notes','Background / drug-screen notes','textarea')+'<p class="rt-wide rt-help">FADV and drug screen continue independently when the candidate moves to Ops.</p>',p.stage==='Background & Drug Screen')}
 ${section('Hiring Summary',summary)}
 ${section('Ops Interview',pf('ops','date','Ops interview date','date')+pf('ops','agreedDays','Work Days Agreed Upon')+pf('ops','dispatchAgreement','Dispatch Schedule Times Explained And Agreed Upon')+pf('ops','doublesAgreement','Doubles Requirement Explained And Agreed Upon')+`<p class="rt-wide rt-help">Record the candidate’s agreement in each text field. Include the working days, shift and approximate dispatch times, and whether pulling and assembling doubles is required.</p>`+(p.ops.shiftStart||p.ops.dispatchTime||p.ops.doublesRequired?`<p class="rt-wide rt-help">Previous Ops details: shift ${esc(p.ops.shiftStart||'—')} to ${esc(p.ops.shiftEnd||'—')}; dispatch ${esc(p.ops.dispatchTime||'—')}; doubles ${esc(p.ops.doublesRequired||'—')}. Schedule acceptance: ${esc(p.ops.scheduleAccepted||'Not recorded')}; doubles acceptance: ${esc(p.ops.doublesAccepted||'Not recorded')}.</p>`:''),p.stage==='Ops Interview')}
 ${section('Road Test',f('roadTest','Road test status','text',['Not Scheduled','Scheduled','Pass','Fail'])+f('roadTestForm.date','Test date','date')+f('roadTestForm.timeFrom','Time From','time')+f('roadTestForm.timeTo','Time To','time')+f('roadTestForm.testAdminName','Administrator')+f('roadTestForm.testAdminFedexId','Administrator FedEx ID')+f('roadTestForm.certificateNumber','Certificate number')+f('roadTestForm.tractorNumber','Tractor number')+f('roadTestForm.trailerNumber','Trailer number')+pf('training','roadNotes','Road test notes','textarea')+`<button type="button" class="button secondary" id="rtRoadPdf">Export Road Test PDF</button>`,p.stage==='Road Test')}
 ${section('Position & Offer',f('type','Part / Full Time','text',['Full Time','Part Time'])+f('position','Position')+f('shift','Shift preference','text',['Day','Night','Flexible'])+f('hiringSummary.proposedPay','Proposed pay')+f('offerLetter','Offer letter status','text',['Not Sent','Sent','Accepted','Declined'])+f('startDate','Proposed start date','date'),p.stage==='Offer & Onboarding')}

 ${section('Onboarding Tasks',['adp','sf','motive','handbook','connectTeams','eVerify'].map(k=>pf('onboarding',k,k==='handbook'?'Handbook':k==='connectTeams'?'Connect Teams':k==='eVerify'?'E-Verify':k.toUpperCase()+' access','text',['Not Sent','Sent','Complete',...(k==='handbook'?['Signed']:[])])).join('')+pf('onboarding','notes','Onboarding notes','textarea'),p.stage==='Offer & Onboarding')}
 ${section('Training',pf('training','startDate','Training start date','date')+pf('training','trainer','Trainer')+pf('training','result','Training result','text',['Not Started','In Progress','Complete'])+pf('training','completedDate','Completed date','date')+pf('training','notes','Training notes','textarea'),p.stage==='Training')}
 ${section('Document Upload',`<div class="rt-wide" id="rtDocuments">${docs||'<p>No documents.</p>'}</div><p class="rt-wide rt-help">Removing a document here only removes the test reference. Uploads are stored under this test candidate. Do not upload SSN documents.</p><label class="rt-field"><span>Document label</span><input id="rtDocLabel"></label><label class="rt-field"><span>Document expiry (optional)</span><input type="date" id="rtDocExpiry"></label><label class="rt-field"><span>Upload document</span><input type="file" id="rtDocFile" accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,.doc,.docx"></label><button type="button" class="button secondary" id="rtUpload">Upload & Save</button>`)}
 <div class="rt-footer"><button type="submit" class="button primary" id="rtSave">Save Draft</button><button type="button" class="button secondary" id="rtAdvance"${p.stage==='Regular Employee'?' disabled':''}>${p.stage==='Training'?'Complete Training / Hire':'Move to Next Stage'}</button></div></form>`;
}
function collect(){el('rtForm').querySelectorAll('[data-rt-field]').forEach(x=>put(draft,x.dataset.rtField,x.type==='checkbox'?x.checked:x.value));return draft;}
function bindProfile(){
 el('rtClose').onclick=close;el('rtForm').onsubmit=e=>{e.preventDefault();save(false);};el('rtAdvance').onclick=()=>save(true);
 el('rtForm').querySelectorAll('[data-rt-field]').forEach(x=>x.addEventListener('change',()=>{
  const path=x.dataset.rtField;put(draft,path,x.type==='checkbox'?x.checked:x.value);
  if(OPS_FIELDS.some(k=>path==='testPipeline.ops.'+k)){
   delete draft.testPipeline.ops.confirmedSchedule;
   message('Agreement notes changed. Record the candidate’s current agreement, then Save Draft or Move to Next Stage.');
  }
 }));
 el('rtSummary').onclick=()=>summary(collect());el('rtSummaryPhone').onclick=()=>summary(collect(),'phone');el('rtImportFile').onchange=()=>importPdf();el('rtRoadPdf').onclick=roadPdf;el('rtUpload').onclick=upload;el('rtImport').onclick=importPdf;
 el('rtForm').querySelectorAll('[data-rt-view]').forEach(x=>x.onclick=async()=>{const tab=root.open('about:blank','_blank');try{const url=await root.NBLCloud.getRecruitmentDocumentUrl(draft.documents[x.dataset.rtView].path);if(tab){tab.opener=null;tab.location.href=url;}else message('Allow popups to view documents.',true);}catch(e){tab?.close();message(e.message,true);}});
 el('rtForm').querySelectorAll('[data-rt-remove]').forEach(x=>x.onclick=()=>{collect();delete draft.documents[x.dataset.rtRemove];el('rtModal').innerHTML=profile();bindProfile();message('Reference removed from draft. Save Draft to keep this change.');});
}
function close(){if(busy){message('Wait for the current save to finish.');return;}el('rtModal')?.close();draft=null;}
function lock(value){busy=value;el('rtForm')?.querySelectorAll('input,select,textarea,button').forEach(x=>x.disabled=value||(x.id==='rtAdvance'&&draft?.testPipeline.stage==='Regular Employee'));}
async function persist(candidate){
 const org=workspace,gen=editingGeneration;checkContext(org,gen);const result=await root.NBLCloud.saveRecruitmentTestCandidate(org,candidate,candidate._cloudUpdatedAt);checkContext(org,gen);
 const index=records.findIndex(c=>c.id===candidate.id);if(index<0)records.push(normalize(result));else records[index]=normalize(result);draft=normalize(result);render();return result;
}
async function save(advance){
 if(busy)return;collect();if(!draft.name.trim()){message('Enter the candidate name.',true);return;}
 const c=clone(draft),p=c.testPipeline,prior=records.find(x=>x.id===c.id);
 const activeDecision=p.stage==='Screening'?p.screening.decision:'';
 if(activeDecision==='Hold')p.onHold=true;
 if(activeDecision==='Do Not Proceed')c.recruitmentStatus='Rejected';
 if(p.stageReviewed&&p.stage==='Regular Employee')c.recruitmentStatus='Hired';
 c.domicile=c.location;
 recordOpsAgreements(c,ctx().userName);

 if(p.onHold&&!String(p.holdReason||'').trim()){message('Enter a reason for Hold.',true);return;}
 if(advance){const errors=validate(c);if(errors.length){message('Complete before advancing: '+errors.join('; ')+'.',true);return;}
  const old=p.stage;p.stage=STAGES[STAGES.indexOf(p.stage)+1];p.nextAction=({'Background & Drug Screen':'Send application and drug screen','Ops Interview':'Schedule Ops interview','Road Test':'Schedule road test','Offer & Onboarding':'Send offer and onboarding access','Training':'Schedule and complete training','Regular Employee':'Training complete'})[p.stage];p.dueDate='';p.history.push({at:new Date().toISOString(),by:ctx().userName,action:`${old} → ${p.stage}`});
  if(p.stage==='Regular Employee')c.recruitmentStatus='Hired';
 }
 if(prior&&!prior.testPipeline.stageReviewed&&p.stageReviewed)p.history.push({at:new Date().toISOString(),by:ctx().userName,action:`Starting stage reviewed: ${p.stage}`});
 if(prior&&!!prior.testPipeline.onHold!==!!p.onHold)p.history.push({at:new Date().toISOString(),by:ctx().userName,action:p.onHold?`On Hold: ${p.holdReason}`:'Resumed from Hold'});
 if(prior&&prior.recruitmentStatus!==c.recruitmentStatus)p.history.push({at:new Date().toISOString(),by:ctx().userName,action:`Group: ${c.recruitmentStatus}`});
 c.updatedAt=new Date().toISOString();lock(true);message('Saving…');
 try{await persist(c);el('rtModal').innerHTML=profile();bindProfile();message(advance?'Saved and moved to '+draft.testPipeline.stage+'.':'Draft saved to Recruitment – Test.');}
 catch(e){message(e.message+' Your draft is still open. If another user changed this record, copy your notes and close / refresh before retrying.',true);}
 finally{lock(false);}
}
async function upload(){
 if(busy)return;collect();const file=el('rtDocFile').files[0],label=el('rtDocLabel').value.trim(),expiry=el('rtDocExpiry').value;
 if(!draft.name.trim()||!file||!label){message('Enter a name, document label and file.',true);return;}
 if(/\bssn\b|social.?security/i.test(label+' '+file.name)){message('SSN documents cannot be uploaded here.',true);return;}
 const org=workspace,gen=editingGeneration;lock(true);message('Uploading…');
 try{checkContext(org,gen);const c=clone(draft);const meta=await root.NBLCloud.uploadRecruitmentDocument(org,c.id,'test_'+root.crypto.randomUUID(),file);checkContext(org,gen);c.documents['test_'+root.crypto.randomUUID()]={...meta,label,expiry};draft=clone(c);await persist(c);el('rtModal').innerHTML=profile();bindProfile();message('Document uploaded and test candidate saved.');}
 catch(e){message(e.message,true);}finally{lock(false);}
}
async function authHeaders(){const s=await root.NBLCloud.getSession();if(!s)throw new Error('Sign in again.');return {'Content-Type':'application/json',Authorization:'Bearer '+s.access_token};}
async function importPdf(){
 if(busy)return;const file=el('rtImportFile').files[0];if(!file||!file.name.toLowerCase().endsWith('.pdf')||file.size>15*1024*1024){message('Choose a PDF of 15 MB or less.',true);return;}
 const org=workspace,gen=editingGeneration;lock(true);message('Reading application PDF…');
 try{const buf=new Uint8Array(await file.arrayBuffer());let str='';for(let i=0;i<buf.length;i+=32768)str+=String.fromCharCode(...buf.subarray(i,i+32768));const res=await fetch('/api/hr/parse-application',{method:'POST',headers:await authHeaders(),body:JSON.stringify({file_name:file.name,pdf_base64:btoa(str)})});const data=await res.json();if(!res.ok||!data.ok)throw new Error(data.error||'Could not read application PDF.');checkContext(org,gen);collect();const fields=data.fields||{};
  if(fields.name&&draft.name&&fields.name.toLowerCase()!==draft.name.toLowerCase()&&!root.confirm(`PDF name is ${fields.name}. Apply its driver data to ${draft.name}?`)){message('Import canceled. Driver data unchanged.');return;}
  const allowed=['name','email','phone','address','dob','cdlNumber','cdlIssuingState','cdlExpiry','medicalCardExpiry','endorsements','fedexId'];if(!allowed.some(k=>fields[k]))throw new Error('No supported driver fields were detected in this PDF.');for(const k of allowed)if(fields[k])draft[k]=fields[k];
  const endorsements=String(fields.endorsements||'');if(/\bT\b|doubles|triples/i.test(endorsements)&&(!draft.doubles||draft.doubles==='No'))draft.doubles='Yes No Experience';
  el('rtModal').innerHTML=profile();bindProfile();message('Driver data added to draft. Review the fields and Save Draft.');
 }catch(e){message(e.message,true);}finally{lock(false);}
}
// Match the original Recruitment module’s name-based electronic signatures.
  function createRoadTestSignaturePng(name){
    const text=String(name||'').trim();
    if(!text) return '';
    const probe=document.createElement('canvas');
    const pctx=probe.getContext('2d');
    let fontSize=112;
    const fontStack='"Snell Roundhand", "Apple Chancery", "Brush Script MT", "Segoe Script", cursive';
    pctx.font=`italic ${fontSize}px ${fontStack}`;
    let width=pctx.measureText(text).width;
    const maxTextWidth=1250;
    if(width>maxTextWidth){ fontSize=Math.max(70,Math.floor(fontSize*(maxTextWidth/width))); pctx.font=`italic ${fontSize}px ${fontStack}`; width=pctx.measureText(text).width; }
    const canvas=document.createElement('canvas');
    canvas.width=Math.ceil(Math.min(1450,width+180)); canvas.height=180;
    const ctx=canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.save();
    ctx.translate(35,4);
    ctx.transform(1,0,-0.055,1,0,0);
    ctx.font=`italic ${fontSize}px ${fontStack}`;
    ctx.textBaseline='alphabetic';
    ctx.fillStyle='#101010';
    ctx.globalAlpha=.96;
    ctx.fillText(text,20,120);
    const measured=Math.min(width,canvas.width-130);
    ctx.strokeStyle='#101010'; ctx.lineWidth=2.3; ctx.lineCap='round'; ctx.globalAlpha=.82;
    ctx.beginPath();
    ctx.moveTo(30,143);
    ctx.bezierCurveTo(35+measured*.22,153,35+measured*.72,148,65+measured,136);
    ctx.stroke();
    ctx.restore();
    return canvas.toDataURL('image/png');
  }
async function roadPdf(){
 if(busy)return;collect();const c=clone(draft),r=c.roadTestForm;
 if(['date','timeFrom','timeTo','testAdminName','testAdminFedexId','certificateNumber','tractorNumber','trailerNumber'].some(k=>!r[k])){message('Complete all road test form fields, including Time From and Time To, before export.',true);return;}
 if(!String(c.name||'').trim()){message('Enter the candidate name before exporting the signed road test.',true);return;}
 lock(true);try{const res=await fetch('/api/hr/road-test',{method:'POST',headers:await authHeaders(),body:JSON.stringify({candidate:{name:c.name,fedex_id:c.fedexId||'',cdl_number:c.cdlNumber||'',cdl_issuing_state:c.cdlIssuingState||''},road_test:{date:r.date,time_from:r.timeFrom,time_to:r.timeTo,test_admin_name:r.testAdminName,test_admin_fedex_id:r.testAdminFedexId,certificate_number:r.certificateNumber,tractor_number:r.tractorNumber,trailer_number:r.trailerNumber,candidate_signature_png:createRoadTestSignaturePng(c.name),admin_signature_png:createRoadTestSignaturePng(r.testAdminName)}})});if(!res.ok){const data=await res.json();throw new Error(data.error||'Road test export failed.');}const url=URL.createObjectURL(await res.blob()),a=document.createElement('a');a.href=url;a.download='TEST_Road_Test_'+c.name.replace(/[^a-z0-9]/gi,'_')+'.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);message('Test road form exported. Save Draft to keep edited form fields.');}catch(e){message(e.message,true);}finally{lock(false);}
}
function summary(c,format='letter'){
 const tab=root.open('about:blank','_blank');if(!tab){message('Allow popups to print the summary.',true);return;}
 tab.opener=null;tab.document.write(summaryHtml(c,new URL('assets/nashbox-logistics-logo.png',document.baseURI).href,format));tab.document.close();
}
function reset(){generation++;workspace='';records=[];loaded=false;draft=null;busy=false;search='';filter='In Progress';stageFilter='';sortKey='name';sortDirection='asc';el('rtModal')?.close();el('rtModal')?.remove();if(el('recruitmentTestScreen'))el('recruitmentTestScreen').innerHTML='';}
root.NBLRecruitmentTest={init:b=>{bridge=b;},open,reset,engine};
})(typeof window==='undefined'?globalThis:window);
