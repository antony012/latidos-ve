import { NextResponse } from "next/server";
import { DEFAULT_MAP_CENTER } from "@/lib/constants/venezuela";

/**
 * Ubicación aproximada por IP (fallback cuando el GPS del navegador falla).
 * No requiere permiso del navegador.
 */
export async function GET() {
  try {
    const res = await fetch(
      "http://ip-api.com/json/?fields=status,message,lat,lon,city,country",
      { next: { revalidate: 3600 } }
    );
    const data = (await res.json()) as {
      status: string;
      lat?: number;
      lon?: number;
      city?: string;
    };

    if (data.status === "success" && data.lat != null && data.lon != null) {
      return NextResponse.json({
        lat: data.lat,
        lng: data.lon,
        city: data.city ?? null,
        source: "ip",
      });
    }
  } catch {
    // fallback abajo
  }

  return NextResponse.json({
    lat: DEFAULT_MAP_CENTER.lat,
    lng: DEFAULT_MAP_CENTER.lng,
    city: "Caracas",
    source: "default",
  });
}
