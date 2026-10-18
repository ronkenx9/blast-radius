import { q } from "./db";
import { Q } from "./queries";
import { chatJSON, llmConfig } from "./llm";

export type Claim = { text: string; evidence: string[]; tone?: "critical" | "warn" | "info" | "ok" };
export type AgentEvent =
  | { type: "agent"; agent: AgentName; phase: "start" | "done"; text: string; cypher?: string; ms?: number; rows?: number;
      highlight?: { nodes: string[]; paths: string[][] } }
  | { type: "brief"; headline: string; severity: string; claims: Claim[]; mode: "llm" | "deterministic"; model?: string; fallback?: string; dropped?: number }
  | { type: "memory"; text: string; previous?: string }
  | { type: "done"; investigation: string; ms: number }
  | { type: "error"; text: string };
export type AgentName = "Scout" | "Tracer" | "Cartographer" | "Commander";

type Adv = { id: string; summary: string; severity: string; aliases: string[]; published: string; url: string; fixed: string[]; versions: string[]; packages: string[]; maintainers: string[] };
type Hit = { service: string; tier: number; desc: string; teamId: string; team: string; channel: string; oncallId: string; oncall: string; vulnerable: string; hops: number; path: string[] };

const now = () => new Date().toISOString();
const rid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const strip = (id: string) => id.split(":").slice(1).join(":");
const pkgOf = (key: string) => key.slice(0, key.lastIndexOf("@"));

async function timed<T>(fn: () => Promise<T>): Promise<[T, number]> {
  const t = Date.now();
  const v = await fn();
  return [v, Date.now() - t];
}

async function finding(inv: string, agent: AgentName, kind: string, text: string, evidence: string[], data: unknown = {}) {
  await q(Q.writeFinding, { inv, agent, id: rid("f"), kind, text, now: now(), data: JSON.stringify({ ...(data as object), evidence }), evidence: evidence.map((e) => e.split(":").slice(1).join(":")) }, false);
}

export async function* investigate(advisoryId: string, opts: { useLLM?: boolean } = {}): AsyncGenerator<AgentEvent> {
  const t0 = Date.now();
  const llm = opts.useLLM !== false ? llmConfig() : null;
  const inv = rid("inv");

  // ---------------- Scout ----------------
  yield { type: "agent", agent: "Scout", phase: "start", text: `Pulling ${advisoryId} from the graph and opening an investigation…`, cypher: Q.advisory };
  const [[adv], ms1] = await timed(() => q<Adv>(Q.advisory, { id: advisoryId }));
  if (!adv) { yield { type: "error", text: `Advisory ${advisoryId} not in graph` }; return; }
  const [[opened]] = await timed(() => q<{ id: string; previous: string | null; previousStarted: string | null; previousServiceCount: number | null }>(
    Q.openInvestigation, { advisory: advisoryId, id: inv, now: now(), mode: llm ? "llm" : "deterministic" }, false));
  const sev = (adv.severity || "UNKNOWN").toUpperCase();
  await finding(inv, "Scout", "advisory", `${adv.id} (${adv.aliases?.join(", ") || "no CVE"}) ${sev}: ${adv.summary}`, [`Advisory:${adv.id}`, ...adv.versions.map((v) => `Version:${v}`)], adv);
  yield { type: "agent", agent: "Scout", phase: "done", ms: ms1, rows: adv.versions.length,
    text: `${sev} · ${adv.aliases?.[0] || adv.id} · affects ${adv.versions.join(", ")} · maintained by ${adv.maintainers.slice(0, 3).join(", ") || "unknown"}`,
    highlight: { nodes: [`Advisory:${adv.id}`, ...adv.versions.map((v) => `Version:${v}`)], paths: [] } };
  if (opened?.previous)
    yield { type: "memory", previous: opened.previous,
      text: `Memory: this advisory was triaged before (${opened.previous}, ${opened.previousStarted?.slice(0, 16).replace("T", " ")} UTC) — ${opened.previousServiceCount ?? "?"} services then. Comparing.` };

  // ---------------- Tracer ----------------
  yield { type: "agent", agent: "Tracer", phase: "start", text: "Walking every Service → dependency path to the vulnerable versions (shortestPath over DEPLOYS|DEPENDS_ON)…", cypher: Q.blastRadius };
  const [hits, ms2] = await timed(() => q<Hit>(Q.blastRadius, { id: advisoryId }));
  for (const h of hits)
    await finding(inv, "Tracer", "exposure", `${h.service} reaches ${h.vulnerable} in ${h.hops} hops: ${h.path.map((p) => p.split(":").slice(1).join(":")).join(" → ")}`, h.path, h);
  const services = [...new Set(hits.map((h) => h.service))];
  const tier1 = [...new Set(hits.filter((h) => h.tier === 1).map((h) => h.service))];
  yield { type: "agent", agent: "Tracer", phase: "done", ms: ms2, rows: hits.length,
    text: hits.length ? `${services.length} services exposed (${tier1.length} tier-1). Deepest path ${Math.max(...hits.map((h) => h.hops))} hops.` : "No service reaches the vulnerable versions. Not exposed.",
    highlight: { nodes: [], paths: hits.map((h) => h.path) } };

  // ---------------- Cartographer ----------------
  yield { type: "agent", agent: "Cartographer", phase: "start", text: "Mapping owners, on-call, decisions (ADRs) and past incidents for the exposed services…", cypher: Q.context + "\n\n" + Q.packageHistory };
  const intermediates = [...new Set(hits.flatMap((h) => h.path.slice(1, -1).map((p) => pkgOf(p.split(":").slice(1).join(":")))))];
  const [[ctx, hist], ms3] = await timed(() => Promise.all([
    q<{ service: string; decisions: any[]; incidents: any[] }>(Q.context, { services }),
    q<{ package: string; maintainerCount: number; maintainers: string[]; incidents: string[]; decisions: string[] }>(Q.packageHistory, { packages: [...adv.packages, ...intermediates] }),
  ]));
  const decisions = new Map<string, any>(); const incidents = new Map<string, any>();
  for (const c of ctx) { c.decisions.filter((d) => d.id).forEach((d) => decisions.set(d.id, d)); c.incidents.filter((i) => i.id).forEach((i) => incidents.set(i.id, { ...i, service: c.service })); }
  const histPkgs = hist.filter((h) => h.incidents.length || h.decisions.length);
  for (const h of hist) h.decisions.forEach((id) => decisions.has(id) || decisions.set(id, { id }));
  await finding(inv, "Cartographer", "context", `${decisions.size} decisions and ${incidents.size} past incidents touch the exposed services`,
    [...decisions.keys()].map((d) => `Decision:${d}`).concat([...incidents.keys()].map((i) => `Incident:${i}`)), { decisions: [...decisions.values()], incidents: [...incidents.values()], packages: hist });
  yield { type: "agent", agent: "Cartographer", phase: "done", ms: ms3, rows: ctx.length,
    text: `Owners: ${[...new Set(hits.map((h) => h.team))].join(", ") || "—"}. ${decisions.size} ADRs, ${incidents.size} past incidents on these services${histPkgs.length ? `; package history on ${histPkgs.map((h) => h.package).join(", ")}` : ""}.`,
    highlight: { nodes: [...new Set(hits.flatMap((h) => [`Team:${h.teamId}`, `Person:${h.oncallId}`]))].concat([...decisions.keys()].map((d) => `Decision:${d}`), [...incidents.keys()].map((i) => `Incident:${i}`)), paths: [] } };

  // ---------------- Commander ----------------
  yield { type: "agent", agent: "Commander", phase: "start", text: llm ? `Writing the incident brief with ${llm.model} (grounded on graph evidence only)…` : "Writing the incident brief (deterministic mode — no model key configured)…" };
  const t4 = Date.now();
  const claims = deterministicClaims(adv, hits, decisions, incidents, hist, opened);
  const sorted = [...hits].sort((a, b) => a.tier - b.tier);
  let headline = hits.length
    ? `${adv.aliases?.[0] || adv.id} reaches ${services.length} service${services.length > 1 ? "s" : ""}${tier1.length ? ` — ${tier1.length} tier-1` : ""}. Page ${[...new Set(sorted.filter((h) => h.tier === 1).map((h) => h.oncall))].slice(0, 3).join(", ") || sorted[0]?.oncall}.`
    : `${adv.aliases?.[0] || adv.id}: no exposure. Nothing to page.`;
  let finalClaims = claims; let mode: "llm" | "deterministic" = "deterministic"; let fallback: string | undefined; let dropped = 0;
  if (llm && hits.length) {
    const allowed = new Set(claims.flatMap((c) => c.evidence));
    // every entity the model may mention: evidence keys plus people/team/decision/incident names from the facts
    const known = new Set<string>([...allowed].map((e) => strip(e).toLowerCase()));
    hits.forEach((h) => [h.service, h.team, h.oncall, h.vulnerable, h.channel, ...h.path.map(strip)].forEach((x) => x && known.add(String(x).toLowerCase())));
    [...decisions.values()].forEach((d) => [d.id, d.by].forEach((x) => x && known.add(String(x).toLowerCase())));
    [...incidents.values()].forEach((i) => [i.id, i.lead, i.service].forEach((x) => x && known.add(String(x).toLowerCase())));
    hist.forEach((h) => [h.package, ...h.maintainers].forEach((x: string) => x && known.add(x.toLowerCase())));
    (adv.fixed || []).forEach((f) => known.add(f.toLowerCase()));
    adv.aliases?.forEach((a) => known.add(a.toLowerCase())); known.add(adv.id.toLowerCase());
    const res = await chatJSON(
      "You are Commander, an incident-response lead. Write a crisp incident brief ONLY from the facts given. Do not invent services, versions, people, CVEs or numbers. Every claim must cite 1+ evidence ids copied exactly from draftClaims[].evidence. Output JSON {headline:string, claims:[{text:string, evidence:string[], tone:'critical'|'warn'|'info'|'ok'}]} with 5-8 claims covering: exposure, who to page, fix/upgrade path, relevant decisions, history, maintainer risk, next action.",
      JSON.stringify({ advisory: adv, exposures: hits, decisions: [...decisions.values()], incidents: [...incidents.values()], packageHistory: hist, memory: opened, draftClaims: claims })
    );
    const out = res.data as { headline?: string; claims?: Claim[] } | null;
    if (Array.isArray(out?.claims) && out.claims.length) {
      // grounding guard: keep only claims whose evidence is real AND whose pkg@version / ID-like tokens exist in the facts
      const grounded = (text: string) => (text.match(/[@\w./-]+@\d[\w.-]*|\b(?:GHSA|CVE|ADR|INC)-[\w-]+/gi) || []).every((tok) => known.has(tok.replace(/[.,;:)]+$/, "").toLowerCase()));
      const kept = out.claims
        .filter((c) => c && typeof c.text === "string" && Array.isArray(c.evidence))
        .map((c) => ({ ...c, evidence: c.evidence.filter((e) => allowed.has(e)) }))
        .filter((c) => c.text && c.evidence.length && grounded(c.text));
      dropped = out.claims.length - kept.length;
      if (kept.length >= 3) {
        finalClaims = kept; mode = "llm";
        if (typeof out.headline === "string" && grounded(out.headline)) headline = out.headline;
      } else fallback = `model output failed grounding (${dropped} claims dropped)`;
    } else fallback = res.error || "empty model response";
  }
  for (const c of finalClaims) await finding(inv, "Commander", "brief", c.text, c.evidence, { tone: c.tone });
  await q(Q.supersede, { inv, kind: "brief" }, false).catch(() => {});
  await q(Q.closeInvestigation, { inv, now: now(), serviceCount: services.length, severity: sev, mode }, false);
  yield { type: "brief", headline, severity: sev, claims: finalClaims, mode, model: mode === "llm" ? llm?.model : undefined, fallback, dropped };
  yield { type: "agent", agent: "Commander", phase: "done", ms: Date.now() - t4, rows: finalClaims.length,
    text: `Brief filed to investigation ${inv}. ${finalClaims.length} claims, each linked to graph evidence.${mode === "llm" ? ` Written by ${llm?.model}${dropped ? `; ${dropped} ungrounded claim${dropped > 1 ? "s" : ""} dropped` : ""}.` : fallback ? ` AI fallback → deterministic (${fallback}).` : ""}` };
  yield { type: "done", investigation: inv, ms: Date.now() - t0 };
}

function deterministicClaims(adv: Adv, hits: Hit[], decisions: Map<string, any>, incidents: Map<string, any>, hist: any[], opened?: any): Claim[] {
  const claims: Claim[] = [];
  if (!hits.length) return [{ text: `No service in the graph reaches ${adv.versions.join(", ")}. No action needed; keep the advisory on watch.`, evidence: [`Advisory:${adv.id}`], tone: "ok" }];
  const byService = new Map<string, Hit>();
  for (const h of hits) if (!byService.has(h.service) || byService.get(h.service)!.hops > h.hops) byService.set(h.service, h);
  const exp = [...byService.values()].sort((a, b) => a.tier - b.tier || a.hops - b.hops);
  for (const h of exp.slice(0, 4))
    claims.push({ tone: h.tier === 1 ? "critical" : "warn", evidence: h.path,
      text: `${h.service} (tier ${h.tier}, ${h.team}) is exposed: ${h.path.map((p) => p.split(":").slice(1).join(":")).join(" → ")}.` });
  if (exp.length > 4) claims.push({ tone: "warn", evidence: exp.slice(4).flatMap((h) => h.path), text: `Also exposed: ${exp.slice(4).map((h) => h.service).join(", ")}.` });
  const pages = exp.filter((h) => h.tier === 1);
  if (pages.length) claims.push({ tone: "critical", evidence: pages.flatMap((h) => [`Person:${h.oncallId}`, `Team:${h.teamId}`]),
    text: `Page now: ${[...new Map(pages.map((h) => [h.oncallId, `${h.oncall} (${h.service}, ${h.channel})`])).values()].join("; ")}.` });
  const roots = [...new Set(exp.map((h) => h.path[1]?.split(":").slice(1).join(":")).filter(Boolean))];
  const fixed = (adv.fixed || []).filter((f) => adv.packages.includes(pkgOf(f)));
  claims.push({ tone: "info", evidence: [...new Set(exp.map((h) => h.path[1]))].filter(Boolean),
    text: `Fix path: ${fixed.length ? `the patched release is ${[...new Set(fixed)].slice(-2).join(" / ")}` : "no patched release listed yet"}. ${roots.some((r) => r !== exp[0].vulnerable) ? `It arrives transitively, so bump the direct deps: ${roots.join(", ")} (or add an override for ${adv.packages.join(", ")}).` : `Bump ${roots.join(", ")} directly.`}` });
  const dec = [...decisions.values()].filter((d) => d.title);
  if (dec.length) claims.push({ tone: "info", evidence: dec.map((d) => `Decision:${d.id}`), text: `Decisions in play: ${dec.slice(0, 3).map((d) => `${d.id} "${d.title}" (${d.by})`).join("; ")}.` });
  const inc = [...incidents.values()];
  if (inc.length) claims.push({ tone: "warn", evidence: inc.map((i) => `Incident:${i.id}`), text: `Past incidents on these services: ${inc.slice(0, 3).map((i) => `${i.id} "${i.title}" on ${i.service} (${i.date}, led by ${i.lead})`).join("; ")}.` });
  const solo = hist.filter((h) => adv.packages.includes(h.package));
  if (solo.length) claims.push({ tone: solo.some((s) => s.maintainerCount === 1) ? "warn" : "info", evidence: [`Advisory:${adv.id}`],
    text: `Maintainers of ${solo.map((s) => s.package).join(", ")}: ${solo.map((s) => `${s.maintainers.join(", ") || "unknown"} (${s.maintainerCount} with publish rights)`).join("; ")}.` });
  if (opened?.previous) {
    const now = new Set(exp.map((h) => h.service)).size, then = opened.previousServiceCount;
    claims.push({ tone: then != null && now > then ? "critical" : "ok", evidence: [`Advisory:${adv.id}`],
      text: `Since investigation ${opened.previous}: ${then ?? "?"} → ${now} exposed services. ${then != null && now > then ? "Exposure grew." : then != null && now < then ? "Exposure shrank." : "No change. Previous brief superseded."}` });
  }
  return claims;
}
