/**
 * Binary FIT (Flexible and Interoperable Data Transfer) File Parser
 * Pure TypeScript parser compliant with ANT+ FIT Protocol 2.0 specification.
 * Extracts session summary (Message 18), laps (Message 19), records (Message 20),
 * developer fields, and compressed timestamp messages.
 */

import { NormalizedActivity, NormalizedLap, NormalizedStrengthSet } from "@shared/types/devices";
import { SessionTimeSeriesPoint } from "@shared/types/dataModel";
import { mapFitSport } from "@shared/lib/sports/sportMapping";
import { cleanTimeSeries } from "./seriesCleaner";
import { calculateSessionLoadDetailed } from "@shared/lib/load";

// FIT epoch begins at UTC 1989-12-31 00:00:00 (Unix timestamp 631065600)
const FIT_EPOCH_MS = 631065600000;

export const FIT_EXERCISE_CATEGORIES: Record<number, { hu: string; en: string }> = {
  0: { hu: "Fekvenyomás", en: "Bench Press" },
  1: { hu: "Vádliemelés", en: "Calf Raise" },
  2: { hu: "Kardió", en: "Cardio" },
  3: { hu: "Súlycipelés", en: "Carry" },
  4: { hu: "Fakorcolás / Átlós húzás", en: "Chop" },
  5: { hu: "Törzsizomzat", en: "Core" },
  6: { hu: "Hasprés", en: "Crunch" },
  7: { hu: "Bicepszhajlítás", en: "Curl" },
  8: { hu: "Felhúzás", en: "Deadlift" },
  9: { hu: "Tárogatás", en: "Flye" },
  10: { hu: "Csípőemelés", en: "Hip Raise" },
  11: { hu: "Kitörés", en: "Lunge" },
  12: { hu: "Olimpiai súlyemelés", en: "Olympic Lift" },
  13: { hu: "Plank", en: "Plank" },
  14: { hu: "Húzódzkodás", en: "Pull Up" },
  15: { hu: "Fekvőtámasz", en: "Push Up" },
  16: { hu: "Döntött törzsű evezés", en: "Row" },
  17: { hu: "Vállból nyomás", en: "Shoulder Press" },
  18: { hu: "Vállvonogatás", en: "Shrug" },
  19: { hu: "Felülés", en: "Sit Up" },
  20: { hu: "Guggolás", en: "Squat" },
  21: { hu: "Teljes test", en: "Total Body" },
  22: { hu: "Tricepsznyújtás", en: "Triceps Extension" },
  23: { hu: "Melegítés", en: "Warm Up" }
};

interface FieldDefinition {
  fieldNum: number;
  size: number;
  baseType: number;
}

interface DeveloperFieldDefinition {
  fieldNum: number;
  size: number;
  devIdx: number;
}

interface DefinitionMessage {
  globalMsgNum: number;
  endianness: "little" | "big";
  fields: FieldDefinition[];
  devFields?: DeveloperFieldDefinition[];
}

export function parseFIT(
  buffer: ArrayBuffer | Uint8Array,
  fileName = "workout.fit"
): NormalizedActivity {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  if (bytes.length < 14) {
    throw new Error("Invalid FIT file: buffer too short (< 14 bytes).");
  }

  // 1. Verify Header
  const headerSize = bytes[0]!;
  if (headerSize < 12) {
    throw new Error(`Invalid FIT file header size: ${headerSize}`);
  }

  // Check magic signature ".FIT" at byte offset 8-11
  const sig = String.fromCharCode(bytes[8]!, bytes[9]!, bytes[10]!, bytes[11]!);
  if (sig !== ".FIT") {
    throw new Error(`Invalid FIT file signature: expected '.FIT', received '${sig}'`);
  }

  const dataSize =
    bytes[4]! | (bytes[5]! << 8) | (bytes[6]! << 16) | (bytes[7]! << 24);
  const endOffset = Math.min(bytes.length, headerSize + dataSize);

  // Active definition messages map (localMsgType 0-15 -> DefinitionMessage)
  const localDefs = new Map<number, DefinitionMessage>();

  // Extracted Session data
  let sportId: number | undefined;
  let subSportId: number | undefined;
  const sessionSports: Array<{ sport?: number; subSport?: number }> = [];

  let startTimeIso: string | undefined;
  let durationSeconds = 0;
  let distanceMeters: number | undefined;
  let calories: number | undefined;
  let avgHeartRate: number | undefined;
  let maxHeartRate: number | undefined;
  let avgPowerWatts: number | undefined;
  let maxPowerWatts: number | undefined;
  let normalizedPowerWatts: number | undefined;
  let elevationGainMeters: number | undefined;
  let elevationLossMeters: number | undefined;
  const laps: NormalizedLap[] = [];
  const strengthSets: NormalizedStrengthSet[] = [];

  // Time series records
  const rawPoints: SessionTimeSeriesPoint[] = [];
  let firstTimestamp: number | null = null;
  let lastTimestamp: number | null = null;

  let offset = headerSize;

  while (offset < endOffset) {
    const recordHeader = bytes[offset]!;
    offset++;

    // ------------------------------------------------------------------
    // A. Compressed Timestamp Data Message (bit 7 = 1)
    // ------------------------------------------------------------------
    if ((recordHeader & 0x80) !== 0) {
      const localMsgType = (recordHeader >> 5) & 0x03;
      const timeOffset = recordHeader & 0x1f;
      const def = localDefs.get(localMsgType);

      if (!def) {
        // Unknown definition, skip
        continue;
      }

      if (lastTimestamp !== null) {
        lastTimestamp = (lastTimestamp & 0xffffffe0) + timeOffset;
      }

      // If it's a Record message (Msg 20), extract data fields
      if (def.globalMsgNum === 20) {
        const pt = parseRecordMessage(bytes, offset, def, lastTimestamp);
        if (pt) {
          if (firstTimestamp === null && pt.timestamp) firstTimestamp = pt.timestamp;
          rawPoints.push(pt.point);
        }
      }

      for (const f of def.fields) offset += f.size;
      if (def.devFields) {
        for (const df of def.devFields) offset += df.size;
      }
      continue;
    }

    // ------------------------------------------------------------------
    // B. Normal Header (bit 7 = 0)
    // ------------------------------------------------------------------
    const isDefinition = (recordHeader & 0x40) !== 0;
    const hasDevData = (recordHeader & 0x20) !== 0;
    const localMsgType = recordHeader & 0x0f;

    if (isDefinition) {
      // Definition message
      offset++; // Reserved byte
      const archByte = bytes[offset]!;
      const isBigEndian = archByte === 1;
      offset++;

      const globalMsgNum = isBigEndian
        ? (bytes[offset]! << 8) | bytes[offset + 1]!
        : bytes[offset]! | (bytes[offset + 1]! << 8);
      offset += 2;

      const numFields = bytes[offset]!;
      offset++;

      const fields: FieldDefinition[] = [];
      for (let i = 0; i < numFields; i++) {
        const fieldNum = bytes[offset]!;
        const size = bytes[offset + 1]!;
        const baseType = bytes[offset + 2]!;
        offset += 3;
        fields.push({ fieldNum, size, baseType });
      }

      let devFields: DeveloperFieldDefinition[] | undefined;
      if (hasDevData) {
        const numDevFields = bytes[offset]!;
        offset++;
        devFields = [];
        for (let i = 0; i < numDevFields; i++) {
          const fieldNum = bytes[offset]!;
          const size = bytes[offset + 1]!;
          const devIdx = bytes[offset + 2]!;
          offset += 3;
          devFields.push({ fieldNum, size, devIdx });
        }
      }

      localDefs.set(localMsgType, {
        globalMsgNum,
        endianness: isBigEndian ? "big" : "little",
        fields,
        devFields
      });
    } else {
      // Normal Data message
      const def = localDefs.get(localMsgType);
      if (!def) {
        // Unknown definition, advance to next byte or abort
        break;
      }

      const isLE = def.endianness === "little";

      const readUint16 = (pos: number) =>
        isLE ? bytes[pos]! | (bytes[pos + 1]! << 8) : (bytes[pos]! << 8) | bytes[pos + 1]!;
      const readUint32 = (pos: number) =>
        isLE
          ? (bytes[pos]! |
              (bytes[pos + 1]! << 8) |
              (bytes[pos + 2]! << 16) |
              (bytes[pos + 3]! << 24)) >>>
            0
          : ((bytes[pos]! << 24) |
              (bytes[pos + 1]! << 16) |
              (bytes[pos + 2]! << 8) |
              bytes[pos + 3]!) >>>
            0;

      // -------------------------------------------------------------
      // Global Msg 18: Session message
      // -------------------------------------------------------------
      if (def.globalMsgNum === 18) {
        let fOffset = offset;
        let sSport: number | undefined;
        let sSubSport: number | undefined;

        for (const f of def.fields) {
          if (f.fieldNum === 2 && f.size === 4) {
            // start_time (seconds since FIT epoch)
            const fitSeconds = readUint32(fOffset);
            if (fitSeconds > 0 && fitSeconds < 0xfffffffe) {
              startTimeIso = new Date(FIT_EPOCH_MS + fitSeconds * 1000).toISOString();
            }
          } else if (f.fieldNum === 5 && f.size === 1) {
            // sport
            sSport = bytes[fOffset];
            sportId = sSport;
          } else if (f.fieldNum === 6 && f.size === 1) {
            // sub_sport
            sSubSport = bytes[fOffset];
            subSportId = sSubSport;
          } else if (f.fieldNum === 7 && f.size === 4) {
            // total_elapsed_time (scale 1000 = 1s)
            const raw = readUint32(fOffset);
            if (raw > 0 && raw < 0xfffffffe) durationSeconds = Math.round(raw / 1000);
          } else if (f.fieldNum === 8 && f.size === 4 && durationSeconds === 0) {
            // total_timer_time
            const raw = readUint32(fOffset);
            if (raw > 0 && raw < 0xfffffffe) durationSeconds = Math.round(raw / 1000);
          } else if (f.fieldNum === 9 && f.size === 4) {
            // total_distance (scale 100 = 1m)
            const raw = readUint32(fOffset);
            if (raw > 0 && raw < 0xfffffffe) distanceMeters = Math.round(raw / 100);
          } else if (f.fieldNum === 11 && f.size === 2) {
            // total_calories
            const raw = readUint16(fOffset);
            if (raw > 0 && raw < 0xfffe) calories = raw;
          } else if ((f.fieldNum === 16 || f.fieldNum === 15) && f.size === 1 && !avgHeartRate) {
            // avg_heart_rate
            const raw = bytes[fOffset]!;
            if (raw > 30 && raw < 240) avgHeartRate = raw;
          } else if ((f.fieldNum === 17 || f.fieldNum === 16) && f.size === 1 && !maxHeartRate) {
            // max_heart_rate
            const raw = bytes[fOffset]!;
            if (raw > 30 && raw < 250) maxHeartRate = raw;
          } else if (f.fieldNum === 20 && f.size === 2) {
            // avg_power
            const raw = readUint16(fOffset);
            if (raw > 0 && raw < 3000) avgPowerWatts = raw;
          } else if (f.fieldNum === 21 && f.size === 2) {
            // max_power
            const raw = readUint16(fOffset);
            if (raw > 0 && raw < 4000) maxPowerWatts = raw;
          } else if (f.fieldNum === 22 && f.size === 2) {
            // total_ascent
            const raw = readUint16(fOffset);
            if (raw > 0 && raw < 0xfffe) elevationGainMeters = raw;
          } else if (f.fieldNum === 23 && f.size === 2) {
            // total_descent
            const raw = readUint16(fOffset);
            if (raw > 0 && raw < 0xfffe) elevationLossMeters = raw;
          } else if (f.fieldNum === 34 && f.size === 2) {
            // normalized_power
            const raw = readUint16(fOffset);
            if (raw > 0 && raw < 3000) normalizedPowerWatts = raw;
          }

          fOffset += f.size;
        }

        if (sSport !== undefined) {
          sessionSports.push({ sport: sSport, subSport: sSubSport });
        }
      }

      // -------------------------------------------------------------
      // Global Msg 19: Lap message
      // -------------------------------------------------------------
      if (def.globalMsgNum === 19) {
        let fOffset = offset;
        let lapTime = 0;
        let lapDist = 0;
        let lapHr = 0;
        let lapPwr = 0;
        let lapSport: number | undefined;

        for (const f of def.fields) {
          if (f.fieldNum === 25 && f.size === 1) {
            lapSport = bytes[fOffset]!;
          } else if (f.fieldNum === 7 && f.size === 4) {
            const raw = readUint32(fOffset);
            if (raw > 0 && raw < 0xfffffffe) lapTime = Math.round(raw / 1000);
          } else if (f.fieldNum === 9 && f.size === 4) {
            const raw = readUint32(fOffset);
            if (raw > 0 && raw < 0xfffffffe) lapDist = Math.round(raw / 100);
          } else if ((f.fieldNum === 15 || f.fieldNum === 16) && f.size === 1) {
            lapHr = bytes[fOffset]!;
          } else if ((f.fieldNum === 19 || f.fieldNum === 20) && f.size === 2) {
            lapPwr = readUint16(fOffset);
          }
          fOffset += f.size;
        }

        if (lapSport !== undefined) {
          sessionSports.push({ sport: lapSport });
        }

        if (lapTime > 0) {
          laps.push({
            index: laps.length,
            startTime: startTimeIso || new Date().toISOString(),
            durationSeconds: lapTime,
            distanceMeters: lapDist > 0 ? lapDist : undefined,
            avgHeartRate: lapHr > 30 && lapHr < 240 ? lapHr : undefined,
            avgPowerWatts: lapPwr > 0 && lapPwr < 3000 ? lapPwr : undefined
          });
        }
      }

      // -------------------------------------------------------------
      // Global Msg 20: Record message (Time series point)
      // -------------------------------------------------------------
      if (def.globalMsgNum === 20) {
        const pt = parseRecordMessage(bytes, offset, def, lastTimestamp);
        if (pt) {
          if (pt.timestamp) {
            lastTimestamp = pt.timestamp;
            if (firstTimestamp === null) firstTimestamp = pt.timestamp;
          }
          rawPoints.push(pt.point);
        }
      }

      // -------------------------------------------------------------
      // Global Msg 225: Set message (Strength sets & rest intervals)
      // -------------------------------------------------------------
      if (def.globalMsgNum === 225) {
        let fOffset = offset;
        let setDurationSec = 0;
        let repetitions = 0;
        let weightKg = 0;
        let setType: "active" | "rest" = "active";
        let category: number | undefined;
        let startTimeSec: number | undefined;

        for (const f of def.fields) {
          if (f.fieldNum === 0 && f.size === 4) {
            const raw = readUint32(fOffset);
            if (raw > 0 && raw < 0xfffffffe) setDurationSec = Math.round(raw / 1000);
          } else if (f.fieldNum === 3 && f.size === 2) {
            const raw = readUint16(fOffset);
            if (raw > 0 && raw < 0xfffe) repetitions = raw;
          } else if (f.fieldNum === 4 && f.size === 2) {
            const raw = readUint16(fOffset);
            if (raw > 0 && raw < 0xfffe) {
              weightKg = raw > 250 ? Math.round((raw / 16) * 10) / 10 : raw;
            }
          } else if (f.fieldNum === 5 && f.size === 1) {
            const raw = bytes[fOffset]!;
            setType = raw === 0 ? "rest" : "active";
          } else if (f.fieldNum === 6 && f.size === 4) {
            const raw = readUint32(fOffset);
            if (raw > 0 && raw < 0xfffffffe) startTimeSec = raw;
          } else if (f.fieldNum === 7 && f.size === 2) {
            category = readUint16(fOffset);
          }
          fOffset += f.size;
        }

        const categoryInfo = category !== undefined ? FIT_EXERCISE_CATEGORIES[category] : undefined;
        const exerciseName = categoryInfo ? categoryInfo.hu : undefined;

        strengthSets.push({
          index: strengthSets.length,
          type: setType,
          durationSeconds: setDurationSec > 0 ? setDurationSec : undefined,
          repetitions: setType === "active" ? repetitions : undefined,
          weightKg: setType === "active" && weightKg > 0 ? weightKg : undefined,
          category,
          exerciseName,
          startTimeIso: startTimeSec
            ? new Date(FIT_EPOCH_MS + startTimeSec * 1000).toISOString()
            : undefined
        });
      }

      // Advance by record size + developer fields
      for (const f of def.fields) offset += f.size;
      if (def.devFields) {
        for (const df of def.devFields) offset += df.size;
      }
    }
  }

  // ------------------------------------------------------------------
  // Post-processing: Time offsets & Series Cleaning
  // ------------------------------------------------------------------
  const pointsWithOffset = rawPoints.map((p, idx) => ({
    ...p,
    timeOffsetSeconds: p.timeOffsetSeconds ?? idx
  }));

  const { cleanedPoints, smoothedPoints, report } = cleanTimeSeries(pointsWithOffset);

  // Compute duration from points if missing from session
  if (durationSeconds === 0) {
    if (cleanedPoints.length > 0) {
      const lastPoint = cleanedPoints[cleanedPoints.length - 1]!;
      durationSeconds = lastPoint.timeOffsetSeconds || cleanedPoints.length;
    } else {
      durationSeconds = laps.reduce((sum, l) => sum + l.durationSeconds, 0);
    }
    if (durationSeconds === 0) durationSeconds = 1800; // 30 min default fallback
  }

  // Derive Heart Rate statistics if missing from session message
  if (!avgHeartRate && report.cleanedAvgHr) {
    avgHeartRate = report.cleanedAvgHr;
  }
  if (!maxHeartRate && report.cleanedMaxHr) {
    maxHeartRate = report.cleanedMaxHr;
  }

  // Derive distance from points if missing from session
  if (!distanceMeters && cleanedPoints.length > 0) {
    const lastDist = cleanedPoints[cleanedPoints.length - 1]?.distanceMeters;
    if (lastDist && lastDist > 0) {
      distanceMeters = Math.round(lastDist);
    }
  }

  // Sport Mapping (Official FIT SDK & SubSport)
  const mapped = mapFitSport(sportId, subSportId, sessionSports);
  const sport = mapped.sportId;

  const start = startTimeIso || new Date().toISOString();

  let avgPaceSecondsPerKm: number | undefined = undefined;
  if (distanceMeters && distanceMeters > 100 && durationSeconds > 0) {
    avgPaceSecondsPerKm = Math.round(durationSeconds / (distanceMeters / 1000));
  }

  const durationMin = Math.max(1, Math.round(durationSeconds / 60));
  const title = `${mapped.sportNameHu} edzés (${durationMin} perc)`;

  // Accurate Training Load calculation (Never default to 1!)
  const loadResult = calculateSessionLoadDetailed({
    durationMinutes: durationMin,
    avgHeartRate,
    maxHr: maxHeartRate,
    avgPower: avgPowerWatts,
    normalizedPower: normalizedPowerWatts,
    sport
  });

  return {
    id: `fit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId: "athlete-self",
    provider: "file",
    providerRecordId: `file_${fileName}_${start}`,
    sport,
    sportRawName: mapped.detectedRaw,
    title,
    startTime: start,
    durationSeconds,
    distanceMeters,
    avgHeartRate,
    maxHeartRate,
    avgPowerWatts,
    maxPowerWatts,
    normalizedPowerWatts,
    avgPaceSecondsPerKm,
    elevationGainMeters,
    elevationLossMeters,
    calories,
    trainingLoad: loadResult.load,
    loadSourceLabelHu: loadResult.sourceLabelHu,
    warningsHu: report.warningsHu,
    laps: laps.length > 0 ? laps : undefined,
    strengthSets: strengthSets.length > 0 ? strengthSets : undefined,
    timeSeries: {
      points: smoothedPoints.length > 0 ? smoothedPoints : cleanedPoints
    },
    sourceConfidence: mapped.confidence,
    createdAt: new Date().toISOString()
  };
}

/**
 * Parses a single Record message (Global Msg 20) data payload
 */
function parseRecordMessage(
  bytes: Uint8Array,
  offset: number,
  def: DefinitionMessage,
  currentTimestamp: number | null
): { point: SessionTimeSeriesPoint; timestamp?: number } | null {
  const isLE = def.endianness === "little";

  const readUint16 = (pos: number) =>
    isLE ? bytes[pos]! | (bytes[pos + 1]! << 8) : (bytes[pos]! << 8) | bytes[pos + 1]!;
  const readUint32 = (pos: number) =>
    isLE
      ? (bytes[pos]! |
          (bytes[pos + 1]! << 8) |
          (bytes[pos + 2]! << 16) |
          (bytes[pos + 3]! << 24)) >>>
        0
      : ((bytes[pos]! << 24) |
          (bytes[pos + 1]! << 16) |
          (bytes[pos + 2]! << 8) |
          bytes[pos + 3]!) >>>
        0;
  const readInt32 = (pos: number) => {
    const u = readUint32(pos);
    return u > 0x7fffffff ? u - 0x100000000 : u;
  };

  let fOffset = offset;
  let ts: number | undefined = currentTimestamp || undefined;
  let lat: number | undefined;
  let lon: number | undefined;
  let alt: number | undefined;
  let hr: number | undefined;
  let pwr: number | undefined;
  let cad: number | undefined;
  let speed: number | undefined;
  let dist: number | undefined;
  let temp: number | undefined;

  for (const f of def.fields) {
    if (f.fieldNum === 253 && f.size === 4) {
      // timestamp (seconds since FIT epoch)
      const raw = readUint32(fOffset);
      if (raw > 0 && raw < 0xfffffffe) ts = raw;
    } else if (f.fieldNum === 0 && f.size === 4) {
      // position_lat (semicircles -> degrees)
      const raw = readInt32(fOffset);
      if (raw !== 0x7fffffff) lat = raw * (180 / 2147483648);
    } else if (f.fieldNum === 1 && f.size === 4) {
      // position_long (semicircles -> degrees)
      const raw = readInt32(fOffset);
      if (raw !== 0x7fffffff) lon = raw * (180 / 2147483648);
    } else if (f.fieldNum === 78 && f.size === 4) {
      // enhanced_altitude (scale 5, offset 500)
      const raw = readUint32(fOffset);
      if (raw !== 0xffffffff) alt = +(raw / 5 - 500).toFixed(1);
    } else if (f.fieldNum === 2 && f.size === 2 && alt === undefined) {
      // altitude
      const raw = readUint16(fOffset);
      if (raw !== 0xffff) alt = +(raw / 5 - 500).toFixed(1);
    } else if (f.fieldNum === 73 && f.size === 4) {
      // enhanced_speed (scale 1000 = m/s)
      const raw = readUint32(fOffset);
      if (raw !== 0xffffffff) speed = +(raw / 1000).toFixed(2);
    } else if (f.fieldNum === 6 && f.size === 2 && speed === undefined) {
      // speed (scale 1000 = m/s)
      const raw = readUint16(fOffset);
      if (raw !== 0xffff) speed = +(raw / 1000).toFixed(2);
    } else if (f.fieldNum === 3 && f.size === 1) {
      // heart_rate (bpm)
      hr = bytes[fOffset]!;
    } else if (f.fieldNum === 4 && f.size === 1) {
      // cadence (rpm / spm)
      const raw = bytes[fOffset]!;
      if (raw > 0 && raw < 250) cad = raw;
    } else if (f.fieldNum === 7 && f.size === 2) {
      // power (Watts)
      const raw = readUint16(fOffset);
      if (raw > 0 && raw < 3000) pwr = raw;
    } else if (f.fieldNum === 5 && f.size === 4) {
      // distance (scale 100 = meters)
      const raw = readUint32(fOffset);
      if (raw !== 0xffffffff) dist = Math.round(raw / 100);
    } else if (f.fieldNum === 13 && f.size === 1) {
      // temperature (deg C, signed int8)
      const raw = (bytes[fOffset]! << 24) >> 24;
      if (raw > -40 && raw < 60) temp = raw;
    }

    fOffset += f.size;
  }

  return {
    timestamp: ts,
    point: {
      timeOffsetSeconds: 0, // Will be resolved by caller
      heartRate: hr,
      speedMps: speed,
      powerWatts: pwr,
      cadence: cad,
      elevationMeters: alt,
      distanceMeters: dist,
      temperatureCelsius: temp,
      lat,
      lon
    }
  };
}
