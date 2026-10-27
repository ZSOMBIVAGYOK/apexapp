import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Button, SegmentedControl, Slider, Toggle, Chip, showToast } from "@shared/ui";
import { CompletedSessionDocument } from "@shared/types/dataModel";
import {
  OverlayData,
  VideoExportOptions,
  VideoExportProgress,
  VideoExportResult,
  VideoFraming,
  VideoLayoutPreset,
  VideoMetadata,
  VideoResolution,
  VideoTrim,
  exportTelemetryVideo,
  getLiveWorkoutData,
  parseMp4File,
  drawVideoOverlay,
  formatTabularDuration
} from "@shared/lib/share";
import { parseWorkoutFile } from "@shared/lib/devices/workoutFileService";
import {
  Video as VideoIcon,
  Clock,
  Sparkles,
  Layers,
  Share2,
  Download,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  FilePlus,
  Shield,
  Gauge,
  LayoutTemplate,
  Crosshair,
  ChevronRight,
  ChevronLeft
} from "lucide-react";

export interface VideoShareWizardProps {
  session: CompletedSessionDocument;
  overlayData: OverlayData;
  athleteName?: string;
  onAttachFileClick?: () => void;
  onSessionUpdated?: (session: CompletedSessionDocument) => void;
}

const MAX_VIDEO_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB
const DEFAULT_MAX_CLIP_DURATION = 60; // 60 seconds default
const HARD_MAX_CLIP_DURATION = 120; // 120 seconds hard limit

export const VideoShareWizard: React.FC<VideoShareWizardProps> = ({
  session,
  overlayData,
  athleteName: _athleteName,
  onAttachFileClick,
  onSessionUpdated
}) => {

  // Wizard Step: 1 = Video Pick, 2 = Sync, 3 = Data & Style, 4 = Preview & Export
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // TimeSeries check
  const rawPoints = useMemo(() => {
    return session.timeSeries?.points || [];
  }, [session.timeSeries?.points]);

  const hasTimeSeries = rawPoints.length > 0;
  const sessionDurationSec = Math.max(
    1,
    session.durationSeconds || session.durationMinutes * 60 || rawPoints[rawPoints.length - 1]?.timeOffsetSeconds || 3600
  );

  // STEP 1 STATE: Video File & Meta
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const workoutFileInputRef = useRef<HTMLInputElement | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoMeta, setVideoMeta] = useState<VideoMetadata | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);

  // STEP 2 STATE: Sync & Trimming
  const [workoutOffsetSec, setWorkoutOffsetSec] = useState<number>(0);
  const [autoSuggestion, setAutoSuggestion] = useState<{ offset: number; text: string } | null>(null);
  const [videoScrubTime, setVideoScrubTime] = useState<number>(0);
  const [workoutScrubTime, setWorkoutScrubTime] = useState<number>(0);
  const [trim, setTrim] = useState<VideoTrim>({ startSec: 0, endSec: 60 });

  // STEP 3 STATE: Layout & Metrics Customization
  const [layout, setLayout] = useState<VideoLayoutPreset>("bottom_bar");
  const [framing, setFraming] = useState<VideoFraming>("original");
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [introCard, setIntroCard] = useState(true);
  const [outroCard, setOutroCard] = useState(true);
  const [dimming, setDimming] = useState(0.3);
  const [showBranding, setShowBranding] = useState(true);

  // Live Metrics selection
  // Heart rate is strictly FALSE by default for health data privacy
  const [metrics, setMetrics] = useState({
    speedPace: true,
    heartRate: false,
    distance: true,
    elapsedTime: true,
    elevation: true,
    grade: true,
    power: true,
    cadence: true,
    routeDot: overlayData.hasGps,
    elevationDot: true
  });

  // STEP 4 STATE: Live Playback & Exporting
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [resolution, setResolution] = useState<VideoResolution>("1080p");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<VideoExportProgress | null>(null);
  const [exportResult, setExportResult] = useState<VideoExportResult | null>(null);
  const exportAbortControllerRef = useRef<AbortController | null>(null);

  // Video object URL cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (exportResult?.url) URL.revokeObjectURL(exportResult.url);
    };
  }, [videoUrl, exportResult?.url]);

  // Handle Video Selection
  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoError(null);
    setVideoMeta(null);

    // 1. File size check
    if (file.size > MAX_VIDEO_FILE_SIZE_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(0);
      setVideoError(
        `A videó mérete meghaladja a maximális 500 MB-os határt (jelenlegi méret: ${mb} MB). Kérjük, válassz egy rövidebb vagy tömörített videót.`
      );
      return;
    }

    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);

    // 2. Extract QuickTime / MP4 metadata (creation date, rotation)
    const meta = await parseMp4File(file);

    // 3. Load in hidden video element to verify codec and dimensions
    const testVideo = document.createElement("video");
    testVideo.preload = "metadata";
    testVideo.src = url;

    testVideo.onloadedmetadata = () => {
      const duration = testVideo.duration || meta.duration || 10;
      const width = testVideo.videoWidth || 1920;
      const height = testVideo.videoHeight || 1080;

      if (duration < 2) {
        setVideoError("A videónak legalább 2 másodperc hosszúnak kell lennie.");
        return;
      }

      const parsedMeta: VideoMetadata = {
        duration,
        width,
        height,
        aspectRatio: width / height,
        creationDate: meta.creationDate,
        rotation: meta.rotation || 0,
        sizeBytes: file.size,
        mimeType: file.type || "video/mp4"
      };

      setVideoMeta(parsedMeta);
      setTrim({
        startSec: 0,
        endSec: Math.min(duration, DEFAULT_MAX_CLIP_DURATION)
      });

      // 4. Calculate auto-suggestion if creationDate matches session
      if (meta.creationDate && session.startTime) {
        try {
          const sessionStart = new Date(session.startTime).getTime();
          const videoStart = meta.creationDate.getTime();
          const diffSec = Math.round((videoStart - sessionStart) / 1000);

          if (diffSec >= 0 && diffSec <= sessionDurationSec) {
            setAutoSuggestion({
              offset: diffSec,
              text: `A videó metaadatai alapján a felvétel az edzés ${formatTabularDuration(diffSec)} percében készült.`
            });
            setWorkoutOffsetSec(diffSec);
          }
        } catch {
          // ignore date parse mismatch
        }
      }
    };

    testVideo.onerror = () => {
      setVideoError(
        "A böngésző nem tudja közvetlenül dekódolni ezt a videóformátumot (pl. HDR vagy HEVC). Kérjük, rögzítsd 'Leginkább kompatibilis' módban az iPhone-odon, vagy exportáld standard MP4 (H.264) formátumban."
      );
    };
  };

  // Handle Workout File Attachment if session lacks time series
  const handleWorkoutFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingFile(true);
    try {
      const res = await parseWorkoutFile(file);
      const updated: CompletedSessionDocument = {
        ...session,
        timeSeries: res.timeSeries,
        metrics: {
          ...session.metrics,
          avgHeartRate: res.avgHeartRate ?? session.metrics?.avgHeartRate,
          maxHeartRate: res.maxHeartRate ?? session.metrics?.maxHeartRate,
          distanceMeters: res.distanceKm ? res.distanceKm * 1000 : session.metrics?.distanceMeters,
          elevationGainMeters: res.elevationGainMeters ?? session.metrics?.elevationGainMeters,
          avgPowerWatts: res.avgPowerWatts ?? session.metrics?.avgPowerWatts
        }
      };

      if (onSessionUpdated) {
        onSessionUpdated(updated);
      }

      showToast({
        title: "Fájl sikeresen csatolva!",
        message: `${res.fileName} (${res.timeSeries.points.length} adatpont)`,
        variant: "success"
      });
    } catch (err) {
      showToast({
        title: "Hiba a fájl feldolgozásakor",
        message: err instanceof Error ? err.message : "Nem sikerült beolvasni a fájlt.",
        variant: "error"
      });
    } finally {
      setIsParsingFile(false);
    }
  };

  // Micro-adjustment for sync
  const adjustWorkoutOffset = (deltaSec: number) => {
    setWorkoutOffsetSec((prev) => {
      const next = Math.round((prev + deltaSec) * 10) / 10;
      return Math.max(0, Math.min(sessionDurationSec, next));
    });
  };

  // Match current video moment with current workout moment
  const handleMatchMoment = () => {
    // Current video moment maps to current workout moment
    // offset = workoutScrubTime - videoScrubTime
    const calculatedOffset = Math.max(0, Math.round(workoutScrubTime - videoScrubTime));
    setWorkoutOffsetSec(calculatedOffset);
    showToast({
      title: "Szinkron beállítva!",
      message: `Edzés időeltolás: ${formatTabularDuration(calculatedOffset)}`,
      variant: "success"
    });
  };

  // Live preview canvas animation loop (Step 4 & Step 2)
  const drawPreviewFrame = useCallback(() => {
    const video = videoElementRef.current;
    const canvas = previewCanvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Draw video background
    if (framing === "original") {
      ctx.drawImage(video, 0, 0, w, h);
    } else {
      // 9:16 Aspect Fill
      const vidW = video.videoWidth || 1920;
      const vidH = video.videoHeight || 1080;
      const scale = Math.max(w / vidW, h / vidH);
      const scaledW = vidW * scale;
      const scaledH = vidH * scale;
      const dx = (w - scaledW) / 2;
      const dy = (h - scaledH) / 2;
      ctx.drawImage(video, dx, dy, scaledW, scaledH);
    }

    // Live Telemetry at current offset
    const clipElapsed = Math.max(0, video.currentTime - trim.startSec);
    const currentWorkoutTime = workoutOffsetSec + clipElapsed;
    const clipDuration = Math.max(1, trim.endSec - trim.startSec);

    const liveData = getLiveWorkoutData(rawPoints, currentWorkoutTime, {
      units: "metric"
    });

    drawVideoOverlay(ctx, {
      dimensions: { width: w, height: h, aspectRatio: framing === "9:16" ? "9:16" : "1:1" },
      layout,
      liveData,
      overlayData,
      metrics,
      videoTimeSec: clipElapsed,
      clipDurationSec: clipDuration,
      introCard,
      outroCard,
      dimming,
      showBranding,
      showSafeZones: currentStep === 3 && showSafeZones
    });
  }, [
    framing,
    trim.startSec,
    trim.endSec,
    workoutOffsetSec,
    rawPoints,
    layout,
    overlayData,
    metrics,
    introCard,
    outroCard,
    dimming,
    showBranding,
    currentStep,
    showSafeZones
  ]);

  // Setup preview canvas dimensions
  useEffect(() => {
    if (!previewCanvasRef.current || !videoMeta) return;
    const canvas = previewCanvasRef.current;
    if (framing === "9:16") {
      canvas.width = 1080;
      canvas.height = 1920;
    } else {
      canvas.width = videoMeta.width || 1920;
      canvas.height = videoMeta.height || 1080;
    }
  }, [framing, videoMeta]);

  // Animation frame loop when playing in Step 4
  useEffect(() => {
    let animId: number;

    const loop = () => {
      const video = videoElementRef.current;
      if (video && !video.paused && !video.ended) {
        // Enforce trim end
        if (video.currentTime >= trim.endSec) {
          video.currentTime = trim.startSec;
        }
        drawPreviewFrame();
        animId = requestAnimationFrame(loop);
      }
    };

    if (isPlaying) {
      animId = requestAnimationFrame(loop);
    } else {
      drawPreviewFrame();
    }

    return () => cancelAnimationFrame(animId);
  }, [isPlaying, drawPreviewFrame, trim.startSec, trim.endSec]);

  // Toggle Play / Pause in preview
  const togglePlay = () => {
    const video = videoElementRef.current;
    if (!video) return;

    if (video.paused) {
      if (video.currentTime >= trim.endSec) {
        video.currentTime = trim.startSec;
      }
      video
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  // Run Export
  const handleExport = async () => {
    const video = videoElementRef.current;
    if (!video || !videoMeta) return;

    setIsExporting(true);
    setExportProgress({ progress: 0, currentSec: 0, totalSec: trim.endSec - trim.startSec });

    const abortController = new AbortController();
    exportAbortControllerRef.current = abortController;

    try {
      const exportOpts: VideoExportOptions = {
        resolution,
        format: "video/mp4",
        layout,
        framing,
        metrics,
        trim,
        workoutOffsetSec,
        introCard,
        outroCard,
        dimming,
        showBranding
      };

      const result = await exportTelemetryVideo(
        video,
        overlayData,
        exportOpts,
        (p) => setExportProgress(p),
        abortController.signal
      );

      setExportResult(result);
      showToast({
        title: "Videó sikeresen elkészült!",
        message: `${result.filename} (${result.resolution})`,
        variant: "success"
      });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        showToast({
          title: "Exportálás megszakítva",
          variant: "info"
        });
      } else {
        showToast({
          title: "Hiba az exportálás során",
          message: err instanceof Error ? err.message : "Nem sikerült legenerálni a videót.",
          variant: "error"
        });
      }
    } finally {
      setIsExporting(false);
      setExportProgress(null);
      exportAbortControllerRef.current = null;
    }
  };

  // Cancel ongoing export
  const handleCancelExport = () => {
    if (exportAbortControllerRef.current) {
      exportAbortControllerRef.current.abort();
    }
  };

  // Share or Download finished video
  const handleShareVideo = async () => {
    if (!exportResult) return;

    const file = new File([exportResult.blob], exportResult.filename, {
      type: exportResult.blob.type || "video/mp4"
    });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `${overlayData.title} - Apex`,
          text: `${overlayData.sportName} · ${overlayData.dateFormatted}`
        });
        showToast({ title: "Videó megosztva!", variant: "success" });
        return;
      } catch {
        // Fallback to download if cancelled or failed
      }
    }

    // Direct download fallback
    handleDownloadVideo();
  };

  const handleDownloadVideo = () => {
    if (!exportResult) return;
    const a = document.createElement("a");
    a.href = exportResult.url;
    a.download = exportResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast({ title: "Videó letöltve!", variant: "success" });
  };

  // Overlap warning check
  const isVideoOutsideWorkout =
    workoutOffsetSec < 0 || workoutOffsetSec > sessionDurationSec;

  // Live telemetry values at synchronized moment for preview
  const livePreviewData = useMemo(() => {
    return getLiveWorkoutData(rawPoints, workoutOffsetSec + videoScrubTime, {
      units: "metric"
    });
  }, [rawPoints, workoutOffsetSec, videoScrubTime]);

  return (
    <div className="space-y-5">
      {/* Hidden Video Player for processing and frame capture */}
      {videoUrl && (
        <video
          ref={videoElementRef}
          src={videoUrl}
          playsInline
          muted={isMuted}
          className="hidden"
          onTimeUpdate={() => {
            if (!isPlaying) drawPreviewFrame();
          }}
          onSeeked={() => drawPreviewFrame()}
        />
      )}

      {/* 4-Step Wizard Stepper Header */}
      <div className="flex items-center justify-between px-1 pt-1 pb-2 border-b border-border-hairline text-xs font-semibold text-text-secondary">
        {[
          { step: 1, label: "1. Videó" },
          { step: 2, label: "2. Szinkron" },
          { step: 3, label: "3. Adatok & Stílus" },
          { step: 4, label: "4. Export" }
        ].map((item) => (
          <button
            key={item.step}
            type="button"
            disabled={!videoMeta && item.step > 1}
            onClick={() => setCurrentStep(item.step as 1 | 2 | 3 | 4)}
            className={`flex items-center gap-1.5 transition-colors ${
              currentStep === item.step
                ? "text-brand-400 font-bold"
                : currentStep > item.step
                ? "text-text-primary"
                : "text-text-tertiary cursor-not-allowed opacity-60"
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                currentStep === item.step
                  ? "bg-brand-500 text-black font-bold"
                  : currentStep > item.step
                  ? "bg-bg-surface-elevated text-text-primary"
                  : "bg-bg-surface text-text-tertiary"
              }`}
            >
              {item.step}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: VIDEÓ KIVÁLASZTÁSA                                                */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="space-y-4">
          {!hasTimeSeries ? (
            /* Friendly Explanation & Attach Action if session has no time series */
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-amber-300">
                    Idősoros adatok szükségesek
                  </h4>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    A videó szinkronizálásához és az élő telemetria (pulzus, sebesség, teljesítmény, magasság és GPS nyomvonal) ráillesztéséhez rögzített idősoros adatok szükségesek.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  leftIcon={<FilePlus className="w-4 h-4" />}
                  isLoading={isParsingFile}
                  onClick={() => {
                    if (onAttachFileClick) {
                      onAttachFileClick();
                    } else {
                      workoutFileInputRef.current?.click();
                    }
                  }}
                >
                  Fájl csatolása (FIT, GPX, TCX)
                </Button>
                <input
                  ref={workoutFileInputRef}
                  type="file"
                  accept=".fit,.gpx,.tcx"
                  className="hidden"
                  onChange={handleWorkoutFileSelect}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Privacy Notice Badge */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-surface border border-border-hairline text-xs text-text-secondary">
                <Shield className="w-4 h-4 text-brand-400 flex-shrink-0" />
                <span>Minden feldolgozás helyben, a készülékeden történik. A videó soha nem kerül feltöltésre külső szerverre.</span>
              </div>

              {/* Video File Picker Dropzone */}
              {!videoFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-8 border-2 border-dashed border-border-hairline hover:border-brand-500/50 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors bg-bg-surface/50 text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-brand-500/15 flex items-center justify-center text-brand-400">
                    <VideoIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary">
                      Videó kiválasztása vagy rögzítés
                    </h4>
                    <p className="text-xs text-text-secondary mt-1">
                      Válassz videót a galériából vagy készíts új felvételt (MP4 / MOV, max. 500 MB).
                    </p>
                  </div>
                  <Button type="button" variant="secondary" size="sm" className="mt-2">
                    Fájl tallózása
                  </Button>
                </div>
              ) : (
                /* Selected Video Details Card */
                <div className="p-4 rounded-2xl bg-bg-surface border border-border-hairline space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center text-brand-400">
                        <VideoIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-text-primary truncate max-w-[220px]">
                          {videoFile.name}
                        </h4>
                        <p className="text-xs text-text-secondary">
                          {(videoFile.size / (1024 * 1024)).toFixed(1)} MB ·{" "}
                          {videoMeta ? `${formatTabularDuration(videoMeta.duration)}` : "Betöltés..."}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Csere
                    </Button>
                  </div>

                  {videoMeta && (
                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border-hairline text-text-secondary">
                      <div>Felbontás: <span className="text-text-primary font-mono">{videoMeta.width}x{videoMeta.height}</span></div>
                      <div>Tájolás: <span className="text-text-primary font-mono">{videoMeta.rotation || 0}°</span></div>
                      {videoMeta.creationDate && (
                        <div className="col-span-2">
                          Felvétel ideje: <span className="text-text-primary">{videoMeta.creationDate.toLocaleTimeString("hu-HU")}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleVideoSelect}
              />

              {/* Error Banner */}
              {videoError && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{videoError}</p>
                </div>
              )}

              {/* Next Button */}
              {videoMeta && !videoError && (
                <div className="pt-2 flex justify-end">
                  <Button
                    type="button"
                    variant="primary"
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                    onClick={() => setCurrentStep(2)}
                  >
                    Tovább a szinkronhoz
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: SZINKRON (THE HEART OF THE FEATURE)                               */}
      {/* ========================================================================= */}
      {currentStep === 2 && videoMeta && (
        <div className="space-y-4">
          {/* Auto-Suggestion Banner */}
          {autoSuggestion && (
            <div className="p-3.5 rounded-xl bg-brand-500/10 border border-brand-500/30 space-y-2">
              <div className="flex items-start gap-2 text-xs text-brand-300">
                <Sparkles className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Automatikus felismerés:</span> {autoSuggestion.text}
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-text-tertiary pt-1 border-t border-brand-500/20">
                <span>Ez egy javaslat; ellenőrizd az alábbi finomhangolással.</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 text-[11px] px-2"
                  onClick={() => setWorkoutOffsetSec(autoSuggestion.offset)}
                >
                  Alkalmazás
                </Button>
              </div>
            </div>
          )}

          {/* Overlap Warning */}
          {isVideoOutsideWorkout && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>A videó időtartama kívül esik a rögzített edzés idején.</span>
            </div>
          )}

          {/* Video Scrubbing & Matcher */}
          <div className="p-3.5 rounded-2xl bg-bg-surface border border-border-hairline space-y-3">
            {/* Video Scrubber */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-text-secondary flex items-center gap-1">
                  <VideoIcon className="w-3.5 h-3.5 text-brand-400" /> Videó pillanat
                </span>
                <span className="font-mono text-text-primary">
                  {formatTabularDuration(videoScrubTime)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={videoMeta.duration}
                step={0.1}
                value={videoScrubTime}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVideoScrubTime(val);
                  if (videoElementRef.current) {
                    videoElementRef.current.currentTime = val;
                  }
                }}
                className="w-full accent-brand-500 cursor-pointer"
              />
            </div>

            {/* Workout Timeline Scrubber */}
            <div className="space-y-1 pt-2 border-t border-border-hairline">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-text-secondary flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" /> Edzés pillanat
                </span>
                <span className="font-mono text-emerald-400 font-bold">
                  {formatTabularDuration(workoutScrubTime)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={sessionDurationSec}
                step={1}
                value={workoutScrubTime}
                onChange={(e) => setWorkoutScrubTime(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Match Moment Action */}
            <div className="pt-2 flex justify-center">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<Crosshair className="w-4 h-4 text-brand-400" />}
                onClick={handleMatchMoment}
              >
                Ez a pillanat ({formatTabularDuration(videoScrubTime)} ➔ {formatTabularDuration(workoutScrubTime)})
              </Button>
            </div>
          </div>

          {/* Micro-Adjustment Buttons & Live Values Preview */}
          <div className="p-3.5 rounded-2xl bg-bg-surface border border-border-hairline space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-text-secondary">Finomhangolás (edzés eltolás)</span>
              <span className="font-mono font-bold text-text-primary">
                {formatTabularDuration(workoutOffsetSec)} ({workoutOffsetSec}s)
              </span>
            </div>

            <div className="flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2.5 font-mono text-xs"
                onClick={() => adjustWorkoutOffset(-1.0)}
              >
                -1.0s
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2 font-mono text-xs"
                onClick={() => adjustWorkoutOffset(-0.1)}
              >
                -0.1s
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2 font-mono text-xs"
                onClick={() => adjustWorkoutOffset(0.1)}
              >
                +0.1s
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2.5 font-mono text-xs"
                onClick={() => adjustWorkoutOffset(1.0)}
              >
                +1.0s
              </Button>
            </div>

            {/* Live values at synced frame */}
            <div className="p-2.5 rounded-xl bg-black/40 border border-border-hairline grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <div className="text-[10px] text-text-tertiary">SEBESSÉG / TEMPÓ</div>
                <div className="font-bold text-text-primary font-mono mt-0.5">
                  {livePreviewData.speedFormatted || livePreviewData.paceFormatted || "--"}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-text-tertiary">PULZUS</div>
                <div className="font-bold text-brand-400 font-mono mt-0.5">
                  {livePreviewData.heartRateFormatted ? `${livePreviewData.heartRateFormatted} bpm` : "--"}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-text-tertiary">TÁVOLSÁG</div>
                <div className="font-bold text-text-primary font-mono mt-0.5">
                  {livePreviewData.distanceFormatted ? `${livePreviewData.distanceFormatted} km` : "--"}
                </div>
              </div>
            </div>
          </div>

          {/* Clip Trimming Card */}
          <div className="p-3.5 rounded-2xl bg-bg-surface border border-border-hairline space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-text-secondary">Exportálandó klip hossza</span>
              <span className="font-mono text-brand-400 font-bold">
                {Math.round(trim.endSec - trim.startSec)} mp
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-text-tertiary">Kezdés (mp):</label>
                <input
                  type="number"
                  min={0}
                  max={Math.max(0, trim.endSec - 2)}
                  value={Math.round(trim.startSec)}
                  onChange={(e) => {
                    const start = Math.max(0, parseFloat(e.target.value) || 0);
                    setTrim((prev) => ({ ...prev, startSec: start }));
                  }}
                  className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-bg-surface-elevated border border-border-hairline font-mono text-text-primary"
                />
              </div>
              <div>
                <label className="text-text-tertiary">Vége (mp):</label>
                <input
                  type="number"
                  min={trim.startSec + 2}
                  max={Math.min(videoMeta.duration, trim.startSec + HARD_MAX_CLIP_DURATION)}
                  value={Math.round(trim.endSec)}
                  onChange={(e) => {
                    const end = Math.min(
                      videoMeta.duration,
                      Math.max(trim.startSec + 2, parseFloat(e.target.value) || 0)
                    );
                    setTrim((prev) => ({ ...prev, endSec: end }));
                  }}
                  className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-bg-surface-elevated border border-border-hairline font-mono text-text-primary"
                />
              </div>
            </div>
            <p className="text-[11px] text-text-tertiary">
              A telefonok hardveres teljesítménye és a zökkenőmentes megosztás érdekében a maximális hossz 120 másodperc.
            </p>
          </div>

          {/* Navigation */}
          <div className="pt-2 flex justify-between">
            <Button
              type="button"
              variant="outline"
              leftIcon={<ChevronLeft className="w-4 h-4" />}
              onClick={() => setCurrentStep(1)}
            >
              Vissza
            </Button>
            <Button
              type="button"
              variant="primary"
              rightIcon={<ChevronRight className="w-4 h-4" />}
              onClick={() => setCurrentStep(3)}
            >
              Tovább az adatokhoz
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: ADATOK ÉS STÍLUS                                                  */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div className="space-y-4">
          {/* Layout Presets (4 cards) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-secondary uppercase">
              Elrendezési sablon
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                {
                  id: "bottom_bar",
                  title: "Alsó sáv",
                  desc: "Elegáns sáv a képernyő alján a kulcsadatokkal",
                  icon: <LayoutTemplate className="w-4 h-4" />
                },
                {
                  id: "corner",
                  title: "Sarok",
                  desc: "Kompakt sarok-HUD, szabadon hagyva a videó közepét",
                  icon: <Layers className="w-4 h-4" />
                },
                {
                  id: "minimal",
                  title: "Minimál",
                  desc: "Óriási sebesség/tempó szám feliratok nélkül",
                  icon: <Gauge className="w-4 h-4" />
                },
                {
                  id: "race",
                  title: "Verseny",
                  desc: "Akciókamera műszerfal műszerrel és mozgó GPS ponttal",
                  icon: <Crosshair className="w-4 h-4" />
                }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setLayout(item.id as VideoLayoutPreset)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    layout === item.id
                      ? "border-brand-500 bg-brand-500/15 ring-1 ring-brand-500/30"
                      : "border-border-hairline bg-bg-surface hover:bg-bg-surface-elevated"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={layout === item.id ? "text-brand-400" : "text-text-tertiary"}>
                      {item.icon}
                    </span>
                    <span className="text-xs font-bold text-text-primary">{item.title}</span>
                  </div>
                  <p className="text-[11px] text-text-secondary mt-1 leading-snug">
                    {item.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Live Metrics Pill Toggles */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-secondary uppercase">
              Élő telemetria elemek
            </label>
            <div className="flex flex-wrap gap-2">
              <Chip
                selected={metrics.speedPace}
                onClick={() => setMetrics((m) => ({ ...m, speedPace: !m.speedPace }))}
              >
                Sebesség / Tempó
              </Chip>
              <Chip
                selected={metrics.heartRate}
                onClick={() => setMetrics((m) => ({ ...m, heartRate: !m.heartRate }))}
              >
                Pulzus és Zóna
              </Chip>
              <Chip
                selected={metrics.distance}
                onClick={() => setMetrics((m) => ({ ...m, distance: !m.distance }))}
              >
                Távolság
              </Chip>
              <Chip
                selected={metrics.elapsedTime}
                onClick={() => setMetrics((m) => ({ ...m, elapsedTime: !m.elapsedTime }))}
              >
                Eltelt idő
              </Chip>
              <Chip
                selected={metrics.elevation}
                onClick={() =>
                  setMetrics((m) => ({ ...m, elevation: !m.elevation, grade: !m.grade }))
                }
              >
                Magasság & Emelkedő
              </Chip>
              <Chip
                selected={metrics.power}
                onClick={() => setMetrics((m) => ({ ...m, power: !m.power }))}
              >
                Teljesítmény (W)
              </Chip>
              {overlayData.hasGps && (
                <Chip
                  selected={metrics.routeDot}
                  onClick={() => setMetrics((m) => ({ ...m, routeDot: !m.routeDot }))}
                >
                  Mozgó GPS pont
                </Chip>
              )}
            </div>

            {/* Privacy notice for heart rate */}
            {!metrics.heartRate && (
              <p className="text-[11px] text-text-tertiary italic">
                🛡️ A pulzus egészségügyi adat: alapértelmezetten kikapcsolva az adatvédelem érdekében.
              </p>
            )}
          </div>

          {/* Framing & Safe Zones */}
          <div className="p-3.5 rounded-2xl bg-bg-surface border border-border-hairline space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase">
                Képarány
              </label>
              <SegmentedControl<VideoFraming>
                options={[
                  { value: "original", label: "Eredeti videó" },
                  { value: "9:16", label: "9:16 (Stories / Reels / TikTok)" }
                ]}
                value={framing}
                onChange={(f) => setFraming(f)}
                fullWidth
              />
            </div>

            <div className="pt-2 border-t border-border-hairline space-y-2">
              <Toggle
                label="Instagram / TikTok biztonsági zónák mutatása"
                checked={showSafeZones}
                onChange={(val) => setShowSafeZones(val)}
              />
              <Toggle
                label="Felvezető címkártya (első 1.5 mp)"
                checked={introCard}
                onChange={(val) => setIntroCard(val)}
              />
              <Toggle
                label="Záró összegző kártya (utolsó 2 mp)"
                checked={outroCard}
                onChange={(val) => setOutroCard(val)}
              />
              <Toggle
                label="APEX logó felirat"
                checked={showBranding}
                onChange={(val) => setShowBranding(val)}
              />
            </div>

            {/* Scrim dimming slider */}
            <div className="pt-2 border-t border-border-hairline space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-text-secondary font-semibold">Háttér sötétítése (kontraszt)</span>
                <span className="text-text-primary font-mono">{Math.round(dimming * 100)}%</span>
              </div>
              <Slider
                value={dimming}
                min={0}
                max={0.7}
                step={0.05}
                onChange={(val) => setDimming(val)}
              />
            </div>
          </div>

          {/* Navigation */}
          <div className="pt-2 flex justify-between">
            <Button
              type="button"
              variant="outline"
              leftIcon={<ChevronLeft className="w-4 h-4" />}
              onClick={() => setCurrentStep(2)}
            >
              Vissza
            </Button>
            <Button
              type="button"
              variant="primary"
              rightIcon={<ChevronRight className="w-4 h-4" />}
              onClick={() => setCurrentStep(4)}
            >
              Tovább az előnézethez
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: ELŐNÉZET ÉS EXPORT                                                */}
      {/* ========================================================================= */}
      {currentStep === 4 && (
        <div className="space-y-4">
          {/* Live Preview Canvas Player */}
          <div className="relative group mx-auto flex items-center justify-center p-2 rounded-2xl bg-black border border-border-hairline overflow-hidden">
            <canvas
              ref={previewCanvasRef}
              className={`block max-h-[340px] sm:max-h-[380px] w-auto rounded-xl select-none touch-none ${
                framing === "9:16" ? "aspect-[9/16]" : "aspect-video"
              }`}
            />

            {/* Overlay play button */}
            {!isPlaying && (
              <button
                type="button"
                onClick={togglePlay}
                className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-black/60 backdrop-blur border border-white/20 flex items-center justify-center text-white hover:scale-105 transition-transform"
                aria-label="Lejátszás"
              >
                <Play className="w-6 h-6 ml-1 fill-white" />
              </button>
            )}
          </div>

          {/* Playback Controls Bar */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-bg-surface border border-border-hairline">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={togglePlay}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => {
                  if (videoElementRef.current) {
                    videoElementRef.current.currentTime = trim.startSec;
                    drawPreviewFrame();
                  }
                }}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setIsMuted((m) => !m)}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
            </div>

            <div className="text-xs font-mono text-text-secondary">
              Hossz: {Math.round(trim.endSec - trim.startSec)}s · {resolution}
            </div>
          </div>

          {/* Export Settings */}
          {!exportResult && !isExporting && (
            <div className="p-3.5 rounded-2xl bg-bg-surface border border-border-hairline space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase">
                  Export felbontás
                </label>
                <SegmentedControl<VideoResolution>
                  options={[
                    { value: "1080p", label: "1080p (Full HD - Ajánlott)" },
                    { value: "720p", label: "720p (HD - Gyorsabb)" }
                  ]}
                  value={resolution}
                  onChange={(r) => setResolution(r)}
                  fullWidth
                />
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  className="w-full text-sm font-bold shadow-lg shadow-brand-500/20"
                  leftIcon={<Sparkles className="w-4 h-4" />}
                  onClick={handleExport}
                >
                  Videó készítése ({resolution})
                </Button>
              </div>
            </div>
          )}

          {/* Progress Bar during Export */}
          {isExporting && (
            <div className="p-4 rounded-2xl bg-bg-surface border border-border-hairline space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-text-primary flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-400 animate-ping" />
                  Készül a videó... {exportProgress?.progress || 0}%
                </span>
                {exportProgress?.estimatedRemainingSec && (
                  <span className="font-mono text-text-tertiary">
                    Kb. {exportProgress.estimatedRemainingSec} mp van hátra
                  </span>
                )}
              </div>

              <div className="w-full h-2 rounded-full bg-bg-surface-elevated overflow-hidden">
                <div
                  className="h-full bg-brand-500 transition-all duration-300"
                  style={{ width: `${exportProgress?.progress || 0}%` }}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-text-tertiary">
                  📱 A képernyő ébren marad az exportálás alatt.
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-red-400 border-red-500/30"
                  onClick={handleCancelExport}
                >
                  Mégse
                </Button>
              </div>
            </div>
          )}

          {/* Finished Export Result Card */}
          {exportResult && (
            <div className="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/30 space-y-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center text-brand-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-text-primary">
                    A videó elkészült!
                  </h4>
                  <p className="text-xs text-text-secondary">
                    {exportResult.filename} · {exportResult.resolution} · {Math.round(exportResult.durationSec)}s
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  leftIcon={<Share2 className="w-4 h-4" />}
                  onClick={handleShareVideo}
                >
                  Megosztás
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  leftIcon={<Download className="w-4 h-4" />}
                  onClick={handleDownloadVideo}
                >
                  Letöltés
                </Button>
              </div>

              <div className="pt-1 flex justify-center">
                <button
                  type="button"
                  onClick={() => setExportResult(null)}
                  className="text-xs text-text-tertiary hover:text-text-primary underline"
                >
                  Újra szerkesztés
                </button>
              </div>
            </div>
          )}

          {/* Back Navigation */}
          {!isExporting && (
            <div className="pt-2 flex justify-start">
              <Button
                type="button"
                variant="outline"
                leftIcon={<ChevronLeft className="w-4 h-4" />}
                onClick={() => setCurrentStep(3)}
              >
                Vissza az adatokhoz
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
