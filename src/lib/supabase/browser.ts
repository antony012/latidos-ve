import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "@/lib/config/env";
import type { Database } from "@/types/database";

/** Cliente Supabase en el navegador; null si no hay variables de entorno. */
export function getSupabaseBrowser() {
  if (!isSupabaseConfigured()) return null;
  const url = getSupabaseUrl()!;
  const key = getSupabaseAnonKey()!;

  return createBrowserClient<Database>(url, key);
}
