import { useSyncExternalStore } from "react";
import { getOfflineState, subscribeOffline } from "@/lib/offline/queue";

export function useOffline() {
  return useSyncExternalStore(
    (cb) => subscribeOffline(cb),
    getOfflineState,
    getOfflineState,
  );
}