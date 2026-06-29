import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "@/lib/config/env";
import type { Database } from "@/types/database";

export function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase no está configurado. Usa los servicios mock mientras tanto."
    );
  }

  return createBrowserClient<Database>(
    getSupabaseUrl()!,
    getSupabaseAnonKey()!
  );
}
