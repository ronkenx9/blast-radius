import { q } from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const ID = "labels(n)[0] + ':' + coalesce(n.key, n.id, n.npm, n.name)";
export async function GET() {
  try {
    const [nodes, links] = await Promise.all([
      q<any>(`MATCH (n) WHERE NOT n:Alert AND NOT n:AlertSettings AND NOT n:Monitor AND NOT n:Finding AND NOT n:Investigation AND NOT n:Agent
        RETURN ${ID} AS id, labels(n)[0] AS label, coalesce(n.name, n.key, n.id, n.npm) AS name,
        n.tier AS tier, n.severity AS severity, n.vulnerable AS vulnerable, n.direct AS direct, n.maintainerCount AS mc, n.title AS title`),
      q<any>(`MATCH (a)-[r]->(b) WHERE NOT a:Finding AND NOT a:Investigation AND NOT a:Agent AND NOT b:Investigation AND NOT b:Finding
        RETURN ${ID.replaceAll("n)", "a)").replaceAll("n.", "a.")} AS source, ${ID.replaceAll("n)", "b)").replaceAll("n.", "b.")} AS target, type(r) AS type`),
    ]);
    return Response.json({ nodes, links });
  } catch (e: any) {
    return Response.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
