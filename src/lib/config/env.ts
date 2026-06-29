/** URL del proyecto Supabase. */
export function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

/** Clave pública (anon o publishable) para el cliente. */
export function getSupabaseAnonKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

/** true cuando hay URL y clave pública configuradas. */
export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

/** Modo producción: datos en Supabase, sin store local de demo. */
export function isProductionMode(): boolean {
  return isSupabaseConfigured();
}
