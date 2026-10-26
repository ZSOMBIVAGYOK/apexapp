/**
 * CSV Workout File Parser
 * Pure TypeScript parser for tabular workout exports from training platforms and apps.
 */

import { NormalizedActivity, StandardSport } from "@shared/types/devices";

function mapCsvSport(raw?: string): StandardSport {
  if (!raw) return "running";
  const s = raw.toLowerCase().trim();
  if (s.includes("run") || s.includes("futás")) return "running";
  if (s.includes("bike") || s.includes("cycl") || s.includes("kerékpár") || s.includes("ride"))
    return "cycling";
  if (s.includes("swim") || s.includes("úszás")) return "swimming";
  if (s.includes("strength") || s.includes("erő") || s.includes("weight") || s.includes("gym"))
    return "strength";
  if (s.includes("row") || s.includes("evezés")) return "rowing";
  if (s.includes("walk") || s.includes("séta") || s.includes("hike")) return "walking";
  if (s.includes("triathlon")) return "triathlon";
  return "other";
}

export function parseCSV(csvText: string, fileName = "workout.csv"): NormalizedActivity[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  if (lines.length < 2) {
    throw new Error("CSV file does not contain header and data rows.");
  }

  // Parse header
  const headerLine = lines[0]!;
  // Auto-detect delimiter (comma, semicolon, tab)
  const delimiter = headerLine.includes(";") ? ";" : headerLine.includes("\t") ? "\t" : ",";
  const headers = headerLine.split(delimiter).map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));

  const getColIndex = (aliases: string[]): number => {
    return headers.findIndex((h) => aliases.some((a) => h.includes(a)));
  };

  const dateIdx = getColIndex(["date", "dátum", "timestamp", "start_time", "start time"]);
  const sportIdx = getColIndex(["sport", "activity", "type", "edzéstípus"]);
  const durationIdx = getColIndex(["duration", "time", "időtartam", "elapsed"]);
  const distIdx = getColIndex(["distance", "távolság", "km", "meters"]);
  const avgHrIdx = getColIndex(["avg hr", "avg_hr", "heart rate", "pulzus", "bpm"]);
  const maxHrIdx = getColIndex(["max hr", "max_hr", "max pulzus"]);
  const powerIdx = getColIndex(["power", "avg power", "watts", "teljesítmény"]);
  const calIdx = getColIndex(["calories", "kcal", "kalória"]);
  const elevIdx = getColIndex(["elevation", "ascent", "szintemelkedés", "elev gain"]);
  const titleIdx = getColIndex(["title", "name", "megnevezés", "workout"]);

  const activities: NormalizedActivity[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]!.split(delimiter).map((c) => c.trim().replace(/['"]/g, ""));
    if (cols.length < 2) continue;

    // Parse start time
    const rawDate = dateIdx >= 0 && cols[dateIdx] ? cols[dateIdx]! : new Date().toISOString();
    let startTime = new Date().toISOString();
    try {
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) startTime = parsed.toISOString();
    } catch {
      // fallback
    }

    // Parse duration
    let durationSeconds = 3600; // default 60m
    if (durationIdx >= 0 && cols[durationIdx]) {
      const rawDur = cols[durationIdx]!;
      if (rawDur.includes(":")) {
        const parts = rawDur.split(":").map((p) => parseFloat(p) || 0);
        if (parts.length === 3) {
          durationSeconds = (parts[0]! * 3600) + (parts[1]! * 60) + parts[2]!;
        } else if (parts.length === 2) {
          durationSeconds = (parts[0]! * 60) + parts[1]!;
        }
      } else {
        const val = parseFloat(rawDur);
        if (!isNaN(val)) {
          // If > 300, likely seconds, else minutes
          durationSeconds = val > 300 ? Math.round(val) : Math.round(val * 60);
        }
      }
    }

    // Parse distance
    let distanceMeters: number | undefined = undefined;
    if (distIdx >= 0 && cols[distIdx]) {
      const rawDist = parseFloat(cols[distIdx]!.replace(/,/g, "."));
      if (!isNaN(rawDist)) {
        distanceMeters = rawDist < 200 ? Math.round(rawDist * 1000) : Math.round(rawDist);
      }
    }

    const sport = mapCsvSport(sportIdx >= 0 ? cols[sportIdx] : undefined);
    const avgHeartRate = avgHrIdx >= 0 && cols[avgHrIdx] ? parseInt(cols[avgHrIdx]!, 10) : undefined;
    const maxHeartRate = maxHrIdx >= 0 && cols[maxHrIdx] ? parseInt(cols[maxHrIdx]!, 10) : undefined;
    const avgPowerWatts = powerIdx >= 0 && cols[powerIdx] ? parseInt(cols[powerIdx]!, 10) : undefined;
    const calories = calIdx >= 0 && cols[calIdx] ? parseInt(cols[calIdx]!, 10) : undefined;
    const elevationGainMeters = elevIdx >= 0 && cols[elevIdx] ? Math.round(parseFloat(cols[elevIdx]!)) : undefined;

    const title =
      titleIdx >= 0 && cols[titleIdx]
        ? cols[titleIdx]!
        : `${sport.charAt(0).toUpperCase() + sport.slice(1)} edzés (${Math.round(durationSeconds / 60)}p)`;

    let avgPaceSecondsPerKm: number | undefined = undefined;
    if (distanceMeters && distanceMeters > 100 && durationSeconds > 0) {
      avgPaceSecondsPerKm = Math.round(durationSeconds / (distanceMeters / 1000));
    }

    activities.push({
      id: `csv_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
      userId: "athlete-self",
      provider: "file",
      providerRecordId: `file_${fileName}_${i}_${startTime}`,
      sport,
      title,
      startTime,
      durationSeconds,
      distanceMeters,
      avgHeartRate: avgHeartRate && avgHeartRate > 30 && avgHeartRate < 240 ? avgHeartRate : undefined,
      maxHeartRate: maxHeartRate && maxHeartRate > 30 && maxHeartRate < 240 ? maxHeartRate : undefined,
      avgPowerWatts: avgPowerWatts && avgPowerWatts > 0 ? avgPowerWatts : undefined,
      avgPaceSecondsPerKm,
      elevationGainMeters,
      calories,
      sourceConfidence: 0.90,
      createdAt: new Date().toISOString()
    });
  }

  if (activities.length === 0) {
    throw new Error("No valid workout rows parsed from CSV.");
  }

  return activities;
}
