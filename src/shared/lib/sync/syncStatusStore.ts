import { create } from "zustand";

export type SyncStatus = "saved" | "syncing" | "error";

interface SyncStatusState {
  status: SyncStatus;
  lastError: string | null;
  lastSavedAt: string | null;
  retryFn: (() => Promise<void>) | null;
  setSyncing: () => void;
  setSaved: () => void;
  setError: (errorMessage: string, retry?: () => Promise<void>) => void;
  retry: () => Promise<void>;
}

export const useSyncStatusStore = create<SyncStatusState>((set, get) => ({
  status: "saved",
  lastError: null,
  lastSavedAt: null,
  retryFn: null,

  setSyncing: () => {
    set({ status: "syncing", lastError: null });
  },

  setSaved: () => {
    set({
      status: "saved",
      lastError: null,
      lastSavedAt: new Date().toISOString(),
      retryFn: null
    });
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
