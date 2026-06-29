"use client";

import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured } from "@/lib/config/env";
import {
  getActiveSosAlerts,
  getPledgesForMap,
} from "@/lib/store/demo-store";
import { subscribeStoreUpdate } from "@/lib/store/events";
import { subscribeMapLiveRealtime } from "@/lib/supabase/realtime-subscriptions";
import {
  fetchActiveSosAlerts,
  fetchPledgesForMap,
} from "@/lib/supabase/remote-data";
import type { DonationPledge, SosAlert } from "@/types";

/** Promesas y SOS para el mapa (Supabase o demo local). */
export function useMapLiveData() {
  const isRemote = isSupabaseConfigured();
  const [pledges, setPledges] = useState<DonationPledge[]>([]);
  const [sosAlerts, setSosAlerts] = useState<SosAlert[]>([]);
  const [loading, setLoading] = useState(isRemote);

  const loadLocal = useCallback(() => {
    setPledges(getPledgesForMap());
    setSosAlerts(getActiveSosAlerts());
    setLoading(false);
  }, []);

  const loadRemote = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([
        fetchPledgesForMap(),
        fetchActiveSosAlerts(),
      ]);
      setPledges(p);
      setSosAlerts(s);
    } catch {
      loadLocal();
    } finally {
      setLoading(false);
    }
  }, [loadLocal]);

  const refresh = useCallback(() => {
    if (isRemote) void loadRemote();
    else loadLocal();
  }, [isRemote, loadRemote, loadLocal]);

  useEffect(() => {
    refresh();
    return subscribeStoreUpdate(refresh);
  }, [refresh]);

  useEffect(() => {
    if (!isRemote) return;
    return subscribeMapLiveRealtime(refresh);
  }, [isRemote, refresh]);

  return { pledges, sosAlerts, loading, refresh };
}
