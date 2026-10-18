// Minimal stateless MCP server over Streamable HTTP (JSON responses).
// Connect from Claude/Cursor: { "url": "https://<host>/api/mcp" } (optional bearer: MCP_API_KEY)
import { TOOLS } from "@/lib/tools";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ok = (id: unknown, result: unknown) => ({ jsonrpc: "2.0", id, result });
const err = (id: unknown, code: number, message: string) => ({ jsonrpc: "2.0", id, error: { code, message } });

async function handle(m: any) {
  if (!m || typeof m !== "object" || Array.isArray(m) || m.jsonrpc !== "2.0" || typeof m.method !== "string") return err(null, -32600, "Invalid Request");
  if (m.id === undefined) return null; // notification
  switch (m.method) {
    case "initialize":
      return ok(m.id, { protocolVersion: m.params?.protocolVersion || "2025-03-26", capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "blast-radius", version: "1.0.0" },
        instructions: "Graph-native supply-chain triage over a FalkorDB graph of services, npm dependencies, advisories, maintainers, owners, decisions and incidents." });
    case "ping": return ok(m.id, {});
    case "tools/list":
      return ok(m.id, { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    case "tools/call": {
      const t = TOOLS.find((x) => x.name === m.params?.name);
      if (!t) return err(m.id, -32602, `Unknown tool ${m.params?.name}`);
      try {
        const data = await t.run(m.params?.arguments || {});
        return ok(m.id, { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: { result: data, cypher: t.cypher } });
      } catch (e: any) {
        return ok(m.id, { isError: true, content: [{ type: "text", text: String(e?.message || e) }] });
      }
    }
    default: return err(m.id, -32601, `Method not found: ${m.method}`);
  }
}

export async function POST(req: Request) {
  const key = process.env.MCP_API_KEY;
  if (key && req.headers.get("authorization") !== `Bearer ${key}`) return new Response("Unauthorized", { status: 401 });
  let body: any;
  try { body = await req.json(); } catch { return Response.json(err(null, -32700, "Parse error"), { status: 400 }); }
  if (Array.isArray(body)) {
    const out = (await Promise.all(body.map(handle))).filter(Boolean);
    return out.length ? Response.json(out) : new Response(null, { status: 202 });
  }
  const out = await handle(body);
  return out ? Response.json(out) : new Response(null, { status: 202 });
}
export async function GET() {
  return Response.json({ name: "blast-radius MCP", transport: "streamable-http (POST JSON-RPC)", tools: TOOLS.map((t) => t.name) });
}
