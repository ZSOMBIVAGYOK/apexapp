import { SessionTimeSeriesPoint } from "@shared/types/dataModel";

export type ShareBackgroundMode = "sticker" | "photo" | "video";

export type ShareLayoutId = "compact" | "stats" | "route" | "minimal";

export type ShareAspectRatio = "9:16" | "4:5" | "1:1";

export type ShareCardBackground = "none" | "dark" | "light";

export type ShareTextColor = "auto" | "light" | "dark" | "accent";

export type ShareImageFormat = "image/png" | "image/jpeg";

export type ShareMetricKey =
  | "sportTitle"
  | "date"
  | "duration"
  | "distance"
  | "paceSpeed"
  | "avgHr"
  | "maxHr"
  | "elevation"
  | "power"
  | "load"
  | "rpe"
  | "recordBadge"
  | "gear";

export interface FormattedMetric {
  key: ShareMetricKey;
  label: string;
  value: string;
  unit?: string;
  icon?: string;
}

export interface OverlayGpsPoint {
  lat: number;
  lon: number;
  elevation?: number;
}

/**
 * Pure plain object of already formatted and extracted values.
 * Allows this renderer to draw live values frame-by-frame during the future video export stage.
 */
export interface OverlayData {
  sportId: string;
  sportName: string;
  sportCategory?: string;
  title: string;
  dateFormatted: string;
  metrics: FormattedMetric[];
  isRecord?: boolean;
  recordTitle?: string;
  gearName?: string;
  hasGps: boolean;
  routePoints?: OverlayGpsPoint[];
  rawPoints?: SessionTimeSeriesPoint[];
  elevationPoints?: Array<{ distanceKm: number; elevationMeters: number }>;
}

export interface RenderDimensions {
  width: number;
  height: number;
  aspectRatio: ShareAspectRatio;
}

export interface SafeZoneInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface OverlayPosition {
  /**
   * Normalized center offset X (-0.5 to 0.5 relative to canvas center)
   */
  offsetX: number;
  /**
   * Normalized center offset Y (-0.5 to 0.5 relative to canvas center)
   */
  offsetY: number;
  /**
   * Scale multiplier (0.7 to 1.5, default 1.0)
   */
  scale: number;
}

export interface RenderOptions {
  /**
   * Canvas virtual dimensions (e.g. 1080x1920)
   */
  dimensions: RenderDimensions;
  /**
   * Layout choice
   */
  layout: ShareLayoutId;
  /**
   * Keys of metrics chosen to be displayed
   */
  activeMetrics: Set<ShareMetricKey> | ShareMetricKey[];
  /**
   * Resolved text color theme
   */
  resolvedTextColor: "light" | "dark" | "accent";
  /**
   * Optional card background behind the overlay content
   */
  cardBackground: ShareCardBackground;
  /**
   * Whether to crop tightly to overlay bounding box (Sticker mode only)
   */
  tightCrop?: boolean;
  /**
   * Whether to display brand wordmark
   */
  showBranding: boolean;
  /**
   * Privacy: whether to hide the first and last 200m of the route
   */
  hideStartEndGps?: boolean;
  /**
   * Dimming percentage (0.0 to 0.8) for soft scrim behind overlay
   */
  dimming?: number;
  /**
   * Custom position/scale of overlay
   */
  position?: OverlayPosition;
  /**
   * Whether user is currently dragging/repositioning (renders safe zone guides)
   */
  isDragging?: boolean;
  /**
   * Background image bitmap if in photo mode
   */
  photoImage?: HTMLImageElement | ImageBitmap | null;
  /**
   * Photo pan offset in canvas pixels
   */
  photoPan?: { x: number; y: number };
  /**
   * Photo zoom scale (1.0 to 3.0)
   */
  photoZoom?: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
