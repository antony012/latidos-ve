"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import { UrgentNeedsList } from "@/components/donor/UrgentNeedsList";
import { MyPledges } from "@/components/donor/MyPledges";
import { HomeMapView } from "@/components/home/HomeMapView";
import {
  getGlobalStats,
  getUrgentNeedsAcrossCenters,
} from "@/lib/store/demo-store";
import { useStoreSync } from "@/hooks/use-store-sync";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function DonorHub() {
  useStoreSync();
  const stats = getGlobalStats();
  const urgentCount = getUrgentNeedsAcrossCenters().length;

  return (
    <>
      <PageHeader
        title="Quiero donar"
        description="Encuentra qué necesitan los centros de acopio cerca de ti y promete tu ayuda en segundos."
        breadcrumb={[{ label: "Inicio", href: "/" }, { label: "Donar" }]}
        action={
          <Link href="/">
            <Button variant="outline" size="sm">
              Ver mapa completo
            </Button>
          </Link>
        }
      />

      <div className="mx-auto max-w-7xl space-y-6 p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Centros activos"
            value={stats.activeCenters}
            variant="info"
          />
          <StatCard
            label="Necesidades urgentes"
            value={urgentCount}
            variant="urgent"
          />
          <StatCard
            label="Donaciones en camino"
            value={stats.pendingPledges}
            variant="default"
          />
          <StatCard
            label="Centros en alerta"
            value={stats.urgentCenters}
            variant="urgent"
          />
        </div>

        <Tabs defaultValue="urgentes" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="urgentes">
              Urgentes {urgentCount > 0 && `(${urgentCount})`}
            </TabsTrigger>
            <TabsTrigger value="mapa">Mapa</TabsTrigger>
            <TabsTrigger value="mis-donaciones">Mis promesas</TabsTrigger>
          </TabsList>

          <TabsContent value="urgentes" className="mt-4">
            <UrgentNeedsList />
          </TabsContent>

          <TabsContent value="mapa" className="mt-4">
            <div className="h-[60dvh] overflow-hidden rounded-xl border">
              <HomeMapView />
            </div>
          </TabsContent>

          <TabsContent value="mis-donaciones" className="mt-4">
            <MyPledges />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
