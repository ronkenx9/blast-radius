import { q } from './db';
import { recordAlert, deliverPending } from './alerts';
import { randomUUID } from 'node:crypto';
export async function monitor() {
 const owner=randomUUID(), now=Date.now();
 const lease=await q(`MERGE (m:Monitor {id:'osv'}) WITH m WHERE coalesce(m.lease,0)<$now SET m.lease=$until,m.owner=$owner RETURN m.id`,{now,until:now+120000,owner},false);
 if(!lease.length) return {status:'Already running'};
 try {
 const versions=await q<any>('MATCH (v:Version) RETURN v.key AS key,v.pkg AS pkg');
 const response=await fetch('https://api.osv.dev/v1/querybatch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({queries:versions.map(v=>({package:{name:v.pkg,ecosystem:'npm'},version:v.key.slice(v.key.lastIndexOf('@')+1)}))}),signal:AbortSignal.timeout(20000)});
 if(!response.ok) throw new Error(`Advisory source unavailable (${response.status})`);
 const batch=await response.json();
 if(!Array.isArray(batch.results)||batch.results.length!==versions.length) throw new Error('Incomplete advisory response');
 const known=await q<any>('MATCH (a:Advisory)-[:AFFECTS]->(v:Version) RETURN a.id AS id,v.key AS key');
 const pairs=new Set(known.map(x=>x.id+'|'+x.key));
 const fresh=new Map<string,string[]>();
 for(let i=0;i<versions.length;i++) {
   // Never silently certify an incomplete batch as checked.
   if(batch.results[i].next_page_token) throw new Error('Advisory pagination requires a smaller scan batch');
   for(const v of batch.results[i].vulns||[]) if(!pairs.has(v.id+'|'+versions[i].key)) fresh.set(v.id,[...(fresh.get(v.id)||[]),versions[i].key]);
 }
 let imported=0;
 const candidates=await Promise.all([...fresh].slice(0,3).map(async ([id,keys])=>{
   const res=await fetch(`https://api.osv.dev/v1/vulns/${encodeURIComponent(id)}`,{signal:AbortSignal.timeout(8000)});
   if(!res.ok) throw new Error('Unable to retrieve advisory details');
   return {id,keys,a:await res.json()};
 }));
 for(const {id,keys,a} of candidates) {
   if(a.withdrawn) continue;
   const fixed=[...new Set((a.affected||[]).flatMap((x:any)=>(x.ranges||[]).flatMap((r:any)=>(r.events||[]).filter((e:any)=>e.fixed).map((e:any)=>e.fixed))))];
   await q(`MERGE (a:Advisory {id:$id}) SET a.monitorNew=true,a.summary=$summary,a.severity=$severity,a.aliases=$aliases,a.published=$published,a.fixed=$fixed,a.url=$url WITH a UNWIND $keys AS key MATCH (v:Version {key:key}) SET v.vulnerable=true MERGE (a)-[:AFFECTS]->(v) RETURN a.id`,{id,summary:a.summary||id,severity:a.database_specific?.severity||'UNKNOWN',aliases:a.aliases||[],published:a.published||'',fixed,url:`https://osv.dev/vulnerability/${id}`,keys},false);
   await recordAlert(id);
   await q("MATCH (a:Advisory {id:$id}) SET a.monitorNew=false RETURN a.id",{id},false); imported++;
 }
 // Retry creating an alert after a crash between import and alert persistence.
 const unrecorded=await q<any>(`MATCH (a:Advisory) WHERE a.monitorNew=true RETURN a.id AS id`);
 for(const a of unrecorded) {await recordAlert(a.id);await q("MATCH (a:Advisory {id:$id}) SET a.monitorNew=false RETURN a.id",{id:a.id},false); }
 const delivery=await deliverPending();
 await q("MATCH (m:Monitor {id:'osv',owner:$owner}) SET m.checked=$checked,m.error='',m.lease=0 RETURN m.id",{owner,checked:new Date().toISOString()},false);
 return {scanned:versions.length,imported,remaining:Math.max(0,fresh.size-3),delivery};
 } catch(e) {
 await q("MATCH (m:Monitor {id:'osv',owner:$owner}) SET m.error=$error,m.lease=0 RETURN m.id",{owner,error:(e as Error).message},false); throw e;
 }
}
