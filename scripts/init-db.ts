import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

async function runSQL(sql: string) {
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify({ query: sql }),
  });
  return res;
}

async function main() {
  if (!supabaseUrl || !serviceRoleKey) {
    console.log("Supabase not configured — skipping DB init");
    return;
  }

  console.log("Running migration.sql...");
  const migration = readFileSync(join(__dirname, "..", "supabase", "migration.sql"), "utf8");
  const res1 = await runSQL(migration);
  console.log("migration.sql:", res1.status, res1.statusText);

  console.log("Running migration_v2.sql...");
  const migrationV2 = readFileSync(join(__dirname, "..", "supabase", "migration_v2.sql"), "utf8");
  const res2 = await runSQL(migrationV2);
  console.log("migration_v2.sql:", res2.status, res2.statusText);

  console.log("Running seed.sql...");
  const seed = readFileSync(join(__dirname, "..", "supabase", "seed.sql"), "utf8");
  const res3 = await runSQL(seed);
  console.log("seed.sql:", res3.status, res3.statusText);

  console.log("DB init complete");
}

main().catch(console.error);
