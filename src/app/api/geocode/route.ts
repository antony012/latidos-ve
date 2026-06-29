import { NextResponse } from "next/server";

/** Geocodifica una dirección en Venezuela vía Nominatim (OSM). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 4) {
    return NextResponse.json(
      { error: "Escribe una dirección más específica." },
      { status: 400 }
    );
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "json");
    url.searchParams.set("q", `${q}, Venezuela`);
    url.searchParams.set("countrycodes", "ve");
    url.searchParams.set("limit", "1");

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "LatidosVE/1.0 (humanitarian-app)",
        Accept: "application/json",
      },
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "No se pudo buscar la dirección." },
        { status: 502 }
      );
    }

    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;

    if (!data.length) {
      return NextResponse.json(
        { error: "Dirección no encontrada. Prueba con ciudad y referencia." },
        { status: 404 }
      );
    }

    const hit = data[0];
    return NextResponse.json({
      lat: parseFloat(hit.lat),
      lng: parseFloat(hit.lon),
      label: hit.display_name,
    });
  } catch {
    return NextResponse.json(
      { error: "Error de conexión al buscar la dirección." },
      { status: 500 }
    );
  }
}
