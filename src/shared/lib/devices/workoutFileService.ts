/**
 * Workout File Service
 *
 * Client-side browser parser and prefill pipeline for FIT, GPX, and TCX activity files.
 * Reuses core parsers from @shared/lib/devices, validates constraints (max 25MB, supported formats),
 * downsamples time series to <= 500 points, performs duplicate detection, and uploads files to Cloud Storage.
 */

import { NormalizedActivity } from "@shared/types/devices";
import { CompletedSessionDocument, SessionTimeSeriesPoint, SessionTimeSeriesData } from "@shared/types/dataModel";
import { parseFIT } from "./parsers/fitParser";
import { parseGPX } from "./parsers/gpxParser";
import { parseTCX } from "./parsers/tcxParser";
import { SPORT_CATALOG } from "@shared/lib/sports/catalog";
import { generateSvgRouteOutline, haversineDistance } from "@shared/lib/courses";
import { calculateSessionLoad } from "@shared/lib/load";
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
 * start point, end point, and intermediate distribution.
 */
export function downsampleTimeSeries(
  points: SessionTimeSeriesPoint[],
  maxPoints = MAX_TIMESERIES_POINTS
): SessionTimeSeriesPoint[] {
  if (!points || points.length <= maxPoints) {
    return points || [];
  }

  const result: SessionTimeSeriesPoint[] = [];
  const total = points.length;
  const step = (total - 1) / (maxPoints - 1);

  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.min(total - 1, Math.round(i * step));
    const pt = points[idx];
    if (pt) {
      result.push(pt);
    }
  }

  return result;
}

/**
 * Maps a file-extracted sport or title to the shared sport catalog.
 */
export function mapFileSportToCatalog(
  rawSport?: string,
  rawTitle?: string
): { sportId: string; isKnown: boolean; isSportKnown: boolean } {
  const sportCandidate = (rawSport || "").toLowerCase().trim();
  const titleCandidate = (rawTitle || "").toLowerCase().trim();
  const normTitle = titleCandidate.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Direct ID check in catalog
  const catalogMatch = SPORT_CATALOG.find((s) => s.id === sportCandidate);
  if (catalogMatch) {
    return { sportId: catalogMatch.id, isKnown: true, isSportKnown: true };
  }

  // Common sport mapping dictionary
  const mappings: Record<string, string> = {
    running: "running",
    run: "running",
    futas: "running",
    futás: "running",
    cycling: "cycling",
    biking: "cycling",
    bike: "cycling",
    ride: "cycling",
    kerekpar: "cycling",
    kerékpár: "cycling",
    swimming: "swimming",
    swim: "swimming",
    uszas: "swimming",
    úszás: "swimming",
    strength: "strength",
    training: "strength",
    kondi: "strength",
    kondizás: "strength",
    kondizas: "strength",
    sulyemeles: "strength",
    súlyemelés: "strength",
    weightlifting: "strength",
    rowing: "rowing",
    row: "rowing",
    evezer: "rowing",
    evezes: "rowing",
    evezés: "rowing",
    walking: "walking",
    walk: "walking",
    gyaloglas: "walking",
    gyaloglás: "walking",
    hike: "walking",
    hiking: "walking",
    turazas: "walking",
    túrázás: "walking",
    triathlon: "triathlon",
    crossfit: "crossfit",
    yoga: "yoga",
    joga: "yoga",
    jóga: "yoga"
  };

  if (mappings[sportCandidate]) {
    return { sportId: mappings[sportCandidate]!, isKnown: true, isSportKnown: true };
  }

  // Keyword check in title
  if (normTitle.includes("futas") || titleCandidate.includes("futás") || normTitle.includes("jogging")) {
    return { sportId: "running", isKnown: true, isSportKnown: true };
  }
  if (normTitle.includes("bringa") || normTitle.includes("kerekpar") || titleCandidate.includes("kerékpár") || normTitle.includes("cycling")) {
    return { sportId: "cycling", isKnown: true, isSportKnown: true };
  }
  if (normTitle.includes("uszas") || titleCandidate.includes("úszás") || normTitle.includes("swimming")) {
    return { sportId: "swimming", isKnown: true, isSportKnown: true };
  }
  if (normTitle.includes("kondi") || normTitle.includes("sulyemeles") || normTitle.includes("strength")) {
    return { sportId: "strength", isKnown: true, isSportKnown: true };
  }

  // Search by title keywords in Hungarian and English across catalog
  for (const s of SPORT_CATALOG) {
    if (
      titleCandidate.includes(s.nameHu.toLowerCase()) ||
      titleCandidate.includes(s.nameEn.toLowerCase())
    ) {
      return { sportId: s.id, isKnown: true, isSportKnown: true };
    }
  }

  // Fallback if unknown
  return { sportId: "other", isKnown: false, isSportKnown: false };
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
      powerWatts: wattsMatch ? parseInt(wattsMatch[1]!, 10) : undefined
    });
  }

  return points;
}

/**
 * Extracts raw time-series points from a binary FIT file (Global Message 20).
 */
function extractFitTimeSeries(
  buffer: ArrayBuffer | Uint8Array,
  startEpochSeconds?: number
): SessionTimeSeriesPoint[] {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.length < 14) return [];

  const headerSize = bytes[0]!;
  if (headerSize < 12) return [];

  const dataSize =
    bytes[4]! | (bytes[5]! << 8) | (bytes[6]! << 16) | (bytes[7]! << 24);
  const endOffset = Math.min(bytes.length, headerSize + dataSize);

  interface FieldDef {
    fieldNum: number;
    size: number;
    baseType: number;
  }

  interface DefMsg {
    globalMsgNum: number;
    endianness: "little" | "big";
    fields: FieldDef[];
  }

  const localDefs = new Map<number, DefMsg>();
  const points: SessionTimeSeriesPoint[] = [];

  let offset = headerSize;
  let firstTimestamp: number | null = startEpochSeconds || null;

  while (offset < endOffset) {
    const recordHeader = bytes[offset]!;
    offset++;

    // Normal header
    if ((recordHeader & 0x80) === 0) {
      const isDefinition = (recordHeader & 0x40) !== 0;
      const localMsgType = recordHeader & 0x0f;

      if (isDefinition) {
        offset++; // reserved
        const arch = bytes[offset]!;
        const isLE = arch === 0;
        offset++;

        const globalMsgNum = isLE
          ? bytes[offset]! | (bytes[offset + 1]! << 8)
          : (bytes[offset]! << 8) | bytes[offset + 1]!;
        offset += 2;

        const numFields = bytes[offset]!;
        offset++;

        const fields: FieldDef[] = [];
        for (let i = 0; i < numFields; i++) {
          const fieldNum = bytes[offset]!;
          const size = bytes[offset + 1]!;
          const baseType = bytes[offset + 2]!;
          fields.push({ fieldNum, size, baseType });
          offset += 3;
        }

        localDefs.set(localMsgType, {
          globalMsgNum,
          endianness: isLE ? "little" : "big",
          fields
        });
        continue;
      }

      const def = localDefs.get(localMsgType);
      if (!def) break;

      const isLE = def.endianness === "little";
      const readUint16 = (pos: number) =>
        isLE ? bytes[pos]! | (bytes[pos + 1]! << 8) : (bytes[pos]! << 8) | bytes[pos + 1]!;
      const readUint32 = (pos: number) =>
        isLE
          ? (bytes[pos]! | (bytes[pos + 1]! << 8) | (bytes[pos + 2]! << 16) | (bytes[pos + 3]! << 24)) >>> 0
          : ((bytes[pos]! << 24) | (bytes[pos + 1]! << 16) | (bytes[pos + 2]! << 8) | bytes[pos + 3]!) >>> 0;
      const readInt32 = (pos: number) => {
        const u = readUint32(pos);
        return u > 0x7fffffff ? u - 0x100000000 : u;
      };

      // Record message (Global Msg Num 20)
      if (def.globalMsgNum === 20) {
        let fieldOffset = offset;
        let ts: number | undefined;
        let lat: number | undefined;
        let lon: number | undefined;
        let alt: number | undefined;
        let hr: number | undefined;
        let pwr: number | undefined;
        let speed: number | undefined;
        let dist: number | undefined;

        for (const f of def.fields) {
          if (f.fieldNum === 253 && f.size === 4) {
            // Timestamp (seconds since FIT epoch)
            ts = readUint32(fieldOffset);
          } else if (f.fieldNum === 0 && f.size === 4) {
            // lat (semicircles -> degrees)
            const raw = readInt32(fieldOffset);
            if (raw !== 0x7fffffff) lat = raw * (180 / 2147483648);
          } else if (f.fieldNum === 1 && f.size === 4) {
            // lon (semicircles -> degrees)
            const raw = readInt32(fieldOffset);
            if (raw !== 0x7fffffff) lon = raw * (180 / 2147483648);
          } else if (f.fieldNum === 2 && f.size === 2) {
            // altitude (scale 5, offset 500)
            const raw = readUint16(fieldOffset);
            if (raw !== 0xffff) alt = raw / 5 - 500;
          } else if (f.fieldNum === 3 && f.size === 1) {
            // heart rate (bpm)
            const raw = bytes[fieldOffset]!;
            if (raw > 30 && raw < 250) hr = raw;
          } else if (f.fieldNum === 5 && f.size === 4) {
            // distance (scale 100)
            const raw = readUint32(fieldOffset);
            if (raw !== 0xffffffff) dist = Math.round(raw / 100);
          } else if (f.fieldNum === 6 && f.size === 2) {
            // speed (scale 1000 = m/s)
            const raw = readUint16(fieldOffset);
            if (raw !== 0xffff) speed = +(raw / 1000).toFixed(2);
          } else if (f.fieldNum === 7 && f.size === 2) {
            // power (watts)
            const raw = readUint16(fieldOffset);
            if (raw !== 0xffff) pwr = raw;
          }
          fieldOffset += f.size;
        }

        if (ts !== undefined && firstTimestamp === null) {
          firstTimestamp = ts;
        }

        const timeOffsetSeconds = ts && firstTimestamp ? Math.max(0, ts - firstTimestamp) : points.length;

        points.push({
          timeOffsetSeconds,
          lat,
          lon,
          elevationMeters: alt ? Math.round(alt) : undefined,
          heartRate: hr,
          powerWatts: pwr,
          speedMps: speed,
          distanceMeters: dist
        });
      }

      // Advance
      for (const f of def.fields) offset += f.size;
    } else {
      // Compressed header: advance by 1
      offset++;
    }
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
      rawPoints = extractFitTimeSeries(buf);
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

  // 3. Downsample points to max 500
  const downsampledPoints = downsampleTimeSeries(rawPoints, MAX_TIMESERIES_POINTS);

  // 4. Generate SVG route outline if GPS points exist
  const gpsPoints = downsampledPoints
    .filter((p): p is SessionTimeSeriesPoint & { lat: number; lon: number } => typeof p.lat === "number" && typeof p.lon === "number")
    .map((p) => ({ lat: p.lat, lon: p.lon }));

  const svgRouteOutline = gpsPoints.length >= 2 ? generateSvgRouteOutline(gpsPoints) : undefined;

  // 5. Sport mapping
  const { sportId, isKnown } = mapFileSportToCatalog(activity.sport, activity.title);

  // 6. Date and time extraction
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

  // 7. Calculate training load (HR/power based if available)
  let computedLoad: number | undefined = activity.trainingLoad;
  if (!computedLoad && (activity.avgPowerWatts || activity.avgHeartRate)) {
    computedLoad = calculateSessionLoad({
      durationMinutes,
      avgPower: activity.avgPowerWatts,
      normalizedPower: activity.normalizedPowerWatts,
      avgHeartRate: activity.avgHeartRate,
      ftp: 260,
      lthr: 168
    });
  }

  let avgPace: string | undefined = undefined;
  if (activity.avgPaceSecondsPerKm) {
    const mins = Math.floor(activity.avgPaceSecondsPerKm / 60);
    const secs = String(activity.avgPaceSecondsPerKm % 60).padStart(2, "0");
    avgPace = `${mins}:${secs} /km`;
  }

  return {
    fileName,
    fileType: ext,
    fileSizeBytes,
    sportId,
    isSportKnown: isKnown,
    date: dateStr,
    startTime: timeStr,
    isoStartTime: isoDate,
    durationMinutes,
    durationSeconds: activity.durationSeconds,
    distanceKm,
    avgHeartRate: activity.avgHeartRate,
    maxHeartRate: activity.maxHeartRate,
    elevationGainMeters: activity.elevationGainMeters,
    avgPowerWatts: activity.avgPowerWatts,
    avgPace,
    calories: activity.calories,
    computedLoad,
    title: activity.title,
    timeSeries: {
      points: downsampledPoints,
      svgRouteOutline
    },
    activity
  };
}

/**
 * Checks if a session with similar start time (+-10 minutes), duration, and sport exists.
 */
export function findDuplicateSession(
  candidate: { startTimeIso?: string; isoStartTime?: string; durationMinutes: number; sportId: string },
  existingSessions: CompletedSessionDocument[]
): DuplicateSessionMatch | null {
  const startTime = candidate.isoStartTime || candidate.startTimeIso || "";
  const candidateTime = new Date(startTime).getTime();
  if (isNaN(candidateTime)) return null;

  for (const sess of existingSessions) {
    const sessTime = new Date(sess.startTime).getTime();
    if (isNaN(sessTime)) continue;

    const timeDiffMinutes = Math.abs(candidateTime - sessTime) / (60 * 1000);

    if (timeDiffMinutes <= 10) {
      const durDiff = Math.abs(candidate.durationMinutes - sess.durationMinutes);
      const maxDur = Math.max(candidate.durationMinutes, sess.durationMinutes);
      const durRatio = maxDur > 0 ? durDiff / maxDur : 0;

      const candidateSport = candidate.sportId.toLowerCase();
      const sessSport = sess.sport.toLowerCase();
      const sportMatch =
        candidateSport === sessSport ||
        candidateSport === "other" ||
        sessSport === "other" ||
        (candidateSport === "running" && sessSport === "trail_running") ||
        (candidateSport === "cycling" && sessSport === "road_cycling");

      if ((durDiff <= 10 || durRatio <= 0.15) && sportMatch) {
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
