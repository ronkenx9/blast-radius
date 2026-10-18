import { q, GRAPH } from "@/lib/db";
import { chatJSON, llmConfig } from "@/lib/llm";
let probe: { at: number; ok: boolean; error?: string } | null = null;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const [r] = await q<{ nodes: number }>(`MATCH (n) RETURN count(n) AS nodes`);
    const l = llmConfig();
    if (l && (!probe || Date.now() - probe.at > 10 * 60e3)) {
      const res = await chatJSON("Reply with JSON {\"ok\":true}.", "ping");
      probe = { at: Date.now(), ok: !!res.data, error: res.error };
    }
    const agents = !l ? { mode: "deterministic" } : probe?.ok ? { mode: "llm", provider: l.provider, model: l.model }
      : { mode: "deterministic", fallback: probe?.error || "model unreachable", provider: l.provider, model: l.model };
    return Response.json({ ok: true, graph: GRAPH, nodes: r?.nodes ?? 0, agents });
  } catch (e: any) { return Response.json({ ok: false, error: String(e?.message || e) }, { status: 503 }); }
}
