"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, AlertTriangle, ArrowUpRight, Bell, Brain, Check, ChevronDown, Code2, Crosshair, GitBranch, History, Maximize2, Radar, Radio, ShieldAlert, Siren, Users, X, Zap } from "lucide-react";
import clsx from "clsx";
import type { GraphHandle, GNode, GLink, Highlight } from "./GraphView";
import { COLORS } from "./colors";
import Brand from "./Brand";

const GraphView = dynamic(() => import("./GraphView"), { ssr: false });
const FEATURED = "GHSA-6rw7-vpxm-498p";
const AGENTS = [
  { name: "Scout", icon: Radar, role: "Ingests the advisory" },
  { name: "Tracer", icon: GitBranch, role: "Walks dependency paths" },
  { name: "Cartographer", icon: Users, role: "Owners · ADRs · history" },
  { name: "Commander", icon: Siren, role: "Writes the brief" },
] as const;
type AgentState = { status: "idle" | "running" | "done"; text?: string; cypher?: string; ms?: number; rows?: number; highlight?: { nodes: string[]; paths: string[][] } };
type Claim = { text: string; evidence: string[]; tone?: string; superseded?: boolean };
type Brief = { headline: string; severity: string; claims: Claim[]; mode: string; model?: string; fallback?: string; dropped?: number; investigation?: string; fromMemory?: boolean; started?: string };
const sevColor = (s?: string) => (s === "CRITICAL" || s === "HIGH" ? "severity-high" : s === "MODERATE" || s === "MEDIUM" ? "severity-medium" : "severity-low");
const toneDot: Record<string, string> = { critical: "bg-crit", warn: "bg-warn", info: "bg-info", ok: "bg-ok" };
const strip = (id: string) => id.split(":").slice(1).join(":");

export default function WarRoom() {
  const [mobilePanel, setMobilePanel] = useState<"map" | "feed" | "report">("map");
  const [loadingMemory, setLoadingMemory] = useState(false);
  const [graph, setGraph] = useState<{ nodes: GNode[]; links: GLink[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [advisories, setAdvisories] = useState<any[]>([]);
  const [agents, setAgents] = useState<Record<string, AgentState>>({});
  const [brief, setBrief] = useState<Brief | null>(null);
  const [memoryNote, setMemoryNote] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [hl, setHl] = useState<Highlight>({ nodes: new Set(), links: new Set() });
  const [tab, setTab] = useState<"brief" | "risk" | "memory">("brief");
  const [risk, setRisk] = useState<any>(null);
  const [invs, setInvs] = useState<any[]>([]);
  const [drop, setDrop] = useState<any>(null);
  const [crumbs, setCrumbs] = useState<string[]>([]);
  const [openCypher, setOpenCypher] = useState<string | null>(null);
  const [selected, setSelected] = useState<GNode | null>(null);
  const g = useRef<GraphHandle>(null);
  const [incident, setIncident] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [monitor, setMonitor] = useState<any>(null);
  const [mapMode, setMapMode] = useState(false);
  const seenAlert = useRef<string | null>(null);
  const alertsInitialized = useRef(false);
  const overview = (data: any) => {
    setHl({nodes:new Set(data.nodes),links:new Set(data.links),mode:"incident"});
    setCrumbs([]); setSelected(null); setMapMode(true); g.current?.fit(data.nodes);
  };
  const loadImpact = async (id: string) => {
    const r = await fetch(`/api/impact?advisory=${encodeURIComponent(id)}`);
    if (!r.ok) throw new Error("Could not load incident map");
    const data = await r.json(); setIncident(data); overview(data); return data;
  };
  useEffect(() => {
    let stopped=false;
    const poll=async () => {
      try {
        const r=await fetch('/api/alerts'); if(!r.ok)return;
        const d=await r.json();if(stopped)return;setAlerts(d.alerts);setMonitor(d.monitor);
        if(d.alerts[0] && seenAlert.current !== d.alerts[0].id) {
          const first=!alertsInitialized.current; seenAlert.current=d.alerts[0].id;
          if(!first && !running) {const graphData=await fetch('/api/graph').then(r=>r.json());if(!graphData.error)setGraph(graphData);await loadImpact(d.alerts[0].advisory);}
        }
        alertsInitialized.current=true;
      } catch { /* Keep the last successful monitor status visible. */ }
    };
    poll();const timer=setInterval(poll,15000);return()=>{stopped=true;clearInterval(timer);};
  }, [running]);
  useEffect(() => {
    if(!graph)return;
    const id=new URLSearchParams(window.location.search).get('advisory');
    if(id) loadImpact(id).catch(e=>setErr(e.message));
  }, [!!graph]);

  useEffect(() => {
    fetch("/api/graph").then((r) => r.json()).then((d) => (d.error ? setErr(d.error) : setGraph(d))).catch((e) => setErr(String(e)));
    fetch("/api/health").then((r) => r.json()).then(setHealth).catch(() => {});
    fetch("/api/advisories").then((r) => r.json()).then((d) => setAdvisories(d.advisories || [])).catch(() => setErr("The advisory feed could not load. Refresh to try again."));
    loadInvs();
  }, []);
  const loadInvs = () => fetch("/api/investigations").then((r) => { if (!r.ok) throw new Error("Memory request failed"); return r.json(); }).then((d) => setInvs(d.investigations || [])).catch(() => setErr("Investigation memory could not load. Try opening Memory again."));

  const adjacency = useMemo(() => {
    const out = new Map<string, { to: string; type: string }[]>(); const inn = new Map<string, { from: string; type: string }[]>();
    if (!graph) return { out, inn };
    for (const l of graph.links) {
      const s = typeof l.source === "object" ? l.source.id : l.source, t = typeof l.target === "object" ? l.target.id : l.target;
      (out.get(s) || out.set(s, []).get(s)!).push({ to: t, type: l.type });
      (inn.get(t) || inn.set(t, []).get(t)!).push({ from: s, type: l.type });
    }
    return { out, inn };
  }, [graph]);

  const highlight = useCallback((nodes: string[], paths: string[][] = [], mode: Highlight["mode"] = "path") => {
    const ns = new Set([...nodes, ...paths.flat()]);
    const ls = new Set<string>();
    for (const p of paths) for (let i = 0; i < p.length - 1; i++) ls.add(`${p[i]}>${p[i + 1]}`);
    for (const id of ns) for (const e of adjacency.out.get(id) || []) if (ns.has(e.to) && e.type !== "DEPENDS_ON" && e.type !== "DEPLOYS") ls.add(`${id}>${e.to}`);
    setHl({ nodes: ns, links: ls, mode });
  }, [adjacency]);

  const clear = () => { setHl({ nodes: new Set(), links: new Set() }); setCrumbs([]); };

  const run = async (advisory: string, simulate = false) => {
    if (running) return;
    setErr(null); setIncident(null); setSelected(null); setMobilePanel("map"); setRunning(advisory); setTab("brief"); setBrief(null); setMemoryNote(null); setAgents({}); clear();
    const a = advisories.find((x) => x.id === advisory);
    if (simulate) { setDrop(a || { id: advisory }); await new Promise((r) => setTimeout(r, 2200)); setDrop(null); }
    try {
      const fullImpact = await loadImpact(advisory);
      const res = await fetch(`/api/investigate?advisory=${encodeURIComponent(advisory)}`);
      if (!res.ok || !res.body) throw new Error("The investigation could not start. Please try again.");
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "";
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let i; while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i); buf = buf.slice(i + 1); if (!line.trim()) continue;
          const e = JSON.parse(line);
          if (e.type === "agent") {
            setAgents((s) => ({ ...s, [e.agent]: { ...s[e.agent], status: e.phase === "start" ? "running" : "done", text: e.text, cypher: e.cypher || s[e.agent]?.cypher, ms: e.ms, rows: e.rows, highlight: e.highlight } }));
            await new Promise((r) => setTimeout(r, e.phase === "done" ? 650 : 350));
          } else if (e.type === "memory") setMemoryNote(e.text);
          else if (e.type === "brief") setBrief({ ...e });
          else if (e.type === "done") { setBrief((b) => (b ? { ...b, investigation: e.investigation } : b)); loadInvs(); }
          else if (e.type === "error") setErr(e.text);
        }
      }
      overview(fullImpact);
    } catch (e: any) { setErr(String(e?.message || e)); }
    setRunning(null);
  };

  const claimClick = async (c: Claim) => {
    setMapMode(false); setMobilePanel("map"); setSelected(null);
    const pathish = c.evidence.filter((x) => x.startsWith("Service:") || x.startsWith("Version:"));
    const others = c.evidence.filter((x) => !pathish.includes(x));
    if (pathish.length >= 2 && pathish[0].startsWith("Service:")) {
      const segs: string[][] = []; let cur: string[] = [];
      for (const x of pathish) { if (x.startsWith("Service:") && cur.length) { segs.push(cur); cur = []; } cur.push(x); }
      if (cur.length) segs.push(cur);
      highlight(others, segs); setCrumbs(segs[0]); g.current?.fit([...segs.flat(), ...others]);
    } else { highlight(c.evidence, [], "context"); g.current?.fit(c.evidence); setCrumbs(c.evidence); }
  };

  const showRisk = async () => {
    setMapMode(false); setTab("risk"); setMobilePanel("report"); setErr(null);
    try {
      let d = risk;
      if (!d) { const response = await fetch("/api/risk"); if (!response.ok) throw new Error("Key-holder analysis could not load. Please try again."); d = await response.json(); }
      setRisk(d); if (d.maintainers?.[0]) riskFor(d.maintainers[0].maintainer);
    } catch (e: any) { setErr(e.message); }
  };
  const riskFor = (m: string) => {
    // client-side reverse walk: maintainer -> packages -> versions -> ... -> services
    const start = `Maintainer:${m}`; const ns = new Set([start]); const paths: string[][] = [];
    const pkgs = (adjacency.out.get(start) || []).filter((e) => e.type === "MAINTAINS").map((e) => e.to);
    pkgs.forEach((p) => ns.add(p));
    const vers = pkgs.flatMap((p) => (adjacency.out.get(p) || []).filter((e) => e.type === "HAS_VERSION").map((e) => e.to));
    const seen = new Set<string>(); let frontier = vers.map((v) => [v]);
    while (frontier.length) {
      const next: string[][] = [];
      for (const p of frontier) {
        const head = p[0]; if (seen.has(head)) continue; seen.add(head);
        const ups = (adjacency.inn.get(head) || []).filter((e) => e.type === "DEPENDS_ON" || e.type === "DEPLOYS");
        if (!ups.length || head.startsWith("Service:")) { if (head.startsWith("Service:")) paths.push(p); continue; }
        for (const u of ups) next.push([u.from, ...p]);
      }
      frontier = next;
    }
    highlight([...ns], paths, "risk"); setCrumbs([start]); g.current?.fit([...ns, ...paths.flat()]);
  };

  const openInv = async (inv: any) => {
    setLoadingMemory(true); setErr(null);
    try {
      await loadImpact(inv.advisory);
      const response = await fetch(`/api/investigations/${encodeURIComponent(inv.id)}`);
      if (!response.ok) throw new Error("This investigation could not be recalled. Please try again.");
      const d = await response.json();
      const fs: any[] = d.findings || [];
      const dj = (f: any) => { try { return JSON.parse(f.data || "{}"); } catch { return {}; } };
      const claims: Claim[] = fs.filter((f) => f.kind === "brief").map((f) => ({ text: f.text, evidence: dj(f).evidence || f.evidence || [], tone: dj(f).tone }));
      setBrief({ headline: `Recalled from graph memory · ${inv.serviceCount ?? "?"} services exposed`, severity: inv.severity, claims, mode: inv.mode, investigation: inv.id, fromMemory: true, started: inv.started });
      setTab("brief"); setCrumbs([]); setMobilePanel("report");
    } catch (e: any) { setErr(e.message); }
    finally { setLoadingMemory(false); }
  };

  const stats = useMemo(() => graph ? {
    nodes: graph.nodes.length, links: graph.links.length,
    services: graph.nodes.filter((n) => n.label === "Service").length,
    adv: graph.nodes.filter((n) => n.label === "Advisory").length,
    maint: graph.nodes.filter((n) => n.label === "Maintainer").length,
  } : null, [graph]);

  return (
    <main className="workspace">
      <header className="app-header">
        <Link className="brand" href="/" aria-label="Blast Radius home"><Brand/></Link>
        <nav className="primary-nav" aria-label="Workspace">
          <button className={clsx(tab === "brief" && "active")} onClick={() => { setTab("brief"); if (incident) overview(incident); setMobilePanel("map"); }}>Incident room</button>
          <button className={clsx(tab === "risk" && "active")} onClick={showRisk}>Key holders</button>
          <button className={clsx(tab === "memory" && "active")} onClick={() => { setTab("memory"); setMobilePanel("report"); loadInvs(); }}>Memory</button>
        </nav>
        <div className="header-actions"><span className="workspace-name">Lagos Ledger <span>Demo workspace</span></span><Link href="/setup" className="icon-button" aria-label="Set up email alerts" title="Set up email alerts"><Bell size={18}/></Link></div>
      </header>

      <section className="workspace-heading">
        <div><h1>{tab === "risk" ? "Who holds the keys?" : tab === "memory" ? "Never start from zero." : "One dependency. Every connection."}</h1><p>{tab === "risk" ? "See which maintainers can reach the most services in your stack." : tab === "memory" ? "Reopen an investigation with its findings and graph evidence intact." : "Trace an advisory to your services, their owners and the people on call."}</p></div>
        <button className="button primary" disabled={!!running || !graph} onClick={() => run(FEATURED, true)}><Zap size={15}/>{running ? "Investigating…" : "Simulate CVE drop"}<ArrowUpRight size={15}/></button>
      </section>
      <div className="mobile-views" role="tablist" aria-label="Workspace panel">{([['map','Map'],['feed','Feed & agents'],['report','Report']] as const).map(([key,label]) => <button key={key} role="tab" aria-selected={mobilePanel === key} onClick={() => setMobilePanel(key)} className={clsx(mobilePanel === key && 'active')}>{label}{key === 'report' && brief && <span className="notification-dot"/>}</button>)}</div>
      {err && <div className="workspace-error" role="alert"><AlertTriangle size={16}/><span>{err}</span><button className="icon-button" onClick={() => setErr(null)} aria-label="Dismiss error"><X size={15}/></button></div>}

      <div className="workspace-grid" data-mobile-panel={mobilePanel}>
        <aside className="activity-rail">
          <section className="feed-section">
            <div className="section-heading"><h2><Radio size={15}/>Advisory feed</h2><span>{advisories.length || '—'}</span></div>
            <p className="section-description">Ranked by services reached</p>
            <div className="advisory-list">
              {!advisories.length && <p className="empty-inline">{graph ? 'No advisories are available.' : 'Loading advisories…'}</p>}
              {advisories.slice(0, 30).map((a) => <button key={a.id} disabled={!!running} onClick={() => run(a.id)} className={clsx('advisory-row', (running === a.id || incident?.advisory?.id === a.id) && 'selected')}>
                <span className="advisory-meta"><span className={clsx('severity',sevColor(a.severity))}>{a.severity}</span><span className="reach-count">{a.services} services</span></span>
                <span className="advisory-name">{a.aliases?.[0] || a.id}</span><span className="advisory-summary">{a.summary}</span>
              </button>)}
            </div>
          </section>
          <section className="agents-section">
            <div className="section-heading"><h2><Activity size={15}/>Investigation team</h2><span>{Object.values(agents).filter(a => a.status === 'done').length}/4</span></div>
            <div className="agent-list">{AGENTS.map(({ name, icon: Icon, role }) => {
              const state = agents[name] || { status: 'idle' };
              return <div key={name} className={clsx('agent-row',state.status)}><div className="agent-top"><span className="agent-icon"><Icon size={15}/></span><div><strong>{name}</strong><span>{role}</span></div><span className="agent-status" aria-label={state.status}>{state.status === 'done' ? <Check size={14}/> : state.status === 'running' ? 'Working' : <span className="idle-dot"/>}</span></div>
                {state.text && <p className="agent-result">{state.text}</p>}
                {state.cypher && <button className="query-toggle" aria-expanded={openCypher === name} onClick={() => setOpenCypher(openCypher === name ? null : name)}><Code2 size={13}/>View Cypher <ChevronDown size={13} className={clsx(openCypher === name && 'rotated')}/><span>{state.ms} ms</span></button>}
                {openCypher === name && state.cypher && <pre className="cypher-code">{state.cypher}</pre>}
              </div>;
            })}</div>
            {memoryNote && <div className="memory-note"><History size={14}/><span>{memoryNote}</span></div>}
          </section>
        </aside>

        <section className="graph-stage" aria-label="Dependency graph">
          <div className="graph-toolbar"><div><span className="graph-status-dot"/><h2>{mapMode ? 'All affected areas' : tab === 'risk' ? 'Maintainer reach' : hl.nodes.size ? 'Evidence path' : 'Dependency map'}</h2><span className="graph-view-label">{mapMode ? 'Connected layers' : '3D network'}</span></div>{!mapMode && <button onClick={() => { setSelected(null); g.current?.fit(hl.nodes.size ? [...hl.nodes] : undefined); }} className="graph-icon" title="Fit graph to view" aria-label="Fit graph to view"><Maximize2 size={15}/></button>}</div>
          <div className="graph-canvas">
            {graph ? <GraphView ref={g as any} data={graph} hl={mapMode ? hl : {...hl, mode: hl.mode === 'incident' ? 'context' : hl.mode}} onNode={(n) => setSelected(n)} /> : <div className="graph-loading"><div className="loading-orbit"><Crosshair size={30}/></div><strong>{err ? 'Graph unavailable' : 'Connecting the dots…'}</strong><span>{err ? 'Refresh to reconnect to FalkorDB.' : 'Loading your dependency graph from FalkorDB'}</span></div>}
            {selected && <div className="node-detail"><div><span className="node-dot" style={{background:COLORS[selected.label]}}/>{selected.label}<button onClick={() => setSelected(null)} aria-label="Close node details"><X size={15}/></button></div><strong>{selected.title || selected.name}</strong>{selected.vulnerable && <span className="vulnerable-label">Vulnerable version</span>}</div>}
            {crumbs.length > 0 && <div className="path-trail"><Crosshair size={14}/>{crumbs.map((c,i) => <span key={c+i}>{i > 0 && <span className="path-arrow">→</span>}<button onClick={() => g.current?.focusNode(c)}>{strip(c)}</button></span>)}<button className="trail-reset" onClick={() => { clear(); setSelected(null); g.current?.fit(); }}>Reset</button></div>}
          </div>
          <div className="graph-footer">{mapMode ? <span className="map-guidance"><span className="orange-dot"/>Every exposed branch, from advisory to on-call</span> : <div className="graph-legend">{['Service','Team','Version','Maintainer','Advisory'].map(label => <span key={label}><i style={{background:COLORS[label]}}/>{label}</span>)}</div>}<span className={clsx('graph-interaction',mapMode && 'map-interaction')}><span>{mapMode ? 'Select any node' : 'Drag to orbit · scroll to zoom'}</span>{mapMode && <span className="mobile-map-hint">Scroll to explore all layers · tap a node</span>}</span></div>
        </section>

        <aside className="report-panel" aria-label={tab === 'risk' ? 'Key-holder analysis' : tab === 'memory' ? 'Investigation memory' : 'Incident brief'}>
          <div className="report-heading"><h2>{tab === 'risk' ? 'Key holders' : tab === 'memory' ? 'Investigation memory' : 'Incident brief'}</h2><span>{tab === 'risk' ? <ShieldAlert size={16}/> : tab === 'memory' ? <Brain size={16}/> : <Siren size={16}/>}</span></div>
          <div className="report-content">
            {tab === 'brief' && incident && <section className="impact-summary"><div className="impact-heading"><span className="severity severity-high">{incident.advisory?.severity || 'EXPOSURE'}</span><span className="quiet">{running ? 'Manual investigation' : 'Dependency exposure'}</span></div><h3>{incident.services.length} of {stats?.services || 10} services affected</h3><p>{incident.tier1} critical services <span>·</span> {new Set(incident.services.map((s: any) => s.teamId)).size} teams</p><button className="button impact-action" onClick={() => { overview(incident); setMobilePanel('map'); }}><GitBranch size={14}/>{mapMode ? 'All affected areas highlighted' : 'Show all affected areas'}</button><div className="owner-list">{incident.services.map((hit: any) => <div key={hit.service}><strong>{hit.service}</strong><span>{hit.team}<small>{hit.oncall || 'No on-call assigned'}</small></span></div>)}</div><p className="exposure-note">Exposure is not proof of a breach. Manual investigations never send email.</p></section>}
            {tab === 'brief' && (brief ? <div className="brief-findings"><div className="brief-meta"><span className="status-dot"/>{brief.mode === 'llm' ? `AI-assisted · ${brief.model || 'Commander'}` : 'Graph-verified · deterministic'}{brief.fallback && <span title={brief.fallback}> · AI fallback</span>}</div>{brief.fromMemory && <p className="recall-date"><History size={13}/>Recalled · {brief.started?.slice(0,16).replace('T',' ')} UTC</p>}<h3>{brief.headline}</h3><p className="findings-help">Select a finding to inspect its evidence.</p><div className="claim-list">{brief.claims.map((claim,i) => <button key={i} className="claim" onClick={() => claimClick(claim)}><span className={clsx('claim-dot',toneDot[claim.tone || 'info'])}/><span><span className="claim-text">{claim.text}</span>{!!claim.evidence?.length && <span className="claim-evidence">{[...new Set(claim.evidence)].slice(0,3).map(e => <span key={e}>{strip(e)}</span>)}{claim.evidence.length > 3 && <span>+{claim.evidence.length-3}</span>}<ArrowUpRight size={12}/></span>}</span></button>)}</div>{brief.investigation && <p className="saved-note"><Check size={13}/>Saved to graph memory · {brief.claims.length} evidence-backed findings</p>}</div> : incident ? <div className="brief-pending">{running ? <><span className="status-dot running"/>Building the incident brief…</> : <><p>Open the full investigation to review evidence and recommended actions.</p><button className="button secondary" onClick={() => run(incident.advisory?.id || FEATURED)}>Run full investigation</button></>}</div> : <div className="report-empty"><div className="empty-symbol"><GitBranch size={26} strokeWidth={1.5}/></div><h3>Where does the risk reach?</h3><p>Start with the qs vulnerability. Watch the graph trace an indirect dependency to every affected service.</p><button disabled={!!running || !graph} className="button secondary" onClick={() => run(FEATURED, true)}>Investigate qs<ArrowUpRight size={14}/></button><div className="empty-process"><span><Check size={13}/>Trace every dependency path</span><span><Check size={13}/>Find owners and on-call people</span><span><Check size={13}/>Open the evidence behind each finding</span></div></div>)}
            {tab === 'risk' && (risk ? <div className="risk-report"><p className="report-intro">Maintainers ranked by how many services their packages reach. Concentration risk, not blame.</p><div className="maintainer-list">{risk.maintainers.map((m: any,i: number) => <button key={m.maintainer} onClick={() => { riskFor(m.maintainer); setMobilePanel('map'); }}><span className="rank">{i+1}</span><span className="maintainer-name"><strong>{m.maintainer}</strong><small>{m.packages} packages · {m.soloPkgs} sole-publisher</small></span><span className="maintainer-reach"><strong>{m.serviceCount}<small>/{stats?.services || 10}</small></strong><small>services</small></span></button>)}</div><h3>Single-maintainer packages</h3><p className="report-intro">The widest reach from a single publisher.</p><div className="package-list">{risk.solo.slice(0,10).map((pkg: any) => <div key={pkg.package}><span><strong>{pkg.package}</strong><small>{pkg.maintainer}</small></span><span>{pkg.serviceCount} services</span></div>)}</div></div> : <p className="empty-inline">{err ? 'Choose Key holders to retry.' : 'Tracing maintainer reach…'}</p>)}
            {tab === 'memory' && <div className="memory-report"><p className="report-intro">Reopen saved findings with their original graph evidence. Follow-up investigations stay linked.</p>{loadingMemory && <p role="status" className="memory-loading">Recalling investigation…</p>}<div className="investigation-list">{invs.length ? invs.map(inv => <button key={inv.id} disabled={loadingMemory} onClick={() => openInv(inv)}><span className="investigation-meta"><span className={clsx('severity',sevColor(inv.severity))}>{inv.severity}</span><time>{inv.started?.slice(5,16).replace('T',' ')} UTC</time></span><strong>{inv.advisory}</strong><p>{inv.summary}</p><span className="investigation-footer">{inv.serviceCount} services · {inv.findings} findings <ArrowUpRight size={14}/></span>{inv.previous && <span className="followup-label"><History size={12}/>Follow-up investigation</span>}</button>) : <div className="empty-inline">Your first investigation will appear here. Select an advisory to get started.</div>}</div></div>}
          </div>
          <details className="monitor-details"><summary><span className={clsx('status-dot',monitor?.error && 'warning')}/><span>{monitor?.error ? 'Monitoring needs attention' : monitor?.checked ? 'Advisory monitoring active' : 'Monitoring awaits its first scan'}</span><ChevronDown size={14}/></summary><div className="monitor-body"><p>Checks published advisories about every 30 minutes.{monitor?.checked && <> Last checked {new Date(monitor.checked).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}.</>}</p>{alerts.slice(0,3).map(alert => <button key={alert.id} onClick={() => { loadImpact(alert.advisory).catch(e => setErr(e.message)); setTab('brief'); setBrief(null); setMobilePanel('map'); }}><strong>{alert.isTest ? 'Test · ' : ''}{alert.advisory}</strong><span>{alert.services.length} services · {alert.status === 'accepted' ? 'Email accepted by provider' : alert.status === 'failed' ? 'Email retry pending' : 'Email pending / setup needed'}</span></button>)}<Link href="/setup">Manage admin email alerts<ArrowUpRight size={13}/></Link></div></details>
        </aside>
      </div>
      <footer className="workspace-footer"><span><span className={clsx('status-dot',!graph && 'warning')}/>{graph ? 'Connected to FalkorDB' : 'Connecting to FalkorDB'}{stats && <span className="graph-counts">{stats.nodes.toLocaleString()} nodes · {stats.links.toLocaleString()} relationships</span>}</span><span className="demo-disclosure">Real npm & OSV data · Synthetic company<span className="footer-mode">{health?.agents?.mode === 'llm' ? 'AI-assisted' : 'Deterministic mode'}</span></span></footer>
      <AnimatePresence>{drop && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="incident-overlay" role="status"><motion.div initial={{y:10,scale:.98}} animate={{y:0,scale:1}} className="incident-notice"><div className="incident-notice-icon"><AlertTriangle size={25}/></div><h2>A dependency needs attention.</h2><strong>{drop.aliases?.[0] || drop.id}</strong><p>{drop.summary}</p><div className="incident-notice-footer"><span className="status-dot running"/>Tracing affected services…<span>Simulation</span></div></motion.div></motion.div>}</AnimatePresence>
    </main>
  );
}
