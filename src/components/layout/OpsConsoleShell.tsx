"use client";

import Link from "next/link";
import { LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoBrand } from "@/components/brand/Logo";
import { useAuth } from "@/contexts/auth-context";

export function OpsConsoleShell({ children }: { children: React.ReactNode }) {
  const { session, logout } = useAuth();

  const handleLogout = () => {
    void fetch("/api/auth/ops/logout", { method: "POST" });
    logout();
    window.location.href = "/";
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2">
            <LogoBrand showTagline={false} compact />
            <span className="hidden items-center gap-1 rounded-md bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800 sm:inline-flex dark:bg-violet-950 dark:text-violet-200">
              <Shield className="size-3" />
              Consola ops
            </span>
          </div>
          <div className="flex items-center gap-2">
            {session && (
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {session.email ?? session.name}
              </span>
            )}
            <Link
              href="/"
              className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
            >
              Ver app pública
            </Link>
            <Button type="button" variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 p-4 pb-8">{children}</main>
    </div>
  );
}
