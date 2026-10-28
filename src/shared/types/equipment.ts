/**
 * EQUIPMENT AND MAINTENANCE DOMAIN TYPES
 */

export type EquipmentType =
  | "shoes" // cipő
  | "bike" // kerékpár
  | "chain" // lánc
  | "wheelset" // kerék
  | "racket" // ütő
  | "skis" // léc
  | "oar" // evező
  | "watch" // óra
  | "other"; // egyéb

export type MaintenanceMode = "distance" | "time"; // km or days
export type MaintenanceStatus = "ok" | "due_soon" | "overdue";

export interface MaintenanceTask {
  id: string;
  name: string; // pl. "Lánc kenése", "Cipőcsere"
  mode: MaintenanceMode;
  intervalValue: number; // pl. 300 km or 30 days
  lastResetDate: string; // YYYY-MM-DD
  lastResetUsageKm: number; // equipment totalKm at the time of reset
  currentUsageSinceReset: number; // km elapsed since reset or days elapsed
  remaining: number; // intervalValue - currentUsageSinceReset
  remainingPercent: number; // 0-100%
  status: MaintenanceStatus; // ok (green), due_soon (<15%), overdue (<=0)
}

export interface MaintenanceLog {
  id: string;
  taskId: string;
  taskName: string;
  date: string; // YYYY-MM-DD
  costAmount?: number; // e.g. 5000
  costCurrency?: string; // "HUF" | "EUR"
  notes?: string;
  performedBy?: string;
  createdAt: string;
}

export interface EquipmentItem {
  id: string;
  athleteId: string;
  name: string;
  type: EquipmentType;
  brand: string;
  model?: string;
  imageUrl?: string;
  purchaseDate: string; // YYYY-MM-DD
  startingUsageKm: number; // default 0
  startingUsageHours: number; // default 0
  sportIds: string[]; // sports it applies to
  status: "active" | "retired";
  notes?: string;
  totalKm: number; // derived from linked sessions + startingUsageKm
  totalHours: number; // derived from linked sessions + startingUsageHours
  maintenanceTasks: MaintenanceTask[];
  maintenanceHistory: MaintenanceLog[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  schemaVersion?: number;
}
