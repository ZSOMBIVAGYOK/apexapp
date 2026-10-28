import { create } from "zustand";

export type SyncStatus = "saved" | "syncing" | "error";

interface SyncStatusState {
  status: SyncStatus;
  lastError: string | null;
  lastSavedAt: string | null;
  lastServerWriteAt: string | null;
  lastServerReadAt: string | null;
  isOnline: boolean;
  isCacheFallback: boolean;
  cacheNoticeMessage: string | null;
  retryFn: (() => Promise<void>) | null;
  setSyncing: () => void;
  setSaved: () => void;
  setError: (errorMessage: string, retry?: () => Promise<void>) => void;
  recordServerWrite: () => void;
  recordServerRead: () => void;
  setCacheFallback: (isFallback: boolean, message?: string | null) => void;
  setOnlineStatus: (online: boolean) => void;
  retry: () => Promise<void>;
}

export const useSyncStatusStore = create<SyncStatusState>((set, get) => ({
  status: "saved",
  lastError: null,
  lastSavedAt: null,
  lastServerWriteAt: typeof window !== "undefined" ? localStorage.getItem("apex_last_server_write_at") : null,
  lastServerReadAt: typeof window !== "undefined" ? localStorage.getItem("apex_last_server_read_at") : null,
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  isCacheFallback: false,
  cacheNoticeMessage: null,
  retryFn: null,

  setSyncing: () => {
    set({ status: "syncing", lastError: null });
  },

  setSaved: () => {
    const now = new Date().toISOString();
    try {
      localStorage.setItem("apex_last_server_write_at", now);
    } catch {
      // Storage fallback
    }
    set({
      status: "saved",
      lastError: null,
      lastSavedAt: now,
      lastServerWriteAt: now,
      retryFn: null
    });
  },

  recordServerWrite: () => {
    const now = new Date().toISOString();
    try {
      localStorage.setItem("apex_last_server_write_at", now);
    } catch {
      // Storage fallback
    }
    set({ lastServerWriteAt: now, lastSavedAt: now });
  },

  recordServerRead: () => {
    const now = new Date().toISOString();
    try {
      localStorage.setItem("apex_last_server_read_at", now);
    } catch {
      // Storage fallback
    }
    set({ lastServerReadAt: now, isCacheFallback: false, cacheNoticeMessage: null });
  },

  setCacheFallback: (isFallback: boolean, message?: string | null) => {
    set({
      isCacheFallback: isFallback,
      cacheNoticeMessage: isFallback ? (message || "Nem sikerült elérni a szervert, lehet, hogy nem a legfrissebb adatot látod.") : null
    });
  },

  setOnlineStatus: (isOnline: boolean) => {
    set({ isOnline });
  },

  setError: (errorMessage: string, retry?: () => Promise<void>) => {
    set({
      status: "error",
      lastError: errorMessage,
      retryFn: retry || null
    });
  },

  retry: async () => {
    const fn = get().retryFn;
    if (fn) {
      set({ status: "syncing", lastError: null });
      try {
        await fn();
        set({
          status: "saved",
          lastError: null,
          lastSavedAt: new Date().toISOString(),
          retryFn: null
        });
      } catch (err: any) {
        set({
          status: "error",
          lastError: err?.message || "Újrapróbálkozási hiba"
        });
      }
    }
  }
}));

// Wire online/offline listeners
if (typeof window !== "undefined") {
  window.addEventListener("online", () => useSyncStatusStore.getState().setOnlineStatus(true));
  window.addEventListener("offline", () => useSyncStatusStore.getState().setOnlineStatus(false));
}
