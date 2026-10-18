"use client";
import Link from "next/link";
import { useState } from 'react';
export default function Setup() {
 const [token,setToken]=useState(''),[email,setEmail]=useState(''),[enabled,setEnabled]=useState(false),[ready,setReady]=useState(false),[unlocked,setUnlocked]=useState(false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 async function request(action:string) {
 setBusy(true);setMessage('');
 try {
 const r=await fetch('/api/admin/alerts',{method:action==='load'?'GET':'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(action==='load'?{}:{body:JSON.stringify({action,email,enabled,...(action==='test'?{testId:crypto.randomUUID()}:{})})})});
 const d=await r.json();if(!r.ok)throw new Error(d.error||'Request failed');
 if(action==='load'){setEmail(d.email);setEnabled(d.enabled);setReady(d.providerReady);setUnlocked(true);}else setMessage(d.message);
 }catch(e){setMessage((e as Error).message);}finally{setBusy(false);}
 }
 return <main className="min-h-screen bg-[#06070a] p-6 text-white"><div className="panel mx-auto mt-12 max-w-xl p-8"><Link href="/" className="text-sm text-info">← Back to incident map</Link><h1 className="mt-6 text-3xl font-semibold">Set up incident alerts</h1><p className="mt-3 text-muted">Choose the admin who should receive email when a newly detected advisory reaches a service. Alerts include owners, on-call people and the full affected map.</p>
 {!unlocked?<form onSubmit={e=>{e.preventDefault();request('load');}} className="mt-6 space-y-4"><label className="block">Admin access key<input type="password" required value={token} onChange={e=>setToken(e.target.value)} className="mt-2 w-full rounded bg-white/10 p-3" autoComplete="off" /></label><p className="text-sm text-muted">Use the ADMIN_TOKEN configured by the deployment owner. Public visitors cannot change recipients or send email.</p><button disabled={busy} className="rounded bg-info px-4 py-2 text-black">{busy?'Checking…':'Continue'}</button></form>:<form className="mt-6 space-y-5" onSubmit={e=>{e.preventDefault();request('save');}}><label className="block">Admin email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded bg-white/10 p-3" /></label><label className="flex gap-3"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)} />Email new incidents to this admin</label><p className="rounded border border-white/10 p-3 text-sm">{ready?'Email provider connected. Save your address, then send a test.':'Email sending is not connected yet. The deployment owner must add RESEND_API_KEY and ALERT_FROM in Vercel. Alerts remain visible in the app.'}</p><p className="text-sm text-muted">Enabling sends pending incidents on the next scan. Lagos Ledger’s teams are fictional; this admin address is the actual recipient.</p><div className="flex gap-3"><button disabled={busy} className="rounded bg-info px-4 py-2 text-black">Save settings</button><button type="button" disabled={busy||!ready} onClick={()=>request('test')} className="rounded border border-white/20 px-4 py-2 disabled:opacity-40">Send test email</button></div></form>}
 <p role="status" className="mt-5 text-sm text-info">{message}</p></div></main>;
}
