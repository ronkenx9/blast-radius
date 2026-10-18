/**
 * Idempotent seed: fetches real public npm data (deps.dev + OSV + npm registry),
 * caches it under data/cache (so re-seeding is offline and takes seconds),
 * then rebuilds the FalkorDB graph from scratch.
 *   npx tsx scripts/seed.ts            # use cache, fetch what's missing
 *   npx tsx scripts/seed.ts --refresh  # re-fetch everything
 */
import fs from "node:fs";
import path from "node:path";
import { FalkorDB } from "falkordb";
import { connOptions, GRAPH } from "../src/lib/db";
import { investigate } from "../src/lib/agents";

const ROOT = path.resolve(__dirname, "..");
const CACHE = path.join(ROOT, "data/cache");
const company = JSON.parse(fs.readFileSync(path.join(ROOT, "data/company.json"), "utf8"));
const REFRESH = process.argv.includes("--refresh");
fs.mkdirSync(CACHE, { recursive: true });

function cached<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const f = path.join(CACHE, name);
  if (!REFRESH && fs.existsSync(f)) return Promise.resolve(JSON.parse(fs.readFileSync(f, "utf8")));
  return fn().then((v) => {
    fs.writeFileSync(f, JSON.stringify(v, null, 1));
    return v;
  });
}

async function getJSON(url: string, init?: RequestInit, tries = 3): Promise<any> {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, init);
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      return await r.json();
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise((s) => setTimeout(s, 800 * (i + 1)));
    }
  }
}

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k]);
      }
    })
  );
  return out;
}

const split = (spec: string) => {
  const at = spec.lastIndexOf("@");
  return { name: spec.slice(0, at), version: spec.slice(at + 1) };
};

type DepGraph = { root: string; nodes: string[]; edges: [number, number][] };

async function main() {
  const t0 = Date.now();
  const directSpecs: string[] = [...new Set<string>(company.services.flatMap((s: any) => s.deps))];

  // 1. Resolved dependency graphs from deps.dev
  const depGraphs: DepGraph[] = await cached("depsdev.json", () =>
    pool(directSpecs, 6, async (spec) => {
      const { name, version } = split(spec);
      const d = await getJSON(
        `https://api.deps.dev/v3/systems/npm/packages/${encodeURIComponent(name)}/versions/${encodeURIComponent(version)}:dependencies`
      );
      if (!d) return { root: spec, nodes: [spec], edges: [] };
      const nodes = d.nodes.map((n: any) => `${n.versionKey.name}@${n.versionKey.version}`);
      return { root: spec, nodes, edges: d.edges.map((e: any) => [e.fromNode, e.toNode]) };
    })
  );
  const versions = new Set<string>();
  const depEdges = new Set<string>();
  for (const g of depGraphs) {
    g.nodes.forEach((n) => versions.add(n));
    g.edges.forEach(([a, b]) => depEdges.add(`${g.nodes[a]}|${g.nodes[b]}`));
  }
  const versionList = [...versions].sort();
  const packages = [...new Set(versionList.map((v) => split(v).name))].sort();
  console.log(`deps.dev: ${directSpecs.length} roots -> ${versionList.length} versions, ${depEdges.size} edges, ${packages.length} packages`);

  // 2. OSV advisories per exact resolved version
  const osvHits: Record<string, string[]> = await cached("osv-hits.json", async () => {
    const hits: Record<string, string[]> = {};
    for (let i = 0; i < versionList.length; i += 500) {
      const chunk = versionList.slice(i, i + 500);
      const r = await getJSON("https://api.osv.dev/v1/querybatch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ queries: chunk.map((v) => ({ package: { ...{ name: split(v).name }, ecosystem: "npm" }, version: split(v).version })) }),
      });
      r.results.forEach((res: any, k: number) => {
        if (res.vulns?.length) hits[chunk[k]] = res.vulns.map((x: any) => x.id);
      });
    }
    return hits;
  });
  const vulnIds = [...new Set(Object.values(osvHits).flat())].sort();
  const advisories: any[] = await cached("osv-vulns.json", () =>
    pool(vulnIds, 8, async (id) => {
      const v = await getJSON(`https://api.osv.dev/v1/vulns/${id}`);
      if (!v) return null;
      const fixed: string[] = [];
      for (const a of v.affected || [])
        for (const r of a.ranges || []) for (const e of r.events || []) if (e.fixed) fixed.push(`${a.package?.name}@${e.fixed}`);
      return {
        id: v.id,
        summary: (v.summary || v.details || "").slice(0, 240),
        details: (v.details || "").slice(0, 1200),
        severity: v.database_specific?.severity || (v.id.startsWith("MAL-") ? "CRITICAL" : "UNKNOWN"),
        aliases: (v.aliases || []).filter((a: string) => a.startsWith("CVE-") || a.startsWith("GHSA-")),
        published: v.published || "",
        url: (v.references || []).find((r: any) => r.type === "ADVISORY")?.url || `https://osv.dev/vulnerability/${v.id}`,
        fixed: [...new Set(fixed)],
      };
    }).then((xs) => xs.filter(Boolean))
  );
  console.log(`osv: ${Object.keys(osvHits).length} vulnerable versions, ${advisories.length} advisories`);

  // 3. npm maintainers (usernames only — emails are dropped, never stored)
  const maintainers: Record<string, string[]> = await cached("npm-maintainers.json", async () => {
    const out: Record<string, string[]> = {};
    const pick = new Map<string, string>();
    for (const v of versionList) pick.set(split(v).name, v); // latest-sorted version per package
    await pool([...pick.entries()], 8, async ([name, v]) => {
      const d = await getJSON(`https://registry.npmjs.org/${name.replace("/", "%2f")}/${split(v).version}`);
      out[name] = ((d?.maintainers || []) as any[]).map((m) => (typeof m === "string" ? m.split(" ")[0] : m.name)).filter(Boolean);
    });
    return out;
  });

  // 4. Rebuild graph
  const c = connOptions();
  const db = await FalkorDB.connect({ username: c.username, password: c.password, socket: { host: c.host, port: c.port, tls: c.tls } as never });
  const graph = db.selectGraph(GRAPH);
  // keep agent memory across reseeds? No: seed is a clean rebuild. Memory is demo-seeded below.
  try { await graph.delete(); } catch {}
  const run = (cy: string, params: Record<string, unknown> = {}) => graph.query(cy, { params: params as never });
  const batch = async (cy: string, rows: unknown[], size = 500) => {
    for (let i = 0; i < rows.length; i += size) await run(cy, { rows: rows.slice(i, i + size) });
  };

  for (const [label, prop] of [["Package", "name"], ["Version", "key"], ["Service", "id"], ["Team", "id"], ["Person", "id"], ["Maintainer", "npm"], ["Advisory", "id"], ["Incident", "id"], ["Decision", "id"], ["Investigation", "id"], ["Finding", "id"], ["Agent", "name"]])
    await run(`CREATE INDEX FOR (n:${label}) ON (n.${prop})`).catch(() => {});

  const pkgHasVuln = new Set(Object.keys(osvHits).map((v) => split(v).name));
  await batch(`UNWIND $rows AS r CREATE (:Package {name:r.name, maintainerCount:r.mc, vulnerable:r.vuln})`,
    packages.map((name) => ({ name, mc: (maintainers[name] || []).length, vuln: pkgHasVuln.has(name) })));
  await batch(`UNWIND $rows AS r MATCH (p:Package {name:r.pkg}) CREATE (p)-[:HAS_VERSION]->(:Version {key:r.key, pkg:r.pkg, ver:r.ver, direct:r.direct, vulnerable:r.vuln})`,
    versionList.map((key) => ({ key, ...{ pkg: split(key).name, ver: split(key).version }, direct: directSpecs.includes(key), vuln: !!osvHits[key] })));
  await batch(`UNWIND $rows AS r MATCH (a:Version {key:r.a}), (b:Version {key:r.b}) CREATE (a)-[:DEPENDS_ON]->(b)`,
    [...depEdges].map((e) => { const [a, b] = e.split("|"); return { a, b }; }));
  const mRows = Object.entries(maintainers).flatMap(([pkg, ms]) => ms.map((npm) => ({ pkg, npm })));
  await batch(`UNWIND $rows AS r MERGE (m:Maintainer {npm:r.npm}) WITH m, r MATCH (p:Package {name:r.pkg}) CREATE (m)-[:MAINTAINS]->(p)`, mRows);
  await batch(`UNWIND $rows AS r CREATE (:Advisory {id:r.id, summary:r.summary, details:r.details, severity:r.severity, aliases:r.aliases, published:r.published, url:r.url, fixed:r.fixed})`, advisories);
  await batch(`UNWIND $rows AS r MATCH (a:Advisory {id:r.id}), (v:Version {key:r.key}) CREATE (a)-[:AFFECTS]->(v)`,
    Object.entries(osvHits).flatMap(([key, ids]) => ids.map((id) => ({ id, key }))));

  // company layer
  await run(`CREATE (:Company {name:$name, tagline:$tagline})`, company.company);
  await batch(`UNWIND $rows AS r MATCH (c:Company) CREATE (c)-[:HAS_TEAM]->(:Team {id:r.id, name:r.name, channel:r.channel})`, company.teams);
  await batch(`UNWIND $rows AS r MATCH (t:Team {id:r.team}) CREATE (:Person {id:r.id, name:r.name, role:r.role})-[:MEMBER_OF]->(t)`, company.people);
  await batch(`UNWIND $rows AS r MATCH (t:Team {id:r.team}) CREATE (t)-[:OWNS]->(:Service {id:r.id, name:r.id, tier:r.tier, desc:r.desc})`, company.services);
  await batch(`UNWIND $rows AS r MATCH (s:Service {id:r.id}), (p:Person {id:r.oncall}) CREATE (p)-[:ON_CALL]->(s)`, company.services);
  await batch(`UNWIND $rows AS r MATCH (s:Service {id:r.svc}), (v:Version {key:r.dep}) CREATE (s)-[:DEPLOYS]->(v)`,
    company.services.flatMap((s: any) => s.deps.map((dep: string) => ({ svc: s.id, dep }))));
  await batch(`UNWIND $rows AS r MATCH (p:Person {id:r.lead}) CREATE (i:Incident {id:r.id, title:r.title, date:r.date, summary:r.summary, package:r.package})-[:LED_BY]->(p)
     WITH i, r OPTIONAL MATCH (pk:Package {name:r.package}) FOREACH (_ IN CASE WHEN pk IS NULL THEN [] ELSE [1] END | CREATE (i)-[:CAUSED_BY]->(pk))`, company.incidents);
  await batch(`UNWIND $rows AS r UNWIND r.services AS sid MATCH (i:Incident {id:r.id}), (s:Service {id:sid}) CREATE (i)-[:INVOLVED]->(s)`, company.incidents);
  await batch(`UNWIND $rows AS r MATCH (p:Person {id:r.by}) CREATE (d:Decision {id:r.id, title:r.title, text:r.text})-[:DECIDED_BY]->(p)`, company.decisions);
  await batch(`UNWIND $rows AS r UNWIND r.about AS sid MATCH (d:Decision {id:r.id}), (s:Service {id:sid}) CREATE (d)-[:ABOUT]->(s)`, company.decisions);
  await batch(`UNWIND $rows AS r UNWIND r.packages AS pk MATCH (d:Decision {id:r.id}), (p:Package {name:pk}) CREATE (d)-[:ABOUT]->(p)`, company.decisions);
  for (const [name, role] of [["Scout", "Ingests advisories"], ["Tracer", "Walks dependency paths"], ["Cartographer", "Maps owners, on-call, decisions, history"], ["Commander", "Writes the incident brief"]])
    await run(`CREATE (:Agent {name:$name, role:$role})`, { name, role });

  const counts = await graph.query<{ label: string; n: number }>(`MATCH (n) RETURN labels(n)[0] AS label, count(n) AS n ORDER BY n DESC`);
  const rels = await graph.query<{ n: number }>(`MATCH ()-[r]->() RETURN count(r) AS n`);
  console.log("graph:", counts.data?.map((r) => `${r.label}=${r.n}`).join(" "), `| relationships=${rels.data?.[0]?.n}`);
  console.log(`seeded '${GRAPH}' in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  await db.close();

  // Seed agent memory: a deterministic investigation "from yesterday" so the Resume + memory demo works on a fresh DB.
  const FEATURED = process.env.FEATURED_ADVISORY || "GHSA-6rw7-vpxm-498p";
  let inv = "";
  for await (const e of investigate(FEATURED, { useLLM: false })) if (e.type === "done") inv = e.investigation;
  const db2 = await FalkorDB.connect({ username: c.username, password: c.password, socket: { host: c.host, port: c.port, tls: c.tls } as never });
  const y = new Date(Date.now() - 26 * 3600e3).toISOString();
  // back-date it 26h so "Memory" shows a real prior run (its findings are the real deterministic output)
  await db2.selectGraph(GRAPH).query(`MATCH (i:Investigation {id:$inv}) SET i.started = $y, i.closed = $y
    WITH i MATCH (i)-[:HAS_FINDING]->(f) SET f.ts = $y`, { params: { inv, y } as never });
  console.log(`memory: seeded prior investigation ${inv} on ${FEATURED}`);
  await db2.close();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
