import { isSupabaseConfigured } from "@/lib/config/env";
import {
  getMockCenterNeeds,
  getMockCenters,
  getMockCategories,
} from "@/lib/mock/centers";
import { createClient } from "@/lib/supabase/server";
import type { CenterNeed, CenterWithStats } from "@/types";

export interface FetchCentersOptions {
  city?: string;
  needSlug?: string;
  status?: CenterWithStats["status"];
}

export async function fetchCenters(
  options: FetchCentersOptions = {}
): Promise<CenterWithStats[]> {
  if (!isSupabaseConfigured()) {
    return getMockCenters(options);
  }

  const supabase = await createClient();

  let query = supabase
    .from("centers_with_stats")
    .select("*")
    .order("urgent_needs_count", { ascending: false });

  if (options.city) {
    query = query.ilike("city", `%${options.city}%`);
  }

  if (options.status) {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[fetchCenters]", error.message);
    throw new Error("No se pudieron cargar los centros de acopio");
  }

  return (data ?? []) as CenterWithStats[];
}

export async function fetchCenterNeeds(
  centerId: string
): Promise<CenterNeed[]> {
  if (!isSupabaseConfigured()) {
    return getMockCenterNeeds(centerId);
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("center_needs")
    .select("*")
    .eq("center_id", centerId)
    .order("priority", { ascending: true });

  if (error) {
    console.error("[fetchCenterNeeds]", error.message);
    throw new Error("No se pudieron cargar las necesidades");
  }

  return (data ?? []) as CenterNeed[];
}

export async function fetchNeedCategories() {
  if (!isSupabaseConfigured()) {
    return getMockCategories();
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("need_categories")
    .select("*")
    .order("sort_order");

  if (error) {
    console.error("[fetchNeedCategories]", error.message);
    return [];
  }

  return data ?? [];
}
