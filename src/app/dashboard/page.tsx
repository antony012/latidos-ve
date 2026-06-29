"use client";

import { AppShell } from "@/components/layout/AppShell";
import { RequireRole } from "@/components/auth/RequireRole";
import { CenterAdminPanel } from "@/components/dashboard/CenterAdminPanel";

export default function DashboardPage() {
  return (
    <AppShell>
      <RequireRole roles={["center_admin"]}>
        <CenterAdminPanel />
      </RequireRole>
    </AppShell>
  );
}
