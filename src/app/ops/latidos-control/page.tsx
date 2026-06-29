"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { OPS_CONSOLE_DASHBOARD_PATH } from "@/lib/auth/ops-console";
import { getDeviceUserId } from "@/lib/store/demo-store";

export default function OpsLoginPage() {
  const router = useRouter();
  const { login, session } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.role === "super_admin") {
      router.replace(OPS_CONSOLE_DASHBOARD_PATH);
    }
  }, [session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/ops/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as {
        error?: string;
        email?: string;
        name?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "No se pudo iniciar sesión.");
      }

      login({
        userId: getDeviceUserId(),
        role: "super_admin",
        name: data.name ?? "Coordinador",
        email: data.email ?? email.trim().toLowerCase(),
        provider: "local",
        loggedInAt: new Date().toISOString(),
      });

      router.push(OPS_CONSOLE_DASHBOARD_PATH);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border bg-background p-6 shadow-sm">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-violet-600 text-white">
            <Shield className="size-6" />
          </div>
          <h1 className="text-xl font-semibold">Consola de operaciones</h1>
          <p className="text-sm text-muted-foreground">
            Acceso restringido. Esta URL no aparece en la aplicación pública.
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="ops-email">Correo</Label>
            <Input
              id="ops-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ops-password">Contraseña</Label>
            <Input
              id="ops-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full gap-2" disabled={loading}>
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Lock className="size-4" />
            )}
            Entrar a la consola
          </Button>
        </form>
      </div>
    </div>
  );
}
