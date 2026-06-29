"use client";

import dynamic from "next/dynamic";
import { MapSkeleton } from "./MapSkeleton";
import type { LocationPickerMapProps } from "./LocationPickerMap";

const LocationPickerMap = dynamic(
  () => import("./LocationPickerMap").then((mod) => mod.LocationPickerMap),
  {
    ssr: false,
    loading: () => <MapSkeleton className="h-52 sm:h-56" />,
  }
);

export function LocationPickerMapLazy(props: LocationPickerMapProps) {
  return <LocationPickerMap {...props} />;
}
