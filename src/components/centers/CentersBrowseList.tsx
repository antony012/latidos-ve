"use client";

import Link from "next/link";
import { Building2, ChevronRight, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCenters } from "@/hooks/use-centers";
import { CENTER_STATUS_LABELS } from "@/lib/constants/venezuela";
import { CENTER_STATUS_STYLES } from "@/lib/utils/centers";
import { cn } from "@/lib/utils";
import { VerifiedCenterBadge } from "./VerifiedCenterBadge";

export function CentersBrowseList() {
  const { centers: allCenters, loading } = useCenters();
  const centers = allCenters.filter((c) => c.is_active);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (!centers.length) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        No hay centros de acopio activos en este momento.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {centers.map((center) => {
        const statusStyle = CENTER_STATUS_STYLES[center.status];
        return (
          <li key={center.id}>
            <Link
              href={`/centro/${center.id}`}
              className="flex items-center gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/40"
            >
              {center.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={center.image_url}
                  alt=""
                  className={cn(
                    "size-14 shrink-0 rounded-xl object-cover shadow",
                    center.is_verified
                      ? "ring-2 ring-blue-600 ring-offset-1"
                      : "ring-2 ring-white"
                  )}
                />
              ) : (
                <div
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                  style={{ background: statusStyle.marker }}
                >
                  <Building2 className="size-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium leading-snug">{center.name}</p>
                  {center.is_verified && (
                    <VerifiedCenterBadge size="sm" />
                  )}
                  <Badge
                    variant="outline"
                    className={cn("text-[10px]", statusStyle.badge)}
                  >
                    {CENTER_STATUS_LABELS[center.status]}
                  </Badge>
                </div>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3 shrink-0" />
                  {center.city} · {center.address}
                </p>
                <p className="mt-1 text-xs">
                  <span className="font-medium text-red-600">
                    {center.urgent_needs_count} urgentes
                  </span>
                  <span className="text-muted-foreground">
                    {" "}· {center.total_needs_count} insumos ·{" "}
                    {center.pending_pledges_count} en camino
                  </span>
                </p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
