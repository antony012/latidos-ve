"use client";

import Link from "next/link";
import { Clock, ExternalLink, MapPin, Phone, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCenterNeeds } from "@/hooks/use-centers";
import { CENTER_STATUS_LABELS } from "@/lib/constants/venezuela";
import {
  CENTER_STATUS_STYLES,
  formatSchedule,
} from "@/lib/utils/centers";
import type { CenterWithStats } from "@/types";
import { cn } from "@/lib/utils";
import { VerifiedCenterBadge } from "./VerifiedCenterBadge";
import { InventoryList } from "./InventoryList";
import { NavigateButtons } from "./NavigateButtons";
import { CenterMap } from "./CenterMap";

interface CenterPublicViewProps {
  center: CenterWithStats;
  compact?: boolean;
  onSelect?: () => void;
  selected?: boolean;
  showMap?: boolean;
  showFullPageLink?: boolean;
}

export function CenterPublicView({
  center,
  compact = false,
  onSelect,
  selected = false,
  showMap = false,
  showFullPageLink = true,
}: CenterPublicViewProps) {
  const { needs, loading, refetch } = useCenterNeeds(compact ? null : center.id);
  const statusStyle = CENTER_STATUS_STYLES[center.status];
  const lastUpdate =
    needs.length > 0
      ? needs.reduce(
          (latest, n) => (n.updated_at > latest ? n.updated_at : latest),
          needs[0].updated_at
        )
      : null;

  if (compact) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex w-full gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-muted/50",
          selected && "border-primary bg-primary/5 ring-1 ring-primary/20"
        )}
      >
        {center.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={center.image_url}
            alt=""
            className={cn(
              "size-14 shrink-0 rounded-lg object-cover",
              center.is_verified && "ring-2 ring-blue-600 ring-offset-1"
            )}
          />
        ) : (
          <div
            className="flex size-14 shrink-0 items-center justify-center rounded-lg text-white"
            style={{ background: statusStyle.marker }}
          >
            <MapPin className="size-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate font-medium">
                {center.name}
                {center.is_verified && (
                  <VerifiedCenterBadge size="sm" showLabel={false} />
                )}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {center.city} · {center.address}
              </p>
            </div>
            <Badge variant="outline" className={cn("shrink-0 text-xs", statusStyle.badge)}>
              {CENTER_STATUS_LABELS[center.status]}
            </Badge>
          </div>
          <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
            <span className="text-red-600">{center.urgent_needs_count} urgentes</span>
            <span>{center.pending_pledges_count} en camino</span>
          </div>
        </div>
      </button>
    );
  }

  return (
    <Card className="border-0 shadow-none ring-0">
      <CardHeader>
        {center.image_url && (
          <div className="relative mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={center.image_url}
              alt=""
              className={cn(
                "h-40 w-full rounded-xl object-cover",
                center.is_verified && "ring-2 ring-blue-600"
              )}
            />
            {center.is_verified && (
              <div className="absolute bottom-2 left-2">
                <VerifiedCenterBadge />
              </div>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex flex-wrap items-center gap-2">
              {center.name}
              {center.is_verified && <VerifiedCenterBadge size="sm" />}
            </CardTitle>
            <CardDescription className="mt-1">{center.description}</CardDescription>
          </div>
          <Badge variant="outline" className={statusStyle.badge}>
            {CENTER_STATUS_LABELS[center.status]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {showMap && <CenterMap center={center} />}

        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0" />
            {center.address}, {center.city}, {center.state}
          </p>
          <p className="flex items-center gap-2">
            <Clock className="size-4 shrink-0" />
            {formatSchedule(center.schedule)}
          </p>
          {center.phone && (
            <p className="flex items-center gap-2">
              <Phone className="size-4 shrink-0" />
              <a href={`tel:${center.phone}`} className="hover:underline">
                {center.phone}
              </a>
            </p>
          )}
        </div>

        <NavigateButtons
          latitude={center.latitude}
          longitude={center.longitude}
          address={center.address}
        />

        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <p className="font-medium">Transparencia en tiempo real</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <p className="text-lg font-bold text-red-600">
                {center.urgent_needs_count}
              </p>
              <p className="text-muted-foreground">Urgentes</p>
            </div>
            <div>
              <p className="text-lg font-bold text-green-600">
                {center.covered_needs_count}
              </p>
              <p className="text-muted-foreground">Cubiertos</p>
            </div>
            <div>
              <p className="text-lg font-bold">{center.pending_pledges_count}</p>
              <p className="text-muted-foreground">En camino</p>
            </div>
          </div>
          {lastUpdate && (
            <p className="mt-2 text-[10px] text-muted-foreground">
              Inventario actualizado:{" "}
              {new Date(lastUpdate).toLocaleString("es-VE")}
            </p>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-medium">Inventario de insumos</h4>
            <Button size="sm" variant="ghost" onClick={() => refetch()}>
              <RefreshCw className="size-3.5" />
              Actualizar
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <InventoryList
              centerId={center.id}
              centerName={center.name}
              needs={needs}
            />
          )}
        </div>

        {showFullPageLink && (
          <Link
            href={`/centro/${center.id}`}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Ver página completa del centro
            <ExternalLink className="size-3.5" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
