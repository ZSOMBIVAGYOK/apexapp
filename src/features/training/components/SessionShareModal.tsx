import React, { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { BottomSheet, Button, SegmentedControl, Chip, Slider, Toggle, showToast } from "@shared/ui";
import { CompletedSessionDocument } from "@shared/types/dataModel";
import { useAuthStore } from "@features/auth/authStore";
import {
  OverlayData,
  ShareBackgroundMode,
  ShareLayoutId,
  ShareAspectRatio,
  ShareCardBackground,
  ShareTextColor,
  ShareImageFormat,
  ShareMetricKey,
  CANVAS_DIMENSIONS,
  buildOverlayData,
  getInitialActiveMetrics,
  saveActiveMetricsForSport,
  drawOverlay,
  exportSessionImage,
  shareOrDownloadImage,
  loadAndDownscaleImage
} from "@shared/lib/share";
import {
  Share2,
  Download,
  Image as ImageIcon,
  Layers,
  MapPin,
  Check,
  ShieldCheck,
  Video as VideoIcon
} from "lucide-react";
import { VideoShareWizard } from "./VideoShareWizard";

export interface SessionShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: CompletedSessionDocument | null;
  athleteId: string;
  gearName?: string;
  isRecord?: boolean;
  recordTitle?: string;
}

export const SessionShareModal: React.FC<SessionShareModalProps> = ({
  isOpen,
  onClose,
  session,
  athleteId: _athleteId,
  gearName,
  isRecord,
  recordTitle
}) => {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const locale = (i18n.language.startsWith("hu") ? "hu" : "en") as "hu" | "en";
  const units = user?.units || "metric";

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Allow mutating session locally if timeSeries file is attached
  const [currentSession, setCurrentSession] = useState<CompletedSessionDocument | null>(session);
  useEffect(() => {
    setCurrentSession(session);
  }, [session]);

  // 1. Build OverlayData from session
  const overlayData: OverlayData | null = useMemo(() => {
    if (!currentSession) return null;
    return buildOverlayData(currentSession, {
      locale,
      units,
      gearName,
      isRecord,
      recordTitle
    });
  }, [currentSession, locale, units, gearName, isRecord, recordTitle]);

  // List of metric keys that actually exist for this workout
  const availableMetricKeys: ShareMetricKey[] = useMemo(() => {
    if (!overlayData) return [];
    const keys: ShareMetricKey[] = ["sportTitle", "date"];
    for (const m of overlayData.metrics) {
      keys.push(m.key);
    }
    if (overlayData.isRecord) {
      keys.push("recordBadge");
    }
    return keys;
  }, [overlayData]);

  // Mode: sticker vs photo
  const [backgroundMode, setBackgroundMode] = useState<ShareBackgroundMode>("sticker");

  // Layout choice
  const [layout, setLayout] = useState<ShareLayoutId>("compact");

  // Aspect ratio
  const [aspectRatio, setAspectRatio] = useState<ShareAspectRatio>("9:16");

  // Active metrics selection
  const [activeMetrics, setActiveMetrics] = useState<Set<ShareMetricKey>>(new Set());

  // Text color
  const [textColor, setTextColor] = useState<ShareTextColor>("auto");

  // Card background in sticker mode
  const [cardBg, setCardBg] = useState<ShareCardBackground>("none");

  // Tight crop in sticker mode
  const [tightCrop, setTightCrop] = useState(false);

  // Scrim dimming slider (0 to 0.8)
  const [dimming, setDimming] = useState(0.35);

  // Toggles
  const [showBranding, setShowBranding] = useState(true);
  const [hideStartEndGps, setHideStartEndGps] = useState(true);
  const [imageFormat, setImageFormat] = useState<ShareImageFormat>("image/png");

  // Photo state
  const [photoImage, setPhotoImage] = useState<HTMLImageElement | null>(null);
  const [photoPan, setPhotoPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [photoZoom, setPhotoZoom] = useState(1.0);

  // Overlay custom position & drag interaction
  const [overlayOffset, setOverlayOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; startY: number } | null>(null);

  // Sharing state
  const [isExporting, setIsExporting] = useState(false);

  // Initialize active metrics when overlay data is built
  useEffect(() => {
    if (overlayData) {
      const initial = getInitialActiveMetrics(overlayData, availableMetricKeys);
      setActiveMetrics(initial);
      if (overlayData.hasGps) {
        // Default to route layout if GPS track exists
        setLayout((prev) => (prev === "compact" ? "route" : prev));
      }
    }
  }, [overlayData, availableMetricKeys]);

  // Sync format with mode: sticker defaults to PNG, photo defaults to JPEG
  useEffect(() => {
    if (backgroundMode === "photo") {
      setImageFormat("image/jpeg");
      setTextColor("auto");
    } else {
      setImageFormat("image/png");
      setTextColor("light");
    }
  }, [backgroundMode]);

  // Re-draw live preview on canvas whenever options change
  useEffect(() => {
    if (!isOpen || !overlayData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const dimensions = CANVAS_DIMENSIONS[aspectRatio];
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resolvedColor: "light" | "dark" | "accent" =
      textColor === "auto"
        ? backgroundMode === "photo" && photoImage
          ? "light" // Renderer will auto-sample luminance from canvas!
          : "light"
        : textColor;

    drawOverlay(ctx, layout, overlayData, {
      dimensions,
      layout,
      activeMetrics: Array.from(activeMetrics),
      resolvedTextColor: resolvedColor,
      cardBackground: backgroundMode === "sticker" ? cardBg : "none",
      tightCrop: false, // In live preview show full canvas frame
      showBranding,
      hideStartEndGps,
      dimming: backgroundMode === "photo" ? dimming : 0,
      position: { offsetX: overlayOffset.x, offsetY: overlayOffset.y, scale: 1.0 },
      isDragging,
      photoImage: backgroundMode === "photo" ? photoImage : null,
      photoPan,
      photoZoom
    });
  }, [
    isOpen,
    overlayData,
    aspectRatio,
    layout,
    activeMetrics,
    textColor,
    cardBg,
    showBranding,
    hideStartEndGps,
    dimming,
    overlayOffset,
    isDragging,
    backgroundMode,
    photoImage,
    photoPan,
    photoZoom
  ]);

  if (!session || !overlayData) return null;

  // Toggle metric chip
  const handleToggleMetric = (key: ShareMetricKey) => {
    const next = new Set(activeMetrics);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setActiveMetrics(next);
    saveActiveMetricsForSport(overlayData.sportId, next);
  };

  // Handle Photo Selection
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const downscaled = await loadAndDownscaleImage(file);
      setPhotoImage(downscaled);
      setBackgroundMode("photo");
      setPhotoPan({ x: 0, y: 0 });
      setPhotoZoom(1.0);
      showToast({
        title: t("share.selectPhoto", "Fotó betöltve"),
        variant: "info"
      });
    } catch {
      showToast({
        title: t("common.error", "Hiba"),
        message: "Nem sikerült betölteni a fotót.",
        variant: "error"
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Canvas Drag & Snap interaction for overlay positioning
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startY: overlayOffset.y
    };
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStartRef.current || !canvasRef.current) return;

    const deltaY = e.clientY - dragStartRef.current.clientY;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const normalizedDelta = deltaY / canvasRect.height;

    let targetOffsetY = dragStartRef.current.startY + normalizedDelta;
    targetOffsetY = Math.max(-0.6, Math.min(0.6, targetOffsetY));

    // Snap to zero (center)
    if (Math.abs(targetOffsetY) < 0.04) {
      targetOffsetY = 0;
    }

    setOverlayOffset((prev) => ({ ...prev, y: targetOffsetY }));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(false);
    dragStartRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Wheel zoom on preview canvas
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (backgroundMode !== "photo" || !photoImage) return;
    e.preventDefault();
    const delta = e.deltaY * -0.002;
    setPhotoZoom((prev) => Math.max(1.0, Math.min(3.0, prev + delta)));
  };

  // Handle Export / Share Action
  const handleExport = async (isDirectDownload = false) => {
    setIsExporting(true);
    try {
      const dimensions = CANVAS_DIMENSIONS[aspectRatio];
      const resolvedColor: "light" | "dark" | "accent" =
        textColor === "auto" ? "light" : textColor;

      const exportResult = await exportSessionImage(
        overlayData,
        {
          dimensions,
          layout,
          activeMetrics: Array.from(activeMetrics),
          resolvedTextColor: resolvedColor,
          cardBackground: backgroundMode === "sticker" ? cardBg : "none",
          tightCrop: backgroundMode === "sticker" && tightCrop,
          showBranding,
          hideStartEndGps,
          dimming: backgroundMode === "photo" ? dimming : 0,
          position: { offsetX: overlayOffset.x, offsetY: overlayOffset.y, scale: 1.0 },
          photoImage: backgroundMode === "photo" ? photoImage : null,
          photoPan,
          photoZoom
        },
        imageFormat,
        0.92
      );

      if (isDirectDownload) {
        const { downloadBlob } = await import("@shared/lib/share/imageExporter");
        downloadBlob(exportResult.blob, exportResult.filename);
        showToast({
          title: t("share.downloadSuccess", "Kép sikeresen letöltve!"),
          variant: "success"
        });
      } else {
        const shareTitle = `${overlayData.title} - Apex`;
        const shareText = `${overlayData.sportName} · ${overlayData.dateFormatted}`;
        const res = await shareOrDownloadImage(exportResult, shareTitle, shareText);

        if (res.shared) {
          showToast({
            title: t("share.shareSuccess", "Edzéskép megosztva!"),
            variant: "success"
          });
        } else if (res.downloaded) {
          showToast({
            title: t("share.downloadSuccess", "Kép sikeresen letöltve!"),
            message: res.message,
            variant: "info"
          });
        }
      }
    } catch {
      showToast({
        title: t("common.error", "Hiba történt"),
        message: "Nem sikerült legenerálni a képet.",
        variant: "error"
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={t("share.title", "Edzés megosztása")}
      maxWidth="lg"
    >
      <div className="space-y-5 pb-4">
        {/* 1. BACKGROUND MODE SEGMENTED CONTROL */}
        <div className="space-y-1.5">
          <SegmentedControl<ShareBackgroundMode>
            options={[
              {
                value: "sticker",
                label: t("share.tabSticker", "Átlátszó matrica"),
                icon: <Layers className="w-4 h-4" />
              },
              {
                value: "photo",
                label: t("share.tabPhoto", "Fotó"),
                icon: <ImageIcon className="w-4 h-4" />
              },
              {
                value: "video",
                label: t("share.tabVideo", "Videó"),
                icon: <VideoIcon className="w-4 h-4" />
              }
            ]}
            value={backgroundMode}
            onChange={(m) => setBackgroundMode(m)}
            fullWidth
          />
        </div>

        {/* ========================================================= */}
        {/* VIDEO MODE: 4-STEP TELEMETRY WIZARD                       */}
        {/* ========================================================= */}
        {backgroundMode === "video" && currentSession && overlayData && (
          <VideoShareWizard
            session={currentSession}
            overlayData={overlayData}
            athleteName={user?.displayName || "Apex Athlete"}
            onSessionUpdated={setCurrentSession}
          />
        )}

        {/* ========================================================= */}
        {/* STICKER & PHOTO MODES: LIVE CANVAS PREVIEW & CONTROLS    */}
        {/* ========================================================= */}
        {backgroundMode !== "video" && (
          <>
            {/* TOP: LIVE CANVAS PREVIEW */}
            <div className="relative group mx-auto flex items-center justify-center p-3 rounded-2xl bg-neutral-950 border border-border-hairline overflow-hidden">
              {/* Subtle checkered transparent background for stickers */}
              <div
                className={`relative rounded-xl overflow-hidden shadow-2xl transition-all ${
                  backgroundMode === "sticker"
                    ? "bg-[linear-gradient(45deg,#1f232b_25%,transparent_25%),linear-gradient(-45deg,#1f232b_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1f232b_75%),linear-gradient(-45deg,transparent_75%,#1f232b_75%)] bg-[size:16px_16px] bg-[#12141a]"
                    : "bg-black"
                }`}
              >
                <canvas
                  ref={canvasRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onWheel={handleWheel}
                  className={`block max-h-[360px] sm:max-h-[420px] w-auto cursor-grab active:cursor-grabbing select-none touch-none ${
                    aspectRatio === "9:16"
                      ? "aspect-[9/16]"
                      : aspectRatio === "4:5"
                      ? "aspect-[4/5]"
                      : "aspect-square"
                  }`}
                  style={{
                    borderRadius: tightCrop && backgroundMode === "sticker" ? "12px" : "16px"
                  }}
                  aria-label={`Előnézet: ${overlayData?.sportName} ${overlayData?.title}`}
                />

                {/* Drag guide hint */}
                {isDragging && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur text-[11px] font-medium text-brand-300 border border-brand-500/30 pointer-events-none animate-pulse">
                    Biztonsági zónákhoz illesztve
                  </div>
                )}
              </div>
            </div>

        {/* PHOTO MODE CONTROLS */}
        {backgroundMode === "photo" && (
          <div className="p-3.5 rounded-xl bg-bg-surface border border-border-hairline space-y-3.5">
            {/* Photo Picker Buttons */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="flex-1"
                leftIcon={<ImageIcon className="w-4 h-4 text-brand-400" />}
                onClick={() => fileInputRef.current?.click()}
              >
                {photoImage ? t("share.changePhoto", "Fotó cseréje") : t("share.selectPhoto", "Fotó kiválasztása")}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoSelect}
              />
            </div>

            {/* Aspect Ratio Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-text-secondary uppercase">
                {t("share.aspectRatio", "Képarány")}
              </label>
              <div className="flex gap-2">
                {(["9:16", "4:5", "1:1"] as ShareAspectRatio[]).map((r) => (
                  <Chip
                    key={r}
                    size="sm"
                    selected={aspectRatio === r}
                    onClick={() => setAspectRatio(r)}
                  >
                    {r === "9:16"
                      ? t("share.ratioStory", "9:16 Sztori")
                      : r === "4:5"
                      ? t("share.ratioFeed", "4:5 Hírfolyam")
                      : t("share.ratioSquare", "1:1 Négyzet")}
                  </Chip>
                ))}
              </div>
            </div>

            {/* Dimming Scrim Slider */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-text-secondary">
                  {t("share.dimming", "Sötétítés (scrim)")}
                </span>
                <span className="font-mono text-text-tertiary">
                  {Math.round(dimming * 100)}%
                </span>
              </div>
              <Slider
                value={Math.round(dimming * 100)}
                onChange={(v) => setDimming(v / 100)}
                min={0}
                max={80}
                step={5}
              />
            </div>

            {/* EXIF Privacy Notice */}
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>{t("share.privacyExifNote", "A fotó helyadatai (GPS és EXIF) nem kerülnek át.")}</span>
            </div>
          </div>
        )}

        {/* STICKER MODE CONTROLS */}
        {backgroundMode === "sticker" && (
          <div className="p-3.5 rounded-xl bg-bg-surface border border-border-hairline space-y-3">
            {/* Card Background Choice */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-text-secondary uppercase">
                {t("share.cardBackground", "Kártya háttér")}
              </label>
              <div className="flex flex-wrap gap-2">
                <Chip
                  size="sm"
                  selected={cardBg === "none"}
                  onClick={() => setCardBg("none")}
                >
                  {t("share.cardNone", "Nincs (átlátszó)")}
                </Chip>
                <Chip
                  size="sm"
                  selected={cardBg === "dark"}
                  onClick={() => setCardBg("dark")}
                >
                  {t("share.cardDark", "Sötét kártya")}
                </Chip>
                <Chip
                  size="sm"
                  selected={cardBg === "light"}
                  onClick={() => setCardBg("light")}
                >
                  {t("share.cardLight", "Világos kártya")}
                </Chip>
              </div>
            </div>

            {/* Tight Crop Option */}
            <Toggle
              checked={tightCrop}
              onChange={(c) => setTightCrop(c)}
              label={t("share.tightCrop", "Szűkre vágott matrica")}
              description={t("share.tightCropDesc", "Pontosan a tartalomra vágva (Instagram matricához)")}
            />
          </div>
        )}

        {/* 2. STYLE / LAYOUT SELECTION */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-secondary uppercase">
            {t("share.style", "Stílus")}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setLayout("compact")}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                layout === "compact"
                  ? "bg-brand/10 border-brand text-brand-300 font-semibold shadow-sm"
                  : "bg-bg-surface border-border-hairline text-text-secondary hover:text-text-primary"
              }`}
            >
              <div className="text-xs font-bold">{t("share.styleCompact", "Kompakt")}</div>
              <div className="text-[10px] text-text-tertiary">2-3 nagy szám</div>
            </button>

            <button
              type="button"
              onClick={() => setLayout("stats")}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                layout === "stats"
                  ? "bg-brand/10 border-brand text-brand-300 font-semibold shadow-sm"
                  : "bg-bg-surface border-border-hairline text-text-secondary hover:text-text-primary"
              }`}
            >
              <div className="text-xs font-bold">{t("share.styleStats", "Statisztika")}</div>
              <div className="text-[10px] text-text-tertiary">Minden adat lista</div>
            </button>

            <button
              type="button"
              disabled={!overlayData.hasGps}
              onClick={() => overlayData.hasGps && setLayout("route")}
              title={!overlayData.hasGps ? "Csak GPS nyomvonallal rendelkező edzésnél érhető el" : ""}
              className={`p-2.5 rounded-xl border text-left transition-all disabled:opacity-35 ${
                layout === "route"
                  ? "bg-brand/10 border-brand text-brand-300 font-semibold shadow-sm"
                  : "bg-bg-surface border-border-hairline text-text-secondary hover:text-text-primary"
              }`}
            >
              <div className="text-xs font-bold flex items-center gap-1">
                <span>{t("share.styleRoute", "Útvonal")}</span>
                <MapPin className="w-3 h-3 text-emerald-400" />
              </div>
              <div className="text-[10px] text-text-tertiary">
                {overlayData.hasGps ? "Nyomvonal fókusz" : "Nincs GPS"}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setLayout("minimal")}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                layout === "minimal"
                  ? "bg-brand/10 border-brand text-brand-300 font-semibold shadow-sm"
                  : "bg-bg-surface border-border-hairline text-text-secondary hover:text-text-primary"
              }`}
            >
              <div className="text-xs font-bold">{t("share.styleMinimal", "Minimál")}</div>
              <div className="text-[10px] text-text-tertiary">1 hős szám</div>
            </button>
          </div>
        </div>

        {/* 3. TEXT COLOR SELECTION */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-secondary uppercase">
            {t("share.textColor", "Szövegszín")}
          </label>
          <div className="flex flex-wrap gap-2">
            {backgroundMode === "photo" && (
              <Chip
                size="sm"
                selected={textColor === "auto"}
                onClick={() => setTextColor("auto")}
              >
                {t("share.colorAuto", "Automatikus")}
              </Chip>
            )}
            <Chip
              size="sm"
              selected={textColor === "light"}
              onClick={() => setTextColor("light")}
            >
              {t("share.colorWhite", "Világos")}
            </Chip>
            <Chip
              size="sm"
              selected={textColor === "dark"}
              onClick={() => setTextColor("dark")}
            >
              {t("share.colorDark", "Sötét")}
            </Chip>
            <Chip
              size="sm"
              selected={textColor === "accent"}
              onClick={() => setTextColor("accent")}
            >
              {t("share.colorAccent", "Kiemelt")}
            </Chip>
          </div>
        </div>

        {/* 4. METRICS TO SHOW (DYNAMIC CHIPS) */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-text-secondary uppercase">
              {t("share.showMetrics", "Mit mutasson")}
            </label>
            <span className="text-[11px] text-text-tertiary">
              {activeMetrics.size} kiválasztva
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {availableMetricKeys.map((key) => {
              const isSelected = activeMetrics.has(key);
              const labelMap: Record<ShareMetricKey, string> = {
                sportTitle: t("share.metricSport", "Sportág és Cím"),
                date: t("share.metricDate", "Dátum"),
                duration: t("share.metricDuration", "Időtartam"),
                distance: t("share.metricDistance", "Távolság"),
                paceSpeed: t("share.metricPaceSpeed", "Tempó / Sebesség"),
                avgHr: t("share.metricAvgHr", "Átlagpulzus"),
                maxHr: t("share.metricMaxHr", "Max pulzus"),
                elevation: t("share.metricElevation", "Szintemelkedés"),
                power: t("share.metricPower", "Teljesítmény"),
                load: t("share.metricLoad", "Terhelés"),
                rpe: t("share.metricRpe", "RPE"),
                recordBadge: t("share.metricRecord", "Új rekord jelvény"),
                gear: t("share.metricGear", "Eszköz")
              };

              return (
                <Chip
                  key={key}
                  size="sm"
                  selected={isSelected}
                  onClick={() => handleToggleMetric(key)}
                  icon={isSelected ? <Check className="w-3 h-3 text-white" /> : undefined}
                >
                  {labelMap[key] || key}
                </Chip>
              );
            })}
          </div>
        </div>

        {/* 5. PRIVACY & BRANDING TOGGLES */}
        <div className="p-3 rounded-xl bg-bg-surface/50 border border-border-hairline space-y-2.5">
          {overlayData.hasGps && (
            <Toggle
              checked={hideStartEndGps}
              onChange={(c) => setHideStartEndGps(c)}
              label={t("share.privacyRoute", "Rajt és cél elrejtése (200 m)")}
              description={t(
                "share.privacyRouteDesc",
                "Elrejti a kezdő és befejező 200 métert a privát szféra védelméért."
              )}
            />
          )}

          <Toggle
            checked={showBranding}
            onChange={(c) => setShowBranding(c)}
            label={t("share.brandingWordmark", "APEX vízjel")}
          />
        </div>

        {/* 6. ACTION BUTTONS */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-border-hairline">
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="flex-1"
            leftIcon={<Share2 className="w-5 h-5" />}
            isLoading={isExporting}
            onClick={() => handleExport(false)}
          >
            {t("share.shareBtn", "Megosztás")}
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="flex-1"
            leftIcon={<Download className="w-5 h-5" />}
            isLoading={isExporting}
            onClick={() => handleExport(true)}
          >
            {t("share.downloadBtn", "Letöltés")}
          </Button>
        </div>
      </>
    )}
  </div>
</BottomSheet>
  );
};
