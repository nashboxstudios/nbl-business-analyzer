(() => {
  'use strict';
  const Core = window.NBLCore;
  const DB_NAME = 'nbl-payroll-local';
  const DB_STORE = 'settings';
  const HANDLE_KEY = 'dataFolder';
  const FINANCE_SECURITY_KEY = 'financeSecurity';
  const MEETING_LAYOUT_VERSION = 1;
  const FINANCE_AUTOLOCK_MS = 15 * 60 * 1000;
  const MEETING_COLUMN_DEFAULTS = {
    inspection:[105,110,170,360,140,110,125],
    management:[105,240,430,170,115,90,125]
  };
  const MEETING_COLUMN_MINIMUMS = {
    inspection:[85,90,120,180,120,90,110],
    management:[85,140,180,120,100,75,110]
  };
  const HR_RECRUITMENT_LAYOUT_VERSION = 5;
  const HR_RECRUITMENT_STATUSES = ['In Progress','Hired','Rejected','Terminated'];
  const HR_RECRUITMENT_FIXED_COLUMNS = ['name'];
  const HR_RECRUITMENT_DEFAULT_ORDER = ['name','domicile','doubles','fadvStatus','notes','equipmentFam','roadTest','drugTest','offerLetter','startDate','recruitmentStatus','daysInProcess','actions'];
  const HR_RECRUITMENT_DEFAULT_WIDTHS = {
    name:190,email:220,phone:150,domicile:145,fedexId:105,shift:90,type:110,doubles:210,dateAdded:110,screeningInterview:135,fadvStatus:120,notes:240,opsInterview:120,equipmentFam:110,roadTest:115,drugTest:110,offerLetter:120,startDate:110,recruitmentStatus:135,daysInProcess:120,actions:190
  };
  const HR_RECRUITMENT_MIN_WIDTHS = {
    name:120,email:150,phone:115,domicile:110,fedexId:80,shift:75,type:90,doubles:170,dateAdded:95,screeningInterview:105,fadvStatus:100,notes:160,opsInterview:100,equipmentFam:95,roadTest:100,drugTest:100,offerLetter:105,startDate:95,recruitmentStatus:110,daysInProcess:100,actions:170
  };
  const HR_RECRUITMENT_LABELS = {
    name:'Name',email:'Email',phone:'Phone',domicile:'Location / Domicile',fedexId:'FedEx ID',shift:'Shift',type:'Type',doubles:'Doubles',dateAdded:'Date Added',screeningInterview:'Screening Interview',fadvStatus:'FADV Status',notes:'Notes',opsInterview:'Ops Interview',equipmentFam:'Equipment Fam',roadTest:'Road Test',drugTest:'Drug Test',offerLetter:'Offer Letter',startDate:'Start Date',recruitmentStatus:'Recruitment Status',daysInProcess:'Days in Process',actions:'Actions'
  };
  function defaultMeetingData(){
    return {
      version:2,
      inspections:[],
      managementItems:[],
      layoutVersion:MEETING_LAYOUT_VERSION,
      columnWidths:{
        inspection:[...MEETING_COLUMN_DEFAULTS.inspection],
        management:[...MEETING_COLUMN_DEFAULTS.management]
      }
    };
  }
  function normalizedMeetingWidths(type,widths){
    const defaults=MEETING_COLUMN_DEFAULTS[type];
    const minimums=MEETING_COLUMN_MINIMUMS[type];
    const raw=Array.isArray(widths)?widths:[];
    return defaults.map((fallback,i)=>{
      const n=Number(raw[i]);
      return Number.isFinite(n) ? Math.max(minimums[i],Math.round(n)) : fallback;
    });
  }
  function ensureMeetingLayout(){
    if(!state.meetings || typeof state.meetings!=='object') state.meetings=defaultMeetingData();
    if(!Array.isArray(state.meetings.inspections)) state.meetings.inspections=[];
    if(!Array.isArray(state.meetings.managementItems)) state.meetings.managementItems=[];
    const stored=state.meetings.columnWidths||{};
    state.meetings.version=Math.max(2,Number(state.meetings.version)||1);
    state.meetings.layoutVersion=MEETING_LAYOUT_VERSION;
    state.meetings.columnWidths={
      inspection:normalizedMeetingWidths('inspection',stored.inspection),
      management:normalizedMeetingWidths('management',stored.management)
    };
  }

  function defaultIvmrLocationData(){
    return {version:1,updatedAt:'builtin-v72',locations:[
      {id:'ivmr_loc_419_clarksville',spot:'419',city:'Clarksville',state:'TN',lat:36.56870,lon:-87.23920,radius_miles:5,aliases:['Clarksville']},
      {id:'ivmr_loc_379_knoxville',spot:'379',city:'Knoxville',state:'TN',lat:35.96000,lon:-84.14500,radius_miles:10,aliases:['Knoxville','Farragut']},
      {id:'ivmr_loc_378_lebanon',spot:'378',city:'Lebanon',state:'TN',lat:36.04247,lon:-86.39473,radius_miles:3,aliases:['Lebanon']},
      {id:'ivmr_loc_371_nashville',spot:'371',city:'Nashville',state:'TN',lat:null,lon:null,radius_miles:8,aliases:['Nashville']},
      {id:'ivmr_loc_382_mount_juliet',spot:'382',city:'Mount Juliet',state:'TN',lat:null,lon:null,radius_miles:8,aliases:['Mount Juliet']},
      {id:'ivmr_loc_293_spartanburg',spot:'293',city:'Spartanburg',state:'SC',lat:null,lon:null,radius_miles:8,aliases:['Spartanburg']},
      {id:'ivmr_loc_282_charlotte',spot:'282',city:'Charlotte',state:'NC',lat:null,lon:null,radius_miles:8,aliases:['Charlotte']},
      {id:'ivmr_loc_296_greenville',spot:'296',city:'Greenville',state:'SC',lat:null,lon:null,radius_miles:8,aliases:['Greenville']},
      {id:'ivmr_loc_303_ellenwood',spot:'303',city:'Ellenwood',state:'GA',lat:null,lon:null,radius_miles:8,aliases:['Ellenwood']},
      {id:'ivmr_loc_280_concord',spot:'280',city:'Concord',state:'NC',lat:null,lon:null,radius_miles:8,aliases:['Concord']},
      {id:'ivmr_loc_297_fort_mill',spot:'297',city:'Fort Mill',state:'SC',lat:null,lon:null,radius_miles:8,aliases:['Fort Mill']},
      {id:'ivmr_loc_389_olive_branch',spot:'389',city:'Olive Branch',state:'MS',lat:null,lon:null,radius_miles:8,aliases:['Olive Branch']},
      {id:'ivmr_loc_377_370_murfreesboro',spot:'377,370',city:'Murfreesboro',state:'TN',lat:null,lon:null,radius_miles:8,aliases:['Murfreesboro']},
      {id:'ivmr_loc_huntingburg',spot:'HUNTINGBURG EXPRESS',city:'Huntingburg',state:'IN',lat:null,lon:null,radius_miles:8,aliases:['Huntingburg']},
      {id:'ivmr_loc_clinton',spot:'',city:'Clinton',state:'SC',lat:null,lon:null,radius_miles:8,aliases:['Clinton']},
      {id:'ivmr_loc_reidville',spot:'',city:'Reidville',state:'SC',lat:null,lon:null,radius_miles:8,aliases:['Reidville']},
      {id:'ivmr_loc_greer',spot:'',city:'Greer',state:'SC',lat:null,lon:null,radius_miles:8,aliases:['Greer']},
      {id:'ivmr_loc_monroe',spot:'',city:'Monroe',state:'NC',lat:null,lon:null,radius_miles:8,aliases:['Monroe']},
      {id:'ivmr_loc_roebuck',spot:'',city:'Roebuck',state:'SC',lat:null,lon:null,radius_miles:8,aliases:['Roebuck']},
      {id:'ivmr_loc_gantt',spot:'',city:'Gantt',state:'SC',lat:null,lon:null,radius_miles:8,aliases:['Gantt']}
    ]};
  }
  function ivmrLocationLabel(loc){
    const spot=String(loc?.spot||'').trim(), city=String(loc?.city||'').trim();
    return spot&&city?`${spot} - ${city}`:(spot||city);
  }
  let state = {
    result:null, file:null, rawBytes:null, rawText:'', directoryHandle:null,
    catalog:[], currentStatementId:null, currentScreen:'dashboard', autosaveTimer:null,
    dashboard:{mileage:[],preferences:null},
    settlement:{activeTab:'summary',analysisStatementId:null,duplicates:[]},
    maintenance:{version:3,tractors:[],records:[],faultCodes:[],tasks:[],faultQuery:{tractorNumber:'',startDate:'',endDate:'',loadedAt:null}}, maintenanceLoaded:false, lastMmrPdf:null,
    meetings:defaultMeetingData(), meetingsLoaded:false,
    hr:defaultHrData(), hrLoaded:false, recruitmentSearch:'', recruitmentStatusFilter:'', recruitmentSort:{key:'',dir:'asc'}, hrSsn:{draftFull:'',legacyLast4:'',revealed:false,existingCandidate:false,accessResolver:null}, hrApplicationMismatch:{resolver:null},
    audit:{version:1,audits:[],findings:[],activeTab:'dashboard',selectedAuditId:''}, auditLoaded:false,
    dispatch:defaultDispatchData(), dispatchLoaded:false, dispatchSelectedDriverId:null,
    motive:{backendAvailable:false,configured:false,keyHint:'',storage:'',vehicles:[],drivers:[],driversLoaded:false,driversLastSync:null,driversError:'',lastSync:null,test:null,loading:false,geofences:null,geofencesLoading:false,geofencesError:'',geofencesRequest:0},
    safety:{version:3,startDate:'',endDate:'',scorecards:[],performanceEvents:[],speedingEvents:[],assignments:{},dismissals:{},driverRecords:{},trendDriverId:'',loadedAt:null,loading:false,error:'',accessErrors:{},driverFilter:'all',eventTypeFilter:'all',statusFilter:'active',rankSort:{key:'adjusted',dir:'asc'}},
    ivmr:{startDate:'',endDate:'',rawTrips:[],trips:[],formatBuilt:false,loadedAt:null,loading:false,routeLoading:false,routeCancelRequested:false,routeStats:null,routeProgress:null,lastPdf:null,historyTest:{loading:false,result:null,error:''}},
    ivmrLocations:defaultIvmrLocationData(), ivmrLocationsLoaded:false,
    ivmrDirectory:{loading:false,attempted:false,request:0,note:''},
    cloud:{connected:false,user:null,profile:null,membership:null,organization:null,snapshots:{},hasSnapshotData:false,lastSync:null,syncing:false,users:[],usersLoading:false,structured:{safety:false,dailyDispatch:false,maintenance:false,recruitment:false,finance:false,audit:false,meetings:false}},
    finance:{configured:false,unlocked:false,config:null,pendingScreen:null,autoLockTimer:null},
    payroll:{version:2,profiles:{},periods:{},dhMappings:{}}, payrollLoaded:false,
    payrollHos:{loading:false,lastPeriodKey:'',lastError:''},
    reportsCloudRefreshing:false,
    dailyDispatchHubOpen:{},
    financialAnalysis:{version:1,fileName:'',importedAt:'',periods:[]}
  };
  let maintenanceOdometerLookupSeq=0;
  const $ = id => document.getElementById(id);
  const fmtMoney = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n)||0);
  const fmtNum = n => new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(Number(n)||0);
  const fmtOptionalMoney = n => (n==null || n==='') ? '—' : fmtMoney(n);
  const optionalNumber = v => { const s=String(v??'').trim(); if(!s) return null; const n=Number(s); return Number.isFinite(n)?Math.round(n*100)/100:null; };
  const fmtDate = iso => {
    if (!iso) return '—';
    const d = new Date(`${iso}T12:00:00`);
    return isNaN(d) ? iso : new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(d);
  };
  const sanitize = s => String(s||'').replace(/[^a-zA-Z0-9._-]+/g,'_').replace(/^_+|_+$/g,'');
  const AUDIT_TEMPLATE = [
    {id:'vedr_recording',category:'VEDR',check:'Device is Recording, Lens is Clean and Unobstructed'},
    {id:'vedr_alerts',category:'VEDR',check:'Driver alerts functioning'},
    {id:'vedr_compliance',category:'VEDR',check:'All Devices Show Compliance in GC/Motive. Devices not being used must be put Out Of Service.'},
    {id:'vedr_coaching',category:'VEDR',check:'All KI Events Are Coached & Addressed OR Disputed'},
    {id:'vedr_phone_holders',category:'VEDR',check:'Cell Phone Holders In Place and being used'},
    {id:'eld_device',category:'ELD',check:'Device powers on with ignition, Login & HOS entries working.'},
    {id:'eld_transmitting',category:'ELD',check:'Logs transmitting to carrier/portal.'},
    {id:'eld_driver_login',category:'ELD',check:"Verify all drivers are logging in. Make note of those who aren't and communicate with BC."},
    {id:'eld_hos',category:'ELD',check:'Verify all drivers are within HOS limits.'},
    {id:'eld_unidentified',category:'ELD',check:'All unidentified drivers cleared'},
    {id:'eld_conflicts',category:'ELD',check:'All conflicts cleared'},
    {id:'eld_certified',category:'ELD',check:'All logs certified'},
    {id:'eld_info',category:'ELD',check:'All info entered - shipping docs, signature etc.'},
    {id:'mileage_recorded',category:'Mileage Reports',check:'Verify that mileage for all trucks is being recorded.'},
    {id:'mileage_transmitted',category:'Mileage Reports',check:'All data transmitted to FedEx'},
    {id:'sf_training',category:'Safety Forward',check:'All drivers current on their mandatory trainings - by the 15th'},
    {id:'sf_inspections',category:'Safety Forward',check:'All drivers performing pre/post trip inspections'},
    {id:'sf_connection_pics',category:'Safety Forward',check:'Connection Pics: Trailer door closed, trailer coupled'},
    {id:'connect_reading',category:'ConnectTeams',check:'All drivers are connected and reading messages'},
    {id:'connect_questions',category:'ConnectTeams',check:'Drivers are answering safety questions'},
    {id:'revvo_sensors',category:'Revvo TPMS',check:'All sensors installed and active'},
    {id:'revvo_green',category:'Revvo TPMS',check:'All tires must show green'}
  ];
  const AUDIT_CATEGORIES = [...new Set(AUDIT_TEMPLATE.map(x=>x.category))];

  const CLOUD_MODULES=['dashboard','safety','hr','driver_pay','maintenance','meetings','audit','dispatch','settlement','ivmr'];
  const CLOUD_MODULE_LABELS={dashboard:'Dashboard',safety:'Safety',hr:'Recruitment / HR',driver_pay:'Driver Pay',maintenance:'Maintenance',meetings:'Meetings',audit:'Audit',dispatch:'Dispatch',settlement:'Settlement / Revenue Finder',ivmr:'IVMR'};
  const SCREEN_MODULE_MAP={dashboard:'dashboard',safety:'safety',drivers:'driver_pay',summary:'settlement','settlement-reports':'reports','financial-analysis':'reports',revenue:'settlement',maintenance:'maintenance','trip-inspections':'maintenance','fault-codes':'maintenance','maintenance-tasks':'maintenance',meetings:'meetings',hr:'hr','recruitment-test':'hr',audit:'audit',dispatch:'dispatch','daily-dispatch':'dispatch',ivmr:'ivmr',ifta:'settlement',motive:'motive'};
  const FINANCE_MODULE_KEYS=new Set(['driver_pay','settlement','revenue','reports']);
  function cloudConnected(){ return !!state.cloud?.connected; }
  function currentRole(){
    const databaseRole=String(state.cloud?.membership?.role||'').trim().toLowerCase();
    const accessRole=String(currentModulePermissions().access_role||'').trim().toLowerCase();
    return databaseRole==='operations'&&['operations','lead_driver'].includes(accessRole)?accessRole:databaseRole;
  }
  function currentModulePermissions(){ const p=state.cloud?.membership?.module_permissions; return p&&typeof p==='object'?p:{}; }
  function isOwnerAccount(){ return currentRole()==='owner'; }
  function canAccessModuleKey(moduleKey,writeAccess=false){
    if(!cloudConnected()) return true; // local/offline build keeps the legacy local behavior
    const key=String(moduleKey||'').trim();
    const role=currentRole(), perms=currentModulePermissions();
    if(FINANCE_MODULE_KEYS.has(key)) return role==='owner';
    if(role==='owner') return true;
    if(key==='dashboard') return true;
    if(key==='hr'&&role==='lead_driver') return !writeAccess;
    if(['operations','lead_driver'].includes(role) && ['safety','maintenance','meetings','dispatch','audit','ivmr','motive','hr'].includes(key)) return true;
    return false;
  }
  function canAccessScreen(screen){
    if(screen==='ifta'&&cloudConnected())return isOwnerAccount();
    if(screen==='hr'&&cloudConnected()&&currentRole()==='lead_driver') return false;
    if(screen==='users') return cloudConnected() && isOwnerAccount();
    const moduleKey=SCREEN_MODULE_MAP[screen];
    return moduleKey ? canAccessModuleKey(moduleKey,false) : true;
  }
  function firstAccessibleScreen(){
    return ['dashboard','safety','drivers','summary','financial-analysis','settlement-reports','revenue','maintenance','meetings','dispatch','audit','ivmr','motive','hr'].find(canAccessScreen)||'dashboard';
  }
  function applyAccessVisibility(){
    if(!cloudConnected()) return;
    document.querySelectorAll('.nav-btn[data-screen]').forEach(btn=>btn.classList.toggle('hidden',!canAccessScreen(btn.dataset.screen)));
    $('financeLockStatus')?.classList.toggle('hidden',!isOwnerAccount());
    $('financeSecurityBtn')?.classList.toggle('hidden',!isOwnerAccount());
    $('cloudImportLocalOption')?.classList.toggle('hidden',!isOwnerAccount());
    $('userAccessNav')?.classList.toggle('hidden',!isOwnerAccount());
    document.querySelector('[data-finance-nav="reports"]')?.classList.toggle('hidden',!isOwnerAccount());
    ['folderStatus','chooseFolderBtn','refreshFolderBtn','emptyChooseFolderBtn','uploadStatementBtn','emptyUploadStatementBtn'].forEach(id=>$(id)?.classList.toggle('hidden',!isOwnerAccount()));
    document.querySelector('[data-nav-group="finance"]')?.classList.toggle('hidden',!isOwnerAccount());
    document.querySelector('[data-nav-group="compliance"]')?.classList.toggle('hidden',!isOwnerAccount());
    document.querySelectorAll('.nav-group').forEach(group=>{
      if(group.dataset.navGroup==='finance'||group.dataset.navGroup==='compliance') return;
      const hasVisibleChild=[...group.querySelectorAll('.nav-btn[data-screen]')].some(btn=>!btn.classList.contains('hidden'));
      group.classList.toggle('hidden',!hasVisibleChild);
    });
    if(!isOwnerAccount()){
      state.finance.unlocked=false;
      if(state.finance.autoLockTimer) clearTimeout(state.finance.autoLockTimer);
      state.finance.autoLockTimer=null;
    }
  }
  function hasWorkspace(){ return !!state.directoryHandle || cloudConnected(); }
  function workspaceLabel(){
    if(state.directoryHandle) return state.directoryHandle.name;
    const name=state.cloud?.organization?.name||'Nashbox Logistics';
    return cloudConnected()?`${name} • Cloud`:'No workspace';
  }
  function cloneJson(value){ return value==null?value:JSON.parse(JSON.stringify(value)); }
  function sanitizedHrForCloud(){
    const data=cloneJson(state.hr||defaultHrData());
    for(const c of data?.candidates||[]){
      delete c.ssnFull; delete c.ssn; delete c.socialSecurityNumber;
      if(c.roadTestForm && typeof c.roadTestForm==='object'){
        delete c.roadTestForm.ssnFull; delete c.roadTestForm.ssn; delete c.roadTestForm.socialSecurityNumber;
      }
    }
    data.cloudPrivacy={fullSsnStored:false,note:'Full SSNs intentionally excluded from v81 cloud snapshots.'};
    return data;
  }
  function settlementSnapshot(){
    const all=[],seen=new Set();
    for(const item of [...(state.catalog||[]),...(state.settlement?.duplicates||[]).map(x=>x.item).filter(Boolean)]){
      const key=String(item.id||item.relativePath||`${item.settlementDate}:${item.fingerprint||settlementFingerprint(item.result)}`);if(seen.has(key))continue;seen.add(key);all.push(item);
    }
    return {
      version:92,
      currentStatementId:state.currentStatementId||null,
      analysisStatementId:state.settlement?.analysisStatementId||null,
      catalog:all.map(x=>({
        id:x.id,relativePath:x.relativePath||x.id,fileName:x.fileName||'',settlementDate:x.settlementDate||'',payDate:x.payDate||'',fingerprint:x.fingerprint||settlementFingerprint(x.result),result:cloneJson(x.result||{})
      })),
      updatedAt:new Date().toISOString()
    };
  }
  function settlementCloudItem(item){
    if(!item)return null;
    return {id:item.id,relativePath:item.relativePath||item.id,fileName:item.fileName||'',settlementDate:item.settlementDate||'',payDate:item.payDate||'',fingerprint:item.fingerprint||settlementFingerprint(item.result),result:cloneJson(item.result||{})};
  }
  function settlementCloudSettings(){
    return {version:92,currentStatementId:state.currentStatementId||null,analysisStatementId:state.settlement?.analysisStatementId||null,updatedAt:new Date().toISOString()};
  }
  function dashboardMileageSnapshot(){
    const mileage=[];
    for(const item of state.catalog||[]){
      for(const [type,list] of [['linehaul',item.result?.linehaul||[]],['spot',item.result?.spots||[]]]){
        for(const trip of list){
          const d=parseFlexibleDate(trip.date), miles=Number(trip.miles)||0;
          if(d&&!isNaN(d)&&miles) mileage.push({date:isoLocal(d),type,miles});
        }
      }
    }
    return {version:110,mileage,updatedAt:new Date().toISOString()};
  }
  function normalizeCloudSettlementCatalog(data){
    const ss=data&&typeof data==='object'?data:{};
    let source=Array.isArray(ss.catalog)?ss.catalog:
      Array.isArray(ss.statements)?ss.statements:
      Array.isArray(ss.items)?ss.items:[];
    // Earlier cloud imports could contain the selected settlement as a single
    // result instead of a catalog. Preserve compatibility with those snapshots.
    if(!source.length){
      const result=ss.result||ss.currentResult||ss.settlementResult;
      if(result&&typeof result==='object') source=[{
        id:ss.currentStatementId||ss.id||'cloud/current-settlement',
        fileName:ss.fileName||ss.sourceFile||'Cloud settlement',
        settlementDate:ss.settlementDate||result.summary?.settlementDate||'',
        payDate:ss.payDate||result.summary?.payDate||'',result
      }];
    }
    source=source.map((entry,index)=>{
      const result=cloneJson(entry?.result||entry?.analysis||entry?.data||{});
      result.summary ||= {};
      const settlementDate=String(entry?.settlementDate||result.summary.settlementDate||'');
      const payDate=String(entry?.payDate||result.summary.payDate||'');
      result.summary.settlementDate=settlementDate;
      result.summary.payDate=payDate;
      const id=String(entry?.id||entry?.relativePath||`cloud/settlement-${settlementDate||index+1}`);
      return {...entry,id,relativePath:entry?.relativePath||id,fileName:entry?.fileName||entry?.name||'Cloud settlement',settlementDate,payDate,fingerprint:String(entry?.fingerprint||settlementFingerprint(result)),file:null,rawBytes:null,rawText:'',lastModified:Number(entry?.lastModified)||0};
    }).filter(x=>x.result&&typeof x.result==='object')
      .sort((a,b)=>String(b.settlementDate||'').localeCompare(String(a.settlementDate||''))||String(a.fileName||'').localeCompare(String(b.fileName||'')));
    const deduped=dedupeSettlementCatalog(source);
    state.settlement.duplicates=deduped.duplicates;
    return deduped.active;
  }
  function ivmrCloudSnapshot(){
    return {
      version:81,
      facilityDirectorySource:cloneJson(state.cloud?.snapshots?.ivmr?.data?.facilityDirectorySource||null),
      locations:cloneJson(state.ivmrLocations||defaultIvmrLocationData()),
      current:{
        startDate:state.ivmr?.startDate||'',endDate:state.ivmr?.endDate||'',
        rawTrips:cloneJson(state.ivmr?.rawTrips||[]),trips:cloneJson(state.ivmr?.trips||[]),
        formatBuilt:!!state.ivmr?.formatBuilt,loadedAt:state.ivmr?.loadedAt||null,
        routeStats:cloneJson(state.ivmr?.routeStats||null),routeProgress:null
      },
      updatedAt:new Date().toISOString()
    };
  }
  function resetCloudBackedState(){
    state.ivmrDirectory={loading:false,attempted:false,request:state.ivmrDirectory.request+1,note:''};
    state.motive.geofences=null; state.motive.geofencesError=''; state.motive.geofencesLoading=false; state.motive.geofencesRequest++;
    window.NBLIFTA?.reset();
    window.NBLRecruitmentTest?.reset();
    state.result=null; state.file=null; state.rawBytes=null; state.rawText=''; state.catalog=[]; state.currentStatementId=null;
    state.settlement={activeTab:'summary',analysisStatementId:null};
    state.maintenance={version:3,tractors:[],records:[],faultCodes:[],tasks:[],faultQuery:{tractorNumber:'',startDate:'',endDate:'',loadedAt:null}}; state.maintenanceLoaded=false;
    state.meetings=defaultMeetingData(); state.meetingsLoaded=false;
    state.hr=defaultHrData(); state.hrLoaded=false; state.recruitmentSearch=''; state.recruitmentStatusFilter='';
    state.audit={version:1,audits:[],findings:[],activeTab:'dashboard',selectedAuditId:''}; state.auditLoaded=false;
    state.dispatch=defaultDispatchData(); state.dispatchLoaded=false; state.dispatchSelectedDriverId=null;
    state.safety={version:3,startDate:'',endDate:'',scorecards:[],performanceEvents:[],speedingEvents:[],assignments:{},dismissals:{},driverRecords:{},trendDriverId:'',loadedAt:null,loading:false,error:'',accessErrors:{},driverFilter:'all',eventTypeFilter:'all',statusFilter:'active',rankSort:{key:'adjusted',dir:'asc'}};
    state.ivmr={startDate:'',endDate:'',rawTrips:[],trips:[],formatBuilt:false,loadedAt:null,loading:false,routeLoading:false,routeCancelRequested:false,routeStats:null,routeProgress:null,lastPdf:null,historyTest:{loading:false,result:null,error:''}};
    setIvmrDefaultDates(); state.ivmrLocations=defaultIvmrLocationData(); state.ivmrLocationsLoaded=false;
    state.payroll={version:2,profiles:{},periods:{},dhMappings:{}}; state.payrollLoaded=false;
    populateDateSelectors();
  }
  function cloudSnapshotForModule(moduleKey){
    if(moduleKey==='dashboard') return dashboardMileageSnapshot();
    if(moduleKey==='safety') return {version:3,assignments:cloneJson(state.safety?.assignments||{}),dismissals:cloneJson(state.safety?.dismissals||{}),driverRecords:cloneJson(state.safety?.driverRecords||{})};
    if(moduleKey==='hr') return sanitizedHrForCloud();
    if(moduleKey==='driver_pay') return cloneJson(state.payroll||{version:2,profiles:{},periods:{},dhMappings:{}});
    if(moduleKey==='maintenance') return cloneJson(state.maintenance||{version:3,tractors:[],records:[],faultCodes:[],tasks:[],faultQuery:{tractorNumber:'',startDate:'',endDate:'',loadedAt:null}});
    if(moduleKey==='meetings') return cloneJson(state.meetings||defaultMeetingData());
    if(moduleKey==='audit') return {...cloneJson(state.audit||{version:1,audits:[],findings:[]}),safetyState:cloudSnapshotForModule('safety')};
    if(moduleKey==='dispatch'){
      const snapshot=cloneJson(state.dispatch||defaultDispatchData());
      if(state.cloud?.structured?.dailyDispatch) snapshot.dailyBoards={};
      return snapshot;
    }
    if(moduleKey==='settlement') return settlementSnapshot();
    if(moduleKey==='ivmr') return ivmrCloudSnapshot();
    return {};
  }
  function cloudSetProgress(message,type='info'){
    const el=$('cloudSyncProgress'); if(!el)return;
    el.classList.remove('hidden'); el.dataset.type=type; el.innerHTML=message;
  }
  function renderCloudModules(){
    const el=$('cloudSyncModules'); if(!el)return;
    const visible=CLOUD_MODULES.filter(k=>canAccessModuleKey(k,false));
    el.innerHTML=visible.map(k=>{
      const snap=state.cloud?.snapshots?.[k]||(k==='safety'&&state.cloud?.snapshots?.audit?.data?.safetyState?state.cloud.snapshots.audit:null), cls=snap?'synced':'';
      const suffix=snap?.updated_at?` • ${new Date(snap.updated_at).toLocaleString()}`:'';
      return `<span class="cloud-module-pill ${cls}">${escapeHtml(CLOUD_MODULE_LABELS[k])}${escapeHtml(suffix)}</span>`;
    }).join('');
  }
  function updateCloudUI(){
    const status=$('cloudStatus'), signOut=$('cloudSignOutBtn');
    if(status){
      status.classList.toggle('connected',cloudConnected()); status.classList.remove('error');
      const small=status.querySelector('small');
      if(small) small.textContent=cloudConnected()?`${state.cloud.user?.email||'Signed in'} • ${state.cloud.membership?.role||'member'}`:'Not signed in';
    }
    if(signOut) signOut.classList.toggle('hidden',!cloudConnected());
    const sidebarUser=$('sidebarUserSummary');
    if(sidebarUser){
      const name=displayPersonName(state.cloud?.profile?.full_name||state.cloud?.user?.email?.split('@')[0]||'NBL User');
      const role=state.cloud?.membership?.role||'member';
      const strong=sidebarUser.querySelector('strong'), small=sidebarUser.querySelector('small'), avatar=sidebarUser.querySelector('.sidebar-user-avatar');
      if(strong) strong.textContent=name;
      if(small) small.textContent=cloudConnected()?`${role} account`:'Local workspace';
      if(avatar) avatar.textContent=(String(name).trim().charAt(0)||'N').toUpperCase();
    }
    const summary=$('cloudAccountSummary');
    if(summary){
      summary.innerHTML=cloudConnected()
        ? `<strong>${escapeHtml(state.cloud.organization?.name||'Nashbox Logistics')}</strong><br>${escapeHtml(displayPersonName(state.cloud.profile?.full_name||state.cloud.user?.email||''))} • ${escapeHtml(state.cloud.user?.email||'')} • Role: ${escapeHtml(state.cloud.membership?.role||'member')}${state.cloud.lastSync?`<br>Last cloud sync: ${escapeHtml(new Date(state.cloud.lastSync).toLocaleString())}`:''}`
        : 'Not connected to NBL Cloud.';
    }
    const profileBtn=$('myProfileBtn'); if(profileBtn) profileBtn.classList.toggle('hidden',!cloudConnected());
    applyAccessVisibility();
    renderCloudModules();
  }
  async function saveCloudModule(moduleKey,silent=true,options={}){
    if(!cloudConnected()||!window.NBLCloud||!state.cloud?.organization?.id) return false;
    try{
      const orgId=state.cloud.organization.id,structured=state.cloud.structured||{};
      if(moduleKey==='maintenance'&&structured.maintenance){await window.NBLCloud.saveMaintenanceData(orgId,cloneJson(state.maintenance));state.cloud.lastSync=new Date().toISOString();updateCloudUI();return true;}
      if(moduleKey==='hr'){
        if(!structured.recruitment)throw new Error('Recruitment cloud storage is not ready. Refresh FleetCommand before saving.');
        await window.NBLCloud.saveRecruitmentData(orgId,sanitizedHrForCloud(),options);state.cloud.lastSync=new Date().toISOString();updateCloudUI();return true;
      }
      if(moduleKey==='driver_pay'&&structured.finance){await window.NBLCloud.saveDriverPayData(orgId,cloneJson(state.payroll));state.cloud.lastSync=new Date().toISOString();updateCloudUI();return true;}
      if(moduleKey==='settlement'&&structured.finance){
        if(options.full){
          await window.NBLCloud.saveSettlementData(orgId,settlementSnapshot());
        }else{
          const current=state.catalog.find(x=>x.id===state.currentStatementId)||state.catalog.find(x=>x.id===state.settlement?.analysisStatementId)||null;
          await window.NBLCloud.saveSettlementChanges(orgId,{...settlementCloudSettings(),statements:current?[settlementCloudItem(current)]:[]});
        }
        const dashboardData=dashboardMileageSnapshot(),dashboardRow=await window.NBLCloud.saveSnapshot(orgId,'dashboard',dashboardData,'109');
        state.cloud.snapshots.dashboard=dashboardRow||{module_key:'dashboard',data:dashboardData,source_version:'109',updated_at:new Date().toISOString()};state.dashboard.mileage=dashboardData.mileage;state.cloud.lastSync=new Date().toISOString();updateCloudUI();return true;
      }
      if(moduleKey==='audit'&&structured.audit){await window.NBLCloud.saveAuditData(orgId,cloneJson(state.audit));state.cloud.lastSync=new Date().toISOString();updateCloudUI();return true;}
      if(moduleKey==='meetings'&&structured.meetings){await window.NBLCloud.saveMeetingData(orgId,cloneJson(state.meetings));state.cloud.lastSync=new Date().toISOString();updateCloudUI();return true;}
      const storageKey=moduleKey==='safety'?'audit':moduleKey;
      const storageData=cloudSnapshotForModule(storageKey);
      const row=await window.NBLCloud.saveSnapshot(state.cloud.organization.id,storageKey,storageData,'109',storageKey==='ivmr'?(state.cloud.snapshots.ivmr?.updated_at||null):undefined);
      state.cloud.snapshots[storageKey]=row||{module_key:storageKey,data:storageData,source_version:'109',updated_at:new Date().toISOString()};
      if(moduleKey==='safety') state.cloud.snapshots.safety={module_key:'safety',data:cloudSnapshotForModule('safety'),source_version:'109',updated_at:state.cloud.snapshots[storageKey].updated_at};
      if(moduleKey==='settlement'){
        const dashboardData=dashboardMileageSnapshot();
        const dashboardRow=await window.NBLCloud.saveSnapshot(state.cloud.organization.id,'dashboard',dashboardData,'100');
        state.cloud.snapshots.dashboard=dashboardRow||{module_key:'dashboard',data:dashboardData,source_version:'100',updated_at:new Date().toISOString()};
        state.dashboard.mileage=dashboardData.mileage;
      }
      state.cloud.hasSnapshotData=true; state.cloud.lastSync=new Date().toISOString(); updateCloudUI();
      return true;
    }catch(err){
      console.error(`Cloud save failed for ${moduleKey}`,err);
      if(!silent) showAlert(`Could not save ${escapeHtml(CLOUD_MODULE_LABELS[moduleKey]||moduleKey)} to NBL Cloud: ${escapeHtml(err.message||String(err))}`,'error');
      return false;
    }
  }
  async function ensureFinanceCloudStorage(){
    if(!cloudConnected())return;
    if(state.cloud.structured?.finance&&cloudStructuredLoaded.has('finance'))return;
    let job=cloudStructuredLoading.get('finance');
    if(!job){
      job=loadStructuredOperationalData(true,['finance']).finally(()=>cloudStructuredLoading.delete('finance'));
      cloudStructuredLoading.set('finance',job);
    }
    await job;
    if(!state.cloud.structured?.finance||!window.NBLCloud?.saveSettlementChanges)throw new Error('Settlement storage is not ready. Refresh FleetCommand and try again.');
  }
  async function saveSettlementUploadChanges(statements,deleteKeys=[]){
    await ensureFinanceCloudStorage();
    const orgId=state.cloud.organization.id;
    await window.NBLCloud.saveSettlementChanges(orgId,{...settlementCloudSettings(),statements:(statements||[]).map(settlementCloudItem).filter(Boolean),deleteKeys});
    const dashboardData=dashboardMileageSnapshot(),dashboardRow=await window.NBLCloud.saveSnapshot(orgId,'dashboard',dashboardData,'118');
    state.cloud.snapshots.dashboard=dashboardRow||{module_key:'dashboard',data:dashboardData,source_version:'118',updated_at:new Date().toISOString()};
    state.dashboard.mileage=dashboardData.mileage;state.cloud.lastSync=new Date().toISOString();updateCloudUI();
    return true;
  }
  function hydrateCloudSnapshots(snapshots){
    const get=k=>snapshots?.[k]?.data;
    if(get('dashboard')) state.dashboard.mileage=Array.isArray(get('dashboard').mileage)?cloneJson(get('dashboard').mileage):[];
    if(get('driver_pay')){ state.payroll={version:2,profiles:{},periods:{},dhMappings:{},...cloneJson(get('driver_pay'))}; state.payrollLoaded=true; }
    if(get('maintenance')){ state.maintenance={version:3,tractors:[],records:[],faultCodes:[],tasks:[],faultQuery:{tractorNumber:'',startDate:'',endDate:'',loadedAt:null},...cloneJson(get('maintenance'))}; state.maintenanceLoaded=true; }
    if(get('meetings')){ state.meetings={...defaultMeetingData(),...cloneJson(get('meetings'))}; ensureMeetingLayout(); state.meetingsLoaded=true; }
    if(get('hr')){
      const data={...defaultHrData(),...cloneJson(get('hr'))};
      data.candidates=(data.candidates||[]).map(c=>({...c,ssnFull:'',ssnLast4:String(c.ssnLast4||'').replace(/\D/g,'').slice(-4)}));
      ensureRecruitmentLayout(data); state.hr=data; state.hrLoaded=true;
    }
    if(get('audit')){ state.audit={version:1,audits:[],findings:[],activeTab:'dashboard',selectedAuditId:'',...cloneJson(get('audit'))}; state.auditLoaded=true; }
    const safetyData=get('safety')||get('audit')?.safetyState;
    if(safetyData){ state.safety.assignments=cloneJson(safetyData.assignments||{}); state.safety.dismissals=cloneJson(safetyData.dismissals||{}); state.safety.driverRecords=cloneJson(safetyData.driverRecords||{}); }
    if(get('dispatch')){ state.dispatch={...defaultDispatchData(),...cloneJson(get('dispatch'))}; state.dispatchLoaded=true; }
    if(get('settlement')){
      const ss=cloneJson(get('settlement'))||{};
      state.catalog=normalizeCloudSettlementCatalog(ss);
      state.currentStatementId=ss.currentStatementId||state.catalog[0]?.id||null;
      state.settlement.analysisStatementId=ss.analysisStatementId||state.catalog[0]?.id||null;
      if(!state.dashboard.mileage.length) state.dashboard.mileage=dashboardMileageSnapshot().mileage;
    }
    if(get('ivmr')){
      const iv=cloneJson(get('ivmr'))||{};
      if(iv.locations){ state.ivmrLocations=normalizeIvmrLocationData(iv.locations); state.ivmrLocationsLoaded=true; }
      if(iv.current){ state.ivmr={...state.ivmr,...iv.current,routeLoading:false,routeCancelRequested:false,loading:false,historyTest:state.ivmr.historyTest}; }
    }
    syncSharedDriverRoster();
    populateDateSelectors();
    let target=state.currentStatementId&&state.catalog.find(x=>x.id===state.currentStatementId)?state.currentStatementId:state.catalog[0]?.id;
    if(target) selectStatement(target,false); else { state.result=null; state.file=null; state.rawBytes=null; state.rawText=''; }
    renderAll(); updateFolderUI(); updateCloudUI();
  }
  async function refreshSettlementReportsFromCloud(showMessage=false){
    if(!cloudConnected()||state.directoryHandle||state.reportsCloudRefreshing) return false;
    state.reportsCloudRefreshing=true;
    const btn=$('generateSettlementReportsBtn');
    if(btn){ btn.disabled=true; btn.textContent='Loading Cloud Data…'; }
    try{
      if(state.cloud.structured?.finance&&window.NBLCloud.getFinanceData){
        const finance=await window.NBLCloud.getFinanceData(state.cloud.organization.id);
        state.payroll={version:2,profiles:{},periods:{},dhMappings:{},...cloneJson(finance.payroll||{})};state.payrollLoaded=true;
        const settlement=cloneJson(finance.settlement||{}),catalog=normalizeCloudSettlementCatalog(settlement);
        state.catalog=catalog;state.currentStatementId=settlement.currentStatementId||catalog[0]?.id||null;
        const selected=catalog.find(x=>x.id===state.currentStatementId)||catalog[0];if(selected){state.currentStatementId=selected.id;state.result=selected.result;}
        populateDateSelectors();initializeSettlementReportDates();$('fileMeta').textContent=`${workspaceLabel()} • ${state.catalog.length} settlement${state.catalog.length===1?'':'s'} available for reporting`;
        if(showMessage)showAlert(state.catalog.length?'Settlement Reports refreshed from NBL Cloud.':'NBL Cloud is connected, but no settlement history was found.',state.catalog.length?'success':'warning');return !!state.catalog.length;
      }
      const snaps=await window.NBLCloud.getSnapshots(state.cloud.organization.id);
      state.cloud.snapshots=snaps||state.cloud.snapshots||{};
      const payroll=snaps?.driver_pay?.data;
      if(payroll&&typeof payroll==='object'){
        state.payroll={version:2,profiles:{},periods:{},dhMappings:{},...cloneJson(payroll)};
        state.payrollLoaded=true;
      }
      const settlement=snaps?.settlement?.data;
      if(settlement&&typeof settlement==='object'){
        const catalog=normalizeCloudSettlementCatalog(settlement);
        if(catalog.length){
          state.catalog=catalog;
          state.currentStatementId=settlement.currentStatementId||catalog[0].id;
          const selected=catalog.find(x=>x.id===state.currentStatementId)||catalog[0];
          state.currentStatementId=selected.id; state.result=selected.result;
        }
      }
      populateDateSelectors();
      initializeSettlementReportDates();
      $('fileMeta').textContent=`${workspaceLabel()} • ${state.catalog.length} settlement${state.catalog.length===1?'':'s'} available for reporting`;
      if(showMessage) showAlert(state.catalog.length?'Settlement Reports refreshed from NBL Cloud.':'NBL Cloud is connected, but no settlement history was found in the Settlement snapshot.',state.catalog.length?'success':'warning');
      return !!state.catalog.length;
    }catch(err){
      console.error('Could not refresh Settlement Reports cloud data',err);
      if(showMessage) showAlert(`Could not load Settlement Reports from NBL Cloud: ${escapeHtml(err.message||String(err))}`,'error');
      return false;
    }finally{
      state.reportsCloudRefreshing=false;
      if(btn){ btn.disabled=false; btn.textContent='Generate Reports'; }
    }
  }
  async function loadCloudWorkspace(showMessage=false){
    if(!cloudConnected()) return false;
    try{
      const snaps=await window.NBLCloud.getSnapshots(state.cloud.organization.id);
      state.cloud.snapshots=snaps||{}; state.cloud.hasSnapshotData=Object.keys(snaps||{}).length>0;
      const times=Object.values(snaps||{}).map(x=>x?.updated_at).filter(Boolean).sort(); state.cloud.lastSync=times.at(-1)||null;
      if(state.cloud.hasSnapshotData){ resetCloudBackedState(); hydrateCloudSnapshots(snaps); }
      else { updateCloudUI(); renderAll(); }
      if(showMessage) showAlert(state.cloud.hasSnapshotData?'Reloaded the latest NBL Cloud data.':'NBL Cloud is connected, but no module data has been uploaded yet. Use Cloud Sync to import your existing local NBL data.','success');
      return true;
    }catch(err){ console.error(err); if(showMessage) showAlert(`Could not load NBL Cloud data: ${escapeHtml(err.message||String(err))}`,'error'); return false; }
  }
  const cloudStructuredLoaded=new Set(),cloudStructuredLoading=new Map();
  async function loadStructuredOperationalData(silent=true,onlyFlags=null){
    if(!cloudConnected()||!window.NBLCloud||!state.cloud?.organization?.id)return false;
    const requested=onlyFlags?new Set(onlyFlags):null;
    const orgId=state.cloud.organization.id,legacySafety=cloudSnapshotForModule('safety'),legacyBoards=cloneJson(state.dispatch.dailyBoards||{});let loaded=false;
    const structuredLoads=[
      ['maintenance','getMaintenanceData','saveMaintenanceData',()=>cloneJson(state.maintenance),data=>{state.maintenance={version:3,tractors:[],records:[],faultCodes:[],tasks:[],faultQuery:{tractorNumber:'',startDate:'',endDate:'',loadedAt:null},...cloneJson(data)};state.maintenanceLoaded=true;}],
      ['recruitment','getRecruitmentData','saveRecruitmentData',()=>sanitizedHrForCloud(),data=>{const next={...defaultHrData(),...cloneJson(data)};next.candidates=(next.candidates||[]).map(c=>({...c,ssnFull:'',ssnLast4:String(c.ssnLast4||'').replace(/\D/g,'').slice(-4)}));ensureRecruitmentLayout(next);state.hr=next;state.hrLoaded=true;}],
      ['audit','getAuditData','saveAuditData',()=>cloneJson(state.audit),data=>{state.audit={version:1,audits:[],findings:[],activeTab:'dashboard',selectedAuditId:'',...cloneJson(data)};state.auditLoaded=true;}],
      ['meetings','getMeetingData','saveMeetingData',()=>cloneJson(state.meetings),data=>{state.meetings={...defaultMeetingData(),...cloneJson(data)};ensureMeetingLayout();state.meetingsLoaded=true;}]
    ];
    const jobs=[];
    if(!requested||requested.has('safety'))jobs.push((async()=>{try{const safety=await window.NBLCloud.getSafetyData(orgId);state.cloud.structured.safety=true;if(safety.actionCount||safety.recordCount){state.safety.assignments=cloneJson(safety.assignments||{});state.safety.dismissals=cloneJson(safety.dismissals||{});state.safety.driverRecords=cloneJson(safety.driverRecords||{});}else if(Object.keys(legacySafety.assignments).length||Object.keys(legacySafety.dismissals).length||Object.keys(legacySafety.driverRecords).length)await window.NBLCloud.saveSafetyData(orgId,legacySafety);cloudStructuredLoaded.add('safety');loaded=true;}catch(err){state.cloud.structured.safety=false;console.warn('Dedicated Safety storage is not ready',err);if(!silent)showAlert(`Dedicated Safety storage is unavailable: ${escapeHtml(err.message||String(err))}`,'warning');}})());
    if(!requested||requested.has('dailyDispatch'))jobs.push((async()=>{try{const boards=await window.NBLCloud.getDailyDispatchBoards(orgId);state.cloud.structured.dailyDispatch=true;if(Object.keys(boards||{}).length)state.dispatch.dailyBoards=boards;else for(const board of Object.values(legacyBoards))if(board?.date&&Array.isArray(board.rows))await window.NBLCloud.saveDailyDispatchBoard(orgId,board);cloudStructuredLoaded.add('dailyDispatch');loaded=true;}catch(err){state.cloud.structured.dailyDispatch=false;console.warn('Dedicated Daily Dispatch storage is not ready',err);if(!silent)showAlert(`Dedicated Daily Dispatch storage is unavailable: ${escapeHtml(err.message||String(err))}`,'warning');}})());
    structuredLoads.filter(([flag])=>!requested||requested.has(flag)).forEach(([flag,getter,saver,legacy,hydrate])=>jobs.push((async()=>{try{const data=await window.NBLCloud[getter](orgId);state.cloud.structured[flag]=true;if(data.recordCount||data.readOnly)hydrate(data);else await window.NBLCloud[saver](orgId,legacy(),flag==='recruitment'?{full:true}:{});cloudStructuredLoaded.add(flag);loaded=true;}catch(err){state.cloud.structured[flag]=false;console.warn(`Dedicated ${flag} storage is not ready`,err);if(!silent)showAlert(`Dedicated ${escapeHtml(flag)} storage is unavailable: ${escapeHtml(err.message||String(err))}`,'warning');}})()));
    if(isOwnerAccount()&&(!requested||requested.has('finance')))jobs.push((async()=>{try{const finance=await window.NBLCloud.getFinanceData(orgId);state.cloud.structured.finance=true;if(finance.recordCount){state.payroll={version:2,profiles:{},periods:{},dhMappings:{},...cloneJson(finance.payroll||{})};state.payrollLoaded=true;const ss=cloneJson(finance.settlement||{});state.catalog=normalizeCloudSettlementCatalog(ss);state.currentStatementId=ss.currentStatementId||state.catalog[0]?.id||null;state.settlement.analysisStatementId=ss.analysisStatementId||state.catalog[0]?.id||null;}else{await Promise.all([window.NBLCloud.saveDriverPayData(orgId,cloneJson(state.payroll)),window.NBLCloud.saveSettlementData(orgId,settlementSnapshot())]);}cloudStructuredLoaded.add('finance');loaded=true;}catch(err){state.cloud.structured.finance=false;console.warn('Dedicated finance storage is not ready',err);if(!silent)showAlert(`Dedicated Finance storage is unavailable: ${escapeHtml(err.message||String(err))}`,'warning');}})());
    await Promise.all(jobs);
    syncSharedDriverRoster();populateDateSelectors();const target=state.currentStatementId&&state.catalog.find(x=>x.id===state.currentStatementId)?state.currentStatementId:state.catalog[0]?.id;if(target)selectStatement(target,false);
    renderAll();updateCloudUI();return loaded;
  }
  function structuredFlagForScreen(screen){
    if(screen==='safety')return 'safety';
    if(screen==='daily-dispatch')return 'dailyDispatch';
    if(['maintenance','fault-codes','maintenance-tasks','ivmr'].includes(screen))return 'maintenance';
    if(['meetings','trip-inspections'].includes(screen))return 'meetings';
    if(screen==='hr')return 'recruitment';
    if(screen==='audit')return 'audit';
    if(['drivers','summary','settlement-reports','financial-analysis','revenue'].includes(screen))return 'finance';
    return '';
  }
  function ensureScreenCloudData(screen){
    const flag=structuredFlagForScreen(screen);
    if(!flag||!cloudConnected()||cloudStructuredLoaded.has(flag)||cloudStructuredLoading.has(flag))return;
    const job=loadStructuredOperationalData(true,[flag]).finally(()=>cloudStructuredLoading.delete(flag));
    cloudStructuredLoading.set(flag,job);
  }
  async function establishCloudSession(session){
    state.cloud.user=session?.user||null;
    const membership=await window.NBLCloud.getMembership();
    if(!membership) throw new Error('This account is not an active member of a Nashbox Logistics workspace.');
    state.cloud.membership=membership; state.cloud.organization=membership.organization||{id:membership.organization_id,name:'Nashbox Logistics'}; state.cloud.connected=true;
    try{ state.cloud.profile=await window.NBLCloud.getProfile(); }catch(_){ state.cloud.profile=null; }
    applyAccessVisibility();
    $('cloudLoginOverlay')?.classList.add('hidden');
    updateCloudUI(); renderAll(); setScreen('dashboard');
    // Authentication is complete at this point. Load business data separately so
    // a slow module cannot trap the user on the sign-in overlay.
    setTimeout(async()=>{
      try{
        await loadCloudWorkspace(false);
        await loadStructuredOperationalData(true,['dailyDispatch','maintenance','meetings']);
        updateCloudUI(); renderAll();
      }catch(err){
        console.error('Background cloud startup failed',err);
        showAlert(`FleetCommand opened, but some cloud data could not be loaded: ${escapeHtml(err.message||String(err))}. Use Cloud Sync to retry.`,'warning');
      }
    },0);
    return true;
  }
  async function initCloudBridge(){
    updateCloudUI();
    if(!window.NBLCloud){ $('cloudLoginError').textContent='NBL Cloud could not initialize.'; $('cloudLoginError').classList.remove('hidden'); return false; }
    try{
      const session=await window.NBLCloud.getSession();
      if(session){ await establishCloudSession(session); return true; }
    }catch(err){ console.warn('Cloud session restore failed',err); window.NBLCloud.clearSession(); }
    $('cloudLoginOverlay')?.classList.remove('hidden'); updateCloudUI(); return false;
  }
  async function cloudLoginFromForm(e){
    e.preventDefault();
    const btn=$('cloudLoginBtn'), errEl=$('cloudLoginError');
    errEl?.classList.add('hidden'); if(btn){btn.disabled=true;btn.textContent='Signing In…';}
    try{
      const session=await window.NBLCloud.signIn($('cloudLoginEmail').value.trim(),$('cloudLoginPassword').value);
      await establishCloudSession(session);
      $('cloudLoginPassword').value='';
      setTimeout(async()=>{try{await loadMotiveStatus();}catch(err){console.warn('Motive status check failed',err);}},0);
    }catch(err){ if(errEl){errEl.textContent=err.message||String(err);errEl.classList.remove('hidden');} }
    finally{ if(btn){btn.disabled=false;btn.textContent='Sign In';} }
  }
  async function cloudSignOut(){
    try{ await window.NBLCloud?.signOut(); }catch(_){ }
    state.cloud={connected:false,user:null,profile:null,membership:null,organization:null,snapshots:{},hasSnapshotData:false,lastSync:null,syncing:false,users:[],usersLoading:false,structured:{safety:false,dailyDispatch:false,maintenance:false,recruitment:false,finance:false,audit:false,meetings:false}};
    cloudStructuredLoaded.clear();cloudStructuredLoading.clear();
    resetCloudBackedState(); lockFinance(); renderAll(); updateCloudUI();
    $('cloudLoginOverlay')?.classList.remove('hidden'); closeModal('cloudSyncModal');
  }
  async function ensureLocalImportFolder(){
    if(state.directoryHandle && await requestPermission(state.directoryHandle,'readwrite')) return true;
    if(!('showDirectoryPicker' in window)){ showAlert('Importing the existing local NBL data folder requires Chrome or Microsoft Edge on a computer with the folder available.','warning'); return false; }
    try{
      state.directoryHandle=await window.showDirectoryPicker({mode:'readwrite'}); await idbSet(HANDLE_KEY,state.directoryHandle); updateFolderUI(); return true;
    }catch(err){ if(err?.name!=='AbortError') showAlert(`Could not open the local NBL data folder: ${escapeHtml(err.message||String(err))}`,'error'); return false; }
  }
  async function syncLocalToCloud(){
    if(state.cloud.syncing) return;
    if(!cloudConnected()){ showAlert('Sign in to NBL Cloud first.','warning'); return; }
    if(!isOwnerAccount()){ showAlert('Only the NBL Owner account can import a local data folder into NBL Cloud.','warning'); return; }
    if(!(await ensureLocalImportFolder())) return;
    state.cloud.syncing=true; const btn=$('cloudImportLocalBtn'); if(btn){btn.disabled=true;btn.textContent='Importing…';}
    try{
      cloudSetProgress('Reading the current local NBL data folder…');
      await scanFolder(null,true);
      let done=0;
      for(const key of CLOUD_MODULES){
        cloudSetProgress(`Uploading ${escapeHtml(CLOUD_MODULE_LABELS[key])}… (${done+1}/${CLOUD_MODULES.length})`);
        const ok=await saveCloudModule(key,true,['settlement','hr'].includes(key)?{full:true}:{}); if(!ok) throw new Error(`Cloud upload failed for ${CLOUD_MODULE_LABELS[key]}.`); done++;
      }
      cloudSetProgress(`<strong>Migration complete.</strong> ${done} NBL modules were uploaded. Full SSNs were not uploaded.`,'success');
      showAlert(`NBL Cloud migration complete. <strong>${done}</strong> modules uploaded from ${escapeHtml(state.directoryHandle.name)}. Your local data folder was not changed.`,'success');
      renderAll(); updateCloudUI();
    }catch(err){ console.error(err); cloudSetProgress(`<strong>Migration stopped:</strong> ${escapeHtml(err.message||String(err))}`,'error'); showAlert(`Cloud migration stopped: ${escapeHtml(err.message||String(err))}`,'error'); }
    finally{ state.cloud.syncing=false; if(btn){btn.disabled=false;btn.textContent='Import / Upload Local NBL Data';} }
  }
  async function reloadFromCloud(){
    if(!cloudConnected()) return;
    cloudSetProgress('Loading the latest cloud copy…');
    const ok=await loadCloudWorkspace(true);if(ok){cloudStructuredLoaded.clear();await loadStructuredOperationalData(false,['dailyDispatch','maintenance','meetings',structuredFlagForScreen(state.currentScreen)].filter(Boolean));}
    cloudSetProgress(ok?'Cloud data reloaded.':'Cloud reload failed.',ok?'success':'error');
  }
  function openCloudSync(){ updateCloudUI(); $('cloudSyncProgress')?.classList.add('hidden'); openModal('cloudSyncModal'); }

  const USER_ACCESS_ROLES=[
    ['operations','Operations Manager'],['lead_driver','Lead Driver']
  ];
  function displayPersonName(value){
    const name=String(value||'').trim();
    return name.toLowerCase()==='mayur'?'Mayur':name;
  }
  function userRoleLabel(role){
    if(String(role||'').toLowerCase()==='owner') return 'Owner';
    return USER_ACCESS_ROLES.find(x=>x[0]===String(role||'').toLowerCase())?.[1]||String(role||'member');
  }
  function userRoleOptions(selected){
    return USER_ACCESS_ROLES.map(([value,label])=>`<option value="${value}" ${value===selected?'selected':''}>${label}</option>`).join('');
  }
  async function loadUserAccess(force=false){
    if(!cloudConnected()||!isOwnerAccount()||state.cloud.usersLoading) return;
    if(state.cloud.users?.length && !force){ renderUserAccess(); return; }
    state.cloud.usersLoading=true; renderUserAccess();
    try{
      const data=await localApi('/api/admin/users',{timeoutMs:20000});
      state.cloud.userServiceConfigured=!!data.configured;
      state.cloud.users=Array.isArray(data.users)?data.users:[];
    }catch(err){
      state.cloud.userServiceConfigured=false;
      state.cloud.userAccessError=err.message||String(err);
    }finally{
      state.cloud.usersLoading=false; renderUserAccess();
    }
  }
  function renderUserAccess(){
    const table=$('userAccessTable'); if(!table) return;
    const status=$('userAccessServiceStatus');
    if(status){
      const configured=state.cloud.userServiceConfigured;
      status.className=`cloud-sync-warning ${configured?'user-access-ready':'user-access-needs-key'}`;
      status.innerHTML=configured
        ? '<strong>User management is ready</strong><p>Only the Owner can create or change access. Operations Managers and Lead Drivers can use Dashboard, Safety, Operations, and Recruitment only.</p>'
        : `<strong>User creation needs one Railway secret</strong><p>${escapeHtml(state.cloud.userAccessError||'Add SUPABASE_SECRET_KEY under Railway → web → Variables. The key stays server-side and is never exposed to users.')}</p>`;
    }
    const createBtn=$('createNblUserBtn'); if(createBtn) createBtn.disabled=!state.cloud.userServiceConfigured || state.cloud.usersLoading;
    const count=$('userAccessCount'); if(count) count.textContent=`${(state.cloud.users||[]).length} profile${(state.cloud.users||[]).length===1?'':'s'}`;
    table.querySelector('thead').innerHTML='<tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last Sign In</th><th>Actions</th></tr>';
    if(state.cloud.usersLoading){ table.querySelector('tbody').innerHTML='<tr><td colspan="6" class="empty-table-cell">Loading user profiles…</td></tr>'; return; }
    const users=state.cloud.users||[];
    table.querySelector('tbody').innerHTML=users.length?users.map(u=>{
      const owner=String(u.role||'').toLowerCase()==='owner';
      const uid=escapeHtml(u.user_id||'');
      const last=u.last_sign_in_at?new Date(u.last_sign_in_at).toLocaleString():'—';
      return `<tr data-user-access-row="${uid}">
        <td>${owner?`<strong>${escapeHtml(displayPersonName(u.full_name||'Owner'))}</strong>`:`<input class="user-access-name" value="${escapeHtml(displayPersonName(u.full_name||''))}" placeholder="Full name">`}</td>
        <td>${escapeHtml(u.email||'')}</td>
        <td>${owner?'<span class="status-pill yes">Owner</span>':`<select class="user-access-role">${userRoleOptions(String(u.role||'').toLowerCase())}</select>`}</td>
        <td>${owner?'<span class="status-pill yes">Active</span>':`<select class="user-access-status"><option value="active" ${u.status==='active'?'selected':''}>Active</option><option value="inactive" ${u.status==='inactive'?'selected':''}>Inactive</option></select>`}</td>
        <td>${escapeHtml(last)}</td>
        <td>${owner?'<span class="muted">Protected owner profile</span>':`<button type="button" class="button secondary" data-save-user-access="${uid}">Save Access</button>`}</td>
      </tr>`;
    }).join(''):'<tr><td colspan="6" class="empty-table-cell">No NBL user profiles found.</td></tr>';
    if(isOwnerAccount() && !state.cloud.usersLoading && !state.cloud.users?.length && state.cloud.userServiceConfigured!==false) setTimeout(()=>loadUserAccess(),0);
  }
  async function createNblUserFromForm(e){
    e.preventDefault();
    if(!isOwnerAccount()){ showAlert('Only the Owner can create NBL users.','warning'); return; }
    const btn=$('createNblUserBtn');
    const payload={
      full_name:String($('newNblUserName')?.value||'').trim(),
      email:String($('newNblUserEmail')?.value||'').trim(),
      password:String($('newNblUserPassword')?.value||''),
      role:String($('newNblUserRole')?.value||'operations')
    };
    if(!payload.full_name||!payload.email||payload.password.length<10){ showAlert('Enter the user’s name, email, and a temporary password of at least 10 characters.','warning'); return; }
    try{
      if(btn){btn.disabled=true;btn.textContent='Creating…';}
      await localApi('/api/admin/users/create',{method:'POST',body:JSON.stringify(payload),timeoutMs:25000});
      e.target.reset(); if($('newNblUserRole')) $('newNblUserRole').value='operations';
      await loadUserAccess(true);
      showAlert(`NBL profile created for <strong>${escapeHtml(payload.email)}</strong>. Give the user the temporary password directly and have them change it under My Profile after signing in.`,'success');
    }catch(err){ showAlert(`Could not create the NBL user: ${escapeHtml(err.message||String(err))}`,'error'); }
    finally{ if(btn){btn.disabled=!state.cloud.userServiceConfigured;btn.textContent='Create User';} }
  }
  async function saveUserAccess(userId){
    const row=document.querySelector(`[data-user-access-row="${CSS.escape(String(userId||''))}"]`); if(!row) return;
    const payload={user_id:userId,full_name:String(row.querySelector('.user-access-name')?.value||'').trim(),role:row.querySelector('.user-access-role')?.value,status:row.querySelector('.user-access-status')?.value};
    try{
      await localApi('/api/admin/users/update',{method:'POST',body:JSON.stringify(payload),timeoutMs:20000});
      await loadUserAccess(true); showAlert('User access updated.','success');
    }catch(err){ showAlert(`Could not update user access: ${escapeHtml(err.message||String(err))}`,'error'); }
  }
  function openMyProfile(){
    if(!cloudConnected()) return;
    $('myProfileName').value=displayPersonName(state.cloud.profile?.full_name||'');
    $('myProfileEmail').value=state.cloud.user?.email||'';
    $('myProfileRole').value=userRoleLabel(currentRole());
    $('myProfileNewPassword').value=''; $('myProfileConfirmPassword').value='';
    $('myProfileError')?.classList.add('hidden'); openModal('myProfileModal');
  }
  async function saveMyProfileFromForm(e){
    e.preventDefault();
    const name=displayPersonName($('myProfileName')?.value||'');
    const password=String($('myProfileNewPassword')?.value||'');
    const confirm=String($('myProfileConfirmPassword')?.value||'');
    const err=$('myProfileError');
    if(!name){ if(err){err.textContent='Enter your name.';err.classList.remove('hidden');} return; }
    if(password && password.length<10){ if(err){err.textContent='New passwords must have at least 10 characters.';err.classList.remove('hidden');} return; }
    if(password!==confirm){ if(err){err.textContent='The new password and confirmation do not match.';err.classList.remove('hidden');} return; }
    try{
      state.cloud.profile=await window.NBLCloud.saveProfile(name);
      if(password) await window.NBLCloud.updatePassword(password);
      updateCloudUI(); closeModal('myProfileModal'); showAlert(password?'Profile and password updated.':'Profile updated.','success');
    }catch(ex){ if(err){err.textContent=ex.message||String(ex);err.classList.remove('hidden');} }
  }

  function showAlert(message, type='warning') {
    $('alertArea').innerHTML = message ? `<div class="alert ${type}">${message}</div>` : '';
  }
  function escapeHtml(s){return String(s==null?'':s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}


  const FINANCE_SCREENS = new Set(['drivers','summary','settlement-reports','financial-analysis','revenue','ifta']);
  function isFinanceScreen(screen){ return FINANCE_SCREENS.has(screen); }
  function randomBytes(n){ const b=new Uint8Array(n); crypto.getRandomValues(b); return b; }
  function bytesToB64url(bytes){
    let bin=''; for(const b of new Uint8Array(bytes)) bin+=String.fromCharCode(b);
    return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  function b64urlToBytes(s){
    s=String(s||'').replace(/-/g,'+').replace(/_/g,'/'); while(s.length%4) s+='=';
    const bin=atob(s), out=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i); return out;
  }
  async function hashFinanceCode(code,salt){
    const raw=new TextEncoder().encode(`${salt}:${code}:NBL-FINANCE`);
    if(crypto.subtle){ const digest=await crypto.subtle.digest('SHA-256',raw); return bytesToB64url(digest); }
    let h=2166136261; for(const b of raw){ h^=b; h=Math.imul(h,16777619); } return String(h>>>0);
  }
  async function loadFinanceSecurity(){
    try{
      const cfg=await idbGet(FINANCE_SECURITY_KEY);
      state.finance.config=cfg||null;
      state.finance.configured=!!(cfg&&cfg.hash&&cfg.salt);
    }catch(err){ console.warn('Could not load finance security settings',err); }
    state.finance.unlocked=false;
    updateFinanceSecurityUI();
  }
  async function saveFinanceSecurity(cfg){
    state.finance.config=cfg; state.finance.configured=!!(cfg&&cfg.hash&&cfg.salt);
    await idbSet(FINANCE_SECURITY_KEY,cfg);
    updateFinanceSecurityUI();
  }
  function updateFinanceSecurityUI(){
    const ownerAllowed=!cloudConnected() || isOwnerAccount();
    if(!ownerAllowed) state.finance.unlocked=false;
    const unlocked=ownerAllowed && !!state.finance.unlocked;
    const status=$('financeLockStatus');
    if(status){ status.classList.toggle('unlocked',unlocked); status.classList.toggle('locked',!unlocked); status.querySelector('small').textContent=unlocked?'Unlocked':'Locked'; }
    document.querySelectorAll('.protected-nav .nav-lock').forEach(el=>el.textContent=unlocked?'🔓':'🔒');
    const btn=$('financeSecurityBtn'); if(btn) btn.textContent=unlocked?'Finance Security / Lock':'Finance Security';
  }
  function scheduleFinanceAutoLock(){
    if(state.finance.autoLockTimer) clearTimeout(state.finance.autoLockTimer);
    if(!state.finance.unlocked) return;
    state.finance.autoLockTimer=setTimeout(()=>lockFinance('Finance modules locked after 15 minutes of inactivity.'),FINANCE_AUTOLOCK_MS);
  }
  function noteFinanceActivity(){ if(state.finance.unlocked) scheduleFinanceAutoLock(); }
  function unlockFinanceSuccess(method='code'){
    state.finance.unlocked=true;
    updateFinanceSecurityUI(); scheduleFinanceAutoLock();
    closeModal('financeSecurityModal');
    const target=state.finance.pendingScreen; state.finance.pendingScreen=null;
    if(target) setScreen(target); else setScreen(state.currentScreen);
    showAlert(`Finance modules unlocked${method==='device'?' with device authentication':''}.`,'success');
  }
  function lockFinance(message='Finance modules locked.'){
    state.finance.unlocked=false;
    if(state.finance.autoLockTimer) clearTimeout(state.finance.autoLockTimer);
    state.finance.autoLockTimer=null;
    updateFinanceSecurityUI();
    if(isFinanceScreen(state.currentScreen)) setScreen(state.currentScreen);
    if(message) showAlert(message,'success');
  }
  function deviceUnlockSupported(){
    return !!(window.isSecureContext && window.PublicKeyCredential && navigator.credentials && navigator.credentials.create && navigator.credentials.get);
  }
  function deviceUnlockConfigured(){ return !!state.finance.config?.credentialId; }
  function updateDeviceUnlockControls(){
    const unlockBtn=$('deviceUnlockBtn'), enableBtn=$('enableDeviceUnlockBtn'), note=$('deviceUnlockNote');
    const supported=deviceUnlockSupported(), configured=deviceUnlockConfigured();
    if(unlockBtn) unlockBtn.classList.toggle('hidden',!(supported&&configured));
    if(enableBtn){ enableBtn.disabled=!supported; enableBtn.textContent=configured?'Re-enroll Device Unlock':'Enable Device Unlock'; }
    if(note){
      note.textContent=supported
        ? (configured?'Device unlock is enrolled. Your browser will use Touch ID, Windows Hello, or another platform authenticator supported by this computer.':'Device unlock is available on this browser. Enroll it after unlocking with your code.')
        : 'Touch ID / Windows Hello requires the app to run from localhost or HTTPS. Use the included local launcher to enable it; the access code works when opening index.html directly.';
    }
  }
  function showFinanceSecuritySection(which){
    ['financeSecuritySetup','financeSecurityUnlock','financeSecurityManage'].forEach(id=>$(id)?.classList.toggle('hidden',id!==which));
    if(which==='financeSecuritySetup') $('financeSecurityTitle').textContent=state.finance.configured?'Change Finance Access Code':'Create Finance Access Code';
    else if(which==='financeSecurityUnlock') $('financeSecurityTitle').textContent='Unlock Finance';
    else $('financeSecurityTitle').textContent='Finance Security';
    updateDeviceUnlockControls();
  }
  function openFinanceSecurityModal(forceSection=''){
    if(cloudConnected() && !isOwnerAccount()){ showAlert('Finance access is restricted to the NBL Owner account.','warning'); return; }
    if(forceSection) showFinanceSecuritySection(forceSection);
    else if(!state.finance.configured) showFinanceSecuritySection('financeSecuritySetup');
    else if(!state.finance.unlocked) showFinanceSecuritySection('financeSecurityUnlock');
    else showFinanceSecuritySection('financeSecurityManage');
    $('financeSetupError')?.classList.add('hidden'); $('financeUnlockError')?.classList.add('hidden');
    $('financeSecurityModal').classList.remove('hidden');
    setTimeout(()=>{
      if(!$('financeSecuritySetup').classList.contains('hidden')) $('financeNewCode').focus();
      else if(!$('financeSecurityUnlock').classList.contains('hidden')) $('financeUnlockCode').focus();
    },0);
  }
  async function saveFinanceCodeFromForm(e){
    e.preventDefault();
    const code=$('financeNewCode').value.trim(), confirm=$('financeConfirmCode').value.trim(), err=$('financeSetupError');
    if(!/^\d{4,10}$/.test(code)){ err.textContent='Use a 4–10 digit numeric code.'; err.classList.remove('hidden'); return; }
    if(code!==confirm){ err.textContent='The two codes do not match.'; err.classList.remove('hidden'); return; }
    const salt=bytesToB64url(randomBytes(16));
    const hash=await hashFinanceCode(code,salt);
    const credentialId=state.finance.config?.credentialId||null;
    await saveFinanceSecurity({version:1,salt,hash,credentialId,updatedAt:new Date().toISOString()});
    $('financeNewCode').value=''; $('financeConfirmCode').value='';
    unlockFinanceSuccess('code');
  }
  async function unlockFinanceFromForm(e){
    e.preventDefault();
    const code=$('financeUnlockCode').value.trim(), err=$('financeUnlockError');
    if(!state.finance.configured){ openFinanceSecurityModal('financeSecuritySetup'); return; }
    const hash=await hashFinanceCode(code,state.finance.config.salt);
    if(hash!==state.finance.config.hash){ err.textContent='Incorrect access code.'; err.classList.remove('hidden'); $('financeUnlockCode').select(); return; }
    $('financeUnlockCode').value=''; err.classList.add('hidden'); unlockFinanceSuccess('code');
  }
  async function enrollDeviceUnlock(){
    if(!deviceUnlockSupported()){ showAlert('Device unlock is not available in this launch mode. Open NBL FleetCommand.app or use the included local launcher so the app runs at localhost.','warning'); return; }
    try{
      const credential=await navigator.credentials.create({publicKey:{
        challenge:randomBytes(32),
        rp:{name:'NBL FleetCommand'},
        user:{id:randomBytes(16),name:'nbl-finance',displayName:'NBL Finance Access'},
        pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],
        authenticatorSelection:{authenticatorAttachment:'platform',userVerification:'required',residentKey:'preferred'},
        timeout:60000,attestation:'none'
      }});
      if(!credential) throw new Error('No credential was created.');
      const cfg={...state.finance.config,credentialId:bytesToB64url(credential.rawId),deviceUpdatedAt:new Date().toISOString()};
      await saveFinanceSecurity(cfg); updateDeviceUnlockControls();
      showAlert('Device unlock enrolled. You can now use Touch ID / Windows Hello to unlock the finance modules.','success');
    }catch(err){ console.error(err); showAlert(`Device unlock was not enrolled: ${escapeHtml(err.message||String(err))}`,'warning'); }
  }
  async function unlockFinanceWithDevice(){
    if(!deviceUnlockSupported()||!deviceUnlockConfigured()){ showAlert('Device unlock is not available or has not been enrolled.','warning'); return; }
    try{
      const expected=state.finance.config.credentialId;
      const credential=await navigator.credentials.get({publicKey:{challenge:randomBytes(32),allowCredentials:[{type:'public-key',id:b64urlToBytes(expected)}],userVerification:'required',timeout:60000}});
      if(!credential || bytesToB64url(credential.rawId)!==expected) throw new Error('Device credential did not match.');
      unlockFinanceSuccess('device');
    }catch(err){ console.error(err); showAlert(`Device unlock was not completed: ${escapeHtml(err.message||String(err))}`,'warning'); }
  }
  function requestScreen(screen){
    if(!canAccessScreen(screen)){
      showAlert('Your NBL profile does not have access to this module.','warning');
      const fallback=firstAccessibleScreen(); if(fallback!==screen) setScreen(fallback); return;
    }
    if(isFinanceScreen(screen) && !state.finance.unlocked){
      state.finance.pendingScreen=screen; setScreen(screen); openFinanceSecurityModal(); return;
    }
    setScreen(screen);
  }

  function setScreen(screen) {
    if(!canAccessScreen(screen)) screen=firstAccessibleScreen();
    state.currentScreen = screen;
    ensureScreenCloudData(screen);
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.screen===screen));
    document.querySelectorAll('.nav-group').forEach(group=>{
      const hasActive=!!group.querySelector(`.nav-btn[data-screen="${screen}"]`);
      group.classList.toggle('has-active',hasActive);
      if(hasActive){ group.classList.remove('collapsed'); group.querySelector('.nav-group-toggle')?.setAttribute('aria-expanded','true'); }
    });
    const hasResult=!!state.result, workspace=hasWorkspace(), label=workspaceLabel();
    const financeLocked=isFinanceScreen(screen) && !state.finance.unlocked;
    $('dashboardScreen')?.classList.toggle('hidden',screen!=='dashboard');
    $('safetyScreen')?.classList.toggle('hidden',screen!=='safety');
    $('driversScreen').classList.toggle('hidden',screen!=='drivers' || !hasResult || financeLocked);
    $('summaryScreen').classList.toggle('hidden',screen!=='summary' || !state.catalog.length || financeLocked);
    $('reportsScreen')?.classList.toggle('hidden',screen!=='settlement-reports' || !workspace || financeLocked);
    $('financialAnalysisScreen')?.classList.toggle('hidden',screen!=='financial-analysis' || financeLocked);
    $('maintenanceScreen').classList.toggle('hidden',screen!=='maintenance' || !workspace);
    $('tripInspectionsScreen')?.classList.toggle('hidden',screen!=='trip-inspections' || !workspace);
    $('faultCodesScreen')?.classList.toggle('hidden',screen!=='fault-codes' || !workspace);
    $('maintenanceTasksScreen')?.classList.toggle('hidden',screen!=='maintenance-tasks' || !workspace);
    $('meetingsScreen').classList.toggle('hidden',screen!=='meetings' || !workspace);
    $('hrScreen')?.classList.toggle('hidden',screen!=='hr' || !workspace);
    $('recruitmentTestScreen')?.classList.toggle('hidden',screen!=='recruitment-test');
    $('usersScreen')?.classList.toggle('hidden',screen!=='users');
    $('auditScreen')?.classList.toggle('hidden',screen!=='audit' || !workspace);
    $('revenueScreen').classList.toggle('hidden',screen!=='revenue' || !workspace || financeLocked);
    $('dispatchScreen')?.classList.toggle('hidden',screen!=='dispatch' || !workspace);
    $('dailyDispatchScreen')?.classList.toggle('hidden',screen!=='daily-dispatch' || !workspace);
    $('ivmrScreen')?.classList.toggle('hidden',screen!=='ivmr' || !workspace);
    $('iftaScreen')?.classList.toggle('hidden',screen!=='ifta' || !workspace || financeLocked);
    $('motiveScreen')?.classList.toggle('hidden',screen!=='motive');
    $('financeLockedState')?.classList.toggle('hidden',!financeLocked);
    const folderScreen = screen==='dashboard' || screen==='safety' || screen==='maintenance' || screen==='trip-inspections' || screen==='fault-codes' || screen==='maintenance-tasks' || screen==='meetings' || screen==='hr' || screen==='recruitment-test' || screen==='users' || screen==='audit' || screen==='settlement-reports' || screen==='financial-analysis' || screen==='revenue' || screen==='dispatch' || screen==='daily-dispatch' || screen==='ivmr' || screen==='ifta' || screen==='motive';
    const requiresWorkspace = screen==='maintenance' || screen==='trip-inspections' || screen==='fault-codes' || screen==='maintenance-tasks' || screen==='meetings' || screen==='hr' || screen==='audit' || screen==='settlement-reports' || screen==='revenue' || screen==='dispatch' || screen==='daily-dispatch' || screen==='ivmr' || screen==='ifta';
    const needsEmpty = financeLocked ? false : ((screen==='users'||screen==='dashboard'||screen==='recruitment-test') ? false : (requiresWorkspace ? !workspace : (screen==='motive' ? false : !hasResult)));
    $('emptyState').classList.toggle('hidden',!needsEmpty);
    if(needsEmpty && requiresWorkspace) $('emptyStateText').textContent=cloudConnected()?'This module is connected to NBL Cloud. No cloud data has been uploaded yet. Open Cloud Sync to import your existing local NBL data.':'Sign in to NBL Cloud or choose your local NBL business data folder to begin.';
    if(needsEmpty && (screen==='drivers'||screen==='summary')) $('emptyStateText').textContent=cloudConnected()?'No settlement data is stored in NBL Cloud yet. Open Cloud Sync to import your existing local NBL data, or upload a settlement CSV.':'Choose a data folder and upload a settlement CSV.';
    const titles={dashboard:'Dashboard',safety:'Safety',drivers:'Driver Pay',summary:'Settlement','settlement-reports':'Settlement Reports','financial-analysis':'Financial Analysis',maintenance:'Fleet Maintenance','trip-inspections':'Trip Inspections','fault-codes':'Motive Fault Codes','maintenance-tasks':'Maintenance Tasks',meetings:'Meetings',hr:'Recruitment Archive','recruitment-test':'Recruitment',users:'User Access',audit:'Audit',revenue:'Revenue Finder',dispatch:'Weekly Dispatch Planner','daily-dispatch':'Daily Dispatch Board',ivmr:'IVMR',ifta:'IFTA',motive:'Motive'};
    $('pageTitle').textContent=titles[screen]||'NBL FleetCommand';
    $('saveBtn').classList.toggle('hidden',folderScreen || financeLocked);
    $('exportBtn').classList.toggle('hidden',folderScreen || financeLocked);
    if($('uploadStatementBtn')) $('uploadStatementBtn').classList.toggle('hidden',(cloudConnected()&&!isOwnerAccount()) || financeLocked || screen==='financial-analysis' || screen==='dashboard');
    if($('emptyUploadStatementBtn')) $('emptyUploadStatementBtn').classList.toggle('hidden',(cloudConnected()&&!isOwnerAccount()) || financeLocked || screen==='financial-analysis');
    if(financeLocked) $('fileMeta').textContent='Owner-only protected module • Unlock with your Finance Access Code.';
    if(screen==='dashboard') {
      const boards=Object.values(state.dispatch.dailyBoards||{}).filter(x=>x?.savedAt).length;
      $('fileMeta').textContent=`${label} • Nonfinancial operations overview${boards?` • ${boards} saved dispatch board${boards===1?'':'s'}`:''}`;
      renderDashboard();
    } else if(screen==='safety') {
      const s=state.safety;
      $('fileMeta').textContent=s.loadedAt?`Motive Safety • ${fmtDate(s.startDate)} to ${fmtDate(s.endDate)} • refreshed ${new Date(s.loadedAt).toLocaleString()}`:'Choose a reporting period and load Motive safety data.';
      renderSafety();
      if(!s.loadedAt&&!s.loading&&state.motive.configured) loadSafetyData(true);
    } else if(screen==='drivers') {
      if(hasResult && !financeLocked) renderDriverTable();
    } else if(screen==='summary') {
      if(state.catalog.length && !financeLocked) renderSummary();
    } else if(screen==='settlement-reports') {
      $('fileMeta').textContent=workspace ? `${label} • ${state.catalog.length} settlement${state.catalog.length===1?'':'s'} available for reporting` : 'Connect NBL Cloud or choose your local data folder to begin.';
      if(workspace && !financeLocked){
        initializeSettlementReportDates();
        if(cloudConnected()&&!state.directoryHandle) refreshSettlementReportsFromCloud(false);
      }
    } else if(screen==='financial-analysis') {
      const count=state.financialAnalysis?.periods?.length||0;
      $('fileMeta').textContent=count?`${state.financialAnalysis.fileName||'P&L workbook'} • ${count} weekly period${count===1?'':'s'}`:'Import a weekly QuickBooks P&L workbook to begin.';
      if(!financeLocked) renderFinancialAnalysis();
    } else if(screen==='maintenance') {
      $('fileMeta').textContent=workspace ? `${label} • ${state.maintenance.tractors.length} tractor${state.maintenance.tractors.length===1?'':'s'} • ${state.catalog.length} settlement${state.catalog.length===1?'':'s'}` : 'Connect NBL Cloud or choose your local data folder to begin.';
      if(workspace) renderMaintenance();
    } else if(screen==='trip-inspections') {
      const open=state.meetings.inspections.filter(x=>x.addressed!=='Y').length;
      $('fileMeta').textContent=workspace?`${label} • ${open} open trip-inspection issue${open===1?'':'s'}`:'Connect NBL Cloud or choose your local data folder to begin.';
      if(workspace) renderTripInspections();
    } else if(screen==='fault-codes') {
      const open=(state.maintenance.faultCodes||[]).filter(x=>String(x.status).toLowerCase()!=='closed').length;
      $('fileMeta').textContent=workspace?`${label} • ${open} open Motive fault${open===1?'':'s'}`:'Connect NBL Cloud or choose your local data folder to begin.';
      if(workspace) renderFaultCodes();
    } else if(screen==='maintenance-tasks') {
      const open=(state.maintenance.tasks||[]).filter(x=>x.status!=='Completed').length;
      $('fileMeta').textContent=workspace?`${label} • ${open} open maintenance task${open===1?'':'s'}`:'Connect NBL Cloud or choose your local data folder to begin.';
      if(workspace) renderMaintenanceTasks();
    } else if(screen==='meetings') {
      const openInspections=state.meetings.inspections.filter(x=>x.addressed!=='Y').length;
      const openItems=state.meetings.managementItems.filter(x=>x.closed!=='Y').length;
      $('fileMeta').textContent=workspace ? `${label} • ${openInspections} open inspection issue${openInspections===1?'':'s'} • ${openItems} open management item${openItems===1?'':'s'}` : 'Connect NBL Cloud or choose your local data folder to begin.';
      if(workspace) renderMeetings();
    } else if(screen==='hr') {
      const active=(state.hr.candidates||[]).filter(x=>normalizeRecruitmentStatus(x.recruitmentStatus)==='In Progress').length;
      const stuck=(state.hr.candidates||[]).filter(x=>x.fadvStatus==='Stuck' && !HR_TERMINAL_STATUSES.has(normalizeRecruitmentStatus(x.recruitmentStatus))).length;
      $('fileMeta').textContent=workspace ? `${label} • ${active} in progress driver${active===1?'':'s'} • ${stuck} FADV stuck` : 'Connect NBL Cloud or choose your local data folder to begin.';
      if(workspace) renderHr();
    } else if(screen==='recruitment-test') {
      $('fileMeta').textContent='Candidate interviews • Hiring and onboarding workflow';
      window.NBLRecruitmentTest?.open();
    } else if(screen==='users') {
      $('fileMeta').textContent='Owner-only access management • Finance modules remain unavailable to every non-owner account.';
      renderUserAccess();
    } else if(screen==='audit') {
      const openFindings=(state.audit.findings||[]).filter(x=>x.closed!=='Y').length;
      const latest=[...(state.audit.audits||[])].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))[0];
      $('fileMeta').textContent=workspace ? `${label} • ${state.audit.audits.length} audit${state.audit.audits.length===1?'':'s'} • ${openFindings} open finding${openFindings===1?'':'s'}${latest?` • latest ${fmtDate(latest.date)}`:''}` : 'Connect NBL Cloud or choose your local data folder to begin.';
      if(workspace) renderAudit();
    } else if(screen==='revenue') {
      $('fileMeta').textContent=financeLocked?'Owner-only protected module • Unlock with your Finance Access Code.':(workspace ? `${label} • scanning ${state.catalog.length} settlement statement${state.catalog.length===1?'':'s'} for possible missed revenue` : 'Connect NBL Cloud or choose your local data folder to begin.');
      if(workspace && !financeLocked) renderRevenueFinder();
    } else if(screen==='dispatch') {
      const ds=dispatchCoverageStats();
      $('fileMeta').textContent=workspace ? `${label} • ${dispatchActiveLocationName()} dispatch • ${ds.covered}/${ds.required} weekly run assignments covered` : 'Connect NBL Cloud or choose your local data folder to begin.';
      if(workspace) renderDispatch();
    } else if(screen==='daily-dispatch') {
      const date=$('dailyDispatchDateInput')?.value||todayIso(),saved=state.dispatch.dailyBoards?.[date];
      $('fileMeta').textContent=workspace ? `${label} • ${fmtDate(date)} daily dispatch${saved?.savedAt?' • saved':' • not yet saved'}` : 'Connect NBL Cloud or choose your local data folder to begin.';
      if(workspace) renderDailyDispatch();
    } else if(screen==='ifta') {
      $('fileMeta').textContent='Quarterly jurisdiction mileage and tax-paid fuel • Owner access';
      if(workspace&&!financeLocked)window.NBLIFTA?.open();
    } else if(screen==='ivmr') {
      const i=state.ivmr;
      $('fileMeta').textContent=workspace ? `${label} • ${i.loadedAt?`IVMR ${fmtDate(i.startDate)} to ${fmtDate(i.endDate)}`:'choose a reporting period and load Motive IFTA data'}` : 'Connect NBL Cloud or choose your local data folder to begin.';
      if(workspace){renderIvmr();if(!state.ivmrLocations.directorySourceDate&&!state.ivmrDirectory.attempted) updateIvmrDirectory(true);}
    } else if(screen==='motive') {
      const m=state.motive;
      $('fileMeta').textContent=!m.backendAvailable ? 'Motive integration requires the hosted NBL server or the included local launcher.' : (m.configured ? `Motive connected${m.keyHint?` • key ${m.keyHint}`:''}${m.lastSync?` • last fleet refresh ${new Date(m.lastSync).toLocaleString()}`:''}` : 'Motive API key is not configured on this server/computer.');
      renderMotive();
    } else if(hasResult && !financeLocked) {
      const item=state.catalog.find(x=>x.id===state.currentStatementId);
      if(item) $('fileMeta').textContent=`Settlement ${fmtDate(item.settlementDate)} • Pay date ${fmtDate(item.payDate)} • Activity ${item.result.summary.periodStart || '—'} to ${item.result.summary.periodEnd || '—'} • ${label}`;
    }
  }

  function updateFolderUI() {
    const el=$('folderStatus');
    if(state.directoryHandle){
      el.classList.add('connected');
      const count=state.catalog.length;
      el.querySelector('small').textContent=`${state.directoryHandle.name}${count ? ` • ${count} statement${count===1?'':'s'}` : ''}`;
      $('chooseFolderBtn').textContent='Reconnect / Change Folder';
      $('refreshFolderBtn').disabled=false;
    } else {
      el.classList.remove('connected');
      el.querySelector('small').textContent='Not selected';
      $('chooseFolderBtn').textContent='Choose Data Folder';
      $('refreshFolderBtn').disabled=true;
    }
  }

  async function openDb() {
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=()=>{ if(!req.result.objectStoreNames.contains(DB_STORE)) req.result.createObjectStore(DB_STORE); };
      req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
    });
  }
  async function idbGet(key) {
    const db=await openDb();
    return new Promise((resolve,reject)=>{ const tx=db.transaction(DB_STORE,'readonly'); const req=tx.objectStore(DB_STORE).get(key); req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error); });
  }
  async function idbSet(key,value) {
    const db=await openDb();
    return new Promise((resolve,reject)=>{ const tx=db.transaction(DB_STORE,'readwrite'); tx.objectStore(DB_STORE).put(value,key); tx.oncomplete=()=>resolve(); tx.onerror=()=>reject(tx.error); });
  }

  async function hasPermission(handle, mode='read') {
    if (!handle || !handle.queryPermission) return false;
    try { return (await handle.queryPermission({mode})) === 'granted'; } catch { return false; }
  }
  async function requestPermission(handle, mode='readwrite') {
    if (!handle) return false;
    if (await hasPermission(handle,mode)) return true;
    try { return (await handle.requestPermission({mode})) === 'granted'; } catch { return false; }
  }

  async function decodeFile(file) {
    const ab = await file.arrayBuffer();
    let text;
    try { text = new TextDecoder('windows-1252').decode(ab); }
    catch { text = new TextDecoder('utf-8').decode(ab); }
    return {ab, text};
  }
  function isoLocal(d) {
    if (!(d instanceof Date) || isNaN(d)) return '';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  const DATE_MONTHS={JAN:0,JANUARY:0,FEB:1,FEBRUARY:1,MAR:2,MARCH:2,APR:3,APRIL:3,MAY:4,JUN:5,JUNE:5,JUL:6,JULY:6,AUG:7,AUGUST:7,SEP:8,SEPT:8,SEPTEMBER:8,OCT:9,OCTOBER:9,NOV:10,NOVEMBER:10,DEC:11,DECEMBER:11};
  function validDateParts(y,m,d) {
    const dt=new Date(y,m-1,d);
    return dt.getFullYear()===y && dt.getMonth()===m-1 && dt.getDate()===d ? dt : null;
  }
  function parseFlexibleDate(v) {
    const s=String(v||'').trim().replace(/^["']+|["']+$/g,'').replace(/\s+/g,' ');
    let m=s.match(/^(\d{4})[-\/]([01]?\d)[-\/]([0-3]?\d)$/);
    if(m) return validDateParts(+m[1],+m[2],+m[3]);
    m=s.match(/^([01]?\d)[-\/]([0-3]?\d)[-\/](\d{2}|\d{4})$/);
    if(m){ const y=m[3].length===2?2000+(+m[3]):+m[3]; return validDateParts(y,+m[1],+m[2]); }
    m=s.toUpperCase().match(/^([0-3]?\d)[-\s]([A-Z]{3,9})[-,\s]+(\d{4})$/);
    if(m){ const mm=DATE_MONTHS[m[2]]; if(mm!=null) return validDateParts(+m[3],mm+1,+m[1]); }
    m=s.toUpperCase().match(/^([A-Z]{3,9})\s+([0-3]?\d)(?:ST|ND|RD|TH)?[,]?\s+(\d{4})$/);
    if(m){ const mm=DATE_MONTHS[m[1]]; if(mm!=null) return validDateParts(+m[3],mm+1,+m[2]); }
    return null;
  }
  function isValidIsoDate(v){ return /^\d{4}-\d{2}-\d{2}$/.test(String(v||'')) && !!parseFlexibleDate(v); }
  function extractDateToken(value) {
    const s=String(value||'').replace(/""/g,'"');
    const patterns=[
      /\b([0-3]?\d-[A-Z]{3,9}-\d{4})\b/i,
      /\b(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})\b/,
      /\b(\d{1,2}[-\/]\d{1,2}[-\/](?:\d{2}|\d{4}))\b/,
      /\b([A-Z]{3,9}\s+[0-3]?\d(?:ST|ND|RD|TH)?[,]?\s+\d{4})\b/i,
      /\b([0-3]?\d\s+[A-Z]{3,9}[,]?\s+\d{4})\b/i
    ];
    for(const p of patterns){ const m=s.match(p); if(m){ const d=parseFlexibleDate(m[1]); if(d) return isoLocal(d); } }
    return '';
  }
  function deriveSettlementDate(text, result, fileName) {
    // NBL date rule:
    // 1) Find the latest activity date in the settlement sheet.
    // 2) Settlement Date is Friday of the FOLLOWING Monday-Sunday week.
    // The analyzer already calculates periodEnd from all dated linehaul, spot,
    // fuel and Tractor Repair/Misc rows, so use that authoritative latest date.
    const latestIso=String(result?.summary?.periodEnd||'');
    const latest=parseFlexibleDate(latestIso);
    if(!latest) return '';

    // Find Monday of the week containing the latest statement activity date.
    // JS getDay(): Sun=0, Mon=1 ... Sat=6.
    const daysSinceMonday=latest.getDay()===0 ? 6 : latest.getDay()-1;
    latest.setDate(latest.getDate()-daysSinceMonday);

    // Friday of the following week = current week's Monday + 11 days.
    latest.setDate(latest.getDate()+11);
    return isoLocal(latest);
  }
  function payDateForSettlement(iso) {
    const d=parseFlexibleDate(iso); if(!d) return '';
    // NBL payroll rule: pay date is one day before settlement date.
    d.setDate(d.getDate()-1);
    return isoLocal(d);
  }

  function getRates() {
    return { mileage:Number($('mileageRate').value)||0, singleDH:Number($('singleRate').value)||0, doubleDH:Number($('doubleRate').value)||0 };
  }
  function stableSettlementJson(value){
    if(Array.isArray(value)) return `[${value.map(stableSettlementJson).join(',')}]`;
    if(value&&typeof value==='object') return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${stableSettlementJson(value[k])}`).join(',')}}`;
    return JSON.stringify(value==null?null:value);
  }
  function settlementFingerprint(result){
    const r=result||{}, s=r.summary||{};
    const payload=stableSettlementJson({
      linehaul:r.linehaul||[],spots:r.spots||[],fuelPurchases:r.fuelPurchases||[],misc:r.misc||[],
      summary:{totalMiles:s.totalMiles,totalRevenue:s.totalRevenue,totalAuthorizedChargebacks:s.totalAuthorizedChargebacks,netAmount:s.netAmount,periodStart:s.periodStart,periodEnd:s.periodEnd}
    });
    let a=2166136261,b=2246822507;
    for(let i=0;i<payload.length;i++){const c=payload.charCodeAt(i);a=Math.imul(a^c,16777619);b=Math.imul(b^c,3266489917);}
    return `${(a>>>0).toString(16).padStart(8,'0')}${(b>>>0).toString(16).padStart(8,'0')}`;
  }
  function settlementCatalogPriority(item){
    const canonical=/^Statements\/\d{4}-\d{2}-\d{2}_settlement\.csv$/i.test(String(item?.relativePath||''))?1e16:0;
    return canonical+(Number(item?.lastModified)||0);
  }
  function dedupeSettlementCatalog(items){
    const sorted=(items||[]).map(x=>({...x,fingerprint:String(x.fingerprint||settlementFingerprint(x.result))})).sort((a,b)=>{
      const date=String(b.settlementDate||'').localeCompare(String(a.settlementDate||''));
      return date || settlementCatalogPriority(b)-settlementCatalogPriority(a) || String(a.fileName||'').localeCompare(String(b.fileName||''));
    });
    const active=[],duplicates=[],byDate=new Map(),byFingerprint=new Map();
    for(const item of sorted){
      const exact=byFingerprint.get(item.fingerprint), dated=item.settlementDate&&byDate.get(item.settlementDate);
      if(exact){duplicates.push({item,active:exact,reason:'exact'});continue;}
      if(dated){duplicates.push({item,active:dated,reason:'same_date'});continue;}
      active.push(item);byFingerprint.set(item.fingerprint,item);if(item.settlementDate)byDate.set(item.settlementDate,item);
    }
    return {active,duplicates};
  }
  async function analyzeFileEntry(file, relativePath) {
    const {ab,text}=await decodeFile(file);
    const result=Core.analyzeSettlement(text,file.name,getRates());
    if(!result.linehaul.length && !result.spots.length) return null;
    const settlementDate=deriveSettlementDate(text,result,file.name);
    const payDate=payDateForSettlement(settlementDate);
    result.summary.settlementDate=settlementDate;
    result.summary.payDate=payDate;
    return {id:relativePath,relativePath,fileName:file.name,file,result,rawText:text,rawBytes:new Uint8Array(ab),settlementDate,payDate,fingerprint:settlementFingerprint(result),lastModified:Number(file.lastModified)||0};
  }

  async function collectCsvFiles(dir, prefix='', depth=0, out=[]) {
    if(depth>4) return out;
    for await (const [name,entry] of dir.entries()) {
      const path=prefix ? `${prefix}/${name}` : name;
      if(entry.kind==='directory') {
        if (/^(Reports?|Exports?|Processed)$/i.test(name)) continue;
        await collectCsvFiles(entry,path,depth+1,out);
      } else if(entry.kind==='file' && /\.csv$/i.test(name) && !/^driver_pay\.csv$/i.test(name) && !/^source\.csv$/i.test(name)) {
        out.push({handle:entry,path});
      }
    }
    return out;
  }

  async function scanFolder(preferredId=null, silent=false) {
    if(!state.directoryHandle) return;
    if(!(await hasPermission(state.directoryHandle,'read'))) {
      showAlert('The NBL business data folder is remembered, but the browser needs permission to read it again. Click <strong>Reconnect / Change Folder</strong>.','warning');
      updateFolderUI(); return;
    }
    try {
      if(!silent) showAlert('Scanning the NBL business data folder for settlement statements…','success');
      const candidates=await collectCsvFiles(state.directoryHandle);
      const catalog=[];
      for(const c of candidates) {
        try { const file=await c.handle.getFile(); const item=await analyzeFileEntry(file,c.path); if(item) catalog.push(item); }
        catch(err){ console.warn('Skipped CSV',c.path,err); }
      }
      const deduped=dedupeSettlementCatalog(catalog);
      state.catalog=deduped.active; state.settlement.duplicates=deduped.duplicates;
      if(!state.settlement.analysisStatementId || !state.catalog.find(x=>x.id===state.settlement.analysisStatementId)) state.settlement.analysisStatementId=state.catalog[0]?.id||null;
      await loadMaintenanceData();
      await loadIvmrLocationData();
      await loadMeetingData();
      await loadHrData();
      await loadAuditData();
      await loadDispatchData();
      await loadPayrollData();
      updateFolderUI();
      populateDateSelectors();
      let target=preferredId && state.catalog.find(x=>x.id===preferredId) ? preferredId : state.currentStatementId;
      if(!target || !state.catalog.find(x=>x.id===target)) target=state.catalog[0]?.id || null;
      if(target) selectStatement(target,false);
      else clearCurrent('No settlement statements were found in this folder. Upload a FedEx settlement CSV to add the first one.');
      const undatedCount=state.catalog.filter(x=>!isValidIsoDate(x.settlementDate)).length, duplicateCount=deduped.duplicates.length;
      if(!silent) {
        if(undatedCount||duplicateCount) showAlert(`Found <strong>${state.catalog.length}</strong> active settlement statement${state.catalog.length===1?'':'s'}.${duplicateCount?` <strong>${duplicateCount}</strong> duplicate${duplicateCount===1?' was':'s were'} excluded from calculations.`:''}${undatedCount?` <strong>${undatedCount}</strong> file${undatedCount===1?' does':'s do'} not contain dated settlement activity.`:''}`,'warning');
        else showAlert(state.catalog.length ? `Found <strong>${state.catalog.length}</strong> settlement statement${state.catalog.length===1?'':'s'} in ${escapeHtml(state.directoryHandle.name)}.` : 'Folder connected. No settlement statements found yet.','success');
      }
      await writeCatalogIndex();
    } catch(err){ console.error(err); showAlert('Could not scan the selected folder: '+err.message,'error'); }
  }

  function clearCurrent(message) {
    state.result=null; state.file=null; state.rawBytes=null; state.rawText=''; state.currentStatementId=null;
    $('emptyState').classList.remove('hidden');
    $('emptyStateText').textContent=message || 'Choose a data folder and upload a settlement CSV.';
    $('exportBtn').disabled=true; $('saveBtn').disabled=true;
    $('fileMeta').textContent='No settlement selected.';
    setScreen(state.currentScreen);
  }

  function payrollDefaultProfile(driver){
    const rates=getRates();
    return {fedexId:String(driver?.fedexId||''),name:driver?.name||'',method:'mileage_dh',dayRate:0,mileageRate:rates.mileage,singleDHRate:rates.singleDH,doubleDHRate:rates.doubleDH,minimumEnabled:false,weeklyMinimum:0,active:false,isDefault:true};
  }
  function payrollMethodLabel(method){ return method==='day_rate'?'Day Rate':method==='hybrid'?'Hybrid':'Mileage + D&H'; }
  function payrollKnownDrivers(){
    const map=new Map();
    for(const item of state.catalog||[]){
      for(const [id,name] of Object.entries(item.result?.names||{})){ const k=String(id||'').trim(); if(k) map.set(k,{fedexId:k,name:name||`Driver ${k}`}); }
      for(const d of item.result?.drivers||[]){ const k=String(d.fedexId||'').trim(); if(k) map.set(k,{fedexId:k,name:d.name||map.get(k)?.name||`Driver ${k}`}); }
    }
    for(const d of state.dispatch?.drivers||[]){
      const id=String(d.fedexId||'').trim();
      if(id&&dispatchDriverIsActive(d)) map.set(id,{fedexId:id,name:d.name||map.get(id)?.name||`Driver ${id}`});
    }
    for(const [id,p] of Object.entries(state.payroll?.profiles||{})){ if(id) map.set(id,{fedexId:id,name:p.name||map.get(id)?.name||`Driver ${id}`}); }
    return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name)||a.fedexId.localeCompare(b.fedexId));
  }
  async function loadPayrollData(){
    if(!state.directoryHandle) return;
    let data={version:2,profiles:{},periods:{},dhMappings:{}};
    try{
      const dir=await state.directoryHandle.getDirectoryHandle('Payroll');
      const fh=await dir.getFileHandle('payroll_data.json');
      const parsed=JSON.parse(await (await fh.getFile()).text());
      if(parsed && typeof parsed==='object') data={version:2,profiles:parsed.profiles||{},periods:parsed.periods||{},dhMappings:parsed.dhMappings||{}};
    }catch(err){ if(err?.name!=='NotFoundError') console.warn('Could not load payroll data',err); }
    state.payroll=data; state.payrollLoaded=true; renderDriverTable();
  }
  async function savePayrollData(silent=true){
    const cloudSaved=cloudConnected()?await saveCloudModule('driver_pay',true):false;
    if(!state.directoryHandle){ if(!silent&&cloudSaved) showAlert('Payroll settings saved to NBL Cloud.','success'); return cloudSaved; }
    if(!(await requestPermission(state.directoryHandle,'readwrite'))){ if(!silent) showAlert('Folder write permission is required to save payroll settings.','error'); return false; }
    try{
      const dir=await state.directoryHandle.getDirectoryHandle('Payroll',{create:true});
      await writeFile(dir,'payroll_data.json',JSON.stringify({...state.payroll,updatedAt:new Date().toISOString()},null,2),'application/json');
      if(!silent) showAlert(`Payroll settings saved to <strong>${escapeHtml(state.directoryHandle.name)}/Payroll</strong>.`,'success');
      return true;
    }catch(err){ console.error(err); if(!silent) showAlert('Could not save payroll settings: '+err.message,'error'); return false; }
  }
  function payrollProfileFor(driver){
    const id=String(driver?.fedexId||'').trim();
    const saved=id?state.payroll?.profiles?.[id]:null;
    if(!saved) return payrollDefaultProfile(driver);
    return {...payrollDefaultProfile(driver),...saved,fedexId:id,name:saved.name||driver?.name||''};
  }
  function payrollPeriodKey(){ return state.result?.summary?.settlementDate || state.result?.summary?.payDate || 'undated'; }
  function payrollPeriodState(create=false){
    const key=payrollPeriodKey(); if(!key) return null;
    if(create){ state.payroll.periods[key] ||= {drivers:{},dhMappings:{}}; state.payroll.periods[key].drivers ||= {}; state.payroll.periods[key].dhMappings ||= {}; }
    return state.payroll.periods?.[key] || null;
  }
  function payrollPeriodDriverState(id,create=false){
    if(!id) return null; const period=payrollPeriodState(create); if(!period) return null;
    if(create){
      period.drivers[id] ||= {daysOverride:null,workDays:null,adjustments:[]};
      period.drivers[id].adjustments ||= [];
      if(!Object.prototype.hasOwnProperty.call(period.drivers[id],'workDays')) period.drivers[id].workDays=null;
    }
    return period.drivers?.[id] || null;
  }
  function dhAmountKey(amount){ const n=Number(amount); return Number.isFinite(n)?n.toFixed(2):''; }
  function detectedDhValues(){
    if(!state.result) return [];
    if(Array.isArray(state.result.dhValues) && state.result.dhValues.length) return state.result.dhValues.map(x=>({amount:Number(x.amount)||0,count:Number(x.count)||0})).filter(x=>x.amount>0).sort((a,b)=>a.amount-b.amount);
    const m=new Map(); for(const t of state.result.linehaul||[]){ const n=Number(t.dh)||0;if(n>0.001){const k=dhAmountKey(n);m.set(k,(m.get(k)||0)+1);} }
    return [...m.entries()].map(([k,count])=>({amount:Number(k),count})).sort((a,b)=>a.amount-b.amount);
  }
  function legacyDhPayout(amount){ const n=Number(amount); if(Math.abs(n-12.75)<0.01) return getRates().singleDH; if(Math.abs(n-22.25)<0.01) return getRates().doubleDH; return null; }
  function dhPayoutFor(amount){
    const k=dhAmountKey(amount),period=payrollPeriodState(false);
    if(period?.dhMappings && Object.prototype.hasOwnProperty.call(period.dhMappings,k)) { const v=period.dhMappings[k]; return v==null?null:Number(v); }
    if(state.payroll?.dhMappings && Object.prototype.hasOwnProperty.call(state.payroll.dhMappings,k)) { const v=state.payroll.dhMappings[k]; return v==null?null:Number(v); }
    return legacyDhPayout(amount);
  }
  function driverDhCounts(d){
    const obj={};
    if(d?.dhCounts && typeof d.dhCounts==='object') for(const [k,v] of Object.entries(d.dhCounts)){ const n=Number(v)||0;if(n>0)obj[dhAmountKey(k)]=n; }
    if(!Object.keys(obj).length){ if(Number(d?.singles)>0)obj['12.75']=Number(d.singles); if(Number(d?.doubles)>0)obj['22.25']=Number(d.doubles); }
    return obj;
  }
  function renderDhMappings(){
    const wrap=$('dhValueMappings'); if(!wrap) return; const values=detectedDhValues();
    if(!values.length){ wrap.innerHTML='<div class="dh-empty">No D&amp;H values were detected in the selected settlement.</div>'; return; }
    wrap.innerHTML=values.map(x=>{ const k=dhAmountKey(x.amount),p=dhPayoutFor(x.amount),mapped=p!=null&&Number.isFinite(Number(p)); return `<div class="dh-map-row ${mapped?'mapped':'unmapped'}"><div class="dh-source"><span>Settlement D&amp;H</span><strong>${fmtMoney(x.amount)}</strong><small>${x.count} occurrence${x.count===1?'':'s'} in statement</small></div><div class="dh-arrow">→</div><label><span>Driver payout</span><div class="input-prefix"><span>$</span><input type="number" min="0" step="0.01" data-dh-map-amount="${escapeHtml(k)}" value="${mapped?Number(p).toFixed(2):''}" placeholder="Enter payout"></div></label><div class="dh-map-status">${mapped?'Mapped':'Needs payout'}</div></div>`; }).join('');
  }
  async function saveDhMappings(){
    const period=payrollPeriodState(true); state.payroll.dhMappings ||= {}; let missing=0;
    for(const input of document.querySelectorAll('[data-dh-map-amount]')){ const k=input.dataset.dhMapAmount,raw=input.value.trim(); if(!raw){ period.dhMappings[k]=null; missing++; continue; } const n=Number(raw); if(!Number.isFinite(n)||n<0){ showAlert(`Enter a valid driver payout for settlement D&H $${escapeHtml(k)}.`,'warning'); return; } const v=Math.round((n+Number.EPSILON)*100)/100; period.dhMappings[k]=v; state.payroll.dhMappings[k]=v; }
    await savePayrollData(true); renderDhMappings(); renderDriverTable();
    showAlert(missing?'D&H mappings saved. Unmapped values will not add D&H pay until a payout is assigned.':'D&H payout mappings saved and payroll recalculated.','success');
  }
  function payrollDriverWorkDates(result,id){
    const dates=new Set();
    for(const list of [result?.linehaul||[],result?.spots||[]]) for(const trip of list){
      if(String(trip.driver1||'')===id || String(trip.driver2||'')===id){ const d=parseFlexibleDate(trip.date); if(d) dates.add(isoLocal(d)); }
    }
    return [...dates].sort();
  }
  function payrollWeekDates(){
    const s=state.result?.summary||{};
    let end=null;
    const settlement=parseFlexibleDate(s.settlementDate);
    if(settlement){
      // NBL pay week is Saturday-Friday. Settlement is the Friday of the following week,
      // so the worked/pay-period Friday is exactly seven days before settlement.
      end=new Date(settlement.getFullYear(),settlement.getMonth(),settlement.getDate()-7);
    }else{
      const periodEnd=parseFlexibleDate(s.periodEnd);
      if(periodEnd) end=new Date(periodEnd.getFullYear(),periodEnd.getMonth(),periodEnd.getDate());
    }
    if(!end) return [];
    const start=new Date(end.getFullYear(),end.getMonth(),end.getDate()-6),out=[];
    for(let i=0;i<7;i++){ const d=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i); out.push(isoLocal(d)); }
    return out;
  }
  function payrollDayHeaderLabel(iso){
    const d=parseFlexibleDate(iso); if(!d) return iso||'—';
    const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec'];
    return `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`;
  }
  function payrollAutomaticWorkDates(result,id,period){
    const week=payrollWeekDates();
    if(Array.isArray(period?.hosWorkDates)) return week.filter(date=>period.hosWorkDates.includes(date));
    const settlement=new Set(payrollDriverWorkDates(result,id));
    return week.filter(date=>settlement.has(date));
  }
  function payrollResolvedWorkedDates(result,id,period){
    const week=payrollWeekDates(),autoSet=new Set(payrollAutomaticWorkDates(result,id,period));
    const overrides=period?.workDays && typeof period.workDays==='object' ? period.workDays : {};
    // Each checkbox becomes a per-day override only when the user touches it. Untouched
    // dates continue to follow Motive HOS (or settlement activity when HOS is unavailable).
    return week.filter(date=>Object.prototype.hasOwnProperty.call(overrides,date)?overrides[date]===true:autoSet.has(date));
  }
  async function setPayrollWorkedDay(id,date,checked){
    if(!id||!date||!state.result) return;
    const pd=payrollPeriodDriverState(id,true);
    pd.workDays = (pd.workDays && typeof pd.workDays==='object') ? pd.workDays : {};
    pd.workDays[date]=!!checked;
    pd.daysOverride=null;
    await savePayrollData(true);
    renderDriverTable();
    scheduleAutosave();
  }
  function payrollNameTokens(value){
    return String(value||'').toLowerCase().replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim().split(' ').filter(Boolean);
  }
  function payrollNameKey(value){ return payrollNameTokens(value).join(' '); }
  function payrollFirstLastKey(value){ const t=payrollNameTokens(value); return t.length?`${t[0]} ${t[t.length-1]}`:''; }
  function matchPayrollDriverToHos(driver,hosDrivers){
    const id=String(driver?.fedexId||'').trim();
    let matches=(hosDrivers||[]).filter(h=>id && String(h.driver_company_id||'').trim()===id);
    if(matches.length===1) return {...matches[0],matchedBy:'driver company ID'};
    const full=payrollNameKey(driver?.name),fl=payrollFirstLastKey(driver?.name);
    matches=(hosDrivers||[]).filter(h=>full && payrollNameKey(h.name)===full);
    if(matches.length===1) return {...matches[0],matchedBy:'full name'};
    matches=(hosDrivers||[]).filter(h=>fl && payrollFirstLastKey(h.name)===fl);
    if(matches.length===1) return {...matches[0],matchedBy:'first/last name'};
    // Last fallback: unique surname + first initial. This accommodates middle names and
    // common settlement-name formatting without silently choosing between duplicates.
    const dt=payrollNameTokens(driver?.name),last=dt[dt.length-1]||'',initial=(dt[0]||'')[0]||'';
    matches=(hosDrivers||[]).filter(h=>{const ht=payrollNameTokens(h.name),hl=ht[ht.length-1]||'',hi=(ht[0]||'')[0]||'';return last&&initial&&hl===last&&hi===initial;});
    if(matches.length===1) return {...matches[0],matchedBy:'name'};
    return null;
  }
  function renderPayrollHosStatus(){
    const el=$('payrollHosStatus'),btn=$('refreshHosWorkDaysBtn'); if(!el||!btn)return;
    const period=payrollPeriodState(false),week=payrollWeekDates();
    btn.disabled=state.payrollHos.loading || !state.motive.backendAvailable || !state.motive.configured || week.length!==7;
    if(state.payrollHos.loading){ el.className='payroll-hos-status loading'; el.textContent='Reading Motive HOS logs and identifying continuous work sessions…'; return; }
    if(period?.hosFetchedAt){
      const matched=Object.values(period.drivers||{}).filter(d=>Array.isArray(d.hosWorkDates)).length;
      const when=new Date(period.hosFetchedAt); el.className='payroll-hos-status ok';
      el.textContent=`Motive HOS loaded • ${matched} driver${matched===1?'':'s'} matched • ${isNaN(when)?'updated':when.toLocaleString()}`; return;
    }
    if(!state.motive.configured){ el.className='payroll-hos-status warn'; el.textContent='Connect Motive to identify worked days automatically.'; return; }
    el.className='payroll-hos-status'; el.textContent='Motive HOS workdays not loaded for this pay period.';
  }
  async function refreshPayrollHosWorkDays(silent=false){
    const week=payrollWeekDates();
    if(!state.result||week.length!==7) return;
    if(!state.motive.backendAvailable||!state.motive.configured){ if(!silent)showAlert('Connect Motive before refreshing payroll workdays.','warning'); renderPayrollHosStatus(); return; }
    if(state.payrollHos.loading) return;
    state.payrollHos.loading=true; state.payrollHos.lastError=''; renderPayrollHosStatus();
    try{
      const data=await localApi(`/api/motive/hos/workdays?start_date=${encodeURIComponent(week[0])}&end_date=${encodeURIComponent(week[6])}`);
      const hosDrivers=Array.isArray(data.drivers)?data.drivers:[],period=payrollPeriodState(true),drivers=payrollKnownDrivers();
      let matched=0,totalDays=0,unmatched=[];
      for(const driver of drivers){
        const pd=payrollPeriodDriverState(String(driver.fedexId||''),true),match=matchPayrollDriverToHos(driver,hosDrivers);
        if(match){ pd.hosWorkDates=(match.worked_dates||[]).filter(d=>week.includes(d)); pd.hosMotiveDriverId=String(match.motive_driver_id||''); pd.hosMotiveName=match.name||''; pd.hosMatchedBy=match.matchedBy||''; matched++; totalDays+=pd.hosWorkDates.length; }
        else { delete pd.hosWorkDates; delete pd.hosMotiveDriverId; delete pd.hosMotiveName; delete pd.hosMatchedBy; unmatched.push(driver.name); }
      }
      period.hosFetchedAt=new Date().toISOString(); period.hosStartDate=week[0]; period.hosEndDate=week[6]; period.hosLogCount=Number(data.log_count)||0;
      state.payrollHos.lastPeriodKey=payrollPeriodKey();
      await savePayrollData(true); renderDriverTable();
      if(!silent){
        const unmatchedText=unmatched.length?` ${unmatched.length} driver${unmatched.length===1?' was':'s were'} not matched by FedEx/company ID or name and continue using settlement/manual workdays.`:'';
        showAlert(`Motive HOS workdays updated: <strong>${matched}</strong> driver${matched===1?'':'s'} matched and <strong>${totalDays}</strong> workday${totalDays===1?'':'s'} identified.${unmatchedText}`,'success');
      }
    }catch(err){ state.payrollHos.lastError=err.message; if(!silent)showAlert(`Could not load Motive HOS workdays: ${escapeHtml(err.message)}`,'error'); }
    finally{ state.payrollHos.loading=false; renderPayrollHosStatus(); }
  }
  function maybeAutoRefreshPayrollHosWorkDays(){
    if(!state.result||!state.motive.backendAvailable||!state.motive.configured) return;
    const period=payrollPeriodState(false),week=payrollWeekDates(); if(week.length!==7)return;
    if(period?.hosFetchedAt && period.hosStartDate===week[0] && period.hosEndDate===week[6]) return;
    setTimeout(()=>refreshPayrollHosWorkDays(true),150);
  }
  function payrollAdjustmentBuckets(adjustments){
    const b={bonus:0,holiday:0,vacation:0,training:0,other:0,total:0};
    for(const a of adjustments||[]){ const type=['bonus','holiday','vacation','training'].includes(a.type)?a.type:'other',amt=Number(a.amount)||0; b[type]+=amt; b.total+=amt; }
    Object.keys(b).forEach(k=>b[k]=Math.round((b[k]+Number.EPSILON)*100)/100); return b;
  }
  function payrollRows(){
    if(!state.result) return [];
    const base=new Map((state.result.drivers||[]).map(d=>[String(d.fedexId||''),{...d}]));
    for(const [id,p] of Object.entries(state.payroll?.profiles||{})) if(p.active && !base.has(id)) base.set(id,{fedexId:id,name:p.name||`Driver ${id}`,linehaulMiles:0,spotMiles:0,totalMiles:0,singles:0,doubles:0,dhCounts:{}});
    const rows=[];
    for(const d of base.values()){
      const id=String(d.fedexId||''),profile=payrollProfileFor(d),period=payrollPeriodDriverState(id,false)||{daysOverride:null,workDays:null,adjustments:[]};
      const detectedWorkDates=payrollDriverWorkDates(state.result,id),detectedDays=detectedWorkDates.length;
      const automaticWorkDates=payrollAutomaticWorkDates(state.result,id,period);
      const hosWorkDates=Array.isArray(period.hosWorkDates)?period.hosWorkDates:[];
      const workedDates=payrollResolvedWorkedDates(state.result,id,period),daysWorked=workedDates.length;
      const workDates=workedDates, workdaySource=Array.isArray(period.hosWorkDates)?'Motive HOS':'Settlement';
      const mileageRate=Number(profile.mileageRate)||0,dayRate=Number(profile.dayRate)||0;
      const totalMiles=Number(d.totalMiles)||((Number(d.linehaulMiles)||0)+(Number(d.spotMiles)||0));
      const milesPay=Math.round((totalMiles*mileageRate+Number.EPSILON)*100)/100;
      const counts=driverDhCounts(d),dhBreakdown=Object.entries(counts).map(([k,count])=>{ const payout=dhPayoutFor(Number(k)),mapped=payout!=null&&Number.isFinite(Number(payout)); const pay=mapped?Math.round((Number(count)*Number(payout)+Number.EPSILON)*100)/100:0; return {amount:Number(k),count:Number(count)||0,payout:mapped?Number(payout):null,mapped,pay}; }).sort((a,b)=>a.amount-b.amount);
      const dhEventCount=dhBreakdown.reduce((a,x)=>a+x.count,0),dhPay=Math.round((dhBreakdown.reduce((a,x)=>a+x.pay,0)+Number.EPSILON)*100)/100,unmappedDhValues=dhBreakdown.filter(x=>!x.mapped).map(x=>x.amount);
      const dayPay=Math.round((daysWorked*dayRate+Number.EPSILON)*100)/100;
      let basePay=profile.method==='day_rate'?dayPay:profile.method==='hybrid'?dayPay+milesPay+dhPay:milesPay+dhPay;
      basePay=Math.round((basePay+Number.EPSILON)*100)/100;
      const weeklyMinimum=profile.minimumEnabled?Number(profile.weeklyMinimum)||0:0;
      const hasRegularActivity=daysWorked>0 || totalMiles>0 || dhEventCount>0;
      const buckets=payrollAdjustmentBuckets(period.adjustments||[]);
      // v76: positive adjustments normally count toward the weekly minimum. Each
      // adjustment can be marked "additional to minimum" so it is paid on top of
      // the minimum instead. Negative adjustments remain deductions after the
      // minimum calculation and never increase the minimum top-up.
      const minimumQualifyingAdditionalPay=Math.round(((period.adjustments||[]).reduce((sum,a)=>{
        const amt=Number(a.amount)||0;
        return sum+(!a.additionalToMinimum?Math.max(0,amt):0);
      },0)+Number.EPSILON)*100)/100;
      const minimumAboveAdditionalPay=Math.round(((period.adjustments||[]).reduce((sum,a)=>{
        const amt=Number(a.amount)||0;
        return sum+(a.additionalToMinimum?Math.max(0,amt):0);
      },0)+Number.EPSILON)*100)/100;
      const minimumEarnings=Math.round((basePay+minimumQualifyingAdditionalPay+Number.EPSILON)*100)/100;
      const minimumTopUp=profile.minimumEnabled && hasRegularActivity?Math.max(0,Math.round(((weeklyMinimum-minimumEarnings)+Number.EPSILON)*100)/100):0;
      const totalPay=Math.round((basePay+minimumTopUp+buckets.total+Number.EPSILON)*100)/100;
      rows.push({...d,totalMiles,profile,payMethod:profile.method,payMethodLabel:payrollMethodLabel(profile.method),workDates,workedDates,detectedWorkDates,detectedDays,automaticWorkDates,hosWorkDates,workdaySource,hosMotiveName:period.hosMotiveName||'',hosMatchedBy:period.hosMatchedBy||'',daysWorked,daysOverridden:false,dayRate,mileageRate,dayPay,milesPay,dhBreakdown,dhEventCount,dhPay,unmappedDhValues,basePay,weeklyMinimum,minimumQualifyingAdditionalPay,minimumAboveAdditionalPay,minimumEarnings,minimumTopUp,adjustments:period.adjustments||[],adjustmentBuckets:buckets,additionalPay:buckets.total,totalPay,payrollComputed:true});
    }
    return rows.sort((a,b)=>a.name.localeCompare(b.name));
  }
  function payrollExportResult(){ return state.result ? {...state.result,drivers:payrollRows(),payrollWeekDates:payrollWeekDates(),payrollVersion:2} : null; }
  function renderPayrollProfilesModal(){
    const known=payrollKnownDrivers().filter(driverIsEligibleForWork),sel=$('payrollProfileDriverSelect');
    if(sel) sel.innerHTML=known.map(d=>`<option value="${escapeHtml(d.fedexId)}">${escapeHtml(d.name)} — ${escapeHtml(d.fedexId)}</option>`).join('');
    const table=$('payrollProfilesTable'); if(!table) return;
    table.querySelector('thead').innerHTML='<tr>'+['Driver','FedEx ID','Pay Method','Rates / Minimum','Active','Action'].map(h=>`<th>${h}</th>`).join('')+'</tr>';
    const profiles=Object.values(state.payroll?.profiles||{}).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));
    table.querySelector('tbody').innerHTML=profiles.length?profiles.map(p=>{const rate=p.method==='day_rate'?`${fmtMoney(p.dayRate||0)}/day`:p.method==='hybrid'?`${fmtMoney(p.dayRate||0)}/day + ${fmtMoney(p.mileageRate||0)}/mi + D&H`:`${fmtMoney(p.mileageRate||0)}/mi • D&H by settlement-value mapping`;const min=p.minimumEnabled?` • Min ${fmtMoney(p.weeklyMinimum||0)}`:'';return `<tr><td><strong>${escapeHtml(p.name||'—')}</strong></td><td>${escapeHtml(p.fedexId||'—')}</td><td><span class="pay-method-pill">${escapeHtml(payrollMethodLabel(p.method))}</span></td><td>${escapeHtml(rate+min)}</td><td>${p.active?'<span class="status-pill yes">Active</span>':'<span class="status-pill baseline">As activity appears</span>'}</td><td><button class="table-action" data-edit-payroll-profile="${escapeHtml(p.fedexId)}">Edit</button></td></tr>`;}).join(''):'<tr><td colspan="6" class="empty-table-cell">No custom pay profiles yet. Drivers currently use the default mileage + D&amp;H rates.</td></tr>';
  }
  function openPayrollProfilesModal(){ renderPayrollProfilesModal(); openModal('payrollProfilesModal'); }
  function openPayrollProfileEditor(id){
    const known=payrollKnownDrivers(),driver=known.find(d=>d.fedexId===id)||(state.result?.drivers||[]).find(d=>String(d.fedexId)===id); if(!driver){showAlert('Select a driver first.','warning');return;}
    const p=payrollProfileFor(driver),saved=state.payroll.profiles?.[id];
    $('payrollProfileFedexId').value=id; $('payrollProfileDriverName').value=`${driver.name} (${id})`; $('payrollProfileTitle').textContent=`${driver.name} — Pay Profile`;
    $('payrollMethodInput').value=p.method; $('payrollDayRateInput').value=p.dayRate||''; $('payrollMileageRateInput').value=p.mileageRate; $('payrollSingleRateInput').value=p.singleDHRate; $('payrollDoubleRateInput').value=p.doubleDHRate; $('payrollMinimumEnabledInput').checked=!!p.minimumEnabled; $('payrollWeeklyMinimumInput').value=p.weeklyMinimum||''; $('payrollProfileActiveInput').checked=saved?!!saved.active:true;
    closeModal('payrollProfilesModal'); openModal('payrollProfileEditModal');
  }
  async function savePayrollProfileFromForm(e){
    e.preventDefault(); const id=$('payrollProfileFedexId').value,known=payrollKnownDrivers().find(d=>d.fedexId===id); if(!id||!known)return;
    state.payroll.profiles[id]={fedexId:id,name:known.name,method:$('payrollMethodInput').value,dayRate:optionalNumber($('payrollDayRateInput').value)||0,mileageRate:optionalNumber($('payrollMileageRateInput').value)??getRates().mileage,singleDHRate:optionalNumber($('payrollSingleRateInput').value)??getRates().singleDH,doubleDHRate:optionalNumber($('payrollDoubleRateInput').value)??getRates().doubleDH,minimumEnabled:$('payrollMinimumEnabledInput').checked,weeklyMinimum:optionalNumber($('payrollWeeklyMinimumInput').value)||0,active:$('payrollProfileActiveInput').checked,updatedAt:new Date().toISOString()};
    await savePayrollData(true); closeModal('payrollProfileEditModal'); renderDriverTable(); renderPayrollProfilesModal(); showAlert(`Pay profile saved for <strong>${escapeHtml(known.name)}</strong>.`,'success');
  }
  function openPayrollAdjustments(id){
    const row=payrollRows().find(d=>d.fedexId===id); if(!row)return; const pd=payrollPeriodDriverState(id,true);
    $('payrollAdjustmentFedexId').value=id; $('payrollAdjustmentsTitle').textContent=`${row.name} — Adjustments`; $('payrollAdjustmentPeriod').value=`Pay ${fmtDate(state.result.summary.payDate)} • Settlement ${fmtDate(state.result.summary.settlementDate)}`;
    $('payrollDaysOverrideInput').value=row.daysWorked; $('payrollDaysOverrideInput').disabled=true; $('payrollDaysDetectedNote').textContent=`${row.daysWorked} worked day${row.daysWorked===1?'':'s'} selected. Change worked days using the dated checkboxes in the Driver Pay table.`;
    if($('payrollAdjustmentAboveMinimum')) $('payrollAdjustmentAboveMinimum').checked=false;
    renderPayrollAdjustmentsTable(id); openModal('payrollAdjustmentsModal');
  }
  function renderPayrollAdjustmentsTable(id){
    const pd=payrollPeriodDriverState(id,true),table=$('payrollAdjustmentsTable'); if(!table)return;
    table.querySelector('thead').innerHTML='<tr>'+['Type','Description','Amount','Minimum Treatment','Action'].map(h=>`<th>${h}</th>`).join('')+'</tr>';
    table.querySelector('tbody').innerHTML=(pd.adjustments||[]).length?pd.adjustments.map(a=>{
      const amt=Number(a.amount)||0;
      const treatment=amt<0?'Deduction':a.additionalToMinimum?'Paid on top of minimum':'Counts toward minimum';
      const treatmentClass=amt<0?'baseline':a.additionalToMinimum?'yes':'baseline';
      return `<tr><td>${escapeHtml((a.type||'other').replace(/^./,c=>c.toUpperCase()))}</td><td>${escapeHtml(a.description||'—')}</td><td class="money">${fmtMoney(a.amount)}</td><td><span class="status-pill ${treatmentClass}">${escapeHtml(treatment)}</span></td><td><button class="table-action danger-link" data-delete-payroll-adjustment="${escapeHtml(a.id)}" data-payroll-driver="${escapeHtml(id)}">Delete</button></td></tr>`;
    }).join(''):'<tr><td colspan="5" class="empty-table-cell">No additional pay or adjustments for this pay period.</td></tr>';
  }
  async function savePayrollDays(){ const id=$('payrollAdjustmentFedexId').value;if(!id)return;const pd=payrollPeriodDriverState(id,true),v=$('payrollDaysOverrideInput').value;pd.daysOverride=v===''?null:Number(v);await savePayrollData(true);renderDriverTable();showAlert('Days worked saved for this pay period.','success'); }
  async function addPayrollAdjustment(e){
    e.preventDefault(); const id=$('payrollAdjustmentFedexId').value;if(!id)return;const amount=Number($('payrollAdjustmentAmount').value);if(!Number.isFinite(amount)||Math.abs(amount)<0.001){showAlert('Enter a non-zero adjustment amount.','warning');return;}const pd=payrollPeriodDriverState(id,true);pd.adjustments ||= [];pd.adjustments.push({id:uid('payadj'),type:$('payrollAdjustmentType').value,description:$('payrollAdjustmentDescription').value.trim(),amount:Math.round((amount+Number.EPSILON)*100)/100,additionalToMinimum:!!$('payrollAdjustmentAboveMinimum')?.checked,createdAt:new Date().toISOString()});await savePayrollData(true);$('payrollAdjustmentAmount').value='';$('payrollAdjustmentDescription').value='';if($('payrollAdjustmentAboveMinimum'))$('payrollAdjustmentAboveMinimum').checked=false;renderPayrollAdjustmentsTable(id);renderDriverTable();showAlert('Payroll adjustment added.','success');
  }
  async function deletePayrollAdjustment(id,driverId){ const pd=payrollPeriodDriverState(driverId,true);pd.adjustments=(pd.adjustments||[]).filter(a=>a.id!==id);await savePayrollData(true);renderPayrollAdjustmentsTable(driverId);renderDriverTable(); }

  function populateDateSelectors() {
    // Dropdowns are date selectors only. Never show source filenames as the option label.
    // If duplicate copies of the same settlement are present, show that date once.
    const dated=state.catalog.filter(x=>isValidIsoDate(x.settlementDate));
    const bySettlement=new Map();
    for(const x of dated) if(!bySettlement.has(x.settlementDate)) bySettlement.set(x.settlementDate,x);
    const settlementItems=[...bySettlement.values()];
    $('driverSettlementDateSelect').innerHTML=settlementItems.map(x=>`<option value="${escapeHtml(x.id)}">${fmtDate(x.settlementDate)}</option>`).join('');
    if($('settlementAnalysisDateSelect')) $('settlementAnalysisDateSelect').innerHTML=settlementItems.map(x=>`<option value="${escapeHtml(x.id)}">${fmtDate(x.settlementDate)}</option>`).join('');

    const byPay=new Map();
    for(const x of settlementItems) if(isValidIsoDate(x.payDate) && !byPay.has(x.payDate)) byPay.set(x.payDate,x);
    $('payDateSelect').innerHTML=[...byPay.values()].map(x=>`<option value="${escapeHtml(x.id)}">${fmtDate(x.payDate)}</option>`).join('');
  }

  function selectStatement(id, announce=true) {
    const item=state.catalog.find(x=>x.id===id); if(!item) return;
    Core.recalculateDriverPay(item.result,getRates());
    item.result.summary.settlementDate=item.settlementDate;
    item.result.summary.payDate=item.payDate;
    state.currentStatementId=item.id; state.result=item.result; state.file=item.file; state.rawBytes=item.rawBytes; state.rawText=item.rawText;
    syncSharedDriverRoster();
    $('emptyState').classList.add('hidden');
    $('exportBtn').disabled=false; $('saveBtn').disabled=false;
    const settlementOption=[...$('driverSettlementDateSelect').options].find(o=>state.catalog.find(x=>x.id===o.value)?.settlementDate===item.settlementDate);
    const payOption=[...$('payDateSelect').options].find(o=>state.catalog.find(x=>x.id===o.value)?.payDate===item.payDate);
    if(settlementOption) $('driverSettlementDateSelect').value=settlementOption.value;
    if(payOption) $('payDateSelect').value=payOption.value;
    $('selectedStatementSource').textContent=item.fileName;
    $('fileMeta').textContent=`Settlement ${fmtDate(item.settlementDate)} • Pay date ${fmtDate(item.payDate)} • Activity ${item.result.summary.periodStart || '—'} to ${item.result.summary.periodEnd || '—'}`;
    renderAll();
    maybeAutoRefreshPayrollHosWorkDays();
    if(announce && item.result.warnings.length) showAlert(item.result.warnings.map(w=>`• ${w}`).join('<br>'),'warning');
  }

  async function parseUploadedSettlement(file){
    const {ab,text}=await decodeFile(file);
    const result=Core.analyzeSettlement(text,file.name,getRates());
    if(!result.linehaul.length && !result.spots.length) throw new Error('No FedEx linehaul or spot trip rows were found. Please confirm this is a settlement-detail CSV.');
    const settlementDate=deriveSettlementDate(text,result,file.name);
    if(!settlementDate) throw new Error('No dated settlement activity was found. The app needs at least one dated trip, fuel, or Tractor Repair/Misc row to calculate the Settlement Date.');
    const payDate=payDateForSettlement(settlementDate);
    result.summary.settlementDate=settlementDate;result.summary.payDate=payDate;
    return {file,ab,text,result,settlementDate,payDate,fingerprint:settlementFingerprint(result)};
  }
  function confirmSettlementReplacement(upload,existing){
    return confirm(`A different settlement is already active for ${fmtDate(upload.settlementDate)}.\n\nExisting: ${existing.fileName||'Saved settlement'}\nNew: ${upload.file.name}\n\nChoose OK to replace the active statement with the new file. Choose Cancel to keep the existing statement.`);
  }
  async function handleFiles(fileList) {
    const files=[...(fileList||[])].filter(Boolean); if(!files.length)return;
    if(!state.directoryHandle && !cloudConnected()) {
      showAlert('Sign in to <strong>NBL Cloud</strong> or choose the <strong>Data Folder</strong> first.','warning');
      return;
    }
    const stats={added:0,replaced:0,duplicates:0,kept:0,errors:[]}; let working=[...(state.catalog||[])],preferredId='';
    const changedStatements=[],deletedStatementKeys=[];
    try{
      if(cloudConnected())await ensureFinanceCloudStorage();
      showAlert(`Processing <strong>${files.length}</strong> settlement file${files.length===1?'':'s'}…`,'success');
      let statementsDir=null;
      if(state.directoryHandle){
        if(!(await requestPermission(state.directoryHandle,'readwrite'))) throw new Error('Write permission is required for the NBL business data folder.');
        statementsDir=await state.directoryHandle.getDirectoryHandle('Statements',{create:true});
      }
      for(let index=0;index<files.length;index++){
        const file=files[index];
        try{
          showAlert(`Processing settlement ${index+1} of ${files.length}: <strong>${escapeHtml(file.name)}</strong>…`,'success');
          const upload=await parseUploadedSettlement(file);
          const exact=working.find(x=>(x.fingerprint||settlementFingerprint(x.result))===upload.fingerprint);
          if(exact){stats.duplicates++;continue;}
          const conflict=working.find(x=>x.settlementDate===upload.settlementDate);
          if(conflict&&!confirmSettlementReplacement(upload,conflict)){stats.kept++;continue;}
          const nextWorking=conflict?working.filter(x=>x.settlementDate!==upload.settlementDate):[...working];
          let addedItem;
          if(statementsDir){
            const destName=`${upload.settlementDate}_settlement.csv`;
            await writeFile(statementsDir,destName,new Uint8Array(upload.ab),'text/csv');
            preferredId=`Statements/${destName}`;
            addedItem={id:preferredId,relativePath:preferredId,fileName:file.name,result:upload.result,settlementDate:upload.settlementDate,payDate:upload.payDate,fingerprint:upload.fingerprint,lastModified:Date.now()};
            nextWorking.push(addedItem);
          }else{
            const id=`cloud/${upload.settlementDate}/settlement`;
            addedItem={id,relativePath:id,fileName:file.name,file:null,result:upload.result,rawText:'',rawBytes:null,settlementDate:upload.settlementDate,payDate:upload.payDate,fingerprint:upload.fingerprint,lastModified:Date.now()};
            nextWorking.push(addedItem);preferredId=id;
          }
          changedStatements.push(addedItem);
          const conflictKey=String(conflict?.id||conflict?.relativePath||'');
          if(conflictKey&&conflictKey!==String(addedItem.id||addedItem.relativePath||''))deletedStatementKeys.push(conflictKey);
          working=nextWorking;if(conflict)stats.replaced++;else stats.added++;
        }catch(err){console.error('Settlement upload failed',file.name,err);stats.errors.push(`${file.name}: ${err.message||String(err)}`);}
      }
      if(state.directoryHandle&&(stats.added||stats.replaced)){
        await scanFolder(preferredId,true);await saveToFolder(true);
        if(cloudConnected())await saveSettlementUploadChanges(changedStatements,deletedStatementKeys);
      }else if(!state.directoryHandle&&(stats.added||stats.replaced)){
        const deduped=dedupeSettlementCatalog(working);state.catalog=deduped.active;state.settlement.duplicates=deduped.duplicates;
        state.settlement.analysisStatementId=preferredId||state.catalog[0]?.id||null;populateDateSelectors();if(state.settlement.analysisStatementId)selectStatement(state.settlement.analysisStatementId,false);
        await saveSettlementUploadChanges(changedStatements,deletedStatementKeys);
      }
      const parts=[];
      if(stats.added)parts.push(`<strong>${stats.added}</strong> added`);if(stats.replaced)parts.push(`<strong>${stats.replaced}</strong> replaced`);if(stats.duplicates)parts.push(`<strong>${stats.duplicates}</strong> exact duplicate${stats.duplicates===1?'':'s'} skipped`);if(stats.kept)parts.push(`<strong>${stats.kept}</strong> existing statement${stats.kept===1?'':'s'} kept`);if(stats.errors.length)parts.push(`<strong>${stats.errors.length}</strong> error${stats.errors.length===1?'':'s'}`);
      const detail=stats.errors.length?`<br>${stats.errors.slice(0,3).map(escapeHtml).join('<br>')}${stats.errors.length>3?'<br>…':''}`:'';
      showAlert(`Settlement upload complete: ${parts.join(' • ')||'no changes'}.${detail}`,stats.errors.length?'warning':'success');
    }catch(err){console.error(err);showAlert(`The settlements were analyzed but could not be saved to NBL Cloud: ${escapeHtml(err.message||String(err))}`,'error');}
  }

  function ratesChanged() {
    if(!state.result) return;
    Core.recalculateDriverPay(state.result,getRates());
    renderDriverTable();
    scheduleAutosave();
  }
  function scheduleAutosave() {
    clearTimeout(state.autosaveTimer);
    state.autosaveTimer=setTimeout(()=>{ if(state.result){ if(state.directoryHandle) saveToFolder(true).catch(()=>{}); if(cloudConnected()) saveCloudModule('settlement',true).catch(()=>{}); } },700);
  }

  const DASHBOARD_PREFS_DEFAULT={showMiles:true,showDispatch:true,showMaintenance:true,showAttention:true,milesWeeks:8};
  function dashboardPrefsKey(){ return `nbl_dashboard_preferences_${state.cloud?.user?.id||'local'}`; }
  function dashboardPreferences(){
    if(state.dashboard.preferences) return state.dashboard.preferences;
    try{ state.dashboard.preferences={...DASHBOARD_PREFS_DEFAULT,...JSON.parse(localStorage.getItem(dashboardPrefsKey())||'{}')}; }
    catch(_){ state.dashboard.preferences={...DASHBOARD_PREFS_DEFAULT}; }
    return state.dashboard.preferences;
  }
  function dateAtNoon(iso){ const d=new Date(`${iso}T12:00:00`); return isNaN(d)?null:d; }
  function addDays(date,n){ const d=new Date(date); d.setDate(d.getDate()+n); return d; }
  function saturdayStart(date){ const d=new Date(date); d.setHours(12,0,0,0); d.setDate(d.getDate()-((d.getDay()+1)%7)); return d; }
  function dashboardRanges(){
    const today=dateAtNoon(todayIso()), week=saturdayStart(today), lastStart=addDays(week,-7), lastEnd=addDays(lastStart,6);
    return [
      {key:'yesterday',label:'Yesterday',start:addDays(today,-1),end:addDays(today,-1)},
      {key:'wtd',label:'Week to Date',start:week,end:today},
      {key:'last',label:'Last Week',start:lastStart,end:lastEnd},
      {key:'mtd',label:'Month to Date',start:new Date(today.getFullYear(),today.getMonth(),1,12),end:today},
      {key:'ytd',label:'Year to Date',start:new Date(today.getFullYear(),0,1,12),end:today}
    ];
  }
  function dashboardMileageRows(){
    if(state.catalog?.length){ const data=dashboardMileageSnapshot().mileage; state.dashboard.mileage=data; return data; }
    return state.dashboard.mileage||[];
  }
  function mileageInRange(rows,start,end){
    return rows.reduce((a,x)=>{ const d=dateAtNoon(x.date); if(!d||d<start||d>end)return a; const n=Number(x.miles)||0; a.total+=n; a[x.type==='spot'?'spot':'linehaul']+=n; return a; },{total:0,linehaul:0,spot:0});
  }
  function dashboardMilesSvg(weeks){
    if(!weeks.length) return '<div class="dashboard-empty">No completed-week mileage data is available yet.</div>';
    const W=920,H=280,p={l:58,r:22,t:20,b:48},max=Math.max(1,...weeks.map(x=>x.total));
    const x=i=>p.l+(weeks.length===1?0:(W-p.l-p.r)*i/(weeks.length-1)), y=v=>p.t+(H-p.t-p.b)*(1-v/max);
    const ticks=[0,.25,.5,.75,1];
    const path=key=>weeks.map((w,i)=>`${i?'L':'M'} ${x(i).toFixed(1)} ${y(w[key]).toFixed(1)}`).join(' ');
    const lines=ticks.map(t=>`<line x1="${p.l}" y1="${y(max*t)}" x2="${W-p.r}" y2="${y(max*t)}" class="grid"/><text x="${p.l-9}" y="${y(max*t)+4}" text-anchor="end">${escapeHtml(max*t>=1000?`${Math.round(max*t/1000)}k`:fmtNum(max*t))}</text>`).join('');
    const step=Math.max(1,Math.ceil(weeks.length/8));
    const labels=weeks.map((w,i)=>i%step===0||i===weeks.length-1?`<text x="${x(i)}" y="${H-17}" text-anchor="middle">${escapeHtml(new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric'}).format(w.end))}</text>`:'').join('');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Weekly total, linehaul, and spot miles"><g>${lines}${labels}<path d="${path('total')}" class="series total"/><path d="${path('linehaul')}" class="series linehaul"/><path d="${path('spot')}" class="series spot"/></g></svg>`;
  }
  function dashboardOutOfService(tractor){
    const v=typeof motiveVehicleForMaintenanceTractor==='function'?motiveVehicleForMaintenanceTractor(tractor):null;
    return /out[ _-]*of[ _-]*service|\boos\b/i.test(String(tractor?.status||v?.status||''));
  }
  function renderDashboard(){
    if(!$('dashboardScreen')) return;
    const prefs=dashboardPreferences();
    $('dashboardMilesSection').classList.toggle('hidden',!prefs.showMiles); $('dashboardDispatchSection').classList.toggle('hidden',!prefs.showDispatch);
    $('dashboardMaintenanceSection').classList.toggle('hidden',!prefs.showMaintenance); $('dashboardAttentionSection').classList.toggle('hidden',!prefs.showAttention);
    const name=displayPersonName(state.cloud?.profile?.full_name||state.cloud?.user?.email?.split('@')[0]||'');
    $('dashboardGreeting').textContent=name?`Welcome back, ${name}`:'Welcome to FleetCommand';
    const rows=dashboardMileageRows(), ranges=dashboardRanges(), last=ranges.find(x=>x.key==='last'), mtd=ranges.find(x=>x.key==='mtd'), ytd=ranges.find(x=>x.key==='ytd');
    const latest=rows.map(x=>x.date).filter(Boolean).sort().at(-1), latestDate=latest?dateAtNoon(latest):null;
    const mileCards=[['Last Week',last],['Month to Date',mtd],['Year to Date',ytd]].map(([label,r])=>{
      const m=mileageInRange(rows,r.start,r.end), hasData=!!latestDate&&latestDate>=r.start;
      return [label,m,hasData];
    });
    $('dashboardMilesCards').innerHTML=mileCards.map(([label,m,hasData])=>`<div class="dashboard-mile-card"><span>${label}</span><strong>${hasData?fmtNum(m.total):'—'}</strong><small>${hasData?`<b>${fmtNum(m.linehaul)}</b> linehaul <i>•</i> <b>${fmtNum(m.spot)}</b> spot`:'No uploaded data for this period'}</small></div>`).join('');
    $('dashboardMilesAsOf').textContent=latest?`Uploaded activity through ${fmtDate(latest)}. Trend ends at the latest completed Saturday–Friday week in the uploaded data.`:'Upload settlement statements to populate mileage.';
    const selectedWeeks=Number($('dashboardMilesRange')?.value||prefs.milesWeeks||8); if($('dashboardMilesRange')) $('dashboardMilesRange').value=String(selectedWeeks);
    const buckets=[];
    if(latestDate){
      let latestCompletedStart=saturdayStart(latestDate);
      const latestCompletedEnd=addDays(latestCompletedStart,6);
      if(latestDate<latestCompletedEnd) latestCompletedStart=addDays(latestCompletedStart,-7);
      for(let i=selectedWeeks-1;i>=0;i--){ const start=addDays(latestCompletedStart,-7*i),end=addDays(start,6),m=mileageInRange(rows,start,end);buckets.push({...m,start,end}); }
    }
    $('dashboardMilesChart').innerHTML=dashboardMilesSvg(buckets);

    const boards=Object.values(state.dispatch.dailyBoards||{}).filter(x=>x&&x.savedAt&&Array.isArray(x.rows));
    const hubs=['Nashville','Spartanburg','Marietta'];
    for(const b of boards) for(const r of b.rows) if(r.hub&&!hubs.includes(r.hub)&&r.hub!=='Other') hubs.push(r.hub);
    const dispatchRanges=ranges;
    $('dashboardDispatchHead').innerHTML=`<tr><th>Hub</th>${dispatchRanges.map(r=>`<th>${escapeHtml(r.label)}</th>`).join('')}</tr>`;
    $('dashboardDispatchBody').innerHTML=hubs.map(hub=>`<tr><td><strong>${escapeHtml(hub)}</strong></td>${dispatchRanges.map(range=>{let accepted=0,declined=0,days=0;for(const b of boards){const d=dateAtNoon(b.date);if(!d||d<range.start||d>range.end)continue;days++;for(const row of b.rows.filter(x=>(x.hub||dailyDispatchHub(x))===hub)){if(row.dispatchStatus==='accepted')accepted++;if(row.dispatchStatus==='declined')declined++;}}return `<td data-label="${escapeHtml(range.label)}"><strong>${accepted}</strong><small>dispatched</small><em>${declined} decline${declined===1?'':'s'}</em></td>`;}).join('')}</tr>`).join('');
    $('dashboardDispatchNote').textContent=boards.length?`Calculated from ${boards.length} saved daily dispatch board${boards.length===1?'':'s'}. Periods with no saved board are not counted.`:'Save a Daily Dispatch Board to begin tracking dispatch activity.';

    const statuses=maintenanceStatuses(), oos=statuses.filter(x=>dashboardOutOfService(x.tractor)), active=statuses.filter(x=>!dashboardOutOfService(x.tractor));
    const current=active.filter(x=>x.status==='ok').length,due=active.filter(x=>x.status==='due-soon').length,overdue=active.filter(x=>x.status==='overdue').length;
    $('dashboardMaintenanceCards').innerHTML=[['Current',current,'ok'],['Due Soon',due,'warning'],['Overdue',overdue,'danger'],['Out of Service',oos.length,'oos']].map(x=>`<button type="button" class="dashboard-maintenance-card ${x[2]}" data-dashboard-screen="maintenance"><span>${x[0]}</span><strong>${x[1]}</strong></button>`).join('');
    const attention=[];
    for(const x of oos) attention.push({level:'danger',title:`Tractor ${x.tractor.tractorNumber||'—'} is out of service`,detail:'Review fleet status in Maintenance.',screen:'maintenance'});
    for(const x of active.filter(x=>x.status==='overdue')) attention.push({level:'danger',title:`Tractor ${x.tractor.tractorNumber||'—'} maintenance is overdue`,detail:x.milesRemaining!=null?`${fmtNum(Math.abs(x.milesRemaining))} miles past due`:'Preventive maintenance is past due',screen:'maintenance'});
    for(const x of active.filter(x=>x.status==='due-soon')) attention.push({level:'warning',title:`Tractor ${x.tractor.tractorNumber||'—'} is due soon`,detail:x.milesRemaining!=null?`${fmtNum(Math.max(0,x.milesRemaining))} miles remaining`:'Maintenance due within approximately four weeks',screen:'maintenance'});
    for(const x of active.filter(x=>x.status==='baseline')) attention.push({level:'neutral',title:`Tractor ${x.tractor.tractorNumber||'—'} needs a PM baseline`,detail:'Add the most recent maintenance record.',screen:'maintenance'});
    for(const x of (state.meetings.inspections||[]).filter(x=>x.addressed!=='Y')) attention.push({level:Number(x.priority)===1?'danger':'warning',title:`Open inspection: Tractor ${x.tractorNumber||x.tractor||'—'}`,detail:x.issue||'Inspection issue needs review.',screen:'meetings'});
    $('dashboardAttentionCount').textContent=`${attention.length} item${attention.length===1?'':'s'}`;
    $('dashboardAttentionList').innerHTML=attention.length?attention.slice(0,10).map(x=>`<button type="button" class="dashboard-attention-item ${x.level}" data-dashboard-screen="${x.screen}"><span></span><div><strong>${escapeHtml(x.title)}</strong><small>${escapeHtml(x.detail)}</small></div><em>View</em></button>`).join(''):'<div class="dashboard-empty compact">Nothing requires attention right now.</div>';
  }
  function renderAll(){ renderDashboard(); setScreen(state.currentScreen); }
  function payrollTableTotals(ds){
    return ds.reduce((a,d)=>({days:a.days+(Number(d.daysWorked)||0),lm:a.lm+(Number(d.linehaulMiles)||0),sm:a.sm+(Number(d.spotMiles)||0),tm:a.tm+(Number(d.totalMiles)||0),dhe:a.dhe+(Number(d.dhEventCount)||0),dhp:a.dhp+(Number(d.dhPay)||0),base:a.base+(Number(d.basePay)||0),min:a.min+(Number(d.minimumTopUp)||0),bonus:a.bonus+(Number(d.adjustmentBuckets?.bonus)||0),holiday:a.holiday+(Number(d.adjustmentBuckets?.holiday)||0),vacation:a.vacation+(Number(d.adjustmentBuckets?.vacation)||0),training:a.training+(Number(d.adjustmentBuckets?.training)||0),other:a.other+(Number(d.adjustmentBuckets?.other)||0),tp:a.tp+(Number(d.totalPay)||0)}),{days:0,lm:0,sm:0,tm:0,dhe:0,dhp:0,base:0,min:0,bonus:0,holiday:0,vacation:0,training:0,other:0,tp:0});
  }
  function payrollGroupTable(ds,label){
    const week=payrollWeekDates();
    const dayHeaders=week.map(date=>`<th class="payroll-day-header"><span>${escapeHtml(payrollDayHeaderLabel(date))}</span></th>`);
    const headers=['Driver','FedEx ID','Pay Plan',...dayHeaders,'Days','Linehaul Miles','Spot Miles','Total Miles','D&H Breakdown','D&H Pay','Base Pay','Min Top-Up','Bonus','Holiday','Vacation','Training','Other Adj.','Total Pay','Actions'];
    const rows=ds.map(d=>{
      const p=d.profile,rateSummary=d.payMethod==='day_rate'?`${fmtMoney(d.dayRate)}/day`:d.payMethod==='hybrid'?`${fmtMoney(d.dayRate)}/day + ${fmtMoney(d.mileageRate)}/mi + D&H mapping`:`${fmtMoney(d.mileageRate)}/mi • D&H by value`;
      const breakdown=d.dhBreakdown?.length?d.dhBreakdown.map(x=>`<span class="dh-breakdown-item ${x.mapped?'':'unmapped'}"><b>${fmtMoney(x.amount)}</b> × ${x.count}${x.mapped?` → ${fmtMoney(x.payout)} ea`:' → payout needed'}</span>`).join(''):'—';
      const worked=new Set(d.workedDates||[]),autoWorked=new Set(d.automaticWorkDates||[]),pd=payrollPeriodDriverState(String(d.fedexId||''),false),overrides=pd?.workDays||{};
      const dayCells=week.map(date=>{const manual=Object.prototype.hasOwnProperty.call(overrides,date),source=manual?'Manual override':(d.workdaySource==='Motive HOS'?'Motive HOS':'Settlement activity');return `<td class="payroll-workday-cell"><label class="payroll-workday-check ${manual?'manual':(d.workdaySource==='Motive HOS'?'hos-auto':'')}" title="${escapeHtml(d.name)} — ${escapeHtml(payrollDayHeaderLabel(date))} • ${escapeHtml(source)}"><input type="checkbox" data-payroll-workday-driver="${escapeHtml(d.fedexId)}" data-payroll-workday-date="${escapeHtml(date)}" ${worked.has(date)?'checked':''}><span>✓</span></label></td>`;}).join('');
      return `<tr><td><strong>${escapeHtml(d.name)}</strong></td><td>${escapeHtml(d.fedexId)}</td><td><span class="pay-method-pill ${escapeHtml(d.payMethod)}">${escapeHtml(d.payMethodLabel)}</span><small class="pay-rate-summary">${escapeHtml(rateSummary)}${p.minimumEnabled?` • Min ${fmtMoney(p.weeklyMinimum)}`:''}</small></td>${dayCells}<td><strong>${d.daysWorked}</strong></td><td>${fmtNum(d.linehaulMiles)}</td><td>${fmtNum(d.spotMiles)}</td><td><strong>${fmtNum(d.totalMiles)}</strong></td><td class="dh-breakdown-cell">${breakdown}</td><td>${d.dhPay?fmtMoney(d.dhPay):'—'}${d.unmappedDhValues?.length?'<small class="dh-unmapped-note">Unmapped value</small>':''}</td><td>${fmtMoney(d.basePay)}</td><td>${d.minimumTopUp?`<strong>${fmtMoney(d.minimumTopUp)}</strong>`:'—'}</td><td>${d.adjustmentBuckets.bonus?fmtMoney(d.adjustmentBuckets.bonus):'—'}</td><td>${d.adjustmentBuckets.holiday?fmtMoney(d.adjustmentBuckets.holiday):'—'}</td><td>${d.adjustmentBuckets.vacation?fmtMoney(d.adjustmentBuckets.vacation):'—'}</td><td>${d.adjustmentBuckets.training?fmtMoney(d.adjustmentBuckets.training):'—'}</td><td>${d.adjustmentBuckets.other?fmtMoney(d.adjustmentBuckets.other):'—'}</td><td><strong>${fmtMoney(d.totalPay)}</strong></td><td><div class="row-actions"><button class="table-action" data-payroll-summary-pdf="${escapeHtml(d.fedexId)}">PDF Summary</button><button class="table-action" data-edit-payroll-profile="${escapeHtml(d.fedexId)}">Pay Profile</button><button class="table-action" data-payroll-adjustments="${escapeHtml(d.fedexId)}">Adjust</button></div></td></tr>`;
    }).join('');
    const t=payrollTableTotals(ds),dayCounts=week.map(date=>ds.filter(d=>(d.workedDates||[]).includes(date)).length);
    const dayTotalCells=dayCounts.map(n=>`<td class="payroll-workday-total">${n}</td>`).join('');
    const totalRow=`<tr><td>${escapeHtml(label)} TOTAL</td><td></td><td></td>${dayTotalCells}<td>${fmtNum(t.days)}</td><td>${fmtNum(t.lm)}</td><td>${fmtNum(t.sm)}</td><td>${fmtNum(t.tm)}</td><td>${fmtNum(t.dhe)} events</td><td>${fmtMoney(t.dhp)}</td><td>${fmtMoney(t.base)}</td><td>${fmtMoney(t.min)}</td><td>${fmtMoney(t.bonus)}</td><td>${fmtMoney(t.holiday)}</td><td>${fmtMoney(t.vacation)}</td><td>${fmtMoney(t.training)}</td><td>${fmtMoney(t.other)}</td><td>${fmtMoney(t.tp)}</td><td></td></tr>`;
    const colspan=18+week.length;
    return `<div class="table-wrap payroll-table-wrap"><table class="payroll-table payroll-attendance-table"><thead><tr>${headers.map(h=>String(h).startsWith('<th')?h:`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows||`<tr><td colspan="${colspan}" class="empty-table-cell">No drivers in this pay group for the selected pay period.</td></tr>`}</tbody><tfoot>${totalRow}</tfoot></table></div>`;
  }
  function renderDriverTable() {
    if(!state.result) return;
    renderDhMappings();
    renderPayrollHosStatus();
    const ds=payrollRows();
    const dayRate=ds.filter(d=>d.payMethod==='day_rate');
    const mileage=ds.filter(d=>d.payMethod!=='day_rate');
    const grand=payrollTableTotals(ds);
    const groups=$('driverPayrollGroups');
    if(groups){
      groups.innerHTML=`
        <details class="payroll-group payroll-group-day" open>
          <summary><span><strong>Day Rate Drivers</strong><small>${dayRate.length} driver${dayRate.length===1?'':'s'} • ${fmtNum(payrollTableTotals(dayRate).days)} paid day${payrollTableTotals(dayRate).days===1?'':'s'}</small></span><span class="payroll-group-summary-total">${fmtMoney(payrollTableTotals(dayRate).tp)} <b class="payroll-dropdown-arrow">⌄</b></span></summary>
          ${payrollGroupTable(dayRate,'DAY RATE')}
        </details>
        <details class="payroll-group payroll-group-mileage" open>
          <summary><span><strong>Mileage Rate Drivers</strong><small>${mileage.length} driver${mileage.length===1?'':'s'} • ${fmtNum(payrollTableTotals(mileage).tm)} miles</small></span><span class="payroll-group-summary-total">${fmtMoney(payrollTableTotals(mileage).tp)} <b class="payroll-dropdown-arrow">⌄</b></span></summary>
          ${payrollGroupTable(mileage,'MILEAGE')}
        </details>
        <div class="payroll-grand-total-row"><span>ALL DRIVERS TOTAL</span><span><strong>${fmtNum(grand.tm)}</strong> miles</span><span><strong>${fmtNum(grand.days)}</strong> days</span><span><strong>${fmtMoney(grand.tp)}</strong></span></div>`;
    }
    $('totalDriverPay').textContent=fmtMoney(grand.tp);
  }
  // v43: driver-facing payroll summary PDFs. Settlement D&H values are deliberately
  // excluded; drivers see only their own D&H quantities and payout rates.
  const PAYROLL_SUMMARY_LOGO_DATA_URL='assets/nashbox-logistics-logo.png';
  let payrollSummaryLogoCache=null;
  async function payrollSummaryLogoImage(){
    if(payrollSummaryLogoCache) return payrollSummaryLogoCache;
    payrollSummaryLogoCache=await new Promise((resolve,reject)=>{
      const img=new Image(); img.onload=()=>resolve(img); img.onerror=()=>reject(new Error('Could not load Nashbox Logistics logo.')); img.src=PAYROLL_SUMMARY_LOGO_DATA_URL;
    });
    return payrollSummaryLogoCache;
  }
  function payrollSummaryAdjustmentLabel(type){
    return type==='bonus'?'Bonus':type==='holiday'?'Holiday Pay':type==='vacation'?'Vacation Pay':type==='training'?'Training Pay':'Other Adjustment';
  }
  function payrollSummaryDhRows(driver){
    const grouped=new Map();
    for(const x of driver.dhBreakdown||[]){
      if(!x.mapped || !(Number(x.count)>0)) continue;
      const payout=Math.round((Number(x.payout)||0)*100)/100, key=payout.toFixed(2);
      const cur=grouped.get(key)||{payout,count:0,pay:0};
      cur.count+=Number(x.count)||0; cur.pay+=Number(x.pay)||0; grouped.set(key,cur);
    }
    const arr=[...grouped.values()].sort((a,b)=>a.payout-b.payout);
    return arr.map((x,i)=>({
      label:arr.length===2?(i===0?'D&H Singles':'D&H Doubles'):(arr.length===1?'D&H':'D&H Type '+(i+1)),
      detail:`${fmtNum(x.count)} × $${x.payout.toFixed(2)}`,
      amount:Math.round((x.pay+Number.EPSILON)*100)/100
    }));
  }
  function payrollSummaryRows(driver){
    const rows=[], method=driver.payMethod;
    if(method==='day_rate' || method==='hybrid') rows.push({label:'Regular Day Pay',detail:`${driver.daysWorked} day${Number(driver.daysWorked)===1?'':'s'} × $${Number(driver.dayRate||0).toFixed(2)}`,amount:Number(driver.dayPay)||0});
    if(method!=='day_rate'){
      rows.push({label:'Mileage Pay',detail:`${fmtNum(driver.totalMiles)} miles × $${Number(driver.mileageRate||0).toFixed(2)}`,amount:Number(driver.milesPay)||0});
      rows.push(...payrollSummaryDhRows(driver));
    }
    if(driver.profile?.minimumEnabled){
      const qualifying=Number(driver.minimumQualifyingAdditionalPay)||0, above=Number(driver.minimumAboveAdditionalPay)||0;
      const detailParts=[`Weekly minimum $${Number(driver.weeklyMinimum||0).toFixed(2)}`];
      if(qualifying>0) detailParts.push(`includes $${qualifying.toFixed(2)} additional pay`);
      if(above>0) detailParts.push(`$${above.toFixed(2)} paid on top`);
      rows.push({label:'Weekly Minimum Adjustment',detail:detailParts.join(' • '),amount:Number(driver.minimumTopUp)||0});
    }
    const adjustmentGroups=new Map();
    for(const a of driver.adjustments||[]){
      const type=['bonus','holiday','vacation','training'].includes(a.type)?a.type:'other', above=!!a.additionalToMinimum && Number(a.amount)>0, key=`${type}|${above?'above':'minimum'}`;
      const g=adjustmentGroups.get(key)||{type,aboveMinimum:above,amount:0,notes:[]}; g.amount+=Number(a.amount)||0; const note=String(a.description||'').trim(); if(note) g.notes.push(note); adjustmentGroups.set(key,g);
    }
    for(const type of ['bonus','holiday','vacation','training','other']){
      for(const above of [false,true]){
        const g=adjustmentGroups.get(`${type}|${above?'above':'minimum'}`); if(!g || Math.abs(g.amount)<0.001) continue;
        const noteText=g.notes.length?[...new Set(g.notes)].join('; '):'Additional pay / adjustment';
        rows.push({label:payrollSummaryAdjustmentLabel(type),detail:g.aboveMinimum?`${noteText} • paid in addition to minimum`:noteText,amount:Math.round((g.amount+Number.EPSILON)*100)/100});
      }
    }
    return rows;
  }
  function payrollSummaryPeriodText(){
    const s=state.result?.summary||{}, start=s.periodStart?fmtDate(s.periodStart):'', end=s.periodEnd?fmtDate(s.periodEnd):'';
    return start&&end?`${start} – ${end}`:start||end||'—';
  }
  function payrollCanvasMoney(n){
    return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n)||0);
  }
  async function renderPayrollSummaryCanvas(driver){
    const W=1241,H=1754,canvas=document.createElement('canvas'); canvas.width=W; canvas.height=H; const ctx=canvas.getContext('2d');
    const purple='#35164E', orange='#F15A24', textColor='#30283A', muted='#756C7D', line='#E7E0EA', light='#F8F6FA', green='#1B7F5A';
    ctx.fillStyle='#FFFFFF'; ctx.fillRect(0,0,W,H);
    const logo=await payrollSummaryLogoImage();
    const logoW=330, logoH=logo.height*(logoW/logo.width); ctx.drawImage(logo,88,72,logoW,logoH);
    ctx.textAlign='right'; ctx.fillStyle=purple; ctx.font='700 38px Arial'; ctx.fillText('DRIVER PAY SUMMARY',W-88,110);
    ctx.fillStyle=muted; ctx.font='20px Arial'; ctx.fillText(`Pay Date: ${fmtDate(state.result?.summary?.payDate)}`,W-88,146);
    ctx.fillStyle=orange; ctx.fillRect(88,205,W-176,8);
    ctx.textAlign='left';
    ctx.fillStyle=purple; ctx.font='700 31px Arial'; ctx.fillText(driver.name||'Driver',88,275);
    ctx.fillStyle=muted; ctx.font='18px Arial'; ctx.fillText(`FedEx ID: ${driver.fedexId||'—'}`,88,310);
    const metaTop=350, metaH=118, metaGap=18, metaW=(W-176-metaGap*2)/3;
    const meta=[['PAY PERIOD',payrollSummaryPeriodText()],['PAY METHOD',driver.payMethodLabel||'—'],['SETTLEMENT DATE',fmtDate(state.result?.summary?.settlementDate)]];
    meta.forEach((m,i)=>{const x=88+i*(metaW+metaGap);ctx.fillStyle=light;ctx.fillRect(x,metaTop,metaW,metaH);ctx.strokeStyle=line;ctx.lineWidth=2;ctx.strokeRect(x,metaTop,metaW,metaH);ctx.fillStyle=muted;ctx.font='700 14px Arial';ctx.fillText(m[0],x+20,metaTop+32);ctx.fillStyle=purple;ctx.font='700 18px Arial';const max=metaW-40;let val=String(m[1]||'—');while(ctx.measureText(val).width>max&&val.length>4)val=val.slice(0,-2)+'…';ctx.fillText(val,x+20,metaTop+70);});
    const tableX=88, tableY=525, tableW=W-176, headerH=52, rowH=76;
    const col1=tableX+22, col2=tableX+510, col3=tableX+tableW-22;
    ctx.fillStyle=purple;ctx.fillRect(tableX,tableY,tableW,headerH);ctx.fillStyle='#fff';ctx.font='700 15px Arial';ctx.textAlign='left';ctx.fillText('PAY DETAIL',col1,tableY+33);ctx.fillText('QTY / RATE / NOTE',col2,tableY+33);ctx.textAlign='right';ctx.fillText('AMOUNT',col3,tableY+33);
    const rows=payrollSummaryRows(driver); let y=tableY+headerH;
    rows.forEach((r,i)=>{
      ctx.fillStyle=i%2===0?'#FFFFFF':'#FCFAFD';ctx.fillRect(tableX,y,tableW,rowH);ctx.strokeStyle=line;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(tableX,y+rowH);ctx.lineTo(tableX+tableW,y+rowH);ctx.stroke();
      ctx.textAlign='left';ctx.fillStyle=textColor;ctx.font='700 18px Arial';ctx.fillText(r.label,col1,y+31);ctx.fillStyle=muted;ctx.font='16px Arial';const detail=String(r.detail||'');const maxW=col3-col2-155;let shown=detail;while(ctx.measureText(shown).width>maxW&&shown.length>4)shown=shown.slice(0,-2)+'…';ctx.fillText(shown,col2,y+31);
      ctx.textAlign='right';ctx.fillStyle=Number(r.amount)<0?'#A33B3B':textColor;ctx.font='700 18px Arial';ctx.fillText(payrollCanvasMoney(r.amount),col3,y+31);
      y+=rowH;
    });
    y+=30; ctx.fillStyle=purple; ctx.fillRect(tableX,y,tableW,110);
    ctx.textAlign='left';ctx.fillStyle='#FFFFFF';ctx.font='700 18px Arial';ctx.fillText('TOTAL PAY',tableX+26,y+42);ctx.font='16px Arial';ctx.fillStyle='#E8DFF0';ctx.fillText('For the pay period shown above',tableX+26,y+73);
    ctx.textAlign='right';ctx.fillStyle='#FFFFFF';ctx.font='700 38px Arial';ctx.fillText(payrollCanvasMoney(driver.totalPay),tableX+tableW-26,y+66);
    const footY=H-180; ctx.strokeStyle=line;ctx.beginPath();ctx.moveTo(88,footY);ctx.lineTo(W-88,footY);ctx.stroke();ctx.textAlign='left';ctx.fillStyle=muted;ctx.font='15px Arial';ctx.fillText('Nashbox Logistics • Driver Pay Summary',88,footY+38);ctx.font='14px Arial';ctx.fillText('This summary shows the payroll calculation applicable to this driver for the selected pay period.',88,footY+68);
    ctx.textAlign='right';ctx.fillText(`Generated ${new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(new Date())}`,W-88,footY+38);
    return canvas;
  }
  async function savePayrollSummaryPdf(bytes,fileName){
    if(!state.directoryHandle) return false;
    if(!(await requestPermission(state.directoryHandle,'readwrite'))) return false;
    try{
      const payrollDir=await state.directoryHandle.getDirectoryHandle('Payroll',{create:true});
      const summariesDir=await payrollDir.getDirectoryHandle('Driver Summaries',{create:true});
      const periodDir=await summariesDir.getDirectoryHandle(state.result?.summary?.payDate||state.result?.summary?.settlementDate||'undated',{create:true});
      await writeFile(periodDir,fileName,bytes,'application/pdf'); return true;
    }catch(err){ console.warn('Could not save driver pay summary PDF to data folder',err); return false; }
  }
  async function exportPayrollSummaryPdf(fedexId){
    try{
      if(!state.result){showAlert('Select a settlement/pay period first.','warning');return;}
      const driver=payrollRows().find(d=>String(d.fedexId)===String(fedexId));
      if(!driver){showAlert('Could not find that driver in the selected payroll period.','error');return;}
      const canvas=await renderPayrollSummaryCanvas(driver),jpg=await canvasJpegBytes(canvas),pdf=jpegPagesToPdf([jpg],canvas.width,canvas.height);
      const fileName=`NBL_Driver_Pay_Summary_${sanitize(driver.name)||sanitize(driver.fedexId)||'Driver'}_${state.result.summary.payDate||state.result.summary.settlementDate||'Pay'}.pdf`;
      const saved=await savePayrollSummaryPdf(pdf,fileName);
      downloadBlob(pdf,fileName,'application/pdf');
      showAlert(`Driver pay summary exported for <strong>${escapeHtml(driver.name)}</strong>.${saved?' A copy was also saved under Payroll/Driver Summaries.':''}`,'success');
    }catch(err){console.error(err);showAlert('Could not generate the driver pay summary PDF: '+err.message,'error');}
  }

  function setSettlementTab(tab){
    const next=tab==='analysis'?'analysis':'summary';
    state.settlement.activeTab=next;
    document.querySelectorAll('[data-settlement-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.settlementTab===next));
    $('settlementSummaryPanel')?.classList.toggle('hidden',next!=='summary');
    $('settlementAnalysisPanel')?.classList.toggle('hidden',next!=='analysis');
    if(next==='analysis') renderSettlementAnalysis();
  }

  function settlementAnalysisItem(){
    const id=state.settlement.analysisStatementId;
    return state.catalog.find(x=>x.id===id) || state.catalog[0] || null;
  }
  function settlementAnalysisTractorMaster(vehicle){
    const key=normalizeTractor(vehicle);
    if(!key) return null;
    return (state.maintenance.tractors||[]).find(t=>normalizeTractor(t.tractorNumber)===key) || null;
  }
  function settlementDomicileLabel(value){
    let s=String(value||'').trim();
    if(!s) return '';
    // Preserve user-entered names such as "Nashville" and simplify values like "293 - Spartanburg".
    const parts=s.split(/\s+-\s+/).map(x=>x.trim()).filter(Boolean);
    if(parts.length>1 && /^\d+$/.test(parts[0])) s=parts.slice(1).join(' - ');
    return s;
  }
  function linehaulDomicileForTrip(trip){
    const master=settlementAnalysisTractorMaster(trip?.vehicle);
    const fromMaster=settlementDomicileLabel(master?.domicile);
    if(fromMaster) return {label:fromMaster,source:'master'};
    const fallback=settlementDomicileLabel(trip?.vmrCatDom);
    if(fallback) return {label:fallback,source:'settlement'};
    return {label:'Unassigned / Unknown',source:'unknown'};
  }
  function spotClientForTrip(trip){
    const primary=String(trip?.spotName||'').trim();
    const secondary=String(trip?.siteName||'').trim();
    return primary || secondary || 'Unassigned / Unknown';
  }
  function groupSettlementMiles(rows,labelFn){
    const map=new Map();
    for(const row of rows||[]){
      const info=labelFn(row), label=typeof info==='string'?info:info.label;
      const source=typeof info==='object'&&info?info.source:'';
      const key=String(label||'Unassigned / Unknown').trim().toUpperCase();
      const current=map.get(key)||{label:String(label||'Unassigned / Unknown').trim(),miles:0,trips:0,sources:new Set()};
      current.miles+=(Number(row.miles)||0); current.trips+=1; if(source) current.sources.add(source); map.set(key,current);
    }
    return [...map.values()].map(x=>({...x,sources:[...x.sources]})).sort((a,b)=>b.miles-a.miles||a.label.localeCompare(b.label));
  }
  function settlementAnalysisBars(rows,total){
    if(!rows.length) return '<div class="analysis-empty">No mileage was found in this section for the selected settlement.</div>';
    const max=Math.max(...rows.map(x=>Number(x.miles)||0),1);
    return rows.slice(0,8).map(x=>`<div class="analysis-bar-row"><div class="analysis-bar-label"><strong>${escapeHtml(x.label)}</strong><span>${fmtNum(x.miles)} mi</span></div><div class="analysis-bar-track"><div class="analysis-bar-fill" style="width:${Math.max(2,Math.min(100,(Number(x.miles)||0)/max*100)).toFixed(1)}%"></div></div><small>${total?((Number(x.miles)||0)/total*100).toFixed(1):'0.0'}%</small></div>`).join('');
  }
  function renderSettlementAnalysis(){
    if(!$('settlementAnalysisPanel')||!state.catalog.length) return;
    const item=settlementAnalysisItem(); if(!item) return;
    state.settlement.analysisStatementId=item.id;
    if($('settlementAnalysisDateSelect')) $('settlementAnalysisDateSelect').value=item.id;
    const linehaul=groupSettlementMiles(item.result?.linehaul||[],linehaulDomicileForTrip);
    const spots=groupSettlementMiles(item.result?.spots||[],x=>spotClientForTrip(x));
    const linehaulTotal=linehaul.reduce((n,x)=>n+x.miles,0), spotTotal=spots.reduce((n,x)=>n+x.miles,0);
    let fallbackLinehaul=0, unknownLinehaul=0;
    for(const trip of item.result?.linehaul||[]){ const info=linehaulDomicileForTrip(trip); if(info.source==='settlement') fallbackLinehaul+=Number(trip.miles)||0; else if(info.source==='unknown') unknownLinehaul+=Number(trip.miles)||0; }
    const unknownSpot=(item.result?.spots||[]).filter(x=>spotClientForTrip(x)==='Unassigned / Unknown').reduce((n,x)=>n+(Number(x.miles)||0),0);
    $('settlementAnalysisCards').innerHTML=[
      ['Settlement Date',fmtDate(item.settlementDate),''],
      ['Linehaul Miles',fmtNum(linehaulTotal),''],
      ['Spot Miles',fmtNum(spotTotal),''],
      ['Total Miles',fmtNum(linehaulTotal+spotTotal),'accent']
    ].map(x=>`<div class="summary-card ${x[2]}"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
    const notes=[];
    if(fallbackLinehaul>0) notes.push(`${fmtNum(fallbackLinehaul)} linehaul miles use the settlement domicile/category because the tractor master did not provide a domicile.`);
    if(unknownLinehaul>0) notes.push(`${fmtNum(unknownLinehaul)} linehaul miles could not be assigned to a domicile.`);
    if(unknownSpot>0) notes.push(`${fmtNum(unknownSpot)} spot miles could not be assigned to a client.`);
    const notice=$('settlementAnalysisNotice');
    if(notice){ notice.classList.toggle('hidden',!notes.length); notice.innerHTML=notes.length?`<strong>Review needed:</strong> ${notes.map(escapeHtml).join(' ')}`:''; }

    $('linehaulDomicileCount').textContent=`${linehaul.length} domicile${linehaul.length===1?'':'s'}`;
    $('spotClientCount').textContent=`${spots.length} client${spots.length===1?'':'s'}`;
    $('linehaulDomicileBars').innerHTML=settlementAnalysisBars(linehaul,linehaulTotal);
    $('spotClientBars').innerHTML=settlementAnalysisBars(spots,spotTotal);
    const ltable=$('linehaulDomicileTable');
    ltable.querySelector('thead').innerHTML='<tr><th>Domicile</th><th>Linehaul Miles</th><th>% of Linehaul</th><th>Trip Legs</th></tr>';
    ltable.querySelector('tbody').innerHTML=linehaul.length?linehaul.map(x=>`<tr class="${x.label==='Unassigned / Unknown'?'analysis-unassigned-row':''}"><td><strong>${escapeHtml(x.label)}</strong></td><td>${fmtNum(x.miles)}</td><td>${linehaulTotal?(x.miles/linehaulTotal*100).toFixed(1):'0.0'}%</td><td>${fmtNum(x.trips)}</td></tr>`).join(''):'<tr><td colspan="4" class="empty-table-cell">No linehaul activity in this settlement.</td></tr>';
    ltable.querySelector('tfoot').innerHTML=`<tr><td><strong>Total</strong></td><td><strong>${fmtNum(linehaulTotal)}</strong></td><td><strong>${linehaulTotal?'100.0':'0.0'}%</strong></td><td><strong>${fmtNum((item.result?.linehaul||[]).length)}</strong></td></tr>`;
    const stable=$('spotClientTable');
    stable.querySelector('thead').innerHTML='<tr><th>Spot Client</th><th>Spot Miles</th><th>% of Spot Miles</th><th>Spot Trips</th></tr>';
    stable.querySelector('tbody').innerHTML=spots.length?spots.map(x=>`<tr class="${x.label==='Unassigned / Unknown'?'analysis-unassigned-row':''}"><td><strong>${escapeHtml(x.label)}</strong></td><td>${fmtNum(x.miles)}</td><td>${spotTotal?(x.miles/spotTotal*100).toFixed(1):'0.0'}%</td><td>${fmtNum(x.trips)}</td></tr>`).join(''):'<tr><td colspan="4" class="empty-table-cell">No spot activity in this settlement.</td></tr>';
    stable.querySelector('tfoot').innerHTML=`<tr><td><strong>Total</strong></td><td><strong>${fmtNum(spotTotal)}</strong></td><td><strong>${spotTotal?'100.0':'0.0'}%</strong></td><td><strong>${fmtNum((item.result?.spots||[]).length)}</strong></td></tr>`;
  }


  function settlementReportDatedCatalog(){
    return (state.catalog||[]).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(String(x.settlementDate||''))).slice().sort((a,b)=>String(a.settlementDate).localeCompare(String(b.settlementDate)));
  }
  function initializeSettlementReportDates(){
    const items=settlementReportDatedCatalog(), start=$('settlementReportStartDate'), end=$('settlementReportEndDate');
    if(!start||!end) return;
    if(!items.length){ start.value=''; end.value=''; renderSettlementReports(); return; }
    const min=items[0].settlementDate, max=items[items.length-1].settlementDate;
    start.min=min; start.max=max; end.min=min; end.max=max;
    if(!start.value || start.value<min || start.value>max) start.value=min;
    if(!end.value || end.value<min || end.value>max) end.value=max;
    renderSettlementReports();
  }
  function settlementReportSelectedItems(){
    const start=String($('settlementReportStartDate')?.value||''), end=String($('settlementReportEndDate')?.value||'');
    if(!start||!end||start>end) return [];
    return settlementReportDatedCatalog().filter(x=>x.settlementDate>=start && x.settlementDate<=end);
  }
  function settlementReportPayrollRows(item){
    if(!item?.result) return [];
    const previous=state.result;
    try{
      state.result=item.result;
      state.result.summary ||= {};
      state.result.summary.settlementDate=item.settlementDate||state.result.summary.settlementDate||'';
      state.result.summary.payDate=item.payDate||state.result.summary.payDate||'';
      return payrollRows().map(x=>({...x}));
    } finally { state.result=previous; }
  }
  function settlementReportDriverRows(items){
    const map=new Map();
    const ensure=(id,name)=>{
      const key=String(id||'').trim()||`name:${String(name||'Unassigned').trim().toLowerCase()}`;
      if(!map.has(key)) map.set(key,{fedexId:String(id||'').trim(),name:name||'Unassigned',driverPay:0,revenue:0,tripCredits:0});
      const row=map.get(key); if(name && (!row.name || /^Driver \d+$/.test(row.name))) row.name=name; return row;
    };
    for(const item of items){
      for(const d of settlementReportPayrollRows(item)){
        const row=ensure(d.fedexId,d.name); row.driverPay+=Number(d.totalPay)||0;
      }
      for(const trip of [...(item.result?.linehaul||[]),...(item.result?.spots||[])]){
        const ids=[...new Set([trip.driver1,trip.driver2].map(x=>String(x||'').trim()).filter(Boolean))];
        if(!ids.length) continue;
        const share=(Number(trip.revenue)||0)/ids.length;
        for(const id of ids){ const row=ensure(id,revenueName(item.result,id)); row.revenue+=share; row.tripCredits+=1/ids.length; }
      }
    }
    return [...map.values()].map(r=>{
      r.driverPay=Math.round((r.driverPay+Number.EPSILON)*100)/100;
      r.revenue=Math.round((r.revenue+Number.EPSILON)*100)/100;
      r.percent=r.revenue>0 ? r.driverPay/r.revenue*100 : (r.driverPay>0?Infinity:0);
      r.flag=r.percent>35;
      return r;
    }).filter(r=>r.driverPay!==0||r.revenue!==0).sort((a,b)=>{
      const ap=Number.isFinite(a.percent)?a.percent:999999, bp=Number.isFinite(b.percent)?b.percent:999999;
      return bp-ap || b.driverPay-a.driverPay || a.name.localeCompare(b.name);
    });
  }
  function settlementReportFuelRows(items){
    const map=new Map();
    const ensure=tractor=>{ const key=normalizeTractor(tractor); if(!key)return null; if(!map.has(key))map.set(key,{tractor:key,miles:0,gallons:0,fuelCost:0}); return map.get(key); };
    for(const item of items){
      for(const trip of [...(item.result?.linehaul||[]),...(item.result?.spots||[])]){ const row=ensure(trip.vehicle); if(row) row.miles+=Number(trip.miles)||0; }
      for(const fuel of item.result?.fuelPurchases||[]){ const row=ensure(fuel.vehicle); if(row){row.gallons+=Math.abs(Number(fuel.qty)||0);row.fuelCost+=Math.abs(Number(fuel.amount)||0);} }
    }
    return [...map.values()].map(r=>{
      r.miles=Math.round(r.miles*10)/10; r.gallons=Math.round(r.gallons*1000)/1000; r.fuelCost=Math.round((r.fuelCost+Number.EPSILON)*100)/100;
      r.mpg=r.gallons>0?r.miles/r.gallons:null; r.flag=r.mpg!=null && r.mpg<7; return r;
    }).sort((a,b)=>{
      if(a.mpg==null&&b.mpg!=null)return 1;if(a.mpg!=null&&b.mpg==null)return -1;
      if(a.mpg!=null&&b.mpg!=null&&a.mpg!==b.mpg)return a.mpg-b.mpg;
      return String(a.tractor).localeCompare(String(b.tractor),undefined,{numeric:true});
    });
  }
  function settlementReportDriverBars(rows){
    if(!rows.length) return '<div class="analysis-empty">No driver payroll/revenue data was found for this date range.</div>';
    const finite=rows.map(x=>Number.isFinite(x.percent)?x.percent:100), max=Math.max(35,...finite,1);
    return rows.slice(0,12).map(x=>{
      const pct=Number.isFinite(x.percent)?x.percent:100, width=Math.max(2,Math.min(100,pct/max*100));
      const shown=Number.isFinite(x.percent)?`${x.percent.toFixed(1)}%`:'No revenue';
      return `<div class="analysis-bar-row ${x.flag?'report-threshold-breach':''}"><div class="analysis-bar-label"><strong>${escapeHtml(x.name)}</strong><span>${fmtMoney(x.driverPay)} pay / ${fmtMoney(x.revenue)} revenue</span></div><div class="analysis-bar-track"><div class="analysis-bar-fill" style="width:${width.toFixed(1)}%"></div></div><small>${shown}</small></div>`;
    }).join('');
  }
  function settlementReportFuelBars(rows){
    const chartRows=rows.filter(x=>x.mpg!=null);
    if(!chartRows.length) return '<div class="analysis-empty">No tractor has both settlement miles and fuel-purchase gallons in this date range.</div>';
    const max=Math.max(10,...chartRows.map(x=>x.mpg||0));
    return chartRows.slice(0,12).map(x=>{
      const width=Math.max(2,Math.min(100,(x.mpg||0)/max*100));
      return `<div class="analysis-bar-row ${x.flag?'report-threshold-breach':''}"><div class="analysis-bar-label"><strong>Tractor ${escapeHtml(x.tractor)}</strong><span>${fmtNum(x.miles)} mi / ${x.gallons.toFixed(1)} gal</span></div><div class="analysis-bar-track"><div class="analysis-bar-fill" style="width:${width.toFixed(1)}%"></div></div><small>${x.mpg.toFixed(2)} MPG</small></div>`;
    }).join('');
  }
  function renderSettlementReports(){
    const start=String($('settlementReportStartDate')?.value||''), end=String($('settlementReportEndDate')?.value||'');
    const note=$('settlementReportsRangeNote');
    if(start&&end&&start>end){ if(note) note.innerHTML='<strong>Start date must be on or before end date.</strong>'; return; }
    const items=settlementReportSelectedItems();
    if(note) note.textContent=items.length?`${items.length} settlement${items.length===1?'':'s'} selected • ${fmtDate(start)} through ${fmtDate(end)}`:'No settlement statements fall within the selected date range.';
    const drivers=settlementReportDriverRows(items), fuel=settlementReportFuelRows(items);
    const totalRevenue=drivers.reduce((n,x)=>n+x.revenue,0), totalPay=drivers.reduce((n,x)=>n+x.driverPay,0), overallPct=totalRevenue>0?totalPay/totalRevenue*100:0;
    const cards=$('settlementReportsCards');
    if(cards) cards.innerHTML=[
      ['Settlement Weeks',fmtNum(items.length),''],
      ['Attributed Driver Revenue',fmtMoney(totalRevenue),''],
      ['Total Driver Pay',fmtMoney(totalPay),''],
      ['Driver Pay % of Revenue',`${overallPct.toFixed(1)}%`,overallPct>35?'danger':'accent']
    ].map(x=>`<div class="summary-card ${x[2]}"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
    if($('driverPayRevenueCount')) $('driverPayRevenueCount').textContent=`${drivers.length} driver${drivers.length===1?'':'s'}`;
    if($('driverPayRevenueBars')) $('driverPayRevenueBars').innerHTML=settlementReportDriverBars(drivers);
    const dt=$('driverPayRevenueTable');
    if(dt){
      dt.querySelector('thead').innerHTML='<tr><th>Driver</th><th>FedEx ID</th><th>Revenue Generated</th><th>Driver Pay</th><th>Pay % of Revenue</th><th>Status</th></tr>';
      dt.querySelector('tbody').innerHTML=drivers.length?drivers.map(x=>`<tr class="${x.flag?'report-threshold-row':''}"><td><strong>${escapeHtml(x.name)}</strong></td><td>${escapeHtml(x.fedexId||'—')}</td><td>${fmtMoney(x.revenue)}</td><td>${fmtMoney(x.driverPay)}</td><td><strong>${Number.isFinite(x.percent)?x.percent.toFixed(1)+'%':'No revenue'}</strong></td><td>${x.flag?'<span class="status-pill overdue">Above 35%</span>':'<span class="status-pill ok">Within 35%</span>'}</td></tr>`).join(''):'<tr><td colspan="6" class="empty-table-cell">No driver payroll/revenue data in the selected range.</td></tr>';
      dt.querySelector('tfoot').innerHTML=`<tr><td><strong>Total</strong></td><td></td><td><strong>${fmtMoney(totalRevenue)}</strong></td><td><strong>${fmtMoney(totalPay)}</strong></td><td><strong>${totalRevenue?overallPct.toFixed(1)+'%':'—'}</strong></td><td></td></tr>`;
    }
    if($('fuelEfficiencyCount')) $('fuelEfficiencyCount').textContent=`${fuel.length} tractor${fuel.length===1?'':'s'}`;
    if($('fuelEfficiencyBars')) $('fuelEfficiencyBars').innerHTML=settlementReportFuelBars(fuel);
    const ft=$('fuelEfficiencyTable'), totalMiles=fuel.reduce((n,x)=>n+x.miles,0), totalGallons=fuel.reduce((n,x)=>n+x.gallons,0), totalFuelCost=fuel.reduce((n,x)=>n+x.fuelCost,0), fleetMpg=totalGallons>0?totalMiles/totalGallons:null;
    if(ft){
      ft.querySelector('thead').innerHTML='<tr><th>Tractor</th><th>Miles</th><th>Fuel Gallons</th><th>Fuel Cost</th><th>MPG</th><th>Status</th></tr>';
      ft.querySelector('tbody').innerHTML=fuel.length?fuel.map(x=>`<tr class="${x.flag?'report-threshold-row':''}"><td><strong>${escapeHtml(x.tractor)}</strong></td><td>${fmtNum(x.miles)}</td><td>${x.gallons.toFixed(1)}</td><td>${fmtMoney(x.fuelCost)}</td><td><strong>${x.mpg==null?'—':x.mpg.toFixed(2)}</strong></td><td>${x.mpg==null?'<span class="status-pill baseline">No fuel data</span>':x.flag?'<span class="status-pill overdue">Below 7 MPG</span>':'<span class="status-pill ok">7+ MPG</span>'}</td></tr>`).join(''):'<tr><td colspan="6" class="empty-table-cell">No tractor mileage/fuel data in the selected range.</td></tr>';
      ft.querySelector('tfoot').innerHTML=`<tr><td><strong>Fleet Total</strong></td><td><strong>${fmtNum(totalMiles)}</strong></td><td><strong>${totalGallons.toFixed(1)}</strong></td><td><strong>${fmtMoney(totalFuelCost)}</strong></td><td><strong>${fleetMpg==null?'—':fleetMpg.toFixed(2)}</strong></td><td></td></tr>`;
    }
  }

  function renderSummary() {
    if(!state.catalog.length) return;
    const latest=state.catalog[0];
    const s=latest.result.summary;
    $('latestSettlementDate').textContent=fmtDate(latest.settlementDate);
    $('latestStatementSource').textContent=`${latest.fileName} • Activity ${s.periodStart || '—'} to ${s.periodEnd || '—'}`;
    $('summaryCards').innerHTML=[
      ['Total Miles',fmtNum(s.totalMiles),''],
      ['Total Revenue',fmtMoney(s.totalRevenue),''],
      ['Total Expenses',fmtMoney(s.totalAuthorizedChargebacks),''],
      ['Net Amount',fmtMoney(s.netAmount),'accent']
    ].map(x=>`<div class="summary-card ${x[2]}"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');

    const detailRows=[
      ['Linehaul Miles',fmtNum(s.linehaulMiles)],
      ['Spot Miles',fmtNum(s.spotMiles)],
      ['Linehaul Revenue',fmtMoney(s.linehaulRevenue)],
      ['Spot Revenue',fmtMoney(s.spotRevenue)],
      ['Fuel Expense',fmtMoney(s.fuelExpense)],
      ['DEF Expense',fmtMoney(s.defExpense)],
      ['Other Expense',fmtMoney(s.otherExpense)]
    ];
    $('latestDetailGrid').innerHTML=detailRows.map(r=>`<div class="latest-detail"><span>${r[0]}</span><strong>${r[1]}</strong></div>`).join('');

    const duplicates=state.settlement?.duplicates||[], duplicatePanel=$('settlementDuplicatePanel'), duplicateTable=$('settlementDuplicateTable');
    if(duplicatePanel) duplicatePanel.classList.toggle('hidden',!duplicates.length);
    if($('settlementDuplicateCount')) $('settlementDuplicateCount').textContent=`${duplicates.length} duplicate${duplicates.length===1?'':'s'}`;
    if(duplicateTable) duplicateTable.querySelector('tbody').innerHTML=duplicates.map(d=>`<tr><td><strong>${fmtDate(d.item?.settlementDate)}</strong></td><td>${escapeHtml(d.item?.fileName||d.item?.relativePath||'—')}</td><td>${escapeHtml(d.active?.fileName||d.active?.relativePath||'—')}</td><td><span class="status-pill baseline">${d.reason==='exact'?'Exact duplicate':'Same date — alternate version'}</span></td></tr>`).join('');

    const headers=['Settlement Date','Total Miles','Linehaul Miles','Spot Miles','Linehaul Revenue','Spot Revenue','Fuel Expense','DEF Expense','Other Expense','Net Amount'];
    const table=$('settlementHistoryTable');
    table.querySelector('thead').innerHTML='<tr>'+headers.map(h=>`<th>${h}</th>`).join('')+'</tr>';
    table.querySelector('tbody').innerHTML=state.catalog.map((item,index)=>{
      const x=item.result.summary;
      return `<tr class="${index===0?'latest-row':''}" title="${escapeHtml(item.fileName)}"><td><strong>${fmtDate(item.settlementDate)}</strong>${index===0?'<span class="latest-badge">Latest</span>':''}</td><td>${fmtNum(x.totalMiles)}</td><td>${fmtNum(x.linehaulMiles)}</td><td>${fmtNum(x.spotMiles)}</td><td>${fmtMoney(x.linehaulRevenue)}</td><td>${fmtMoney(x.spotRevenue)}</td><td>${fmtMoney(x.fuelExpense)}</td><td>${fmtMoney(x.defExpense)}</td><td>${fmtMoney(x.otherExpense)}</td><td><strong>${fmtMoney(x.netAmount)}</strong></td></tr>`;
    }).join('');
    $('historyCount').textContent=`${state.catalog.length} statement${state.catalog.length===1?'':'s'}`;
    setSettlementTab(state.settlement.activeTab);
  }


  function revenueStation(value) {
    const s=String(value||'').trim();
    if(!s) return '—';
    const stripped=s.replace(/^0+(?=\d)/,'');
    return stripped || '0';
  }
  function revenueTripIso(value) {
    const d=parseFlexibleDate(value);
    return d ? isoLocal(d) : '';
  }
  function revenueRate(value) {
    const n=Number(value)||0;
    return `$${n.toFixed(4)}/mi`;
  }
  function revenueMode(values) {
    const vals=values.map(Number).filter(v=>Number.isFinite(v) && v>0.000001);
    if(!vals.length) return null;
    const counts=new Map();
    for(const v of vals){
      const k=(Math.round(v*10000)/10000).toFixed(4);
      counts.set(k,(counts.get(k)||0)+1);
    }
    return Number([...counts.entries()].sort((a,b)=>b[1]-a[1] || Number(a[0])-Number(b[0]))[0][0]);
  }
  function revenueName(result,id) {
    return (result?.names && result.names[id]) || (id ? `Driver ${id}` : 'Unassigned');
  }
  function collectRevenueMovementRows() {
    const lh=new Map(), spots=new Map();
    for(const item of state.catalog) {
      const result=item.result;
      for(const trip of (result.linehaul||[])) {
        const ids=[trip.driver1,trip.driver2].filter(Boolean);
        const driverIds=ids.length?[...new Set(ids)]:[''];
        for(const id of driverIds) {
          const key=['LH',trip.date,trip.trip,trip.vehicle,id,trip.origin,trip.destination].join('|');
          if(lh.has(key)) continue;
          lh.set(key,{...trip,kind:'Linehaul',driverId:id,driverName:revenueName(result,id),tripIso:revenueTripIso(trip.date),settlementDate:item.settlementDate,fileName:item.fileName});
        }
      }
      for(const trip of (result.spots||[])) {
        const ids=[trip.driver1,trip.driver2].filter(Boolean);
        const driverIds=ids.length?[...new Set(ids)]:[''];
        for(const id of driverIds) {
          const key=['SPOT',trip.date,trip.trip,trip.vehicle,id,trip.avr,trip.spotName].join('|');
          if(spots.has(key)) continue;
          spots.set(key,{...trip,kind:'Spot',driverId:id,driverName:revenueName(result,id),tripIso:revenueTripIso(trip.date),settlementDate:item.settlementDate,fileName:item.fileName});
        }
      }
    }
    return {linehaul:[...lh.values()],spots:[...spots.values()]};
  }
  function referenceFuelForLinehaul(row, allRows) {
    const pos=allRows.filter(x=>(Number(x.fuelRate)||0)>0.000001);
    const org=revenueStation(row.origin), dest=revenueStation(row.destination), cat=String(row.vmrCatDom||'').trim();
    const exact=pos.filter(x=>String(x.vmrCatDom||'').trim()===cat && revenueStation(x.origin)===org && revenueStation(x.destination)===dest).map(x=>x.fuelRate);
    let rate=revenueMode(exact); if(rate!=null) return {rate,basis:'same leg + VMR CatDom'};
    const reverse=pos.filter(x=>String(x.vmrCatDom||'').trim()===cat && revenueStation(x.origin)===dest && revenueStation(x.destination)===org).map(x=>x.fuelRate);
    rate=revenueMode(reverse); if(rate!=null) return {rate,basis:'reverse leg + VMR CatDom'};
    const catRows=pos.filter(x=>String(x.vmrCatDom||'').trim()===cat).map(x=>x.fuelRate);
    rate=revenueMode(catRows); if(rate!=null) return {rate,basis:'same VMR CatDom'};
    return {rate:null,basis:'no paid comparison found'};
  }
  function referenceFuelForSpot(row, allRows) {
    const pos=allRows.filter(x=>(Number(x.fuelRate)||0)>0.000001);
    const avr=String(row.avr||'').trim(), spot=String(row.spotName||'').trim().toUpperCase();
    let rate=revenueMode(pos.filter(x=>String(x.avr||'').trim()===avr && String(x.spotName||'').trim().toUpperCase()===spot).map(x=>x.fuelRate));
    if(rate!=null) return {rate,basis:'same AVR / spot'};
    rate=revenueMode(pos.filter(x=>String(x.avr||'').trim()===avr).map(x=>x.fuelRate));
    if(rate!=null) return {rate,basis:'same AVR'};
    return {rate:null,basis:'no paid comparison found'};
  }
  function referenceDh(row, allRows) {
    const pos=allRows.filter(x=>(Number(x.dh)||0)>0.001);
    const org=revenueStation(row.origin), dest=revenueStation(row.destination), cat=String(row.vmrCatDom||'').trim();
    let amount=revenueMode(pos.filter(x=>revenueStation(x.origin)===org && revenueStation(x.destination)===dest).map(x=>x.dh));
    if(amount!=null) return {amount,basis:'same leg'};
    amount=revenueMode(pos.filter(x=>revenueStation(x.origin)===dest && revenueStation(x.destination)===org).map(x=>x.dh));
    if(amount!=null) return {amount,basis:'reverse leg'};
    amount=revenueMode(pos.filter(x=>String(x.vmrCatDom||'').trim()===cat).map(x=>x.dh));
    if(amount!=null) return {amount,basis:'same VMR CatDom'};
    return {amount:null,basis:'no paid comparison found'};
  }
  function findBrokenLegs(linehaulRows) {
    const groups=new Map();
    for(const row of linehaulRows) {
      if(!row.driverId || !row.vehicle || !row.tripIso || !row.origin || !row.destination) continue;
      const key=`${row.vehicle}|${row.driverId}`;
      if(!groups.has(key)) groups.set(key,[]);
      groups.get(key).push(row);
    }
    const flags=[];
    for(const rows of groups.values()) {
      rows.sort((a,b)=>String(a.tripIso).localeCompare(String(b.tripIso)) || String(a.trip).localeCompare(String(b.trip)));
      const byDate=new Map();
      for(const r of rows){ if(!byDate.has(r.tripIso)) byDate.set(r.tripIso,[]); byDate.get(r.tripIso).push(r); }
      const dates=[...byDate.keys()].sort();
      let block=[], blockDates=[], prevDate=null;
      const flush=()=>{
        if(!block.length) return;
        const station=new Map();
        for(const leg of block) {
          const o=revenueStation(leg.origin), d=revenueStation(leg.destination);
          if(!station.has(o)) station.set(o,{out:0,in:0});
          if(!station.has(d)) station.set(d,{out:0,in:0});
          station.get(o).out++; station.get(d).in++;
        }
        const starts=[], ends=[];
        for(const [st,c] of station.entries()) {
          const diff=c.out-c.in;
          if(diff>0) starts.push(`${st}${diff>1?` (${diff})`:''}`);
          if(diff<0) ends.push(`${st}${-diff>1?` (${-diff})`:''}`);
        }
        if(starts.length || ends.length) {
          const sorted=block.slice().sort((a,b)=>String(a.tripIso).localeCompare(String(b.tripIso)) || String(a.trip).localeCompare(String(b.trip)));
          const first=sorted[0];
          const legSummary=sorted.map(x=>`${fmtDate(x.tripIso)}: ${revenueStation(x.origin)}→${revenueStation(x.destination)} (#${x.trip})`).join('; ');
          const statementDates=[...new Set(sorted.map(x=>x.settlementDate).filter(Boolean))].sort().map(fmtDate).join(', ');
          flags.push({
            driverName:first.driverName,driverId:first.driverId,vehicle:first.vehicle,
            firstDate:blockDates[0],lastDate:blockDates[blockDates.length-1],
            startStations:starts.join(', ')||'Unclear',endStations:ends.join(', ')||'Unclear',
            legSummary,statementDates,
            reason:`Dispatch balance does not close: ${starts.length?`extra departure from ${starts.join(', ')}`:'starting station unclear'} and ${ends.length?`extra arrival at ${ends.join(', ')}`:'ending station unclear'}. Review the shift for a missing return leg.`
          });
        }
        block=[]; blockDates=[];
      };
      for(const iso of dates) {
        const d=parseFlexibleDate(iso);
        if(prevDate && d) {
          const gap=Math.round((d-prevDate)/86400000);
          if(gap>1) flush();
        }
        block.push(...byDate.get(iso)); blockDates.push(iso); prevDate=d;
      }
      flush();
    }
    return flags.sort((a,b)=>String(b.lastDate).localeCompare(String(a.lastDate)) || a.driverName.localeCompare(b.driverName));
  }
  function analyzeRevenueFinder() {
    const movements=collectRevenueMovementRows();
    const brokenLegs=findBrokenLegs(movements.linehaul);
    const missingFuel=[];
    for(const row of movements.linehaul) {
      if((Number(row.miles)||0)<=0 || (Number(row.fuelRate)||0)>0.000001) continue;
      const ref=referenceFuelForLinehaul(row,movements.linehaul);
      const est=ref.rate==null?null:Math.round((Number(row.miles)||0)*ref.rate*100)/100;
      missingFuel.push({...row,referenceRate:ref.rate,referenceBasis:ref.basis,estimatedMissing:est,movement:`${revenueStation(row.origin)} → ${revenueStation(row.destination)}`,reason:ref.rate==null?'Fuel supplement rate is $0.00 and no comparable paid movement was found. Review entitlement.':`Fuel supplement rate is $0.00; comparison uses ${ref.basis}.`});
    }
    for(const row of movements.spots) {
      if((Number(row.miles)||0)<=0 || ((Number(row.fuelRate)||0)>0.000001 && (Number(row.fuelAmount)||0)>0.005)) continue;
      const ref=referenceFuelForSpot(row,movements.spots);
      const est=ref.rate==null?null:Math.round((Number(row.miles)||0)*ref.rate*100)/100;
      missingFuel.push({...row,referenceRate:ref.rate,referenceBasis:ref.basis,estimatedMissing:est,movement:`AVR ${row.avr||'—'} • ${row.spotName||row.siteName||'Spot'}`,reason:ref.rate==null?'Spot fuel supplement is zero and no comparable paid spot was found. Review entitlement.':`Spot fuel supplement is zero; comparison uses ${ref.basis}.`});
    }
    missingFuel.sort((a,b)=>String(b.tripIso).localeCompare(String(a.tripIso)) || a.driverName.localeCompare(b.driverName));

    const missingDh=[];
    for(const row of movements.linehaul) {
      if((Number(row.miles)||0)<=0 || (Number(row.dh)||0)>0.001) continue;
      const ref=referenceDh(row,movements.linehaul);
      missingDh.push({...row,expectedDh:ref.amount,referenceBasis:ref.basis,estimatedMissing:ref.amount==null?null:Math.round(ref.amount*100)/100,movement:`${revenueStation(row.origin)} → ${revenueStation(row.destination)}`,reason:ref.amount==null?'D&H field is zero or blank and no comparable paid movement was found. Review the trip.':`D&H field is zero or blank; comparison uses ${ref.basis}.`});
    }
    missingDh.sort((a,b)=>String(b.tripIso).localeCompare(String(a.tripIso)) || a.driverName.localeCompare(b.driverName));
    return {brokenLegs,missingFuel,missingDh};
  }
  function renderRevenueFinder() {
    if(!$('revenueFinderCards')) return;
    const a=analyzeRevenueFinder();
    const fuelKnown=a.missingFuel.reduce((s,x)=>s+(x.estimatedMissing||0),0);
    const dhKnown=a.missingDh.reduce((s,x)=>s+(x.estimatedMissing||0),0);
    $('revenueScanMeta').textContent=`${state.catalog.length} statement${state.catalog.length===1?'':'s'} scanned`;
    $('revenueFinderCards').innerHTML=[
      ['Possible Broken Legs',fmtNum(a.brokenLegs.length),''],
      ['Missing Fuel Flags',fmtNum(a.missingFuel.length),''],
      ['Missing D&H Flags',fmtNum(a.missingDh.length),''],
      ['Est. Potential Revenue',fmtMoney(fuelKnown+dhKnown),'accent']
    ].map(x=>`<div class="summary-card ${x[2]}"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
    $('brokenLegCount').textContent=`${a.brokenLegs.length} flag${a.brokenLegs.length===1?'':'s'}`;
    $('missingFuelCount').textContent=`${a.missingFuel.length} flag${a.missingFuel.length===1?'':'s'}`;
    $('missingDhCount').textContent=`${a.missingDh.length} flag${a.missingDh.length===1?'':'s'}`;

    const broken=$('brokenLegsTable');
    broken.querySelector('thead').innerHTML='<tr>'+['Driver','FedEx ID','Tractor','First Date','Last Date','Start Station(s)','Ending Station(s)','Legs in Review','Reason','Settlement Date(s)'].map(h=>`<th>${h}</th>`).join('')+'</tr>';
    broken.querySelector('tbody').innerHTML=a.brokenLegs.length?a.brokenLegs.map(x=>`<tr class="revenue-flag-row"><td><strong>${escapeHtml(x.driverName)}</strong></td><td>${escapeHtml(x.driverId)}</td><td>${escapeHtml(x.vehicle)}</td><td>${fmtDate(x.firstDate)}</td><td>${fmtDate(x.lastDate)}</td><td><span class="revenue-score strong">${escapeHtml(x.startStations)}</span></td><td><span class="revenue-score strong">${escapeHtml(x.endStations)}</span></td><td class="revenue-detail-cell">${escapeHtml(x.legSummary)}</td><td class="revenue-reason-cell">${escapeHtml(x.reason)}</td><td>${escapeHtml(x.statementDates||'—')}</td></tr>`).join(''):'<tr><td colspan="10" class="revenue-empty">No possible broken legs were identified from the stored settlement history.</td></tr>';

    const fuel=$('missingFuelTable');
    fuel.querySelector('thead').innerHTML='<tr>'+['Driver','FedEx ID','Trip Date','Settlement Date','Tractor','Type','Trip #','Movement','Miles','Fuel Paid','Reference Rate','Est. Missing','Reason','Statement'].map(h=>`<th>${h}</th>`).join('')+'</tr>';
    fuel.querySelector('tbody').innerHTML=a.missingFuel.length?a.missingFuel.map(x=>`<tr class="revenue-flag-row"><td><strong>${escapeHtml(x.driverName)}</strong></td><td>${escapeHtml(x.driverId||'—')}</td><td>${fmtDate(x.tripIso)}</td><td>${fmtDate(x.settlementDate)}</td><td>${escapeHtml(x.vehicle||'—')}</td><td>${escapeHtml(x.kind)}</td><td>${escapeHtml(x.trip||'—')}</td><td>${escapeHtml(x.movement)}</td><td>${fmtNum(x.miles)}</td><td class="revenue-zero">${x.kind==='Spot'?`${revenueRate(x.fuelRate)} • ${fmtMoney(x.fuelAmount)}`:revenueRate(x.fuelRate)}</td><td>${x.referenceRate==null?'—':revenueRate(x.referenceRate)}<span class="revenue-reference">${escapeHtml(x.referenceBasis)}</span></td><td class="revenue-amount">${x.estimatedMissing==null?'Review':fmtMoney(x.estimatedMissing)}</td><td class="revenue-reason-cell">${escapeHtml(x.reason)}</td><td>${escapeHtml(x.fileName)}</td></tr>`).join(''):'<tr><td colspan="14" class="revenue-empty">No zero fuel-supplement movements were found.</td></tr>';

    const dh=$('missingDhTable');
    dh.querySelector('thead').innerHTML='<tr>'+['Driver','FedEx ID','Trip Date','Settlement Date','Tractor','Trip #','Leg','Miles','D&H Paid','Expected D&H','Est. Missing','Reason','Statement'].map(h=>`<th>${h}</th>`).join('')+'</tr>';
    dh.querySelector('tbody').innerHTML=a.missingDh.length?a.missingDh.map(x=>`<tr class="revenue-flag-row"><td><strong>${escapeHtml(x.driverName)}</strong></td><td>${escapeHtml(x.driverId||'—')}</td><td>${fmtDate(x.tripIso)}</td><td>${fmtDate(x.settlementDate)}</td><td>${escapeHtml(x.vehicle||'—')}</td><td>${escapeHtml(x.trip||'—')}</td><td>${escapeHtml(x.movement)}</td><td>${fmtNum(x.miles)}</td><td class="revenue-zero">${fmtMoney(x.dh)}</td><td>${x.expectedDh==null?'—':fmtMoney(x.expectedDh)}<span class="revenue-reference">${escapeHtml(x.referenceBasis)}</span></td><td class="revenue-amount">${x.estimatedMissing==null?'Review':fmtMoney(x.estimatedMissing)}</td><td class="revenue-reason-cell">${escapeHtml(x.reason)}</td><td>${escapeHtml(x.fileName)}</td></tr>`).join(''):'<tr><td colspan="13" class="revenue-empty">No linehaul trips with a zero or blank D&H payment were found.</td></tr>';
  }


  async function loadMeetingData() {
    if(!state.directoryHandle) return;
    let data=defaultMeetingData();
    try {
      const dir=await state.directoryHandle.getDirectoryHandle('Meetings');
      const fh=await dir.getFileHandle('meeting_data.json');
      const file=await fh.getFile();
      const parsed=JSON.parse(await file.text());
      if(parsed && Array.isArray(parsed.inspections) && Array.isArray(parsed.managementItems)) data={...defaultMeetingData(),...parsed};
    } catch(err) {
      if(err && err.name!=='NotFoundError') console.warn('Could not load meeting data',err);
    }
    state.meetings=data;
    ensureMeetingLayout();
    state.meetingsLoaded=true;
    renderMeetings();
  }

  async function saveMeetingData(silent=true) {
    const cloudSaved=cloudConnected()?await saveCloudModule('meetings',true):false;
    if(!state.directoryHandle){ if(!silent&&cloudSaved) showAlert('Meeting data saved to NBL Cloud.','success'); return cloudSaved; }
    if(!(await requestPermission(state.directoryHandle,'readwrite'))) {
      if(!silent) showAlert('Folder write permission is required to save meeting data.','error');
      return false;
    }
    try {
      const dir=await state.directoryHandle.getDirectoryHandle('Meetings',{create:true});
      const payload={...state.meetings,updatedAt:new Date().toISOString()};
      await writeFile(dir,'meeting_data.json',JSON.stringify(payload,null,2),'application/json');
      if(!silent) showAlert(`Meeting data saved to <strong>${escapeHtml(state.directoryHandle.name)}/Meetings</strong>.`,'success');
      return true;
    } catch(err) {
      console.error(err);
      if(!silent) showAlert('Could not save meeting data: '+err.message,'error');
      return false;
    }
  }

  function priorityLabel(v){ return String(v)==='1'?'1 - Immediately':String(v)==='2'?'2 - Soon':'3 - Can wait'; }
  function yesNoPill(v){ const y=String(v).toUpperCase()==='Y'; return `<span class="yn-pill ${y?'yes':'no'}">${y?'Y':'N'}</span>`; }
  function meetingHeaderHtml(labels){
    return '<tr>'+labels.map((h,i)=>`<th data-column-index="${i}">${h}<span class="column-resize-handle" data-column-resize="${i}" aria-hidden="true"></span></th>`).join('')+'</tr>';
  }
  function applyMeetingColumnWidths(table,type){
    ensureMeetingLayout();
    const widths=state.meetings.columnWidths[type];
    let colgroup=table.querySelector('colgroup');
    if(!colgroup){ colgroup=document.createElement('colgroup'); table.insertBefore(colgroup,table.firstChild); }
    colgroup.innerHTML=widths.map((w,i)=>`<col data-column-index="${i}" style="width:${w}px">`).join('');
    table.style.width=`${widths.reduce((a,b)=>a+b,0)}px`;
    table.style.minWidth=table.style.width;
  }
  function initializeMeetingColumnResize(table,type){
    if(!table || table.dataset.columnResizeBound==='1') return;
    table.dataset.columnResizeBound='1';
    table.addEventListener('pointerdown',e=>{
      const handle=e.target.closest('[data-column-resize]');
      if(!handle || !table.contains(handle)) return;
      e.preventDefault(); e.stopPropagation();
      const index=Number(handle.dataset.columnResize);
      if(!Number.isInteger(index)) return;
      ensureMeetingLayout();
      const th=handle.closest('th');
      const startX=e.clientX;
      const startWidth=state.meetings.columnWidths[type][index];
      const minimum=MEETING_COLUMN_MINIMUMS[type][index];
      table.classList.add('resizing-columns'); th?.classList.add('resizing');
      try{ handle.setPointerCapture(e.pointerId); }catch{}
      const move=ev=>{
        const width=Math.max(minimum,Math.round(startWidth+(ev.clientX-startX)));
        state.meetings.columnWidths[type][index]=width;
        applyMeetingColumnWidths(table,type);
      };
      const finish=async ev=>{
        handle.removeEventListener('pointermove',move);
        handle.removeEventListener('pointerup',finish);
        handle.removeEventListener('pointercancel',finish);
        table.classList.remove('resizing-columns'); th?.classList.remove('resizing');
        try{ handle.releasePointerCapture(ev.pointerId); }catch{}
        await saveMeetingData(true);
      };
      handle.addEventListener('pointermove',move);
      handle.addEventListener('pointerup',finish);
      handle.addEventListener('pointercancel',finish);
    });
  }
  async function resetMeetingColumnWidths(type){
    ensureMeetingLayout();
    state.meetings.columnWidths[type]=[...MEETING_COLUMN_DEFAULTS[type]];
    const table=type==='inspection'?$('inspectionTable'):$('managementMeetingTable');
    if(table) applyMeetingColumnWidths(table,type);
    await saveMeetingData(true);
    showAlert(`${type==='inspection'?'Truck Inspection':'Management Meeting'} column widths reset to defaults.`,'success');
  }
  function renderMeetings() {
    if(!$('inspectionTable') || !$('managementMeetingTable')) return;
    const inspections=[...state.meetings.inspections].sort((a,b)=>{
      const aa=a.addressed==='Y'?1:0, ba=b.addressed==='Y'?1:0;
      return aa-ba || Number(a.priority||3)-Number(b.priority||3) || String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||''));
    });
    const items=[...state.meetings.managementItems].sort((a,b)=>{
      const ac=a.closed==='Y'?1:0, bc=b.closed==='Y'?1:0;
      return ac-bc || String(a.dueDate||'9999').localeCompare(String(b.dueDate||'9999')) || String(b.date||'').localeCompare(String(a.date||''));
    });
    const openInspections=inspections.filter(x=>x.addressed!=='Y');
    const priorityOne=openInspections.filter(x=>String(x.priority)==='1');
    const openItems=items.filter(x=>x.closed!=='Y');
    const today=todayIso();
    const overdueItems=openItems.filter(x=>x.dueDate && x.dueDate<today);
    $('meetingCards').innerHTML=[
      ['Open Management Items',openItems.length,openItems.length?'warning-card':''],
      ['Overdue Items',overdueItems.length,overdueItems.length?'danger':''],
      ['Completed Items',items.length-openItems.length,''],
      ['Total Items',items.length,'']
    ].map(x=>`<div class="summary-card ${x[2]}"><span>${x[0]}</span><strong>${fmtNum(x[1])}</strong></div>`).join('');
    if($('exportMeetingsBtn')) $('exportMeetingsBtn').disabled = items.length===0;

    const inspectionTable=$('inspectionTable');
    inspectionTable.querySelector('thead').innerHTML=meetingHeaderHtml(['Date','Tractor #','Driver Name','Issue','Priority','Addressed','Actions']);
    inspectionTable.querySelector('tbody').innerHTML=inspections.length ? inspections.map(r=>{
      const inspectionDate=r.date || String(r.createdAt||'').slice(0,10);
      const task=(state.maintenance.tasks||[]).find(x=>x.sourceType==='inspection'&&x.sourceId===r.id);
      return `<tr class="${r.addressed==='Y'?'resolved-row':''}"><td>${fmtDate(inspectionDate)}</td><td><strong>${escapeHtml(r.tractorNumber)}</strong></td><td>${escapeHtml(r.driverName)}</td><td class="meeting-notes-cell">${escapeHtml(r.issue)}</td><td><span class="priority-pill p${escapeHtml(r.priority)}">${priorityLabel(r.priority)}</span></td><td>${yesNoPill(r.addressed)}</td><td><div class="row-actions"><button class="table-action" data-edit-inspection="${r.id}">Edit</button><button class="table-action" data-task-inspection="${r.id}">${task?'View Task':'Create Task'}</button><button class="table-action danger-link" data-delete-inspection="${r.id}">Delete</button></div></td></tr>`;
    }).join('') : '<tr><td colspan="7" class="empty-table-cell">No truck inspection reports recorded yet.</td></tr>';
    applyMeetingColumnWidths(inspectionTable,'inspection');
    initializeMeetingColumnResize(inspectionTable,'inspection');

    const managementTable=$('managementMeetingTable');
    managementTable.querySelector('thead').innerHTML=meetingHeaderHtml(['Date','Topic','Notes','Responsible','Due Date','Closed','Actions']);
    managementTable.querySelector('tbody').innerHTML=items.length ? items.map(r=>{
      const overdue=r.closed!=='Y' && r.dueDate && r.dueDate<today;
      return `<tr class="${r.closed==='Y'?'resolved-row':''} ${overdue?'overdue-meeting-row':''}"><td>${fmtDate(r.date)}</td><td><strong>${escapeHtml(r.topic)}</strong></td><td class="meeting-notes-cell">${escapeHtml(r.notes||'')}</td><td>${escapeHtml(r.responsible)}</td><td class="${overdue?'due-overdue':''}">${fmtDate(r.dueDate)}</td><td>${yesNoPill(r.closed)}</td><td><div class="row-actions"><button class="table-action" data-edit-management="${r.id}">Edit</button><button class="table-action danger-link" data-delete-management="${r.id}">Delete</button></div></td></tr>`;
    }).join('') : '<tr><td colspan="7" class="empty-table-cell">No management meeting items recorded yet.</td></tr>';
    applyMeetingColumnWidths(managementTable,'management');
    initializeMeetingColumnResize(managementTable,'management');

    const dl=$('tractorNumberList');
    if(dl) dl.innerHTML=state.maintenance.tractors.map(t=>`<option value="${escapeHtml(t.tractorNumber)}"></option>`).join('');
  }

  function renderTripInspections(){
    renderMeetings();
    const inspections=[...state.meetings.inspections], open=inspections.filter(x=>x.addressed!=='Y'), urgent=open.filter(x=>String(x.priority)==='1');
    if($('tripInspectionCards')) $('tripInspectionCards').innerHTML=[['Open Defects',open.length,open.length?'warning-card':''],['Priority 1',urgent.length,urgent.length?'danger':''],['Addressed',inspections.length-open.length,''],['Total Reports',inspections.length,'']].map(x=>`<div class="summary-card ${x[2]}"><span>${x[0]}</span><strong>${fmtNum(x[1])}</strong></div>`).join('');
    if($('exportInspectionsBtn')) $('exportInspectionsBtn').disabled=!inspections.length;
  }

  function openInspectionModal(id='') {
    const r=id ? state.meetings.inspections.find(x=>x.id===id) : null;
    $('inspectionEditId').value=r?.id||'';
    $('inspectionModalTitle').textContent=r?'Edit Inspection Report':'Add Inspection Report';
    $('inspectionDateInput').value=r?.date || String(r?.createdAt||'').slice(0,10) || todayIso();
    $('inspectionTractorInput').value=r?.tractorNumber||'';
    $('inspectionDriverInput').value=r?.driverName||'';
    $('inspectionIssueInput').value=r?.issue||'';
    $('inspectionPriorityInput').value=String(r?.priority||'1');
    $('inspectionAddressedInput').value=r?.addressed||'N';
    $('inspectionModal').classList.remove('hidden');
    setTimeout(()=>$('inspectionTractorInput').focus(),0);
  }

  async function saveInspectionFromForm(e) {
    e.preventDefault();
    const id=$('inspectionEditId').value, existing=id?state.meetings.inspections.find(x=>x.id===id):null, now=new Date().toISOString();
    const record={
      id:existing?.id||uid('inspection'), date:String($('inspectionDateInput').value||todayIso()), tractorNumber:normalizeTractor($('inspectionTractorInput').value),
      driverName:String($('inspectionDriverInput').value||'').trim(), issue:String($('inspectionIssueInput').value||'').trim(),
      priority:String($('inspectionPriorityInput').value||'3'), addressed:String($('inspectionAddressedInput').value||'N'),
      createdAt:existing?.createdAt||now, updatedAt:now
    };
    if(existing) Object.assign(existing,record); else state.meetings.inspections.push(record);
    await saveMeetingData(true); closeModal('inspectionModal'); renderTripInspections(); setScreen('trip-inspections');
    showAlert(`Truck inspection report for tractor <strong>${escapeHtml(record.tractorNumber)}</strong> saved.`,'success');
  }

  function openManagementModal(id='',prefill=null) {
    const r=id ? state.meetings.managementItems.find(x=>x.id===id) : null;
    $('managementEditId').value=r?.id||'';
    if($('managementAuditFindingId')) $('managementAuditFindingId').value=r?.sourceAuditFindingId||prefill?.sourceAuditFindingId||'';
    $('managementModalTitle').textContent=r?'Edit Meeting Item':(prefill?.sourceAuditFindingId?'Add Audit Action Item':'Add Meeting Item');
    $('managementDateInput').value=r?.date||prefill?.date||todayIso();
    $('managementTopicInput').value=r?.topic||prefill?.topic||'';
    $('managementNotesInput').value=r?.notes||prefill?.notes||'';
    $('managementResponsibleInput').value=r?.responsible||prefill?.responsible||'';
    $('managementDueDateInput').value=r?.dueDate||prefill?.dueDate||'';
    $('managementClosedInput').value=r?.closed||prefill?.closed||'N';
    $('managementItemModal').classList.remove('hidden');
    setTimeout(()=>$('managementTopicInput').focus(),0);
  }

  async function saveManagementFromForm(e) {
    e.preventDefault();
    const id=$('managementEditId').value, existing=id?state.meetings.managementItems.find(x=>x.id===id):null, now=new Date().toISOString();
    const sourceAuditFindingId=String($('managementAuditFindingId')?.value||existing?.sourceAuditFindingId||'');
    const record={
      id:existing?.id||uid('meeting'), date:$('managementDateInput').value, topic:String($('managementTopicInput').value||'').trim(),
      notes:String($('managementNotesInput').value||'').trim(), responsible:String($('managementResponsibleInput').value||'').trim(),
      dueDate:$('managementDueDateInput').value, closed:String($('managementClosedInput').value||'N'), sourceAuditFindingId,
      createdAt:existing?.createdAt||now, updatedAt:now
    };
    if(existing) Object.assign(existing,record); else state.meetings.managementItems.push(record);
    if(sourceAuditFindingId){
      const f=(state.audit.findings||[]).find(x=>x.id===sourceAuditFindingId);
      if(f){ f.meetingItemId=record.id; f.responsible=record.responsible||f.responsible||''; f.dueDate=record.dueDate||f.dueDate||''; f.closed=record.closed==='Y'?'Y':'N'; f.updatedAt=now; }
    }
    await saveMeetingData(true); if(sourceAuditFindingId) await saveAuditData(true); closeModal('managementItemModal'); renderMeetings(); renderAudit(); setScreen('meetings');
    showAlert(`Management meeting item <strong>${escapeHtml(record.topic)}</strong> saved.${sourceAuditFindingId?' It remains linked to the original audit finding.':''}`,'success');
  }

  async function deleteInspection(id) {
    const r=state.meetings.inspections.find(x=>x.id===id); if(!r) return;
    if(!confirm(`Delete the inspection report for tractor ${r.tractorNumber}?`)) return;
    state.meetings.inspections=state.meetings.inspections.filter(x=>x.id!==id);
    await saveMeetingData(true); renderTripInspections(); setScreen('trip-inspections');
  }

  async function deleteManagementItem(id) {
    const r=state.meetings.managementItems.find(x=>x.id===id); if(!r) return;
    if(!confirm(`Delete management meeting item "${r.topic}"?`)) return;
    state.meetings.managementItems=state.meetings.managementItems.filter(x=>x.id!==id);
    if(r.sourceAuditFindingId){ const f=(state.audit.findings||[]).find(x=>x.id===r.sourceAuditFindingId); if(f){ f.meetingItemId=''; f.closed='N'; f.updatedAt=new Date().toISOString(); await saveAuditData(true); } }
    await saveMeetingData(true); renderMeetings(); renderAudit(); setScreen('meetings');
  }


  function defaultRecruitmentLayout(){
    return {
      layoutVersion:HR_RECRUITMENT_LAYOUT_VERSION,
      columnOrder:[...HR_RECRUITMENT_DEFAULT_ORDER],
      columnWidths:{...HR_RECRUITMENT_DEFAULT_WIDTHS}
    };
  }
  function defaultHrData(){ return {version:11,candidates:[],recruitmentLayout:defaultRecruitmentLayout(),updatedAt:null}; }
  function ensureRecruitmentLayout(data=state.hr){
    if(!data || typeof data!=='object') return defaultRecruitmentLayout();
    const stored=data.recruitmentLayout && typeof data.recruitmentLayout==='object' ? data.recruitmentLayout : {};
    const fixed=[...HR_RECRUITMENT_FIXED_COLUMNS], actions='actions';
    const movableDefaults=HR_RECRUITMENT_DEFAULT_ORDER.filter(k=>!fixed.includes(k)&&k!==actions);
    const rawOrder=Array.isArray(stored.columnOrder)?stored.columnOrder:[];
    const seen=new Set();
    const movable=[];
    rawOrder.forEach(k=>{
      const migratedKey=k==='reasonStuck'?'notes':k;
      if(movableDefaults.includes(migratedKey)&&!seen.has(migratedKey)){ seen.add(migratedKey); movable.push(migratedKey); }
    });
    // When a new workflow column is introduced, place it near its intended default
    // location without otherwise disturbing a user's saved custom column order.
    if(!seen.has('doubles')){
      const afterType=movable.indexOf('type');
      movable.splice(afterType>=0?afterType+1:movable.length,0,'doubles');
      seen.add('doubles');
    }
    movableDefaults.forEach(k=>{ if(!seen.has(k)){ seen.add(k); movable.push(k); } });
    const widths={};
    const rawWidths=stored.columnWidths && typeof stored.columnWidths==='object' ? stored.columnWidths : {};
    HR_RECRUITMENT_DEFAULT_ORDER.forEach(k=>{
      const n=Number(rawWidths[k]);
      widths[k]=Number.isFinite(n)?Math.max(HR_RECRUITMENT_MIN_WIDTHS[k],Math.round(n)):HR_RECRUITMENT_DEFAULT_WIDTHS[k];
    });
    data.version=Math.max(10,Number(data.version)||1);
    data.recruitmentLayout={layoutVersion:HR_RECRUITMENT_LAYOUT_VERSION,columnOrder:[...fixed,...movable,actions],columnWidths:widths};
    return data.recruitmentLayout;
  }
  const RECRUITMENT_DOUBLES_OPTIONS=['Yes With Experience','Yes No Experience','No'];
  function normalizeRecruitmentDoubles(candidate){
    const value=String(candidate?.doubles||'').trim(),experience=String(candidate?.hiringSummary?.doublesExperience||'').trim();
    if(RECRUITMENT_DOUBLES_OPTIONS.includes(value))return value;
    if(/^no$/i.test(value))return 'No';
    if(/^yes$/i.test(value)){
      if(/^(no\b|yes\b.*\bno experience\b)/i.test(experience))return 'Yes No Experience';
      if(/^yes\b/i.test(experience))return 'Yes With Experience';
      return 'Yes'; // Preserve legacy endorsement data until experience is specified.
    }
    return '';
  }
  function recruitmentDoublesLabel(candidate){
    const value=normalizeRecruitmentDoubles(candidate);return value==='Yes'?'Yes (experience not specified)':value||'Not provided';
  }
  const HR_TERMINAL_STATUSES=new Set(['Hired','Rejected','Terminated']);
  function normalizeRecruitmentStatus(status){
    const s=String(status||'').trim();
    if(s==='Active'||s==='On Hold'||!s) return 'In Progress';
    if(s==='Withdrew') return 'Rejected';
    return HR_RECRUITMENT_STATUSES.includes(s)?s:'In Progress';
  }
  function hrDateDiffDays(startIso,endIso){
    if(!startIso) return null;
    const a=new Date(`${startIso}T12:00:00`), b=new Date(`${endIso}T12:00:00`);
    if(isNaN(a)||isNaN(b)) return null;
    return Math.max(0,Math.floor((b-a)/86400000));
  }
  function recruitmentDaysInProcess(candidate){
    if(!candidate?.dateAdded) return null;
    const terminal=HR_TERMINAL_STATUSES.has(normalizeRecruitmentStatus(candidate.recruitmentStatus));
    const end=terminal ? (candidate.completedAt||todayIso()) : todayIso();
    return hrDateDiffDays(candidate.dateAdded,end);
  }
  function recruitmentStatusPill(status){
    const s=normalizeRecruitmentStatus(status);
    const cls=s==='Hired'?'hired':s==='Rejected'?'rejected':s==='Terminated'?'terminated':'progress';
    return `<span class="hr-status-pill ${cls}">${escapeHtml(s)}</span>`;
  }
  function recruitmentFadvPill(status){
    const s=String(status||'In Progress');
    const cls=s==='Complete'?'complete':s==='Stuck'?'stuck':'progress';
    return `<span class="hr-fadv-pill ${cls}">${escapeHtml(s)}</span>`;
  }
  function recruitmentRoadPill(status){
    const s=String(status||'Not Scheduled');
    const cls=s==='Pass'?'pass':s==='Fail'?'fail':s==='Scheduled'?'scheduled':'neutral';
    return `<span class="hr-road-pill ${cls}">${escapeHtml(s)}</span>`;
  }
  function recruitmentEquipmentFamPill(status){
    const s=String(status||'No');
    const cls=s==='Yes'?'yes':s==='Sent'?'sent':'no';
    return `<span class="hr-equipment-pill ${cls}">${escapeHtml(s)}</span>`;
  }
  function recruitmentDrugTestPill(status){
    const s=String(status||'Not Taken');
    const cls=s==='Pass'?'pass':s==='Fail'?'fail':s==='Taken'?'taken':'neutral';
    return `<span class="hr-drug-pill ${cls}">${escapeHtml(s)}</span>`;
  }
  function recruitmentOfferPill(status){
    const s=String(status||'Not Sent');
    const cls=s==='Accepted'?'accepted':s==='Declined'?'declined':s==='Sent'?'sent':'neutral';
    return `<span class="hr-offer-pill ${cls}">${escapeHtml(s)}</span>`;
  }
  function recruitmentDaysPill(candidate){
    const days=recruitmentDaysInProcess(candidate);
    if(days==null) return '—';
    const cls=days>=21?'danger':days>=11?'warning':'normal';
    return `<span class="hr-days-pill ${cls}">${days} day${days===1?'':'s'}</span>`;
  }
  async function loadHrData(){
    if(!state.directoryHandle) return;
    let data=defaultHrData();
    try{
      const dir=await state.directoryHandle.getDirectoryHandle('HR');
      const fh=await dir.getFileHandle('hr_data.json');
      const parsed=JSON.parse(await (await fh.getFile()).text());
      if(parsed && Array.isArray(parsed.candidates)) data={...data,...parsed,version:11,candidates:parsed.candidates.map(c=>{ const legacyDigits=String(c.ssnFull||c.ssn||'').replace(/\D/g,''); const full=legacyDigits.length===9?legacyDigits:''; const last4=String(c.ssnLast4||full||c.ssn||'').replace(/\D/g,'').slice(-4); const migrated={...c,recruitmentStatus:normalizeRecruitmentStatus(c.recruitmentStatus),drugTest:c.drugTest||'Not Taken',doubles:normalizeRecruitmentDoubles(c),notes:String(c.notes||c.reasonStuck||''),dob:c.dob||'',cdlNumber:c.cdlNumber||'',cdlIssuingState:c.cdlIssuingState||'',cdlExpiry:c.cdlExpiry||'',ssnFull:full,ssnLast4:last4,sourceApplicationName:c.sourceApplicationName||'',roadTestForm:(c.roadTestForm&&typeof c.roadTestForm==='object'?c.roadTestForm:{})}; delete migrated.ssn; delete migrated.reasonStuck; return migrated; })};
    }catch(err){ if(err?.name!=='NotFoundError') console.warn('Could not load HR data',err); }
    ensureRecruitmentLayout(data);
    state.hr=data; state.hrLoaded=true; if(state.dispatchLoaded)syncSharedDriverRoster(); renderHr(); renderDispatch(); renderDailyDispatch();
  }
  async function saveHrData(silent=true,options={}){
    const rosterChanged=state.dispatchLoaded?syncSharedDriverRoster():false;
    const cloudSaved=cloudConnected()?await saveCloudModule('hr',true,options):false;
    // A local folder cannot stand in for a failed cloud save in an online session.
    if(cloudConnected()&&!cloudSaved)return false;
    if(rosterChanged&&canAccessModuleKey('dispatch',true)) await saveDispatchData(true);
    if(!state.directoryHandle){ if(!silent&&cloudSaved) showAlert('HR records saved to NBL Cloud. Full SSNs are excluded from cloud storage.','success'); return cloudSaved; }
    if(!(await requestPermission(state.directoryHandle,'readwrite'))){ if(!silent) showAlert('Folder write permission is required to save HR records.','error'); return false; }
    try{
      const dir=await state.directoryHandle.getDirectoryHandle('HR',{create:true});
      ensureRecruitmentLayout(state.hr);
      state.hr.version=9; state.hr.updatedAt=new Date().toISOString();
      await writeFile(dir,'hr_data.json',JSON.stringify(state.hr,null,2),'application/json');
      if(!silent) showAlert(`HR records saved to <strong>${escapeHtml(state.directoryHandle.name)}/HR</strong>.`,'success');
      return true;
    }catch(err){ console.error(err); if(!silent) showAlert('Could not save HR records: '+err.message,'error'); return false; }
  }
  function recruitmentDefaultSort(rows){
    const terminalOrder={'In Progress':0,Hired:1,Rejected:2,Terminated:3};
    return rows.slice().sort((a,b)=>(terminalOrder[a.recruitmentStatus]??9)-(terminalOrder[b.recruitmentStatus]??9) || String(b.dateAdded||'').localeCompare(String(a.dateAdded||'')) || String(a.name||'').localeCompare(String(b.name||'')));
  }
  function recruitmentSortValue(c,key){
    if(key==='daysInProcess') return recruitmentDaysInProcess(c);
    if(key==='notes') return c.notes||'';
    const v=c?.[key];
    return v==null?'':v;
  }
  function sortRecruitmentRows(rows){
    const sort=state.recruitmentSort||{key:'',dir:'asc'}, key=sort.key;
    if(!key || key==='actions' || !HR_RECRUITMENT_DEFAULT_ORDER.includes(key)) return recruitmentDefaultSort(rows);
    const dir=sort.dir==='desc'?-1:1;
    return rows.slice().sort((a,b)=>{
      const av=recruitmentSortValue(a,key), bv=recruitmentSortValue(b,key);
      const aBlank=av===''||av==null, bBlank=bv===''||bv==null;
      if(aBlank!==bBlank) return aBlank?1:-1;
      if(aBlank&&bBlank) return String(a.name||'').localeCompare(String(b.name||''));
      let cmp=0;
      if(typeof av==='number' && typeof bv==='number') cmp=av-bv;
      else cmp=String(av).localeCompare(String(bv),undefined,{numeric:true,sensitivity:'base'});
      return cmp*dir || String(a.name||'').localeCompare(String(b.name||''));
    });
  }
  function filteredRecruitmentCandidates(){
    const q=String(state.recruitmentSearch||'').trim().toLowerCase(), status=state.recruitmentStatusFilter||'';
    const rows=(state.hr.candidates||[]).filter(c=>{
      if(status && normalizeRecruitmentStatus(c.recruitmentStatus)!==status) return false;
      if(!q) return true;
      return [c.name,c.email,c.phone,c.domicile,c.fedexId,c.shift,c.type,c.doubles,c.fadvStatus,c.notes,c.roadTest,c.drugTest,c.offerLetter,c.recruitmentStatus].some(v=>String(v||'').toLowerCase().includes(q));
    });
    return sortRecruitmentRows(rows);
  }
  function recruitmentCellHtml(c,key){
    switch(key){
      case 'name': return `<strong>${escapeHtml(c.name||'—')}</strong>`;
      case 'email': return c.email?`<a href="mailto:${escapeHtml(c.email)}">${escapeHtml(c.email)}</a>`:'—';
      case 'phone': return escapeHtml(c.phone||'—');
      case 'domicile': return escapeHtml(c.domicile||'—');
      case 'fedexId': return escapeHtml(c.fedexId||'—');
      case 'shift': return escapeHtml(c.shift||'—');
      case 'type': return escapeHtml(c.type||'—');
      case 'doubles': return `<span class="hr-doubles-pill ${normalizeRecruitmentDoubles(c).startsWith('Yes')?'yes':'no'}">${escapeHtml(recruitmentDoublesLabel(c))}</span>`;
      case 'dateAdded': return fmtDate(c.dateAdded);
      case 'screeningInterview': return c.screeningInterview?fmtDate(c.screeningInterview):'—';
      case 'fadvStatus': return recruitmentFadvPill(c.fadvStatus);
      case 'notes': return escapeHtml(c.notes||'—');
      case 'opsInterview': return c.opsInterview?fmtDate(c.opsInterview):'—';
      case 'equipmentFam': return recruitmentEquipmentFamPill(c.equipmentFam);
      case 'roadTest': return recruitmentRoadPill(c.roadTest);
      case 'drugTest': return recruitmentDrugTestPill(c.drugTest);
      case 'offerLetter': return recruitmentOfferPill(c.offerLetter);
      case 'startDate': return c.startDate?fmtDate(c.startDate):'—';
      case 'recruitmentStatus': return recruitmentStatusPill(c.recruitmentStatus);
      case 'daysInProcess': return recruitmentDaysPill(c);
      case 'actions': return `<div class="row-actions"><button class="table-action" data-hiring-summary-candidate="${escapeHtml(c.id)}">Hiring Summary</button><button class="table-action road-test-action" data-road-test-candidate="${escapeHtml(c.id)}">Road Test</button><button class="table-action" data-edit-recruitment-candidate="${escapeHtml(c.id)}">Edit</button><button class="table-action danger-link" data-delete-recruitment-candidate="${escapeHtml(c.id)}">Delete</button></div>`;
      default: return '—';
    }
  }
  function recruitmentHeaderHtml(order,rowClass=''){
    const activeKey=state.recruitmentSort?.key||'', activeDir=state.recruitmentSort?.dir||'asc';
    return `<tr${rowClass?` class="${escapeHtml(rowClass)}"`:''}>`+order.map(key=>{
      const label=HR_RECRUITMENT_LABELS[key]||key;
      const sortable=key!=='actions';
      const movable=!HR_RECRUITMENT_FIXED_COLUMNS.includes(key) && key!=='actions';
      const arrow=activeKey===key?(activeDir==='desc'?'▼':'▲'):'↕';
      const sortClass=activeKey===key?' active':'';
      return `<th data-hr-column="${escapeHtml(key)}"${activeKey===key?` aria-sort="${activeDir==='desc'?'descending':'ascending'}"`:''}><div class="hr-header-inner">${movable?`<span class="hr-column-drag-handle" draggable="true" data-hr-drag="${escapeHtml(key)}" title="Drag to rearrange this column" aria-label="Drag ${escapeHtml(label)} column">⋮⋮</span>`:''}${sortable?`<button type="button" class="hr-sort-button${sortClass}" data-hr-sort="${escapeHtml(key)}" title="Sort by ${escapeHtml(label)}"><span>${escapeHtml(label)}</span><span class="hr-sort-indicator" aria-hidden="true">${arrow}</span></button>`:`<span class="hr-header-label">${escapeHtml(label)}</span>`}<span class="hr-column-resize-handle" data-hr-resize="${escapeHtml(key)}" title="Drag to resize ${escapeHtml(label)}" aria-hidden="true"></span></div></th>`;
    }).join('')+'</tr>';
  }
  function applyRecruitmentColumnLayout(table){
    if(!table) return;
    const layout=ensureRecruitmentLayout(state.hr), order=layout.columnOrder, widths=layout.columnWidths;
    let colgroup=table.querySelector('colgroup');
    if(!colgroup){ colgroup=document.createElement('colgroup'); table.insertBefore(colgroup,table.firstChild); }
    colgroup.innerHTML=order.map(key=>`<col data-hr-col="${escapeHtml(key)}">`).join('');
    order.forEach(key=>{
      const width=Math.max(HR_RECRUITMENT_MIN_WIDTHS[key]||70,Number(widths[key])||HR_RECRUITMENT_DEFAULT_WIDTHS[key]||100);
      const col=colgroup.querySelector(`[data-hr-col="${key}"]`);
      if(col) col.style.width=`${width}px`;
      table.querySelectorAll(`[data-hr-column="${key}"]`).forEach(cell=>{
        cell.style.setProperty('width',`${width}px`,'important');
        cell.style.setProperty('min-width',`${width}px`,'important');
        cell.style.setProperty('max-width',`${width}px`,'important');
      });
    });
    const total=order.reduce((sum,key)=>sum+(Number(widths[key])||HR_RECRUITMENT_DEFAULT_WIDTHS[key]||100),0);
    table.style.setProperty('width',`${total}px`,'important');
    table.style.setProperty('min-width',`${total}px`,'important');
    table.style.setProperty('max-width',`${total}px`,'important');
    table.classList.add('hr-layout-enabled');
  }
  function clearRecruitmentDropIndicators(table){
    table?.querySelectorAll('th.hr-drop-before,th.hr-drop-after').forEach(th=>th.classList.remove('hr-drop-before','hr-drop-after'));
    if(table){ delete table.dataset.hrDropTarget; delete table.dataset.hrDropAfter; }
  }
  function initializeRecruitmentTableInteractions(table){
    if(!table || table.dataset.hrGridBound==='1') return;
    table.dataset.hrGridBound='1';

    const startColumnResize=(handle,startX)=>{
      const key=handle?.dataset?.hrResize;
      if(!key || !HR_RECRUITMENT_DEFAULT_ORDER.includes(key)) return;
      const layout=ensureRecruitmentLayout(state.hr);
      const startWidth=Number(layout.columnWidths[key])||HR_RECRUITMENT_DEFAULT_WIDTHS[key]||100;
      const minimum=HR_RECRUITMENT_MIN_WIDTHS[key]||70;
      const th=handle.closest('th');
      table.classList.add('hr-resizing-columns'); th?.classList.add('hr-resizing');
      document.body.classList.add('hr-global-column-resize');
      const resizeTo=clientX=>{
        const width=Math.max(minimum,Math.round(startWidth+(clientX-startX)));
        if(layout.columnWidths[key]===width) return;
        layout.columnWidths[key]=width;
        applyRecruitmentColumnLayout(table);
      };
      const mouseMove=ev=>{ ev.preventDefault(); resizeTo(ev.clientX); };
      const touchMove=ev=>{ if(!ev.touches?.length) return; ev.preventDefault(); resizeTo(ev.touches[0].clientX); };
      const finish=async()=>{
        document.removeEventListener('mousemove',mouseMove,true);
        document.removeEventListener('mouseup',finish,true);
        document.removeEventListener('touchmove',touchMove,true);
        document.removeEventListener('touchend',finish,true);
        document.removeEventListener('touchcancel',finish,true);
        table.classList.remove('hr-resizing-columns'); th?.classList.remove('hr-resizing');
        document.body.classList.remove('hr-global-column-resize');
        await saveHrData(true);
      };
      document.addEventListener('mousemove',mouseMove,true);
      document.addEventListener('mouseup',finish,true);
      document.addEventListener('touchmove',touchMove,{capture:true,passive:false});
      document.addEventListener('touchend',finish,true);
      document.addEventListener('touchcancel',finish,true);
    };
    table.addEventListener('mousedown',e=>{
      const handle=e.target.closest('[data-hr-resize]');
      if(!handle || !table.contains(handle) || e.button!==0) return;
      e.preventDefault(); e.stopPropagation();
      startColumnResize(handle,e.clientX);
    },true);
    table.addEventListener('touchstart',e=>{
      const handle=e.target.closest('[data-hr-resize]');
      if(!handle || !table.contains(handle) || !e.touches?.length) return;
      e.preventDefault(); e.stopPropagation();
      startColumnResize(handle,e.touches[0].clientX);
    },{capture:true,passive:false});

    table.addEventListener('dblclick',e=>{
      const row=e.target.closest('tbody tr[data-hr-candidate-id]');
      if(!row || !table.contains(row) || e.target.closest('button')) return;
      e.preventDefault();
      openRecruitmentCandidateModal(row.dataset.hrCandidateId);
    });

    table.addEventListener('dragstart',e=>{
      const grip=e.target.closest('[data-hr-drag]');
      if(!grip || !table.contains(grip)) return;
      const key=grip.dataset.hrDrag;
      if(HR_RECRUITMENT_FIXED_COLUMNS.includes(key)||key==='actions') return e.preventDefault();
      table.dataset.hrDragging=key; table.classList.add('hr-reordering-columns'); grip.closest('th')?.classList.add('hr-dragging-column');
      if(e.dataTransfer){ e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain',key); }
    });
    table.addEventListener('dragover',e=>{
      const source=table.dataset.hrDragging; if(!source) return;
      const th=e.target.closest('th[data-hr-column]'); if(!th||!table.contains(th)) return;
      const target=th.dataset.hrColumn;
      if(HR_RECRUITMENT_FIXED_COLUMNS.includes(target)||target===source) return;
      e.preventDefault(); if(e.dataTransfer) e.dataTransfer.dropEffect='move';
      clearRecruitmentDropIndicators(table);
      const rect=th.getBoundingClientRect();
      const after=target!=='actions' && e.clientX>(rect.left+rect.width/2);
      th.classList.add(after?'hr-drop-after':'hr-drop-before');
      table.dataset.hrDropTarget=target; table.dataset.hrDropAfter=after?'1':'0';
    });
    table.addEventListener('drop',async e=>{
      const source=table.dataset.hrDragging, target=table.dataset.hrDropTarget;
      if(!source||!target||source===target) return;
      e.preventDefault();
      const layout=ensureRecruitmentLayout(state.hr); let order=[...layout.columnOrder].filter(k=>k!==source);
      let idx=order.indexOf(target); if(idx<0) idx=order.indexOf('actions');
      if(table.dataset.hrDropAfter==='1' && target!=='actions') idx+=1;
      order.splice(Math.max(HR_RECRUITMENT_FIXED_COLUMNS.length,idx),0,source);
      state.hr.recruitmentLayout.columnOrder=order; ensureRecruitmentLayout(state.hr);
      clearRecruitmentDropIndicators(table); delete table.dataset.hrDragging; table.classList.remove('hr-reordering-columns');
      renderHr(); await saveHrData(true);
    });
    table.addEventListener('dragend',()=>{
      clearRecruitmentDropIndicators(table); delete table.dataset.hrDragging; table.classList.remove('hr-reordering-columns');
      table.querySelectorAll('.hr-dragging-column').forEach(x=>x.classList.remove('hr-dragging-column'));
    });
  }
  function toggleRecruitmentSort(key){
    if(key==='actions'||!HR_RECRUITMENT_DEFAULT_ORDER.includes(key)) return;
    const current=state.recruitmentSort||{key:'',dir:'asc'};
    state.recruitmentSort=current.key===key?{key,dir:current.dir==='asc'?'desc':'asc'}:{key,dir:'asc'};
    renderHr();
  }
  async function resetRecruitmentLayout(){
    state.hr.recruitmentLayout=defaultRecruitmentLayout(); ensureRecruitmentLayout(state.hr);
    state.recruitmentSort={key:'',dir:'asc'}; renderHr(); await saveHrData(true);
    showAlert('Recruitment column widths and order reset to defaults.','success');
  }
  function renderHr(){
    if(!$('recruitmentTable')) return;
    ensureRecruitmentLayout(state.hr);
    const all=state.hr.candidates||[];
    const counts=Object.fromEntries(HR_RECRUITMENT_STATUSES.map(status=>[status,all.filter(c=>normalizeRecruitmentStatus(c.recruitmentStatus)===status).length]));
    $('recruitmentCards').innerHTML=HR_RECRUITMENT_STATUSES.map(status=>`<div class="summary-card hr-status-summary-card ${status.toLowerCase().replace(/\s+/g,'-')}"><span>${escapeHtml(status)}</span><strong>${fmtNum(counts[status]||0)}</strong></div>`).join('');
    const rows=filteredRecruitmentCandidates(), layout=state.hr.recruitmentLayout, order=layout.columnOrder;
    $('recruitmentCandidateCount').textContent=`${rows.length} driver${rows.length===1?'':'s'}`;
    const table=$('recruitmentTable');
    table.querySelector('thead').innerHTML='';
    const visibleStatuses=state.recruitmentStatusFilter?[state.recruitmentStatusFilter]:HR_RECRUITMENT_STATUSES;
    const groupedHtml=visibleStatuses.map(status=>{
      const groupRows=rows.filter(c=>normalizeRecruitmentStatus(c.recruitmentStatus)===status);
      if(!groupRows.length) return '';
      const groupClass=status.toLowerCase().replace(/\s+/g,'-');
      return `<tr class="hr-status-group-row ${groupClass}"><td colspan="${order.length}"><div class="hr-status-group-heading"><span>${escapeHtml(status)}</span><strong>${groupRows.length}</strong></div></td></tr>`+recruitmentHeaderHtml(order,'hr-group-column-row')+groupRows.map(c=>`<tr data-hr-candidate-id="${escapeHtml(c.id)}" title="Double-click to edit candidate" class="${HR_TERMINAL_STATUSES.has(normalizeRecruitmentStatus(c.recruitmentStatus))?'hr-terminal-row':''}">${order.map(key=>`<td data-hr-column="${escapeHtml(key)}" class="${key==='notes'?'hr-reason-cell':''}">${recruitmentCellHtml(c,key)}</td>`).join('')}</tr>`).join('');
    }).join('');
    table.querySelector('tbody').innerHTML=groupedHtml||`<tr><td colspan="${order.length}" class="empty-table-cell">No drivers match the current Recruitment view.</td></tr>`;
    applyRecruitmentColumnLayout(table); initializeRecruitmentTableInteractions(table);
  }
  function recruitmentExportValue(candidate,key){
    if(key==='daysInProcess') return recruitmentDaysInProcess(candidate) ?? '';
    if(key==='notes') return candidate.notes||'';
    return candidate?.[key] ?? '';
  }
  function exportRecruitmentExcel(){
    const rows=recruitmentDefaultSort((state.hr.candidates||[]).slice());
    if(!rows.length){ showAlert('There are no recruitment candidates to export.','warning'); return; }
    try{
      const layout=ensureRecruitmentLayout(state.hr);
      const order=layout.columnOrder.filter(key=>key!=='actions');
      const headers=order.map(key=>HR_RECRUITMENT_LABELS[key]||key);
      const dataRows=rows.map(candidate=>order.map(key=>recruitmentExportValue(candidate,key)));
      const widths=order.map(key=>Math.max(10,Math.round((layout.columnWidths[key]||HR_RECRUITMENT_DEFAULT_WIDTHS[key]||100)/7)));
      const bytes=Core.makeRecruitmentXlsx({headers,rows:dataRows,widths,freezeColumns:1,title:'NBL FleetCommand — Recruitment List'});
      downloadBlob(bytes,`NBL_Recruitment_List_${todayIso()}.xlsx`,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      showAlert(`Recruitment list exported with <strong>${rows.length}</strong> candidate${rows.length===1?'':'s'} across all statuses.`,'success');
    }catch(err){ console.error(err); showAlert('Could not export the recruitment workbook: '+err.message,'error'); }
  }
  function maskedRecruitmentSsn(last4){
    const digits=String(last4||'').replace(/\D/g,'').slice(-4);
    return digits.length===4?`XXX-XX-${digits}`:'';
  }
  function normalizedRecruitmentSsn(value){
    const digits=String(value||'').replace(/\D/g,'');
    return digits.length===9?digits:'';
  }
  function formattedRecruitmentSsn(value){
    const digits=normalizedRecruitmentSsn(value);
    return digits?`${digits.slice(0,3)}-${digits.slice(3,5)}-${digits.slice(5)}`:'';
  }
  function recruitmentSsnLast4FromInput(value){
    const digits=String(value||'').replace(/\D/g,'');
    return digits.length>=4?digits.slice(-4):'';
  }
  function updateRecruitmentSsnRevealButton(){
    const btn=$('recruitmentSsnRevealBtn'); if(!btn) return;
    if(cloudConnected() && !isOwnerAccount()){ btn.disabled=true; btn.classList.add('hidden'); return; }
    btn.classList.remove('hidden');
    const hasFull=!!normalizedRecruitmentSsn(state.hrSsn?.draftFull);
    const hasLast4=String(state.hrSsn?.legacyLast4||'').replace(/\D/g,'').length===4 || !!recruitmentSsnLast4FromInput($('recruitmentSsnInput')?.value||'');
    const canAccess=hasFull || hasLast4 || !!state.hrSsn?.existingCandidate;
    btn.disabled=!canAccess;
    btn.textContent=state.hrSsn?.revealed?'Hide':'Reveal';
    btn.title=hasFull?'Reveal full SSN with Finance Access Code':(state.hrSsn?.existingCandidate?'Unlock SSN field with Finance Access Code':'');
  }
  function maskRecruitmentSsnField(){
    const input=$('recruitmentSsnInput'); if(!input) return;
    const full=normalizedRecruitmentSsn(state.hrSsn?.draftFull);
    const last4=full?full.slice(-4):(String(state.hrSsn?.legacyLast4||'').replace(/\D/g,'').slice(-4)||recruitmentSsnLast4FromInput(input.value));
    input.value=maskedRecruitmentSsn(last4);
    input.placeholder='XXX-XX-1234';
    state.hrSsn.revealed=false;
    updateRecruitmentSsnRevealButton();
  }
  function requestSsnFinanceCode(){
    if(cloudConnected() && !isOwnerAccount()){ showAlert('Full SSN reveal is restricted to the NBL Owner account.','warning'); return Promise.resolve(false); }
    if(!state.finance.configured){
      showAlert('Create a Finance Access Code first. The same code used for Driver Pay, Settlement, Reports, and Revenue Finder protects full SSNs.','warning');
      openFinanceSecurityModal('financeSecuritySetup'); return Promise.resolve(false);
    }
    return new Promise(resolve=>{
      if(state.hrSsn.accessResolver){ try{ state.hrSsn.accessResolver(false); }catch(_){} }
      state.hrSsn.accessResolver=resolve;
      const err=$('ssnAccessError'); if(err){err.textContent='';err.classList.add('hidden');}
      if($('ssnAccessCode')) $('ssnAccessCode').value='';
      openModal('ssnAccessModal'); setTimeout(()=>$('ssnAccessCode')?.focus(),0);
    });
  }
  async function submitSsnAccessCode(e){
    e.preventDefault();
    const code=String($('ssnAccessCode')?.value||'').trim(), err=$('ssnAccessError');
    if(!state.finance.configured){ if(err){err.textContent='Finance access has not been configured.';err.classList.remove('hidden');} return; }
    const hash=await hashFinanceCode(code,state.finance.config.salt);
    if(hash!==state.finance.config.hash){ if(err){err.textContent='Incorrect Finance Access Code.';err.classList.remove('hidden');} $('ssnAccessCode')?.select(); return; }
    const resolve=state.hrSsn.accessResolver; state.hrSsn.accessResolver=null;
    if($('ssnAccessCode')) $('ssnAccessCode').value=''; closeModal('ssnAccessModal');
    if(resolve) resolve(true);
  }
  async function toggleRecruitmentSsnReveal(){
    const full=normalizedRecruitmentSsn(state.hrSsn?.draftFull);
    const last4=String(state.hrSsn?.legacyLast4||'').replace(/\D/g,'').slice(-4) || recruitmentSsnLast4FromInput($('recruitmentSsnInput')?.value||'');
    if(state.hrSsn.revealed){ maskRecruitmentSsnField(); return; }
    if(!full && !last4 && !state.hrSsn?.existingCandidate){ showAlert('No SSN is stored for this candidate yet.','warning'); return; }
    const allowed=await requestSsnFinanceCode(); if(!allowed) return;
    const input=$('recruitmentSsnInput');
    if(full){
      input.value=formattedRecruitmentSsn(full);
      input.placeholder='XXX-XX-1234';
      state.hrSsn.revealed=true;
      updateRecruitmentSsnRevealButton();
      return;
    }
    // Older candidates created before v58 only retained the last four digits. The
    // missing first five digits cannot be reconstructed, so securely unlock the field
    // for one-time entry (or the user can re-import the FADV application).
    input.value='';
    input.placeholder=last4?`Enter full SSN ending in ${last4}`:'Enter full SSN';
    state.hrSsn.revealed=true;
    updateRecruitmentSsnRevealButton();
    input.focus();
    showAlert(last4
      ? `This older candidate record only stored SSN ending in <strong>${escapeHtml(last4)}</strong>. Enter the full SSN once and save the candidate; future Reveal clicks will show it after the Finance Access Code.`
      : 'This candidate does not have a full SSN stored yet. Enter it now and save the candidate; future Reveal clicks will require the Finance Access Code.',
      'warning');
  }
  function readFileAsBase64(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>{ const raw=String(reader.result||''); resolve(raw.includes(',')?raw.split(',',2)[1]:raw); };
      reader.onerror=()=>reject(reader.error||new Error('Could not read the selected file.'));
      reader.readAsDataURL(file);
    });
  }
  function setRecruitmentApplicationParseStatus(message,type=''){
    const el=$('recruitmentApplicationParseStatus'); if(!el) return;
    el.textContent=message||''; el.classList.remove('success','warning','error','working'); if(type) el.classList.add(type);
  }
  function recruitmentApplicationNameTokens(name){
    return String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean);
  }
  function recruitmentApplicationNamesMatch(existingName,pdfName){
    const a=recruitmentApplicationNameTokens(existingName), b=recruitmentApplicationNameTokens(pdfName);
    if(!a.length||!b.length) return true;
    if(a.join(' ')===b.join(' ')) return true;
    // A profile may omit a middle name that appears in First Advantage. Treat the
    // record as the same person when first and last name still match exactly.
    return a[0]===b[0] && a[a.length-1]===b[b.length-1];
  }
  function confirmRecruitmentApplicationNameMismatch(existingName,pdfName,fileName=''){
    return new Promise(resolve=>{
      if(state.hrApplicationMismatch?.resolver){ try{state.hrApplicationMismatch.resolver(false);}catch(_){} }
      state.hrApplicationMismatch={resolver:resolve};
      if($('recruitmentMismatchExistingName')) $('recruitmentMismatchExistingName').textContent=existingName||'—';
      if($('recruitmentMismatchPdfName')) $('recruitmentMismatchPdfName').textContent=pdfName||'—';
      if($('recruitmentMismatchFileName')) $('recruitmentMismatchFileName').textContent=fileName?`File: ${fileName}`:'Review the selected application before accepting it.';
      openModal('recruitmentApplicationMismatchModal');
    });
  }
  function resolveRecruitmentApplicationMismatch(accepted){
    const resolve=state.hrApplicationMismatch?.resolver;
    state.hrApplicationMismatch={resolver:null};
    $('recruitmentApplicationMismatchModal')?.classList.add('hidden');
    if(resolve) resolve(!!accepted);
  }
  function parsedRecruitmentApplicationUpdates(fields,existing=null){
    const updates={};
    ['name','email','phone','address','fedexId','dob','cdlNumber','cdlIssuingState','cdlExpiry'].forEach(key=>{
      const value=String(fields?.[key]||'').trim(); if(value) updates[key]=value;
    });
    const ssnFull=normalizedRecruitmentSsn(fields?.ssnFull||'');
    const ssnLast4=ssnFull?ssnFull.slice(-4):String(fields?.ssnLast4||'').replace(/\D/g,'').slice(-4);
    if(ssnFull){ updates.ssnFull=ssnFull; updates.ssnLast4=ssnLast4; }
    else if(ssnLast4){
      updates.ssnLast4=ssnLast4;
      const existingFull=normalizedRecruitmentSsn(existing?.ssnFull||'');
      // Never continue exposing a stored full SSN when its last four conflict with
      // the newly accepted First Advantage application.
      if(existingFull && !existingFull.endsWith(ssnLast4)) updates.ssnFull='';
    }
    return updates;
  }
  function applyParsedRecruitmentApplication(fields,fileName=''){
    const mapping={name:'recruitmentNameInput',email:'recruitmentEmailInput',phone:'recruitmentPhoneInput',address:'recruitmentAddressInput',fedexId:'recruitmentFedexIdInput',dob:'recruitmentDobInput',cdlNumber:'recruitmentCdlNumberInput',cdlIssuingState:'recruitmentCdlIssuingStateInput',cdlExpiry:'recruitmentCdlExpiryInput'};
    let count=0;
    Object.entries(mapping).forEach(([key,id])=>{ const value=String(fields?.[key]||'').trim(); if(value && $(id)){ $(id).value=value; count++; } });
    const ssnFull=normalizedRecruitmentSsn(fields?.ssnFull||'');
    const ssnLast4=ssnFull?ssnFull.slice(-4):String(fields?.ssnLast4||'').replace(/\D/g,'').slice(-4);
    if(ssnLast4 && $('recruitmentSsnInput')){ state.hrSsn.draftFull=ssnFull; state.hrSsn.legacyLast4=ssnLast4; state.hrSsn.revealed=false; $('recruitmentSsnInput').value=maskedRecruitmentSsn(ssnLast4); updateRecruitmentSsnRevealButton(); count++; }
    const form=$('recruitmentCandidateForm'); if(form) form.dataset.sourceApplicationName=fileName||'';
    return count;
  }
  function setRecruitmentDocumentUploadStatus(message='',type=''){
    const el=$('recruitmentDocumentUploadStatus');if(!el)return;el.textContent=message;el.className=`hr-document-upload-status${message?'':' hidden'}${type?` ${type}`:''}`;
  }
  function recruitmentDocumentLabel(doc){return doc?.fileName?`${doc.fileName}${doc.uploadedAt?` • uploaded ${new Date(doc.uploadedAt).toLocaleDateString()}`:''}`:'No document uploaded.';}
  function recruitmentDocumentSlots(candidate=null){
    const docs=candidate?.documents&&typeof candidate.documents==='object'?candidate.documents:{};
    const slots=Array.from({length:5},(_,index)=>cloneJson(docs[`slot${index+1}`]||{}));
    if(!slots.some(doc=>doc?.path)){
      if(docs.cdl?.path)slots[0]={...cloneJson(docs.cdl),label:docs.cdl.label||'CDL'};
      if(docs.medCard?.path)slots[1]={...cloneJson(docs.medCard),label:docs.medCard.label||'Medical Card',expiry:docs.medCard.expiry||candidate?.medCardExpiry||''};
    }
    return slots;
  }
  function updateRecruitmentDocumentUi(candidate=null){
    const slots=recruitmentDocumentSlots(candidate);
    slots.forEach((doc,index)=>{
      const number=index+1,status=$(`recruitmentDocument${number}Status`),label=$(`recruitmentDocument${number}Label`),expiry=$(`recruitmentDocument${number}Expiry`),input=$(`recruitmentDocument${number}Input`);
      if(status)status.textContent=recruitmentDocumentLabel(doc);
      if(label)label.value=doc?.label||'';
      if(expiry)expiry.value=doc?.expiry||'';
      if(input){input.value='';input.disabled=!cloudConnected();}
      document.querySelector(`[data-view-recruitment-document="slot${number}"]`)?.classList.toggle('hidden',!doc?.path);
      document.querySelector(`[data-delete-recruitment-document="slot${number}"]`)?.classList.toggle('hidden',!doc?.path);
    });
    document.querySelectorAll('[data-recruitment-document-slot]').forEach(card=>{
      card.classList.toggle('hr-document-disabled',!cloudConnected());
    });
    if(!cloudConnected()){
      document.querySelectorAll('[id^="recruitmentDocument"][id$="Label"],[id^="recruitmentDocument"][id$="Expiry"]').forEach(input=>input.disabled=false);
    }
    setRecruitmentDocumentUploadStatus(cloudConnected()?'':'Document uploads require an NBL Cloud connection.',cloudConnected()?'':'error');
  }
  async function viewRecruitmentDocument(kind){
    const candidate=(state.hr.candidates||[]).find(x=>x.id===$('recruitmentCandidateId')?.value),index=Math.max(0,Number(String(kind||'').replace('slot',''))-1),doc=recruitmentDocumentSlots(candidate)[index];if(!doc?.path)return;
    const tab=window.open('about:blank','_blank');
    try{const url=await window.NBLCloud.getRecruitmentDocumentUrl(doc.path);if(tab){tab.opener=null;tab.location.href=url;}else showAlert('Allow pop-ups for FleetCommand to view this document.','warning');}
    catch(err){try{tab?.close();}catch(_){}showAlert(`Could not open the document: ${escapeHtml(err.message||String(err))}`,'error');}
  }
  async function deleteRecruitmentDocument(kind){
    const candidate=(state.hr.candidates||[]).find(x=>x.id===$('recruitmentCandidateId')?.value),index=Math.max(0,Number(String(kind||'').replace('slot',''))-1),slots=recruitmentDocumentSlots(candidate),doc=slots[index];if(!candidate||!doc?.path)return;
    const label=doc.label||`Document ${index+1}`;if(!confirm(`Delete the uploaded ${label} for ${candidate.name}?`))return;
    try{await window.NBLCloud.deleteRecruitmentDocument(doc.path);slots[index]={};candidate.documents=Object.fromEntries(slots.map((item,i)=>[`slot${i+1}`,item]).filter(([,item])=>item?.path||item?.label));candidate.updatedAt=new Date().toISOString();if(!(await saveHrData(true,{candidateIds:[candidate.id]})))throw new Error('Updated document information could not be saved.');updateRecruitmentDocumentUi(candidate);showAlert(`${escapeHtml(label)} document deleted.`,'success');}
    catch(err){showAlert(`Could not delete the document: ${escapeHtml(err.message||String(err))}`,'error');}
  }
  async function parseRecruitmentApplicationPdf(file){
    if(!file) return;
    if(!/\.pdf$/i.test(file.name||'') && file.type!=='application/pdf'){ showAlert('Please choose a PDF application.','warning'); return; }
    if(file.size>15*1024*1024){ showAlert('Application PDF must be 15 MB or smaller.','warning'); return; }
    const targetCandidateId=String($('recruitmentCandidateId')?.value||'');
    setRecruitmentApplicationParseStatus(`Reading ${file.name}…`,'working');
    try{
      const pdfBase64=await readFileAsBase64(file);
      const response=await fetch('/api/hr/parse-application',{method:'POST',headers:await backendAuthHeaders({'Content-Type':'application/json'}),body:JSON.stringify({file_name:file.name,pdf_base64:pdfBase64})});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok || !payload.ok) throw new Error(payload.error||'Could not parse this application PDF.');
      const fields=payload.fields||{};
      const detected=Array.isArray(payload.detected_fields)?payload.detected_fields:[];
      const existing=targetCandidateId?(state.hr.candidates||[]).find(x=>x.id===targetCandidateId):null;
      if(existing){
        const pdfName=String(fields.name||'').trim();
        if(pdfName && existing.name && !recruitmentApplicationNamesMatch(existing.name,pdfName)){
          const accepted=await confirmRecruitmentApplicationNameMismatch(existing.name,pdfName,file.name);
          if(!accepted){
            setRecruitmentApplicationParseStatus(`Upload rejected. No information from ${file.name} was applied.`,'warning');
            showAlert(`First Advantage upload rejected for <strong>${escapeHtml(existing.name)}</strong>. No candidate information was changed.`,'warning');
            return;
          }
        }
        const updates=parsedRecruitmentApplicationUpdates(fields,existing);
        const changed=[];
        Object.entries(updates).forEach(([key,value])=>{ if(String(existing[key]??'')!==String(value??'')) changed.push(key); });
        Object.assign(existing,updates,{sourceApplicationName:file.name,sourceApplicationUpdatedAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
        if(!(await saveHrData(true,{candidateIds:[existing.id]})))throw new Error('The imported candidate changes could not be saved. Please retry.');
        renderHr();
        // Rehydrate the open profile from the saved record so protected SSN state and
        // every updated field reflect exactly what was persisted.
        openRecruitmentCandidateModal(existing.id);
        const fieldCount=Math.max(changed.length,detected.length?1:0);
        setRecruitmentApplicationParseStatus(changed.length
          ? `Updated ${changed.length} field${changed.length===1?'':'s'} from ${file.name}. Changes were saved automatically.`
          : `Read ${file.name}. The supported profile fields already match this candidate.`,'success');
        showAlert(changed.length
          ? `Updated <strong>${escapeHtml(existing.name)}</strong> from ${escapeHtml(file.name)}. ${changed.length} supported field${changed.length===1?' was':'s were'} changed and saved.`
          : `${escapeHtml(file.name)} was accepted for <strong>${escapeHtml(existing.name)}</strong>; no supported profile values needed to change.`,'success');
        return;
      }
      const count=applyParsedRecruitmentApplication(fields,file.name);
      setRecruitmentApplicationParseStatus(count?`Prefilled ${count} field${count===1?'':'s'} from ${file.name}${detected.length?`: ${detected.join(', ')}`:''}. Review before saving.`:`No supported candidate fields were found in ${file.name}.` ,count?'success':'warning');
    }catch(err){
      console.error(err); setRecruitmentApplicationParseStatus(`Could not import ${file.name}: ${err.message}`,'error');
      showAlert('Could not parse the application PDF: '+escapeHtml(err.message),'error');
    }finally{ if($('recruitmentApplicationPdfInput')) $('recruitmentApplicationPdfInput').value=''; }
  }
  // Hiring reports use an explicit allowlist; never export the candidate object.
  const HIRING_SUMMARY_INPUTS = {
    notes:'hiringSummaryNotesInput',payRate:'hiringSummaryPayRateInput',payBasis:'hiringSummaryPayBasisInput',
    schedule:'hiringSummaryScheduleInput',medicalCardExpiry:'hiringSummaryMedicalExpiryInput',
    tractorTrailerYears:'hiringSummaryExperienceInput',fedexExperience:'hiringSummaryFedexExperienceInput'
  };
  function hiringMedicalExpiry(candidate){
    const dates=[...new Set(recruitmentDocumentSlots(candidate).filter(d=>/\b(med(?:ical)?\s*(?:card|certificate)|dot\s*(?:physical|medical)|medical\s*examiner)\b/i.test(d.label||'')).map(d=>d.expiry).filter(Boolean))];
    return dates.length===1?dates[0]:(dates.length>1?'':candidate?.medCardExpiry||'');
  }
  function populateHiringSummary(candidate){
    for(const [key,id] of Object.entries(HIRING_SUMMARY_INPUTS)) $(id).value=candidate?.hiringSummary?.[key]??'';
    const autoDate=hiringMedicalExpiry(candidate);
    $('hiringSummaryMedicalHelp').textContent=autoDate?`Leave blank to use the medical card document expiry: ${fmtDate(autoDate)}.`:'Enter the applicable medical card expiry, or leave blank to use a dated medical card document.';
    $('hiringSummarySaveStatus').textContent='Save Summary saves these details with the candidate profile.';
  }
  function hiringSummaryInputs(){
    const existing=(state.hr.candidates||[]).find(c=>c.id===$('recruitmentCandidateId').value);
    const result={...existing?.hiringSummary,version:2};
    for(const [key,id] of Object.entries(HIRING_SUMMARY_INPUTS)){
      const value=String($(id)?.value||'').trim();
      result[key]=['payRate','tractorTrailerYears'].includes(key)?(value===''?null:Number(value)):value;
    }
    return result;
  }
  function hiringSummaryCandidateFromForm(){
    const form=$('recruitmentCandidateForm');if(!form.reportValidity())return null;
    const documents=Object.fromEntries(Array.from({length:5},(_,i)=>[`slot${i+1}`,{label:$(`recruitmentDocument${i+1}Label`).value,expiry:$(`recruitmentDocument${i+1}Expiry`).value}]));
    const existing=(state.hr.candidates||[]).find(c=>c.id===$('recruitmentCandidateId').value);
    return {name:$('recruitmentNameInput').value.trim(),domicile:$('recruitmentDomicileInput').value.trim(),shift:$('recruitmentShiftInput').value,type:$('recruitmentTypeInput').value,startDate:$('recruitmentStartDateInput').value,
      fadvStatus:$('recruitmentFadvStatusInput').value,drugTest:$('recruitmentDrugTestInput').value,roadTest:$('recruitmentRoadTestInput').value,equipmentFam:$('recruitmentEquipmentFamInput').value,
      doubles:$('recruitmentDoublesInput').value,cdlExpiry:$('recruitmentCdlExpiryInput').value,cdlIssuingState:$('recruitmentCdlIssuingStateInput').value.trim(),
      medCardExpiry:existing?.medCardExpiry||'',documents,hiringSummary:hiringSummaryInputs()};
  }
  function hiringSummaryReport(candidate){
    const h=candidate.hiringSummary||{},text=v=>v==null||String(v).trim()===''?'Not provided':String(v).trim(),date=v=>v?fmtDate(v):'Not provided';
    const rate=h.payRate==null||h.payRate===''?'Not provided':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(h.payRate));
    return {name:text(candidate.name),terminal:text(candidate.domicile),date:fmtDate(todayIso()),notes:text(h.notes),sections:[
      {title:'Position & Offer',rows:[['Employment Type',text(candidate.type)],['Proposed Pay Rate',rate],['Pay Basis',text(h.payBasis)],['Schedule Discussed',text(h.schedule)],['Shift',text(candidate.shift)]]},
      {title:'Hiring Requirements',rows:[['Drug Screen Status',text(candidate.drugTest)],['CDL Expiry Date',date(candidate.cdlExpiry)],['CDL Issuing State',text(candidate.cdlIssuingState)]]},
      {title:'Experience',rows:[['Years of Tractor-Trailer Experience',text(h.tractorTrailerYears)],['Doubles',recruitmentDoublesLabel(candidate)],['FedEx Experience',text(h.fedexExperience)]]}
    ]};
  }
  function hiringStatusClass(value,label=''){
    if(label==='Doubles')return value==='No'?'issue':value==='Yes No Experience'?'pending':value==='Yes With Experience'?'complete':'';
    return /^(Pass|Complete|Yes|Yes With Experience|Yes No Experience)$/i.test(value)?'complete':/^(Fail|Stuck)$/i.test(value)?'issue':/^(Taken|Sent|Scheduled|In Progress|Not Scheduled|Incomplete)$/i.test(value)?'pending':'';
  }
  function previewHiringSummary(){
    const candidate=hiringSummaryCandidateFromForm();if(!candidate)return;
    const r=hiringSummaryReport(candidate);state.hiringSummaryPreview=r;
    $('hiringSummaryPreviewContent').innerHTML=`<article class="hiring-report"><header><img src="assets/nashbox-logistics-logo.png" alt="Nashbox Logistics"><div><span>Candidate Hiring Summary</span><h2>${escapeHtml(r.name)}</h2><p>Location / Terminal: ${escapeHtml(r.terminal)}</p><p>Report Date: ${escapeHtml(r.date)}</p></div></header><section><h3>Hiring Notes</h3><p class="hiring-report-notes">${escapeHtml(r.notes)}</p></section>${r.sections.map(section=>`<section><h3>${escapeHtml(section.title)}</h3><dl>${section.rows.map(([label,value])=>`<div><dt>${escapeHtml(label)}</dt><dd class="${hiringStatusClass(value,label)}${label==='Doubles'?' doubles-status':''}">${escapeHtml(value)}</dd></div>`).join('')}</dl></section>`).join('')}</article>`;
    openModal('hiringSummaryPreviewModal');
  }
  async function renderHiringSummaryCanvases(report){
    const pages=[],W=794,H=1123,M=46,bottom=1060;let canvas,ctx,y;
    let logo=null;try{logo=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src='assets/nashbox-logistics-logo.png';});}catch(_){}
    function wrapped(value,width){
      const lines=[];
      for(const paragraph of String(value).split(/\r?\n/)){
        let line='';
        for(const word of paragraph.split(/\s+/)){
          if(ctx.measureText(line+(line?' ':'')+word).width<=width){line+=(line?' ':'')+word;continue;}
          if(line){lines.push(line);line='';}
          for(const char of word){if(ctx.measureText(line+char).width>width&&line){lines.push(line);line='';}line+=char;}
        }
        lines.push(line||' ');
      }return lines;
    }
    function newPage(){
      canvas=document.createElement('canvas');canvas.width=W*2;canvas.height=H*2;ctx=canvas.getContext('2d');ctx.scale(2,2);ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);pages.push(canvas);
      if(logo){const ratio=Math.min(64/logo.width,64/logo.height);ctx.drawImage(logo,M,30,logo.width*ratio,logo.height*ratio);}
      ctx.fillStyle='#35164E';ctx.font='bold 13px Arial';ctx.fillText('NASHBOX LOGISTICS',M+80,44);
      ctx.font='bold 19px Arial';ctx.fillText('Candidate Hiring Summary',M+80,68);
      ctx.fillStyle='#657285';ctx.font='12px Arial';ctx.fillText(`Report Date: ${report.date}`,M+80,88);
      y=119;ctx.font='bold 21px Arial';ctx.fillStyle='#243746';for(const line of wrapped(report.name,W-2*M)){ctx.fillText(line,M,y);y+=25;}
      ctx.font='13px Arial';ctx.fillStyle='#657285';for(const line of wrapped(`Location / Terminal: ${report.terminal}`,W-2*M)){ctx.fillText(line,M,y);y+=19;}y+=10;
    }
    function heading(title){ctx.fillStyle='#EEE8F2';ctx.fillRect(M,y,W-2*M,28);ctx.fillStyle='#35164E';ctx.font='bold 14px Arial';ctx.fillText(title,M+10,y+19);y+=38;}
    function row(label,value,section){
      ctx.font='13px Arial';const labels=wrapped(label,254),values=wrapped(value,408);let offset=0;
      const count=Math.max(labels.length,values.length);
      while(offset<count){
        if(y+30>bottom){newPage();heading(section+' (continued)');}
        const take=Math.min(count-offset,Math.max(1,Math.floor((bottom-y-10)/19)));
        const displayLabels=offset===0?labels:wrapped(label+' (continued)',254);
        const height=Math.max(31,Math.max(take,displayLabels.length)*19+10);
        ctx.fillStyle='#F5F7F9';ctx.fillRect(M,y,W-2*M,height);ctx.fillStyle='#526478';ctx.font='13px Arial';
        for(let j=0;j<displayLabels.length;j++)ctx.fillText(displayLabels[j],M+10,y+19+j*19);
        const status=hiringStatusClass(value,label);
        if(label==='Doubles'&&status){ctx.fillStyle={complete:'#E3F2E8',issue:'#FCE8E6',pending:'#FFF3CD'}[status];ctx.fillRect(M+274,y,W-2*M-274,height);}
        ctx.fillStyle=status==='complete'?'#216743':status==='issue'?'#A12E2E':status==='pending'?'#8A5D12':'#243746';
        for(let j=0;j<take;j++)if(values[offset+j])ctx.fillText(values[offset+j],M+280,y+19+j*19);
        y+=height+3;offset+=take;
      }
    }
    newPage();heading('Hiring Notes');ctx.font='14px Arial';const noteLines=wrapped(report.notes,W-2*M-20);
    for(const line of noteLines){if(y+22>bottom){newPage();heading('Hiring Notes (continued)');}ctx.fillStyle='#243746';ctx.font='14px Arial';ctx.fillText(line,M+10,y+16);y+=21;}y+=15;
    for(const section of report.sections){if(y+82>bottom)newPage();heading(section.title);for(const [label,value] of section.rows)row(label,value,section.title);y+=12;}
    pages.forEach((page,i)=>{const c=page.getContext('2d');c.fillStyle='#748090';c.font='11px Arial';c.fillText(`NBL FleetCommand   |   Candidate Hiring Summary`,M,H-28);c.fillText(`Page ${i+1} of ${pages.length}`,W-M-85,H-28);});
    return pages;
  }
  async function downloadHiringSummaryPdf(fromPreview=false){
    const report=fromPreview?state.hiringSummaryPreview:(()=>{const c=hiringSummaryCandidateFromForm();return c?hiringSummaryReport(c):null;})();if(!report)return;
    const buttons=[$('hiringSummaryDownloadBtn'),$('hiringSummaryPreviewDownloadBtn')];buttons.forEach(b=>b.disabled=true);
    try{const canvases=await renderHiringSummaryCanvases(report),jpegs=[];for(const c of canvases)jpegs.push(await canvasJpegBytes(c));
      downloadBlob(jpegPagesToPdf(jpegs,canvases[0].width,canvases[0].height),`NBL_Hiring_Summary_${sanitize(report.name)||'Candidate'}_${todayIso()}.pdf`,'application/pdf');
    }catch(err){showAlert('Could not create the Hiring Summary PDF: '+escapeHtml(err.message),'error');}finally{buttons.forEach(b=>b.disabled=false);}
  }

  function revealRecruitmentSection(id){
    const section=$(id);if(!section)return;section.open=true;section.scrollIntoView({block:'start',behavior:'smooth'});
  }
  function revealRecruitmentInvalidField(event){
    const section=event.target?.closest?.('details.hr-candidate-section');if(section)section.open=true;
  }
  function openRecruitmentCandidateModal(id=''){
    document.querySelectorAll('#recruitmentCandidateForm details.hr-candidate-section').forEach(section=>section.open=section.dataset.defaultOpen==='true');
    const c=id?(state.hr.candidates||[]).find(x=>x.id===id):null;
    $('recruitmentCandidateId').value=c?.id||'';
    $('recruitmentCandidateModalTitle').textContent=c?`Edit Candidate — ${c.name}`:'Add Candidate';
    $('recruitmentNameInput').value=c?.name||''; $('recruitmentEmailInput').value=c?.email||''; $('recruitmentPhoneInput').value=c?.phone||'';
    $('recruitmentAddressInput').value=c?.address||'';
    $('recruitmentDobInput').value=c?.dob||''; $('recruitmentCdlNumberInput').value=c?.cdlNumber||''; $('recruitmentCdlIssuingStateInput').value=c?.cdlIssuingState||''; $('recruitmentCdlExpiryInput').value=c?.cdlExpiry||'';
    state.hrSsn.draftFull=normalizedRecruitmentSsn(c?.ssnFull||''); state.hrSsn.legacyLast4=String(c?.ssnLast4||state.hrSsn.draftFull.slice(-4)||'').replace(/\D/g,'').slice(-4); state.hrSsn.revealed=false; state.hrSsn.existingCandidate=!!c; $('recruitmentSsnInput').value=maskedRecruitmentSsn(state.hrSsn.draftFull?state.hrSsn.draftFull.slice(-4):state.hrSsn.legacyLast4); $('recruitmentSsnInput').placeholder='XXX-XX-1234'; updateRecruitmentSsnRevealButton();
    $('recruitmentDomicileInput').value=c?.domicile||''; $('recruitmentFedexIdInput').value=c?.fedexId||''; $('recruitmentDateAddedInput').value=c?.dateAdded||todayIso();
    $('recruitmentShiftInput').value=c?.shift||'Day'; $('recruitmentTypeInput').value=c?.type||'Full Time'; const doubles=c?normalizeRecruitmentDoubles(c):'No'; $('recruitmentDoublesInput').value=RECRUITMENT_DOUBLES_OPTIONS.includes(doubles)?doubles:''; $('recruitmentDoublesHelp').textContent=doubles==='Yes'?'This record currently says Yes. Select whether the candidate has doubles driving experience.':(c?.hiringSummary?.doublesExperience?`Previous experience notes: ${c.hiringSummary.doublesExperience}`:'Select endorsement and experience in one field.'); $('recruitmentStatusInput').value=normalizeRecruitmentStatus(c?.recruitmentStatus);
    $('recruitmentScreeningInterviewInput').value=c?.screeningInterview||''; $('recruitmentFadvStatusInput').value=c?.fadvStatus||'In Progress'; $('recruitmentOpsInterviewInput').value=c?.opsInterview||'';
    $('recruitmentNotesInput').value=c?.notes||c?.reasonStuck||''; $('recruitmentEquipmentFamInput').value=c?.equipmentFam||'No'; $('recruitmentRoadTestInput').value=c?.roadTest||'Not Scheduled';
    $('recruitmentDrugTestInput').value=c?.drugTest||'Not Taken'; $('recruitmentEverifyInput').value=c?.eVerify||'Not Started'; $('recruitmentOfferLetterInput').value=c?.offerLetter||'Not Sent'; $('recruitmentStartDateInput').value=c?.startDate||'';
    $('recruitmentSafetyForwardInput').value=c?.safetyForward||'Not Sent'; $('recruitmentConnectTeamsInput').value=c?.connectTeams||'Not Sent'; $('recruitmentAdpInput').value=c?.adp||'Not Sent'; $('recruitmentMotiveInput').value=c?.motiveOnboarding||'Not Sent'; $('recruitmentEmployeeHandbookInput').value=c?.employeeHandbook||'Not Sent';
    $('recruitmentSsnVerifiedInput').value=c?.ssnVerified==='Yes'?'Yes':'No';updateRecruitmentDocumentUi(c);
    const uploadPanel=$('recruitmentApplicationUploadPanel'); if(uploadPanel) uploadPanel.classList.remove('hidden');
    if($('recruitmentApplicationUploadTitle')) $('recruitmentApplicationUploadTitle').textContent=c?'Update from First Advantage PDF':'Import Candidate Application';
    if($('recruitmentApplicationUploadHelp')) $('recruitmentApplicationUploadHelp').textContent=c
      ? 'Upload a First Advantage application to update this existing driver. Supported fields are saved automatically; if the PDF name differs, NBL will ask you to Accept or Reject the upload first.'
      : 'Upload a FedEx / First Advantage application PDF and NBL will prefill every supported field it can read. You can review or change anything before saving.';
    if($('recruitmentApplicationPdfButton')) $('recruitmentApplicationPdfButton').textContent=c?'Choose Update PDF':'Choose PDF';
    const form=$('recruitmentCandidateForm'); if(form) form.dataset.sourceApplicationName=c?.sourceApplicationName||'';
    setRecruitmentApplicationParseStatus(c?.sourceApplicationName?`Current profile last imported from ${c.sourceApplicationName}. Choose another PDF to update it.`:'No application selected.');
    populateHiringSummary(c);
    openModal('recruitmentCandidateModal'); setTimeout(()=>$('recruitmentNameInput')?.focus(),0);
  }
  async function saveRecruitmentCandidateFromForm(e){
    e.preventDefault();
    const form=$('recruitmentCandidateForm');if(form.dataset.saving==='1')return;
    form.dataset.saving='1';const buttons=Array.from(form.querySelectorAll('button[type="submit"]'));
    buttons.forEach(button=>button.disabled=true);
    try{await persistRecruitmentCandidateFromForm(e);}finally{delete form.dataset.saving;buttons.forEach(button=>button.disabled=false);}
  }
  async function persistRecruitmentCandidateFromForm(e){
    e.preventDefault();
    if(!$('recruitmentCandidateForm').reportValidity())return;
    const id=$('recruitmentCandidateId').value, existing=id?(state.hr.candidates||[]).find(x=>x.id===id):null, now=new Date().toISOString();
    const newStatus=normalizeRecruitmentStatus($('recruitmentStatusInput').value), wasTerminal=existing?HR_TERMINAL_STATUSES.has(existing.recruitmentStatus):false, isTerminal=HR_TERMINAL_STATUSES.has(newStatus);
    let completedAt=existing?.completedAt||'';
    if(isTerminal&&!wasTerminal) completedAt=todayIso(); else if(!isTerminal) completedAt='';
    const existingDocumentSlots=recruitmentDocumentSlots(existing);
    const documentSlots=Object.fromEntries(existingDocumentSlots.map((doc,index)=>{
      const number=index+1,label=String($(`recruitmentDocument${number}Label`)?.value||'').trim(),expiry=$(`recruitmentDocument${number}Expiry`)?.value||'';
      const updated={...doc,label,expiry};
      return [`slot${number}`,updated];
    }).filter(([,doc])=>doc?.path||doc?.label));
    const record={
      ...existing,hiringSummary:hiringSummaryInputs(),
      id:existing?.id||uid('candidate'),name:String($('recruitmentNameInput').value||'').trim(),email:String($('recruitmentEmailInput').value||'').trim(),phone:String($('recruitmentPhoneInput').value||'').trim(),address:String($('recruitmentAddressInput').value||'').trim(),
      dob:$('recruitmentDobInput').value||'',cdlNumber:String($('recruitmentCdlNumberInput').value||'').trim(),cdlIssuingState:String($('recruitmentCdlIssuingStateInput').value||'').trim(),cdlExpiry:$('recruitmentCdlExpiryInput').value||'',
      ssnFull:(()=>{ const typed=normalizedRecruitmentSsn($('recruitmentSsnInput').value); if(typed) return typed; const draft=normalizedRecruitmentSsn(state.hrSsn?.draftFull); const last4=recruitmentSsnLast4FromInput($('recruitmentSsnInput').value); return draft && (!last4 || draft.endsWith(last4)) ? draft : ''; })(),
      ssnLast4:(()=>{ const typed=recruitmentSsnLast4FromInput($('recruitmentSsnInput').value); return typed||String(state.hrSsn?.legacyLast4||existing?.ssnLast4||'').replace(/\D/g,'').slice(-4); })(),
      domicile:String($('recruitmentDomicileInput').value||'').trim(),fedexId:String($('recruitmentFedexIdInput').value||'').trim(),dateAdded:$('recruitmentDateAddedInput').value||todayIso(),shift:$('recruitmentShiftInput').value,type:$('recruitmentTypeInput').value,doubles:$('recruitmentDoublesInput').value,
      screeningInterview:$('recruitmentScreeningInterviewInput').value||'',fadvStatus:$('recruitmentFadvStatusInput').value,notes:String($('recruitmentNotesInput').value||'').trim(),
      opsInterview:$('recruitmentOpsInterviewInput').value||'',equipmentFam:$('recruitmentEquipmentFamInput').value,roadTest:$('recruitmentRoadTestInput').value,drugTest:$('recruitmentDrugTestInput').value,eVerify:$('recruitmentEverifyInput').value,offerLetter:$('recruitmentOfferLetterInput').value,startDate:$('recruitmentStartDateInput').value||'',
      safetyForward:$('recruitmentSafetyForwardInput').value,connectTeams:$('recruitmentConnectTeamsInput').value,adp:$('recruitmentAdpInput').value,motiveOnboarding:$('recruitmentMotiveInput').value,employeeHandbook:$('recruitmentEmployeeHandbookInput').value,
      medCardExpiry:existing?.medCardExpiry||'',ssnVerified:$('recruitmentSsnVerifiedInput').value==='Yes'?'Yes':'No',documents:documentSlots,recruitmentStatus:newStatus,completedAt,sourceApplicationName:String($('recruitmentCandidateForm')?.dataset?.sourceApplicationName||existing?.sourceApplicationName||''),createdAt:existing?.createdAt||now,updatedAt:now
    };
    if(record.ssnFull) record.ssnLast4=record.ssnFull.slice(-4);
    if(!record.name){ showAlert('Candidate name is required.','warning'); return; }
    if(existing) Object.assign(existing,record); else state.hr.candidates.push(record);
    const saved=await saveHrData(true,{candidateIds:[record.id]});
    if(!saved){ renderHr(); $('hiringSummarySaveStatus').textContent='Not saved. Connect to NBL Cloud or select a writable data folder, then try again.';showAlert('The candidate changes have not been saved. Connect to NBL Cloud or select a writable data folder, then try again.','error');return; }
    const uploads=Array.from({length:5},(_,index)=>{const number=index+1;return [`slot${number}`,$(`recruitmentDocument${number}Input`)?.files?.[0],number];}).filter(([,file])=>file);
    if(uploads.length){
      if(!cloudConnected()){setRecruitmentDocumentUploadStatus('Candidate saved, but documents require an NBL Cloud connection.','error');renderHr();return;}
      setRecruitmentDocumentUploadStatus(`Uploading ${uploads.length} document${uploads.length===1?'':'s'}…`,'working');
      try{for(const [kind,file,number] of uploads){const previous=record.documents?.[kind]?.path||'',label=String($(`recruitmentDocument${number}Label`)?.value||'').trim()||file.name,expiry=$(`recruitmentDocument${number}Expiry`)?.value||'',meta=await window.NBLCloud.uploadRecruitmentDocument(state.cloud.organization.id,record.id,kind,file);record.documents[kind]={...meta,label,expiry};if(previous&&previous!==meta.path)await window.NBLCloud.deleteRecruitmentDocument(previous);}record.updatedAt=new Date().toISOString();if(!(await saveHrData(true,{candidateIds:[record.id]})))throw new Error('Uploaded document information could not be saved.');}
      catch(err){updateRecruitmentDocumentUi(record);setRecruitmentDocumentUploadStatus(`Candidate saved, but a document could not be uploaded: ${err.message||String(err)}`,'error');renderHr();return;}
    }
    $('recruitmentCandidateId').value=record.id;
    $('hiringSummarySaveStatus').textContent='Summary saved with the candidate profile.';
    if(e.submitter?.id!=='hiringSummarySaveBtn')closeModal('recruitmentCandidateModal');renderHr();setScreen('hr');showAlert(`Recruitment record for <strong>${escapeHtml(record.name)}</strong> saved${uploads.length?' with its documents':''}.`,'success');
  }
  function openRecruitmentRoadTestModal(id){
    const c=(state.hr.candidates||[]).find(x=>x.id===id); if(!c) return;
    const saved=c.roadTestForm && typeof c.roadTestForm==='object' ? c.roadTestForm : {};
    $('recruitmentRoadTestCandidateId').value=c.id;
    $('recruitmentRoadTestModalTitle').textContent=`Road Test Form — ${c.name||'Candidate'}`;
    $('roadTestCandidateName').value=c.name||'';
    $('roadTestCandidateFedexId').value=c.fedexId||'';
    $('roadTestCandidateCdlNumber').value=c.cdlNumber||'';
    $('roadTestCandidateCdlIssuingState').value=c.cdlIssuingState||'';
    $('roadTestDate').value=saved.date||todayIso();
    $('roadTestAdminName').value=saved.testAdminName||'';
    $('roadTestAdminFedexId').value=saved.testAdminFedexId||'';
    $('roadTestCertificateNumber').value=saved.certificateNumber||'';
    $('roadTestTractorNumber').value=saved.tractorNumber||'';
    $('roadTestTrailerNumber').value=saved.trailerNumber||'';
    openModal('recruitmentRoadTestModal');
    setTimeout(()=>$('roadTestAdminName')?.focus(),0);
  }
  async function saveRoadTestPdfToFolder(bytes,fileName){
    if(!state.directoryHandle) return false;
    try{
      if(!(await requestPermission(state.directoryHandle,'readwrite'))) return false;
      const hrDir=await state.directoryHandle.getDirectoryHandle('HR',{create:true});
      const roadDir=await hrDir.getDirectoryHandle('Road Tests',{create:true});
      await writeFile(roadDir,fileName,bytes,'application/pdf');
      return true;
    }catch(err){ console.warn('Could not save road test PDF to HR/Road Tests',err); return false; }
  }
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

  function roadTestFormDataFromInputs(){
    return {
      date:$('roadTestDate').value||todayIso(),
      testAdminName:String($('roadTestAdminName').value||'').trim(),
      testAdminFedexId:String($('roadTestAdminFedexId').value||'').trim(),
      certificateNumber:String($('roadTestCertificateNumber').value||'').trim(),
      tractorNumber:String($('roadTestTractorNumber').value||'').trim(),
      trailerNumber:String($('roadTestTrailerNumber').value||'').trim()
    };
  }
  function validateRoadTestFormData(formData,verb='saving'){
    if(formData.testAdminName&&formData.testAdminFedexId&&formData.certificateNumber&&formData.tractorNumber&&formData.trailerNumber) return true;
    showAlert(`Enter the test administrator name and FedEx ID, certificate number, tractor number, and trailer number before ${escapeHtml(verb)}.`,'warning');
    return false;
  }
  async function saveRecruitmentRoadTest(e){
    e.preventDefault();
    const id=$('recruitmentRoadTestCandidateId').value;
    const c=(state.hr.candidates||[]).find(x=>x.id===id); if(!c){ showAlert('Candidate record could not be found.','error'); return; }
    const formData=roadTestFormDataFromInputs();
    if(!validateRoadTestFormData(formData,'saving')) return;
    const btn=$('saveRoadTestBtn'); const original=btn?.textContent;
    if(btn){ btn.disabled=true; btn.textContent='Saving…'; }
    try{
      c.roadTestForm={...formData,updatedAt:new Date().toISOString()};
      if(!(await saveHrData(true,{candidateIds:[c.id]})))throw new Error('Road test changes could not be saved. Please retry.');
      if($('roadTestExportPromptCandidateName')) $('roadTestExportPromptCandidateName').textContent=c.name||'Candidate';
      openModal('roadTestExportPromptModal');
    }catch(err){ console.error(err); showAlert('Could not save the road test: '+escapeHtml(err.message),'error'); }
    finally{ if(btn){ btn.disabled=false; btn.textContent=original||'Save Road Test'; } }
  }
  function finishRoadTestSaveOnly(){
    const id=$('recruitmentRoadTestCandidateId').value;
    const c=(state.hr.candidates||[]).find(x=>x.id===id);
    closeModal('roadTestExportPromptModal');
    closeModal('recruitmentRoadTestModal');
    renderHr();
    showAlert(`Road test information for <strong>${escapeHtml(c?.name||'candidate')}</strong> saved. No PDF was exported.`,'success');
  }
  async function exportRecruitmentRoadTestPdf(e){
    e?.preventDefault?.();
    const id=$('recruitmentRoadTestCandidateId').value;
    const c=(state.hr.candidates||[]).find(x=>x.id===id); if(!c){ showAlert('Candidate record could not be found.','error'); return; }
    const formData=roadTestFormDataFromInputs();
    if(!validateRoadTestFormData(formData,'exporting')) return;
    const btn=$('roadTestExportAfterSaveBtn'); const original=btn?.textContent;
    if(btn){ btn.disabled=true; btn.textContent='Creating PDF…'; }
    try{
      const response=await fetch('/api/hr/road-test',{method:'POST',headers:await backendAuthHeaders({'Content-Type':'application/json'}),body:JSON.stringify({
        candidate:{name:c.name||'',fedex_id:c.fedexId||'',cdl_number:c.cdlNumber||'',cdl_issuing_state:c.cdlIssuingState||''},
        road_test:{date:formData.date,test_admin_name:formData.testAdminName,test_admin_fedex_id:formData.testAdminFedexId,certificate_number:formData.certificateNumber,tractor_number:formData.tractorNumber,trailer_number:formData.trailerNumber,candidate_signature_png:createRoadTestSignaturePng(c.name||''),admin_signature_png:createRoadTestSignaturePng(formData.testAdminName)}
      })});
      if(!response.ok){
        const payload=await response.json().catch(()=>({}));
        throw new Error(payload.error||`Road test PDF export failed (HTTP ${response.status}).`);
      }
      const bytes=new Uint8Array(await response.arrayBuffer());
      if(!bytes.length) throw new Error('The road test PDF was empty.');
      const fileName=`NBL_Road_Test_${sanitize(c.name)||'Candidate'}_${formData.date}.pdf`;
      const saved=await saveRoadTestPdfToFolder(bytes,fileName);
      downloadBlob(bytes,fileName,'application/pdf');
      closeModal('roadTestExportPromptModal');
      closeModal('recruitmentRoadTestModal');
      renderHr();
      showAlert(`Road test saved and PDF created for <strong>${escapeHtml(c.name)}</strong>${saved?' and saved to <strong>HR/Road Tests</strong>':''}.`,'success');
    }catch(err){ console.error(err); showAlert('Could not create the road test PDF: '+escapeHtml(err.message),'error'); }
    finally{ if(btn){ btn.disabled=false; btn.textContent=original||'Export PDF'; } }
  }

  async function deleteRecruitmentCandidate(id){
    const c=(state.hr.candidates||[]).find(x=>x.id===id); if(!c)return;
    if(!confirm(`Delete recruitment record for "${c.name}"?`)) return;
    try{
      if(cloudConnected()){
        if(!state.cloud.structured?.recruitment||!window.NBLCloud?.deleteRecruitmentCandidate)throw new Error('Recruitment cloud storage is not ready. Refresh before deleting.');
        await window.NBLCloud.deleteRecruitmentCandidate(state.cloud.organization.id,id);
        state.hr.candidates=(state.hr.candidates||[]).filter(x=>x.id!==id);
        if(state.directoryHandle && !(await saveHrData(true)))showAlert('Candidate deleted from NBL Cloud, but the local backup could not be updated.','warning');
      }else{
        const previous=state.hr.candidates;
        state.hr.candidates=previous.filter(x=>x.id!==id);
        if(!(await saveHrData(true))){state.hr.candidates=previous;throw new Error('Candidate could not be deleted from the saved data.');}
      }
      if(cloudConnected()&&window.NBLCloud?.deleteRecruitmentDocument){for(const doc of Object.values(c.documents||{})){if(doc?.path)try{await window.NBLCloud.deleteRecruitmentDocument(doc.path);}catch(err){console.warn('Could not remove candidate document',err);}}}
      renderHr();setScreen('hr');showAlert(`Recruitment record for <strong>${escapeHtml(c.name)}</strong> deleted.`,'success');
    }catch(err){showAlert('Could not delete the candidate: '+escapeHtml(err.message||String(err)),'error');}
  }


  function defaultAuditData(){ return {version:1,audits:[],findings:[],activeTab:'dashboard',selectedAuditId:''}; }
  function auditStatusLabel(v){ const s=String(v||'').toLowerCase(); return s==='pass'?'Pass':s==='fail'?'Fail':s==='check'?'Check':'—'; }
  function auditStatusPill(v){ const s=String(v||'').toLowerCase(); return `<span class="audit-status ${s}">${escapeHtml(auditStatusLabel(v))}</span>`; }
  function auditCompliance(audit){ const checks=audit?.checks||[]; if(!checks.length) return 0; const pass=checks.filter(x=>String(x.status).toLowerCase()==='pass').length; return Math.round((pass/checks.length)*100); }
  function auditCounts(audit){ const checks=audit?.checks||[]; return {total:checks.length,pass:checks.filter(x=>String(x.status).toLowerCase()==='pass').length,fail:checks.filter(x=>String(x.status).toLowerCase()==='fail').length,check:checks.filter(x=>String(x.status).toLowerCase()==='check').length}; }
  function latestAudit(){ return [...(state.audit.audits||[])].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')) || String(b.createdAt||'').localeCompare(String(a.createdAt||'')))[0]||null; }
  function auditMeetingItem(f){ return f?.meetingItemId ? state.meetings.managementItems.find(x=>x.id===f.meetingItemId) : null; }

  async function loadAuditData(){
    if(!state.directoryHandle) return;
    let data=defaultAuditData();
    try{
      const dir=await state.directoryHandle.getDirectoryHandle('Audit');
      const fh=await dir.getFileHandle('audit_data.json');
      const file=await fh.getFile();
      const parsed=JSON.parse(await file.text());
      if(parsed && Array.isArray(parsed.audits) && Array.isArray(parsed.findings)) data={...data,...parsed};
    }catch(err){ if(err && err.name!=='NotFoundError') console.warn('Could not load audit data',err); }
    data.activeTab=state.audit?.activeTab||data.activeTab||'dashboard';
    data.selectedAuditId=state.audit?.selectedAuditId||data.selectedAuditId||'';
    state.audit=data; state.auditLoaded=true;
    await syncAuditMeetingLinks(false);
    renderAudit();
  }

  async function saveAuditData(silent=true){
    const cloudSaved=cloudConnected()?await saveCloudModule('audit',true):false;
    if(!state.directoryHandle){ if(!silent&&cloudSaved) showAlert('Audit data saved to NBL Cloud.','success'); return cloudSaved; }
    if(!(await requestPermission(state.directoryHandle,'readwrite'))){ if(!silent) showAlert('Folder write permission is required to save audit data.','error'); return false; }
    try{
      const dir=await state.directoryHandle.getDirectoryHandle('Audit',{create:true});
      const payload={version:1,audits:state.audit.audits||[],findings:state.audit.findings||[],updatedAt:new Date().toISOString()};
      await writeFile(dir,'audit_data.json',JSON.stringify(payload,null,2),'application/json');
      if(!silent) showAlert(`Audit data saved to <strong>${escapeHtml(state.directoryHandle.name)}/Audit</strong>.`,'success');
      return true;
    }catch(err){ console.error(err); if(!silent) showAlert('Could not save audit data: '+err.message,'error'); return false; }
  }

  async function syncAuditMeetingLinks(saveIfChanged=true){
    if(!state.audit?.findings?.length) return;
    let changed=false;
    for(const f of state.audit.findings){
      if(!f.meetingItemId) continue;
      const item=state.meetings.managementItems.find(x=>x.id===f.meetingItemId);
      if(!item){ f.meetingItemId=''; if(f.closed==='Y') f.closed='N'; changed=true; continue; }
      const shouldClosed=item.closed==='Y'?'Y':'N';
      if(f.closed!==shouldClosed){ f.closed=shouldClosed; f.closedAt=shouldClosed==='Y'?(item.updatedAt||new Date().toISOString()):''; changed=true; }
      if(item.responsible && f.responsible!==item.responsible){ f.responsible=item.responsible; changed=true; }
      if(item.dueDate && f.dueDate!==item.dueDate){ f.dueDate=item.dueDate; changed=true; }
    }
    if(changed && saveIfChanged) await saveAuditData(true);
  }

  function setAuditTab(tab){
    const valid=['dashboard','new','findings','history']; state.audit.activeTab=valid.includes(tab)?tab:'dashboard';
    if(state.audit.activeTab==='new' && !$('auditChecklistContainer')?.children.length) prepareNewAudit(false);
    renderAuditTabs();
  }

  function renderAuditTabs(){
    const tab=state.audit.activeTab||'dashboard';
    document.querySelectorAll('[data-audit-tab]').forEach(b=>b.classList.toggle('active',b.dataset.auditTab===tab));
    const map={dashboard:'auditDashboardTab',new:'auditNewTab',findings:'auditFindingsTab',history:'auditHistoryTab'};
    Object.entries(map).forEach(([k,id])=>$(id)?.classList.toggle('hidden',k!==tab));
  }

  function auditCategoryStats(audit,category){
    const rows=(audit?.checks||[]).filter(x=>x.category===category); const total=rows.length;
    const pass=rows.filter(x=>String(x.status).toLowerCase()==='pass').length;
    const fail=rows.filter(x=>String(x.status).toLowerCase()==='fail').length;
    const check=rows.filter(x=>String(x.status).toLowerCase()==='check').length;
    return {total,pass,fail,check,pct:total?Math.round(pass/total*100):0};
  }

  function auditFindingsRows(findings,compact=false){
    if(!findings.length) return `<tr><td colspan="${compact?7:10}" class="empty-table-cell">No open audit findings.</td></tr>`;
    return findings.map(f=>{
      const overdue=f.closed!=='Y' && f.dueDate && f.dueDate<todayIso(); const meeting=auditMeetingItem(f);
      if(compact) return `<tr class="${overdue?'audit-overdue-row':''}"><td>${fmtDate(f.auditDate)}</td><td><strong>${escapeHtml(f.category)}</strong></td><td class="audit-check-cell">${escapeHtml(f.check)}</td><td>${auditStatusPill(f.auditStatus)}</td><td>${escapeHtml(f.responsible||'—')}</td><td class="${overdue?'due-overdue':''}">${f.dueDate?fmtDate(f.dueDate):'—'}</td><td>${meeting?'<span class="status-pill yes">Meeting item</span>':'<span class="status-pill baseline">Not sent</span>'}</td></tr>`;
      return `<tr class="${overdue?'audit-overdue-row':''}"><td>${fmtDate(f.auditDate)}</td><td><strong>${escapeHtml(f.category)}</strong></td><td class="audit-check-cell">${escapeHtml(f.check)}</td><td>${auditStatusPill(f.auditStatus)}</td><td class="meeting-notes-cell">${escapeHtml(f.details||'')}</td><td>${escapeHtml(f.responsible||'—')}</td><td class="${overdue?'due-overdue':''}">${f.dueDate?fmtDate(f.dueDate):'—'}</td><td>${meeting?`<span class="status-pill ${meeting.closed==='Y'?'yes':'neutral'}">${meeting.closed==='Y'?'Closed in Meetings':'In Meetings'}</span>`:'<span class="status-pill baseline">Not sent</span>'}</td><td>${meeting?`<button class="table-action" data-audit-add-meeting="${f.id}">Edit Action</button>`:`<button class="table-action" data-audit-add-meeting="${f.id}">Add to Meetings</button>`}</td><td><button class="table-action success-link" data-audit-close="${f.id}">Close</button></td></tr>`;
    }).join('');
  }

  function renderAudit(){
    if(!$('auditScreen')) return;
    const audits=[...(state.audit.audits||[])].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')) || String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
    const openFindings=(state.audit.findings||[]).filter(x=>x.closed!=='Y').sort((a,b)=>String(a.dueDate||'9999').localeCompare(String(b.dueDate||'9999')) || String(b.auditDate||'').localeCompare(String(a.auditDate||'')));
    const latest=audits[0]||null, counts=latest?auditCounts(latest):{total:0,pass:0,fail:0,check:0}, today=todayIso();
    const overdue=openFindings.filter(x=>x.dueDate && x.dueDate<today).length;
    $('auditCards').innerHTML=[
      ['Latest Audit',latest?fmtDate(latest.date):'—',''],
      ['Compliance',latest?`${auditCompliance(latest)}%`:'—',latest&&auditCompliance(latest)<80?'warning-card':''],
      ['Open Findings',fmtNum(openFindings.length),openFindings.length?'warning-card':''],
      ['Overdue Findings',fmtNum(overdue),overdue?'danger':'']
    ].map(x=>`<div class="summary-card ${x[2]}"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
    if($('auditOpenFindingBadge')) $('auditOpenFindingBadge').textContent=openFindings.length;
    if($('auditFindingCount')) $('auditFindingCount').textContent=`${openFindings.length} open`;
    if($('auditHistoryCount')) $('auditHistoryCount').textContent=`${audits.length} audit${audits.length===1?'':'s'}`;
    if($('auditLatestMeta')) $('auditLatestMeta').textContent=latest?`${fmtDate(latest.date)} • ${latest.auditor||''}`:'No audits';

    const catTable=$('auditCategorySummaryTable');
    if(catTable){
      catTable.querySelector('thead').innerHTML='<tr>'+['Category','Checks','Pass','Fail','Check','Compliance'].map(h=>`<th>${h}</th>`).join('')+'</tr>';
      catTable.querySelector('tbody').innerHTML=latest?AUDIT_CATEGORIES.map(cat=>{ const c=auditCategoryStats(latest,cat); return `<tr><td><strong>${escapeHtml(cat)}</strong></td><td>${c.total}</td><td><span class="audit-count pass">${c.pass}</span></td><td><span class="audit-count fail">${c.fail}</span></td><td><span class="audit-count check">${c.check}</span></td><td><strong>${c.pct}%</strong></td></tr>`; }).join(''):'<tr><td colspan="6" class="empty-table-cell">Run the first audit to populate the compliance dashboard.</td></tr>';
    }
    const dash=$('auditDashboardFindingsTable');
    if(dash){ dash.querySelector('thead').innerHTML='<tr>'+['Audit Date','Category','Finding','Status','Responsible','Due Date','Meeting'].map(h=>`<th>${h}</th>`).join('')+'</tr>'; dash.querySelector('tbody').innerHTML=auditFindingsRows(openFindings.slice(0,10),true); }
    const ft=$('auditFindingsTable');
    if(ft){ ft.querySelector('thead').innerHTML='<tr>'+['Audit Date','Category','Finding','Status','Details','Responsible','Due Date','Meeting Item','Action','Close'].map(h=>`<th>${h}</th>`).join('')+'</tr>'; ft.querySelector('tbody').innerHTML=auditFindingsRows(openFindings,false); }
    const ht=$('auditHistoryTable');
    if(ht){
      ht.querySelector('thead').innerHTML='<tr>'+['Audit Date','Auditor','Checks','Pass','Fail','Check','Compliance','Open Findings','Action'].map(h=>`<th>${h}</th>`).join('')+'</tr>';
      ht.querySelector('tbody').innerHTML=audits.length?audits.map(a=>{ const c=auditCounts(a), of=(state.audit.findings||[]).filter(f=>f.auditId===a.id&&f.closed!=='Y').length; return `<tr><td><strong>${fmtDate(a.date)}</strong></td><td>${escapeHtml(a.auditor||'—')}</td><td>${c.total}</td><td><span class="audit-count pass">${c.pass}</span></td><td><span class="audit-count fail">${c.fail}</span></td><td><span class="audit-count check">${c.check}</span></td><td><strong>${auditCompliance(a)}%</strong></td><td>${of}</td><td><button class="table-action" data-audit-view="${a.id}">View</button></td></tr>`; }).join(''):'<tr><td colspan="9" class="empty-table-cell">No completed audits yet.</td></tr>';
    }
    renderAuditHistoryDetail(); renderAuditTabs();
  }

  function prepareNewAudit(forceReset=true){
    if(!$('auditChecklistContainer')) return;
    if(forceReset || !$('auditDateInput').value) $('auditDateInput').value=todayIso();
    if(forceReset) $('auditAuditorInput').value='';
    const grouped=AUDIT_CATEGORIES.map(category=>({category,items:AUDIT_TEMPLATE.filter(x=>x.category===category)}));
    $('auditChecklistContainer').innerHTML=grouped.map(g=>`<div class="panel audit-check-category"><div class="audit-category-heading"><div><span class="eyebrow">${escapeHtml(g.category)}</span><h3>${escapeHtml(g.category)}</h3></div><span>${g.items.length} checks</span></div><div class="audit-check-rows">${g.items.map(item=>`<div class="audit-check-row" data-audit-check-id="${item.id}"><div class="audit-check-text">${escapeHtml(item.check)}</div><div class="form-field"><label>Status</label><select data-audit-field="status" required><option value="">Select…</option><option value="Pass">Pass</option><option value="Fail">Fail</option><option value="Check">Check</option></select></div><div class="form-field audit-detail-field"><label>Details / Comments</label><input data-audit-field="details" type="text" placeholder="Optional details"></div><div class="form-field"><label>Responsible</label><input data-audit-field="responsible" type="text" placeholder="If action needed"></div><div class="form-field"><label>Follow-up Date</label><input data-audit-field="dueDate" type="date"></div></div>`).join('')}</div></div>`).join('');
  }

  async function saveNewAudit(e){
    e.preventDefault();
    const date=$('auditDateInput').value, auditor=String($('auditAuditorInput').value||'').trim();
    if(!date||!auditor){ showAlert('Enter an audit date and auditor.','warning'); return; }
    const rows=[...document.querySelectorAll('#auditChecklistContainer [data-audit-check-id]')], checks=[]; let missing=0;
    for(const row of rows){
      const template=AUDIT_TEMPLATE.find(x=>x.id===row.dataset.auditCheckId); if(!template) continue;
      const status=String(row.querySelector('[data-audit-field="status"]')?.value||''); if(!status){ missing++; row.classList.add('audit-missing'); continue; } row.classList.remove('audit-missing');
      checks.push({templateId:template.id,category:template.category,check:template.check,status,details:String(row.querySelector('[data-audit-field="details"]')?.value||'').trim(),responsible:String(row.querySelector('[data-audit-field="responsible"]')?.value||'').trim(),dueDate:String(row.querySelector('[data-audit-field="dueDate"]')?.value||'')});
    }
    if(missing){ showAlert(`Complete all checklist statuses before saving. <strong>${missing}</strong> item${missing===1?' is':'s are'} still unmarked.`,'warning'); return; }
    const now=new Date().toISOString(), audit={id:uid('audit'),date,auditor,checks,createdAt:now,updatedAt:now}; state.audit.audits.push(audit);
    for(const c of checks.filter(x=>x.status==='Fail'||x.status==='Check')) state.audit.findings.push({id:uid('finding'),auditId:audit.id,templateId:c.templateId,auditDate:date,auditStatus:c.status,category:c.category,check:c.check,details:c.details,responsible:c.responsible,dueDate:c.dueDate,closed:'N',meetingItemId:'',createdAt:now,updatedAt:now});
    state.audit.selectedAuditId=audit.id; state.audit.activeTab='dashboard';
    await saveAuditData(true); prepareNewAudit(true); renderAudit(); setScreen('audit');
    const c=auditCounts(audit); showAlert(`Audit for <strong>${fmtDate(date)}</strong> saved: ${c.pass} Pass, ${c.fail} Fail, ${c.check} Check. ${c.fail+c.check} finding${c.fail+c.check===1?'':'s'} added to corrective actions.`,'success');
  }

  function openAuditFindingMeetingItem(id){
    const f=(state.audit.findings||[]).find(x=>x.id===id); if(!f) return;
    const existing=auditMeetingItem(f); if(existing){ openManagementModal(existing.id); return; }
    const notes=[`Source: NBL Compliance Audit ${fmtDate(f.auditDate)}`,`Audit result: ${auditStatusLabel(f.auditStatus)}`,f.details?`Audit details: ${f.details}`:''].filter(Boolean).join('\n');
    openManagementModal('',{sourceAuditFindingId:f.id,date:f.auditDate,topic:`Audit - ${f.category}: ${f.check}`,notes,responsible:f.responsible||'',dueDate:f.dueDate||'',closed:'N'});
  }

  async function closeAuditFinding(id){
    const f=(state.audit.findings||[]).find(x=>x.id===id); if(!f) return;
    if(!confirm(`Mark this audit finding as closed?\n\n${f.category}: ${f.check}`)) return;
    const now=new Date().toISOString(); f.closed='Y'; f.closedAt=now; f.updatedAt=now;
    const item=auditMeetingItem(f); if(item && item.closed!=='Y'){ item.closed='Y'; item.updatedAt=now; await saveMeetingData(true); renderMeetings(); }
    await saveAuditData(true); renderAudit(); showAlert('Audit finding closed.','success');
  }

  function viewAuditHistory(id){ state.audit.selectedAuditId=id; state.audit.activeTab='history'; renderAudit(); }
  function renderAuditHistoryDetail(){
    const panel=$('auditHistoryDetailPanel'); if(!panel) return;
    const audit=(state.audit.audits||[]).find(x=>x.id===state.audit.selectedAuditId); panel.classList.toggle('hidden',!audit); if(!audit) return;
    const c=auditCounts(audit); $('auditHistoryDetailTitle').textContent=`Audit • ${fmtDate(audit.date)}`; $('auditHistoryDetailMeta').textContent=`Auditor: ${audit.auditor||'—'} • ${c.pass} Pass • ${c.fail} Fail • ${c.check} Check • ${auditCompliance(audit)}% compliance`;
    const table=$('auditHistoryDetailTable'); table.querySelector('thead').innerHTML='<tr>'+['Category','Check','Result','Details','Responsible','Follow-up'].map(h=>`<th>${h}</th>`).join('')+'</tr>';
    table.querySelector('tbody').innerHTML=(audit.checks||[]).map(r=>`<tr><td><strong>${escapeHtml(r.category)}</strong></td><td class="audit-check-cell">${escapeHtml(r.check)}</td><td>${auditStatusPill(r.status)}</td><td class="meeting-notes-cell">${escapeHtml(r.details||'')}</td><td>${escapeHtml(r.responsible||'—')}</td><td>${r.dueDate?fmtDate(r.dueDate):'—'}</td></tr>`).join('');
  }


  const DISPATCH_DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  function defaultDispatchData(){
    // Workspace rosters and run assignments are business data, never public defaults.
    const locations=[{id:'nashville',name:'Nashville'}];
    const runs=[],drivers=[];
    const assignments=[];
    return {version:9,locations,activeLocationId:'nashville',runs,drivers,tractors:[],assignments,savedPlans:[],activePlanByLocation:{},dailyBoards:{},updatedAt:null};
  }
  function dispatchLocations(){ return Array.isArray(state.dispatch?.locations)&&state.dispatch.locations.length?state.dispatch.locations:[{id:'nashville',name:'Nashville'}]; }
  function dispatchActiveLocation(){ const list=dispatchLocations(); return list.find(x=>x.id===state.dispatch.activeLocationId)||list[0]; }
  function dispatchActiveLocationId(){ return dispatchActiveLocation()?.id||'nashville'; }
  function dispatchActiveLocationName(){ return dispatchActiveLocation()?.name||'Nashville'; }
  function dispatchClone(value){ return JSON.parse(JSON.stringify(value)); }
  function dispatchSavedPlans(locationId=dispatchActiveLocationId()){ return (Array.isArray(state.dispatch?.savedPlans)?state.dispatch.savedPlans:[]).filter(p=>p.locationId===locationId); }
  function dispatchSelectedPlanId(locationId=dispatchActiveLocationId()){
    const plans=dispatchSavedPlans(locationId), candidate=state.dispatch?.activePlanByLocation?.[locationId]||'';
    return plans.some(p=>p.id===candidate)?candidate:(plans[0]?.id||'');
  }
  function dispatchSelectedPlan(locationId=dispatchActiveLocationId()){ const id=dispatchSelectedPlanId(locationId); return dispatchSavedPlans(locationId).find(p=>p.id===id)||null; }
  function dispatchSnapshotForLocation(locationId=dispatchActiveLocationId()){
    const runs=dispatchRuns(locationId).map(r=>dispatchClone(r)), ids=new Set(runs.map(r=>r.id));
    const assignments=(state.dispatch.assignments||[]).filter(a=>ids.has(a.runId)).map(a=>dispatchClone(a));
    return {runs,assignments};
  }
  function dispatchPlanNameDefault(){ const count=dispatchSavedPlans().length+1; return `${dispatchActiveLocationName()} Plan ${count}`; }
  function renderDispatchPlanControls(){
    const select=$('dispatchSavedPlanSelect'), plans=dispatchSavedPlans(), selected=dispatchSelectedPlanId(); if(!select)return;
    select.innerHTML=plans.length?plans.map(p=>`<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join(''):'<option value="">No saved tables</option>';
    select.value=selected||''; select.disabled=!plans.length;
    for(const id of ['loadDispatchPlanBtn','updateDispatchPlanBtn','renameDispatchPlanBtn','deleteDispatchPlanBtn','exportAllDispatchPlansPdfBtn']) if($(id)) $(id).disabled=!plans.length;
    const active=dispatchSelectedPlan();
    $('dispatchPlanMeta').innerHTML=plans.length
      ? `<strong>${plans.length}</strong> saved table${plans.length===1?'':'s'} for ${escapeHtml(dispatchActiveLocationName())}${active?` • selected: <strong>${escapeHtml(active.name)}</strong> • last saved ${new Date(active.updatedAt||active.createdAt||Date.now()).toLocaleString()}`:''}. Changes on the live board are not written into a saved table until you click <strong>Update Saved</strong> or save a new table.`
      : `No saved dispatch tables for ${escapeHtml(dispatchActiveLocationName())}. Arrange the board, then click <strong>Save Current as New</strong>.`;
  }
  async function saveCurrentDispatchPlanAsNew(){
    const raw=prompt('Name this dispatch table:',dispatchPlanNameDefault()); if(raw==null)return; const name=raw.trim(); if(!name)return;
    const locationId=dispatchActiveLocationId(); if(dispatchSavedPlans(locationId).some(p=>p.name.toLowerCase()===name.toLowerCase())&&!confirm(`A saved table named "${name}" already exists at this location. Save another copy with the same name?`))return;
    const snap=dispatchSnapshotForLocation(locationId), now=new Date().toISOString(), plan={id:uid('dispatch_plan'),locationId,name,runs:snap.runs,assignments:snap.assignments,createdAt:now,updatedAt:now};
    state.dispatch.savedPlans=Array.isArray(state.dispatch.savedPlans)?state.dispatch.savedPlans:[]; state.dispatch.savedPlans.push(plan); state.dispatch.activePlanByLocation={...(state.dispatch.activePlanByLocation||{}),[locationId]:plan.id};
    await saveDispatchData(true); renderDispatch(); setScreen('dispatch'); showAlert(`Saved <strong>${escapeHtml(name)}</strong> as a separate ${escapeHtml(dispatchActiveLocationName())} dispatch table.`,'success');
  }
  async function loadSelectedDispatchPlan(){
    const plan=dispatchSelectedPlan(); if(!plan)return;if(!await verifyMotiveDriversForWork())return; if(!confirm(`Load "${plan.name}" onto the ${dispatchActiveLocationName()} planning board? Current unsaved board changes will be replaced.`))return;
    const locationId=plan.locationId, currentIds=new Set(dispatchRuns(locationId).map(r=>r.id));
    const outsideRuns=(state.dispatch.runs||[]).filter(r=>(r.locationId||'nashville')!==locationId), outsideAssignments=(state.dispatch.assignments||[]).filter(a=>!currentIds.has(a.runId));
    const validDrivers=new Set((state.dispatch.drivers||[]).filter(dispatchDriverIsActive).map(d=>d.id)), validTractors=new Set(dispatchTractors().map(t=>t.id));
    const runs=dispatchClone(plan.runs||[]).map(r=>({...r,locationId,primaryTractorId:r.primaryTractorId&&validTractors.has(r.primaryTractorId)?r.primaryTractorId:''})); const runIds=new Set(runs.map(r=>r.id));
    for(const run of runs)if(run.primaryDriverId&&!validDrivers.has(run.primaryDriverId))run.primaryDriverId='';
    const assignments=dispatchClone(plan.assignments||[]).filter(a=>runIds.has(a.runId)&&validDrivers.has(a.driverId));
    state.dispatch.runs=[...outsideRuns,...runs]; state.dispatch.assignments=[...outsideAssignments,...assignments]; state.dispatch.activeLocationId=locationId;
    await saveDispatchData(true); renderDispatch(); setScreen('dispatch'); showAlert(`Loaded saved dispatch table <strong>${escapeHtml(plan.name)}</strong>.`,'success');
  }
  async function updateSelectedDispatchPlan(){
    const plan=dispatchSelectedPlan(); if(!plan)return; if(!confirm(`Replace the saved contents of "${plan.name}" with the current ${dispatchActiveLocationName()} board?`))return;
    const snap=dispatchSnapshotForLocation(plan.locationId); plan.runs=snap.runs; plan.assignments=snap.assignments; plan.updatedAt=new Date().toISOString(); await saveDispatchData(true); renderDispatch(); setScreen('dispatch'); showAlert(`Updated saved dispatch table <strong>${escapeHtml(plan.name)}</strong>.`,'success');
  }
  async function renameSelectedDispatchPlan(){ const plan=dispatchSelectedPlan(); if(!plan)return; const raw=prompt('Rename saved dispatch table:',plan.name); if(raw==null)return; const name=raw.trim(); if(!name||name===plan.name)return; plan.name=name; plan.updatedAt=new Date().toISOString(); await saveDispatchData(true); renderDispatch(); setScreen('dispatch'); }
  async function deleteSelectedDispatchPlan(){ const plan=dispatchSelectedPlan(); if(!plan)return; if(!confirm(`Delete saved dispatch table "${plan.name}"? This does not change the live planning board.`))return; state.dispatch.savedPlans=(state.dispatch.savedPlans||[]).filter(p=>p.id!==plan.id); const remaining=dispatchSavedPlans(plan.locationId); state.dispatch.activePlanByLocation={...(state.dispatch.activePlanByLocation||{}),[plan.locationId]:remaining[0]?.id||''}; await saveDispatchData(true); renderDispatch(); setScreen('dispatch'); }
  function selectSavedDispatchPlan(id){ if(!dispatchSavedPlans().some(p=>p.id===id))return; state.dispatch.activePlanByLocation={...(state.dispatch.activePlanByLocation||{}),[dispatchActiveLocationId()]:id}; saveDispatchData(true); renderDispatchPlanControls(); }
  function dispatchRunSort(a,b){
    const priority={assigned:0,unassigned:1,spot:2},typeA=String(a?.type||''),typeB=String(b?.type||''),group=(priority[typeA]??3)-(priority[typeB]??3);
    if(group)return group;
    // Preserve the existing order of dedicated runs. URRs and Spots are always alphabetical.
    if(typeA==='assigned'&&typeB==='assigned')return 0;
    return String(a?.name||'').localeCompare(String(b?.name||''),undefined,{numeric:true,sensitivity:'base'});
  }
  function dispatchRuns(locationId=dispatchActiveLocationId()){ return (state.dispatch.runs||[]).filter(r=>(r.locationId||'nashville')===locationId).slice().sort(dispatchRunSort); }
  function dispatchRun(runId){ return (state.dispatch.runs||[]).find(r=>r.id===runId); }
  function dispatchDriver(driverId){ return (state.dispatch.drivers||[]).find(d=>d.id===driverId); }
  function dispatchDriverIsActive(driver){ return driverIsEligibleForWork(driver); }
  function dispatchDriverLocationId(driver){ const ids=new Set(dispatchLocations().map(l=>l.id)); return driver&&ids.has(driver.locationId)?driver.locationId:dispatchLocations()[0]?.id||'nashville'; }
  function dispatchDriversForLocation(locationId=dispatchActiveLocationId()){
    return (state.dispatch.drivers||[]).filter(d=>dispatchDriverIsActive(d)&&dispatchDriverLocationId(d)===locationId);
  }
  function dispatchDriverLocationName(driver){ return dispatchLocations().find(l=>l.id===dispatchDriverLocationId(driver))?.name||'Unassigned'; }
  function dispatchTractors(){ return Array.isArray(state.dispatch?.tractors)?state.dispatch.tractors:[]; }
  function dispatchTractor(tractorId){ return dispatchTractors().find(t=>t.id===tractorId); }
  function dispatchTractorLocationId(tractor){ const ids=new Set(dispatchLocations().map(l=>l.id)); return tractor&&ids.has(tractor.locationId)?tractor.locationId:dispatchLocations()[0]?.id||'nashville'; }
  function dispatchTractorsForLocation(locationId=dispatchActiveLocationId()){ return dispatchTractors().filter(t=>dispatchTractorLocationId(t)===locationId); }
  function dispatchTractorLocationName(tractor){ return dispatchLocations().find(l=>l.id===dispatchTractorLocationId(tractor))?.name||'Unassigned'; }
  function dispatchMotiveVehicleKey(v){ return String(v?.id||v?.number||v?.vin||'').trim(); }
  function dispatchMotiveMakeModel(v){ return [v?.year,v?.make,v?.model].filter(Boolean).join(' ').trim()||'—'; }
  function dispatchMotiveVehicleForTractor(t){ const id=String(t?.motiveVehicleId||'').trim(),num=normalizeTractor(t?.tractorNumber),vin=String(t?.vin||'').trim().toUpperCase(); return (state.motive.vehicles||[]).find(v=>(id&&String(v.id||'')===id)||(num&&normalizeTractor(v.number)===num)||(vin&&String(v.vin||'').trim().toUpperCase()===vin))||null; }
  function dispatchExistingMotiveTractor(v){ const id=String(v?.id||'').trim(),num=normalizeTractor(v?.number),vin=String(v?.vin||'').trim().toUpperCase(); return dispatchTractors().find(t=>(id&&String(t.motiveVehicleId||'')===id)||(num&&normalizeTractor(t.tractorNumber)===num)||(vin&&String(t.vin||'').trim().toUpperCase()===vin))||null; }
  function syncDispatchTractorMetadataFromMotive(){ for(const t of dispatchTractors()){ const v=dispatchMotiveVehicleForTractor(t); if(!v) continue; t.motiveVehicleId=String(v.id||t.motiveVehicleId||''); t.tractorNumber=String(v.number||t.tractorNumber||'').trim(); if(v.vin)t.vin=String(v.vin).trim().toUpperCase(); const mm=dispatchMotiveMakeModel(v); if(mm&&mm!=='—')t.makeModel=mm; const odo=motiveOdometer(v); if(odo!=null)t.odometer=Math.round(odo); t.motiveStatus=String(v.status||''); t.locatedAt=String(v.located_at||''); } }
  function dispatchAssignment(runId,day,assignments=state.dispatch.assignments){ return (assignments||[]).find(a=>a.runId===runId && Number(a.day)===Number(day)&&dispatchDriverIsActive(dispatchDriver(a.driverId))); }
  function dispatchDriverAssignment(driverId,day,assignments=state.dispatch.assignments){ return (assignments||[]).find(a=>a.driverId===driverId && Number(a.day)===Number(day)&&dispatchDriverIsActive(dispatchDriver(a.driverId))); }
  function dispatchDriverAvailable(driver,day){ return dispatchDriverIsActive(driver) && Array.isArray(driver.availability) && driver.availability.map(Number).includes(Number(day)); }
  function dispatchOriginAllowed(driver,run){ return !!driver && !!run && (driver.origins?.includes('*') || driver.origins?.includes(run.origin)); }
  function dispatchOptionalNumber(v){ if(v==null || v==='') return null; const n=Number(v); return Number.isFinite(n)?n:null; }
  function dispatchRunMiles(run){ return dispatchOptionalNumber(run?.milesPerRun); }
  function dispatchRunRate(run){ return dispatchOptionalNumber(run?.payPerMile); }
  function dispatchRunDailyRevenue(run){ const miles=dispatchRunMiles(run),rate=dispatchRunRate(run); return miles==null||rate==null?null:miles*rate; }
  function dispatchDriverWeeklyPay(driver){ return dispatchOptionalNumber(driver?.weeklyPay); }
  function dispatchAvailabilityLabel(days){
    const set=new Set((days||[]).map(Number).filter(d=>d>=0&&d<7)); if(!set.size) return 'No regular days'; if(set.size===7) return 'Daily';
    let start=[...set].find(d=>!set.has((d+6)%7)); if(start==null) start=Math.min(...set); const seq=[]; let cur=start;
    while(set.has(cur)&&!seq.includes(cur)){ seq.push(cur); cur=(cur+1)%7; }
    if(seq.length===set.size) return seq.length===1?DISPATCH_DAYS[seq[0]]:`${DISPATCH_DAYS[seq[0]]} - ${DISPATCH_DAYS[seq[seq.length-1]]}`;
    return [...set].sort((a,b)=>a-b).map(d=>DISPATCH_DAYS[d]).join(', ');
  }
  function settlementDispatchDrivers(){
    const map=new Map();
    for(const item of state.catalog||[]){
      const result=item.result||{};
      const seen=item.settlementDate||'';
      const add=(fedexId,name)=>{
        const id=String(fedexId||'').trim(); if(!id) return;
        const clean=String(name||'').trim()||`Driver ${id}`;
        const prev=map.get(id)||{fedexId:id,name:clean,lastSeen:'',statements:0};
        if(clean && !/^Driver\s+\d+$/i.test(clean)) prev.name=clean;
        if(seen && (!prev.lastSeen || seen>prev.lastSeen)) prev.lastSeen=seen;
        prev.statements++; map.set(id,prev);
      };
      for(const [id,name] of Object.entries(result.names||{})) add(id,name);
      for(const d of result.drivers||[]) add(d.fedexId,d.name);
    }
    return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name)||a.fedexId.localeCompare(b.fedexId));
  }
  function dispatchPersonNameKey(name){
    const suffixes=new Set(['jr','sr','ii','iii','iv']);
    const parts=String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean).filter(x=>!suffixes.has(x));
    return parts.length>1?`${parts[0]} ${parts.at(-1)}`:(parts[0]||'');
  }
  function motiveDriverEmployeeId(driver){ return String(driver?.employee_id||driver?.driver_company_id||driver?.company_id||driver?.employeeId||'').trim(); }
  function motiveDriverIsActive(driver){ return !!driver&&String(driver.status||'').trim().toLowerCase()==='active'; }
  function motiveMatchesForDriver(driver){
    if(!driver)return [];
    const directory=state.motive.drivers||[],motiveId=String(driver.motiveDriverId||driver.motive_driver_id||'').trim(),employeeId=String(driver.fedexId||motiveDriverEmployeeId(driver)||'').trim();
    if(motiveId){const matches=directory.filter(m=>String(m.id)===motiveId);if(matches.length){if(employeeId&&matches.some(m=>motiveDriverEmployeeId(m)&&motiveDriverEmployeeId(m)!==employeeId))return [];return matches;}}
    if(employeeId)return directory.filter(m=>motiveDriverEmployeeId(m)===employeeId);
    // Raw Motive/safety identities can have an ID without an employee ID.
    if(driver.id!=null){const matches=directory.filter(m=>String(m.id)===String(driver.id));if(matches.length)return matches;}
    const name=dispatchNameKey(driver.name||[driver.first_name,driver.last_name].filter(Boolean).join(' '));
    return name?directory.filter(m=>dispatchNameKey(m.name||[m.first_name,m.last_name].filter(Boolean).join(' '))===name):[];
  }
  function driverIsEligibleForWork(driver){
    if(!driver)return false;
    const matches=motiveMatchesForDriver(driver);
    if(matches.length)return matches.length===1&&motiveDriverIsActive(matches[0]);
    const id=String(driver.fedexId||motiveDriverEmployeeId(driver)||'').trim(),linked=id?(state.dispatch?.drivers||[]).filter(d=>String(d.fedexId||'').trim()===id):[];
    if(driver.active===false||linked.some(d=>d.active===false))return false;
    const statuses=[driver.motiveStatus,driver.status,...linked.map(d=>d.motiveStatus)].filter(Boolean);
    if(statuses.some(status=>String(status).trim().toLowerCase()!=='active'))return false;
    // A completed directory is authoritative. Unmatched/onboarding drivers are
    // not eligible until Motive confirms an active account.
    if(state.motive.driversLoaded)return false;
    if(state.motive.configured)return statuses.some(status=>String(status).trim().toLowerCase()==='active');
    return true;
  }
  function clearInactiveLiveDispatchAssignments(){
    const inactive=new Set((state.dispatch.drivers||[]).filter(d=>{const matches=motiveMatchesForDriver(d);return matches.length?!(matches.length===1&&motiveDriverIsActive(matches[0])):d.active===false||!!d.motiveStatus&&String(d.motiveStatus).trim().toLowerCase()!=='active';}).map(d=>d.id));let changed=false;
    const before=state.dispatch.assignments||[],next=before.filter(a=>!inactive.has(a.driverId));
    if(next.length!==before.length){state.dispatch.assignments=next;changed=true;}
    for(const run of state.dispatch.runs||[])if(inactive.has(run.primaryDriverId)){run.primaryDriverId='';changed=true;}
    if(inactive.has(state.dispatchSelectedDriverId))state.dispatchSelectedDriverId=null;
    // Saved daily boards and plan snapshots retain their historical identities.
    return changed;
  }
  let motiveDirectoryRefresh=null;
  async function refreshMotiveDriverDirectory(){
    if(motiveDirectoryRefresh)return motiveDirectoryRefresh;
    motiveDirectoryRefresh=(async()=>{
      try{
        const data=await localApi('/api/motive/drivers');
        if(!data?.ok||!Array.isArray(data.drivers))throw new Error('Motive returned an incomplete driver directory.');
        state.motive.drivers=data.drivers;state.motive.driversLoaded=true;state.motive.driversLastSync=new Date().toISOString();state.motive.driversError='';
        const changed=syncSharedDriverRoster();
        if(changed&&state.dispatchLoaded&&canAccessModuleKey('dispatch',true))await saveDispatchData(true);
        return true;
      }catch(err){state.motive.driversError=err.message||String(err);return false;}
    })();
    try{return await motiveDirectoryRefresh;}finally{motiveDirectoryRefresh=null;}
  }
  async function verifyMotiveDriversForWork(){
    if(!state.motive.configured)return true;
    if(await refreshMotiveDriverDirectory())return true;
    showAlert('Driver status could not be verified in Motive. Refresh Motive and try again.','warning');return false;
  }
  function dispatchLocationForDomicile(domicile){
    const text=String(domicile||'').toLowerCase();
    return dispatchLocations().find(l=>text.includes(String(l.name||'').toLowerCase()))?.id||dispatchLocations()[0]?.id||'nashville';
  }
  function syncSharedDriverRoster(){
    state.dispatch.drivers=Array.isArray(state.dispatch.drivers)?state.dispatch.drivers:[];
    const roster=state.dispatch.drivers, byFedex=new Map(), byName=new Map(),byMotive=new Map(); let changed=false;
    const index=driver=>{const id=String(driver.fedexId||'').trim(),nk=dispatchNameKey(driver.name);if(id)byFedex.set(id,driver);if(nk&&!byName.has(nk))byName.set(nk,driver);if(driver.motiveDriverId)byMotive.set(String(driver.motiveDriverId),driver);};
    roster.forEach(index);
    const recruitment=(state.hr?.candidates||[]).filter(c=>normalizeRecruitmentStatus(c.recruitmentStatus)==='Hired');
    const recruitById=new Map(recruitment.map(c=>[String(c.fedexId||'').trim(),c]).filter(x=>x[0]));
    const recruitByName=new Map(recruitment.map(c=>[dispatchPersonNameKey(c.name),c]).filter(x=>x[0]));
        const ensure=(source,kind)=>{
      const fedexId=String(source.fedexId||'').trim(),nk=dispatchNameKey(source.name),matches=motiveMatchesForDriver(source),m=matches.length===1?matches[0]:null,r=(fedexId&&recruitById.get(fedexId))||(nk&&recruitByName.get(nk));
      const motiveId=motiveDriverEmployeeId(m),canonicalId=fedexId||motiveId,canonicalName=String(r?.name||source.name||m?.name||[m?.first_name,m?.last_name].filter(Boolean).join(' ')||`Driver ${canonicalId}`).trim();
      let driver=(m&&byMotive.get(String(m.id)))||(canonicalId&&byFedex.get(canonicalId))||(!canonicalId&&nk&&byName.get(nk));
      if(!driver){
        const base=`${kind}_${canonicalId||String(m?.id||r?.id||dispatchPersonNameKey(canonicalName)).replace(/[^a-z0-9]+/g,'_')}`;
        driver={id:base,fedexId:canonicalId,name:canonicalName,role:'urr',locationId:dispatchLocationForDomicile(r?.domicile),availability:[0,1,2,3,4,5,6],availabilityLabel:'Daily',origins:['*'],baseLabel:r?.domicile||'All origins',source:kind,active:true};
        roster.push(driver);index(driver);changed=true;
      }
      const active=m?motiveDriverIsActive(m):(driver.active!==false&&(!state.motive.driversLoaded||driverIsEligibleForWork(driver)));
      const updates={fedexId:canonicalId||driver.fedexId||'',name:canonicalName||driver.name,motiveDriverId:m?.id==null?(driver.motiveDriverId||''):String(m.id),motiveStatus:m?.status||driver.motiveStatus||'',active,source:driver.source||kind};
      for(const [key,value] of Object.entries(updates))if(driver[key]!==value){driver[key]=value;changed=true;}
      index(driver);
    };
    for(const m of state.motive.drivers||[]) ensure({fedexId:motiveDriverEmployeeId(m),motiveDriverId:String(m.id),name:m.name||[m.first_name,m.last_name].filter(Boolean).join(' ')},'motive');
    for(const c of recruitment) ensure({fedexId:c.fedexId,name:c.name},'recruitment');
    for(const d of settlementDispatchDrivers()) ensure(d,'settlement');
    // Motive is authoritative: a matched deactivated driver is not offered for new work.
    for(const d of roster){const matches=motiveMatchesForDriver(d),m=matches.length===1?matches[0]:null;if(!matches.length&&!state.motive.driversLoaded)continue;const active=driverIsEligibleForWork(d);if(d.active!==active){d.active=active;changed=true;}if(m){if(d.motiveStatus!==String(m.status||'')){d.motiveStatus=String(m.status||'');changed=true;}if(d.motiveDriverId!==String(m.id)){d.motiveDriverId=String(m.id);changed=true;}}}
    return clearInactiveLiveDispatchAssignments()||changed;
  }
  function availableDispatchDrivers(){
    const rows=[],byFedex=new Map(),byName=new Map();
    const add=(row,source)=>{
      const fedexId=String(row?.fedexId||'').trim(),name=String(row?.name||'').trim(); if(!name&&!fedexId)return;
      const nameKey=dispatchNameKey(name),existing=(fedexId&&byFedex.get(fedexId))||(nameKey&&byName.get(nameKey)&&(!fedexId||!byName.get(nameKey).fedexId)?byName.get(nameKey):null);
      if(existing){existing.sources.add(source);if(row.lastSeen&&(!existing.lastSeen||row.lastSeen>existing.lastSeen))existing.lastSeen=row.lastSeen;if(!existing.fedexId&&fedexId){existing.fedexId=fedexId;byFedex.set(fedexId,existing);}if(!existing.hrId&&row.hrId)existing.hrId=row.hrId;return;}
      const item={key:fedexId?`fedex:${fedexId}`:`hr:${row.hrId||nameKey}`,fedexId,name:name||`Driver ${fedexId}`,hrId:row.hrId||'',lastSeen:row.lastSeen||'',sources:new Set([source])};rows.push(item);if(fedexId)byFedex.set(fedexId,item);if(nameKey)byName.set(nameKey,item);
    };
    for(const m of state.motive.drivers||[])if(motiveDriverIsActive(m))add({name:m.name||[m.first_name,m.last_name].filter(Boolean).join(' '),fedexId:motiveDriverEmployeeId(m),motiveDriverId:m.id},'Motive');
    for(const d of settlementDispatchDrivers())add(d,'Settlement');
    for(const c of state.hr?.candidates||[])if(normalizeRecruitmentStatus(c.recruitmentStatus)==='Hired')add({name:c.name,fedexId:c.fedexId,hrId:c.id},'Recruitment');
    return rows.filter(driverIsEligibleForWork).map(r=>({...r,sourceLabel:[...r.sources].sort().join(' + ')})).sort((a,b)=>a.name.localeCompare(b.name)||a.fedexId.localeCompare(b.fedexId));
  }
  function motiveByEmployeeId(id){ const key=String(id||'').trim();return key?(state.motive.drivers||[]).find(d=>motiveDriverEmployeeId(d)===key):null; }
  function motiveDriverByName(name){ const key=dispatchPersonNameKey(name);return key?(state.motive.drivers||[]).find(d=>dispatchPersonNameKey(d.name||[d.first_name,d.last_name].filter(Boolean).join(' '))===key):null; }
  function dispatchExistingByFedexId(fedexId){ const id=String(fedexId||'').trim(); return id?(state.dispatch.drivers||[]).find(d=>String(d.fedexId||'').trim()===id):null; }
  function dispatchNameKey(name){ return String(name||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,' ' ).trim(); }
  function dispatchExistingSettlementDriver(row){ return dispatchExistingByFedexId(row?.fedexId)||(state.dispatch.drivers||[]).find(d=>dispatchNameKey(d.name)===dispatchNameKey(row?.name)); }
  function fillDispatchLocationSelect(el,selected=''){
    if(!el) return; el.innerHTML=dispatchLocations().map(l=>`<option value="${escapeHtml(l.id)}">${escapeHtml(l.name)}</option>`).join('');
    el.value=dispatchLocations().some(l=>l.id===selected)?selected:dispatchActiveLocationId();
  }
  function renderDispatchDriverRosterModal(){
    fillDispatchLocationSelect($('dispatchSettlementDriverLocationInput'),$('dispatchSettlementDriverLocationInput')?.value||dispatchActiveLocationId());
    fillDispatchLocationSelect($('dispatchNewDriverLocation'),$('dispatchNewDriverLocation')?.value||dispatchActiveLocationId());
    const settlement=availableDispatchDrivers(), table=$('dispatchSettlementDriversTable');
    if(table){
      table.querySelector('thead').innerHTML='<tr>'+['Select','Driver','FedEx ID','Source / Last Seen','Status'].map(h=>`<th>${h}</th>`).join('')+'</tr>';
      table.querySelector('tbody').innerHTML=settlement.length?settlement.map(d=>{const existing=dispatchExistingSettlementDriver(d);return `<tr><td><input type="checkbox" data-settlement-driver-select="${escapeHtml(d.key)}" ${existing?'disabled':''}></td><td><strong>${escapeHtml(d.name)}</strong></td><td>${escapeHtml(d.fedexId||'—')}</td><td>${escapeHtml(d.sourceLabel)}${d.lastSeen?` • ${fmtDate(d.lastSeen)}`:''}</td><td>${existing?`<span class="status-pill yes">In Dispatch • ${escapeHtml(dispatchDriverLocationName(existing))}</span>`:'<span class="status-pill neutral">Available to add</span>'}</td></tr>`;}).join(''):'<tr><td colspan="5" class="empty-table-cell">No hired Recruitment drivers or settlement drivers found yet.</td></tr>';
    }
    const roster=$('dispatchCurrentRosterTable');
    if(roster){
      roster.querySelector('thead').innerHTML='<tr>'+['Driver','FedEx ID','Status','Location','Schedule','Source','Actions'].map(h=>`<th>${h}</th>`).join('')+'</tr>';
      roster.querySelector('tbody').innerHTML=(state.dispatch.drivers||[]).slice().sort((a,b)=>Number(dispatchDriverIsActive(b))-Number(dispatchDriverIsActive(a))||dispatchDriverLocationName(a).localeCompare(dispatchDriverLocationName(b))||a.name.localeCompare(b.name)).map(d=>`<tr class="${dispatchDriverIsActive(d)?'':'dispatch-driver-inactive'}"><td><strong>${escapeHtml(d.name)}</strong></td><td>${escapeHtml(d.fedexId||'—')}</td><td>${dispatchDriverIsActive(d)?'<span class="status-pill yes">Active</span>':`<span class="status-pill baseline">Inactive${d.motiveStatus?` • ${escapeHtml(d.motiveStatus)}`:''}</span>`}</td><td><span class="dispatch-location-pill">${escapeHtml(dispatchDriverLocationName(d))}</span></td><td>${escapeHtml(d.availabilityLabel||dispatchAvailabilityLabel(d.availability||[]))}</td><td>${escapeHtml(d.source||'Manual')}</td><td class="dispatch-roster-row-actions"><button class="button secondary" type="button" data-edit-dispatch-driver="${escapeHtml(d.id)}" ${dispatchDriverIsActive(d)?'':'disabled'}>Edit</button><button class="button danger-outline" type="button" data-delete-dispatch-driver="${escapeHtml(d.id)}">Remove</button></td></tr>`).join('')||'<tr><td colspan="7" class="empty-table-cell">No dispatch drivers have been added.</td></tr>';
    }
  }
  function openDispatchDriverRosterModal(){ renderDispatchDriverRosterModal(); openModal('dispatchDriverRosterModal'); }
  function selectAllSettlementDispatchDrivers(){ document.querySelectorAll('#dispatchSettlementDriversTable [data-settlement-driver-select]:not(:disabled)').forEach(cb=>cb.checked=true); }
  async function importSelectedSettlementDrivers(){
    if(!await verifyMotiveDriversForWork())return;const selected=[...document.querySelectorAll('#dispatchSettlementDriversTable [data-settlement-driver-select]:checked')].map(cb=>cb.dataset.settlementDriverSelect); if(!selected.length){showAlert('Select at least one available driver to add.','warning');return;}
    const loc=$('dispatchSettlementDriverLocationInput')?.value||dispatchActiveLocationId(), source=new Map(availableDispatchDrivers().map(d=>[d.key,d])); let added=0;
    for(const key of selected){ const d=source.get(key); if(!d||dispatchExistingSettlementDriver(d)) continue; const driverSource=d.sources.has('Recruitment')&&d.sources.has('Settlement')?'recruitment_settlement':d.sources.has('Recruitment')?'recruitment':'settlement'; state.dispatch.drivers.push({id:d.fedexId?`fedex_${d.fedexId}`:uid('driver'),fedexId:d.fedexId,name:d.name,role:'urr',locationId:loc,availability:[0,1,2,3,4,5,6],availabilityLabel:'Daily',origins:['*'],baseLabel:dispatchLocations().find(l=>l.id===loc)?.name||'All origins',source:driverSource}); added++; }
    await saveDispatchData(true); renderDispatch(); renderDispatchDriverRosterModal(); showAlert(`<strong>${added}</strong> driver${added===1?'':'s'} added to ${escapeHtml(dispatchLocations().find(l=>l.id===loc)?.name||'Dispatch')}. Edit their schedules as needed.`,'success');
  }
  async function addManualDispatchDriver(e){
    e.preventDefault();if(!await verifyMotiveDriversForWork())return; const name=$('dispatchNewDriverName').value.trim(),fedexId=$('dispatchNewDriverFedexId').value.trim(),locationId=$('dispatchNewDriverLocation').value,days=[...document.querySelectorAll('#dispatchNewDriverDays input[type=checkbox]:checked')].map(cb=>Number(cb.value)).sort((a,b)=>a-b); if(!name)return;if(!driverIsEligibleForWork({name,fedexId})){showAlert('This driver is inactive or unverified in Motive and cannot be added.','warning');return;}
    if(fedexId&&dispatchExistingByFedexId(fedexId)){showAlert(`FedEx ID ${escapeHtml(fedexId)} is already in the Dispatch roster.`,'warning');return;} if(!days.length&&!confirm(`${name} has no regular workdays selected. Add the driver anyway?`))return;
    const id=fedexId?`fedex_${fedexId}`:uid('driver'); state.dispatch.drivers.push({id,fedexId,name,role:'urr',locationId,availability:days,availabilityLabel:dispatchAvailabilityLabel(days),origins:['*'],baseLabel:dispatchLocations().find(l=>l.id===locationId)?.name||'All origins',source:'manual'});
    await saveDispatchData(true); $('dispatchNewDriverForm').reset(); fillDispatchLocationSelect($('dispatchNewDriverLocation'),locationId); renderDispatch(); renderDispatchDriverRosterModal(); showAlert(`<strong>${escapeHtml(name)}</strong> added to the Dispatch roster.`,'success');
  }
  async function deleteDispatchDriver(driverId){
    const d=dispatchDriver(driverId); if(!d)return; const assignments=(state.dispatch.assignments||[]).filter(a=>a.driverId===driverId); const primary=(state.dispatch.runs||[]).filter(r=>r.primaryDriverId===driverId); const warning=`Remove ${d.name} from Dispatch?${assignments.length?` This will remove ${assignments.length} scheduled assignment${assignments.length===1?'':'s'}.`:''}${primary.length?` The driver will also be cleared as primary on ${primary.length} run${primary.length===1?'':'s'}.`:''}`; if(!confirm(warning))return;
    state.dispatch.drivers=(state.dispatch.drivers||[]).filter(x=>x.id!==driverId); state.dispatch.assignments=(state.dispatch.assignments||[]).filter(a=>a.driverId!==driverId); for(const r of state.dispatch.runs||[])if(r.primaryDriverId===driverId)r.primaryDriverId=''; if(state.dispatchSelectedDriverId===driverId)state.dispatchSelectedDriverId=null; await saveDispatchData(true); renderDispatch(); renderDispatchDriverRosterModal();
  }
  function renderDispatchTractorRosterModal(){
    syncDispatchTractorMetadataFromMotive();
    fillDispatchLocationSelect($('dispatchMotiveTractorLocationInput'),$('dispatchMotiveTractorLocationInput')?.value||dispatchActiveLocationId());
    const vehicles=state.motive.vehicles||[],table=$('dispatchMotiveTractorsTable');
    if(table){
      table.querySelector('thead').innerHTML='<tr>'+['Select','Tractor #','VIN','Make / Model','Odometer','Motive Status','Dispatch Status'].map(h=>`<th>${h}</th>`).join('')+'</tr>';
      table.querySelector('tbody').innerHTML=vehicles.length?vehicles.slice().sort((a,b)=>String(a.number||'').localeCompare(String(b.number||''),undefined,{numeric:true})).map(v=>{const existing=dispatchExistingMotiveTractor(v),key=dispatchMotiveVehicleKey(v),odo=motiveOdometer(v);return `<tr><td><input type="checkbox" data-motive-tractor-select="${escapeHtml(key)}" ${existing?'disabled':''}></td><td><strong>${escapeHtml(v.number||'—')}</strong></td><td>${escapeHtml(v.vin||'—')}</td><td>${escapeHtml(dispatchMotiveMakeModel(v))}</td><td>${odo==null?'—':fmtNum(odo)}</td><td>${escapeHtml(v.status||'—')}</td><td>${existing?`<span class="status-pill yes">In Dispatch • ${escapeHtml(dispatchTractorLocationName(existing))}</span>`:'<span class="status-pill neutral">Available to add</span>'}</td></tr>`;}).join(''):'<tr><td colspan="7" class="empty-table-cell">No Motive tractors are loaded. Use Refresh Motive, or confirm the Motive API connection.</td></tr>';
    }
    const note=$('dispatchMotiveImportNote'); if(note) note.textContent=state.motive.configured?(state.motive.lastSync?`Motive last refreshed ${new Date(state.motive.lastSync).toLocaleString()}.`:'Motive is connected. Refresh to load the latest fleet.'):'Motive is not connected on this computer.';
    const roster=$('dispatchCurrentTractorRosterTable');
    if(roster){
      roster.querySelector('thead').innerHTML='<tr>'+['Tractor #','VIN','Make / Model','Odometer','Location','Motive Status','Actions'].map(h=>`<th>${h}</th>`).join('')+'</tr>';
      roster.querySelector('tbody').innerHTML=dispatchTractors().slice().sort((a,b)=>dispatchTractorLocationName(a).localeCompare(dispatchTractorLocationName(b))||String(a.tractorNumber||'').localeCompare(String(b.tractorNumber||''),undefined,{numeric:true})).map(t=>{const options=dispatchLocations().map(l=>`<option value="${escapeHtml(l.id)}" ${dispatchTractorLocationId(t)===l.id?'selected':''}>${escapeHtml(l.name)}</option>`).join('');return `<tr><td><strong>${escapeHtml(t.tractorNumber||'—')}</strong></td><td>${escapeHtml(t.vin||'—')}</td><td>${escapeHtml(t.makeModel||'—')}</td><td>${t.odometer==null?'—':fmtNum(t.odometer)}</td><td><select class="dispatch-tractor-location-select" data-dispatch-tractor-location="${escapeHtml(t.id)}">${options}</select></td><td>${escapeHtml(t.motiveStatus||'—')}</td><td class="dispatch-roster-row-actions"><button class="button danger-outline" type="button" data-delete-dispatch-tractor="${escapeHtml(t.id)}">Remove</button></td></tr>`;}).join('')||'<tr><td colspan="7" class="empty-table-cell">No tractors have been added to Dispatch yet.</td></tr>';
    }
  }
  function openDispatchTractorRosterModal(){ renderDispatchTractorRosterModal(); openModal('dispatchTractorRosterModal'); }
  function selectAllMotiveDispatchTractors(){ document.querySelectorAll('#dispatchMotiveTractorsTable [data-motive-tractor-select]:not(:disabled)').forEach(cb=>cb.checked=true); }
  async function refreshDispatchMotiveFleet(){ await refreshMotiveFleet(true); syncDispatchTractorMetadataFromMotive(); renderDispatch(); renderDispatchTractorRosterModal(); showAlert(`Motive fleet refreshed: <strong>${state.motive.vehicles.length}</strong> vehicle${state.motive.vehicles.length===1?'':'s'} loaded.`,'success'); }
  async function importSelectedMotiveTractors(){
    const selected=[...document.querySelectorAll('#dispatchMotiveTractorsTable [data-motive-tractor-select]:checked')].map(cb=>cb.dataset.motiveTractorSelect); if(!selected.length){showAlert('Select at least one Motive tractor to add.','warning');return;}
    const loc=$('dispatchMotiveTractorLocationInput')?.value||dispatchActiveLocationId(); let added=0;
    for(const key of selected){ const v=(state.motive.vehicles||[]).find(x=>dispatchMotiveVehicleKey(x)===key); if(!v||dispatchExistingMotiveTractor(v))continue; const odo=motiveOdometer(v); state.dispatch.tractors.push({id:uid('dispatch_tractor'),motiveVehicleId:String(v.id||''),tractorNumber:String(v.number||'').trim(),vin:String(v.vin||'').trim().toUpperCase(),makeModel:dispatchMotiveMakeModel(v)==='—'?'':dispatchMotiveMakeModel(v),odometer:odo==null?null:Math.round(odo),motiveStatus:String(v.status||''),locatedAt:String(v.located_at||''),locationId:loc,source:'motive'}); added++; }
    await saveDispatchData(true); renderDispatch(); renderDispatchTractorRosterModal(); showAlert(`<strong>${added}</strong> Motive tractor${added===1?'':'s'} added to ${escapeHtml(dispatchLocations().find(l=>l.id===loc)?.name||'Dispatch')}.`,'success');
  }
  async function changeDispatchTractorLocation(tractorId,locationId){ const t=dispatchTractors().find(x=>x.id===tractorId); if(!t||!dispatchLocations().some(l=>l.id===locationId))return; const conflicts=(state.dispatch.runs||[]).filter(r=>r.primaryTractorId===tractorId&&(r.locationId||'nashville')!==locationId); if(conflicts.length){const target=dispatchLocations().find(l=>l.id===locationId)?.name||'the new location'; if(!confirm(`Location warning: Tractor ${t.tractorNumber||''} is assigned to ${conflicts.length} run${conflicts.length===1?'':'s'} outside ${target}. Move the tractor location and keep those run assignments anyway?`)){renderDispatchTractorRosterModal();return;}} t.locationId=locationId; await saveDispatchData(true); renderDispatch(); renderDispatchTractorRosterModal(); }
  async function deleteDispatchTractor(tractorId){ const t=dispatchTractors().find(x=>x.id===tractorId); if(!t)return; const assignedRuns=(state.dispatch.runs||[]).filter(r=>r.primaryTractorId===tractorId); const extra=assignedRuns.length?` It is currently assigned to ${assignedRuns.length} run${assignedRuns.length===1?'':'s'} and will be cleared from those runs.`:''; if(!confirm(`Remove tractor ${t.tractorNumber||''} from Dispatch planning?${extra} This does not remove it from Motive or Maintenance.`))return; state.dispatch.tractors=dispatchTractors().filter(x=>x.id!==tractorId); for(const r of state.dispatch.runs||[]) if(r.primaryTractorId===tractorId) r.primaryTractorId=''; await saveDispatchData(true); renderDispatch(); renderDispatchTractorRosterModal(); }
  function dispatchEconomics(assignments=state.dispatch.assignments,locationId=dispatchActiveLocationId()){
    const activeRuns=dispatchRuns(locationId),runIds=new Set(activeRuns.map(r=>r.id)); const runs=[];
    let weeklyMiles=0,potentialMiles=0,lostMiles=0,knownMilesRuns=0;
    for(const run of activeRuns){
      const scheduledDays=(run.days||[]).length,coveredDays=(run.days||[]).filter(day=>!!dispatchAssignment(run.id,day,assignments)).length,openDays=Math.max(0,scheduledDays-coveredDays);
      const miles=dispatchRunMiles(run),coveredMiles=miles==null?null:miles*coveredDays,fullMiles=miles==null?null:miles*scheduledDays,runLostMiles=miles==null?null:miles*openDays;
      if(miles!=null){knownMilesRuns++;weeklyMiles+=coveredMiles||0;potentialMiles+=fullMiles||0;lostMiles+=runLostMiles||0;}
      runs.push({run,scheduledDays,coveredDays,openDays,miles,coveredMiles,fullMiles,lostMiles:runLostMiles});
    }
    const drivers=dispatchDriversForLocation(locationId).map(driver=>{
      const locAssignments=(assignments||[]).filter(a=>a.driverId===driver.id && runIds.has(a.runId));
      const assignedDays=new Set(locAssignments.map(a=>Number(a.day))).size,regularDays=(driver.availability||[]).length;
      return {driver,assignedDays,regularDays};
    });
    return {runs,drivers,weeklyMiles,potentialMiles,lostMiles,milesComplete:activeRuns.length>0&&knownMilesRuns===activeRuns.length};
  }
  function dispatchMoneyOrDash(v){ return v==null?'—':fmtMoney(v); }
  function dispatchNumberOrDash(v){ return v==null?'—':new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(v); }
  function dispatchPrimaryAssignments(locationId=dispatchActiveLocationId(),baseAssignments=[]){
    const out=[]; const occupied=[...(baseAssignments||[])];
    for(const run of dispatchRuns(locationId)){
      if(!run.primaryDriverId) continue; const d=dispatchDriver(run.primaryDriverId); if(!d||dispatchDriverLocationId(d)!==locationId) continue;
      for(const day of run.days||[]){ if(!dispatchDriverAvailable(d,day)||dispatchDriverAssignment(d.id,day,occupied.concat(out))) continue; out.push({runId:run.id,day:Number(day),driverId:run.primaryDriverId,source:'primary',override:false}); }
    }
    return out;
  }
  function dispatchCoverageStats(assignments=state.dispatch.assignments,locationId=dispatchActiveLocationId()){
    const perDay=DISPATCH_DAYS.map((name,day)=>({name,day,required:0,covered:0,openRuns:[]})); let required=0,covered=0;
    for(const run of dispatchRuns(locationId)) for(const day of run.days||[]){ required++;perDay[day].required++; if(dispatchAssignment(run.id,day,assignments)){covered++;perDay[day].covered++;}else perDay[day].openRuns.push(run.name); }
    return {required,covered,open:required-covered,coverage:required?covered/required:0,perDay};
  }
  function buildOptimizedDispatchAssignments(locationId=dispatchActiveLocationId()){
    const activeRuns=dispatchRuns(locationId),activeIds=new Set(activeRuns.map(r=>r.id));
    const outside=(state.dispatch.assignments||[]).filter(a=>!activeIds.has(a.runId)&&dispatchDriverIsActive(dispatchDriver(a.driverId))); const assignments=[...outside,...dispatchPrimaryAssignments(locationId,outside)]; const drivers=dispatchDriversForLocation(locationId);
    for(let day=0;day<7;day++){
      const usedAtDay=new Set(assignments.filter(a=>Number(a.day)===day).map(a=>a.driverId));
      const openRuns=activeRuns.filter(r=>(r.days||[]).map(Number).includes(day)&&!dispatchAssignment(r.id,day,assignments));
      const availableDrivers=drivers.filter(d=>dispatchDriverAvailable(d,day)&&!usedAtDay.has(d.id)); let best={covered:-1,miles:-1,fit:-1,picks:[]};
      const fitScore=(driver,run)=>{let n=0;const prev=assignments.find(a=>a.driverId===driver.id&&Number(a.day)===day-1);if(prev?.runId===run.id)n+=12;if(driver.role==='urr')n+=4;if((driver.origins||[]).length===1&&driver.origins[0]===run.origin)n+=5;else if((driver.origins||[]).includes(run.origin))n+=3;return n;};
      const search=(idx,used,picks,covered,miles,fit)=>{if(idx>=openRuns.length){if(covered>best.covered||(covered===best.covered&&miles>best.miles+1e-9)||(covered===best.covered&&Math.abs(miles-best.miles)<1e-9&&fit>best.fit))best={covered,miles,fit,picks:[...picks]};return;}const run=openRuns[idx];search(idx+1,used,picks,covered,miles,fit);for(const driver of availableDrivers){if(used.has(driver.id)||!dispatchOriginAllowed(driver,run))continue;used.add(driver.id);picks.push({runId:run.id,day,driverId:driver.id,source:'optimized',override:false});search(idx+1,used,picks,covered+1,miles+(dispatchRunMiles(run)||0),fit+fitScore(driver,run));picks.pop();used.delete(driver.id);}};
      search(0,new Set(),[],0,0,0); assignments.push(...best.picks);
    }
    return assignments;
  }
  function migrateDispatchData(parsed){
    const defaults=defaultDispatchData(); if(!parsed||!Array.isArray(parsed.runs)||!Array.isArray(parsed.drivers)||!Array.isArray(parsed.assignments)) return defaults;
    const runDefaults=new Map(defaults.runs.map(r=>[r.id,r])),driverDefaults=new Map(defaults.drivers.map(d=>[d.id,d]));
    const locations=Array.isArray(parsed.locations)&&parsed.locations.length?parsed.locations.map(x=>({id:String(x.id||'').trim()||`loc_${Math.random().toString(36).slice(2,8)}`,name:String(x.name||'Location').trim()})):[{id:'nashville',name:String(parsed.location||'Nashville')}];
    const validIds=new Set(locations.map(x=>x.id)); const fallback=locations[0].id;
    const data={...defaults,...parsed,version:9,locations,activeLocationId:validIds.has(parsed.activeLocationId)?parsed.activeLocationId:fallback};
    data.runs=parsed.runs.map(r=>({...runDefaults.get(r.id),...r,locationId:validIds.has(r.locationId)?r.locationId:fallback,primaryDriverId:r.primaryDriverId||'',primaryTractorId:r.primaryTractorId||'',days:(r.days||[]).map(Number),scheduleLabel:r.scheduleLabel||dispatchAvailabilityLabel(r.days||[]),milesPerRun:dispatchOptionalNumber(r.milesPerRun),payPerMile:dispatchOptionalNumber(r.payPerMile)}));
    data.drivers=parsed.drivers.map(d=>({...driverDefaults.get(d.id),...d,fedexId:String(d.fedexId||driverDefaults.get(d.id)?.fedexId||'').trim(),locationId:validIds.has(d.locationId)?d.locationId:fallback,source:d.source||driverDefaults.get(d.id)?.source||'manual',weeklyPay:dispatchOptionalNumber(d.weeklyPay),availability:(d.availability||driverDefaults.get(d.id)?.availability||[]).map(Number),availabilityLabel:dispatchAvailabilityLabel(d.availability||driverDefaults.get(d.id)?.availability||[])}));
    data.tractors=(Array.isArray(parsed.tractors)?parsed.tractors:[]).map(t=>({...t,id:t.id||uid('dispatch_tractor'),motiveVehicleId:String(t.motiveVehicleId||''),tractorNumber:String(t.tractorNumber||t.number||'').trim(),vin:String(t.vin||'').trim().toUpperCase(),makeModel:String(t.makeModel||'').trim(),locationId:validIds.has(t.locationId)?t.locationId:fallback,odometer:dispatchOptionalNumber(t.odometer),source:t.source||'motive'}));
    const tractorIds=new Set(data.tractors.map(t=>t.id)); for(const r of data.runs) if(r.primaryTractorId&&!tractorIds.has(r.primaryTractorId)) r.primaryTractorId='';
    data.assignments=parsed.assignments.filter(a=>data.runs.some(r=>r.id===a.runId)&&data.drivers.some(d=>d.id===a.driverId));
    const validDriverIds=new Set(data.drivers.map(d=>d.id)), validTractorIds=new Set(data.tractors.map(t=>t.id));
    data.savedPlans=(Array.isArray(parsed.savedPlans)?parsed.savedPlans:[]).filter(p=>p&&validIds.has(p.locationId)).map(p=>{
      const runs=(Array.isArray(p.runs)?p.runs:[]).map(r=>({...r,locationId:p.locationId,days:(r.days||[]).map(Number),scheduleLabel:r.scheduleLabel||dispatchAvailabilityLabel(r.days||[]),primaryDriverId:r.primaryDriverId||'',primaryTractorId:r.primaryTractorId&&validTractorIds.has(r.primaryTractorId)?r.primaryTractorId:'',milesPerRun:dispatchOptionalNumber(r.milesPerRun),payPerMile:dispatchOptionalNumber(r.payPerMile)}));
      const runIds=new Set(runs.map(r=>r.id)), assignments=(Array.isArray(p.assignments)?p.assignments:[]).filter(a=>runIds.has(a.runId)&&validDriverIds.has(a.driverId));
      return {id:String(p.id||uid('dispatch_plan')),locationId:p.locationId,name:String(p.name||'Saved Plan'),runs,assignments,createdAt:p.createdAt||new Date().toISOString(),updatedAt:p.updatedAt||p.createdAt||new Date().toISOString()};
    });
    data.activePlanByLocation={}; for(const l of locations){const requested=parsed.activePlanByLocation?.[l.id], plans=data.savedPlans.filter(p=>p.locationId===l.id); data.activePlanByLocation[l.id]=plans.some(p=>p.id===requested)?requested:(plans[0]?.id||'');}
    data.dailyBoards=parsed.dailyBoards&&typeof parsed.dailyBoards==='object'?parsed.dailyBoards:{};
    return data;
  }
  async function loadDispatchData(){
    if(!state.directoryHandle)return; let data=defaultDispatchData();
    try{const dir=await state.directoryHandle.getDirectoryHandle('Dispatch');const fh=await dir.getFileHandle('dispatch_data.json');const file=await fh.getFile();data=migrateDispatchData(JSON.parse(await file.text()));}catch(err){if(err&&err.name!=='NotFoundError')console.warn('Could not load dispatch data',err);}
    state.dispatch=data;state.dispatchLoaded=true;state.dispatchSelectedDriverId=null;syncSharedDriverRoster();renderDispatch();renderDailyDispatch();
  }
  async function saveDispatchData(silent=true){
    const cloudSaved=cloudConnected()?await saveCloudModule('dispatch',true):false;
    if(!state.directoryHandle){if(!silent&&cloudSaved)showAlert('Dispatch data saved to NBL Cloud.','success');return cloudSaved;}if(!(await requestPermission(state.directoryHandle,'readwrite'))){if(!silent)showAlert('Folder write permission is required to save dispatch data.','error');return false;}
    try{const dir=await state.directoryHandle.getDirectoryHandle('Dispatch',{create:true});state.dispatch.version=9;state.dispatch.updatedAt=new Date().toISOString();await writeFile(dir,'dispatch_data.json',JSON.stringify(state.dispatch,null,2),'application/json');if(!silent)showAlert(`Dispatch plan saved to <strong>${escapeHtml(state.directoryHandle.name)}/Dispatch</strong>.`,'success');return true;}catch(err){console.error(err);if(!silent)showAlert('Could not save dispatch data: '+err.message,'error');return false;}
  }
  async function optimizeDispatchCoverage(){
    if(!await verifyMotiveDriversForWork())return;
    const loc=dispatchActiveLocationName();state.dispatch.assignments=buildOptimizedDispatchAssignments();state.dispatchSelectedDriverId=null;await saveDispatchData(true);renderDispatch();setScreen('dispatch');const st=dispatchCoverageStats(),miles=dispatchEconomics();const milesText=miles.milesComplete?` Lost Miles: <strong>${fmtNum(miles.lostMiles)}</strong>.`:'';showAlert(`${escapeHtml(loc)} dispatch optimized to <strong>${st.covered} of ${st.required}</strong> weekly run assignments (${Math.round(st.coverage*100)}%). <strong>${st.open}</strong> assignment${st.open===1?' remains':'s remain'} uncovered.${milesText}`,'success');
  }
  async function resetDispatchPlan(){
    if(!await verifyMotiveDriversForWork())return;
    const id=dispatchActiveLocationId(),activeIds=new Set(dispatchRuns(id).map(r=>r.id)),outside=(state.dispatch.assignments||[]).filter(a=>!activeIds.has(a.runId)&&dispatchDriverIsActive(dispatchDriver(a.driverId)));state.dispatch.assignments=[...outside,...dispatchPrimaryAssignments(id,outside)];state.dispatchSelectedDriverId=null;await saveDispatchData(true);renderDispatch();setScreen('dispatch');showAlert(`${escapeHtml(dispatchActiveLocationName())} reset: primary assignments were restored where available and other runs were opened.`,'success');
  }
  async function assignDispatchDriver(driverId,runId,day,sourceRunId='',sourceDay=null){
    const driver=dispatchDriver(driverId),run=dispatchRun(runId),d=Number(day);if(!driver||!run||!(run.days||[]).map(Number).includes(d))return;if(!await verifyMotiveDriversForWork())return;if(!dispatchDriverIsActive(driver)){showAlert('This driver is inactive or unverified in Motive and cannot be assigned.','warning');return;}let override=false,scheduleOverride=false,originOverride=false;
    if(!dispatchDriverAvailable(driver,d)){if(!confirm(`Schedule warning: ${driver.name} is not listed as available on ${DISPATCH_DAYS[d]}. Assign anyway?`))return;override=true;scheduleOverride=true;}
    let locationOverride=false; if(dispatchDriverLocationId(driver)!==(run.locationId||'nashville')){const from=dispatchDriverLocationName(driver),to=dispatchLocations().find(l=>l.id===(run.locationId||'nashville'))?.name||'this location';if(!confirm(`Location warning: ${driver.name} is assigned to ${from}, while this run belongs to ${to}. Assign anyway?`))return;override=true;locationOverride=true;}
    if(!dispatchOriginAllowed(driver,run)){if(!confirm(`Origin warning: ${driver.name} is listed for ${driver.baseLabel}, while ${run.name} starts from ${run.origin}. Assign anyway?`))return;override=true;originOverride=true;}
    const existingOther=(state.dispatch.assignments||[]).find(a=>a.driverId===driverId&&Number(a.day)===d&&!(a.runId===runId));
    if(existingOther){const otherRun=dispatchRun(existingOther.runId);if(!confirm(`Double-booking warning: ${driver.name} is already assigned to ${otherRun?.name||'another run'} (${dispatchLocations().find(l=>l.id===(otherRun?.locationId||'nashville'))?.name||'another location'}) on ${DISPATCH_DAYS[d]}. Move the driver to this run instead?`))return;}
    let next=(state.dispatch.assignments||[]).filter(a=>!(a.runId===runId&&Number(a.day)===d)&&!(a.driverId===driverId&&Number(a.day)===d));if(sourceRunId&&sourceDay!=null&&(sourceRunId!==runId||Number(sourceDay)!==d))next=next.filter(a=>!(a.runId===sourceRunId&&Number(a.day)===Number(sourceDay)&&a.driverId===driverId));const isPrimary=run.primaryDriverId===driverId;next.push({runId,day:d,driverId,source:isPrimary?'primary':'manual',override,scheduleOverride,originOverride,locationOverride});state.dispatch.assignments=next;state.dispatchSelectedDriverId=null;await saveDispatchData(true);renderDispatch();setScreen('dispatch');
  }
  async function removeDispatchAssignment(runId,day){state.dispatch.assignments=(state.dispatch.assignments||[]).filter(a=>!(a.runId===runId&&Number(a.day)===Number(day)));await saveDispatchData(true);renderDispatch();setScreen('dispatch');}
  async function benchDispatchDriver(driverId,day,sourceRunId='',sourceDay=null){let next=state.dispatch.assignments||[];if(sourceRunId&&sourceDay!=null)next=next.filter(a=>!(a.runId===sourceRunId&&Number(a.day)===Number(sourceDay)&&a.driverId===driverId));else next=next.filter(a=>!(a.driverId===driverId&&Number(a.day)===Number(day)));state.dispatch.assignments=next;state.dispatchSelectedDriverId=null;await saveDispatchData(true);renderDispatch();setScreen('dispatch');}
  function dispatchDriverCardHtml(d,compact=false){const selected=state.dispatchSelectedDriverId===d.id?' selected':'';if(compact)return `<div class="dispatch-bench-chip ${escapeHtml(d.role)}${selected}" draggable="true" data-dispatch-driver="${escapeHtml(d.id)}" data-dispatch-select-driver="${escapeHtml(d.id)}">${escapeHtml(d.name)}</div>`;const idText=d.fedexId?` • FedEx ${escapeHtml(d.fedexId)}`:'';return `<div class="dispatch-driver-card ${escapeHtml(d.role)}${selected}" draggable="true" data-dispatch-driver="${escapeHtml(d.id)}" data-dispatch-select-driver="${escapeHtml(d.id)}"><div class="dispatch-driver-card-top"><span class="dispatch-driver-name">${escapeHtml(d.name)}</span><button type="button" class="dispatch-edit-schedule" draggable="false" data-edit-dispatch-driver="${escapeHtml(d.id)}">Edit Driver</button></div><span class="dispatch-driver-meta">${escapeHtml(d.availabilityLabel)}${idText}</span><span class="dispatch-driver-badge">${escapeHtml(dispatchDriverLocationName(d))}</span></div>`;}
  function openDispatchScheduleModal(driverId){const d=dispatchDriver(driverId);if(!d)return;$('dispatchScheduleDriverId').value=d.id;$('dispatchScheduleDriverName').value=d.name;$('dispatchDriverFedexIdInput').value=d.fedexId||'';fillDispatchLocationSelect($('dispatchDriverLocationInput'),dispatchDriverLocationId(d));document.querySelectorAll('#dispatchScheduleDays input[type=checkbox]').forEach(cb=>cb.checked=(d.availability||[]).map(Number).includes(Number(cb.value)));$('dispatchScheduleModalTitle').textContent=`Edit Driver — ${d.name}`;openModal('dispatchScheduleModal');}
  async function saveDispatchScheduleFromForm(e){e.preventDefault();if(!await verifyMotiveDriversForWork())return;const id=$('dispatchScheduleDriverId').value,d=dispatchDriver(id);if(!d||!dispatchDriverIsActive(d))return;const days=[...document.querySelectorAll('#dispatchScheduleDays input[type=checkbox]:checked')].map(cb=>Number(cb.value)).sort((a,b)=>a-b);if(!days.length&&!confirm(`Schedule warning: ${d.name} will have no regular workdays. Save anyway?`))return;const newLocation=$('dispatchDriverLocationInput').value||dispatchDriverLocationId(d),fedexId=$('dispatchDriverFedexIdInput').value.trim();if(fedexId){const duplicate=dispatchExistingByFedexId(fedexId);if(duplicate&&duplicate.id!==d.id){showAlert(`FedEx ID ${escapeHtml(fedexId)} is already assigned to ${escapeHtml(duplicate.name)} in Dispatch.`,'warning');return;}}const conflicts=(state.dispatch.assignments||[]).filter(a=>a.driverId===id&&!days.includes(Number(a.day)));if(conflicts.length){const details=conflicts.slice(0,6).map(a=>`${DISPATCH_DAYS[Number(a.day)]}: ${dispatchRun(a.runId)?.name||a.runId}`).join('\n'),more=conflicts.length>6?`\n…and ${conflicts.length-6} more.`:'';if(!confirm(`Schedule warning: ${conflicts.length} existing assignment${conflicts.length===1?'':'s'} will fall outside ${d.name}'s regular schedule:\n\n${details}${more}\n\nKeep those assignments and save anyway?`))return;}const locationConflicts=(state.dispatch.assignments||[]).filter(a=>a.driverId===id&&(dispatchRun(a.runId)?.locationId||'nashville')!==newLocation);if(locationConflicts.length&&newLocation!==dispatchDriverLocationId(d)){const target=dispatchLocations().find(l=>l.id===newLocation)?.name||'the new location';if(!confirm(`Location warning: ${d.name} has ${locationConflicts.length} existing assignment${locationConflicts.length===1?'':'s'} outside ${target}. Move the driver's home dispatch location and keep those assignments anyway?`))return;}d.fedexId=fedexId;d.locationId=newLocation;d.availability=days;d.availabilityLabel=dispatchAvailabilityLabel(days);d.baseLabel=dispatchDriverLocationName(d);await saveDispatchData(true);closeModal('dispatchScheduleModal');renderDispatch();if(!$('dispatchDriverRosterModal').classList.contains('hidden'))renderDispatchDriverRosterModal();setScreen('dispatch');showAlert(`${escapeHtml(d.name)} updated • ${escapeHtml(dispatchDriverLocationName(d))} • ${escapeHtml(d.availabilityLabel)}. Existing assignments were preserved.`,'success');}
  function populateDispatchPrimaryDriverSelect(locationId,selected=''){
    const drivers=dispatchDriversForLocation(locationId);let html='<option value="">No primary driver</option>'+drivers.map(d=>`<option value="${escapeHtml(d.id)}">${escapeHtml(d.name)}${d.fedexId?` • ${escapeHtml(d.fedexId)}`:''}</option>`).join('');const current=selected?dispatchDriver(selected):null;if(current&&dispatchDriverIsActive(current)&&!drivers.some(d=>d.id===selected))html+=`<option value="${escapeHtml(current.id)}">${escapeHtml(current.name)} • ${escapeHtml(dispatchDriverLocationName(current))} (other location)</option>`;$('dispatchRunPrimaryDriverInput').innerHTML=html;$('dispatchRunPrimaryDriverInput').value=current&&dispatchDriverIsActive(current)?selected:'';
  }
  function populateDispatchPrimaryTractorSelect(locationId,selected=''){
    const el=$('dispatchRunPrimaryTractorInput'); if(!el)return; const tractors=dispatchTractorsForLocation(locationId).slice().sort((a,b)=>String(a.tractorNumber||'').localeCompare(String(b.tractorNumber||''),undefined,{numeric:true})); let html='<option value="">No tractor assigned</option>'+tractors.map(t=>`<option value="${escapeHtml(t.id)}">Tractor ${escapeHtml(t.tractorNumber||'—')} • ${escapeHtml(t.makeModel||'')}</option>`).join(''); const current=selected?dispatchTractor(selected):null; if(current&&!tractors.some(t=>t.id===selected)) html+=`<option value="${escapeHtml(current.id)}">Tractor ${escapeHtml(current.tractorNumber||'—')} • ${escapeHtml(dispatchTractorLocationName(current))} (other location)</option>`; el.innerHTML=html; el.value=selected||'';
  }
  function populateDispatchRunModal(selectedLocation=dispatchActiveLocationId(),selectedDriver='',selectedTractor=''){$('dispatchRunLocationInput').innerHTML=dispatchLocations().map(l=>`<option value="${escapeHtml(l.id)}">${escapeHtml(l.name)}</option>`).join('');$('dispatchRunLocationInput').value=selectedLocation;populateDispatchPrimaryDriverSelect(selectedLocation,selectedDriver);populateDispatchPrimaryTractorSelect(selectedLocation,selectedTractor);}
  function dispatchTractorConflictRuns(tractorId,runId,days){ const set=new Set((days||[]).map(Number)); return (state.dispatch.runs||[]).filter(r=>r.id!==runId&&r.primaryTractorId===tractorId&&(r.days||[]).some(d=>set.has(Number(d)))); }
  async function assignDispatchTractorToRun(runId,tractorId){ const run=dispatchRun(runId); if(!run)return; if(!tractorId){run.primaryTractorId='';await saveDispatchData(true);renderDispatch();setScreen('dispatch');return;} const tractor=dispatchTractor(tractorId); if(!tractor){renderDispatch();return;} if(dispatchTractorLocationId(tractor)!==(run.locationId||'nashville')){const from=dispatchTractorLocationName(tractor),to=dispatchLocations().find(l=>l.id===(run.locationId||'nashville'))?.name||'this location';if(!confirm(`Location warning: Tractor ${tractor.tractorNumber||''} is assigned to ${from}, while ${run.name} belongs to ${to}. Assign anyway?`)){renderDispatch();return;}} const conflicts=dispatchTractorConflictRuns(tractorId,run.id,run.days); if(conflicts.length){const names=conflicts.map(r=>r.name).join(', ');if(!confirm(`Tractor conflict warning: Tractor ${tractor.tractorNumber||''} is also assigned to ${names} on one or more overlapping operating days. Keep this assignment anyway?`)){renderDispatch();return;}} run.primaryTractorId=tractorId; await saveDispatchData(true);renderDispatch();setScreen('dispatch'); }
  function openDispatchRunEconomicsModal(runId=''){
    const run=runId?dispatchRun(runId):null;populateDispatchRunModal(run?.locationId||dispatchActiveLocationId(),run?.primaryDriverId||'',run?.primaryTractorId||'');$('dispatchRunEconomicsId').value=run?.id||'';$('dispatchRunTypeInput').value=run?.type||'unassigned';$('dispatchRunNameInput').value=run?.name||'';$('dispatchRunOriginInput').value=run?.origin||dispatchActiveLocationName();$('dispatchRunPrimaryDriverInput').value=run?.primaryDriverId||'';$('dispatchRunMilesInput').value=dispatchRunMiles(run)??'';document.querySelectorAll('#dispatchRunDays input[type=checkbox]').forEach(cb=>cb.checked=(run?.days||[]).map(Number).includes(Number(cb.value)));$('dispatchRunEconomicsTitle').textContent=run?`Edit Run — ${run.name}`:'Add Dispatch Run';openModal('dispatchRunEconomicsModal');
  }
  async function saveDispatchRunEconomicsFromForm(e){
    e.preventDefault();if(!await verifyMotiveDriversForWork())return;const existingId=$('dispatchRunEconomicsId').value,existing=existingId?dispatchRun(existingId):null;const days=[...document.querySelectorAll('#dispatchRunDays input[type=checkbox]:checked')].map(cb=>Number(cb.value)).sort((a,b)=>a-b);if(!days.length){showAlert('Select at least one operating day for the run.','warning');return;}
    const locationId=$('dispatchRunLocationInput').value,name=$('dispatchRunNameInput').value.trim(),origin=$('dispatchRunOriginInput').value.trim(),type=$('dispatchRunTypeInput').value,primaryDriverId=$('dispatchRunPrimaryDriverInput').value||'',primaryTractorId=$('dispatchRunPrimaryTractorInput')?.value||'';if(!name||!origin)return;
    const primaryDriver=primaryDriverId?dispatchDriver(primaryDriverId):null;if(primaryDriverId&&!dispatchDriverIsActive(primaryDriver)){showAlert('Choose an active Motive driver as primary.','warning');return;}if(primaryDriver&&dispatchDriverLocationId(primaryDriver)!==locationId&&!confirm(`${primaryDriver.name} is assigned to ${dispatchDriverLocationName(primaryDriver)}, not ${dispatchLocations().find(l=>l.id===locationId)?.name||'this run location'}. Keep this driver as the primary driver anyway?`))return; const primaryTractor=primaryTractorId?dispatchTractor(primaryTractorId):null; if(primaryTractor&&dispatchTractorLocationId(primaryTractor)!==locationId&&!confirm(`Tractor ${primaryTractor.tractorNumber||''} is assigned to ${dispatchTractorLocationName(primaryTractor)}, not ${dispatchLocations().find(l=>l.id===locationId)?.name||'this run location'}. Keep this tractor on the run anyway?`))return; const tractorConflicts=primaryTractorId?dispatchTractorConflictRuns(primaryTractorId,existingId,days):[]; if(tractorConflicts.length&&!confirm(`Tractor conflict warning: Tractor ${primaryTractor?.tractorNumber||''} is also assigned to ${tractorConflicts.map(r=>r.name).join(', ')} on overlapping operating days. Save this run assignment anyway?`))return;
    const run=existing||{id:uid('run')};const oldId=run.id;Object.assign(run,{locationId,name,origin,type,primaryDriverId,primaryTractorId,days,scheduleLabel:dispatchAvailabilityLabel(days),milesPerRun:dispatchOptionalNumber($('dispatchRunMilesInput').value)});if(!existing)state.dispatch.runs.push(run);
    // Remove assignments on days no longer operated; preserve remaining manual assignments.
    state.dispatch.assignments=(state.dispatch.assignments||[]).filter(a=>a.runId!==oldId||days.includes(Number(a.day)));
    // Fill empty primary-driver days where that driver is available and not assigned elsewhere.
    const pd=primaryDriverId?dispatchDriver(primaryDriverId):null;if(pd&&dispatchDriverLocationId(pd)===locationId){for(const day of days){if(dispatchAssignment(run.id,day))continue;if(!dispatchDriverAvailable(pd,day))continue;if(dispatchDriverAssignment(pd.id,day))continue;state.dispatch.assignments.push({runId:run.id,day,driverId:pd.id,source:'primary',override:false});}}
    state.dispatch.activeLocationId=locationId;await saveDispatchData(true);closeModal('dispatchRunEconomicsModal');renderDispatch();setScreen('dispatch');showAlert(`${existing?'Updated':'Added'} <strong>${escapeHtml(run.name)}</strong>.`,'success');
  }
  async function deleteDispatchRun(runId){const run=dispatchRun(runId);if(!run)return;if(!confirm(`Delete run "${run.name}"? Its weekly assignments will also be removed.`))return;state.dispatch.runs=(state.dispatch.runs||[]).filter(r=>r.id!==runId);state.dispatch.assignments=(state.dispatch.assignments||[]).filter(a=>a.runId!==runId);await saveDispatchData(true);renderDispatch();setScreen('dispatch');showAlert(`${escapeHtml(run.name)} deleted.`,'success');}
  function openDispatchLocationModal(locationId='') {const loc=locationId?dispatchLocations().find(l=>l.id===locationId):null;$('dispatchLocationIdInput').value=loc?.id||'';$('dispatchLocationNameInput').value=loc?.name||'';$('dispatchLocationModalTitle').textContent=loc?`Edit Location — ${loc.name}`:'Add Dispatch Location';openModal('dispatchLocationModal');}
  async function saveDispatchLocationFromForm(e){e.preventDefault();const id=$('dispatchLocationIdInput').value,name=$('dispatchLocationNameInput').value.trim();if(!name)return;if(id){const loc=dispatchLocations().find(l=>l.id===id);if(loc)loc.name=name;}else{const loc={id:uid('loc'),name};state.dispatch.locations.push(loc);state.dispatch.activeLocationId=loc.id;}await saveDispatchData(true);closeModal('dispatchLocationModal');renderDispatch();setScreen('dispatch');showAlert(`Dispatch location <strong>${escapeHtml(name)}</strong> saved.`,'success');}
  async function deleteDispatchLocation(){const loc=dispatchActiveLocation();if(!loc)return;if(dispatchLocations().length<=1){showAlert('At least one dispatch location must remain.','warning');return;}const runs=dispatchRuns(loc.id);if(!confirm(`Delete dispatch location "${loc.name}"? This will also delete ${runs.length} run${runs.length===1?'':'s'} and their assignments.`))return;const ids=new Set(runs.map(r=>r.id));state.dispatch.locations=dispatchLocations().filter(l=>l.id!==loc.id);state.dispatch.runs=(state.dispatch.runs||[]).filter(r=>!ids.has(r.id));state.dispatch.assignments=(state.dispatch.assignments||[]).filter(a=>!ids.has(a.runId));state.dispatch.savedPlans=(state.dispatch.savedPlans||[]).filter(p=>p.locationId!==loc.id);if(state.dispatch.activePlanByLocation)delete state.dispatch.activePlanByLocation[loc.id];const fallback=state.dispatch.locations[0].id;for(const d of state.dispatch.drivers||[])if(d.locationId===loc.id)d.locationId=fallback;for(const t of state.dispatch.tractors||[])if(t.locationId===loc.id)t.locationId=fallback;state.dispatch.activeLocationId=fallback;await saveDispatchData(true);renderDispatch();setScreen('dispatch');}
  async function selectDispatchLocation(id){if(!dispatchLocations().some(l=>l.id===id))return;state.dispatch.activeLocationId=id;state.dispatchSelectedDriverId=null;await saveDispatchData(true);renderDispatch();setScreen('dispatch');}
  function wireDispatchDragDrop(){
    document.querySelectorAll('#dispatchScreen [draggable="true"][data-dispatch-driver]').forEach(el=>{el.addEventListener('dragstart',e=>{const assignment=el.closest('.dispatch-assignment');const payload={driverId:el.dataset.dispatchDriver,sourceRunId:assignment?.dataset.runId||'',sourceDay:assignment?.dataset.day??null};e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',JSON.stringify(payload));});});
    document.querySelectorAll('#dispatchScreen .dispatch-cell.active').forEach(cell=>{cell.addEventListener('dragover',e=>{e.preventDefault();cell.classList.add('drop-hover');});cell.addEventListener('dragleave',()=>cell.classList.remove('drop-hover'));cell.addEventListener('drop',e=>{e.preventDefault();cell.classList.remove('drop-hover');try{const p=JSON.parse(e.dataTransfer.getData('text/plain'));assignDispatchDriver(p.driverId,cell.dataset.runId,Number(cell.dataset.day),p.sourceRunId,p.sourceDay);}catch{}});});
    document.querySelectorAll('#dispatchScreen .dispatch-bench').forEach(cell=>{cell.addEventListener('dragover',e=>{e.preventDefault();cell.classList.add('drop-hover');});cell.addEventListener('dragleave',()=>cell.classList.remove('drop-hover'));cell.addEventListener('drop',e=>{e.preventDefault();cell.classList.remove('drop-hover');try{const p=JSON.parse(e.dataTransfer.getData('text/plain'));benchDispatchDriver(p.driverId,Number(cell.dataset.day),p.sourceRunId,p.sourceDay);}catch{}});});
  }
  function dispatchSubsetForActiveLocation(){const runs=dispatchRuns(),ids=new Set(runs.map(r=>r.id)),assignments=(state.dispatch.assignments||[]).filter(a=>ids.has(a.runId)&&dispatchDriverIsActive(dispatchDriver(a.driverId))),driverIds=new Set(assignments.map(a=>a.driverId).filter(Boolean)),tractorIds=new Set(runs.map(r=>r.primaryTractorId).filter(Boolean)),drivers=(state.dispatch.drivers||[]).filter(d=>dispatchDriverIsActive(d)&&(dispatchDriverLocationId(d)===dispatchActiveLocationId()||driverIds.has(d.id))),tractors=(state.dispatch.tractors||[]).filter(t=>dispatchTractorLocationId(t)===dispatchActiveLocationId()||tractorIds.has(t.id));return {version:9,locationName:dispatchActiveLocationName(),location:dispatchActiveLocationName(),locationId:dispatchActiveLocationId(),locations:dispatchLocations(),runs,drivers,tractors,assignments,updatedAt:state.dispatch.updatedAt};}
  function renderDispatch(){
    if(!$('dispatchScreen'))return;clearInactiveLiveDispatchAssignments();syncDispatchTractorMetadataFromMotive();const loc=dispatchActiveLocation(),activeRuns=dispatchRuns(),st=dispatchCoverageStats(),econ=dispatchEconomics(),optimized=buildOptimizedDispatchAssignments(),best=dispatchCoverageStats(optimized);
    $('dispatchLocationEyebrow').textContent=`${loc?.name||'Dispatch'} Operations`;
    $('dispatchLocationTabs').innerHTML=dispatchLocations().map(l=>`<button type="button" class="dispatch-location-tab ${l.id===dispatchActiveLocationId()?'active':''}" data-dispatch-location-tab="${escapeHtml(l.id)}"><strong>${escapeHtml(l.name)}</strong><span>${dispatchRuns(l.id).length} run${dispatchRuns(l.id).length===1?'':'s'} • ${dispatchDriversForLocation(l.id).length} driver${dispatchDriversForLocation(l.id).length===1?'':'s'} • ${dispatchTractorsForLocation(l.id).length} tractor${dispatchTractorsForLocation(l.id).length===1?'':'s'}</span></button>`).join('');
    $('deleteDispatchLocationBtn').disabled=dispatchLocations().length<=1;
    renderDispatchPlanControls();
    const activeDrivers=dispatchDriversForLocation(),activeTractors=dispatchTractorsForLocation(),peakRuns=Math.max(0,...st.perDay.map(d=>d.required)),tractorBalance=activeTractors.length-peakRuns; $('dispatchDriverPanelTitle').textContent=`Drivers Assigned to ${loc?.name||'This Location'}`; $('dispatchTractorPanelTitle').textContent=`Tractors Assigned to ${loc?.name||'This Location'}`;
    $('dispatchPotential').textContent=`Best possible: ${best.covered}/${best.required} weekly assignments`;
    $('dispatchCards').innerHTML=[['Location',loc?.name||'—',''],['Drivers',fmtNum(activeDrivers.length),''],['Tractors',fmtNum(activeTractors.length),activeTractors.length<peakRuns?'danger':''],['Peak Runs / Day',fmtNum(peakRuns),''],['Tractor Capacity',peakRuns?`${tractorBalance>=0?'+':''}${tractorBalance} vs peak`:'—',tractorBalance<=0?'danger':(peakRuns?'success':'')],['Coverage',st.required?`${Math.round(st.coverage*100)}%`:'—',st.open?'danger':'success'],['Open Run-Days',fmtNum(st.open),st.open?'danger':'success'],['Weekly Miles',econ.milesComplete?fmtNum(econ.weeklyMiles):'Enter route miles',''],['Lost Miles',econ.milesComplete?fmtNum(econ.lostMiles):'Enter route miles',econ.lostMiles?'danger':'success']].map(x=>`<div class="summary-card ${x[2]}"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
    $('dispatchSaveState').textContent=state.dispatch.updatedAt?`Saved ${new Date(state.dispatch.updatedAt).toLocaleString()}`:'Starting plan • not yet modified';
    $('dispatchDriverPool').innerHTML=activeDrivers.length?activeDrivers.map(d=>dispatchDriverCardHtml(d,false)).join(''):'<div class="dispatch-empty-driver-pool"><strong>No drivers assigned here yet.</strong><span>Click Manage Drivers to add hired Recruitment drivers, settlement drivers, or a new driver.</span></div>';
    $('dispatchMotiveState').textContent=state.motive.configured?(state.motive.lastSync?`Motive refreshed ${new Date(state.motive.lastSync).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`:'Motive connected'):'Motive not connected';
    $('dispatchTractorPool').innerHTML=activeTractors.length?activeTractors.slice().sort((a,b)=>String(a.tractorNumber||'').localeCompare(String(b.tractorNumber||''),undefined,{numeric:true})).map(t=>{const v=dispatchMotiveVehicleForTractor(t),odo=v?motiveOdometer(v):t.odometer,status=String(v?.status||t.motiveStatus||'').trim();return `<div class="dispatch-tractor-card"><strong>Tractor ${escapeHtml(t.tractorNumber||'—')}</strong><span>${escapeHtml(t.makeModel||dispatchMotiveMakeModel(v)||'—')}</span><span>${escapeHtml(t.vin||v?.vin||'VIN —')}</span><span class="dispatch-tractor-odo">${odo==null?'Odometer —':`${fmtNum(odo)} mi`}</span><span class="dispatch-tractor-status ${status?'ok':'warn'}">${escapeHtml(status||'Motive status unavailable')}</span><span class="dispatch-tractor-location">${escapeHtml(dispatchTractorLocationName(t))}</span></div>`;}).join(''):'<div class="dispatch-empty-driver-pool"><strong>No tractors assigned here yet.</strong><span>Click Manage Tractors to pull tractors from Motive and assign them to this location.</span></div>';
    const parts=[];parts.push('<div class="dispatch-corner">Run / Origin</div>');for(const d of st.perDay){const cls=d.covered===d.required?'full':'gap';parts.push(`<div class="dispatch-day-head ${cls}"><strong>${d.name}</strong><small>${d.covered}/${d.required} covered</small></div>`);}
    if(!activeRuns.length){parts.push(`<div class="dispatch-no-runs"><strong>No runs at ${escapeHtml(loc?.name||'this location')} yet.</strong><span>Click + Add Run to create the first route.</span></div>`);}else{
      for(const run of activeRuns){const re=econ.runs.find(x=>x.run.id===run.id),milesText=re?.miles==null?'Miles: —':`Miles: ${dispatchNumberOrDash(re.miles)}`,lostText=re?.lostMiles==null?'Lost miles: —':`Lost miles: ${fmtNum(re.lostMiles)}`;
        const assignedTractor=run.primaryTractorId?dispatchTractor(run.primaryTractorId):null,tractorMismatch=assignedTractor&&dispatchTractorLocationId(assignedTractor)!==(run.locationId||'nashville'); const tractorOptions=['<option value="">Assign tractor…</option>',...activeTractors.map(t=>`<option value="${escapeHtml(t.id)}" ${run.primaryTractorId===t.id?'selected':''}>${escapeHtml(t.tractorNumber||'—')}</option>`),...(assignedTractor&&!activeTractors.some(t=>t.id===assignedTractor.id)?[`<option value="${escapeHtml(assignedTractor.id)}" selected>${escapeHtml(assignedTractor.tractorNumber||'—')} • ${escapeHtml(dispatchTractorLocationName(assignedTractor))}</option>`]:[])].join(''); parts.push(`<div class="dispatch-run-head ${escapeHtml(run.type)}"><strong>${escapeHtml(run.name)}</strong><span>${escapeHtml(run.origin)} • ${escapeHtml(run.scheduleLabel)}</span><span class="dispatch-run-type">${run.type==='assigned'?'Dedicated':run.type==='spot'?'Spot':'URR'}</span><span class="dispatch-run-statline"><strong>${milesText}</strong></span><span class="dispatch-run-statline">${re?.coveredDays||0}/${re?.scheduledDays||0} days covered • ${lostText}</span><label class="dispatch-run-tractor-label ${tractorMismatch?'warning':''}">Tractor <select class="dispatch-run-tractor-select" data-dispatch-run-tractor="${escapeHtml(run.id)}">${tractorOptions}</select></label><div class="dispatch-run-actions"><button type="button" class="dispatch-run-edit" data-edit-dispatch-run="${escapeHtml(run.id)}">Edit Run</button><button type="button" class="dispatch-run-delete" data-delete-dispatch-run="${escapeHtml(run.id)}">Delete</button></div></div>`);
        for(let day=0;day<7;day++){const active=(run.days||[]).map(Number).includes(day);if(!active){parts.push('<div class="dispatch-cell inactive">—</div>');continue;}const a=dispatchAssignment(run.id,day),selected=state.dispatchSelectedDriverId?' selected-target':'';if(!a){parts.push(`<div class="dispatch-cell active open${selected}" data-run-id="${escapeHtml(run.id)}" data-day="${day}"></div>`);continue;}const d=dispatchDriver(a.driverId),primary=run.primaryDriverId===a.driverId,scheduleWarn=!dispatchDriverAvailable(d,day),locationWarn=!!d&&dispatchDriverLocationId(d)!==(run.locationId||'nashville'),originWarn=!dispatchOriginAllowed(d,run),warn=(a.override||scheduleWarn||originWarn||locationWarn)?' override':'',warnClass=scheduleWarn?' schedule-warning':'',assignmentNote=scheduleWarn?'Outside regular schedule':(locationWarn?`Assigned to ${dispatchDriverLocationName(d)}`:(originWarn?'Origin override':(primary?'Primary assignment':'Manual assignment')));parts.push(`<div class="dispatch-cell active covered${selected}" data-run-id="${escapeHtml(run.id)}" data-day="${day}"><div class="dispatch-assignment${primary?' primary':''}${warn}${warnClass}" draggable="true" data-dispatch-driver="${escapeHtml(a.driverId)}" data-dispatch-select-driver="${escapeHtml(a.driverId)}" data-run-id="${escapeHtml(run.id)}" data-day="${day}"><strong>${escapeHtml(d?.name||a.driverId)}</strong><small>${escapeHtml(assignmentNote)}</small><button class="dispatch-remove" type="button" title="Remove assignment" data-dispatch-remove="${escapeHtml(run.id)}|${day}">×</button></div></div>`);}
      }
      parts.push('<div class="dispatch-bench-head"><strong>Available / Not Assigned</strong></div>');for(let day=0;day<7;day++){const available=activeDrivers.filter(d=>dispatchDriverAvailable(d,day)&&!dispatchDriverAssignment(d.id,day));parts.push(`<div class="dispatch-bench" data-day="${day}">${available.length?available.map(d=>dispatchDriverCardHtml(d,true)).join(''):'<span style="font-size:9px;color:#9a919e">All listed drivers assigned</span>'}</div>`);}
    }
    $('dispatchBoard').innerHTML=parts.join('');
    const routeHead=['Run','Origin','Tractor','Miles / Run','Scheduled Days','Covered Days','Open Days','Weekly Miles','Lost Miles','Action'];$('dispatchEconomicsTable').querySelector('thead').innerHTML='<tr>'+routeHead.map(h=>`<th>${h}</th>`).join('')+'</tr>';$('dispatchEconomicsTable').querySelector('tbody').innerHTML=econ.runs.length?econ.runs.map(x=>`<tr><td><strong>${escapeHtml(x.run.name)}</strong></td><td>${escapeHtml(x.run.origin)}</td><td>${escapeHtml(dispatchTractor(x.run.primaryTractorId)?.tractorNumber||'—')}</td><td>${dispatchNumberOrDash(x.miles)}</td><td>${x.scheduledDays}</td><td class="${x.openDays?'lost':'good'}">${x.coveredDays}</td><td class="${x.openDays?'lost':'good'}">${x.openDays}</td><td>${x.coveredMiles==null?'—':fmtNum(x.coveredMiles)}</td><td class="${(x.lostMiles||0)>0?'lost':'good'}">${x.lostMiles==null?'—':fmtNum(x.lostMiles)}</td><td><button class="button secondary" type="button" data-edit-dispatch-run="${escapeHtml(x.run.id)}">Edit Run</button></td></tr>`).join(''):'<tr><td colspan="10" class="empty-table-cell">No runs at this location.</td></tr>';
    const driverHead=['Driver','FedEx ID','Regular Schedule','Assigned Days Here','Action'];$('dispatchDriverEconomicsTable').querySelector('thead').innerHTML='<tr>'+driverHead.map(h=>`<th>${h}</th>`).join('')+'</tr>';$('dispatchDriverEconomicsTable').querySelector('tbody').innerHTML=econ.drivers.map(x=>`<tr><td><strong>${escapeHtml(x.driver.name)}</strong></td><td>${escapeHtml(x.driver.fedexId||'—')}</td><td>${escapeHtml(x.driver.availabilityLabel)}</td><td>${x.assignedDays}</td><td><button class="button secondary" type="button" data-edit-dispatch-driver="${escapeHtml(x.driver.id)}">Edit Schedule</button></td></tr>`).join('');
    $('dispatchGapStrip').innerHTML=st.perDay.map(d=>`<div class="dispatch-gap-day ${d.openRuns.length?'has-gap':'clear'}"><strong>${d.name}</strong><span class="gap-count">${d.openRuns.length}</span><span>${d.openRuns.length?escapeHtml(d.openRuns.join(' • ')):'Full coverage'}</span></div>`).join('');
    const opportunities=[];for(const run of activeRuns){const miles=dispatchRunMiles(run);for(const day of run.days||[])if(!dispatchAssignment(run.id,day))opportunities.push({run,day:Number(day),miles});}opportunities.sort((a,b)=>(b.miles||0)-(a.miles||0)||a.day-b.day||String(a.run.name).localeCompare(String(b.run.name)));$('dispatchOpportunityList').innerHTML=!opportunities.length?'<div class="dispatch-opportunity-item clear"><div><strong>Full weekly coverage</strong><span>No scheduled run-days are currently open.</span></div><div class="dispatch-opportunity-value">0 lost miles</div></div>':opportunities.map(o=>`<div class="dispatch-opportunity-item risk"><div><strong>${escapeHtml(o.run.name)} — ${DISPATCH_DAYS[o.day]}</strong><span>${escapeHtml(o.run.origin)} • uncovered scheduled run</span>${o.miles==null?'<span class="dispatch-economic-note">Enter route miles to calculate Lost Miles.</span>':''}</div><div class="dispatch-opportunity-value">${o.miles==null?'—':`${fmtNum(o.miles)} miles`}</div></div>`).join('');wireDispatchDragDrop();
  }
  const DAILY_DISPATCH_HUBS=['Nashville','Spartanburg','Marietta','Other'];
  function dailyDispatchHub(run){
    const location=dispatchLocations().find(l=>l.id===(run.locationId||'nashville'))?.name||'', text=`${location} ${run.origin||''} ${run.name||''}`.toLowerCase();
    if(/marietta|kennesaw|norcross|atlanta/.test(text))return 'Marietta';
    if(/spartanburg|charlotte|ncrs|greer|clinton|reidville|roebuck|gantt/.test(text))return 'Spartanburg';
    if(/nashville|lebanon|clarksville|murfreesboro|huntingburg/.test(text))return 'Nashville';
    return location||'Other';
  }
  function dailyDispatchRunScheduled(run,date){
    // Planner days use Sunday=0. Parse the selected calendar date locally;
    // UTC date-only parsing can shift it to the previous day in US time zones.
    const selected=dateAtNoon(date);
    return !!selected&&Array.isArray(run?.days)&&run.days.map(Number).includes(selected.getDay());
  }
  function dailyDispatchDefaultRows(date){
    return (state.dispatch.runs||[]).map(run=>{const assigned=run.type==='assigned'&&dailyDispatchRunScheduled(run,date)&&dispatchDriverIsActive(dispatchDriver(run.primaryDriverId));return {routeId:run.id,routeName:run.name||'Unnamed Route',origin:run.origin||'',hub:dailyDispatchHub(run),callStatus:assigned?'received':'not_received',dispatchStatus:assigned?'accepted':'',driverId:assigned?(run.primaryDriverId||''):'',refusals:[],declineReason:'',declineDriverId:'',declineDriverName:'',declineTractorId:'',declineTractorNumber:'',declineOther:''};});
  }
  function dailyDispatchRows(date){
    const saved=state.dispatch.dailyBoards?.[date],rows=saved&&Array.isArray(saved.rows)?saved.rows:dailyDispatchDefaultRows(date);
    return rows.map(r=>{const run=(state.dispatch.runs||[]).find(x=>x.id===r.routeId);return {...r,notScheduled:run?.type==='assigned'&&!dailyDispatchRunScheduled(run,date),refusals:Array.isArray(r.refusals)?r.refusals:[],declineReason:r.declineReason||'',declineDriverId:r.declineDriverId||'',declineDriverName:r.declineDriverName||'',declineTractorId:r.declineTractorId||'',declineTractorNumber:r.declineTractorNumber||'',declineOther:r.declineOther||''};});
  }
  function dailyDispatchDriverOptions(selected=''){
    const drivers=(state.dispatch.drivers||[]).filter(dispatchDriverIsActive).slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));
    let html='<option value="">Select driver…</option>'+drivers.map(d=>`<option value="${escapeHtml(d.id)}" ${d.id===selected?'selected':''}>${escapeHtml(d.name)}${d.fedexId?` • ${escapeHtml(d.fedexId)}`:''}</option>`).join('');
    if(selected&&!drivers.some(d=>d.id===selected)){const prior=dispatchDriver(selected);html+=`<option value="${escapeHtml(selected)}" selected disabled>${escapeHtml(prior?.name||'Previously assigned driver')} • inactive</option>`;} return html;
  }
  function dailyDispatchTractorOptions(selected=''){
    const tractors=dispatchTractors().slice().sort((a,b)=>String(a.tractorNumber||'').localeCompare(String(b.tractorNumber||''),undefined,{numeric:true}));
    let html='<option value="">Select tractor…</option>'+tractors.map(t=>`<option value="${escapeHtml(t.id)}" ${t.id===selected?'selected':''}>Tractor ${escapeHtml(t.tractorNumber||'—')}</option>`).join('');
    if(selected&&!tractors.some(t=>t.id===selected))html+=`<option value="${escapeHtml(selected)}" selected>Previously recorded tractor</option>`;return html;
  }
  function dailyRefusalChips(refusals=[]){
    return refusals.length?`<div class="daily-refusal-list"><span>Refused:</span>${refusals.map((r,i)=>`<button type="button" class="daily-refusal-chip" data-daily-remove-refusal="${i}" title="Remove refusal">${escapeHtml(r.driverName||dispatchDriver(r.driverId)?.name||'Driver')}${r.note?` <small>• ${escapeHtml(r.note)}</small>`:''}<b>×</b></button>`).join('')}</div>`:'';
  }
  function dailyDispatchOutcomeHtml(row){
    const refusals=Array.isArray(row.refusals)?row.refusals:[],encoded=encodeURIComponent(JSON.stringify(refusals));
    return `<div class="daily-outcome" data-daily-refusals="${escapeHtml(encoded)}"><div class="daily-assigned-driver"><select class="daily-driver-select" data-daily-driver>${dailyDispatchDriverOptions(row.driverId||'')}</select></div><button type="button" class="daily-refusal-add" data-daily-add-refusal>+ Record Refusal</button><div data-daily-refusal-chips>${dailyRefusalChips(refusals)}</div><div class="daily-decline-details ${row.dispatchStatus==='declined'?'':'hidden'}" data-daily-decline-details><label>Decline Reason<select data-daily-decline-reason><option value="">Select reason…</option><option value="driver_unavailable" ${row.declineReason==='driver_unavailable'?'selected':''}>Driver Unavailable</option><option value="truck_unavailable" ${row.declineReason==='truck_unavailable'?'selected':''}>Truck Unavailable</option><option value="other" ${row.declineReason==='other'?'selected':''}>Other</option></select></label><label class="daily-decline-conditional ${row.declineReason==='driver_unavailable'?'':'hidden'}" data-daily-decline-driver-wrap>Unavailable Driver<select data-daily-decline-driver>${dailyDispatchDriverOptions(row.declineDriverId||'')}</select></label><label class="daily-decline-conditional ${row.declineReason==='truck_unavailable'?'':'hidden'}" data-daily-decline-tractor-wrap>Unavailable Tractor<select data-daily-decline-tractor>${dailyDispatchTractorOptions(row.declineTractorId||'')}</select></label><label class="daily-decline-conditional ${row.declineReason==='other'?'':'hidden'}" data-daily-decline-other-wrap>Explanation<input data-daily-decline-other maxlength="160" value="${escapeHtml(row.declineOther||'')}" placeholder="Brief reason"></label></div></div>`;
  }
  function dailyDispatchRefusalsFromRow(tr){
    try{return JSON.parse(decodeURIComponent(tr.querySelector('[data-daily-refusals]')?.dataset.dailyRefusals||'%5B%5D'));}catch(_){return [];}
  }
  function setDailyDispatchRefusals(tr,refusals){
    const outcome=tr.querySelector('[data-daily-refusals]');if(!outcome)return;outcome.dataset.dailyRefusals=encodeURIComponent(JSON.stringify(refusals||[]));const chips=tr.querySelector('[data-daily-refusal-chips]');if(chips)chips.innerHTML=dailyRefusalChips(refusals||[]);
  }
  function openDailyRefusalModal(tr){
    if(!tr||tr.querySelector('[data-daily-call]')?.value!=='received')return;
    $('dailyRefusalRouteId').value=tr.dataset.routeId||'';$('dailyRefusalRouteName').textContent=tr.dataset.routeName||'Route';$('dailyRefusalDriverInput').innerHTML=dailyDispatchDriverOptions('');$('dailyRefusalNoteInput').value='';openModal('dailyRefusalModal');
  }
  async function saveDailyRefusalFromForm(e){
    e.preventDefault();if(!await verifyMotiveDriversForWork())return;const routeId=$('dailyRefusalRouteId').value,driverId=$('dailyRefusalDriverInput').value,tr=[...document.querySelectorAll('#dailyDispatchTable [data-daily-route-row]')].find(x=>x.dataset.routeId===routeId);if(!tr||!driverId)return;if(!dispatchDriverIsActive(dispatchDriver(driverId))){showAlert('Choose an active Motive driver.','warning');return;}const refusals=dailyDispatchRefusalsFromRow(tr),driver=dispatchDriver(driverId);if(refusals.some(r=>r.driverId===driverId)){showAlert(`${escapeHtml(driver?.name||'That driver')} is already recorded as refusing this route.`,'warning');return;}refusals.push({driverId,driverName:driver?.name||$('dailyRefusalDriverInput').selectedOptions[0]?.textContent||'Driver',note:$('dailyRefusalNoteInput').value.trim(),recordedAt:new Date().toISOString()});setDailyDispatchRefusals(tr,refusals);closeModal('dailyRefusalModal');
  }
  function updateDailyDispatchBoardControls(){
    let declines=0,received=0,accepted=0;const hubStats={};
    document.querySelectorAll('#dailyDispatchTable tbody tr[data-daily-route-row]').forEach(tr=>{
      const call=tr.querySelector('[data-daily-call]'),status=tr.querySelector('[data-daily-status]'),driver=tr.querySelector('[data-daily-driver]'),addRefusal=tr.querySelector('[data-daily-add-refusal]'),details=tr.querySelector('[data-daily-decline-details]'),reason=tr.querySelector('[data-daily-decline-reason]'); if(!call||!status||!driver)return;
      const gotCall=call.value==='received',notScheduled=tr.dataset.dailyNotScheduled==='true'&&!gotCall;tr.classList.toggle('daily-not-scheduled',notScheduled);tr.querySelector('[data-daily-not-scheduled-label]')?.classList.toggle('hidden',!notScheduled);const emptyStatus=status.querySelector('option[value=""]');if(emptyStatus)emptyStatus.textContent=notScheduled?'Not Scheduled':'—'; status.disabled=!gotCall;if(addRefusal)addRefusal.disabled=!gotCall;if(!gotCall){status.value='';driver.value='';setDailyDispatchRefusals(tr,[]);}
      const declined=gotCall&&status.value==='declined',isAccepted=gotCall&&status.value==='accepted';driver.disabled=!isAccepted;if(!isAccepted)driver.value='';details?.classList.toggle('hidden',!declined);
      if(!declined&&reason){reason.value='';for(const el of tr.querySelectorAll('[data-daily-decline-driver],[data-daily-decline-tractor],[data-daily-decline-other]'))el.value='';}
      const declineReason=declined?(reason?.value||''):'';tr.querySelector('[data-daily-decline-driver-wrap]')?.classList.toggle('hidden',declineReason!=='driver_unavailable');tr.querySelector('[data-daily-decline-tractor-wrap]')?.classList.toggle('hidden',declineReason!=='truck_unavailable');tr.querySelector('[data-daily-decline-other-wrap]')?.classList.toggle('hidden',declineReason!=='other');
      if(gotCall)received++;if(status.value==='accepted')accepted++;if(status.value==='declined')declines++;
      const hub=tr.dataset.routeHub||'Other',stats=hubStats[hub]||(hubStats[hub]={routes:0,received:0,accepted:0,declines:0});stats.routes++;if(gotCall)stats.received++;if(status.value==='accepted')stats.accepted++;if(status.value==='declined')stats.declines++;
    });
    document.querySelectorAll('[data-daily-hub-toggle]').forEach(btn=>{const stats=hubStats[btn.dataset.dailyHubToggle]||{routes:0,received:0,accepted:0,declines:0},summary=btn.querySelector('[data-daily-hub-summary]');if(summary)summary.textContent=`${stats.received}/${stats.routes} calls • ${stats.accepted} accepted${stats.declines?` • ${stats.declines} decline${stats.declines===1?'':'s'}`:''}`;});
    const rows=document.querySelectorAll('#dailyDispatchTable tbody tr[data-daily-route-row]').length;
    if($('dailyDispatchDeclineCount'))$('dailyDispatchDeclineCount').textContent=String(declines);
    if($('dailyDispatchCards'))$('dailyDispatchCards').innerHTML=[['Routes',fmtNum(rows),''],['Calls Received',fmtNum(received),''],['Accepted',fmtNum(accepted),'success'],['Declines',fmtNum(declines),declines?'danger':'success']].map(x=>`<div class="summary-card ${x[2]}"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
  }
  function renderDailyDispatch(){
    const table=$('dailyDispatchTable'),dateInput=$('dailyDispatchDateInput');if(!table||!dateInput)return;if(!dateInput.value)dateInput.value=todayIso();const date=dateInput.value,board=state.dispatch.dailyBoards?.[date],rows=dailyDispatchRows(date);
    $('dailyDispatchTableTitle').textContent=`Routes for ${fmtDate(date)}`;$('dailyDispatchSaveState').textContent=board?.savedAt?`Saved ${new Date(board.savedAt).toLocaleString()}`:'New date • not yet saved';
    table.querySelector('thead').innerHTML='<tr><th>Route</th><th>Call</th><th>Dispatched</th><th>Assignment / Outcome</th></tr>';
    const groups=new Map();for(const row of rows){const hub=row.hub||'Other';if(!groups.has(hub))groups.set(hub,[]);groups.get(hub).push(row);}const hubs=[...DAILY_DISPATCH_HUBS,...[...groups.keys()].filter(h=>!DAILY_DISPATCH_HUBS.includes(h))];const body=[];
    let visibleHubIndex=0;for(const hub of hubs){const list=groups.get(hub)||[];if(!list.length)continue;const stateKey=`${date}|${hub}`,isOpen=state.dailyDispatchHubOpen[stateKey]??visibleHubIndex===0;state.dailyDispatchHubOpen[stateKey]=isOpen;visibleHubIndex++;body.push(`<tr class="daily-dispatch-hub-row"><td colspan="4"><button type="button" class="daily-dispatch-hub-toggle" data-daily-hub-toggle="${escapeHtml(hub)}" data-daily-hub-key="${escapeHtml(stateKey)}" aria-expanded="${isOpen?'true':'false'}"><span><strong>${escapeHtml(hub)} Hub</strong><small data-daily-hub-summary>${list.length} route${list.length===1?'':'s'}</small></span><em aria-hidden="true">${isOpen?'−':'+'}</em></button></td></tr>`);for(const row of list){body.push(`<tr class="${isOpen?'':'daily-hub-collapsed'}" data-daily-hub-route="${escapeHtml(hub)}" data-daily-route-row data-daily-not-scheduled="${row.notScheduled?'true':'false'}" data-route-id="${escapeHtml(row.routeId||'')}" data-route-name="${escapeHtml(row.routeName||'')}" data-route-origin="${escapeHtml(row.origin||'')}" data-route-hub="${escapeHtml(hub)}"><td class="daily-dispatch-route" data-label="Route"><strong>${escapeHtml(row.routeName||'Unnamed Route')}</strong><small>${escapeHtml(row.origin||'—')}</small><small class="daily-not-scheduled-label hidden" data-daily-not-scheduled-label>Not Scheduled</small></td><td data-label="Call"><select data-daily-call><option value="not_received" ${row.callStatus!=='received'?'selected':''}>Not Received</option><option value="received" ${row.callStatus==='received'?'selected':''}>Received</option></select></td><td data-label="Dispatched"><select data-daily-status><option value="" ${!row.dispatchStatus?'selected':''}>—</option><option value="accepted" ${row.dispatchStatus==='accepted'?'selected':''}>Accepted</option><option value="declined" ${row.dispatchStatus==='declined'?'selected':''}>Declined</option></select></td><td data-label="Assignment / Outcome">${dailyDispatchOutcomeHtml(row)}</td></tr>`);}}
    table.querySelector('tbody').innerHTML=body.join('')||'<tr class="daily-dispatch-empty"><td colspan="4">No routes are available. Add routes in the Weekly Dispatch Planner first.</td></tr>';table.querySelector('tfoot').innerHTML='<tr class="daily-dispatch-decline-row"><td colspan="3">Decline Counter</td><td><span id="dailyDispatchDeclineCount">0</span></td></tr>';
    table.querySelectorAll('select').forEach(el=>el.addEventListener('change',updateDailyDispatchBoardControls));updateDailyDispatchBoardControls();
  }
  async function saveDailyDispatchBoard(){
    const date=$('dailyDispatchDateInput')?.value;if(!date){showAlert('Select a dispatch date.','warning');return;}const rows=[...document.querySelectorAll('#dailyDispatchTable tbody tr[data-daily-route-row]')].map(tr=>{const driverId=tr.querySelector('[data-daily-driver]').value,declineDriverId=tr.querySelector('[data-daily-decline-driver]')?.value||'',declineTractorId=tr.querySelector('[data-daily-decline-tractor]')?.value||'';return {routeId:tr.dataset.routeId,routeName:tr.dataset.routeName,origin:tr.dataset.routeOrigin,hub:tr.dataset.routeHub,callStatus:tr.querySelector('[data-daily-call]').value,dispatchStatus:tr.querySelector('[data-daily-status]').value,driverId,driverName:dispatchDriver(driverId)?.name||'',refusals:dailyDispatchRefusalsFromRow(tr),declineReason:tr.querySelector('[data-daily-decline-reason]')?.value||'',declineDriverId,declineDriverName:dispatchDriver(declineDriverId)?.name||'',declineTractorId,declineTractorNumber:dispatchTractor(declineTractorId)?.tractorNumber||'',declineOther:tr.querySelector('[data-daily-decline-other]')?.value.trim()||''};});
    if(!await verifyMotiveDriversForWork())return;const priorRows=state.dispatch.dailyBoards?.[date]?.rows||[];const inactive=rows.filter(r=>r.dispatchStatus==='accepted'&&!dispatchDriverIsActive(dispatchDriver(r.driverId))&&!priorRows.some(old=>old.routeId===r.routeId&&old.callStatus===r.callStatus&&old.dispatchStatus===r.dispatchStatus&&old.driverId===r.driverId));if(inactive.length){showAlert('An accepted route uses an inactive or unverified Motive driver. Choose an active driver before saving.','warning');return;}
    const missing=rows.filter(r=>r.dispatchStatus==='accepted'&&!r.driverId);if(missing.length){showAlert(`Assign a driver to every accepted route. ${missing.length} accepted route${missing.length===1?' is':'s are'} missing a driver.`,'warning');return;}
    const incomplete=rows.filter(r=>r.dispatchStatus==='declined'&&(!r.declineReason||(r.declineReason==='driver_unavailable'&&!r.declineDriverId)||(r.declineReason==='truck_unavailable'&&!r.declineTractorId)||(r.declineReason==='other'&&!r.declineOther)));if(incomplete.length){showAlert(`Complete the decline reason and required detail for ${incomplete.length} declined route${incomplete.length===1?'':'s'}.`,'warning');return;}
    const board={date,rows,savedAt:new Date().toISOString()};state.dispatch.dailyBoards={...(state.dispatch.dailyBoards||{}),[date]:board};let dedicatedSaved=false;
    if(cloudConnected()&&state.cloud?.structured?.dailyDispatch&&window.NBLCloud?.saveDailyDispatchBoard){try{await window.NBLCloud.saveDailyDispatchBoard(state.cloud.organization.id,board);dedicatedSaved=true;}catch(err){console.error('Dedicated Daily Dispatch save failed',err);showAlert(`Could not save Daily Dispatch: ${escapeHtml(err.message||String(err))}`,'error');return;}}
    const snapshotSaved=await saveDispatchData(true);if(cloudConnected()&&!dedicatedSaved&&!snapshotSaved){showAlert('Daily Dispatch could not be saved to NBL Cloud. Run the v108 Supabase setup before trying again.','error');return;}renderDailyDispatch();setScreen('daily-dispatch');const declines=rows.filter(r=>r.dispatchStatus==='declined').length;showAlert(`Daily dispatch saved for <strong>${fmtDate(date)}</strong> • ${declines} decline${declines===1?'':'s'}.`,'success');
  }
  function exportDispatchExcel(){const subset=dispatchSubsetForActiveLocation();if(!subset.runs.length){showAlert('There are no runs at this location to export.','warning');return;}try{const safe=dispatchActiveLocationName().replace(/[^a-z0-9]+/gi,'_').replace(/^_|_$/g,'');const name=`NBL_${safe}_Team_Run_Coverage_${todayIso()}.xlsx`;downloadBlob(Core.makeDispatchXlsx(subset,DISPATCH_DAYS),name,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');showAlert(`${escapeHtml(dispatchActiveLocationName())} team run coverage workbook exported. Financial information is excluded.`,'success');}catch(err){console.error(err);showAlert('Could not export the team run coverage workbook: '+err.message,'error');}}
  function dispatchWrapCanvasText(ctx,text,maxWidth,maxLines=2){const words=String(text||'').split(/\s+/),lines=[];let line='';for(const word of words){const test=line?`${line} ${word}`:word;if(ctx.measureText(test).width<=maxWidth||!line)line=test;else{lines.push(line);line=word;if(lines.length>=maxLines-1)break;}}if(line&&lines.length<maxLines)lines.push(line);if(lines.length===maxLines&&words.join(' ').length>lines.join(' ').length)lines[maxLines-1]=lines[maxLines-1].replace(/[. ]*$/,'')+'…';return lines;}
  async function renderDispatchScheduleCanvas(planLabel=''){
    const runs=dispatchRuns(),drivers=dispatchDriversForLocation(),st=dispatchCoverageStats(),econ=dispatchEconomics(),canvas=document.createElement('canvas');
    canvas.width=1900;canvas.height=Math.max(1280,470+runs.length*136+drivers.length*22);
    const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#35164E';ctx.fillRect(0,0,canvas.width,122);ctx.fillStyle='#F15A24';ctx.fillRect(0,122,canvas.width,8);
    ctx.fillStyle='#ffffff';ctx.font='bold 34px Arial';ctx.fillText('NBL BUSINESS ANALYZER',58,52);ctx.font='bold 26px Arial';ctx.fillText(`${dispatchActiveLocationName()} Run Coverage${planLabel?` — ${planLabel}`:''}`,58,91);
    ctx.font='16px Arial';ctx.textAlign='right';ctx.fillText(`Generated ${new Date().toLocaleDateString()}`,1835,75);ctx.textAlign='left';
    const left=44,top=172,runW=400,colW=207,rowH=136,headerH=72,tableW=runW+7*colW;
    ctx.fillStyle='#F8F5FA';ctx.fillRect(left,top,tableW,headerH);ctx.strokeStyle='#D9CFDE';ctx.lineWidth=1;ctx.strokeRect(left,top,tableW,headerH+rowH*runs.length);
    ctx.font='bold 17px Arial';ctx.fillStyle='#35164E';ctx.fillText('Run / Origin / Tractor / Coverage',left+14,top+31);ctx.font='11px Arial';ctx.fillStyle='#7C7182';ctx.fillText('Same coverage view as the Dispatch board',left+14,top+51);
    for(let day=0;day<7;day++){
      const x=left+runW+day*colW,d=st.perDay[day];ctx.strokeStyle='#D9CFDE';ctx.strokeRect(x,top,colW,headerH);ctx.textAlign='center';ctx.fillStyle='#35164E';ctx.font='bold 16px Arial';ctx.fillText(DISPATCH_DAYS[day],x+colW/2,top+29);ctx.font='bold 11px Arial';ctx.fillStyle=d&&d.covered===d.required?'#24764E':'#A12E2E';ctx.fillText(`${d?.covered||0}/${d?.required||0} covered`,x+colW/2,top+51);
    }
    ctx.textAlign='left';
    for(let r=0;r<runs.length;r++){
      const run=runs[r],re=econ.runs.find(x=>x.run.id===run.id),y=top+headerH+r*rowH;
      ctx.fillStyle=run.type==='assigned'?'#F4EEF8':run.type==='spot'?'#EEF6FF':'#FFF4EC';ctx.fillRect(left,y,runW,rowH);ctx.strokeStyle='#E2D9E5';ctx.strokeRect(left,y,runW,rowH);
      ctx.fillStyle='#35164E';ctx.font='bold 17px Arial';dispatchWrapCanvasText(ctx,run.name,runW-28,1).forEach((line,i)=>ctx.fillText(line,left+14,y+24+i*19));
      ctx.font='11px Arial';ctx.fillStyle='#6F6574';ctx.fillText(`${run.origin} • ${run.scheduleLabel}`,left+14,y+47);
      ctx.font='bold 10px Arial';ctx.fillStyle=run.type==='assigned'?'#6A3B7C':run.type==='spot'?'#2866A3':'#B45120';ctx.fillText(run.type==='assigned'?'ASSIGNED RUN':run.type==='spot'?'SPOT RUN':'UNASSIGNED RUN',left+14,y+66);
      const assignedTractor=run.primaryTractorId?dispatchTractor(run.primaryTractorId):null,miles=dispatchRunMiles(run);
      ctx.font='11px Arial';ctx.fillStyle='#4D4651';ctx.fillText(`Tractor: ${assignedTractor?.tractorNumber||'—'}`,left+14,y+86);
      ctx.fillText(`${miles==null?'Miles: —':`Miles: ${Math.round(miles)}`}`,left+14,y+104);
      ctx.fillText(`${re?.coveredDays||0}/${re?.scheduledDays||0} days covered`,left+14,y+122);
      for(let day=0;day<7;day++){
        const x=left+runW+day*colW,active=(run.days||[]).map(Number).includes(day);ctx.strokeStyle='#E2D9E5';ctx.strokeRect(x,y,colW,rowH);
        if(!active){ctx.fillStyle='#F7F7F8';ctx.fillRect(x+1,y+1,colW-2,rowH-2);ctx.fillStyle='#BBB6BE';ctx.font='bold 18px Arial';ctx.textAlign='center';ctx.fillText('—',x+colW/2,y+70);ctx.textAlign='left';continue;}
        const a=dispatchAssignment(run.id,day),driver=a?dispatchDriver(a.driverId):null;
        if(!a){ctx.fillStyle='#FFF5F5';ctx.fillRect(x+1,y+1,colW-2,rowH-2);ctx.fillStyle='#BD3C3C';ctx.font='bold 15px Arial';ctx.textAlign='center';ctx.fillText('OPEN',x+colW/2,y+61);ctx.font='10px Arial';ctx.fillText('UNASSIGNED RUN-DAY',x+colW/2,y+81);ctx.textAlign='left';continue;}
        const primary=run.primaryDriverId===a.driverId,scheduleWarn=!dispatchDriverAvailable(driver,day),locationWarn=!!driver&&dispatchDriverLocationId(driver)!==(run.locationId||dispatchActiveLocationId()),originWarn=!dispatchOriginAllowed(driver,run),warn=!!(a.override||scheduleWarn||locationWarn||originWarn),note=scheduleWarn?'Outside regular schedule':(locationWarn?`Assigned to ${dispatchDriverLocationName(driver)}`:(originWarn?'Origin override':(primary?'Primary assignment':'Manual assignment')));
        ctx.fillStyle=warn?'#FFF7E5':(primary?'#F4EEF8':'#EEF8F3');ctx.fillRect(x+1,y+1,colW-2,rowH-2);
        if(warn&&scheduleWarn){ctx.strokeStyle='#E7A400';ctx.lineWidth=3;ctx.strokeRect(x+3,y+3,colW-6,rowH-6);ctx.lineWidth=1;}
        ctx.fillStyle='#2F3540';ctx.font='bold 13px Arial';ctx.textAlign='center';const lines=dispatchWrapCanvasText(ctx,driver?.name||a.driverId,colW-18,3);lines.forEach((line,i)=>ctx.fillText(line,x+colW/2,y+43+i*17));
        ctx.font='bold 9px Arial';ctx.fillStyle='#66727E';ctx.fillText(String(note).toUpperCase(),x+colW/2,y+102);if(driver?.fedexId){ctx.font='9px Arial';ctx.fillText(`FedEx ${driver.fedexId}`,x+colW/2,y+119);}ctx.textAlign='left';
      }
    }
    const infoY=top+headerH+rowH*runs.length+34;
    ctx.fillStyle='#35164E';ctx.font='bold 18px Arial';ctx.fillText('Coverage Color Key',left,infoY);
    const legend=[['#F4EEF8','Primary assignment'],['#EEF8F3','Manual assignment'],['#FFF7E5','Warning / override'],['#FFF5F5','Open'],['#F7F7F8','Not scheduled']];let lx=left,ly=infoY+19;ctx.font='11px Arial';for(const [fill,label] of legend){ctx.fillStyle=fill;ctx.fillRect(lx,ly,22,16);ctx.strokeStyle='#D9CFDE';ctx.strokeRect(lx,ly,22,16);ctx.fillStyle='#4D4651';ctx.fillText(label,lx+29,ly+13);lx+=label.length*6.1+62;}
    ctx.fillStyle='#35164E';ctx.font='bold 18px Arial';ctx.fillText('Driver Availability',left,infoY+65);ctx.font='12px Arial';ctx.fillStyle='#4D4651';let yy=infoY+90;for(const d of drivers){ctx.fillText(`${d.name}${d.fedexId?` (${d.fedexId})`:''}: ${d.availabilityLabel}`,left,yy);yy+=20;}
    ctx.fillStyle='#35164E';ctx.font='bold 15px Arial';ctx.fillText(`Coverage: ${st.covered}/${st.required} (${Math.round(st.coverage*100)}%)`,1390,infoY+65);ctx.fillStyle=st.open?'#A12E2E':'#24764E';ctx.fillText(`Open run assignments: ${st.open}`,1390,infoY+89);ctx.fillStyle='#7A707F';ctx.font='11px Arial';ctx.fillText('Team-facing export contains scheduling and assignment information only.',1390,infoY+113);
    return canvas;
  }
  function jpegPagesToPdfLandscape(jpegs,widthPx=1754,heightPx=1240){
    const pages=(jpegs||[]).map(p=>p&&p.bytes?{bytes:p.bytes,width:Number(p.width)||widthPx,height:Number(p.height)||heightPx}:{bytes:p,width:widthPx,height:heightPx});
    const parts=[],offsets=[0];let length=0;const push=b=>{const u=typeof b==='string'?asciiBytes(b):b;parts.push(u);length+=u.length;};push('%PDF-1.4\n%NBL\n');const totalObjects=2+pages.length*3;const obj=(id,bodyParts)=>{offsets[id]=length;push(`${id} 0 obj\n`);for(const b of bodyParts)push(b);push('\nendobj\n');};obj(1,['<< /Type /Catalog /Pages 2 0 R >>']);const kids=pages.map((_,i)=>`${3+i*3} 0 R`).join(' ');obj(2,[`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`]);pages.forEach((page,i)=>{const jpg=page.bytes,pageId=3+i*3,imageId=pageId+1,contentId=pageId+2;obj(pageId,[`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 841.89 595.28] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`]);offsets[imageId]=length;push(`${imageId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`);push(jpg);push('\nendstream\nendobj\n');const content='q\n841.89 0 0 595.28 0 0 cm\n/Im0 Do\nQ\n';obj(contentId,[`<< /Length ${content.length} >>\nstream\n${content}endstream`]);});const xrefOffset=length;push(`xref\n0 ${totalObjects+1}\n0000000000 65535 f \n`);for(let i=1;i<=totalObjects;i++)push(`${String(offsets[i]||0).padStart(10,'0')} 00000 n \n`);push(`trailer\n<< /Size ${totalObjects+1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);return concatBytes(parts);
  }
  async function exportAllSavedDispatchPlansPdf(){
    const plans=dispatchSavedPlans(); if(!plans.length){showAlert('Save at least one dispatch table for this location before exporting all plans.','warning');return;}
    const locationId=dispatchActiveLocationId(),locationName=dispatchActiveLocationName(),originalActive=state.dispatch.activeLocationId,originalRuns=dispatchClone(state.dispatch.runs||[]),originalAssignments=dispatchClone(state.dispatch.assignments||[]),originalLocationRunIds=new Set(originalRuns.filter(r=>(r.locationId||'nashville')===locationId).map(r=>r.id)),outsideRuns=originalRuns.filter(r=>(r.locationId||'nashville')!==locationId),outsideAssignments=originalAssignments.filter(a=>!originalLocationRunIds.has(a.runId));
    const pages=[];
    try{
      for(const plan of plans){state.dispatch.activeLocationId=locationId;state.dispatch.runs=[...dispatchClone(outsideRuns),...dispatchClone(plan.runs||[])];state.dispatch.assignments=[...dispatchClone(outsideAssignments),...dispatchClone(plan.assignments||[])];const canvas=await renderDispatchScheduleCanvas(plan.name),jpg=await canvasJpegBytes(canvas);pages.push({bytes:jpg,width:canvas.width,height:canvas.height});}
    } finally {state.dispatch.activeLocationId=originalActive;state.dispatch.runs=originalRuns;state.dispatch.assignments=originalAssignments;renderDispatch();}
    const pdf=jpegPagesToPdfLandscape(pages),safe=locationName.replace(/[^a-z0-9]+/gi,'_').replace(/^_|_$/g,''),name=`NBL_${safe}_Saved_Dispatch_Plans_${todayIso()}.pdf`;
    if(state.directoryHandle&&await requestPermission(state.directoryHandle,'readwrite')){try{const dir=await state.directoryHandle.getDirectoryHandle('Dispatch',{create:true}),ex=await dir.getDirectoryHandle('Exports',{create:true});await writeFile(ex,name,pdf,'application/pdf');}catch(err){console.warn('Could not save saved-plans PDF to data folder',err);}}
    downloadBlob(pdf,name,'application/pdf');showAlert(`<strong>${plans.length}</strong> saved ${escapeHtml(locationName)} dispatch table${plans.length===1?'':'s'} exported in one PDF, one table per page.`,'success');
  }
  async function exportDispatchTeamPdf(){try{if(!dispatchRuns().length){showAlert('There are no runs at this location to export.','warning');return;}const canvas=await renderDispatchScheduleCanvas(),jpg=await canvasJpegBytes(canvas),pdf=jpegPagesToPdfLandscape([jpg],canvas.width,canvas.height),safe=dispatchActiveLocationName().replace(/[^a-z0-9]+/gi,'_').replace(/^_|_$/g,''),name=`NBL_${safe}_Team_Dispatch_Schedule_${todayIso()}.pdf`;if(state.directoryHandle&&await requestPermission(state.directoryHandle,'readwrite')){try{const dir=await state.directoryHandle.getDirectoryHandle('Dispatch',{create:true}),ex=await dir.getDirectoryHandle('Exports',{create:true});await writeFile(ex,name,pdf,'application/pdf');}catch(err){console.warn('Could not save dispatch PDF to data folder',err);}}downloadBlob(pdf,name,'application/pdf');showAlert(`${escapeHtml(dispatchActiveLocationName())} team run coverage PDF exported. Financial information is excluded.`,'success');}catch(err){console.error(err);showAlert('Could not export the team dispatch PDF: '+err.message,'error');}}

  const PM_INTERVALS={PM1:25000,PM2:100000};
  const PM_SCOPES={
    PM1:'Oil change • Filters change • Tractor inspection',
    PM2:'All PM1 work • All systems fluid flush',
    OTHER:'Repair or maintenance work outside the scheduled PM1 / PM2 plans'
  };
  function uid(prefix='id') { return `${prefix}_${(crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(16).slice(2)}`)}`; }
  function todayIso(){ return isoLocal(new Date()); }
  function normalizeTractor(v){ return String(v||'').trim().replace(/^0+(?=\d)/,''); }
  function typeLabel(type){ return type==='PM1'?'PM1':type==='PM2'?'PM2':'Other'; }
  function round0(n){ return Math.round(Number(n)||0); }
  function fmtWeeks(n){
    if(n==null || !Number.isFinite(n)) return '—';
    if(n<0) return `${Math.abs(n).toFixed(1)} wk overdue`;
    if(n<0.1) return '< 0.1 wk';
    return `${n.toFixed(1)} wk`;
  }

  async function loadMaintenanceData() {
    if(!state.directoryHandle) return;
    let data={version:3,tractors:[],records:[],faultCodes:[],tasks:[],faultQuery:{tractorNumber:'',startDate:'',endDate:'',loadedAt:null}};
    try {
      const dir=await state.directoryHandle.getDirectoryHandle('Maintenance');
      const fh=await dir.getFileHandle('maintenance_data.json');
      const file=await fh.getFile();
      const parsed=JSON.parse(await file.text());
      if(parsed && Array.isArray(parsed.tractors) && Array.isArray(parsed.records)) data={version:3,tasks:[],...parsed,faultCodes:[],faultQuery:{tractorNumber:'',startDate:'',endDate:'',loadedAt:null}};
    } catch(err) {
      if(err && err.name!=='NotFoundError') console.warn('Could not load maintenance data',err);
    }
    state.maintenance=data;
    state.maintenanceLoaded=true;
    renderMaintenance();
    renderIvmr();
  }

  async function saveMaintenanceData(silent=true) {
    const cloudSaved=cloudConnected()?await saveCloudModule('maintenance',true):false;
    if(!state.directoryHandle){ if(!silent&&cloudSaved) showAlert('Maintenance data saved to NBL Cloud.','success'); return cloudSaved; }
    if(!(await requestPermission(state.directoryHandle,'readwrite'))) {
      if(!silent) showAlert('Folder write permission is required to save maintenance data.','error');
      return false;
    }
    try {
      const dir=await state.directoryHandle.getDirectoryHandle('Maintenance',{create:true});
      const payload={...state.maintenance,updatedAt:new Date().toISOString()};
      await writeFile(dir,'maintenance_data.json',JSON.stringify(payload,null,2),'application/json');
      if(!silent) showAlert(`Maintenance data saved to <strong>${escapeHtml(state.directoryHandle.name)}/Maintenance</strong>.`,'success');
      return true;
    } catch(err) {
      console.error(err);
      if(!silent) showAlert('Could not save maintenance data: '+err.message,'error');
      return false;
    }
  }

  const MAINTENANCE_PRIORITY_ORDER={Critical:0,High:1,Medium:2,Low:3};
  function faultGuidance(f){
    const severity=String(f.severity||'Unclassified').toLowerCase(), recurring=Number(f.occurrenceCount||0)>=3||String(f.type||'').toLowerCase()==='constant';
    let priority='Medium', restriction='N', action='Have a qualified technician diagnose the fault before relying on continued operation.';
    if(severity==='critical'){priority='Critical';restriction='Y';action='Do not dispatch. Stop safely and arrange immediate technician review.';}
    else if(severity==='high'){priority='High';restriction='Y';action='Inspect before the next dispatch and schedule prompt technician service.';}
    else if(severity==='low'){priority='Low';action='Monitor and inspect at the next planned service.';}
    if(recurring) action+=' Repeated observations require escalation and root-cause review.';
    return {priority,restriction,action};
  }
  function renderFaultCodes(){
    if(!$('faultCodesTable')) return;
    initializeFaultDateRange();
    const filter=$('faultStatusFilter')?.value||'all', selected=$('faultTractorFilter')?.value||'', all=[...(state.maintenance.faultCodes||[])];
    const tractorNumbers=[...new Set([...(state.maintenance.tractors||[]).map(x=>normalizeTractor(x.tractorNumber)),...(state.motive.vehicles||[]).map(x=>normalizeTractor(x.number))].filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
    if($('faultTractorFilter')){const prior=selected||state.maintenance.faultQuery?.tractorNumber||'';$('faultTractorFilter').innerHTML='<option value="">Select tractor</option>'+tractorNumbers.map(n=>`<option value="${escapeHtml(n)}">Tractor ${escapeHtml(n)}</option>`).join('');$('faultTractorFilter').value=tractorNumbers.includes(prior)?prior:'';}
    const activeTractor=$('faultTractorFilter')?.value||'';
    const fq=state.maintenance.faultQuery||{};
    if($('faultLastRefreshed'))$('faultLastRefreshed').textContent=fq.loadedAt?`Last loaded ${new Date(fq.loadedAt).toLocaleString()} • ${fmtDate(fq.startDate)} to ${fmtDate(fq.endDate)}`:'Not loaded';
    const tractorScope=all.filter(x=>!activeTractor||normalizeTractor(x.vehicle?.number)===activeTractor);
    const rows=tractorScope.filter(x=>filter==='all'||String(x.status).toLowerCase()===filter).sort((a,b)=>(MAINTENANCE_PRIORITY_ORDER[faultGuidance(a).priority]-MAINTENANCE_PRIORITY_ORDER[faultGuidance(b).priority])||String(b.lastObservedAt||'').localeCompare(String(a.lastObservedAt||'')));
    const open=tractorScope.filter(x=>String(x.status).toLowerCase()!=='closed'), critical=open.filter(x=>faultGuidance(x).priority==='Critical'), high=open.filter(x=>faultGuidance(x).priority==='High');
    $('faultCodeCards').innerHTML=[['Open Faults',open.length,open.length?'warning-card':''],['Critical',critical.length,critical.length?'danger':''],['High',high.length,high.length?'warning-card':''],['Tractors Affected',new Set(open.map(x=>x.vehicle?.number).filter(Boolean)).size,'']].map(x=>`<div class="summary-card ${x[2]}"><span>${x[0]}</span><strong>${fmtNum(x[1])}</strong></div>`).join('');
    const table=$('faultCodesTable'); table.querySelector('thead').innerHTML='<tr>'+['Severity','Tractor','Code','Meaning','Status','Last Seen','Occurrences','Actionable Intelligence','Task'].map(h=>`<th>${h}</th>`).join('')+'</tr>';
    table.querySelector('tbody').innerHTML=rows.length?rows.map(f=>{const g=faultGuidance(f),task=(state.maintenance.tasks||[]).find(x=>x.sourceType==='fault'&&x.sourceId===String(f.id));return `<tr><td><span class="maintenance-severity severity-${g.priority.toLowerCase()}">${escapeHtml(f.severity||'Unclassified')}</span></td><td><strong>${escapeHtml(f.vehicle?.number||'—')}</strong></td><td>${escapeHtml(f.code||'—')}<small>${escapeHtml(f.fmiDescription||'')}</small></td><td>${escapeHtml(f.label||f.description||'—')}</td><td>${escapeHtml(f.status||'—')}</td><td>${escapeHtml(String(f.lastObservedAt||'').replace('T',' ').slice(0,16)||'—')}</td><td>${fmtNum(f.occurrenceCount||f.observations||0)}</td><td class="meeting-notes-cell">${escapeHtml(g.action)}</td><td><button class="table-action" data-task-fault="${escapeHtml(String(f.id))}">${task?'View Task':'Create Task'}</button></td></tr>`}).join(''):`<tr><td colspan="9" class="empty-table-cell">${state.maintenance.faultQuery?.loadedAt?'No faults were returned for the selected tractor and period.':'Select a tractor and click Load Faults.'}</td></tr>`;
  }
  function initializeFaultDateRange(){
    if(!$('faultStartDate')||!$('faultEndDate'))return;
    if(!$('faultEndDate').value)$('faultEndDate').value=todayIso();
    if(!$('faultStartDate').value){const d=new Date(`${todayIso()}T12:00:00`);d.setDate(d.getDate()-6);$('faultStartDate').value=isoLocal(d);}
  }
  async function refreshFaultCodes(){
    if(!state.motive.configured){showAlert('Connect Motive before refreshing fault codes.','warning');return;}
    initializeFaultDateRange();
    const tractorNumber=$('faultTractorFilter')?.value||'',startDate=$('faultStartDate')?.value||'',endDate=$('faultEndDate')?.value||'',status=$('faultStatusFilter')?.value||'all';
    if(!tractorNumber){showAlert('Select a tractor before loading faults.','warning');return;}
    if(!startDate||!endDate||startDate>endDate){showAlert('Choose a valid fault-code date range.','warning');return;}
    const btn=$('refreshFaultCodesBtn'); if(btn){btn.disabled=true;btn.textContent='Loading…';}
    try{const q=new URLSearchParams({tractor_number:tractorNumber,start_date:startDate,end_date:endDate});if(status!=='all')q.set('status',status);const data=await localApi('/api/motive/fault-codes?'+q.toString(),{timeoutMs:120000}),incoming=Array.isArray(data.faultCodes)?data.faultCodes:[];state.maintenance.faultCodes=incoming;state.maintenance.faultQuery={tractorNumber,startDate,endDate,status,loadedAt:new Date().toISOString()};if(cloudConnected()&&window.NBLCloud?.saveMaintenanceFaults)await window.NBLCloud.saveMaintenanceFaults(state.cloud.organization.id,incoming);if(state.directoryHandle)await saveMaintenanceData(true);renderFaultCodes();showAlert(`Loaded <strong>${incoming.length}</strong> fault record${incoming.length===1?'':'s'} for tractor <strong>${escapeHtml(tractorNumber)}</strong>.`,'success');}catch(err){showAlert(`Could not load Motive fault codes: ${escapeHtml(err.message)}`,'error');}finally{if(btn){btn.disabled=false;btn.textContent='Load Faults';}}
  }
  function openMaintenanceTaskModal(id='',prefill={}){
    const r=id?(state.maintenance.tasks||[]).find(x=>x.id===id):null;
    $('maintenanceTaskEditId').value=r?.id||'';$('maintenanceTaskSourceType').value=r?.sourceType||prefill.sourceType||'manual';$('maintenanceTaskSourceId').value=r?.sourceId||prefill.sourceId||'';
    $('maintenanceTaskModalTitle').textContent=r?'Edit Maintenance Task':'Add Maintenance Task';$('maintenanceTaskTitle').value=r?.title||prefill.title||'';$('maintenanceTaskTractor').value=r?.tractorNumber||prefill.tractorNumber||'';$('maintenanceTaskPriority').value=r?.priority||prefill.priority||'Medium';$('maintenanceTaskAssignee').value=r?.assignedTo||'';$('maintenanceTaskDueDate').value=r?.dueDate||prefill.dueDate||'';$('maintenanceTaskStatus').value=r?.status||'New';$('maintenanceTaskDoNotDispatch').value=r?.doNotDispatch||prefill.doNotDispatch||'N';$('maintenanceTaskNotes').value=r?.notes||prefill.notes||'';$('maintenanceTaskModal').classList.remove('hidden');
  }
  async function saveMaintenanceTaskFromForm(e){
    e.preventDefault();const id=$('maintenanceTaskEditId').value,existing=id?(state.maintenance.tasks||[]).find(x=>x.id===id):null,now=new Date().toISOString(),status=$('maintenanceTaskStatus').value;
    const task={id:existing?.id||uid('maint_task'),title:String($('maintenanceTaskTitle').value||'').trim(),tractorNumber:normalizeTractor($('maintenanceTaskTractor').value),priority:$('maintenanceTaskPriority').value,assignedTo:String($('maintenanceTaskAssignee').value||'').trim(),dueDate:$('maintenanceTaskDueDate').value,status,doNotDispatch:$('maintenanceTaskDoNotDispatch').value,notes:String($('maintenanceTaskNotes').value||'').trim(),sourceType:$('maintenanceTaskSourceType').value||'manual',sourceId:$('maintenanceTaskSourceId').value||'',createdAt:existing?.createdAt||now,updatedAt:now,completedAt:status==='Completed'?(existing?.completedAt||now):''};
    state.maintenance.tasks=state.maintenance.tasks||[];if(existing)Object.assign(existing,task);else state.maintenance.tasks.push(task);await saveMaintenanceData(true);closeModal('maintenanceTaskModal');renderMaintenanceTasks();renderTripInspections();renderFaultCodes();setScreen('maintenance-tasks');showAlert(`Maintenance task <strong>${escapeHtml(task.title)}</strong> saved.`,'success');
  }
  function renderMaintenanceTasks(){
    if(!$('maintenanceTasksTable'))return;const filter=$('maintenanceTaskStatusFilter')?.value||'open',today=todayIso(),all=[...(state.maintenance.tasks||[])],rows=all.filter(x=>filter==='all'||(filter==='open'?x.status!=='Completed':x.status===filter)).sort((a,b)=>(a.status==='Completed')-(b.status==='Completed')||(MAINTENANCE_PRIORITY_ORDER[a.priority]??9)-(MAINTENANCE_PRIORITY_ORDER[b.priority]??9)||String(a.dueDate||'9999').localeCompare(String(b.dueDate||'9999')));
    const open=all.filter(x=>x.status!=='Completed'),overdue=open.filter(x=>x.dueDate&&x.dueDate<today),restricted=open.filter(x=>x.doNotDispatch==='Y');$('maintenanceTaskCards').innerHTML=[['Open Tasks',open.length,open.length?'warning-card':''],['Overdue',overdue.length,overdue.length?'danger':''],['Do Not Dispatch',restricted.length,restricted.length?'danger':''],['Completed',all.length-open.length,'']].map(x=>`<div class="summary-card ${x[2]}"><span>${x[0]}</span><strong>${fmtNum(x[1])}</strong></div>`).join('');
    const table=$('maintenanceTasksTable');table.querySelector('thead').innerHTML='<tr>'+['Priority','Task','Tractor','Source','Assigned To','Due','Status','Restriction','Actions'].map(h=>`<th>${h}</th>`).join('')+'</tr>';table.querySelector('tbody').innerHTML=rows.length?rows.map(t=>`<tr class="${t.status==='Completed'?'resolved-row':''} ${t.status!=='Completed'&&t.dueDate&&t.dueDate<today?'overdue-meeting-row':''}"><td><span class="maintenance-severity severity-${String(t.priority).toLowerCase()}">${escapeHtml(t.priority)}</span></td><td><strong>${escapeHtml(t.title)}</strong><small>${escapeHtml(t.notes||'')}</small></td><td>${escapeHtml(t.tractorNumber||'—')}</td><td>${escapeHtml(t.sourceType==='fault'?'Motive fault':t.sourceType==='inspection'?'Trip inspection':'Manual')}</td><td>${escapeHtml(t.assignedTo||'Unassigned')}</td><td>${fmtDate(t.dueDate)}</td><td>${escapeHtml(t.status)}</td><td>${t.doNotDispatch==='Y'?'<span class="status-pill no">Do not dispatch</span>':'—'}</td><td><div class="row-actions"><button class="table-action" data-edit-maint-task="${t.id}">Edit</button><button class="table-action danger-link" data-delete-maint-task="${t.id}">Delete</button></div></td></tr>`).join(''):'<tr><td colspan="9" class="empty-table-cell">No maintenance tasks match this view.</td></tr>';
  }
  function taskFromInspection(id){const r=state.meetings.inspections.find(x=>x.id===id);if(!r)return;const existing=(state.maintenance.tasks||[]).find(x=>x.sourceType==='inspection'&&x.sourceId===id);if(existing)return openMaintenanceTaskModal(existing.id);openMaintenanceTaskModal('',{sourceType:'inspection',sourceId:id,title:`Inspect and repair: ${r.issue}`,tractorNumber:r.tractorNumber,priority:String(r.priority)==='1'?'High':String(r.priority)==='2'?'Medium':'Low',doNotDispatch:String(r.priority)==='1'?'Y':'N',notes:`Reported by ${r.driverName||'driver'} on ${r.date||todayIso()}. ${r.issue}`});}
  function taskFromFault(id){const f=(state.maintenance.faultCodes||[]).find(x=>String(x.id)===String(id));if(!f)return;const existing=(state.maintenance.tasks||[]).find(x=>x.sourceType==='fault'&&x.sourceId===String(id));if(existing)return openMaintenanceTaskModal(existing.id);const g=faultGuidance(f);openMaintenanceTaskModal('',{sourceType:'fault',sourceId:String(id),title:`Diagnose ${f.code||'fault'} — ${f.label||f.description||'Motive alert'}`,tractorNumber:f.vehicle?.number||'',priority:g.priority,doNotDispatch:g.restriction,notes:g.action});}
  async function deleteMaintenanceTask(id){const t=(state.maintenance.tasks||[]).find(x=>x.id===id);if(!t||!confirm(`Delete maintenance task "${t.title}"?`))return;state.maintenance.tasks=state.maintenance.tasks.filter(x=>x.id!==id);await saveMaintenanceData(true);renderMaintenanceTasks();renderTripInspections();renderFaultCodes();}

  function allVehicleTrips(tractorNumber) {
    const target=normalizeTractor(tractorNumber), seen=new Set(), trips=[];
    if(!target) return trips;
    for(const item of state.catalog) {
      for(const [kind,list] of [['L',item.result.linehaul],['S',item.result.spots]]) {
        for(const trip of list) {
          if(normalizeTractor(trip.vehicle)!==target) continue;
          const key=`${kind}|${target}|${trip.date}|${trip.trip}`;
          if(seen.has(key)) continue;
          seen.add(key);
          const d=parseFlexibleDate(trip.date);
          trips.push({kind,settlementDate:item.settlementDate,tripDate:d?isoLocal(d):'',miles:Number(trip.miles)||0,trip:trip.trip});
        }
      }
    }
    return trips;
  }

  function tractorMileageStats(tractor) {
    const trips=allVehicleTrips(tractor.tractorNumber);
    const weekDates=[...new Set(state.catalog.map(x=>x.settlementDate).filter(Boolean))].sort();
    const byWeek=new Map();
    for(const t of trips) byWeek.set(t.settlementDate,(byWeek.get(t.settlementDate)||0)+t.miles);
    const activeDates=[...byWeek.entries()].filter(([,m])=>m>0).map(([d])=>d).sort();
    let averageMilesPerWeek=0, weeksObserved=0;
    if(activeDates.length) {
      const first=activeDates[0];
      const observed=weekDates.filter(d=>d>=first);
      weeksObserved=observed.length;
      const total=observed.reduce((sum,d)=>sum+(byWeek.get(d)||0),0);
      averageMilesPerWeek=weeksObserved ? total/weeksObserved : 0;
    }
    const asOf=tractor.mileageAsOf || '';
    const milesAfterBaseline=trips.reduce((sum,t)=>sum+(t.tripDate && asOf && t.tripDate>asOf ? t.miles : 0),0);
    const motiveMileage=Number(tractor.motiveMileage)||0;
    return {
      averageMilesPerWeek,
      weeksObserved,
      motiveMileage,
      milesAfterBaseline,
      estimatedMileage:round0(motiveMileage+milesAfterBaseline),
      settlementMiles:round0(trips.reduce((s,t)=>s+t.miles,0))
    };
  }

  function lastRecord(records, types) {
    const eligible=records.filter(r=>types.includes(r.type) && Number.isFinite(Number(r.odometer)));
    eligible.sort((a,b)=>(Number(b.odometer)-Number(a.odometer)) || String(b.serviceDate||'').localeCompare(String(a.serviceDate||'')));
    return eligible[0] || null;
  }

  function tractorPMStatus(tractor) {
    const mileage=tractorMileageStats(tractor);
    const records=state.maintenance.records.filter(r=>r.tractorId===tractor.id);
    const lastPM1=lastRecord(records,['PM1','PM2']);
    const lastPM2=lastRecord(records,['PM2']);
    const nextPM1=lastPM1 ? Number(lastPM1.odometer)+PM_INTERVALS.PM1 : null;
    const nextPM2=lastPM2 ? Number(lastPM2.odometer)+PM_INTERVALS.PM2 : null;
    let nextType='', dueMileage=null, baselineNeeded=false;
    if(nextPM1!=null && nextPM2!=null) {
      if(nextPM2<=nextPM1) { nextType='PM2'; dueMileage=nextPM2; }
      else { nextType='PM1'; dueMileage=nextPM1; }
    } else if(nextPM1!=null) {
      nextType='PM1'; dueMileage=nextPM1; baselineNeeded=!lastPM2;
    } else if(nextPM2!=null) {
      nextType='PM1'; dueMileage=Number(lastPM2.odometer)+PM_INTERVALS.PM1;
    } else baselineNeeded=true;
    const milesRemaining=dueMileage==null ? null : round0(dueMileage-mileage.estimatedMileage);
    const weeksRemaining=dueMileage==null || mileage.averageMilesPerWeek<=0 ? null : milesRemaining/mileage.averageMilesPerWeek;
    let status='baseline';
    if(dueMileage!=null) {
      if(milesRemaining<0) status='overdue';
      else if((weeksRemaining!=null && weeksRemaining<=4) || milesRemaining<=5000) status='due-soon';
      else status='ok';
    }
    return {tractor,mileage,records,lastPM1,lastPM2,nextType,dueMileage,milesRemaining,weeksRemaining,status,baselineNeeded};
  }

  function maintenanceStatuses(){
    return state.maintenance.tractors.map(tractorPMStatus).sort((a,b)=>{
      const rank={overdue:0,'due-soon':1,baseline:2,ok:3};
      return (rank[a.status]-rank[b.status]) || ((a.weeksRemaining??99999)-(b.weeksRemaining??99999)) || String(a.tractor.tractorNumber).localeCompare(String(b.tractor.tractorNumber),undefined,{numeric:true});
    });
  }

  function statusPill(status) {
    if(status==='overdue') return '<span class="status-pill overdue">Past Due</span>';
    if(status==='due-soon') return '<span class="status-pill due-soon">Due Soon</span>';
    if(status==='ok') return '<span class="status-pill ok">On Track</span>';
    return '<span class="status-pill baseline">PM Baseline Needed</span>';
  }

  function renderMaintenance() {
    if(!$('maintenanceScreen') || !hasWorkspace()) return;
    const statuses=maintenanceStatuses();
    const overdue=statuses.filter(x=>x.status==='overdue').length;
    const dueSoon=statuses.filter(x=>x.status==='due-soon').length;
    const fleetWeekly=round0(statuses.reduce((s,x)=>s+x.mileage.averageMilesPerWeek,0));
    $('maintenanceCards').innerHTML=[
      ['Tractors',fmtNum(statuses.length),''],
      ['Past Due',fmtNum(overdue),overdue?'danger':''],
      ['Due Within ~4 Weeks',fmtNum(dueSoon),dueSoon?'warning-card':''],
      ['Avg Fleet Miles / Week',fmtNum(fleetWeekly),'']
    ].map(x=>`<div class="summary-card ${x[2]}"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
    $('tractorCount').textContent=`${statuses.length} tractor${statuses.length===1?'':'s'}`;

    const table=$('maintenanceStatusTable');
    const headers=['Tractor','Domicile','VIN','Make / Model','Avg Miles / Week','Motive Mileage','Mileage As Of','Est. Current Mileage','Next PM','Due Mileage','Miles Remaining','Weeks Until Due','Status',''];
    table.querySelector('thead').innerHTML='<tr>'+headers.map(h=>`<th>${h}</th>`).join('')+'</tr>';
    if(!statuses.length) {
      table.querySelector('tbody').innerHTML='<tr><td colspan="14" class="empty-table-cell">No tractors have been added yet. Click <strong>Add Tractor</strong> to create the fleet maintenance list.</td></tr>';
    } else {
      table.querySelector('tbody').innerHTML=statuses.map(x=>{
        const t=x.tractor, m=x.mileage;
        const dueText=x.nextType ? `${x.nextType}${x.baselineNeeded && !x.lastPM2 ? '<small>PM2 baseline needed</small>':''}` : '—';
        const weeks=x.dueMileage==null ? 'Record PM history' : (m.averageMilesPerWeek>0 ? fmtWeeks(x.weeksRemaining) : 'No mileage history');
        return `<tr class="maintenance-row ${x.status}"><td><strong>${escapeHtml(t.tractorNumber)}</strong></td><td>${escapeHtml(t.domicile||'—')}</td><td>${escapeHtml(t.vin||'—')}</td><td>${escapeHtml(t.makeModel||'—')}</td><td>${fmtNum(m.averageMilesPerWeek)}</td><td>${fmtNum(m.motiveMileage)}</td><td>${fmtDate(t.mileageAsOf)}</td><td><strong>${fmtNum(m.estimatedMileage)}</strong>${m.milesAfterBaseline?`<small>+${fmtNum(m.milesAfterBaseline)} since Motive reading</small>`:''}</td><td><strong>${dueText}</strong></td><td>${x.dueMileage==null?'—':fmtNum(x.dueMileage)}</td><td class="${x.milesRemaining!=null && x.milesRemaining<0?'negative':''}">${x.milesRemaining==null?'—':fmtNum(x.milesRemaining)}</td><td class="weeks-cell ${x.status==='overdue'?'negative':''}">${weeks}</td><td>${statusPill(x.status)}</td><td><div class="row-actions"><button class="table-action" data-mmr-tractor="${escapeHtml(t.id)}">PDF</button><button class="table-action" data-edit-tractor="${escapeHtml(t.id)}">Edit</button></div></td></tr>`;
      }).join('');
    }

    const options=state.maintenance.tractors.slice().sort((a,b)=>String(a.tractorNumber).localeCompare(String(b.tractorNumber),undefined,{numeric:true})).map(t=>`<option value="${escapeHtml(t.id)}">${escapeHtml(t.tractorNumber)} — ${escapeHtml(t.makeModel||'')}</option>`).join('');
    const currentFilter=$('maintenanceHistoryFilter').value || 'all';
    $('maintenanceHistoryFilter').innerHTML='<option value="all">All tractors</option>'+options;
    if([...$('maintenanceHistoryFilter').options].some(o=>o.value===currentFilter)) $('maintenanceHistoryFilter').value=currentFilter;
    $('maintenanceTractorInput').innerHTML=options || '<option value="">Add a tractor first</option>';
    $('recordMaintenanceBtn').disabled=!state.maintenance.tractors.length;
    if($('generateAllMmrBtn')) $('generateAllMmrBtn').disabled=!state.maintenance.tractors.length;
    if($('mmrMonthInput') && !$('mmrMonthInput').value) $('mmrMonthInput').value=todayIso().slice(0,7);
    if($('mmrCompletedDateInput') && !$('mmrCompletedDateInput').value) $('mmrCompletedDateInput').value=todayIso();
    renderMaintenanceHistory();
    if(state.currentScreen==='maintenance') $('fileMeta').textContent=`${workspaceLabel()} • ${statuses.length} tractor${statuses.length===1?'':'s'} • ${state.catalog.length} settlement${state.catalog.length===1?'':'s'}`;
  }

  function renderMaintenanceHistory() {
    if(!$('maintenanceHistoryTable')) return;
    const filter=$('maintenanceHistoryFilter').value || 'all';
    const tractorMap=Object.fromEntries(state.maintenance.tractors.map(t=>[t.id,t]));
    const records=state.maintenance.records.filter(r=>filter==='all'||r.tractorId===filter).slice().sort((a,b)=>String(b.serviceDate||'').localeCompare(String(a.serviceDate||'')) || Number(b.odometer)-Number(a.odometer));
    const table=$('maintenanceHistoryTable');
    const headers=['Service Date','Tractor','Plan / Repair','Service Type','Odometer','Shop','Mechanic','Standard Scope','Custom Work / Notes','Parts Cost','Labor Cost','Total Cost',''];
    table.querySelector('thead').innerHTML='<tr>'+headers.map(h=>`<th>${h}</th>`).join('')+'</tr>';
    table.querySelector('tbody').innerHTML=records.length ? records.map(r=>{
      const t=tractorMap[r.tractorId];
      return `<tr><td>${fmtDate(r.serviceDate)}</td><td><strong>${escapeHtml(t?.tractorNumber||'Unknown')}</strong></td><td><span class="plan-badge ${String(r.type).toLowerCase()}">${typeLabel(r.type)}</span></td><td>${escapeHtml(r.serviceType||'—')}</td><td>${fmtNum(r.odometer)}</td><td>${escapeHtml(r.shopName||'—')}</td><td>${escapeHtml(r.mechanicName||'—')}</td><td>${escapeHtml(r.scope||PM_SCOPES[r.type]||'—')}</td><td class="notes-cell">${escapeHtml(r.work||'—')}</td><td>${fmtOptionalMoney(r.partsCost)}</td><td>${fmtOptionalMoney(r.laborCost)}</td><td><strong>${fmtOptionalMoney(r.totalCost)}</strong></td><td><button class="table-action danger-link" data-delete-maintenance="${escapeHtml(r.id)}">Delete</button></td></tr>`;
    }).join('') : '<tr><td colspan="13" class="empty-table-cell">No maintenance records have been entered for this selection.</td></tr>';
  }

  function importHeaderKey(v) { return String(v??'').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,''); }
  function excelSerialToIso(v) {
    const n=Number(v); if(!Number.isFinite(n) || n<20000 || n>100000) return '';
    const d=new Date(Date.UTC(1899,11,30)+Math.round(n)*86400000);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
  }
  function normalizeImportedDate(v) {
    const s=String(v??'').trim(); if(!s) return '';
    const serial=excelSerialToIso(s); if(serial) return serial;
    const d=parseFlexibleDate(s); return d?isoLocal(d):'';
  }
  function importedNumber(v) {
    const s=String(v??'').replace(/[$,]/g,'').trim(); if(!s) return null;
    const n=Number(s); return Number.isFinite(n)?round0(n):null;
  }
  function firstImportValue(row, headerIndex, aliases) {
    for(const alias of aliases){ const i=headerIndex.get(importHeaderKey(alias)); if(i!=null && String(row[i]??'').trim()!=='') return row[i]; }
    return '';
  }
  function tractorsFromSpreadsheetRows(rows) {
    if(!Array.isArray(rows) || !rows.length) throw new Error('The spreadsheet is empty.');
    let headerRow=-1, headerIndex=null;
    const tractorAliases=['Tractor Number','Tractor #','Tractor','Unit Number','Unit #','Vehicle Unit #','Vehicle Number'];
    for(let r=0;r<Math.min(rows.length,15);r++){
      const map=new Map((rows[r]||[]).map((v,i)=>[importHeaderKey(v),i]));
      if(tractorAliases.some(a=>map.has(importHeaderKey(a)))) { headerRow=r; headerIndex=map; break; }
    }
    if(headerRow<0) throw new Error('Could not find a Tractor Number column. Use the import template for the supported column names.');
    const out=[];
    for(let r=headerRow+1;r<rows.length;r++){
      const row=rows[r]||[];
      const tractorNumber=normalizeTractor(firstImportValue(row,headerIndex,tractorAliases));
      if(!tractorNumber) continue;
      const vin=String(firstImportValue(row,headerIndex,['VIN','Vehicle Identification Number'])||'').trim().toUpperCase();
      let makeModel=String(firstImportValue(row,headerIndex,['Make / Model','Make Model','Make and Model','Make & Model'])||'').trim();
      if(!makeModel){
        const make=String(firstImportValue(row,headerIndex,['Make'])||'').trim();
        const model=String(firstImportValue(row,headerIndex,['Model'])||'').trim();
        makeModel=[make,model].filter(Boolean).join(' ');
      }
      const domicile=String(firstImportValue(row,headerIndex,['Domicile','Domicile Station / Hub','Domicile Station/Hub','Station / Hub','Station','Hub'])||'').trim();
      if(!domicile) throw new Error(`Domicile is required for every tractor. Missing domicile on spreadsheet row ${r+1} (tractor ${tractorNumber}).`);
      const mileage=importedNumber(firstImportValue(row,headerIndex,['Current Mileage from Motive','Current Mileage','Motive Mileage','Odometer','Current Odometer','Mileage']));
      let mileageAsOf=normalizeImportedDate(firstImportValue(row,headerIndex,['Mileage As Of','Mileage Date','Odometer Date','As Of Date','As Of']));
      if(mileage!=null && !mileageAsOf) mileageAsOf=todayIso();
      out.push({tractorNumber,vin,makeModel,domicile,motiveMileage:mileage,mileageAsOf,sourceRow:r+1});
    }
    if(!out.length) throw new Error('No tractor rows were found below the header.');
    return out;
  }
  function csvSpreadsheetRows(text) { return Core.parseCSV(String(text||'')); }
  function u16le(b,o){ return b[o] | (b[o+1]<<8); }
  function u32le(b,o){ return (b[o] | (b[o+1]<<8) | (b[o+2]<<16) | (b[o+3]<<24)) >>> 0; }
  async function inflateRawBytes(bytes) {
    if(typeof DecompressionStream==='undefined') throw new Error('This browser cannot read compressed Excel files. Use current Chrome/Edge or upload CSV.');
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  async function unzipXlsx(arrayBuffer) {
    const b=new Uint8Array(arrayBuffer); let eocd=-1;
    for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--){ if(u32le(b,i)===0x06054b50){eocd=i;break;} }
    if(eocd<0) throw new Error('This does not appear to be a valid .xlsx file.');
    const total=u16le(b,eocd+10), centralOffset=u32le(b,eocd+16); let p=centralOffset;
    const files=new Map(), td=new TextDecoder('utf-8');
    for(let n=0;n<total;n++){
      if(u32le(b,p)!==0x02014b50) throw new Error('Could not read the Excel workbook directory.');
      const method=u16le(b,p+10), compSize=u32le(b,p+20), nameLen=u16le(b,p+28), extraLen=u16le(b,p+30), commentLen=u16le(b,p+32), localOffset=u32le(b,p+42);
      const name=td.decode(b.slice(p+46,p+46+nameLen));
      if(u32le(b,localOffset)!==0x04034b50) throw new Error('Could not read an Excel workbook entry.');
      const ln=u16le(b,localOffset+26), le=u16le(b,localOffset+28), start=localOffset+30+ln+le;
      const compressed=b.slice(start,start+compSize); let data;
      if(method===0) data=compressed; else if(method===8) data=await inflateRawBytes(compressed); else { p+=46+nameLen+extraLen+commentLen; continue; }
      files.set(name,data); p+=46+nameLen+extraLen+commentLen;
    }
    return files;
  }
  function xmlText(bytes){ return new TextDecoder('utf-8').decode(bytes); }
  function spreadsheetRowsFromXml(sheetText, sharedText='') {
    const parser=new DOMParser(), sheet=parser.parseFromString(sheetText,'application/xml');
    if(sheet.querySelector('parsererror')) throw new Error('Could not parse the first Excel worksheet.');
    const shared=[];
    if(sharedText){
      const sx=parser.parseFromString(sharedText,'application/xml');
      for(const si of sx.getElementsByTagName('si')) shared.push([...si.getElementsByTagName('t')].map(t=>t.textContent||'').join(''));
    }
    const rows=[];
    for(const row of sheet.getElementsByTagName('row')){
      const arr=[];
      for(const c of row.getElementsByTagName('c')){
        const ref=c.getAttribute('r')||''; const m=ref.match(/^([A-Z]+)/i); let col=arr.length;
        if(m){ col=0; for(const ch of m[1].toUpperCase()) col=col*26+(ch.charCodeAt(0)-64); col-=1; }
        const type=c.getAttribute('t')||''; let value='';
        if(type==='inlineStr') value=[...c.getElementsByTagName('t')].map(t=>t.textContent||'').join('');
        else {
          const ve=c.getElementsByTagName('v')[0]; const raw=ve?ve.textContent||'':'';
          value=type==='s' ? (shared[Number(raw)]??'') : raw;
        }
        arr[col]=value;
      }
      rows.push(arr);
    }
    return rows;
  }
  async function xlsxSpreadsheetRows(file) {
    const files=await unzipXlsx(await file.arrayBuffer());
    const sheetName=[...files.keys()].filter(n=>/^xl\/worksheets\/sheet\d+\.xml$/i.test(n)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}))[0];
    if(!sheetName) throw new Error('No worksheet was found in the Excel file.');
    return spreadsheetRowsFromXml(xmlText(files.get(sheetName)), files.has('xl/sharedStrings.xml')?xmlText(files.get('xl/sharedStrings.xml')):'');
  }

  function financialColumnIndex(ref){
    const m=String(ref||'').match(/^([A-Z]+)/i); if(!m) return -1;
    let n=0; for(const ch of m[1].toUpperCase()) n=n*26+ch.charCodeAt(0)-64; return n-1;
  }
  function financialCellGrid(sheetText,sharedText=''){
    const parser=new DOMParser(), sheet=parser.parseFromString(sheetText,'application/xml'), shared=[];
    if(sheet.querySelector('parsererror')) throw new Error('Could not parse the P&L worksheet.');
    if(sharedText){ const sx=parser.parseFromString(sharedText,'application/xml'); for(const si of sx.getElementsByTagName('si')) shared.push([...si.getElementsByTagName('t')].map(t=>t.textContent||'').join('')); }
    const grid=new Map();
    for(const c of sheet.getElementsByTagName('c')){
      const ref=c.getAttribute('r')||'', type=c.getAttribute('t')||'', f=c.getElementsByTagName('f')[0]?.textContent||'';
      let raw='';
      if(type==='inlineStr') raw=[...c.getElementsByTagName('t')].map(t=>t.textContent||'').join('');
      else { const v=c.getElementsByTagName('v')[0]?.textContent||''; raw=type==='s'?(shared[Number(v)]??''):v; }
      grid.set(ref.toUpperCase(),{raw,formula:f});
    }
    return grid;
  }
  function financialEvaluateGrid(grid){
    const memo=new Map(), active=new Set();
    const evalRef=ref=>{
      ref=String(ref).toUpperCase().replace(/\$/g,''); if(memo.has(ref)) return memo.get(ref);
      if(active.has(ref)) return 0; active.add(ref);
      const cell=grid.get(ref); let out=0;
      if(cell){
        const formula=String(cell.formula||'').trim();
        if(formula){
          let expr=formula.replace(/SUM\(\$?([A-Z]+)\$?(\d+):\$?([A-Z]+)\$?(\d+)\)/gi,(_,c1,r1,c2,r2)=>{
            const a=financialColumnIndex(c1),b=financialColumnIndex(c2); let total=0;
            for(let col=Math.min(a,b);col<=Math.max(a,b);col++) for(let row=Math.min(+r1,+r2);row<=Math.max(+r1,+r2);row++) total+=evalRef(`${financialColumnName(col)}${row}`);
            return String(total);
          });
          expr=expr.replace(/\$?([A-Z]+)\$?(\d+)/gi,(_,c,r)=>String(evalRef(`${c}${r}`)));
          if(/^[0-9eE+\-*/().\s]+$/.test(expr)){ try{ out=Number(Function(`"use strict";return (${expr})`)())||0; }catch(_){ out=0; } }
        } else { const n=Number(cell.raw); out=Number.isFinite(n)?n:0; }
      }
      active.delete(ref); memo.set(ref,out); return out;
    };
    return evalRef;
  }
  function financialColumnName(index){ let n=index+1,s=''; while(n){ const r=(n-1)%26;s=String.fromCharCode(65+r)+s;n=Math.floor((n-1)/26); } return s; }
  async function parseFinancialWorkbook(file){
    const files=await unzipXlsx(await file.arrayBuffer());
    const sheetName=[...files.keys()].filter(n=>/^xl\/worksheets\/sheet\d+\.xml$/i.test(n)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}))[0];
    if(!sheetName) throw new Error('No worksheet was found in the Excel workbook.');
    const grid=financialCellGrid(xmlText(files.get(sheetName)),files.has('xl/sharedStrings.xml')?xmlText(files.get('xl/sharedStrings.xml')):'');
    const rowByLabel=new Map();
    for(let row=1;row<=250;row++){ const label=String(grid.get(`A${row}`)?.raw||'').trim(); if(label) rowByLabel.set(label.toLowerCase(),row); }
    const row=(...names)=>{ for(const name of names){ const found=rowByLabel.get(String(name).toLowerCase()); if(found)return found; } return 0; };
    const required={income:row('Total Income'),gross:row('Gross Profit'),operating:row('Net Operating Income'),net:row('Net Income'),driverSalary:row('Driver Salaries'),managementSalary:row('Management Salaries'),driverDeductions:row('Driver Payroll Deductions'),managementDeductions:row('Management Payroll Deductions')};
    if(Object.values(required).some(x=>!x)) throw new Error('The workbook does not match the expected Nashbox weekly P&L layout. Required income, profit, salary, or payroll deduction rows are missing.');
    const rows={...required,incentives:row('Employee Incentives'),health:row('Health insurance & accident plans'),workersComp:row("Workers' compensation insurance"),fuel:row('Trucking - Fuel'),repairsDef:row('Trucking - Repairs/DEF'),vehicleRepairs:row('Trucking - Vehicle Repairs')};
    const evaluate=financialEvaluateGrid(grid), periods=[];
    for(let col=1;col<200;col++){
      const letter=financialColumnName(col), label=String(grid.get(`${letter}5`)?.raw||'').trim();
      if(!label || /^total$/i.test(label)) continue;
      const get=key=>rows[key]?evaluate(`${letter}${rows[key]}`):0;
      const income=get('income'), payroll=get('driverSalary')+get('managementSalary')+get('driverDeductions')+get('managementDeductions');
      const employeeCosts=get('incentives')+get('health')+get('workersComp'), maintenance=get('repairsDef')+get('vehicleRepairs');
      periods.push({label,income,grossProfit:get('gross'),operatingIncome:get('operating'),netIncome:get('net'),payroll,employeeCosts,fuel:get('fuel'),maintenance});
    }
    if(!periods.length) throw new Error('No weekly reporting periods were found in the workbook.');
    return {version:1,fileName:file.name,importedAt:new Date().toISOString(),periods};
  }
  async function importFinancialWorkbook(file){
    if(!file)return;
    try{
      state.financialAnalysis=await parseFinancialWorkbook(file);
      try{ localStorage.setItem('nblFinancialAnalysis',JSON.stringify(state.financialAnalysis)); }catch(_){ }
      initializeFinancialPeriods(); renderFinancialAnalysis(); setScreen('financial-analysis');
      showAlert(`P&amp;L imported: <strong>${state.financialAnalysis.periods.length} weekly periods</strong> are ready for analysis.`,'success');
    }catch(err){ console.error(err); showAlert(`Could not import the P&amp;L workbook: ${escapeHtml(err.message||String(err))}`,'error'); }
  }
  function loadStoredFinancialAnalysis(){
    try{ const saved=JSON.parse(localStorage.getItem('nblFinancialAnalysis')||'null'); if(saved&&Array.isArray(saved.periods))state.financialAnalysis=saved; }catch(_){ }
  }
  function initializeFinancialPeriods(){
    const periods=state.financialAnalysis?.periods||[], start=$('financialStartPeriod'),end=$('financialEndPeriod'); if(!start||!end)return;
    const options=periods.map((p,i)=>`<option value="${i}">${escapeHtml(p.label)}</option>`).join('');
    if(start.options.length!==periods.length){ start.innerHTML=options;end.innerHTML=options;start.value='0';end.value=String(Math.max(0,periods.length-1)); }
  }
  function selectedFinancialPeriods(){
    const all=state.financialAnalysis?.periods||[]; let a=Number($('financialStartPeriod')?.value||0),b=Number($('financialEndPeriod')?.value||all.length-1);
    if(a>b)[a,b]=[b,a]; return all.slice(Math.max(0,a),Math.min(all.length-1,b)+1);
  }
  function financialRatio(amount,income){ return income?amount/income*100:0; }
  function financialSvg(rows,series,percent=false){
    if(!rows.length)return '<div class="analysis-empty">No periods selected.</div>';
    const width=760,height=270,pad={l:58,r:16,t:24,b:48},values=rows.flatMap(r=>series.map(s=>Number(s.get(r))||0));
    let min=percent?0:Math.min(0,...values),max=Math.max(percent?10:1,...values); if(max===min)max=min+1;
    const x=i=>pad.l+(rows.length===1?0.5:i/(rows.length-1))*(width-pad.l-pad.r), y=v=>pad.t+(max-v)/(max-min)*(height-pad.t-pad.b);
    const grid=[0,.25,.5,.75,1].map(t=>{const v=max-(max-min)*t;return `<line x1="${pad.l}" y1="${y(v)}" x2="${width-pad.r}" y2="${y(v)}" class="chart-grid-line"/><text x="${pad.l-8}" y="${y(v)+4}" text-anchor="end">${percent?v.toFixed(0)+'%':'$'+Math.round(v/1000)+'k'}</text>`}).join('');
    const lines=series.map(s=>`<polyline class="chart-series" stroke="${s.color}" points="${rows.map((r,i)=>`${x(i)},${y(s.get(r))}`).join(' ')}"/>`).join('');
    const dots=series.map(s=>rows.map((r,i)=>`<circle cx="${x(i)}" cy="${y(s.get(r))}" r="3" fill="${s.color}"><title>${s.name}: ${percent?(Number(s.get(r))||0).toFixed(1)+'%':fmtMoney(s.get(r))} • ${r.label}</title></circle>`).join('')).join('');
    const step=Math.max(1,Math.ceil(rows.length/6)),labels=rows.map((r,i)=>(i%step===0||i===rows.length-1)?`<text x="${x(i)}" y="${height-15}" text-anchor="middle">${escapeHtml(r.label.replace(/,\s*\d{4}$/,''))}</text>`:'').join('');
    const legend=series.map((s,i)=>`<g transform="translate(${pad.l+i*155},12)"><line x1="0" y1="0" x2="18" y2="0" stroke="${s.color}" stroke-width="3"/><text x="24" y="4">${escapeHtml(s.name)}</text></g>`).join('');
    return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Financial trend chart">${grid}${legend}${lines}${dots}${labels}</svg>`;
  }
  function renderFinancialAnalysis(){
    const all=state.financialAnalysis?.periods||[],empty=$('financialAnalysisEmpty'),body=$('financialAnalysisBody'); if(!empty||!body)return;
    empty.classList.toggle('hidden',!!all.length);body.classList.toggle('hidden',!all.length);if(!all.length)return;
    initializeFinancialPeriods(); const rows=selectedFinancialPeriods(),sum=key=>rows.reduce((n,r)=>n+(Number(r[key])||0),0),income=sum('income'),payroll=sum('payroll'),employee=sum('employeeCosts'),gross=sum('grossProfit'),operating=sum('operatingIncome'),net=sum('netIncome');
    $('financialRangeNote').textContent=rows.length?`${rows.length} week${rows.length===1?'':'s'} selected • ${rows[0].label} through ${rows[rows.length-1].label}`:'No periods selected.';
    $('financialPeriodCount').textContent=`${rows.length} week${rows.length===1?'':'s'}`;
    $('financialSummaryCards').innerHTML=[['Payroll %',`${financialRatio(payroll,income).toFixed(1)}%`,'accent'],['Maintenance %',`${financialRatio(sum('maintenance'),income).toFixed(1)}%`,''],['Fuel %',`${financialRatio(sum('fuel'),income).toFixed(1)}%`,''],['Operating Income %',`${financialRatio(operating,income).toFixed(1)}%`,operating<0?'danger':'']].map(x=>`<div class="summary-card ${x[2]}"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
    $('financialProfitChart').innerHTML=financialSvg(rows,[{name:'Total Income',color:'#35164e',get:r=>r.income},{name:'Gross Profit',color:'#248f6b',get:r=>r.grossProfit},{name:'Operating Income',color:'#f15a24',get:r=>r.operatingIncome},{name:'Net Income',color:'#3778b8',get:r=>r.netIncome}]);
    $('financialPayrollCostChart').innerHTML=financialSvg(rows,[{name:'Payroll %',color:'#f15a24',get:r=>financialRatio(r.payroll,r.income)},{name:'Employee Costs %',color:'#8556a5',get:r=>financialRatio(r.employeeCosts,r.income)}],true);
    $('financialMaintenanceChart').innerHTML=financialSvg(rows,[{name:'Maintenance %',color:'#248f6b',get:r=>financialRatio(r.maintenance,r.income)}],true);
    $('financialFuelChart').innerHTML=financialSvg(rows,[{name:'Fuel %',color:'#3778b8',get:r=>financialRatio(r.fuel,r.income)}],true);
    const table=$('financialAnalysisTable'); table.querySelector('thead').innerHTML='<tr><th>Week</th><th>Total Income</th><th>Gross Profit</th><th>Core Payroll</th><th>Payroll %</th><th>Employee Costs</th><th>Fuel %</th><th>Maintenance %</th><th>Operating Income</th><th>Net Income</th></tr>';
    table.querySelector('tbody').innerHTML=rows.map(r=>`<tr><td><strong>${escapeHtml(r.label)}</strong></td><td>${fmtMoney(r.income)}</td><td>${fmtMoney(r.grossProfit)}</td><td>${fmtMoney(r.payroll)}</td><td><strong>${financialRatio(r.payroll,r.income).toFixed(1)}%</strong></td><td>${fmtMoney(r.employeeCosts)}</td><td>${financialRatio(r.fuel,r.income).toFixed(1)}%</td><td>${financialRatio(r.maintenance,r.income).toFixed(1)}%</td><td class="${r.operatingIncome<0?'financial-negative':''}">${fmtMoney(r.operatingIncome)}</td><td class="${r.netIncome<0?'financial-negative':''}">${fmtMoney(r.netIncome)}</td></tr>`).join('');
    table.querySelector('tfoot').innerHTML=`<tr><td><strong>Selected Total</strong></td><td><strong>${fmtMoney(income)}</strong></td><td><strong>${fmtMoney(gross)}</strong></td><td><strong>${fmtMoney(payroll)}</strong></td><td><strong>${financialRatio(payroll,income).toFixed(1)}%</strong></td><td><strong>${fmtMoney(employee)}</strong></td><td><strong>${financialRatio(sum('fuel'),income).toFixed(1)}%</strong></td><td><strong>${financialRatio(sum('maintenance'),income).toFixed(1)}%</strong></td><td><strong>${fmtMoney(operating)}</strong></td><td><strong>${fmtMoney(net)}</strong></td></tr>`;
  }
  function toggleFinancialDetail(){
    const panel=$('financialDetailPanel'),btn=$('toggleFinancialDetailBtn'); if(!panel||!btn)return;
    const collapsed=panel.classList.toggle('detail-collapsed'); btn.textContent=collapsed?'Show Weekly Detail':'Hide Weekly Detail'; btn.setAttribute('aria-expanded',collapsed?'false':'true');
  }
  async function importTractorSpreadsheet(file) {
    if(!file) return;
    if(!state.directoryHandle){ showAlert('Choose your NBL business data folder before importing tractors.','warning'); return; }
    try {
      const ext=(file.name.split('.').pop()||'').toLowerCase(); let rows;
      if(ext==='csv') rows=csvSpreadsheetRows((await decodeFile(file)).text);
      else if(ext==='xlsx') rows=await xlsxSpreadsheetRows(file);
      else throw new Error('Please use an .xlsx or .csv spreadsheet.');
      const imported=tractorsFromSpreadsheetRows(rows); let added=0,updated=0;
      const now=new Date().toISOString();
      for(const item of imported){
        const existing=state.maintenance.tractors.find(t=>normalizeTractor(t.tractorNumber)===item.tractorNumber);
        if(existing){
          if(item.vin) existing.vin=item.vin; if(item.makeModel) existing.makeModel=item.makeModel; if(item.domicile) existing.domicile=item.domicile;
          if(item.motiveMileage!=null){ existing.motiveMileage=item.motiveMileage; existing.mileageAsOf=item.mileageAsOf||todayIso(); }
          existing.updatedAt=now; updated++;
        } else {
          state.maintenance.tractors.push({id:uid('tractor'),tractorNumber:item.tractorNumber,vin:item.vin,makeModel:item.makeModel,domicile:item.domicile,motiveMileage:item.motiveMileage??0,mileageAsOf:item.mileageAsOf||(item.motiveMileage!=null?todayIso():''),createdAt:now,updatedAt:now}); added++;
        }
      }
      await saveMaintenanceData(true);
      try {
        if(await requestPermission(state.directoryHandle,'readwrite')){
          const maint=await state.directoryHandle.getDirectoryHandle('Maintenance',{create:true}); const imports=await maint.getDirectoryHandle('Imports',{create:true});
          const stamp=new Date().toISOString().replace(/[:.]/g,'-'); await writeFile(imports,`${stamp}_${sanitize(file.name)}`,new Uint8Array(await file.arrayBuffer()),file.type||'application/octet-stream');
        }
      } catch(err){ console.warn('Could not archive tractor import',err); }
      renderMaintenance(); renderIvmr();
      showAlert(`Tractor spreadsheet imported: <strong>${added} added</strong>, <strong>${updated} updated</strong>. The source file was archived under Maintenance/Imports.`, 'success');
    } catch(err){ console.error(err); showAlert(`Could not import tractor spreadsheet: ${escapeHtml(err.message)}`,'error'); }
  }
  function downloadTractorTemplate() {
    const csv='Tractor Number,VIN,Make / Model,Domicile,Current Mileage,Mileage As Of\r\n';
    downloadBlob(csv,'NBL_Tractor_Import_Template.csv','text/csv');
  }

  function openTractorModal(id='') {
    const t=id ? state.maintenance.tractors.find(x=>x.id===id) : null;
    $('tractorEditId').value=t?.id||'';
    $('tractorModalTitle').textContent=t?'Edit Tractor':'Add Tractor';
    $('tractorNumberInput').value=t?.tractorNumber||'';
    $('tractorVinInput').value=t?.vin||'';
    $('tractorMakeModelInput').value=t?.makeModel||'';
    $('tractorDomicileInput').value=t?.domicile||'';
    $('tractorMileageInput').value=t?.motiveMileage ?? '';
    $('tractorMileageDateInput').value=t?.mileageAsOf||todayIso();
    $('tractorModal').classList.remove('hidden');
    setTimeout(()=>$('tractorNumberInput').focus(),0);
  }
  function openModal(id){
    const modal=$(id); if(!modal) return;
    modal.classList.remove('hidden');
    // Delay focus until after the modal is visible. This also keeps clicks on
    // controls inside draggable Dispatch cards from being swallowed by drag UI.
    setTimeout(()=>{
      const first=modal.querySelector('input:not([type=hidden]):not([readonly]), select, textarea, button[type=submit]');
      first?.focus?.();
    },0);
  }
  function closeModal(id){
    if(id==='ssnAccessModal' && state.hrSsn?.accessResolver){ const resolve=state.hrSsn.accessResolver; state.hrSsn.accessResolver=null; try{resolve(false);}catch(_){} }
    if(id==='recruitmentApplicationMismatchModal' && state.hrApplicationMismatch?.resolver){ const resolve=state.hrApplicationMismatch.resolver; state.hrApplicationMismatch={resolver:null}; try{resolve(false);}catch(_){} }
    $(id)?.classList.add('hidden');
  }

  function updateMaintenanceScope(autoServiceType=false) {
    const type=$('maintenanceTypeInput').value;
    $('maintenanceScope').innerHTML=`<strong>${typeLabel(type)}</strong><span>${escapeHtml(PM_SCOPES[type])}</span>`;
    $('maintenanceWorkLabel').textContent=type==='OTHER'?'Repair Work Performed':'Custom Work / Additional Notes';
    $('maintenanceWorkInput').required=type==='OTHER';
    if(autoServiceType && $('maintenanceServiceTypeInput')) $('maintenanceServiceTypeInput').value=type==='OTHER'?'Unscheduled':'Scheduled';
  }

  function openMaintenanceModal(tractorId='') {
    if(!state.maintenance.tractors.length){ showAlert('Add a tractor before recording maintenance.','warning'); return; }
    renderMaintenance();
    if(tractorId && [...$('maintenanceTractorInput').options].some(o=>o.value===tractorId)) $('maintenanceTractorInput').value=tractorId;
    const selected=state.maintenance.tractors.find(t=>t.id===$('maintenanceTractorInput').value) || state.maintenance.tractors[0];
    const status=selected ? tractorPMStatus(selected) : null;
    $('maintenanceTypeInput').value=status?.nextType==='PM2'?'PM2':'PM1';
    $('maintenanceDateInput').value=todayIso();
    $('maintenanceOdometerInput').value=status?.mileage?.estimatedMileage || selected?.motiveMileage || '';
    $('maintenanceShopInput').value='';
    $('maintenanceMechanicInput').value='';
    $('maintenancePartsCostInput').value='';
    $('maintenanceLaborCostInput').value='';
    $('maintenanceTotalCostInput').value='';
    $('maintenanceWorkInput').value='';
    clearMaintenanceMotiveOdometerSource();
    setMaintenanceMotiveOdometerStatus('For past service dates, Motive mileage will be looked up automatically when available.','');
    updateMaintenanceScope(true);
    $('maintenanceModal').classList.remove('hidden');
  }

  async function saveTractorFromForm(e) {
    e.preventDefault();
    const id=$('tractorEditId').value;
    const tractorNumber=normalizeTractor($('tractorNumberInput').value);
    if(!tractorNumber) return;
    const duplicate=state.maintenance.tractors.find(t=>normalizeTractor(t.tractorNumber)===tractorNumber && t.id!==id);
    if(duplicate){ showAlert(`Tractor <strong>${escapeHtml(tractorNumber)}</strong> already exists in maintenance.`, 'error'); return; }
    const now=new Date().toISOString();
    const existing=id ? state.maintenance.tractors.find(t=>t.id===id) : null;
    const record={
      id:existing?.id||uid('tractor'), tractorNumber,
      vin:String($('tractorVinInput').value||'').trim().toUpperCase(), makeModel:String($('tractorMakeModelInput').value||'').trim(), domicile:String($('tractorDomicileInput').value||'').trim(),
      motiveMileage:round0($('tractorMileageInput').value), mileageAsOf:$('tractorMileageDateInput').value,
      createdAt:existing?.createdAt||now, updatedAt:now
    };
    if(existing) Object.assign(existing,record); else state.maintenance.tractors.push(record);
    await saveMaintenanceData(true);
    closeModal('tractorModal');
    renderMaintenance(); renderIvmr();
    showAlert(`Tractor <strong>${escapeHtml(tractorNumber)}</strong> saved to the maintenance file.`,'success');
  }

  async function saveMaintenanceFromForm(e) {
    e.preventDefault();
    const tractorId=$('maintenanceTractorInput').value, type=$('maintenanceTypeInput').value;
    const tractor=state.maintenance.tractors.find(t=>t.id===tractorId); if(!tractor) return;
    const record={
      id:uid('maint'),tractorId,type,serviceDate:$('maintenanceDateInput').value,odometer:round0($('maintenanceOdometerInput').value),
      odometerSource:(String($('maintenanceOdometerInput').dataset.motiveOdometer||'')===String(round0($('maintenanceOdometerInput').value)))?'Motive':'Manual',odometerReadingAt:$('maintenanceOdometerInput').dataset.motiveLocatedAt||'',
      shopName:String($('maintenanceShopInput').value||'').trim(),mechanicName:String($('maintenanceMechanicInput').value||'').trim(),serviceType:$('maintenanceServiceTypeInput').value,
      partsCost:optionalNumber($('maintenancePartsCostInput').value),laborCost:optionalNumber($('maintenanceLaborCostInput').value),totalCost:optionalNumber($('maintenanceTotalCostInput').value),
      scope:PM_SCOPES[type],work:String($('maintenanceWorkInput').value||'').trim(),createdAt:new Date().toISOString()
    };
    state.maintenance.records.push(record);
    await saveMaintenanceData(true);
    closeModal('maintenanceModal');
    renderMaintenance();
    showAlert(`${typeLabel(type)} recorded for tractor <strong>${escapeHtml(tractor.tractorNumber)}</strong> at ${fmtNum(record.odometer)} miles.`,'success');
  }

  async function deleteMaintenanceRecord(id) {
    const rec=state.maintenance.records.find(r=>r.id===id); if(!rec) return;
    const tractor=state.maintenance.tractors.find(t=>t.id===rec.tractorId);
    if(!confirm(`Delete this ${typeLabel(rec.type)} record for tractor ${tractor?.tractorNumber||''}?`)) return;
    state.maintenance.records=state.maintenance.records.filter(r=>r.id!==id);
    await saveMaintenanceData(true); renderMaintenance();
  }


  function mmrMonthLabel(ym) {
    const m=String(ym||'').match(/^(\d{4})-(\d{2})$/); if(!m) return '';
    const names=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    return `${names[Number(m[2])-1]} ${m[1]}`;
  }
  function mmrDateLabel(iso) {
    const d=parseFlexibleDate(iso); if(!d) return '';
    return `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}-${d.getFullYear()}`;
  }
  function mmrRecordDescription(r) {
    const custom=String(r.work||'').trim();
    let base='';
    if(r.type==='PM1') base='Oil changed; filters changed; tractor inspection completed.';
    else if(r.type==='PM2') base='Oil changed; filters changed; tractor inspection completed; all systems fluids flushed.';
    else base=custom || 'Other repair or maintenance work completed.';
    if(r.type!=='OTHER' && custom) base += ` ${custom}`;
    return base;
  }
  function recordsForMmrMonth(tractorId, ym) {
    return state.maintenance.records.filter(r=>r.tractorId===tractorId && String(r.serviceDate||'').slice(0,7)===ym)
      .slice().sort((a,b)=>String(a.serviceDate).localeCompare(String(b.serviceDate)));
  }
  function wrapCanvasText(ctx,text,maxWidth,maxLines=2) {
    const words=String(text||'').split(/\s+/).filter(Boolean), lines=[]; let line='';
    for(const word of words){
      const test=line?`${line} ${word}`:word;
      if(ctx.measureText(test).width<=maxWidth) line=test;
      else { if(line) lines.push(line); line=word; if(lines.length>=maxLines) break; }
    }
    if(lines.length<maxLines && line) lines.push(line);
    if(words.length && lines.length===maxLines){
      while(ctx.measureText(lines[maxLines-1]+'…').width>maxWidth && lines[maxLines-1].length>2) lines[maxLines-1]=lines[maxLines-1].slice(0,-1);
      if(!lines[maxLines-1].endsWith('…')) lines[maxLines-1]+='…';
    }
    return lines.slice(0,maxLines);
  }
  // Embedded template avoids file:// canvas security restrictions when the app is run locally.
  const MMR_TEMPLATE_DATA_URL='assets/mmr-template.png';
  let _mmrTemplatePromise=null;
  function loadMmrTemplate() {
    if(_mmrTemplatePromise) return _mmrTemplatePromise;
    _mmrTemplatePromise=new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>resolve(img);
      img.onerror=()=>reject(new Error('Could not load the embedded MGBA-355 template image.'));
      img.src=MMR_TEMPLATE_DATA_URL;
    });
    return _mmrTemplatePromise;
  }
  function drawMmrX(ctx,x,y) {
    ctx.save(); ctx.fillStyle='#111'; ctx.font='bold 24px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('X',x,y); ctx.restore();
  }
  async function renderMmrCanvas(tractor, ym, company, officer, completedDate) {
    const img=await loadMmrTemplate();
    const canvas=document.createElement('canvas'); canvas.width=1241; canvas.height=1754;
    const ctx=canvas.getContext('2d'); ctx.drawImage(img,0,0,canvas.width,canvas.height);
    const status=tractorPMStatus(tractor), records=recordsForMmrMonth(tractor.id,ym);
    ctx.fillStyle='#111'; ctx.textBaseline='alphabetic';
    ctx.font='bold 22px Arial';
    ctx.fillText(mmrMonthLabel(ym),95,343);
    ctx.fillText(String(tractor.domicile||''),686,343);
    ctx.fillText(String(company||'Nashbox Logistics Inc.'),95,420);
    ctx.fillText(String(Math.round(status.mileage.estimatedMileage||tractor.motiveMileage||0)),686,420);
    ctx.fillText(String(tractor.tractorNumber||''),95,503);
    // Maintenance Yes/No. If no maintenance, assume unit was not out of service unless separately documented.
    // Coordinates mapped from the original MGBA-355 form.
    if(records.length) drawMmrX(ctx,952,540); else drawMmrX(ctx,1098,540);
    if(!records.length) drawMmrX(ctx,1098,611);

    const rowTops=[958,986,1014,1042,1070];
    let entries=records.map(r=>({date:r.serviceDate,desc:mmrRecordDescription(r)}));
    if(entries.length>5){
      const tail=entries.slice(4); entries=entries.slice(0,4).concat([{date:tail[0].date,desc:tail.map(x=>`${x.date}: ${x.desc}`).join(' | ')}]);
    }
    ctx.font='14px Arial';
    entries.forEach((e,i)=>{
      const y=rowTops[i];
      ctx.fillText(String(e.date||''),95,y+14);
      const lines=wrapCanvasText(ctx,e.desc,830,2);
      lines.forEach((line,j)=>ctx.fillText(line,360,y+11+j*12));
    });

    if(officer){ ctx.font='italic 22px cursive'; ctx.fillText(String(officer),95,1368); }
    ctx.font='bold 22px Arial'; ctx.fillText(mmrDateLabel(completedDate),895,1368);
    return canvas;
  }
  async function canvasJpegBytes(canvas) {
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not encode PDF page.')),'image/jpeg',0.94));
    return new Uint8Array(await blob.arrayBuffer());
  }
  function concatBytes(parts) {
    const total=parts.reduce((n,p)=>n+p.length,0), out=new Uint8Array(total); let off=0;
    for(const p of parts){ out.set(p,off); off+=p.length; } return out;
  }
  function asciiBytes(s){ return new TextEncoder().encode(s); }
  function jpegPagesToPdf(jpegs,widthPx=1241,heightPx=1754) {
    const parts=[], offsets=[0]; let length=0;
    const push=b=>{ const u=typeof b==='string'?asciiBytes(b):b; parts.push(u); length+=u.length; };
    push('%PDF-1.4\n%NBL\n');
    const totalObjects=2+jpegs.length*3;
    const obj=(id,bodyParts)=>{ offsets[id]=length; push(`${id} 0 obj\n`); for(const b of bodyParts) push(b); push('\nendobj\n'); };
    obj(1,['<< /Type /Catalog /Pages 2 0 R >>']);
    const kids=jpegs.map((_,i)=>`${3+i*3} 0 R`).join(' ');
    obj(2,[`<< /Type /Pages /Kids [${kids}] /Count ${jpegs.length} >>`]);
    jpegs.forEach((jpg,i)=>{
      const pageId=3+i*3, imageId=pageId+1, contentId=pageId+2;
      obj(pageId,[`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`]);
      offsets[imageId]=length; push(`${imageId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`); push(jpg); push('\nendstream\nendobj\n');
      const content='q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ\n';
      obj(contentId,[`<< /Length ${content.length} >>\nstream\n${content}endstream`]);
    });
    const xrefOffset=length;
    push(`xref\n0 ${totalObjects+1}\n0000000000 65535 f \n`);
    for(let i=1;i<=totalObjects;i++) push(`${String(offsets[i]||0).padStart(10,'0')} 00000 n \n`);
    push(`trailer\n<< /Size ${totalObjects+1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
    return concatBytes(parts);
  }
  function mmrInputs() {
    return {
      ym:$('mmrMonthInput')?.value || todayIso().slice(0,7),
      company:String($('mmrCompanyInput')?.value||'Nashbox Logistics Inc.').trim(),
      officer:String($('mmrOfficerInput')?.value||'').trim(),
      completedDate:$('mmrCompletedDateInput')?.value || todayIso()
    };
  }
  async function saveMmrPdf(bytes,fileName,ym) {
    // Keep the generated bytes in memory so the user can manually download again if the browser blocks an automatic download.
    state.lastMmrPdf={bytes,fileName,ym};
    const dlBtn=$('downloadLastMmrBtn');
    if(dlBtn){ dlBtn.disabled=false; dlBtn.textContent='Download '+fileName; }

    let folderSaved=false;
    if(state.directoryHandle){
      try{
        const permitted=await requestPermission(state.directoryHandle,'readwrite');
        if(permitted){
          const maintenanceDir=await state.directoryHandle.getDirectoryHandle('Maintenance',{create:true});
          const mmrDir=await maintenanceDir.getDirectoryHandle('MMR',{create:true});
          const monthDir=await mmrDir.getDirectoryHandle(ym,{create:true});
          await writeFile(monthDir,fileName,bytes,'application/pdf');
          folderSaved=true;
        }
      }catch(err){ console.warn('Could not save MMR PDF to data folder',err); }
    }

    // Also trigger a normal browser download. If the browser suppresses it, the Download Last PDF button remains available.
    downloadBlob(bytes,fileName,'application/pdf');
    return folderSaved;
  }
  async function buildMmrPdfForTractors(tractors, ym, company, officer, completedDate) {
    const jpegs=[];
    for(const t of tractors){
      const canvas=await renderMmrCanvas(t,ym,company,officer,completedDate);
      jpegs.push(await canvasJpegBytes(canvas));
    }
    return jpegPagesToPdf(jpegs);
  }
  async function generateMmrPdf(tractorIds=null) {
    if(!state.maintenance.tractors.length){ showAlert('Add tractors before generating maintenance PDFs.','warning'); return; }
    const {ym,company,officer,completedDate}=mmrInputs();
    if(!ym){ showAlert('Choose a maintenance month.','warning'); return; }
    const tractors=(tractorIds?state.maintenance.tractors.filter(t=>tractorIds.includes(t.id)):state.maintenance.tractors.slice())
      .sort((a,b)=>String(a.tractorNumber).localeCompare(String(b.tractorNumber),undefined,{numeric:true}));
    if(!tractors.length) return;
    try{
      // Individual tractor export remains a single tractor PDF.
      if(tractorIds){
        showAlert(`Generating MGBA-355 PDF for tractor <strong>${escapeHtml(tractors[0].tractorNumber)}</strong>…`,'success');
        const pdf=await buildMmrPdfForTractors(tractors,ym,company,officer,completedDate);
        const name=`NBL_MMR_${ym}_Tractor_${sanitize(tractors[0].tractorNumber)||'Unknown'}.pdf`;
        const folderSaved=await saveMmrPdf(pdf,name,ym);
        showAlert(`Generated <strong>${name}</strong>${folderSaved?' and saved it under Maintenance/MMR/'+escapeHtml(ym):'. If the automatic download did not start, use the Download Last PDF button below.'}`,'success');
        return;
      }

      // Fleet export is grouped by domicile: one PDF file per domicile, one page per tractor.
      const groups=new Map();
      for(const t of tractors){
        const domicile=String(t.domicile||'').trim() || 'Unassigned Domicile';
        if(!groups.has(domicile)) groups.set(domicile,[]);
        groups.get(domicile).push(t);
      }
      const domicileGroups=[...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0],undefined,{numeric:true}));
      showAlert(`Generating <strong>${domicileGroups.length}</strong> domicile MMR file${domicileGroups.length===1?'':'s'} for <strong>${tractors.length}</strong> tractors…`,'success');
      const generated=[];
      let savedCount=0;
      for(const [domicile,domicileTractors] of domicileGroups){
        const pdf=await buildMmrPdfForTractors(domicileTractors,ym,company,officer,completedDate);
        const safeDomicile=sanitize(domicile)||'Unassigned_Domicile';
        const name=`NBL_MMR_${ym}_Domicile_${safeDomicile}.pdf`;
        const folderSaved=await saveMmrPdf(pdf,name,ym);
        if(folderSaved) savedCount++;
        generated.push({name,domicile,count:domicileTractors.length});
        // Yield briefly so multiple browser downloads/saves do not freeze the UI.
        await new Promise(resolve=>setTimeout(resolve,120));
      }
      const fileList=generated.map(x=>`<strong>${escapeHtml(x.domicile)}</strong> (${x.count} tractor${x.count===1?'':'s'})`).join(', ');
      const saveText=savedCount===generated.length
        ? ` All files were also saved under Maintenance/MMR/${escapeHtml(ym)}.`
        : ` ${savedCount} of ${generated.length} files were saved to the data folder. Your browser may ask permission for multiple downloads.`;
      showAlert(`Generated ${generated.length} domicile MMR PDF${generated.length===1?'':'s'}: ${fileList}.${saveText}`,'success');
    }catch(err){ console.error(err); showAlert('Could not generate the maintenance PDFs: '+err.message,'error'); }
  }

  async function connectFolder() {
    if(!('showDirectoryPicker' in window)){ showAlert('Local folder access requires Chrome or Microsoft Edge.','warning'); return; }
    try {
      if(state.directoryHandle && await requestPermission(state.directoryHandle,'readwrite')) { await scanFolder(null,false); return; }
      state.directoryHandle=await window.showDirectoryPicker({mode:'readwrite'});
      await idbSet(HANDLE_KEY,state.directoryHandle);
      updateFolderUI();
      await scanFolder(null,false);
    } catch(err){ if(err.name!=='AbortError') showAlert('Could not open that folder: '+err.message,'error'); }
  }
  async function restoreFolder() {
    if(!('showDirectoryPicker' in window)) return;
    try {
      const handle=await idbGet(HANDLE_KEY); if(!handle) return;
      state.directoryHandle=handle; updateFolderUI();
      if(await hasPermission(handle,'read')){
        if(!state.cloud?.hasSnapshotData) await scanFolder(null,true);
      } else showAlert('Your NBL business data folder is remembered. Click <strong>Reconnect / Change Folder</strong> to allow access for this browser session.','warning');
    } catch(err){ console.warn('Could not restore folder handle',err); }
  }

  async function writeFile(dir,name,data,type='application/octet-stream') {
    const fh=await dir.getFileHandle(name,{create:true}); const w=await fh.createWritable();
    await w.write(data instanceof Blob ? data : new Blob([data],{type})); await w.close();
  }
  async function writeCatalogIndex() {
    if(!state.directoryHandle || !(await hasPermission(state.directoryHandle,'readwrite'))) return;
    const index=state.catalog.map(x=>({file:x.relativePath,settlementDate:x.settlementDate,payDate:x.payDate,periodStart:x.result.summary.periodStart,periodEnd:x.result.summary.periodEnd}));
    try { await writeFile(state.directoryHandle,'statement_index.json',JSON.stringify({updatedAt:new Date().toISOString(),statements:index},null,2),'application/json'); } catch {}
  }
  async function saveToFolder(silent=false) {
    if(!state.result) return;
    if(!state.directoryHandle){
      if(cloudConnected()){ const ok=await saveCloudModule('settlement',silent); if(!silent&&ok) showAlert('Settlement state saved to NBL Cloud. Use Export Excel to download a report file.','success'); return; }
      await connectFolder(); return;
    }
    if(!(await requestPermission(state.directoryHandle,'readwrite'))) { if(!silent) showAlert('Folder write permission is required.','error'); return; }
    try {
      const reports=await state.directoryHandle.getDirectoryHandle('Reports',{create:true});
      const reportDir=await reports.getDirectoryHandle(state.result.summary.settlementDate || 'undated',{create:true});
      const exportResult=payrollExportResult();
      const xlsx=Core.makeXlsx(exportResult);
      await writeFile(reportDir,'driver_pay.csv',Core.driverPayCSV(exportResult),'text/csv');
      await writeFile(reportDir,'summary.json',Core.summaryJSON(exportResult),'application/json');
      await writeFile(reportDir,'settlement_report.xlsx',xlsx,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      if(!silent) showAlert(`Report saved to <strong>${escapeHtml(state.directoryHandle.name)}/Reports/${escapeHtml(state.result.summary.settlementDate || 'undated')}</strong>.`, 'success');
    } catch(err){ console.error(err); if(!silent) showAlert('Could not save to the selected folder: '+err.message,'error'); }
  }
  function downloadBlob(data,name,type) {
    const blob=data instanceof Blob?data:new Blob([data],{type}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function exportExcel() {
    if(!state.result) return;
    const name=`NBL_Business_Analyzer_${state.result.summary.payDate||'pay'}_Settlement_${state.result.summary.settlementDate||'report'}.xlsx`;
    downloadBlob(Core.makeXlsx(payrollExportResult()),name,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }

  function exportMeetingsExcel() {
    const inspectionCount=state.meetings?.inspections?.length||0;
    const itemCount=state.meetings?.managementItems?.length||0;
    if(!inspectionCount && !itemCount){ showAlert('There are no meeting or inspection records to export.','warning'); return; }
    try {
      const name=`NBL_Business_Analyzer_Meetings_${todayIso()}.xlsx`;
      downloadBlob(Core.makeMeetingsXlsx(state.meetings),name,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      showAlert(`Meetings workbook exported with <strong>${inspectionCount}</strong> inspection report${inspectionCount===1?'':'s'} and <strong>${itemCount}</strong> management item${itemCount===1?'':'s'}.`,'success');
    } catch(err){
      console.error(err);
      showAlert('Could not export the Meetings workbook: '+err.message,'error');
    }
  }
  function exportTripInspectionsExcel(){
    const inspectionCount=state.meetings?.inspections?.length||0;if(!inspectionCount){showAlert('There are no trip-inspection records to export.','warning');return;}
    try{downloadBlob(Core.makeMeetingsXlsx({...state.meetings,managementItems:[]}),`NBL_FleetCommand_Trip_Inspections_${todayIso()}.xlsx`,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');showAlert(`Exported <strong>${inspectionCount}</strong> trip-inspection report${inspectionCount===1?'':'s'}.`,'success');}catch(err){showAlert('Could not export Trip Inspections: '+escapeHtml(err.message),'error');}
  }


  function normalizedIvmrLocation(raw){
    const x=raw&&typeof raw==='object'?raw:{};
    const aliases=Array.isArray(x.aliases)?x.aliases:String(x.aliases||'').split(/[,;|\n]+/);
    const toFloat=v=>{ const text=String(v??'').trim(); if(!text) return null; const n=Number(text); return Number.isFinite(n)?n:null; };
    const lat=toFloat(x.lat), lon=toFloat(x.lon), radius=toFloat(x.radius_miles);
    return {
      id:String(x.id||uid('ivmr_loc')),
      address:String(x.address||'').trim(), directory_managed:!!x.directory_managed,
      directory_date:String(x.directory_date||''), directory_facilities:cloneJson(Array.isArray(x.directory_facilities)?x.directory_facilities:[]),
      boundaries:cloneJson(Array.isArray(x.boundaries)?x.boundaries:[]),
      spot:String(x.spot||x.location_name||'').trim(),
      city:String(x.city||'').trim(),
      state:String(x.state||'').trim().toUpperCase().slice(0,2),
      lat,lon,
      radius_miles:radius&&radius>0?radius:8,
      aliases:[...new Set(aliases.map(v=>String(v||'').trim()).filter(Boolean))]
    };
  }
  function normalizeIvmrLocationData(data){
    const raw=Array.isArray(data?.locations)?data.locations:[];
    const locations=raw.map(normalizedIvmrLocation).filter(x=>x.city||x.spot);
    return {version:2,updatedAt:String(data?.updatedAt||''),directorySourceDate:String(data?.directorySourceDate||''),locations};
  }
  async function loadIvmrLocationData(){
    if(!state.directoryHandle) return;
    let data=defaultIvmrLocationData();
    try{
      const root=await state.directoryHandle.getDirectoryHandle('IVMR');
      const fh=await root.getFileHandle('ivmr_locations.json');
      const file=await fh.getFile();
      const parsed=JSON.parse(await file.text());
      if(parsed&&Array.isArray(parsed.locations)) data=normalizeIvmrLocationData(parsed);
    }catch(err){ if(err&&err.name!=='NotFoundError') console.warn('Could not load IVMR location master',err); }
    state.ivmrLocations=data;
    state.ivmrLocationsLoaded=true;
    renderIvmr();
  }
  async function saveIvmrLocationData(silent=true){
    const cloudSaved=cloudConnected()?await saveCloudModule('ivmr',true):false;
    if(!state.directoryHandle){ if(!silent&&cloudSaved) showAlert('IVMR location master saved to NBL Cloud.','success'); return cloudSaved; }
    if(!(await requestPermission(state.directoryHandle,'readwrite'))){ if(!silent) showAlert('Folder write permission is required to save IVMR locations.','error'); return false; }
    try{
      const root=await state.directoryHandle.getDirectoryHandle('IVMR',{create:true});
      const payload={...normalizeIvmrLocationData(state.ivmrLocations),updatedAt:new Date().toISOString()};
      await writeFile(root,'ivmr_locations.json',JSON.stringify(payload,null,2),'application/json');
      state.ivmrLocations=payload;
      if(!silent) showAlert(`IVMR location master saved to <strong>${escapeHtml(state.directoryHandle.name)}/IVMR/ivmr_locations.json</strong>.`,'success');
      return true;
    }catch(err){ console.error(err); if(!silent) showAlert('Could not save IVMR locations: '+err.message,'error'); return false; }
  }
  function openIvmrLocationModal(location=null){
    const loc=location?normalizedIvmrLocation(location):normalizedIvmrLocation({radius_miles:8});
    $('ivmrLocationModalTitle').textContent=location?'Edit Location':'Add Location';
    $('ivmrLocationEditId').value=location?loc.id:'';
    $('ivmrLocationSpotInput').value=loc.spot||'';
    $('ivmrLocationAddressInput').value=loc.address||'';
    $('ivmrLocationCityInput').value=loc.city||'';
    $('ivmrLocationStateInput').value=loc.state||'';
    $('ivmrLocationRadiusInput').value=loc.radius_miles||8;
    $('ivmrLocationLatInput').value=loc.lat==null?'':loc.lat;
    $('ivmrLocationLonInput').value=loc.lon==null?'':loc.lon;
    $('ivmrLocationAliasesInput').value=(loc.aliases||[]).join(', ');
    updateIvmrLocationPreview();
    openModal('ivmrLocationModal');
  }
  function updateIvmrLocationPreview(){
    if(!$('ivmrLocationPreview')) return;
    const label=ivmrLocationLabel({spot:$('ivmrLocationSpotInput')?.value,city:$('ivmrLocationCityInput')?.value});
    $('ivmrLocationPreview').textContent=`Display format: ${label||'Spot / Location Name - City'}`;
  }

  function renderIvmrLocations(){
    const directory=state.ivmrDirectory,locations=state.ivmrLocations.locations||[];
    const search=String($('ivmrLocationSearch')?.value||'').trim().toLowerCase();
    const filtered=locations.filter(loc=>!search||[loc.spot,loc.city,loc.state,loc.address,...(loc.aliases||[]),...(loc.directory_facilities||[]).map(f=>`${f.number} ${f.abbreviation} ${f.facility_name}`)].join(' ').toLowerCase().includes(search))
      .sort((a,b)=>Number(a.directory_managed)-Number(b.directory_managed)||String(a.state||'').localeCompare(String(b.state||''))||String(a.city||'').localeCompare(String(b.city||''))||String(a.spot||'').localeCompare(String(b.spot||''),undefined,{numeric:true}));
    $('ivmrLocationCount').textContent=`${locations.length} locations`;
    $('ivmrDirectoryNote').textContent=directory.loading?'Updating facility directory…':(directory.note||(state.ivmrLocations.directorySourceDate?`FedEx directory dated ${state.ivmrLocations.directorySourceDate}. Existing numbers retained. Rebuild routes to use updated locations.`:'The FedEx directory will be imported when this module opens.'));
    $('updateIvmrDirectoryBtn').disabled=directory.loading||state.ivmr.routeLoading;
    $('addIvmrLocationBtn').disabled=directory.loading;
    $('ivmrLocationSearchCount').textContent=`Showing ${Math.min(filtered.length,100)} of ${filtered.length} matches. Search by city, state, number, abbreviation or address.`;
    const lt=$('ivmrLocationTable');
    lt.querySelector('thead').innerHTML='<tr>'+['Display','State','Facility / Address','GPS Matching','Motive Aliases',''].map(h=>`<th>${h}</th>`).join('')+'</tr>';
    lt.querySelector('tbody').innerHTML=filtered.slice(0,100).map(loc=>{
      const gps=loc.boundaries?.length?`${loc.boundaries.length} Motive boundary(s)`:(loc.lat==null||loc.lon==null?'Coordinates needed':`${Number(loc.lat).toFixed(5)}, ${Number(loc.lon).toFixed(5)} • ${loc.radius_miles} mi`);
      const names=[...new Set((loc.directory_facilities||[]).map(f=>f.facility_name))].join(' / ');
      return `<tr><td><strong>${escapeHtml(ivmrLocationLabel(loc)||'—')}</strong>${loc.directory_managed?'<br><small>FedEx directory</small>':''}</td><td>${escapeHtml(loc.state||'—')}</td><td>${escapeHtml(names)}<br>${escapeHtml(loc.address||'Address unavailable')}</td><td>${escapeHtml(gps)}</td><td>${escapeHtml((loc.aliases||[]).join(', ')||'—')}</td><td><div class="row-actions"><button class="table-action" data-ivmr-location-edit="${escapeHtml(loc.id)}" ${directory.loading?'disabled':''}>Edit</button><button class="table-action danger" data-ivmr-location-delete="${escapeHtml(loc.id)}" ${directory.loading?'disabled':''}>Delete</button></div></td></tr>`;
    }).join('')||'<tr><td colspan="6">No matching locations.</td></tr>';
  }
  async function updateIvmrDirectory(silent=false){
    const control=state.ivmrDirectory;
    if(control.loading||state.ivmr.routeLoading||(cloudConnected()&&currentRole()!=='owner')) return;
    const request=++control.request,org=state.cloud?.organization?.id;
    control.loading=true;control.attempted=true;control.note='';renderIvmrLocations();
    const current=()=>state.ivmrDirectory.request===request&&state.cloud?.organization?.id===org;
    try{
      const directory=await localApi('/api/ivmr/facility-directory',{timeoutMs:30000});
      if(!current())return;
      let geofences=null,motiveWarning='';
      if(state.motive.configured){
        try{geofences=await localApi('/api/motive/geofences',{timeoutMs:120000});if(!geofences.complete)motiveWarning=' Motive location coverage is partial.';}
        catch(err){motiveWarning=' Motive boundaries could not be read.';}
      }
      if(!current())return;
      const merged=window.NBLIvmrDirectory.merge(state.ivmrLocations,directory);
      const boundaries=window.NBLIvmrDirectory.attachBoundaries(merged.data,geofences?.geofences||[]);
      const payload=normalizeIvmrLocationData({...boundaries.data,updatedAt:new Date().toISOString()});
      if(cloudConnected()){
        const snapshot=ivmrCloudSnapshot();snapshot.locations=payload;snapshot.current.formatBuilt=false;
        const row=await window.NBLCloud.saveSnapshot(org,'ivmr',snapshot,'147',state.cloud.snapshots.ivmr?.updated_at||null);
        if(!current())return;
        state.cloud.snapshots.ivmr=row;
      }else{
        if(!state.directoryHandle)throw Error('Choose a data folder before updating locations.');
        if(!(await requestPermission(state.directoryHandle,'readwrite')))throw Error('Folder write permission is required.');
        const root=await state.directoryHandle.getDirectoryHandle('IVMR',{create:true});
        await writeFile(root,'ivmr_locations.json',JSON.stringify(payload,null,2),'application/json');
      }
      if(!current())return;
      state.ivmrLocations=payload;state.ivmr.formatBuilt=false;
      control.note=`Imported ${directory.facilities.length} facility records: ${merged.stats.added} new locations; ${merged.stats.enriched} existing locations enriched; all ${merged.stats.preserved} existing numbers retained. ${boundaries.stats.matched} Motive boundaries matched.${motiveWarning} Rebuild routes to apply.`;
      if(!silent)showAlert(escapeHtml(control.note),'success');
    }catch(err){if(current()){control.note=`Directory update was not saved: ${err.message}`;if(!silent)showAlert(escapeHtml(control.note),'error');}}
    finally{if(current()){control.loading=false;renderIvmr();}}
  }

  function clearIvmrLocationMatches(){
    state.ivmr.formatBuilt=false;
    state.ivmr.trips=(state.ivmr.rawTrips||[]).map(r=>({...r}));
  }

  function fmtIvmrMiles(n){ return new Intl.NumberFormat('en-US',{minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(n)||0); }
  function ivmrVehicleNumber(trip){ return normalizeTractor(trip?.vehicle?.number||''); }
  function ivmrMasterForVehicle(vehicle){
    const number=normalizeTractor(vehicle?.number), vin=String(vehicle?.vin||'').trim().toUpperCase(), id=vehicle?.id!=null?String(vehicle.id):'';
    return state.maintenance.tractors.find(t=>number && normalizeTractor(t.tractorNumber)===number)
      || (vin ? state.maintenance.tractors.find(t=>String(t.vin||'').trim().toUpperCase()===vin) : null)
      || (id ? state.maintenance.tractors.find(t=>String(t.motiveVehicleId||'')===id) : null)
      || null;
  }
  function ivmrGroups(){
    const groups=new Map();
    for(const t of state.maintenance.tractors){
      const number=normalizeTractor(t.tractorNumber), key=`tractor:${number||t.id}`;
      groups.set(key,{key,tractor:t,vehicle:{id:t.motiveVehicleId||null,number:t.tractorNumber,vin:t.vin||'',make:'',model:'',year:''},trips:[]});
    }
    for(const trip of state.ivmr.trips||[]){
      const v=trip.vehicle||{}, master=ivmrMasterForVehicle(v), number=normalizeTractor(v.number);
      let key=master?`tractor:${normalizeTractor(master.tractorNumber)||master.id}`:(v.id!=null?`motive:${v.id}`:`motive-number:${number||'unknown'}`);
      if(!groups.has(key)) groups.set(key,{key,tractor:master,vehicle:v,trips:[]});
      const g=groups.get(key); if(!g.vehicle?.number && v.number) g.vehicle=v; g.trips.push(trip);
    }
    const result=[...groups.values()].map(g=>{
      g.trips.sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')) || (Number(a.start_odometer??1e18)-Number(b.start_odometer??1e18)) || (Number(a.end_odometer??1e18)-Number(b.end_odometer??1e18)) || String(a.jurisdiction||'').localeCompare(String(b.jurisdiction||'')));
      const t=g.tractor, v=g.vehicle||{}, jurisdictionMap=new Map();
      for(const r of g.trips){ const j=String(r.jurisdiction||'Unknown').toUpperCase(); jurisdictionMap.set(j,(jurisdictionMap.get(j)||0)+(Number(r.distance)||0)); }
      const odoRows=g.trips.filter(r=>Number.isFinite(Number(r.start_odometer)) || Number.isFinite(Number(r.end_odometer)));
      const startOdo=odoRows.length ? (Number.isFinite(Number(odoRows[0].start_odometer))?Number(odoRows[0].start_odometer):null) : null;
      const endOdo=odoRows.length ? (Number.isFinite(Number(odoRows[odoRows.length-1].end_odometer))?Number(odoRows[odoRows.length-1].end_odometer):null) : null;
      return {...g,
        tractorNumber:String(t?.tractorNumber||v.number||'').trim(),
        domicile:String(t?.domicile||'').trim(),
        vin:String(t?.vin||v.vin||'').trim().toUpperCase(),
        makeModel:String(t?.makeModel||[v.year,v.make,v.model].filter(Boolean).join(' ')).trim(),
        totalMiles:g.trips.reduce((sum,r)=>sum+(Number(r.distance)||0),0),
        jurisdictionMap,startOdo,endOdo,
        missingMaster:!t,missingDomicile:!String(t?.domicile||'').trim()
      };
    });
    result.sort((a,b)=>String(a.tractorNumber).localeCompare(String(b.tractorNumber),undefined,{numeric:true}));
    return result;
  }
  function ivmrJurisdictionText(g){
    return [...g.jurisdictionMap.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([j,m])=>`${j} ${fmtIvmrMiles(m)}`).join(' • ') || '—';
  }
  function ivmrCompletedWeek(now=new Date()){
    // Use the last fully completed Friday, including when today is Friday.
    const end=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    end.setDate(end.getDate()-((end.getDay()+2)%7||7));
    const start=new Date(end); start.setDate(start.getDate()-6);
    return {start:isoLocal(start),end:isoLocal(end)};
  }
  function setIvmrDefaultDates(){
    if(!$('ivmrStartDate')||!$('ivmrEndDate')) return;
    const week=ivmrCompletedWeek();
    if(!$('ivmrStartDate').value) $('ivmrStartDate').value=week.start;
    if(!$('ivmrEndDate').value) $('ivmrEndDate').value=week.end;
    if($('ivmrHistoryStart')&&!$('ivmrHistoryStart').value) $('ivmrHistoryStart').value=week.start;
    if($('ivmrHistoryEnd')&&!$('ivmrHistoryEnd').value) $('ivmrHistoryEnd').value=week.end;
  }
  async function saveIvmrSnapshot(){
    if(!state.ivmr.loadedAt) return;
    if(cloudConnected()) await saveCloudModule('ivmr',true);
    if(!state.directoryHandle) return;
    try{
      if(!(await requestPermission(state.directoryHandle,'readwrite'))) return;
      const root=await state.directoryHandle.getDirectoryHandle('IVMR',{create:true});
      const period=`${state.ivmr.startDate}_to_${state.ivmr.endDate}`;
      const dir=await root.getDirectoryHandle(period,{create:true});
      const snapshot={source:'Motive IFTA trips + Mileage Report segmentation',startDate:state.ivmr.startDate,endDate:state.ivmr.endDate,loadedAt:state.ivmr.loadedAt,formatBuilt:state.ivmr.formatBuilt,rawTrips:state.ivmr.rawTrips,trips:state.ivmr.trips};
      await writeFile(dir,'motive_ifta_snapshot.json',JSON.stringify(snapshot,null,2),'application/json');
    }catch(err){ console.warn('Could not save IVMR snapshot',err); }
  }
  function ivmrTripCacheKey(r){
    if(r?.id!=null && r.id!=='') return `id:${r.id}`;
    const v=r?.vehicle||{};
    return [r?.date||'',r?.jurisdiction||'',v.id||v.number||'',r?.start_odometer??'',r?.end_odometer??'',r?.distance??''].join('|');
  }
  async function loadIvmrRouteCache(start,end){
    if(!state.directoryHandle) return null;
    try{
      if(!(await hasPermission(state.directoryHandle,'read'))) return null;
      const root=await state.directoryHandle.getDirectoryHandle('IVMR');
      const dir=await root.getDirectoryHandle(`${start}_to_${end}`);
      const fh=await dir.getFileHandle('route_cache.json');
      const file=await fh.getFile(); const parsed=JSON.parse(await file.text());
      if(Number(parsed?.version||0)<72) return null;
      const stamp=String(state.ivmrLocations?.updatedAt||'builtin-v72');
      if(String(parsed?.locationMasterStamp||'')!==stamp) return null;
      if(!Array.isArray(parsed?.formattedTrips)||!parsed.formattedTrips.length) return null;
      return parsed;
    }catch(_){ return null; }
  }
  async function saveIvmrRouteCache(){
    if(!state.directoryHandle || !state.ivmr.loadedAt) return;
    try{
      if(!(await requestPermission(state.directoryHandle,'readwrite'))) return;
      const root=await state.directoryHandle.getDirectoryHandle('IVMR',{create:true});
      const dir=await root.getDirectoryHandle(`${state.ivmr.startDate}_to_${state.ivmr.endDate}`,{create:true});
      const payload={
        version:72,updatedAt:new Date().toISOString(),locationMasterStamp:String(state.ivmrLocations?.updatedAt||'builtin-v72'),
        provider:'Motive v3 History + Census TIGER/Line road matching',
        formatBuilt:!!state.ivmr.formatBuilt,
        formattedTrips:state.ivmr.formatBuilt?(state.ivmr.trips||[]):[]
      };
      await writeFile(dir,'route_cache.json',JSON.stringify(payload,null,2),'application/json');
    }catch(err){ console.warn('Could not save IVMR route cache',err); }
  }

  function ivmrRouteCoverage(){
    const needed=(state.ivmr.trips||[]).filter(r=>(Number(r.distance)||0)>0.05);
    const matched=needed.filter(r=>String(r.highway||'').trim()).length;
    const attempted=needed.filter(r=>r.route_status).length;
    return {needed:needed.length,matched,attempted,missing:Math.max(0,needed.length-matched)};
  }
  async function buildIvmrRoutes(options={}){
    const raw=(state.ivmr.rawTrips||[]).length?state.ivmr.rawTrips:(state.ivmr.trips||[]);
    if(!state.ivmr.loadedAt || !raw.length){ if(!options.silent) showAlert('Load Motive IFTA data first.','warning'); return false; }
    if(!state.motive.backendAvailable||!state.motive.configured){ if(!options.silent) showAlert('Connect Motive before reconstructing routes.','warning'); return false; }

    // v72 always rebuilds from the underlying Motive fragments. The backend converts
    // them to the same middle-granularity rows used by the supplied Mileage Reports:
    // date/state boundaries plus recognized stop/city-spot boundaries.
    const groups=new Map();
    for(const r of raw){
      const key=`${r?.vehicle?.id||r?.vehicle?.number||'unknown'}`;
      if(!groups.has(key)) groups.set(key,[]);
      groups.get(key).push(r);
    }
    const batches=[...groups.entries()];
    state.ivmr.routeLoading=true; state.ivmr.routeCancelRequested=false; state.ivmr.formatBuilt=false;
    state.ivmr.routeProgress={done:0,total:raw.length,matched:0,failed:0,batchesDone:0,batchesTotal:batches.length,message:'Building Mileage Report segments…'};
    state.ivmr.trips=[];
    renderIvmr();
    if(!options.silent) showAlert(`Building Mileage Report-style IVMR rows from <strong>${raw.length}</strong> underlying Motive IFTA fragment${raw.length===1?'':'s'}.`,'success');

    try{
      for(let bi=0; bi<batches.length; bi++){
        if(state.ivmr.routeCancelRequested) break;
        const [,batch]=batches[bi];
        const tractor=batch[0]?.vehicle?.number||'tractor';
        state.ivmr.routeProgress.message=`Processing ${tractor} (${bi+1}/${batches.length})`;
        renderIvmr();
        try{
          const data=await localApi('/api/motive/ifta/routes',{method:'POST',body:JSON.stringify({trips:batch,locations:state.ivmrLocations?.locations||[]}),timeoutMs:90000});
          const formatted=Array.isArray(data.trips)?data.trips:[];
          if(data.stats) state.ivmr.routeStats={...(state.ivmr.routeStats||{}),[String(tractor)]:data.stats};
          state.ivmr.trips.push(...formatted);
          state.ivmr.trips.sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||String(a.vehicle?.number||'').localeCompare(String(b.vehicle?.number||''),undefined,{numeric:true})||(Number(a.start_odometer)||0)-(Number(b.start_odometer)||0));
          const moving=formatted.filter(r=>(Number(r.distance)||0)>0.05);
          const matched=moving.filter(r=>String(r.highway||'').trim()).length;
          state.ivmr.routeProgress.matched+=matched;
          state.ivmr.routeProgress.failed+=Math.max(0,moving.length-matched);
        }catch(err){
          console.warn('IVMR Mileage Report build failed',err);
          state.ivmr.trips.push(...batch.map(r=>({...r,route_status:'timeout',route_message:String(err.message||err),format_version:72})));
          state.ivmr.routeProgress.failed+=batch.filter(r=>(Number(r.distance)||0)>0.05).length;
        }
        state.ivmr.routeProgress.done+=batch.length;
        state.ivmr.routeProgress.batchesDone=bi+1;
        renderIvmr();
        await new Promise(resolve=>setTimeout(resolve,30));
      }
      const completed=!state.ivmr.routeCancelRequested && state.ivmr.routeProgress.batchesDone===batches.length;
      state.ivmr.formatBuilt=completed;
      if(completed) await saveIvmrRouteCache();
      await saveIvmrSnapshot();
      const c=ivmrRouteCoverage();
      if(state.ivmr.routeCancelRequested){
        state.ivmr.routeProgress.message=`Stopped after ${state.ivmr.routeProgress.batchesDone} of ${batches.length} tractors.`;
        if(!options.silent) showAlert('Mileage Report build stopped. Run it again to rebuild the complete reporting period.','warning');
      }else{
        state.ivmr.routeProgress.message=`Complete. ${state.ivmr.trips.length} IVMR rows created; ${c.matched} of ${c.needed} moving rows have routes.`;
        if(!options.silent) showAlert(`IVMR formatting complete: <strong>${raw.length}</strong> underlying Motive IFTA fragments became <strong>${state.ivmr.trips.length}</strong> Mileage Report-style rows. <strong>${c.matched}</strong> of <strong>${c.needed}</strong> moving rows have Highway / Route data.${c.missing?` ${c.missing} row${c.missing===1?'':'s'} remain for review.`:''}`,'success');
      }
      return completed && (c.matched>0||c.needed===0);
    }finally{
      state.ivmr.routeLoading=false; state.ivmr.routeCancelRequested=false; renderIvmr();
    }
  }

  async function loadIvmrData(){
    setIvmrDefaultDates();
    if(!hasWorkspace()){ showAlert('Connect NBL Cloud or choose your NBL business data folder first.','warning'); return; }
    if(!state.motive.backendAvailable){ showAlert('Open NBL FleetCommand using the Mac app or local launcher before loading IVMR data.','warning'); return; }
    if(!state.motive.configured){ showAlert('Connect a Motive API key before loading IVMR data.','warning'); return; }
    const start=$('ivmrStartDate').value, end=$('ivmrEndDate').value;
    if(!start||!end||start>end){ showAlert('Choose a valid IVMR start and end date.','warning'); return; }
    state.ivmr.loading=true; renderIvmr();
    try{
      const qs=new URLSearchParams({start_date:start,end_date:end});
      const data=await localApi('/api/motive/ifta/trips?'+qs.toString());
      state.ivmr.startDate=start; state.ivmr.endDate=end; state.ivmr.rawTrips=Array.isArray(data.trips)?data.trips:[]; state.ivmr.trips=state.ivmr.rawTrips.map(r=>({...r})); state.ivmr.formatBuilt=false; state.ivmr.loadedAt=new Date().toISOString(); state.ivmr.routeStats=null; state.ivmr.routeProgress=null;
      const routeCache=await loadIvmrRouteCache(start,end);
      if(routeCache?.formattedTrips?.length){ state.ivmr.trips=routeCache.formattedTrips; state.ivmr.formatBuilt=true; }
      await saveIvmrSnapshot(); renderIvmr(); setScreen('ivmr');
      const groups=ivmrGroups(), missing=groups.filter(g=>g.missingMaster||g.missingDomicile).length;
      showAlert(`Loaded <strong>${state.ivmr.rawTrips.length}</strong> underlying Motive IFTA fragment${state.ivmr.rawTrips.length===1?'':'s'} across <strong>${groups.length}</strong> tractor${groups.length===1?'':'s'}.${state.ivmr.formatBuilt?` Restored <strong>${state.ivmr.trips.length}</strong> cached Mileage Report-style IVMR rows.`:' Run Build Routes to create the Mileage Report-style rows.'}${missing?` ${missing} tractor${missing===1?' needs':'s need'} domicile/master-data review before PDF export.`:''}`,'success');
    }catch(err){ console.error(err); showAlert(`Could not load Motive IFTA data: ${escapeHtml(err.message)}`,'error'); }
    finally{ state.ivmr.loading=false; renderIvmr(); }
  }
  function ivmrHistoryFmtTimestamp(value){
    const s=String(value||'').trim(); if(!s) return '—';
    const d=new Date(s); if(Number.isNaN(d.getTime())) return s;
    return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',second:'2-digit',timeZoneName:'short'}).format(d);
  }
  function ivmrHistoryLocation(row,prefix){
    const label=String(row?.[prefix+'_location']||'').trim(); return label||'—';
  }
  async function runIvmrHistoryTest(){
    const h=state.ivmr.historyTest;
    if(!state.motive.backendAvailable){ showAlert('Open NBL FleetCommand using the Mac app or local launcher before running the Motive history test.','warning'); return; }
    if(!state.motive.configured){ showAlert('Connect Motive before running the history test.','warning'); return; }
    const tractor=String($('ivmrHistoryTractor')?.value||'').trim(), start=$('ivmrHistoryStart')?.value||'', end=$('ivmrHistoryEnd')?.value||'';
    if(!tractor||!start||!end||start>end){ showAlert('Enter a tractor number and valid history start/end dates.','warning'); return; }
    h.loading=true; h.error=''; h.result=null; renderIvmrHistoryTest();
    try{
      const qs=new URLSearchParams({tractor_number:tractor,start_date:start,end_date:end});
      const data=await localApi('/api/motive/history-test?'+qs.toString(),{timeoutMs:90000});
      h.result=data; h.error='';
      showAlert(`Motive history test returned <strong>${fmtNum(data.point_count||0)}</strong> GPS/history point${Number(data.point_count)===1?'':'s'} for tractor <strong>${escapeHtml(data.tractor_number||tractor)}</strong>.`, data.point_count?'success':'warning');
    }catch(err){
      console.error(err); h.error=String(err.message||err); showAlert(`Motive history test failed: ${escapeHtml(h.error)}`,'error');
    }finally{ h.loading=false; renderIvmrHistoryTest(); }
  }
  function downloadIvmrHistoryJson(){
    const r=state.ivmr.historyTest?.result; if(!r) return;
    const name=`NBL_Motive_History_${sanitize(r.tractor_number||'tractor')}_${r.start_date||'start'}_to_${r.end_date||'end'}.json`;
    downloadBlob(JSON.stringify(r,null,2),name,'application/json');
  }
  function renderIvmrHistoryTest(){
    const box=$('ivmrHistoryResults'); if(!box) return;
    const h=state.ivmr.historyTest||{}, r=h.result;
    const run=$('runIvmrHistoryTestBtn'), dl=$('downloadIvmrHistoryJsonBtn'), status=$('ivmrHistoryTestStatus'), note=$('ivmrHistoryTestNote');
    if(run){ run.disabled=h.loading||!state.motive.backendAvailable||!state.motive.configured; run.textContent=h.loading?'Loading Motive History…':'Run Motive History Test'; }
    if(dl) dl.disabled=!r||h.loading;
    if(status) status.textContent=h.loading?'Running…':(h.error?'Failed':(r?`${fmtNum(r.point_count||0)} points`:'Not run'));
    if(note){
      if(h.error) note.innerHTML=`<strong>Test failed:</strong> ${escapeHtml(h.error)}`;
      else if(r){
        const historyState=r.history_verified||Number(r.point_count||0)>0
          ? ` • breadcrumb history: <strong>verified</strong> (${fmtNum(r.point_count||0)} points)`
          : (r.history_error?` • breadcrumb history: <strong>unavailable</strong> (${escapeHtml(r.history_error)})`:'');
        note.innerHTML=`Motive API used: <strong>${escapeHtml(r.api_version||'—')}</strong> • vehicle ID <strong>${escapeHtml(String(r.vehicle_id??'—'))}</strong> from <strong>${escapeHtml(r.vehicle_id_source||'—')}</strong>${historyState}${r.v3_fallback_message?` • request fallback note: ${escapeHtml(r.v3_fallback_message)}`:''}`;
      }
      else note.textContent='This does not change IVMR data. It only reads Motive history and shows what NBL actually receives.';
    }
    const cards=$('ivmrHistoryCards');
    if(cards) cards.innerHTML=r?[
      ['History Points',fmtNum(r.point_count||0),''],
      ['Days With Data',`${fmtNum(r.days_with_points||0)} / ${fmtNum((r.days||[]).length)}`,(r.days_with_points||0)?'':'danger'],
      ['First Reading',ivmrHistoryFmtTimestamp(r.first_at),''],
      ['Last Reading',ivmrHistoryFmtTimestamp(r.last_at),''],
      ['Odometer Change',r.odometer_delta==null?'—':`${Number(r.odometer_delta).toFixed(1)} mi`,''],
      ['Fallback',r.driving_periods_skipped?'Not needed':fmtNum(r.driving_period_count||0),(r.driving_period_count||0)?'':''],
      ['API',String(r.api_version||'—'),'']
    ].map(x=>`<div class="summary-card ${x[2]}"><span>${x[0]}</span><strong>${escapeHtml(String(x[1]))}</strong></div>`).join(''):'';
    box.classList.toggle('hidden',!r);
    if(!r) return;
    const days=Array.isArray(r.days)?r.days:[];
    const dt=$('ivmrHistoryDayTable');
    dt.querySelector('thead').innerHTML='<tr>'+['Date','Points','Moving','First Reading','Last Reading','Start Odo','End Odo','Odo Δ','GPS Miles*','First Location','Last Location','Motive Descriptions'].map(h=>`<th>${h}</th>`).join('')+'</tr>';
    dt.querySelector('tbody').innerHTML=days.map(d=>`<tr class="${d.point_count?'':'ivmr-history-empty-day'}"><td><strong>${fmtDate(d.date)}</strong></td><td>${fmtNum(d.point_count||0)}</td><td>${fmtNum(d.moving_points||0)}</td><td>${ivmrHistoryFmtTimestamp(d.first_at)}</td><td>${ivmrHistoryFmtTimestamp(d.last_at)}</td><td>${d.start_odometer==null?'—':fmtIvmrMiles(d.start_odometer)}</td><td>${d.end_odometer==null?'—':fmtIvmrMiles(d.end_odometer)}</td><td>${d.odometer_delta==null?'—':Number(d.odometer_delta).toFixed(1)}</td><td>${d.gps_distance_miles==null?'—':Number(d.gps_distance_miles).toFixed(1)}</td><td>${escapeHtml(ivmrHistoryLocation(d,'first'))}</td><td>${escapeHtml(ivmrHistoryLocation(d,'last'))}</td><td>${(d.descriptions||[]).length?escapeHtml((d.descriptions||[]).join(' • ')):'—'}</td></tr>`).join('');
    const periods=Array.isArray(r.driving_periods)?r.driving_periods:[];
    const pt=$('ivmrDrivingPeriodsTable');
    if(pt){
      pt.querySelector('thead').innerHTML='<tr>'+['Start','End','Origin','Destination','Distance','Vehicle ID'].map(h=>`<th>${h}</th>`).join('')+'</tr>';
      pt.querySelector('tbody').innerHTML=periods.length?periods.map(p=>`<tr><td>${ivmrHistoryFmtTimestamp(p.start_time)}</td><td>${ivmrHistoryFmtTimestamp(p.end_time)}</td><td>${escapeHtml(p.origin||'—')}</td><td>${escapeHtml(p.destination||'—')}</td><td>${p.distance==null||p.distance===''?'—':escapeHtml(String(p.distance))}</td><td>${escapeHtml(String(p.vehicle_id??'—'))}</td></tr>`).join(''):`<tr><td colspan="6" class="empty-table-cell">${r.driving_periods_skipped?'Fallback not needed because Motive breadcrumb history was returned successfully.':(r.driving_periods_error?`Driving-period fallback failed: ${escapeHtml(r.driving_periods_error)}`:'No driving periods were returned.')}</td></tr>`;
    }
    const raw=Array.isArray(r.sample)?r.sample:[];
    const rt=$('ivmrHistoryRawTable');
    rt.querySelector('thead').innerHTML='<tr>'+['Timestamp','Latitude','Longitude','Speed','Odometer','Type','Motive Description'].map(h=>`<th>${h}</th>`).join('')+'</tr>';
    rt.querySelector('tbody').innerHTML=raw.length?raw.map(p=>`<tr><td>${ivmrHistoryFmtTimestamp(p.located_at)}</td><td>${p.lat==null?'—':Number(p.lat).toFixed(6)}</td><td>${p.lon==null?'—':Number(p.lon).toFixed(6)}</td><td>${p.speed==null?'—':Number(p.speed).toFixed(1)}</td><td>${p.odometer==null?'—':fmtIvmrMiles(p.odometer)}</td><td>${escapeHtml(p.type||'—')}</td><td>${escapeHtml(p.description||'—')}</td></tr>`).join(''):'<tr><td colspan="7" class="empty-table-cell">No raw history points were returned.</td></tr>';
  }

  function renderIvmr(){
    if(!$('ivmrScreen')) return;
    setIvmrDefaultDates();
    renderIvmrHistoryTest();
    const groups=ivmrGroups(), loaded=!!state.ivmr.loadedAt, totalMiles=groups.reduce((s,g)=>s+g.totalMiles,0);
    const jurisdictions=new Set((state.ivmr.trips||[]).map(r=>String(r.jurisdiction||'').toUpperCase()).filter(Boolean));
    const missing=groups.filter(g=>g.missingMaster||g.missingDomicile).length;
    const routeCoverage=ivmrRouteCoverage();
    $('loadIvmrBtn').disabled=state.ivmrDirectory.loading||!state.motive.backendAvailable||!state.motive.configured||state.ivmr.loading||state.ivmr.routeLoading;
    if($('buildIvmrRoutesBtn')) { $('buildIvmrRoutesBtn').disabled=state.ivmrDirectory.loading||!loaded||!state.ivmr.trips.length||state.ivmr.loading||state.ivmr.routeLoading; $('buildIvmrRoutesBtn').textContent=state.ivmr.routeLoading?'Building Routes…':'Build Routes from Motive History'; }
    if($('cancelIvmrRoutesBtn')) { $('cancelIvmrRoutesBtn').classList.toggle('hidden',!state.ivmr.routeLoading); $('cancelIvmrRoutesBtn').disabled=!state.ivmr.routeLoading; }
    $('exportAllIvmrBtn').disabled=state.ivmrDirectory.loading||!loaded||!groups.length||state.ivmr.loading||state.ivmr.routeLoading;
    if($('ivmrRouteProgress')){
      const p=state.ivmr.routeProgress, el=$('ivmrRouteProgress');
      const visible=!!(p&&p.total); el.classList.toggle('hidden',!visible);
      if(visible){ const pct=Math.max(0,Math.min(100,Math.round((p.done/p.total)*100))); el.innerHTML=`<div class="ivmr-route-progress-head"><strong>${escapeHtml(p.message||'Building highway routes…')}</strong><span>${pct}%</span></div><div class="ivmr-route-progress-track"><div class="ivmr-route-progress-bar" style="width:${pct}%"></div></div><div class="ivmr-route-progress-meta"><span>${fmtNum(p.done)} / ${fmtNum(p.total)} rows processed</span><span>${fmtNum(p.matched)} matched • ${fmtNum(p.failed)} review/failed</span></div>`; }
    }
    $('ivmrSourceNote').innerHTML=!state.motive.backendAvailable
      ? '<strong>Local Motive service is not running.</strong> Start the NBL FleetCommand Mac app.'
      : (!state.motive.configured?'Connect Motive first.':(loaded?(state.ivmr.formatBuilt?`Mileage Report-style IVMR rows built for ${fmtDate(state.ivmr.startDate)} through ${fmtDate(state.ivmr.endDate)} from the underlying Motive IFTA fragments.`:`Loaded underlying Motive IFTA fragments for ${fmtDate(state.ivmr.startDate)} through ${fmtDate(state.ivmr.endDate)}. Run Build Routes to create Mileage Report-style rows.`):'Ready to load Motive IFTA data.'));
    $('ivmrCards').innerHTML=[
      ['IVMR Miles',loaded?fmtIvmrMiles(totalMiles):'—',''],
      ['Tractors',fmtNum(groups.length),''],
      ['Jurisdictions',loaded?fmtNum(jurisdictions.size):'—',''],
      ['Highway Routes',loaded?`${fmtNum(routeCoverage.matched)} / ${fmtNum(routeCoverage.needed)}`:'—',loaded&&routeCoverage.missing?'danger':''],
      ['Missing Domicile / Master',fmtNum(missing),missing?'danger':'']
    ].map(x=>`<div class="summary-card ${x[2]}"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
    $('ivmrTractorCount').textContent=`${groups.length} tractor${groups.length===1?'':'s'}`;
    $('ivmrTripCount').textContent=`${state.ivmr.trips.length} IVMR row${state.ivmr.trips.length===1?'':'s'}`;
    $('ivmrMissingDomicileCount').textContent=`${missing} missing`;

    renderIvmrLocations();

    const filter=$('ivmrTractorFilter'), current=filter.value||'all';
    filter.innerHTML='<option value="all">All tractors</option>'+groups.map(g=>`<option value="${escapeHtml(g.key)}">${escapeHtml(g.tractorNumber||'Unknown')}</option>`).join('');
    if([...filter.options].some(o=>o.value===current)) filter.value=current;

    const t=$('ivmrTractorTable');
    t.querySelector('thead').innerHTML='<tr>'+['Tractor','Domicile','VIN','Make / Model','Beginning Odo','Ending Odo','IVMR Miles','Jurisdictions','IVMR Rows','Status',''].map(h=>`<th>${h}</th>`).join('')+'</tr>';
    t.querySelector('tbody').innerHTML=groups.length?groups.map(g=>{
      let status=g.missingMaster?'<span class="status-pill overdue">Not in Tractor Master</span>':(g.missingDomicile?'<span class="status-pill overdue">Domicile Required</span>':(!g.trips.length?'<span class="status-pill baseline">No IFTA Data</span>':'<span class="status-pill yes">Ready</span>'));
      let action='';
      if(g.tractor) action=`<div class="row-actions"><button class="table-action" data-ivmr-pdf="${escapeHtml(g.key)}" ${g.missingDomicile?'disabled':''}>PDF</button><button class="table-action" data-ivmr-edit-tractor="${escapeHtml(g.tractor.id)}">Edit</button></div>`;
      else action=`<button class="table-action" data-ivmr-add-tractor="${escapeHtml(g.key)}">Add Tractor</button>`;
      return `<tr class="${g.missingMaster||g.missingDomicile?'ivmr-warning-row':''}"><td><strong>${escapeHtml(g.tractorNumber||'—')}</strong></td><td>${g.domicile?escapeHtml(g.domicile):'<span class="ivmr-missing">Missing</span>'}</td><td>${escapeHtml(g.vin||'—')}</td><td>${escapeHtml(g.makeModel||'—')}</td><td>${g.startOdo==null?'—':fmtIvmrMiles(g.startOdo)}</td><td>${g.endOdo==null?'—':fmtIvmrMiles(g.endOdo)}</td><td><strong>${fmtIvmrMiles(g.totalMiles)}</strong></td><td class="ivmr-jurisdiction-cell">${escapeHtml(ivmrJurisdictionText(g))}</td><td>${fmtNum(g.trips.length)}</td><td>${status}</td><td>${action}</td></tr>`;
    }).join(''):'<tr><td colspan="11" class="empty-table-cell">Add tractors to Maintenance, then load Motive IFTA data for the reporting period.</td></tr>';

    const selectedKey=filter.value||'all';
    const detail=(state.ivmr.trips||[]).filter(r=>{
      if(selectedKey==='all') return true;
      const master=ivmrMasterForVehicle(r.vehicle||{}), key=master?`tractor:${normalizeTractor(master.tractorNumber)||master.id}`:(r.vehicle?.id!=null?`motive:${r.vehicle.id}`:`motive-number:${ivmrVehicleNumber(r)||'unknown'}`);
      return key===selectedKey;
    });
    const d=$('ivmrDetailTable');
    d.querySelector('thead').innerHTML='<tr>'+['Date','Tractor','Domicile','Jurisdiction','Beginning Odo','Ending Odo','Miles','Origin / Destination','Highway / Route','Route Status','Start GPS','End GPS'].map(h=>`<th>${h}</th>`).join('')+'</tr>';
    d.querySelector('tbody').innerHTML=detail.length?detail.map(r=>{
      const master=ivmrMasterForVehicle(r.vehicle||{}), gps=(lat,lon)=>lat==null||lon==null?'—':`${Number(lat).toFixed(5)}, ${Number(lon).toFixed(5)}`;
      const routeStatus=String(r.route_status||''); const routeLabel=routeStatus==='matched'?'<span class="status-pill yes">Road Matched</span>':(routeStatus==='route_fallback'?'<span class="status-pill yes">Route Found</span>':(routeStatus==='review'?'<span class="status-pill baseline">Review</span>':(routeStatus==='not_needed'?'<span class="status-pill baseline">No movement</span>':(routeStatus?'<span class="status-pill overdue">Failed</span>':'<span class="status-pill baseline">Not built</span>'))));
      return `<tr><td>${fmtDate(r.date)}</td><td><strong>${escapeHtml(r.vehicle?.number||'—')}</strong></td><td>${escapeHtml(master?.domicile||'—')}</td><td><strong>${escapeHtml(String(r.jurisdiction||'').toUpperCase()||'—')}</strong></td><td>${r.start_odometer==null?'—':fmtIvmrMiles(r.start_odometer)}</td><td>${r.end_odometer==null?'—':fmtIvmrMiles(r.end_odometer)}</td><td>${fmtIvmrMiles(r.distance)}</td><td><strong>${escapeHtml(r.origin_destination||'—')}</strong>${r.location_method?`<small>${escapeHtml(r.location_method)}</small>`:''}</td><td><strong>${escapeHtml(r.highway||'—')}</strong>${r.route_provider?`<small>${escapeHtml(r.route_provider)}</small>`:''}${r.route_message?`<small>${escapeHtml(r.route_message)}</small>`:''}</td><td>${routeLabel}</td><td>${escapeHtml(gps(r.start_lat,r.start_lon))}</td><td>${escapeHtml(gps(r.end_lat,r.end_lon))}</td></tr>`;
    }).join(''):'<tr><td colspan="12" class="empty-table-cell">No IFTA trip rows are loaded for this selection.</td></tr>';

    const domicileRows=groups.map(g=>{
      if(g.tractor) return `<tr class="${g.missingDomicile?'ivmr-warning-row':''}"><td><strong>${escapeHtml(g.tractorNumber||'—')}</strong></td><td>${escapeHtml(g.vin||'—')}</td><td>${g.domicile?escapeHtml(g.domicile):'<span class="ivmr-missing">Missing domicile</span>'}</td><td>${g.missingDomicile?'<span class="status-pill overdue">Action Required</span>':'<span class="status-pill yes">Assigned</span>'}</td><td><button class="table-action" data-ivmr-edit-tractor="${escapeHtml(g.tractor.id)}">${g.missingDomicile?'Assign':'Edit'}</button></td></tr>`;
      return `<tr class="ivmr-warning-row"><td><strong>${escapeHtml(g.tractorNumber||'Unknown')}</strong></td><td>${escapeHtml(g.vin||'—')}</td><td><span class="ivmr-missing">Not in tractor master</span></td><td><span class="status-pill overdue">Action Required</span></td><td><button class="table-action" data-ivmr-add-tractor="${escapeHtml(g.key)}">Add Tractor</button></td></tr>`;
    });
    const dom=$('ivmrDomicileTable');
    dom.querySelector('thead').innerHTML='<tr>'+['Tractor','VIN','Domicile','Status',''].map(h=>`<th>${h}</th>`).join('')+'</tr>';
    dom.querySelector('tbody').innerHTML=domicileRows.length?domicileRows.join(''):'<tr><td colspan="5" class="empty-table-cell">No tractors have been added yet.</td></tr>';
  }

  const IVMR_ENTITY_NAME_KEY='nblIvmrEntityName';
  const IVMR_ENTITY_NUMBER_KEY='nblIvmrEntityNumber';
  const IVMR_TEMPLATE_W=1489, IVMR_TEMPLATE_H=2105, IVMR_PDF_W=595, IVMR_PDF_H=842;
  let _ivmrTemplatePromise=null;
  function loadIvmrTemplate(){
    if(_ivmrTemplatePromise) return _ivmrTemplatePromise;
    _ivmrTemplatePromise=new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>resolve(img);
      img.onerror=()=>reject(new Error('Could not load the FedEx FL-001 IVMR template.'));
      img.src='assets/ivmr-fl001-template.png?v=27';
    });
    return _ivmrTemplatePromise;
  }
  function ivmrEntityInputs(){
    return {
      name:String($('ivmrEntityName')?.value||'Nashbox Logistics Inc.').trim(),
      number:String($('ivmrEntityNumber')?.value||'').trim()
    };
  }
  function loadIvmrEntitySettings(){
    try{
      const n=localStorage.getItem(IVMR_ENTITY_NAME_KEY), no=localStorage.getItem(IVMR_ENTITY_NUMBER_KEY);
      if($('ivmrEntityName')) $('ivmrEntityName').value=n||'Nashbox Logistics Inc.';
      if($('ivmrEntityNumber')) $('ivmrEntityNumber').value=no||'';
    }catch(_){ }
  }
  function saveIvmrEntitySettings(){
    try{
      const v=ivmrEntityInputs();
      localStorage.setItem(IVMR_ENTITY_NAME_KEY,v.name||'Nashbox Logistics Inc.');
      localStorage.setItem(IVMR_ENTITY_NUMBER_KEY,v.number||'');
    }catch(_){ }
  }
  function ivmrUsDate(value){
    const d=parseFlexibleDate(value); if(!d) return String(value||'');
    return `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
  }
  function ivmrSameTractor(a,b){ return normalizeTractor(a) && normalizeTractor(a)===normalizeTractor(b); }
  function ivmrDateIso(value){ const d=parseFlexibleDate(value); return d?isoLocal(d):''; }
  function ivmrSettlementRowsForDate(group,dateIso){
    const rows=[];
    for(const item of state.catalog||[]){
      const r=item.result||{};
      for(const trip of [...(r.linehaul||[]),...(r.spots||[])]){
        if(!ivmrSameTractor(trip.vehicle,group.tractorNumber)) continue;
        if(ivmrDateIso(trip.date)!==dateIso) continue;
        rows.push({trip,names:r.names||{}});
      }
    }
    return rows;
  }
  function ivmrDriversForRows(group, rows){
    const dates=new Set((rows||[]).map(r=>String(r?.date||'')).filter(Boolean));
    const found=new Map();
    for(const dateIso of dates){
      for(const x of ivmrSettlementRowsForDate(group,dateIso)){
        for(const id of [x.trip.driver1,x.trip.driver2].filter(Boolean)){
          if(found.has(id)) continue;
          found.set(id,{id:String(id),name:String(x.names?.[id]||`Driver ${id}`)});
        }
      }
    }
    return [...found.values()].slice(0,4);
  }
  function ivmrOriginDestinationForRow(group,row){
    return String(row?.origin_destination||'').trim();
  }

  function ivmrLcvForRow(group,row){
    // The current Motive IFTA feed does not explicitly identify LCV/doubles status.
    // Leave this compliance field blank rather than infer it from another payment field.
    return '';
  }
  function ivmrRowChunks(group){
    const rows=(group.trips||[]).slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')) || (Number(a.start_odometer)||0)-(Number(b.start_odometer)||0) || String(a.jurisdiction||'').localeCompare(String(b.jurisdiction||'')));
    if(!rows.length) return [[]];
    // FL-001 instructs operators to begin a new IVMR at the start of a new month.
    // Respect month boundaries, then paginate at the form's 20 available detail rows.
    const byMonth=[]; let current=[], currentMonth='';
    for(const r of rows){
      const m=String(r.date||'').slice(0,7);
      if(current.length && m!==currentMonth){ byMonth.push(current); current=[]; }
      currentMonth=m; current.push(r);
    }
    if(current.length) byMonth.push(current);
    const chunks=[];
    for(const monthRows of byMonth){ for(let i=0;i<monthRows.length;i+=20) chunks.push(monthRows.slice(i,i+20)); }
    return chunks.length?chunks:[[]];
  }
  function ivmrCanvasRect(rect){
    const sx=IVMR_TEMPLATE_W/IVMR_PDF_W, sy=IVMR_TEMPLATE_H/IVMR_PDF_H;
    return {x:rect[0]*sx,y:rect[1]*sy,w:(rect[2]-rect[0])*sx,h:(rect[3]-rect[1])*sy};
  }
  function ivmrFitText(ctx,text,rect,opt={}){
    const r=ivmrCanvasRect(rect), value=String(text??'').trim(); if(!value) return;
    const align=opt.align||'left', weight=opt.weight||'normal', min=opt.min||12, max=opt.max||21;
    let size=max;
    ctx.textBaseline='middle'; ctx.textAlign=align; ctx.fillStyle='#111';
    while(size>min){ ctx.font=`${weight} ${size}px Arial, Helvetica, sans-serif`; if(ctx.measureText(value).width<=r.w-8) break; size--; }
    ctx.font=`${weight} ${size}px Arial, Helvetica, sans-serif`;
    let out=value;
    if(ctx.measureText(out).width>r.w-8){ while(out.length>1 && ctx.measureText(out+'...').width>r.w-8) out=out.slice(0,-1); out+='...'; }
    const x=align==='center'?r.x+r.w/2:(align==='right'?r.x+r.w-4:r.x+4);
    ctx.fillText(out,x,r.y+r.h/2+1);
  }
  const IVMR_HEADER_RECTS={
    home:[113.331,107.834,184.702,123.911], entityName:[272.150,108.618,419.598,124.303], entityNumber:[509.008,109.403,580.771,125.872], unit:[113.331,130.185,265.484,146.262]
  };
  const IVMR_DRIVER_RECTS=[
    {name:[39.215,169.790,267.053,186.259],number:[272.543,170.182,378.030,186.259]},
    {name:[38.999,191.180,266.837,207.649],number:[272.327,192.141,377.815,208.218]},
    {name:[38.999,212.355,266.837,228.824],number:[272.935,213.315,378.422,229.392]},
    {name:[38.607,232.922,266.445,249.391],number:[273.327,233.314,378.815,249.391]}
  ];
  const IVMR_ROW_Y=[339.6,356.8,373.7,390.2,406.9,423.1,439.6,456.0,473.3,489.8,506.4,522.7,539.6,556.0,572.9,589.4,607.0,623.5,640.1,656.4];
  function ivmrRowRects(y){
    return {
      date:[65.2,y,115.2,y+14.2], state:[118.5,y,187.4,y+14.2], begin:[190.0,y,247.1,y+14.2], end:[250.4,y-0.4,310.0,y+14.6], lcv:[313.5,y+0.4,344.4,y+14.2], origin:[348.0,y+0.4,468.0,y+14.2], highway:[470.5,y+0.4,579.2,y+14.8]
    };
  }
  async function renderIvmrCanvases(group){
    const template=await loadIvmrTemplate(), chunks=ivmrRowChunks(group), canvases=[];
    const entity=ivmrEntityInputs();
    for(const rows of chunks){
      const canvas=document.createElement('canvas'); canvas.width=IVMR_TEMPLATE_W; canvas.height=IVMR_TEMPLATE_H; const ctx=canvas.getContext('2d');
      ctx.drawImage(template,0,0,canvas.width,canvas.height);
      ivmrFitText(ctx,group.domicile||'',IVMR_HEADER_RECTS.home,{max:22,min:15});
      ivmrFitText(ctx,entity.name||'Nashbox Logistics Inc.',IVMR_HEADER_RECTS.entityName,{max:21,min:13});
      ivmrFitText(ctx,entity.number||'',IVMR_HEADER_RECTS.entityNumber,{max:21,min:13});
      ivmrFitText(ctx,group.tractorNumber||'',IVMR_HEADER_RECTS.unit,{max:22,min:14});
      const drivers=ivmrDriversForRows(group,rows);
      IVMR_DRIVER_RECTS.forEach((rr,i)=>{
        const d=drivers[i]; if(!d) return;
        ivmrFitText(ctx,d.name,rr.name,{max:20,min:12});
        ivmrFitText(ctx,d.id,rr.number,{max:20,min:12});
      });
      rows.slice(0,20).forEach((r,i)=>{
        const rr=ivmrRowRects(IVMR_ROW_Y[i]);
        ivmrFitText(ctx,ivmrUsDate(r.date),rr.date,{align:'center',max:18,min:12});
        ivmrFitText(ctx,String(r.jurisdiction||'').toUpperCase(),rr.state,{align:'center',max:19,min:13});
        ivmrFitText(ctx,r.start_odometer==null?'':new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(Number(r.start_odometer)),rr.begin,{align:'center',max:18,min:12});
        ivmrFitText(ctx,r.end_odometer==null?'':new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(Number(r.end_odometer)),rr.end,{align:'center',max:18,min:12});
        ivmrFitText(ctx,ivmrLcvForRow(group,r),rr.lcv,{align:'center',max:19,min:13});
        ivmrFitText(ctx,ivmrOriginDestinationForRow(group,r),rr.origin,{max:16,min:10});
        // Highway/route is reconstructed from Motive historical GPS breadcrumbs matched to official Census TIGER/Line roads.
        ivmrFitText(ctx,String(r.highway||r.route||''),rr.highway,{max:15,min:8});
      });
      canvases.push(canvas);
    }
    return canvases;
  }
  async function saveIvmrPdfBytes(bytes,fileName,download=true){
    let saved=false;
    if(state.directoryHandle){
      try{
        if(await requestPermission(state.directoryHandle,'readwrite')){
          const root=await state.directoryHandle.getDirectoryHandle('IVMR',{create:true});
          const period=`${state.ivmr.startDate}_to_${state.ivmr.endDate}`;
          const dir=await root.getDirectoryHandle(period,{create:true});
          await writeFile(dir,fileName,bytes,'application/pdf'); saved=true;
        }
      }catch(err){ console.warn('Could not save IVMR PDF',err); }
    }
    if(download) downloadBlob(bytes,fileName,'application/pdf');
    return saved;
  }
  async function buildIvmrPdf(group){
    const canvases=await renderIvmrCanvases(group), jpegs=[];
    for(const c of canvases) jpegs.push(await canvasJpegBytes(c));
    return jpegPagesToPdf(jpegs,IVMR_TEMPLATE_W,IVMR_TEMPLATE_H);
  }
  async function generateIvmrPdf(keys=null){
    if(!state.ivmr.loadedAt){ showAlert('Load IVMR data from Motive first.','warning'); return; }
    const coverageBefore=ivmrRouteCoverage();
    if(coverageBefore.missing>0){
      const proceed=window.confirm(`${coverageBefore.missing} moving IFTA row${coverageBefore.missing===1?' is':'s are'} missing a Highway / Route value.\n\nExport the PDF now with those route cells blank?\n\nChoose Cancel if you want to run Build Highway Routes first.`);
      if(!proceed) return;
    }
    const all=ivmrGroups(), groups=keys?all.filter(g=>keys.includes(g.key)):all;
    if(!groups.length){ showAlert('No tractors are available for IVMR export.','warning'); return; }
    const invalid=groups.filter(g=>g.missingMaster||g.missingDomicile);
    if(invalid.length){ showAlert(`Assign a domicile and tractor master record before exporting IVMR PDFs. Review: <strong>${invalid.map(g=>escapeHtml(g.tractorNumber||'Unknown')).join(', ')}</strong>.`,'error'); return; }
    try{
      if(groups.length===1){
        const g=groups[0], pdf=await buildIvmrPdf(g), name=`NBL_IVMR_${state.ivmr.startDate}_to_${state.ivmr.endDate}_Tractor_${sanitize(g.tractorNumber)}.pdf`;
        const saved=await saveIvmrPdfBytes(pdf,name,true);
        showAlert(`Generated IVMR PDF for tractor <strong>${escapeHtml(g.tractorNumber)}</strong>${saved?' and saved it in the IVMR reporting-period folder.':'.'}`,'success');
        return;
      }
      showAlert(`Generating individual IVMR PDFs for <strong>${groups.length}</strong> tractors…`,'success');
      const combinedJpegs=[]; let savedCount=0;
      for(const g of groups){
        const canvases=await renderIvmrCanvases(g), jpegs=[];
        for(const c of canvases){ const jpg=await canvasJpegBytes(c); jpegs.push(jpg); combinedJpegs.push(jpg); }
        const pdf=jpegPagesToPdf(jpegs,IVMR_TEMPLATE_W,IVMR_TEMPLATE_H), name=`NBL_IVMR_${state.ivmr.startDate}_to_${state.ivmr.endDate}_Tractor_${sanitize(g.tractorNumber)}.pdf`;
        if(await saveIvmrPdfBytes(pdf,name,false)) savedCount++;
      }
      const combined=jpegPagesToPdf(combinedJpegs,IVMR_TEMPLATE_W,IVMR_TEMPLATE_H), combinedName=`NBL_IVMR_${state.ivmr.startDate}_to_${state.ivmr.endDate}_All_Tractors.pdf`;
      await saveIvmrPdfBytes(combined,combinedName,true);
      showAlert(`Generated IVMRs for <strong>${groups.length}</strong> tractors. ${savedCount===groups.length?'All individual tractor PDFs were saved to the local IVMR folder.':`${savedCount} individual PDFs were saved.`} A combined fleet PDF was also downloaded.`,'success');
    }catch(err){ console.error(err); showAlert(`Could not generate IVMR PDF: ${escapeHtml(err.message)}`,'error'); }
  }
  function openTractorFromIvmr(key){
    const g=ivmrGroups().find(x=>x.key===key); if(!g) return;
    if(g.tractor){ openTractorModal(g.tractor.id); return; }
    openTractorModal();
    $('tractorNumberInput').value=g.tractorNumber||''; $('tractorVinInput').value=g.vin||''; $('tractorMakeModelInput').value=g.makeModel||''; $('tractorDomicileInput').value='';
    const mv=state.motive.vehicles.find(v=>normalizeTractor(v.number)===normalizeTractor(g.tractorNumber));
    const liveOdo=mv?motiveOdometer(mv):null, odo=liveOdo!=null?liveOdo:g.endOdo;
    if(odo!=null) $('tractorMileageInput').value=round0(odo);
    $('tractorMileageDateInput').value=(mv?motiveLocatedDate(mv):'')||state.ivmr.endDate||todayIso();
  }


  async function backendAuthHeaders(extra={}){
    const session=await window.NBLCloud?.getSession?.();
    if(!session?.access_token) throw new Error('Sign in to NBL Cloud before using the NBL server tools.');
    return {Authorization:`Bearer ${session.access_token}`,...extra};
  }
  async function localApi(path, options={}) {
    const timeoutMs=Number(options.timeoutMs)||0;
    const authHeaders=await backendAuthHeaders();
    const opts={...options,headers:{'Accept':'application/json',...authHeaders,...(options.headers||{})}};
    delete opts.timeoutMs;
    if(opts.body && !opts.headers['Content-Type']) opts.headers['Content-Type']='application/json';
    let timer=null, controller=null;
    if(timeoutMs>0 && !opts.signal){ controller=new AbortController(); opts.signal=controller.signal; timer=setTimeout(()=>controller.abort(),timeoutMs); }
    try{
      const resp=await fetch(path,opts);
      let data={};
      try{ data=await resp.json(); }catch(_){ data={}; }
      if(!resp.ok){ throw new Error(data.error||data.message||`Local integration service returned HTTP ${resp.status}.`); }
      return data;
    }catch(err){
      if(err?.name==='AbortError') throw new Error(`Request timed out after ${Math.round(timeoutMs/1000)} seconds.`);
      throw err;
    }finally{ if(timer) clearTimeout(timer); }
  }
  function motiveOdometer(v){
    const t=Number(v?.true_odometer); if(Number.isFinite(t) && t>0) return t;
    const o=Number(v?.odometer); return Number.isFinite(o) && o>0 ? o : null;
  }
  function motiveDriverName(v){
    const d=v?.current_driver; if(!d) return '—';
    const name=[d.first_name,d.last_name].filter(Boolean).join(' ').trim();
    return name || d.username || '—';
  }
  function motiveLocatedDate(v){
    const raw=String(v?.located_at||'').trim(); if(!raw) return '';
    const d=new Date(raw); return isNaN(d)?'':isoLocal(d);
  }
  function maintenanceMatchForMotive(v){
    const number=normalizeTractor(v?.number), vin=String(v?.vin||'').trim().toUpperCase();
    return state.maintenance.tractors.find(t=>normalizeTractor(t.tractorNumber)===number) || (vin ? state.maintenance.tractors.find(t=>String(t.vin||'').trim().toUpperCase()===vin) : null) || null;
  }
  function motiveVehicleForMaintenanceTractor(t){
    if(!t) return null;
    const stored=String(t.motiveVehicleId||'').trim(), number=normalizeTractor(t.tractorNumber), vin=String(t.vin||'').trim().toUpperCase();
    return (state.motive.vehicles||[]).find(v=>(stored&&String(v.id||'')===stored)||(number&&normalizeTractor(v.number)===number)||(vin&&String(v.vin||'').trim().toUpperCase()===vin))||null;
  }
  function setMaintenanceMotiveOdometerStatus(message='',kind=''){
    const el=$('maintenanceMotiveOdometerStatus'); if(!el) return;
    el.className='form-note motive-odometer-status'+(kind?` ${kind}`:''); el.textContent=message;
  }
  function clearMaintenanceMotiveOdometerSource(){
    const input=$('maintenanceOdometerInput'); if(!input) return;
    delete input.dataset.motiveOdometer; delete input.dataset.motiveLocatedAt; delete input.dataset.motiveVehicleId;
  }
  async function pullMaintenanceOdometerFromMotive(options={}){
    const seq=++maintenanceOdometerLookupSeq, silent=!!options.silent;
    const tractor=state.maintenance.tractors.find(t=>t.id===$('maintenanceTractorInput')?.value), serviceDate=$('maintenanceDateInput')?.value;
    if(!tractor||!serviceDate) return false;
    if(!state.motive.backendAvailable||!state.motive.configured){
      setMaintenanceMotiveOdometerStatus('Motive is not connected on this computer. Enter the odometer manually or connect Motive.','warning');
      if(!silent) showAlert('Connect Motive before pulling a historical maintenance odometer.','warning');
      return false;
    }
    let vehicle=motiveVehicleForMaintenanceTractor(tractor);
    if(!vehicle){
      try{ await refreshMotiveFleet(true); }catch(_err){}
      vehicle=motiveVehicleForMaintenanceTractor(tractor);
    }
    if(!vehicle||vehicle.id==null){
      setMaintenanceMotiveOdometerStatus(`No Motive vehicle match was found for tractor ${tractor.tractorNumber}.`, 'warning');
      if(!silent) showAlert(`No Motive vehicle match was found for tractor <strong>${escapeHtml(tractor.tractorNumber)}</strong>.`,'warning');
      return false;
    }
    const btn=$('pullMaintenanceOdometerBtn'); if(btn){btn.disabled=true;btn.textContent='Looking up…';}
    setMaintenanceMotiveOdometerStatus(`Looking up tractor ${tractor.tractorNumber} in Motive for ${fmtDate(serviceDate)}…`,'loading');
    try{
      const data=await localApi(`/api/motive/odometer?vehicle_id=${encodeURIComponent(vehicle.id)}&date=${encodeURIComponent(serviceDate)}`);
      if(seq!==maintenanceOdometerLookupSeq) return false;
      if(!data.found){
        clearMaintenanceMotiveOdometerSource();
        setMaintenanceMotiveOdometerStatus(data.message||'No Motive odometer was available for the selected date. Enter it manually.','warning');
        if(!silent) showAlert(data.message||'No historical Motive odometer was found for that date.','warning');
        return false;
      }
      const odo=Math.round(Number(data.odometer));
      if(!Number.isFinite(odo)||odo<=0) throw new Error('Motive returned an invalid odometer reading.');
      const input=$('maintenanceOdometerInput'); input.value=odo; input.dataset.motiveOdometer=String(odo); input.dataset.motiveLocatedAt=String(data.located_at||''); input.dataset.motiveVehicleId=String(vehicle.id);
      const when=data.located_at?new Date(data.located_at):null, whenText=when&&!isNaN(when)?when.toLocaleString():fmtDate(serviceDate);
      setMaintenanceMotiveOdometerStatus(`Motive mileage: ${fmtNum(odo)} mi • latest available reading for this date${whenText?` (${whenText})`:''}. You can override it if the service occurred earlier.`,'success');
      if(!silent) showAlert(`Pulled <strong>${fmtNum(odo)} miles</strong> from Motive for tractor <strong>${escapeHtml(tractor.tractorNumber)}</strong>.`,'success');
      return true;
    }catch(err){
      if(seq!==maintenanceOdometerLookupSeq) return false;
      clearMaintenanceMotiveOdometerSource(); setMaintenanceMotiveOdometerStatus(`Motive lookup failed: ${err.message}`,'error');
      if(!silent) showAlert(`Could not pull the historical Motive odometer: ${escapeHtml(err.message)}`,'error');
      return false;
    }finally{
      if(seq===maintenanceOdometerLookupSeq && btn){btn.disabled=false;btn.textContent='Pull from Motive';}
    }
  }
  async function maybeAutoPullMaintenanceOdometer(){
    const serviceDate=$('maintenanceDateInput')?.value;
    if(!serviceDate) return;
    clearMaintenanceMotiveOdometerSource();
    if(serviceDate<todayIso()) await pullMaintenanceOdometerFromMotive({silent:true});
    else setMaintenanceMotiveOdometerStatus('For past service dates, Motive mileage will be looked up automatically when available.','');
  }

  function safetyDefaultDates(){
    if(state.safety.startDate&&state.safety.endDate) return;
    const end=new Date(),start=addDays(end,-6);
    state.safety.startDate=isoLocal(start);state.safety.endDate=isoLocal(end);
  }
  function safetyDriverName(driver){return displayPersonName(driver?.name||[driver?.first_name,driver?.last_name].filter(Boolean).join(' ')||'');}
  function safetyDriverId(driver){return String(driver?.id??driver?.driver_id??'').trim();}
  function safetyEventId(event,source){return `${source}:${String(event?.id??event?.event_id??'unknown')}`;}
  function safetyEventDriver(event,source){
    const direct=event?.driver&&typeof event.driver==='object'?event.driver:null;
    if(direct&&safetyDriverId(direct)) return {id:safetyDriverId(direct),name:safetyDriverName(direct),source:'Motive'};
    const assigned=state.safety.assignments?.[safetyEventId(event,source)];
    return assigned?{...assigned,source:'FleetCommand'}:null;
  }
  function safetyEventType(event,source){return source==='speeding'?'speeding':String(event?.type||event?.event_type||event?.primary_behavior||'unknown').trim().toLowerCase();}
  function safetyEventTime(event){return event?.start_time||event?.event_time||event?.created_at||event?.end_time||'';}
  function safetyEventVehicle(event){const v=event?.vehicle||{};return String(v.number||v.vehicle_number||event?.vehicle_number||'').trim();}
  function safetyEventMediaUrl(event){
    const m=event?.camera_media||{},videos=m.downloadable_videos||{},images=m.downloadable_images||{};
    const url=videos.dual_facing_enhanced_url||videos.front_facing_enhanced_url||videos.front_facing_plain_url||images.front_facing_jpg_url||images.driver_facing_jpg_url||'';
    return /^https:\/\//i.test(String(url))?String(url):'';
  }
  function safetyDriverPool(){
    const map=new Map(),add=(id,name,employeeId='')=>{id=String(id||'').trim();name=displayPersonName(name);if(!name)return;const key=id||`name:${dispatchPersonNameKey(name)}`;if(!map.has(key))map.set(key,{id:key,name,employeeId:String(employeeId||'')});};
    for(const row of state.safety.scorecards||[]){const d=row.driver||{};if(!driverIsEligibleForWork(d))continue;add(safetyDriverId(d),safetyDriverName(d),d.driver_company_id);}
    for(const d of state.motive.drivers||[])if(motiveDriverIsActive(d))add(safetyDriverId(d),safetyDriverName(d),motiveDriverEmployeeId(d));
    for(const d of state.dispatch.drivers||[])if(dispatchDriverIsActive(d))add(d.motiveDriverId||d.id,d.name,d.fedexId);
    return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name));
  }
  function safetyAllEvents(){return [...(state.safety.performanceEvents||[]).map(event=>({source:'performance',event})),...(state.safety.speedingEvents||[]).map(event=>({source:'speeding',event}))];}
  const SAFETY_BEHAVIOR_WEIGHTS={mobile_device_usage:10,cell_phone:10,close_following:9,stop_sign_violation:7,seat_belt_violation:6,speeding:6,distraction:5,hard_braking:4,hard_brake:4,hard_cornering:2,hard_corner:2,hard_acceleration:1,hard_accel:1};
  function safetyNormalizedType(value){return String(value||'unknown').trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');}
  function safetyBehaviorWeight(item){const type=safetyNormalizedType(safetyEventType(item.event,item.source));return SAFETY_BEHAVIOR_WEIGHTS[type]??3;}
  function safetyMotiveDismissed(event){const values=[event?.status,event?.coaching_status,event?.review_status,event?.event_status,event?.metadata?.status,event?.metadata?.coaching_status];return values.some(v=>/dismiss|false.?positive|invalid/i.test(String(v||'')))||event?.dismissed===true||event?.is_dismissed===true;}
  function safetyDismissal(item){const key=safetyEventId(item.event,item.source);if(safetyMotiveDismissed(item.event))return {dismissed:true,source:'Motive'};const local=state.safety.dismissals?.[key];return local?.dismissed?{...local,source:'FleetCommand'}:{dismissed:false,source:''};}
  function safetyScoreBand(score){score=Number(score);if(!Number.isFinite(score))return 'Not Scored';if(score>=96)return 'Excellent';if(score>=85)return 'Needs Improvement';return 'Critical';}
  function safetyBandColor(score){const band=safetyScoreBand(score);return band==='Excellent'?'#18804B':band==='Needs Improvement'?'#C58A00':band==='Critical'?'#B42318':'#756C7D';}
  function safetyScorecardMiles(row){const km=Number(row?.total_kilometers);return Number.isFinite(km)&&km>0?km*0.621371:0;}
  function safetyAdjustedScore(row,all){
    const official=Number(row?.score),driverId=safetyDriverId(row?.driver||{}),miles=Math.max(1000,safetyScorecardMiles(row));
    if(!Number.isFinite(official))return {score:null,impact:0,count:0};
    const local=all.filter(item=>{const assigned=safetyEventDriver(item.event,item.source);return assigned?.source==='FleetCommand'&&assigned.id===driverId&&!safetyDismissal(item).dismissed;});
    const impact=local.reduce((sum,item)=>sum+safetyBehaviorWeight(item)*Math.min(1,1000/miles),0);
    return {score:Math.max(0,official-impact),impact,count:local.length};
  }
  function safetyIncidentRecord(item){const e=item.event||{},assignment=safetyEventDriver(e,item.source),dismissal=safetyDismissal(item);return {key:safetyEventId(e,item.source),date:safetyEventTime(e),type:safetyEventType(e,item.source),severity:String(e.metadata?.severity||e.severity||e.coaching_status||''),tractor:safetyEventVehicle(e),details:item.source==='speeding'?`${e.max_over_speed_in_kph!=null?`${Math.round(Number(e.max_over_speed_in_kph)*0.621371)} mph over limit`:''}${e.duration!=null?` • ${fmtNum(e.duration)} sec`:''}`:`${e.start_speed!=null?`${Math.round(Number(e.start_speed)*0.621371)} mph start`:''}${e.duration!=null?` • ${fmtNum(e.duration)} sec`:''}`,weight:safetyBehaviorWeight(item),dismissed:!!dismissal.dismissed,dismissedSource:dismissal.source||'',assignmentSource:assignment?.source||'',mediaUrl:safetyEventMediaUrl(e)};}
  function safetyRecordForDriver(driverId){return state.safety.driverRecords?.[String(driverId||'')]||null;}
  function recordCurrentSafetySnapshots(){
    if(!state.safety.driverRecords)state.safety.driverRecords={};const all=safetyAllEvents(),now=new Date().toISOString(),rangeKey=`${state.safety.startDate}|${state.safety.endDate}`;
    for(const row of state.safety.scorecards||[]){const d=row.driver||{},id=safetyDriverId(d);if(!id)continue;const adjusted=safetyAdjustedScore(row,all),incidents=all.filter(x=>safetyEventDriver(x.event,x.source)?.id===id).map(safetyIncidentRecord),counts={};for(const x of incidents)if(!x.dismissed)counts[x.type]=(counts[x.type]||0)+1;const record=state.safety.driverRecords[id]||{driverId:id,name:safetyDriverName(d),employeeId:String(d.driver_company_id||''),snapshots:[]};record.name=safetyDriverName(d)||record.name;record.employeeId=String(d.driver_company_id||record.employeeId||'');const snapshot={rangeKey,startDate:state.safety.startDate,endDate:state.safety.endDate,capturedAt:now,motiveScore:Number.isFinite(Number(row.score))?Number(row.score):null,adjustedScore:adjusted.score,miles:safetyScorecardMiles(row),rating:safetyScoreBand(adjusted.score),activeIncidentCount:incidents.filter(x=>!x.dismissed).length,dismissedIncidentCount:incidents.filter(x=>x.dismissed).length,incidentCounts:counts,incidents};const existing=(record.snapshots||[]).findIndex(x=>x.rangeKey===rangeKey);if(existing>=0)record.snapshots[existing]=snapshot;else record.snapshots=[...(record.snapshots||[]),snapshot].slice(-52);record.updatedAt=now;state.safety.driverRecords[id]=record;}
  }
  async function saveStructuredSafety(historyEntry=null,silent=false){
    if(cloudConnected()&&state.cloud?.structured?.safety&&window.NBLCloud?.saveSafetyData){
      try{await window.NBLCloud.saveSafetyData(state.cloud.organization.id,cloudSnapshotForModule('safety'),historyEntry);return true;}
      catch(err){console.error('Dedicated Safety save failed',err);if(!silent)showAlert(`Could not save Safety data: ${escapeHtml(err.message||String(err))}`,'error');return false;}
    }
    return saveCloudModule('safety',silent);
  }
  function refreshCurrentSafetySnapshots(historyEntry=null,silent=false){recordCurrentSafetySnapshots();return saveStructuredSafety(historyEntry,silent);}
  function safetyDriverSnapshots(driverId){return (safetyRecordForDriver(driverId)?.snapshots||[]).slice().sort((a,b)=>String(a.endDate||a.capturedAt).localeCompare(String(b.endDate||b.capturedAt)));}
  function safetyPreviousAdjusted(driverId,currentRange){const snapshots=safetyDriverSnapshots(driverId).filter(x=>x.rangeKey!==currentRange&&Number.isFinite(Number(x.adjustedScore)));return snapshots.length?Number(snapshots.at(-1).adjustedScore):null;}
  function safetyMediaLink(event){const url=safetyEventMediaUrl(event);return url?`<a class="safety-media-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">View Media</a>`:'—';}
  function safetyAssignmentHtml(item){
    const assigned=safetyEventDriver(item.event,item.source),key=safetyEventId(item.event,item.source),pool=safetyDriverPool();
    if(assigned?.source==='Motive')return `<strong>${escapeHtml(assigned.name||'Assigned')}</strong><small>Motive assignment</small>`;
    const options=['<option value="">Select driver…</option>',...pool.map(d=>`<option value="${escapeHtml(d.id)}" ${assigned?.id===d.id?'selected':''}>${escapeHtml(d.name)}</option>`)].join('');
    return `<div class="safety-assignment"><select data-safety-assignment="${escapeHtml(key)}">${options}</select><button class="button secondary" type="button" data-save-safety-assignment="${escapeHtml(key)}">Save</button></div>${assigned?`<small class="safety-assigned-note">FleetCommand assignment • official Motive score unchanged</small>`:''}`;
  }
  function safetyDismissalHtml(item){const dismissal=safetyDismissal(item),key=safetyEventId(item.event,item.source);if(dismissal.source==='Motive')return '<span class="status-pill neutral">Dismissed in Motive</span>';return `<button class="button ${dismissal.dismissed?'secondary':'danger-outline'} safety-dismiss-btn" type="button" data-safety-dismiss="${escapeHtml(key)}">${dismissal.dismissed?'Restore':'Dismiss'}</button>${dismissal.dismissed?'<small>Dismissed in FleetCommand</small>':''}`;}
  async function loadSafetyData(silent=false){
    safetyDefaultDates();const start=$('safetyStartDate')?.value||state.safety.startDate,end=$('safetyEndDate')?.value||state.safety.endDate;
    if(!state.motive.configured){if(!silent)showAlert('Connect Motive before loading Safety data.','warning');return false;}
    state.safety.loading=true;state.safety.error='';renderSafety();
    try{
      const q=new URLSearchParams({start_date:start,end_date:end});const data=await localApi('/api/motive/safety?'+q.toString(),{timeoutMs:120000});
      state.safety.startDate=start;state.safety.endDate=end;state.safety.scorecards=Array.isArray(data.scorecards)?data.scorecards:[];state.safety.performanceEvents=Array.isArray(data.performance_events)?data.performance_events:[];state.safety.speedingEvents=Array.isArray(data.speeding_events)?data.speeding_events:[];state.safety.accessErrors=data.errors&&typeof data.errors==='object'?data.errors:{};state.safety.loadedAt=new Date().toISOString();await refreshCurrentSafetySnapshots(null,true);
      const partial=Object.keys(state.safety.accessErrors).length>0;if(!silent)showAlert(`Loaded <strong>${fmtNum(state.safety.scorecards.length)}</strong> driver scorecard${state.safety.scorecards.length===1?'':'s'} and <strong>${fmtNum(safetyAllEvents().length)}</strong> safety event${safetyAllEvents().length===1?'':'s'} from Motive.${partial?' One or more Safety feeds were unavailable.':''}`,partial?'warning':'success');
      return true;
    }catch(err){state.safety.error=err.message||String(err);if(!silent)showAlert(`Could not load Motive Safety data: ${escapeHtml(state.safety.error)}`,'error');return false;}
    finally{state.safety.loading=false;renderSafety();if(state.currentScreen==='safety')setScreen('safety');}
  }
  async function saveSafetyAssignment(key){
    if(!await verifyMotiveDriversForWork())return;
    const select=document.querySelector(`[data-safety-assignment="${CSS.escape(key)}"]`),driverId=select?.value||'',driver=safetyDriverPool().find(d=>d.id===driverId);
    if(!driver){showAlert('Select a driver first.','warning');return;}
    const item=safetyAllEvents().find(x=>safetyEventId(x.event,x.source)===key),incident=item?safetyIncidentRecord(item):null;if(incident)incident.assignmentSource='FleetCommand';
    const previous=state.safety.assignments?.[key]||null;state.safety.assignments[key]={id:driver.id,name:driver.name,employeeId:driver.employeeId||'',assignedAt:new Date().toISOString(),assignedBy:state.cloud?.user?.id||'',incident};
    const history={eventKey:key,actionType:previous?'reassign':'assign',actionData:{from:previous?{id:previous.id,name:previous.name}:null,to:{id:driver.id,name:driver.name}}};const saved=await refreshCurrentSafetySnapshots(history);renderSafety();if(!saved)return;showAlert(`${escapeHtml(driver.name)} assigned to this event. Assignment and driver record saved to NBL Cloud. Motive's official score is unchanged.`,'success');
  }
  async function toggleSafetyDismissal(key){
    const item=safetyAllEvents().find(x=>safetyEventId(x.event,x.source)===key);if(!item)return;
    if(safetyMotiveDismissed(item.event)){showAlert('This event is already dismissed in Motive and is automatically excluded in FleetCommand.','warning');return;}
    const currently=!!state.safety.dismissals?.[key]?.dismissed;
    if(!state.safety.dismissals)state.safety.dismissals={};
    state.safety.dismissals[key]={dismissed:!currently,updatedAt:new Date().toISOString(),updatedBy:state.cloud?.user?.id||''};
    const history={eventKey:key,actionType:currently?'restore':'dismiss',actionData:{dismissed:!currently}};const saved=await refreshCurrentSafetySnapshots(history);renderSafety();if(!saved)return;showAlert(`Event ${currently?'restored':'dismissed'} in FleetCommand. Estimated Adjusted Scores and driver records have been saved.`,'success');
  }
  function safetySortValue(row,key,all){const adjusted=safetyAdjustedScore(row,all);if(key==='driver')return safetyDriverName(row.driver).toLowerCase();if(key==='official')return Number(row.score);if(key==='adjusted')return adjusted.score;if(key==='miles')return safetyScorecardMiles(row);if(key==='events')return all.filter(x=>safetyEventDriver(x.event,x.source)?.id===safetyDriverId(row.driver)).length;return adjusted.score;}
  function safetySortableHeading(label,key,sort){const active=sort.key===key,arrow=active?(sort.dir==='asc'?' ▲':' ▼'):'';return `<th><button class="safety-sort" type="button" data-safety-sort="${key}">${label}${arrow}</button></th>`;}
  function safetyTrendLabel(snapshot){const value=snapshot.endDate||snapshot.capturedAt||'';if(!value)return '—';const d=new Date(`${String(value).slice(0,10)}T12:00:00`);return isNaN(d)?String(value).slice(0,10):new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric'}).format(d);}
  function safetyScoreTrendSvg(snapshots){
    const rows=snapshots.filter(x=>x.adjustedScore!=null&&Number.isFinite(Number(x.adjustedScore))).slice(-12);
    if(!rows.length)return '<div class="safety-chart-empty">Load Safety data to begin building this driver’s trend.</div>';
    const W=720,H=260,L=48,R=18,T=18,B=42,plotW=W-L-R,plotH=H-T-B,
      x=i=>L+(rows.length===1?plotW/2:i*plotW/(rows.length-1)),
      y=v=>T+(100-Math.max(75,Math.min(100,Number(v))))/25*plotH,
      points=rows.map((r,i)=>`${x(i)},${y(r.adjustedScore)}`).join(' '),belowScale=rows.some(r=>Number(r.adjustedScore)<75);
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Adjusted score trend, scale 75 to 100"><rect x="${L}" y="${y(100)}" width="${plotW}" height="${y(96)-y(100)}" fill="#E7F6ED"/><rect x="${L}" y="${y(96)}" width="${plotW}" height="${y(85)-y(96)}" fill="#FFF6D9"/><rect x="${L}" y="${y(85)}" width="${plotW}" height="${y(75)-y(85)}" fill="#FDE8E6"/>${[75,80,85,90,95,100].map(v=>`<line x1="${L}" y1="${y(v)}" x2="${W-R}" y2="${y(v)}" class="grid"/><text x="${L-8}" y="${y(v)+4}" text-anchor="end">${v}</text>`).join('')}<polyline points="${points}" class="score-line"/>${rows.map((r,i)=>{const title=`${safetyTrendLabel(r)}: ${Number(r.adjustedScore).toFixed(1)}${Number(r.adjustedScore)<75?' (below chart scale)':''}`,marker=Number(r.adjustedScore)<75?`<path d="M ${x(i)-6} ${y(75)-4} L ${x(i)+6} ${y(75)-4} L ${x(i)} ${y(75)+5} Z" fill="${safetyBandColor(r.adjustedScore)}"><title>${escapeHtml(title)}</title></path>`:`<circle cx="${x(i)}" cy="${y(r.adjustedScore)}" r="5" fill="${safetyBandColor(r.adjustedScore)}"><title>${escapeHtml(title)}</title></circle>`;return `${marker}<text x="${x(i)}" y="${H-17}" text-anchor="middle">${escapeHtml(safetyTrendLabel(r))}</text>`;}).join('')}</svg>${belowScale?'<p class="safety-chart-note">▼ Score below 75; hover for the actual value.</p>':''}`;
  }
  function safetyTopIncidents(driverId,all){
    if(!driverId)return [];
    const counts=new Map(),{startDate,endDate}=state.safety;
    for(const item of all){
      if(safetyEventDriver(item.event,item.source)?.id!==driverId||safetyDismissal(item).dismissed)continue;
      const time=safetyEventTime(item.event),date=time?new Date(time):null;
      if(!date||isNaN(date))continue;
      const day=isoLocal(date);if(day<startDate||day>endDate)continue;
      const type=safetyCanonicalType(safetyEventType(item.event,item.source));
      counts.set(type,(counts.get(type)||0)+1);
    }
    return [...counts].map(([type,count])=>({type,count})).sort((a,b)=>b.count-a.count||a.type.localeCompare(b.type)).slice(0,3);
  }
  function safetyTopIncidentsHtml(driverId,all){
    if(!driverId)return '<div class="safety-chart-empty">Select a driver to see their Top 3 Incidents.</div>';
    const rows=safetyTopIncidents(driverId,all);
    if(!rows.length)return '<div class="safety-chart-empty">No active incidents for this driver in the selected period.</div>';
    const max=rows[0].count;
    return `<ol class="safety-top-incidents">${rows.map(r=>`<li><div class="safety-top-incident-heading"><strong>${escapeHtml(r.type.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase()))}</strong><span>${fmtNum(r.count)} incident${r.count===1?'':'s'}</span></div><div class="safety-incident-bar" aria-hidden="true"><span style="width:${r.count/max*100}%"></span></div></li>`).join('')}</ol>`;
  }
  function renderSafetyTrends(scorecards,all){
    const select=$('safetyTrendDriver');if(!select)return;
    const available=scorecards.map(r=>({id:safetyDriverId(r.driver),name:safetyDriverName(r.driver)})).filter(x=>x.id);
    if(!state.safety.trendDriverId||!available.some(x=>x.id===state.safety.trendDriverId))state.safety.trendDriverId=available[0]?.id||'';
    select.innerHTML='<option value="">Select Driver</option>'+available.map(x=>`<option value="${escapeHtml(x.id)}">${escapeHtml(x.name)}</option>`).join('');select.value=state.safety.trendDriverId;
    const snapshots=safetyDriverSnapshots(state.safety.trendDriverId);
    $('safetyScoreTrendChart').innerHTML=safetyScoreTrendSvg(snapshots);
    $('safetyTopIncidentsChart').innerHTML=safetyTopIncidentsHtml(state.safety.trendDriverId,all);
  }
  function renderSafetyAtRisk(scorecards,all){const range=`${state.safety.startDate}|${state.safety.endDate}`,items=scorecards.map(r=>{const id=safetyDriverId(r.driver),adj=safetyAdjustedScore(r,all),previous=safetyPreviousAdjusted(id,range),delta=previous==null?null:adj.score-previous;return {row:r,id,name:safetyDriverName(r.driver),adjusted:adj.score,rating:safetyScoreBand(adj.score),delta,incidents:all.filter(x=>safetyEventDriver(x.event,x.source)?.id===id&&!safetyDismissal(x).dismissed).length};}).filter(x=>Number.isFinite(x.adjusted)&&x.adjusted>0).sort((a,b)=>a.adjusted-b.adjusted||a.name.localeCompare(b.name)).slice(0,4);$('safetyAtRiskCount').textContent=`${items.length} driver${items.length===1?'':'s'}`;$('safetyAtRiskList').innerHTML=items.length?items.map(x=>`<div class="safety-risk-card ${x.rating==='Critical'?'critical':'declining'}"><div><span>${escapeHtml(x.rating)}</span><strong>${escapeHtml(x.name||'Unknown Driver')}</strong><small>${x.incidents} active incident${x.incidents===1?'':'s'}${x.delta==null?'':` • ${x.delta>=0?'+':''}${x.delta.toFixed(1)} vs prior snapshot`}</small></div><b>${x.adjusted.toFixed(1)}</b><div class="safety-risk-actions"><button class="table-action" data-safety-driver-view="${escapeHtml(x.id)}">Incidents</button><button class="table-action" data-safety-driver-trend="${escapeHtml(x.id)}">Trend</button><button class="table-action" data-safety-driver-export="${escapeHtml(x.id)}">PDF</button></div></div>`).join(''):'<div class="safety-chart-empty">No drivers with a non-zero Adjusted Score are available.</div>';}
  function renderSafety(){
    if(!$('safetyScreen'))return;safetyDefaultDates();const s=state.safety;
    if($('safetyStartDate'))$('safetyStartDate').value=s.startDate;if($('safetyEndDate'))$('safetyEndDate').value=s.endDate;
    const all=safetyAllEvents(),activeEvents=all.filter(x=>!safetyDismissal(x).dismissed),dismissed=all.length-activeEvents.length,unassigned=activeEvents.filter(x=>!safetyEventDriver(x.event,x.source)).length,speeding=activeEvents.filter(x=>safetyEventType(x.event,x.source)==='speeding').length,scored=(s.scorecards||[]).filter(x=>Number.isFinite(Number(x.score))).length;
    $('safetyCards').innerHTML=[['Drivers Scored',fmtNum(scored),''],['Active Events',fmtNum(activeEvents.length),''],['Speeding Events',fmtNum(speeding),speeding?'warning-card':''],['Unassigned Events',fmtNum(unassigned),unassigned?'warning-card':''],['Dismissed',fmtNum(dismissed),'']].map(x=>`<div class="summary-card ${x[2]}"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
    $('refreshSafetyBtn').disabled=s.loading||!state.motive.configured;$('refreshSafetyBtn').textContent=s.loading?'Loading…':'Load Safety Data';
    const accessText=Object.entries(s.accessErrors||{}).map(([key,value])=>`${key.replaceAll('_',' ')}: ${value}`).join(' • ');$('safetyNotice').innerHTML=s.error?`<strong>Safety data could not be loaded:</strong> ${escapeHtml(s.error)}`:(accessText?`<strong>Some Motive Safety data is unavailable.</strong> ${escapeHtml(accessText)}`:`Adjusted Scores include locally assigned, non-dismissed events using the configured behavior weights and each driver's mileage exposure.${s.loadedAt?` Last loaded ${escapeHtml(new Date(s.loadedAt).toLocaleString())}.`:''}`);
    const sort=s.rankSort||{key:'adjusted',dir:'asc'},scorecards=(s.scorecards||[]).filter(row=>driverIsEligibleForWork(row.driver)).slice().sort((a,b)=>{const av=safetySortValue(a,sort.key,all),bv=safetySortValue(b,sort.key,all),cmp=typeof av==='string'?av.localeCompare(bv):((Number.isFinite(av)?av:Infinity)-(Number.isFinite(bv)?bv:Infinity));return (sort.dir==='desc'?-cmp:cmp)||safetyDriverName(a.driver).localeCompare(safetyDriverName(b.driver));});
    $('safetyDriverCount').textContent=`${scorecards.length} driver${scorecards.length===1?'':'s'}`;
    const rankTable=$('safetyRankingsTable');rankTable.querySelector('thead').innerHTML=`<tr><th>Rank</th>${safetySortableHeading('Driver','driver',sort)}${safetySortableHeading('Motive Score','official',sort)}${safetySortableHeading('Adjusted Score','adjusted',sort)}<th>Rating</th>${safetySortableHeading('Miles','miles',sort)}<th>Hard Brakes</th><th>Hard Accels</th><th>Hard Corners</th><th>Coached</th>${safetySortableHeading('Events','events',sort)}<th>Record</th></tr>`;
    rankTable.querySelector('tbody').innerHTML=scorecards.length?scorecards.map((r,i)=>{const d=r.driver||{},id=safetyDriverId(d),driverEvents=all.filter(x=>safetyEventDriver(x.event,x.source)?.id===id),score=Number(r.score),adjusted=safetyAdjustedScore(r,all),band=safetyScoreBand(adjusted.score),bandClass=`safety-band-${band.toLowerCase().replaceAll(' ','-')}`;return `<tr><td><span class="safety-rank">${i+1}</span></td><td><strong>${escapeHtml(safetyDriverName(d)||'Unknown Driver')}</strong><small>${escapeHtml(d.driver_company_id||d.email||'')}</small></td><td><span class="safety-score official">${Number.isFinite(score)?score.toFixed(1):'—'}</span></td><td><span class="safety-score adjusted">${adjusted.score==null?'—':adjusted.score.toFixed(1)}</span>${adjusted.impact?`<small>−${adjusted.impact.toFixed(1)} estimated • ${adjusted.count} assigned</small>`:'<small>No local adjustment</small>'}</td><td><strong class="${bandClass}">${escapeHtml(band)}</strong></td><td>${safetyScorecardMiles(r)?fmtNum(safetyScorecardMiles(r)):'—'}</td><td>${fmtNum(r.num_hard_brakes)}</td><td>${fmtNum(r.num_hard_accels)}</td><td>${fmtNum(r.num_hard_corners)}</td><td>${fmtNum(r.num_coached_events)}</td><td><button class="button secondary" type="button" data-safety-driver-view="${escapeHtml(id)}">${fmtNum(driverEvents.length)} events</button></td><td><button class="button dark" type="button" data-safety-driver-export="${escapeHtml(id)}">Export PDF</button></td></tr>`;}).join(''):'<tr><td colspan="12" class="empty-table-cell">Load Safety data to display Motive driver rankings.</td></tr>';
    renderSafetyAtRisk(scorecards,all);renderSafetyTrends(scorecards,all);
    const driverFilter=$('safetyDriverFilter'),pool=safetyDriverPool(),current=s.driverFilter||'all';driverFilter.innerHTML='<option value="all">All Drivers</option><option value="unassigned">Unassigned Only</option>'+pool.map(d=>`<option value="${escapeHtml(d.id)}">${escapeHtml(d.name)}</option>`).join('');driverFilter.value=[...driverFilter.options].some(o=>o.value===current)?current:'all';
    const types=[...new Set(all.map(x=>safetyEventType(x.event,x.source)))].sort(),typeFilter=$('safetyEventTypeFilter'),currentType=s.eventTypeFilter||'all';typeFilter.innerHTML='<option value="all">All Event Types</option>'+types.map(t=>`<option value="${escapeHtml(t)}">${escapeHtml(t.replaceAll('_',' '))}</option>`).join('');typeFilter.value=types.includes(currentType)?currentType:'all';
    const statusFilter=$('safetyStatusFilter');if(statusFilter)statusFilter.value=s.statusFilter||'active';
    const visible=all.filter(x=>{const d=safetyEventDriver(x.event,x.source),isDismissed=safetyDismissal(x).dismissed,driverOk=s.driverFilter==='all'||(s.driverFilter==='unassigned'?!d:d?.id===s.driverFilter),typeOk=s.eventTypeFilter==='all'||safetyEventType(x.event,x.source)===s.eventTypeFilter,statusOk=s.statusFilter==='all'||(s.statusFilter==='dismissed'?isDismissed:!isDismissed);return driverOk&&typeOk&&statusOk;}).sort((a,b)=>String(safetyEventTime(b.event)).localeCompare(String(safetyEventTime(a.event))));
    const eventTable=$('safetyEventsTable');eventTable.querySelector('thead').innerHTML='<tr><th>Date / Time</th><th>Event</th><th>Severity</th><th>Tractor</th><th>Details</th><th>Media</th><th>Driver Assignment</th><th>Status</th></tr>';eventTable.querySelector('tbody').innerHTML=visible.length?visible.map(x=>{const e=x.event,type=safetyEventType(e,x.source),when=safetyEventTime(e),dt=when?new Date(when):null,details=x.source==='speeding'?`${e.max_over_speed_in_kph!=null?`${Math.round(Number(e.max_over_speed_in_kph)*0.621371)} mph over limit`:''}${e.duration!=null?` • ${fmtNum(e.duration)} sec`:''}`:`${e.start_speed!=null?`${Math.round(Number(e.start_speed)*0.621371)} mph start`:''}${e.duration!=null?` • ${fmtNum(e.duration)} sec`:''}`;return `<tr class="${safetyDismissal(x).dismissed?'safety-event-dismissed':''}"><td><strong>${dt&&!isNaN(dt)?escapeHtml(dt.toLocaleDateString()):'—'}</strong><small>${dt&&!isNaN(dt)?escapeHtml(dt.toLocaleTimeString()):escapeHtml(when||'')}</small></td><td><strong>${escapeHtml(type.replaceAll('_',' '))}</strong><small>${x.source==='speeding'?'Speeding API':'Performance Events API'} • weight ${safetyBehaviorWeight(x)}</small></td><td>${escapeHtml(e.metadata?.severity||e.severity||e.coaching_status||'—')}</td><td>${escapeHtml(safetyEventVehicle(e)||'—')}</td><td>${escapeHtml(details||'—')}</td><td>${safetyMediaLink(e)}</td><td>${safetyAssignmentHtml(x)}</td><td>${safetyDismissalHtml(x)}</td></tr>`;}).join(''):'<tr><td colspan="8" class="empty-table-cell">No safety events match the selected filters.</td></tr>';
  }

  function safetyTalkingPoint(type){const key=safetyNormalizedType(type),points={speeding:'Review posted limits, ramps and work zones. Use cruise control appropriately and reduce speed before entering lower-limit areas.',close_following:'Maintain adequate following distance, scan farther ahead and preserve an escape route.',stop_sign_violation:'Make a complete stop, confirm cross traffic is clear and avoid rolling stops.',mobile_device_usage:'Do not handle a phone while driving. Set navigation before moving and use only approved hands-free equipment.',mobile_usage:'Do not handle a phone while driving. Set navigation before moving and use only approved hands-free equipment.',cell_phone:'Do not handle a phone while driving. Set navigation before moving and use only approved hands-free equipment.',distraction:'Keep eyes and attention on the road, remove cab distractions and pull over safely when necessary.',seat_belt_violation:'Keep the seat belt properly fastened whenever the vehicle is moving.',hard_braking:'Increase following distance, scan ahead and anticipate traffic or signal changes.',hard_brake:'Increase following distance, scan ahead and anticipate traffic or signal changes.',hard_cornering:'Reduce speed before the turn and account for load movement and road conditions.',hard_corner:'Reduce speed before the turn and account for load movement and road conditions.',hard_acceleration:'Accelerate smoothly to maintain traction and reduce unnecessary equipment stress.',hard_accel:'Accelerate smoothly to maintain traction and reduce unnecessary equipment stress.'};return points[key]||'Review the event, identify the unsafe behavior and agree on a specific action to prevent it from recurring.';}
  const SAFETY_CORRECTIVE_ACTION='Take corrective action now and improve your safety score. Safety Forward training videos will be assigned and must be completed within 5 days. Continued violations or failure to improve may result in additional coaching, written warning, suspension from dispatch, or termination.';
  function safetySeverityRank(value){const s=String(value||'').toLowerCase();if(s.includes('critical'))return 4;if(s.includes('high'))return 3;if(s.includes('medium')||s.includes('moderate'))return 2;if(s.includes('low'))return 1;return 0;}
  function safetyCanonicalType(value){const key=safetyNormalizedType(value),aliases={hard_brake:'hard_braking',hard_accel:'hard_acceleration',hard_corner:'hard_cornering',cell_phone:'mobile_device_usage',mobile_usage:'mobile_device_usage',mobile_phone_usage:'mobile_device_usage'};return aliases[key]||key;}
  function safetyReportIncidentRows(driverId){const sortRows=rows=>rows.filter(x=>!x.dismissed).sort((a,b)=>safetySeverityRank(b.severity)-safetySeverityRank(a.severity)||String(b.date).localeCompare(String(a.date)));const live=safetyAllEvents().filter(x=>safetyEventDriver(x.event,x.source)?.id===driverId).map(safetyIncidentRecord);if(live.length)return sortRows(live);const snapshots=safetyDriverSnapshots(driverId);return sortRows((snapshots.at(-1)?.incidents||[]).slice());}
  function safetyReportSections(incidents){const groups=new Map();for(const incident of incidents){const type=safetyCanonicalType(incident.type),group=groups.get(type)||{type,incidents:[],severityRank:0};group.incidents.push(incident);group.severityRank=Math.max(group.severityRank,safetySeverityRank(incident.severity));groups.set(type,group);}const ordered=[...groups.values()].sort((a,b)=>b.severityRank-a.severityRank||a.type.localeCompare(b.type));const sections=[];for(const group of ordered){group.incidents.sort((a,b)=>safetySeverityRank(b.severity)-safetySeverityRank(a.severity)||String(b.date).localeCompare(String(a.date)));for(let i=0;i<group.incidents.length;i+=3)sections.push({type:group.type,total:group.incidents.length,offset:i,incidents:group.incidents.slice(i,i+3),severityRank:group.severityRank});}return sections;}
  function safetyDrawReportHeader(ctx,driver,page,pageCount){const purple='#35164E',orange='#F15A24',muted='#756C7D';ctx.fillStyle='#fff';ctx.fillRect(0,0,1241,1754);ctx.fillStyle=purple;ctx.font='700 38px Arial';ctx.textAlign='left';ctx.fillText('DRIVER SAFETY & COACHING RECORD',80,91);ctx.fillStyle=muted;ctx.font='20px Arial';ctx.fillText(`${driver.name||'Driver'} • FedEx ID ${driver.employeeId||'—'}`,80,132);ctx.textAlign='right';ctx.fillText(`Page ${page} of ${pageCount}`,1160,91);ctx.fillText(`${fmtDate(state.safety.startDate)} – ${fmtDate(state.safety.endDate)}`,1160,132);ctx.fillStyle=orange;ctx.fillRect(80,160,1080,8);ctx.textAlign='left';}
  async function renderSafetyReportCanvases(driverId){const row=(state.safety.scorecards||[]).find(r=>safetyDriverId(r.driver)===driverId),record=safetyRecordForDriver(driverId)||{},driver={name:safetyDriverName(row?.driver)||record.name||'Driver',employeeId:String(row?.driver?.driver_company_id||record.employeeId||'')},all=safetyAllEvents(),adjusted=row?safetyAdjustedScore(row,all):{score:Number(safetyDriverSnapshots(driverId).at(-1)?.adjustedScore),impact:0},rating=safetyScoreBand(adjusted.score),incidents=safetyReportIncidentRows(driverId),sections=safetyReportSections(incidents),perPage=2,pageCount=Math.max(1,Math.ceil(sections.length/perPage)),canvases=[];for(let p=0;p<pageCount;p++){const canvas=document.createElement('canvas');canvas.width=1241;canvas.height=1754;const ctx=canvas.getContext('2d'),purple='#35164E',muted='#756C7D',line='#E7E0EA',light='#F8F6FA';safetyDrawReportHeader(ctx,driver,p+1,pageCount);let y=202;if(p===0){const metricW=340,gap=30,metrics=[['SAFETY SCORE',Number.isFinite(adjusted.score)?Number(adjusted.score).toFixed(1):'—'],['RATING',rating],['INCIDENTS',String(incidents.length)]];metrics.forEach((m,i)=>{const x=80+i*(metricW+gap);ctx.fillStyle=light;ctx.fillRect(x,y,metricW,132);ctx.strokeStyle=line;ctx.strokeRect(x,y,metricW,132);ctx.fillStyle=muted;ctx.font='700 16px Arial';ctx.fillText(m[0],x+20,y+34);ctx.fillStyle=i===1?safetyBandColor(adjusted.score):purple;if(i===1&&m[1]==='Needs Improvement'){ctx.font='700 27px Arial';ctx.fillText('Needs',x+20,y+76);ctx.fillText('Improvement',x+20,y+108);}else{ctx.font='700 34px Arial';ctx.fillText(m[1],x+20,y+88);}});y+=166;ctx.fillStyle=purple;ctx.font='700 20px Arial';ctx.fillText('SAFETY SCORE SCALE',80,y);y+=32;[['96–100 Excellent','#18804B'],['85–95 Needs Improvement','#C58A00'],['0–84 Critical','#B42318']].forEach((m,i)=>{const x=80+i*345;ctx.fillStyle=m[1];ctx.fillRect(x,y,20,20);ctx.fillStyle='#30283A';ctx.font='700 18px Arial';ctx.fillText(m[0],x+32,y+17);});y+=64;}ctx.fillStyle=purple;ctx.font='700 23px Arial';ctx.fillText(sections.length?'EVENTS & COACHING TALKING POINTS':'EVENTS',80,y);y+=31;const pageSections=sections.slice(p*perPage,(p+1)*perPage);if(!pageSections.length){ctx.fillStyle=muted;ctx.font='20px Arial';ctx.fillText('No events were recorded for this driver in the selected range.',80,y+40);y+=100;}for(const section of pageSections){const h=310,label=String(section.type||'Event').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase()),suffix=section.total===1?'1 event':`${section.total} events`;ctx.fillStyle='#FFFFFF';ctx.fillRect(80,y,1080,h);ctx.strokeStyle=line;ctx.strokeRect(80,y,1080,h);ctx.fillStyle=purple;ctx.font='700 22px Arial';ctx.fillText(`${label} - ${suffix}${section.offset?` (continued)`:''}`,100,y+38);ctx.textAlign='right';ctx.fillStyle=section.severityRank>=4?'#B42318':section.severityRank===3?'#C45120':section.severityRank===2?'#A66B00':'#756C7D';ctx.font='700 17px Arial';ctx.fillText(section.severityRank===4?'CRITICAL':section.severityRank===3?'HIGH':section.severityRank===2?'MEDIUM':section.severityRank===1?'LOW':'',1140,y+38);ctx.textAlign='left';ctx.fillStyle=muted;ctx.font='16px Arial';section.incidents.forEach((incident,j)=>{const when=incident.date?new Date(incident.date):null,meta=[`${section.offset+j+1}.`,String(incident.severity||'').toUpperCase(),when&&!isNaN(when)?when.toLocaleString():'Date unavailable',incident.tractor?`Tractor ${incident.tractor}`:'',incident.details||''].filter(Boolean).join(' • ');let shown=meta;while(ctx.measureText(shown).width>1000&&shown.length>4)shown=shown.slice(0,-2)+'…';ctx.fillText(shown,100,y+76+j*38);});ctx.fillStyle='#30283A';ctx.font='700 17px Arial';ctx.fillText('Coach should discuss:',100,y+238);ctx.font='17px Arial';wrapCanvasText(ctx,safetyTalkingPoint(section.type),1000,3).forEach((t,i)=>ctx.fillText(t,100,y+266+i*22));y+=h+16;}if(p===pageCount-1){const boxY=Math.min(1460,Math.max(y+24,1320));ctx.fillStyle='#FFF7F2';ctx.fillRect(80,boxY,1080,174);ctx.strokeStyle='#F1C7B7';ctx.strokeRect(80,boxY,1080,174);ctx.fillStyle=purple;ctx.font='700 20px Arial';ctx.fillText('CORRECTIVE ACTION',100,boxY+38);ctx.fillStyle='#4C414F';ctx.font='18px Arial';wrapCanvasText(ctx,SAFETY_CORRECTIVE_ACTION,1010,5).forEach((t,i)=>ctx.fillText(t,100,boxY+72+i*26));}canvases.push(canvas);}return {canvases,driver,adjusted,rating,incidents};}
  async function exportSafetyDriverPdf(driverId){try{const report=await renderSafetyReportCanvases(driverId),jpegs=[];for(const canvas of report.canvases)jpegs.push(await canvasJpegBytes(canvas));const pdf=jpegPagesToPdf(jpegs,1241,1754),safe=sanitize(report.driver.name)||sanitize(report.driver.employeeId)||'Driver',name=`NBL_Safety_Record_${safe}_${state.safety.startDate}_to_${state.safety.endDate}.pdf`;downloadBlob(pdf,name,'application/pdf');const record=state.safety.driverRecords?.[driverId];if(record){record.exports=[...(record.exports||[]),{startDate:state.safety.startDate,endDate:state.safety.endDate,exportedAt:new Date().toISOString(),fileName:name,rating:report.rating,adjustedScore:report.adjusted.score}].slice(-25);await saveCloudModule('safety',true);}showAlert(`Safety and coaching record exported for <strong>${escapeHtml(report.driver.name)}</strong>.`,'success');}catch(err){console.error(err);showAlert(`Could not export the driver safety record: ${escapeHtml(err.message)}`,'error');}}

  async function loadMotiveStatus(){
    try{
      const data=await localApi('/api/motive/status');
      state.motive.backendAvailable=true; state.motive.configured=!!data.configured; state.motive.keyHint=data.key_hint||''; state.motive.storage=data.storage||'';if(state.motive.configured){await refreshMotiveDriverDirectory();renderDispatch();renderDailyDispatch();renderSafety();}
    }catch(err){
      state.motive.backendAvailable=false; state.motive.configured=false; state.motive.keyHint=''; state.motive.storage='';
    }
    renderMotive();
  }
  async function saveMotiveKey(){
    if(!state.motive.backendAvailable){ showAlert('Open NBL FleetCommand.app (Mac) or use the included local launcher before connecting Motive.','warning'); return; }
    const key=$('motiveApiKeyInput')?.value.trim();
    if(!key){ showAlert('Paste a Motive API key first.','warning'); return; }
    try{
      const data=await localApi('/api/motive/config',{method:'POST',body:JSON.stringify({api_key:key})});
      state.motive.configured=true; state.motive.keyHint=data.key_hint||''; $('motiveApiKeyInput').value='';
      renderMotive(); await testMotiveConnection(true);
    }catch(err){ showAlert(`Could not save the Motive connection: ${escapeHtml(err.message)}`,'error'); }
  }
  async function disconnectMotive(){
    if(!state.motive.backendAvailable) return;
    try{
      await localApi('/api/motive/disconnect',{method:'POST',body:'{}'});
      state.motive.geofences=null; state.motive.geofencesError=''; state.motive.geofencesLoading=false; state.motive.geofencesRequest++;
      state.motive.configured=false; state.motive.keyHint=''; state.motive.vehicles=[]; state.motive.drivers=[];state.motive.driversLoaded=false;state.motive.driversLastSync=null; state.motive.lastSync=null; state.motive.test=null;
      renderMotive(); showAlert('Motive disconnected on this computer.','success');
    }catch(err){ showAlert(`Could not disconnect Motive: ${escapeHtml(err.message)}`,'error'); }
  }
  async function inspectMotiveGeofences(){
    if(!state.motive.configured||state.motive.geofencesLoading) return;
    const request=++state.motive.geofencesRequest;
    state.motive.geofencesLoading=true; state.motive.geofencesError=''; renderMotive();
    try{
      const result=await localApi('/api/motive/geofences',{timeoutMs:120000});
      if(request!==state.motive.geofencesRequest) return;
      if(!result.ok||!Array.isArray(result.geofences)) throw new Error('Motive returned an incomplete location response.');
      state.motive.geofences=result;
    }catch(err){
      if(request===state.motive.geofencesRequest) state.motive.geofencesError=err.message||String(err);
    }finally{
      if(request===state.motive.geofencesRequest){ state.motive.geofencesLoading=false; renderMotive(); }
    }
  }
  function renderMotiveGeofences(){
    const panel=$('motiveGeofencePanel'); if(!panel) return;
    const m=state.motive, result=m.geofences;
    const allowed=!cloudConnected()||['owner','operations'].includes(currentRole());
    panel.classList.toggle('hidden',!allowed);
    $('inspectMotiveGeofencesBtn').disabled=!allowed||!m.configured||!m.backendAvailable||m.geofencesLoading;
    $('inspectMotiveGeofencesBtn').textContent=m.geofencesLoading?'Checking Locations…':'Inspect Motive Locations';
    const note=$('motiveGeofenceNote');
    const warning=m.geofencesError||((result&&!result.complete)?'Some categories could not be read. The list below is partial.':'');
    note.textContent=m.geofencesLoading?'Reading active Motive geofences…':(warning?`${warning}${result?' Showing the last returned list.':''}`:(result?`${result.count} active locations; ${result.with_boundaries} have GPS boundaries. Checked ${new Date(result.checked_at).toLocaleString()}.`:'Inspect the names, addresses and GPS boundaries available from Motive. This check does not update the IVMR location master.'));
    $('motiveGeofenceErrors').textContent=(result?.errors||[]).map(x=>`${x.category}: ${x.error}`).join('\n');
    $('motiveGeofenceTable').querySelector('tbody').innerHTML=(result?.geofences||[]).map(x=>`<tr><td><strong>${escapeHtml(x.name||'Unnamed')}</strong></td><td>${escapeHtml(x.category)}</td><td>${escapeHtml(x.address||'Address unavailable')}</td><td>${(x.location_points||[]).length?`${fmtNum(x.location_points.length)} GPS point(s)`:'Missing boundary'}</td></tr>`).join('')||(result?'<tr><td colspan="4">No active locations were returned in the categories successfully checked.</td></tr>':'');
    $('motiveGeofenceTable').closest('.table-wrap').classList.toggle('hidden',!result);
  }
  async function testMotiveConnection(refreshAfter=false){
    if(!state.motive.configured){ showAlert('Save a Motive API key first.','warning'); return; }
    state.motive.loading=true; renderMotive();
    try{
      const data=await localApi('/api/motive/test'); state.motive.test=data; state.motive.configured=!!data.configured;
      showAlert(data.vehicles_ok ? `Motive connection successful. Vehicles API access is working${data.ifta_ok?' • IFTA access available':' • IFTA not confirmed'}${data.hos_logs_ok?' • HOS Logs access available':' • HOS Logs not confirmed'}${data.safety_events_ok?' • Driver Performance Events available':' • Driver Performance Events unavailable'}${data.speeding_events_ok?' • Speeding Events available':' • Speeding Events unavailable'}${data.gps_data_ok?' • historical GPS breadcrumbs available':(data.gps_access_ok?' • historical GPS endpoint accessible, but no recent breadcrumbs found':' • historical GPS access not confirmed')}.` : 'Motive connection test failed.', data.vehicles_ok?'success':'error');
      if(refreshAfter && data.vehicles_ok) await refreshMotiveFleet();
    }catch(err){ state.motive.test={ok:false,vehicles_ok:false,ifta_ok:false,vehicles_message:err.message}; showAlert(`Motive connection failed: ${escapeHtml(err.message)}`,'error'); }
    finally{ state.motive.loading=false; renderMotive(); }
  }
  async function refreshMotiveFleet(silent=false){
    if(!state.motive.configured){ if(!silent) showAlert('Connect Motive first.','warning'); return; }
    state.motive.loading=true; renderMotive();
    try{
      const [vehicleData,driverResult]=await Promise.all([
        localApi('/api/motive/vehicles'),
        localApi('/api/motive/drivers').then(data=>({data,error:null})).catch(error=>({data:null,error}))
      ]);
      state.motive.vehicles=Array.isArray(vehicleData.vehicles)?vehicleData.vehicles:[];
      if(driverResult.data) {if(!driverResult.data.ok||!Array.isArray(driverResult.data.drivers))throw new Error('Motive returned an incomplete driver directory.');state.motive.drivers=driverResult.data.drivers;state.motive.driversLoaded=true;state.motive.driversLastSync=new Date().toISOString();state.motive.driversError='';}
      if(driverResult.error)state.motive.driversError=driverResult.error.message||String(driverResult.error);
      state.motive.lastSync=new Date().toISOString();
      if(state.dispatchLoaded){
        syncDispatchTractorMetadataFromMotive();
        const rosterChanged=syncSharedDriverRoster();
        if(rosterChanged&&canAccessModuleKey('dispatch',true)) await saveDispatchData(true);
        renderDispatch(); renderDailyDispatch();
      }
      if(!silent) showAlert(`Loaded <strong>${state.motive.vehicles.length}</strong> vehicle${state.motive.vehicles.length===1?'':'s'} and <strong>${state.motive.drivers.length}</strong> driver${state.motive.drivers.length===1?'':'s'} from Motive.${driverResult.error?' Driver status could not be refreshed; the last known roster was retained.':''}`,driverResult.error?'warning':'success');
    }catch(err){ if(!silent) showAlert(`Could not load the Motive fleet: ${escapeHtml(err.message)}`,'error'); }
    finally{ state.motive.loading=false; renderMotive(); }
  }
  async function syncMotiveToMaintenance(){
    if(!hasWorkspace()){ showAlert('Connect NBL Cloud or choose the NBL business data folder before updating Maintenance.','warning'); return; }
    if(!state.motive.vehicles.length){ showAlert('Refresh the Motive fleet first.','warning'); return; }
    if(!state.maintenanceLoaded && state.directoryHandle) await loadMaintenanceData();
    let matched=0, odometerUpdated=0, metadataUpdated=0, skipped=0;
    const now=new Date().toISOString();
    for(const v of state.motive.vehicles){
      const t=maintenanceMatchForMotive(v); if(!t){ skipped++; continue; }
      matched++;
      const odo=motiveOdometer(v), asOf=motiveLocatedDate(v)||todayIso();
      if(odo!=null){ t.motiveMileage=round0(odo); t.mileageAsOf=asOf; odometerUpdated++; }
      if(v.id!=null) t.motiveVehicleId=String(v.id);
      t.motiveLastSync=now;
      if(v.vin && !t.vin){ t.vin=String(v.vin).trim().toUpperCase(); metadataUpdated++; }
      if(!t.makeModel){ const mm=[v.year,v.make,v.model].filter(Boolean).join(' ').trim(); if(mm){t.makeModel=mm; metadataUpdated++;} }
    }
    if(matched){ await saveMaintenanceData(true); renderMaintenance(); renderIvmr(); }
    renderMotive();
    showAlert(`Motive → Maintenance sync complete: <strong>${odometerUpdated}</strong> odometer${odometerUpdated===1?'':'s'} updated across <strong>${matched}</strong> matched tractor${matched===1?'':'s'}. ${skipped?`${skipped} Motive vehicle${skipped===1?' was':'s were'} not matched to a maintenance tractor.`:''}`,'success');
  }
  function renderMotive(){
    if(!$('motiveScreen')) return;
    renderMotiveGeofences();
    const m=state.motive, connected=m.backendAvailable&&m.configured;
    const matched=m.vehicles.filter(v=>maintenanceMatchForMotive(v)).length;
    const iftaCount=m.vehicles.filter(v=>v.ifta===true || String(v.ifta).toLowerCase()==='true').length;
    $('motiveCards').innerHTML=[
      ['Connection',connected?'Connected':'Not Connected',connected?'':'warning-card'],
      ['Vehicles Loaded',fmtNum(m.vehicles.length),''],
      ['Matched to Maintenance',fmtNum(matched),''],
      ['IFTA Vehicles',m.vehicles.length?fmtNum(iftaCount):'—','']
    ].map(x=>`<div class="summary-card ${x[2]}"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
    const pill=$('motiveConnectionPill');
    if(pill){ pill.textContent=connected?'Connected':'Not Connected'; pill.className=`status-pill ${connected?'yes':'baseline'}`; }
    $('testMotiveBtn').disabled=!connected||m.loading;
    $('refreshMotiveBtn').disabled=!connected||m.loading;
    $('disconnectMotiveBtn').disabled=!connected||m.loading||m.storage==='environment';
    $('saveMotiveKeyBtn').disabled=!m.backendAvailable||m.loading||m.storage==='environment';
    $('syncMotiveMaintenanceBtn').disabled=!m.vehicles.length||!hasWorkspace()||m.loading;
    const onlineMotive=m.storage==='environment';
    $('motiveBackendNote').innerHTML=m.backendAvailable
      ? (connected
          ? (onlineMotive
              ? `API key ${escapeHtml(m.keyHint||'configured')} is securely configured on the NBL server through Railway Variables. It is never sent to the browser or stored in NBL Cloud snapshots.`
              : `API key ${escapeHtml(m.keyHint||'configured')} is stored only on this computer. It is <strong>not</strong> saved in the NBL data folder or NBL Cloud.`)
          : (location.hostname!=='127.0.0.1' && location.hostname!=='localhost'
              ? 'The online NBL server is running, but Motive is not configured. Add <strong>MOTIVE_API_KEY</strong> under Railway → web → Variables, then redeploy.'
              : 'Local integration service is running. Paste a Motive API key above to connect.'))
      : 'Motive integration is unavailable because index.html was opened directly. On Mac, close this tab and open <strong>NBL FleetCommand.app</strong>; on Windows, use the included launcher.';
    const t=m.test;
    const safetyTypes=t?.safety_events_result?.event_types||{},safetyTypeText=Object.entries(safetyTypes).map(([type,count])=>`${String(type).replaceAll('_',' ')}: ${count}`).join(' • ');
    $('motiveTestResults').innerHTML=t?`<div class="motive-access-grid"><div><span>Vehicles API</span><strong class="${t.vehicles_ok?'ok-text':'bad-text'}">${t.vehicles_ok?'Available':'Unavailable'}</strong>${t.vehicles_message?`<small>${escapeHtml(t.vehicles_message)}</small>`:''}</div><div><span>IFTA API</span><strong class="${t.ifta_ok?'ok-text':'bad-text'}">${t.ifta_ok?'Available':'Not Confirmed'}</strong>${t.ifta_message?`<small>${escapeHtml(t.ifta_message)}</small>`:''}</div><div><span>HOS Logs</span><strong class="${t.hos_logs_ok?'ok-text':'bad-text'}">${t.hos_logs_ok?'Available':'Not Confirmed'}</strong>${t.hos_logs_message?`<small>${escapeHtml(t.hos_logs_message)}</small>`:''}</div><div><span>Historical GPS</span><strong class="${t.gps_data_ok?'ok-text':'bad-text'}">${t.gps_data_ok?'Breadcrumbs Available':(t.gps_access_ok?'Endpoint Available':'Not Confirmed')}</strong>${t.gps_message?`<small>${escapeHtml(t.gps_message)}</small>`:''}${t.gps_result?.vehicle_number?`<small>Test tractor: ${escapeHtml(t.gps_result.vehicle_number)}${t.gps_result.point_count!=null?` • ${fmtNum(t.gps_result.point_count)} points`:''}</small>`:''}</div><div class="motive-safety-access"><span>Driver Performance Events</span><strong class="${t.safety_events_ok?'ok-text':'bad-text'}">${t.safety_events_ok?'Available':'Unavailable'}</strong><small>${t.safety_events_ok?`${fmtNum(t.safety_events_result?.total||0)} event${Number(t.safety_events_result?.total||0)===1?'':'s'} in the last 30 days • ${fmtNum(t.safety_events_result?.camera_media_records||0)} with camera media`:(t.safety_events_message||'Permission not confirmed')}</small>${safetyTypeText?`<small>${escapeHtml(safetyTypeText)}</small>`:''}</div><div class="motive-safety-access"><span>Speeding Events</span><strong class="${t.speeding_events_ok?'ok-text':'bad-text'}">${t.speeding_events_ok?'Available':'Unavailable'}</strong><small>${t.speeding_events_ok?`${fmtNum(t.speeding_events_result?.total||0)} event${Number(t.speeding_events_result?.total||0)===1?'':'s'} in the last 30 days`:(t.speeding_events_message||'Permission not confirmed')}</small></div></div>`:'';
    $('motiveFleetCount').textContent=`${m.vehicles.length} vehicle${m.vehicles.length===1?'':'s'}`;
    const table=$('motiveFleetTable');
    const headers=['Tractor','VIN','Make / Model','Status','IFTA','Current Driver','Motive Odometer','Last Location','Reading Time','Maintenance'];
    table.querySelector('thead').innerHTML='<tr>'+headers.map(h=>`<th>${h}</th>`).join('')+'</tr>';
    table.querySelector('tbody').innerHTML=m.vehicles.length?m.vehicles.map(v=>{
      const match=maintenanceMatchForMotive(v), odo=motiveOdometer(v), mm=[v.year,v.make,v.model].filter(Boolean).join(' '), loc=v.location_description||'—';
      const when=v.located_at ? new Date(v.located_at) : null; const whenText=when && !isNaN(when) ? when.toLocaleString() : '—';
      return `<tr><td><strong>${escapeHtml(v.number||'—')}</strong></td><td>${escapeHtml(v.vin||'—')}</td><td>${escapeHtml(mm||'—')}</td><td>${escapeHtml(v.status||'—')}</td><td>${v.ifta===true||String(v.ifta).toLowerCase()==='true'?'<span class="status-pill yes">Yes</span>':(v.ifta===false||String(v.ifta).toLowerCase()==='false'?'<span class="status-pill baseline">No</span>':'—')}</td><td>${escapeHtml(motiveDriverName(v))}</td><td><strong>${odo==null?'—':fmtNum(odo)}</strong>${v.true_odometer!=null?'<small>True odometer</small>':''}</td><td>${escapeHtml(loc)}</td><td>${escapeHtml(whenText)}</td><td>${match?`<span class="status-pill yes">Matched ${escapeHtml(match.tractorNumber)}</span>`:'<span class="status-pill baseline">Not matched</span>'}</td></tr>`;
    }).join(''):'<tr><td colspan="10" class="empty-table-cell">Connect Motive to load vehicle data. Connected accounts refresh automatically when the app opens.</td></tr>';
    if(state.currentScreen==='motive'){
      $('fileMeta').textContent=!m.backendAvailable?'Motive integration requires NBL FleetCommand.app or the included local launcher.':(connected?`Motive connected${m.keyHint?` • key ${m.keyHint}`:''}${m.lastSync?` • last fleet refresh ${new Date(m.lastSync).toLocaleString()}`:''}`:'Motive API key not configured on this computer.');
    }
  }

  document.querySelectorAll('.nav-group-toggle').forEach(toggle=>toggle.addEventListener('click',()=>{
    const group=toggle.closest('.nav-group'); if(!group) return;
    const collapsed=group.classList.toggle('collapsed');
    toggle.setAttribute('aria-expanded',collapsed?'false':'true');
  }));
  $('refreshSafetyBtn')?.addEventListener('click',()=>loadSafetyData(false));
  $('safetyDriverFilter')?.addEventListener('change',e=>{state.safety.driverFilter=e.target.value;renderSafety();});
  $('safetyEventTypeFilter')?.addEventListener('change',e=>{state.safety.eventTypeFilter=e.target.value;renderSafety();});
  $('safetyStatusFilter')?.addEventListener('change',e=>{state.safety.statusFilter=e.target.value;renderSafety();});
  $('safetyTrendDriver')?.addEventListener('change',e=>{state.safety.trendDriverId=e.target.value;renderSafety();});
  $('safetyScreen')?.addEventListener('click',e=>{
    const save=e.target.closest('[data-save-safety-assignment]');if(save){saveSafetyAssignment(save.dataset.saveSafetyAssignment);return;}
    const dismiss=e.target.closest('[data-safety-dismiss]');if(dismiss){toggleSafetyDismissal(dismiss.dataset.safetyDismiss);return;}
    const sort=e.target.closest('[data-safety-sort]');if(sort){const key=sort.dataset.safetySort,current=state.safety.rankSort||{key:'adjusted',dir:'asc'};state.safety.rankSort={key,dir:current.key===key?(current.dir==='asc'?'desc':'asc'):(key==='driver'?'asc':'desc')};renderSafety();return;}
    const exportBtn=e.target.closest('[data-safety-driver-export]');if(exportBtn){exportSafetyDriverPdf(exportBtn.dataset.safetyDriverExport);return;}
    const trend=e.target.closest('[data-safety-driver-trend]');if(trend){state.safety.trendDriverId=trend.dataset.safetyDriverTrend;renderSafety();$('safetyScoreTrendChart')?.scrollIntoView({behavior:'smooth',block:'center'});return;}
    const view=e.target.closest('[data-safety-driver-view]');if(view){state.safety.driverFilter=view.dataset.safetyDriverView;renderSafety();$('safetyEventsTable')?.scrollIntoView({behavior:'smooth',block:'start'});}
  });
  function setMobileSidebar(open){
    document.body.classList.toggle('mobile-sidebar-open',!!open);
    $('mobileMenuBtn')?.setAttribute('aria-expanded',open?'true':'false');
    $('mobileMenuBtn')?.setAttribute('aria-label',open?'Close navigation':'Open navigation');
  }
  $('mobileMenuBtn')?.addEventListener('click',()=>setMobileSidebar(!document.body.classList.contains('mobile-sidebar-open')));
  $('mobileSidebarBackdrop')?.addEventListener('click',()=>setMobileSidebar(false));
  document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>{ requestScreen(b.dataset.screen); setMobileSidebar(false); }));
  document.addEventListener('click',e=>{ const btn=e.target.closest('[data-dashboard-screen]'); if(btn) requestScreen(btn.dataset.dashboardScreen); });
  $('dashboardMilesRange')?.addEventListener('change',e=>{ const p=dashboardPreferences();p.milesWeeks=Number(e.target.value)||8;localStorage.setItem(dashboardPrefsKey(),JSON.stringify(p));renderDashboard(); });
  $('dashboardCustomizeBtn')?.addEventListener('click',()=>{ const p=dashboardPreferences();$('dashboardShowMiles').checked=p.showMiles;$('dashboardShowDispatch').checked=p.showDispatch;$('dashboardShowMaintenance').checked=p.showMaintenance;$('dashboardShowAttention').checked=p.showAttention;openModal('dashboardCustomizeModal'); });
  $('saveDashboardPreferencesBtn')?.addEventListener('click',()=>{ const p=dashboardPreferences();p.showMiles=$('dashboardShowMiles').checked;p.showDispatch=$('dashboardShowDispatch').checked;p.showMaintenance=$('dashboardShowMaintenance').checked;p.showAttention=$('dashboardShowAttention').checked;localStorage.setItem(dashboardPrefsKey(),JSON.stringify(p));closeModal('dashboardCustomizeModal');renderDashboard(); });
  $('financialPlInput')?.addEventListener('change',e=>{ const file=e.target.files?.[0]; e.target.value=''; importFinancialWorkbook(file); });
  $('refreshFinancialAnalysisBtn')?.addEventListener('click',renderFinancialAnalysis);
  $('financialStartPeriod')?.addEventListener('change',renderFinancialAnalysis);
  $('financialEndPeriod')?.addEventListener('change',renderFinancialAnalysis);
  $('toggleFinancialDetailBtn')?.addEventListener('click',toggleFinancialDetail);
  $('unlockFinanceBtn')?.addEventListener('click',()=>openFinanceSecurityModal());
  $('financeSecurityBtn')?.addEventListener('click',()=>openFinanceSecurityModal());
  $('appSettingsBtn')?.addEventListener('click',()=>openModal('appSettingsModal'));
  $('financeSetupForm')?.addEventListener('submit',saveFinanceCodeFromForm);
  $('financeUnlockForm')?.addEventListener('submit',unlockFinanceFromForm);
  $('deviceUnlockBtn')?.addEventListener('click',unlockFinanceWithDevice);
  $('enableDeviceUnlockBtn')?.addEventListener('click',enrollDeviceUnlock);
  $('lockFinanceNowBtn')?.addEventListener('click',()=>{ lockFinance('Finance modules locked.'); closeModal('financeSecurityModal'); });
  $('changeFinanceCodeBtn')?.addEventListener('click',()=>{ $('financeNewCode').value=''; $('financeConfirmCode').value=''; openFinanceSecurityModal('financeSecuritySetup'); });
  $('cloudLoginForm')?.addEventListener('submit',cloudLoginFromForm);
  $('cloudSyncBtn')?.addEventListener('click',openCloudSync);
  $('myProfileBtn')?.addEventListener('click',openMyProfile);
  $('myProfileForm')?.addEventListener('submit',saveMyProfileFromForm);
  $('cloudSignOutBtn')?.addEventListener('click',cloudSignOut);
  $('cloudImportLocalBtn')?.addEventListener('click',syncLocalToCloud);
  $('cloudReloadBtn')?.addEventListener('click',reloadFromCloud);
  $('userAccessCreateForm')?.addEventListener('submit',createNblUserFromForm);
  $('refreshUserAccessBtn')?.addEventListener('click',()=>loadUserAccess(true));
  $('chooseFolderBtn').addEventListener('click',connectFolder);
  $('emptyChooseFolderBtn').addEventListener('click',connectFolder);
  $('refreshFolderBtn').addEventListener('click',()=>scanFolder(null,false));
  $('saveBtn').addEventListener('click',()=>saveToFolder(false));
  $('exportBtn').addEventListener('click',exportExcel);
  $('fileInput').addEventListener('change',e=>{handleFiles(e.target.files); e.target.value='';});
  $('emptyFileInput').addEventListener('change',e=>{handleFiles(e.target.files); e.target.value='';});
  ['mileageRate','singleRate','doubleRate'].forEach(id=>$(id)?.addEventListener('input',ratesChanged));
  $('saveDhMappingsBtn')?.addEventListener('click',saveDhMappings);
  $('refreshHosWorkDaysBtn')?.addEventListener('click',()=>refreshPayrollHosWorkDays(false));
  $('payDateSelect').addEventListener('change',e=>selectStatement(e.target.value));
  $('driverSettlementDateSelect').addEventListener('change',e=>selectStatement(e.target.value));
  document.querySelectorAll('[data-settlement-tab]').forEach(btn=>btn.addEventListener('click',()=>setSettlementTab(btn.dataset.settlementTab)));
  $('settlementAnalysisDateSelect')?.addEventListener('change',e=>{state.settlement.analysisStatementId=e.target.value;renderSettlementAnalysis();});
  $('generateSettlementReportsBtn')?.addEventListener('click',async()=>{
    if(cloudConnected()&&!state.directoryHandle) await refreshSettlementReportsFromCloud(true);
    else renderSettlementReports();
  });
  $('managePayProfilesBtn')?.addEventListener('click',openPayrollProfilesModal);
  $('addPayrollProfileBtn')?.addEventListener('click',()=>openPayrollProfileEditor($('payrollProfileDriverSelect')?.value));
  $('payrollProfileForm')?.addEventListener('submit',savePayrollProfileFromForm);
  $('payrollAdjustmentForm')?.addEventListener('submit',addPayrollAdjustment);
  $('savePayrollDaysBtn')?.addEventListener('click',savePayrollDays);
  $('exportMeetingsBtn')?.addEventListener('click',exportMeetingsExcel);
  $('exportInspectionsBtn')?.addEventListener('click',exportTripInspectionsExcel);
  $('resetInspectionWidthsBtn')?.addEventListener('click',()=>resetMeetingColumnWidths('inspection'));
  $('resetManagementWidthsBtn')?.addEventListener('click',()=>resetMeetingColumnWidths('management'));
  $('startNewAuditBtn')?.addEventListener('click',()=>{ prepareNewAudit(true); setAuditTab('new'); });
  $('cancelAuditBtn')?.addEventListener('click',()=>setAuditTab('dashboard'));
  $('auditNewForm')?.addEventListener('submit',saveNewAudit);
  $('optimizeDispatchBtn')?.addEventListener('click',optimizeDispatchCoverage);
  $('dailyDispatchDateInput')?.addEventListener('change',renderDailyDispatch);
  $('dailyDispatchTable')?.addEventListener('click',e=>{const add=e.target.closest('[data-daily-add-refusal]');if(add){openDailyRefusalModal(add.closest('[data-daily-route-row]'));return;}const remove=e.target.closest('[data-daily-remove-refusal]');if(remove){const tr=remove.closest('[data-daily-route-row]'),refusals=dailyDispatchRefusalsFromRow(tr);refusals.splice(Number(remove.dataset.dailyRemoveRefusal),1);setDailyDispatchRefusals(tr,refusals);return;}const btn=e.target.closest('[data-daily-hub-toggle]');if(!btn)return;const open=btn.getAttribute('aria-expanded')!=='true';btn.setAttribute('aria-expanded',open?'true':'false');const icon=btn.querySelector('em');if(icon)icon.textContent=open?'−':'+';state.dailyDispatchHubOpen[btn.dataset.dailyHubKey]=open;document.querySelectorAll('#dailyDispatchTable [data-daily-hub-route]').forEach(row=>{if(row.dataset.dailyHubRoute===btn.dataset.dailyHubToggle)row.classList.toggle('daily-hub-collapsed',!open);});});
  $('dailyRefusalForm')?.addEventListener('submit',saveDailyRefusalFromForm);
  $('saveDailyDispatchBtn')?.addEventListener('click',saveDailyDispatchBoard);
  $('exportDispatchExcelBtn')?.addEventListener('click',exportDispatchExcel);
  $('exportDispatchPdfBtn')?.addEventListener('click',exportDispatchTeamPdf);
  $('saveDispatchPlanBtn')?.addEventListener('click',saveCurrentDispatchPlanAsNew);
  $('loadDispatchPlanBtn')?.addEventListener('click',loadSelectedDispatchPlan);
  $('updateDispatchPlanBtn')?.addEventListener('click',updateSelectedDispatchPlan);
  $('renameDispatchPlanBtn')?.addEventListener('click',renameSelectedDispatchPlan);
  $('deleteDispatchPlanBtn')?.addEventListener('click',deleteSelectedDispatchPlan);
  $('exportAllDispatchPlansPdfBtn')?.addEventListener('click',exportAllSavedDispatchPlansPdf);
  $('dispatchSavedPlanSelect')?.addEventListener('change',e=>selectSavedDispatchPlan(e.target.value));
  $('resetDispatchBtn')?.addEventListener('click',resetDispatchPlan);
  $('addDispatchRunBtn')?.addEventListener('click',()=>openDispatchRunEconomicsModal());
  $('manageDispatchDriversBtn')?.addEventListener('click',openDispatchDriverRosterModal);
  $('manageDispatchTractorsBtn')?.addEventListener('click',openDispatchTractorRosterModal);
  $('refreshDispatchMotiveBtn')?.addEventListener('click',refreshDispatchMotiveFleet);
  $('selectAllMotiveTractorsBtn')?.addEventListener('click',selectAllMotiveDispatchTractors);
  $('importMotiveTractorsBtn')?.addEventListener('click',importSelectedMotiveTractors);
  $('selectAllSettlementDriversBtn')?.addEventListener('click',selectAllSettlementDispatchDrivers);
  $('importSettlementDriversBtn')?.addEventListener('click',importSelectedSettlementDrivers);
  $('addDispatchLocationBtn')?.addEventListener('click',()=>openDispatchLocationModal());
  $('editDispatchLocationBtn')?.addEventListener('click',()=>openDispatchLocationModal(dispatchActiveLocationId()));
  $('deleteDispatchLocationBtn')?.addEventListener('click',deleteDispatchLocation);
  $('saveMotiveKeyBtn')?.addEventListener('click',saveMotiveKey);
  $('disconnectMotiveBtn')?.addEventListener('click',disconnectMotive);
  $('inspectMotiveGeofencesBtn')?.addEventListener('click',inspectMotiveGeofences);
  $('testMotiveBtn')?.addEventListener('click',()=>testMotiveConnection(false));
  $('refreshMotiveBtn')?.addEventListener('click',refreshMotiveFleet);
  $('syncMotiveMaintenanceBtn')?.addEventListener('click',syncMotiveToMaintenance);
  $('manageIvmrLocationsBtn')?.addEventListener('click',()=>{const panel=$('ivmrLocationPanel'); if(panel){ panel.open=true; panel.scrollIntoView({behavior:'smooth',block:'start'}); }});
  $('updateIvmrDirectoryBtn')?.addEventListener('click',()=>updateIvmrDirectory());
  $('ivmrLocationSearch')?.addEventListener('input',renderIvmrLocations);
  $('addIvmrLocationBtn')?.addEventListener('click',()=>openIvmrLocationModal());
  $('ivmrLocationSpotInput')?.addEventListener('input',updateIvmrLocationPreview);
  $('ivmrLocationCityInput')?.addEventListener('input',updateIvmrLocationPreview);
  $('ivmrLocationForm')?.addEventListener('submit',async e=>{
    e.preventDefault();
    if(state.ivmrDirectory.loading){showAlert('Wait for the directory update to finish.','warning');return;}
    const editId=$('ivmrLocationEditId').value;
    const loc=normalizedIvmrLocation({
      ...(state.ivmrLocations.locations||[]).find(x=>x.id===editId), address:$('ivmrLocationAddressInput').value,
      id:editId||uid('ivmr_loc'), spot:$('ivmrLocationSpotInput').value, city:$('ivmrLocationCityInput').value,
      state:$('ivmrLocationStateInput').value, radius_miles:$('ivmrLocationRadiusInput').value,
      lat:$('ivmrLocationLatInput').value, lon:$('ivmrLocationLonInput').value, aliases:$('ivmrLocationAliasesInput').value
    });
    if(!loc.city){ showAlert('Enter a city for the IVMR location.','warning'); return; }
    if(!loc.state){ showAlert('Enter a two-letter state for the IVMR location.','warning'); return; }
    const list=state.ivmrLocations?.locations||[];
    const idx=list.findIndex(x=>x.id===editId);
    if(idx>=0) list[idx]=loc; else list.push(loc);
    state.ivmrLocations={...state.ivmrLocations,version:2,locations:list};
    await saveIvmrLocationData(true);
    clearIvmrLocationMatches();
    if(state.ivmr.loadedAt) await saveIvmrRouteCache();
    closeModal('ivmrLocationModal'); renderIvmr();
    showAlert(`IVMR location <strong>${escapeHtml(ivmrLocationLabel(loc))}</strong> saved.`,'success');
  });
  document.addEventListener('click',async e=>{
    const edit=e.target.closest('[data-ivmr-location-edit]');
    if(state.ivmrDirectory.loading&&(edit||e.target.closest('[data-ivmr-location-delete]')))return;
    if(edit){ const loc=(state.ivmrLocations?.locations||[]).find(x=>x.id===edit.dataset.ivmrLocationEdit); if(loc) openIvmrLocationModal(loc); return; }
    const del=e.target.closest('[data-ivmr-location-delete]');
    if(del){ const loc=(state.ivmrLocations?.locations||[]).find(x=>x.id===del.dataset.ivmrLocationDelete); if(!loc) return; if(!window.confirm(`Delete IVMR location ${ivmrLocationLabel(loc)}?`)) return; state.ivmrLocations.locations=state.ivmrLocations.locations.filter(x=>x.id!==loc.id); await saveIvmrLocationData(true); clearIvmrLocationMatches(); if(state.ivmr.loadedAt) await saveIvmrRouteCache(); renderIvmr(); }
  });

  $('loadIvmrBtn')?.addEventListener('click',loadIvmrData);
  $('runIvmrHistoryTestBtn')?.addEventListener('click',runIvmrHistoryTest);
  $('downloadIvmrHistoryJsonBtn')?.addEventListener('click',downloadIvmrHistoryJson);
  $('buildIvmrRoutesBtn')?.addEventListener('click',()=>buildIvmrRoutes());
  $('cancelIvmrRoutesBtn')?.addEventListener('click',()=>{ state.ivmr.routeCancelRequested=true; if(state.ivmr.routeProgress) state.ivmr.routeProgress.message='Stopping after the current batch…'; renderIvmr(); });
  $('exportAllIvmrBtn')?.addEventListener('click',()=>generateIvmrPdf());
  $('ivmrTractorFilter')?.addEventListener('change',renderIvmr);
  $('ivmrEntityName')?.addEventListener('change',saveIvmrEntitySettings);
  $('ivmrEntityNumber')?.addEventListener('change',saveIvmrEntitySettings);
  $('addInspectionBtn').addEventListener('click',()=>openInspectionModal());
  $('refreshFaultCodesBtn')?.addEventListener('click',refreshFaultCodes);
  $('faultStatusFilter')?.addEventListener('change',renderFaultCodes);
  $('faultTractorFilter')?.addEventListener('change',renderFaultCodes);
  $('addMaintenanceTaskBtn')?.addEventListener('click',()=>openMaintenanceTaskModal());
  $('maintenanceTaskStatusFilter')?.addEventListener('change',renderMaintenanceTasks);
  $('maintenanceTaskForm')?.addEventListener('submit',saveMaintenanceTaskFromForm);
  $('addManagementItemBtn').addEventListener('click',()=>openManagementModal());
  $('inspectionForm').addEventListener('submit',saveInspectionFromForm);
  $('managementItemForm').addEventListener('submit',saveManagementFromForm);
  $('addRecruitmentCandidateBtn')?.addEventListener('click',()=>openRecruitmentCandidateModal());
  $('recruitmentCandidateForm')?.addEventListener('submit',saveRecruitmentCandidateFromForm);
  $('recruitmentCandidateForm')?.addEventListener('invalid',revealRecruitmentInvalidField,true);
  $('hiringSummaryPreviewBtn')?.addEventListener('click',previewHiringSummary);
  $('hiringSummaryDownloadBtn')?.addEventListener('click',()=>downloadHiringSummaryPdf());
  $('hiringSummaryPreviewDownloadBtn')?.addEventListener('click',()=>downloadHiringSummaryPdf(true));
  $('recruitmentRoadTestForm')?.addEventListener('submit',saveRecruitmentRoadTest);
  $('roadTestSaveOnlyBtn')?.addEventListener('click',finishRoadTestSaveOnly);
  $('roadTestExportAfterSaveBtn')?.addEventListener('click',exportRecruitmentRoadTestPdf);
  $('recruitmentApplicationPdfInput')?.addEventListener('change',e=>parseRecruitmentApplicationPdf(e.target.files?.[0]));
  Array.from({length:5},(_,index)=>index+1).forEach(number=>$(`recruitmentDocument${number}Input`)?.addEventListener('change',e=>{const file=e.target.files?.[0];if(file)setRecruitmentDocumentUploadStatus(`Document ${number} selected: ${file.name}. It will upload when the candidate is saved.`,'working');}));
  document.querySelectorAll('[data-view-recruitment-document]').forEach(btn=>btn.addEventListener('click',()=>viewRecruitmentDocument(btn.dataset.viewRecruitmentDocument)));
  document.querySelectorAll('[data-delete-recruitment-document]').forEach(btn=>btn.addEventListener('click',()=>deleteRecruitmentDocument(btn.dataset.deleteRecruitmentDocument)));
  document.querySelectorAll('[data-accept-recruitment-application]').forEach(btn=>btn.addEventListener('click',()=>resolveRecruitmentApplicationMismatch(true)));
  document.querySelectorAll('[data-reject-recruitment-application]').forEach(btn=>btn.addEventListener('click',()=>resolveRecruitmentApplicationMismatch(false)));
  $('recruitmentSsnInput')?.addEventListener('input',e=>{ const full=normalizedRecruitmentSsn(e.target.value); if(full){state.hrSsn.draftFull=full;state.hrSsn.revealed=true;} updateRecruitmentSsnRevealButton(); });
  $('recruitmentSsnInput')?.addEventListener('blur',e=>{ const full=normalizedRecruitmentSsn(e.target.value); if(full) state.hrSsn.draftFull=full; else { const last4=recruitmentSsnLast4FromInput(e.target.value); const draft=normalizedRecruitmentSsn(state.hrSsn.draftFull); if(last4 && draft && !draft.endsWith(last4)) state.hrSsn.draftFull=''; } maskRecruitmentSsnField(); });
  $('recruitmentSsnRevealBtn')?.addEventListener('click',toggleRecruitmentSsnReveal);
  $('ssnAccessForm')?.addEventListener('submit',submitSsnAccessCode);
  $('resetRecruitmentLayoutBtn')?.addEventListener('click',resetRecruitmentLayout);
  $('exportRecruitmentExcelBtn')?.addEventListener('click',exportRecruitmentExcel);
  $('recruitmentSearchInput')?.addEventListener('input',e=>{state.recruitmentSearch=e.target.value||'';renderHr();});
  $('recruitmentStatusFilter')?.addEventListener('change',e=>{state.recruitmentStatusFilter=e.target.value||'';renderHr();});
  $('tractorImportInput').addEventListener('change',e=>{importTractorSpreadsheet(e.target.files[0]); e.target.value='';});
  $('downloadTractorTemplateBtn').addEventListener('click',downloadTractorTemplate);
  $('addTractorBtn').addEventListener('click',()=>openTractorModal());
  $('recordMaintenanceBtn').addEventListener('click',()=>openMaintenanceModal());
  $('generateAllMmrBtn')?.addEventListener('click',()=>generateMmrPdf());
  $('downloadLastMmrBtn')?.addEventListener('click',()=>{
    if(!state.lastMmrPdf){ showAlert('Generate an MMR PDF first.','warning'); return; }
    downloadBlob(state.lastMmrPdf.bytes,state.lastMmrPdf.fileName,'application/pdf');
  });
  $('dispatchScheduleForm').addEventListener('submit',saveDispatchScheduleFromForm);
  $('dispatchNewDriverForm')?.addEventListener('submit',addManualDispatchDriver);
  $('dispatchRunLocationInput')?.addEventListener('change',e=>{populateDispatchPrimaryDriverSelect(e.target.value,'');populateDispatchPrimaryTractorSelect(e.target.value,'');});
  $('dispatchRunEconomicsForm')?.addEventListener('submit',saveDispatchRunEconomicsFromForm);
  $('dispatchLocationForm')?.addEventListener('submit',saveDispatchLocationFromForm);
  // Edit Schedule buttons live inside draggable driver cards. Stop pointer/drag
  // events on the button itself so the card cannot consume the interaction.
  document.addEventListener('pointerdown',e=>{
    if(e.target.closest('[data-edit-dispatch-driver]') || e.target.closest('[data-delete-dispatch-driver]') || e.target.closest('[data-edit-dispatch-run]') || e.target.closest('[data-delete-dispatch-run]') || e.target.closest('[data-delete-dispatch-tractor]')) e.stopPropagation();
  });
  document.addEventListener('dragstart',e=>{
    if(e.target.closest('[data-edit-dispatch-driver]') || e.target.closest('[data-delete-dispatch-driver]') || e.target.closest('[data-edit-dispatch-run]') || e.target.closest('[data-delete-dispatch-run]') || e.target.closest('[data-delete-dispatch-tractor]')) e.preventDefault();
  });
  $('tractorForm').addEventListener('submit',saveTractorFromForm);
  $('maintenanceForm').addEventListener('submit',saveMaintenanceFromForm);
  $('maintenanceTypeInput').addEventListener('change',()=>updateMaintenanceScope(true));
  $('maintenanceHistoryFilter').addEventListener('change',renderMaintenanceHistory);
  $('maintenanceTractorInput').addEventListener('change',async()=>{
    const t=state.maintenance.tractors.find(x=>x.id===$('maintenanceTractorInput').value);
    clearMaintenanceMotiveOdometerSource();
    if(t) $('maintenanceOdometerInput').value=tractorPMStatus(t).mileage.estimatedMileage;
    await maybeAutoPullMaintenanceOdometer();
  });
  $('maintenanceDateInput')?.addEventListener('change',maybeAutoPullMaintenanceOdometer);
  $('pullMaintenanceOdometerBtn')?.addEventListener('click',()=>pullMaintenanceOdometerFromMotive({silent:false}));
  $('maintenanceOdometerInput')?.addEventListener('input',()=>{
    const input=$('maintenanceOdometerInput');
    if(input.dataset.motiveOdometer && String(round0(input.value))!==String(input.dataset.motiveOdometer)){
      clearMaintenanceMotiveOdometerSource();
      setMaintenanceMotiveOdometerStatus('Mileage manually overridden. Click Pull from Motive to restore the historical reading.','warning');
    }
  });
  document.querySelectorAll('[data-close-modal]').forEach(b=>b.addEventListener('click',()=>closeModal(b.dataset.closeModal)));
  document.querySelectorAll('.modal-backdrop').forEach(m=>m.addEventListener('click',e=>{ if(e.target===m && m.id!=='roadTestExportPromptModal') closeModal(m.id); }));
  document.addEventListener('change',e=>{
    const auditStatus=e.target.closest('#auditChecklistContainer [data-audit-field="status"]'); if(auditStatus){ const row=auditStatus.closest('.audit-check-row'); if(row){ row.classList.remove('audit-pass','audit-fail','audit-check','audit-missing'); if(auditStatus.value) row.classList.add('audit-'+auditStatus.value.toLowerCase()); } return; }
    const payrollDay=e.target.closest('[data-payroll-workday-driver]');
    if(payrollDay){ setPayrollWorkedDay(payrollDay.dataset.payrollWorkdayDriver,payrollDay.dataset.payrollWorkdayDate,payrollDay.checked); return; }
    const tractorLoc=e.target.closest('[data-dispatch-tractor-location]'); if(tractorLoc){changeDispatchTractorLocation(tractorLoc.dataset.dispatchTractorLocation,tractorLoc.value);return;}
    const runTractor=e.target.closest('[data-dispatch-run-tractor]'); if(runTractor){assignDispatchTractorToRun(runTractor.dataset.dispatchRunTractor,runTractor.value);return;}
  });
  document.addEventListener('click',e=>{
    const userAccessSave=e.target.closest('[data-save-user-access]'); if(userAccessSave){ saveUserAccess(userAccessSave.dataset.saveUserAccess); return; }
    const hrSort=e.target.closest('[data-hr-sort]'); if(hrSort){ toggleRecruitmentSort(hrSort.dataset.hrSort); return; }
    const edit=e.target.closest('[data-edit-tractor]'); if(edit) openTractorModal(edit.dataset.editTractor);
    const mmr=e.target.closest('[data-mmr-tractor]'); if(mmr) generateMmrPdf([mmr.dataset.mmrTractor]);
    const del=e.target.closest('[data-delete-maintenance]'); if(del) deleteMaintenanceRecord(del.dataset.deleteMaintenance);
    const editInspection=e.target.closest('[data-edit-inspection]'); if(editInspection) openInspectionModal(editInspection.dataset.editInspection);
    const deleteInspectionBtn=e.target.closest('[data-delete-inspection]'); if(deleteInspectionBtn) deleteInspection(deleteInspectionBtn.dataset.deleteInspection);
    const taskInspection=e.target.closest('[data-task-inspection]'); if(taskInspection){taskFromInspection(taskInspection.dataset.taskInspection);return;}
    const taskFault=e.target.closest('[data-task-fault]'); if(taskFault){taskFromFault(taskFault.dataset.taskFault);return;}
    const editMaintTask=e.target.closest('[data-edit-maint-task]'); if(editMaintTask){openMaintenanceTaskModal(editMaintTask.dataset.editMaintTask);return;}
    const deleteMaintTask=e.target.closest('[data-delete-maint-task]'); if(deleteMaintTask){deleteMaintenanceTask(deleteMaintTask.dataset.deleteMaintTask);return;}
    const editManagement=e.target.closest('[data-edit-management]'); if(editManagement) openManagementModal(editManagement.dataset.editManagement);
    const deleteManagementBtn=e.target.closest('[data-delete-management]'); if(deleteManagementBtn) deleteManagementItem(deleteManagementBtn.dataset.deleteManagement);
    const roadTestRecruitment=e.target.closest('[data-road-test-candidate]'); if(roadTestRecruitment){ openRecruitmentRoadTestModal(roadTestRecruitment.dataset.roadTestCandidate); return; }
    const hiringSummary=e.target.closest('[data-hiring-summary-candidate]');if(hiringSummary){openRecruitmentCandidateModal(hiringSummary.dataset.hiringSummaryCandidate);setTimeout(()=>revealRecruitmentSection('hiringSummarySection'),80);return;}
    const editRecruitment=e.target.closest('[data-edit-recruitment-candidate]'); if(editRecruitment){ openRecruitmentCandidateModal(editRecruitment.dataset.editRecruitmentCandidate); return; }
    const deleteRecruitment=e.target.closest('[data-delete-recruitment-candidate]'); if(deleteRecruitment){ deleteRecruitmentCandidate(deleteRecruitment.dataset.deleteRecruitmentCandidate); return; }
    const auditTab=e.target.closest('[data-audit-tab]'); if(auditTab){ setAuditTab(auditTab.dataset.auditTab); return; }
    const auditMeeting=e.target.closest('[data-audit-add-meeting]'); if(auditMeeting){ openAuditFindingMeetingItem(auditMeeting.dataset.auditAddMeeting); return; }
    const auditClose=e.target.closest('[data-audit-close]'); if(auditClose){ closeAuditFinding(auditClose.dataset.auditClose); return; }
    const auditView=e.target.closest('[data-audit-view]'); if(auditView){ viewAuditHistory(auditView.dataset.auditView); return; }
    const payrollPdf=e.target.closest('[data-payroll-summary-pdf]'); if(payrollPdf){ exportPayrollSummaryPdf(payrollPdf.dataset.payrollSummaryPdf); return; }
    const editPayroll=e.target.closest('[data-edit-payroll-profile]'); if(editPayroll){ openPayrollProfileEditor(editPayroll.dataset.editPayrollProfile); return; }
    const adjustPayroll=e.target.closest('[data-payroll-adjustments]'); if(adjustPayroll){ openPayrollAdjustments(adjustPayroll.dataset.payrollAdjustments); return; }
    const deletePayAdjustment=e.target.closest('[data-delete-payroll-adjustment]'); if(deletePayAdjustment){ deletePayrollAdjustment(deletePayAdjustment.dataset.deletePayrollAdjustment,deletePayAdjustment.dataset.payrollDriver); return; }
    const dispatchRemove=e.target.closest('[data-dispatch-remove]'); if(dispatchRemove){ const [runId,day]=dispatchRemove.dataset.dispatchRemove.split('|'); removeDispatchAssignment(runId,Number(day)); return; }
    const dispatchRunEdit=e.target.closest('[data-edit-dispatch-run]'); if(dispatchRunEdit){ openDispatchRunEconomicsModal(dispatchRunEdit.dataset.editDispatchRun); return; }
    const dispatchRunDelete=e.target.closest('[data-delete-dispatch-run]'); if(dispatchRunDelete){ deleteDispatchRun(dispatchRunDelete.dataset.deleteDispatchRun); return; }
    const dispatchLocationTab=e.target.closest('[data-dispatch-location-tab]'); if(dispatchLocationTab){ selectDispatchLocation(dispatchLocationTab.dataset.dispatchLocationTab); return; }
    const dispatchScheduleEdit=e.target.closest('[data-edit-dispatch-driver]'); if(dispatchScheduleEdit){ openDispatchScheduleModal(dispatchScheduleEdit.dataset.editDispatchDriver); return; }
    const dispatchDriverDelete=e.target.closest('[data-delete-dispatch-driver]'); if(dispatchDriverDelete){ deleteDispatchDriver(dispatchDriverDelete.dataset.deleteDispatchDriver); return; }
    const dispatchTractorDelete=e.target.closest('[data-delete-dispatch-tractor]'); if(dispatchTractorDelete){ deleteDispatchTractor(dispatchTractorDelete.dataset.deleteDispatchTractor); return; }
    const dispatchDriverPick=e.target.closest('[data-dispatch-select-driver]'); if(dispatchDriverPick && dispatchDriverIsActive(dispatchDriver(dispatchDriverPick.dataset.dispatchSelectDriver)) && !e.target.closest('.dispatch-remove') && !e.target.closest('[data-edit-dispatch-driver]')){ state.dispatchSelectedDriverId=state.dispatchSelectedDriverId===dispatchDriverPick.dataset.dispatchSelectDriver?null:dispatchDriverPick.dataset.dispatchSelectDriver; renderDispatch(); return; }
    const dispatchCell=e.target.closest('.dispatch-cell.active'); if(dispatchCell && state.dispatchSelectedDriverId){ assignDispatchDriver(state.dispatchSelectedDriverId,dispatchCell.dataset.runId,Number(dispatchCell.dataset.day)); return; }
    const ivmrPdf=e.target.closest('[data-ivmr-pdf]'); if(ivmrPdf) generateIvmrPdf([ivmrPdf.dataset.ivmrPdf]);
    const ivmrEdit=e.target.closest('[data-ivmr-edit-tractor]'); if(ivmrEdit) openTractorModal(ivmrEdit.dataset.ivmrEditTractor);
    const ivmrAdd=e.target.closest('[data-ivmr-add-tractor]'); if(ivmrAdd) openTractorFromIvmr(ivmrAdd.dataset.ivmrAddTractor);
  });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ setMobileSidebar(false); document.querySelectorAll('.modal-backdrop:not(.hidden)').forEach(m=>closeModal(m.id)); } });
  window.addEventListener('resize',()=>{ if(window.innerWidth>800) setMobileSidebar(false); });

  ['pointerdown','keydown'].forEach(evt=>document.addEventListener(evt,noteFinanceActivity,{passive:true}));

  async function initApp(){
    loadStoredFinancialAnalysis();
    loadIvmrEntitySettings();
    setIvmrDefaultDates();
    updateMaintenanceScope();
    updateFolderUI();
    await loadFinanceSecurity();
    await initCloudBridge();
    if(state.cloud.connected) setTimeout(async()=>{try{await loadMotiveStatus();}catch(err){console.warn('Motive status check failed',err);}},0);
    setScreen('dashboard');
    await restoreFolder();
    updateCloudUI();
  }
  window.NBLRecruitmentTest?.init({getContext:()=>({orgId:state.cloud.organization?.id,connected:cloudConnected(),allowed:canAccessModuleKey('hr',false),canWrite:canAccessModuleKey('hr',true),userName:state.cloud.profile?.full_name||state.cloud.user?.email||'NBL User'})});
  window.NBLIFTA?.init({
    getContext:()=>({orgId:state.cloud.organization?.id,connected:cloudConnected(),allowed:canAccessScreen('ifta')&&state.finance.unlocked}),
    api:localApi,
    getCatalog:async()=>{
      if(cloudConnected()){
        return window.NBLCloud.getIftaFuelCatalog(state.cloud.organization.id);
      }
      return state.catalog||[];
    },
    download:async(path,data)=>{
      const headers=await backendAuthHeaders();
      const response=await fetch(path,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(data)});
      if(!response.ok){const err=await response.json().catch(()=>({}));throw new Error(err.error||`Export returned HTTP ${response.status}.`);}
      return response.blob();
    }
  });
  initApp();
})();
