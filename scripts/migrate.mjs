// Runs every migrations/*.sql in order against DATABASE_URL.
// Usage: npm run db:migrate   (reads .env.local automatically via --env-file in newer Node, else export DATABASE_URL)
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dir = path.join(root, "migrations");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Export it or run: node --env-file=.env.local scripts/migrate.mjs");
  process.exit(1);
}

// Strip libpq SSL hints so our explicit ssl option (TLS without chain verification) wins.
const cleanUrl = (() => {
  try {
    const u = new URL(url);
    ["sslmode", "uselibpqcompat", "sslrootcert", "ssl"].forEach((p) => u.searchParams.delete(p));
    return u.toString();
  } catch {
    return url;
  }
})();

const files = readdirSync(dir).filter((f) => /^\d+.*\.sql$/.test(f)).sort();
const client = new pg.Client({ connectionString: cleanUrl, ssl: { rejectUnauthorized: false } });

const run = async () => {
  await client.connect();
  for (const f of files) {
    const sql = readFileSync(path.join(dir, f), "utf8");
    process.stdout.write(`▶ ${f} ... `);
    try {
      await client.query(sql);
      console.log("ok");
    } catch (e) {
      console.log("FAILED");
      console.error(e.message);
      await client.end();
      process.exit(1);
    }
  }
  await client.end();
  console.log("\n✓ All migrations applied to schema seo.");
};
run();
