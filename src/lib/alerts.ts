import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { Resend } from 'resend';
import { q } from './db';
import { impact } from './impact';
export function authorized(req: Request, secret = process.env.ADMIN_TOKEN) {
  const value = req.headers.get('authorization')?.replace(/^Bearer /,'') || '';
  return !!secret && secret.length >= 32 && Buffer.byteLength(value) === Buffer.byteLength(secret) && timingSafeEqual(Buffer.from(value),Buffer.from(secret));
}
export const validEmail = (email: unknown): email is string => typeof email === 'string' && email.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email);
export async function settings() { const [s] = await q<any>("MATCH (s:AlertSettings {id:'admin'}) RETURN s.email AS email, s.enabled AS enabled"); return s || {email:'',enabled:false}; }
export function emailText(data: NonNullable<Awaited<ReturnType<typeof impact>>>) {
  return `${data.advisory.id}: ${data.advisory.summary}\n\n${data.services.length} services affected (${data.tier1} tier-1).\n\n${data.services.map(s=>`${s.service} — ${s.team}; on call: ${s.oncall || 'Unassigned'}\n${s.path.join(' → ')}`).join('\n\n')}\n\nOpen all affected areas: ${process.env.APP_URL || 'https://blast-radius-murex.vercel.app'}/?advisory=${encodeURIComponent(data.advisory.id)}\n\nLagos Ledger is a synthetic demo company. This reports vulnerability exposure, not proof of an active breach.`;
}
export async function sendEmail(email: string, subject: string, text: string, key: string) {
  if (!process.env.RESEND_API_KEY || !process.env.ALERT_FROM) throw new Error('Email provider is not configured');
  const escaped = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const split = escaped.lastIndexOf('\n',1900);
  const boundary = split > 0 ? split : 1900;
  const content = process.env.RESEND_TEMPLATE_ID && escaped.length <= 3800 && escaped.length - boundary <= 2000
    ? {template:{id:process.env.RESEND_TEMPLATE_ID,variables:{DETAILS:escaped.slice(0,boundary),MORE:escaped.slice(boundary) || ' '}}}
    : {text};
  const {data,error} = await new Resend(process.env.RESEND_API_KEY).emails.send({from:process.env.ALERT_FROM,to:[email],subject,...content}, {idempotencyKey:key,signal:AbortSignal.timeout(12000)});
  if(error) throw new Error(`Email provider rejected request: ${error.name}`);
  if(!data?.id) throw new Error('Email provider did not confirm acceptance');
  return data.id;
}
export async function recordAlert(id: string, testKey?: string) {
  const data = await impact(id); if (!data?.services.length) return;
  const key = testKey || createHash('sha256').update(id+JSON.stringify(data.services.map(s=>s.service).sort())).digest('hex');
  await q(`MERGE (a:Alert {id:$key}) ON CREATE SET a.advisory=$id, a.created=$now, a.status='pending', a.isTest=$isTest, a.services=$services RETURN a.id`, {key,id,now:new Date().toISOString(),services:data.services.map(s=>s.service),isTest:!!testKey},false);
  return key;
}
export async function deliverPending(onlyId = '') {
  const s = await settings();
  if (!s.enabled || !validEmail(s.email) || !process.env.RESEND_API_KEY || !process.env.ALERT_FROM) return {status:'Email setup required',accepted:0};
  const alerts = await q<any>("MATCH (a:Alert) WHERE (a.status='pending' OR a.status='failed') AND ($onlyId='' OR a.id=$onlyId) RETURN a.id AS id, a.advisory AS advisory, a.isTest AS isTest ORDER BY a.created LIMIT 1",{onlyId});
  let accepted = 0;
  for (const a of alerts) {
    const owner = randomUUID();
    const claimed = await q(`MATCH (a:Alert {id:$id}) WHERE coalesce(a.lease,0)<$now AND a.status<>'accepted' SET a.lease=$until,a.owner=$owner RETURN a.id`, {id:a.id,now:Date.now(),until:Date.now()+60000,owner},false);
    if (!claimed.length) continue;
    try {
      const data = await impact(a.advisory); if (!data) throw new Error('Advisory unavailable');
      const providerId = await sendEmail(s.email,`[Blast Radius${a.isTest ? " TEST" : ""}] ${data.services.length} services exposed — ${a.advisory}`,emailText(data),a.id);
      await q("MATCH (a:Alert {id:$id,owner:$owner}) SET a.status='accepted',a.providerId=$providerId,a.lease=0,a.error='' RETURN a.id",{id:a.id,owner,providerId},false); accepted++;
    } catch (e) { await q("MATCH (a:Alert {id:$id,owner:$owner}) SET a.status='failed',a.error=$error,a.lease=0 RETURN a.id",{id:a.id,owner,error:(e as Error).message},false); }
  }
  return {status:'Processed',accepted};
}
