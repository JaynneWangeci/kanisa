import { createClient } from "@supabase/supabase-js";

let _supabase: ReturnType<typeof createClient> | null = null;
let _serviceClient: ReturnType<typeof createClient> | null = null;

function ensureClients() {
  if (_supabase || _serviceClient) return;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && anonKey) _supabase = createClient(url, anonKey);
  if (url && serviceKey) _serviceClient = createClient(url, serviceKey, { auth: { persistSession: false } });
}

export function requireService() {
  ensureClients();
  const svc = _serviceClient || _supabase;
  if (!svc) throw new Error("Supabase not configured");
  return svc;
}
