"use client";

import { useCallback, useEffect, useState } from "react";
import { Gift, Heart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isProductionMode } from "@/lib/config/env";
import { getRecentDonationAnnouncements } from "@/lib/store/demo-store";
import { fetchRecentDonationAnnouncements } from "@/lib/supabase/remote-data";
import {
  DONATION_ANNOUNCED_EVENT,
  subscribeStoreUpdate,
  type DonationAnnouncedDetail,
} from "@/lib/store/events";
import { useStoreSync } from "@/hooks/use-store-sync";
import { cn } from "@/lib/utils";
import type { DonationAnnouncement } from "@/types";

const DISMISSED_KEY = "ve-ayuda:dismissed-donation-feed";
const AUTO_DISMISS_MS = 12_000;
const MAX_VISIBLE = 3;

function readDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(DISMISSED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeDismissed(ids: Set<string>) {
  sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
}

export function DonationThanksFeed() {
  useStoreSync();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [announcements, setAnnouncements] = useState<DonationAnnouncement[]>([]);

  const refresh = useCallback(async () => {
    if (isProductionMode()) {
      try {
        setAnnouncements(await fetchRecentDonationAnnouncements(10));
        return;
      } catch {
        setAnnouncements([]);
        return;
      }
    }
    setAnnouncements(getRecentDonationAnnouncements(10));
  }, []);

  useEffect(() => {
    setDismissed(readDismissed());
    void refresh();
    return subscribeStoreUpdate(refresh);
  }, [refresh]);

  useEffect(() => {
    const onAnnounced = (event: Event) => {
      const detail = (event as CustomEvent<DonationAnnouncedDetail>).detail;
      if (!detail) return;
      refresh();
      setDismissed((prev) => {
        const next = new Set(prev);
        next.delete(detail.id);
        writeDismissed(next);
        return next;
      });
    };
    window.addEventListener(DONATION_ANNOUNCED_EVENT, onAnnounced);
    return () => window.removeEventListener(DONATION_ANNOUNCED_EVENT, onAnnounced);
  }, [refresh]);

  const visible = announcements
    .filter((a) => !dismissed.has(a.id))
    .slice(0, MAX_VISIBLE);

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      writeDismissed(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (visible.length === 0) return;
    const timers = visible.map((a) =>
      window.setTimeout(() => dismiss(a.id), AUTO_DISMISS_MS)
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [visible, dismiss]);

  if (visible.length === 0) return null;

  return (
    <div
      className="pointer-events-none relative z-30 shrink-0 px-3 pb-2 pt-1"
      aria-live="polite"
      aria-label="Agradecimientos por donaciones recientes"
    >
      <ul className="mx-auto flex max-w-2xl flex-col gap-2">
        {visible.map((a) => (
          <li
            key={a.id}
            className={cn(
              "donation-thanks-in pointer-events-auto flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 shadow-md",
              "dark:border-green-900 dark:bg-green-950/90"
            )}
          >
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
              <Heart className="size-4 fill-white" />
            </span>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold text-green-900 dark:text-green-100">
                ¡Gracias, {a.donor_name}!
              </p>
              <p className="text-green-800 dark:text-green-200">
                Por aportar{" "}
                <span className="inline-flex items-center gap-0.5 font-medium">
                  <Gift className="inline size-3.5 shrink-0" />
                  {a.items_description}
                </span>{" "}
                a <span className="font-medium">{a.center_name}</span>.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-green-700 hover:bg-green-100 hover:text-green-900 dark:text-green-300 dark:hover:bg-green-900"
              onClick={() => dismiss(a.id)}
              aria-label="Cerrar aviso"
            >
              <X className="size-3.5" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
