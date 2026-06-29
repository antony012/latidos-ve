"use client";

import { useState } from "react";
import Link from "next/link";
import { Banknote, CalendarClock, MapPin, Package, Radio, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import {
  cancelPledge,
  getAllCenters,
  getDonorPledges,
} from "@/lib/store/demo-store";
import { useStoreSync } from "@/hooks/use-store-sync";
import { PLEDGE_STATUS_LABELS, PLEDGE_STATUS_STYLES } from "@/lib/utils/pledges";
import { cn } from "@/lib/utils";
import {
  PledgeAttachmentBadge,
  PledgeAttachmentPreview,
} from "./PledgeAttachment";

export function MyPledges() {
  useStoreSync();
  const { session } = useAuth();
  const [error, setError] = useState<string | null>(null);

  if (!session) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Inicia sesión como donante para ver tus promesas de ayuda.
      </div>
    );
  }

  const pledges = getDonorPledges(session.userId, session.name);
  const centers = getAllCenters();

  const handleCancel = (id: string) => {
    setError(null);
    try {
      cancelPledge(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cancelar.");
    }
  };

  if (!pledges.length) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <Package className="mx-auto size-10 text-muted-foreground/50" />
        <p className="mt-3 font-medium">Aún no has prometido donaciones</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Explora las necesidades urgentes y confirma tu donación con foto o
          comprobante.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      <ul className="space-y-3">
        {pledges.map((pledge) => {
          const center = centers.find((c) => c.id === pledge.center_id);
          const canCancel =
            pledge.status !== "delivered" && pledge.status !== "cancelled";
          return (
            <li key={pledge.id} className="rounded-xl border p-4">
              <div className="flex gap-3">
                {pledge.attachment_url && (
                  <PledgeAttachmentPreview pledge={pledge} size="md" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{pledge.items_description}</p>
                        <Badge variant="outline" className="text-[10px]">
                          {pledge.donation_type === "money" ? (
                            <span className="flex items-center gap-1">
                              <Banknote className="size-3" /> Dinero
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Package className="size-3" /> Insumos
                            </span>
                          )}
                        </Badge>
                        <PledgeAttachmentBadge pledge={pledge} />
                      </div>
                      {center && (
                        <Link
                          href={`/centro/${center.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {center.name}
                        </Link>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("shrink-0", PLEDGE_STATUS_STYLES[pledge.status])}
                    >
                      {PLEDGE_STATUS_LABELS[pledge.status]}
                    </Badge>
                  </div>

                  {pledge.donation_type === "money" && pledge.amount != null && (
                    <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                      {pledge.amount} {pledge.currency ?? "USD"}
                    </p>
                  )}

                  {pledge.status === "in_transit" &&
                    pledge.delivery_method === "dropoff" && (
                      <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
                        <Radio className="size-3.5 animate-pulse" />
                        Seguimiento en tiempo real activo — tu pin se actualiza
                        en el mapa
                        {pledge.updated_at && (
                          <span className="text-indigo-600/80">
                            · {new Date(pledge.updated_at).toLocaleTimeString("es-VE")}
                          </span>
                        )}
                      </p>
                    )}

                  {pledge.donation_type === "supplies" && (
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      {pledge.delivery_method === "pickup" ? (
                        <>
                          <Truck className="size-3.5" /> Retiro programado ·{" "}
                          {pledge.quantity} ud.
                        </>
                      ) : (
                        <>La llevo yo · {pledge.quantity} ud.</>
                      )}
                    </p>
                  )}

                  {pledge.origin_address && (
                    <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="mt-0.5 size-3 shrink-0" />
                      Desde: {pledge.origin_address}
                    </p>
                  )}

                  {pledge.delivery_method === "pickup" && pledge.pickup_address && (
                    <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="mt-0.5 size-3 shrink-0" />
                      {pledge.pickup_address}
                    </p>
                  )}

                  {pledge.scheduled_at && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarClock className="size-3" />
                      {new Date(pledge.scheduled_at).toLocaleString("es-VE")}
                    </p>
                  )}

                  {pledge.notes && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {pledge.notes}
                    </p>
                  )}

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {new Date(pledge.created_at).toLocaleString("es-VE")}
                    </p>
                    {canCancel && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-red-600 hover:text-red-700"
                        onClick={() => handleCancel(pledge.id)}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
