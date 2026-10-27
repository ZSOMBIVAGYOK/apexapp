import { THEME_COLORS } from "../theme";
import { OverlayGpsPoint } from "../types";

/**
 * Calculate distance between two GPS coordinates in meters using the Haversine formula.
 */
export function calculateHaversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Trim the first and last N meters (default 200m) from route points for home privacy.
 */
export function trimRoutePrivacy(
  points: OverlayGpsPoint[],
  trimDistanceMeters = 200
): OverlayGpsPoint[] {
  if (points.length < 4) return points;

  // Calculate cumulative distances
  const cumDistances: number[] = [0];
  let totalDist = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    const segment = calculateHaversineMeters(prev.lat, prev.lon, curr.lat, curr.lon);
    totalDist += segment;
    cumDistances.push(totalDist);
  }

  // If total distance is too short to trim 2x 200m, trim 25% from start and 25% from end
  const effectiveTrim = totalDist > trimDistanceMeters * 2.2
    ? trimDistanceMeters
    : totalDist * 0.25;

  let startIndex = 0;
  while (startIndex < points.length - 2 && (cumDistances[startIndex] ?? 0) < effectiveTrim) {
    startIndex++;
  }

  let endIndex = points.length - 1;
  while (endIndex > startIndex + 1 && totalDist - (cumDistances[endIndex] ?? 0) < effectiveTrim) {
    endIndex--;
  }

  return points.slice(startIndex, endIndex + 1);
}

export interface RouteOutlineOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  padding?: number;
  lineWidth?: number;
  colorScheme?: "light" | "dark" | "accent";
  hideStartEnd?: boolean;
}

/**
 * Project GPS points into a bounding box and render a smooth vector polyline
 * with start (green) and finish (coral) indicator dots.
 */
export function drawRouteOutline(
  ctx: CanvasRenderingContext2D,
  rawPoints: OverlayGpsPoint[],
  options: RouteOutlineOptions
): void {
  const {
    x,
    y,
    width,
    height,
    padding = 24,
    lineWidth = 6,
    colorScheme = "light",
    hideStartEnd = true
  } = options;

  if (rawPoints.length < 2) return;

  const points = hideStartEnd ? trimRoutePrivacy(rawPoints, 200) : rawPoints;
  if (points.length < 2) return;

  // Find min/max lat/lon
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;

  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lon < minLon) minLon = p.lon;
    if (p.lon > maxLon) maxLon = p.lon;
  }

  const midLat = (minLat + maxLat) / 2;
  const latCorrection = Math.cos((midLat * Math.PI) / 180);

  const rangeLat = Math.max(0.0001, maxLat - minLat);
  const rangeLon = Math.max(0.0001, (maxLon - minLon) * latCorrection);

  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  // Uniform scale to prevent distortion
  const scale = Math.min(innerW / rangeLon, innerH / rangeLat);
  const projectedW = rangeLon * scale;
  const projectedH = rangeLat * scale;

  const originX = x + padding + (innerW - projectedW) / 2;
  const originY = y + padding + (innerH - projectedH) / 2;

  const canvasPoints: Array<{ x: number; y: number }> = points.map((p) => {
    const px = originX + (p.lon - minLon) * latCorrection * scale;
    // Y is inverted in canvas (higher latitude is up, so smaller Y)
    const py = originY + (maxLat - p.lat) * scale;
    return { x: px, y: py };
  });

  const colors = THEME_COLORS[colorScheme];

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // 1. Draw glowing background blur
  ctx.strokeStyle = colors.routeGlow;
  ctx.lineWidth = lineWidth * 2.5;
  ctx.beginPath();
  ctx.moveTo(canvasPoints[0]!.x, canvasPoints[0]!.y);
  for (let i = 1; i < canvasPoints.length; i++) {
    ctx.lineTo(canvasPoints[i]!.x, canvasPoints[i]!.y);
  }
  ctx.stroke();

  // 2. Draw sharp hero stroke
  ctx.strokeStyle = colors.routeStroke;
  ctx.lineWidth = lineWidth;
  ctx.shadowColor = colors.shadowColor;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(canvasPoints[0]!.x, canvasPoints[0]!.y);
  for (let i = 1; i < canvasPoints.length; i++) {
    ctx.lineTo(canvasPoints[i]!.x, canvasPoints[i]!.y);
  }
  ctx.stroke();

  // 3. Draw Start dot (emerald green)
  const startPt = canvasPoints[0]!;
  ctx.fillStyle = "#10B981";
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(startPt.x, startPt.y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 4. Draw Finish dot (coral / rose red)
  const finishPt = canvasPoints[canvasPoints.length - 1]!;
  ctx.fillStyle = "#F43F5E";
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(finishPt.x, finishPt.y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}
