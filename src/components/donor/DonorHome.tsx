"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import { MapActionBar } from "@/components/home/MapActionBar";
import { HomeMapView } from "@/components/home/HomeMapView";
import { UrgentNeedsList } from "@/components/donor/UrgentNeedsList";
import { CentersBrowseList } from "@/components/centers/CentersBrowseList";
import { MyPledges } from "@/components/donor/MyPledges";
import { APP_NAME } from "@/lib/constants/branding";
import { isProductionMode } from "@/lib/config/env";
import {
  getGlobalStats,
  getUrgentNeedsAcrossCenters,
} from "@/lib/store/demo-store";
import { useCenters } from "@/hooks/use-centers";
import { useStoreSync } from "@/hooks/use-store-sync";

export function DonorHome() {
  useStoreSync();
  const { centers, loading } = useCenters();
  const production = isProductionMode();

  const stats = production
    ? {
        activeCenters: centers.filter((c) => c.is_active).length,
        urgentCenters: centers.filter((c) => c.status === "urgent").length,
        pendingPledges: centers.reduce(
          (sum, c) => sum + (c.pending_pledges_count ?? 0),
          0
        ),
      }
    : (() => {
        const s = getGlobalStats();
        return {
          activeCenters: s.activeCenters,
          urgentCenters: s.urgentCenters,
          pendingPledges: s.pendingPledges,
        };
      })();

  const urgentCount = production
    ? centers.reduce((sum, c) => sum + (c.urgent_needs_count ?? 0), 0)
    : getUrgentNeedsAcrossCenters().length;

  return (
    <>
      <MapActionBar />

      <PageHeader
        title={APP_NAME}
        description="Pide ayuda, dona insumos o encuentra un centro de acopio cerca de ti."
        className="shrink-0 py-3 md:py-4"
        action={
          <Link href="/mapa">
            <Button variant="outline" size="sm" className="gap-1.5">
              <MapPin className="size-3.5" />
              Mapa completo
            </Button>
          </Link>
        }
      />

      <div className="mx-auto max-w-7xl space-y-6 p-4 pb-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Centros activos"
            value={loading ? "—" : stats.activeCenters}
            variant="info"
          />
          <StatCard
            label="Necesidades urgentes"
            value={loading ? "—" : urgentCount}
            variant="urgent"
          />
          <StatCard
            label="Donaciones en camino"
            value={loading ? "—" : stats.pendingPledges}
          />
          <StatCard
            label="Centros en alerta"
            value={loading ? "—" : stats.urgentCenters}
            variant="urgent"
          />
        </div>

        <Tabs defaultValue="urgentes" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="urgentes" className="text-xs sm:text-sm">
              Urgentes {urgentCount > 0 && `(${urgentCount})`}
            </TabsTrigger>
            <TabsTrigger value="centros" className="text-xs sm:text-sm">
              Centros
            </TabsTrigger>
            <TabsTrigger value="mis-donaciones" className="text-xs sm:text-sm">
              Mis promesas
            </TabsTrigger>
            <TabsTrigger value="mapa" className="text-xs sm:text-sm">
              Mapa
            </TabsTrigger>
          </TabsList>

          <TabsContent value="urgentes" className="mt-4">
            <UrgentNeedsList />
          </TabsContent>
          <TabsContent value="centros" className="mt-4">
            <CentersBrowseList />
          </TabsContent>
          <TabsContent value="mis-donaciones" className="mt-4">
            <MyPledges />
          </TabsContent>
          <TabsContent value="mapa" className="mt-4">
            <div className="h-[min(70dvh,560px)] overflow-hidden rounded-xl border">
              <HomeMapView embedded showActionBar={false} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
