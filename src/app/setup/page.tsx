"use client";
import Link from "next/link";
import Brand from "@/components/Brand";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Bell, CheckCircle2, LockKeyhole, AlertTriangle } from "lucide-react";

export default function Setup() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  async function request(action: string) {
    if (busy) return;
    setBusy(action); setMessage(""); setError(false);
    try {
      const response = await fetch("/api/admin/alerts", {
        method: action === "load" ? "GET" : "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        ...(action === "load" ? {} : { body: JSON.stringify({ action, email, enabled, ...(action === "test" ? { testId: crypto.randomUUID() } : {}) }) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "We couldn’t save your settings. Please try again.");
      if (action === "load") { setEmail(data.email || ""); setEnabled(data.enabled); setReady(data.providerReady); setLocked(!!data.recipientLocked); setUnlocked(true); }
      else setMessage(data.message || (action === "save" ? "Alert settings saved." : "Test alert accepted by the email provider."));
    } catch (e) { setError(true); setMessage((e as Error).message); }
    finally { setBusy(null); }
  }
  return <main className="setup-page">
    <header className="setup-header"><Link className="brand" href="/"><Brand/></Link><Link className="back-link" href="/app"><ArrowLeft size={15}/>Back to incident room</Link></header>
    <div className="setup-card"><span className="setup-icon"><Bell size={22} strokeWidth={1.6}/></span><h1>Get the right person in the loop.</h1><p className="setup-intro">Send the workspace admin an email when a new advisory reaches a service. Every alert includes affected services, owners and a link to the full incident map.</p>
      {!unlocked ? <form className="setup-form" onSubmit={event => { event.preventDefault(); request("load"); }}>
        <label className="field-label" htmlFor="admin-key">Admin access key<input id="admin-key" type="password" required value={token} onChange={event => setToken(event.target.value)} autoComplete="off" aria-describedby="key-help" placeholder="Enter your workspace access key" /></label>
        <p className="field-help" id="key-help">Use the access key provided by the deployment owner. Only an admin can change notification settings or send a test email.</p>
        <button className="button primary" disabled={!!busy}>{busy === "load" ? "Checking access…" : "Continue"}<ArrowRight size={14}/></button>
      </form> : <form className="setup-form" onSubmit={event => { event.preventDefault(); request("save"); }}>
        <label className="field-label" htmlFor="admin-email">Admin email<input id="admin-email" type="email" required value={email} onChange={event => setEmail(event.target.value)} readOnly={locked} aria-describedby="email-help" autoComplete="email" /></label>
        <p className="field-help" id="email-help">{locked ? "This recipient is set by the deployment owner. To change it, update the workspace’s server configuration." : "This is the real recipient. The people and teams in the Lagos Ledger demo are fictional."}</p>
        <label className="checkbox-field"><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} />Email new incidents to this admin</label>
        <div className="provider-status">{ready ? <CheckCircle2 size={17}/> : <LockKeyhole size={17}/>}<div><strong>{ready ? "Email provider connected" : "Email delivery needs setup"}</strong><p>{ready ? "Save your settings, then send a test incident to check the full alert." : "Ask the deployment owner to connect the email provider. Incidents are still available in the app."}</p></div></div>
        <p className="field-help">Enabling notifications sends pending incidents on the next scan. Manual simulations do not send email.</p>
        <div className="setup-actions"><button disabled={!!busy} className="button primary">{busy === "save" ? "Saving…" : "Save settings"}</button><button type="button" disabled={!!busy || !ready || !enabled} onClick={() => request("test")} className="button secondary">{busy === "test" ? "Sending test…" : "Send test email"}</button></div>
      </form>}
      {message && <p role={error ? "alert" : "status"} className={`setup-message${error ? " error" : ""}`}>{error ? <AlertTriangle size={15}/> : <CheckCircle2 size={15}/>}<span>{message}</span></p>}
    </div>
  </main>;
}
