"use client";

import { useCallback, useEffect, useState } from "react";
import { isProductionMode } from "@/lib/config/env";
import { getMockCenterNeeds, getMockCenters } from "@/lib/mock/centers";
import { MOCK_CENTERS, MOCK_NEEDS } from "@/lib/mock/data";
import {
  filterCentersOffline,
  getCentersCache,
  getNeedsCache,
  saveCentersCache,
  saveNeedsCache,
} from "@/lib/offline/storage";
import { subscribeStoreUpdate } from "@/lib/store/events";
import { createClient } from "@/lib/supabase/client";
import { subscribeCentersRealtime, subscribeCenterNeedsRealtime } from "@/lib/supabase/realtime-subscriptions";
import {
  fetchCenterPledges,
} from "@/lib/supabase/remote-data";
import { useOnlineStatus } from "@/hooks/use-online-status";
import type { CenterNeed, CenterWithStats, DonationPledge } from "@/types";

interface UseCentersOptions {
  city?: string;
  status?: CenterWithStats["status"];
  needSlug?: string;
}

interface UseCentersResult {
  centers: CenterWithStats[];
  loading: boolean;
  error: string | null;
  isOffline: boolean;
  fromCache: boolean;
  refetch: () => Promise<void>;
}

export function useCenters(options: UseCentersOptions = {}): UseCentersResult {
  const { city, status, needSlug } = options;

  const [centers, setCenters] = useState<CenterWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const production = isProductionMode();
  const isOnline = useOnlineStatus();

  const filterOptions = { city, status, needSlug };

  const loadFromCache = useCallback(() => {
    const cached = getCentersCache();
    if (!cached?.length) {
      if (!production) {
        saveCentersCache(MOCK_CENTERS);
        for (const need of MOCK_NEEDS) {
          const existing = getNeedsCache(need.center_id) ?? [];
          if (!existing.some((n) => n.id === need.id)) {
            saveNeedsCache(need.center_id, [...existing, need]);
          }
        }
        const needsMap = MOCK_CENTERS.reduce<Record<string, CenterNeed[]>>(
          (acc, center) => {
            acc[center.id] = getNeedsCache(center.id) ?? [];
            return acc;
          },
          {}
        );
        setCenters(filterCentersOffline(MOCK_CENTERS, filterOptions, needsMap));
      } else {
        setCenters([]);
      }
      setFromCache(true);
      return Boolean(cached?.length || !production);
    }

    const needsMap = cached.reduce<Record<string, CenterNeed[]>>(
      (acc, center) => {
        acc[center.id] = getNeedsCache(center.id) ?? [];
        return acc;
      },
      {}
    );

    setCenters(filterCentersOffline(cached, filterOptions, needsMap));
    setFromCache(true);
    return true;
  }, [city, status, needSlug, production]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFromCache(false);

    try {
      if (!isOnline) {
        if (!loadFromCache()) {
          setError("Sin conexión y sin datos guardados.");
        } else {
          setError("Sin conexión. Mostrando datos guardados.");
        }
        return;
      }

      if (!production) {
        const data = await getMockCenters(filterOptions);
        setCenters(data);
        saveCentersCache(data);
        return;
      }

      const supabase = createClient();
      let query = supabase
        .from("centers_with_stats")
        .select("*")
        .order("urgent_needs_count", { ascending: false });

      if (city) query = query.ilike("city", `%${city}%`);
      if (status) query = query.eq("status", status);

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const result = (data ?? []) as CenterWithStats[];
      setCenters(result);
      saveCentersCache(result);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "No se pudieron cargar los centros.";
      if (loadFromCache()) {
        setError(`Error al actualizar: ${message}. Mostrando última copia.`);
      } else {
        setError(message);
        setCenters([]);
      }
    } finally {
      setLoading(false);
    }
  }, [production, isOnline, loadFromCache, city, status, needSlug]);

  useEffect(() => {
    fetchData();
    return subscribeStoreUpdate(fetchData);
  }, [fetchData]);

  useEffect(() => {
    if (!production || !isOnline) return;
    return subscribeCentersRealtime(() => {
      void fetchData();
    });
  }, [fetchData, production, isOnline]);

  return {
    centers,
    loading,
    error,
    isOffline: !isOnline,
    fromCache,
    refetch: fetchData,
  };
}

export function useCenterNeeds(centerId: string | null) {
  const [needs, setNeeds] = useState<CenterNeed[]>([]);
  const [loading, setLoading] = useState(false);
  const production = isProductionMode();
  const isOnline = useOnlineStatus();

  const load = useCallback(async () => {
    if (!centerId) return;
    setLoading(true);

    try {
      if (!isOnline) {
        const cached = getNeedsCache(centerId);
        if (cached) {
          setNeeds(cached);
        } else if (!production) {
          setNeeds(await getMockCenterNeeds(centerId));
        } else {
          setNeeds([]);
        }
        return;
      }

      if (!production) {
        const data = await getMockCenterNeeds(centerId);
        setNeeds(data);
        saveNeedsCache(centerId, data);
        return;
      }

      const supabase = createClient();
      const { data: remote, error } = await supabase
        .from("center_needs")
        .select("*")
        .eq("center_id", centerId)
        .order("priority");

      if (error) throw error;

      const result = (remote ?? []) as CenterNeed[];
      setNeeds(result);
      saveNeedsCache(centerId, result);
    } catch {
      const cached = getNeedsCache(centerId);
      if (cached) setNeeds(cached);
      else if (!production) setNeeds(await getMockCenterNeeds(centerId));
      else setNeeds([]);
    } finally {
      setLoading(false);
    }
  }, [centerId, production, isOnline]);

  useEffect(() => {
    load();
    return subscribeStoreUpdate(load);
  }, [load]);

  useEffect(() => {
    if (!production || !isOnline || !centerId) return;
    return subscribeCenterNeedsRealtime(centerId, () => {
      void load();
    });
  }, [centerId, production, isOnline, load]);

  return { needs, loading, refetch: load };
}

export function useCenterPledges(centerId: string | null) {
  const [pledges, setPledges] = useState<DonationPledge[]>([]);
  const [loading, setLoading] = useState(false);
  const production = isProductionMode();

  const load = useCallback(async () => {
    if (!centerId) return;
    setLoading(true);
    try {
      if (!production) {
        const { getCenterPledges } = await import("@/lib/store/demo-store");
        setPledges(getCenterPledges(centerId));
        return;
      }
      setPledges(await fetchCenterPledges(centerId));
    } catch {
      setPledges([]);
    } finally {
      setLoading(false);
    }
  }, [centerId, production]);

  useEffect(() => {
    load();
    return subscribeStoreUpdate(load);
  }, [load]);

  return { pledges, loading, refetch: load };
}
