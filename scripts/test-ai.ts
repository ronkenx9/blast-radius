import assert from 'node:assert/strict';
import http from 'node:http';
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
async function main() {
 const { investigate } = await import('../src/lib/agents');
 const { POST } = await import('../src/app/api/mcp/route');
 process.env.MCP_API_KEY='local-mcp-test';
 assert.equal((await POST(new Request('http://local/api/mcp',{method:'POST',body:'{}'}))).status,401);
 const authed = await POST(new Request('http://local/api/mcp',{method:'POST',headers:{authorization:'Bearer local-mcp-test'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'ping'})}));
 assert.equal(authed.status,200); assert.deepEqual((await authed.json()).result,{});
 delete process.env.MCP_API_KEY;
 const { q, getDb } = await import('../src/lib/db');
 let scenario='reject';
 const server=http.createServer((req,res)=>{
   req.resume();
   if(scenario==='reject') {res.writeHead(401);res.end('{}');return;}
   res.setHeader('content-type','application/json');
   const content=scenario==='malformed' ? {claims:[null,{text:42,evidence:'bad'}]} : {claims:[{text:'Invented qs@999.0.0',evidence:['Advisory:GHSA-6rw7-vpxm-498p']}]};
   res.end(JSON.stringify({choices:[{message:{content:JSON.stringify(content)}}]}));
 });
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const port=(server.address() as any).port;
 process.env.AI_GATEWAY_API_KEY='local-test-only'; process.env.LLM_BASE_URL=`http://127.0.0.1:${port}`;
 try {
   for(scenario of ['reject','malformed','ungrounded']) {
     const events=[]; for await(const e of investigate('GHSA-6rw7-vpxm-498p')) events.push(e);
     const brief:any=events.find(e=>e.type==='brief'); const done:any=events.find(e=>e.type==='done');
     assert(brief && done); assert.equal(brief.mode,'deterministic'); assert(brief.fallback);
     if(scenario==='reject') assert(brief.fallback.includes('401'));
     assert(!brief.claims.some((c:any)=>c.text.includes('999.0.0')));
     const [saved]=await q<any>('MATCH (i:Investigation {id:$id}) RETURN i.mode AS mode',{id:done.investigation});
     assert.equal(saved.mode,'deterministic');
   }
   console.log('AI fallback verified: rejected key, malformed response, unknown version; saved memory mode correct');
 } finally {server.close(); await (await getDb()).close();}
}
main().catch(e=>{console.error(e);process.exit(1)});
