import { NextResponse } from "next/server";
import { generateAccessCode, normalizeAccessCode, parseAccessCodeInput, validateAccessCode } from "@/lib/auth/access-code-utils";
import { getOpsSession } from "@/lib/auth/ops-session-server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface CenterAccessCodeRow {
  id: string;
  center_id: string;
  access_code: string;
  label: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

async function requireOpsSession() {
  const session = await getOpsSession();
  if (!session) return null;
  return session;
}

export async function GET() {
  const session = await requireOpsSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Configura SUPABASE_SERVICE_ROLE_KEY en el servidor." },
      { status: 503 }
    );
  }

  const { data, error } = await admin
    .from("center_access_codes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ codes: (data ?? []) as CenterAccessCodeRow[] });
}

export async function POST(request: Request) {
  const session = await requireOpsSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Configura SUPABASE_SERVICE_ROLE_KEY en el servidor." },
      { status: 503 }
    );
  }

  let body: { centerId?: string; label?: string; accessCode?: string };
  try {
    body = (await request.json()) as {
      centerId?: string;
      label?: string;
      accessCode?: string;
    };
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const centerId = body.centerId?.trim();
  if (!centerId) {
    return NextResponse.json({ error: "centerId es obligatorio." }, { status: 400 });
  }

  let accessCode: string;
  if (body.accessCode?.trim()) {
    const validationError = validateAccessCode(body.accessCode);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
    accessCode = parseAccessCodeInput(body.accessCode);
  } else {
    accessCode = generateAccessCode();
  }
  const row = {
    center_id: centerId,
    access_code: accessCode,
    label: body.label?.trim() || null,
    is_active: true,
    created_by: session.email,
  };

  const { data, error } = await admin
    .from("center_access_codes")
    .upsert(row as never, { onConflict: "center_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    code: data as CenterAccessCodeRow,
    plainCode: accessCode,
  });
}

export async function PATCH(request: Request) {
  const session = await requireOpsSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Configura SUPABASE_SERVICE_ROLE_KEY en el servidor." },
      { status: 503 }
    );
  }

  let body: { centerId?: string; isActive?: boolean; accessCode?: string };
  try {
    body = (await request.json()) as {
      centerId?: string;
      isActive?: boolean;
      accessCode?: string;
    };
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const centerId = body.centerId?.trim();
  if (!centerId) {
    return NextResponse.json({ error: "centerId es obligatorio." }, { status: 400 });
  }

  const updates: { is_active?: boolean; access_code?: string } = {};

  if (typeof body.isActive === "boolean") {
    updates.is_active = body.isActive;
  }

  if (body.accessCode !== undefined) {
    const validationError = validateAccessCode(body.accessCode);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
    updates.access_code = parseAccessCodeInput(body.accessCode);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("center_access_codes")
    .update(updates as never)
    .eq("center_id", centerId)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ code: data });
}

export async function DELETE(request: Request) {
  const session = await requireOpsSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Configura SUPABASE_SERVICE_ROLE_KEY en el servidor." },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const centerId = searchParams.get("centerId")?.trim();
  if (!centerId) {
    return NextResponse.json({ error: "centerId es obligatorio." }, { status: 400 });
  }

  const { error } = await admin
    .from("center_access_codes")
    .delete()
    .eq("center_id", centerId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
