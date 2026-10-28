/**
 * SESSION MULTI-CHANNEL CHARTS COMPONENT
 *
 * Renders interactive SVG charts for workout time-series data:
 * - Heart Rate (with physiological Z1-Z5 zone bands & min/avg/max indicators)
 * - Speed / Pace (auto-adapted by sport: pace min/km with inverted axis for running; km/h for cycling/SUP)
 * - Informative fallback state ("Ehhez az edzéshez nincs sebességadat") when speed is absent
 * - Power (Watts)
 * - Cadence (rpm / spm)
 * - Elevation Profile (meters)
 * - Temperature (°C)
 * - X-Axis Toggle: Time (mm:ss / hh:mm) vs Distance (km)
 * - LTTB Peak-Preserving Downsampling for 60fps responsiveness
 * - Strictly bound to sessionId with clean state resets
 */

import React, { useState, useMemo, useEffect } from "react";
import { SessionTimeSeriesPoint } from "@shared/types/dataModel";
import { downsampleSessionTimeSeries } from "@shared/lib/charts/lttb";
import {
  Heart,
  Zap,
  TrendingUp,
  Activity,
  Gauge,
  Thermometer,
  Info,
  Clock,
  Compass
} from "lucide-react";
import { showToast } from "@shared/ui";

export interface SessionMultiChannelChartsProps {
  sessionId: string;
  sportId: string;
  points: SessionTimeSeriesPoint[];
  maxHeartRate?: number;
  lthr?: number;
  ftp?: number;
  avgHeartRate?: number;
  avgPowerWatts?: number;
  avgPace?: string;
  elevationGainMeters?: number;
  distanceMeters?: number;
  highlightRange?: { startOffsetSeconds: number; endOffsetSeconds: number } | null;
  onRangeSelect?: (range: { startOffsetSeconds: number; endOffsetSeconds: number }) => void;
}

type XAxisMode = "time" | "distance";

type SpeedMetricsResult =
  | { mode: "pace"; minPace: number; maxPace: number; avgPace: number }
  | { mode: "speed"; minSpeed: number; maxSpeed: number; avgSpeed: number }
  | null;

interface ProcessedPoint {
  timeOffset: number; // seconds
  distanceKm?: number;
  hr?: number;
  speedKmh?: number;
  paceSecPerKm?: number;
  power?: number;
  cadence?: number;
  elevation?: number;
  temp?: number;
}

export const SessionMultiChannelCharts: React.FC<SessionMultiChannelChartsProps> = ({
  sessionId,
  sportId,
  points,
  maxHeartRate: athleteMaxHr = 190,
  lthr: athleteLthr,
  avgHeartRate,
  avgPowerWatts,
  avgPace,
  elevationGainMeters,
  distanceMeters,
  highlightRange,
  onRangeSelect
}) => {
  const [xAxisMode, setXAxisMode] = useState<XAxisMode>("time");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);

  // Reset hover on session change
  useEffect(() => {
    setHoverIndex(null);
  }, [sessionId]);

  // Determine if sport uses Pace (running/walking/hiking) vs Speed km/h (cycling/paddling/rowing/skiing)
  const isPaceSport = useMemo(() => {
    const s = sportId.toLowerCase();
    return s.includes("run") || s.includes("walk") || s.includes("hike") || s.includes("trail") || s.includes("track");
  }, [sportId]);

  // Downsample time series using LTTB peak-preserving algorithm to ~300 points
  const downsampled = useMemo(() => {
    if (!points || points.length === 0) return [];
    return downsampleSessionTimeSeries(points, 320);
  }, [points]);

  // Normalize points
  const processedPoints = useMemo<ProcessedPoint[]>(() => {
    return downsampled.map((p, idx) => {
      const timeOffset = p.timeOffsetSeconds ?? idx;
      const distanceKm = p.distanceMeters !== undefined ? p.distanceMeters / 1000 : undefined;

      // Heart rate (filter uint8 255 and extreme noise)
      let hr: number | undefined = undefined;
      if (typeof p.heartRate === "number" && p.heartRate > 35 && p.heartRate < 240 && p.heartRate !== 255) {
        hr = p.heartRate;
      }

      // Speed & Pace
      let speedKmh: number | undefined = undefined;
      let paceSecPerKm: number | undefined = undefined;

      if (typeof p.speedMps === "number" && p.speedMps > 0.3 && p.speedMps < 45) {
        speedKmh = +(p.speedMps * 3.6).toFixed(1);
        paceSecPerKm = Math.round(1000 / p.speedMps);
        // Clamp unphysiological pace (> 15 min/km or < 2 min/km)
        if (paceSecPerKm > 900 || paceSecPerKm < 120) {
          paceSecPerKm = undefined;
        }
      }

      // Power
      let power: number | undefined = undefined;
      if (typeof p.powerWatts === "number" && p.powerWatts >= 0 && p.powerWatts < 2500 && p.powerWatts !== 65535) {
        power = p.powerWatts;
      }

      // Cadence
      let cadence: number | undefined = undefined;
      if (typeof p.cadence === "number" && p.cadence > 0 && p.cadence < 250 && p.cadence !== 255) {
        cadence = p.cadence;
      }

      // Elevation
      let elevation: number | undefined = undefined;
      if (typeof p.elevationMeters === "number" && !isNaN(p.elevationMeters) && p.elevationMeters > -500 && p.elevationMeters < 9000) {
        elevation = Math.round(p.elevationMeters);
      }

      // Temperature
      let temp: number | undefined = undefined;
      if (typeof p.temperatureCelsius === "number" && p.temperatureCelsius > -40 && p.temperatureCelsius < 60) {
        temp = p.temperatureCelsius;
      }

      return {
        timeOffset,
        distanceKm,
        hr,
        speedKmh,
        paceSecPerKm,
        power,
        cadence,
        elevation,
        temp
      };
    });
  }, [downsampled]);

  // Channel presence detection
  const hasHr = useMemo(() => processedPoints.some((p) => typeof p.hr === "number"), [processedPoints]);
  const hasSpeedOrPace = useMemo(() => processedPoints.some((p) => typeof p.speedKmh === "number" || typeof p.paceSecPerKm === "number"), [processedPoints]);
  const hasPower = useMemo(() => processedPoints.some((p) => typeof p.power === "number"), [processedPoints]);
  const hasCadence = useMemo(() => processedPoints.some((p) => typeof p.cadence === "number"), [processedPoints]);
  const hasElevation = useMemo(() => processedPoints.some((p) => typeof p.elevation === "number"), [processedPoints]);
  const hasTemperature = useMemo(() => processedPoints.some((p) => typeof p.temp === "number"), [processedPoints]);
  const hasDistanceData = useMemo(() => (distanceMeters && distanceMeters > 50) || processedPoints.some((p) => typeof p.distanceKm === "number" && p.distanceKm > 0.05), [distanceMeters, processedPoints]);

  // Heart rate statistics & physiological zones (Z1 - Z5)
  const hrMetrics = useMemo(() => {
    const hrs = processedPoints.map((p) => p.hr).filter((h): h is number => typeof h === "number");
    if (hrs.length === 0) return null;

    const min = Math.min(...hrs);
    const max = Math.max(...hrs);
    const sum = hrs.reduce((acc, v) => acc + v, 0);
    const avg = Math.round(sum / hrs.length);

    // Compute zone boundaries based on LTHR if available, otherwise max HR
    const refMax = Math.max(athleteMaxHr, max);
    const z1 = athleteLthr ? Math.round(athleteLthr * 0.68) : Math.round(refMax * 0.60);
    const z2 = athleteLthr ? Math.round(athleteLthr * 0.83) : Math.round(refMax * 0.70);
    const z3 = athleteLthr ? Math.round(athleteLthr * 0.94) : Math.round(refMax * 0.80);
    const z4 = athleteLthr ? Math.round(athleteLthr * 1.05) : Math.round(refMax * 0.90);
    const z5 = refMax;

    return { min, max, avg: avgHeartRate || avg, z1, z2, z3, z4, z5, refMax };
  }, [processedPoints, athleteMaxHr, avgHeartRate, athleteLthr]);

  // Speed / Pace statistics
  const speedMetrics: SpeedMetricsResult = useMemo(() => {
    if (!hasSpeedOrPace) return null;

    if (isPaceSport) {
      const paces = processedPoints.map((p) => p.paceSecPerKm).filter((pc): pc is number => typeof pc === "number");
      if (paces.length === 0) return null;
      const minPace = Math.min(...paces); // fastest
      const maxPace = Math.max(...paces); // slowest
      const avgP = Math.round(paces.reduce((a, b) => a + b, 0) / paces.length);
      return { mode: "pace", minPace, maxPace, avgPace: avgP };
    } else {
      const speeds = processedPoints.map((p) => p.speedKmh).filter((s): s is number => typeof s === "number");
      if (speeds.length === 0) return null;
      const min = Math.min(...speeds);
      const max = Math.max(...speeds);
      const avg = +(speeds.reduce((a, b) => a + b, 0) / speeds.length).toFixed(1);
      return { mode: "speed", minSpeed: min, maxSpeed: max, avgSpeed: avg };
    }
  }, [hasSpeedOrPace, isPaceSport, processedPoints]);

  // Power statistics
  const powerMetrics = useMemo(() => {
    if (!hasPower) return null;
    const pwrs = processedPoints.map((p) => p.power).filter((p): p is number => typeof p === "number");
    if (pwrs.length === 0) return null;
    return {
      min: Math.min(...pwrs),
      max: Math.max(...pwrs),
      avg: avgPowerWatts || Math.round(pwrs.reduce((a, b) => a + b, 0) / pwrs.length)
    };
  }, [hasPower, processedPoints, avgPowerWatts]);

  // Elevation statistics
  const elevationMetrics = useMemo(() => {
    if (!hasElevation) return null;
    const eles = processedPoints.map((p) => p.elevation).filter((e): e is number => typeof e === "number");
    if (eles.length === 0) return null;
    const min = Math.min(...eles);
    const max = Math.max(...eles);
    return { min, max, gain: elevationGainMeters ?? Math.max(0, max - min) };
  }, [hasElevation, processedPoints, elevationGainMeters]);

  // Cadence statistics
  const cadenceMetrics = useMemo(() => {
    if (!hasCadence) return null;
    const cads = processedPoints.map((p) => p.cadence).filter((c): c is number => typeof c === "number");
    if (cads.length === 0) return null;
    return {
      min: Math.min(...cads),
      max: Math.max(...cads),
      avg: Math.round(cads.reduce((a, b) => a + b, 0) / cads.length)
    };
  }, [hasCadence, processedPoints]);

  // Temperature statistics
  const temperatureMetrics = useMemo(() => {
    if (!hasTemperature) return null;
    const temps = processedPoints.map((p) => p.temp).filter((t): t is number => typeof t === "number");
    if (temps.length === 0) return null;
    return {
      min: Math.min(...temps),
      max: Math.max(...temps),
      avg: +(temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1)
    };
  }, [hasTemperature, processedPoints]);

  // Helper: format time offset
  const formatOffset = (sec: number): string => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) {
      return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // Helper: format pace
  const formatPace = (secPerKm: number): string => {
    const m = Math.floor(secPerKm / 60);
    const s = String(secPerKm % 60).padStart(2, "0");
    return `${m}:${s} /km`;
  };

  // Build SVG Path helper
  const maxTime = processedPoints.length > 0 ? (processedPoints[processedPoints.length - 1]?.timeOffset || 1) : 1;
  const maxDist = processedPoints.length > 0 ? (processedPoints[processedPoints.length - 1]?.distanceKm || 1) : 1;

  const getX = (p: ProcessedPoint, width: number, pad: number): number => {
    const drawW = width - pad * 2;
    if (xAxisMode === "distance" && hasDistanceData && p.distanceKm !== undefined) {
      return pad + (p.distanceKm / (maxDist || 1)) * drawW;
    }
    return pad + (p.timeOffset / (maxTime || 1)) * drawW;
  };

  const buildPath = (
    pts: Array<{ x: number; yVal?: number }>,
    minVal: number,
    maxVal: number,
    _width = 320,
    height = 90,
    pad = 8,
    inverted = false
  ): { linePath: string; areaPath: string } => {
    const valid = pts.filter((p): p is { x: number; yVal: number } => typeof p.yVal === "number");
    if (valid.length < 2) return { linePath: "", areaPath: "" };

    const drawH = height - pad * 2;
    const valRange = Math.max(1, maxVal - minVal);

    const coords = valid.map((p) => {
      const ratio = (p.yVal - minVal) / valRange;
      const y = inverted
        ? pad + ratio * drawH // lower value is higher up
        : pad + drawH - ratio * drawH;
      return `${p.x.toFixed(1)},${y.toFixed(1)}`;
    });

    const linePath = `M ${coords.join(" L ")}`;
    const bottomY = pad + drawH;
    const areaPath = `${linePath} L ${valid[valid.length - 1]!.x.toFixed(1)},${bottomY} L ${valid[0]!.x.toFixed(1)},${bottomY} Z`;

    return { linePath, areaPath };
  };

  const renderHighlightBand = (height: number, pad = 8) => {
    if (!highlightRange) return null;
    const drawW = 320 - pad * 2;
    const startX = Math.max(pad, pad + (Math.max(0, highlightRange.startOffsetSeconds) / (maxTime || 1)) * drawW);
    const endX = Math.min(320 - pad, pad + (Math.min(maxTime, highlightRange.endOffsetSeconds) / (maxTime || 1)) * drawW);
    const w = Math.max(3, endX - startX);
    return (
      <rect
        x={startX}
        y={pad - 2}
        width={w}
        height={height - pad * 2 + 4}
        fill="#06B6D4"
        fillOpacity={0.22}
        stroke="#06B6D4"
        strokeWidth={1.5}
        strokeDasharray="3 3"
        rx={3}
        pointerEvents="none"
      />
    );
  };

  const renderSelectionStartLine = (height: number, pad = 8) => {
    if (selectionStart === null) return null;
    const drawW = 320 - pad * 2;
    const x = pad + (selectionStart / (maxTime || 1)) * drawW;
    return (
      <line
        x1={x}
        y1={pad}
        x2={x}
        y2={height - pad}
        stroke="#06B6D4"
        strokeWidth={2}
        strokeDasharray="2 2"
        pointerEvents="none"
      />
    );
  };

  const handleChartClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onRangeSelect) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const idx = Math.min(processedPoints.length - 1, Math.round(relX * (processedPoints.length - 1)));
    const pt = processedPoints[idx];
    if (pt) {
      if (selectionStart === null) {
        setSelectionStart(pt.timeOffset);
        showToast({
          title: "Blokk kezdőpont kiválasztva",
          message: `Kattints a végpontra a grafikonon (${formatOffset(pt.timeOffset)}).`,
          variant: "info"
        });
      } else {
        const start = Math.min(selectionStart, pt.timeOffset);
        const end = Math.max(selectionStart, pt.timeOffset);
        onRangeSelect({ startOffsetSeconds: start, endOffsetSeconds: end });
        setSelectionStart(null);
        showToast({
          title: "Blokk határok kijelölve",
          message: `${formatOffset(start)} - ${formatOffset(end)} időtartomány hozzárendelve a blokkhoz.`,
          variant: "success"
        });
      }
    }
  };

  if (processedPoints.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 text-center text-xs text-text-secondary">
        Ehhez az edzéshez nem állnak rendelkezésre rögzített grafikonadatok.
      </div>
    );
  }

  const currentHoverPoint = hoverIndex !== null ? processedPoints[hoverIndex] : null;

  return (
    <div className="space-y-4" key={sessionId}>
      {/* Header controls: Axis toggle */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-border-hairline">
        <div className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-brand" />
          <span>Edzésgrafikonok</span>
        </div>

        {hasDistanceData && (
          <div className="flex items-center gap-1 bg-neutral-900/80 p-0.5 rounded-lg border border-neutral-800 text-[11px]">
            <button
              type="button"
              onClick={() => setXAxisMode("time")}
              className={`px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
                xAxisMode === "time"
                  ? "bg-brand text-white font-medium"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Idő ({formatOffset(maxTime)})</span>
            </button>
            <button
              type="button"
              onClick={() => setXAxisMode("distance")}
              className={`px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
                xAxisMode === "distance"
                  ? "bg-brand text-white font-medium"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Compass className="w-3 h-3" />
              <span>Táv ({(maxDist).toFixed(2)} km)</span>
            </button>
          </div>
        )}
      </div>

      {/* 1. HEART RATE CHART (WITH PHYSIOLOGICAL ZONES) */}
      {hasHr && hrMetrics && (
        <div className="p-3.5 rounded-xl bg-bg-surface border border-border-hairline space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-rose-300 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              Pulzusgörbe (Zónákkal)
            </span>
            <div className="text-[11px] font-mono text-text-secondary flex items-center gap-2">
              <span>átl: <strong className="text-rose-300 font-bold">{hrMetrics.avg}</strong> bpm</span>
              <span>•</span>
              <span>max: <strong className="text-rose-400 font-bold">{hrMetrics.max}</strong> bpm</span>
            </div>
          </div>

          {/* SVG Canvas with Zone Bands */}
          <div className="relative bg-neutral-950 rounded-lg p-1 border border-white/5 overflow-hidden">
            <svg
              viewBox="0 0 320 90"
              className="w-full h-24 overflow-visible cursor-crosshair select-none"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                const idx = Math.min(processedPoints.length - 1, Math.round(relX * (processedPoints.length - 1)));
                setHoverIndex(idx);
              }}
              onMouseLeave={() => setHoverIndex(null)}
              onClick={handleChartClick}
            >
              <defs>
                <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Block Highlight Band & Point Selection */}
              {renderHighlightBand(90)}
              {renderSelectionStartLine(90)}

              {/* Zone Background Bands */}
              {(() => {
                const pad = 8;
                const drawH = 90 - pad * 2;
                const valRange = Math.max(1, hrMetrics.max - hrMetrics.min);
                const getY = (val: number) => pad + drawH - ((val - hrMetrics.min) / valRange) * drawH;

                return (
                  <g opacity="0.15">
                    {/* Zone 5 (Anaerobic) */}
                    <line x1="8" y1={Math.max(pad, getY(hrMetrics.z4))} x2="312" y2={Math.max(pad, getY(hrMetrics.z4))} stroke="#EF4444" strokeDasharray="3 3" />
                    {/* Zone 4 (Threshold) */}
                    <line x1="8" y1={Math.max(pad, getY(hrMetrics.z3))} x2="312" y2={Math.max(pad, getY(hrMetrics.z3))} stroke="#F97316" strokeDasharray="3 3" />
                    {/* Zone 3 (Tempo) */}
                    <line x1="8" y1={Math.max(pad, getY(hrMetrics.z2))} x2="312" y2={Math.max(pad, getY(hrMetrics.z2))} stroke="#EAB308" strokeDasharray="3 3" />
                    {/* Zone 2 (Aerobic) */}
                    <line x1="8" y1={Math.max(pad, getY(hrMetrics.z1))} x2="312" y2={Math.max(pad, getY(hrMetrics.z1))} stroke="#10B981" strokeDasharray="3 3" />
                  </g>
                );
              })()}

              {/* Heart Rate Area & Line */}
              {(() => {
                const pts = processedPoints.map((p) => ({ x: getX(p, 320, 8), yVal: p.hr }));
                const { linePath, areaPath } = buildPath(pts, hrMetrics.min, hrMetrics.max, 320, 90, 8);
                return (
                  <>
                    <path d={areaPath} fill="url(#hrGrad)" />
                    <path d={linePath} fill="none" stroke="#F43F5E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </>
                );
              })()}

              {/* Crosshair on Hover */}
              {hoverIndex !== null && currentHoverPoint && currentHoverPoint.hr !== undefined && (
                <g>
                  <line
                    x1={getX(currentHoverPoint, 320, 8)}
                    y1="6"
                    x2={getX(currentHoverPoint, 320, 8)}
                    y2="84"
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <circle
                    cx={getX(currentHoverPoint, 320, 8)}
                    cy={8 + (90 - 16) - ((currentHoverPoint.hr - hrMetrics.min) / Math.max(1, hrMetrics.max - hrMetrics.min)) * (90 - 16)}
                    r="4"
                    fill="#F43F5E"
                    stroke="#FFF"
                    strokeWidth="1.5"
                  />
                </g>
              )}
            </svg>
          </div>

          {/* Hover Status Indicator */}
          {currentHoverPoint && currentHoverPoint.hr !== undefined && (
            <div className="text-[11px] font-mono text-rose-300 flex items-center justify-between px-1">
              <span>{formatOffset(currentHoverPoint.timeOffset)} {currentHoverPoint.distanceKm ? `(${currentHoverPoint.distanceKm.toFixed(2)} km)` : ""}</span>
              <span className="font-bold">{currentHoverPoint.hr} bpm</span>
            </div>
          )}

          {/* Physiological Zone Legend */}
          <div className="grid grid-cols-5 gap-1 text-[9px] font-mono text-center pt-1 text-text-secondary border-t border-white/5">
            <div className="p-0.5 rounded bg-blue-500/10 text-blue-400">Z1 &lt;{hrMetrics.z1}</div>
            <div className="p-0.5 rounded bg-emerald-500/10 text-emerald-400">Z2 {hrMetrics.z1}-{hrMetrics.z2}</div>
            <div className="p-0.5 rounded bg-amber-500/10 text-amber-400">Z3 {hrMetrics.z2}-{hrMetrics.z3}</div>
            <div className="p-0.5 rounded bg-orange-500/10 text-orange-400">Z4 {hrMetrics.z3}-{hrMetrics.z4}</div>
            <div className="p-0.5 rounded bg-rose-500/10 text-rose-400">Z5 &gt;{hrMetrics.z4}</div>
          </div>
        </div>
      )}

      {/* 2. SPEED / PACE CHART (OR EXPLICIT NOTICE WHEN MISSING) */}
      {hasSpeedOrPace ? (
        <div className="p-3.5 rounded-xl bg-bg-surface border border-border-hairline space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              {isPaceSport ? "Tempógörbe (Perc / km)" : "Sebességgörbe (km/h)"}
            </span>
            <div className="text-[11px] font-mono text-text-secondary flex items-center gap-2">
              {speedMetrics?.mode === "pace" ? (
                <>
                  <span>átl: <strong className="text-cyan-300 font-bold">{avgPace || formatPace(speedMetrics.avgPace)}</strong></span>
                  <span>•</span>
                  <span>max: <strong className="text-cyan-400 font-bold">{formatPace(speedMetrics.minPace)}</strong></span>
                </>
              ) : speedMetrics?.mode === "speed" ? (
                <>
                  <span>átl: <strong className="text-cyan-300 font-bold">{speedMetrics.avgSpeed}</strong> km/h</span>
                  <span>•</span>
                  <span>max: <strong className="text-cyan-400 font-bold">{speedMetrics.maxSpeed}</strong> km/h</span>
                </>
              ) : null}
            </div>
          </div>

          <div className="relative bg-neutral-950 rounded-lg p-1 border border-white/5 overflow-hidden">
            <svg
              viewBox="0 0 320 90"
              className="w-full h-24 overflow-visible cursor-crosshair select-none"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                const idx = Math.min(processedPoints.length - 1, Math.round(relX * (processedPoints.length - 1)));
                setHoverIndex(idx);
              }}
              onMouseLeave={() => setHoverIndex(null)}
              onClick={handleChartClick}
            >
              <defs>
                <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Block Highlight Band & Point Selection */}
              {renderHighlightBand(90)}
              {renderSelectionStartLine(90)}

              {(() => {
                if (speedMetrics?.mode === "pace") {
                  const pts = processedPoints.map((p) => ({ x: getX(p, 320, 8), yVal: p.paceSecPerKm }));
                  const { linePath, areaPath } = buildPath(pts, speedMetrics.minPace, speedMetrics.maxPace, 320, 90, 8, true);
                  return (
                    <>
                      <path d={areaPath} fill="url(#speedGrad)" />
                      <path d={linePath} fill="none" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </>
                  );
                } else if (speedMetrics?.mode === "speed") {
                  const pts = processedPoints.map((p) => ({ x: getX(p, 320, 8), yVal: p.speedKmh }));
                  const { linePath, areaPath } = buildPath(pts, speedMetrics.minSpeed, speedMetrics.maxSpeed, 320, 90, 8, false);
                  return (
                    <>
                      <path d={areaPath} fill="url(#speedGrad)" />
                      <path d={linePath} fill="none" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </>
                  );
                }
                return null;
              })()}

              {/* Crosshair */}
              {hoverIndex !== null && currentHoverPoint && (
                <line
                  x1={getX(currentHoverPoint, 320, 8)}
                  y1="6"
                  x2={getX(currentHoverPoint, 320, 8)}
                  y2="84"
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
              )}
            </svg>
          </div>

          {currentHoverPoint && (
            <div className="text-[11px] font-mono text-cyan-300 flex items-center justify-between px-1">
              <span>{formatOffset(currentHoverPoint.timeOffset)}</span>
              <span className="font-bold">
                {isPaceSport && currentHoverPoint.paceSecPerKm
                  ? formatPace(currentHoverPoint.paceSecPerKm)
                  : currentHoverPoint.speedKmh
                  ? `${currentHoverPoint.speedKmh} km/h`
                  : "--"}
              </span>
            </div>
          )}
        </div>
      ) : (
        /* Explanatory Notice when speed is missing */
        <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800 text-xs text-text-secondary flex items-start gap-2.5">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-semibold text-text-primary">Ehhez az edzéshez nincs sebességadat</div>
            <p className="text-[11px] text-text-secondary">
              A fájlban nincsenek rögzített GPS vagy lépésszámláló alapú sebességpontok (pl. teremben végzett vagy GPS nélküli edzés).
            </p>
          </div>
        </div>
      )}

      {/* 3. POWER CHART */}
      {hasPower && powerMetrics && (
        <div className="p-3.5 rounded-xl bg-bg-surface border border-border-hairline space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-amber-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Teljesítménygörbe (Watt)
            </span>
            <div className="text-[11px] font-mono text-text-secondary flex items-center gap-2">
              <span>átl: <strong className="text-amber-300 font-bold">{powerMetrics.avg}</strong> W</span>
              <span>•</span>
              <span>max: <strong className="text-amber-400 font-bold">{powerMetrics.max}</strong> W</span>
            </div>
          </div>

          <div className="relative bg-neutral-950 rounded-lg p-1 border border-white/5 overflow-hidden">
            <svg viewBox="0 0 320 90" className="w-full h-20 overflow-visible cursor-crosshair select-none">
              <defs>
                <linearGradient id="pwrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {(() => {
                const pts = processedPoints.map((p) => ({ x: getX(p, 320, 8), yVal: p.power }));
                const { linePath, areaPath } = buildPath(pts, 0, powerMetrics.max, 320, 90, 8);
                return (
                  <>
                    <path d={areaPath} fill="url(#pwrGrad)" />
                    <path d={linePath} fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </>
                );
              })()}
            </svg>
          </div>
        </div>
      )}

      {/* 4. CADENCE CHART */}
      {hasCadence && cadenceMetrics && (
        <div className="p-3.5 rounded-xl bg-bg-surface border border-border-hairline space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-purple-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-purple-400" />
              Lépés- / Pedálfordulat ({isPaceSport ? "lépés/perc" : "rpm"})
            </span>
            <div className="text-[11px] font-mono text-text-secondary flex items-center gap-2">
              <span>átl: <strong className="text-purple-300 font-bold">{cadenceMetrics.avg}</strong></span>
              <span>•</span>
              <span>max: <strong className="text-purple-400 font-bold">{cadenceMetrics.max}</strong></span>
            </div>
          </div>

          <div className="relative bg-neutral-950 rounded-lg p-1 border border-white/5 overflow-hidden">
            <svg viewBox="0 0 320 80" className="w-full h-18 overflow-visible">
              <defs>
                <linearGradient id="cadGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#A855F7" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#A855F7" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {(() => {
                const pts = processedPoints.map((p) => ({ x: getX(p, 320, 8), yVal: p.cadence }));
                const { linePath, areaPath } = buildPath(pts, cadenceMetrics.min, cadenceMetrics.max, 320, 80, 8);
                return (
                  <>
                    <path d={areaPath} fill="url(#cadGrad)" />
                    <path d={linePath} fill="none" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </>
                );
              })()}
            </svg>
          </div>
        </div>
      )}

      {/* 5. ELEVATION PROFILE */}
      {hasElevation && elevationMetrics && (
        <div className="p-3.5 rounded-xl bg-bg-surface border border-border-hairline space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              Szintprofil (Tengerszint feletti magasság)
            </span>
            <div className="text-[11px] font-mono text-text-secondary flex items-center gap-2">
              <span>{elevationMetrics.min} – {elevationMetrics.max} m</span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">+{elevationMetrics.gain} m</span>
            </div>
          </div>

          <div className="relative bg-neutral-950 rounded-lg p-1 border border-white/5 overflow-hidden">
            <svg viewBox="0 0 320 90" className="w-full h-20 overflow-visible">
              <defs>
                <linearGradient id="eleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.05" />
                </linearGradient>
              </defs>
              {(() => {
                const pts = processedPoints.map((p) => ({ x: getX(p, 320, 8), yVal: p.elevation }));
                const { linePath, areaPath } = buildPath(pts, elevationMetrics.min, elevationMetrics.max, 320, 90, 8);
                return (
                  <>
                    <path d={areaPath} fill="url(#eleGrad)" />
                    <path d={linePath} fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </>
                );
              })()}
            </svg>
          </div>
        </div>
      )}

      {/* 6. TEMPERATURE CHART */}
      {hasTemperature && temperatureMetrics && (
        <div className="p-3.5 rounded-xl bg-bg-surface border border-border-hairline space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-sky-300 flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-sky-400" />
              Környezeti hőmérséklet (°C)
            </span>
            <div className="text-[11px] font-mono text-text-secondary flex items-center gap-2">
              <span>átl: <strong className="text-sky-300 font-bold">{temperatureMetrics.avg}°C</strong></span>
              <span>•</span>
              <span>{temperatureMetrics.min}°C – {temperatureMetrics.max}°C</span>
            </div>
          </div>

          <div className="relative bg-neutral-950 rounded-lg p-1 border border-white/5 overflow-hidden">
            <svg viewBox="0 0 320 70" className="w-full h-16 overflow-visible">
              <defs>
                <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {(() => {
                const pts = processedPoints.map((p) => ({ x: getX(p, 320, 8), yVal: p.temp }));
                const { linePath, areaPath } = buildPath(pts, temperatureMetrics.min, temperatureMetrics.max, 320, 70, 8);
                return (
                  <>
                    <path d={areaPath} fill="url(#tempGrad)" />
                    <path d={linePath} fill="none" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </>
                );
              })()}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};
