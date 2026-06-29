"use client";

import { usePledgeTracking } from "@/hooks/use-pledge-tracking";

/** Activa seguimiento GPS solo cuando hay donaciones en curso del donante. */
export function PledgeTrackingProvider() {
  usePledgeTracking();
  return null;
}
