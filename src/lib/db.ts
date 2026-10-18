import { FalkorDB } from "falkordb";

export const GRAPH = process.env.FALKORDB_GRAPH || "blast_radius";

type Conn = { host: string; port: number; username?: string; password?: string; tls?: boolean };

export function connOptions(): Conn {
  const url = process.env.FALKORDB_URL;
  if (url) {
    const u = new URL(url.replace(/^falkor(s?):/, "redis$1:"));
    return {
      host: u.hostname,
      port: Number(u.port || 6379),
      username: decodeURIComponent(u.username || "") || undefined,
      password: decodeURIComponent(u.password || "") || undefined,
      tls: u.protocol === "rediss:",
    };
  }
  return {
    host: process.env.FALKORDB_HOST || "127.0.0.1",
    port: Number(process.env.FALKORDB_PORT || 6379),
    username: process.env.FALKORDB_USERNAME || process.env.FALKORDB_USER || undefined,
    password: process.env.FALKORDB_PASSWORD || undefined,
    tls: process.env.FALKORDB_TLS === "true",
  };
}

const g = globalThis as unknown as { __falkor?: Promise<FalkorDB> };

export function getDb(): Promise<FalkorDB> {
  if (!g.__falkor) {
    const c = connOptions();
    g.__falkor = FalkorDB.connect({
      username: c.username,
      password: c.password,
      socket: { host: c.host, port: c.port, tls: c.tls, connectTimeout: 8000, reconnectStrategy: false } as never,
    }).then((db) => {
      // A closed socket must not poison future serverless invocations.
      db.on("error", () => { g.__falkor = undefined; });
      return db;
    }).catch((e) => {
      g.__falkor = undefined;
      throw e;
    });
  }
  return g.__falkor;
}

export async function q<T = Record<string, unknown>>(cypher: string, params: Record<string, unknown> = {}, readOnly = true): Promise<T[]> {
  const db = await getDb();
  const graph = db.selectGraph(GRAPH);
  const res = readOnly
    ? await graph.roQuery<T>(cypher, { params: params as never, TIMEOUT: 15000 })
    : await graph.query<T>(cypher, { params: params as never, TIMEOUT: 30000 });
  return (res.data || []) as T[];
}
