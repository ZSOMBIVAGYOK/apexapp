/**
 * CENTRAL SCORES CONFIGURATION
 *
 * ALL constants, scoring weights, diminishing-return parameters,
 * target ranges and physiological assumptions are centralized here.
 * Tunable by sports scientists and coaches without modifying engine logic.
 *
 * NOTE: All scores are performance and recovery guidance indicators.
 * Not medical diagnostics or medical devices.
 */

export interface ScoreLevelDefaults {
  hobby: number;
  competitive_amateur: number;
  national: number;
  national_team: number;
  olympic: number;
}

export interface ScoresConfig {
  recovery: {
    greenMin: number;
    amberMin: number;
    redMax: number;
  };
  strain: {
    maxScore: number;
    kDefaultsByLevel: ScoreLevelDefaults;
    adaptive: {
      minK: number;
      levelWeight: number;
      ctlWeight: number;
      ctlMultiplier: number;
    };
    activityContribution: {
      stepsDivisor: number;
      activeMinutesMultiplier: number;
      maxAdditionalLoad: number;
    };
    confidence: {
      device: number;
      fileImport: number;
      manualRpe: number;
      estimated: number;
    };
  };
  targetRange: {
    planHalfWindow: number;
    recoveryBands: {
      green: { low: number; high: number };
      amber: { low: number; high: number };
      red: { low: number; high: number };
    };
    seasonPhaseDelta: Record<string, number>;
    acwr: {
      cautionThreshold: number;
      cautionHighDampen: number;
      dangerThreshold: number;
      dangerShiftToRecovery: boolean;
    };
  };
  sleep: {
    defaultBaselineMinutes: number;
    minHealthyMinutes: number;
    maxNeedMinutes: number;
    strainExtraMultiplier: number; // minutes per strain point
    maxStrainExtraMinutes: number;
    maxDebtRepaymentMinutes: number;
    debtRepaymentRatio: number;
    defaultSleepLatencyMinutes: number;
    defaultWakeTime: string;
    weights: {
      device: {
        durationVsNeed: number;
        efficiency: number;
        consistency: number;
        restorative: number;
      };
      manual: {
        durationVsNeed: number;
        quality: number;
        consistency: number;
      };
    };
    optimalRestorativeRatio: number; // deep + rem ratio
    confidence: {
      device: number;
      manual: number;
      minimal: number;
    };
  };
  dailyRhythm: {
    morningHourThreshold: number; // Before 11:00 is morning
    eveningHourThreshold: number; // After 20:00 is evening
    restDayStrainCeiling: number; // Days with target below this or red recovery are rest days
  };
}

export const SCORES_CONFIG: ScoresConfig = {
  recovery: {
    greenMin: 67,
    amberMin: 34,
    redMax: 33
  },
  strain: {
    maxScore: 100,
    kDefaultsByLevel: {
      hobby: 70,
      competitive_amateur: 100,
      national: 135,
      national_team: 160,
      olympic: 185
    },
    adaptive: {
      minK: 50,
      levelWeight: 0.4,
      ctlWeight: 0.6,
      ctlMultiplier: 1.6
    },
    activityContribution: {
      stepsDivisor: 2000,
      activeMinutesMultiplier: 0.2,
      maxAdditionalLoad: 10
    },
    confidence: {
      device: 95,
      fileImport: 90,
      manualRpe: 75,
      estimated: 60
    }
  },
  targetRange: {
    planHalfWindow: 8,
    recoveryBands: {
      green: { low: 55, high: 80 },
      amber: { low: 35, high: 60 },
      red: { low: 10, high: 35 }
    },
    seasonPhaseDelta: {
      base: 0,
      build: 5,
      peak: -12,
      taper: -12,
      race_week: -15,
      transition: -15
    },
    acwr: {
      cautionThreshold: 1.3,
      cautionHighDampen: 10,
      dangerThreshold: 1.5,
      dangerShiftToRecovery: true
    }
  },
  sleep: {
    defaultBaselineMinutes: 480, // 8.0 hours
    minHealthyMinutes: 360, // 6.0 hours floor
    maxNeedMinutes: 600, // 10.0 hours ceiling
    strainExtraMultiplier: 0.6, // strain 50 -> +30 mins, strain 100 -> +60 mins
    maxStrainExtraMinutes: 60,
    maxDebtRepaymentMinutes: 45,
    debtRepaymentRatio: 0.25, // 25% of 7d debt per day, up to 45 mins
    defaultSleepLatencyMinutes: 15,
    defaultWakeTime: "07:00",
    weights: {
      device: {
        durationVsNeed: 0.40,
        efficiency: 0.25,
        consistency: 0.20,
        restorative: 0.15
      },
      manual: {
        durationVsNeed: 0.50,
        quality: 0.30,
        consistency: 0.20
      }
    },
    optimalRestorativeRatio: 0.40, // 40% deep + REM is optimal
    confidence: {
      device: 95,
      manual: 75,
      minimal: 50
    }
  },
  dailyRhythm: {
    morningHourThreshold: 11,
    eveningHourThreshold: 20,
    restDayStrainCeiling: 35
  }
};
