/**
 * RECORDS AND COURSES DOMAIN TYPES
 */

export type RecordMetricType =
  | "time_for_distance" // Idő adott távra (pl. 5 km futás, 400m úszás)
  | "distance_in_time" // Távolság adott idő alatt (pl. 1 órás kerékpár, 12 perces Cooper)
  | "weight_reps_1rm" // Súly / ismétlés / 1RM (pl. 1RM Guggolás, 100 kg x 5)
  | "max_reps" // Ismétlésszám (pl. húzódzkodás)
  | "max_duration" // Időtartam (pl. plank)
  | "points" // Pontszám
  | "custom"; // Egyedi

export interface AthleteRecord {
  id: string;
  athleteId: string;
  sportId: string;
  sportName: string;
  discipline: string; // e.g. "5 km", "10 km", "Félmaraton", "1RM Guggolás", "100m gyors"
  recordType: RecordMetricType;
  value: number; // raw numeric: seconds (for time), meters (for distance), kg (for weight), count (reps), points
  displayValue: string; // e.g. "19:42", "3 250 m", "145 kg", "28 db", "4:30"
  date: string; // YYYY-MM-DD
  courseId?: string;
  courseName?: string;
  venue?: string; // location or track name
  conditions?: {
    weather?: string;
    surface?: string;
  };
  sessionId?: string; // link to completed session
  notes?: string;
  isCurrentBest: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrackPoint {
  lat: number;
  lon: number;
  ele?: number;
}

export interface ElevationPoint {
  distanceMeters: number;
  elevationMeters: number;
}

export interface CourseDocument {
  id: string;
  athleteId: string;
  name: string;
  sportId: string;
  location: string;
  distanceMeters: number;
  elevationGainMeters: number;
  surface: string; // e.g. Aszfalt, Rekortán, Erdei ösvény, Murva
  notes?: string;
  trackPoints?: TrackPoint[];
  elevationProfile?: ElevationPoint[];
  svgRouteOutline?: string; // SVG path data (d="...")
  createdAt: string;
  updatedAt: string;
}

export interface RecordBeatPrompt {
  discipline: string;
  sportId: string;
  recordType: RecordMetricType;
  newValue: number;
  newDisplayValue: string;
  previousBestValue?: number;
  previousBestDisplayValue?: string;
  sessionId: string;
  sessionTitle: string;
  date: string;
}
