import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, GitBranch, Bell, History, Code2 } from "lucide-react";
import Brand from "./Brand";

function ImpactPreview() {
  const services = ["payments-api", "auth-service", "kyc-worker", "notifications", "reporting"];
  const positions = [66, 183, 300, 417, 534];
  return <div className="landing-graph" aria-label="Illustrative overview of the real qs demo, reaching five services through indirect dependencies">
    <div className="landing-graph-toolbar"><span><i/>An advisory comes in.</span><span>CVE-2025-15284</span></div>
    <svg className="landing-graph-drawing" viewBox="0 0 600 380" role="img" aria-label="qs reaches payments-api, auth-service, kyc-worker, notifications and reporting through transitive dependency paths">
      <defs><marker id="preview-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0L10 5L0 10" fill="none" stroke="#b9694f" strokeWidth="1.5"/></marker></defs>
      <path d="M300 79V108C300 136 183 118 183 149M300 79V108C300 136 417 118 417 149" fill="none" stroke="#93604f" strokeWidth="1.3"/>
      {positions.map((x, i) => <path key={x} d={`M${i < 2 ? 183 : 417} 185 C${i < 2 ? 183 : 417} 223 ${x} 223 ${x} 270`} fill="none" stroke="#bc7359" strokeWidth="1.4" markerEnd="url(#preview-arrow)"/>)}
      <rect x="231" y="38" width="138" height="43" rx="10" fill="#36241f" stroke="#ca7a5c"/>
      <circle cx="249" cy="59" r="3.5" fill="#ec9676"/><text x="308" y="64" textAnchor="middle" fill="#f4d4c7" fontSize="14" fontFamily="inherit">qs vulnerability</text>
      <text x="300" y="119" textAnchor="middle" fill="#93a0b1" fontSize="10" fontFamily="inherit">transitive dependency paths</text>
      <rect x="125" y="149" width="116" height="36" rx="8" fill="#1c2530" stroke="#506072"/><text x="183" y="172" textAnchor="middle" fill="#bdc8d5" fontSize="12" fontFamily="inherit">express</text>
      <rect x="359" y="149" width="116" height="36" rx="8" fill="#1c2530" stroke="#506072"/><text x="417" y="172" textAnchor="middle" fill="#bdc8d5" fontSize="12" fontFamily="inherit">request</text>
      {services.map((name,i) => <g key={name}><rect x={positions[i]-54} y="270" width="108" height="38" rx="9" fill="#34251f" stroke="#dd8667" strokeWidth="1.3"/><circle cx={positions[i]} cy="333" r="3" fill="#d68061"/><text x={positions[i]} y="293" textAnchor="middle" fill="#f8dfd3" fontSize="10.5" fontFamily="inherit">{name}</text></g>)}
    </svg>
    <div className="landing-graph-result"><div><strong>5 services.</strong><span>All connected to the same risk.</span></div><span className="preview-result-badge"><GitBranch size={14}/>Every branch, together</span></div>
    <div className="landing-graph-caption">Illustrative overview of the demo’s graph · full paths available in the app</div>
  </div>;
}

export default function Landing() {
  return <main className="landing">
    <header className="landing-header"><Link className="brand" href="/" aria-label="Blast Radius home"><Brand/></Link><nav aria-label="Website"><a href="#how-it-works">How it works</a><a href="#inside-the-demo">Inside the demo</a></nav><Link className="button primary" href="/app">Open demo<ArrowUpRight size={14}/></Link></header>
    <section className="landing-hero">
      <div className="hero-copy"><h1>A small dependency.<br/>A much bigger impact.</h1><p>When a vulnerable package reaches your stack, find every affected service and the people who own it — in one connected view.</p><div className="hero-actions"><Link className="button primary" href="/app">Explore the live demo<ArrowUpRight size={16}/></Link><a className="text-link" href="#how-it-works">See how it works<ArrowRight size={15}/></a></div><div className="hero-source-note"><span className="status-dot"/>Built on FalkorDB. Grounded in graph evidence.</div></div>
      <ImpactPreview/>
    </section>
    <section className="demo-fact-strip" aria-label="Demo results"><p>In the demo, no service lists <code>qs</code> directly.<br/><strong>Five still depend on a vulnerable version.</strong></p><div><span><strong>5 / 10</strong>affected services</span><span><strong>4</strong>owning teams</span><span><strong>1</strong>connected view</span></div></section>
    <section className="landing-how" id="how-it-works"><div className="landing-section-title"><h2>From “are we affected?”<br/>to a clear next step.</h2><p>Most dependency lists stop at packages. Blast Radius follows the connection all the way to your services and their owners.</p></div><div className="workflow-steps"><article><span className="step-number">01</span><h3>Start with an advisory.</h3><p>Choose a vulnerability from the feed or simulate the qs incident. The investigation checks the versions in the graph.</p></article><article><span className="step-number">02</span><h3>See the whole impact.</h3><p>Every affected branch lights up together, from indirect dependencies to services, teams and on-call people.</p></article><article><span className="step-number">03</span><h3>Bring in the right person.</h3><p>Review owners, trace each finding to its evidence, and send the admin an alert when a scheduled scan finds a new exposure.</p></article></div></section>
    <section className="landing-detail" id="inside-the-demo"><div className="detail-intro"><h2>A useful answer.<br/>And the path behind it.</h2><p>A graph is more than a picture here. It powers the investigation, connects the evidence and keeps what the team learns.</p><Link href="/app" className="text-link">Open the incident room<ArrowUpRight size={15}/></Link><div className="demo-workspace-label"><span className="workspace-initials">LL</span><span><strong>Lagos Ledger</strong><small>A fictional company. A working investigation.</small></span></div></div><div className="detail-rows"><article><GitBranch size={20} strokeWidth={1.5}/><div><h3>Every finding has a trail.</h3><p>Select a finding to open its dependency path in the 3D graph. Explore who holds the publishing keys to the packages your services use.</p></div></article><article><History size={20} strokeWidth={1.5}/><div><h3>Past work stays connected.</h3><p>Reopen investigations with their findings and graph evidence. Follow-up runs link back to what was known before.</p></div></article><article><Bell size={20} strokeWidth={1.5}/><div><h3>Alerts reach the admin.</h3><p>Scheduled OSV checks look for new advisories about every 30 minutes. Admin email alerts include affected services, clear next steps and the incident map.</p></div></article><p className="demo-boundary"><Check size={14}/>Real npm and OSV data. Synthetic services and people. Exposure is not proof of a breach.</p></div></section>
    <section className="landing-cta"><div><h2>See how far one<br/>dependency can reach.</h2><p>Start with a real vulnerability. Follow every connection.</p></div><Link className="button primary" href="/app">Open the live demo<ArrowUpRight size={16}/></Link></section>
    <footer className="landing-footer"><Link href="/" className="brand"><Brand/></Link><p>Built for Graph Hacks · Context for AI Agents</p><a href="https://github.com/ronkenx9/blast-radius" target="_blank" rel="noreferrer"><Code2 size={16}/>Source code<ArrowUpRight size={12}/></a></footer>
  </main>;
}
