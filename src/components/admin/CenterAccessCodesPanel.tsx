"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Copy,
  KeyRound,
  Pencil,
  RefreshCw,
  ShieldOff,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCenters } from "@/hooks/use-centers";
import { isProductionMode } from "@/lib/config/env";
import { validateAccessCode } from "@/lib/auth/access-code-utils";
import {
  listLocalCenterCodes,
  regenerateLocalCenterCode,
  removeLocalCenterCode,
  setLocalCenterCode,
} from "@/lib/auth/access-codes";
import type { CenterAccessCodeRow } from "@/app/api/admin/access-codes/route";
import type { CenterWithStats } from "@/types";

interface RevealedCode {
  centerName: string;
  code: string;
}

interface EditTarget {
  center: CenterWithStats;
  currentCode: string;
}

export function CenterAccessCodesPanel() {
  const { centers } = useCenters();
  const production = isProductionMode();
  const [remoteCodes, setRemoteCodes] = useState<CenterAccessCodeRow[]>([]);
  const [localCodes, setLocalCodes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(production);
  const [busyCenterId, setBusyCenterId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<RevealedCode | null>(null);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const loadRemote = useCallback(async () => {
    if (!production) {
      setLocalCodes(listLocalCenterCodes());
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/access-codes", { credentials: "include" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "No se pudieron cargar los códigos.");
      }
      const data = (await res.json()) as { codes: CenterAccessCodeRow[] };
      setRemoteCodes(data.codes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar códigos.");
      setRemoteCodes([]);
    } finally {
      setLoading(false);
    }
  }, [production]);

  useEffect(() => {
    void loadRemote();
  }, [loadRemote]);

  const getCodeForCenter = (center: CenterWithStats) => {
    if (production) {
      return remoteCodes.find((c) => c.center_id === center.id) ?? null;
    }
    const code = localCodes[center.id];
    return code
      ? {
          center_id: center.id,
          access_code: code,
          is_active: true,
        }
      : null;
  };

  const openEdit = (center: CenterWithStats, currentCode: string) => {
    setEditTarget({ center, currentCode });
    setEditCode(currentCode);
    setEditError(null);
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    const validationError = validateAccessCode(editCode);
    if (validationError) {
      setEditError(validationError);
      return;
    }

    setSavingEdit(true);
    setEditError(null);
    setBusyCenterId(editTarget.center.id);

    try {
      if (!production) {
        setLocalCenterCode(editTarget.center.id, editCode);
        setLocalCodes(listLocalCenterCodes());
        setEditTarget(null);
        return;
      }

      const hasExisting = Boolean(editTarget.currentCode);

      const res = await fetch("/api/admin/access-codes", {
        method: hasExisting ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          hasExisting
            ? { centerId: editTarget.center.id, accessCode: editCode }
            : {
                centerId: editTarget.center.id,
                label: editTarget.center.name,
                accessCode: editCode,
              }
        ),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar el código.");
      await loadRemote();
      setEditTarget(null);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Error al guardar.");
    } finally {
      setSavingEdit(false);
      setBusyCenterId(null);
    }
  };

  const generateCode = async (center: CenterWithStats) => {
    setBusyCenterId(center.id);
    setError(null);
    try {
      if (!production) {
        const code = regenerateLocalCenterCode(center.id);
        setLocalCodes(listLocalCenterCodes());
        setRevealed({ centerName: center.name, code });
        return;
      }

      const res = await fetch("/api/admin/access-codes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ centerId: center.id, label: center.name }),
      });
      const data = (await res.json()) as {
        error?: string;
        plainCode?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "No se pudo generar el código.");
      await loadRemote();
      if (data.plainCode) {
        setRevealed({ centerName: center.name, code: data.plainCode });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al generar código.");
    } finally {
      setBusyCenterId(null);
    }
  };

  const toggleActive = async (center: CenterWithStats, isActive: boolean) => {
    if (!production) return;
    setBusyCenterId(center.id);
    setError(null);
    try {
      const res = await fetch("/api/admin/access-codes", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ centerId: center.id, isActive }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo actualizar.");
      await loadRemote();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al actualizar.");
    } finally {
      setBusyCenterId(null);
    }
  };

  const revokeCode = async (center: CenterWithStats) => {
    if (
      !window.confirm(
        `¿Revocar el código de acceso de "${center.name}"? Los encargados deberán usar uno nuevo.`
      )
    ) {
      return;
    }
    setBusyCenterId(center.id);
    setError(null);
    try {
      if (!production) {
        removeLocalCenterCode(center.id);
        setLocalCodes(listLocalCenterCodes());
        return;
      }
      const res = await fetch(
        `/api/admin/access-codes?centerId=${encodeURIComponent(center.id)}`,
        { method: "DELETE", credentials: "include" }
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo revocar.");
      await loadRemote();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al revocar.");
    } finally {
      setBusyCenterId(null);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="scroll-mt-24 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Códigos de encargados</h2>
          <p className="text-sm text-muted-foreground">
            Crea, edita o regenera el código de cada centro. El encargado lo usa
            en <span className="font-medium">/auth/login</span>.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void loadRemote()}>
          <RefreshCw className="mr-1.5 size-3.5" />
          Actualizar
        </Button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Centro</th>
              <th className="px-4 py-3 font-medium">Ciudad</th>
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Cargando códigos…
                </td>
              </tr>
            ) : centers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No hay centros registrados. Crea un centro primero.
                </td>
              </tr>
            ) : (
              centers.map((center) => {
                const entry = getCodeForCenter(center);
                const busy = busyCenterId === center.id;
                return (
                  <tr key={center.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{center.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{center.city}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {entry ? (
                        <span className="inline-flex items-center gap-1.5">
                          <KeyRound className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="font-semibold tracking-wide">
                            {entry.access_code}
                          </span>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            className="size-6"
                            title="Copiar código"
                            onClick={() => void copyCode(entry.access_code)}
                          >
                            <Copy className="size-3" />
                          </Button>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Sin código</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {entry ? (
                        <Badge
                          variant="outline"
                          className={
                            entry.is_active
                              ? "border-green-200 bg-green-50 text-green-800"
                              : "border-amber-200 bg-amber-50 text-amber-800"
                          }
                        >
                          {entry.is_active ? "Activo" : "Suspendido"}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pendiente</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {entry ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1"
                            disabled={busy}
                            onClick={() => openEdit(center, entry.access_code)}
                          >
                            <Pencil className="size-3.5" />
                            Editar
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8"
                            disabled={busy}
                            onClick={() => openEdit(center, "")}
                          >
                            <Pencil className="mr-1 size-3.5" />
                            Crear código
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8"
                          disabled={busy}
                          onClick={() => void generateCode(center)}
                        >
                          {entry ? "Aleatorio" : "Generar"}
                        </Button>
                        {production && entry && (
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            title={entry.is_active ? "Suspender" : "Activar"}
                            disabled={busy}
                            onClick={() =>
                              void toggleActive(center, !entry.is_active)
                            }
                          >
                            {entry.is_active ? (
                              <ShieldOff className="size-3.5" />
                            ) : (
                              <ShieldCheck className="size-3.5" />
                            )}
                          </Button>
                        )}
                        {entry && (
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            title="Revocar"
                            disabled={busy}
                            onClick={() => void revokeCode(center)}
                          >
                            <RefreshCw className="size-3.5 rotate-180" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        open={Boolean(editTarget)}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editTarget?.currentCode ? "Editar código" : "Crear código"}
            </DialogTitle>
            <DialogDescription>
              Código de acceso para{" "}
              <span className="font-medium">{editTarget?.center.name}</span>.
              Puedes usar letras, números o guiones (4–32 caracteres).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="access-code-edit">Código de acceso</Label>
            <Input
              id="access-code-edit"
              value={editCode}
              onChange={(e) => {
                setEditCode(e.target.value.toUpperCase());
                setEditError(null);
              }}
              placeholder="Ej: PARQUE-2024"
              className="font-mono tracking-widest"
              autoComplete="off"
            />
            {editError && (
              <p className="text-sm text-red-600 dark:text-red-400">{editError}</p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditTarget(null)}
              disabled={savingEdit}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void saveEdit()}
              disabled={savingEdit || !editCode.trim()}
            >
              Guardar código
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(revealed)} onOpenChange={() => setRevealed(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Código generado</DialogTitle>
            <DialogDescription>
              Código aleatorio para{" "}
              <span className="font-medium">{revealed?.centerName}</span>.
            </DialogDescription>
          </DialogHeader>
          {revealed && (
            <div className="rounded-xl border bg-muted/40 px-4 py-6 text-center">
              <p className="font-mono text-2xl font-bold tracking-widest">
                {revealed.code}
              </p>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            {revealed && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void copyCode(revealed.code)}
              >
                <Copy className="mr-1.5 size-3.5" />
                Copiar
              </Button>
            )}
            <Button type="button" onClick={() => setRevealed(null)}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
