import { describe, it, expect } from "vitest";
import {
  downsampleTimeSeries,
  mapFileSportToCatalog,
  findDuplicateSession,
  mergeFileIntoSession,
  parseWorkoutFile,
  MAX_FILE_SIZE_BYTES
} from "./workoutFileService";
import { CompletedSessionDocument, SessionTimeSeriesPoint } from "@shared/types/dataModel";

describe("WorkoutFileService - Browser-side Parsers, Prefill & Time-Series", () => {
  describe("1. Downsample Time Series (Max 500 points)", () => {
    it("preserves small series (<= 500 points) intact", () => {
      const points: SessionTimeSeriesPoint[] = [
        { timeOffsetSeconds: 0, heartRate: 120 },
        { timeOffsetSeconds: 10, heartRate: 130 },
        { timeOffsetSeconds: 20, heartRate: 140 }
      ];

      const result = downsampleTimeSeries(points, 500);
      expect(result).toHaveLength(3);
      expect(result[0]!.timeOffsetSeconds).toBe(0);
      expect(result[2]!.timeOffsetSeconds).toBe(20);
    });

    it("downsamples large series (> 500 points) to exactly 500 points", () => {
      const points: SessionTimeSeriesPoint[] = Array.from({ length: 1500 }, (_, i) => ({
        timeOffsetSeconds: i * 2,
        heartRate: 120 + (i % 50),
        elevationMeters: 100 + i * 0.1,
        lat: 47.49 + i * 0.0001,
        lon: 19.04 + i * 0.0001
      }));

      const result = downsampleTimeSeries(points, 500);
      expect(result).toHaveLength(500);

      // Must preserve the first and last points
      expect(result[0]!.timeOffsetSeconds).toBe(0);
      expect(result[result.length - 1]!.timeOffsetSeconds).toBe(1499 * 2);
    });

    it("handles empty and edge case arrays safely", () => {
      expect(downsampleTimeSeries([])).toHaveLength(0);
      expect(downsampleTimeSeries([{ timeOffsetSeconds: 0 }])).toHaveLength(1);
    });
  });

  describe("2. Sport Catalog Mapping", () => {
    it("maps standard and common Hungarian/English sport names correctly", () => {
      expect(mapFileSportToCatalog("running", "Morning Jog")).toMatchObject({
        sportId: "running",
        isSportKnown: true
      });

      expect(mapFileSportToCatalog("cycling", "Afternoon Ride")).toMatchObject({
        sportId: "cycling",
        isSportKnown: true
      });

      expect(mapFileSportToCatalog("swimming", "Lap Swimming")).toMatchObject({
        sportId: "swimming",
        isSportKnown: true
      });

      expect(mapFileSportToCatalog("rowing", "Morning Erg")).toMatchObject({
        sportId: "rowing",
        isSportKnown: true
      });

      expect(mapFileSportToCatalog("strength", "Leg Day")).toMatchObject({
        sportId: "strength",
        isSportKnown: true
      });
    });

    it("extracts sport from title keywords if rawSport is other", () => {
      const result = mapFileSportToCatalog("other", "Könnyű esti futás");
      expect(result.sportId).toBe("running");
      expect(result.isSportKnown).toBe(true);

      const bikeResult = mapFileSportToCatalog("other", "Országúti bringázás a hegyen");
      expect(["cycling", "road_cycling"]).toContain(bikeResult.sportId);
      expect(bikeResult.isSportKnown).toBe(true);
    });

    it("marks unknown sports as other with isSportKnown=false", () => {
      const result = mapFileSportToCatalog("unknown_custom_activity_xyz", "Interstellar Quidditch Tournament");
      expect(result.isSportKnown).toBe(false);
      expect(result.sportId).toBe("other");
    });
  });

  describe("3. Duplicate Session Detection", () => {
    const existingSessions: CompletedSessionDocument[] = [
      {
        sessionId: "sess-run-101",
        athleteId: "athlete-1",
        date: "2026-10-26",
        sport: "running",
        title: "Kedd reggeli futás",
        startTime: "2026-10-26T07:05:00.000Z",
        durationMinutes: 45,
        rpe: 6,
        targetIntensityRpe: 6,
        trainingLoad: 270,
        completed: true,
        source: "manual",
        confidence: 0.95,
        updatedBy: "athlete-1",
        createdAt: "2026-10-26T08:00:00Z",
        updatedAt: "2026-10-26T08:00:00Z"
      },
      {
        sessionId: "sess-bike-202",
        athleteId: "athlete-1",
        date: "2026-10-26",
        sport: "cycling",
        title: "Délutáni bringa",
        startTime: "2026-10-26T15:30:00.000Z",
        durationMinutes: 90,
        rpe: 7,
        targetIntensityRpe: 7,
        trainingLoad: 630,
        completed: true,
        source: "manual",
        confidence: 0.95,
        updatedBy: "athlete-1",
        createdAt: "2026-10-26T17:00:00Z",
        updatedAt: "2026-10-26T17:00:00Z"
      }
    ];

    it("identifies existing session with similar start time (+-10 minutes) and duration", () => {
      const match = findDuplicateSession(
        {
          isoStartTime: "2026-10-26T07:10:00.000Z", // 5 min difference
          durationMinutes: 44, // 1 min difference
          sportId: "running"
        },
        existingSessions
      );

      expect(match).not.null;
      expect(match!.existingSession.sessionId).toBe("sess-run-101");
      expect(match!.timeDiffMinutes).toBeCloseTo(5, 1);
    });

    it("returns null if start time is outside the 10-minute window", () => {
      const match = findDuplicateSession(
        {
          isoStartTime: "2026-10-26T07:25:00.000Z", // 20 min difference
          durationMinutes: 45,
          sportId: "running"
        },
        existingSessions
      );

      expect(match).toBeNull();
    });

    it("returns null if sports do not match", () => {
      const match = findDuplicateSession(
        {
          isoStartTime: "2026-10-26T07:05:00.000Z", // exact same time
          durationMinutes: 45,
          sportId: "swimming" // different sport
        },
        existingSessions
      );

      expect(match).toBeNull();
    });
  });

  describe("4. Session Merging", () => {
    const existingManualSession: CompletedSessionDocument = {
      sessionId: "sess-manual-1",
      athleteId: "ath-1",
      date: "2026-10-26",
      sport: "running",
      title: "Könnyű futás",
      startTime: "2026-10-26T07:00:00Z",
      durationMinutes: 45,
      rpe: 7,
      targetIntensityRpe: 6,
      trainingLoad: 315,
      notes: "Kicsit fáradt voltam az elején.",
      equipmentIds: ["shoes-01"],
      completed: true,
      source: "manual",
      confidence: 0.95,
      updatedBy: "ath-1",
      createdAt: "2026-10-26T08:00:00Z",
      updatedAt: "2026-10-26T08:00:00Z"
    };

    it("merges file metrics, time series and storage reference while preserving athlete RPE and notes", () => {
      const parsedMock = {
        fileName: "morning_run.gpx",
        fileType: "gpx" as const,
        fileSizeBytes: 102400,
        sportId: "running",
        isSportKnown: true,
        date: "2026-10-26",
        startTime: "07:00",
        isoStartTime: "2026-10-26T07:00:00Z",
        durationMinutes: 48,
        durationSeconds: 2880,
        distanceKm: 8.52,
        avgHeartRate: 154,
        maxHeartRate: 172,
        avgPowerWatts: 265,
        elevationGainMeters: 65,
        calories: 580,
        computedLoad: 68,
        title: "Morning 8.5k Run",
        timeSeries: {
          points: [
            { timeOffsetSeconds: 0, heartRate: 120 },
            { timeOffsetSeconds: 1440, heartRate: 154 },
            { timeOffsetSeconds: 2880, heartRate: 168 }
          ],
          svgRouteOutline: "M 0,0 L 50,50"
        },
        activity: {
          id: "act-1",
          userId: "ath-1",
          provider: "file" as const,
          providerRecordId: "morning_run.gpx",
          sport: "running" as const,
          title: "Morning 8.5k Run",
          startTime: "2026-10-26T07:00:00Z",
          durationSeconds: 2880,
          sourceConfidence: 1,
          createdAt: "2026-10-26T08:00:00Z"
        }
      };

      const storageRef = "athletes/ath-1/workouts/sess-manual-1/morning_run.gpx";
      const merged = mergeFileIntoSession(existingManualSession, parsedMock, storageRef);

      expect(merged.source).toBe("file");
      expect(merged.fileRef).toBe(storageRef);
      expect(merged.fileName).toBe("morning_run.gpx");
      expect(merged.metrics?.distanceMeters).toBe(8520);
      expect(merged.metrics?.avgHeartRate).toBe(154);
      expect(merged.metrics?.maxHeartRate).toBe(172);
      expect(merged.metrics?.avgPowerWatts).toBe(265);
      expect(merged.metrics?.elevationGainMeters).toBe(65);
      expect(merged.timeSeries?.points).toHaveLength(3);
      expect(merged.timeSeries?.svgRouteOutline).toBe("M 0,0 L 50,50");

      // Preserves existing athlete inputs
      expect(merged.rpe).toBe(7);
      expect(merged.notes).toBe("Kicsit fáradt voltam az elején.");
      expect(merged.equipmentIds).toEqual(["shoes-01"]);
    });
  });

  describe("5. File Parsing & Validation", () => {
    it("rejects files exceeding 25 MB with Hungarian error message", async () => {
      const hugeFile = {
        name: "huge_workout.fit",
        size: MAX_FILE_SIZE_BYTES + 1024,
        content: new Uint8Array(10)
      };

      await expect(parseWorkoutFile(hugeFile)).rejects.toThrow(
        "A fájl mérete meghaladja a 25 MB-os határt."
      );
    });

    it("rejects unsupported extensions with Hungarian error message", async () => {
      const unsupportedFile = {
        name: "activity.pdf",
        size: 1024,
        content: "sample text"
      };

      await expect(parseWorkoutFile(unsupportedFile)).rejects.toThrow(
        "Nem támogatott fájlformátum. Kérlek FIT, GPX vagy TCX fájlt tölts fel."
      );
    });

    it("parses GPX file content into prefill metrics and downsampled points", async () => {
      const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Garmin Connect" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Hármashatárhegy Trail Run</name>
    <type>running</type>
    <trkseg>
      <trkpt lat="47.5500" lon="19.0000">
        <ele>220.0</ele>
        <time>2026-10-26T08:00:00Z</time>
        <extensions><hr>135</hr><power>210</power></extensions>
      </trkpt>
      <trkpt lat="47.5520" lon="19.0030">
        <ele>260.0</ele>
        <time>2026-10-26T08:15:00Z</time>
        <extensions><hr>162</hr><power>280</power></extensions>
      </trkpt>
      <trkpt lat="47.5550" lon="19.0060">
        <ele>290.0</ele>
        <time>2026-10-26T08:30:00Z</time>
        <extensions><hr>168</hr><power>295</power></extensions>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

      const file = {
        name: "trail.gpx",
        size: gpxContent.length,
        content: gpxContent
      };

      const result = await parseWorkoutFile(file);

      expect(result.fileType).toBe("gpx");
      expect(result.sportId).toBe("running");
      expect(result.date).toBe("2026-10-26");
      expect(result.durationMinutes).toBe(30);
      expect(result.avgHeartRate).toBeGreaterThan(150);
      expect(result.timeSeries.points).toHaveLength(3);
      expect(result.timeSeries.svgRouteOutline).toBeTruthy();
    });

    it("parses TCX file content into prefill metrics and laps", async () => {
      const tcxContent = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Activities>
    <Activity Sport="Biking">
      <Id>2026-10-26T10:00:00Z</Id>
      <Lap StartTime="2026-10-26T10:00:00Z">
        <TotalTimeSeconds>1800</TotalTimeSeconds>
        <DistanceMeters>12000</DistanceMeters>
        <Calories>450</Calories>
        <AverageHeartRateBpm><Value>142</Value></AverageHeartRateBpm>
        <MaximumHeartRateBpm><Value>165</Value></MaximumHeartRateBpm>
        <Watts>235</Watts>
        <Track>
          <Trackpoint>
            <Time>2026-10-26T10:00:00Z</Time>
            <AltitudeMeters>110</AltitudeMeters>
            <HeartRateBpm><Value>130</Value></HeartRateBpm>
            <Extensions><Watts>210</Watts></Extensions>
          </Trackpoint>
          <Trackpoint>
            <Time>2026-10-26T10:30:00Z</Time>
            <AltitudeMeters>130</AltitudeMeters>
            <HeartRateBpm><Value>155</Value></HeartRateBpm>
            <Extensions><Watts>260</Watts></Extensions>
          </Trackpoint>
        </Track>
      </Lap>
    </Activity>
  </Activities>
</TrainingCenterDatabase>`;

      const file = {
        name: "ride.tcx",
        size: tcxContent.length,
        content: tcxContent
      };

      const result = await parseWorkoutFile(file);

      expect(result.fileType).toBe("tcx");
      expect(result.sportId).toBe("cycling");
      expect(result.durationMinutes).toBe(30);
      expect(result.distanceKm).toBe(12);
      expect(result.calories).toBe(450);
      expect(result.avgPowerWatts).toBe(235);
      expect(result.timeSeries.points).toHaveLength(2);
    });

    it("rejects corrupt or unparseable FIT binary header with clear Hungarian error", async () => {
      const header = new Uint8Array(14);
      header[0] = 14;
      header[1] = 0x20;
      header[2] = 0x5c;
      header[3] = 0x08;
      header[4] = 0;
      header[5] = 0;
      header[6] = 0;
      header[7] = 0;
      header[8] = 0x2e; // '.'
      header[9] = 0x46; // 'F'
      header[10] = 0x49; // 'I'
      header[11] = 0x47; // invalid signature test ('FIG' instead of 'FIT')
      header[12] = 0;
      header[13] = 0;

      const file = {
        name: "corrupt.fit",
        size: 14,
        content: header
      };

      await expect(parseWorkoutFile(file)).rejects.toThrow("A fájl nem tartalmaz feldolgozható edzésadatot.");
    });
  });
});
