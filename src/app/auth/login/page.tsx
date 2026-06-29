"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Gift, LayoutDashboard, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import {
  ROLES,
  type AppRole,
  getRoleHomeRoute,
  isAppRole,
} from "@/lib/auth/roles";
import { PUBLIC_LOGIN_ROLES } from "@/lib/auth/ops-console";
import { useCenters } from "@/hooks/use-centers";
import { getDeviceUserId } from "@/lib/store/demo-store";
import {
  verifyCenterCodeLocal,
  verifyCenterCodeRemote,
} from "@/lib/auth/access-codes";
import { isProductionMode } from "@/lib/config/env";
import { LogoHero } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

const ROLE_ICONS = {
  donor: Gift,
  center_admin: LayoutDashboard,
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, session } = useAuth();

  const initialRole = searchParams.get("rol") ?? searchParams.get("role");
  const [selectedRole, setSelectedRole] = useState<AppRole>(() => {
    if (initialRole && isAppRole(initialRole) && initialRole !== "super_admin") {
      return initialRole;
    }
    return "donor";
  });
  const [name, setName] = useState("");
  const [centerId, setCenterId] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { centers } = useCenters();

  useEffect(() => {
    setError(null);
    setAccessCode("");
  }, [selectedRole, centerId]);

  useEffect(() => {
    if (session) {
      router.replace(getRoleHomeRoute(session.role));
    }
  }, [session, router]);

  const requiresCode = selectedRole === "center_admin";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return;
    if (selectedRole === "center_admin" && !centerId) return;
    if (requiresCode && !accessCode.trim()) return;

    setSubmitting(true);
    try {
      if (selectedRole === "center_admin") {
        const valid = isProductionMode()
          ? await verifyCenterCodeRemote(centerId, accessCode)
          : verifyCenterCodeLocal(centerId, accessCode);

        if (!valid) {
          setError("Código de acceso del centro incorrecto o inactivo.");
          return;
        }
      }

      login({
        userId: getDeviceUserId(),
        role: selectedRole,
        name: name.trim(),
        provider: "local",
        centerId: selectedRole === "center_admin" ? centerId : undefined,
        loggedInAt: new Date().toISOString(),
      });

      router.push(getRoleHomeRoute(selectedRole));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg space-y-8">
      <div>
        <LogoHero />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Elige cómo quieres participar en la red de solidaridad
        </p>
      </div>

      <div className="grid gap-3">
        {PUBLIC_LOGIN_ROLES.map((role) => {
          const config = ROLES[role];
          const Icon = ROLE_ICONS[role];
          const selected = selectedRole === role;
          return (
            <button
              key={role}
              type="button"
              onClick={() => setSelectedRole(role)}
              className={cn(
                "flex items-start gap-4 rounded-xl border p-4 text-left transition-all",
                selected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "hover:border-muted-foreground/30 hover:bg-muted/30"
              )}
            >
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg text-white",
                  config.color
                )}
              >
                <Icon className="size-5" />
              </div>
              <div>
                <p className="font-semibold">{config.label}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {config.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 rounded-xl border p-5">
        {selectedRole === "donor" && (
          <>
            <GoogleSignInButton />
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  o con tu nombre
                </span>
              </div>
            </div>
          </>
        )}

        <div className="space-y-1">
          <Label htmlFor="name">Tu nombre</Label>
          <Input
            id="name"
            placeholder={
              selectedRole === "donor"
                ? "Ej: María González"
                : "Ej: Juan Pérez, encargado del centro"
            }
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        {selectedRole === "center_admin" && (
          <div className="space-y-1">
            <Label>Centro que administras</Label>
            <Select
              value={centerId}
              onValueChange={(v) => setCenterId(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona tu centro de acopio" />
              </SelectTrigger>
              <SelectContent>
                {centers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {requiresCode && (
          <div className="space-y-1">
            <Label htmlFor="code">Código de acceso</Label>
            <Input
              id="code"
              type="password"
              autoComplete="off"
              placeholder="Introduce tu código"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              El coordinador nacional te entrega este código para tu centro.
            </p>
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        <Button
          type="submit"
          className="w-full gap-2"
          disabled={
            submitting ||
            (selectedRole === "center_admin" && !centerId) ||
            (requiresCode && !accessCode.trim())
          }
        >
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Entrar como {ROLES[selectedRole].label}
        </Button>
      </form>

      <p className="text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Explorar sin registrarse
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Suspense fallback={<div className="animate-pulse">Cargando…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
