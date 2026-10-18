import { q } from './db';
import { Q } from './queries';
export async function impact(id: string) {
  const [advisory] = await q<any>(Q.advisory, { id });
  if (!advisory) return null;
  const hits = await q<any>(Q.blastRadius, { id });
  // Include every edge on a route to an affected version, not only a shortest path.
  const edges = await q<any>(`MATCH (a:Advisory {id:$id})-[:AFFECTS]->(v:Version)
MATCH (s:Service)-[:DEPLOYS|DEPENDS_ON*1..12]->(v)
WITH DISTINCT s,v
MATCH (s)-[:DEPLOYS|DEPENDS_ON*0..12]->(x)-[r:DEPLOYS|DEPENDS_ON]->(y)-[:DEPENDS_ON*0..12]->(v)
RETURN DISTINCT labels(x)[0]+':'+coalesce(x.key,x.id) AS source, labels(y)[0]+':'+coalesce(y.key,y.id) AS target`, { id });
  const nodeList: string[] = [`Advisory:${id}`, ...advisory.versions.map((v: string) => `Version:${v}`), ...edges.flatMap(e => [e.source,e.target])];
  const linkList: string[] = [...edges.map(e => `${e.source}>${e.target}`), ...advisory.versions.map((v: string) => `Advisory:${id}>Version:${v}`)];
  for (const h of hits) {
    nodeList.push(`Service:${h.service}`, `Team:${h.teamId}`);
    linkList.push(`Team:${h.teamId}>Service:${h.service}`);
    if(h.oncallId) {nodeList.push(`Person:${h.oncallId}`);linkList.push(`Person:${h.oncallId}>Service:${h.service}`);}
  }
  const nodes = [...new Set(nodeList)], links = [...new Set(linkList)];
  const services = [...new Map(hits.map(h => [h.service,h])).values()];
  return { advisory, services, nodes, links, paths: hits.map(h=>h.path), tier1: services.filter(h=>h.tier===1).length };
}
