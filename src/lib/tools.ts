import { q } from "./db";
import { Q } from "./queries";
import { investigate } from "./agents";

// Shared tool registry: used by the MCP endpoint (and documented in README).
export const TOOLS = [
  { name: "top_advisories", description: "Advisories ranked by how many company services they reach through the dependency graph.",
    inputSchema: { type: "object", properties: { limit: { type: "number", default: 10 } } },
    run: (a: any) => q(Q.topAdvisories, { limit: Math.min(Number(a.limit) || 10, 50) }), cypher: Q.topAdvisories },
  { name: "search_advisories", description: "Find advisories by CVE/GHSA id, package name or keyword.",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    run: (a: any) => q(Q.searchAdvisories, { q: String(a.query || "") }), cypher: Q.searchAdvisories },
  { name: "blast_radius", description: "Which services reach this advisory's vulnerable versions, by which shortest dependency path, who owns them and who is on call.",
    inputSchema: { type: "object", properties: { advisory_id: { type: "string", description: "GHSA/OSV id, e.g. GHSA-6rw7-vpxm-498p" } }, required: ["advisory_id"] },
    run: (a: any) => q(Q.blastRadius, { id: String(a.advisory_id) }), cypher: Q.blastRadius },
  { name: "who_owns", description: "Team, on-call person, people and direct dependencies of a service.",
    inputSchema: { type: "object", properties: { service: { type: "string" } }, required: ["service"] },
    run: (a: any) => q(Q.whoOwns, { service: String(a.service) }), cypher: Q.whoOwns },
  { name: "maintainer_risk", description: "npm maintainers ranked by how many services they can ship code into (PageRank over DEPENDS_ON + reachability).",
    inputSchema: { type: "object", properties: { limit: { type: "number", default: 10 } } },
    run: (a: any) => q(Q.maintainerRisk, { limit: Math.min(Number(a.limit) || 10, 50) }), cypher: Q.maintainerRisk },
  { name: "single_maintainer_packages", description: "Packages with exactly one publisher that reach the most services.",
    inputSchema: { type: "object", properties: { limit: { type: "number", default: 10 } } },
    run: (a: any) => q(Q.soloPackages, { limit: Math.min(Number(a.limit) || 10, 50) }), cypher: Q.soloPackages },
  { name: "run_investigation", description: "Run the full Scout → Tracer → Cartographer → Commander investigation. Persists findings to the graph (agent memory) and returns the brief.",
    inputSchema: { type: "object", properties: { advisory_id: { type: "string" } }, required: ["advisory_id"] },
    run: async (a: any) => {
      const events: any[] = [];
      for await (const e of investigate(String(a.advisory_id))) if (e.type !== "agent" || e.phase === "done") events.push(e);
      return events.map((event: any) => Object.fromEntries(Object.entries(event).filter(([key]) => key !== "cypher" && key !== "highlight")));
    }, cypher: "(multi-step: see /api/investigate)" },
  { name: "list_investigations", description: "Past investigations stored in the graph (shared agent memory).",
    inputSchema: { type: "object", properties: {} },
    run: () => q(Q.listInvestigations), cypher: Q.listInvestigations },
] as const;
