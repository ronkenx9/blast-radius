import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const base = process.env.BASE || 'http://localhost:3100';
async function json(path, init) {
 const r = await fetch(base + path, {...init, signal: AbortSignal.timeout(60000)});
 assert(r.ok, `${path}: HTTP ${r.status}`); return r.json();
}
const health = await json('/api/health'); assert(health.ok); assert(health.nodes > 1500);
const graph = await json('/api/graph');
const nodes = new Set(graph.nodes.map(n=>n.id));
const links = new Set(graph.links.map(l=>`${l.source}>${l.target}`));
const company = JSON.parse(readFileSync('data/company.json','utf8'));
assert.equal(graph.nodes.filter(n=>n.label==='Service').length, company.services.length);
assert.equal(company.services.length,10);
const advisories = await json('/api/advisories?q=CVE-2025-15284');
assert(advisories.advisories.some(a=>a.id==='GHSA-6rw7-vpxm-498p'));
const rpc = async (method, params) => {
 const r = await json('/api/mcp',{method:'POST',headers:{'content-type':'application/json',...(process.env.MCP_API_KEY ? {authorization:`Bearer ${process.env.MCP_API_KEY}`} : {})},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
 assert(!r.error,JSON.stringify(r.error)); assert(!r.result?.isError); return r.result;
};
assert.equal((await rpc('initialize',{})).serverInfo.name,'blast-radius');
assert.equal((await rpc('tools/list',{})).tools.length,8);
const hits = (await rpc('tools/call',{name:'blast_radius',arguments:{advisory_id:'GHSA-6rw7-vpxm-498p'}})).structuredContent.result;
assert.equal(new Set(hits.map(h=>h.service)).size,5);
assert.equal(new Set(hits.filter(h=>h.tier===1).map(h=>h.service)).size,3);
for(const h of hits) {
 assert(h.oncall && h.team);
 assert.equal(h.path[0],`Service:${h.service}`); assert.equal(h.path.at(-1),`Version:${h.vulnerable}`);
 assert(h.path.length>=3); assert.equal(h.hops,h.path.length-1);
 assert(!company.services.find(s=>s.id===h.service).deps.some(d=>d.startsWith('qs@')));
 h.path.forEach(n=>assert(nodes.has(n),n));
 for(let i=1;i<h.path.length;i++) assert(links.has(`${h.path[i-1]}>${h.path[i]}`));
}
for(const [name,args] of Object.entries({top_advisories:{limit:3},search_advisories:{query:'qs'},who_owns:{service:'payments-api'},maintainer_risk:{limit:3},single_maintainer_packages:{limit:3},list_investigations:{},run_investigation:{advisory_id:'GHSA-6rw7-vpxm-498p'}})) {
 const out=(await rpc('tools/call',{name,arguments:args})).structuredContent.result;
 assert(Array.isArray(out) && out.length>0,name);
 if(name==='run_investigation') assert(out.some(e=>e.type==='done'));
}
const before=(await json('/api/investigations')).investigations;
const r=await fetch(base+'/api/investigate?advisory=GHSA-6rw7-vpxm-498p&llm=0');
const events=(await r.text()).trim().split('\n').map(JSON.parse);
assert(!events.some(e=>e.type==='error')); assert.equal(events.filter(e=>e.type==='agent'&&e.phase==='done').length,4);
const brief=events.find(e=>e.type==='brief'); assert.equal(brief.mode,'deterministic'); assert(brief.claims.length>=8);
for(const c of brief.claims) {assert(c.evidence.length); c.evidence.forEach(n=>assert(nodes.has(n),n));}
assert(brief.claims.some(c=>c.text.includes('Fix path:'))); assert(brief.claims.some(c=>c.text.includes('Page now:')));
assert(events.some(e=>e.type==='memory' && before.some(i=>i.id===e.previous)));
const id=events.find(e=>e.type==='done').investigation;
const saved=(await json('/api/investigations')).investigations.find(i=>i.id===id);
assert.equal(saved.serviceCount,5); assert.equal(saved.status,'triaged'); assert.equal(saved.mode,'deterministic'); assert(saved.previous);
const findings=(await json('/api/investigations/'+id)).findings;
assert.equal(findings.filter(f=>f.kind==='brief').length,brief.claims.length);
for(const f of findings.filter(f=>f.kind==='brief')) {assert(f.evidence.length); assert(f.supersedes.length);}
const risk=await json('/api/risk'); assert.equal(risk.maintainers[0].serviceCount,8);
assert(risk.solo.length>0);
const invalid=await fetch(base+'/api/investigate?advisory=missing&llm=0');
assert((await invalid.text()).includes('"type":"error"'));
const bad=await json('/api/mcp',{method:'POST',headers:{'content-type':'application/json',...(process.env.MCP_API_KEY?{authorization:`Bearer ${process.env.MCP_API_KEY}`}:{})},body:'null'});
assert.equal(bad.error.code,-32600);
const ai=spawnSync(process.execPath,['--import','tsx','scripts/test-ai.ts'],{stdio:'inherit',env:process.env});
assert.equal(ai.status,0);
console.log(JSON.stringify({nodes:graph.nodes.length,links:graph.links.length,exposedServices:5,tier1:3,claims:brief.claims.length,topMaintainer:risk.maintainers[0].maintainer,reach:8}));
console.log('INTEGRATION_VERIFIED');
