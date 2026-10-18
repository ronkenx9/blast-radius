import { q } from "@/lib/db";
import { Q } from "@/lib/queries";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const [maintainers, solo] = await Promise.all([q(Q.maintainerRisk, { limit: 8 }), q(Q.soloPackages, { limit: 12 })]);
    return Response.json({ maintainers, solo, cypher: { maintainers: Q.maintainerRisk, solo: Q.soloPackages } });
  } catch (e: any) { return Response.json({ error: String(e?.message || e) }, { status: 500 }); }
}
