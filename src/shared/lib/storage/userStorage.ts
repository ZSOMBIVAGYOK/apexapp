/**
 * User storage utility: manages user-namespaced local storage and ensures
 * zero cross-account data leakage on logout or account switching.
 */

export const getUserStorageKey = (key: string, userId?: string | null): string => {
  const uid = userId || "anonymous";
  return `apex_${uid}_${key}`;
};

/**
 * Clears all user-specific data from localStorage.
 * If userId is provided, clears all items for that user or general user keys.
 * If no userId is provided, clears all apex-related user caches.
 * Preserves general app settings like theme mode.
 */
export const clearUserLocalData = (userId?: string | null): void => {
  if (typeof window === "undefined" || !window.localStorage) return;

  try {
    const keysToRemove: string[] = [];
    const length = localStorage.length;

    for (let i = 0; i < length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Never remove global non-sensitive app settings
      if (key === "apex_theme" || key === "i18nextLng") {
        continue;
      }

      if (userId) {
        if (key.includes(userId) || key.startsWith("apex_")) {
          keysToRemove.push(key);
        }
      } else if (key.startsWith("apex_")) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {
        // Ignore single item removal errors
      }
    });
  } catch (err) {
    // Storage access fallback
  }
};
