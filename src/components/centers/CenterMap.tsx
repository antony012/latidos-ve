"use client";

import { MapLazy } from "@/components/map/MapLazy";
import { getCenterPledges } from "@/lib/store/demo-store";
import { isActivePledge } from "@/lib/utils/pledges";
import { useStoreSync } from "@/hooks/use-store-sync";
import type { CenterWithStats } from "@/types";

interface CenterMapProps {
  center: CenterWithStats;
  className?: string;
  heightClassName?: string;
}

export function CenterMap({
  center,
  className,
  heightClassName = "h-52 sm:h-64",
}: CenterMapProps) {
  useStoreSync();

  const pledges = getCenterPledges(center.id).filter(
    (p) =>
      isActivePledge(p.status) && p.latitude != null && p.longitude != null
  );

  return (
    <div
      className={`overflow-hidden rounded-xl border ${heightClassName} ${className ?? ""}`}
    >
      <MapLazy
        centers={[center]}
        pledges={pledges}
        selectedCenterId={center.id}
        centerMarkerStyle="building"
        showRoutes
        interactive={false}
        onCenterSelect={() => {}}
      />
    </div>
  );
}
