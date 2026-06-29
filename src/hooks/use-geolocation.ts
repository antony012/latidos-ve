"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getCachedLocation,
  promptLocationAccess,
  registerLocationWatch,
  setCachedLocation,
  unregisterLocationWatch,
  type GeoPosition,
} from "@/lib/utils/geolocation";

export type { GeoPosition };

interface UseGeolocationOptions {
  /** Solo activar watch cuando el usuario ya dio permiso */
  watch?: boolean;
  watchEnabled?: boolean;
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const { watch = false, watchEnabled = true } = options;
  const [position, setPosition] = useState<GeoPosition | null>(() =>
    getCachedLocation()
  );
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback((): Promise<GeoPosition> => {
    setError(null);
    return promptLocationAccess()
      .then((geo) => {
        setPosition(geo);
        return geo;
      })
      .catch((err: Error) => {
        setError(err.message);
        throw err;
      });
  }, []);

  useEffect(() => {
    if (!watch || !watchEnabled) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const geo: GeoPosition = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          capturedAt: Date.now(),
        };
        setCachedLocation(geo);
        setPosition(geo);
        setError(null);
      },
      () => {},
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 30_000 }
    );

    registerLocationWatch(id);
    return () => unregisterLocationWatch(id);
  }, [watch, watchEnabled]);

  return { position, error, requestLocation };
}
