(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NBLIvmrDirectory=api;})(typeof window==='object'?window:globalThis,function(){
  'use strict';
  const text=x=>String(x??'').trim();
  const key=x=>text(x).toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
  function streetKey(x){return key(text(x).split(',')[0]).replace(/\bINTERNATION\b/g,'INTERNATIONAL').replace(/\b(ROAD|DRIVE|LANE|BOULEVARD|STREET|AVENUE|PARKWAY|HIGHWAY|COURT)\b/g,w=>({ROAD:'RD',DRIVE:'DR',LANE:'LN',BOULEVARD:'BLVD',STREET:'ST',AVENUE:'AVE',PARKWAY:'PKWY',HIGHWAY:'HWY',COURT:'CT'})[w]);}
  const groupKey=f=>[streetKey(f.address1),key(f.city),key(f.state)].join('|');
  const primary=f=>!/(ANNEX|HUBLOCAL)/.test(f.facility_type)&&!/(?:-\s*HD|LOCAL)/.test(f.facility_name);
  function merge(master,directory){
    if(!Array.isArray(directory?.facilities)||!directory.source_date)throw Error('Invalid FedEx directory.');
    const locations=structuredClone(master?.locations||[]),groups=new Map(),claimed=new Set();
    for(const f of directory.facilities){const k=groupKey(f);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(f);}
    const stats={preserved:locations.length,enriched:0,added:0,unmatched:0};
    for(const loc of locations){
      const numbers=new Set(text(loc.spot).match(/\b\d+\b/g)||[]),refs=new Set((loc.directory_facilities||[]).map(f=>f.number+'|'+f.abbreviation));
      let found=directory.facilities.filter(f=>key(f.state)===key(loc.state)&&(numbers.has(f.number)||refs.has(f.number+'|'+f.abbreviation)));
      // City-only entries keep their existing blank/custom number. Enrich only
      // when the primary facilities resolve to one physical address.
      if(!found.length){
        const names=new Set([loc.city,...(loc.aliases||[])].map(key));
        const candidates=directory.facilities.filter(f=>primary(f)&&key(f.state)===key(loc.state)&&names.has(key(f.facility_name)));
        if(new Set(candidates.map(groupKey)).size===1)found=candidates;
      }
      if(!found.length){stats.unmatched++;continue;}
      const keys=[...new Set(found.map(groupKey))];keys.forEach(k=>claimed.add(k));
      loc.directory_facilities=keys.flatMap(k=>groups.get(k));
      loc.directory_date=directory.source_date;
      // Preserve authored city, ID, spot, aliases, coordinates and radius.
      if(!text(loc.address))loc.address=keys.map(k=>{const f=groups.get(k)[0];return [f.address1,f.address2,f.city,f.state,f.postal_code].filter(Boolean).join(', ');}).join('\n');
      stats.enriched++;
    }
    const ids=new Set(locations.map(x=>x.id));
    for(const [k,rows] of groups){
      if(claimed.has(k))continue;
      const preferred=rows.filter(primary),pool=preferred.length?preferred:rows;
      const numbers=[...new Set(pool.map(f=>f.number))],f=pool[0];
      const id='ivmr_directory_'+rows.map(x=>x.number+'_'+x.abbreviation).sort()[0];
      if(ids.has(id))continue;
      locations.push({id,spot:numbers.length===1?numbers[0]:'',city:f.city,state:f.state,lat:null,lon:null,radius_miles:0.5,
        aliases:[...new Set(rows.flatMap(x=>[x.abbreviation,x.address1]))],
        address:[f.address1,f.address2,f.city,f.state,f.postal_code].filter(Boolean).join(', '),
        directory_managed:true,directory_date:directory.source_date,directory_facilities:rows});
      ids.add(id);stats.added++;
    }
    return {data:{...master,version:2,directorySourceDate:directory.source_date,locations},stats};
  }
  function attachBoundaries(master,geofences){
    const data=structuredClone(master),stats={matched:0,unmatched:0};
    for(const g of geofences||[]){
      const points=(g.location_points||[]).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180);
      if(points.length<3){stats.unmatched++;continue;}
      const address=key(g.address),street=streetKey(g.address);
      const candidates=data.locations.filter(loc=>(loc.directory_facilities||[]).some(f=>streetKey(f.address1)===street&&(' '+address+' ').includes(' '+key(f.city)+' ')&&(' '+address+' ').includes(' '+key(f.state)+' ')));
      if(candidates.length!==1){stats.unmatched++;continue;}
      const loc=candidates[0],boundary={id:text(g.id),name:text(g.name),points,source:'Motive'};
      loc.boundaries=[...(loc.boundaries||[]).filter(b=>b.id!==boundary.id),boundary];
      if(loc.lat==null&&loc.lon==null&&loc.boundaries.length===1){loc.lat=points.reduce((s,p)=>s+p.lat,0)/points.length;loc.lon=points.reduce((s,p)=>s+p.lon,0)/points.length;}
      stats.matched++;
    }
    return {data,stats};
  }
  return {merge,attachBoundaries,streetKey};
});
