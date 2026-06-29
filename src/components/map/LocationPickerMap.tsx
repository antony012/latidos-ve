"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { DEFAULT_MAP_CENTER } from "@/lib/constants/venezuela";
import { cn } from "@/lib/utils";

export interface LocationPickerMapProps {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
  className?: string;
}

function createPickerIcon() {
  return L.divIcon({
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
    html: `
      <div style="
        width:36px;height:36px;
        background:#dc2626;
        border:3px solid white;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        box-shadow:0 2px 10px rgba(0,0,0,0.4);
      "></div>
    `,
  });
}

function MapClickPicker({
  onChange,
}: {
  onChange: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyToPosition({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([latitude, longitude], Math.max(map.getZoom(), 13), {
      duration: 0.4,
    });
  }, [latitude, longitude, map]);

  return null;
}

export function LocationPickerMap({
  latitude,
  longitude,
  onChange,
  className,
}: LocationPickerMapProps) {
  const icon = useMemo(() => createPickerIcon(), []);
  const valid =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    !Number.isNaN(latitude) &&
    !Number.isNaN(longitude);

  const lat = valid ? latitude : DEFAULT_MAP_CENTER.lat;
  const lng = valid ? longitude : DEFAULT_MAP_CENTER.lng;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border ring-1 ring-foreground/10",
        className
      )}
    >
      <MapContainer
        center={[lat, lng]}
        zoom={13}
        className="h-52 w-full cursor-crosshair sm:h-56"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickPicker onChange={onChange} />
        <FlyToPosition latitude={lat} longitude={lng} />
        <Marker
          position={[lat, lng]}
          icon={icon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const pos = e.target.getLatLng();
              onChange(pos.lat, pos.lng);
            },
          }}
        />
      </MapContainer>
      <p className="border-t bg-muted/30 px-2.5 py-1.5 text-[10px] text-muted-foreground">
        Haz clic en el mapa o arrastra el pin rojo para fijar la ubicación.
      </p>
    </div>
  );
}
