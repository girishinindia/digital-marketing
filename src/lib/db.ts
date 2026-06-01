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

export const pool: Pool =
  globalForPg._pgPool ??
  new Pool({
    connectionString: cleanConnectionString(env.db.url),
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30_000,
  });

// Pin search_path to the app schema for every pooled connection.
pool.on("connect", (client) => {
  client.query(`SET search_path TO ${env.db.schema}, public`).catch(() => {});
});

if (!globalForPg._pgPool) globalForPg._pgPool = pool;

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await pool.query<T>(text, params as never[]);
  return res.rows;
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
