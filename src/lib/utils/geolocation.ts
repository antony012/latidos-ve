export type LocationSource = "gps" | "ip" | "default";

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy?: number;
  capturedAt: number;
  source?: LocationSource;
  city?: string;
}

const CACHE_MAX_AGE_MS = 5 * 60_000;
const PROMPT_TIMEOUT_MS = 15_000;

let cached: GeoPosition | null = null;
let promptInFlight: Promise<GeoPosition> | null = null;
const activeWatchIds = new Set<number>();

export function isGeolocationSecureContext(): boolean {
  if (typeof window === "undefined") return false;
  return window.isSecureContext;
}

export function isLocationPromptInFlight(): boolean {
  return promptInFlight !== null;
}

export function getCachedLocation(): GeoPosition | null {
  if (cached && Date.now() - cached.capturedAt < CACHE_MAX_AGE_MS) {
    return cached;
  }
  return null;
}

export function setCachedLocation(pos: Omit<GeoPosition, "capturedAt">) {
  cached = { ...pos, capturedAt: Date.now() };
}

export function clearCachedLocation() {
  cached = null;
}

export function pauseAllLocationWatches() {
  if (typeof navigator === "undefined" || !navigator.geolocation) return;
  for (const id of activeWatchIds) {
    navigator.geolocation.clearWatch(id);
  }
  activeWatchIds.clear();
}

export function registerLocationWatch(watchId: number) {
  activeWatchIds.add(watchId);
}

export function unregisterLocationWatch(watchId: number) {
  activeWatchIds.delete(watchId);
  if (typeof navigator !== "undefined" && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
}

function geolocationErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return "Permiso denegado. Haz clic en el candado de la barra de direcciones → Ubicación → Permitir.";
    case 2:
      return "Ubicación no disponible. En Windows: Configuración → Privacidad → Ubicación → Activar.";
    case 3:
      return "Tiempo agotado. Activa la ubicación en Windows y vuelve a intentar.";
    default:
      return "No se pudo obtener tu ubicación.";
  }
}

/**
 * Una sola solicitud a la vez. Llamar solo desde un clic del usuario.
 */
export function promptLocationAccess(): Promise<GeoPosition> {
  const existing = getCachedLocation();
  if (existing) return Promise.resolve(existing);

  if (promptInFlight) return promptInFlight;

  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.reject(
      new Error("Tu navegador no soporta geolocalización.")
    );
  }

  if (!isGeolocationSecureContext()) {
    return Promise.reject(
      new Error("Usa http://localhost:3000 — la ubicación no funciona por IP de red.")
    );
  }

  pauseAllLocationWatches();

  promptInFlight = new Promise<GeoPosition>((resolve, reject) => {
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(safetyTimer);
      promptInFlight = null;
      fn();
    };

    const safetyTimer = window.setTimeout(() => {
      finish(() =>
        reject(
          new Error(
            "Tiempo agotado. Busca el icono de ubicación en la barra de direcciones del navegador y elige «Permitir»."
          )
        )
      );
    }, PROMPT_TIMEOUT_MS + 2_000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const geo: GeoPosition = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          capturedAt: Date.now(),
          source: "gps",
        };
        cached = geo;
        finish(() => resolve(geo));
      },
      (err) => {
        finish(() => reject(new Error(geolocationErrorMessage(err.code))));
      },
      {
        enableHighAccuracy: false,
        timeout: PROMPT_TIMEOUT_MS,
        maximumAge: 300_000,
      }
    );
  });

  return promptInFlight;
}

export function requestUserLocation(
  options: {
    enableHighAccuracy?: boolean;
    timeoutMs?: number;
    maximumAge?: number;
  } = {}
): Promise<GeoPosition> {
  const existing = getCachedLocation();
  if (existing) return Promise.resolve(existing);

  return promptLocationAccess();
}

export async function captureDonationLocation(): Promise<GeoPosition | null> {
  try {
    return getCachedLocation() ?? (await promptLocationAccess());
  } catch {
    return getCachedLocation();
  }
}

/** Ubicación aproximada por IP — no requiere permiso del navegador. */
export async function fetchApproximateLocation(): Promise<GeoPosition> {
  const res = await fetch("/api/location/approx");
  const data = (await res.json()) as {
    lat: number;
    lng: number;
    city?: string;
    source: LocationSource;
  };

  const geo: GeoPosition = {
    lat: data.lat,
    lng: data.lng,
    accuracy: 25_000,
    capturedAt: Date.now(),
    source: data.source,
    city: data.city,
  };
  cached = geo;
  return geo;
}
