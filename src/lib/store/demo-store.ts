import { MOCK_CATEGORIES, MOCK_CENTERS, MOCK_NEEDS } from "@/lib/mock/data";
import { isSupabaseConfigured } from "@/lib/config/env";
import { insertSosAlertRemote } from "@/lib/supabase/remote-data";
import { emitDonationAnnounced, emitStoreUpdate } from "./events";
import { sanitizeMultiline, sanitizePhone, sanitizeText } from "@/lib/utils/sanitize";
import { isActivePledge } from "@/lib/utils/pledges";
import { offsetCoordinates } from "@/lib/utils/geo";
import type {
  CenterNeed,
  CenterNotification,
  CenterSchedule,
  CenterStatus,
  CenterWithStats,
  CollectionCenter,
  DeliveryMethod,
  DonationPledge,
  DonationType,
  DonationAnnouncement,
  NeedCategory,
  NeedPriority,
  PledgeStatus,
  SosAlert,
  SosAlertStatus,
} from "@/types";

const KEYS = {
  centers: "ve-ayuda:store:centers",
  needs: "ve-ayuda:store:needs",
  pledges: "ve-ayuda:store:pledges",
  sos: "ve-ayuda:store:sos",
  notifications: "ve-ayuda:store:notifications",
  donationFeed: "ve-ayuda:store:donation-feed",
  session: "ve-ayuda:admin-session",
  deviceId: "ve-ayuda:device-id",
  initialized: "ve-ayuda:store:initialized",
} as const;

export interface UserSession {
  /** Identidad estable del usuario (incluso donantes anónimos por dispositivo). */
  userId: string;
  role: "donor" | "center_admin" | "super_admin";
  name: string;
  email?: string;
  provider?: "google" | "local";
  centerId?: string;
  loggedInAt: string;
}

/** @deprecated Usar UserSession */
export interface LegacyAdminSession {
  adminName: string;
  centerId: string;
  loggedInAt: string;
}

export type AdminSession = UserSession & { centerId: string };

/** Error de autorización lanzado por los guards del store. */
export class StoreAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoreAuthError";
  }
}

function isBrowser() {
  return typeof window !== "undefined";
}

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

/** ID persistente del dispositivo: da identidad estable a donantes anónimos. */
export function getDeviceUserId(): string {
  if (!isBrowser()) return "anon";
  let id = localStorage.getItem(KEYS.deviceId);
  if (!id) {
    const rand =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    id = `user-${rand}`;
    localStorage.setItem(KEYS.deviceId, id);
  }
  return id;
}

export function initDemoStore() {
  if (!isBrowser()) return;
  if (!localStorage.getItem(KEYS.initialized)) {
    write(KEYS.centers, MOCK_CENTERS);
    write(KEYS.needs, MOCK_NEEDS);
    write(KEYS.pledges, [] as DonationPledge[]);
    write(KEYS.sos, [] as SosAlert[]);
    write(KEYS.notifications, [] as CenterNotification[]);
    write(KEYS.donationFeed, [] as DonationAnnouncement[]);
    localStorage.setItem(KEYS.initialized, "1");
    return;
  }
  migrateDemoStore();
}

/** Añade claves nuevas a stores ya inicializados en versiones anteriores. */
function migrateDemoStore() {
  if (!isBrowser()) return;
  if (localStorage.getItem(KEYS.notifications) === null) {
    write(KEYS.notifications, [] as CenterNotification[]);
  }
  if (localStorage.getItem(KEYS.donationFeed) === null) {
    write(KEYS.donationFeed, [] as DonationAnnouncement[]);
  }
}

function getCentersRaw(): CenterWithStats[] {
  initDemoStore();
  const centers = read(KEYS.centers, MOCK_CENTERS);
  return centers.map((c) => {
    const mock = MOCK_CENTERS.find((m) => m.id === c.id);
    return {
      ...c,
      image_url: c.image_url ?? mock?.image_url ?? null,
      is_verified: c.is_verified ?? mock?.is_verified ?? false,
    };
  });
}

function getNeedsRaw(): CenterNeed[] {
  initDemoStore();
  return read(KEYS.needs, MOCK_NEEDS);
}

function normalizePledge(p: DonationPledge): DonationPledge {
  return {
    ...p,
    donation_type: p.donation_type ?? "supplies",
    amount: p.amount ?? null,
    currency: p.currency ?? null,
    attachment_url: p.attachment_url ?? null,
    attachment_name: p.attachment_name ?? null,
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
    delivery_method: p.delivery_method ?? "dropoff",
    scheduled_at: p.scheduled_at ?? null,
    pickup_address: p.pickup_address ?? null,
    contact_phone: p.contact_phone ?? null,
    origin_address: p.origin_address ?? null,
  };
}

function getPledgesRaw(): DonationPledge[] {
  initDemoStore();
  return read(KEYS.pledges, [] as DonationPledge[]).map(normalizePledge);
}

function saveCenters(centers: CenterWithStats[]) {
  write(KEYS.centers, centers);
}

function saveNeeds(needs: CenterNeed[]) {
  write(KEYS.needs, needs);
}

function getSosRaw(): SosAlert[] {
  initDemoStore();
  return read(KEYS.sos, [] as SosAlert[]);
}

function saveSos(alerts: SosAlert[]) {
  write(KEYS.sos, alerts);
}

function getNotificationsRaw(): CenterNotification[] {
  initDemoStore();
  return read(KEYS.notifications, [] as CenterNotification[]);
}

function saveNotifications(notifications: CenterNotification[]) {
  write(KEYS.notifications, notifications);
}

function savePledges(pledges: DonationPledge[]) {
  write(KEYS.pledges, pledges);
}

// ---------------------------------------------------------------------------
// Guards de autorización (defensa en profundidad en el cliente).
// La autorización real vive en RLS de Supabase; esto evita que la UI/llamadas
// directas muten datos de centros ajenos en modo demo.
// ---------------------------------------------------------------------------

function requireSession(): UserSession {
  const s = getUserSession();
  if (!s) throw new StoreAuthError("Debes iniciar sesión para realizar esta acción.");
  return s;
}

function assertSuperAdmin() {
  const s = requireSession();
  if (s.role !== "super_admin") {
    throw new StoreAuthError("Solo el super administrador puede realizar esta acción.");
  }
}

function assertCanManageCenter(centerId: string) {
  const s = requireSession();
  if (s.role === "super_admin") return;
  if (s.role === "center_admin" && s.centerId === centerId) return;
  throw new StoreAuthError("No tienes permiso para gestionar este centro.");
}

function centerIdOfNeed(needId: string): string | null {
  return getNeedsRaw().find((n) => n.id === needId)?.center_id ?? null;
}

function recalculateStats(
  center: CollectionCenter,
  needs: CenterNeed[],
  pledges: DonationPledge[]
): CenterWithStats {
  const centerNeeds = needs.filter((n) => n.center_id === center.id);
  const pending = pledges.filter(
    (p) => p.center_id === center.id && isActivePledge(p.status)
  ).length;

  return {
    ...center,
    urgent_needs_count: centerNeeds.filter((n) => n.priority === "urgent").length,
    covered_needs_count: centerNeeds.filter((n) => n.priority === "covered").length,
    total_needs_count: centerNeeds.length,
    pending_pledges_count: pending,
    updated_at: new Date().toISOString(),
  };
}

function refreshAllStats() {
  const centers = getCentersRaw();
  const needs = getNeedsRaw();
  const pledges = getPledgesRaw();
  const updated = centers.map((c) => recalculateStats(c, needs, pledges));
  saveCenters(updated);
  return updated;
}

function notify() {
  emitStoreUpdate();
}

export function getCategories(): NeedCategory[] {
  return MOCK_CATEGORIES;
}

export function getAllCenters(): CenterWithStats[] {
  return refreshAllStats().sort(
    (a, b) => b.urgent_needs_count - a.urgent_needs_count
  );
}

export function getCenterById(id: string): CenterWithStats | null {
  return getAllCenters().find((c) => c.id === id) ?? null;
}

export function getCenterNeeds(centerId: string): CenterNeed[] {
  const priorityOrder: Record<NeedPriority, number> = {
    urgent: 0,
    medium: 1,
    low: 2,
    covered: 3,
  };

  return getNeedsRaw()
    .filter((n) => n.center_id === centerId)
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

export function getCenterPledges(centerId: string): DonationPledge[] {
  return getPledgesRaw()
    .filter((p) => p.center_id === centerId)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
}

export function updateCenterStatus(centerId: string, status: CenterStatus) {
  assertCanManageCenter(centerId);
  const centers = getCentersRaw();
  const idx = centers.findIndex((c) => c.id === centerId);
  if (idx === -1) return null;

  centers[idx] = {
    ...centers[idx],
    status,
    updated_at: new Date().toISOString(),
  };
  saveCenters(centers);
  refreshAllStats();
  notify();
  return centers[idx];
}

export interface UpsertNeedInput {
  center_id: string;
  category_id?: string | null;
  item_name: string;
  priority: NeedPriority;
  quantity_needed?: number | null;
  quantity_received?: number;
  unit?: string;
  notes?: string | null;
}

export function addNeed(input: UpsertNeedInput): CenterNeed {
  assertCanManageCenter(input.center_id);
  const needs = getNeedsRaw();
  const need: CenterNeed = {
    id: `need-${Date.now()}`,
    center_id: input.center_id,
    category_id: input.category_id ?? null,
    item_name: sanitizeText(input.item_name, 120),
    priority: input.priority,
    quantity_needed: input.quantity_needed ?? null,
    quantity_received: input.quantity_received ?? 0,
    unit: sanitizeText(input.unit ?? "unidades", 30),
    notes: input.notes ? sanitizeMultiline(input.notes) : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  needs.push(need);
  saveNeeds(needs);
  refreshAllStats();
  notify();
  return need;
}

export function updateNeed(
  needId: string,
  patch: Partial<UpsertNeedInput>
): CenterNeed | null {
  const centerId = centerIdOfNeed(needId);
  if (!centerId) return null;
  assertCanManageCenter(centerId);

  const needs = getNeedsRaw();
  const idx = needs.findIndex((n) => n.id === needId);
  if (idx === -1) return null;

  needs[idx] = {
    ...needs[idx],
    ...patch,
    item_name:
      patch.item_name != null
        ? sanitizeText(patch.item_name, 120)
        : needs[idx].item_name,
    notes:
      patch.notes !== undefined
        ? patch.notes
          ? sanitizeMultiline(patch.notes)
          : null
        : needs[idx].notes,
    updated_at: new Date().toISOString(),
  };
  saveNeeds(needs);
  refreshAllStats();
  notify();
  return needs[idx];
}

export function deleteNeed(needId: string) {
  const centerId = centerIdOfNeed(needId);
  if (!centerId) return;
  assertCanManageCenter(centerId);

  const needs = getNeedsRaw().filter((n) => n.id !== needId);
  saveNeeds(needs);
  refreshAllStats();
  notify();
}

export function markNeedReceived(needId: string, amount: number) {
  const centerId = centerIdOfNeed(needId);
  if (!centerId) return null;
  assertCanManageCenter(centerId);

  const needs = getNeedsRaw();
  const idx = needs.findIndex((n) => n.id === needId);
  if (idx === -1) return null;

  const need = needs[idx];
  const received = need.quantity_received + amount;
  const needed = need.quantity_needed;

  needs[idx] = {
    ...need,
    quantity_received: received,
    priority: needed != null && received >= needed ? "covered" : need.priority,
    updated_at: new Date().toISOString(),
  };

  saveNeeds(needs);
  refreshAllStats();
  notify();
  return needs[idx];
}

export interface AddPledgeInput {
  center_id: string;
  need_id?: string | null;
  donor_name?: string;
  items_description: string;
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

function resolvePledgeCoordinates(input: AddPledgeInput): {
  latitude: number | null;
  longitude: number | null;
} {
  if (input.latitude != null && input.longitude != null) {
    return { latitude: input.latitude, longitude: input.longitude };
  }

  const center = getCenterById(input.center_id);
  if (!center) return { latitude: null, longitude: null };

  const sameCenterPledges = getPledgesRaw().filter(
    (p) => p.center_id === input.center_id && isActivePledge(p.status)
  ).length;

  const { lat, lng } = offsetCoordinates(
    center.latitude,
    center.longitude,
    sameCenterPledges
  );

  return { latitude: lat, longitude: lng };
}

export async function addPledge(input: AddPledgeInput): Promise<DonationPledge> {
  const session = getUserSession();
  const donorId = session?.userId ?? getDeviceUserId();
  const donorName = sanitizeText(
    session?.name ?? input.donor_name ?? "Donante anónimo",
    80
  );

  const coords = resolvePledgeCoordinates(input);

  if (isSupabaseConfigured() && isBrowser()) {
    const res = await fetch("/api/pledges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        donor_name: donorName,
        latitude: coords.latitude,
        longitude: coords.longitude,
      }),
    });

    const data = (await res.json()) as {
      pledge?: DonationPledge;
      error?: string;
    };

    if (!res.ok) {
      throw new Error(data.error ?? "No se pudo confirmar la donación.");
    }

    if (!data.pledge) {
      throw new Error("El servidor no devolvió la donación guardada.");
    }

    const center = getCenterById(input.center_id);
    emitDonationAnnounced({
      id: `donation-feed-${data.pledge.id}`,
      donor_name: donorName,
      items_description: data.pledge.items_description,
      center_name: center?.name ?? "un centro de acopio",
    });

    notify();
    return data.pledge;
  }

  const pledges = getPledgesRaw();
  const pledge: DonationPledge = {
    id: `pledge-${Date.now()}`,
    center_id: input.center_id,
    need_id: input.need_id ?? null,
    donor_id: donorId,
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
    status: "pending",
    latitude: coords.latitude,
    longitude: coords.longitude,
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  pledges.push(pledge);
  savePledges(pledges);
  refreshAllStats();
  recordDonationAnnouncement(pledge);
  notify();
  return pledge;
}

const DONATION_FEED_MAX = 50;
const DONATION_FEED_VISIBLE_HOURS = 48;

function getDonationFeedRaw(): DonationAnnouncement[] {
  initDemoStore();
  return read(KEYS.donationFeed, [] as DonationAnnouncement[]);
}

function saveDonationFeed(feed: DonationAnnouncement[]) {
  write(KEYS.donationFeed, feed.slice(0, DONATION_FEED_MAX));
}

function recordDonationAnnouncement(pledge: DonationPledge) {
  const center = getCenterById(pledge.center_id);
  const announcement: DonationAnnouncement = {
    id: `donation-feed-${pledge.id}`,
    pledge_id: pledge.id,
    donor_name: pledge.donor_name ?? "Donante anónimo",
    items_description: pledge.items_description,
    center_name: center?.name ?? "un centro de acopio",
    created_at: pledge.created_at,
  };

  const feed = getDonationFeedRaw();
  feed.unshift(announcement);
  saveDonationFeed(feed);

  emitDonationAnnounced({
    id: announcement.id,
    donor_name: announcement.donor_name,
    items_description: announcement.items_description,
    center_name: announcement.center_name,
  });
}

/** Avisos recientes de donación para mostrar en el inicio. */
export function getRecentDonationAnnouncements(
  limit = 10
): DonationAnnouncement[] {
  const cutoff = Date.now() - DONATION_FEED_VISIBLE_HOURS * 60 * 60 * 1000;
  return getDonationFeedRaw()
    .filter((a) => new Date(a.created_at).getTime() >= cutoff)
    .slice(0, limit);
}

function findPledge(pledgeId: string): DonationPledge | null {
  return getPledgesRaw().find((p) => p.id === pledgeId) ?? null;
}

/** El encargado del centro (o super admin) cambia el estado de una promesa. */
export function updatePledgeStatus(
  pledgeId: string,
  status: PledgeStatus
): DonationPledge | null {
  const pledge = findPledge(pledgeId);
  if (!pledge) return null;
  assertCanManageCenter(pledge.center_id);

  const pledges = getPledgesRaw();
  const idx = pledges.findIndex((p) => p.id === pledgeId);
  if (idx === -1) return null;

  pledges[idx] = {
    ...pledges[idx],
    status,
    updated_at: new Date().toISOString(),
  };
  savePledges(pledges);
  refreshAllStats();
  notify();
  return pledges[idx];
}

/**
 * Marca una promesa como entregada y, si es de insumos y está ligada a una
 * necesidad, suma la cantidad al inventario del centro automáticamente.
 */
export function confirmPledgeReceived(pledgeId: string): DonationPledge | null {
  const pledge = findPledge(pledgeId);
  if (!pledge) return null;
  assertCanManageCenter(pledge.center_id);

  if (
    pledge.donation_type === "supplies" &&
    pledge.need_id &&
    pledge.status !== "delivered"
  ) {
    markNeedReceived(pledge.need_id, pledge.quantity);
  }
  return updatePledgeStatus(pledgeId, "delivered");
}

/** Cancela una promesa: la puede cancelar el donante dueño o el encargado. */
export function cancelPledge(pledgeId: string): DonationPledge | null {
  const session = requireSession();
  const pledge = findPledge(pledgeId);
  if (!pledge) return null;

  const isOwner = pledge.donor_id === session.userId;
  const isManager =
    session.role === "super_admin" ||
    (session.role === "center_admin" && session.centerId === pledge.center_id);

  if (!isOwner && !isManager) {
    throw new StoreAuthError("No puedes cancelar esta donación.");
  }

  const pledges = getPledgesRaw();
  const idx = pledges.findIndex((p) => p.id === pledgeId);
  if (idx === -1) return null;
  pledges[idx] = {
    ...pledges[idx],
    status: "cancelled",
    updated_at: new Date().toISOString(),
  };
  savePledges(pledges);
  refreshAllStats();
  notify();
  return pledges[idx];
}

export function getUserSession(): UserSession | null {
  const raw = read<UserSession | LegacyAdminSession | null>(KEYS.session, null);
  if (!raw) return null;
  if ("adminName" in raw && typeof raw.adminName === "string") {
    return {
      userId: getDeviceUserId(),
      role: "center_admin",
      name: raw.adminName,
      centerId: raw.centerId,
      loggedInAt: raw.loggedInAt,
    };
  }
  const session = raw as UserSession;
  if (!session.userId) {
    return { ...session, userId: getDeviceUserId() };
  }
  return session;
}

export function setUserSession(session: UserSession) {
  write(KEYS.session, session);
  notify();
}

export function clearUserSession() {
  if (!isBrowser()) return;
  localStorage.removeItem(KEYS.session);
  notify();
}

/** @deprecated */
export function getAdminSession(): AdminSession | null {
  const s = getUserSession();
  if (!s || s.role !== "center_admin" || !s.centerId) return null;
  return {
    userId: s.userId,
    role: "center_admin",
    name: s.name,
    centerId: s.centerId,
    loggedInAt: s.loggedInAt,
  };
}

/** @deprecated */
export function setAdminSession(session: LegacyAdminSession | AdminSession) {
  setUserSession({
    userId: getDeviceUserId(),
    role: "center_admin",
    name: "adminName" in session ? session.adminName : session.name,
    centerId: session.centerId,
    loggedInAt: session.loggedInAt,
  });
}

/** @deprecated */
export function clearAdminSession() {
  clearUserSession();
}

export function toggleCenterActive(centerId: string) {
  assertSuperAdmin();
  const centers = getCentersRaw();
  const idx = centers.findIndex((c) => c.id === centerId);
  if (idx === -1) return null;
  centers[idx] = {
    ...centers[idx],
    is_active: !centers[idx].is_active,
    updated_at: new Date().toISOString(),
  };
  saveCenters(centers);
  refreshAllStats();
  notify();
  return centers[idx];
}

export function toggleCenterVerified(centerId: string) {
  assertSuperAdmin();
  const centers = getCentersRaw();
  const idx = centers.findIndex((c) => c.id === centerId);
  if (idx === -1) return null;
  centers[idx] = {
    ...centers[idx],
    is_verified: !centers[idx].is_verified,
    updated_at: new Date().toISOString(),
  };
  saveCenters(centers);
  refreshAllStats();
  notify();
  return centers[idx];
}

export interface UpsertCenterInput {
  name: string;
  description?: string | null;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  schedule?: CenterSchedule;
  status?: CenterStatus;
  phone?: string | null;
  email?: string | null;
  image_url?: string | null;
  is_verified?: boolean;
  is_active?: boolean;
}

function normalizeCenterInput(input: UpsertCenterInput): Omit<CollectionCenter, "id" | "created_at" | "updated_at" | "manager_id"> {
  return {
    name: sanitizeText(input.name, 120),
    description: input.description ? sanitizeMultiline(input.description) : null,
    address: sanitizeText(input.address, 200),
    city: sanitizeText(input.city, 80),
    state: sanitizeText(input.state, 80),
    latitude: input.latitude,
    longitude: input.longitude,
    schedule: input.schedule ?? { weekdays: "9:00-17:00", weekends: "cerrado" },
    status: input.status ?? "operational",
    phone: input.phone ? sanitizePhone(input.phone) : null,
    email: input.email ? sanitizeText(input.email, 120) : null,
    image_url: input.image_url ? sanitizeText(input.image_url, 500) : null,
    is_verified: input.is_verified ?? false,
    is_active: input.is_active ?? true,
  };
}

export function createCenter(input: UpsertCenterInput): CenterWithStats {
  assertSuperAdmin();
  const centers = getCentersRaw();
  const now = new Date().toISOString();
  const base = normalizeCenterInput(input);
  const center: CollectionCenter = {
    id: `center-${Date.now()}`,
    ...base,
    manager_id: null,
    created_at: now,
    updated_at: now,
  };
  centers.push(recalculateStats(center, getNeedsRaw(), getPledgesRaw()));
  saveCenters(centers);
  refreshAllStats();
  notify();
  return getCenterById(center.id)!;
}

export function updateCenter(
  centerId: string,
  patch: Partial<UpsertCenterInput>
): CenterWithStats | null {
  assertSuperAdmin();
  const centers = getCentersRaw();
  const idx = centers.findIndex((c) => c.id === centerId);
  if (idx === -1) return null;

  const current = centers[idx];
  const merged: UpsertCenterInput = {
    name: patch.name ?? current.name,
    description: patch.description !== undefined ? patch.description : current.description,
    address: patch.address ?? current.address,
    city: patch.city ?? current.city,
    state: patch.state ?? current.state,
    latitude: patch.latitude ?? current.latitude,
    longitude: patch.longitude ?? current.longitude,
    schedule: patch.schedule ?? current.schedule,
    status: patch.status ?? current.status,
    phone: patch.phone !== undefined ? patch.phone : current.phone,
    email: patch.email !== undefined ? patch.email : current.email,
    image_url: patch.image_url !== undefined ? patch.image_url : current.image_url,
    is_verified: patch.is_verified ?? current.is_verified,
    is_active: patch.is_active ?? current.is_active,
  };

  const normalized = normalizeCenterInput(merged);
  centers[idx] = {
    ...current,
    ...normalized,
    updated_at: new Date().toISOString(),
  };
  saveCenters(centers);
  refreshAllStats();
  notify();
  return getCenterById(centerId);
}

export function deleteCenter(centerId: string): boolean {
  assertSuperAdmin();
  const centers = getCentersRaw();
  if (!centers.some((c) => c.id === centerId)) return false;

  saveCenters(centers.filter((c) => c.id !== centerId));
  saveNeeds(getNeedsRaw().filter((n) => n.center_id !== centerId));
  savePledges(getPledgesRaw().filter((p) => p.center_id !== centerId));
  saveNotifications(
    getNotificationsRaw().filter((n) => n.center_id !== centerId)
  );
  refreshAllStats();
  notify();
  return true;
}

export function sendCenterNotification(
  centerId: string,
  title: string,
  body: string
): CenterNotification {
  assertSuperAdmin();
  if (!getCenterById(centerId)) {
    throw new StoreAuthError("Centro no encontrado.");
  }

  const session = requireSession();
  const notification: CenterNotification = {
    id: `notif-${Date.now()}`,
    center_id: centerId,
    title: sanitizeText(title, 120),
    body: sanitizeMultiline(body),
    from_name: session.name,
    read_at: null,
    created_at: new Date().toISOString(),
  };

  const notifications = getNotificationsRaw();
  notifications.unshift(notification);
  saveNotifications(notifications);
  notify();
  return notification;
}

export function getCenterNotifications(centerId: string): CenterNotification[] {
  return getNotificationsRaw()
    .filter((n) => n.center_id === centerId)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
}

export function getAllNotifications(): CenterNotification[] {
  const session = getUserSession();
  if (!session || session.role !== "super_admin") return [];
  return getNotificationsRaw().sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function getUnreadNotificationCount(centerId: string): number {
  return getCenterNotifications(centerId).filter((n) => !n.read_at).length;
}

export function markNotificationRead(notificationId: string): CenterNotification | null {
  const notifications = getNotificationsRaw();
  const idx = notifications.findIndex((n) => n.id === notificationId);
  if (idx === -1) return null;

  assertCanManageCenter(notifications[idx].center_id);

  notifications[idx] = {
    ...notifications[idx],
    read_at: new Date().toISOString(),
  };
  saveNotifications(notifications);
  notify();
  return notifications[idx];
}

export function deleteNotification(notificationId: string): boolean {
  assertSuperAdmin();
  const notifications = getNotificationsRaw();
  const next = notifications.filter((n) => n.id !== notificationId);
  if (next.length === notifications.length) return false;
  saveNotifications(next);
  notify();
  return true;
}

export interface GlobalStats {
  totalCenters: number;
  activeCenters: number;
  urgentCenters: number;
  totalUrgentNeeds: number;
  totalPledges: number;
  pendingPledges: number;
}

export function getGlobalStats(): GlobalStats {
  const centers = getAllCenters();
  const needs = getNeedsRaw();
  const pledges = getPledgesRaw();

  return {
    totalCenters: centers.length,
    activeCenters: centers.filter((c) => c.is_active).length,
    urgentCenters: centers.filter((c) => c.status === "urgent").length,
    totalUrgentNeeds: needs.filter((n) => n.priority === "urgent").length,
    totalPledges: pledges.length,
    pendingPledges: pledges.filter((p) => isActivePledge(p.status)).length,
  };
}

export function getAllPledges(): DonationPledge[] {
  return getPledgesRaw().sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/** Promesas del donante por identidad estable (con respaldo por nombre legado). */
export function getDonorPledges(donorId: string, donorName?: string): DonationPledge[] {
  return getPledgesRaw()
    .filter(
      (p) => p.donor_id === donorId || (!!donorName && p.donor_name === donorName)
    )
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
}

/** Donaciones dropoff activas que el donante puede rastrear en tiempo real. */
export function getDonorTrackablePledges(donorId: string): DonationPledge[] {
  return getPledgesRaw().filter(
    (p) =>
      p.donor_id === donorId &&
      p.delivery_method === "dropoff" &&
      isActivePledge(p.status)
  );
}

/** Actualiza la ubicación GPS de una promesa (solo el donante dueño). */
export function updatePledgeLocation(
  pledgeId: string,
  lat: number,
  lng: number
): DonationPledge | null {
  const pledge = findPledge(pledgeId);
  if (!pledge) return null;

  const donorId = getUserSession()?.userId ?? getDeviceUserId();
  if (pledge.donor_id !== donorId) {
    throw new StoreAuthError("Solo puedes actualizar tu propia donación.");
  }
  if (!isActivePledge(pledge.status) || pledge.delivery_method !== "dropoff") {
    return pledge;
  }

  const pledges = getPledgesRaw();
  const idx = pledges.findIndex((p) => p.id === pledgeId);
  if (idx === -1) return null;

  const nextStatus =
    pledge.status === "pending" || pledge.status === "confirmed"
      ? "in_transit"
      : pledge.status;

  pledges[idx] = {
    ...pledges[idx],
    latitude: lat,
    longitude: lng,
    status: nextStatus,
    updated_at: new Date().toISOString(),
  };
  savePledges(pledges);
  refreshAllStats();
  notify();
  return pledges[idx];
}

export function getUrgentNeedsAcrossCenters() {
  const centers = getAllCenters().filter((c) => c.is_active);
  const needs = getNeedsRaw().filter((n) => n.priority === "urgent");
  return needs
    .map((need) => ({
      need,
      center: centers.find((c) => c.id === need.center_id)!,
    }))
    .filter((item) => item.center);
}

export function getLastInventoryUpdate(centerId: string): string | null {
  const needs = getCenterNeeds(centerId);
  if (!needs.length) return null;
  return needs.reduce(
    (latest, n) => (n.updated_at > latest ? n.updated_at : latest),
    needs[0].updated_at
  );
}

export function getInventoryProgress(need: CenterNeed): number {
  if (need.priority === "covered") return 100;
  if (!need.quantity_needed || need.quantity_needed <= 0) return 0;
  return Math.min(
    100,
    Math.round((need.quantity_received / need.quantity_needed) * 100)
  );
}

/** Promesas activas con coordenadas para mostrar en el mapa. */
export function getPledgesForMap(): DonationPledge[] {
  return getPledgesRaw().filter(
    (p) =>
      isActivePledge(p.status) && p.latitude != null && p.longitude != null
  );
}

/** Alertas SOS activas visibles en el mapa. */
export function getActiveSosAlerts(): SosAlert[] {
  return getSosRaw()
    .filter((a) => a.status === "active")
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
}

export async function createSosAlert(input: {
  user_name?: string;
  latitude: number;
  longitude: number;
  message?: string | null;
}): Promise<SosAlert> {
  const session = getUserSession();
  const userId = session?.userId ?? getDeviceUserId();
  const userName = sanitizeText(
    session?.name ?? input.user_name ?? "Persona en emergencia",
    80
  );

  if (isSupabaseConfigured() && isBrowser()) {
    const alert = await insertSosAlertRemote({
      user_name: userName,
      latitude: input.latitude,
      longitude: input.longitude,
      message: input.message,
    });
    notify();
    return alert;
  }

  const alerts = getSosRaw();
  const alert: SosAlert = {
    id: `sos-${Date.now()}`,
    user_id: userId,
    user_name: userName,
    latitude: input.latitude,
    longitude: input.longitude,
    message: input.message ? sanitizeMultiline(input.message, 300) : null,
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  alerts.push(alert);
  saveSos(alerts);
  notify();
  return alert;
}

export function resolveSosAlert(alertId: string): SosAlert | null {
  const session = requireSession();
  const alerts = getSosRaw();
  const idx = alerts.findIndex((a) => a.id === alertId);
  if (idx === -1) return null;

  const alert = alerts[idx];
  const isOwner = alert.user_id === session.userId;
  const isAdmin =
    session.role === "super_admin" || session.role === "center_admin";

  if (!isOwner && !isAdmin) {
    throw new StoreAuthError("No puedes cerrar esta alerta SOS.");
  }

  alerts[idx] = {
    ...alert,
    status: "resolved",
    updated_at: new Date().toISOString(),
  };
  saveSos(alerts);
  notify();
  return alerts[idx];
}

export function cancelSosAlert(alertId: string): SosAlert | null {
  const session = requireSession();
  const alerts = getSosRaw();
  const idx = alerts.findIndex((a) => a.id === alertId);
  if (idx === -1) return null;

  if (alerts[idx].user_id !== session.userId) {
    throw new StoreAuthError("Solo quien creó la alerta puede cancelarla.");
  }

  alerts[idx] = {
    ...alerts[idx],
    status: "cancelled",
    updated_at: new Date().toISOString(),
  };
  saveSos(alerts);
  notify();
  return alerts[idx];
}
