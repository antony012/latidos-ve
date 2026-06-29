"use client";

import Link from "next/link";
import { LayoutDashboard, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoBrand } from "@/components/brand/Logo";
import { getAdminSession } from "@/lib/store/demo-store";
import { useStoreSync } from "@/hooks/use-store-sync";

export function Header() {
  useStoreSync();
  const session = getAdminSession();

  return (
    <header className="flex shrink-0 items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <Link href="/" className="flex items-center gap-2">
        <LogoBrand showTagline compact />
      </Link>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
          <MapPin className="size-4" />
          Mapa
        </Button>
        {session ? (
          <Link
            href="/dashboard"
            className="inline-flex h-7 items-center gap-1 rounded-[min(var(--radius-md),12px)] border border-border bg-background px-2.5 text-[0.8rem] font-medium transition-colors hover:bg-muted"
          >
            <LayoutDashboard className="size-3.5" />
            Mi centro
          </Link>
        ) : (
          <Link
            href="/auth/login"
            className="inline-flex h-7 items-center rounded-[min(var(--radius-md),12px)] border border-border bg-background px-2.5 text-[0.8rem] font-medium transition-colors hover:bg-muted"
          >
            Administrar centro
          </Link>
        )}
      </div>
    </header>
  );
}
