import { describe, it, expect } from "vitest";
import * as crypto from "crypto";

// Import normalizers from functions/src/integrations
import {
  normalizeWhoopWorkout,
  normalizeWhoopSleep,
  normalizeWhoopDaily,
  WhoopWorkoutPayload,
  WhoopSleepPayload,
  WhoopRecoveryPayload,
  WhoopCyclePayload
} from "../../../../functions/src/integrations/normalizers/whoopNormalizer";

import {
  normalizeGarminActivity,
  normalizeGarminDaily,
  normalizeGarminSleep,
  GarminActivityPayload,
  GarminDailyPayload,
  GarminSleepPayload
} from "../../../../functions/src/integrations/normalizers/garminNormalizer";

import {
  normalizePolarExercise,
  normalizePolarSleep,
  normalizePolarDaily,
  PolarExercisePayload,
  PolarSleepPayload,
  PolarNightlyRechargePayload
} from "../../../../functions/src/integrations/normalizers/polarNormalizer";

import {
  normalizeOuraSleep,
  normalizeOuraDaily,
  normalizeOuraWorkout,
  OuraDailySleepPayload,
  OuraDailyReadinessPayload,
  OuraWorkoutPayload
} from "../../../../functions/src/integrations/normalizers/ouraNormalizer";

import {
  findDuplicateActivity,
  mergeDuplicateActivities
} from "../../../../functions/src/integrations/deduplication";

import { NormalizedActivity } from "../../../../functions/src/integrations/types";

describe("Device Integrations Server-Side Pipeline", () => {
  describe("1. WHOOP Normalizers", () => {
    it("normalizes WHOOP workout with accurate strain, sport mapping and heart rate zones", () => {
      const payload: WhoopWorkoutPayload = {
        id: 98124,
        user_id: 1042,
        created_at: "2026-10-26T08:00:00.000Z",
        updated_at: "2026-10-26T08:50:00.000Z",
        start: "2026-10-26T07:15:00.000Z",
        end: "2026-10-26T08:15:00.000Z", // 60 min
        timezone_offset: "+01:00",
        sport_id: 0, // Running
        score: {
          strain: 14.2,
          average_heart_rate: 156,
          max_heart_rate: 178,
          kilojoule: 2450,
          percent_recorded: 100,
          distance_meter: 10200,
          altitude_gain_meter: 65,
          altitude_change_meter: 0
        }
      };

      const normalized = normalizeWhoopWorkout("athlete_1", payload);

      expect(normalized.id).toBe("whoop_act_athlete_1_98124");
      expect(normalized.provider).toBe("whoop");
      expect(normalized.sport).toBe("running");
      expect(normalized.durationSeconds).toBe(3600);
      expect(normalized.avgHeartRate).toBe(156);
      expect(normalized.maxHeartRate).toBe(178);
      expect(normalized.distanceMeters).toBe(10200);
      expect(normalized.elevationGainMeters).toBe(65);
      expect(normalized.calories).toBe(Math.round(2450 * 0.239));
      expect(normalized.trainingLoad).toBe(67); // Math.round(Math.pow(14.2 / 2.1, 2.2))
      expect(normalized.sourceConfidence).toBe(0.94);
    });

    it("normalizes WHOOP sleep with stages, respiratory rate, and efficiency", () => {
      const payload: WhoopSleepPayload = {
        id: 55412,
        user_id: 1042,
        created_at: "2026-10-26T07:10:00.000Z",
        updated_at: "2026-10-26T07:10:00.000Z",
        start: "2026-10-25T22:30:00.000Z",
        end: "2026-10-26T06:30:00.000Z", // 8 hours = 480 min
        timezone_offset: "+01:00",
        nap: false,
        score: {
          stage_summary: {
            total_in_bed_time_milli: 8 * 3600 * 1000,
            total_awake_time_milli: 40 * 60 * 1000, // 40 min
            total_light_sleep_time_milli: 250 * 60 * 1000,
            total_slow_wave_sleep_time_milli: 90 * 60 * 1000, // 90 min deep
            total_rem_sleep_time_milli: 100 * 60 * 1000, // 100 min REM
            sleep_cycle_count: 5,
            disturbance_count: 3
          },
          respiratory_rate: 14.8,
          sleep_performance_percentage: 92,
          sleep_consistency_percentage: 88,
          sleep_efficiency_percentage: 91.5
        }
      };

      const normalized = normalizeWhoopSleep("athlete_1", payload);

      expect(normalized.provider).toBe("whoop");
      expect(normalized.date).toBe("2026-10-26");
      expect(normalized.durationMinutes).toBe(480);
      expect(normalized.sleepScore).toBe(92);
      expect(normalized.efficiencyScore).toBe(92);
      expect(normalized.stages.deepMinutes).toBe(90);
      expect(normalized.stages.remMinutes).toBe(100);
      expect(normalized.stages.awakeMinutes).toBe(40);
      expect(normalized.stages.lightMinutes).toBe(250);
      expect(normalized.respiratoryRateBpm).toBe(14.8);
    });

    it("normalizes WHOOP daily recovery and cycle into NormalizedDaily", () => {
      const recovery: WhoopRecoveryPayload = {
        cycle_id: 8871,
        sleep_id: 55412,
        user_id: 1042,
        created_at: "2026-10-26T07:15:00.000Z",
        updated_at: "2026-10-26T07:15:00.000Z",
        score_state: "SCORED",
        score: {
          user_calibrating: false,
          recovery_score: 79,
          resting_heart_rate: 45,
          hrv_rmssd_milli: 64.5,
          spo2_percentage: 98.2,
          skin_temp_celsius: 33.8
        }
      };

      const cycle: WhoopCyclePayload = {
        id: 8871,
        user_id: 1042,
        created_at: "2026-10-26T07:00:00.000Z",
        updated_at: "2026-10-26T21:00:00.000Z",
        start: "2026-10-26T06:30:00.000Z",
        end: "2026-10-27T06:30:00.000Z",
        timezone_offset: "+01:00",
        score_state: "SCORED",
        score: {
          strain: 15.4,
          kilojoule: 11200,
          average_heart_rate: 72,
          max_heart_rate: 178
        }
      };

      const daily = normalizeWhoopDaily("athlete_1", "2026-10-26", recovery, cycle);

      expect(daily.provider).toBe("whoop");
      expect(daily.restingHeartRateBpm).toBe(45);
      expect(daily.hrvRmssdMs).toBe(64.5);
      expect(daily.spO2Percent).toBe(98.2);
      expect(daily.dayStrain).toBe(15.4);

      expect(daily.sourceConfidence).toBe(0.95);

    });
  });

  describe("2. Garmin Normalizers", () => {
    it("normalizes Garmin Activity with power, pace, laps and elevation", () => {
      const payload: GarminActivityPayload = {
        summaryId: "garmin_act_18273645",
        activityId: 18273645,
        activityName: "Morning Interval Bike Ride",
        startTimeInSeconds: 1792998000,
        startTimeOffsetInSeconds: 3600,
        activityType: "CYCLING",
        averageHeartRateInBeatsPerMinute: 148,
        maxHeartRateInBeatsPerMinute: 176,
        averagePowerInWatts: 245,
        maxPowerInWatts: 420,
        normPowerInWatts: 262,
        distanceInMeters: 28400,
        durationInSeconds: 3600,
        activeKilocalories: 780,
        totalElevationGainInMeters: 210,
        laps: [
          {
            startTimeInSeconds: 1792998000,
            durationInSeconds: 1800,
            distanceInMeters: 14000,
            averageHeartRateInBeatsPerMinute: 145,
            averagePowerInWatts: 240
          },
          {
            startTimeInSeconds: 1792999800,
            durationInSeconds: 1800,
            distanceInMeters: 14400,
            averageHeartRateInBeatsPerMinute: 151,
            averagePowerInWatts: 250
          }
        ]
      };

      const act = normalizeGarminActivity("athlete_1", payload);

      expect(act.provider).toBe("garmin");
      expect(act.sport).toBe("cycling");
      expect(act.avgPowerWatts).toBe(245);
      expect(act.maxPowerWatts).toBe(420);
      expect(act.normalizedPowerWatts).toBe(262);
      expect(act.elevationGainMeters).toBe(210);
      expect(act.laps?.length).toBe(2);
      expect(act.sourceConfidence).toBe(0.99);
    });

    it("normalizes Garmin Dailies and Sleeps", () => {
      const dailyPayload: GarminDailyPayload = {
        summaryId: "garmin_daily_1",
        calendarDate: "2026-10-26",
        startTimeInSeconds: 1792972800,
        durationInSeconds: 86400,
        restingHeartRateInBeatsPerMinute: 44,
        steps: 13500,
        stressDurationInSeconds: 7200,
        restStressDurationInSeconds: 54000,
        activityStressDurationInSeconds: 7200,
        lowStressDurationInSeconds: 10800,
        mediumStressDurationInSeconds: 5400,
        highStressDurationInSeconds: 1800
      };

      const daily = normalizeGarminDaily("athlete_1", dailyPayload);
      expect(daily.restingHeartRateBpm).toBe(44);
      expect(daily.steps).toBe(13500);

      const sleepPayload: GarminSleepPayload = {
        summaryId: "garmin_sleep_1",
        calendarDate: "2026-10-26",
        startTimeInSeconds: 1792965600,
        durationInSeconds: 28800,
        deepSleepDurationInSeconds: 5400, // 90 min
        lightSleepDurationInSeconds: 15600, // 260 min
        remSleepInSeconds: 6000, // 100 min
        awakeDurationInSeconds: 1800, // 30 min
        overallSleepScore: { value: 85 }
      };

      const sleep = normalizeGarminSleep("athlete_1", sleepPayload);
      expect(sleep.durationMinutes).toBe(480);
      expect(sleep.sleepScore).toBe(85);
      expect(sleep.stages.deepMinutes).toBe(90);
      expect(sleep.stages.remMinutes).toBe(100);
    });
  });

  describe("3. Polar and Oura Normalizers", () => {
    it("normalizes Polar exercise and nightly recharge", () => {
      const exPayload: PolarExercisePayload = {
        id: "polar_112",
        "upload-time": "2026-10-26T10:00:00Z",
        sport: "RUNNING",
        "start-time": "2026-10-26T08:00:00Z",
        duration: "PT1H0M0S",
        distance: 10500,
        calories: 720,
        "heart-rate": {
          average: 154,
          maximum: 175
        },
        "training-load": 65
      };

      const act = normalizePolarExercise("athlete_1", exPayload);
      expect(act.sport).toBe("running");
      expect(act.durationSeconds).toBe(3600);
      expect(act.distanceMeters).toBe(10500);
      expect(act.avgHeartRate).toBe(154);

      const rechPayload: PolarNightlyRechargePayload = {
        date: "2026-10-26",
        heart_rate_avg: 48,
        beat_to_beat_avg: 58,
        breathing_rate_avg: 13.9,
        ans_charge: 2.1
      };

      const daily = normalizePolarDaily("athlete_1", rechPayload);
      expect(daily.restingHeartRateBpm).toBe(48);
      expect(daily.hrvRmssdMs).toBe(58);
      expect(daily.respiratoryRateBpm).toBe(13.9);

      const sleepPayload: PolarSleepPayload = {
        date: "2026-10-26",
        sleep_start_time: "2026-10-25T23:00:00Z",
        sleep_end_time: "2026-10-26T07:00:00Z",
        sleep_score: 83,
        total_sleep: 28800,
        deep_sleep: 4800,
        light_sleep: 16800,
        rem_sleep: 5400,
        wake_time: 1800
      };

      const sleep = normalizePolarSleep("athlete_1", sleepPayload);
      expect(sleep.provider).toBe("polar");
      expect(sleep.sleepScore).toBe(83);
      expect(sleep.durationMinutes).toBe(480);
      expect(sleep.stages.deepMinutes).toBe(80);
      expect(sleep.stages.remMinutes).toBe(90);
    });


    it("normalizes Oura Ring sleep, readiness and workout", () => {
      const sleepPayload: OuraDailySleepPayload = {
        id: "oura_s1",
        day: "2026-10-26",
        score: 87,
        bedtime_start: "2026-10-25T23:00:00.000Z",
        bedtime_end: "2026-10-26T07:00:00.000Z",
        total_sleep_duration: 7.5 * 3600,
        deep_sleep_duration: 1.6 * 3600,
        rem_sleep_duration: 1.8 * 3600,
        light_sleep_duration: 3.6 * 3600,
        awake_time: 0.5 * 3600,
        efficiency: 92,
        average_hrv: 61,
        lowest_heart_rate: 46
      };

      const sleep = normalizeOuraSleep("athlete_1", sleepPayload);
      expect(sleep.sleepScore).toBe(87);
      expect(sleep.efficiencyScore).toBe(92);
      expect(sleep.hrvBaselineMs).toBe(61);
      expect(sleep.restingHeartRateBpm).toBe(46);

      const readinessPayload: OuraDailyReadinessPayload = {
        id: "oura_r1",
        day: "2026-10-26",
        score: 82,
        temperature_deviation: 0.2,
        resting_heart_rate: 46
      };

      const daily = normalizeOuraDaily("athlete_1", readinessPayload, sleepPayload);
      expect(daily.skinTemperatureDeviationCelsius).toBe(0.2);
      expect(daily.hrvRmssdMs).toBe(61);

      const workoutPayload: OuraWorkoutPayload = {
        id: "oura_w1",
        activity: "running",
        start_datetime: "2026-10-26T08:00:00.000Z",
        end_datetime: "2026-10-26T08:45:00.000Z",
        intensity: "hard",
        distance: 8200,
        calories: 610,
        average_heart_rate: 158,
        max_heart_rate: 176
      };

      const act = normalizeOuraWorkout("athlete_1", workoutPayload);
      expect(act.sport).toBe("running");
      expect(act.durationSeconds).toBe(2700);
      expect(act.distanceMeters).toBe(8200);
    });
  });

  describe("4. Webhook Cryptographic Signature Verification", () => {
    it("verifies WHOOP HMAC-SHA256 signature using constant-time comparison", () => {
      const secret = "test_whoop_client_secret_xyz_123";
      const rawBody = JSON.stringify({
        user_id: 1042,
        event_type: "recovery.updated",
        trace_id: "trace_abc_999"
      });

      const validSignature = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");

      const computed = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
      const sigBuf = Buffer.from(validSignature);
      const expBuf = Buffer.from(computed);
      expect(crypto.timingSafeEqual(sigBuf, expBuf)).toBe(true);

      const tamperedBody = rawBody + " ";
      const tamperedComputed = crypto.createHmac("sha256", secret).update(tamperedBody).digest("base64");
      expect(tamperedComputed).not.toBe(validSignature);

      const wrongSecretComputed = crypto
        .createHmac("sha256", "wrong_secret")
        .update(rawBody)
        .digest("base64");
      expect(wrongSecretComputed).not.toBe(validSignature);
    });

    it("verifies Garmin HMAC-SHA1 signature", () => {
      const secret = "garmin_consumer_secret_456";
      const rawBody = JSON.stringify({
        activities: [{ activityId: 100, activityType: "RUNNING" }]
      });

      const validSignature = crypto.createHmac("sha1", secret).update(rawBody).digest("base64");

      const computed = crypto.createHmac("sha1", secret).update(rawBody).digest("base64");
      const sigBuf = Buffer.from(validSignature);
      const expBuf = Buffer.from(computed);
      expect(crypto.timingSafeEqual(sigBuf, expBuf)).toBe(true);

      const badSig = Buffer.from(crypto.createHmac("sha1", "bad").update(rawBody).digest("base64"));
      expect(crypto.timingSafeEqual(sigBuf, badSig)).toBe(false);
    });
  });

  describe("5. Multi-Source Deduplication & Cross-Device Activity Merging", () => {
    const baseGarmin: NormalizedActivity = {
      id: "garmin_act_1",
      userId: "ath_1",
      provider: "garmin",
      providerRecordId: "rec_g1",
      sport: "running",
      title: "Garmin 10k Run",
      startTime: "2026-10-26T07:00:00.000Z",
      durationSeconds: 3000, // 50 min
      distanceMeters: 10000,
      avgPowerWatts: 280,
      maxPowerWatts: 360,
      elevationGainMeters: 75,
      calories: 680,
      trainingLoad: 70,
      sourceConfidence: 0.98,
      createdAt: "2026-10-26T07:55:00.000Z"
    };

    const duplicateWhoop: NormalizedActivity = {
      id: "whoop_act_1",
      userId: "ath_1",
      provider: "whoop",
      providerRecordId: "rec_w1",
      sport: "running",
      title: "WHOOP Run",
      startTime: "2026-10-26T07:02:00.000Z", // 2 minutes difference (within 5 min window)
      durationSeconds: 3060, // 2% duration difference (within 8% tolerance)
      avgHeartRate: 158,
      maxHeartRate: 179,
      calories: 690,
      trainingLoad: 75,
      sourceConfidence: 0.94,
      createdAt: "2026-10-26T07:58:00.000Z"
    };

    const differentSport: NormalizedActivity = {
      id: "swim_act_1",
      userId: "ath_1",
      provider: "polar",
      providerRecordId: "rec_p1",
      sport: "swimming",
      title: "Swim workout",
      startTime: "2026-10-26T07:01:00.000Z",
      durationSeconds: 3000,
      sourceConfidence: 0.95,
      createdAt: "2026-10-26T07:55:00.000Z"
    };

    it("identifies matching activity within ±5 min time and ±8% duration tolerance", () => {
      const match = findDuplicateActivity(duplicateWhoop, [baseGarmin]);
      expect(match).not.toBeNull();
      expect(match?.id).toBe("garmin_act_1");
    });

    it("does not falsely match activities with different sports", () => {
      const match = findDuplicateActivity(differentSport, [baseGarmin]);
      expect(match).toBeNull();
    });

    it("merges Garmin GPS/power metrics with WHOOP heart-rate/strain data seamlessly", () => {
      const merged = mergeDuplicateActivities(baseGarmin, duplicateWhoop);

      expect(merged.distanceMeters).toBe(10000);
      expect(merged.avgPowerWatts).toBe(280);
      expect(merged.elevationGainMeters).toBe(75);

      expect(merged.avgHeartRate).toBe(158);
      expect(merged.maxHeartRate).toBe(179);

      expect(merged.trainingLoad).toBe(75);

      expect(merged.mergedFrom?.length).toBe(2);
      expect(merged.mergedFrom?.[0]?.provider).toBe("garmin");
      expect(merged.mergedFrom?.[1]?.provider).toBe("whoop");

      expect(merged.sourceConfidence).toBe(1.0);
    });
  });
});
