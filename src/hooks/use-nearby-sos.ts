"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { isProductionMode } from "@/lib/config/env";
import { getActiveSosAlerts } from "@/lib/store/demo-store";
import { subscribeStoreUpdate } from "@/lib/store/events";
import { fetchActiveSosAlerts } from "@/lib/supabase/remote-data";
import { playSosAlertSound } from "@/lib/utils/alert-sound";
import {
  distanceKm,
  isWithinRadiusKm,
  SOS_ALERT_RADIUS_KM,
} from "@/lib/utils/geo";
import type { SosAlert } from "@/types";
import type { GeoPosition } from "./use-geolocation";

const HEARD_KEY = "ve-ayuda:sos-heard";

function getHeardIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(HEARD_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function markHeard(id: string) {
  const heard = getHeardIds();
  heard.add(id);
  sessionStorage.setItem(HEARD_KEY, JSON.stringify([...heard]));
}

export interface NearbySosItem {
  alert: SosAlert;
  distanceKm: number;
}

export function useNearbySos(
  userPosition: GeoPosition | null,
  options: { playSound?: boolean; excludeOwn?: boolean; userId?: string } = {}
) {
  const { playSound = true, excludeOwn = true, userId } = options;
  const production = isProductionMode();
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const playedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      if (production) {
        try {
          setAlerts(await fetchActiveSosAlerts());
        } catch {
          setAlerts([]);
        }
      } else {
        setAlerts(getActiveSosAlerts());
      }
    };
    void load();
    return subscribeStoreUpdate(() => {
      void load();
    });
  }, [production]);

  const nearby = useMemo((): NearbySosItem[] => {
    if (!userPosition) return [];

    return alerts
      .filter((alert) => {
        if (excludeOwn && userId && alert.user_id === userId) return false;
        return isWithinRadiusKm(
          userPosition.lat,
          userPosition.lng,
          alert.latitude,
          alert.longitude,
          SOS_ALERT_RADIUS_KM
        );
      })
      .map((alert) => ({
        alert,
        distanceKm: distanceKm(
          userPosition.lat,
          userPosition.lng,
          alert.latitude,
          alert.longitude
        ),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [userPosition, excludeOwn, userId, alerts]);

  useEffect(() => {
    if (!playSound || !nearby.length) return;

    const heard = getHeardIds();
    for (const { alert } of nearby) {
      if (heard.has(alert.id) || playedRef.current.has(alert.id)) continue;
      playedRef.current.add(alert.id);
      markHeard(alert.id);
      playSosAlertSound();
      break;
    }
  }, [nearby, playSound]);

  return nearby;
}
