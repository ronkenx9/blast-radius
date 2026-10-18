import { q } from "@/lib/db";
import { Q } from "@/lib/queries";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return Response.json({ investigations: await q(Q.listInvestigations) }); }
  catch (e: any) { return Response.json({ error: String(e?.message || e) }, { status: 500 }); }
}
