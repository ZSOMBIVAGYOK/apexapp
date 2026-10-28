/**
 * Workout File Service
 *
 * Client-side browser parser and prefill pipeline for FIT, GPX, and TCX activity files.
 * Integrates core parsers from @shared/lib/devices, validates constraints (max 25MB, supported formats),
 * applies LTTB peak-preserving downsampling, detects duplicates robustly, cleans sensor series,
 * and uploads files to Cloud Storage.
 */

import { NormalizedActivity } from "@shared/types/devices";
import { CompletedSessionDocument, SessionTimeSeriesPoint, SessionTimeSeriesData } from "@shared/types/dataModel";
import { parseFIT } from "./parsers/fitParser";
import { parseGPX } from "./parsers/gpxParser";
import { parseTCX } from "./parsers/tcxParser";
import { SPORT_CATALOG } from "@shared/lib/sports/catalog";
import { generateSvgRouteOutline, haversineDistance } from "@shared/lib/courses";
import { calculateSessionLoadDetailed } from "@shared/lib/load";
import { mapActivityNameToSport } from "@shared/lib/sports/sportMapping";
import { cleanTimeSeries, SeriesCleaningReport } from "./parsers/seriesCleaner";
import { downsampleSessionTimeSeries } from "@shared/lib/charts/lttb";
import { storage } from "@shared/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_TIMESERIES_POINTS = 500;

export interface ParsedWorkoutFileResult {
  fileName: string;
  fileType: "fit" | "gpx" | "tcx" | "csv";
  fileSizeBytes: number;
  sportId: string;
  isSportKnown: boolean;
  detectedSportNameHu?: string;
  detectedRawSport?: string;
  isSportAmbiguous?: boolean;
  suggestedSportIds?: string[];
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  isoStartTime: string; // ISO 8601
  durationMinutes: number;
  durationSeconds: number;
  distanceKm?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  elevationGainMeters?: number;
  avgPowerWatts?: number;
  avgPace?: string;
  calories?: number;
  computedLoad?: number;
  loadSourceLabelHu?: string;
  channels?: {
    hasHr: boolean;
    hasSpeed: boolean;
    hasPower: boolean;
    hasCadence: boolean;
    hasElevation: boolean;
    hasGps: boolean;
    hasTemperature: boolean;
  };
  warningsHu?: string[];
  cleaningReport?: SeriesCleaningReport;
  title: string;
  timeSeries: SessionTimeSeriesData;
  activity: NormalizedActivity;
}

export interface DuplicateSessionMatch {
  existingSession: CompletedSessionDocument;
  timeDiffMinutes: number;
  durationDiffMinutes: number;
}

/**
 * Downsamples time-series points to maxPoints (default 500) while preserving
 * peaks and start/end points using LTTB.
 */
export function downsampleTimeSeries(
  points: SessionTimeSeriesPoint[],
  maxPoints = MAX_TIMESERIES_POINTS
): SessionTimeSeriesPoint[] {
  if (!points || points.length <= maxPoints) {
    return points || [];
  }
  return downsampleSessionTimeSeries(points, maxPoints);
}

/**
 * Maps a file-extracted sport or title to the shared sport catalog.
 */
export function mapFileSportToCatalog(
  rawSport?: string,
  rawTitle?: string
): {
  sportId: string;
  isKnown: boolean;
  isSportKnown: boolean;
  isAmbiguous: boolean;
  suggestedSportIds: string[];
  sportNameHu: string;
} {
  const sportCandidate = (rawSport || "").toLowerCase().trim();
  const titleCandidate = (rawTitle || "").toLowerCase().trim();

  // 1. Direct ID check in catalog (if not "other")
  if (sportCandidate && sportCandidate !== "other") {
    const catalogMatch = SPORT_CATALOG.find((s) => s.id === sportCandidate);
    if (catalogMatch) {
      return {
        sportId: catalogMatch.id,
        isKnown: true,
        isSportKnown: true,
        isAmbiguous: false,
        suggestedSportIds: [catalogMatch.id],
        sportNameHu: catalogMatch.nameHu
      };
    }
  }

  // 2. Query selection: if rawSport is "other" or empty, try title first
  const query = (sportCandidate === "other" || !sportCandidate) ? (titleCandidate || "other") : sportCandidate;
  const mapped = mapActivityNameToSport(query);

  // If query was empty or mapped to "other", but titleCandidate is present and might match
  if (mapped.sportId === "other" && titleCandidate && query !== titleCandidate) {
    const titleMapped = mapActivityNameToSport(titleCandidate);
    if (titleMapped.sportId !== "other" && !titleMapped.isAmbiguous) {
      return {
        sportId: titleMapped.sportId,
        isKnown: true,
        isSportKnown: true,
        isAmbiguous: false,
        suggestedSportIds: titleMapped.suggestedAlternatives,
        sportNameHu: titleMapped.sportNameHu
      };
    }
  }

  const isKnown = !mapped.isAmbiguous && mapped.sportId !== "other";

  return {
    sportId: mapped.sportId,
    isKnown,
    isSportKnown: isKnown,
    isAmbiguous: mapped.isAmbiguous,
    suggestedSportIds: mapped.suggestedAlternatives,
    sportNameHu: mapped.sportNameHu
  };
}

/**
 * Extracts raw time-series trackpoints from a GPX XML string.
 */
function extractGpxTimeSeries(xmlText: string): SessionTimeSeriesPoint[] {
  const trkptRegex = /<trkpt\s+lat=["']([^"']+)["']\s+lon=["']([^"']+)["']>([\s\S]*?)<\/trkpt>/gi;
  let match: RegExpExecArray | null;
  const points: SessionTimeSeriesPoint[] = [];

  let firstTimeMs: number | null = null;
  let accumulatedDistance = 0;
  let prevLat: number | null = null;
  let prevLon: number | null = null;

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
    const cadMatch = inner.match(/<gpxtpx:cad>(\d+)<\/gpxtpx:cad>/i) || inner.match(/<cad>(\d+)<\/cad>/i);

    let timeOffsetSeconds = points.length;
    if (timeMatch) {
      const ptTime = new Date(timeMatch[1]!.trim()).getTime();
      if (firstTimeMs === null) firstTimeMs = ptTime;
      timeOffsetSeconds = Math.max(0, Math.round((ptTime - firstTimeMs) / 1000));
    }

    if (prevLat !== null && prevLon !== null) {
      accumulatedDistance += haversineDistance(prevLat, prevLon, lat, lon);
    }
    prevLat = lat;
    prevLon = lon;

    points.push({
      timeOffsetSeconds,
      lat,
      lon,
      elevationMeters: eleMatch ? parseFloat(eleMatch[1]!) : undefined,
      heartRate: hrMatch ? parseInt(hrMatch[1]!, 10) : undefined,
      powerWatts: powerMatch ? parseInt(powerMatch[1]!, 10) : undefined,
      cadence: cadMatch ? parseInt(cadMatch[1]!, 10) : undefined,
      distanceMeters: Math.round(accumulatedDistance)
    });
  }

  return points;
}

/**
 * Extracts raw time-series trackpoints from a TCX XML string.
 */
function extractTcxTimeSeries(xmlText: string): SessionTimeSeriesPoint[] {
  const tpRegex = /<Trackpoint>([\s\S]*?)<\/Trackpoint>/gi;
  let match: RegExpExecArray | null;
  const points: SessionTimeSeriesPoint[] = [];

  let firstTimeMs: number | null = null;

  while ((match = tpRegex.exec(xmlText)) !== null) {
    const inner = match[1]!;

    const timeMatch = inner.match(/<Time>(.*?)<\/Time>/i);
    const latMatch = inner.match(/<LatitudeDegrees>([\d.-]+)<\/LatitudeDegrees>/i);
    const lonMatch = inner.match(/<LongitudeDegrees>([\d.-]+)<\/LongitudeDegrees>/i);
    const altMatch = inner.match(/<AltitudeMeters>([\d.-]+)<\/AltitudeMeters>/i);
    const distMatch = inner.match(/<DistanceMeters>([\d.-]+)<\/DistanceMeters>/i);
    const hrMatch = inner.match(/<HeartRateBpm>[\s\S]*?<Value>(\d+)<\/Value>[\s\S]*?<\/HeartRateBpm>/i);
    const wattsMatch = inner.match(/<Watts>(\d+)<\/Watts>/i);
    const cadMatch = inner.match(/<Cadence>(\d+)<\/Cadence>/i);

    let timeOffsetSeconds = points.length;
    if (timeMatch) {
      const ptTime = new Date(timeMatch[1]!.trim()).getTime();
      if (firstTimeMs === null) firstTimeMs = ptTime;
      timeOffsetSeconds = Math.max(0, Math.round((ptTime - firstTimeMs) / 1000));
    }

    points.push({
      timeOffsetSeconds,
      lat: latMatch ? parseFloat(latMatch[1]!) : undefined,
      lon: lonMatch ? parseFloat(lonMatch[1]!) : undefined,
      elevationMeters: altMatch ? parseFloat(altMatch[1]!) : undefined,
      distanceMeters: distMatch ? Math.round(parseFloat(distMatch[1]!)) : undefined,
      heartRate: hrMatch ? parseInt(hrMatch[1]!, 10) : undefined,
      powerWatts: wattsMatch ? parseInt(wattsMatch[1]!, 10) : undefined,
      cadence: cadMatch ? parseInt(cadMatch[1]!, 10) : undefined
    });
  }

  return points;
}

/**
 * Validates, parses, and extracts complete workout data and time-series from a file.
 */
export async function parseWorkoutFile(
  file: File | { name: string; size: number; content: string | ArrayBuffer | Uint8Array }
): Promise<ParsedWorkoutFileResult> {
  const fileName = file.name;
  const fileSizeBytes = file.size;

  // 1. Validate file size
  if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new Error("A fájl mérete meghaladja a 25 MB-os határt.");
  }

  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext !== "fit" && ext !== "gpx" && ext !== "tcx") {
    throw new Error("Nem támogatott fájlformátum. Kérlek FIT, GPX vagy TCX fájlt tölts fel.");
  }

  // 2. Read file content
  let rawContent: string | ArrayBuffer | Uint8Array;
  if ("content" in file && file.content) {
    rawContent = file.content;
  } else if (file instanceof File) {
    if (ext === "fit") {
      rawContent = await file.arrayBuffer();
    } else {
      rawContent = await file.text();
    }
  } else {
    throw new Error("A fájl sérült vagy nem sikerült beolvasni.");
  }

  let activity: NormalizedActivity;
  let rawPoints: SessionTimeSeriesPoint[] = [];

  try {
    if (ext === "gpx") {
      const text = typeof rawContent === "string" ? rawContent : new TextDecoder().decode(rawContent);
      activity = parseGPX(text, fileName);
      rawPoints = extractGpxTimeSeries(text);
    } else if (ext === "tcx") {
      const text = typeof rawContent === "string" ? rawContent : new TextDecoder().decode(rawContent);
      activity = parseTCX(text, fileName);
      rawPoints = extractTcxTimeSeries(text);
    } else {
      let buf: ArrayBuffer;
      if (typeof rawContent === "string") {
        buf = new TextEncoder().encode(rawContent).buffer as ArrayBuffer;
      } else if (rawContent instanceof Uint8Array) {
        buf = rawContent.buffer.slice(
          rawContent.byteOffset,
          rawContent.byteOffset + rawContent.byteLength
        ) as ArrayBuffer;
      } else {
        buf = rawContent;
      }
      activity = parseFIT(buf, fileName);
      rawPoints = activity.timeSeries?.points || [];
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("buffer too short") || msg.includes("signature") || msg.includes("No valid trackpoints")) {
      throw new Error("A fájl nem tartalmaz feldolgozható edzésadatot.");
    }
    throw new Error(`A fájl sérült vagy nem sikerült beolvasni: ${msg}`);
  }

  if (activity.durationSeconds <= 0 && (!activity.distanceMeters || activity.distanceMeters <= 0)) {
    throw new Error("A fájl nem tartalmaz feldolgozható edzésadatot.");
  }

  // 3. Clean and validate time-series points
  const cleaning = cleanTimeSeries(rawPoints);
  const cleanedPoints = cleaning.cleanedPoints;
  const report = cleaning.report;

  // 4. Downsample points to max 500 using LTTB peak-preserving algorithm
  const downsampledPoints = downsampleSessionTimeSeries(
    cleanedPoints.length > 0 ? cleanedPoints : rawPoints,
    MAX_TIMESERIES_POINTS
  );

  // 5. Generate SVG route outline if GPS points exist
  const gpsPoints = downsampledPoints
    .filter((p): p is SessionTimeSeriesPoint & { lat: number; lon: number } => typeof p.lat === "number" && typeof p.lon === "number")
    .map((p) => ({ lat: p.lat, lon: p.lon }));

  const svgRouteOutline = gpsPoints.length >= 2 ? generateSvgRouteOutline(gpsPoints) : undefined;

  // 6. Sport mapping
  const mapped = mapFileSportToCatalog(activity.sport, activity.title);
  const sportId = mapped.sportId;

  // 7. Date and time extraction
  const isoDate = activity.startTime || new Date().toISOString();
  const dateObj = new Date(isoDate);
  const dateStr = !isNaN(dateObj.getTime())
    ? dateObj.toISOString().split("T")[0]!
    : new Date().toISOString().split("T")[0]!;
  const timeStr = !isNaN(dateObj.getTime())
    ? dateObj.toTimeString().substring(0, 5)
    : "09:00";

  const durationMinutes = Math.max(1, Math.round(activity.durationSeconds / 60));
  const distanceKm = activity.distanceMeters ? +(activity.distanceMeters / 1000).toFixed(2) : undefined;

  // 8. Calculate training load (HR > Power > RPE > Estimated, never default to 1)
  let computedLoad: number | undefined = activity.trainingLoad;
  let loadSourceLabelHu: string = activity.loadSourceLabelHu || "becsült";

  if (!computedLoad || computedLoad <= 1) {
    const detailed = calculateSessionLoadDetailed({
      durationMinutes,
      avgHeartRate: activity.avgHeartRate || report.cleanedAvgHr,
      maxHr: activity.maxHeartRate || report.cleanedMaxHr,
      avgPower: activity.avgPowerWatts,
      normalizedPower: activity.normalizedPowerWatts,
      sport: sportId
    });
    computedLoad = detailed.load;
    loadSourceLabelHu = detailed.sourceLabelHu;
  }

  let avgPace: string | undefined = undefined;
  if (activity.avgPaceSecondsPerKm) {
    const mins = Math.floor(activity.avgPaceSecondsPerKm / 60);
    const secs = String(activity.avgPaceSecondsPerKm % 60).padStart(2, "0");
    avgPace = `${mins}:${secs} /km`;
  }

  const channels = {
    hasHr: report.validHrPoints > 0,
    hasSpeed: report.hasSpeed,
    hasPower: report.hasPower,
    hasCadence: report.hasCadence,
    hasElevation: report.hasElevation,
    hasGps: report.hasGps,
    hasTemperature: cleanedPoints.some((p) => typeof p.temperatureCelsius === "number")
  };

  return {
    fileName,
    fileType: ext,
    fileSizeBytes,
    sportId,
    isSportKnown: mapped.isKnown,
    detectedSportNameHu: mapped.sportNameHu,
    detectedRawSport: activity.sportRawName || mapped.sportNameHu,
    isSportAmbiguous: mapped.isAmbiguous,
    suggestedSportIds: mapped.suggestedSportIds,
    date: dateStr,
    startTime: timeStr,
    isoStartTime: isoDate,
    durationMinutes,
    durationSeconds: activity.durationSeconds,
    distanceKm,
    avgHeartRate: activity.avgHeartRate || report.cleanedAvgHr,
    maxHeartRate: activity.maxHeartRate || report.cleanedMaxHr,
    elevationGainMeters: activity.elevationGainMeters,
    avgPowerWatts: activity.avgPowerWatts,
    avgPace,
    calories: activity.calories,
    computedLoad,
    loadSourceLabelHu,
    channels,
    warningsHu: Array.from(new Set([...(activity.warningsHu || []), ...(report.warningsHu || [])])),
    cleaningReport: report,
    title: activity.title,
    timeSeries: {
      points: downsampledPoints,
      svgRouteOutline
    },
    activity
  };
}

function parseTimestampSafe(val?: string, fallbackDate?: string): number | null {
  if (!val) return null;
  if (val.includes("T")) {
    const t = new Date(val).getTime();
    if (!isNaN(t)) return t;
  }
  if (fallbackDate && /^\d{1,2}:\d{2}/.test(val)) {
    const t = new Date(`${fallbackDate}T${val}:00`).getTime();
    if (!isNaN(t)) return t;
  }
  const t = new Date(val).getTime();
  return isNaN(t) ? null : t;
}

/**
 * Checks if a session with similar start time (+-15 minutes), duration, and sport exists.
 */
export function findDuplicateSession(
  candidate: {
    startTimeIso?: string;
    isoStartTime?: string;
    startTime?: string;
    date?: string;
    durationMinutes: number;
    sportId: string;
  },
  existingSessions: CompletedSessionDocument[]
): DuplicateSessionMatch | null {
  const candidateTime = parseTimestampSafe(
    candidate.isoStartTime || candidate.startTimeIso || candidate.startTime,
    candidate.date
  );

  for (const sess of existingSessions) {
    const sessTime = parseTimestampSafe(sess.startTime, sess.date);

    let timeMatches = false;
    let timeDiffMinutes = 0;

    if (candidateTime !== null && sessTime !== null) {
      timeDiffMinutes = Math.abs(candidateTime - sessTime) / (60 * 1000);
      timeMatches = timeDiffMinutes <= 15;
    } else if (candidate.date && sess.date && candidate.date === sess.date) {
      // Date matches, allow match if duration is very close
      timeMatches = true;
      timeDiffMinutes = 0;
    }

    if (timeMatches) {
      const durDiff = Math.abs(candidate.durationMinutes - sess.durationMinutes);
      const maxDur = Math.max(candidate.durationMinutes, sess.durationMinutes);
      const durRatio = maxDur > 0 ? durDiff / maxDur : 0;

      const candidateSport = candidate.sportId.toLowerCase();
      const sessSport = sess.sport.toLowerCase();
      const sportMatch =
        candidateSport === sessSport ||
        candidateSport === "other" ||
        sessSport === "other" ||
        (candidateSport.includes("run") && sessSport.includes("run")) ||
        (candidateSport.includes("cycl") && sessSport.includes("cycl")) ||
        (candidateSport.includes("ski") && sessSport.includes("ski")) ||
        (candidateSport.includes("paddl") && sessSport.includes("paddl"));

      if ((durDiff <= 10 || durRatio <= 0.2) && sportMatch) {
        return {
          existingSession: sess,
          timeDiffMinutes: Math.round(timeDiffMinutes),
          durationDiffMinutes: Math.round(durDiff)
        };
      }
    }
  }

  return null;
}

/**
 * Merges parsed workout file data into an existing session.
 * Preserves user's manual annotations (RPE, notes, equipment, course) while
 * enriching with file metrics and time-series data.
 */
export function mergeFileIntoSession(
  existing: CompletedSessionDocument,
  fileData: ParsedWorkoutFileResult,
  uploadedFileRef?: string
): CompletedSessionDocument {
  const mergedMetrics = {
    ...existing.metrics,
    avgHeartRate: fileData.avgHeartRate ?? existing.metrics?.avgHeartRate,
    maxHeartRate: fileData.maxHeartRate ?? existing.metrics?.maxHeartRate,
    avgPower: fileData.avgPowerWatts ?? existing.metrics?.avgPower,
    avgPowerWatts: fileData.avgPowerWatts ?? existing.metrics?.avgPowerWatts,
    distanceMeters: fileData.distanceKm ? Math.round(fileData.distanceKm * 1000) : existing.metrics?.distanceMeters,
    elevationGainMeters: fileData.elevationGainMeters ?? existing.metrics?.elevationGainMeters,
    avgPace: fileData.avgPace ?? existing.metrics?.avgPace,
    calories: fileData.calories ?? existing.metrics?.calories
  };

  return {
    ...existing,
    source: "file",
    durationSeconds: fileData.durationSeconds || existing.durationSeconds,
    durationMinutes: fileData.durationMinutes || existing.durationMinutes,
    trainingLoad: fileData.computedLoad ?? existing.trainingLoad,
    metrics: mergedMetrics,
    timeSeries: fileData.timeSeries.points.length > 0 ? fileData.timeSeries : existing.timeSeries,
    fileRef: uploadedFileRef || existing.fileRef,
    fileType: fileData.fileType,
    fileName: fileData.fileName,
    fileSizeBytes: fileData.fileSizeBytes,
    importedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Uploads an activity file to Cloud Storage under athletes/{athleteId}/workouts/{sessionId}/
 */
export async function uploadWorkoutFile(
  athleteId: string,
  sessionId: string,
  file: File | Blob,
  fileName: string
): Promise<string> {
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `athletes/${athleteId}/workouts/${sessionId}/${sanitizedName}`;

  try {
    const fileRef = ref(storage, storagePath);
    await uploadBytes(fileRef, file);
    try {
      const downloadUrl = await getDownloadURL(fileRef);
      return downloadUrl;
    } catch {
      return storagePath;
    }
  } catch (err) {
    // If offline or emulator storage is unreachable, fallback to storage path reference
    // eslint-disable-next-line no-console
    console.warn("Storage upload warning (cached locally):", err);
    return storagePath;
  }
}
