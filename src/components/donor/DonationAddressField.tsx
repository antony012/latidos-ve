"use client";

import { useEffect, useState } from "react";
import { Loader2, Map, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationPickerMapLazy } from "@/components/map/LocationPickerMapLazy";
import { DEFAULT_MAP_CENTER } from "@/lib/constants/venezuela";
import { promptLocationAccess } from "@/lib/utils/geolocation";
import { geocodeAddress } from "@/lib/utils/geocode";

interface DonationAddressFieldProps {
  id: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  value: string;
  coords?: { lat: number; lng: number } | null;
  onChange: (value: string) => void;
  onCoordsChange: (coords: { lat: number; lng: number } | null) => void;
  hint?: string;
}

export function DonationAddressField({
  id,
  label,
  placeholder = "Ej: Av. Principal, Urbanización X, Caracas",
  required = false,
  value,
  coords,
  onChange,
  onCoordsChange,
  hint,
}: DonationAddressFieldProps) {
  const [loading, setLoading] = useState<"gps" | "geocode" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolvedLabel, setResolvedLabel] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapLat, setMapLat] = useState<number>(DEFAULT_MAP_CENTER.lat);
  const [mapLng, setMapLng] = useState<number>(DEFAULT_MAP_CENTER.lng);

  useEffect(() => {
    if (coords) {
      setMapLat(coords.lat);
      setMapLng(coords.lng);
    }
  }, [coords?.lat, coords?.lng]);

  const applyCoords = (lat: number, lng: number, label?: string) => {
    onCoordsChange({ lat, lng });
    setMapLat(lat);
    setMapLng(lng);
    setResolvedLabel(
      label ?? `Punto seleccionado (${lat.toFixed(5)}, ${lng.toFixed(5)})`
    );
    setMapOpen(true);
  };

  const useGps = () => {
    setError(null);
    setLoading("gps");
    promptLocationAccess()
      .then((pos) => {
        applyCoords(pos.lat, pos.lng, "Ubicación GPS actual");
        if (!value.trim()) {
          onChange("Mi ubicación actual");
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "No se pudo obtener GPS.");
        onCoordsChange(null);
      })
      .finally(() => setLoading(null));
  };

  const searchAddress = () => {
    const q = value.trim();
    if (q.length < 4) {
      setError("Escribe al menos calle y ciudad.");
      return;
    }
    setError(null);
    setLoading("geocode");
    geocodeAddress(q)
      .then((result) => {
        applyCoords(result.lat, result.lng, result.label);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Dirección no encontrada.");
        onCoordsChange(null);
      })
      .finally(() => setLoading(null));
  };

  const handleMapPick = (lat: number, lng: number) => {
    applyCoords(lat, lng);
    if (!value.trim()) {
      onChange(`Punto en mapa (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    }
  };

  return (
    <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
      <div className="space-y-1">
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-red-600"> *</span>}
        </Label>
        <Input
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setResolvedLabel(null);
            onCoordsChange(null);
          }}
          onBlur={() => {
            if (value.trim().length >= 6) searchAddress();
          }}
        />
        {hint && (
          <p className="text-[10px] text-muted-foreground">{hint}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1.5"
          onClick={useGps}
          disabled={loading !== null}
        >
          {loading === "gps" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Navigation className="size-3.5" />
          )}
          Usar mi ubicación
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1.5"
          onClick={searchAddress}
          disabled={loading !== null || value.trim().length < 4}
        >
          {loading === "geocode" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <MapPin className="size-3.5" />
          )}
          Buscar dirección
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mapOpen ? "default" : "outline"}
          className="h-8 gap-1.5"
          onClick={() => setMapOpen((v) => !v)}
        >
          <Map className="size-3.5" />
          {mapOpen ? "Ocultar mapa" : "Elegir en el mapa"}
        </Button>
      </div>

      {mapOpen && (
        <LocationPickerMapLazy
          latitude={mapLat}
          longitude={mapLng}
          onChange={handleMapPick}
        />
      )}

      {resolvedLabel && (
        <p className="rounded-lg bg-green-50 px-2 py-1.5 text-[10px] text-green-800 dark:bg-green-950 dark:text-green-200">
          ✓ {resolvedLabel}
        </p>
      )}
      {error && (
        <p className="text-[10px] text-red-600">{error}</p>
      )}
    </div>
  );
}
