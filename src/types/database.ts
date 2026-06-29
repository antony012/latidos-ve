export type UserRole = "donor" | "center_admin" | "volunteer" | "super_admin";

export type CenterStatus = "urgent" | "operational" | "full" | "closed";

export type NeedPriority = "urgent" | "medium" | "low" | "covered";

export type PledgeStatus =
  | "pending"
  | "confirmed"
  | "in_transit"
  | "delivered"
  | "cancelled";

export type DeliveryMethod = "dropoff" | "pickup";

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  city: string | null;
  created_at: string;
  updated_at: string;
}

export interface NeedCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
  created_at: string;
}

export interface CenterSchedule {
  weekdays: string;
  weekends: string;
}

export interface CollectionCenter {
  id: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  schedule: CenterSchedule;
  status: CenterStatus;
  phone: string | null;
  email: string | null;
  manager_id: string | null;
  is_active: boolean;
  /** Foto del centro para el mapa y listados */
  image_url: string | null;
  /** Revisado y validado por el coordinador nacional */
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface CenterNeed {
  id: string;
  center_id: string;
  category_id: string | null;
  item_name: string;
  priority: NeedPriority;
  quantity_needed: number | null;
  quantity_received: number;
  unit: string;
  notes: string | null;
  updated_at: string;
  created_at: string;
}

export type DonationType = "money" | "supplies";

export type SosAlertStatus = "active" | "resolved" | "cancelled";

export interface SosAlert {
  id: string;
  user_id: string;
  user_name: string;
  latitude: number;
  longitude: number;
  message: string | null;
  status: SosAlertStatus;
  created_at: string;
  updated_at: string;
}

export interface DonationPledge {
  id: string;
  center_id: string;
  need_id: string | null;
  donor_id: string | null;
  donor_name: string | null;
  items_description: string;
  quantity: number;
  donation_type: DonationType;
  amount: number | null;
  currency: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  status: PledgeStatus;
  latitude: number | null;
  longitude: number | null;
  delivery_method: DeliveryMethod;
  scheduled_at: string | null;
  pickup_address: string | null;
  contact_phone: string | null;
  /** Dirección de origen del donante (dropoff o referencia en mapa) */
  origin_address: string | null;
  estimated_arrival: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CenterWithStats extends CollectionCenter {
  urgent_needs_count: number;
  covered_needs_count: number;
  total_needs_count: number;
  pending_pledges_count: number;
}

export interface CollectionCenterWithNeeds extends CollectionCenter {
  needs: CenterNeed[];
}

export interface CenterNotification {
  id: string;
  center_id: string;
  title: string;
  body: string;
  from_name: string;
  read_at: string | null;
  created_at: string;
}

/** Aviso público en el inicio cuando alguien dona. */
export interface DonationAnnouncement {
  id: string;
  pledge_id: string;
  donor_name: string;
  items_description: string;
  center_name: string;
  created_at: string;
}

export interface CenterAccessCode {
  id: string;
  center_id: string;
  access_code: string;
  label: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id">>;
      };
      need_categories: {
        Row: NeedCategory;
        Insert: Omit<NeedCategory, "id" | "created_at">;
        Update: Partial<Omit<NeedCategory, "id">>;
      };
      collection_centers: {
        Row: CollectionCenter;
        Insert: Omit<
          CollectionCenter,
          "id" | "created_at" | "updated_at" | "is_active"
        > & { is_active?: boolean };
        Update: Partial<Omit<CollectionCenter, "id">>;
      };
      center_needs: {
        Row: CenterNeed;
        Insert: Omit<CenterNeed, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<CenterNeed, "id">>;
      };
      donation_pledges: {
        Row: DonationPledge;
        Insert: Omit<DonationPledge, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<DonationPledge, "id">>;
      };
      sos_alerts: {
        Row: SosAlert;
        Insert: Omit<SosAlert, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<SosAlert, "id">>;
      };
      donation_announcements: {
        Row: DonationAnnouncement;
        Insert: Omit<DonationAnnouncement, "id" | "created_at">;
        Update: Partial<Omit<DonationAnnouncement, "id">>;
      };
      center_access_codes: {
        Row: CenterAccessCode;
        Insert: Omit<CenterAccessCode, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<CenterAccessCode, "id" | "center_id">>;
      };
    };
    Views: {
      centers_with_stats: {
        Row: CenterWithStats;
      };
    };
  };
}
