"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { CENTER_STATUS_LABELS } from "@/lib/constants/venezuela";
import { CENTER_STATUS_STYLES } from "@/lib/utils/centers";
import { cn } from "@/lib/utils";

export function MapLegend({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn(
        "absolute right-2 top-2 z-[999] sm:right-3 sm:top-3",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-lg border bg-background/95 px-2.5 py-1.5 text-xs font-medium shadow-md backdrop-blur sm:hidden"
        aria-expanded={open}
      >
        Leyenda
        {open ? (
          <ChevronUp className="size-3.5" />
        ) : (
          <ChevronDown className="size-3.5" />
        )}
      </button>

      <div
        className={cn(
          "rounded-lg border bg-background/95 p-2.5 shadow-md backdrop-blur sm:block sm:p-3",
          !open && "hidden sm:block"
        )}
      >
        <p className="mb-1.5 hidden text-xs font-medium sm:block">
          Leyenda
        </p>
        <ul className="space-y-1">
          {(
            Object.keys(CENTER_STATUS_LABELS) as Array<
              keyof typeof CENTER_STATUS_LABELS
            >
          ).map((status) => (
            <li key={status} className="flex items-center gap-2 text-[10px] sm:text-xs">
              <span
                className="size-2.5 shrink-0 rounded-full border border-white shadow sm:size-3"
                style={{ background: CENTER_STATUS_STYLES[status].marker }}
              />
              <span className="leading-tight">{CENTER_STATUS_LABELS[status]}</span>
            </li>
          ))}
          <li className="flex items-center gap-2 text-[10px] sm:text-xs">
            <span className="relative flex size-3 shrink-0 sm:size-3.5">
              <span className="block size-full overflow-hidden rounded-md border-2 border-blue-600 bg-muted" />
              <span className="absolute -bottom-0.5 -right-0.5 flex size-2 items-center justify-center rounded-full bg-blue-600 text-[5px] text-white">
                ✓
              </span>
            </span>
            <span className="leading-tight">Centro verificado</span>
          </li>
          <li className="flex items-center gap-2 text-[10px] sm:text-xs">
            <span className="relative flex size-3 shrink-0 sm:size-3.5">
              <span
                className="block size-full overflow-hidden rounded-md border-[3px] border-green-600 bg-muted"
                style={{ animation: "center-border-pulse 1.6s ease-in-out infinite" }}
              />
            </span>
            <span className="leading-tight">Centro de acopio</span>
          </li>
          <li className="flex items-center gap-2 text-[10px] sm:text-xs">
            <span className="flex size-2.5 shrink-0 items-center justify-center rounded-full bg-green-600 text-[5px] text-white sm:size-3">
              ♥
            </span>
            <span className="leading-tight">Donación prometida</span>
          </li>
          <li className="flex items-center gap-2 text-[10px] sm:text-xs">
            <span className="flex size-2.5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[6px] text-white sm:size-3">
              🚚
            </span>
            <span className="leading-tight">En camino (tiempo real)</span>
          </li>
          <li className="flex items-center gap-2 text-[10px] sm:text-xs">
            <span className="flex size-2.5 shrink-0 items-center justify-center rounded-full bg-red-600 text-[4px] font-bold text-white sm:size-3">
              SOS
            </span>
            <span className="leading-tight">Pide ayuda urgente</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
