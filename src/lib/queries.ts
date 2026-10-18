// Every agent tool is one parameterized Cypher query. The text is shipped to the UI ("Explain" panel).
export const Q = {
  advisory: `MATCH (a:Advisory {id:$id})-[:AFFECTS]->(v:Version)<-[:HAS_VERSION]-(pk:Package)
OPTIONAL MATCH (m:Maintainer)-[:MAINTAINS]->(pk)
RETURN a.id AS id, a.summary AS summary, a.severity AS severity, a.aliases AS aliases,
       a.published AS published, a.url AS url, a.fixed AS fixed,
       collect(DISTINCT v.key) AS versions, collect(DISTINCT pk.name) AS packages,
       collect(DISTINCT m.npm) AS maintainers`,

  blastRadius: `MATCH (a:Advisory {id:$id})-[:AFFECTS]->(v:Version)
MATCH (s:Service)-[:DEPLOYS|DEPENDS_ON*1..12]->(v)
WITH DISTINCT s, v
WITH s, v, shortestPath((s)-[:DEPLOYS|DEPENDS_ON*]->(v)) AS p
MATCH (t:Team)-[:OWNS]->(s)
OPTIONAL MATCH (oc:Person)-[:ON_CALL]->(s)
RETURN s.id AS service, s.tier AS tier, s.desc AS desc, t.id AS teamId, t.name AS team,
       t.channel AS channel, oc.id AS oncallId, oc.name AS oncall, v.key AS vulnerable,
       length(p) AS hops, [n IN nodes(p) | labels(n)[0] + ':' + coalesce(n.key, n.id)] AS path
ORDER BY tier, hops, service`,

  context: `MATCH (s:Service) WHERE s.id IN $services
OPTIONAL MATCH (d:Decision)-[:ABOUT]->(s)
OPTIONAL MATCH (d)-[:DECIDED_BY]->(dp:Person)
WITH s, collect(DISTINCT {id:d.id, title:d.title, text:d.text, by:dp.name}) AS decisions
OPTIONAL MATCH (i:Incident)-[:INVOLVED]->(s)
OPTIONAL MATCH (i)-[:LED_BY]->(lead:Person)
RETURN s.id AS service, decisions,
       collect(DISTINCT {id:i.id, title:i.title, date:i.date, package:i.package, lead:lead.name}) AS incidents`,

  packageHistory: `MATCH (pk:Package) WHERE pk.name IN $packages
OPTIONAL MATCH (i:Incident)-[:CAUSED_BY]->(pk)
OPTIONAL MATCH (d:Decision)-[:ABOUT]->(pk)
OPTIONAL MATCH (m:Maintainer)-[:MAINTAINS]->(pk)
RETURN pk.name AS package, pk.maintainerCount AS maintainerCount,
       collect(DISTINCT m.npm) AS maintainers, collect(DISTINCT i.id) AS incidents, collect(DISTINCT d.id) AS decisions`,

  maintainerRisk: `CALL algo.pageRank('Version','DEPENDS_ON') YIELD node, score
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
ORDER BY serviceCount DESC, influence DESC LIMIT $limit`,

  soloPackages: `MATCH (pk:Package {maintainerCount:1})<-[:MAINTAINS]-(m:Maintainer)
MATCH (pk)-[:HAS_VERSION]->(v:Version)<-[:DEPLOYS|DEPENDS_ON*1..12]-(s:Service)
RETURN pk.name AS package, m.npm AS maintainer, collect(DISTINCT v.key) AS versions,
       count(DISTINCT s) AS serviceCount, collect(DISTINCT s.id) AS services
ORDER BY serviceCount DESC, package LIMIT $limit`,

  whoOwns: `MATCH (s:Service {id:$service})<-[:OWNS]-(t:Team)
OPTIONAL MATCH (p:Person)-[:MEMBER_OF]->(t)
OPTIONAL MATCH (oc:Person)-[:ON_CALL]->(s)
OPTIONAL MATCH (s)-[:DEPLOYS]->(d:Version)
RETURN s.id AS service, s.desc AS desc, s.tier AS tier, t.name AS team, t.channel AS channel,
       oc.name AS oncall, collect(DISTINCT p.name + ' (' + p.role + ')') AS people,
       collect(DISTINCT d.key) AS directDeps`,

  topAdvisories: `MATCH (a:Advisory)-[:AFFECTS]->(v:Version)
MATCH (s:Service)-[:DEPLOYS|DEPENDS_ON*1..12]->(v)
WITH a, collect(DISTINCT v.key) AS versions, count(DISTINCT s) AS services
RETURN a.id AS id, a.summary AS summary, a.severity AS severity, a.aliases AS aliases,
       versions, services
ORDER BY services DESC, a.severity, a.id LIMIT $limit`,

  searchAdvisories: `MATCH (a:Advisory)-[:AFFECTS]->(v:Version)
WHERE toLower(a.summary) CONTAINS toLower($q) OR toLower(a.id) CONTAINS toLower($q)
   OR any(x IN a.aliases WHERE toLower(x) CONTAINS toLower($q)) OR toLower(v.pkg) CONTAINS toLower($q)
RETURN DISTINCT a.id AS id, a.summary AS summary, a.severity AS severity, a.aliases AS aliases LIMIT 20`,

  // ---- agent memory (Track 2) ----
  openInvestigation: `MATCH (a:Advisory {id:$advisory})
OPTIONAL MATCH (prev:Investigation)-[:ABOUT]->(a)
WITH a, prev ORDER BY prev.started DESC
WITH a, collect(prev)[0] AS last
CREATE (i:Investigation {id:$id, advisory:$advisory, status:'open', started:$now, mode:$mode})-[:ABOUT]->(a)
FOREACH (_ IN CASE WHEN last IS NULL THEN [] ELSE [1] END | CREATE (i)-[:FOLLOWS_UP]->(last))
RETURN i.id AS id, last.id AS previous, last.started AS previousStarted, last.serviceCount AS previousServiceCount`,

  writeFinding: `MATCH (i:Investigation {id:$inv}), (ag:Agent {name:$agent})
CREATE (f:Finding {id:$id, kind:$kind, text:$text, ts:$now, data:$data})
CREATE (ag)-[:WROTE]->(f), (i)-[:HAS_FINDING]->(f)
WITH f
UNWIND $evidence AS ev
MATCH (n) WHERE (n:Service AND n.id = ev) OR (n:Version AND n.key = ev) OR (n:Person AND n.id = ev)
   OR (n:Decision AND n.id = ev) OR (n:Incident AND n.id = ev) OR (n:Advisory AND n.id = ev) OR (n:Team AND n.id = ev)
CREATE (f)-[:EVIDENCE]->(n)
RETURN count(*) AS evidence`,

  supersede: `MATCH (i:Investigation {id:$inv})-[:FOLLOWS_UP]->(prev:Investigation)-[:HAS_FINDING]->(old:Finding {kind:$kind})
MATCH (i)-[:HAS_FINDING]->(nf:Finding {kind:$kind})
CREATE (nf)-[:SUPERSEDES]->(old) RETURN count(old) AS superseded`,

  closeInvestigation: `MATCH (i:Investigation {id:$inv}) SET i.status = 'triaged', i.closed = $now, i.serviceCount = $serviceCount, i.severity = $severity, i.mode = $mode RETURN i.id AS id`,

  listInvestigations: `MATCH (i:Investigation)-[:ABOUT]->(a:Advisory)
OPTIONAL MATCH (i)-[:FOLLOWS_UP]->(p:Investigation)
OPTIONAL MATCH (i)-[:HAS_FINDING]->(f:Finding)
RETURN i.id AS id, a.id AS advisory, a.summary AS summary, i.status AS status, i.started AS started,
       i.serviceCount AS serviceCount, i.severity AS severity, i.mode AS mode, p.id AS previous, count(f) AS findings
ORDER BY started DESC LIMIT 20`,

  investigationFindings: `MATCH (i:Investigation {id:$id})-[:HAS_FINDING]->(f:Finding)<-[:WROTE]-(ag:Agent)
OPTIONAL MATCH (f)-[:EVIDENCE]->(n)
OPTIONAL MATCH (f)-[:SUPERSEDES]->(old:Finding)
RETURN f.id AS id, ag.name AS agent, f.kind AS kind, f.text AS text, f.ts AS ts, f.data AS data,
       collect(DISTINCT labels(n)[0] + ':' + coalesce(n.key, n.id)) AS evidence, collect(DISTINCT old.id) AS supersedes
ORDER BY ts`,
} as const;

export type QueryName = keyof typeof Q;
