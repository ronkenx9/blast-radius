import { authorized } from '@/lib/alerts';
import { monitor } from '@/lib/monitor';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(req:Request) {
 if(!authorized(req,process.env.MONITOR_TOKEN)) return Response.json({error:'Unauthorized'}, {status:401});
 try{return Response.json(await monitor());}catch{return Response.json({error:'Monitoring failed; check admin status'}, {status:503});}
}
