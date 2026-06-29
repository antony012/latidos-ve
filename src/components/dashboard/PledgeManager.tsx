"use client";

import { useState } from "react";
import {
  Banknote,
  CalendarClock,
  CheckCircle2,
  MapPin,
  Package,
  Phone,
  Truck,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  cancelPledge,
  confirmPledgeReceived,
  updatePledgeStatus,
} from "@/lib/store/demo-store";
import { useCenterPledges } from "@/hooks/use-centers";
import { useStoreSync } from "@/hooks/use-store-sync";
import {
  isActivePledge,
  PLEDGE_STATUS_LABELS,
  PLEDGE_STATUS_STYLES,
} from "@/lib/utils/pledges";
import { cn } from "@/lib/utils";
import type { DonationPledge } from "@/types";
import {
  PledgeAttachmentBadge,
  PledgeAttachmentPreview,
} from "@/components/donor/PledgeAttachment";

function PledgeCard({ pledge }: { pledge: DonationPledge }) {
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => void) => {
    setError(null);
    try {
      fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado.");
    }
  };

  const isPickup = pledge.delivery_method === "pickup";

  return (
    <li className="rounded-xl border p-3">
      <div className="flex gap-3">
        {pledge.attachment_url && (
          <PledgeAttachmentPreview pledge={pledge} size="md" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
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
              {isPickup && (
                <Badge variant="outline" className="text-[10px]">
                  <Truck className="mr-1 size-3" /> Retiro
                </Badge>
              )}
              <PledgeAttachmentBadge pledge={pledge} />
            </div>
            <Badge
              variant="outline"
              className={cn("shrink-0", PLEDGE_STATUS_STYLES[pledge.status])}
            >
              {PLEDGE_STATUS_LABELS[pledge.status]}
            </Badge>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            {pledge.donor_name}
            {pledge.donation_type === "money" && pledge.amount != null && (
              <> · {pledge.amount} {pledge.currency ?? "USD"}</>
            )}
            {pledge.donation_type === "supplies" && <> · {pledge.quantity} ud.</>}
          </p>

          {isPickup && pledge.pickup_address && (
            <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 size-3 shrink-0" />
              {pledge.pickup_address}
            </p>
          )}
          {isPickup && pledge.contact_phone && (
            <a
              href={`tel:${pledge.contact_phone}`}
              className="mt-1 flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <Phone className="size-3" />
              {pledge.contact_phone}
            </a>
          )}
          {pledge.scheduled_at && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock className="size-3" />
              {new Date(pledge.scheduled_at).toLocaleString("es-VE")}
            </p>
          )}
          {pledge.notes && (
            <p className="mt-1 text-xs text-muted-foreground">{pledge.notes}</p>
          )}

          {error && (
            <p className="mt-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          )}

          {isActivePledge(pledge.status) && (
            <div className="mt-2 flex flex-wrap gap-2">
              {pledge.status === "pending" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => run(() => updatePledgeStatus(pledge.id, "confirmed"))}
                >
                  Confirmar
                </Button>
              )}
              {pledge.status === "confirmed" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => run(() => updatePledgeStatus(pledge.id, "in_transit"))}
                >
                  <Truck className="size-3" /> En camino
                </Button>
              )}
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => run(() => confirmPledgeReceived(pledge.id))}
              >
                <CheckCircle2 className="size-3" /> Recibido
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-red-600 hover:text-red-700"
                onClick={() => run(() => cancelPledge(pledge.id))}
              >
                <X className="size-3" /> Rechazar
              </Button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

export function PledgeManager({ centerId }: { centerId: string }) {
  useStoreSync();
  const { pledges, loading } = useCenterPledges(centerId);

  const active = pledges.filter((p) => isActivePledge(p.status));
  const pickups = active.filter((p) => p.delivery_method === "pickup");
  const history = pledges.filter((p) => !isActivePledge(p.status));

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (!pledges.length) {
    return (
      <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Todavía no hay donaciones prometidas. Aparecerán aquí en tiempo real.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {pickups.length > 0 && (
        <section className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <Truck className="size-4" /> Retiros programados ({pickups.length})
          </h3>
          <ul className="space-y-2">
            {pickups.map((p) => (
              <PledgeCard key={p.id} pledge={p} />
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">
          Donaciones activas ({active.length})
        </h3>
        {active.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            No hay donaciones activas en este momento.
          </p>
        ) : (
          <ul className="space-y-2">
            {active.map((p) => (
              <PledgeCard key={p.id} pledge={p} />
            ))}
          </ul>
        )}
      </section>

      {history.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Historial ({history.length})
          </h3>
          <ul className="space-y-2 opacity-70">
            {history.map((p) => (
              <PledgeCard key={p.id} pledge={p} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
