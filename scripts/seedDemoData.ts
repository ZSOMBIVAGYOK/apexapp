/**
 * Apex Platform Demo Seed Script
 * Generates 90 days of realistic athletic data:
 * - 1 Demo Athlete (Nagy Bence, Olympic-tier triathlete)
 * - 90 Days of daily check-ins (sleep, HRV rMSSD, resting HR, Hooper wellness, body map soreness)
 * - 120+ Completed training sessions (Swim, Bike, Run, Strength) with session-RPE load
 * - 90 Nutrition days with periodized macronutrients
 * - Performance benchmarks (VO2max, FTP, LTHR, CSS, CMJ jump, 1RM strength)
 * - 1 Demo Head Coach (Kovács Péter) with training write / health none permissions
 * - 1 Demo Sports Dietitian (Molnár Eszter) with nutrition write / health none permissions
 */

import * as fs from "fs";
import * as path from "path";

export interface DemoAthleteData {
  athlete: {
    uid: string;
    displayName: string;
    email: string;
    sport: string;
    level: string;
    heightCm: number;
    weightKg: number;
    birthDate: string;
    targetCompetition: string;
    targetDate: string;
    targetPriority: string;
  };
  coach: {
    uid: string;
    displayName: string;
    role: string;
    permissions: Record<string, string>;
  };
  dietitian: {
    uid: string;
    displayName: string;
    role: string;
    specialty: string;
    permissions: Record<string, string>;
  };
  dailies: Array<{
    date: string;
    sleep: {
      durationMinutes: number;
      qualityScore: number;
    };
    restingHeartRate: number;
    hrv: {
      rmssd: number;
    };
    subjective: {
      fatigue: number;
      soreness: number;
      stress: number;
      mood: number;
      motivation: number;
      illness: boolean;
      soreAreas?: string[];
    };
    readinessScore: number;
    readinessBand: "green" | "amber" | "red";
  }>;
  sessions: Array<{
    id: string;
    date: string;
    sport: "running" | "cycling" | "swimming" | "strength";
    title: string;
    durationMinutes: number;
    rpe: number;
    load: number;
    avgHeartRate: number;
    maxHeartRate: number;
  }>;
  nutritionDays: Array<{
    date: string;
    dayType: "rest" | "light" | "moderate" | "hard" | "competition";
    caloriesTarget: number;
    caloriesActual: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    waterLiters: number;
  }>;
  benchmarks: {
    vo2max: number;
    ftpWatts: number;
    lthrBpm: number;
    thresholdPace: string;
    cssPer100m: string;
    cmjJumpCm: number;
    trapBarDeadlift1RMKg: number;
    squat1RMKg: number;
  };
}

export function generateDemoSeedData(): DemoAthleteData {
  const athleteId = "demo-athlete-001";
  const now = new Date("2026-10-26T12:00:00Z");

  const dailies: DemoAthleteData["dailies"] = [];
  const sessions: DemoAthleteData["sessions"] = [];
  const nutritionDays: DemoAthleteData["nutritionDays"] = [];

  // Generate 90 past days
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
    const dateStr = d.toISOString().split("T")[0]!;

    // Day of week: 0 = Sun, 1 = Mon ...
    const dayOfWeek = d.getDay();

    // Sleep variation: 420m (7.0h) to 530m (8.8h)
    const sleepMins = Math.round(440 + Math.sin(i * 0.4) * 45 + ((i % 5) * 8));
    const sleepQuality = Math.min(5, Math.max(3, Math.round(3.8 + Math.cos(i * 0.3) * 1.0)));

    // Biometrics: resting HR 46-52 bpm, HRV 72-92 ms
    const rhr = Math.round(48 + Math.sin(i * 0.25) * 3 + (i % 7 === 0 ? 3 : 0));
    const hrv = Math.round(82 + Math.cos(i * 0.35) * 8 - (i % 7 === 0 ? 6 : 0));

    // Hooper wellness: 1-5
    const fatigue = Math.min(5, Math.max(1, Math.round(2.2 + Math.sin(i * 0.5) * 1.2)));
    const soreness = Math.min(5, Math.max(1, Math.round(2.0 + Math.cos(i * 0.6) * 1.3)));
    const stress = Math.min(4, Math.max(1, Math.round(1.8 + Math.sin(i * 0.2) * 0.8)));
    const mood = Math.min(5, Math.max(3, Math.round(4.2 + Math.cos(i * 0.4) * 0.7)));
    const motivation = Math.min(5, Math.max(3, Math.round(4.3 + Math.sin(i * 0.3) * 0.6)));

    // Calculated readiness
    const readinessScore = Math.min(
      96,
      Math.max(48, Math.round(76 + (hrv - 80) * 0.8 - (rhr - 48) * 1.2 - (fatigue - 2) * 4))
    );
    const readinessBand: "green" | "amber" | "red" =
      readinessScore >= 70 ? "green" : readinessScore >= 50 ? "amber" : "red";

    const soreAreas: string[] = [];
    if (soreness >= 3) {
      if (dayOfWeek === 2 || dayOfWeek === 5) soreAreas.push("calves", "quads");
      if (dayOfWeek === 4) soreAreas.push("shoulders", "lats");
    }

    dailies.push({
      date: dateStr,
      sleep: { durationMinutes: sleepMins, qualityScore: sleepQuality },
      restingHeartRate: rhr,
      hrv: { rmssd: hrv },
      subjective: {
        fatigue,
        soreness,
        stress,
        mood,
        motivation,
        illness: i === 42, // Single isolated mild cold 42 days ago
        soreAreas: soreAreas.length ? soreAreas : undefined
      },
      readinessScore,
      readinessBand
    });

    // Sessions: 1 or 2 per day, rest on some Sundays
    const isRestDay = dayOfWeek === 0 && i % 2 === 0;
    if (!isRestDay) {
      // Primary session
      let sport: "running" | "cycling" | "swimming" | "strength" = "running";
      let title = "Aerob alapozó futás";
      let duration = 60;
      let rpe = 5.0;
      let avgHr = 142;

      if (dayOfWeek === 1) {
        sport = "swimming";
        title = "Technikai és aerob úszóblokk";
        duration = 75;
        rpe = 5.5;
        avgHr = 138;
      } else if (dayOfWeek === 2) {
        sport = "cycling";
        title = "Laktát-küszöb kerékpáros intervallumok";
        duration = 90;
        rpe = 8.0;
        avgHr = 168;
      } else if (dayOfWeek === 3) {
        sport = "running";
        title = "Pálya tempófutás (Threshold)";
        duration = 60;
        rpe = 8.5;
        avgHr = 172;
      } else if (dayOfWeek === 4) {
        sport = "strength";
        title = "Funkcionális erő & törzs-stabilitás";
        duration = 50;
        rpe = 6.5;
        avgHr = 125;
      } else if (dayOfWeek === 5) {
        sport = "swimming";
        title = "5 x 400m Küszöb sorozat (CSS)";
        duration = 90;
        rpe = 8.0;
        avgHr = 166;
      } else if (dayOfWeek === 6) {
        sport = "cycling";
        title = "Hosszú állóképességi országúti tekerés";
        duration = 180;
        rpe = 6.0;
        avgHr = 145;
      }

      const load = Math.round(duration * rpe);
      sessions.push({
        id: `sess-${athleteId}-${dateStr}-1`,
        date: dateStr,
        sport,
        title,
        durationMinutes: duration,
        rpe,
        load,
        avgHeartRate: avgHr,
        maxHeartRate: avgHr + 18
      });

      // Second brick/strength session on Tuesday or Saturday
      if (dayOfWeek === 2) {
        sessions.push({
          id: `sess-${athleteId}-${dateStr}-2`,
          date: dateStr,
          sport: "strength",
          title: "Preventív törzs- és farizom erősítés",
          durationMinutes: 35,
          rpe: 5.0,
          load: 175,
          avgHeartRate: 118,
          maxHeartRate: 135
        });
      }
    }

    // Nutrition Day
    const dayType: DemoAthleteData["nutritionDays"][0]["dayType"] = isRestDay
      ? "rest"
      : dayOfWeek === 2 || dayOfWeek === 5 || dayOfWeek === 6
        ? "hard"
        : "moderate";

    const targetKcal = dayType === "hard" ? 3450 : dayType === "moderate" ? 2850 : 2200;
    const actualKcal = Math.round(targetKcal + (Math.sin(i * 0.7) * 120));

    nutritionDays.push({
      date: dateStr,
      dayType,
      caloriesTarget: targetKcal,
      caloriesActual: actualKcal,
      proteinGrams: dayType === "hard" ? 180 : 160,
      carbsGrams: dayType === "hard" ? 480 : dayType === "moderate" ? 360 : 210,
      fatGrams: dayType === "hard" ? 75 : 65,
      waterLiters: +(dayType === "hard" ? 3.6 : 3.0).toFixed(1)
    });
  }

  return {
    athlete: {
      uid: athleteId,
      displayName: "Nagy Bence",
      email: "bence.nagy@apex-olympic.hu",
      sport: "Triatlon",
      level: "Olimpiai keret",
      heightCm: 184,
      weightKg: 72.2,
      birthDate: "1998-05-14",
      targetCompetition: "Budapest Nemzetközi Triatlon OB",
      targetDate: "2027-01-12",
      targetPriority: "A"
    },
    coach: {
      uid: "demo-coach-001",
      displayName: "Kovács Péter",
      role: "coach",
      permissions: {
        training: "write",
        recovery: "read",
        nutrition: "read",
        devices: "read",
        messages: "write",
        health: "none"
      }
    },
    dietitian: {
      uid: "demo-dietitian-001",
      displayName: "Molnár Eszter",
      role: "specialist",
      specialty: "nutrition",
      permissions: {
        nutrition: "write",
        recovery: "read",
        training: "read",
        messages: "write",
        devices: "none",
        health: "none"
      }
    },
    dailies,
    sessions,
    nutritionDays,
    benchmarks: {
      vo2max: 62.4,
      ftpWatts: 310,
      lthrBpm: 172,
      thresholdPace: "3:45 min/km",
      cssPer100m: "1:22 /100m",
      cmjJumpCm: 44.5,
      trapBarDeadlift1RMKg: 165,
      squat1RMKg: 135
    }
  };
}

// Generate and write seed file
const seed = generateDemoSeedData();
const outDir = path.resolve(process.cwd(), "docs");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
const outFile = path.join(outDir, "demo-seed-data.json");
fs.writeFileSync(outFile, JSON.stringify(seed, null, 2), "utf-8");
// eslint-disable-next-line no-console
console.log(`✅ Demo seed data generated successfully!`);
// eslint-disable-next-line no-console
console.log(`   Athlete: ${seed.athlete.displayName} (${seed.athlete.sport})`);
// eslint-disable-next-line no-console
console.log(`   Dailies: ${seed.dailies.length} days`);
// eslint-disable-next-line no-console
console.log(`   Sessions: ${seed.sessions.length} sessions`);
// eslint-disable-next-line no-console
console.log(`   Nutrition: ${seed.nutritionDays.length} days`);
// eslint-disable-next-line no-console
console.log(`   Output: ${outFile}`);
