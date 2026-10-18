"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, AlertTriangle, Brain, ChevronDown, Code2, Crosshair, GitBranch, History, Radar, Radio, ShieldAlert, Siren, Sparkles, Users, Zap } from "lucide-react";
import clsx from "clsx";
import type { GraphHandle, GNode, GLink, Highlight } from "./GraphView";
import { COLORS } from "./colors";

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
const sevColor = (s?: string) => (s === "CRITICAL" ? "text-crit" : s === "HIGH" ? "text-[#ff7a45]" : s === "MODERATE" || s === "MEDIUM" ? "text-warn" : "text-muted");
const toneDot: Record<string, string> = { critical: "bg-crit", warn: "bg-warn", info: "bg-info", ok: "bg-ok" };
const strip = (id: string) => id.split(":").slice(1).join(":");

export default function WarRoom() {
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

  useEffect(() => {
    fetch("/api/graph").then((r) => r.json()).then((d) => (d.error ? setErr(d.error) : setGraph(d))).catch((e) => setErr(String(e)));
    fetch("/api/health").then((r) => r.json()).then(setHealth).catch(() => {});
    fetch("/api/advisories").then((r) => r.json()).then((d) => setAdvisories(d.advisories || []));
    loadInvs();
  }, []);
  const loadInvs = () => fetch("/api/investigations").then((r) => r.json()).then((d) => setInvs(d.investigations || []));

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

  const fly = async (path: string[]) => {
    setCrumbs(path);
    await g.current?.flyPath(path);
  };

  const run = async (advisory: string, simulate = false) => {
    if (running) return;
    setRunning(advisory); setTab("brief"); setBrief(null); setMemoryNote(null); setAgents({}); clear();
    const a = advisories.find((x) => x.id === advisory);
    if (simulate) { setDrop(a || { id: advisory }); await new Promise((r) => setTimeout(r, 2200)); setDrop(null); }
    let paths: string[][] = []; let ctxNodes: string[] = []; let firstPath: string[] | null = null;
    try {
      const res = await fetch(`/api/investigate?advisory=${encodeURIComponent(advisory)}`);
      const reader = res.body!.getReader(); const dec = new TextDecoder(); let buf = "";
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let i; while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i); buf = buf.slice(i + 1); if (!line.trim()) continue;
          const e = JSON.parse(line);
          if (e.type === "agent") {
            setAgents((s) => ({ ...s, [e.agent]: { ...s[e.agent], status: e.phase === "start" ? "running" : "done", text: e.text, cypher: e.cypher || s[e.agent]?.cypher, ms: e.ms, rows: e.rows, highlight: e.highlight } }));
            if (e.phase === "done" && e.highlight) {
              if (e.agent === "Scout") { highlight(e.highlight.nodes); g.current?.fit(e.highlight.nodes); }
              if (e.agent === "Tracer") { paths = e.highlight.paths; firstPath = paths[0] || null; highlight([], paths); g.current?.fit(paths.flat()); }
              if (e.agent === "Cartographer") { ctxNodes = e.highlight.nodes; highlight(ctxNodes, paths, "context"); }
            }
            await new Promise((r) => setTimeout(r, e.phase === "done" ? 650 : 350));
          } else if (e.type === "memory") setMemoryNote(e.text);
          else if (e.type === "brief") setBrief({ ...e });
          else if (e.type === "done") { setBrief((b) => (b ? { ...b, investigation: e.investigation } : b)); loadInvs(); }
          else if (e.type === "error") setErr(e.text);
        }
      }
      const fp = firstPath as string[] | null;
      if (fp) { highlight(ctxNodes, paths, "path"); await fly(fp); g.current?.fit([...paths.flat(), ...ctxNodes]); }
    } catch (e: any) { setErr(String(e?.message || e)); }
    setRunning(null);
  };

  const claimClick = async (c: Claim) => {
    const pathish = c.evidence.filter((x) => x.startsWith("Service:") || x.startsWith("Version:"));
    const others = c.evidence.filter((x) => !pathish.includes(x));
    if (pathish.length >= 2 && pathish[0].startsWith("Service:")) {
      const segs: string[][] = []; let cur: string[] = [];
      for (const x of pathish) { if (x.startsWith("Service:") && cur.length) { segs.push(cur); cur = []; } cur.push(x); }
      if (cur.length) segs.push(cur);
      highlight(others, segs); await fly(segs[0]); g.current?.fit([...segs.flat(), ...others]);
    } else { highlight(c.evidence, [], "context"); g.current?.fit(c.evidence); setCrumbs(c.evidence); }
  };

  const showRisk = async () => {
    setTab("risk");
    const d = risk || (await fetch("/api/risk").then((r) => r.json())); setRisk(d);
    if (d.maintainers?.[0]) riskFor(d.maintainers[0].maintainer);
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
    const d = await fetch(`/api/investigations/${inv.id}`).then((r) => r.json());
    const fs: any[] = d.findings || [];
        const dj = (f: any) => { try { return JSON.parse(f.data || "{}"); } catch { return {}; } };
    const claims: Claim[] = fs.filter((f) => f.kind === "brief").map((f) => ({ text: f.text, evidence: dj(f).evidence || f.evidence, tone: dj(f).tone }));
    const exposures: string[][] = fs.filter((f) => f.kind === "exposure").map((f) => dj(f).path || f.evidence);
    setBrief({ headline: `Recalled from graph memory · ${inv.serviceCount ?? "?"} services exposed`, severity: inv.severity, claims, mode: inv.mode, investigation: inv.id, fromMemory: true, started: inv.started });
    setTab("brief"); setCrumbs([]); highlight([], exposures); g.current?.fit(exposures.flat());
  };

  const stats = useMemo(() => graph ? {
    nodes: graph.nodes.length, links: graph.links.length,
    services: graph.nodes.filter((n) => n.label === "Service").length,
    adv: graph.nodes.filter((n) => n.label === "Advisory").length,
    maint: graph.nodes.filter((n) => n.label === "Maintainer").length,
  } : null, [graph]);

  return (
    <main className="grain relative h-screen w-screen overflow-hidden">
      {/* graph canvas */}
      <div className="absolute inset-0">
        {graph ? <GraphView ref={g as any} data={graph} hl={hl} onNode={(n) => setSelected(n)} /> :
          <div className="flex h-full items-center justify-center font-mono text-sm text-muted">{err ? `FalkorDB unreachable: ${err}` : "Loading graph from FalkorDB…"}</div>}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(6,7,10,.85)_100%)]" />

      {/* top bar */}
      <header className="absolute inset-x-4 top-4 z-10 flex items-center gap-4">
        <div className="panel flex items-center gap-3 px-4 py-2.5">
          <span className="pulse-dot inline-block h-2.5 w-2.5 rounded-full bg-crit text-crit" />
          <div className="leading-none">
            <div className="font-mono text-[13px] font-semibold tracking-[0.22em]">BLAST RADIUS</div>
            <div className="mt-1 whitespace-nowrap text-[11px] text-muted">Lagos Ledger · supply-chain war room</div>
          </div>
        </div>
        {stats && (
          <div className="panel hidden items-center gap-5 whitespace-nowrap px-4 py-2.5 font-mono text-[11px] text-muted xl:flex">
            <Stat k="nodes" v={stats.nodes} /><Stat k="edges" v={stats.links} /><Stat k="advisories" v={stats.adv} />
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-ok" />FalkorDB</span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span title={health?.agents?.fallback || health?.agents?.model || ""} className={clsx("panel flex items-center gap-1.5 whitespace-nowrap px-3 py-2 font-mono text-[11px]", health?.agents?.mode === "llm" ? "text-info" : "text-muted")}>
            <Sparkles size={13} /> {health?.agents?.mode === "llm" ? health.agents.model : health?.agents?.fallback ? "AI off · deterministic" : "deterministic agents"}
          </span>
          <button onClick={showRisk} className="panel flex items-center gap-2 whitespace-nowrap px-3.5 py-2 text-[13px] hover:border-white/20"><ShieldAlert size={15} className="text-warn" />Who holds the keys</button>
          <button onClick={() => { setTab("memory"); loadInvs(); }} className="panel flex items-center gap-2 whitespace-nowrap px-3.5 py-2 text-[13px] hover:border-white/20"><Brain size={15} className="text-info" />Memory</button>
          <button disabled={!!running} onClick={() => run(FEATURED, true)}
            className="glow-crit flex items-center gap-2 whitespace-nowrap rounded-[14px] bg-crit px-4 py-2 text-[13px] font-semibold text-black transition hover:brightness-110 disabled:opacity-60">
            <Zap size={15} />{running ? "Investigating…" : "Simulate CVE drop"}
          </button>
        </div>
      </header>

      {/* left: feed + agents */}
      <aside className="absolute bottom-4 left-4 top-[84px] z-10 flex w-[340px] flex-col gap-3">
        <section className="panel flex min-h-0 flex-[0.9] flex-col">
          <PanelTitle icon={Radio} title="Advisory feed" sub="ranked by services reached" />
          <div className="scroll min-h-0 flex-1 overflow-y-auto px-2 pb-2">
            {advisories.slice(0, 30).map((a) => (
              <button key={a.id} onClick={() => run(a.id)} disabled={!!running}
                className={clsx("group w-full rounded-lg px-2.5 py-2 text-left transition hover:bg-white/[.04]", running === a.id && "bg-white/[.05]")}>
                <div className="flex items-center gap-2 font-mono text-[10.5px]">
                  <span className={clsx("font-semibold", sevColor(a.severity))}>{a.severity}</span>
                  <span className="text-muted">{a.aliases?.[0] || a.id}</span>
                  <span className="ml-auto rounded bg-white/[.06] px-1.5 py-0.5 text-[10px] text-white/80">{a.services} svc</span>
                </div>
                <div className="mt-0.5 line-clamp-1 text-[12.5px] text-white/85 group-hover:text-white">{a.summary}</div>
              </button>
            ))}
          </div>
        </section>
        <section className="panel flex min-h-0 flex-1 flex-col">
          <PanelTitle icon={Activity} title="Agents" sub="shared state lives in the graph" />
          <div className="scroll min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
            {AGENTS.map(({ name, icon: Icon, role }) => {
              const s = agents[name] || { status: "idle" };
              return (
                <motion.div key={name} layout className={clsx("rounded-xl border p-2.5 transition", s.status === "running" ? "scanbar border-info/40 bg-info/[.04]" : s.status === "done" ? "border-white/10 bg-white/[.02]" : "border-white/5")}>
                  <div className="flex items-center gap-2">
                    <Icon size={14} className={s.status === "idle" ? "text-muted" : "text-info"} />
                    <span className="text-[12.5px] font-medium">{name}</span>
                    <span className="text-[11px] text-muted">{role}</span>
                    <span className="ml-auto font-mono text-[10px] text-muted">{s.status === "done" ? `${s.ms}ms · ${s.rows} rows` : s.status === "running" ? "running" : ""}</span>
                  </div>
                  {s.text && <div className="mt-1.5 text-[12px] leading-snug text-white/80">{s.text}</div>}
                  {s.cypher && (
                    <button onClick={() => setOpenCypher(openCypher === name ? null : name)} className="mt-1.5 flex items-center gap-1 font-mono text-[10.5px] text-info/80 hover:text-info">
                      <Code2 size={11} /> Cypher <ChevronDown size={11} className={clsx("transition", openCypher === name && "rotate-180")} />
                    </button>
                  )}
                  <AnimatePresence>{openCypher === name && s.cypher && (
                    <motion.pre initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="scroll mt-1.5 max-h-48 overflow-auto rounded-lg bg-black/50 p-2 font-mono text-[10.5px] leading-relaxed text-[#9cf0ff]">{s.cypher}</motion.pre>
                  )}</AnimatePresence>
                </motion.div>
              );
            })}
            {memoryNote && <div className="rounded-xl border border-info/30 bg-info/[.06] p-2.5 text-[12px] text-info"><History size={12} className="mr-1 inline" />{memoryNote}</div>}
          </div>
        </section>
      </aside>

      {/* right: brief / risk / memory */}
      <aside className="panel absolute bottom-4 right-4 top-[84px] z-10 flex w-[420px] flex-col">
        <div className="flex gap-1 border-b hairline p-2">
          {([["brief", "Incident brief", Siren], ["risk", "Key holders", ShieldAlert], ["memory", "Memory", Brain]] as const).map(([k, l, I]) => (
            <button key={k} onClick={() => (k === "risk" ? showRisk() : setTab(k))} className={clsx("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px]", tab === k ? "bg-white/[.08] text-white" : "text-muted hover:text-white")}>
              <I size={13} />{l}
            </button>
          ))}
        </div>
        <div className="scroll min-h-0 flex-1 overflow-y-auto p-4">
          {tab === "brief" && (brief ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-2 font-mono text-[10.5px] text-muted">
                <span className={clsx("font-semibold", sevColor(brief.severity))}>{brief.severity}</span>
                <span>·</span><span>{brief.mode === "llm" ? `Commander · ${brief.model}${brief.dropped ? ` · ${brief.dropped} ungrounded dropped` : ""}` : "Commander · deterministic"}</span>
                {brief.fallback && <span className="whitespace-nowrap rounded bg-warn/15 px-1.5 text-warn" title={brief.fallback}>AI fallback</span>}
                {brief.fromMemory && <span className="whitespace-nowrap rounded bg-info/15 px-1.5 text-info">from memory · {brief.started?.slice(0, 16).replace("T", " ")}Z</span>}
              </div>
              <h2 className="mt-2 text-[19px] font-semibold leading-snug tracking-tight">{brief.headline}</h2>
              <div className="mt-4 space-y-2">
                {brief.claims.map((c, i) => (
                  <motion.button key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                    onClick={() => claimClick(c)} className="group w-full rounded-xl border border-white/[.06] bg-white/[.02] p-3 text-left transition hover:border-info/40 hover:bg-info/[.04]">
                    <div className="flex gap-2.5">
                      <span className={clsx("mt-1.5 h-1.5 w-1.5 flex-none rounded-full", toneDot[c.tone || "info"])} />
                      <div className="text-[13px] leading-snug text-white/90">{c.text}</div>
                    </div>
                    {!!c.evidence?.length && (
                      <div className="mt-2 flex flex-wrap gap-1 pl-4">
                        {[...new Set(c.evidence)].slice(0, 6).map((e) => (
                          <span key={e} className="rounded-md border border-white/[.07] px-1.5 py-0.5 font-mono text-[10px] text-muted group-hover:text-white/80">
                            <span style={{ color: COLORS[e.split(":")[0]] }}>●</span> {strip(e)}
                          </span>
                        ))}
                        {c.evidence.length > 6 && <span className="font-mono text-[10px] text-muted">+{c.evidence.length - 6}</span>}
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
              {brief.investigation && <div className="mt-4 font-mono text-[10.5px] text-muted">Filed as (:Investigation {"{"}id:&apos;{brief.investigation}&apos;{"}"}) · every claim is a (:Finding)-[:EVIDENCE]-&gt;(node)</div>}
            </motion.div>
          ) : <Empty running={!!running} onRun={() => run(FEATURED, true)} />)}

          {tab === "risk" && (risk ? (
            <div>
              <h2 className="text-[17px] font-semibold tracking-tight">Who can ship code into your stack?</h2>
              <p className="mt-1 text-[12.5px] text-muted">PageRank over <span className="font-mono">DEPENDS_ON</span> plus reachability from every service. Concentration risk, not blame.</p>
              <div className="mt-3 space-y-1.5">
                {risk.maintainers.map((m: any, i: number) => (
                  <button key={m.maintainer} onClick={() => riskFor(m.maintainer)} className="flex w-full items-center gap-3 rounded-lg border border-white/[.06] px-3 py-2 text-left hover:border-crit/40">
                    <span className="w-4 font-mono text-[11px] text-muted">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[12.5px]" style={{ color: COLORS.Maintainer }}>{m.maintainer}</div>
                      <div className="truncate text-[11px] text-muted">{m.packages} pkgs · {m.soloPkgs} sole-publisher · {m.samplePackages.slice(0, 3).join(", ")}</div>
                    </div>
                    <div className="text-right"><div className="font-mono text-[15px] font-semibold text-crit">{m.serviceCount}<span className="text-[11px] text-muted">/10</span></div><div className="text-[10px] text-muted">services</div></div>
                  </button>
                ))}
              </div>
              <h3 className="mt-5 text-[13px] font-semibold">Single-maintainer packages with the widest reach</h3>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {risk.solo.slice(0, 10).map((s: any) => (
                  <div key={s.package} className="rounded-lg border border-white/[.06] p-2">
                    <div className="truncate font-mono text-[11.5px]">{s.package}</div>
                    <div className="text-[10.5px] text-muted">{s.maintainer} · <span className="text-warn">{s.serviceCount} svc</span></div>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="text-muted">Loading…</div>)}

          {tab === "memory" && (
            <div>
              <h2 className="text-[17px] font-semibold tracking-tight">Investigation memory</h2>
              <p className="mt-1 text-[12.5px] text-muted">Every run is persisted as <span className="font-mono">(:Investigation)-[:HAS_FINDING]-&gt;(:Finding)-[:EVIDENCE]-&gt;(…)</span>. Re-runs link with <span className="font-mono">FOLLOWS_UP</span> and <span className="font-mono">SUPERSEDES</span>.</p>
              <div className="mt-3 space-y-1.5">
                {invs.map((i) => (
                  <button key={i.id} onClick={() => openInv(i)} className="w-full rounded-lg border border-white/[.06] p-2.5 text-left hover:border-info/40">
                    <div className="flex items-center gap-2 font-mono text-[10.5px] text-muted">
                      <span className={sevColor(i.severity)}>{i.severity}</span><span>{i.advisory}</span>
                      <span className="ml-auto">{i.started?.slice(5, 16).replace("T", " ")}Z</span>
                    </div>
                    <div className="mt-0.5 line-clamp-1 text-[12.5px]">{i.summary}</div>
                    <div className="mt-1 font-mono text-[10.5px] text-muted">{i.serviceCount} services · {i.findings} findings{i.previous ? ` · follows ${i.previous}` : ""}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* breadcrumbs HUD */}
      <AnimatePresence>{crumbs.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="panel absolute bottom-4 left-[372px] right-[452px] z-10 mx-auto flex w-fit max-w-[calc(100%-840px)] flex-wrap items-center gap-1.5 px-3 py-2 font-mono text-[11.5px]">
          <Crosshair size={13} className="text-info" />
          {crumbs.map((c, i) => (
            <span key={c + i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-info">→</span>}
              <button onClick={() => g.current?.focusNode(c)} style={{ color: COLORS[c.split(":")[0]] }}>{strip(c)}</button>
            </span>
          ))}
          <button onClick={() => { clear(); g.current?.fit(); }} className="ml-2 text-muted hover:text-white">reset</button>
        </motion.div>
      )}</AnimatePresence>

      {/* legend */}
      <div className="pointer-events-none absolute bottom-[70px] left-[372px] z-10 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] text-muted">
        {["Service", "Team", "Person", "Version", "Maintainer", "Advisory", "Incident", "Decision"].map((l) => (
          <span key={l} className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: COLORS[l] }} />{l}</span>
        ))}
      </div>

      {/* selected node */}
      {selected && (
        <div className="panel absolute right-[452px] top-[84px] z-10 w-64 p-3 text-[12px]">
          <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: COLORS[selected.label] }} /><span className="font-mono text-[10.5px] text-muted">{selected.label}</span>
            <button className="ml-auto text-muted hover:text-white" onClick={() => setSelected(null)}>×</button></div>
          <div className="mt-1 font-mono text-[13px]">{selected.title || selected.name}</div>
          {selected.vulnerable && <div className="mt-1 text-crit">vulnerable version</div>}
        </div>
      )}

      {/* CVE drop overlay */}
      <AnimatePresence>{drop && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 flex items-center justify-center bg-crit/10 backdrop-blur-[2px]">
          <motion.div initial={{ scale: 0.92, y: 10 }} animate={{ scale: 1, y: 0 }} className="panel glow-crit w-[560px] p-6">
            <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] text-crit"><AlertTriangle size={14} />NEW ADVISORY · OSV FEED</div>
            <div className="mt-3 font-mono text-[26px] font-semibold">{drop.aliases?.[0] || drop.id}</div>
            <div className="mt-1 text-[15px] text-white/85">{drop.summary}</div>
            <div className="mt-4 flex gap-3 font-mono text-[11px] text-muted"><span>{drop.id}</span><span className={sevColor(drop.severity)}>{drop.severity}</span><span>{drop.versions?.join(", ")}</span></div>
            <div className="scanbar mt-5 h-1 rounded bg-white/10" />
            <div className="mt-2 font-mono text-[11px] text-muted">Dispatching Scout · Tracer · Cartographer · Commander</div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>
    </main>
  );
}

function Stat({ k, v }: { k: string; v: number }) { return <span><span className="text-white">{v.toLocaleString()}</span> {k}</span>; }
function PanelTitle({ icon: I, title, sub }: { icon: any; title: string; sub: string }) {
  return <div className="flex items-baseline gap-2 px-4 pb-2 pt-3"><I size={13} className="translate-y-0.5 text-muted" /><span className="text-[12.5px] font-medium">{title}</span><span className="text-[11px] text-muted">{sub}</span></div>;
}
function Empty({ running, onRun }: { running: boolean; onRun: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <Siren size={28} className="text-crit" />
      <h2 className="mt-3 text-[18px] font-semibold">A CVE just dropped. Are you exposed?</h2>
      <p className="mt-1.5 max-w-[300px] text-[12.5px] text-muted">Four agents walk a FalkorDB graph of real npm dependencies, OSV advisories and maintainers joined to a company graph, then tell you who to page.</p>
      <button disabled={running} onClick={onRun} className="glow-crit mt-4 rounded-xl bg-crit px-4 py-2 text-[13px] font-semibold text-black">Simulate CVE drop</button>
      <p className="mt-3 text-[11px] text-muted">or pick any advisory from the feed</p>
    </div>
  );
}
