import { investigate } from "@/lib/agents";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("advisory") || "";
  const useLLM = url.searchParams.get("llm") !== "0";
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      try {
        for await (const e of investigate(id, { useLLM })) ctrl.enqueue(enc.encode(JSON.stringify(e) + "\n"));
      } catch (e: any) {
        ctrl.enqueue(enc.encode(JSON.stringify({ type: "error", text: String(e?.message || e) }) + "\n"));
      }
      ctrl.close();
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson", "cache-control": "no-store" } });
}
