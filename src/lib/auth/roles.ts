import type { UserRole } from "@/types";
import {
  OPS_CONSOLE_DASHBOARD_PATH,
  OPS_CONSOLE_PATH,
} from "@/lib/auth/ops-console";

export type AppRole = "donor" | "center_admin" | "super_admin";

export interface RoleConfig {
  id: AppRole;
  label: string;
  description: string;
  homeRoute: string;
  loginRoute: string;
  color: string;
}

export const ROLES: Record<AppRole, RoleConfig> = {
  donor: {
    id: "donor",
    label: "Donante",
    description: "Encuentra centros, ve qué falta y promete tu ayuda",
    homeRoute: "/",
    loginRoute: "/auth/login?rol=donor",
    color: "bg-blue-600",
  },
  center_admin: {
    id: "center_admin",
    label: "Encargado de centro",
    description: "Actualiza inventario y estado de tu centro de acopio",
    homeRoute: "/dashboard",
    loginRoute: "/auth/login?rol=center_admin",
    color: "bg-red-600",
  },
  super_admin: {
    id: "super_admin",
    label: "Super administrador",
    description: "Supervisa todos los centros y la plataforma",
    homeRoute: OPS_CONSOLE_DASHBOARD_PATH,
    loginRoute: OPS_CONSOLE_PATH,
    color: "bg-violet-600",
  },
};

export function getRoleHomeRoute(role: AppRole): string {
  return ROLES[role].homeRoute;
}

export function isAppRole(role: string): role is AppRole {
  return role in ROLES;
}

export function toAppRole(role: UserRole): AppRole {
  if (role === "super_admin") return "super_admin";
  if (role === "center_admin" || role === "volunteer") return "center_admin";
  return "donor";
}
