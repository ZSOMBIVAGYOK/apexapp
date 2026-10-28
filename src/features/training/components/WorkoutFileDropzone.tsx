import React, { useState, useRef } from "react";
import { parseWorkoutFile, ParsedWorkoutFileResult } from "@shared/lib/devices/workoutFileService";
import { Upload, CheckCircle2, AlertTriangle, Loader2, X } from "lucide-react";

interface WorkoutFileDropzoneProps {
  onFileParsed: (result: ParsedWorkoutFileResult, file: File) => void;
  onClearFile?: () => void;
  onOpenSportPicker?: () => void;
  currentParsedFile?: ParsedWorkoutFileResult | null;
  compact?: boolean;
  label?: string;
}

export const WorkoutFileDropzone: React.FC<WorkoutFileDropzoneProps> = ({
  onFileParsed,
  onClearFile,
  onOpenSportPicker,
  currentParsedFile,
  compact = false,
  label = "Kitöltés fájlból (FIT, GPX, TCX)"
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessFile = async (file: File) => {
    setError(null);
    setIsLoading(true);

    try {
      const result = await parseWorkoutFile(file);
      onFileParsed(result, file);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Hiba történt a fájl feldolgozása során.";
      setError(message);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file) handleProcessFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleClickPicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept=".fit,.gpx,.tcx"
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            const file = files[0];
            if (file) handleProcessFile(file);
          }
        }}
      />

      {currentParsedFile ? (
        /* Summary Card of read file */
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2.5 text-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold text-emerald-300 flex items-center gap-1.5 flex-wrap">
                  <span>{currentParsedFile.fileName}</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono uppercase">
                    {currentParsedFile.fileType}
                  </span>
                  <span className="text-[10px] text-emerald-400/80">
                    ({(currentParsedFile.fileSizeBytes / 1024).toFixed(0)} KB)
                  </span>
                </div>
                <div className="text-text-secondary text-[11px] flex items-center gap-2 flex-wrap">
                  <span>{currentParsedFile.date} {currentParsedFile.startTime}</span>
                  <span>•</span>
                  <span>{currentParsedFile.durationMinutes} perc</span>
                  {currentParsedFile.distanceKm !== undefined && (
                    <>
                      <span>•</span>
                      <span>{currentParsedFile.distanceKm} km</span>
                    </>
                  )}
                  {currentParsedFile.avgHeartRate !== undefined && (
                    <>
                      <span>•</span>
                      <span>{currentParsedFile.avgHeartRate} bpm</span>
                    </>
                  )}
                  {currentParsedFile.avgPowerWatts !== undefined && (
                    <>
                      <span>•</span>
                      <span>{currentParsedFile.avgPowerWatts} W</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {onClearFile && (
              <button
                type="button"
                onClick={onClearFile}
                title="Fájl eltávolítása"
                className="text-text-secondary hover:text-text-primary p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sport Detection & Edit Chip + Load */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-emerald-500/20">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={onOpenSportPicker}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold transition-all shadow-sm"
              >
                <span>Sportág: <strong>{currentParsedFile.detectedSportNameHu || currentParsedFile.sportId}</strong></span>
                <span className="text-[10px] text-emerald-400 underline ml-0.5">módosítás</span>
              </button>

              {currentParsedFile.computedLoad !== undefined && (
                <span className="text-[11px] font-mono text-emerald-300/90 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                  Terhelés: <strong>{currentParsedFile.computedLoad} AU</strong> ({currentParsedFile.loadSourceLabelHu || "becsült"})
                </span>
              )}
            </div>

            {/* Found channels badges */}
            {currentParsedFile.channels && (
              <div className="flex items-center gap-1 flex-wrap text-[10px] font-mono">
                {currentParsedFile.channels.hasHr && (
                  <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">Pulzus</span>
                )}
                {currentParsedFile.channels.hasSpeed && (
                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Sebesség</span>
                )}
                {currentParsedFile.channels.hasPower && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Watt</span>
                )}
                {currentParsedFile.channels.hasElevation && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Szint</span>
                )}
                {currentParsedFile.channels.hasCadence && (
                  <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">Kadencia</span>
                )}
                {currentParsedFile.channels.hasGps && (
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">GPS</span>
                )}
              </div>
            )}
          </div>

          {/* Hungarian Anomaly / Parsing Warnings */}
          {currentParsedFile.warningsHu && currentParsedFile.warningsHu.length > 0 && (
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-1 text-[11px] text-amber-300">
              {currentParsedFile.warningsHu.map((warn, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                  <span>{warn}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : compact ? (
        /* Compact dropzone button */
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleClickPicker}
            disabled={isLoading}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`w-full py-2 px-3 rounded-xl border border-dashed text-xs font-medium flex items-center justify-center gap-2 transition-all ${
              isDragging
                ? "border-brand-primary bg-brand-500/10 text-brand-primary"
                : "border-border-subtle bg-bg-surface hover:bg-bg-elevated hover:border-brand-primary/50 text-text-secondary hover:text-text-primary"
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-primary" />
            ) : (
              <Upload className="w-3.5 h-3.5 text-brand-primary" />
            )}
            <span>{isLoading ? "Beolvasás folyamatban..." : label}</span>
          </button>
          {error && (
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      ) : (
        /* Full dropzone box */
        <div className="space-y-2">
          <div
            onClick={handleClickPicker}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`p-4 rounded-xl border-2 border-dashed cursor-pointer text-center transition-all ${
              isDragging
                ? "border-brand-primary bg-brand-500/10"
                : "border-border-subtle hover:border-brand-primary/60 bg-bg-surface/60 hover:bg-bg-elevated"
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-1.5">
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-brand-500/10 text-brand-primary flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
              )}
              <div className="text-xs font-medium text-text-primary">
                {isLoading ? "Fájl beolvasása..." : label}
              </div>
              <div className="text-[11px] text-text-secondary">
                Húzd ide a fájlt vagy kattints a tallózáshoz (max. 25 MB)
              </div>
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
