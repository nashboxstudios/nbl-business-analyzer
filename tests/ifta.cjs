const assert=require('node:assert/strict');
const E=require('../ifta.js');
assert.deepEqual(E.quarterRange(2024,1),{year:2024,quarter:1,key:'2024-Q1',start:'2024-01-01',end:'2024-03-31'});
assert.equal(E.quarterRange(2026,4).end,'2026-12-31');
assert.throws(()=>E.quarterRange(2026,5));
assert.equal(E.parseDate('01-JUL-2026'),'2026-07-01');
assert.equal(E.parseDate('31-SEP-2026'),null);
assert.equal(E.parseDate('2026-02-29'),null);
const fuel=(date,ticket,qty,state='TN',vehicle='test-tractor')=>({date,ticket,qty,state,vehicle,vendor:'Test vendor'});
const statements=[
 {id:'early',settlementDate:'2026-07-10',result:{fuelPurchases:[fuel('30-JUN-2026','outside1',99),fuel('01-JUL-2026','first',10.12)]}},
 {id:'late',settlementDate:'2026-10-09',result:{fuelPurchases:[fuel('30-SEP-2026','last',20.23),fuel('01-OCT-2026','outside2',99),fuel('01-JUL-2026','first',10.12),fuel('15-AUG-2026','ga',30,'GA')]}}
];
const trip=(id,date,distance,jurisdiction='TN')=>({id,date,distance,jurisdiction,vehicle:{number:'test-tractor',metric_units:true}});
const trips=[trip(1,'2026-07-01',100.125),trip(2,'2026-09-30',200.125),trip(3,'2026-08-01',50,'Florida'),trip(1,'2026-07-01',100.125),trip(4,'2026-10-01',1000)];
const r=E.buildReport(2026,3,trips,statements);
assert.equal(r.duplicates,2);assert.equal(r.tripCount,3);assert.equal(r.purchases.length,3);
assert.equal(r.rows.find(x=>x.code==='TN').taxPaidGallons,30.35);
assert.equal(r.rows.find(x=>x.code==='TN').totalMiles,300.25,'No per-trip rounding, response explicitly imperial even with metric vehicle config');
assert.equal(r.rows.find(x=>x.code==='FL').taxPaidGallons,0,'Mileage-only states kept with zero gallons');
assert.equal(r.rows.find(x=>x.code==='GA').totalMiles,0,'Fuel-only states kept');
assert(!E.exportReady(r));r.mileageReviewed=r.fuelReviewed=true;assert(E.exportReady(r));
r.purchases[0].included=false;E.recalculate(r);assert.equal(r.rows.find(x=>x.code==='TN').taxPaidGallons,20.23);
r.rows[0].taxableMiles=-1;assert(E.validate(r).length);assert(!E.exportReady(r));
const conflicting=E.buildReport(2026,3,[trip(1,'2026-07-01',10),trip(1,'2026-07-01',20)],[{result:{fuelPurchases:[fuel('01-JUL-2026','same',10),fuel('01-JUL-2026','same',11)]}}]);
assert.equal(conflicting.issues.length,2,'Conflicting copies block export');
const invalid=E.buildReport(2026,3,[trip(1,'bad',10),trip(2,'2026-07-01','bad','XX')],[{result:{fuelPurchases:[fuel('01-JUL-2026','',4)]}}]);
assert.equal(invalid.issues.length,3);
const empty=E.buildReport(2026,3,[],[]);empty.mileageReviewed=empty.fuelReviewed=true;assert(!E.exportReady(empty));
console.log('PASS quarter boundaries, strict dates, transaction-date selection, late statements, deduplication/conflicts, mileage/fuel-only states, rounding, units, review gating and exclusions');
