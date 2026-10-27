import { OverlayData, ShareMetricKey } from "./types";

const LOCAL_STORAGE_PREFIX = "apex_share_metrics_";

/**
 * Default metric selections mapped by general sport categories
 */
const DEFAULT_METRIC_SETS: Record<string, ShareMetricKey[]> = {
  endurance_running: [
    "sportTitle",
    "date",
    "distance",
    "duration",
    "paceSpeed",
    "avgHr"
  ],
  endurance_cycling: [
    "sportTitle",
    "date",
    "distance",
    "duration",
    "paceSpeed",
    "power",
    "avgHr",
    "elevation"
  ],
  endurance_swimming: [
    "sportTitle",
    "date",
    "distance",
    "duration",
    "paceSpeed",
    "avgHr"
  ],
  strength: [
    "sportTitle",
    "date",
    "duration",
    "load",
    "rpe"
  ],
  general: [
    "sportTitle",
    "date",
    "duration",
    "load",
    "avgHr"
  ]
};

/**
 * Determine best metric set archetype based on sport ID
 */
export function getArchetypeForSport(sportId: string): string {
  const s = sportId.toLowerCase();
  if (
    s.includes("run") ||
    s.includes("futas") ||
    s.includes("trail") ||
    s.includes("jog")
  ) {
    return "endurance_running";
  }
  if (
    s.includes("cycl") ||
    s.includes("kerekpar") ||
    s.includes("bike") ||
    s.includes("bringa")
  ) {
    return "endurance_cycling";
  }
  if (
    s.includes("swim") ||
    s.includes("uszas") ||
    s.includes("aqua")
  ) {
    return "endurance_swimming";
  }
  if (
    s.includes("strength") ||
    s.includes("ero") ||
    s.includes("weight") ||
    s.includes("crossfit") ||
    s.includes("gym")
  ) {
    return "strength";
  }
  return "general";
}

/**
 * Get smart default metrics for a sport, taking into account available session data
 * and user's saved preferences from localStorage.
 */
export function getInitialActiveMetrics(
  overlayData: OverlayData,
  availableMetricKeys: ShareMetricKey[]
): Set<ShareMetricKey> {
  const sportId = overlayData.sportId;

  // 1. Try to load saved preferences for this specific sport
  try {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${sportId}`);
      if (saved) {
        const parsed: ShareMetricKey[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter to only those currently available
          const valid = parsed.filter((k) => availableMetricKeys.includes(k));
          if (valid.length > 0) {
            return new Set(valid);
          }
        }
      }
    }
  } catch {
    // ignore localStorage errors
  }

  // 2. Fall back to smart archetype defaults
  const archetype = getArchetypeForSport(sportId);
  const archetypeDefaults = DEFAULT_METRIC_SETS[archetype] ?? DEFAULT_METRIC_SETS.general;

  const initialSet = new Set<ShareMetricKey>();

  // Always include sport title and date if available
  if (availableMetricKeys.includes("sportTitle")) initialSet.add("sportTitle");
  if (availableMetricKeys.includes("date")) initialSet.add("date");

  for (const k of archetypeDefaults!) {
    if (availableMetricKeys.includes(k)) {
      initialSet.add(k);
    }
  }

  // If confirmed record exists, add record badge by default
  if (overlayData.isRecord && availableMetricKeys.includes("recordBadge")) {
    initialSet.add("recordBadge");
  }

  return initialSet;
}

/**
 * Persist user's chosen metrics for a sport in localStorage
 */
export function saveActiveMetricsForSport(
  sportId: string,
  activeMetrics: Set<ShareMetricKey> | ShareMetricKey[]
): void {
  try {
    if (typeof localStorage === "undefined") return;
    const array = Array.from(activeMetrics);
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${sportId}`, JSON.stringify(array));
  } catch {
    // ignore
  }
}
