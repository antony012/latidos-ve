"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapLazy } from "@/components/map/MapLazy";
import { MapSkeleton } from "@/components/map/MapSkeleton";
import { MapLegend } from "@/components/map/MapLegend";
import { CenterCard } from "@/components/centers/CenterCard";
import { CenterDetailDialog } from "@/components/centers/CenterDetailDialog";
import { SearchFilters } from "@/components/search/SearchFilters";
import { MapActionBar } from "@/components/home/MapActionBar";
import { DonationThanksFeed } from "@/components/donor/DonationThanksFeed";
import { LocationPermissionCard } from "@/components/location/LocationPermissionCard";
import { NetworkStatusBanner } from "@/components/pwa/NetworkStatusBanner";
import { NearbySosAlerts } from "@/components/sos/NearbySosAlerts";
import { useCenters } from "@/hooks/use-centers";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useLocationPermission } from "@/hooks/use-location-permission";
import { useStoreSync } from "@/hooks/use-store-sync";
import { useMapLiveData } from "@/hooks/use-map-live-data";
import type { CenterWithStats } from "@/types";

interface HomeMapViewProps {
  /** Vista embebida en pestaña (sin navegación a detalle) */
  embedded?: boolean;
  showActionBar?: boolean;
}

export function HomeMapView({
  embedded = false,
  showActionBar = true,
}: HomeMapViewProps) {
  const router = useRouter();
  useStoreSync();
  const [city, setCity] = useState("");
  const [debouncedCity, setDebouncedCity] = useState("");
  const [needSlug, setNeedSlug] = useState<string | undefined>();
  const [selectedCenter, setSelectedCenter] = useState<CenterWithStats | null>(
    null
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sosBannerDismissed, setSosBannerDismissed] = useState(false);
  const [locationCardDismissed, setLocationCardDismissed] = useState(false);

  const { hasLocation, permission } = useLocationPermission();
  const watchActive =
    !embedded && (hasLocation || permission === "granted");
  const { position } = useGeolocation({ watch: true, watchEnabled: watchActive });
  const showLocationPrompt =
    !locationCardDismissed && !hasLocation && !position && permission !== "granted";

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCity(city), 300);
    return () => clearTimeout(timer);
  }, [city]);

  const { centers, loading, error } = useCenters({
    city: debouncedCity || undefined,
    needSlug,
  });

  const { pledges: mapPledges, sosAlerts } = useMapLiveData();

  const handleCenterSelect = (center: CenterWithStats) => {
    if (embedded) {
      setSelectedCenter(center);
      setDialogOpen(true);
      return;
    }
    router.push(`/centro/${center.id}`);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SearchFilters
        city={city}
        onCityChange={setCity}
        needSlug={needSlug}
        onNeedSlugChange={setNeedSlug}
      />

      {showActionBar && <MapActionBar />}

      <DonationThanksFeed />

      {showLocationPrompt && (
        <div className="relative shrink-0 px-3 pb-2 pt-1">
          <LocationPermissionCard
            onGranted={() => setLocationCardDismissed(true)}
          />
          <button
            type="button"
            onClick={() => setLocationCardDismissed(true)}
            className="absolute right-5 top-2 rounded p-1 text-xs text-muted-foreground hover:bg-muted"
            aria-label="Ocultar"
          >
            ✕
          </button>
        </div>
      )}

      <NetworkStatusBanner message={error ?? undefined} />

      {!loading && centers.length === 0 && (
        <div className="mx-3 mb-2 rounded-xl border border-dashed bg-muted/30 px-4 py-6 text-center">
          <p className="font-medium">Aún no hay centros de acopio registrados</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cuando se activen centros en la red, aparecerán aquí en el mapa.
          </p>
        </div>
      )}

      {/* Lista horizontal en móvil */}
      <div className="shrink-0 border-b md:hidden">
        <div className="flex items-center justify-between px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground">
            {loading ? "Cargando…" : `${centers.length} centros cerca`}
          </p>
        </div>
        <div className="flex gap-2 overflow-x-auto px-3 pb-3 scrollbar-none">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 w-56 shrink-0 animate-pulse rounded-xl bg-muted"
                />
              ))
            : centers.map((center) => (
                <div key={center.id} className="w-56 shrink-0">
                  <CenterCard
                    center={center}
                    compact
                    selected={selectedCenter?.id === center.id}
                    onSelect={() => handleCenterSelect(center)}
                  />
                </div>
              ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden w-72 shrink-0 flex-col border-r bg-background lg:flex xl:w-80">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-medium">
              {loading ? "Cargando…" : `${centers.length} centros`}
            </p>
            <p className="text-xs text-muted-foreground">
              Toca un centro para ver detalles
            </p>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-20 animate-pulse rounded-xl bg-muted"
                  />
                ))
              : centers.map((center) => (
                  <CenterCard
                    key={center.id}
                    center={center}
                    compact
                    selected={selectedCenter?.id === center.id}
                    onSelect={() => handleCenterSelect(center)}
                  />
                ))}
          </div>
        </aside>

        <div className="relative min-h-0 min-w-0 flex-1">
          {!sosBannerDismissed && (
            <NearbySosAlerts
              userPosition={position}
              onDismiss={() => setSosBannerDismissed(true)}
            />
          )}

          {loading ? (
            <MapSkeleton />
          ) : (
            <MapLazy
              centers={centers}
              pledges={mapPledges}
              sosAlerts={sosAlerts}
              selectedCenterId={selectedCenter?.id}
              centerMarkerStyle="building"
              showRoutes
              onCenterSelect={handleCenterSelect}
            />
          )}

          <MapLegend />
        </div>
      </div>

      {embedded && (
        <CenterDetailDialog
          center={selectedCenter}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </div>
  );
}
