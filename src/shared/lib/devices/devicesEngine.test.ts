import { describe, it, expect } from "vitest";
import {
  parseGpx,
  parseTcx,
  parseCsv,
  parseFit,
  findDuplicateActivity,
  mergeDuplicateActivities,
  resolveDailyBiometrics,
  resolveSleepBiometrics,
  parseAndProcessFile,
  GarminAdapter,
  WhoopAdapter,
  PolarAdapter,
  OuraAdapter,
  AggregatorAdapter,
  normalizedActivitySchema,
  normalizedSleepSchema,
  normalizedDailySchema,
  metricPriorityConfigSchema,
  DEFAULT_METRIC_PRIORITY
} from "./index";
import { NormalizedActivity, NormalizedDaily, NormalizedSleep, DeviceProvider } from "@shared/types/devices";

describe("Device Integration & Biometric Engine", () => {
  describe("1. Parsers", () => {
    it("parses GPX 1.1 format with trackpoints, distance and elevation", () => {
      const sampleGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Garmin Connect" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Morning 5k Run</name>
    <type>running</type>
    <trkseg>
      <trkpt lat="47.4979" lon="19.0402">
        <ele>105.0</ele>
        <time>2026-10-26T07:00:00Z</time>
        <extensions>
          <hr>142</hr>
          <power>240</power>
        </extensions>
      </trkpt>
      <trkpt lat="47.5020" lon="19.0450">
        <ele>120.0</ele>
        <time>2026-10-26T07:15:00Z</time>
        <extensions>
          <hr>158</hr>
          <power>280</power>
        </extensions>
      </trkpt>
      <trkpt lat="47.5060" lon="19.0500">
        <ele>110.0</ele>
        <time>2026-10-26T07:30:00Z</time>
        <extensions>
          <hr>165</hr>
          <power>310</power>
        </extensions>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

      const activity = parseGpx(sampleGpx, "run.gpx");

      expect(activity.sport).toBe("running");
      expect(activity.title).toBe("Morning 5k Run");
      expect(activity.durationSeconds).toBe(1800); // 30 min
      expect(activity.startTime).toBe("2026-10-26T07:00:00.000Z");
      expect(activity.distanceMeters).toBeGreaterThan(500);
      expect(activity.elevationGainMeters).toBe(15);
      expect(activity.avgHeartRate).toBe(155);
      expect(activity.maxHeartRate).toBe(165);
      expect(activity.avgPowerWatts).toBe(277);
      expect(activity.provider).toBe("file");
    });

    it("parses TCX format with laps and calories", () => {
      const sampleTcx = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Activities>
    <Activity Sport="Biking">
      <Id>2026-10-26T09:00:00Z</Id>
      <Lap StartTime="2026-10-26T09:00:00Z">
        <TotalTimeSeconds>1200</TotalTimeSeconds>
        <DistanceMeters>8000</DistanceMeters>
        <Calories>320</Calories>
        <AverageHeartRateBpm><Value>140</Value></AverageHeartRateBpm>
        <MaximumHeartRateBpm><Value>155</Value></MaximumHeartRateBpm>
        <Watts>210</Watts>
      </Lap>
      <Lap StartTime="2026-10-26T09:20:00Z">
        <TotalTimeSeconds>1200</TotalTimeSeconds>
        <DistanceMeters>8500</DistanceMeters>
        <Calories>340</Calories>
        <AverageHeartRateBpm><Value>150</Value></AverageHeartRateBpm>
        <MaximumHeartRateBpm><Value>168</Value></MaximumHeartRateBpm>
        <Watts>230</Watts>
      </Lap>
    </Activity>
  </Activities>
</TrainingCenterDatabase>`;

      const activity = parseTcx(sampleTcx, "bike.tcx");

      expect(activity.sport).toBe("cycling");
      expect(activity.durationSeconds).toBe(2400); // 40 min
      expect(activity.distanceMeters).toBe(16500);
      expect(activity.calories).toBe(660);
      expect(activity.avgHeartRate).toBe(145);
      expect(activity.maxHeartRate).toBe(168);
      expect(activity.avgPowerWatts).toBe(220);
      expect(activity.laps).toHaveLength(2);
    });

    it("parses CSV workout format with flexible columns", () => {
      const sampleCsv = `Date,Sport,Duration (min),Distance (km),Avg HR,Max HR,Power,Calories
2026-10-26 14:00,Running,45,8.5,152,170,260,540
2026-10-26 18:00,Strength,60,,125,145,,380`;

      const activities = parseCsv(sampleCsv, "workout.csv");

      expect(activities).toHaveLength(2);
      expect(activities[0]!.sport).toBe("running");
      expect(activities[0]!.durationSeconds).toBe(2700);
      expect(activities[0]!.distanceMeters).toBe(8500);
      expect(activities[0]!.avgHeartRate).toBe(152);
      expect(activities[0]!.avgPowerWatts).toBe(260);

      expect(activities[1]!.sport).toBe("strength");
      expect(activities[1]!.durationSeconds).toBe(3600);
      expect(activities[1]!.calories).toBe(380);
    });

    it("parses binary FIT format header and messages gracefully", () => {
      const header = new Uint8Array(14);
      header[0] = 14; // header size
      header[1] = 0x20; // protocol version 2.0
      header[2] = 0x5c;
      header[3] = 0x08;
      header[4] = 0;
      header[5] = 0;
      header[6] = 0;
      header[7] = 0;
      header[8] = 0x2e; // '.'
      header[9] = 0x46; // 'F'
      header[10] = 0x49; // 'I'
      header[11] = 0x54; // 'T'
      header[12] = 0;
      header[13] = 0;

      const activity = parseFit(header.buffer, "ride.fit");

      expect(activity.provider).toBe("file");
      expect(activity.durationSeconds).toBeGreaterThan(0);
    });
  });

  describe("2. Deduplication Engine", () => {
    const existingActivities: NormalizedActivity[] = [
      {
        id: "act-garmin-1",
        userId: "user-1",
        provider: "garmin",
        providerRecordId: "g-101",
        sport: "running",
        title: "Garmin Run",
        startTime: "2026-10-26T08:00:00.000Z",
        durationSeconds: 3600, // 60 min
        distanceMeters: 10000,
        avgHeartRate: 155,
        avgPowerWatts: 270,
        elevationGainMeters: 60,
        trainingLoad: 75,
        sourceConfidence: 0.98,
        createdAt: "2026-10-26T09:05:00.000Z"
      }
    ];

    it("identifies matching duplicate workout within time window (+-5 min) and duration tolerance", () => {
      const whoopActivity: NormalizedActivity = {
        id: "act-whoop-1",
        userId: "user-1",
        provider: "whoop",
        providerRecordId: "w-202",
        sport: "running",
        title: "WHOOP Running",
        startTime: "2026-10-26T08:02:00.000Z",
        durationSeconds: 3540, // 59 min (1.6% diff)
        avgHeartRate: 156,
        maxHeartRate: 172,
        trainingLoad: 80,
        sourceConfidence: 0.95,
        createdAt: "2026-10-26T09:10:00.000Z"
      };

      const match = findDuplicateActivity(whoopActivity, existingActivities);

      expect(match).not.toBeNull();
      expect(match?.id).toBe("act-garmin-1");
    });

    it("does not flag workout with different sport as duplicate", () => {
      const cyclingActivity: NormalizedActivity = {
        id: "act-cycling-1",
        userId: "user-1",
        provider: "polar",
        providerRecordId: "p-303",
        sport: "cycling",
        title: "Cycling",
        startTime: "2026-10-26T08:00:00.000Z",
        durationSeconds: 3600,
        sourceConfidence: 0.95,
        createdAt: "2026-10-26T09:10:00.000Z"
      };

      const match = findDuplicateActivity(cyclingActivity, existingActivities);
      expect(match).toBeNull();
    });

    it("merges duplicate workouts across devices preserving best data (GPS from Garmin, strain/HR from WHOOP)", () => {
      const garminAct: NormalizedActivity = {
        id: "act-garmin-1",
        userId: "user-1",
        provider: "garmin",
        providerRecordId: "g-101",
        sport: "running",
        title: "Garmin Run",
        startTime: "2026-10-26T08:00:00.000Z",
        durationSeconds: 3600,
        distanceMeters: 10200,
        avgPowerWatts: 275,
        elevationGainMeters: 75,
        sourceConfidence: 0.98,
        createdAt: "2026-10-26T09:05:00.000Z"
      };

      const whoopAct: NormalizedActivity = {
        id: "act-whoop-1",
        userId: "user-1",
        provider: "whoop",
        providerRecordId: "w-202",
        sport: "running",
        title: "WHOOP Run",
        startTime: "2026-10-26T08:01:00.000Z",
        durationSeconds: 3580,
        avgHeartRate: 157,
        maxHeartRate: 174,
        trainingLoad: 82,
        sourceConfidence: 0.95,
        createdAt: "2026-10-26T09:10:00.000Z"
      };

      const merged = mergeDuplicateActivities(garminAct, whoopAct);

      expect(merged.mergedFrom).toHaveLength(2);
      expect(merged.distanceMeters).toBe(10200); // from Garmin
      expect(merged.avgPowerWatts).toBe(275); // from Garmin
      expect(merged.elevationGainMeters).toBe(75); // from Garmin
      expect(merged.avgHeartRate).toBe(157); // from WHOOP
      expect(merged.maxHeartRate).toBe(174); // from WHOOP
      expect(merged.trainingLoad).toBe(82); // from WHOOP
    });
  });

  describe("3. Multi-Source Priority Resolver", () => {
    it("resolves daily metrics according to priority ranking (WHOOP > Oura > Garmin)", () => {
      const records: NormalizedDaily[] = [
        {
          id: "daily-garmin",
          userId: "user-1",
          provider: "garmin",
          providerRecordId: "g-d1",
          date: "2026-10-26",
          restingHeartRateBpm: 48,
          hrvRmssdMs: 65,
          steps: 12500,
          sourceConfidence: 0.95,
          createdAt: "2026-10-26T08:00:00.000Z"
        },
        {
          id: "daily-oura",
          userId: "user-1",
          provider: "oura",
          providerRecordId: "o-d1",
          date: "2026-10-26",
          restingHeartRateBpm: 46,
          hrvRmssdMs: 78,
          skinTemperatureDeviationCelsius: -0.1,
          sourceConfidence: 0.98,
          createdAt: "2026-10-26T08:00:00.000Z"
        },
        {
          id: "daily-whoop",
          userId: "user-1",
          provider: "whoop",
          providerRecordId: "w-d1",
          date: "2026-10-26",
          restingHeartRateBpm: 45,
          hrvRmssdMs: 82,
          dayStrain: 14.8,
          sourceConfidence: 0.99,
          createdAt: "2026-10-26T08:00:00.000Z"
        }
      ];

      const customPriority = {
        ...DEFAULT_METRIC_PRIORITY,
        hrv: ["whoop", "oura", "garmin"] as DeviceProvider[],
        restingHR: ["whoop", "oura", "garmin"] as DeviceProvider[]
      };

      const resolved = resolveDailyBiometrics(records, customPriority);

      expect(resolved.hrvRmssdMs).toBe(82); // WHOOP won
      expect(resolved.restingHeartRateBpm).toBe(45); // WHOOP won
      expect(resolved.steps).toBe(12500); // From Garmin
      expect(resolved.dayStrain).toBe(14.8); // From WHOOP
      expect(resolved.skinTemperatureDeviationCelsius).toBe(-0.1); // From Oura
      expect(resolved.fieldSources?.["hrvRmssdMs"]).toBe("whoop");
      expect(resolved.fieldSources?.["steps"]).toBe("garmin");
      expect(resolved.fieldSources?.["skinTemperatureDeviationCelsius"]).toBe("oura");
    });

    it("resolves sleep stages and score with Oura prioritized over Garmin", () => {
      const records: NormalizedSleep[] = [
        {
          id: "sleep-garmin",
          userId: "user-1",
          provider: "garmin",
          providerRecordId: "g-s1",
          date: "2026-10-26",
          startTime: "2026-10-25T23:00:00.000Z",
          endTime: "2026-10-26T06:30:00.000Z",
          durationMinutes: 450,
          efficiencyScore: 84,
          sleepScore: 80,
          stages: {
            deepMinutes: 80,
            remMinutes: 90,
            lightMinutes: 240,
            awakeMinutes: 40
          },
          sourceConfidence: 0.9,
          createdAt: "2026-10-26T08:00:00.000Z"
        },
        {
          id: "sleep-oura",
          userId: "user-1",
          provider: "oura",
          providerRecordId: "o-s1",
          date: "2026-10-26",
          startTime: "2026-10-25T22:50:00.000Z",
          endTime: "2026-10-26T06:40:00.000Z",
          durationMinutes: 470,
          efficiencyScore: 92,
          sleepScore: 89,
          stages: {
            deepMinutes: 100,
            remMinutes: 110,
            lightMinutes: 230,
            awakeMinutes: 30
          },
          sourceConfidence: 0.99,
          createdAt: "2026-10-26T08:00:00.000Z"
        }
      ];

      const resolved = resolveSleepBiometrics(records);

      expect(resolved.sleepScore).toBe(89); // Oura
      expect(resolved.efficiencyScore).toBe(92);
      expect(resolved.durationMinutes).toBe(470);
      expect(resolved.stages?.deepMinutes).toBe(100);
    });
  });

  describe("4. File Import Pipeline", () => {
    it("processes a GPX file and flags duplicate correctly", async () => {
      const sampleGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Strava">
  <trk>
    <name>Sunday Long Run</name>
    <type>running</type>
    <trkseg>
      <trkpt lat="47.5" lon="19.0"><ele>100</ele><time>2026-10-26T08:00:00Z</time></trkpt>
      <trkpt lat="47.6" lon="19.1"><ele>110</ele><time>2026-10-26T09:00:00Z</time></trkpt>
    </trkseg>
  </trk>
</gpx>`;

      const existing: NormalizedActivity[] = [
        {
          id: "existing-1",
          userId: "u-1",
          provider: "garmin",
          providerRecordId: "rec-1",
          sport: "running",
          title: "Sunday Long Run",
          startTime: "2026-10-26T08:00:00.000Z",
          durationSeconds: 3600,
          sourceConfidence: 0.95,
          createdAt: "2026-10-26T09:30:00.000Z"
        }
      ];

      const result = await parseAndProcessFile("run.gpx", sampleGpx, "u-1", existing);

      expect(result.totalParsed).toBe(1);
      expect(result.items[0]!.status).toBe("duplicate");
      expect(result.duplicateCount).toBe(1);
      expect(result.createdCount).toBe(0);
    });
  });

  describe("5. Device Adapters & Mock Mode", () => {
    it("Garmin adapter generates realistic mock backfill and passes Zod schema", async () => {
      const adapter = new GarminAdapter(true);
      const backfill = await adapter.backfill("user-garmin", new Date());

      expect(backfill.activities.length).toBeGreaterThan(0);
      expect(backfill.sleep.length).toBeGreaterThan(0);
      expect(backfill.daily.length).toBeGreaterThan(0);

      expect(() => normalizedActivitySchema.parse(backfill.activities[0])).not.toThrow();
      expect(() => normalizedSleepSchema.parse(backfill.sleep[0])).not.toThrow();
      expect(() => normalizedDailySchema.parse(backfill.daily[0])).not.toThrow();
    });

    it("WHOOP adapter generates strain (0-21) and valid biometrics", async () => {
      const adapter = new WhoopAdapter(true);
      const backfill = await adapter.backfill("user-whoop", new Date());

      expect(backfill.daily[0]!.dayStrain).toBeGreaterThan(0);
      expect(backfill.daily[0]!.dayStrain).toBeLessThanOrEqual(21);
      expect(() => normalizedDailySchema.parse(backfill.daily[0])).not.toThrow();
    });

    it("Polar and Oura adapters function cleanly in mock mode", async () => {
      const polar = new PolarAdapter(true);
      const polarData = await polar.backfill("user-polar", new Date());
      expect(polarData.activities[0]!.sport).toBe("cycling");

      const oura = new OuraAdapter(true);
      const ouraData = await oura.backfill("user-oura", new Date());
      expect(ouraData.sleep[0]!.efficiencyScore).toBeGreaterThan(90);
    });

    it("Aggregator adapter is disabled by default and can be enabled", async () => {
      const aggregator = new AggregatorAdapter(true, { enabled: false });
      expect(aggregator.enabled).toBe(false);

      const connectResult = await aggregator.connect("user-agg", "https://app.apex/callback");
      expect(connectResult.connected).toBe(false);
      expect(connectResult.state).toBe("aggregator_disabled");

      aggregator.enable();
      expect(aggregator.enabled).toBe(true);
      const connectedResult = await aggregator.connect("user-agg", "https://app.apex/callback");
      expect(connectedResult.connected).toBe(true);
    });

    it("Metric priority config validates with Zod", () => {
      expect(() => metricPriorityConfigSchema.parse(DEFAULT_METRIC_PRIORITY)).not.toThrow();
    });
  });
});
