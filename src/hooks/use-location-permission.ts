"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchApproximateLocation,
  getCachedLocation,
  isGeolocationSecureContext,
  promptLocationAccess,
} from "@/lib/utils/geolocation";
import {
  getLocationDeniedHelpText,
  queryLocationPermission,
  type LocationPermissionState,
} from "@/lib/utils/location-permission";

export function useLocationPermission() {
  const [permission, setPermission] =
    useState<LocationPermissionState>("prompt");
  const [hasLocation, setHasLocation] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [approximating, setApproximating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secure, setSecure] = useState(true);
  const [locationSource, setLocationSource] = useState<
    "gps" | "ip" | "default" | null
  >(null);

  const refreshPermission = useCallback(async () => {
    setSecure(isGeolocationSecureContext());
    const state = await queryLocationPermission();
    setPermission(state);
    const cached = getCachedLocation();
    setHasLocation(!!cached);
    setLocationSource(cached?.source ?? null);
    return state;
  }, []);

  useEffect(() => {
    void refreshPermission();

    let cleanup: (() => void) | undefined;
    if (typeof navigator !== "undefined" && navigator.permissions?.query) {
      void navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((result) => {
          const onChange = () => {
            setPermission(result.state as LocationPermissionState);
            const cached = getCachedLocation();
            setHasLocation(!!cached);
            setLocationSource(cached?.source ?? null);
          };
          result.addEventListener("change", onChange);
          cleanup = () => result.removeEventListener("change", onChange);
        })
        .catch(() => {});
    }
    return () => cleanup?.();
  }, [refreshPermission]);

  /**
   * Dispara el diálogo del navegador. Llamar solo desde onClick del usuario.
   * Importante: getCurrentPosition se invoca de inmediato, sin await previo.
   */
  const requestPermission = useCallback(() => {
    if (!isGeolocationSecureContext()) {
      setError(
        "Abre la app en http://localhost:3000 o en HTTPS para usar ubicación."
      );
      setSecure(false);
      return Promise.resolve(null);
    }

    setRequesting(true);
    setError(null);

    return promptLocationAccess()
      .then((pos) => {
        setHasLocation(true);
        setPermission("granted");
        setLocationSource(pos.source ?? "gps");
        return pos;
      })
      .catch(async (e) => {
        const msg =
          e instanceof Error ? e.message : "No se pudo obtener ubicación.";
        setError(msg);
        const state = await queryLocationPermission();
        setPermission(state === "unsupported" ? "denied" : state);
        const cached = getCachedLocation();
        setHasLocation(!!cached);
        setLocationSource(cached?.source ?? null);
        return null;
      })
      .finally(() => {
        setRequesting(false);
      });
  }, []);

  const requestApproximateLocation = useCallback(() => {
    setApproximating(true);
    setError(null);

    return fetchApproximateLocation()
      .then((pos) => {
        setHasLocation(true);
        setLocationSource(pos.source ?? "ip");
        return pos;
      })
      .catch((e) => {
        const msg =
          e instanceof Error
            ? e.message
            : "No se pudo obtener ubicación aproximada.";
        setError(msg);
        return null;
      })
      .finally(() => {
        setApproximating(false);
      });
  }, []);

  return {
    permission,
    hasLocation,
    requesting,
    approximating,
    error,
    secure,
    locationSource,
    deniedHelp: getLocationDeniedHelpText(),
    requestPermission,
    requestApproximateLocation,
    refreshPermission,
  };
}
