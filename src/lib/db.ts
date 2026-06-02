import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { env } from "./env";

// Reuse a single pool across hot reloads in dev.
const globalForPg = globalThis as unknown as { _pgPool?: Pool };

// Remove libpq SSL hints from the URL so our explicit `ssl` option below is
// authoritative. Supabase presents a cert chain Node doesn't trust by default,
// so `sslmode=require` (now an alias for verify-full) would throw
// SELF_SIGNED_CERT_IN_CHAIN. We still connect over TLS — just without chain verification.
function cleanConnectionString(raw: string): string {
  try {
    const u = new URL(raw);
    ["sslmode", "uselibpqcompat", "sslrootcert", "ssl"].forEach((p) => u.searchParams.delete(p));
    return u.toString();
  } catch {
    return raw;
  }
}

// Create the pool ONCE and attach listeners once. On hot reload we reuse the
// cached instance so we don't leak connect/error listeners (MaxListeners warning).
function createPool(): Pool {
  const p = new Pool({
    connectionString: cleanConnectionString(env.db.url),
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 10_000, // recycle idle sockets before the pooler drops them
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    connectionTimeoutMillis: 15_000,
  });
  // Pin search_path for every new connection.
  p.on("connect", (client) => {
    client.query(`SET search_path TO ${env.db.schema}, public`).catch(() => {});
  });
  // Don't let a background socket error crash the dev server; the pool reconnects.
  p.on("error", (err) => console.error("[pg pool] idle client error:", (err as Error).message));
  globalForPg._pgPool = p;
  return p;
}

export const pool: Pool = globalForPg._pgPool ?? createPool();

// A dropped pooled socket throws a connection error; retry once with a fresh client.
function isConnectionError(e: unknown): boolean {
  const msg = (e as Error)?.message ?? "";
  const code = (e as { code?: string })?.code ?? "";
  return /terminat|ECONNRESET|ETIMEDOUT|Connection terminated|server closed/i.test(msg) ||
    ["57P01", "ECONNRESET", "ETIMEDOUT", "EPIPE"].includes(code);
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  try {
    return (await pool.query<T>(text, params as never[])).rows;
  } catch (e) {
    if (!isConnectionError(e)) throw e;
    await new Promise((r) => setTimeout(r, 250)); // brief pause, then one retry on a fresh connection
    return (await pool.query<T>(text, params as never[])).rows;
  }
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

// Run a set of statements inside a transaction.
export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
