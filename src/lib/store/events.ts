export const STORE_UPDATED_EVENT = "ve-ayuda:store-updated";

export const DONATION_ANNOUNCED_EVENT = "ve-ayuda:donation-announced";

export interface DonationAnnouncedDetail {
  id: string;
  donor_name: string;
  items_description: string;
  center_name: string;
}

export function emitStoreUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(STORE_UPDATED_EVENT));
  }
}

export function emitDonationAnnounced(detail: DonationAnnouncedDetail) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(DONATION_ANNOUNCED_EVENT, { detail })
    );
  }
}

export function subscribeStoreUpdate(callback: () => void) {
  window.addEventListener(STORE_UPDATED_EVENT, callback);
  return () => window.removeEventListener(STORE_UPDATED_EVENT, callback);
}
