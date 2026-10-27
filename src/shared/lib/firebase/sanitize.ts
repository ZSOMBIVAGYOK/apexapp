/**
 * Recursively removes all `undefined` values from an object or array
 * to ensure Firestore setDoc / updateDoc operations never fail with
 * "Unsupported field value: undefined".
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as unknown as T;
  }

  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }

  if (typeof data === "object") {
    // Preserve Date instances as ISO strings
    if (data instanceof Date) {
      return data.toISOString() as unknown as T;
    }

    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        cleaned[key] = sanitizeForFirestore(val);
      }
    }
    return cleaned as T;
  }

  return data;
}
