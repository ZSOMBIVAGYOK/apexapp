import { describe, it, expect, beforeEach, vi } from "vitest";
import { useSyncStatusStore } from "./syncStatusStore";

describe("useSyncStatusStore", () => {
  beforeEach(() => {
    useSyncStatusStore.setState({
      status: "saved",
      lastError: null,
      lastSavedAt: null,
      retryFn: null
    });
  });

  it("transitions between syncing and saved", () => {
    const store = useSyncStatusStore.getState();
    store.setSyncing();
    expect(useSyncStatusStore.getState().status).toBe("syncing");

    store.setSaved();
    expect(useSyncStatusStore.getState().status).toBe("saved");
    expect(useSyncStatusStore.getState().lastSavedAt).toBeDefined();
  });

  it("handles error state and retry", async () => {
    const mockRetry = vi.fn().mockResolvedValue(undefined);
    const store = useSyncStatusStore.getState();

    store.setError("Hálózati hiba a mentéskor", mockRetry);
    expect(useSyncStatusStore.getState().status).toBe("error");
    expect(useSyncStatusStore.getState().lastError).toBe("Hálózati hiba a mentéskor");

    await useSyncStatusStore.getState().retry();
    expect(mockRetry).toHaveBeenCalled();
    expect(useSyncStatusStore.getState().status).toBe("saved");
    expect(useSyncStatusStore.getState().lastError).toBeNull();
  });
});
