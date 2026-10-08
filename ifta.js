(function(root){
  'use strict';
  const JURISDICTIONS={AB:'Alberta',AK:'Alaska',AL:'Alabama',AR:'Arkansas',AZ:'Arizona',BC:'British Columbia',CA:'California',CH:'Clearinghouse',CO:'Colorado',CT:'Connecticut',DC:'District of Columbia',DE:'Delaware',FL:'Florida',GA:'Georgia',IA:'Iowa',ID:'Idaho',IL:'Illinois',IN:'Indiana',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',MA:'Massachusetts',MB:'Manitoba',MD:'Maryland',ME:'Maine',MI:'Michigan',MN:'Minnesota',MO:'Missouri',MS:'Mississippi',MT:'Montana',MX:'Mexico',NB:'New Brunswick',NC:'North Carolina',ND:'North Dakota',NE:'Nebraska',NH:'New Hampshire',NJ:'New Jersey',NL:'Newfoundland and Labrador',NM:'New Mexico',NS:'Nova Scotia',NT:'Northwest Territories',NU:'Nunavut',NV:'Nevada',NY:'New York',OH:'Ohio',OK:'Oklahoma',ON:'Ontario',OR:'Oregon',OT:'Other Jurisdiction',PA:'Pennsylvania',PE:'Prince Edward Island',QC:'Quebec',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',SK:'Saskatchewan',TN:'Tennessee',TX:'Texas',UT:'Utah',VA:'Virginia',VT:'Vermont',WA:'Washington',WI:'Wisconsin',WV:'West Virginia',WY:'Wyoming',YT:'Yukon Territory'};
  const MONTHS=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const round=n=>Math.round((n+Number.EPSILON)*100)/100;
  function quarterRange(year,quarter){
    year=Number(year);quarter=Number(quarter);
    if(!Number.isInteger(year)||year<2000||year>2100||!Number.isInteger(quarter)||quarter<1||quarter>4)throw Error('Select a valid year and quarter.');
    const start=new Date(Date.UTC(year,(quarter-1)*3,1)),end=new Date(Date.UTC(year,quarter*3,0));
    return {year,quarter,key:`${year}-Q${quarter}`,start:start.toISOString().slice(0,10),end:end.toISOString().slice(0,10)};
  }
  function parseDate(value){
    const s=String(value??'').trim();let y,m,d;
    if(/^\d{4}-\d{2}-\d{2}$/.test(s))[y,m,d]=s.split('-').map(Number);
    else {const match=s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);if(!match)return null;y=Number(match[3]);m=MONTHS.indexOf(match[2].toUpperCase())+1;d=Number(match[1]);}
    const date=new Date(Date.UTC(y,m-1,d));
    return m>0&&date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d?date.toISOString().slice(0,10):null;
  }
  function jurisdiction(value){
    const s=String(value??'').trim().toUpperCase();
    return JURISDICTIONS[s]?s:Object.keys(JURISDICTIONS).find(k=>JURISDICTIONS[k].toUpperCase()===s)||null;
  }
  function numeric(value){return value==null||String(value).trim()===''?null:Number(value);}
  function buildReport(year,quarter,trips,catalog){
    const range=quarterRange(year,quarter),states=new Map(),issues=[],warnings=[],seenTrips=new Map(),seenFuel=new Map(),purchases=[],sources=new Map();
    const get=code=>{if(!states.has(code))states.set(code,{code,jurisdiction:JURISDICTIONS[code],fuelType:'Diesel',totalMiles:0,taxableMiles:0,taxPaidGallons:0});return states.get(code);};
    let duplicates=0,tripCount=0;
    for(const trip of trips||[]){
      const date=parseDate(trip.date);
      if(!date){issues.push('A Motive mileage row has an invalid date.');continue;}
      if(date<range.start||date>range.end)continue;
      const code=jurisdiction(trip.jurisdiction),distance=numeric(trip.distance);
      if(!code||distance==null||!Number.isFinite(distance)||distance<0){issues.push(`Invalid mileage/state on ${date}; source trip ${trip.id??'without ID'}.`);continue;}
      // The server explicitly requests X-Metric-Units:false; distance is miles.
      const vehicle=String(trip.vehicle?.number||trip.vehicle?.id||''),key=trip.id!=null?`id:${trip.id}`:JSON.stringify([date,code,vehicle,trip.start_odometer,trip.end_odometer,distance]);
      const signature=JSON.stringify([date,code,vehicle,distance]);
      if(seenTrips.has(key)){duplicates++;if(seenTrips.get(key)!==signature)issues.push(`Conflicting Motive trip ${trip.id}.`);continue;}
      seenTrips.set(key,signature);get(code).totalMiles+=distance;tripCount++;
    }
    for(const statement of catalog||[]){
      const source=String(statement.id||statement.relativePath||statement.fileName||'Settlement');
      for(const fuel of statement.result?.fuelPurchases||[]){
        const date=parseDate(fuel.date);
        if(!date){issues.push(`Invalid fuel purchase date in ${statement.fileName||source}.`);continue;}
        if(date<range.start||date>range.end)continue;
        const code=jurisdiction(fuel.state),qty=numeric(fuel.qty),ticket=String(fuel.ticket??'').trim(),vehicle=String(fuel.vehicle??'').trim();
        if(!code||qty==null||!Number.isFinite(qty)||qty<=0||!ticket||!vehicle){issues.push(`Fuel purchase on ${date} in ${statement.fileName||source} needs a state, positive gallons, ticket, and tractor.`);continue;}
        const key=JSON.stringify([vehicle,ticket]),signature=JSON.stringify([date,code,qty,String(fuel.vendor||''),String(fuel.city||'')]);
        if(seenFuel.has(key)){duplicates++;if(seenFuel.get(key)!==signature)issues.push(`Conflicting fuel ticket ${ticket} for tractor ${vehicle}.`);continue;}
        seenFuel.set(key,signature);get(code).taxPaidGallons+=qty;
        purchases.push({key,date,code,qty,ticket,vehicle,vendor:String(fuel.vendor||''),city:String(fuel.city||''),source,fileName:String(statement.fileName||source),included:true});
        sources.set(source,{id:source,fileName:statement.fileName||source,settlementDate:statement.settlementDate||'',firstPurchase:date,lastPurchase:date});
      }
    }
    // Source filenames/pay dates do not determine the quarter; late-posting statements
    // remain eligible when they contain an in-quarter purchase.
    for(const p of purchases){const s=sources.get(p.source);s.firstPurchase=s.firstPurchase<p.date?s.firstPurchase:p.date;s.lastPurchase=s.lastPurchase>p.date?s.lastPurchase:p.date;}
    const coveredWeeks=new Set(purchases.map(p=>{const d=new Date(p.date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+1)%7));return d.toISOString().slice(0,10);}));
    const missingWeeks=[];
    for(let d=new Date(range.start+'T12:00:00Z');d.toISOString().slice(0,10)<=range.end;d.setUTCDate(d.getUTCDate()+7)){
      const start=new Date(d);start.setUTCDate(start.getUTCDate()-((start.getUTCDay()+1)%7));const key=start.toISOString().slice(0,10);if(!coveredWeeks.has(key))missingWeeks.push(key);
    }
    // Check the final partial week too when the quarter did not start on Saturday.
    const final=new Date(range.end+'T12:00:00Z');final.setUTCDate(final.getUTCDate()-((final.getUTCDay()+1)%7));const lastWeek=final.toISOString().slice(0,10);if(!coveredWeeks.has(lastWeek)&&!missingWeeks.includes(lastWeek))missingWeeks.push(lastWeek);
    if(missingWeeks.length)warnings.push(`No settlement fuel purchases recorded for ${missingWeeks.length} week(s) starting ${missingWeeks.join(', ')}. Check for missing statements, outside purchases, or no activity.`);
    if(!tripCount)warnings.push('Motive returned no mileage for this quarter. Verify the fleet and reporting period.');
    if(!purchases.length)warnings.push('No settlement fuel purchases are recorded for this quarter.');
    warnings.push('Fuel totals cover saved settlement purchases only. Review qualifying tax-paid diesel and any purchases made outside the fuel cards.');
    const rows=[...states.values()].sort((a,b)=>a.jurisdiction.localeCompare(b.jurisdiction));
    for(const row of rows){row.totalMiles=round(row.totalMiles);row.taxableMiles=row.totalMiles;row.taxPaidGallons=round(row.taxPaidGallons);}
    return {...range,version:1,generatedAt:new Date().toISOString(),rows,purchases,sources:[...sources.values()],tripCount,duplicates,issues:[...new Set(issues)],warnings,notes:'',mileageReviewed:false,fuelReviewed:false};
  }
  function recalculate(report){
    for(const row of report.rows)row.taxPaidGallons=round(report.purchases.filter(p=>p.code===row.code&&p.included).reduce((s,p)=>s+p.qty,0));
    return report;
  }
  function validate(report){
    if(!report)return ['Generate a quarterly report first.'];
    const errors=[...(report.issues||[])];
    for(const row of report.rows||[]){const n=numeric(row.taxableMiles);if(n==null||!Number.isFinite(n)||n<0||n>row.totalMiles)errors.push(`Taxable miles for ${row.jurisdiction} must be between 0 and ${row.totalMiles.toFixed(2)}.`);}
    return errors;
  }
  function exportReady(report){return !!report&&report.mileageReviewed&&report.fuelReviewed&&!validate(report).length&&report.rows.length>0;}
  const engine={JURISDICTIONS,quarterRange,parseDate,jurisdiction,buildReport,recalculate,validate,exportReady};
  if(typeof module!=='undefined'&&module.exports)module.exports=engine;
  if(!root?.document)return;

  const $=id=>root.document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),fmt=n=>Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  let config={},report=null,revision=null,busy=false,seq=0,activeScope=null;
  const ctx=()=>config.getContext?.()||{},scope=()=>ctx().orgId||'local';
  function message(text,error=false){const el=$('iftaMessage');if(el){el.textContent=text;el.className='alert '+(error?'error':'success');el.hidden=!text;}}
  function range(){return quarterRange($('iftaYear').value,$('iftaQuarter').value);}
  function render(){
    if(!$('iftaRows'))return;
    const r=range();$('iftaPeriod').textContent=`${r.start} through ${r.end}`;
    $('iftaGenerate').disabled=busy;$('iftaSave').disabled=busy||!report||!ctx().connected||!!validate(report).length;$('iftaReload').disabled=busy||!ctx().connected;$('iftaExport').disabled=busy||!exportReady(report);
    $('iftaYear').disabled=busy;$('iftaQuarter').disabled=busy;
    $('iftaGenerate').textContent=busy?'Working…':'Calculate Quarter';
    $('iftaReview').hidden=!report;
    $('iftaMileageReviewed').checked=!!report?.mileageReviewed;$('iftaFuelReviewed').checked=!!report?.fuelReviewed;
    $('iftaNotes').value=report?.notes||'';
    $('iftaRows').innerHTML=report?.rows.length?report.rows.map(row=>`<tr><td><strong>${esc(row.jurisdiction)}</strong></td><td>Diesel</td><td class="num">${fmt(row.totalMiles)}</td><td><input aria-label="Taxable miles for ${esc(row.jurisdiction)}" data-ifta-taxable="${row.code}" type="number" min="0" max="${row.totalMiles}" step="0.01" value="${row.taxableMiles}"></td><td class="num">${fmt(row.taxPaidGallons)}</td></tr>`).join(''):'<tr><td colspan="5" class="empty-table-cell">Choose a year and quarter, then calculate the report.</td></tr>';
    const totals=report?.rows.reduce((s,r)=>[s[0]+r.totalMiles,s[1]+Number(r.taxableMiles||0),s[2]+r.taxPaidGallons],[0,0,0]);
    $('iftaTotals').innerHTML=totals?`<tr><th colspan="2">Total</th>${totals.map(n=>`<th class="num">${fmt(n)}</th>`).join('')}</tr>`:'';
    $('iftaStats').textContent=report?`${report.tripCount} mileage rows • ${report.purchases.length} fuel purchases • ${report.sources.length} statements • ${report.duplicates} duplicates removed • ${exportReady(report)?'Reviewed':'Draft'}${report.savedAt?' • Saved':''}`:'';
    $('iftaWarnings').innerHTML=report?[...(report.warnings||[]),...validate(report)].map(s=>`<li>${esc(s)}</li>`).join(''):'';
    $('iftaFuelRows').innerHTML=report?.purchases.map(p=>`<tr><td><input type="checkbox" aria-label="Include fuel ticket ${esc(p.ticket)}" data-ifta-fuel="${esc(p.key)}" ${p.included?'checked':''}></td><td>${p.date}</td><td>${esc(JURISDICTIONS[p.code])}</td><td>${esc(p.vehicle)}</td><td>${fmt(p.qty)}</td><td>${esc(p.ticket)}</td><td>${esc(p.vendor)}<small>${esc(p.city)}</small></td><td>${esc(p.fileName)}</td></tr>`).join('')||'<tr><td colspan="8" class="empty-table-cell">No purchases in this quarter.</td></tr>';
    for(const input of root.document.querySelectorAll('#iftaReview input, #iftaReview textarea, #iftaFuelRows input, #iftaRows input'))input.disabled=busy;
  }
  async function open(){
    if(!ctx().allowed)return;
    if(activeScope!==scope()){reset();activeScope=scope();}
    if(!$('iftaYear').value){const now=new Date(),r=quarterRange(now.getFullYear(),Math.floor(now.getMonth()/3)+1),previous=new Date(r.start+'T12:00:00Z');previous.setUTCDate(previous.getUTCDate()-1);$('iftaYear').value=previous.getUTCFullYear();$('iftaQuarter').value=Math.floor(previous.getUTCMonth()/3)+1;}
    if(!report&&!busy)await load();else render();
  }
  async function load(){
    const request=++seq,current=range(),s=scope(),previous=report?.key===current.key?report:null,previousRevision=previous?revision:null;report=null;revision=null;message('');busy=true;render();
    try{
      if(ctx().connected){const row=await root.NBLCloud.getIftaReport(ctx().orgId,current.key);if(request!==seq||s!==scope())return;if(row?.data&&row.data.key!==current.key)throw Error('Saved report does not match the selected quarter.');report=row?.data||null;revision=row?.updated_at||null;}
    }catch(e){if(request===seq){report=previous;revision=previousRevision;message(`Could not load saved quarter: ${e.message}`,true);}}
    finally{if(request===seq){busy=false;render();}}
  }
  async function generate(){
    if(busy||!ctx().allowed)return;
    const request=++seq,current=range(),s=scope();busy=true;message('Loading Motive mileage and saved settlement purchases…');render();
    try{
      const [mileage,catalog]=await Promise.all([config.api(`/api/ifta/mileage?year=${current.year}&quarter=${current.quarter}`,{timeoutMs:300000}),config.getCatalog()]);
      if(request!==seq||s!==scope()||!ctx().allowed)return;
      if(!Array.isArray(mileage.trips)||mileage.start_date!==current.start||mileage.end_date!==current.end||mileage.units!=='miles')throw Error('Motive returned an unexpected reporting period or units.');
      const next=buildReport(current.year,current.quarter,mileage.trips,catalog);
      if(report){const overrides=new Map(report.rows.map(r=>[r.code,r])),excluded=new Set(report.purchases.filter(p=>!p.included).map(p=>p.key));for(const row of next.rows){const old=overrides.get(row.code);if(old&&old.taxableMiles!==old.totalMiles)row.taxableMiles=old.taxableMiles;}for(const p of next.purchases)if(excluded.has(p.key))p.included=false;next.notes=report.notes||'';recalculate(next);}
      report=next;message('Quarter calculated. Review mileage and qualifying tax-paid fuel before exporting.');
    }catch(e){if(request===seq)message(`Quarter could not be calculated: ${e.message}. Any previous report has been retained.`,true);}
    finally{if(request===seq){busy=false;render();}}
  }
  async function save(){
    if(busy||!ctx().allowed||!ctx().connected||!report||validate(report).length)return;
    const request=++seq,s=scope(),draft=JSON.parse(JSON.stringify({...report,savedAt:new Date().toISOString()}));busy=true;render();
    try{const row=await root.NBLCloud.saveIftaReport(ctx().orgId,draft.key,draft,revision);if(request!==seq||s!==scope())return;report=draft;revision=row.updated_at;message('Quarter saved.');}
    catch(e){if(request===seq)message(`Quarter could not be saved: ${e.message}. Your draft is still here.`,true);}
    finally{if(request===seq){busy=false;render();}}
  }
  async function download(){
    if(busy||!ctx().allowed||!exportReady(report))return;
    const request=++seq,s=scope();busy=true;render();
    try{
      const response=await config.download('/api/ifta/export',{year:report.year,quarter:report.quarter,rows:report.rows,mileageReviewed:report.mileageReviewed,fuelReviewed:report.fuelReviewed});
      if(request!==seq||s!==scope()||!ctx().allowed)return;
      const url=root.URL.createObjectURL(response),a=root.document.createElement('a');a.href=url;a.download=`IFTA_${report.key}.xlsx`;a.click();setTimeout(()=>root.URL.revokeObjectURL(url),1000);message('IFTA worksheet exported.');
    }catch(e){if(request===seq)message(`Export failed: ${e.message}`,true);}
    finally{if(request===seq){busy=false;render();}}
  }
  function reset(){seq++;report=null;revision=null;busy=false;activeScope=null;if($('iftaYear'))$('iftaYear').value='';}
  function init(options){config=options||{};
    $('iftaGenerate')?.addEventListener('click',generate);$('iftaSave')?.addEventListener('click',save);$('iftaExport')?.addEventListener('click',download);$('iftaReload')?.addEventListener('click',load);
    for(const id of ['iftaYear','iftaQuarter'])$(id)?.addEventListener('change',()=>{try{range();load();}catch(e){message(e.message,true);}});
    $('iftaReview')?.addEventListener('change',e=>{if(!report||busy)return;if(e.target.id==='iftaMileageReviewed')report.mileageReviewed=e.target.checked;if(e.target.id==='iftaFuelReviewed')report.fuelReviewed=e.target.checked;if(e.target.id==='iftaNotes')report.notes=e.target.value;delete report.savedAt;render();});
    $('iftaRows')?.addEventListener('change',e=>{if(!report||busy||!e.target.dataset.iftaTaxable)return;const row=report.rows.find(r=>r.code===e.target.dataset.iftaTaxable);if(row){row.taxableMiles=e.target.value===''?'':numeric(e.target.value);report.mileageReviewed=false;delete report.savedAt;render();}});
    $('iftaFuelRows')?.addEventListener('change',e=>{if(!report||busy||!e.target.dataset.iftaFuel)return;const p=report.purchases.find(p=>p.key===e.target.dataset.iftaFuel);if(p){p.included=e.target.checked;report.fuelReviewed=false;delete report.savedAt;recalculate(report);render();}});
  }
  root.NBLIFTA={engine,init,open,reset};
})(typeof window!=='undefined'?window:globalThis);
