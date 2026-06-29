export type LocationPermissionState =
  | "granted"
  | "denied"
  | "prompt"
  | "unsupported";

/** Consulta el estado del permiso de geolocalización (si el navegador lo permite). */
export async function queryLocationPermission(): Promise<LocationPermissionState> {
  if (typeof navigator === "undefined") return "unsupported";
  if (!navigator.geolocation) return "unsupported";

  try {
    if (navigator.permissions?.query) {
      const result = await navigator.permissions.query({ name: "geolocation" });
      return result.state as LocationPermissionState;
    }
  } catch {
    // Safari / algunos navegadores no soportan query para geolocation
  }

  return "prompt";
}

export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export function getLocationDeniedHelpText(): string {
  if (isMobileDevice()) {
    return "Ajustes → Privacidad → Ubicación → activa para tu navegador.";
  }
  return "En Windows: Configuración → Privacidad → Ubicación → Activar. Luego en el navegador, clic en el candado junto a la URL → Ubicación → Permitir.";
}
