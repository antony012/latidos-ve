"use client";

import { useEffect, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LocationPickerMapLazy } from "@/components/map/LocationPickerMapLazy";
import { VENEZUELAN_STATES } from "@/lib/constants/venezuela";
import { geocodeAddress } from "@/lib/utils/geocode";
import {
  createCenter,
  StoreAuthError,
  updateCenter,
  type UpsertCenterInput,
} from "@/lib/store/demo-store";
import type { CenterWithStats, CenterStatus } from "@/types";

interface CenterFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  center?: CenterWithStats | null;
  onSaved?: () => void;
}

const EMPTY: UpsertCenterInput = {
  name: "",
  description: "",
  address: "",
  city: "",
  state: "Distrito Capital",
  latitude: 10.4806,
  longitude: -66.9036,
  schedule: { weekdays: "9:00-17:00", weekends: "cerrado" },
  status: "operational",
  phone: "",
  email: "",
  image_url: null,
  is_verified: false,
  is_active: true,
};

export function CenterFormDialog({
  open,
  onOpenChange,
  center,
  onSaved,
}: CenterFormDialogProps) {
  const isEdit = !!center;
  const [form, setForm] = useState<UpsertCenterInput>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (center) {
      setForm({
        name: center.name,
        description: center.description ?? "",
        address: center.address,
        city: center.city,
        state: center.state,
        latitude: center.latitude,
        longitude: center.longitude,
        schedule: center.schedule,
        status: center.status,
        phone: center.phone ?? "",
        email: center.email ?? "",
        image_url: center.image_url,
        is_verified: center.is_verified,
        is_active: center.is_active,
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, center]);

  const set = <K extends keyof UpsertCenterInput>(
    key: K,
    value: UpsertCenterInput[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const setCoords = (lat: number, lng: number) => {
    setForm((prev) => ({
      ...prev,
      latitude: Math.round(lat * 1_000_000) / 1_000_000,
      longitude: Math.round(lng * 1_000_000) / 1_000_000,
    }));
  };

  const locateFromAddress = () => {
    const q = [form.address, form.city, form.state].filter(Boolean).join(", ");
    if (q.length < 6) {
      setError("Completa dirección y ciudad antes de buscar en el mapa.");
      return;
    }
    setError(null);
    setGeocoding(true);
    void geocodeAddress(q)
      .then((result) => {
        setCoords(result.lat, result.lng);
      })
      .catch((e) => {
        setError(
          e instanceof Error ? e.message : "No se encontró esa dirección."
        );
      })
      .finally(() => setGeocoding(false));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload: UpsertCenterInput = {
        ...form,
        description: form.description?.trim() || null,
        phone: form.phone?.trim() || null,
        email: form.email?.trim() || null,
      };
      if (isEdit && center) {
        updateCenter(center.id, payload);
      } else {
        createCenter(payload);
      }
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      setError(
        e instanceof StoreAuthError
          ? e.message
          : "No se pudo guardar el centro."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar centro" : "Nuevo centro de acopio"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifica los datos del centro. Los cambios se reflejan al instante en el mapa."
              : "Registra un nuevo punto de acopio. Selecciona la ubicación en el mapa."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="center-name">Nombre</Label>
            <Input
              id="center-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="center-desc">Descripción</Label>
            <Textarea
              id="center-desc"
              rows={2}
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="center-address">Dirección</Label>
            <Input
              id="center-address"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="center-city">Ciudad</Label>
              <Input
                id="center-city"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Estado</Label>
              <Select
                value={form.state}
                onValueChange={(v) => v && set("state", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VENEZUELAN_STATES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Ubicación en el mapa</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={locateFromAddress}
                disabled={geocoding}
              >
                {geocoding ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <MapPin className="size-3.5" />
                )}
                Buscar por dirección
              </Button>
            </div>
            <LocationPickerMapLazy
              latitude={form.latitude}
              longitude={form.longitude}
              onChange={setCoords}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="center-lat">Latitud</Label>
              <Input
                id="center-lat"
                type="number"
                step="any"
                value={form.latitude}
                onChange={(e) =>
                  setCoords(
                    parseFloat(e.target.value) || form.latitude,
                    form.longitude
                  )
                }
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="center-lng">Longitud</Label>
              <Input
                id="center-lng"
                type="number"
                step="any"
                value={form.longitude}
                onChange={(e) =>
                  setCoords(
                    form.latitude,
                    parseFloat(e.target.value) || form.longitude
                  )
                }
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="schedule-week">Horario semana</Label>
              <Input
                id="schedule-week"
                value={form.schedule?.weekdays ?? ""}
                onChange={(e) =>
                  set("schedule", {
                    weekdays: e.target.value,
                    weekends: form.schedule?.weekends ?? "cerrado",
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="schedule-weekend">Horario fin de semana</Label>
              <Input
                id="schedule-weekend"
                value={form.schedule?.weekends ?? ""}
                onChange={(e) =>
                  set("schedule", {
                    weekdays: form.schedule?.weekdays ?? "9:00-17:00",
                    weekends: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="center-image">URL de foto del centro</Label>
            <Input
              id="center-image"
              type="url"
              placeholder="https://… (aparece en el mapa)"
              value={form.image_url ?? ""}
              onChange={(e) => set("image_url", e.target.value || null)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Teléfono</Label>
              <Input
                value={form.phone ?? ""}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Estado operativo</Label>
            <Select
              value={form.status}
              onValueChange={(v) => v && set("status", v as CenterStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgent">Urgente</SelectItem>
                <SelectItem value="operational">Operativo</SelectItem>
                <SelectItem value="full">Lleno</SelectItem>
                <SelectItem value="closed">Cerrado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2.5 text-sm">
            <input
              type="checkbox"
              checked={form.is_verified ?? false}
              onChange={(e) => set("is_verified", e.target.checked)}
              className="size-4 rounded border-input"
            />
            <span>
              <span className="font-medium">Centro verificado</span>
              <span className="mt-0.5 block text-[10px] text-muted-foreground">
                Muestra el sello azul de confianza en el mapa y listados
              </span>
            </span>
          </label>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          )}

          <DialogFooter className="px-0 pb-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Guardar cambios" : "Crear centro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
