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
  Share2
} from "lucide-react";
import { SessionShareModal } from "./SessionShareModal";
import { SessionMultiChannelCharts } from "./charts/SessionMultiChannelCharts";

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
