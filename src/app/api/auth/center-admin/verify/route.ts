import { NextResponse } from "next/server";
import { normalizeAccessCode } from "@/lib/auth/access-code-utils";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  let body: { centerId?: string; code?: string };
  try {
    body = (await request.json()) as { centerId?: string; code?: string };
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const centerId = body.centerId?.trim();
  const code = normalizeAccessCode(body.code ?? "");

  if (!centerId || !code) {
    return NextResponse.json(
      { error: "Centro y código son obligatorios." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Verificación de códigos no disponible." },
      { status: 503 }
    );
  }

  const { data, error } = await admin
    .from("center_access_codes")
    .select("access_code, is_active")
    .eq("center_id", centerId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Error al verificar código." }, { status: 500 });
  }

  const row = data as { access_code: string; is_active: boolean } | null;

  if (!row || normalizeAccessCode(row.access_code) !== code) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  return NextResponse.json({ valid: true });
}
