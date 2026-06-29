import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Listener = () => void;

function createSharedChannel(
  channelName: string,
  bind: (channel: RealtimeChannel, notify: () => void) => void
) {
  const listeners = new Set<Listener>();
  let channel: RealtimeChannel | null = null;
  let refCount = 0;

  const notify = () => {
    for (const listener of listeners) listener();
  };

  return function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    refCount += 1;

    if (!channel) {
      const supabase = createClient();
      channel = supabase.channel(channelName);
      bind(channel, notify);
      void channel.subscribe();
    }

    return () => {
      listeners.delete(listener);
      refCount -= 1;
      if (refCount <= 0 && channel) {
        const supabase = createClient();
        void supabase.removeChannel(channel);
        channel = null;
        refCount = 0;
      }
    };
  };
}

/** Una sola suscripción compartida para cambios en centros e inventario. */
export const subscribeCentersRealtime = createSharedChannel(
  "centers-realtime",
  (channel, notify) => {
    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "collection_centers" },
        notify
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "center_needs" },
        notify
      );
  }
);

/** Una sola suscripción compartida para pins del mapa (promesas y SOS). */
export const subscribeMapLiveRealtime = createSharedChannel(
  "map-live",
  (channel, notify) => {
    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "donation_pledges" },
        notify
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sos_alerts" },
        notify
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "donation_announcements" },
        notify
      );
  }
);

const centerNeedsChannels = new Map<
  string,
  (listener: Listener) => () => void
>();

/** Suscripción compartida por centro para cambios en su inventario. */
export function subscribeCenterNeedsRealtime(
  centerId: string,
  listener: Listener
): () => void {
  let entry = centerNeedsChannels.get(centerId);
  if (!entry) {
    entry = createSharedChannel(`needs-${centerId}`, (channel, notify) => {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "center_needs",
          filter: `center_id=eq.${centerId}`,
        },
        notify
      );
    });
    centerNeedsChannels.set(centerId, entry);
  }
  const unsubscribe = entry(listener);
  return unsubscribe;
}
