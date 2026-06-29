"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Navigation } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DonateButton } from "@/components/donor/DonateButton";
import { isProductionMode } from "@/lib/config/env";
import { getUrgentNeedsAcrossCenters } from "@/lib/store/demo-store";
import { fetchUrgentNeedsRemote } from "@/lib/supabase/remote-data";
import { subscribeStoreUpdate } from "@/lib/store/events";
import { useStoreSync } from "@/hooks/use-store-sync";
import { getInventoryProgress, NEED_PRIORITY_STYLES } from "@/lib/utils/centers";
import { getGoogleMapsDirectionsUrl } from "@/lib/utils/navigation";
import type { CenterNeed, CenterWithStats } from "@/types";

export function UrgentNeedsList() {
  useStoreSync();
  const [pledgedIds, setPledgedIds] = useState<Set<string>>(new Set());
  const [items, setItems] = useState<
    { need: CenterNeed; center: CenterWithStats }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (isProductionMode()) {
      try {
        setItems(await fetchUrgentNeedsRemote());
      } catch {
        setItems([]);
      }
    } else {
      setItems(getUrgentNeedsAcrossCenters());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    return subscribeStoreUpdate(load);
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <p className="font-medium text-green-700 dark:text-green-400">
          No hay necesidades urgentes en este momento
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Todos los centros tienen sus insumos críticos cubiertos.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map(({ need, center }) => {
        const progress = getInventoryProgress(need);
        const styles = NEED_PRIORITY_STYLES[need.priority];

        return (
          <li
            key={need.id}
            className="rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{need.item_name}</p>
                <Link
                  href={`/centro/${center.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  {center.name} · {center.city}
                </Link>
              </div>
              <Badge variant="outline" className={styles.badge}>
                Urgente
              </Badge>
            </div>

            {need.quantity_needed != null && (
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    Faltan ~{need.quantity_needed - need.quantity_received}{" "}
                    {need.unit}
                  </span>
                  <span>{progress}% cubierto</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <DonateButton
                centerId={center.id}
                centerName={center.name}
                needId={need.id}
                itemName={need.item_name}
                pledged={pledgedIds.has(need.id)}
                onSuccess={() =>
                  setPledgedIds((prev) => new Set(prev).add(need.id))
                }
              />
              <a
                href={getGoogleMapsDirectionsUrl(center.latitude, center.longitude)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-sm hover:bg-muted"
              >
                <Navigation className="size-3.5" />
                Cómo llegar
              </a>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
