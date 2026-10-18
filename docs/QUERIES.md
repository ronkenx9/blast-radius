# Cypher and graph algorithms

The source of truth is [`src/lib/queries.ts`](../src/lib/queries.ts). The application uses parameters through the official FalkorDB Node client; it does not interpolate user input into Cypher. [`src/lib/impact.ts`](../src/lib/impact.ts) adds the all-branches incident-map query. Alert and monitor state queries live in [`alerts.ts`](../src/lib/alerts.ts) and [`monitor.ts`](../src/lib/monitor.ts).

The examples below use the `CYPHER` parameter prefix accepted by FalkorDB. Select the seeded `blast_radius` graph in FalkorDB Browser and paste an example. All examples marked **Read-only** can be run against the demo without creating investigations. The write examples show how the app persists memory; use a dedicated test graph for manual writes.

## Run the actual application query from Node

After the README's Node 22 / database setup, this command loads `.env.local`, executes the production query and closes the connection:

```sh
node --import tsx <<'JS'
require('@next/env').loadEnvConfig(process.cwd());
const { q, getDb } = require('./src/lib/db.ts');
const { Q } = require('./src/lib/queries.ts');
(async () => {
  console.table(await q(Q.blastRadius, { id: 'GHSA-6rw7-vpxm-498p' }));
  await (await getDb()).close();
})().catch(error => { console.error(error.message); process.exit(1); });
JS
```

## 1. Advisory and affected exact versions

**Read-only.** `Q.advisory` joins the advisory to exact versions, packages and cached maintainer handles. The featured snapshot returns `qs@6.5.5` and `qs@6.7.0`, alias `CVE-2025-15284`, and a recorded fixed release of `qs@6.14.1`.

<!-- read-only-query -->
```cypher
CYPHER id='GHSA-6rw7-vpxm-498p'
MATCH (a:Advisory {id:$id})-[:AFFECTS]->(v:Version)<-[:HAS_VERSION]-(pk:Package)
OPTIONAL MATCH (m:Maintainer)-[:MAINTAINS]->(pk)
RETURN a.id AS id, a.summary AS summary, a.severity AS severity, a.aliases AS aliases,
       a.published AS published, a.url AS url, a.fixed AS fixed,
       collect(DISTINCT v.key) AS versions, collect(DISTINCT pk.name) AS packages,
       collect(DISTINCT m.npm) AS maintainers
```

## 2. Exposed services, shortest evidence paths and people

**Read-only.** `Q.blastRadius` first bounds service reachability to 12 dependency/deployment edges, then returns a shortest path for each distinct service / affected-version pair. It joins ownership and on-call data in the same query. Multiple rows can represent one service, so the UI counts distinct service IDs.

<!-- read-only-query -->
```cypher
CYPHER id='GHSA-6rw7-vpxm-498p'
MATCH (a:Advisory {id:$id})-[:AFFECTS]->(v:Version)
MATCH (s:Service)-[:DEPLOYS|DEPENDS_ON*1..12]->(v)
WITH DISTINCT s, v
WITH s, v, shortestPath((s)-[:DEPLOYS|DEPENDS_ON*]->(v)) AS p
MATCH (t:Team)-[:OWNS]->(s)
OPTIONAL MATCH (oc:Person)-[:ON_CALL]->(s)
RETURN s.id AS service, s.tier AS tier, s.desc AS desc, t.id AS teamId, t.name AS team,
       t.channel AS channel, oc.id AS oncallId, oc.name AS oncall, v.key AS vulnerable,
       length(p) AS hops, [n IN nodes(p) | labels(n)[0] + ':' + coalesce(n.key, n.id)] AS path
ORDER BY tier, hops, service
```

The featured snapshot returns `auth-service`, `kyc-worker`, `payments-api`, `notifications` and `reporting`; the first three are tier 1. These are graph-reachable services, not confirmed exploited services.

## 3. Every connecting branch for the incident map

**Read-only.** This is the query from `impact()`. After identifying the reachable service/version pairs, it collects individual edges along connecting routes rather than choosing one shortest route. Application code adds the advisory's AFFECTS links, team ownership and on-call links, then deduplicates nodes and edges.

<!-- read-only-query -->
```cypher
CYPHER id='GHSA-6rw7-vpxm-498p'
MATCH (a:Advisory {id:$id})-[:AFFECTS]->(v:Version)
MATCH (s:Service)-[:DEPLOYS|DEPENDS_ON*1..12]->(v)
WITH DISTINCT s,v
MATCH (s)-[:DEPLOYS|DEPENDS_ON*0..12]->(x)-[r:DEPLOYS|DEPENDS_ON]->(y)-[:DEPENDS_ON*0..12]->(v)
RETURN DISTINCT labels(x)[0]+':'+coalesce(x.key,x.id) AS source, labels(y)[0]+':'+coalesce(y.key,y.id) AS target
```

The complete featured map has 20 nodes and 21 edges after the company/advisory links are added. The initial service exposure search is bounded to 12 hops; each branch search uses the bounds shown above. This is not an unbounded whole-network reachability guarantee.

## 4. Decisions and history around the exposed services

**Read-only.** `Q.context` joins company decisions, decision authors, previous incidents and incident leads. An OPTIONAL MATCH can yield a map containing null fields; the app filters entries lacking an `id` before writing the brief.

<!-- read-only-query -->
```cypher
CYPHER services=['auth-service','kyc-worker','payments-api','notifications','reporting']
MATCH (s:Service) WHERE s.id IN $services
OPTIONAL MATCH (d:Decision)-[:ABOUT]->(s)
OPTIONAL MATCH (d)-[:DECIDED_BY]->(dp:Person)
WITH s, collect(DISTINCT {id:d.id, title:d.title, text:d.text, by:dp.name}) AS decisions
OPTIONAL MATCH (i:Incident)-[:INVOLVED]->(s)
OPTIONAL MATCH (i)-[:LED_BY]->(lead:Person)
RETURN s.id AS service, decisions,
       collect(DISTINCT {id:i.id, title:i.title, date:i.date, package:i.package, lead:lead.name}) AS incidents
```

## 5. Maintainer concentration with PageRank and reachability

**Read-only.** `Q.maintainerRisk` runs `algo.pageRank` on the directed Version / DEPENDS_ON subgraph. It takes the maximum version score per package, sums those scores per maintainer and counts distinct reachable services. Final ordering is service count first, influence second. `soloPkgs` is the number of reachable packages whose cached metadata lists exactly one maintainer.

<!-- read-only-query -->
```cypher
CYPHER limit=5
CALL algo.pageRank('Version','DEPENDS_ON') YIELD node, score
MATCH (pk:Package)-[:HAS_VERSION]->(node)
MATCH (s:Service)-[:DEPLOYS|DEPENDS_ON*1..12]->(node)
MATCH (m:Maintainer)-[:MAINTAINS]->(pk)
WITH m, pk, max(score) AS rank, collect(DISTINCT s.id) AS svcs
WITH m, sum(rank) AS influence, collect(pk.name) AS pkgs, collect(svcs) AS svcLists,
     sum(CASE WHEN pk.maintainerCount = 1 THEN 1 ELSE 0 END) AS soloPkgs
UNWIND reduce(acc = [], x IN svcLists | acc + x) AS sid
WITH m, influence, pkgs, soloPkgs, collect(DISTINCT sid) AS services
RETURN m.npm AS maintainer, influence, size(pkgs) AS packages, pkgs[0..6] AS samplePackages,
       soloPkgs, size(services) AS serviceCount, services
ORDER BY serviceCount DESC, influence DESC LIMIT $limit
```

The checked snapshot's first row is `ljharb`: 54 packages, 29 with one listed maintainer, reaching 8 of 10 services. This describes concentration in the selected dataset. It does not establish current npm privileges, malicious activity or a probability of compromise. Package sample order is not guaranteed.

## 6. Recall previous investigations

**Read-only.** `Q.listInvestigations` powers the Memory view and the matching MCP tool. It returns the most recent 20 runs with their previous-run link and finding count.

<!-- read-only-query -->
```cypher
MATCH (i:Investigation)-[:ABOUT]->(a:Advisory)
OPTIONAL MATCH (i)-[:FOLLOWS_UP]->(p:Investigation)
OPTIONAL MATCH (i)-[:HAS_FINDING]->(f:Finding)
RETURN i.id AS id, a.id AS advisory, a.summary AS summary, i.status AS status, i.started AS started,
       i.serviceCount AS serviceCount, i.severity AS severity, i.mode AS mode, p.id AS previous, count(f) AS findings
ORDER BY started DESC LIMIT 20
```

## 7. Inspect persisted evidence without knowing a run ID

**Read-only.** This read-only inspection example selects the latest investigation, then uses the same finding/agent/evidence pattern as `Q.investigationFindings`. The application query takes an explicit `$id` instead.

<!-- read-only-query -->
```cypher
MATCH (i:Investigation)
WITH i ORDER BY i.started DESC LIMIT 1
MATCH (i)-[:HAS_FINDING]->(f:Finding)<-[:WROTE]-(ag:Agent)
OPTIONAL MATCH (f)-[:EVIDENCE]->(n)
OPTIONAL MATCH (f)-[:SUPERSEDES]->(old:Finding)
RETURN i.id AS investigation, f.id AS finding, ag.name AS agent, f.kind AS kind, f.ts AS ts,
       f.text AS text, collect(DISTINCT labels(n)[0] + ':' + coalesce(n.key,n.id)) AS evidence,
       collect(DISTINCT old.id) AS supersedes
ORDER BY ts
```

## How the app writes persistent memory

These are **write queries**, invoked by the investigation workflow with fresh IDs. They are included for architecture review; do not paste the illustrative fixed ID repeatedly into a shared graph.

### Open a run and connect its predecessor

`Q.openInvestigation` takes `$advisory`, `$id`, `$now` and `$mode`. The application's values are generated per run. This example creates a test run and leaves it open:

```cypher
CYPHER advisory='GHSA-6rw7-vpxm-498p' id='docs-example-run' now='2026-10-18T12:00:00.000Z' mode='deterministic'
MATCH (a:Advisory {id:$advisory})
OPTIONAL MATCH (prev:Investigation)-[:ABOUT]->(a)
WITH a, prev ORDER BY prev.started DESC
WITH a, collect(prev)[0] AS last
CREATE (i:Investigation {id:$id, advisory:$advisory, status:'open', started:$now, mode:$mode})-[:ABOUT]->(a)
FOREACH (_ IN CASE WHEN last IS NULL THEN [] ELSE [1] END | CREATE (i)-[:FOLLOWS_UP]->(last))
RETURN i.id AS id, last.id AS previous, last.started AS previousStarted, last.serviceCount AS previousServiceCount
```

### Persist a finding and its evidence

`Q.writeFinding` writes a finding associated with the investigation and producing agent, then links matching evidence entities. `$data` is serialized JSON. `$evidence` contains raw entity IDs/keys; the app strips display prefixes such as `Service:` before the call.

```cypher
CYPHER inv='docs-example-run' agent='Tracer' id='docs-example-finding' kind='exposure' text='payments-api reaches qs@6.7.0 through express@4.17.1.' now='2026-10-18T12:00:01.000Z' data='{}' evidence=['payments-api','express@4.17.1','qs@6.7.0']
MATCH (i:Investigation {id:$inv}), (ag:Agent {name:$agent})
CREATE (f:Finding {id:$id, kind:$kind, text:$text, ts:$now, data:$data})
CREATE (ag)-[:WROTE]->(f), (i)-[:HAS_FINDING]->(f)
WITH f
UNWIND $evidence AS ev
MATCH (n) WHERE (n:Service AND n.id = ev) OR (n:Version AND n.key = ev) OR (n:Person AND n.id = ev)
   OR (n:Decision AND n.id = ev) OR (n:Incident AND n.id = ev) OR (n:Advisory AND n.id = ev) OR (n:Team AND n.id = ev)
CREATE (f)-[:EVIDENCE]->(n)
RETURN count(*) AS evidence
```

`Q.supersede` links each new brief finding to previous brief findings of the same kind. `Q.closeInvestigation` marks the run triaged with its service count, severity and final mode. Their exact definitions remain in the linked query registry. This is sequential shared graph memory; it does not claim tenant isolation or concurrent-agent conflict resolution.

## Complete tool/query map

| Registry query | Used for / parameters |
|---|---|
| `advisory` | Advisory facts; `id` |
| `blastRadius` | Exposure paths, ownership and on-call; `id` |
| `context` | Service decisions and incident history; `services` |
| `packageHistory` | Package incidents, decisions and maintainers; `packages` |
| `maintainerRisk` | PageRank plus service reach; `limit` |
| `soloPackages` | Reach of packages with one cached maintainer; `limit` |
| `whoOwns` | Team, people and direct dependencies; `service` |
| `topAdvisories` | Advisory ranking by reachable services; `limit` |
| `searchAdvisories` | Case-insensitive advisory/package search; `q` |
| `openInvestigation` | New run and predecessor link; `advisory`, `id`, `now`, `mode` |
| `writeFinding` | Finding, producing agent and citations; `inv`, `agent`, `id`, `kind`, `text`, `now`, `data`, `evidence` |
| `supersede` | Link replacement findings to prior findings; `inv`, `kind` |
| `closeInvestigation` | Completed run metadata; `inv`, `now`, `serviceCount`, `severity`, `mode` |
| `listInvestigations` | Latest 20 run summaries; none |
| `investigationFindings` | One run's findings and evidence; `id` |

The [MCP tool registry](../src/lib/tools.ts) exposes `top_advisories`, `search_advisories`, `blast_radius`, `who_owns`, `maintainer_risk`, `single_maintainer_packages`, `run_investigation` and `list_investigations`. `run_investigation` is a write-capable multi-step tool; other listed tools read the graph.

Operational queries use `MERGE` on stable Alert/Monitor IDs, time-bounded leases, owner checks and delivery statuses. Email provider requests carry the same stable idempotency key. These queries are parameterized in `alerts.ts` and `monitor.ts`; they are not graph algorithms and do not prove exactly-once delivery under every failure mode.

## Verification

The seven marked read-only examples were executed against the seeded local FalkorDB on 18 October 2026. Their returned paths, five distinct services, three tier-1 services and top maintainer reach were checked. The source queries also run through the integration suite; see [audit evidence](../submission/AUDIT.md). No production seed or write query is required to inspect the examples.
