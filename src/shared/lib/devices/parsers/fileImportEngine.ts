/**
 * Unified File Import Engine
 *
 * Ingestion pipeline for athlete files (FIT, TCX, GPX, CSV).
 * Handles format detection, parsing, deduplication, and training load calculation.
 */

import { NormalizedActivity, FileImportItem, FileImportBatchResult } from "@shared/types/devices";
import { parseGPX } from "./gpxParser";
import { parseTCX } from "./tcxParser";
import { parseCSV } from "./csvParser";
import { parseFIT } from "./fitParser";
import { findDuplicateActivity } from "../deduplicationEngine";
import { calculateSessionLoad } from "@shared/lib/load";

export interface ImportFileInput {
  name: string;
  size: number;
  content: string | ArrayBuffer | Uint8Array;
}

function toSupportedFileType(ext?: string): "fit" | "tcx" | "gpx" | "csv" {
  if (ext === "tcx" || ext === "gpx" || ext === "csv") return ext;
  return "fit";
}

export async function importWorkoutFiles(
  files: ImportFileInput[],
  existingActivities: NormalizedActivity[] = []
): Promise<FileImportBatchResult> {
  const batchId = `batch_${Date.now()}`;
  const items: FileImportItem[] = [];
  const currentActivities = [...existingActivities];

  let createdCount = 0;
  let duplicateCount = 0;
  let failedCount = 0;

  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    const itemId = `import_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const fileType = toSupportedFileType(ext);

    try {
      let parsedActivities: NormalizedActivity[] = [];

      if (ext === "gpx") {
        const text = typeof file.content === "string" ? file.content : new TextDecoder().decode(file.content);
        parsedActivities = [parseGPX(text, file.name)];
      } else if (ext === "tcx") {
        const text = typeof file.content === "string" ? file.content : new TextDecoder().decode(file.content);
        parsedActivities = [parseTCX(text, file.name)];
      } else if (ext === "csv") {
        const text = typeof file.content === "string" ? file.content : new TextDecoder().decode(file.content);
        parsedActivities = parseCSV(text, file.name);
      } else if (ext === "fit") {
        const buf = typeof file.content === "string" ? new TextEncoder().encode(file.content).buffer : file.content;
        parsedActivities = [parseFIT(buf, file.name)];
      } else {
        throw new Error(`Unsupported file format: .${ext}. Supported: FIT, TCX, GPX, CSV.`);
      }

      for (const act of parsedActivities) {
        // Calculate load if missing
        if (!act.trainingLoad) {
          act.trainingLoad = calculateSessionLoad({
            durationMinutes: Math.round(act.durationSeconds / 60),
            avgPower: act.avgPowerWatts,
            normalizedPower: act.normalizedPowerWatts,
            avgHeartRate: act.avgHeartRate,
            ftp: 260,
            lthr: 168
          });
        }

        // Check deduplication
        const duplicate = findDuplicateActivity(act, currentActivities);

        if (duplicate) {
          duplicateCount++;
          items.push({
            id: itemId,
            fileName: file.name,
            fileType,
            fileSizeBytes: file.size,
            status: "duplicate",
            reason: `Már létezik ezzel egyező edzés: ${duplicate.title} (${new Date(duplicate.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`,
            activity: act,
            uploadedAt: new Date().toISOString()
          });
        } else {
          createdCount++;
          currentActivities.push(act);
          items.push({
            id: itemId,
            fileName: file.name,
            fileType,
            fileSizeBytes: file.size,
            status: "created",
            activity: act,
            uploadedAt: new Date().toISOString()
          });
        }
      }
    } catch (err: unknown) {
      failedCount++;
      const errMsg = err instanceof Error ? err.message : "Fájl feldolgozási hiba";
      items.push({
        id: itemId,
        fileName: file.name,
        fileType,
        fileSizeBytes: file.size,
        status: "failed",
        reason: errMsg,
        uploadedAt: new Date().toISOString()
      });
    }
  }

  return {
    batchId,
    totalFiles: files.length,
    createdCount,
    duplicateCount,
    failedCount,
    items
  };
}
