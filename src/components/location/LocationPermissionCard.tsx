"use client";

import { Loader2, MapPin, MapPinOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocationPermission } from "@/hooks/use-location-permission";
import { cn } from "@/lib/utils";

interface LocationPermissionCardProps {
  /** Texto corto cuando aún no hay permiso */
  title?: string;
  /** Variante compacta para diálogos */
  compact?: boolean;
  className?: string;
  onGranted?: () => void;
}

export function LocationPermissionCard({
  title = "Activa tu ubicación para donar y recibir alertas SOS cerca de ti.",
  compact = false,
  className,
  onGranted,
}: LocationPermissionCardProps) {
  const {
    permission,
    hasLocation,
    requesting,
    approximating,
    error,
    secure,
    locationSource,
    deniedHelp,
    requestPermission,
    requestApproximateLocation,
  } = useLocationPermission();

  const granted = permission === "granted" || hasLocation;
  const denied = permission === "denied" && !hasLocation;
  const unsupported = permission === "unsupported";
  const isApproximate =
    locationSource === "ip" || locationSource === "default";

  const handleAllow = () => {
    requestPermission().then((pos) => {
      if (pos) onGranted?.();
    });
  };

  const handleApproximate = () => {
    requestApproximateLocation().then((pos) => {
      if (pos) onGranted?.();
    });
  };

  if (granted) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200",
          className
        )}
      >
        <ShieldCheck className="size-4 shrink-0" />
        <span>
          {isApproximate
            ? "Ubicación aproximada activa — puedes donar y ver el mapa"
            : "Ubicación activa — tu pin aparecerá en el mapa"}
        </span>
      </div>
    );
  }

  const actionButtons = (
    <div className="flex flex-col gap-2">
      {!unsupported && secure && (
        <Button
          type="button"
          size={compact ? "sm" : "default"}
          className={cn("h-9 w-full gap-2", !compact && "h-10 sm:w-auto")}
          onClick={handleAllow}
          disabled={requesting || approximating}
        >
          {requesting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <MapPin className="size-4" />
          )}
          {denied ? "Intentar GPS de nuevo" : "Permitir acceso a mi ubicación"}
        </Button>
      )}
      <Button
        type="button"
        variant="outline"
        size={compact ? "sm" : "default"}
        className={cn("h-9 w-full gap-2", !compact && "h-10 sm:w-auto")}
        onClick={handleApproximate}
        disabled={requesting || approximating}
      >
        {approximating ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <MapPinOff className="size-4" />
        )}
        Usar ubicación aproximada (sin GPS)
      </Button>
    </div>
  );

  if (compact) {
    return (
      <div
        className={cn(
          "space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950",
          className
        )}
      >
        <p className="flex items-start gap-2 text-xs text-amber-900 dark:text-amber-100">
          <MapPinOff className="mt-0.5 size-3.5 shrink-0" />
          {denied
            ? "GPS bloqueado. Usa ubicación aproximada o actívalo en el navegador."
            : title}
        </p>
        {actionButtons}
        {requesting && (
          <p className="text-[10px] leading-snug text-blue-800 dark:text-blue-200">
            Busca el icono de ubicación junto a la URL y elige Permitir. Si no
            aparece, activa Ubicación en Windows (Configuración → Privacidad).
          </p>
        )}
        {(error || denied) && (
          <p className="text-[10px] leading-snug text-amber-800/90 dark:text-amber-200/80">
            {error ?? deniedHelp}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm dark:border-blue-900 dark:from-blue-950 dark:to-background",
        className
      )}
    >
      <div className="flex gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
          <MapPin className="size-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-semibold leading-snug">
            {denied ? "Ubicación desactivada" : "Permitir mi ubicación"}
          </p>
          <p className="text-xs text-muted-foreground">
            {denied
              ? "Sin ubicación no podemos mostrar tu donación en el mapa ni avisarte de SOS cercanos. Puedes usar ubicación aproximada."
              : title}
          </p>

          {!secure && (
            <p className="rounded-lg bg-red-50 px-2 py-1.5 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
              La ubicación GPS requiere <strong>localhost</strong> o HTTPS. Usa{" "}
              <code className="text-[10px]">http://localhost:3000</code> o elige
              ubicación aproximada.
            </p>
          )}

          {actionButtons}

          {requesting && (
            <p className="text-[11px] leading-snug text-blue-700 dark:text-blue-300">
              Busca el popup del navegador o el icono junto a la URL y elige{" "}
              <strong>Permitir</strong>. Si no aparece: Windows → Configuración →
              Privacidad y seguridad → Ubicación → Activar.
            </p>
          )}

          {unsupported && (
            <p className="text-xs text-red-600">
              Tu navegador no soporta geolocalización. Usa ubicación aproximada.
            </p>
          )}

          {(error || denied) && (
            <p className="rounded-lg bg-white/60 px-2 py-1.5 text-[11px] leading-relaxed text-muted-foreground dark:bg-black/20">
              <strong className="font-medium">¿Cómo activarlo?</strong>{" "}
              {error ? `${error} ` : ""}
              {deniedHelp}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
