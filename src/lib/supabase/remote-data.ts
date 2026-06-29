import { createClient } from "@/lib/supabase/client";
import { getUserSession } from "@/lib/store/demo-store";
import { emitDonationAnnounced } from "@/lib/store/events";
import { sanitizeMultiline, sanitizePhone, sanitizeText } from "@/lib/utils/sanitize";
import type { AddPledgeInput } from "@/lib/store/demo-store";
import type {
  CenterNeed,
  CenterWithStats,
  DonationAnnouncement,
  DonationPledge,
  SosAlert,
} from "@/types";
import { offsetCoordinates } from "@/lib/utils/geo";
import { isActivePledge } from "@/lib/utils/pledges";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveDonorId(): string | null {
  const session = getUserSession();
  if (!session?.userId || !UUID_RE.test(session.userId)) return null;
  return session.userId;
}

export async function fetchPledgesForMap(): Promise<DonationPledge[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("donation_pledges")
    .select("*")
    .in("status", ["pending", "confirmed", "in_transit"])
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  if (error) throw error;
  const rows = (data ?? []) as DonationPledge[];
  return rows.filter((p) => isActivePledge(p.status));
}

export async function fetchActiveSosAlerts(): Promise<SosAlert[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sos_alerts")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as SosAlert[];
}

export async function fetchRecentDonationAnnouncements(
  limit = 10
): Promise<DonationAnnouncement[]> {
  const supabase = createClient();
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("donation_announcements")
    .select("*")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as DonationAnnouncement[];
}

export async function insertPledgeRemote(
  input: AddPledgeInput,
  donorName: string,
  coords: { latitude: number | null; longitude: number | null }
): Promise<DonationPledge> {
  const supabase = createClient();

  let latitude = coords.latitude;
  let longitude = coords.longitude;

  if (latitude == null || longitude == null) {
    const { data: center } = await supabase
      .from("collection_centers")
      .select("latitude, longitude")
      .eq("id", input.center_id)
      .single();

    if (center) {
      const c = center as { latitude: number; longitude: number };
      const { count } = await supabase
        .from("donation_pledges")
        .select("*", { count: "exact", head: true })
        .eq("center_id", input.center_id)
        .in("status", ["pending", "confirmed", "in_transit"]);

      const offset = offsetCoordinates(c.latitude, c.longitude, count ?? 0);
      latitude = offset.lat;
      longitude = offset.lng;
    }
  }

  const row = {
    center_id: input.center_id,
    need_id: input.need_id ?? null,
    donor_id: resolveDonorId(),
    donor_name: donorName,
    items_description: sanitizeText(input.items_description, 120),
    quantity: Math.max(1, Math.floor(input.quantity ?? 1)),
    donation_type: input.donation_type ?? "supplies",
    amount: input.amount ?? null,
    currency: input.currency ? sanitizeText(input.currency, 10) : null,
    attachment_url: input.attachment_url ?? null,
    attachment_name: input.attachment_name
      ? sanitizeText(input.attachment_name, 120)
      : null,
    status: "pending" as const,
    latitude,
    longitude,
    delivery_method: input.delivery_method ?? "dropoff",
    scheduled_at: input.scheduled_at ?? null,
    pickup_address: input.pickup_address
      ? sanitizeMultiline(input.pickup_address, 200)
      : null,
    contact_phone: input.contact_phone ? sanitizePhone(input.contact_phone) : null,
    origin_address: input.origin_address
      ? sanitizeMultiline(input.origin_address, 200)
      : null,
    estimated_arrival: input.scheduled_at ?? null,
    notes: input.notes ? sanitizeMultiline(input.notes) : null,
  };

  const { data, error } = await supabase
    .from("donation_pledges")
    .insert(row as never)
    .select()
    .single();

  if (error) throw error;
  const pledge = data as DonationPledge;

  const { data: center } = await supabase
    .from("collection_centers")
    .select("name")
    .eq("id", input.center_id)
    .single();

  const centerName =
    (center as { name?: string } | null)?.name ?? "un centro de acopio";
  const announcement = {
    pledge_id: pledge.id,
    donor_name: donorName,
    items_description: pledge.items_description,
    center_name: centerName,
  };

  await supabase.from("donation_announcements").insert(announcement as never);

  emitDonationAnnounced({
    id: `donation-feed-${pledge.id}`,
    donor_name: donorName,
    items_description: pledge.items_description,
    center_name: centerName,
  });

  return pledge;
}

export async function insertSosAlertRemote(input: {
  user_name: string;
  latitude: number;
  longitude: number;
  message?: string | null;
}): Promise<SosAlert> {
  const supabase = createClient();
  const donorId = resolveDonorId();

  const { data, error } = await supabase
    .from("sos_alerts")
    .insert({
      user_id: donorId,
      user_name: sanitizeText(input.user_name, 80),
      latitude: input.latitude,
      longitude: input.longitude,
      message: input.message ? sanitizeMultiline(input.message, 300) : null,
      status: "active",
    } as never)
    .select()
    .single();

  if (error) throw error;
  return data as SosAlert;
}

export async function fetchUrgentNeedsRemote(): Promise<
  { need: CenterNeed; center: CenterWithStats }[]
> {
  const supabase = createClient();
  const { data: needs, error: needsError } = await supabase
    .from("center_needs")
    .select("*")
    .eq("priority", "urgent")
    .order("updated_at", { ascending: false });

  if (needsError) throw needsError;
  const urgentNeeds = (needs ?? []) as CenterNeed[];
  if (!urgentNeeds.length) return [];

  const centerIds = [...new Set(urgentNeeds.map((n) => n.center_id))];
  const { data: centers, error: centersError } = await supabase
    .from("centers_with_stats")
    .select("*")
    .in("id", centerIds)
    .eq("is_active", true);

  if (centersError) throw centersError;
  const centerList = (centers ?? []) as CenterWithStats[];
  const centerMap = new Map(centerList.map((c) => [c.id, c]));

  return urgentNeeds
    .map((need) => {
      const center = centerMap.get(need.center_id);
      return center ? { need, center } : null;
    })
    .filter((item): item is { need: CenterNeed; center: CenterWithStats } =>
      Boolean(item)
    );
}

export async function fetchCenterById(
  id: string
): Promise<import("@/types").CenterWithStats | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("centers_with_stats")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? (data as CenterWithStats) : null;
}

export async function fetchCenterPledges(
  centerId: string
): Promise<DonationPledge[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("donation_pledges")
    .select("*")
    .eq("center_id", centerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DonationPledge[];
}

export async function fetchAllPledgesRemote(): Promise<DonationPledge[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("donation_pledges")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DonationPledge[];
}

export async function updateCenterStatusRemote(
  centerId: string,
  status: import("@/types").CenterStatus
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("collection_centers")
    .update({ status } as never)
    .eq("id", centerId);
  if (error) throw error;
}

export async function toggleCenterActiveRemote(
  centerId: string,
  isActive: boolean
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("collection_centers")
    .update({ is_active: isActive } as never)
    .eq("id", centerId);
  if (error) throw error;
}

export async function toggleCenterVerifiedRemote(
  centerId: string,
  isVerified: boolean
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("collection_centers")
    .update({ is_verified: isVerified } as never)
    .eq("id", centerId);
  if (error) throw error;
}

export async function deleteCenterRemote(centerId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("collection_centers")
    .delete()
    .eq("id", centerId);
  if (error) throw error;
}

export async function updatePledgeStatusRemote(
  pledgeId: string,
  status: import("@/types").PledgeStatus
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("donation_pledges")
    .update({ status } as never)
    .eq("id", pledgeId);
  if (error) throw error;
}
