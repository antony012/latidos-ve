"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  BadgeCheck,
  ExternalLink,
  Eye,
  EyeOff,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CenterFormDialog } from "@/components/admin/CenterFormDialog";
import { CenterNotifyDialog } from "@/components/admin/CenterNotifyDialog";
import { CenterAccessCodesPanel } from "@/components/admin/CenterAccessCodesPanel";
import {
  deleteCenter,
  deleteNotification,
  getAllNotifications,
  getAllPledges,
  getGlobalStats,
  StoreAuthError,
  toggleCenterActive,
  toggleCenterVerified,
  updateCenterStatus,
} from "@/lib/store/demo-store";
import { useCenters } from "@/hooks/use-centers";
import { isProductionMode } from "@/lib/config/env";
import {
  deleteCenterRemote,
  fetchAllPledgesRemote,
  toggleCenterActiveRemote,
  toggleCenterVerifiedRemote,
  updateCenterStatusRemote,
} from "@/lib/supabase/remote-data";
import { emitStoreUpdate } from "@/lib/store/events";
import { useStoreSync } from "@/hooks/use-store-sync";
import { PLEDGE_STATUS_LABELS, PLEDGE_STATUS_STYLES, isActivePledge } from "@/lib/utils/pledges";
import { cn } from "@/lib/utils";
import type { CenterStatus, CenterWithStats } from "@/types";
import { VerifiedCenterBadge } from "@/components/centers/VerifiedCenterBadge";

type StatFilter =
  | "all_centers"
  | "active_centers"
  | "urgent_centers"
  | "urgent_needs"
  | "all_pledges"
  | "active_pledges";

const FILTER_LABELS: Record<StatFilter, string> = {
  all_centers: "Todos los centros",
  active_centers: "Centros activos",
  urgent_centers: "Centros en alerta",
  urgent_needs: "Centros con insumos urgentes",
  all_pledges: "Todas las promesas",
  active_pledges: "Promesas en camino",
};

export function SuperAdminDashboard() {
  useStoreSync();
  const production = isProductionMode();
  const { centers, refetch: refetchCenters } = useCenters();
  const [allPledges, setAllPledges] = useState<import("@/types").DonationPledge[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);

  useEffect(() => {
    if (!production) {
      setAllPledges(getAllPledges());
      return;
    }
    void fetchAllPledgesRemote()
      .then(setAllPledges)
      .catch(() => setAllPledges([]));
  }, [production]);

  const refreshPledges = useCallback(async () => {
    if (production) {
      const data = await fetchAllPledgesRemote();
      setAllPledges(data);
    } else {
      setAllPledges(getAllPledges());
    }
  }, [production]);

  const runAdmin = async (
    action: () => void | Promise<void>,
    okMessage?: string
  ) => {
    try {
      setActionError(null);
      setActionOk(null);
      await action();
      if (production) {
        emitStoreUpdate();
        await refetchCenters();
        await refreshPledges();
      }
      if (okMessage) setActionOk(okMessage);
    } catch (e) {
      setActionOk(null);
      setActionError(
        e instanceof StoreAuthError
          ? e.message
          : e instanceof Error
            ? e.message
            : "No se pudo completar la acción."
      );
    }
  };

  const stats = useMemo(() => {
    if (!production) return getGlobalStats();
    const needs = centers.reduce((s, c) => s + c.urgent_needs_count, 0);
    return {
      totalCenters: centers.length,
      activeCenters: centers.filter((c) => c.is_active).length,
      urgentCenters: centers.filter((c) => c.status === "urgent").length,
      totalUrgentNeeds: needs,
      totalPledges: allPledges.length,
      pendingPledges: allPledges.filter((p) => isActivePledge(p.status)).length,
    };
  }, [production, centers, allPledges]);

  const notifications = getAllNotifications().slice(0, 15);

  const [statFilter, setStatFilter] = useState<StatFilter | null>(null);
  const centersSectionRef = useRef<HTMLElement>(null);
  const pledgesSectionRef = useRef<HTMLElement>(null);

  const filteredCenters = useMemo(() => {
    switch (statFilter) {
      case "active_centers":
        return centers.filter((c) => c.is_active);
      case "urgent_centers":
        return centers.filter((c) => c.status === "urgent");
      case "urgent_needs":
        return centers.filter((c) => c.urgent_needs_count > 0);
      case "all_centers":
      case "all_pledges":
      case "active_pledges":
        return centers;
      default:
        return centers;
    }
  }, [centers, statFilter]);

  const filteredPledges = useMemo(() => {
    switch (statFilter) {
      case "active_pledges":
        return allPledges.filter((p) => isActivePledge(p.status));
      case "all_pledges":
        return allPledges;
      default:
        return allPledges.slice(0, 10);
    }
  }, [allPledges, statFilter]);

  const applyStatFilter = (filter: StatFilter) => {
    setStatFilter((prev) => (prev === filter ? null : filter));
    const scrollToPledges =
      filter === "all_pledges" || filter === "active_pledges";
    requestAnimationFrame(() => {
      (scrollToPledges ? pledgesSectionRef : centersSectionRef).current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const clearStatFilter = () => setStatFilter(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<CenterWithStats | null>(
    null
  );
  const [notifyCenter, setNotifyCenter] = useState<CenterWithStats | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<CenterWithStats | null>(
    null
  );

  const openCreate = () => {
    setEditingCenter(null);
    setFormOpen(true);
  };

  const openEdit = (center: CenterWithStats) => {
    setEditingCenter(center);
    setFormOpen(true);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    void runAdmin(async () => {
      if (production) await deleteCenterRemote(deleteTarget.id);
      else deleteCenter(deleteTarget.id);
      setDeleteTarget(null);
    }, "Centro eliminado.");
  };

  return (
    <>
      <PageHeader
        title="Panel Super Admin"
        description="Gestiona centros, envía notificaciones y supervisa donaciones en toda la red."
        breadcrumb={[{ label: "Admin" }]}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/">
              <Button type="button" variant="outline" size="sm" className="gap-1.5">
                <MapPin className="size-3.5" />
                Ver mapa
              </Button>
            </Link>
            <Button type="button" size="sm" className="gap-1.5" onClick={openCreate}>
              <Plus className="size-4" />
              Nuevo centro
            </Button>
          </div>
        }
      />

      <div className="mx-auto max-w-7xl space-y-8 p-4 pb-12">
        {(actionError || actionOk) && (
          <div
            className={cn(
              "rounded-xl border px-4 py-3 text-sm",
              actionError
                ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
                : "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
            )}
          >
            {actionError ?? actionOk}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard
            label="Centros totales"
            value={stats.totalCenters}
            active={statFilter === "all_centers"}
            onClick={() => applyStatFilter("all_centers")}
          />
          <StatCard
            label="Activos"
            value={stats.activeCenters}
            variant="success"
            active={statFilter === "active_centers"}
            onClick={() => applyStatFilter("active_centers")}
          />
          <StatCard
            label="En alerta"
            value={stats.urgentCenters}
            variant="urgent"
            active={statFilter === "urgent_centers"}
            onClick={() => applyStatFilter("urgent_centers")}
          />
          <StatCard
            label="Insumos urgentes"
            value={stats.totalUrgentNeeds}
            variant="urgent"
            active={statFilter === "urgent_needs"}
            onClick={() => applyStatFilter("urgent_needs")}
          />
          <StatCard
            label="Promesas totales"
            value={stats.totalPledges}
            variant="info"
            active={statFilter === "all_pledges"}
            onClick={() => applyStatFilter("all_pledges")}
          />
          <StatCard
            label="En camino"
            value={stats.pendingPledges}
            active={statFilter === "active_pledges"}
            onClick={() => applyStatFilter("active_pledges")}
          />
        </div>

        {statFilter && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
            <p>
              Filtro activo:{" "}
              <span className="font-medium">{FILTER_LABELS[statFilter]}</span>
              {statFilter === "all_centers" ||
              statFilter === "active_centers" ||
              statFilter === "urgent_centers" ||
              statFilter === "urgent_needs" ? (
                <span className="text-muted-foreground">
                  {" "}
                  · {filteredCenters.length} de {centers.length} centros
                </span>
              ) : (
                <span className="text-muted-foreground">
                  {" "}
                  · {filteredPledges.length} promesa
                  {filteredPledges.length === 1 ? "" : "s"}
                </span>
              )}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1"
              onClick={clearStatFilter}
            >
              <X className="size-3.5" />
              Limpiar
            </Button>
          </div>
        )}

        <CenterAccessCodesPanel />

        <section ref={centersSectionRef} className="scroll-mt-24 space-y-4">
          <h2 className="text-lg font-semibold">
            Todos los centros de acopio
            {statFilter &&
              (statFilter === "active_centers" ||
                statFilter === "urgent_centers" ||
                statFilter === "urgent_needs") && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({filteredCenters.length})
                </span>
              )}
          </h2>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Centro</th>
                  <th className="px-4 py-3 font-medium">Ciudad</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Urgentes</th>
                  <th className="px-4 py-3 font-medium">En camino</th>
                  <th className="px-4 py-3 font-medium">Verificado</th>
                  <th className="px-4 py-3 font-medium">Activo</th>
                  <th className="px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredCenters.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      Ningún centro coincide con este filtro.
                    </td>
                  </tr>
                ) : (
                  filteredCenters.map((center) => (
                  <tr key={center.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">
                      <span className="flex items-center gap-1.5">
                        {center.name}
                        {center.is_verified && (
                          <VerifiedCenterBadge size="sm" showLabel={false} />
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {center.city}
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={center.status}
                        onValueChange={(v) =>
                          v &&
                          runAdmin(
                            async () => {
                              if (production) {
                                await updateCenterStatusRemote(
                                  center.id,
                                  v as CenterStatus
                                );
                              } else {
                                updateCenterStatus(center.id, v as CenterStatus);
                              }
                            },
                            "Estado actualizado."
                          )
                        }
                      >
                        <SelectTrigger className="h-8 w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="urgent">Urgente</SelectItem>
                          <SelectItem value="operational">Operativo</SelectItem>
                          <SelectItem value="full">Lleno</SelectItem>
                          <SelectItem value="closed">Cerrado</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 font-medium text-red-600">
                      {center.urgent_needs_count}
                    </td>
                    <td className="px-4 py-3">{center.pending_pledges_count}</td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        title={
                          center.is_verified
                            ? "Quitar verificación"
                            : "Marcar como verificado"
                        }
                        onClick={() =>
                          runAdmin(
                            async () => {
                              if (production) {
                                await toggleCenterVerifiedRemote(
                                  center.id,
                                  !center.is_verified
                                );
                              } else {
                                toggleCenterVerified(center.id);
                              }
                            },
                            center.is_verified
                              ? "Verificación removida."
                              : "Centro marcado como verificado."
                          )
                        }
                      >
                        <BadgeCheck
                          className={cn(
                            "size-4",
                            center.is_verified
                              ? "text-blue-600"
                              : "text-muted-foreground"
                          )}
                        />
                      </Button>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        title={center.is_active ? "Desactivar" : "Activar"}
                        onClick={() =>
                          runAdmin(
                            async () => {
                              if (production) {
                                await toggleCenterActiveRemote(
                                  center.id,
                                  !center.is_active
                                );
                              } else {
                                toggleCenterActive(center.id);
                              }
                            },
                            center.is_active
                              ? "Centro desactivado."
                              : "Centro activado."
                          )
                        }
                      >
                        {center.is_active ? (
                          <Eye className="size-4 text-green-600" />
                        ) : (
                          <EyeOff className="size-4 text-muted-foreground" />
                        )}
                      </Button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-0.5">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          title="Editar centro"
                          onClick={() => openEdit(center)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          title="Enviar notificación"
                          onClick={() => setNotifyCenter(center)}
                        >
                          <Bell className="size-4 text-violet-600" />
                        </Button>
                        <Link
                          href={`/centro/${center.id}`}
                          className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted"
                          title="Vista pública"
                        >
                          <ExternalLink className="size-4" />
                        </Link>
                        <a
                          href={`https://www.google.com/maps?q=${center.latitude},${center.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted"
                          title="Abrir en mapa"
                        >
                          <MapPin className="size-4" />
                        </a>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          title="Eliminar centro"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => setDeleteTarget(center)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Notificaciones enviadas</h2>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no has enviado notificaciones a ningún centro.
            </p>
          ) : (
            <ul className="space-y-2">
              {notifications.map((n) => {
                const center = centers.find((c) => c.id === n.center_id);
                return (
                  <li
                    key={n.id}
                    className="flex flex-wrap items-start justify-between gap-2 rounded-lg border px-4 py-3 text-sm"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-medium">{n.title}</p>
                      <p className="text-muted-foreground line-clamp-2">
                        {n.body}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        → {center?.name ?? "Centro eliminado"} ·{" "}
                        {n.read_at ? (
                          <span className="text-green-600">Leída</span>
                        ) : (
                          <span className="text-amber-600">Pendiente</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(n.created_at).toLocaleString("es-VE")}
                      </span>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        title="Eliminar notificación"
                        onClick={() =>
                          runAdmin(
                            () => {
                              deleteNotification(n.id);
                            },
                            "Notificación eliminada."
                          )
                        }
                      >
                        <Trash2 className="size-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section ref={pledgesSectionRef} className="scroll-mt-24 space-y-4">
          <h2 className="text-lg font-semibold">
            {statFilter === "all_pledges" || statFilter === "active_pledges"
              ? FILTER_LABELS[statFilter]
              : "Últimas promesas de donación"}
            {(statFilter === "all_pledges" || statFilter === "active_pledges") && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({filteredPledges.length})
              </span>
            )}
          </h2>
          {filteredPledges.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {statFilter === "active_pledges"
                ? "No hay promesas en camino en este momento."
                : "Sin promesas registradas."}
            </p>
          ) : (
            <ul className="space-y-2">
              {filteredPledges.map((p) => {
                const center = centers.find((c) => c.id === p.center_id);
                return (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn("shrink-0", PLEDGE_STATUS_STYLES[p.status])}
                      >
                        {PLEDGE_STATUS_LABELS[p.status]}
                      </Badge>
                      <span>
                        <span className="font-medium">{p.donor_name}</span>
                        <span className="text-muted-foreground">
                          {" "}→ {p.items_description}
                        </span>
                        {center && (
                          <span className="text-muted-foreground">
                            {" "}· {center.name}
                          </span>
                        )}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleString("es-VE")}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <CenterFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        center={editingCenter}
        onSaved={() =>
          setActionOk(
            editingCenter ? "Centro actualizado." : "Centro creado en el mapa."
          )
        }
      />

      <CenterNotifyDialog
        open={!!notifyCenter}
        onOpenChange={(open) => !open && setNotifyCenter(null)}
        center={notifyCenter}
        onSent={() => setActionOk("Notificación enviada al centro.")}
      />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Eliminar centro</DialogTitle>
            <DialogDescription>
              ¿Eliminar <strong>{deleteTarget?.name}</strong>? Se borrarán su
              inventario, promesas y notificaciones asociadas. Esta acción no se
              puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Eliminar definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
