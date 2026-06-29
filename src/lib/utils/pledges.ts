import type { PledgeStatus } from "@/types";

export const PLEDGE_STATUS_LABELS: Record<PledgeStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  in_transit: "En camino",
  delivered: "Entregada",
  cancelled: "Cancelada",
};

export const PLEDGE_STATUS_STYLES: Record<PledgeStatus, string> = {
  pending:
    "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  confirmed:
    "border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  in_transit:
    "border-indigo-300 bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
  delivered:
    "border-green-300 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200",
  cancelled:
    "border-gray-300 bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-400",
};

/** Estados en los que la donación sigue "viva" / cuenta como entrante. */
export const ACTIVE_PLEDGE_STATUSES: PledgeStatus[] = [
  "pending",
  "confirmed",
  "in_transit",
];

export function isActivePledge(status: PledgeStatus): boolean {
  return ACTIVE_PLEDGE_STATUSES.includes(status);
}
