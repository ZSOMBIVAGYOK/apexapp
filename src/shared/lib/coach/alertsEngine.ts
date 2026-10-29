/**
 * Athlete Alerts Engine
 *
 * Implements automated multi-domain biometric and training alert rules:
 * 1. Missed check-ins (3+ consecutive days)
 * 2. Readiness red (2+ consecutive days)
 * 3. Load ramp-rate / ACWR spike (>1.5)
 * 4. Sleep deprivation (<6h for 3+ nights)
 * 5. Rapid weight shift (>2% in 48h)
 * 6. Reported illness or injury
 * 7. Low workout compliance (<60%)
 * 8. Low Energy Availability / REDs (sustained caloric deficit + high load)
 *
 * Enforces strict permission-gated routing: alerts are ONLY delivered
 * to staff members whose relationship permissions cover the underlying module.
 */

import {
  AthleteAlert,
  AthleteAlertThresholds,
  DEFAULT_ALERT_THRESHOLDS,
  AlertAnnotation
} from "@shared/types/coach";
import { ModulePermissions, SharingModule } from "@shared/types/dataModel";

export interface AthleteDataSnapshot {
  athleteId: string;
  athleteName: string;
  thresholds?: Partial<AthleteAlertThresholds>;
  dailyRecords: Array<{
    date: string;
    readinessScore?: number;
    readinessZone?: "ready" | "caution" | "rest";
    recoveryScore?: number;
    recoveryBand?: "green" | "amber" | "red";
    strainScore?: number;
    strainTargetHigh?: number;
    sleepScore?: number;
    sleep?: { durationMinutes?: number };
    restingHR?: number;
    hrv?: number;
    weight?: number;
    checkInCompleted?: boolean;
    illness?: boolean;
    injury?: boolean;
  }>;
  recentSessions: Array<{
    id: string;
    start: string;
    duration: number;
    load: number;
    completed: boolean;
  }>;
  plannedWorkouts: Array<{
    id: string;
    date: string;
    plannedLoad?: number;
  }>;
  recentNutritionDays?: Array<{
    date: string;
    calories?: number;
    targetCalories?: number;
  }>;
  recentInjuries?: Array<{
    id: string;
    date: string;
    bodyPart: string;
    status: string;
    description: string;
  }>;
}

/**
 * Evaluates all alert conditions for an athlete snapshot
 */
export function evaluateAthleteAlerts(snapshot: AthleteDataSnapshot): AthleteAlert[] {
  const {
    athleteId,
    athleteName,
    dailyRecords = [],
    recentSessions = [],
    plannedWorkouts = [],
    recentNutritionDays = [],
    recentInjuries = []
  } = snapshot;

  const thresholds: AthleteAlertThresholds = {
    ...DEFAULT_ALERT_THRESHOLDS,
    ...(snapshot.thresholds || {})
  };

  const alerts: AthleteAlert[] = [];
  const now = new Date().toISOString();

  // Sort daily records ascending by date
  const sortedDays = [...dailyRecords].sort((a, b) => a.date.localeCompare(b.date));

  // ---------------------------------------------------------------------------
  // 1. Missed Check-ins (3+ consecutive days)
  // ---------------------------------------------------------------------------
  if (sortedDays.length >= thresholds.missedCheckinDays) {
    const lastDays = sortedDays.slice(-thresholds.missedCheckinDays);
    const missedAll = lastDays.every((d) => !d.checkInCompleted);

    if (missedAll) {
      alerts.push({
        id: `alert_missed_checkin_${athleteId}_${now.split("T")[0]}`,
        athleteId,
        athleteName,
        type: "missed_checkins",
        module: "recovery",
        severity: "caution",
        title: "Hiányzó reggeli check-in",
        message: `${thresholds.missedCheckinDays} egymást követő napja nem érkezett szubjektív wellness vagy reggeli check-in adat.`,
        metricValue: thresholds.missedCheckinDays,
        thresholdValue: thresholds.missedCheckinDays,
        createdAt: now,
        status: "active"
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Readiness Red for 2+ consecutive days
  // ---------------------------------------------------------------------------
  if (sortedDays.length >= thresholds.readinessRedDays) {
    const lastDays = sortedDays.slice(-thresholds.readinessRedDays);
    const redStreak = lastDays.every(
      (d) => (d.readinessScore !== undefined && d.readinessScore < 40) || d.readinessZone === "rest"
    );

    if (redStreak) {
      const avgScore = Math.round(
        lastDays.reduce((acc, d) => acc + (d.readinessScore || 30), 0) / lastDays.length
      );
      alerts.push({
        id: `alert_readiness_red_${athleteId}_${now.split("T")[0]}`,
        athleteId,
        athleteName,
        type: "readiness_red",
        module: "recovery",
        severity: "critical",
        title: "Kritikusan alacsony readiness",
        message: `${athleteName} edzéskészültségi szintje ${thresholds.readinessRedDays} napja a Pihenő (vörös) zónában van (átlag: ${avgScore}/100).`,
        metricValue: avgScore,
        thresholdValue: 40,
        createdAt: now,
        status: "active"
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Load Ramp-Rate / ACWR Spike (>1.5)
  // ---------------------------------------------------------------------------
  if (recentSessions.length > 0) {
    const nowTime = Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;

    // Acute Load: last 7 days
    const last7DaysSessions = recentSessions.filter(
      (s) => nowTime - new Date(s.start).getTime() <= 7 * msPerDay && s.completed
    );
    const acuteLoad = last7DaysSessions.reduce((acc, s) => acc + (s.load || 0), 0) / 7;

    // Chronic Load: last 28 days
    const last28DaysSessions = recentSessions.filter(
      (s) => nowTime - new Date(s.start).getTime() <= 28 * msPerDay && s.completed
    );
    const chronicLoad = last28DaysSessions.reduce((acc, s) => acc + (s.load || 0), 0) / 28;

    if (chronicLoad > 5) {
      const acwr = +(acuteLoad / chronicLoad).toFixed(2);
      if (acwr >= thresholds.acwrThreshold) {
        alerts.push({
          id: `alert_load_spike_${athleteId}_${now.split("T")[0]}`,
          athleteId,
          athleteName,
          type: "load_spike",
          module: "training",
          severity: "critical",
          title: "Hirtelen terhelési ugrás (ACWR veszélyzóna)",
          message: `Az Akut:Krónikus Terhelési Arány (ACWR) elérte a ${acwr} értéket (küszöb: ${thresholds.acwrThreshold}). Magas sérülés- és túlterhelési kockázat.`,
          metricValue: acwr,
          thresholdValue: thresholds.acwrThreshold,
          createdAt: now,
          status: "active"
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Chronic Sleep Deprivation (<6h for 3+ consecutive nights)
  // ---------------------------------------------------------------------------
  if (sortedDays.length >= 3) {
    const last3Days = sortedDays.slice(-3);
    const shortSleep = last3Days.every(
      (d) =>
        d.sleep?.durationMinutes !== undefined &&
        d.sleep.durationMinutes < thresholds.minSleepDurationHours * 60
    );

    if (shortSleep) {
      alerts.push({
        id: `alert_sleep_deprivation_${athleteId}_${now.split("T")[0]}`,
        athleteId,
        athleteName,
        type: "sleep_deprivation",
        module: "recovery",
        severity: "caution",
        title: "Krónikus alváshiány",
        message: `Az elmúlt 3 éjszaka alvásideje folyamatosan ${thresholds.minSleepDurationHours} óra alatt maradt. Regenerációs deficit várható.`,
        metricValue: "< 6h",
        thresholdValue: `${thresholds.minSleepDurationHours}h`,
        createdAt: now,
        status: "active"
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 5. Rapid Weight Change (>2% shift in <= 48h)
  // ---------------------------------------------------------------------------
  const weighInDays = sortedDays.filter((d) => d.weight !== undefined && d.weight > 0);
  if (weighInDays.length >= 2) {
    const lastWeighIn = weighInDays[weighInDays.length - 1]!;
    const prevWeighIn = weighInDays[weighInDays.length - 2]!;

    const daysDiff =
      (new Date(lastWeighIn.date).getTime() - new Date(prevWeighIn.date).getTime()) /
      (24 * 60 * 60 * 1000);

    if (daysDiff <= 2.5) {
      const weightDeltaKg = lastWeighIn.weight! - prevWeighIn.weight!;
      const percentChange = +((Math.abs(weightDeltaKg) / prevWeighIn.weight!) * 100).toFixed(1);

      if (percentChange >= thresholds.rapidWeightShiftPercent) {
        alerts.push({
          id: `alert_rapid_weight_${athleteId}_${now.split("T")[0]}`,
          athleteId,
          athleteName,
          type: "rapid_weight_change",
          module: "health",
          severity: "caution",
          title: "Hirtelen testsúlyváltozás",
          message: `${percentChange}% (${weightDeltaKg > 0 ? "+" : ""}${weightDeltaKg.toFixed(1)} kg) testsúlyváltozás 48 órán belül. Dehidratáció vagy glikogénvesztés gyanúja.`,
          metricValue: `${percentChange}%`,
          thresholdValue: `${thresholds.rapidWeightShiftPercent}%`,
          createdAt: now,
          status: "active"
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Reported Illness or Injury
  // ---------------------------------------------------------------------------
  const latestDay = sortedDays[sortedDays.length - 1];
  if (latestDay?.illness) {
    alerts.push({
      id: `alert_illness_${athleteId}_${latestDay.date}`,
      athleteId,
      athleteName,
      type: "reported_illness",
      module: "health",
      severity: "critical",
      title: "Megbetegedés jelentve",
      message: `${athleteName} a napi check-in során betegséget/tüneteket jelölt meg.`,
      createdAt: now,
      status: "active"
    });
  }

  if (recentInjuries.length > 0) {
    const activeInjuries = recentInjuries.filter((inj) => inj.status === "active");
    if (activeInjuries.length > 0) {
      const inj = activeInjuries[0]!;
      alerts.push({
        id: `alert_injury_${athleteId}_${inj.id}`,
        athleteId,
        athleteName,
        type: "reported_injury",
        module: "health",
        severity: "critical",
        title: `Aktív sérülés: ${inj.bodyPart}`,
        message: `${inj.description || "Új sérülés bejegyezve az orvosi/fizió naplóba."}`,
        createdAt: now,
        status: "active"
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 7. Low Workout Compliance (<60% weekly completion)
  // ---------------------------------------------------------------------------
  if (plannedWorkouts.length >= 3) {
    const plannedCount = plannedWorkouts.length;
    const completedCount = recentSessions.filter((s) => s.completed).length;
    const compliancePercent = Math.round((completedCount / plannedCount) * 100);

    if (compliancePercent < thresholds.minWeeklyCompliancePercent) {
      alerts.push({
        id: `alert_low_compliance_${athleteId}_${now.split("T")[0]}`,
        athleteId,
        athleteName,
        type: "low_compliance",
        module: "training",
        severity: "caution",
        title: "Alacsony edzésterv-teljesítés",
        message: `A heti tervezett edzések csupán ${compliancePercent}%-a került elvégzésre (${completedCount}/${plannedCount} edzés).`,
        metricValue: `${compliancePercent}%`,
        thresholdValue: `${thresholds.minWeeklyCompliancePercent}%`,
        createdAt: now,
        status: "active"
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 8. Low Energy Availability (LEA / REDs)
  // ---------------------------------------------------------------------------
  if (recentNutritionDays.length >= 3) {
    const last3Nutr = recentNutritionDays.slice(-3);
    const sustainedDeficit = last3Nutr.every(
      (n) =>
        n.calories !== undefined &&
        n.targetCalories !== undefined &&
        n.targetCalories > 0 &&
        n.calories / n.targetCalories < 0.6
    );

    if (sustainedDeficit) {
      alerts.push({
        id: `alert_lea_${athleteId}_${now.split("T")[0]}`,
        athleteId,
        athleteName,
        type: "low_energy_availability",
        module: "nutrition",
        severity: "critical",
        title: "Alacsony Energiahasznosulás (LEA) gyanú",
        message: `A sportoló energiabevitele 3 egymást követő napon a cél 60%-a alatt maradt magas edzésterhelés mellett. Dietetikusi egyeztetés javasolt.`,
        createdAt: now,
        status: "active"
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 9. Sustained High Strain (strain exceeds target for 3+ consecutive days)
  // ---------------------------------------------------------------------------
  const highStrainDays = thresholds.sustainedHighStrainDays ?? 3;
  if (sortedDays.length >= highStrainDays) {
    const lastDays = sortedDays.slice(-highStrainDays);
    const sustainedHigh = lastDays.every((d) => {
      if (d.strainScore === undefined) return false;
      if (d.strainTargetHigh !== undefined) {
        return d.strainScore > d.strainTargetHigh + 5;
      }
      return d.strainScore >= 75;
    });

    if (sustainedHigh) {
      alerts.push({
        id: `alert_sustained_strain_${athleteId}_${now.split("T")[0]}`,
        athleteId,
        athleteName,
        type: "sustained_high_strain",
        module: "training",
        severity: "caution",
        title: "Tartósan túllépett terhelési célsáv",
        message: `${highStrainDays} egymást követő napon a napi terhelés (Strain) meghaladta az ajánlott célsávot. Túlterhelés vagy elégtelen regeneráció kockázata.`,
        createdAt: now,
        status: "active"
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 10. Consecutive Low Sleep Score (<60 for 3+ consecutive nights)
  // ---------------------------------------------------------------------------
  const lowSleepNights = thresholds.lowSleepScoreNights ?? 3;
  if (sortedDays.length >= lowSleepNights) {
    const lastDays = sortedDays.slice(-lowSleepNights);
    const lowSleepStreak = lastDays.every((d) => d.sleepScore !== undefined && d.sleepScore < 60);

    if (lowSleepStreak) {
      const avgSleepScore = Math.round(
        lastDays.reduce((acc, d) => acc + (d.sleepScore || 0), 0) / lowSleepNights
      );
      alerts.push({
        id: `alert_consecutive_low_sleep_${athleteId}_${now.split("T")[0]}`,
        athleteId,
        athleteName,
        type: "consecutive_low_sleep",
        module: "recovery",
        severity: "caution",
        title: "Tartósan alacsony alváspontszám",
        message: `${lowSleepNights} egymást követő éjszaka az alváspontszám 60 alatt maradt (átlag: ${avgSleepScore}/100).`,
        metricValue: `${avgSleepScore}/100`,
        thresholdValue: "< 60",
        createdAt: now,
        status: "active"
      });
    }
  }

  return alerts;
}

/**
 * Filter alerts strictly according to a staff member's relationship permissions.
 * RULE: An alert is delivered ONLY if the staff member has "read" or "write"
 * permission for the alert's underlying module.
 */
export function filterAlertsForStaff(
  alerts: AthleteAlert[],
  permissions: ModulePermissions
): AthleteAlert[] {
  return alerts.filter((alert) => {
    const permLevel = permissions[alert.module];
    return permLevel === "read" || permLevel === "write";
  });
}

/**
 * Checks if a specific module is accessible to staff
 */
export function canStaffAccessModule(
  permissions: ModulePermissions,
  module: SharingModule
): boolean {
  return permissions[module] === "read" || permissions[module] === "write";
}

/**
 * Checks if staff can modify/write to a module
 */
export function canStaffWriteModule(
  permissions: ModulePermissions,
  module: SharingModule
): boolean {
  return permissions[module] === "write";
}

/**
 * Acknowledge an alert
 */
export function acknowledgeAlert(
  alert: AthleteAlert,
  staffId: string,
  _staffName: string
): AthleteAlert {
  return {
    ...alert,
    status: "acknowledged",
    acknowledgedBy: staffId,
    acknowledgedAt: new Date().toISOString()
  };
}

/**
 * Snooze an alert for a given number of hours
 */
export function snoozeAlert(alert: AthleteAlert, durationHours = 24): AthleteAlert {
  const snoozedUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
  return {
    ...alert,
    status: "snoozed",
    snoozedUntil
  };
}

/**
 * Add a staff annotation to an alert
 */
export function annotateAlert(
  alert: AthleteAlert,
  authorId: string,
  authorName: string,
  authorRole: string,
  text: string
): AthleteAlert {
  const newAnnotation: AlertAnnotation = {
    id: `annot_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    authorId,
    authorName,
    authorRole,
    text: text.trim(),
    createdAt: new Date().toISOString()
  };

  return {
    ...alert,
    annotations: [...(alert.annotations || []), newAnnotation]
  };
}
