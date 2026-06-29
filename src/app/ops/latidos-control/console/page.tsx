"use client";

import { OpsConsoleShell } from "@/components/layout/OpsConsoleShell";
import { RequireRole } from "@/components/auth/RequireRole";
import { SuperAdminDashboard } from "@/components/admin/SuperAdminDashboard";

export default function OpsConsolePage() {
  return (
    <OpsConsoleShell>
      <RequireRole roles={["super_admin"]}>
        <SuperAdminDashboard />
      </RequireRole>
    </OpsConsoleShell>
  );
}
