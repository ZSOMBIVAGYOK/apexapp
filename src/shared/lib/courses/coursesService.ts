import { CourseDocument, ElevationPoint, TrackPoint } from "@shared/types/records";
import { CompletedSessionDocument } from "@shared/types/dataModel";
import { db } from "../firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy
} from "firebase/firestore";

const LOCAL_COURSES_PREFIX = "apex_courses_";

function getLocalCourses(athleteId: string): CourseDocument[] {
  if (!athleteId) return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_COURSES_PREFIX}${athleteId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalCourses(athleteId: string, courses: CourseDocument[]) {
  try {
    localStorage.setItem(`${LOCAL_COURSES_PREFIX}${athleteId}`, JSON.stringify(courses));
  } catch {
    // ignore
  }
}

/**
 * Great-circle distance between two GPS coordinates in meters
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generate a responsive SVG route path (d="M... L...") from track points WITHOUT external map tiles.
 */
export function generateSvgRouteOutline(
  points: TrackPoint[],
  width = 240,
  height = 160,
  padding = 16
): string {
  if (!points || points.length < 2) return "";

  // Downsample if more than 120 points to keep SVG lightweight
  let sample = points;
  if (points.length > 120) {
    const step = Math.ceil(points.length / 120);
    sample = points.filter((_, idx) => idx % step === 0 || idx === points.length - 1);
  }

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;

  for (const pt of sample) {
    if (pt.lat < minLat) minLat = pt.lat;
    if (pt.lat > maxLat) maxLat = pt.lat;
    if (pt.lon < minLon) minLon = pt.lon;
    if (pt.lon > maxLon) maxLon = pt.lon;
  }

  const dLat = maxLat - minLat;
  const dLon = maxLon - minLon;
  if (dLat === 0 && dLon === 0) return "";

  // Latitude distortion factor for aspect ratio
  const midLat = (minLat + maxLat) / 2;
  const latCos = Math.cos((midLat * Math.PI) / 180);

  const drawW = width - padding * 2;
  const drawH = height - padding * 2;

  // Aspect ratio scaling
  const aspectX = dLon * latCos;
  const aspectY = dLat;
  const scale = Math.min(drawW / (aspectX || 1), drawH / (aspectY || 1));

  const cx = width / 2;
  const cy = height / 2;
  const midX = (minLon + maxLon) / 2;
  const midY = (minLat + maxLat) / 2;

  const pathParts: string[] = [];

  sample.forEach((pt, idx) => {
    // Invert Y because SVG 0 is top, GPS larger latitude is north
    const x = cx + (pt.lon - midX) * latCos * scale;
    const y = cy - (pt.lat - midY) * scale;
    const cmd = idx === 0 ? "M" : "L";
    pathParts.push(`${cmd} ${x.toFixed(1)} ${y.toFixed(1)}`);
  });

  return pathParts.join(" ");
}

/**
 * Parse GPX or TCX file to extract trackPoints, elevationProfile, distance, and elevation gain
 */
export function parseCourseFile(
  content: string,
  fileName: string
): {
  name: string;
  distanceMeters: number;
  elevationGainMeters: number;
  trackPoints: TrackPoint[];
  elevationProfile: ElevationPoint[];
  svgRouteOutline: string;
} {
  const isTcx = fileName.toLowerCase().endsWith(".tcx") || content.includes("<TrainingCenterDatabase");
  const trackPoints: TrackPoint[] = [];

  if (isTcx) {
    // Parse TCX trackpoints
    const tpRegex = /<Trackpoint>([\s\S]*?)<\/Trackpoint>/gi;
    let match: RegExpExecArray | null;
    while ((match = tpRegex.exec(content)) !== null) {
      const inner = match[1]!;
      const latMatch = inner.match(/<LatitudeDegrees>([\d.-]+)<\/LatitudeDegrees>/i);
      const lonMatch = inner.match(/<LongitudeDegrees>([\d.-]+)<\/LongitudeDegrees>/i);
      const eleMatch = inner.match(/<AltitudeMeters>([\d.-]+)<\/AltitudeMeters>/i);
      if (latMatch && lonMatch) {
        trackPoints.push({
          lat: parseFloat(latMatch[1]!),
          lon: parseFloat(lonMatch[1]!),
          ele: eleMatch ? parseFloat(eleMatch[1]!) : undefined
        });
      }
    }
  } else {
    // Parse GPX trackpoints
    const trkptRegex = /<trkpt\s+lat=["']([^"']+)["']\s+lon=["']([^"']+)["']>([\s\S]*?)<\/trkpt>/gi;
    let match: RegExpExecArray | null;
    while ((match = trkptRegex.exec(content)) !== null) {
      const lat = parseFloat(match[1]!);
      const lon = parseFloat(match[2]!);
      const eleMatch = match[3]!.match(/<ele>([\d.-]+)<\/ele>/i);
      trackPoints.push({
        lat,
        lon,
        ele: eleMatch ? parseFloat(eleMatch[1]!) : undefined
      });
    }
  }

  // Calculate distance, elevation gain, and elevation profile
  let totalDistanceMeters = 0;
  let totalElevationGain = 0;
  const elevationProfile: ElevationPoint[] = [];

  for (let i = 0; i < trackPoints.length; i++) {
    const pt = trackPoints[i]!;
    if (i > 0) {
      const prev = trackPoints[i - 1]!;
      const dist = haversineDistance(prev.lat, prev.lon, pt.lat, pt.lon);
      totalDistanceMeters += dist;

      if (prev.ele !== undefined && pt.ele !== undefined && pt.ele > prev.ele) {
        totalElevationGain += pt.ele - prev.ele;
      }
    }

    if (pt.ele !== undefined) {
      // Record point every ~200m or at end to keep profile light
      const lastPoint = elevationProfile[elevationProfile.length - 1];
      if (!lastPoint || totalDistanceMeters - lastPoint.distanceMeters >= 200 || i === trackPoints.length - 1) {
        elevationProfile.push({
          distanceMeters: Math.round(totalDistanceMeters),
          elevationMeters: Math.round(pt.ele)
        });
      }
    }
  }

  // Name extraction from file or content
  let name = fileName.replace(/\.[^/.]+$/, "");
  const nameMatch = content.match(/<name>(.*?)<\/name>/i);
  if (nameMatch && nameMatch[1]!.trim()) {
    name = nameMatch[1]!.trim();
  }

  const svgRouteOutline = generateSvgRouteOutline(trackPoints);

  return {
    name,
    distanceMeters: Math.round(totalDistanceMeters),
    elevationGainMeters: Math.round(totalElevationGain),
    trackPoints,
    elevationProfile,
    svgRouteOutline
  };
}

/**
 * Get all courses for an athlete
 */
export async function getCourses(athleteId: string): Promise<CourseDocument[]> {
  const local = getLocalCourses(athleteId);
  try {
    const colRef = collection(db, "athletes", athleteId, "courses");
    const q = query(colRef, orderBy("name", "asc"));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const remote: CourseDocument[] = [];
      snapshot.forEach((d) => remote.push(d.data() as CourseDocument));
      setLocalCourses(athleteId, remote);
      return remote;
    }
  } catch {
    // offline
  }
  return local;
}

/**
 * Save or update a course
 */
export async function saveCourse(
  athleteId: string,
  courseInput: Omit<CourseDocument, "id" | "athleteId" | "createdAt" | "updatedAt"> & {
    id?: string;
  }
): Promise<CourseDocument> {
  const id = courseInput.id || `course_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  // If trackPoints exist and svgRouteOutline is missing, generate it
  let svg = courseInput.svgRouteOutline;
  if (!svg && courseInput.trackPoints && courseInput.trackPoints.length >= 2) {
    svg = generateSvgRouteOutline(courseInput.trackPoints);
  }

  const course: CourseDocument = {
    ...courseInput,
    id,
    athleteId,
    svgRouteOutline: svg,
    createdAt: now,
    updatedAt: now
  };

  const local = getLocalCourses(athleteId);
  const filtered = local.filter((c) => c.id !== id);
  const updated = [course, ...filtered];
  setLocalCourses(athleteId, updated);

  try {
    const docRef = doc(db, "athletes", athleteId, "courses", id);
    await setDoc(docRef, course);
  } catch {
    // offline
  }

  return course;
}

/**
 * Delete a course
 */
export async function deleteCourse(athleteId: string, courseId: string): Promise<void> {
  const local = getLocalCourses(athleteId);
  setLocalCourses(
    athleteId,
    local.filter((c) => c.id !== courseId)
  );

  try {
    const docRef = doc(db, "athletes", athleteId, "courses", courseId);
    await deleteDoc(docRef);
  } catch {
    // offline
  }
}

/**
 * Find completed sessions linked to this course, sorted by date descending
 */
export function getCourseLinkedSessions(
  courseId: string,
  sessions: CompletedSessionDocument[]
): CompletedSessionDocument[] {
  return sessions
    .filter((s) => s.courseId === courseId)
    .sort((a, b) => b.date.localeCompare(a.date));
}
