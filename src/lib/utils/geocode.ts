export interface GeocodeResult {
  lat: number;
  lng: number;
  label: string;
}

export async function geocodeAddress(
  address: string
): Promise<GeocodeResult> {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(address)}`);
  const data = (await res.json()) as GeocodeResult & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "No se encontró la dirección.");
  }
  return data;
}
