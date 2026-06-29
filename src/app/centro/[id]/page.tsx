"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { CenterPublicView } from "@/components/centers/CenterPublicView";
import { Skeleton } from "@/components/ui/skeleton";
import { getMockCenterById } from "@/lib/mock/centers";
import { isProductionMode } from "@/lib/config/env";
import { fetchCenterById } from "@/lib/supabase/remote-data";
import { subscribeStoreUpdate } from "@/lib/store/events";
import type { CenterWithStats } from "@/types";

export default function CentroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [center, setCenter] = useState<CenterWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [centerId, setCenterId] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setCenterId(p.id));
  }, [params]);

  useEffect(() => {
    if (!centerId) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (isProductionMode()) {
          setCenter(await fetchCenterById(centerId));
        } else {
          setCenter(await getMockCenterById(centerId));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo cargar el centro.");
        setCenter(null);
      } finally {
        setLoading(false);
      }
    };

    void load();
    return subscribeStoreUpdate(() => {
      void load();
    });
  }, [centerId]);

  return (
    <AppShell>
      <div className="border-b px-4 py-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Volver al inicio
        </Link>
      </div>
      <main className="mx-auto max-w-2xl p-4 pb-8">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-52 w-full rounded-xl" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : error || !center ? (
          <p className="text-center text-sm text-muted-foreground">
            {error ?? "Centro no encontrado."}
          </p>
        ) : (
          <CenterPublicView
            center={center}
            showMap
            showFullPageLink={false}
          />
        )}
      </main>
    </AppShell>
  );
}
