"use client";

import dynamic from "next/dynamic";
import { MapSkeleton } from "./MapSkeleton";
import type { CenterMarkerStyle } from "./Map";
import type { CenterWithStats, DonationPledge, SosAlert } from "@/types";

const Map = dynamic(() => import("./Map").then((mod) => mod.Map), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

interface MapLazyProps {
  centers: CenterWithStats[];
  pledges?: DonationPledge[];
  sosAlerts?: SosAlert[];
  selectedCenterId?: string | null;
  centerMarkerStyle?: CenterMarkerStyle;
  showRoutes?: boolean;
  interactive?: boolean;
  onCenterSelect: (center: CenterWithStats) => void;
}

export function MapLazy(props: MapLazyProps) {
  return <Map {...props} />;
}
