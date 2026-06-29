/** Coordenadas de Caracas, Venezuela — centro por defecto del mapa */
export const DEFAULT_MAP_CENTER = {
  lat: 10.4806,
  lng: -66.9036,
  zoom: 11,
} as const;

export const VENEZUELA_BOUNDS = {
  southWest: { lat: 0.6, lng: -73.4 },
  northEast: { lat: 12.5, lng: -59.8 },
} as const;

export const CENTER_STATUS_LABELS: Record<
  import("@/types").CenterStatus,
  string
> = {
  urgent: "Necesita ayuda urgente",
  operational: "Operativo",
  full: "Capacidad llena",
  closed: "Cerrado temporalmente",
};

export const NEED_PRIORITY_LABELS: Record<
  import("@/types").NeedPriority,
  string
> = {
  urgent: "Alta prioridad",
  medium: "Prioridad media",
  low: "Baja prioridad",
  covered: "Cubierto",
};

export const VENEZUELAN_STATES = [
  "Amazonas",
  "Anzoátegui",
  "Apure",
  "Aragua",
  "Barinas",
  "Bolívar",
  "Carabobo",
  "Cojedes",
  "Delta Amacuro",
  "Distrito Capital",
  "Falcón",
  "Guárico",
  "Lara",
  "Mérida",
  "Miranda",
  "Monagas",
  "Nueva Esparta",
  "Portuguesa",
  "Sucre",
  "Táchira",
  "Trujillo",
  "La Guaira",
  "Yaracuy",
  "Zulia",
] as const;
