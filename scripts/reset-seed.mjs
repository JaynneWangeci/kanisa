// Resets fake seed campaign data — run: node scripts/reset-seed.mjs
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

const { data, error } = await supabase
  .from("campaigns")
  .update({ raised: 0 })
  .eq("slug", "development-fund")
  .select();

if (error) {
  console.error("Error resetting campaign:", error.message);
  process.exit(1);
}

console.log("Campaign raised reset to 0:", data);
