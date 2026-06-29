import { NextResponse } from "next/server";
import {
  getSuperAdminCredentials,
  setOpsSessionCookie,
  verifySuperAdminCredentials,
} from "@/lib/auth/ops-session-server";

export async function POST(request: Request) {
  const credsConfigured = getSuperAdminCredentials();
  if (!credsConfigured) {
    return NextResponse.json(
      { error: "Consola no configurada en el servidor." },
      { status: 503 }
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Correo y contraseña son obligatorios." },
      { status: 400 }
    );
  }

  if (!verifySuperAdminCredentials(email, password)) {
    return NextResponse.json(
      { error: "Credenciales incorrectas." },
      { status: 401 }
    );
  }

  await setOpsSessionCookie(email);

  return NextResponse.json({
    ok: true,
    email: email.toLowerCase(),
    name: email.split("@")[0],
  });
}
