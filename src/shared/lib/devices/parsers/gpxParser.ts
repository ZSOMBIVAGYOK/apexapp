/**
 * GPX (GPS Exchange Format) File Parser
 * Pure TypeScript parser for GPX 1.0 and 1.1 files with heart rate & power extensions.
 */

import { NormalizedActivity, StandardSport } from "@shared/types/devices";
import { mapActivityNameToSport } from "@shared/lib/sports/sportMapping";

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function parseGPX(xmlText: string, fileName = "workout.gpx"): NormalizedActivity {
  // Extract track name and type
  const nameMatch = xmlText.match(/<name>(.*?)<\/name>/i);
  const typeMatch = xmlText.match(/<type>(.*?)<\/type>/i);
  const title = nameMatch ? nameMatch[1]!.trim() : fileName.replace(/\.gpx$/i, "");
  const rawType = typeMatch ? typeMatch[1]!.trim() : undefined;

  // Extract trackpoints
  const trkptRegex = /<trkpt\s+lat=["']([^"']+)["']\s+lon=["']([^"']+)["']>([\s\S]*?)<\/trkpt>/gi;
  let match: RegExpExecArray | null;

  interface Point {
    lat: number;
    lon: number;
    ele?: number;
    time?: Date;
    hr?: number;
    power?: number;
  }

  const points: Point[] = [];

  while ((match = trkptRegex.exec(xmlText)) !== null) {
    const lat = parseFloat(match[1]!);
    const lon = parseFloat(match[2]!);
    const inner = match[3]!;

    const eleMatch = inner.match(/<ele>([\d.-]+)<\/ele>/i);
    const timeMatch = inner.match(/<time>(.*?)<\/time>/i);
    const hrMatch =
      inner.match(/<gpxtpx:hr>(\d+)<\/gpxtpx:hr>/i) ||
      inner.match(/<hr>(\d+)<\/hr>/i) ||
      inner.match(/<ns3:hr>(\d+)<\/ns3:hr>/i);
    const powerMatch = inner.match(/<power>(\d+)<\/power>/i);

    points.push({
      lat,
      lon,
      ele: eleMatch ? parseFloat(eleMatch[1]!) : undefined,
      time: timeMatch ? new Date(timeMatch[1]!.trim()) : undefined,
      hr: hrMatch ? parseInt(hrMatch[1]!, 10) : undefined,
      power: powerMatch ? parseInt(powerMatch[1]!, 10) : undefined
    });
  }

  if (points.length === 0) {
    throw new Error("No valid trackpoints found in GPX file.");
  }

  const firstPoint = points[0]!;
  const lastPoint = points[points.length - 1]!;
  const startTime = firstPoint.time ? firstPoint.time.toISOString() : new Date().toISOString();

  let totalDurationSeconds = 0;
  if (firstPoint.time && lastPoint.time) {
    totalDurationSeconds = Math.max(
      1,
      Math.round((lastPoint.time.getTime() - firstPoint.time.getTime()) / 1000)
    );
  } else {
    totalDurationSeconds = Math.max(60, points.length * 2);
  }

  let totalDistanceMeters = 0;
  let elevationGainMeters = 0;
  let elevationLossMeters = 0;
  let hrSum = 0;
  let hrCount = 0;
  let maxHr = 0;
  let powerSum = 0;
  let powerCount = 0;
  let maxPower = 0;

  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;

    if (i > 0) {
      const prev = points[i - 1]!;
      totalDistanceMeters += haversineDistance(prev.lat, prev.lon, p.lat, p.lon);

      if (typeof p.ele === "number" && typeof prev.ele === "number") {
        const diff = p.ele - prev.ele;
        if (diff > 0) elevationGainMeters += diff;
        else elevationLossMeters += Math.abs(diff);
      }
    }

    if (typeof p.hr === "number" && p.hr > 0) {
      hrSum += p.hr;
      hrCount++;
      if (p.hr > maxHr) maxHr = p.hr;
    }

    if (typeof p.power === "number" && p.power > 0) {
      powerSum += p.power;
      powerCount++;
      if (p.power > maxPower) maxPower = p.power;
    }
  }

  const avgHeartRate = hrCount > 0 ? Math.round(hrSum / hrCount) : undefined;
  const avgPowerWatts = powerCount > 0 ? Math.round(powerSum / powerCount) : undefined;

  let avgPaceSecondsPerKm: number | undefined = undefined;
  if (totalDistanceMeters > 100 && totalDurationSeconds > 0) {
    avgPaceSecondsPerKm = Math.round(totalDurationSeconds / (totalDistanceMeters / 1000));
  }

  // Detect sport by explicit type tag, or speed/power/title
  let sport: StandardSport = "running";
  if (rawType) {
    sport = mapActivityNameToSport(rawType).sportId as StandardSport;
  } else {
    const titleLower = title.toLowerCase();
    const speedMps = totalDurationSeconds > 0 ? totalDistanceMeters / totalDurationSeconds : 0;

    if (titleLower.includes("bike") || titleLower.includes("cycle") || titleLower.includes("ride") || speedMps > 6.5) {
      sport = "cycling";
    } else if (titleLower.includes("swim") || speedMps < 1.0) {
      sport = titleLower.includes("swim") ? "swimming" : "running";
    } else {
      sport = mapActivityNameToSport(title).sportId as StandardSport;
    }
  }

  return {
    id: `gpx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId: "athlete-self",
    provider: "file",
    providerRecordId: `file_${fileName}_${startTime}`,
    sport,
    title,
    startTime,
    durationSeconds: totalDurationSeconds,
    distanceMeters: Math.round(totalDistanceMeters),
    avgHeartRate,
    maxHeartRate: maxHr > 0 ? maxHr : undefined,
    avgPowerWatts,
    maxPowerWatts: maxPower > 0 ? maxPower : undefined,
    avgPaceSecondsPerKm,
    elevationGainMeters: Math.round(elevationGainMeters),
    elevationLossMeters: Math.round(elevationLossMeters),
    sourceConfidence: 0.95,
    createdAt: new Date().toISOString()
  };
}
