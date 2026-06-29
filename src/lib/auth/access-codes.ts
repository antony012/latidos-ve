/**
 * Códigos de acceso para encargados de centro.
 * En producción se validan vía API + tabla center_access_codes.
 * En modo local se usan códigos guardados en localStorage.
 */

import { generateAccessCode, normalizeAccessCode } from "@/lib/auth/access-code-utils";

const LOCAL_CODES_KEY = "ve-ayuda:center-access-codes";

/** Códigos semilla para desarrollo sin Supabase. */
const DEV_SEED_CODES: Record<string, string> = {
  "center-1": "PARQUE-2024",
  "center-2": "SANPEDRO-2024",
  "center-3": "UCV-2024",
  "center-4": "GUAIRA-2024",
};

function readLocalCodes(): Record<string, string> {
  if (typeof window === "undefined") return { ...DEV_SEED_CODES };
  try {
    const raw = localStorage.getItem(LOCAL_CODES_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    return { ...DEV_SEED_CODES, ...parsed };
  } catch {
    return { ...DEV_SEED_CODES };
  }
}

function writeLocalCodes(codes: Record<string, string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_CODES_KEY, JSON.stringify(codes));
}

export function getLocalCenterCode(centerId: string): string | null {
  return readLocalCodes()[centerId] ?? null;
}

export function setLocalCenterCode(centerId: string, code: string): string {
  const codes = readLocalCodes();
  const normalized = normalizeAccessCode(code);
  codes[centerId] = normalized;
  writeLocalCodes(codes);
  return normalized;
}

export function removeLocalCenterCode(centerId: string) {
  const codes = readLocalCodes();
  delete codes[centerId];
  writeLocalCodes(codes);
}

export function listLocalCenterCodes(): Record<string, string> {
  return readLocalCodes();
}

export function verifyCenterCodeLocal(centerId: string, code: string): boolean {
  const stored = getLocalCenterCode(centerId);
  if (!stored) return false;
  return normalizeAccessCode(code) === normalizeAccessCode(stored);
}

export function regenerateLocalCenterCode(centerId: string): string {
  return setLocalCenterCode(centerId, generateAccessCode());
}

export async function verifyCenterCodeRemote(
  centerId: string,
  code: string
): Promise<boolean> {
  const res = await fetch("/api/auth/center-admin/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ centerId, code }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { valid?: boolean };
  return Boolean(data.valid);
}
