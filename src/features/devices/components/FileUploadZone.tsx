import React, { useState, useRef } from "react";
import { UploadCloud, FileText, RefreshCw, X } from "lucide-react";
import { Badge, Card, Button, showToast } from "@shared/ui";
import { importWorkoutFiles, ImportFileInput } from "@shared/lib/devices";
import { FileImportBatchResult, NormalizedActivity } from "@shared/types/devices";

export interface FileUploadZoneProps {
  onImportComplete?: (result: FileImportBatchResult) => void;
  existingActivities?: NormalizedActivity[];
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onImportComplete,
  existingActivities = []
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastBatchResult, setLastBatchResult] = useState<FileImportBatchResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (fileList: FileList | File[]) => {
    if (!fileList || fileList.length === 0) return;

    setIsProcessing(true);
    setLastBatchResult(null);

    const inputs: ImportFileInput[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]!;
      const ext = file.name.split(".").pop()?.toLowerCase();

      if (!["fit", "tcx", "gpx", "csv"].includes(ext || "")) {
        showToast({
          title: "Nem támogatott formátum",
          message: `${file.name} - Csak .fit, .tcx, .gpx és .csv fájlok tölthetők fel.`,
          type: "warning"
        });
        continue;
      }

      // Read binary for .fit, text for XML/CSV
      if (ext === "fit") {
        const buffer = await file.arrayBuffer();
        inputs.push({
          name: file.name,
          size: file.size,
          content: buffer
        });
      } else {
        const text = await file.text();
        inputs.push({
          name: file.name,
          size: file.size,
          content: text
        });
      }
    }

    if (inputs.length === 0) {
      setIsProcessing(false);
      return;
    }

    try {
      const batchResult = await importWorkoutFiles(inputs, existingActivities);
      setLastBatchResult(batchResult);
      onImportComplete?.(batchResult);

      if (batchResult.createdCount > 0) {
        showToast({
          title: "Sikeres importálás",
          message: `${batchResult.createdCount} edzés sikeresen importálva és elemezve.`,
          type: "success"
        });
      }

      if (batchResult.duplicateCount > 0) {
        showToast({
          title: "Duplikátumok kiszűrve",
          message: `${batchResult.duplicateCount} edzés már rögzítve volt és kihagyásra került.`,
          type: "info"
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Fájl feldolgozási hiba";
      showToast({
        title: "Importálási hiba",
        message: msg,
        type: "error"
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-20 p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? "border-brand bg-brand/10 scale-[1.01]"
            : "border-border-hairline hover:border-brand/50 hover:bg-surface-elevated/40 bg-surface/60"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".fit,.tcx,.gpx,.csv"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="p-3.5 rounded-full bg-brand/10 text-brand">
            {isProcessing ? (
              <RefreshCw className="h-7 w-7 animate-spin" />
            ) : (
              <UploadCloud className="h-7 w-7" />
            )}
          </div>

          <div>
            <p className="text-15 font-semibold text-text-primary">
              {isProcessing
                ? "Fájlok feldolgozása és biometrikus normalizálás..."
                : "Húzd ide az edzésfájlokat, vagy kattints a tallózáshoz"}
            </p>
            <p className="text-12 text-text-secondary mt-1">
              Támogatott formátumok: <span className="font-mono text-brand font-medium">.FIT</span>,{" "}
              <span className="font-mono text-brand font-medium">.TCX</span>,{" "}
              <span className="font-mono text-brand font-medium">.GPX</span>,{" "}
              <span className="font-mono text-brand font-medium">.CSV</span> (max 50 MB / fájl)
            </p>
          </div>

          <div className="pt-1">
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="min-h-[44px] px-6 pointer-events-none"
            >
              Fájl kiválasztása
            </Button>
          </div>

          <div className="flex items-center gap-2 pt-1 flex-wrap justify-center">
            <span className="text-11 px-2.5 py-1 rounded-full bg-surface-elevated border border-border-hairline text-text-secondary">
              Automatikus duplikátum-szűrés
            </span>
            <span className="text-11 px-2.5 py-1 rounded-full bg-surface-elevated border border-border-hairline text-text-secondary">
              Terhelésszámítás (load)
            </span>
          </div>
        </div>
      </div>

      {/* Real-time Import Results Summary */}
      {lastBatchResult && (
        <Card variant="surface" radius="20" className="p-4 space-y-3 border border-border-hairline">
          <div className="flex items-center justify-between pb-2 border-b border-border-hairline">
            <div className="flex items-center gap-2">
              <span className="text-13 font-semibold text-text-primary">Legutóbbi importálás eredménye</span>
              <Badge variant="neutral" size="sm">
                {lastBatchResult.items.length} fájl
              </Badge>
            </div>
            <button
              onClick={() => setLastBatchResult(null)}
              className="text-text-tertiary hover:text-text-primary p-1 rounded-lg"
              title="Bezárás"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {lastBatchResult.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 rounded-12 bg-surface-elevated/60 text-12 border border-border-hairline"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="h-4 w-4 text-brand shrink-0" />
                  <div className="truncate">
                    <p className="font-medium text-text-primary truncate">{item.fileName}</p>
                    <p className="text-11 text-text-secondary">
                      {item.activity?.sport.toUpperCase()} • {Math.round(item.fileSizeBytes / 1024)} KB
                      {item.activity?.trainingLoad ? ` • Terhelés: ${item.activity.trainingLoad}` : ""}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 pl-2">
                  {item.status === "created" && (
                    <Badge variant="ready" size="sm" dot>
                      Létrehozva
                    </Badge>
                  )}
                  {item.status === "duplicate" && (
                    <div className="flex items-center gap-1.5" title={item.reason}>
                      <Badge variant="caution" size="sm" dot>
                        Duplikátum
                      </Badge>
                    </div>
                  )}
                  {item.status === "failed" && (
                    <div className="flex items-center gap-1.5" title={item.reason}>
                      <Badge variant="rest" size="sm" dot>
                        Sikertelen
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
