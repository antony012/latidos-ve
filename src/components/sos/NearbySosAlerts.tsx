"use client";

import Link from "next/link";
import { AlertTriangle, Gift, MapPin, Navigation, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useNearbySos } from "@/hooks/use-nearby-sos";
import type { GeoPosition } from "@/hooks/use-geolocation";
import { formatDistance } from "@/lib/utils/geo";
import { getGoogleMapsDirectionsUrl } from "@/lib/utils/navigation";

interface NearbySosAlertsProps {
  userPosition: GeoPosition | null;
  onDismiss?: () => void;
}

export function NearbySosAlerts({
  userPosition,
  onDismiss,
}: NearbySosAlertsProps) {
  const { session } = useAuth();
  const nearby = useNearbySos(userPosition, {
    playSound: true,
    excludeOwn: true,
    userId: session?.userId,
  });

  if (!nearby.length) return null;

  const closest = nearby[0];

  return (
    <div className="pointer-events-none absolute inset-x-0 top-12 z-[1100] flex justify-center px-2 sm:top-2 sm:px-3">
      <div className="pointer-events-auto w-full max-w-lg animate-in slide-in-from-top-2">
        <div className="overflow-hidden rounded-xl border-2 border-red-500 bg-red-600 text-white shadow-2xl">
          <div className="flex items-start gap-3 p-4">
            <div className="flex size-10 shrink-0 animate-pulse items-center justify-center rounded-full bg-white/20">
              <AlertTriangle className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">¡Alerta SOS cercana!</p>
                  <p className="mt-0.5 text-sm text-red-100">
                    {closest.alert.user_name} necesita ayuda ·{" "}
                    {formatDistance(closest.distanceKm)} de ti
                  </p>
                </div>
                {onDismiss && (
                  <button
                    type="button"
                    onClick={onDismiss}
                    className="rounded p-1 hover:bg-white/10"
                    aria-label="Cerrar"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              {closest.alert.message && (
                <p className="mt-2 rounded-lg bg-white/10 px-3 py-2 text-sm">
                  {closest.alert.message}
                </p>
              )}

              {nearby.length > 1 && (
                <Badge className="mt-2 bg-white/20 text-white hover:bg-white/20">
                  +{nearby.length - 1} alerta{nearby.length > 2 ? "s" : ""} más
                  cerca
                </Badge>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={getGoogleMapsDirectionsUrl(
                    closest.alert.latitude,
                    closest.alert.longitude
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  <Navigation className="size-4" />
                  Ir a ayudar
                </a>
                <Link
                  href="/"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/40 px-3 text-sm font-medium text-white hover:bg-white/10"
                >
                  <Gift className="size-4" />
                  Quiero donar
                </Link>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-white/20 bg-red-700/50 px-4 py-2 text-[10px] text-red-100">
            <MapPin className="size-3" />
            Alertas activas dentro de 20 km · Revisa el mapa (pin rojo SOS)
          </div>
        </div>
      </div>
    </div>
  );
}
