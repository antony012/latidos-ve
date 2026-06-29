"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AppRole } from "@/lib/auth/roles";
import { getRoleHomeRoute } from "@/lib/auth/roles";
import { OPS_CONSOLE_PATH } from "@/lib/auth/ops-console";
import { useAuth } from "@/contexts/auth-context";

export function RequireRole({
  roles,
  children,
}: {
  roles: AppRole[];
  children: React.ReactNode;
}) {
  const { session, isLoading, hasRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!session) {
      const loginPath = roles.includes("super_admin")
        ? OPS_CONSOLE_PATH
        : `/auth/login?rol=${roles[0]}&role=${roles[0]}`;
      router.replace(loginPath);
      return;
    }
    if (!hasRole(...roles)) {
      router.replace(getRoleHomeRoute(session.role));
    }
  }, [session, isLoading, hasRole, roles, router]);

  if (isLoading || !session || !hasRole(...roles)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
