import { useEffect, useState } from "react";
import { subscribeStoreUpdate } from "@/lib/store/events";

export function useStoreSync() {
  const [, setTick] = useState(0);

  useEffect(() => {
    return subscribeStoreUpdate(() => setTick((t) => t + 1));
  }, []);
}
