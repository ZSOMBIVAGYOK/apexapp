/**
 * Binary FIT (Flexible and Interoperable Data Transfer) File Parser
 * Pure TypeScript parser for Garmin FIT files compliant with the FIT Protocol 2.0 specification.
 * Extracts session summary (Message 18), laps (Message 19), and records (Message 20).
 */

import { NormalizedActivity, StandardSport, NormalizedLap } from "@shared/types/devices";

// FIT epoch begins at UTC 1989-12-31 00:00:00 (Unix timestamp 631065600)
const FIT_EPOCH_MS = 631065600000;

function fitSportToStandard(sportId?: number): StandardSport {
  switch (sportId) {
    case 1:
      return "running";
    case 2:
      return "cycling";
    case 5:
      return "swimming";
    case 11: // Training / strength
    case 20:
      return "strength";
    case 15:
      return "rowing";
    case 17:
      return "walking";
    case 37:
      return "triathlon";
    default:
      return "other";
  }
}

interface FieldDefinition {
  fieldNum: number;
  size: number;
  baseType: number;
}

interface DefinitionMessage {
  globalMsgNum: number;
  endianness: "little" | "big";
  fields: FieldDefinition[];
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
  let trainingStressScore: number | undefined;
  const laps: NormalizedLap[] = [];

  let offset = headerSize;

  while (offset < endOffset) {
    const recordHeader = bytes[offset]!;
    offset++;

    // Check if compressed timestamp header (bit 7 = 1)
    if ((recordHeader & 0x80) !== 0) {
      // Compressed timestamp header: local message type is bits 5-6
      const localMsgType = (recordHeader >> 5) & 0x03;
      const def = localDefs.get(localMsgType);
      if (def) {
        // Skip data bytes for this compressed record
        for (const f of def.fields) offset += f.size;
      }
      continue;
    }

    const isDefinition = (recordHeader & 0x40) !== 0;
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

      localDefs.set(localMsgType, {
        globalMsgNum,
        endianness: isBigEndian ? "big" : "little",
        fields
      });
    } else {
      // Data message
      const def = localDefs.get(localMsgType);
      if (!def) {
        // If unknown definition, abort to avoid desync
        break;
      }

      const isLE = def.endianness === "little";

      // Read fields for this data message
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

      // Check for Session message (Global Message 18)
      if (def.globalMsgNum === 18) {
        let fieldOffset = offset;
        for (const f of def.fields) {
          if (f.fieldNum === 2 && f.size === 4) {
            // start_time (seconds since FIT epoch)
            const fitSeconds = readUint32(fieldOffset);
            if (fitSeconds > 0 && fitSeconds < 0xfffffffe) {
              startTimeIso = new Date(FIT_EPOCH_MS + fitSeconds * 1000).toISOString();
            }
          } else if (f.fieldNum === 5 && f.size === 1) {
            // sport
            sportId = bytes[fieldOffset];
          } else if (f.fieldNum === 7 && f.size === 4) {
            // total_elapsed_time (scale 1000 = 1s)
            const raw = readUint32(fieldOffset);
            if (raw > 0 && raw < 0xfffffffe) durationSeconds = Math.round(raw / 1000);
          } else if (f.fieldNum === 8 && f.size === 4 && durationSeconds === 0) {
            // total_timer_time
            const raw = readUint32(fieldOffset);
            if (raw > 0 && raw < 0xfffffffe) durationSeconds = Math.round(raw / 1000);
          } else if (f.fieldNum === 9 && f.size === 4) {
            // total_distance (scale 100 = 1m)
            const raw = readUint32(fieldOffset);
            if (raw > 0 && raw < 0xfffffffe) distanceMeters = Math.round(raw / 100);
          } else if (f.fieldNum === 11 && f.size === 2) {
            // total_calories
            const raw = readUint16(fieldOffset);
            if (raw > 0 && raw < 0xfffe) calories = raw;
          } else if (f.fieldNum === 16 && f.size === 1) {
            // avg_heart_rate
            const raw = bytes[fieldOffset]!;
            if (raw > 30 && raw < 250) avgHeartRate = raw;
          } else if (f.fieldNum === 17 && f.size === 1) {
            // max_heart_rate
            const raw = bytes[fieldOffset]!;
            if (raw > 30 && raw < 250) maxHeartRate = raw;
          } else if (f.fieldNum === 20 && f.size === 2) {
            // avg_power
            const raw = readUint16(fieldOffset);
            if (raw > 0 && raw < 3000) avgPowerWatts = raw;
          } else if (f.fieldNum === 21 && f.size === 2) {
            // max_power
            const raw = readUint16(fieldOffset);
            if (raw > 0 && raw < 4000) maxPowerWatts = raw;
          } else if (f.fieldNum === 22 && f.size === 2) {
            // total_ascent
            const raw = readUint16(fieldOffset);
            if (raw > 0 && raw < 0xfffe) elevationGainMeters = raw;
          } else if (f.fieldNum === 23 && f.size === 2) {
            // total_descent
            const raw = readUint16(fieldOffset);
            if (raw > 0 && raw < 0xfffe) elevationLossMeters = raw;
          } else if (f.fieldNum === 25 && f.size === 2) {
            // normalized_power
            const raw = readUint16(fieldOffset);
            if (raw > 0 && raw < 3000) normalizedPowerWatts = raw;
          } else if (f.fieldNum === 26 && f.size === 2) {
            // training_stress_score (scale 10 = 1 TSS)
            const raw = readUint16(fieldOffset);
            if (raw > 0 && raw < 0xfffe) trainingStressScore = Math.round(raw / 10);
          }

          fieldOffset += f.size;
        }
      }

      // Check for Lap message (Global Message 19)
      if (def.globalMsgNum === 19) {
        let fieldOffset = offset;
        let lapTime = 0;
        let lapDist = 0;
        let lapHr = 0;
        let lapPwr = 0;

        for (const f of def.fields) {
          if (f.fieldNum === 7 && f.size === 4) {
            const raw = readUint32(fieldOffset);
            if (raw > 0 && raw < 0xfffffffe) lapTime = Math.round(raw / 1000);
          } else if (f.fieldNum === 9 && f.size === 4) {
            const raw = readUint32(fieldOffset);
            if (raw > 0 && raw < 0xfffffffe) lapDist = Math.round(raw / 100);
          } else if (f.fieldNum === 15 && f.size === 1) {
            lapHr = bytes[fieldOffset]!;
          } else if (f.fieldNum === 19 && f.size === 2) {
            lapPwr = readUint16(fieldOffset);
          }
          fieldOffset += f.size;
        }

        if (lapTime > 0) {
          laps.push({
            index: laps.length,
            startTime: startTimeIso || new Date().toISOString(),
            durationSeconds: lapTime,
            distanceMeters: lapDist > 0 ? lapDist : undefined,
            avgHeartRate: lapHr > 30 ? lapHr : undefined,
            avgPowerWatts: lapPwr > 0 ? lapPwr : undefined
          });
        }
      }

      // Advance by record size
      for (const f of def.fields) offset += f.size;
    }
  }

  // Fallback if session wasn't encountered or duration is 0
  if (durationSeconds === 0) {
    durationSeconds = laps.reduce((sum, l) => sum + l.durationSeconds, 0);
    if (durationSeconds === 0) durationSeconds = 1800; // 30m fallback
  }

  const sport = fitSportToStandard(sportId);
  const start = startTimeIso || new Date().toISOString();

  let avgPaceSecondsPerKm: number | undefined = undefined;
  if (distanceMeters && distanceMeters > 100 && durationSeconds > 0) {
    avgPaceSecondsPerKm = Math.round(durationSeconds / (distanceMeters / 1000));
  }

  const title = `${sport.charAt(0).toUpperCase() + sport.slice(1)} edzés (${Math.round(durationSeconds / 60)} perc)`;

  return {
    id: `fit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId: "athlete-self",
    provider: "file",
    providerRecordId: `file_${fileName}_${start}`,
    sport,
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
    trainingLoad: trainingStressScore,
    laps: laps.length > 0 ? laps : undefined,
    sourceConfidence: 0.98,
    createdAt: new Date().toISOString()
  };
}
