import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "latidos_ops_session";
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

export function getSuperAdminCredentials(): { email: string; password: string } | null {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!email || !password) return null;
  return { email, password };
}

export function verifySuperAdminCredentials(
  email: string,
  password: string
): boolean {
  const creds = getSuperAdminCredentials();
  if (!creds) return false;
  return (
    email.trim().toLowerCase() === creds.email && password === creds.password
  );
}

function getSessionSecret(): string | null {
  return (
    process.env.SUPER_ADMIN_SESSION_SECRET ??
    process.env.SUPER_ADMIN_PASSWORD ??
    null
  );
}

export function createOpsSessionToken(email: string): string {
  const secret = getSessionSecret();
  if (!secret) throw new Error("Falta SUPER_ADMIN_SESSION_SECRET o SUPER_ADMIN_PASSWORD");
  const exp = Date.now() + SESSION_MS;
  const payload = Buffer.from(
    JSON.stringify({ email: email.toLowerCase(), exp })
  ).toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyOpsSessionToken(token: string): { email: string } | null {
  const secret = getSessionSecret();
  if (!secret) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      email?: string;
      exp?: number;
    };
    if (!data.email || !data.exp || data.exp < Date.now()) return null;
    return { email: data.email };
  } catch {
    return null;
  }
}

export async function getOpsSession(): Promise<{ email: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyOpsSessionToken(token);
}

export async function setOpsSessionCookie(email: string): Promise<void> {
  const cookieStore = await cookies();
  const token = createOpsSessionToken(email);
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_MS / 1000),
  });
}

export async function clearOpsSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
