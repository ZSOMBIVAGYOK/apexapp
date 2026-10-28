import React, { useState } from "react";
import { BottomSheet, Button, Badge, showToast } from "@shared/ui";
import { CompletedSessionDocument } from "@shared/types/dataModel";
import { getSportById } from "@shared/lib/sports";
import { WorkoutFileDropzone } from "./WorkoutFileDropzone";
import {
  ParsedWorkoutFileResult,
  mergeFileIntoSession,
  uploadWorkoutFile
} from "@shared/lib/devices/workoutFileService";
import { persistTrainingSession } from "@shared/lib/offline/offlineStorage";
import { recomputeEquipmentTotals } from "@shared/lib/equipment";
import { getLocalSessions } from "@shared/lib/offline/offlineStorage";
import {
  Clock,
  TrendingUp,
  Zap,
  Edit2,
  FileCheck,
  MapPin,
  Paperclip,
  Activity,
  Share2,
  Layers,
  Dumbbell,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { SessionShareModal } from "./SessionShareModal";
import { SessionMultiChannelCharts } from "./charts/SessionMultiChannelCharts";
import {
  getBlockTitle,
  getBlockHeaderSummary,
  calculateBlockVolume,
  calculateSessionTonnage,
  calculateBlockTimeSeriesStats,
  formatDurationMmSs
} from "@shared/lib/blocks";

interface SessionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: CompletedSessionDocument | null;
  athleteId: string;
  onEditSession?: (session: CompletedSessionDocument) => void;
  onSessionUpdated?: (updated: CompletedSessionDocument) => void;
}

export const SessionDetailModal: React.FC<SessionDetailModalProps> = ({
  isOpen,
  onClose,
  session,
  athleteId,
  onEditSession,
  onSessionUpdated
}) => {
  const [isAttachingFile, setIsAttachingFile] = useState(false);
  const [isSavingFile, setIsSavingFile] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(null);
  const [isBlocksListExpanded, setIsBlocksListExpanded] = useState<boolean>(true);

  if (!session) return null;

  const sportDef = getSportById(session.sport);
  const sportName = sportDef ? sportDef.nameHu : session.sport;
  const timeSeries = session.timeSeries?.points || [];

  const handleFileAttach = async (parsed: ParsedWorkoutFileResult, file: File) => {
    setIsSavingFile(true);
    try {
      const storageRef = await uploadWorkoutFile(athleteId, session.sessionId, file, parsed.fileName);
      const merged = mergeFileIntoSession(session, parsed, storageRef);

      await persistTrainingSession(merged);
      const allSess = getLocalSessions(athleteId);
      await recomputeEquipmentTotals(athleteId, allSess);

      onSessionUpdated?.(merged);
      setIsAttachingFile(false);
      showToast({
        title: "Fájl sikeresen csatolva",
        message: `${parsed.fileName} adatai összefésülve az edzéssel.`,
        variant: "success"
      });
    } catch {
      showToast({
        title: "Hiba fájl csatolásakor",
        variant: "error"
      });
    } finally {
      setIsSavingFile(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={session.title || sportName}
    >
      <div className="space-y-5 pb-6">
        {/* Header Badges */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="brand" size="md">
              {sportDef?.icon || "🏃"} {sportName}
            </Badge>
            {session.source === "file" && (
              <Badge variant="ready" size="sm">
                <FileCheck className="w-3 h-3 mr-1" />
                Fájlból importálva
              </Badge>
            )}
          </div>

          <div className="text-xs text-text-secondary font-mono">
            {session.date} • {session.startTime.includes("T") ? session.startTime.split("T")[1]?.substring(0, 5) : session.startTime}
          </div>
        </div>

        {/* Primary Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-xl bg-bg-surface border border-border-hairline">
            <div className="text-[11px] text-text-secondary flex items-center gap-1 mb-1">
              <Clock className="w-3.5 h-3.5 text-brand-primary" />
              Időtartam
            </div>
            <div className="text-16 font-bold text-text-primary">
              {session.durationMinutes} <span className="text-xs font-normal text-text-secondary">perc</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-bg-surface border border-border-hairline">
            <div className="text-[11px] text-text-secondary flex items-center gap-1 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
              Távolság
            </div>
            <div className="text-16 font-bold text-text-primary">
              {session.metrics?.distanceMeters
                ? (session.metrics.distanceMeters / 1000).toFixed(2)
                : "--"}{" "}
              <span className="text-xs font-normal text-text-secondary">km</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-bg-surface border border-border-hairline">
            <div className="text-[11px] text-text-secondary flex items-center gap-1 mb-1">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              Megerőltetés (RPE)
            </div>
            <div className="text-16 font-bold text-text-primary">
              {session.rpe ? `${session.rpe} / 10` : "--"}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-bg-surface border border-border-hairline">
            <div className="text-[11px] text-text-secondary flex items-center gap-1 mb-1">
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              Terhelés (TSS)
            </div>
            <div className="text-16 font-bold text-text-primary">
              {session.trainingLoad || "--"}
            </div>
          </div>
        </div>

        {/* Secondary Metrics Summary */}
        <div className="p-3.5 rounded-xl bg-bg-surface/60 border border-border-subtle grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {session.metrics?.avgHeartRate && (
            <div>
              <span className="text-text-secondary text-[11px] block">Átlagpulzus</span>
              <span className="font-semibold text-rose-300">
                {session.metrics.avgHeartRate} bpm
                {session.metrics.maxHeartRate && ` (max: ${session.metrics.maxHeartRate})`}
              </span>
            </div>
          )}

          {session.metrics?.avgPower && (
            <div>
              <span className="text-text-secondary text-[11px] block">Átlagteljesítmény</span>
              <span className="font-semibold text-amber-300">{session.metrics.avgPower} W</span>
            </div>
          )}

          {session.metrics?.avgPace && (
            <div>
              <span className="text-text-secondary text-[11px] block">Átlagtempó</span>
              <span className="font-semibold text-cyan-300">{session.metrics.avgPace}</span>
            </div>
          )}

          {session.metrics?.elevationGainMeters !== undefined && (
            <div>
              <span className="text-text-secondary text-[11px] block">Szintemelkedés</span>
              <span className="font-semibold text-emerald-300">+{session.metrics.elevationGainMeters} m</span>
            </div>
          )}

          {session.metrics?.calories && (
            <div>
              <span className="text-text-secondary text-[11px] block">Elégetett energia</span>
              <span className="font-semibold text-orange-300">{session.metrics.calories} kcal</span>
            </div>
          )}
        </div>

        {/* Attached File Information / Attach File Action */}
        <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 text-brand-primary" />
              Eredeti edzésfájl
            </div>

            {session.fileRef ? (
              <span className="text-[11px] text-emerald-400 font-mono">
                {session.fileName || "workout." + (session.fileType || "fit")}
              </span>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsAttachingFile(!isAttachingFile)}
              >
                {isAttachingFile ? "Mégse" : "Fájl csatolása (FIT, GPX, TCX)"}
              </Button>
            )}
          </div>

          {session.fileRef && (
            <div className="text-[11px] text-text-secondary">
              A fájl biztonságosan elmentve a Cloud Storage tárhelyre ({session.fileType?.toUpperCase()}).
            </div>
          )}

          {isAttachingFile && (
            <div className="pt-2 border-t border-neutral-800">
              <WorkoutFileDropzone
                compact
                label={isSavingFile ? "Mentés és csatolás folyamatban..." : "Tallózd be a csatolandó fájlt"}
                onFileParsed={handleFileAttach}
              />
            </div>
          )}
        </div>

        {/* Route Outline Visualization (Pure Offline SVG) */}
        {session.timeSeries?.svgRouteOutline && (
          <div className="p-4 rounded-xl bg-bg-surface border border-border-hairline space-y-2">
            <div className="text-xs font-semibold text-text-primary flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-brand-primary" />
                Útvonal körvonala (Offline SVG)
              </span>
              <span className="text-[10px] text-text-secondary">Külső térképcsempe nélkül</span>
            </div>
            <div className="bg-neutral-950 rounded-lg p-2 flex items-center justify-center border border-white/5">
              <svg viewBox="0 0 240 160" className="w-full max-h-40">
                <path
                  d={session.timeSeries.svgRouteOutline}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        )}

        {/* Training Blocks Section (Collapsible with Block Stats & Chart Highlighting) */}
        {session.blocks && session.blocks.length > 0 && (
          <div className="p-3.5 rounded-xl bg-bg-surface border border-border-hairline space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-primary" />
                <span className="text-13 font-semibold text-text-primary">
                  Edzésblokkok ({session.blocks.length})
                </span>
                {(() => {
                  const sTonnage = calculateSessionTonnage(session.blocks);
                  if (sTonnage.totalTonnageKg > 0) {
                    return (
                      <Badge variant="brand" size="sm">
                        <Dumbbell className="w-3 h-3 mr-1" />
                        {sTonnage.totalTonnageKg.toLocaleString()} kg összsúly
                      </Badge>
                    );
                  }
                  return null;
                })()}
              </div>

              <button
                type="button"
                onClick={() => setIsBlocksListExpanded(!isBlocksListExpanded)}
                className="p-1 text-text-secondary hover:text-text-primary transition-colors"
              >
                {isBlocksListExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>

            {isBlocksListExpanded && (
              <div className="space-y-2 pt-1">
                {session.blocks.map((block) => {
                  const isHighlighted = highlightedBlockId === block.id;
                  const title = getBlockTitle(block, true);
                  const summary = getBlockHeaderSummary(block, true);
                  const vol = calculateBlockVolume(block);
                  const tsStats = calculateBlockTimeSeriesStats(block, timeSeries);

                  return (
                    <div
                      key={block.id}
                      onClick={() =>
                        setHighlightedBlockId(isHighlighted ? null : block.id)
                      }
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        isHighlighted
                          ? "bg-cyan-950/25 border-cyan-500 shadow-sm"
                          : "bg-neutral-900/40 border-border-subtle hover:border-border-hairline"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-text-primary">
                            {title}
                          </span>
                          {block.label && (
                            <span className="text-[11px] text-text-secondary">
                              ({block.label})
                            </span>
                          )}
                          <span className="text-[11px] text-text-tertiary">
                            • {block.rounds || 1} kör
                            {block.completedRounds !== undefined &&
                              ` (teljesítve: ${block.completedRounds})`}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] font-mono">
                          {vol.tonnageKg > 0 && (
                            <Badge variant="outline" size="sm">
                              {vol.tonnageKg.toLocaleString()} kg ({vol.totalReps} rep)
                            </Badge>
                          )}
                          {block.timeRange && (
                            <Badge
                              variant={isHighlighted ? "brand" : "outline"}
                              size="sm"
                            >
                              {formatDurationMmSs(block.timeRange.startOffsetSeconds)} -{" "}
                              {formatDurationMmSs(block.timeRange.endOffsetSeconds)}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Header summary text */}
                      <div className="text-[11px] text-text-tertiary mt-1">
                        {summary}
                      </div>

                      {/* Per-block stats from time range */}
                      {tsStats && (
                        <div className="mt-2 pt-2 border-t border-border-hairline/40 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-text-secondary">
                          {tsStats.avgHeartRate && (
                            <div>
                              <span>Átl. pulzus:</span>{" "}
                              <strong className="text-rose-300">
                                {tsStats.avgHeartRate} bpm
                              </strong>
                            </div>
                          )}
                          {tsStats.maxHeartRate && (
                            <div>
                              <span>Max pulzus:</span>{" "}
                              <strong className="text-rose-400">
                                {tsStats.maxHeartRate} bpm
                              </strong>
                            </div>
                          )}
                          {tsStats.distanceMeters && (
                            <div>
                              <span>Távolság:</span>{" "}
                              <strong className="text-blue-300">
                                {(tsStats.distanceMeters / 1000).toFixed(2)} km
                              </strong>
                            </div>
                          )}
                          {tsStats.avgPace && (
                            <div>
                              <span>Tempó:</span>{" "}
                              <strong className="text-cyan-300">
                                {tsStats.avgPace}
                              </strong>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Rows breakdown */}
                      {block.rows && block.rows.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {block.rows.map((row) => (
                            <div
                              key={row.id}
                              className="text-[11px] flex items-center justify-between text-text-secondary bg-neutral-950/40 rounded px-2 py-0.5"
                            >
                              <div className="flex items-center gap-1.5">
                                {row.groupCode && (
                                  <span className="font-bold text-text-tertiary">
                                    {row.groupCode}:
                                  </span>
                                )}
                                <span>{row.exerciseName || row.target || "Szakasz"}</span>
                              </div>
                              <div className="font-mono text-[10px]">
                                {row.type === "exercise" ? (
                                  <span>
                                    {row.sets || 1} x {row.reps || 8} @ {row.loadKg || 0} kg
                                    {row.rpe ? ` (RPE ${row.rpe})` : ""}
                                  </span>
                                ) : (
                                  <span>
                                    {formatDurationMmSs(row.durationSeconds)}
                                    {row.distanceMeters ? ` • ${row.distanceMeters}m` : ""}
                                    {row.result ? ` (${row.result})` : ""}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Generic Multi-Channel Charts (HR with zones, Speed/Pace, Power, Cadence, Elevation, Temp) */}
        {timeSeries.length > 0 && (
          <SessionMultiChannelCharts
            sessionId={session.sessionId}
            sportId={session.sport}
            points={timeSeries}
            avgHeartRate={session.metrics?.avgHeartRate}
            maxHeartRate={session.metrics?.maxHeartRate}
            avgPowerWatts={session.metrics?.avgPowerWatts || session.metrics?.avgPower}
            avgPace={session.metrics?.avgPace}
            elevationGainMeters={session.metrics?.elevationGainMeters}
            distanceMeters={session.metrics?.distanceMeters}
            highlightRange={
              highlightedBlockId
                ? session.blocks?.find((b) => b.id === highlightedBlockId)?.timeRange || null
                : null
            }
          />
        )}

        {/* Notes */}
        {session.notes && (
          <div className="p-3 rounded-xl bg-bg-surface/40 border border-border-subtle text-xs space-y-1">
            <div className="font-semibold text-text-secondary">Megjegyzések</div>
            <p className="text-text-primary whitespace-pre-wrap">{session.notes}</p>
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex gap-2 pt-2 border-t border-border-hairline">
          <Button
            type="button"
            variant="primary"
            className="flex-1"
            leftIcon={<Share2 className="w-4 h-4" />}
            onClick={() => setIsShareOpen(true)}
          >
            Megosztás
          </Button>

          {onEditSession && (
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              leftIcon={<Edit2 className="w-4 h-4" />}
              onClick={() => {
                onClose();
                onEditSession(session);
              }}
            >
              Szerkesztés
            </Button>
          )}

          <Button type="button" variant="outline" className="px-4" onClick={onClose}>
            Bezárás
          </Button>
        </div>
      </div>

      {/* Share Modal */}
      <SessionShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        session={session}
        athleteId={athleteId}
      />
    </BottomSheet>
  );
};
