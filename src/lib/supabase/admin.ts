import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "@/lib/config/env";
import type { Database } from "@/types/database";

/** Cliente con service role — solo en rutas API del servidor. */
export function createAdminClient() {
  const url = getSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
