import { authorized, settings, validEmail, recordAlert, deliverPending } from '@/lib/alerts';
import { q } from '@/lib/db';

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
   if(!s.enabled) return Response.json({error:'Enable email notifications before testing'}, {status:400});
   if(typeof body.testId!=='string' || !/^[a-f0-9-]{36}$/.test(body.testId)) return Response.json({error:'A test request ID is required'}, {status:400});
   const id=await recordAlert('GHSA-6rw7-vpxm-498p',`test-${body.testId}`);
   await deliverPending(id);
   const [alert]=await q<any>('MATCH (a:Alert {id:$id}) RETURN a.status AS status,a.providerId AS providerId,a.error AS error',{id});
   if(alert?.status!=='accepted') return Response.json({error:alert?.error || 'Email not accepted; check provider configuration'}, {status:502});
   return Response.json({message:'Incident test accepted by email provider. Check your inbox.',alertId:id,providerId:alert.providerId});
 }
 if(!validEmail(body.email)||typeof body.enabled!=='boolean') return Response.json({error:'Enter a valid email and notification preference'}, {status:400});
 const s=await settings();
 if(!validEmail(s.email)) return Response.json({error:'The deployment owner must configure ADMIN_EMAIL before enabling alerts'}, {status:503});
 if(body.email.trim().toLowerCase()!==s.email.toLowerCase()) return Response.json({error:'This recipient is configured by the deployment owner. Update ADMIN_EMAIL to change it.'}, {status:400});
 await q("MERGE (s:AlertSettings {id:'admin'}) SET s.enabled=$enabled REMOVE s.email RETURN s.id",{enabled:body.enabled},false);
 return Response.json({message:'Notification preference saved. Existing pending alerts will be sent when monitoring runs if enabled.'});
 } catch(e) {return Response.json({error:(e as Error).message}, {status:502});}
}
