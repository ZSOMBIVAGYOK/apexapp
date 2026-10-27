import { CompletedSessionDocument, SessionTimeSeriesPoint } from "@shared/types/dataModel";
import { getSportById, SPORT_CATEGORIES } from "@shared/lib/sports";
import { FormattedMetric, OverlayData, OverlayGpsPoint } from "./types";

export interface FormatterOptions {
  locale?: "hu" | "en";
  units?: "metric" | "imperial";
  gearName?: string;
  isRecord?: boolean;
  recordTitle?: string;
}

/**
 * Format duration in seconds to mm:ss or h:mm:ss
 */
export function formatDurationSeconds(totalSeconds: number): string {
  const rounded = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(rounded / 3600);
  const m = Math.floor((rounded % 3600) / 60);
  const s = rounded % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Format distance according to metric or imperial units
 */
export function formatDistance(meters: number, units: "metric" | "imperial" = "metric", locale = "hu"): { value: string; unit: string } {
  const isImperial = units === "imperial";
  const num = isImperial ? meters / 1609.344 : meters / 1000;
  const unit = isImperial ? "mi" : "km";

  // If >= 100 km, 1 decimal, otherwise 2 decimals
  const decimals = num >= 100 ? 1 : 2;
  const formatted = num.toFixed(decimals);
  const localized = locale === "hu" ? formatted.replace(".", ",") : formatted;

  return { value: localized, unit };
}

/**
 * Format pace or speed depending on sport type
 */
export function formatPaceOrSpeed(
  meters: number,
  seconds: number,
  sportId: string,
  units: "metric" | "imperial" = "metric",
  locale = "hu"
): { value: string; unit: string } {
  if (meters <= 0 || seconds <= 0) {
    return { value: "--", unit: "" };
  }

  const sportLower = sportId.toLowerCase();
  const isCycling =
    sportLower.includes("cycling") ||
    sportLower.includes("kerekpar") ||
    sportLower.includes("bringa") ||
    sportLower.includes("bike") ||
    sportLower.includes("skating") ||
    sportLower.includes("korcsolya");

  const isSwimming =
    sportLower.includes("swimming") ||
    sportLower.includes("uszas") ||
    sportLower.includes("swim");

  const isImperial = units === "imperial";

  if (isCycling) {
    // Speed in km/h or mph
    const km = meters / 1000;
    const hours = seconds / 3600;
    const speed = isImperial ? (km / 1.609344) / hours : km / hours;
    const unit = isImperial ? "mph" : "km/h";
    const formatted = speed.toFixed(1);
    return {
      value: locale === "hu" ? formatted.replace(".", ",") : formatted,
      unit
    };
  }

  if (isSwimming) {
    // Pace per 100m or 100yd
    const distance100 = isImperial ? (meters * 1.09361) / 100 : meters / 100;
    const paceSeconds = seconds / distance100;
    const m = Math.floor(paceSeconds / 60);
    const s = Math.round(paceSeconds % 60);
    const unit = isImperial ? "/100yd" : "/100m";
    return {
      value: `${m}:${s.toString().padStart(2, "0")}`,
      unit
    };
  }

  // Default: Running / walking pace per km or mi
  const dist = isImperial ? meters / 1609.344 : meters / 1000;
  const paceSecondsPerDist = seconds / dist;
  const mins = Math.floor(paceSecondsPerDist / 60);
  const secs = Math.round(paceSecondsPerDist % 60);
  const unit = isImperial ? "/mi" : "/km";

  // Guard against unrealistic paces (> 30 min/km or < 1 min/km)
  if (mins < 1 || mins > 35) {
    return { value: "--", unit };
  }

  return {
    value: `${mins}:${secs.toString().padStart(2, "0")}`,
    unit
  };
}

/**
 * Format date string into localized display date
 */
export function formatSessionDate(dateStr: string, locale = "hu"): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    if (locale === "hu") {
      const year = d.getFullYear();
      const monthNames = [
        "január",
        "február",
        "március",
        "április",
        "május",
        "június",
        "július",
        "augusztus",
        "szeptember",
        "október",
        "november",
        "december"
      ];
      return `${year}. ${monthNames[d.getMonth()] ?? ""} ${d.getDate()}.`;
    }

    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return dateStr;
  }
}

/**
 * Extract GPS trackpoints from session timeSeries data
 */
export function extractGpsPoints(timeSeries?: { points: SessionTimeSeriesPoint[] }): OverlayGpsPoint[] {
  if (!timeSeries || !Array.isArray(timeSeries.points)) return [];

  const validPoints: OverlayGpsPoint[] = [];
  for (const pt of timeSeries.points) {
    if (
      typeof pt.lat === "number" &&
      typeof pt.lon === "number" &&
      !isNaN(pt.lat) &&
      !isNaN(pt.lon) &&
      !(pt.lat === 0 && pt.lon === 0)
    ) {
      validPoints.push({
        lat: pt.lat,
        lon: pt.lon,
        elevation: pt.elevationMeters
      });
    }
  }
  return validPoints;
}

/**
 * Build complete OverlayData from a CompletedSessionDocument
 */
export function buildOverlayData(
  session: CompletedSessionDocument,
  options: FormatterOptions = {}
): OverlayData {
  const locale = options.locale || "hu";
  const units = options.units || "metric";

  const sportDef = getSportById(session.sport);
  const sportName = sportDef ? (locale === "hu" ? sportDef.nameHu : sportDef.nameEn) : session.sport;
  const catMeta = sportDef ? SPORT_CATEGORIES[sportDef.category] : undefined;
  const sportCategory = catMeta ? (locale === "hu" ? catMeta.nameHu : catMeta.nameEn) : undefined;

  const durationSecs = session.durationSeconds || session.durationMinutes * 60;
  const distanceMeters = session.metrics?.distanceMeters || 0;

  const metrics: FormattedMetric[] = [];

  // Duration
  if (durationSecs > 0) {
    metrics.push({
      key: "duration",
      label: locale === "hu" ? "Időtartam" : "Duration",
      value: formatDurationSeconds(durationSecs)
    });
  }

  // Distance
  if (distanceMeters > 0) {
    const d = formatDistance(distanceMeters, units, locale);
    metrics.push({
      key: "distance",
      label: locale === "hu" ? "Távolság" : "Distance",
      value: d.value,
      unit: d.unit
    });
  }

  // Pace / Speed
  if (distanceMeters > 0 && durationSecs > 0) {
    const ps = formatPaceOrSpeed(distanceMeters, durationSecs, session.sport, units, locale);
    if (ps.value !== "--") {
      metrics.push({
        key: "paceSpeed",
        label: ps.unit.includes("/") && !ps.unit.includes("km/h") && !ps.unit.includes("mph")
          ? (locale === "hu" ? "Átlagtempó" : "Avg Pace")
          : (locale === "hu" ? "Átlagsebesség" : "Avg Speed"),
        value: ps.value,
        unit: ps.unit
      });
    }
  }

  // Average Heart Rate
  if (session.metrics?.avgHeartRate && session.metrics.avgHeartRate > 0) {
    metrics.push({
      key: "avgHr",
      label: locale === "hu" ? "Átlagpulzus" : "Avg HR",
      value: Math.round(session.metrics.avgHeartRate).toString(),
      unit: "bpm"
    });
  }

  // Max Heart Rate
  if (session.metrics?.maxHeartRate && session.metrics.maxHeartRate > 0) {
    metrics.push({
      key: "maxHr",
      label: locale === "hu" ? "Max pulzus" : "Max HR",
      value: Math.round(session.metrics.maxHeartRate).toString(),
      unit: "bpm"
    });
  }

  // Elevation Gain
  if (session.metrics?.elevationGainMeters && session.metrics.elevationGainMeters > 0) {
    const isImperial = units === "imperial";
    const eleVal = isImperial
      ? Math.round(session.metrics.elevationGainMeters * 3.28084)
      : Math.round(session.metrics.elevationGainMeters);
    metrics.push({
      key: "elevation",
      label: locale === "hu" ? "Szintemelkedés" : "Elevation",
      value: eleVal.toString(),
      unit: isImperial ? "ft" : "m"
    });
  }

  // Average Power
  const pwr = session.metrics?.avgPowerWatts || session.metrics?.avgPower;
  if (pwr && pwr > 0) {
    metrics.push({
      key: "power",
      label: locale === "hu" ? "Teljesítmény" : "Power",
      value: Math.round(pwr).toString(),
      unit: "W"
    });
  }

  // Training Load
  if (typeof session.trainingLoad === "number" && session.trainingLoad > 0) {
    metrics.push({
      key: "load",
      label: locale === "hu" ? "Terhelés" : "Load",
      value: Math.round(session.trainingLoad).toString(),
      unit: "TSS"
    });
  }

  // RPE
  if (typeof session.rpe === "number" && session.rpe > 0) {
    metrics.push({
      key: "rpe",
      label: "RPE",
      value: session.rpe.toString(),
      unit: "/ 10"
    });
  }

  // Gear
  if (options.gearName) {
    metrics.push({
      key: "gear",
      label: locale === "hu" ? "Eszköz" : "Gear",
      value: options.gearName
    });
  }

  const gpsPoints = extractGpsPoints(session.timeSeries);

  return {
    sportId: session.sport,
    sportName,
    sportCategory,
    title: session.title || sportName,
    dateFormatted: formatSessionDate(session.date, locale),
    metrics,
    isRecord: options.isRecord,
    recordTitle: options.recordTitle,
    gearName: options.gearName,
    hasGps: gpsPoints.length >= 2,
    routePoints: gpsPoints,
    rawPoints: session.timeSeries?.points
  };
}

/**
 * Determine average luminance from an image area to auto-select light or dark text.
 * Samples a grid of up to 400 points across the bounding box.
 */
export function calculateAreaLuminance(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
): number {
  try {
    const clampedX = Math.max(0, Math.floor(x));
    const clampedY = Math.max(0, Math.floor(y));
    const clampedW = Math.min(ctx.canvas.width - clampedX, Math.floor(width));
    const clampedH = Math.min(ctx.canvas.height - clampedY, Math.floor(height));

    if (clampedW <= 0 || clampedH <= 0) return 0;

    const imgData = ctx.getImageData(clampedX, clampedY, clampedW, clampedH);
    const data = imgData.data;

    let totalLuminance = 0;
    let sampleCount = 0;
    const step = Math.max(1, Math.floor(data.length / (4 * 400))); // Sample up to 400 pixels

    for (let i = 0; i < data.length; i += step * 4) {
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      // Rec. 709 relative luminance
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      totalLuminance += lum;
      sampleCount++;
    }

    return sampleCount > 0 ? totalLuminance / sampleCount : 0;
  } catch {
    // If canvas is tainted or error occurs, default to dark background (return low luminance)
    return 0;
  }
}
