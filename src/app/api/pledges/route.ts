import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { offsetCoordinates } from "@/lib/utils/geo";
import { sanitizeMultiline, sanitizePhone, sanitizeText } from "@/lib/utils/sanitize";
import type { DeliveryMethod, DonationType } from "@/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_ATTACHMENT_CHARS = 120_000;

interface PledgeBody {
  center_id?: string;
  need_id?: string | null;
  donor_name?: string;
  items_description?: string;
  quantity?: number;
  donation_type?: DonationType;
  amount?: number | null;
  currency?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  delivery_method?: DeliveryMethod;
  scheduled_at?: string | null;
  pickup_address?: string | null;
  contact_phone?: string | null;
  origin_address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
}

function userFacingError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

function trimAttachment(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.length <= MAX_ATTACHMENT_CHARS) return url;
  return null;
}

export async function POST(request: Request) {
  let body: PledgeBody;
  try {
    body = (await request.json()) as PledgeBody;
  } catch {
    return userFacingError("Datos de donación inválidos.");
  }

  const centerId = body.center_id?.trim();
  const itemsDescription = body.items_description?.trim();

  if (!centerId || !UUID_RE.test(centerId)) {
    return userFacingError("Centro de acopio no válido. Vuelve a elegir el centro.");
  }
  if (!itemsDescription) {
    return userFacingError("Indica qué vas a donar.");
  }

  const admin = createAdminClient();
  if (!admin) {
    return userFacingError(
      "El servidor no está configurado para guardar donaciones. Falta SUPABASE_SERVICE_ROLE_KEY en Vercel.",
      503
    );
  }

  const { data: centerRow, error: centerError } = await admin
    .from("collection_centers")
    .select("id, name, latitude, longitude, is_active")
    .eq("id", centerId)
    .maybeSingle();

  if (centerError) {
    return userFacingError(
      `No se pudo verificar el centro: ${centerError.message}`,
      500
    );
  }

  const center = centerRow as {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    is_active: boolean;
  } | null;

  if (!center) {
    return userFacingError("Ese centro ya no existe. Elige otro en el mapa.");
  }
  if (!center.is_active) {
    return userFacingError("Ese centro no está activo en este momento.");
  }

  let donorId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id && UUID_RE.test(user.id)) {
      donorId = user.id;
    }
  } catch {
    // donación anónima permitida
  }

  let latitude = body.latitude ?? null;
  let longitude = body.longitude ?? null;

  if (latitude == null || longitude == null) {
    const { count } = await admin
      .from("donation_pledges")
      .select("*", { count: "exact", head: true })
      .eq("center_id", centerId)
      .in("status", ["pending", "confirmed", "in_transit"]);

    const offset = offsetCoordinates(center.latitude, center.longitude, count ?? 0);
    latitude = offset.lat;
    longitude = offset.lng;
  }

  const donorName = sanitizeText(body.donor_name ?? "Donante anónimo", 80);

  const row = {
    center_id: centerId,
    need_id: body.need_id && UUID_RE.test(body.need_id) ? body.need_id : null,
    donor_id: donorId,
    donor_name: donorName,
    items_description: sanitizeText(itemsDescription, 120),
    quantity: Math.max(1, Math.floor(body.quantity ?? 1)),
    donation_type: body.donation_type ?? "supplies",
    amount: body.amount ?? null,
    currency: body.currency ? sanitizeText(body.currency, 10) : null,
    attachment_url: trimAttachment(body.attachment_url),
    attachment_name: body.attachment_name
      ? sanitizeText(body.attachment_name, 120)
      : null,
    status: "pending" as const,
    latitude,
    longitude,
    delivery_method: body.delivery_method ?? "dropoff",
    scheduled_at: body.scheduled_at ?? null,
    pickup_address: body.pickup_address
      ? sanitizeMultiline(body.pickup_address, 200)
      : null,
    contact_phone: body.contact_phone ? sanitizePhone(body.contact_phone) : null,
    origin_address: body.origin_address
      ? sanitizeMultiline(body.origin_address, 200)
      : null,
    estimated_arrival: body.scheduled_at ?? null,
    notes: body.notes ? sanitizeMultiline(body.notes) : null,
  };

  const { data: pledgeRow, error: pledgeError } = await admin
    .from("donation_pledges")
    .insert(row as never)
    .select()
    .single();

  if (pledgeError) {
    const hint =
      pledgeError.code === "42501"
        ? " Permisos de base de datos: ejecuta la migración 008 en Supabase."
        : pledgeError.code === "PGRST204"
          ? " Falta una columna en la base de datos: ejecuta las migraciones 002–008 en Supabase."
          : "";
    return userFacingError(
      `No se pudo guardar la donación: ${pledgeError.message}.${hint}`,
      500
    );
  }

  const pledge = pledgeRow as { id: string; items_description: string };

  const announcement = {
    pledge_id: pledge.id,
    donor_name: donorName,
    items_description: row.items_description,
    center_name: center.name,
  };

  const { error: announcementError } = await admin
    .from("donation_announcements")
    .insert(announcement as never);

  if (announcementError) {
    console.error("donation_announcements insert:", announcementError.message);
  }

  return NextResponse.json({ pledge });
}
