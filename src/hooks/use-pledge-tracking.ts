"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  getDonorTrackablePledges,
  updatePledgeLocation,
} from "@/lib/store/demo-store";
import {
  getCachedLocation,
  registerLocationWatch,
  setCachedLocation,
  unregisterLocationWatch,
} from "@/lib/utils/geolocation";
import { useStoreSync } from "@/hooks/use-store-sync";

const UPDATE_INTERVAL_MS = 10_000;

/**
 * Seguimiento GPS eficiente: solo activo cuando el donante tiene
 * donaciones dropoff en curso. Actualiza posición en el store cada ~10s.
 */
export function usePledgeTracking() {
  useStoreSync();
  const { session } = useAuth();
  const lastPushRef = useRef(0);
  const donorId = session?.userId;

  useEffect(() => {
    if (!donorId) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    const trackable = getDonorTrackablePledges(donorId);
    if (!trackable.length) return;

    const pushLocation = (lat: number, lng: number) => {
      const now = Date.now();
      if (now - lastPushRef.current < UPDATE_INTERVAL_MS) return;
      lastPushRef.current = now;

      const current = getDonorTrackablePledges(donorId);
      for (const pledge of current) {
        try {
          updatePledgeLocation(pledge.id, lat, lng);
        } catch {
          // ignorar si ya no es editable
        }
      }
    };

    const cached = getCachedLocation();
    if (cached) pushLocation(cached.lat, cached.lng);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const geo = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          capturedAt: Date.now(),
          source: "gps" as const,
        };
        setCachedLocation(geo);
        pushLocation(geo.lat, geo.lng);
      },
      () => {},
      {
        enableHighAccuracy: false,
        maximumAge: UPDATE_INTERVAL_MS,
        timeout: 25_000,
      }
    );

    registerLocationWatch(watchId);
    return () => unregisterLocationWatch(watchId);
  }, [donorId, session?.userId]);
}
