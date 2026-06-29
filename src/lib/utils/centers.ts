import type { CenterNeed, CenterStatus, NeedPriority } from "@/types";

export function getInventoryProgress(need: CenterNeed): number {
  if (need.priority === "covered") return 100;
  if (!need.quantity_needed || need.quantity_needed <= 0) return 0;
  return Math.min(
    100,
    Math.round((need.quantity_received / need.quantity_needed) * 100)
  );
}

export const CENTER_STATUS_STYLES: Record<
  CenterStatus,
  { badge: string; marker: string }
> = {
  urgent: {
    badge: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-200",
    marker: "#ef4444",
  },
  operational: {
    badge: "bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-200",
    marker: "#22c55e",
  },
  full: {
    badge: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-200",
    marker: "#f59e0b",
  },
  closed: {
    badge: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400",
    marker: "#6b7280",
  },
};

export const NEED_PRIORITY_STYLES: Record<
  NeedPriority,
  { dot: string; badge: string; label: string }
> = {
  urgent: {
    dot: "bg-red-500",
    badge: "bg-red-100 text-red-800 border-red-200",
    label: "Urgente",
  },
  medium: {
    dot: "bg-amber-500",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    label: "Media",
  },
  low: {
    dot: "bg-blue-500",
    badge: "bg-blue-100 text-blue-800 border-blue-200",
    label: "Baja",
  },
  covered: {
    dot: "bg-green-500",
    badge: "bg-green-100 text-green-800 border-green-200",
    label: "Cubierto",
  },
};

export function formatSchedule(schedule: {
  weekdays?: string;
  weekends?: string;
}): string {
  const parts: string[] = [];
  if (schedule.weekdays) parts.push(`L-V: ${schedule.weekdays}`);
  if (schedule.weekends && schedule.weekends !== "cerrado") {
    parts.push(`S-D: ${schedule.weekends}`);
  } else if (schedule.weekends === "cerrado") {
    parts.push("Fines de semana: cerrado");
  }
  return parts.join(" · ") || "Consultar horario";
}
