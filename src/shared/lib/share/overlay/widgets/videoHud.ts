import { OverlayData, RenderDimensions } from "../types";
import { FONT_STACK, SAFE_ZONE_INSETS } from "../theme";
import { LiveWorkoutData, VideoExportOptions, VideoLayoutPreset } from "../../video/types";
import { drawWordmark } from "./wordmark";

export interface VideoHudRenderOptions {
  dimensions: RenderDimensions;
  layout: VideoLayoutPreset;
  liveData: LiveWorkoutData;
  overlayData: OverlayData;
  metrics: VideoExportOptions["metrics"];
  videoTimeSec: number;
  clipDurationSec: number;
  introCard: boolean;
  outroCard: boolean;
  dimming: number;
  showBranding: boolean;
  showSafeZones?: boolean;
}

/**
 * Draw Instagram/TikTok 9:16 safe zone guidelines
 */
export function drawVideoSafeZoneGuides(
  ctx: CanvasRenderingContext2D,
  dimensions: RenderDimensions
): void {
  const { width, height, aspectRatio } = dimensions;
  const insets = SAFE_ZONE_INSETS[aspectRatio] || SAFE_ZONE_INSETS["9:16"];

  ctx.save();
  ctx.strokeStyle = "rgba(239, 68, 68, 0.65)"; // dashed red/coral
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);

  // Top safe zone
  ctx.beginPath();
  ctx.moveTo(0, insets.top);
  ctx.lineTo(width, insets.top);
  ctx.stroke();

  // Bottom safe zone
  ctx.beginPath();
  ctx.moveTo(0, height - insets.bottom);
  ctx.lineTo(width, height - insets.bottom);
  ctx.stroke();

  // Left & Right safe zones
  ctx.beginPath();
  ctx.moveTo(insets.left, insets.top);
  ctx.lineTo(insets.left, height - insets.bottom);
  ctx.moveTo(width - insets.right, insets.top);
  ctx.lineTo(width - insets.right, height - insets.bottom);
  ctx.stroke();

  // Labels
  ctx.fillStyle = "rgba(239, 68, 68, 0.85)";
  ctx.font = `600 16px ${FONT_STACK}`;
  ctx.fillText("Top Safe Zone (UI overlay)", insets.left + 8, insets.top - 10);
  ctx.fillText("Bottom Safe Zone (Actions/Caption)", insets.left + 8, height - insets.bottom + 24);

  ctx.restore();
}

/**
 * Draw subtle dark scrim for contrast on bright/snow/sky backgrounds
 */
function drawVideoScrim(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dimming: number
): void {
  if (dimming <= 0) return;

  ctx.save();
  const grad = ctx.createLinearGradient(0, height * 0.45, 0, height);
  grad.addColorStop(0, "rgba(0, 0, 0, 0)");
  grad.addColorStop(0.5, `rgba(0, 0, 0, ${dimming * 0.4})`);
  grad.addColorStop(1, `rgba(0, 0, 0, ${dimming})`);

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/**
 * Layout 1: "Alsó sáv" (lower third horizontal banner)
 */
function renderBottomBarLayout(
  ctx: CanvasRenderingContext2D,
  dimensions: RenderDimensions,
  liveData: LiveWorkoutData,
  metrics: VideoExportOptions["metrics"]
): void {
  const { width, height, aspectRatio } = dimensions;
  const insets = SAFE_ZONE_INSETS[aspectRatio] || SAFE_ZONE_INSETS["9:16"];

  const bannerW = width - insets.left - insets.right;
  const bannerH = 140;
  const bannerX = insets.left;
  const bannerY = height - insets.bottom - bannerH - 12;

  ctx.save();

  // Glass card background
  ctx.fillStyle = "rgba(10, 13, 20, 0.82)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 24);
  ctx.fill();
  ctx.stroke();

  let curX = bannerX + 28;
  const centerY = bannerY + bannerH / 2;

  // 1. Primary Speed / Pace Metric
  if (metrics.speedPace && (liveData.speedFormatted || liveData.paceFormatted)) {
    const val = liveData.speedFormatted || liveData.paceFormatted || "0.0";
    const unit = liveData.speedUnit || liveData.paceUnit || "km/h";

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 52px ${FONT_STACK}`;
    ctx.fillText(val, curX, centerY + 8);
    const valWidth = ctx.measureText(val).width;

    ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
    ctx.font = `600 20px ${FONT_STACK}`;
    ctx.fillText(unit, curX + valWidth + 8, centerY - 6);

    ctx.font = `500 14px ${FONT_STACK}`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.fillText(liveData.speedFormatted ? "SEBESSÉG" : "TEMPÓ", curX + valWidth + 8, centerY + 14);

    curX += valWidth + 110;

    // Divider
    ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
    ctx.beginPath();
    ctx.moveTo(curX - 24, bannerY + 28);
    ctx.lineTo(curX - 24, bannerY + bannerH - 28);
    ctx.stroke();
  }

  // 2. Heart Rate Chip with Zone
  if (metrics.heartRate && liveData.heartRateFormatted && liveData.heartRateZone) {
    const zoneColor = liveData.heartRateZone.color;

    // Glowing Zone Indicator Dot
    ctx.fillStyle = zoneColor;
    ctx.shadowColor = zoneColor;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(curX + 8, centerY - 4, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // HR Value
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 34px ${FONT_STACK}`;
    ctx.fillText(liveData.heartRateFormatted, curX + 26, centerY + 8);
    const hrW = ctx.measureText(liveData.heartRateFormatted).width;

    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.font = `500 15px ${FONT_STACK}`;
    ctx.fillText("BPM", curX + 26 + hrW + 6, centerY - 4);

    ctx.fillStyle = zoneColor;
    ctx.font = `600 13px ${FONT_STACK}`;
    ctx.fillText(liveData.heartRateZone.name.split(" ")[0] || "ZÓNA", curX + 26 + hrW + 6, centerY + 12);

    curX += hrW + 110;

    // Divider
    ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
    ctx.beginPath();
    ctx.moveTo(curX - 20, bannerY + 28);
    ctx.lineTo(curX - 20, bannerY + bannerH - 28);
    ctx.stroke();
  }

  // 3. Distance
  if (metrics.distance && liveData.distanceFormatted) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.font = `600 13px ${FONT_STACK}`;
    ctx.fillText("TÁV", curX, centerY - 14);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 30px ${FONT_STACK}`;
    ctx.fillText(`${liveData.distanceFormatted} ${liveData.distanceUnit || "km"}`, curX, centerY + 16);

    const distW = ctx.measureText(`${liveData.distanceFormatted} ${liveData.distanceUnit || "km"}`).width;
    curX += distW + 36;
  }

  // 4. Elapsed Time
  if (metrics.elapsedTime && liveData.elapsedTimeFormatted) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.font = `600 13px ${FONT_STACK}`;
    ctx.fillText("IDŐ", curX, centerY - 14);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 30px ${FONT_STACK}`;
    ctx.fillText(liveData.elapsedTimeFormatted, curX, centerY + 16);
  }

  // 5. Elevation / Grade
  if (metrics.grade && liveData.gradeFormatted) {
    const endX = bannerX + bannerW - 30;
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.font = `600 13px ${FONT_STACK}`;
    ctx.fillText("LEJTŐ/EMELKEDŐ", endX, centerY - 14);

    ctx.fillStyle = "#10B981";
    ctx.font = `700 28px ${FONT_STACK}`;
    ctx.fillText(liveData.gradeFormatted, endX, centerY + 16);
    ctx.textAlign = "left";
  }

  ctx.restore();
}

/**
 * Layout 2: "Sarok" (compact HUD cluster anchored in corner)
 */
function renderCornerLayout(
  ctx: CanvasRenderingContext2D,
  dimensions: RenderDimensions,
  liveData: LiveWorkoutData,
  metrics: VideoExportOptions["metrics"]
): void {
  const { height, aspectRatio } = dimensions;
  const insets = SAFE_ZONE_INSETS[aspectRatio] || SAFE_ZONE_INSETS["9:16"];

  const boxX = insets.left;
  const boxW = 380;
  const boxY = height - insets.bottom - 220;

  ctx.save();

  // Glass card
  ctx.fillStyle = "rgba(10, 13, 20, 0.85)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, 200, 24);
  ctx.fill();
  ctx.stroke();

  // Hero Speed / Pace
  const padX = boxX + 24;
  let rowY = boxY + 54;

  if (metrics.speedPace && (liveData.speedFormatted || liveData.paceFormatted)) {
    const val = liveData.speedFormatted || liveData.paceFormatted || "0.0";
    const unit = liveData.speedUnit || liveData.paceUnit || "km/h";

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 52px ${FONT_STACK}`;
    ctx.fillText(val, padX, rowY);
    const valW = ctx.measureText(val).width;

    ctx.fillStyle = "#10B981";
    ctx.font = `600 22px ${FONT_STACK}`;
    ctx.fillText(unit, padX + valW + 10, rowY - 8);
  }

  // Supporting metrics row
  rowY += 48;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.beginPath();
  ctx.moveTo(padX, rowY - 14);
  ctx.lineTo(boxX + boxW - 24, rowY - 14);
  ctx.stroke();

  let subX = padX;

  if (metrics.heartRate && liveData.heartRateFormatted && liveData.heartRateZone) {
    ctx.fillStyle = liveData.heartRateZone.color;
    ctx.beginPath();
    ctx.arc(subX + 6, rowY + 6, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 24px ${FONT_STACK}`;
    ctx.fillText(`${liveData.heartRateFormatted} bpm`, subX + 20, rowY + 14);
    subX += 140;
  }

  if (metrics.distance && liveData.distanceFormatted) {
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 24px ${FONT_STACK}`;
    ctx.fillText(`${liveData.distanceFormatted} ${liveData.distanceUnit || "km"}`, subX, rowY + 14);
    subX += 130;
  }

  if (metrics.elapsedTime && liveData.elapsedTimeFormatted) {
    rowY += 40;
    ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
    ctx.font = `600 18px ${FONT_STACK}`;
    ctx.fillText(`⏱ ${liveData.elapsedTimeFormatted}`, padX, rowY + 10);
  }

  ctx.restore();
}

/**
 * Layout 3: "Minimál" (ultra-clean, pro cinematic big telemetry)
 */
function renderMinimalLayout(
  ctx: CanvasRenderingContext2D,
  dimensions: RenderDimensions,
  liveData: LiveWorkoutData,
  metrics: VideoExportOptions["metrics"]
): void {
  const { width, height, aspectRatio } = dimensions;
  const insets = SAFE_ZONE_INSETS[aspectRatio] || SAFE_ZONE_INSETS["9:16"];

  const anchorY = height - insets.bottom - 100;

  ctx.save();

  // Big hero metric centered
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
  ctx.shadowBlur = 18;

  if (metrics.speedPace && (liveData.speedFormatted || liveData.paceFormatted)) {
    const val = liveData.speedFormatted || liveData.paceFormatted || "0.0";
    const unit = liveData.speedUnit || liveData.paceUnit || "km/h";

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `800 96px ${FONT_STACK}`;
    ctx.fillText(val, width / 2, anchorY);

    ctx.font = `600 24px ${FONT_STACK}`;
    ctx.fillStyle = "#10B981";
    ctx.fillText(unit.toUpperCase(), width / 2, anchorY + 36);
  } else if (metrics.heartRate && liveData.heartRateFormatted && liveData.heartRateZone) {
    ctx.fillStyle = liveData.heartRateZone.color;
    ctx.font = `800 96px ${FONT_STACK}`;
    ctx.fillText(liveData.heartRateFormatted, width / 2, anchorY);

    ctx.font = `600 24px ${FONT_STACK}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("BPM", width / 2, anchorY + 36);
  }

  // Small clean time & distance below
  ctx.font = `600 20px ${FONT_STACK}`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  const subText = [
    liveData.distanceFormatted ? `${liveData.distanceFormatted} ${liveData.distanceUnit || "km"}` : null,
    liveData.elapsedTimeFormatted
  ]
    .filter(Boolean)
    .join("  ·  ");

  if (subText) {
    ctx.fillText(subText, width / 2, anchorY + 70);
  }

  ctx.restore();
}

/**
 * Layout 4: "Verseny" (race / action-cam telemetry dashboard)
 */
function renderRaceLayout(
  ctx: CanvasRenderingContext2D,
  dimensions: RenderDimensions,
  liveData: LiveWorkoutData,
  metrics: VideoExportOptions["metrics"],
  overlayData: OverlayData
): void {
  const { width, height, aspectRatio } = dimensions;
  const insets = SAFE_ZONE_INSETS[aspectRatio] || SAFE_ZONE_INSETS["9:16"];

  ctx.save();

  // Bottom Dashboard Container
  const dashW = width - insets.left - insets.right;
  const dashH = 170;
  const dashX = insets.left;
  const dashY = height - insets.bottom - dashH;

  // Background
  ctx.fillStyle = "rgba(8, 11, 16, 0.86)";
  ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(dashX, dashY, dashW, dashH, 20);
  ctx.fill();
  ctx.stroke();

  // Left: Speedometer Dial / Gauge cluster
  const dialCenterX = dashX + 85;
  const dialCenterY = dashY + 85;
  const dialRadius = 60;

  // Arc track
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(dialCenterX, dialCenterY, dialRadius, Math.PI * 0.8, Math.PI * 2.2);
  ctx.stroke();

  // Arc active fill (ratio based on speed 0 to 60 km/h)
  const currentSpeed = liveData.rawSpeedMps ? liveData.rawSpeedMps * 3.6 : 0;
  const speedRatio = Math.min(1, Math.max(0, currentSpeed / 50));
  const activeEndAngle = Math.PI * 0.8 + speedRatio * (Math.PI * 1.4);

  ctx.strokeStyle = "#10B981";
  ctx.beginPath();
  ctx.arc(dialCenterX, dialCenterY, dialRadius, Math.PI * 0.8, activeEndAngle);
  ctx.stroke();

  // Dial Center Value
  ctx.textAlign = "center";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `700 32px ${FONT_STACK}`;
  ctx.fillText(liveData.speedFormatted || liveData.paceFormatted || "0", dialCenterX, dialCenterY + 6);

  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.font = `600 13px ${FONT_STACK}`;
  ctx.fillText(liveData.speedUnit || liveData.paceUnit || "km/h", dialCenterX, dialCenterY + 24);

  // Center: Key Telemetry Grid
  ctx.textAlign = "left";
  let colX = dashX + 175;
  const topY = dashY + 45;
  const botY = dashY + 115;

  // Telemetry 1: Heart Rate with Zone bar
  if (metrics.heartRate && liveData.heartRateFormatted && liveData.heartRateZone) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.font = `600 12px ${FONT_STACK}`;
    ctx.fillText("PULZUS", colX, topY);

    ctx.fillStyle = liveData.heartRateZone.color;
    ctx.font = `700 28px ${FONT_STACK}`;
    ctx.fillText(`${liveData.heartRateFormatted} bpm`, colX, topY + 28);

    // HR zone bar
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.fillRect(colX, topY + 34, 110, 4);
    ctx.fillStyle = liveData.heartRateZone.color;
    const hrFraction = Math.min(1, liveData.heartRateZone.zone / 5);
    ctx.fillRect(colX, topY + 34, 110 * hrFraction, 4);
  }

  // Telemetry 2: Power or Cadence
  if (metrics.power && liveData.powerFormatted) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.font = `600 12px ${FONT_STACK}`;
    ctx.fillText("TELJESÍTMÉNY", colX, botY);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 28px ${FONT_STACK}`;
    ctx.fillText(`${liveData.powerFormatted} W`, colX, botY + 28);
  } else if (metrics.cadence && liveData.cadenceFormatted) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.font = `600 12px ${FONT_STACK}`;
    ctx.fillText("PEDÁLFORDULAT", colX, botY);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 28px ${FONT_STACK}`;
    ctx.fillText(`${liveData.cadenceFormatted} rpm`, colX, botY + 28);
  }

  colX += 150;

  // Telemetry 3: Distance & Time
  if (metrics.distance && liveData.distanceFormatted) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.font = `600 12px ${FONT_STACK}`;
    ctx.fillText("TÁVOLSÁG", colX, topY);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 28px ${FONT_STACK}`;
    ctx.fillText(`${liveData.distanceFormatted} ${liveData.distanceUnit || "km"}`, colX, topY + 28);
  }

  if (metrics.elapsedTime && liveData.elapsedTimeFormatted) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.font = `600 12px ${FONT_STACK}`;
    ctx.fillText("IDŐ", colX, botY);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 28px ${FONT_STACK}`;
    ctx.fillText(liveData.elapsedTimeFormatted, colX, botY + 28);
  }

  // Right Side: Mini Route Map or Elevation Profile with Moving Dot
  if (metrics.routeDot && overlayData.hasGps && overlayData.routePoints && overlayData.routePoints.length > 1) {
    const mapBoxW = 160;
    const mapBoxH = 130;
    const mapBoxX = dashX + dashW - mapBoxW - 16;
    const mapBoxY = dashY + 20;

    // Mini map outline
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.strokeRect(mapBoxX, mapBoxY, mapBoxW, mapBoxH);

    const pts = overlayData.routePoints;
    let minLat = 90,
      maxLat = -90,
      minLon = 180,
      maxLon = -180;
    for (const p of pts) {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lon < minLon) minLon = p.lon;
      if (p.lon > maxLon) maxLon = p.lon;
    }

    const dLat = Math.max(0.0001, maxLat - minLat);
    const dLon = Math.max(0.0001, maxLon - minLon);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    const getX = (lon: number) => mapBoxX + 10 + ((lon - minLon) / dLon) * (mapBoxW - 20);
    const getY = (lat: number) => mapBoxY + mapBoxH - 10 - ((lat - minLat) / dLat) * (mapBoxH - 20);

    pts.forEach((p, i) => {
      const x = getX(p.lon);
      const y = getY(p.lat);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Moving Route Dot
    const dotFrac = liveData.routePointFraction ?? 0;
    const targetIdx = Math.min(pts.length - 1, Math.floor(dotFrac * (pts.length - 1)));
    const targetPt = pts[targetIdx];

    if (targetPt) {
      const dotX = getX(targetPt.lon);
      const dotY = getY(targetPt.lat);

      // Glowing outer ring
      ctx.fillStyle = "rgba(16, 185, 129, 0.35)";
      ctx.beginPath();
      ctx.arc(dotX, dotY, 9, 0, Math.PI * 2);
      ctx.fill();

      // Sharp inner dot
      ctx.fillStyle = "#10B981";
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Intro Card: 1.5s sleek title card at video start
 */
export function renderVideoIntroCard(
  ctx: CanvasRenderingContext2D,
  dimensions: RenderDimensions,
  overlayData: OverlayData,
  opacity: number
): void {
  if (opacity <= 0) return;

  const { width, height } = dimensions;
  const cardW = Math.min(width * 0.85, 680);
  const cardH = 260;
  const cardX = (width - cardW) / 2;
  const cardY = (height - cardH) / 2;

  ctx.save();
  ctx.globalAlpha = opacity;

  // Backdrop blur glass card
  ctx.fillStyle = "rgba(8, 10, 15, 0.92)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 32);
  ctx.fill();
  ctx.stroke();

  // Sport Badge
  ctx.textAlign = "center";
  ctx.fillStyle = "#10B981";
  ctx.font = `700 20px ${FONT_STACK}`;
  ctx.fillText(overlayData.sportName.toUpperCase(), width / 2, cardY + 70);

  // Session Title
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 38px ${FONT_STACK}`;
  ctx.fillText(overlayData.title, width / 2, cardY + 125);

  // Date formatted
  ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
  ctx.font = `500 20px ${FONT_STACK}`;
  ctx.fillText(overlayData.dateFormatted, width / 2, cardY + 175);

  // Apex Wordmark
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.font = `800 16px ${FONT_STACK}`;
  ctx.letterSpacing = "4px";
  ctx.fillText("APEX", width / 2, cardY + 225);

  ctx.restore();
}

/**
 * Outro / Summary Card: 2.0s summary card at video end
 */
export function renderVideoOutroCard(
  ctx: CanvasRenderingContext2D,
  dimensions: RenderDimensions,
  overlayData: OverlayData,
  opacity: number
): void {
  if (opacity <= 0) return;

  const { width, height } = dimensions;
  const cardW = Math.min(width * 0.88, 720);
  const cardH = 360;
  const cardX = (width - cardW) / 2;
  const cardY = (height - cardH) / 2;

  ctx.save();
  ctx.globalAlpha = opacity;

  // Backdrop glass card
  ctx.fillStyle = "rgba(8, 10, 15, 0.94)";
  ctx.strokeStyle = "rgba(16, 185, 129, 0.35)";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 32);
  ctx.fill();
  ctx.stroke();

  // Title
  ctx.textAlign = "center";
  ctx.fillStyle = "#10B981";
  ctx.font = `700 20px ${FONT_STACK}`;
  ctx.fillText("EDZÉS ÖSSZEGZÉS", width / 2, cardY + 60);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 34px ${FONT_STACK}`;
  ctx.fillText(overlayData.sportName, width / 2, cardY + 105);

  // Grid of total metrics
  const rowY = cardY + 175;
  const activeMetrics = overlayData.metrics.slice(0, 3);
  const colSpacing = cardW / (activeMetrics.length + 1);

  activeMetrics.forEach((m, idx) => {
    const x = cardX + colSpacing * (idx + 1);

    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = `600 14px ${FONT_STACK}`;
    ctx.fillText(m.label.toUpperCase(), x, rowY);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `800 32px ${FONT_STACK}`;
    ctx.fillText(m.value, x, rowY + 38);

    if (m.unit) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.font = `600 16px ${FONT_STACK}`;
      ctx.fillText(m.unit, x, rowY + 64);
    }
  });

  // Apex brand mark
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.font = `800 18px ${FONT_STACK}`;
  ctx.letterSpacing = "6px";
  ctx.fillText("APEX", width / 2, cardY + cardH - 30);

  ctx.restore();
}

/**
 * Pure video HUD overlay renderer
 */
export function drawVideoOverlay(
  ctx: CanvasRenderingContext2D,
  options: VideoHudRenderOptions
): void {
  const {
    dimensions,
    layout,
    liveData,
    overlayData,
    metrics,
    videoTimeSec,
    clipDurationSec,
    introCard,
    outroCard,
    dimming,
    showBranding,
    showSafeZones
  } = options;

  const { width, height } = dimensions;

  // 1. Draw Scrim
  drawVideoScrim(ctx, width, height, dimming);

  // 2. Draw Selected HUD Layout
  switch (layout) {
    case "bottom_bar":
      renderBottomBarLayout(ctx, dimensions, liveData, metrics);
      break;
    case "corner":
      renderCornerLayout(ctx, dimensions, liveData, metrics);
      break;
    case "minimal":
      renderMinimalLayout(ctx, dimensions, liveData, metrics);
      break;
    case "race":
      renderRaceLayout(ctx, dimensions, liveData, metrics, overlayData);
      break;
  }

  // 3. Draw Brand Wordmark
  if (showBranding && layout !== "minimal") {
    drawWordmark(ctx, dimensions, "light");
  }

  // 4. Intro Card (0 to 1.5s with fade)
  if (introCard && videoTimeSec <= 1.5) {
    let opacity = 1.0;
    if (videoTimeSec < 0.3) {
      opacity = videoTimeSec / 0.3;
    } else if (videoTimeSec > 1.2) {
      opacity = Math.max(0, (1.5 - videoTimeSec) / 0.3);
    }
    renderVideoIntroCard(ctx, dimensions, overlayData, opacity);
  }

  // 5. Outro Card (last 2.0s with fade)
  if (outroCard && clipDurationSec > 3 && videoTimeSec >= clipDurationSec - 2.0) {
    const elapsedIntoOutro = videoTimeSec - (clipDurationSec - 2.0);
    const opacity = Math.min(1.0, elapsedIntoOutro / 0.4);
    renderVideoOutroCard(ctx, dimensions, overlayData, opacity);
  }

  // 6. Safe Zone Guides (if user is inspecting or previewing safe zones)
  if (showSafeZones) {
    drawVideoSafeZoneGuides(ctx, dimensions);
  }
}
