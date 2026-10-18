import { authorized, settings, validEmail, sendEmail } from '@/lib/alerts';
import { q } from '@/lib/db';
import { randomUUID } from 'node:crypto';
export const dynamic = 'force-dynamic';
export async function GET(req:Request) {
 if (!authorized(req)) return Response.json({error:'Admin access required'}, {status:401});
 return Response.json({...await settings(),providerReady:!!process.env.RESEND_API_KEY && !!process.env.ALERT_FROM});
}
export async function POST(req:Request) {
 if (!authorized(req)) return Response.json({error:'Admin access required'}, {status:401});
 try {
 const body = await req.json();
 if (body.action==='test') {
   const s=await settings(); if(!validEmail(s.email)) return Response.json({error:'Save an admin email first'}, {status:400});
   await sendEmail(s.email,'Blast Radius — notification test','Your Blast Radius admin email is connected. Future alerts will include affected services, owners and a link to the incident map.',`test-${randomUUID()}`);
   return Response.json({message:'Test accepted by email provider. Check your inbox.'});
 }
 if(!validEmail(body.email)||typeof body.enabled!=='boolean') return Response.json({error:'Enter a valid email and notification preference'}, {status:400});
 await q("MERGE (s:AlertSettings {id:'admin'}) SET s.email=$email,s.enabled=$enabled RETURN s.id",{email:body.email.trim(),enabled:body.enabled},false);
 return Response.json({message:'Admin email saved. Existing pending alerts will be sent when monitoring runs if enabled.'});
 } catch(e) {return Response.json({error:(e as Error).message}, {status:502});}
}
