"use client";

import Link from "next/link";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import { useAuth } from "@/contexts/auth-context";
import { useCenters, useCenterNeeds, useCenterPledges } from "@/hooks/use-centers";
import { CENTER_STATUS_LABELS } from "@/lib/constants/venezuela";
import { isProductionMode } from "@/lib/config/env";
import {
  updateCenterStatus,
} from "@/lib/store/demo-store";
import { updateCenterStatusRemote } from "@/lib/supabase/remote-data";
import { emitStoreUpdate } from "@/lib/store/events";
import { isActivePledge } from "@/lib/utils/pledges";
import { CENTER_STATUS_STYLES } from "@/lib/utils/centers";
import type { CenterStatus } from "@/types";
import { AddNeedForm } from "./AddNeedForm";
import { NeedAdminRow } from "./NeedAdminRow";
import { PledgeManager } from "./PledgeManager";
import { CenterNotificationsBanner } from "./CenterNotificationsBanner";
import { NavigateButtons } from "@/components/centers/NavigateButtons";

export function CenterAdminPanel() {
  const { session } = useAuth();
  const production = isProductionMode();
  const { centers, refetch: refetchCenters } = useCenters();
  const centerId = session?.centerId ?? null;
  const center = centers.find((c) => c.id === centerId) ?? null;
  const { needs } = useCenterNeeds(centerId);
  const { pledges } = useCenterPledges(centerId);

  if (!session?.centerId) return null;
  if (!center) {
    return (
      <p className="p-8 text-center text-sm text-muted-foreground">
        Cargando centro…
      </p>
    );
  }

  const activePledges = pledges.filter((p) => isActivePledge(p.status)).length;
  const lastUpdate =
    needs.length > 0
      ? needs.reduce(
          (latest, n) => (n.updated_at > latest ? n.updated_at : latest),
          needs[0].updated_at
        )
      : null;
  const statusStyle = CENTER_STATUS_STYLES[center.status];

  const handleStatusChange = async (status: CenterStatus) => {
    if (production) {
      await updateCenterStatusRemote(center.id, status);
      emitStoreUpdate();
      await refetchCenters();
    } else {
      updateCenterStatus(center.id, status);
    }
  };

  return (
    <>
      <PageHeader
        title={center.name}
        description={`Panel de ${session.name} — actualiza inventario y estado en tiempo real.`}
        breadcrumb={[
          { label: "Inicio", href: "/" },
          { label: "Mi centro" },
        ]}
        action={
          <Link
            href={`/centro/${center.id}`}
            className="inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-sm hover:bg-muted"
          >
            <ExternalLink className="size-3.5" />
            Vista pública
          </Link>
        }
      />

      <div className="mx-auto max-w-3xl space-y-6 p-4 pb-12">
        <CenterNotificationsBanner centerId={center.id} />

        <div className="rounded-xl border bg-muted/20 p-4">
          <p className="mb-3 text-sm font-medium">Estado del centro</p>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className={statusStyle.badge}>
              {CENTER_STATUS_LABELS[center.status]}
            </Badge>
            <Select
              value={center.status}
              onValueChange={(v) => v && void handleStatusChange(v as CenterStatus)}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Cambiar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgent">Necesita ayuda urgente</SelectItem>
                <SelectItem value="operational">Operativo</SelectItem>
                <SelectItem value="full">Capacidad llena</SelectItem>
                <SelectItem value="closed">Cerrado temporalmente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <NavigateButtons
          latitude={center.latitude}
          longitude={center.longitude}
          address={center.address}
        />

        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label="Urgentes"
            value={center.urgent_needs_count}
            variant="urgent"
          />
          <StatCard
            label="Cubiertos"
            value={center.covered_needs_count}
            variant="success"
          />
          <StatCard
            label="En camino"
            value={center.pending_pledges_count}
            variant="info"
          />
        </div>

        {lastUpdate && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <RefreshCw className="size-3" />
            Última actualización:{" "}
            {new Date(lastUpdate).toLocaleString("es-VE")}
          </p>
        )}

        <Tabs defaultValue="inventario" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="inventario">Inventario</TabsTrigger>
            <TabsTrigger value="donaciones">Donaciones</TabsTrigger>
          </TabsList>
          <TabsContent value="inventario" className="space-y-4 pt-4">
            <AddNeedForm centerId={center.id} />
            <div className="space-y-2">
              {needs.map((need) => (
                <NeedAdminRow key={need.id} need={need} />
              ))}
            </div>
          </TabsContent>
          <TabsContent value="donaciones" className="pt-4">
            <PledgeManager centerId={center.id} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
