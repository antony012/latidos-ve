"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { DEFAULT_MAP_CENTER } from "@/lib/constants/venezuela";
import {
  VerifiedCenterBadge,
  verifiedMarkerOverlayHtml,
} from "@/components/centers/VerifiedCenterBadge";
import { CENTER_STATUS_STYLES } from "@/lib/utils/centers";
import type { CenterWithStats, DonationPledge, SosAlert } from "@/types";

export type CenterMarkerStyle = "circle" | "building";

/** Borde verde titilante para centros de acopio en el mapa */
const CENTER_MARKER_BORDER =
  "border:3px solid #16a34a;animation:center-border-pulse 1.6s ease-in-out infinite;";

interface MapProps {
  centers: CenterWithStats[];
  pledges?: DonationPledge[];
  sosAlerts?: SosAlert[];
  selectedCenterId?: string | null;
  centerMarkerStyle?: CenterMarkerStyle;
  showRoutes?: boolean;
  interactive?: boolean;
  onCenterSelect: (center: CenterWithStats) => void;
}

function createCircleIcon(
  center: CenterWithStats,
  isSelected: boolean
) {
  const color = CENTER_STATUS_STYLES[center.status].marker;
  const size = isSelected ? 36 : 28;
  const verified = center.is_verified
    ? verifiedMarkerOverlayHtml(14)
    : "";

  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;">
        <div style="
          width:${size}px;height:${size}px;
          background:${color};
          ${CENTER_MARKER_BORDER}
          border-radius:50%;
          ${isSelected ? "transform:scale(1.15);" : ""}
        "></div>
        ${verified}
      </div>
    `,
  });
}

function createBuildingIcon(
  center: CenterWithStats,
  isSelected: boolean
) {
  const color = CENTER_STATUS_STYLES[center.status].marker;
  const size = isSelected ? 44 : 38;
  const iconSize = Math.round(size * 0.48);
  const verified = center.is_verified
    ? verifiedMarkerOverlayHtml(18)
    : "";

  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;">
        <div style="
          width:${size}px;height:${size}px;
          background:${color};
          ${CENTER_MARKER_BORDER}
          border-radius:12px;
          display:flex;align-items:center;justify-content:center;
          ${isSelected ? "transform:scale(1.1);" : ""}
        ">
          <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="white" aria-hidden="true">
            <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/>
          </svg>
        </div>
        ${verified}
      </div>
    `,
  });
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function createPhotoCenterIcon(
  center: CenterWithStats,
  isSelected: boolean
) {
  const size = isSelected ? 52 : 44;
  const url = escapeAttr(center.image_url!);
  const verified = center.is_verified
    ? verifiedMarkerOverlayHtml(20)
    : "";

  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;">
        <div style="
          width:${size}px;height:${size}px;
          border-radius:14px;
          ${CENTER_MARKER_BORDER}
          overflow:hidden;
          background:#f3f4f6;
          ${isSelected ? "transform:scale(1.08);" : ""}
        ">
          <img
            src="${url}"
            alt=""
            style="width:100%;height:100%;object-fit:cover;display:block;"
            loading="lazy"
          />
        </div>
        ${verified}
      </div>
    `,
  });
}

function createCenterIcon(
  center: CenterWithStats,
  isSelected: boolean,
  style: CenterMarkerStyle
) {
  if (center.image_url) {
    return createPhotoCenterIcon(center, isSelected);
  }
  return style === "building"
    ? createBuildingIcon(center, isSelected)
    : createCircleIcon(center, isSelected);
}

function createPledgeIcon(inTransit: boolean) {
  const bg = inTransit ? "#4f46e5" : "#16a34a";
  const pulse = inTransit
    ? "animation:pledge-pulse 1.8s infinite;"
    : "";

  return L.divIcon({
    className: "",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
    html: `
      <div style="
        width:34px;height:34px;
        background:${bg};
        border:3px solid white;
        border-radius:50%;
        box-shadow:0 2px 8px rgba(0,0,0,0.35);
        display:flex;align-items:center;justify-content:center;
        font-size:14px;
        ${pulse}
      ">${inTransit ? "🚚" : "♥"}</div>
    `,
  });
}

function createSosIcon() {
  return L.divIcon({
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
    html: `
      <div style="
        width:36px;height:36px;
        background:#dc2626;
        border:3px solid white;
        border-radius:50%;
        box-shadow:0 0 0 4px rgba(220,38,38,0.4), 0 2px 8px rgba(0,0,0,0.35);
        display:flex;align-items:center;justify-content:center;
        font-size:10px;font-weight:800;color:white;
        animation:sos-pulse 1.5s infinite;
      ">SOS</div>
    `,
  });
}

function MapController({
  selectedCenterId,
  centers,
}: {
  selectedCenterId?: string | null;
  centers: CenterWithStats[];
}) {
  const map = useMap();

  useEffect(() => {
    const selected = centers.find((c) => c.id === selectedCenterId);
    if (selected) {
      map.flyTo([selected.latitude, selected.longitude], 14, {
        duration: 0.8,
      });
    }
  }, [selectedCenterId, centers, map]);

  return null;
}

function FitBounds({
  centers,
  pledges,
}: {
  centers: CenterWithStats[];
  pledges: DonationPledge[];
}) {
  const map = useMap();

  useEffect(() => {
    if (centers.length !== 1) return;
    const center = centers[0];
    const points: L.LatLngExpression[] = [
      [center.latitude, center.longitude],
    ];
    for (const p of pledges) {
      if (p.latitude != null && p.longitude != null) {
        points.push([p.latitude, p.longitude]);
      }
    }
    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });
    } else {
      map.setView([center.latitude, center.longitude], 14);
    }
  }, [centers, pledges, map]);

  return null;
}

export function Map({
  centers,
  pledges = [],
  sosAlerts = [],
  selectedCenterId,
  centerMarkerStyle = "circle",
  showRoutes = false,
  interactive = true,
  onCenterSelect,
}: MapProps) {
  const sosIcon = useMemo(() => createSosIcon(), []);

  const centerIcons = useMemo(() => {
    const iconCache = new globalThis.Map<string, L.DivIcon>();
    return (center: CenterWithStats) => {
      const key = `${center.id}-${center.status}-${center.id === selectedCenterId}-${centerMarkerStyle}-${center.image_url ?? ""}-${center.is_verified}`;
      if (!iconCache.has(key)) {
        iconCache.set(
          key,
          createCenterIcon(center, center.id === selectedCenterId, centerMarkerStyle)
        );
      }
      return iconCache.get(key)!;
    };
  }, [selectedCenterId, centerMarkerStyle]);

  const pledgeIcons = useMemo(() => {
    const cache = new globalThis.Map<string, L.DivIcon>();
    return (pledge: DonationPledge) => {
      const inTransit = pledge.status === "in_transit";
      const key = inTransit ? "transit" : "active";
      if (!cache.has(key)) cache.set(key, createPledgeIcon(inTransit));
      return cache.get(key)!;
    };
  }, []);

  const centerById = useMemo(() => {
    const lookup = new globalThis.Map<string, CenterWithStats>();
    for (const c of centers) lookup.set(c.id, c);
    return lookup;
  }, [centers]);

  const routes = showRoutes
    ? pledges
        .filter(
          (p) =>
            p.latitude != null &&
            p.longitude != null &&
            (p.status === "in_transit" || p.status === "confirmed")
        )
        .map((pledge) => {
          const center = centerById.get(pledge.center_id);
          if (!center) return null;
          return {
            id: pledge.id,
            positions: [
              [pledge.latitude!, pledge.longitude!] as [number, number],
              [center.latitude, center.longitude] as [number, number],
            ],
          };
        })
        .filter(Boolean)
    : [];

  const initialCenter =
    centers.length === 1
      ? ([centers[0].latitude, centers[0].longitude] as [number, number])
      : ([DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng] as [number, number]);

  const initialZoom = centers.length === 1 ? 14 : DEFAULT_MAP_CENTER.zoom;

  return (
    <MapContainer
      center={initialCenter}
      zoom={initialZoom}
      className="h-full w-full"
      scrollWheelZoom={interactive}
      dragging={interactive}
      zoomControl={interactive}
      doubleClickZoom={interactive}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapController selectedCenterId={selectedCenterId} centers={centers} />
      {centers.length === 1 && (
        <FitBounds centers={centers} pledges={pledges} />
      )}

      {routes.map(
        (route) =>
          route && (
            <Polyline
              key={route.id}
              positions={route.positions}
              pathOptions={{
                color: "#4f46e5",
                weight: 3,
                opacity: 0.75,
                dashArray: "8 8",
              }}
            />
          )
      )}

      {centers.map((center) => (
        <Marker
          key={center.id}
          position={[center.latitude, center.longitude]}
          icon={centerIcons(center)}
          eventHandlers={
            interactive
              ? { click: () => onCenterSelect(center) }
              : undefined
          }
        >
          <Popup>
            <div className="text-sm">
              {center.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={center.image_url}
                  alt=""
                  className="mb-2 h-16 w-full rounded-lg object-cover"
                />
              )}
              <p className="flex flex-wrap items-center gap-1.5 font-semibold">
                {center.name}
                {center.is_verified && (
                  <VerifiedCenterBadge size="sm" />
                )}
              </p>
              <p className="text-xs text-muted-foreground">{center.address}</p>
              {interactive && (
                <button
                  type="button"
                  className="mt-1 text-xs font-medium text-primary hover:underline"
                  onClick={() => onCenterSelect(center)}
                >
                  Ver detalles
                </button>
              )}
            </div>
          </Popup>
        </Marker>
      ))}

      {pledges.map((pledge) => (
        <Marker
          key={pledge.id}
          position={[pledge.latitude!, pledge.longitude!]}
          icon={pledgeIcons(pledge)}
          zIndexOffset={pledge.status === "in_transit" ? 600 : 500}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold text-indigo-700">
                {pledge.status === "in_transit"
                  ? "Donación en camino (tiempo real)"
                  : "Donación en camino"}
              </p>
              <p className="mt-1">{pledge.items_description}</p>
              <p className="text-xs text-muted-foreground">
                {pledge.donor_name} · {pledge.quantity} ud.
              </p>
              {pledge.updated_at && pledge.status === "in_transit" && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Actualizado:{" "}
                  {new Date(pledge.updated_at).toLocaleTimeString("es-VE")}
                </p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}

      {sosAlerts.map((alert) => (
        <Marker
          key={alert.id}
          position={[alert.latitude, alert.longitude]}
          icon={sosIcon}
          zIndexOffset={1000}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-bold text-red-600">SOS — Necesita ayuda</p>
              <p className="mt-1 font-medium">{alert.user_name}</p>
              {alert.message && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {alert.message}
                </p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
