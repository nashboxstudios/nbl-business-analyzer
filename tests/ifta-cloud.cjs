const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
let stale=false,reads=[],saved,firstPage=Array.from({length:500},(_,i)=>({record_key:`synthetic-${i}`,payload:{fileName:'Test.csv',result:{fuelPurchases:[]}}}));
const sandbox={window:{},localStorage:{getItem:()=>JSON.stringify({access_token:'test',expires_at:4102444800,user:{id:'test'}})},URLSearchParams,AbortController,setTimeout,clearTimeout,Date,JSON,Number,String,Math,Set,Map,Uint8Array,TextEncoder,
 fetch:async(url,options={})=>{
  const u=new URL(url);reads.push(u);let data;
  if(u.pathname.endsWith('nbl_fc_finance_records')){assert.equal(u.searchParams.get('organization_id'),'eq.test-org');assert.equal(u.searchParams.get('record_type'),'eq.settlement_statement');data=u.searchParams.get('offset')==='0'?firstPage:[{record_key:'last',payload:{}}];}
  else if(options.method==='POST'){saved=JSON.parse(options.body);data=[saved];}
  else if(options.method==='PATCH'){assert.equal(u.searchParams.get('updated_at'),'eq.expected-version');assert.equal(u.searchParams.get('module_key'),'eq.ifta:2026-Q3');data=stale?[]:[JSON.parse(options.body)];}
  else data=[];
  return {ok:true,text:async()=>JSON.stringify(data)};
 }};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require('path').join(__dirname,'..','cloud.js'),'utf8'),sandbox);
(async()=>{
 const c=sandbox.window.NBLCloud,rows=await c.getIftaFuelCatalog('test-org');assert.equal(rows.length,501);assert.equal(reads.filter(u=>u.pathname.endsWith('nbl_fc_finance_records')).length,2);
 await c.saveIftaReport('test-org','2026-Q3',{key:'2026-Q3'});assert.equal(saved.module_key,'ifta:2026-Q3');assert.equal(saved.organization_id,'test-org');
 await c.saveIftaReport('test-org','2026-Q3',{},'expected-version');stale=true;await assert.rejects(c.saveIftaReport('test-org','2026-Q3',{},'expected-version'),/another session/);
 await assert.rejects(c.getIftaReport('test-org','malformed'),/Invalid/);
 await c.getSnapshots('test-org');assert.equal(reads.at(-1).searchParams.get('module_key'),'not.like.ifta:%');
 console.log('PASS paginated settlement-only retrieval, org/quarter isolation, optimistic save conflicts and exclusion from eager snapshots');
})().catch(e=>{console.error(e);process.exit(1)});
