/**
 * Saneamiento básico de entradas de texto del usuario.
 *
 * React ya escapa el contenido al renderizar, pero limpiamos y limitamos la
 * longitud antes de persistir para mantener los datos sanos y evitar payloads
 * abusivos. En producción, validar también en el servidor / políticas de BD.
 */
export function sanitizeText(input: string | null | undefined, maxLen = 500): string {
  if (!input) return "";
  return input
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

/** Permite saltos de línea (para notas/direcciones), pero limpia ángulos. */
export function sanitizeMultiline(
  input: string | null | undefined,
  maxLen = 1000
): string {
  if (!input) return "";
  return input.replace(/[<>]/g, "").trim().slice(0, maxLen);
}

/** Mantiene solo dígitos, espacios y símbolos típicos de teléfono. */
export function sanitizePhone(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(/[^\d+()\-\s]/g, "").trim().slice(0, 30);
}
