import { useState, useEffect } from "react";
import {
  SyncState,
  subscribeSyncState,
  flushOfflineQueue
} from "@shared/lib/offline/offlineStorage";

export interface UseSyncStateReturn {
  status: SyncState;
  pendingCount: number;
  lastSyncedAt: string | null;
  triggerSync: () => Promise<{ synced: number; failed: number }>;
}

export function useSyncState(): UseSyncStateReturn {
  const [state, setState] = useState<{
    status: SyncState;
    pendingCount: number;
    lastSyncedAt: string | null;
  }>({
    status: typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "synced",
    pendingCount: 0,
    lastSyncedAt: null
  });

  useEffect(() => {
    const unsubscribe = subscribeSyncState((next) => {
      setState(next);
    });
    return unsubscribe;
  }, []);

  return {
    ...state,
    triggerSync: flushOfflineQueue
  };
}
