"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  MapPin,
  User,
} from "lucide-react";
import { LogoBrand } from "@/components/brand/Logo";
import { useAuth } from "@/contexts/auth-context";
import { ROLES, type AppRole } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: AppRole[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Mapa", icon: MapPin, roles: ["donor", "center_admin", "super_admin"] },
  { href: "/dashboard", label: "Mi centro", icon: LayoutDashboard, roles: ["center_admin"] },
];

export function AppHeader() {
  const pathname = usePathname();
  const { session, logout } = useAuth();

  const visibleNav = NAV_ITEMS.filter((item) =>
    !session ? item.roles.includes("donor") : item.roles.includes(session.role)
  );

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
        <Link href={session ? ROLES[session.role].homeRoute : "/"} className="flex shrink-0 items-center gap-2">
          <LogoBrand showTagline className="hidden sm:flex" />
          <LogoBrand showTagline={false} compact className="sm:hidden" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {visibleNav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
                pathname === href || pathname.startsWith(href + "/")
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {session ? (
            <>
              <div className="hidden items-center gap-2 sm:flex">
                <div className="flex size-7 items-center justify-center rounded-full bg-muted">
                  <User className="size-3.5" />
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium leading-none">{session.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {ROLES[session.role].label}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  logout();
                  window.location.href = "/";
                }}
              >
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Salir</span>
              </Button>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const { session } = useAuth();

  if (session && session.role !== "donor") return null;

  const items = NAV_ITEMS.filter((i) => i.roles.includes("donor"));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="flex h-14 items-stretch justify-around">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px]",
                active ? "text-primary font-medium" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("size-5", active && "text-primary")} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="flex min-h-0 flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
