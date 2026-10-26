/**
 * READINESS ENGINE CONFIGURATION
 *
 * Designed for tuning by sports scientists, physiologists, and high-performance coaches.
 * All weights, baseline windows, sensitivity coefficients, and band thresholds are centralized here.
 */

export interface ReadinessWeightsConfig {
  /**
   * Biometric scoring path weights (sum = 1.0)
   */
  biometric: {
    hrv: number; // Heart Rate Variability (rMSSD z-score deviation)
    restingHr: number; // Resting Heart Rate delta from 28d baseline
    sleepDuration: number; // Actual sleep duration vs athlete target
    sleepQuality: number; // Perceived or device sleep quality
  };

  /**
   * Manual scoring path weights (sum = 1.0)
   * Based on Hooper-Mackinnon subjective wellness index
   */
  manual: {
    sleepDuration: number; // Sleep duration vs target
    sleepQuality: number; // Sleep quality (1-5 Hooper scale)
    fatigue: number; // Perceived fatigue (1 = fresh, 5 = exhausted)
    soreness: number; // Muscle soreness (1 = none, 5 = extreme)
    stress: number; // Mental stress (1 = calm, 5 = high)
    mood: number; // General mood (1 = poor, 5 = great)
    motivation: number; // Training readiness / motivation (1 = low, 5 = high)
  };

  /**
   * Hybrid path blending proportions
   */
  hybrid: {
    biometricWeight: number; // E.g., 0.60
    manualWeight: number; // E.g., 0.40
  };
}

export interface ReadinessThresholdsConfig {
  bands: {
    greenMin: number; // Score >= 67 -> Ready / optimal adaptation
    amberMin: number; // Score >= 34 and < 67 -> Caution / moderate load
    redMax: number; // Score < 34 -> Rest / recovery focus
  };

  calibration: {
    minimumDays: number; // Minimum days required for calibrated baseline (default: 14)
    fullBaselineDays: number; // Rolling baseline window (default: 28)
  };

  sleep: {
    defaultTargetMinutes: number; // 8 hours (480 minutes)
    minimumHealthyMinutes: number; // 5 hours (300 minutes)
    optimalBufferMinutes: number; // ± 30 minutes from target
  };

  hrv: {
    swcCoefficient: number; // Smallest Worthwhile Change (0.75 * baseline SD)
    suppressedThresholdSd: number; // -1.5 SD -> marked parasympathetic suppression
    elevatedThresholdSd: number; // +1.5 SD -> potential parasympathetic saturation / deep fatigue
  };

  restingHr: {
    normalToleranceBpm: number; // ± 2 bpm deviation is normal
    elevatedWarningBpm: number; // + 3 bpm -> early fatigue / stress
    severelyElevatedBpm: number; // + 6 bpm -> infection / acute autonomic stress
  };

  load: {
    sweetSpotMin: number; // ACWR 0.8
    sweetSpotMax: number; // ACWR 1.3
    dangerSpike: number; // ACWR > 1.5 -> injury risk
    dangerDeduction: number; // Points deducted when ACWR > 1.5
    moderateDeduction: number; // Points deducted when ACWR 1.3 - 1.5
  };

  penalties: {
    illnessDeduction: number; // Points deducted if active illness symptoms reported (default: 35)
    highSorenessDeduction: number; // Points deducted if soreness >= 4
  };
}

export interface ReadinessConfig {
  weights: ReadinessWeightsConfig;
  thresholds: ReadinessThresholdsConfig;
}

export const DEFAULT_READINESS_CONFIG: ReadinessConfig = {
  weights: {
    biometric: {
      hrv: 0.40,
      restingHr: 0.25,
      sleepDuration: 0.20,
      sleepQuality: 0.15
    },
    manual: {
      sleepDuration: 0.25,
      sleepQuality: 0.15,
      fatigue: 0.20,
      soreness: 0.15,
      stress: 0.10,
      mood: 0.08,
      motivation: 0.07
    },
    hybrid: {
      biometricWeight: 0.60,
      manualWeight: 0.40
    }
  },
  thresholds: {
    bands: {
      greenMin: 67,
      amberMin: 34,
      redMax: 33
    },
    calibration: {
      minimumDays: 14,
      fullBaselineDays: 28
    },
    sleep: {
      defaultTargetMinutes: 480, // 8.0 hours
      minimumHealthyMinutes: 300, // 5.0 hours
      optimalBufferMinutes: 30
    },
    hrv: {
      swcCoefficient: 0.75,
      suppressedThresholdSd: -1.5,
      elevatedThresholdSd: 1.5
    },
    restingHr: {
      normalToleranceBpm: 2,
      elevatedWarningBpm: 3,
      severelyElevatedBpm: 6
    },
    load: {
      sweetSpotMin: 0.8,
      sweetSpotMax: 1.3,
      dangerSpike: 1.5,
      dangerDeduction: 10,
      moderateDeduction: 4
    },
    penalties: {
      illnessDeduction: 35,
      highSorenessDeduction: 8
    }
  }
};
