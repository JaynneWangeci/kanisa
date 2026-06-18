import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

async function execSQL(sql: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${supabaseUrl}/pg/sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      },
      body: JSON.stringify({ query: sql }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `${res.status}: ${text}` };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret = req.headers["x-init-secret"];
  if (secret !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(400).json({ error: "Supabase not configured" });
  }

  const results: Record<string, any> = {};

  // Run migration.sql
  const migrationPath = join(__dirname, "..", "..", "supabase", "migration.sql");
  const migration = readFileSync(migrationPath, "utf8");
  results.migration = await execSQL(migration);

  if (!results.migration.ok) {
    return res.status(500).json({ error: "Migration failed", details: results });
  }

  // Run migration_v2.sql
  const migrationV2Path = join(__dirname, "..", "..", "supabase", "migration_v2.sql");
  const migrationV2 = readFileSync(migrationV2Path, "utf8");
  results.migration_v2 = await execSQL(migrationV2);

  if (!results.migration_v2.ok) {
    return res.status(500).json({ error: "Migration v2 failed", details: results });
  }

  // Run seed.sql
  const seedPath = join(__dirname, "..", "..", "supabase", "seed.sql");
  const seed = readFileSync(seedPath, "utf8");
  results.seed = await execSQL(seed);

  res.json({ ok: true, results });
}
