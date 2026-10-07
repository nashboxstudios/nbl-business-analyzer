/* Recruitment Test owns its records and never calls production recruitment saves. */
(function(root){
'use strict';
const STAGES=['Screening','Background & Drug Screen','Ops Interview','Road Test','Offer & Onboarding','Training','Regular Employee'];
const clone=x=>JSON.parse(JSON.stringify(x));
const scheduleKey=c=>JSON.stringify(['agreedDays','shiftStart','shiftEnd','dispatchTime','doublesRequired'].map(k=>c.testPipeline?.ops?.[k]||''));
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

 if(p.background.fadvStatus===undefined)p.background.fadvStatus=c.fadvStatus||'';
 if(p.background.drugStatus===undefined)p.background.drugStatus=c.drugTest||c.drugScreen||'';
 return c;
}
function reconcile(previous,c){
 if(previous&&scheduleKey(previous)!==scheduleKey(c)){
  c.testPipeline.ops.scheduleAccepted='';c.testPipeline.ops.doublesAccepted='';delete c.testPipeline.ops.confirmedSchedule;
 }
 return c;
}
function validate(c){
 const p=c.testPipeline,s=p.screening,o=p.ops,b=p.background,r=c.roadTestForm,errors=[];
 const need=(value,label)=>{if(!String(value||'').trim())errors.push(label);};
 if(STAGES.indexOf(p.stage)>STAGES.indexOf('Ops Interview')&&p.stage!=='Regular Employee'&&(o.scheduleAccepted!=='Yes'||o.doublesAccepted!=='Yes'||o.confirmedSchedule!==scheduleKey(c)))errors.push('Confirm the current Ops schedule and doubles requirement');
 if(p.onHold)errors.push('Resume this candidate from Hold');
 if(c.recruitmentStatus==='Rejected'||c.recruitmentStatus==='Terminated')errors.push('Candidate must be In Progress');
 if(!p.stageReviewed)errors.push('Review and confirm the suggested current stage');
 if(p.stage==='Screening'){
  for(const [k,l] of [['interviewer','Screening interviewer'],['date','Screening date'],['experience','Tractor-trailer experience'],['availability','Shift and day availability'],['payExpectation','Expected pay'],['peak','Peak availability'],['doublesNotes','Doubles experience / endorsement plans'],['safety','Safety record answer'],['criminal','Felony / misdemeanor answer'],['consent','Background and drug-screen consent answer'],['documents','Valid CDL and medical card answer']])need(s[k],l);
  if(s.decision!=='Proceed')errors.push('Screening decision: Proceed');
  if(!s.processExplained)errors.push('Confirm application process explained');
  if(!s.shiftsExplained)errors.push('Confirm available shifts explained');
 }else if(p.stage==='Background & Drug Screen'){
  need(b.applicationSent,'Application sent date');need(b.drugStatus,'Drug screen status');
  if(!b.readyForOps)errors.push('Manager confirmation: ready for Ops');
 }else if(p.stage==='Ops Interview'){
  for(const [k,l] of [['interviewer','Ops interviewer'],['date','Ops interview date'],['agreedDays','Agreed working days'],['shiftStart','Shift start'],['shiftEnd','Shift end'],['dispatchTime','Dispatch time'],['doublesRequired','Doubles requirement']])need(o[k],l);
  if(o.decision!=='Proceed')errors.push('Ops decision: Proceed');
  if(o.scheduleAccepted!=='Yes')errors.push('Candidate schedule acceptance');
  if(o.doublesAccepted!=='Yes')errors.push('Candidate doubles duty acknowledgment');
  if(o.confirmedSchedule!==scheduleKey(c))errors.push('Reconfirm the current schedule and doubles requirement');
 }else if(p.stage==='Road Test'){
  if(c.roadTest!=='Pass')errors.push('Road test: Pass');need(r.date,'Road test date');need(r.testAdminName,'Road test administrator');
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
const engine={STAGES,normalize,reconcile,validate,scheduleKey};
if(typeof module!=='undefined'&&module.exports)module.exports=engine;
if(!root.document)return;
const esc=x=>String(x??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
let bridge,records=[],workspace='',generation=0,draft=null,busy=false,loaded=false,editingGeneration=0,search='',filter='In Progress',stageFilter='';
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
 const matches=records.filter(c=>(!filter||c.recruitmentStatus===filter||filter==='In Progress'&&!['Hired','Rejected','Terminated'].includes(c.recruitmentStatus))&&(!stageFilter||c.testPipeline.stage===stageFilter)&&`${c.name} ${c.location||''}`.toLowerCase().includes(search.toLowerCase()));
 host.innerHTML=`<div class="card rt-banner"><h2>Recruitment – Test</h2><p>Work with a separate copy of candidates. Changes here are saved to the test module. Review the suggested stage for each copied candidate.</p><div class="rt-toolbar"><button class="button primary" id="rtAdd">Add Test Candidate</button><button class="button secondary" id="rtRefresh">Refresh</button></div></div><div class="rt-stage-counts">${STAGES.map(s=>`<button class="rt-stage-chip${stageFilter===s?' active':''}" data-rt-stage="${s}">${s}<strong>${records.filter(c=>c.testPipeline.stage===s).length}</strong></button>`).join('')}</div><div class="card"><div class="rt-toolbar"><input id="rtSearch" aria-label="Search test candidates" placeholder="Search name or location" value="${esc(search)}"><select id="rtGroup" aria-label="Candidate group"><option value="">All groups</option>${['In Progress','Hired','Rejected','Terminated'].map(s=>`<option${s===filter?' selected':''}>${s}</option>`).join('')}</select><span>${matches.length} of ${records.length} test candidates</span></div><div class="rt-table-wrap"><table class="rt-table"><thead><tr>${['Name','Location','Current Stage','Next Action','Due Date','Assigned To','Days in Process'].map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${matches.map(c=>{const p=c.testPipeline,days=Math.max(0,Math.floor((Date.now()-new Date(c.createdAt||p.history[0]?.at||Date.now()).getTime())/86400000));return `<tr><td><button class="rt-link" data-rt-edit="${esc(c.id)}">${esc(c.name||'Unnamed candidate')}</button>${p.onHold?'<span class="rt-badge">On Hold</span>':''}${!p.stageReviewed?'<small>Stage needs review</small>':''}</td><td>${esc(c.location||'—')}</td><td>${esc(p.stage)}</td><td>${esc(p.nextAction||'—')}</td><td>${esc(p.dueDate||'—')}</td><td>${esc(p.assignedTo||'—')}</td><td>${Number.isFinite(days)?days:'—'}</td></tr>`;}).join('')||'<tr><td colspan="7">No matching candidates.</td></tr>'}</tbody></table></div></div>`;
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
 const summary=`<p class="rt-wide">Create a legible manager summary from the interview and offer information.</p><button type="button" class="button secondary" id="rtSummary">Print / Save PDF</button>`;
 const histories=p.history.slice().reverse().map(h=>`<li>${esc(new Date(h.at).toLocaleString())} — ${esc(h.action)}${h.by?' · '+esc(h.by):''}</li>`).join('');
 const docs=Object.entries(draft.documents).filter(([,d])=>d?.path).map(([k,d])=>`<div class="rt-doc"><span>${esc(d.label||d.fileName||k)}</span><button type="button" data-rt-view="${esc(k)}">View</button><button type="button" data-rt-remove="${esc(k)}">Remove from test copy</button></div>`).join('');
 return `<form id="rtForm"><div class="rt-modal-header"><div><small>Recruitment – Test</small><h2>${esc(draft.name||'New Test Candidate')}</h2></div><button type="button" class="button secondary" id="rtClose" aria-label="Close candidate">Close</button></div><div id="rtMessage" aria-live="polite"></div>
 ${section('Candidate Details',f('name','Name')+f('email','Email','email')+f('phone','Phone','tel')+f('location','Location')+f('address','Current address')+f('fedexId','FedEx ID'),true)}
 ${section('Current Stage & Next Action',`<p class="rt-wide"><strong>Current Stage: ${esc(p.stage)}</strong>${p.onHold?' · On Hold':''}. ${p.stageReviewed?'':'Suggested from existing records; review before advancing.'}</p>`+(!p.stageReviewed?f('testPipeline.stage','Confirm starting stage','text',STAGES)+f('testPipeline.stageReviewed','I reviewed this starting stage','checkbox'):'')+f('testPipeline.nextAction','Next action')+f('testPipeline.dueDate','Due date','date')+f('testPipeline.assignedTo','Assigned to')+f('testPipeline.onHold','On Hold','checkbox')+f('testPipeline.holdReason','Hold reason','textarea')+f('recruitmentStatus','Candidate group','text',['In Progress','Rejected','Terminated',...(p.stage==='Regular Employee'?['Hired']:[])])+`<div class="rt-wide"><h3>Stage history</h3><ol class="rt-history">${histories||'<li>No stage changes yet.</li>'}</ol></div>`,true)}
 ${section('Driver Qualifications',f('dob','Date of birth','date')+f('medicalCardExpiry','Medical card expiry','date')+f('cdlNumber','CDL number')+f('cdlIssuingState','CDL state')+f('cdlExpiry','CDL expiry','date')+f('doubles','Doubles endorsement & experience','text',['No','Yes No Experience','Yes With Experience'])+(draft.legacyDoubles?`<p class="rt-wide rt-help">Previous doubles value: ${esc(draft.legacyDoubles)}. Select the confirmed endorsement and experience above.</p>`:'')+pf('screening','doublesWilling','Willing to pull and assemble doubles','text',yes))}
 ${section('Screening Interview',pf('screening','date','Interview date','date')+pf('screening','interviewer','Interviewer')+pf('screening','experience','Tractor-trailer experience: 1 year in the last 3 or 5 in the last 10 (describe)','textarea')+pf('screening','availability','Preferred day/night shift and available days','textarea')+pf('screening','payExpectation','Expected pay')+pf('screening','peak','Available up to 6 days/week during mid-November–early January peak','text',yes)+pf('screening','doublesNotes','Doubles experience, last driven, or endorsement plans','textarea')+pf('screening','shiftsExplained','Possible shifts explained; Ops will communicate the assigned shift','checkbox')+pf('screening','safety','Any at-fault accidents, failed/refused drug screens or license suspensions?','text',yes)+pf('screening','safetyNotes','Safety record details','textarea')+pf('screening','criminal','Ever convicted of, or pled guilty/no contest to, a felony or misdemeanor?','text',yes)+pf('screening','criminalNotes','Candidate explanation / review notes','textarea')+pf('screening','consent','Willing to undergo background check and DOT drug screen?','text',yes)+pf('screening','documents','Valid CDL and medical card?','text',yes)+`<p class="rt-wide rt-help">Explain: application arrives by email; include tractor-trailer employment and verification contacts. The drug-screen email link is valid for 5 days; complete it within that window.</p>`+pf('screening','processExplained','Application and drug-screen process explained','checkbox')+pf('screening','decision','Decision','text',decisions)+pf('screening','notes','Interview notes','textarea'),p.stage==='Screening')}
 ${section('Background & Drug Screen',pf('background','applicationSent','FADV application sent','date')+pf('background','fadvStatus','FADV status','text',['Not Sent','Sent','In Progress','Stuck','Complete'])+pf('background','drugStatus','Drug screen status','text',['Not Sent','Sent','Scheduled','Pending','Pass','Fail'])+pf('background','drugSent','Drug screen email sent','date')+pf('background','readyForOps','Manager: application has progressed enough to schedule Ops','checkbox')+pf('background','notes','Background / drug-screen notes','textarea')+'<p class="rt-wide rt-help">FADV and drug screen continue independently when the candidate moves to Ops.</p>',p.stage==='Background & Drug Screen')}
 ${section('Ops Interview',pf('ops','date','Interview date','date')+pf('ops','interviewer','Interviewer')+pf('ops','agreedDays','Agreed working days')+pf('ops','shiftStart','Shift start','time')+pf('ops','shiftEnd','Shift end','time')+pf('ops','dispatchTime','Approximate dispatch time','time')+pf('ops','doublesRequired','Doubles requirement','text',['May be required','Required','Not required'])+`<p class="rt-wide rt-help">Confirm the exact days and shift above with the candidate. Dispatch time may vary based on when FedEx has trailers ready. Doubles duties include assembling two trailers and a dolly with the tractor. Changing the agreed schedule or doubles requirement clears both acknowledgments.</p>`+pf('ops','scheduleAccepted','Candidate understands and accepts the current schedule','text',yes)+pf('ops','doublesAccepted','Candidate understands and accepts the doubles requirement above','text',yes)+pf('ops','decision','Decision','text',decisions)+pf('ops','notes','Interview notes','textarea'),p.stage==='Ops Interview')}
 ${section('Road Test',f('roadTest','Road test status','text',['Not Scheduled','Scheduled','Pass','Fail'])+f('roadTestForm.date','Test date','date')+f('roadTestForm.testAdminName','Administrator')+f('roadTestForm.testAdminFedexId','Administrator FedEx ID')+f('roadTestForm.certificateNumber','Certificate number')+f('roadTestForm.tractorNumber','Tractor number')+f('roadTestForm.trailerNumber','Trailer number')+pf('training','roadNotes','Road test notes','textarea')+`<button type="button" class="button secondary" id="rtRoadPdf">Export Road Test PDF</button>`,p.stage==='Road Test')}
 ${section('Position & Offer',f('type','Part / Full Time','text',['Full Time','Part Time'])+f('position','Position')+f('shift','Shift preference','text',['Day','Night','Flexible'])+f('hiringSummary.proposedPay','Proposed pay')+f('offerLetter','Offer letter status','text',['Not Sent','Sent','Accepted','Declined'])+f('startDate','Proposed start date','date')+f('hiringSummary.notes','Hiring manager notes','textarea'),p.stage==='Offer & Onboarding')}
 ${section('Hiring Summary',summary)}
 ${section('Training',pf('training','startDate','Training start date','date')+pf('training','trainer','Trainer')+pf('training','result','Training result','text',['Not Started','In Progress','Complete'])+pf('training','completedDate','Completed date','date')+pf('training','notes','Training notes','textarea'),p.stage==='Training')}
 ${section('Onboarding Tasks',['adp','sf','motive','handbook','connectTeams','eVerify'].map(k=>pf('onboarding',k,k==='handbook'?'Handbook':k==='connectTeams'?'Connect Teams':k==='eVerify'?'E-Verify':k.toUpperCase()+' access','text',['Not Sent','Sent','Complete',...(k==='handbook'?['Signed']:[])])).join('')+pf('onboarding','notes','Onboarding notes','textarea'),p.stage==='Offer & Onboarding')}
 ${section('Document Upload',`<div class="rt-wide" id="rtDocuments">${docs||'<p>No documents.</p>'}</div><p class="rt-wide rt-help">Removing a document here only removes the test reference. Uploads are stored under this test candidate. Do not upload SSN documents.</p><label class="rt-field"><span>Document label</span><input id="rtDocLabel"></label><label class="rt-field"><span>Document expiry (optional)</span><input type="date" id="rtDocExpiry"></label><label class="rt-field"><span>Upload document</span><input type="file" id="rtDocFile" accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,.doc,.docx"></label><button type="button" class="button secondary" id="rtUpload">Upload & Save</button><label class="rt-field rt-wide"><span>Import driver data from application PDF</span><input type="file" id="rtImportFile" accept=".pdf,application/pdf"></label><button type="button" class="button secondary" id="rtImport">Read Application PDF</button>`)}
 <div class="rt-footer"><button type="submit" class="button primary" id="rtSave">Save Draft</button><button type="button" class="button secondary" id="rtAdvance"${p.stage==='Regular Employee'?' disabled':''}>${p.stage==='Training'?'Complete Training / Hire':'Move to Next Stage'}</button></div></form>`;
}
function collect(){el('rtForm').querySelectorAll('[data-rt-field]').forEach(x=>put(draft,x.dataset.rtField,x.type==='checkbox'?x.checked:x.value));return draft;}
function bindProfile(){
 el('rtClose').onclick=close;el('rtForm').onsubmit=e=>{e.preventDefault();save(false);};el('rtAdvance').onclick=()=>save(true);
 el('rtForm').querySelectorAll('[data-rt-field]').forEach(x=>x.addEventListener('change',()=>{
  const path=x.dataset.rtField;put(draft,path,x.type==='checkbox'?x.checked:x.value);
  if(['agreedDays','shiftStart','shiftEnd','dispatchTime','doublesRequired'].some(k=>path==='testPipeline.ops.'+k)){
   draft.testPipeline.ops.scheduleAccepted='';draft.testPipeline.ops.doublesAccepted='';delete draft.testPipeline.ops.confirmedSchedule;
   ['scheduleAccepted','doublesAccepted'].forEach(k=>el('rt_testPipeline_ops_'+k).value='');message('Schedule changed. Ask the candidate to confirm both acknowledgments again.');
  }else if(['scheduleAccepted','doublesAccepted'].some(k=>path==='testPipeline.ops.'+k)){
   collect();if(draft.testPipeline.ops.scheduleAccepted==='Yes'&&draft.testPipeline.ops.doublesAccepted==='Yes'){draft.testPipeline.ops.confirmedSchedule=scheduleKey(draft);draft.testPipeline.ops.confirmedAt=new Date().toISOString();draft.testPipeline.ops.confirmedBy=ctx().userName;}
  }
 }));
 el('rtSummary').onclick=()=>summary(collect());el('rtRoadPdf').onclick=roadPdf;el('rtUpload').onclick=upload;el('rtImport').onclick=importPdf;
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
 const activeDecision=p.stage==='Screening'?p.screening.decision:p.stage==='Ops Interview'?p.ops.decision:'';
 if(activeDecision==='Hold')p.onHold=true;
 if(activeDecision==='Do Not Proceed')c.recruitmentStatus='Rejected';
 if(p.stageReviewed&&p.stage==='Regular Employee')c.recruitmentStatus='Hired';
 c.domicile=c.location;

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
async function roadPdf(){
 if(busy)return;collect();const c=clone(draft),r=c.roadTestForm;
 if(['date','testAdminName','testAdminFedexId','certificateNumber','tractorNumber','trailerNumber'].some(k=>!r[k])){message('Complete all six road test form fields before export.',true);return;}
 lock(true);try{const res=await fetch('/api/hr/road-test',{method:'POST',headers:await authHeaders(),body:JSON.stringify({candidate:{name:c.name,fedex_id:c.fedexId||'',cdl_number:c.cdlNumber||'',cdl_issuing_state:c.cdlIssuingState||''},road_test:{date:r.date,test_admin_name:r.testAdminName,test_admin_fedex_id:r.testAdminFedexId,certificate_number:r.certificateNumber,tractor_number:r.tractorNumber,trailer_number:r.trailerNumber}})});if(!res.ok){const data=await res.json();throw new Error(data.error||'Road test export failed.');}const url=URL.createObjectURL(await res.blob()),a=document.createElement('a');a.href=url;a.download='TEST_Road_Test_'+c.name.replace(/[^a-z0-9]/gi,'_')+'.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);message('Test road form exported. Save Draft to keep edited form fields.');}catch(e){message(e.message,true);}finally{lock(false);}
}
function summary(c){
 const p=c.testPipeline,s=p.screening,o=p.ops;const tab=root.open('about:blank','_blank');if(!tab){message('Allow popups to print the summary.',true);return;}
 const row=(label,value)=>`<tr><th>${esc(label)}</th><td>${esc(value||'—').replaceAll('\n','<br>')}</td></tr>`;
 const block=(title,rows)=>`<h2>${title}</h2><table>${rows.map(x=>row(...x)).join('')}</table>`;
 const doublesColor=c.doubles==='No'?'#a92323':c.doubles==='Yes With Experience'?'#157344':'#946800';
 tab.opener=null;tab.document.write(`<!doctype html><html><head><title>TEST Hiring Summary - ${esc(c.name)}</title><style>body{font:13px Arial,sans-serif;max-width:850px;margin:30px auto;color:#172b40}h1{font-size:24px}h2{font-size:17px;margin-top:24px}table{border-collapse:collapse;width:100%;break-inside:avoid}th,td{border-bottom:1px solid #ddd;padding:9px;text-align:left;vertical-align:top;white-space:pre-wrap;overflow-wrap:anywhere}th{width:32%;background:#f3f6fa}button{padding:10px}@media print{button{display:none}body{margin:0}@page{margin:16mm}h2{break-after:avoid}}</style></head><body><button onclick="window.print()">Print / Save PDF</button><p>RECRUITMENT – TEST</p><h1>Hiring Summary: ${esc(c.name)}</h1>${block('Candidate',[['Name',c.name],['Location',c.location],['Email',c.email],['Phone',c.phone],['Current Stage',p.stage]])}${block('Position & Offer',[['Position',c.position],['Part / Full Time',c.type],['Expected pay',s.payExpectation],['Proposed pay',c.hiringSummary.proposedPay],['Offer',c.offerLetter]])}<h2>Qualifications</h2><table>${row('CDL state',c.cdlIssuingState)}${row('CDL expiry',c.cdlExpiry)}${row('Drug screen status',p.background.drugStatus)}${row('Tractor-trailer experience',s.experience)}<tr><th>Doubles</th><td style="color:${doublesColor};font-weight:bold">${esc(c.doubles||'—')}</td></tr>${row('Willing to pull / assemble doubles',s.doublesWilling)}${row('Doubles details',s.doublesNotes)}</table>${block('Agreed Schedule & Acknowledgments',[['Preferred shift / availability',s.availability],['Peak availability',s.peak],['Agreed working days',o.agreedDays],['Shift',o.shiftStart&&o.shiftEnd?o.shiftStart+' – '+o.shiftEnd:''],['Approximate dispatch time',o.dispatchTime],['Doubles requirement',o.doublesRequired],['Schedule accepted',o.confirmedSchedule===scheduleKey(c)?o.scheduleAccepted:'Needs confirmation'],['Doubles duties acknowledged',o.confirmedSchedule===scheduleKey(c)?o.doublesAccepted:'Needs confirmation']])}${block('Interview Notes',[['Screening date / interviewer',[s.date,s.interviewer].filter(Boolean).join(' / ')],['Screening decision',s.decision],['Screening notes',s.notes],['Ops date / interviewer',[o.date,o.interviewer].filter(Boolean).join(' / ')],['Ops decision',o.decision],['Ops notes',o.notes],['Manager notes',c.hiringSummary.notes]])}</body></html>`);tab.document.close();
}
function reset(){generation++;workspace='';records=[];loaded=false;draft=null;busy=false;search='';filter='In Progress';stageFilter='';el('rtModal')?.close();el('rtModal')?.remove();if(el('recruitmentTestScreen'))el('recruitmentTestScreen').innerHTML='';}
root.NBLRecruitmentTest={init:b=>{bridge=b;},open,reset,engine};
})(typeof window==='undefined'?globalThis:window);
