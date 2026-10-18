import { q } from "@/lib/db";
import { Q } from "@/lib/queries";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const s = new URL(req.url).searchParams.get("q");
  try {
    const rows = s ? await q(Q.searchAdvisories, { q: s }) : await q(Q.topAdvisories, { limit: 40 });
    return Response.json({ advisories: rows, cypher: s ? Q.searchAdvisories : Q.topAdvisories });
  } catch (e: any) { return Response.json({ error: String(e?.message || e) }, { status: 500 }); }
}
