const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateAccessCode(length = 8): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return code;
}

export function normalizeAccessCode(code: string): string {
  return code.trim().toUpperCase();
}

const ACCESS_CODE_RE = /^[A-Z0-9][A-Z0-9-]{3,31}$/;

export function validateAccessCode(code: string): string | null {
  const normalized = normalizeAccessCode(code);
  if (!ACCESS_CODE_RE.test(normalized)) {
    return "Usa 4–32 caracteres: letras, números o guiones.";
  }
  return null;
}

export function parseAccessCodeInput(code: string): string {
  return normalizeAccessCode(code);
}
