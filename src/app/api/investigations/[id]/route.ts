import { q } from "@/lib/db";
import { Q } from "@/lib/queries";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try { return Response.json({ findings: await q(Q.investigationFindings, { id }), cypher: Q.investigationFindings }); }
  catch (e: any) { return Response.json({ error: String(e?.message || e) }, { status: 500 }); }
}
