"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { useGeolocation } from "@/hooks/use-geolocation";
import { createSosAlert } from "@/lib/store/demo-store";
import { SOS_ALERT_RADIUS_KM } from "@/lib/utils/geo";

interface SosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SosDialog({ open, onOpenChange }: SosDialogProps) {
  const { session } = useAuth();
  const { requestLocation } = useGeolocation();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const reset = () => {
    setMessage("");
    setError(null);
    setSent(false);
  };

  const handleClose = (value: boolean) => {
    if (!value) reset();
    onOpenChange(value);
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const pos = await requestLocation();
      await createSosAlert({
        user_name: session?.name,
        latitude: pos.lat,
        longitude: pos.lng,
        message: message.trim() || null,
      });
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar la alerta.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="size-5" />
            Necesito ayuda — SOS
          </DialogTitle>
          <DialogDescription>
            Tu ubicación se compartirá con personas solidarias en un radio de{" "}
            {SOS_ALERT_RADIUS_KM} km. Recibirán una alerta sonora.
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
              <AlertTriangle className="size-8 text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-red-700 dark:text-red-400">
                Alerta SOS enviada
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Personas cercanas han sido notificadas. Mantén el teléfono cerca.
              </p>
            </div>
            <Button onClick={() => handleClose(false)} className="w-full">
              Entendido
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
                <p className="flex items-center gap-2 font-medium">
                  <MapPin className="size-4 shrink-0" />
                  Usaremos tu ubicación actual
                </p>
                <p className="mt-1 text-xs opacity-80">
                  Solo se activa al confirmar. Quienes estén a menos de{" "}
                  {SOS_ALERT_RADIUS_KM} km recibirán alerta.
                </p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="sos-msg">¿Qué necesitas? (opcional)</Label>
                <Textarea
                  id="sos-msg"
                  placeholder="Ej: Atrapado/a, necesito agua y medicinas, familia con niños..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
              </div>

              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="size-3" />
                En emergencia real, llama también al 911 o servicios locales.
              </p>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                  {error}
                </p>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleSubmit}
                disabled={submitting}
                className="min-w-32"
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <AlertTriangle className="size-4" />
                    Enviar SOS
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
