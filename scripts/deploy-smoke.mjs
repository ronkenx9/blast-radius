import assert from 'node:assert/strict';
const base = process.env.BASE_URL;
assert(base && new URL(base).protocol === 'https:', 'Set BASE_URL to the HTTPS deployment URL');
const get = async (path, init = {}) => {
  const r = await fetch(new URL(path, base), { ...init, signal: AbortSignal.timeout(120000) });
  assert(r.ok, `${path}: HTTP ${r.status}`);
  return r;
};
const health = await (await get('/api/health')).json();
assert(health.ok && health.nodes > 1500, 'Cloud graph is not populated');
const graph = await (await get('/api/graph')).json();
assert.equal(graph.nodes.filter(n => n.label === 'Service').length, 10);
const ids = new Set(graph.nodes.map(n => n.id));
const stream = await (await get('/api/investigate?advisory=GHSA-6rw7-vpxm-498p&llm=0')).text();
const events = stream.trim().split('\n').map(JSON.parse);
assert(!events.some(e => e.type === 'error'), 'Investigation failed');
const brief = events.find(e => e.type === 'brief');
const done = events.find(e => e.type === 'done');
assert(brief && done && brief.claims.length >= 8);
assert.equal(brief.mode, 'deterministic');
for (const c of brief.claims) { assert(c.evidence.length); c.evidence.forEach(id => assert(ids.has(id))); }
const memory = await (await get('/api/investigations')).json();
const saved = memory.investigations.find(i => i.id === done.investigation);
assert.equal(saved?.serviceCount, 5); assert.equal(saved.status, 'triaged');
const findings = await (await get('/api/investigations/' + done.investigation)).json();
assert(findings.findings.filter(f => f.kind === 'brief').every(f => f.evidence.length));
const risk = await (await get('/api/risk')).json();
assert.equal(risk.maintainers[0].serviceCount, 8);
const mcp = await (await get('/api/mcp', {
  method: 'POST', headers: { 'content-type': 'application/json', ...(process.env.MCP_API_KEY ? { authorization: `Bearer ${process.env.MCP_API_KEY}` } : {}) },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'blast_radius', arguments: { advisory_id: 'GHSA-6rw7-vpxm-498p' } } })
})).json();
assert(!mcp.error && !mcp.result.isError);
assert.equal(new Set(mcp.result.structuredContent.result.map(r => r.service)).size, 5);
console.log(JSON.stringify({ services: 10, exposed: saved.serviceCount, graphNodes: graph.nodes.length, claims: brief.claims.length, maintainerReach: 8, mode: health.agents.mode }));
console.log('DEPLOYMENT_VERIFIED');
