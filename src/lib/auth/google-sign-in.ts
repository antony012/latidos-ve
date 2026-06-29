import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/config/env";

/** Inicia sesión con Google vía Supabase OAuth. */
export async function signInWithGoogle(): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Inicio con Google no disponible. Configura las variables de Supabase."
    );
  }

  const supabase = getSupabaseBrowser();
  if (!supabase) {
    throw new Error("No se pudo conectar con Supabase.");
  }

  const redirectTo = `${window.location.origin}/auth/callback?next=/`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) throw error;
}

export async function signOutGoogle() {
  const supabase = getSupabaseBrowser();
  if (supabase) {
    await supabase.auth.signOut();
  }
}
