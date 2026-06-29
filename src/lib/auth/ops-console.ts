/** Ruta secreta de la consola de operaciones (no enlazar en la app pública). */
export const OPS_CONSOLE_PATH = "/ops/latidos-control";

export const OPS_CONSOLE_DASHBOARD_PATH = "/ops/latidos-control/console";

/** Roles visibles en el login público /auth/login */
export const PUBLIC_LOGIN_ROLES = ["donor", "center_admin"] as const;
