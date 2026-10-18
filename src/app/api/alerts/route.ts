import { q } from '@/lib/db';
export const dynamic = 'force-dynamic';
export async function GET() {
 try {
 const alerts=await q("MATCH (a:Alert) RETURN a.id AS id,a.advisory AS advisory,a.created AS created,a.services AS services,a.status AS status,a.isTest AS isTest ORDER BY created DESC LIMIT 20");
 const [monitor]=await q("MATCH (m:Monitor {id:'osv'}) RETURN m.checked AS checked,m.error AS error");
 return Response.json({alerts,monitor:monitor||null});
 } catch {return Response.json({error:'Alerts unavailable'}, {status:503});}
}
