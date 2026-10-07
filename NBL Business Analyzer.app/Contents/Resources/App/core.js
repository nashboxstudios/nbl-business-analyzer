(function (global) {
  'use strict';

  const DEFAULT_RATES = { mileage: 0.65, singleDH: 8, doubleDH: 15 };
  const MONTHS = { JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11 };

  function normalizeWindows1252(text) {
    const map = { '\u0080':'€','\u0082':'‚','\u0083':'ƒ','\u0084':'„','\u0085':'…','\u0086':'†','\u0087':'‡','\u0088':'ˆ','\u0089':'‰','\u008A':'Š','\u008B':'‹','\u008C':'Œ','\u008E':'Ž','\u0091':'‘','\u0092':'’','\u0093':'“','\u0094':'”','\u0095':'•','\u0096':'–','\u0097':'—','\u0098':'˜','\u0099':'™','\u009A':'š','\u009B':'›','\u009C':'œ','\u009E':'ž','\u009F':'Ÿ' };
    return String(text || '').replace(/[\u0080-\u009F]/g, ch => map[ch] || ch);
  }
  function round2(n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; }

  function parseCSV(text) {
    const rows = [];
    let row = [], field = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else quoted = false;
        } else field += ch;
      } else {
        if (ch === '"') quoted = true;
        else if (ch === ',') { row.push(field); field = ''; }
        else if (ch === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
        else field += ch;
      }
    }
    if (field.length || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
    return rows;
  }

  function toNumber(value) {
    if (value == null) return 0;
    let s = String(value).trim().replace(/^'/, '').replace(/[$,]/g, '');
    if (!s) return 0;
    if (/^\(.*\)$/.test(s)) s = '-' + s.slice(1, -1);
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  function isDateCell(value) { return /^\d{2}-[A-Z]{3}-\d{4}$/.test(String(value || '').trim().toUpperCase()); }
  function parseFedexDate(value) {
    const m = String(value || '').trim().toUpperCase().match(/^(\d{2})-([A-Z]{3})-(\d{4})$/);
    if (!m || MONTHS[m[2]] == null) return null;
    return new Date(Number(m[3]), MONTHS[m[2]], Number(m[1]));
  }
  function isoDate(d) {
    if (!(d instanceof Date) || isNaN(d)) return '';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function smartTitle(s) {
    return String(s || '').toLowerCase().replace(/(^|[\s\-’'])([a-z])/g, (_, p, c) => p + c.toUpperCase());
  }
  function displayName(raw) {
    const parts = String(raw || '').split(',');
    if (parts.length < 2) return smartTitle(raw);
    const last = smartTitle(parts.shift().trim());
    const firstMiddle = smartTitle(parts.join(',').trim());
    return `${firstMiddle} ${last}`.trim();
  }

  function analyzeSettlement(text, fileName='settlement.csv', rates=DEFAULT_RATES) {
    text = normalizeWindows1252(text);
    const rows = parseCSV(text);
    const names = {};
    const linehaul = [], spots = [], fuelPurchases = [], misc = [];
    const warnings = [];
    let mode = null, currentVehicle = '';
    let fuelPurchaseTotal = null, totalAuthorizedChargebacks = null, netAmount = null, totalGross = null;

    for (const r0 of rows) {
      const r = Array.from({length:20}, (_,i) => r0[i] == null ? '' : r0[i]);
      const a = String(r[0] || '').trim();
      const u = a.toUpperCase();

      if (u === 'LINEHAUL TRIPS') { mode = 'linehaul'; currentVehicle = ''; continue; }
      if (u === 'SPOTS') { mode = 'spots'; currentVehicle = ''; continue; }
      if (u === 'FUEL PURCHASES') { mode = 'fuel'; currentVehicle = ''; continue; }
      if (u === 'TRACTOR REPAIRS/MISC') { mode = 'misc'; currentVehicle = ''; continue; }
      if (u === 'LINEHAUL DRIVERS' || u === 'SPOT DRIVERS') { mode = 'names'; currentVehicle = ''; continue; }
      if (u === 'VEHICLE' && (mode === 'linehaul' || mode === 'spots')) { currentVehicle = String(r[1] || '').trim(); continue; }

      if (u === 'FUEL PURCHASE TOTAL') { fuelPurchaseTotal = Math.abs(toNumber(r[13])); mode = null; continue; }
      if (u === 'TRACTOR REPAIR/MISC TOTAL') { mode = null; continue; }
      if (u === 'TOTAL AUTHORIZED CHARGEBACKS') { totalAuthorizedChargebacks = Math.abs(toNumber(r[13])); mode = null; continue; }
      if (u === 'NET SETTLEMENT') { netAmount = toNumber(r[13]); mode = null; continue; }
      if (u === 'TOTAL GROSS' || u === 'UNADJUSTED GROSS:') { totalGross = toNumber(r[13]) || totalGross; mode = null; continue; }
      if (u === 'GROSS LINEHAUL ACTIVITY:' || u === 'GROSS SPOT ACTIVITY:' || u === 'YEAR TO DATE SETTLEMENT BALANCE') { mode = null; continue; }

      if (mode === 'names' && /^\d{6,9}$/.test(a) && String(r[1]).includes(',')) {
        names[a] = displayName(r[1]);
        continue;
      }
      if (!isDateCell(a)) continue;

      if (mode === 'linehaul') {
        linehaul.push({
          date:a, trip:String(r[1]).trim(), vehicle:currentVehicle,
          origin:String(r[2]).trim(), destination:String(r[3]).trim(), vmrCatDom:String(r[4]).trim(),
          miles:toNumber(r[5]), vmrRate:toNumber(r[6]), mileagePlus:toNumber(r[7]), premiums:toNumber(r[8]),
          fuelRate:toNumber(r[9]), totalRate:toNumber(r[10]), mileageAmount:toNumber(r[11]),
          packages:toNumber(r[12]), packageAmount:toNumber(r[13]), dh:toNumber(r[14]), tolls:toNumber(r[15]), flatRate:toNumber(r[16]),
          revenue:toNumber(r[17]), driver1:String(r[18]).trim(), driver2:String(r[19]).trim()
        });
      } else if (mode === 'spots') {
        spots.push({
          date:a, avr:String(r[1]).trim(), trip:String(r[2]).trim(), vehicle:currentVehicle,
          spotName:String(r[3]).trim(), siteName:String(r[5]).trim(), miles:toNumber(r[8]),
          fuelRate:toNumber(r[9]), fuelAmount:toNumber(r[10]), spotAmount:toNumber(r[11]),
          livePackages:toNumber(r[12]), liveAmount:toNumber(r[13]), mileageRate:toNumber(r[14]), mileageAmount:toNumber(r[15]),
          revenue:toNumber(r[17]), driver1:String(r[18]).trim(), driver2:String(r[19]).trim()
        });
      } else if (mode === 'fuel') {
        fuelPurchases.push({
          date:a, ticket:String(r[1]).trim(), vehicle:String(r[2]).trim(), vendor:String(r[3]).trim(),
          city:String(r[4]).trim(), state:String(r[5]).trim(), qty:toNumber(r[6]), amount:Math.abs(toNumber(r[7]))
        });
      } else if (mode === 'misc') {
        const description = r.slice(6,13).filter(Boolean).join(' ').trim();
        misc.push({
          date:a, ticket:String(r[1]).trim(), vehicle:String(r[2]).trim(), vendor:String(r[3]).trim(),
          city:String(r[4]).trim(), state:String(r[5]).trim(), description, amount:Math.abs(toNumber(r[13]))
        });
      }
    }

    const driverStats = new Map();
    function ensureDriver(id) {
      if (!id) return null;
      if (!driverStats.has(id)) driverStats.set(id, {fedexId:id, name:names[id] || `Driver ${id}`, linehaulMiles:0, spotMiles:0, singles:0, doubles:0, dhCounts:{}});
      return driverStats.get(id);
    }
    let secondaryAssignments = 0;
    for (const trip of linehaul) {
      const ids = [trip.driver1, trip.driver2].filter(Boolean);
      if (trip.driver2) secondaryAssignments++;
      for (const id of [...new Set(ids)]) {
        const d = ensureDriver(id); if (!d) continue;
        d.linehaulMiles += trip.miles;
        if (trip.dh > 0.001) { const k=Number(trip.dh).toFixed(2); d.dhCounts[k]=(d.dhCounts[k]||0)+1; }
        // Legacy counters are retained for older exports/data, but payroll now uses dynamic D&H value mappings.
        if (Math.abs(trip.dh - 12.75) < 0.01) d.singles += 1;
        if (Math.abs(trip.dh - 22.25) < 0.01) d.doubles += 1;
      }
    }
    for (const trip of spots) {
      const ids = [trip.driver1, trip.driver2].filter(Boolean);
      if (trip.driver2) secondaryAssignments++;
      for (const id of [...new Set(ids)]) {
        const d = ensureDriver(id); if (d) d.spotMiles += trip.miles;
      }
    }
    if (secondaryAssignments) warnings.push(`${secondaryAssignments} trip(s) include Driver #2. The tool credits the trip miles/pay events to each listed driver; review team-driver settlements before payroll.`);

    const drivers = [...driverStats.values()].map(d => {
      const totalMiles = d.linehaulMiles + d.spotMiles;
      const milesPay = round2(totalMiles * Number(rates.mileage));
      const singlesPay = round2(d.singles * Number(rates.singleDH));
      const doublesPay = round2(d.doubles * Number(rates.doubleDH));
      const dhEventCount=Object.values(d.dhCounts||{}).reduce((a,b)=>a+(Number(b)||0),0);
      return {...d, totalMiles, dhEventCount, milesPay, singlesPay, doublesPay, totalPay:round2(milesPay+singlesPay+doublesPay)};
    }).sort((a,b) => a.name.localeCompare(b.name));

    const linehaulMiles = linehaul.reduce((s,x)=>s+x.miles,0);
    const spotMiles = spots.reduce((s,x)=>s+x.miles,0);
    const linehaulRevenue = round2(linehaul.reduce((s,x)=>s+x.revenue,0));
    const spotRevenue = round2(spots.reduce((s,x)=>s+x.revenue,0));
    const fuelExpenseByRows = round2(fuelPurchases.reduce((s,x)=>s+x.amount,0));
    const fuelExpense = round2(fuelPurchaseTotal != null && fuelPurchaseTotal > 0 ? fuelPurchaseTotal : fuelExpenseByRows);
    // For NBL settlements, FedEx's Tractor Repairs/Misc section is used for DEF charges.
    // Any additional non-fuel authorized chargebacks that are not in that section remain Other Expense.
    const miscTotal = round2(misc.reduce((s,x)=>s+x.amount,0));
    const chargebacks = round2(totalAuthorizedChargebacks != null ? totalAuthorizedChargebacks : fuelExpense + miscTotal);
    const nonFuelChargebacks = round2(Math.max(0, chargebacks - fuelExpense));
    const defExpense = round2(Math.min(miscTotal, nonFuelChargebacks));
    const otherExpense = round2(Math.max(0, nonFuelChargebacks - defExpense));
    const revenue = round2(linehaulRevenue + spotRevenue);
    const computedNet = round2(revenue - fuelExpense - defExpense - otherExpense);

    const allDates = [...linehaul,...spots,...fuelPurchases,...misc].map(x=>parseFedexDate(x.date)).filter(Boolean).sort((a,b)=>a-b);
    const periodStart = allDates.length ? isoDate(allDates[0]) : '';
    const periodEnd = allDates.length ? isoDate(allDates[allDates.length-1]) : '';

    if (totalGross != null && Math.abs(totalGross - revenue) > 0.02) warnings.push(`Calculated revenue (${revenue.toFixed(2)}) differs from statement Total Gross (${totalGross.toFixed(2)}).`);
    if (netAmount != null && Math.abs(netAmount - computedNet) > 0.02) warnings.push(`Calculated net (${computedNet.toFixed(2)}) differs from statement Net Settlement (${netAmount.toFixed(2)}).`);

    const dhValueMap={};
    for(const trip of linehaul){ if((Number(trip.dh)||0)>0.001){ const k=Number(trip.dh).toFixed(2); dhValueMap[k]=(dhValueMap[k]||0)+1; } }
    const dhValues=Object.entries(dhValueMap).map(([k,count])=>({amount:Number(k),count})).sort((a,b)=>a.amount-b.amount);

    return {
      fileName, rates:{...rates}, rowsCount:rows.length, names, linehaul, spots, fuelPurchases, misc, drivers, dhValues,
      summary:{
        totalMiles:linehaulMiles+spotMiles, linehaulMiles, spotMiles,
        linehaulRevenue, spotRevenue, totalRevenue:revenue,
        fuelExpense, defExpense, otherExpense, totalAuthorizedChargebacks:chargebacks,
        netAmount:round2(netAmount != null ? netAmount : computedNet), computedNet,
        periodStart, periodEnd, totalGross:totalGross != null ? totalGross : revenue,
        unclassifiedNonFuelExpense:otherExpense
      }, warnings
    };
  }

  function recalculateDriverPay(result, rates) {
    result.rates = {...rates};
    result.drivers = result.drivers.map(d => {
      const milesPay = round2(d.totalMiles * Number(rates.mileage));
      const singlesPay = round2(d.singles * Number(rates.singleDH));
      const doublesPay = round2(d.doubles * Number(rates.doubleDH));
      return {...d, milesPay, singlesPay, doublesPay, totalPay:round2(milesPay+singlesPay+doublesPay)};
    });
    return result;
  }

  function reclassifyDef(result, defAmount) {
    const s = result.summary;
    const nonFuel = Math.max(0, s.totalAuthorizedChargebacks - s.fuelExpense);
    const def = Math.max(0, Math.min(Number(defAmount)||0, nonFuel));
    s.defExpense = round2(def);
    s.otherExpense = round2(Math.max(0, nonFuel - def));
    s.computedNet = round2(s.totalRevenue - s.fuelExpense - s.defExpense - s.otherExpense);
    return result;
  }

  function csvEscape(v) {
    const s = String(v == null ? '' : v);
    return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
  }
  function payrollDateColumnLabel(iso){
    const m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})$/); if(!m) return String(iso||'');
    const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));
    const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec'];
    return `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`;
  }
  function driverPayCSV(result) {
    const ds=result.drivers||[];
    if(ds.some(d=>d.payrollComputed)){
      const week=result.payrollWeekDates||[];
      const headers=['Driver','FedEx ID','Pay Method',...week.map(payrollDateColumnLabel),'Days Worked','Linehaul Miles','Spot Miles','Total Miles','D&H Breakdown','D&H Pay','Base Pay','Minimum Top-Up','Bonus','Holiday','Vacation','Training','Other Adjustment','Total Pay'];
      const rows=ds.map(d=>[d.name,d.fedexId,d.payMethodLabel||d.payMethod,...week.map(date=>(d.workedDates||[]).includes(date)?'Y':''),d.daysWorked,d.linehaulMiles,d.spotMiles,d.totalMiles,(d.dhBreakdown||[]).map(x=>`$${Number(x.amount).toFixed(2)} x ${x.count} @ ${x.mapped?('$'+Number(x.payout).toFixed(2)):'UNMAPPED'}`).join('; '),Number(d.dhPay||0).toFixed(2),Number(d.basePay||0).toFixed(2),Number(d.minimumTopUp||0).toFixed(2),Number(d.adjustmentBuckets?.bonus||0).toFixed(2),Number(d.adjustmentBuckets?.holiday||0).toFixed(2),Number(d.adjustmentBuckets?.vacation||0).toFixed(2),Number(d.adjustmentBuckets?.training||0).toFixed(2),Number(d.adjustmentBuckets?.other||0).toFixed(2),Number(d.totalPay||0).toFixed(2)]);
      const totals=ds.reduce((t,d)=>{t.days+=Number(d.daysWorked)||0;t.lm+=Number(d.linehaulMiles)||0;t.sm+=Number(d.spotMiles)||0;t.tm+=Number(d.totalMiles)||0;t.dhe+=Number(d.dhEventCount)||0;t.dhp+=Number(d.dhPay)||0;t.base+=Number(d.basePay)||0;t.min+=Number(d.minimumTopUp)||0;t.bonus+=Number(d.adjustmentBuckets?.bonus)||0;t.holiday+=Number(d.adjustmentBuckets?.holiday)||0;t.vacation+=Number(d.adjustmentBuckets?.vacation)||0;t.training+=Number(d.adjustmentBuckets?.training)||0;t.other+=Number(d.adjustmentBuckets?.other)||0;t.total+=Number(d.totalPay)||0;return t;},{days:0,lm:0,sm:0,tm:0,dhe:0,dhp:0,base:0,min:0,bonus:0,holiday:0,vacation:0,training:0,other:0,total:0});
      const dayCounts=week.map(date=>ds.filter(d=>(d.workedDates||[]).includes(date)).length);
      rows.push(['TOTAL','','',...dayCounts,totals.days,totals.lm,totals.sm,totals.tm,`${totals.dhe} events`,totals.dhp.toFixed(2),totals.base.toFixed(2),totals.min.toFixed(2),totals.bonus.toFixed(2),totals.holiday.toFixed(2),totals.vacation.toFixed(2),totals.training.toFixed(2),totals.other.toFixed(2),totals.total.toFixed(2)]);
      return [headers,...rows].map(row=>row.map(csvEscape).join(',')).join('\r\n');
    }
    const r = result.rates;
    const headers = ['Driver','FedEx ID','Linehaul Miles','Spot Miles','Total Miles','D&H @ $12.75','D&H @ $22.25',`Miles Pay @ $${Number(r.mileage).toFixed(2)}`,`D&H Singles Pay @ $${Number(r.singleDH).toFixed(2)}`,`D&H Doubles Pay @ $${Number(r.doubleDH).toFixed(2)}`,'Total Pay'];
    const rows = result.drivers.map(d => [d.name,d.fedexId,d.linehaulMiles,d.spotMiles,d.totalMiles,d.singles,d.doubles,d.milesPay.toFixed(2),d.singlesPay.toFixed(2),d.doublesPay.toFixed(2),d.totalPay.toFixed(2)]);
    const totals = result.drivers.reduce((t,d)=>({lm:t.lm+d.linehaulMiles,sm:t.sm+d.spotMiles,tm:t.tm+d.totalMiles,s:t.s+d.singles,db:t.db+d.doubles,mp:t.mp+d.milesPay,sp:t.sp+d.singlesPay,dp:t.dp+d.doublesPay,tp:t.tp+d.totalPay}),{lm:0,sm:0,tm:0,s:0,db:0,mp:0,sp:0,dp:0,tp:0});
    rows.push(['TOTAL','',totals.lm,totals.sm,totals.tm,totals.s,totals.db,totals.mp.toFixed(2),totals.sp.toFixed(2),totals.dp.toFixed(2),totals.tp.toFixed(2)]);
    return [headers,...rows].map(row=>row.map(csvEscape).join(',')).join('\r\n');
  }

  function summaryJSON(result) {
    return JSON.stringify({sourceFile:result.fileName, generatedAt:new Date().toISOString(), rates:result.rates, summary:result.summary, warnings:result.warnings}, null, 2);
  }

  // --- Minimal XLSX writer (ZIP store + OOXML). No external library required. ---
  const encoder = new TextEncoder();
  function xmlEscape(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function colName(n) { let s=''; while(n>0){ n--; s=String.fromCharCode(65+(n%26))+s; n=Math.floor(n/26);} return s; }
  function crc32(bytes) {
    if (!crc32.table) {
      crc32.table = Array.from({length:256},(_,n)=>{ let c=n; for(let k=0;k<8;k++) c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1); return c>>>0; });
    }
    let c=0xFFFFFFFF; for(const b of bytes) c=crc32.table[(c^b)&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0;
  }
  function u16(n){ return Uint8Array.from([n&255,(n>>>8)&255]); }
  function u32(n){ return Uint8Array.from([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]); }
  function concat(parts){ const len=parts.reduce((s,p)=>s+p.length,0), out=new Uint8Array(len); let o=0; for(const p of parts){out.set(p,o);o+=p.length;} return out; }
  function dosDateTime(d=new Date()) {
    const year=Math.max(1980,d.getFullYear());
    return {time:((d.getHours()<<11)|(d.getMinutes()<<5)|Math.floor(d.getSeconds()/2))&0xFFFF,date:(((year-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate())&0xFFFF};
  }
  function makeZip(files) {
    const local=[], central=[]; let offset=0; const dt=dosDateTime();
    for(const f of files){
      const name=encoder.encode(f.name), data=typeof f.data==='string'?encoder.encode(f.data):f.data, crc=crc32(data);
      const lh=concat([u32(0x04034b50),u16(20),u16(0),u16(0),u16(dt.time),u16(dt.date),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name]);
      local.push(lh,data);
      const ch=concat([u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(dt.time),u16(dt.date),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]);
      central.push(ch); offset += lh.length + data.length;
    }
    const centralBytes=concat(central);
    const end=concat([u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(centralBytes.length),u32(offset),u16(0)]);
    return concat([...local,centralBytes,end]);
  }

  function cellXml(ref, value, style=0) {
    if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
    return `<c r="${ref}" t="inlineStr" s="${style}"><is><t>${xmlEscape(value==null?'':value)}</t></is></c>`;
  }
  function rowXml(rowNum, values, styles=[]) {
    return `<row r="${rowNum}">${values.map((v,i)=>cellXml(`${colName(i+1)}${rowNum}`,v,styles[i]||0)).join('')}</row>`;
  }
  function sheetXml(rows, widths, freezeRow=0, autoFilterRef='') {
    const dim=`A1:${colName(Math.max(...rows.map(r=>r.values.length),1))}${rows.length}`;
    const cols=widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('');
    const pane=freezeRow?`<sheetViews><sheetView workbookViewId="0"><pane ySplit="${freezeRow}" topLeftCell="A${freezeRow+1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`:'<sheetViews><sheetView workbookViewId="0"/></sheetViews>';
    const af=autoFilterRef?`<autoFilter ref="${autoFilterRef}"/>`:'';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="${dim}"/>${pane}<cols>${cols}</cols><sheetData>${rows.map((r,i)=>rowXml(i+1,r.values,r.styles||[])).join('')}</sheetData>${af}</worksheet>`;
  }

  function makeXlsx(result) {
    const rates=result.rates;
    const payrollMode=(result.drivers||[]).some(d=>d.payrollComputed);
    let driverRows, driverWidths, driverFreeze=5, driverFilter='';
    if(payrollMode){
      const week=result.payrollWeekDates||[];
      const totals=result.drivers.reduce((t,d)=>{t.days+=Number(d.daysWorked)||0;t.lm+=Number(d.linehaulMiles)||0;t.sm+=Number(d.spotMiles)||0;t.tm+=Number(d.totalMiles)||0;t.dhe+=Number(d.dhEventCount)||0;t.dhp+=Number(d.dhPay)||0;t.base+=Number(d.basePay)||0;t.min+=Number(d.minimumTopUp)||0;t.bonus+=Number(d.adjustmentBuckets?.bonus)||0;t.holiday+=Number(d.adjustmentBuckets?.holiday)||0;t.vacation+=Number(d.adjustmentBuckets?.vacation)||0;t.training+=Number(d.adjustmentBuckets?.training)||0;t.other+=Number(d.adjustmentBuckets?.other)||0;t.total+=Number(d.totalPay)||0;return t;},{days:0,lm:0,sm:0,tm:0,dhe:0,dhp:0,base:0,min:0,bonus:0,holiday:0,vacation:0,training:0,other:0,total:0});
      const header=['Driver','FedEx ID','Pay Method',...week.map(payrollDateColumnLabel),'Days Worked','Linehaul Miles','Spot Miles','Total Miles','D&H Breakdown','D&H Pay','Base Pay','Minimum Top-Up','Bonus','Holiday','Vacation','Training','Other Adjustment','Total Pay'];
      driverRows=[
        {values:['NBL Business Analyzer — Driver Pay'],styles:[7]},
        {values:[`Source: ${result.fileName}`,`Activity: ${result.summary.periodStart || '—'} to ${result.summary.periodEnd || '—'}`]},
        {values:[`Pay Date: ${result.summary.payDate || '—'}`,`Settlement Date: ${result.summary.settlementDate || '—'}`]},
        {values:['Driver-specific pay profiles • Worked days can be checked for every driver • D&H payout is mapped from the actual D&H values detected in each settlement.']},
        {values:header,styles:Array(header.length).fill(1)}
      ];
      for(const d of result.drivers){
        const values=[d.name,d.fedexId,d.payMethodLabel||d.payMethod,...week.map(date=>(d.workedDates||[]).includes(date)?'✓':''),d.daysWorked,d.linehaulMiles,d.spotMiles,d.totalMiles,(d.dhBreakdown||[]).map(x=>`$${Number(x.amount).toFixed(2)} x ${x.count} @ ${x.mapped?('$'+Number(x.payout).toFixed(2)):'UNMAPPED'}`).join('; '),d.dhPay||0,d.basePay,d.minimumTopUp,d.adjustmentBuckets?.bonus||0,d.adjustmentBuckets?.holiday||0,d.adjustmentBuckets?.vacation||0,d.adjustmentBuckets?.training||0,d.adjustmentBuckets?.other||0,d.totalPay];
        const styles=[0,0,0,...week.map(()=>0),2,2,2,2,0,3,3,3,3,3,3,3,3,3];
        driverRows.push({values,styles});
      }
      const dayCounts=week.map(date=>result.drivers.filter(d=>(d.workedDates||[]).includes(date)).length);
      const totalValues=['TOTAL','','',...dayCounts,totals.days,totals.lm,totals.sm,totals.tm,`${totals.dhe} events`,totals.dhp,totals.base,totals.min,totals.bonus,totals.holiday,totals.vacation,totals.training,totals.other,totals.total];
      const totalStyles=[5,5,5,...week.map(()=>5),6,6,6,6,5,4,4,4,4,4,4,4,4,4];
      driverRows.push({values:totalValues,styles:totalStyles});
      driverWidths=[27,13,20,...week.map(()=>12),12,15,12,13,34,15,15,16,13,13,13,13,16,15];
      driverFilter=`A5:${colName(header.length)}${driverRows.length}`;
    }else{
      const totals=result.drivers.reduce((t,d)=>({lm:t.lm+d.linehaulMiles,sm:t.sm+d.spotMiles,tm:t.tm+d.totalMiles,s:t.s+d.singles,db:t.db+d.doubles,mp:t.mp+d.milesPay,sp:t.sp+d.singlesPay,dp:t.dp+d.doublesPay,tp:t.tp+d.totalPay}),{lm:0,sm:0,tm:0,s:0,db:0,mp:0,sp:0,dp:0,tp:0});
      driverRows=[
        {values:['NBL Business Analyzer — Driver Pay'],styles:[7]},
        {values:[`Source: ${result.fileName}`,`Activity: ${result.summary.periodStart || '—'} to ${result.summary.periodEnd || '—'}`]},
        {values:[`Pay Date: ${result.summary.payDate || '—'}`,`Settlement Date: ${result.summary.settlementDate || '—'}`]},
        {values:[`Mileage Rate: $${Number(rates.mileage).toFixed(2)}`,`Single D&H Pay: $${Number(rates.singleDH).toFixed(2)}`,`Double D&H Pay: $${Number(rates.doubleDH).toFixed(2)}`]},
        {values:['Driver','FedEx ID','Linehaul Miles','Spot Miles','Total Miles','D&H @ $12.75','D&H @ $22.25',`Miles Pay @ $${Number(rates.mileage).toFixed(2)}`,`D&H Singles Pay @ $${Number(rates.singleDH).toFixed(2)}`,`D&H Doubles Pay @ $${Number(rates.doubleDH).toFixed(2)}`,'Total Pay'],styles:Array(11).fill(1)}
      ];
      for(const d of result.drivers) driverRows.push({values:[d.name,d.fedexId,d.linehaulMiles,d.spotMiles,d.totalMiles,d.singles,d.doubles,d.milesPay,d.singlesPay,d.doublesPay,d.totalPay],styles:[0,0,2,2,2,2,2,3,3,3,3]});
      driverRows.push({values:['TOTAL','',totals.lm,totals.sm,totals.tm,totals.s,totals.db,totals.mp,totals.sp,totals.dp,totals.tp],styles:[5,5,6,6,6,6,6,4,4,4,4]});
      driverWidths=[27,13,15,12,13,15,15,18,20,21,15];
      driverFilter=`A5:K${driverRows.length}`;
    }

    const s=result.summary;
    const summaryRows=[
      {values:['NBL Business Analyzer — Settlement Summary'],styles:[7]},
      {values:[`Source: ${result.fileName}`,`Activity: ${s.periodStart || '—'} to ${s.periodEnd || '—'}`]},
      {values:[`Settlement Date: ${s.settlementDate || '—'}`,`Pay Date: ${s.payDate || '—'}`]},
      {values:['Metric','Value'],styles:[1,1]},
      {values:['Total Miles',s.totalMiles],styles:[0,2]},
      {values:['Linehaul Miles',s.linehaulMiles],styles:[0,2]},
      {values:['Spot Miles',s.spotMiles],styles:[0,2]},
      {values:['Linehaul Revenue',s.linehaulRevenue],styles:[0,3]},
      {values:['Spot Revenue',s.spotRevenue],styles:[0,3]},
      {values:['Total Revenue',s.totalRevenue],styles:[5,4]},
      {values:['Fuel Expense',s.fuelExpense],styles:[0,3]},
      {values:['DEF Expense',s.defExpense],styles:[0,3]},
      {values:['Other Expense',s.otherExpense],styles:[0,3]},
      {values:['Total Authorized Chargebacks',s.totalAuthorizedChargebacks],styles:[5,4]},
      {values:['Net Amount',s.netAmount],styles:[5,4]}
    ];

    const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="$#,##0.00"/></numFmts><fonts count="4"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FF17324D"/><sz val="16"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF17324D"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD9E2EA"/></left><right style="thin"><color rgb="FFD9E2EA"/></right><top style="thin"><color rgb="FFD9E2EA"/></top><bottom style="thin"><color rgb="FFD9E2EA"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="8"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="3" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="2" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0"/><xf numFmtId="3" fontId="2" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
    const contentTypes=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
    const rootRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
    const workbook=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets><sheet name="Driver Pay" sheetId="1" r:id="rId1"/><sheet name="Settlement Summary" sheetId="2" r:id="rId2"/></sheets></workbook>`;
    const wbRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
    const sheet1=sheetXml(driverRows,driverWidths,driverFreeze,driverFilter);
    const sheet2=sheetXml(summaryRows,[34,20],4,'');
    return makeZip([
      {name:'[Content_Types].xml',data:contentTypes},{name:'_rels/.rels',data:rootRels},
      {name:'xl/workbook.xml',data:workbook},{name:'xl/_rels/workbook.xml.rels',data:wbRels},
      {name:'xl/styles.xml',data:styles},{name:'xl/worksheets/sheet1.xml',data:sheet1},{name:'xl/worksheets/sheet2.xml',data:sheet2}
    ]);
  }


  function makeMeetingsXlsx(meetings) {
    const inspections=Array.isArray(meetings?.inspections)?[...meetings.inspections]:[];
    const managementItems=Array.isArray(meetings?.managementItems)?[...meetings.managementItems]:[];
    inspections.sort((a,b)=>String(b.date||b.createdAt||'').localeCompare(String(a.date||a.createdAt||'')) || Number(a.priority||3)-Number(b.priority||3));
    managementItems.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')) || String(a.dueDate||'').localeCompare(String(b.dueDate||'')));
    const generated=new Date();
    const generatedText=`Generated: ${generated.toLocaleDateString()} ${generated.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`;
    const today=`${generated.getFullYear()}-${String(generated.getMonth()+1).padStart(2,'0')}-${String(generated.getDate()).padStart(2,'0')}`;

    const inspectionRows=[
      {values:['NBL Business Analyzer — Truck Inspection Reports'],styles:[2]},
      {values:[generatedText]},
      {values:['']},
      {values:['Date','Tractor #','Driver Name','Issue','Priority','Addressed'],styles:Array(6).fill(1)}
    ];
    for(const r of inspections){
      const date=r.date || String(r.createdAt||'').slice(0,10) || '';
      const priority=String(r.priority||'3');
      const addressed=String(r.addressed||'N').toUpperCase()==='Y'?'Y':'N';
      const priorityText=priority==='1'?'1 - Immediately':priority==='2'?'2 - Soon':'3 - Can wait';
      const priorityStyle=priority==='1'?5:priority==='2'?6:7;
      const statusStyle=addressed==='Y'?4:5;
      inspectionRows.push({
        values:[date,r.tractorNumber||'',r.driverName||'',r.issue||'',priorityText,addressed],
        styles:[3,3,3,3,priorityStyle,statusStyle]
      });
    }
    if(!inspections.length) inspectionRows.push({values:['No truck inspection reports recorded.'],styles:[3]});

    const managementRows=[
      {values:['NBL Business Analyzer — Management Meeting Items'],styles:[2]},
      {values:[generatedText]},
      {values:['']},
      {values:['Date','Topic','Notes','Responsible','Due Date','Closed'],styles:Array(6).fill(1)}
    ];
    for(const r of managementItems){
      const closed=String(r.closed||'N').toUpperCase()==='Y'?'Y':'N';
      const overdue=closed!=='Y' && r.dueDate && String(r.dueDate)<today;
      managementRows.push({
        values:[r.date||'',r.topic||'',r.notes||'',r.responsible||'',r.dueDate||'',closed],
        styles:[3,3,3,3,overdue?5:3,closed==='Y'?4:5]
      });
    }
    if(!managementItems.length) managementRows.push({values:['No management meeting items recorded.'],styles:[3]});

    const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="4"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FF35164E"/><sz val="16"/><name val="Calibri"/></font><font><b/><color rgb="FF35164E"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="7"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF35164E"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE4F3EA"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFE9E9"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF0F2F5"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD8DDE3"/></left><right style="thin"><color rgb="FFD8DDE3"/></right><top style="thin"><color rgb="FFD8DDE3"/></top><bottom style="thin"><color rgb="FFD8DDE3"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="8"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="3" fillId="5" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="3" fillId="6" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
    const contentTypes=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
    const rootRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
    const workbook=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets><sheet name="Truck Inspections" sheetId="1" r:id="rId1"/><sheet name="Management Items" sheetId="2" r:id="rId2"/></sheets></workbook>`;
    const wbRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
    const inspectionFilter=`A4:F${Math.max(4,4+inspections.length)}`;
    const managementFilter=`A4:F${Math.max(4,4+managementItems.length)}`;
    const sheet1=sheetXml(inspectionRows,[14,14,24,52,20,13],4,inspectionFilter);
    const sheet2=sheetXml(managementRows,[14,30,58,22,14,12],4,managementFilter);
    return makeZip([
      {name:'[Content_Types].xml',data:contentTypes},{name:'_rels/.rels',data:rootRels},
      {name:'xl/workbook.xml',data:workbook},{name:'xl/_rels/workbook.xml.rels',data:wbRels},
      {name:'xl/styles.xml',data:styles},{name:'xl/worksheets/sheet1.xml',data:sheet1},{name:'xl/worksheets/sheet2.xml',data:sheet2}
    ]);
  }



  function makeRecruitmentXlsx(options={}) {
    const headers=Array.isArray(options.headers)?options.headers.map(v=>v==null?'':String(v)):[];
    const dataRows=Array.isArray(options.rows)?options.rows:[];
    const widths=Array.isArray(options.widths)?options.widths:headers.map(()=>18);
    const freezeColumns=Math.max(0,Math.min(Number(options.freezeColumns)||0,headers.length));
    const title=String(options.title||'NBL Business Analyzer — Recruitment Pipeline');
    const generated=new Date();
    const generatedText=`Generated: ${generated.toLocaleDateString()} ${generated.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`;
    const rows=[
      {values:[title],styles:[2]},
      {values:[generatedText]},
      {values:['']},
      {values:headers,styles:Array(headers.length).fill(1)}
    ];
    const daysIndex=headers.findIndex(h=>String(h).toLowerCase()==='days in process');
    for(const row of dataRows){
      const values=headers.map((_,i)=>Array.isArray(row)?(row[i]??''):'');
      const styles=values.map(()=>3);
      if(daysIndex>=0){
        const n=Number(values[daysIndex]);
        if(Number.isFinite(n)) styles[daysIndex]=n>=21?5:n>=11?6:4;
      }
      rows.push({values,styles});
    }
    if(!dataRows.length) rows.push({values:['No recruitment candidates to export.'],styles:[3]});

    const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="4"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FF35164E"/><sz val="16"/><name val="Calibri"/></font><font><b/><color rgb="FF35164E"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF35164E"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE4F3EA"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFE9E9"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD8DDE3"/></left><right style="thin"><color rgb="FFD8DDE3"/></right><top style="thin"><color rgb="FFD8DDE3"/></top><bottom style="thin"><color rgb="FFD8DDE3"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="3" fillId="5" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
    const contentTypes=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
    const rootRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
    const workbook=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets><sheet name="Recruitment" sheetId="1" r:id="rId1"/></sheets></workbook>`;
    const wbRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
    const dim=`A1:${colName(Math.max(headers.length,1))}${rows.length}`;
    const cols=widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${Math.max(8,Number(w)||18)}" customWidth="1"/>`).join('');
    const topLeft=`${colName(Math.min(freezeColumns+1,Math.max(headers.length,1)))}5`;
    const pane=(freezeColumns>0)?`<sheetViews><sheetView workbookViewId="0"><pane xSplit="${freezeColumns}" ySplit="4" topLeftCell="${topLeft}" activePane="bottomRight" state="frozen"/></sheetView></sheetViews>`:`<sheetViews><sheetView workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`;
    const filter=`A4:${colName(Math.max(headers.length,1))}${Math.max(4,rows.length)}`;
    const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="${dim}"/>${pane}<cols>${cols}</cols><sheetData>${rows.map((r,i)=>rowXml(i+1,r.values,r.styles||[])).join('')}</sheetData><autoFilter ref="${filter}"/></worksheet>`;
    return makeZip([
      {name:'[Content_Types].xml',data:contentTypes},{name:'_rels/.rels',data:rootRels},
      {name:'xl/workbook.xml',data:workbook},{name:'xl/_rels/workbook.xml.rels',data:wbRels},
      {name:'xl/styles.xml',data:styles},{name:'xl/worksheets/sheet1.xml',data:sheet}
    ]);
  }


  function makeDispatchXlsx(dispatch, dayNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']) {
    const runs=Array.isArray(dispatch?.runs)?dispatch.runs:[];
    const drivers=Array.isArray(dispatch?.drivers)?dispatch.drivers:[];
    const assignments=Array.isArray(dispatch?.assignments)?dispatch.assignments:[];
    const tractors=Array.isArray(dispatch?.tractors)?dispatch.tractors:[];
    const locations=Array.isArray(dispatch?.locations)?dispatch.locations:[];
    const tractorById=new Map(tractors.map(t=>[t.id,t]));
    const driverById=new Map(drivers.map(d=>[d.id,d]));
    const locationById=new Map(locations.map(l=>[l.id,l.name]));
    const assignment=(runId,day)=>assignments.find(a=>a.runId===runId && Number(a.day)===Number(day));
    const num=v=>{ if(v==null || v==='') return null; const n=Number(v); return Number.isFinite(n)?n:null; };
    const driverAvailable=(driver,day)=>!!driver&&Array.isArray(driver.availability)&&driver.availability.map(Number).includes(Number(day));
    const originAllowed=(driver,run)=>!!driver&&!!run&&(!Array.isArray(driver.origins)||driver.origins.length===0||driver.origins.includes('*')||driver.origins.includes(run.origin));
    const generated=new Date();
    const generatedText=`Generated: ${generated.toLocaleDateString()} ${generated.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`;
    const locationName=String(dispatch?.locationName||dispatch?.location||'Dispatch').trim()||'Dispatch';
    const locationId=String(dispatch?.locationId||'');
    const daySummary=dayNames.map((name,day)=>{const active=runs.filter(r=>(r.days||[]).map(Number).includes(day)),covered=active.filter(r=>!!assignment(r.id,day)).length;return {name,required:active.length,covered};});

    const scheduleHeaderStyles=[1,1,1,1,1,1,...daySummary.map(d=>d.covered===d.required?12:13),1];
    const scheduleRows=[
      {values:[`NBL Business Analyzer — ${locationName} Team Run Coverage`],styles:[8]},
      {values:[generatedText]},
      {values:['PRIMARY','MANUAL','WARNING / OVERRIDE','OPEN','NOT SCHEDULED'],styles:[6,4,9,5,7]},
      {values:['Run','Origin','Type','Tractor','Schedule','Miles / Run',...daySummary.map(d=>`${d.name}\n${d.covered}/${d.required} covered`),'Covered Days'],styles:scheduleHeaderStyles}
    ];
    for(const run of runs){
      const miles=num(run.milesPerRun);
      let covered=0;const dayVals=[],dayStyles=[];
      for(let day=0;day<7;day++){
        if(!(run.days||[]).map(Number).includes(day)){dayVals.push('—');dayStyles.push(7);continue;}
        const a=assignment(run.id,day);
        if(!a){dayVals.push('OPEN\nUnassigned run-day');dayStyles.push(5);continue;}
        covered++;
        const d=driverById.get(a.driverId),primary=run.primaryDriverId===a.driverId,scheduleWarn=!driverAvailable(d,day),driverLoc=String(d?.locationId||''),runLoc=String(run.locationId||locationId||''),locationWarn=!!d&&!!driverLoc&&!!runLoc&&driverLoc!==runLoc,originWarn=!originAllowed(d,run),warn=!!(a.override||scheduleWarn||locationWarn||originWarn);
        const note=scheduleWarn?'Outside regular schedule':(locationWarn?`Assigned to ${locationById.get(driverLoc)||'different location'}`:(originWarn?'Origin override':(primary?'Primary assignment':'Manual assignment')));
        dayVals.push(`${d?.name||a.driverId}${d?.fedexId?` (${d.fedexId})`:''}\n${note}`);
        dayStyles.push(warn?9:(primary?6:4));
      }
      const typeLabel=run.type==='assigned'?'Assigned Run':'Unassigned Run';
      scheduleRows.push({
        values:[run.name||'',run.origin||'',typeLabel,tractorById.get(run.primaryTractorId)?.tractorNumber||'',run.scheduleLabel||'',miles??'',...dayVals,covered],
        styles:[14,14,run.type==='assigned'?10:11,14,14,miles==null?14:2,...dayStyles,2]
      });
    }

    const driverRows=[
      {values:[`NBL Business Analyzer — ${locationName} Driver Availability`],styles:[8]},
      {values:[generatedText]},
      {values:['']},
      {values:['Driver','FedEx ID','Dispatch Location','Role','Regular Schedule','Assigned Days'],styles:Array(6).fill(1)}
    ];
    for(const driver of drivers){
      const assignedDays=new Set(assignments.filter(a=>a.driverId===driver.id).map(a=>Number(a.day))).size;
      driverRows.push({values:[driver.name||'',driver.fedexId||'',locationById.get(driver.locationId)||locationName,driver.role==='urr'?'URR Driver':'Assigned Run Driver',driver.availabilityLabel||'',assignedDays],styles:[14,14,14,14,14,2]});
    }

    const tractorRows=[
      {values:[`NBL Business Analyzer — ${locationName} Tractor Roster`],styles:[8]},
      {values:[generatedText]},
      {values:['']},
      {values:['Tractor #','Assigned Run(s)','VIN','Make / Model','Dispatch Location','Motive Odometer','Motive Status'],styles:Array(7).fill(1)}
    ];
    for(const tractor of tractors){const assignedRuns=runs.filter(r=>r.primaryTractorId===tractor.id).map(r=>r.name).join(', ');tractorRows.push({values:[tractor.tractorNumber||'',assignedRuns,tractor.vin||'',tractor.makeModel||'',locationById.get(tractor.locationId)||locationName,num(tractor.odometer)??'',tractor.motiveStatus||''],styles:[14,14,14,14,14,num(tractor.odometer)==null?14:2,14]});}

    const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="$#,##0.00"/></numFmts><fonts count="5"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FF35164E"/><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FF35164E"/><sz val="16"/><name val="Calibri"/></font><font><b/><color rgb="FF2F3540"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="10"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF35164E"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEEF8F3"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF5F5"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF4EEF8"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF7F7F8"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF7E5"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF4EC"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEAF6EF"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD8DDE3"/></left><right style="thin"><color rgb="FFD8DDE3"/></right><top style="thin"><color rgb="FFD8DDE3"/></top><bottom style="thin"><color rgb="FFD8DDE3"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="18"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="3" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="5" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="6" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="4" fillId="7" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="5" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="8" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"/><xf numFmtId="164" fontId="2" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="164" fontId="2" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
    const contentTypes=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
    const rootRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
    const workbook=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets><sheet name="Run Coverage" sheetId="1" r:id="rId1"/><sheet name="Driver Availability" sheetId="2" r:id="rId2"/><sheet name="Tractor Roster" sheetId="3" r:id="rId3"/></sheets></workbook>`;
    const wbRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
    const sheet1=sheetXml(scheduleRows,[29,16,16,13,16,12,22,22,22,22,22,22,22,13],4,`A4:N${Math.max(4,scheduleRows.length)}`);
    const sheet2=sheetXml(driverRows,[30,14,20,18,22,13],4,`A4:F${Math.max(4,driverRows.length)}`);
    const sheet3=sheetXml(tractorRows,[16,28,22,28,20,18,18],4,`A4:G${Math.max(4,tractorRows.length)}`);
    return makeZip([
      {name:'[Content_Types].xml',data:contentTypes},{name:'_rels/.rels',data:rootRels},
      {name:'xl/workbook.xml',data:workbook},{name:'xl/_rels/workbook.xml.rels',data:wbRels},{name:'xl/styles.xml',data:styles},
      {name:'xl/worksheets/sheet1.xml',data:sheet1},{name:'xl/worksheets/sheet2.xml',data:sheet2},{name:'xl/worksheets/sheet3.xml',data:sheet3}
    ]);
  }

  global.NBLCore = { DEFAULT_RATES, normalizeWindows1252, parseCSV, analyzeSettlement, recalculateDriverPay, reclassifyDef, driverPayCSV, summaryJSON, makeXlsx, makeMeetingsXlsx, makeRecruitmentXlsx, makeDispatchXlsx };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.NBLCore;
})(typeof window !== 'undefined' ? window : globalThis);
