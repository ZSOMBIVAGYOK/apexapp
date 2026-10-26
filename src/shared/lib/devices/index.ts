/**
 * Device Integration & Biometric Engine
 */

export * from "./schemas";
export * from "./deduplicationEngine";
export * from "./parsers/fileImportEngine";
export * from "./parsers/fitParser";
export * from "./parsers/tcxParser";
export * from "./parsers/gpxParser";
export * from "./parsers/csvParser";
export * from "./adapters";

import { parseGPX } from "./parsers/gpxParser";
import { parseTCX } from "./parsers/tcxParser";
import { parseCSV } from "./parsers/csvParser";
import { parseFIT } from "./parsers/fitParser";
import {
  resolveMultiSourceDaily,
  resolveMultiSourceSleep
} from "./deduplicationEngine";
import { importWorkoutFiles } from "./parsers/fileImportEngine";
import { NormalizedActivity, DEFAULT_METRIC_PRIORITIES, MetricPriorityConfig } from "@shared/types/devices";

// Convenient aliases
export const parseGpx = parseGPX;
export const parseTcx = parseTCX;
export const parseCsv = parseCSV;
export const parseFit = parseFIT;

export const resolveDailyBiometrics = (
  dailyRecords: Parameters<typeof resolveMultiSourceDaily>[0],
  priorities?: MetricPriorityConfig
) => {
  const { resolvedDaily, fieldSources } = resolveMultiSourceDaily(dailyRecords, priorities);
  return {
    ...resolvedDaily,
    fieldSources
  };
};

export const resolveSleepBiometrics = resolveMultiSourceSleep;

export const DEFAULT_METRIC_PRIORITY = DEFAULT_METRIC_PRIORITIES;

/**
 * Convenient single-file parser and processor
 */
export async function parseAndProcessFile(
  fileName: string,
  content: string | ArrayBuffer | Uint8Array,
  _userId: string,
  existingActivities: NormalizedActivity[] = []
) {
  const size = typeof content === "string" ? content.length : content.byteLength;
  const result = await importWorkoutFiles([{ name: fileName, size, content }], existingActivities);
  return {
    ...result,
    totalParsed: result.items.length
  };
}
