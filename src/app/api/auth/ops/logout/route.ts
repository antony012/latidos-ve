import { NextResponse } from "next/server";
import { clearOpsSessionCookie } from "@/lib/auth/ops-session-server";

export async function POST() {
  await clearOpsSessionCookie();
  return NextResponse.json({ ok: true });
}
