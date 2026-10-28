import { describe, it, expect, beforeEach } from "vitest";
import { clearUserLocalData } from "@shared/lib/storage/userStorage";
import { getPendingMutationsCount, hasUnsyncedData } from "@shared/lib/offline/offlineStorage";
import { checkPendingWritesBeforeSignOut } from "@features/auth/authService";
import { sanitizeForFirestore } from "@shared/lib/firebase/sanitize";
import { differenceInDays, parseISO } from "date-fns";

const storageMap = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null,
  get length() { return storageMap.size; }
};

Object.defineProperty(globalThis, "localStorage", {
  value: mockLocalStorage,
  writable: true
});

Object.defineProperty(globalThis, "window", {
  value: { localStorage: mockLocalStorage },
  writable: true
});

describe("Data Safety & Repositories Architecture", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  describe("Logout Safety & Local Storage Guard", () => {
    it("never removes mutation queue or global settings when clearing user local data", () => {
      // Setup sensitive items and mutation queue
      localStorage.setItem("apex_theme", "dark");
      localStorage.setItem("i18nextLng", "hu");
      localStorage.setItem("apex_offline_mutation_queue", JSON.stringify([{ id: "mut-1", athleteId: "user-123" }]));
      localStorage.setItem("apex_last_synced_at", "2026-10-28T08:00:00Z");

      // Setup user-specific items
      localStorage.setItem("apex_user-123_profile", JSON.stringify({ displayName: "Béla" }));
      localStorage.setItem("apex_sessions_user-123", JSON.stringify([{ sessionId: "sess-1" }]));
      localStorage.setItem("apex_other-user_profile", JSON.stringify({ displayName: "Másik" }));

      // Execute clearUserLocalData for user-123
      clearUserLocalData("user-123");

      // Verify user-specific items removed
      expect(localStorage.getItem("apex_user-123_profile")).toBeNull();
      expect(localStorage.getItem("apex_sessions_user-123")).toBeNull();

      // Verify other user items NOT removed
      expect(localStorage.getItem("apex_other-user_profile")).not.toBeNull();

      // Verify critical persistence queues and global preferences are PRESERVED
      expect(localStorage.getItem("apex_offline_mutation_queue")).not.toBeNull();
      expect(localStorage.getItem("apex_theme")).toBe("dark");
      expect(localStorage.getItem("i18nextLng")).toBe("hu");
      expect(localStorage.getItem("apex_last_synced_at")).toBe("2026-10-28T08:00:00Z");
    });

    it("accurately detects pending mutations before signout", async () => {
      // 0 pending mutations
      const cleanCheck = await checkPendingWritesBeforeSignOut();
      expect(cleanCheck.safe).toBe(true);
      expect(cleanCheck.pendingCount).toBe(0);

      // Add 2 offline mutations
      localStorage.setItem(
        "apex_offline_mutation_queue",
        JSON.stringify([
          { id: "mut-1", collection: "sessions", docId: "s1" },
          { id: "mut-2", collection: "days", docId: "d1" }
        ])
      );

      expect(getPendingMutationsCount()).toBe(2);
      expect(hasUnsyncedData()).toBe(true);

      const warningCheck = await checkPendingWritesBeforeSignOut();
      expect(warningCheck.safe).toBe(false);
      expect(warningCheck.pendingCount).toBe(2);
    });
  });

  describe("Schema Safety & Serialization", () => {
    it("ensures schemaVersion is present and undefined fields are stripped for Firestore safety", () => {
      const rawSession = {
        sessionId: "sess-test-1",
        athleteId: "athlete-abc",
        date: "2026-10-28",
        sport: "running",
        title: "Könnyű futás",
        durationMinutes: 45,
        rpe: 5,
        targetIntensityRpe: 5,
        trainingLoad: undefined, // Must be stripped!
        distanceMeters: undefined, // Must be stripped!
        elevationGainMeters: undefined,
        notes: undefined,
        schemaVersion: 1
      };

      const sanitized = sanitizeForFirestore(rawSession) as Record<string, unknown>;

      expect(sanitized.sessionId).toBe("sess-test-1");
      expect(sanitized.athleteId).toBe("athlete-abc");
      expect(sanitized.schemaVersion).toBe(1);
      expect("trainingLoad" in sanitized).toBe(false);
      expect("distanceMeters" in sanitized).toBe(false);
      expect("elevationGainMeters" in sanitized).toBe(false);
      expect("notes" in sanitized).toBe(false);
    });
  });

  describe("Soft Delete & 30-Day Trash Retention Logic", () => {
    it("calculates remaining days accurately within the 30-day retention window", () => {
      const now = parseISO("2026-05-15T12:00:00Z");

      // Deleted 5 days ago (May 10) -> 25 days remaining
      const deletedAt5DaysAgo = "2026-05-10T12:00:00Z";
      const elapsed5 = differenceInDays(now, parseISO(deletedAt5DaysAgo));
      const remaining5 = Math.max(0, 30 - elapsed5);
      expect(remaining5).toBe(25);

      // Deleted 29 days ago (April 16) -> 1 day remaining
      const deletedAt29DaysAgo = "2026-04-16T12:00:00Z";
      const elapsed29 = differenceInDays(now, parseISO(deletedAt29DaysAgo));
      const remaining29 = Math.max(0, 30 - elapsed29);
      expect(remaining29).toBe(1);

      // Deleted 35 days ago (April 10) -> 0 days remaining (expired)
      const deletedAt35DaysAgo = "2026-04-10T12:00:00Z";
      const elapsed35 = differenceInDays(now, parseISO(deletedAt35DaysAgo));
      const remaining35 = Math.max(0, 30 - elapsed35);
      expect(remaining35).toBe(0);
    });
  });
});
