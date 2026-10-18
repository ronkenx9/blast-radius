import assert from 'node:assert/strict';
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
// Never allow a test to send mail using real local provider credentials.
delete process.env.RESEND_API_KEY; delete process.env.ALERT_FROM;
process.env.ADMIN_EMAIL='admin@example.com';
async function main() {
 const {impact}=await import('../src/lib/impact');
 const {q,getDb,connOptions}=await import('../src/lib/db');
 assert.ok(['localhost','127.0.0.1'].includes(connOptions().host),'Tests require a local disposable demo database');
 const {authorized,validEmail,emailText,sendEmail,recordAlert,deliverPending}=await import('../src/lib/alerts');
 const data=await impact('GHSA-6rw7-vpxm-498p');
 assert.ok(data);assert.equal(data.services.length,5);assert.equal(data.tier1,3);
 for(const h of data.services) {assert.ok(data.nodes.includes(`Service:${h.service}`));assert.ok(data.nodes.includes(`Person:${h.oncallId}`));for(let i=0;i<h.path.length-1;i++)assert.ok(data.links.includes(`${h.path[i]}>${h.path[i+1]}`));}
 const email=emailText(data);
 assert.ok(email.includes('A flaw in qs can use excessive memory'));
 assert.ok(email.includes('qs@6.14.1'));
 assert.ok(email.includes('1. Update') && email.includes('2. Prioritize') && email.includes('3. Rerun'));
 assert.ok(email.includes('compatible override') && email.includes('regenerate the lockfile'));
 assert.ok(email.includes('Exposure does not mean a breach'));
 for(const service of data.services){assert.ok(email.includes(service.service));assert.ok(email.includes(service.team));assert.ok(email.includes(service.oncall));}
 assert.ok(!email.includes('Service:') && !email.includes('Version:') && !email.includes(' → '));
 assert.ok(email.length<2500,'Alert must remain concise');
 const noFix=emailText({...data,advisory:{...data.advisory,id:'UNKNOWN-ADVISORY',fixed:[]}});
 assert.ok(noFix.includes('No patched release is listed'));
 assert.ok(!noFix.includes('qs@6.14.1'));
 assert.equal(await impact('NOT-AN-ADVISORY'),null);
 assert.equal(authorized(new Request('http://local'),undefined),false);
 assert.equal(authorized(new Request('http://local',{headers:{authorization:'Bearer '+ 'a'.repeat(32)}}),'a'.repeat(32)),true);
 assert.equal(validEmail('test@example.com'),true);assert.equal(validEmail('a@example.com\r\nBcc:b@evil.com'),false);
 const admin=await import('../src/app/api/admin/alerts/route');
 assert.equal((await admin.POST(new Request('http://local',{method:'POST',body:'{}'}))).status,401);
 const mon=await import('../src/app/api/monitor/route');assert.equal((await mon.POST(new Request('http://local',{method:'POST'}))).status,401);
 await recordAlert(data.advisory.id);await recordAlert(data.advisory.id);
 const rows=await q<any>('MATCH (a:Alert {advisory:$id}) RETURN count(a) AS n',{id:data.advisory.id});assert.equal(rows[0].n,1);
 assert.equal((await deliverPending()).accepted,0);
 const realFetch=globalThis.fetch;
 process.env.RESEND_API_KEY='test-only';process.env.ALERT_FROM='test@example.com';
 let sends=0;
 globalThis.fetch=async (url,opts)=>{assert.equal(url,'https://api.resend.com/emails');assert.equal(new Headers(opts?.headers).get('Idempotency-Key'),'test-id');const body=JSON.parse(opts?.body as string);assert.deepEqual(body.to,['admin@example.com']);sends++;return Response.json({id:'mock-accepted'});};
 assert.equal(await sendEmail('admin@example.com','test','content','test-id'),'mock-accepted');assert.equal(sends,1);
 globalThis.fetch=async()=>Response.json({name:'rate_limit_exceeded',message:'Slow down'},{status:429});await assert.rejects(()=>sendEmail('admin@example.com','test','content','test-id'),/rate_limit_exceeded/);
 globalThis.fetch=realFetch;
 delete process.env.RESEND_API_KEY;delete process.env.ALERT_FROM;
 process.env.ADMIN_TOKEN='a'.repeat(32);
 const request=(body:any)=>new Request('http://local',{method:'POST',headers:{authorization:'Bearer '+process.env.ADMIN_TOKEN},body:JSON.stringify(body)});
 const originalSettings=await q<any>("MATCH (s:AlertSettings {id:'admin'}) RETURN s.enabled AS enabled");
 assert.equal((await admin.POST(request({email:'bad',enabled:true}))).status,400);
 assert.equal((await admin.POST(request({email:'other@example.com',enabled:true}))).status,400);
 // A legacy synthetic recipient must be removed when onboarding saves its preference.
 await q("MERGE (s:AlertSettings {id:'admin'}) SET s.email='legacy@example.com' RETURN s.id",{},false);
 assert.equal((await admin.POST(request({email:'admin@example.com',enabled:false}))).status,200);
 const [storedSettings]=await q<any>("MATCH (s:AlertSettings {id:'admin'}) RETURN s.email AS email,s.enabled AS enabled");
 assert.equal(storedSettings.email,null);assert.equal(storedSettings.enabled,false);
 const settingsResponse=await admin.GET(new Request('http://local',{headers:{authorization:'Bearer '+process.env.ADMIN_TOKEN}}));
 const settingsBody=await settingsResponse.json();assert.equal(settingsBody.email,'admin@example.com');assert.equal(settingsBody.recipientLocked,true);
 delete process.env.ADMIN_EMAIL;
 assert.equal((await admin.POST(request({email:'admin@example.com',enabled:true}))).status,503);
 process.env.ADMIN_EMAIL='admin@example.com';
 const fixture='TEST-MONITOR-FIXTURE';
 globalThis.fetch=async (url,opts)=>{
   if(String(url).endsWith('/querybatch')) {const body=JSON.parse(opts?.body as string);return Response.json({results:body.queries.map((v:any)=>({vulns:v.package.name==='qs' && ['6.5.5','6.7.0'].includes(v.version)?[{id:fixture}]:[]}))});}
   if(String(url).includes(fixture))return Response.json({id:fixture,summary:'Test fixture',database_specific:{severity:'HIGH'},affected:[{package:{name:'qs',ecosystem:'npm'},ranges:[{events:[{introduced:'0'},{fixed:'6.14.1'}]}]},{package:{name:'unrelated',ecosystem:'PyPI'},ranges:[{events:[{fixed:'9.0.0'}]}]}]});
   throw new Error('Unexpected fetch');
 };
 try {
   const {monitor}=await import('../src/lib/monitor');
   const scan=await monitor();assert.equal(scan.imported,1);
   const next=await monitor();assert.equal(next.imported,0);
   const importedImpact=await impact(fixture);assert.deepEqual(importedImpact?.advisory.fixed,['qs@6.14.1']);
   const alert=await q<any>('MATCH (a:Alert {advisory:$id}) RETURN a.services AS services,a.status AS status',{id:fixture});
   assert.equal(alert.length,1);assert.equal(alert[0].services.length,5);assert.equal(alert[0].status,'pending');
 } finally {
   globalThis.fetch=realFetch;
   await q('MATCH (a:Alert {advisory:$id}) DELETE a',{id:fixture},false);
   await q('MATCH (a:Advisory {id:$id}) DETACH DELETE a',{id:fixture},false);
   if(originalSettings[0]) await q("MATCH (s:AlertSettings {id:'admin'}) SET s.enabled=$enabled REMOVE s.email RETURN s.id",originalSettings[0],false);
   else await q("MATCH (s:AlertSettings {id:'admin'}) DELETE s",{},false);
 }

 const graph=await (await import('../src/app/api/graph/route')).GET();const gd=await graph.json();assert.ok(!gd.nodes.some((n:any)=>['Alert','AlertSettings','Monitor'].includes(n.label)));
 await (await getDb()).close();console.log('ALERTS_VERIFIED');
}
main().catch(e=>{console.error(e);process.exit(1);});
