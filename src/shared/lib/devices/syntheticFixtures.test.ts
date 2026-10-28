import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { parseFIT } from "./parsers/fitParser";
import { parseGPX } from "./parsers/gpxParser";
import { parseTCX } from "./parsers/tcxParser";
import { parseWorkoutFile } from "./workoutFileService";

describe("Synthetic Workout Fixtures Test Suite", () => {
  const fixturesDir = path.resolve(process.cwd(), "test-fixtures/synthetic");

  it("1. stand_up_paddling.fit: parses strictly as SUP (NOT triathlon), load is NOT 1", async () => {
    const fileBuf = fs.readFileSync(path.join(fixturesDir, "stand_up_paddling.fit"));
    const rawFit = parseFIT(fileBuf, "stand_up_paddling.fit");

    expect(rawFit.sport).toBe("stand_up_paddling");
    expect(rawFit.sport).not.toBe("triathlon");
    expect(rawFit.trainingLoad).toBeGreaterThan(1);
    expect(rawFit.loadSourceLabelHu).toBeTruthy();

    const result = await parseWorkoutFile({
      name: "stand_up_paddling.fit",
      size: fileBuf.length,
      content: fileBuf
    });

    expect(result.sportId).toBe("stand_up_paddling");
    expect(result.detectedSportNameHu).toContain("SUP");
    expect(result.computedLoad).toBeGreaterThan(1);
    expect(result.isSportKnown).toBe(true);
  });

  it("2. complete_run.fit: parses all channels (speed, HR, power, cadence, elevation, temp)", async () => {
    const fileBuf = fs.readFileSync(path.join(fixturesDir, "complete_run.fit"));
    const result = await parseWorkoutFile({
      name: "complete_run.fit",
      size: fileBuf.length,
      content: fileBuf
    });

    expect(result.sportId).toBe("running");
    expect(result.channels?.hasHr).toBe(true);
    expect(result.channels?.hasSpeed).toBe(true);
    expect(result.channels?.hasPower).toBe(true);
    expect(result.channels?.hasCadence).toBe(true);
    expect(result.channels?.hasElevation).toBe(true);
    expect(result.channels?.hasTemperature).toBe(true);
    expect(result.computedLoad).toBeGreaterThan(1);
    expect(result.loadSourceLabelHu).toBe("pulzus alapú");
    expect(result.timeSeries.points.length).toBeGreaterThan(0);
  });

  it("3. missing_speed_indoor.fit: handles missing speed gracefully with Hungarian warning", async () => {
    const fileBuf = fs.readFileSync(path.join(fixturesDir, "missing_speed_indoor.fit"));
    const result = await parseWorkoutFile({
      name: "missing_speed_indoor.fit",
      size: fileBuf.length,
      content: fileBuf
    });

    expect(result.channels?.hasSpeed).toBe(false);
    expect(result.channels?.hasHr).toBe(true);
    expect(result.warningsHu?.some((w) => w.includes("sebesség"))).toBe(true);
  });

  it("4. hr_dropouts_spikes.fit: filters 0, 255, and sudden spikes", async () => {
    const fileBuf = fs.readFileSync(path.join(fixturesDir, "hr_dropouts_spikes.fit"));
    const result = await parseWorkoutFile({
      name: "hr_dropouts_spikes.fit",
      size: fileBuf.length,
      content: fileBuf
    });

    const hrs = result.timeSeries.points.map((p) => p.heartRate);
    // Neither 0 nor 255 should be in the cleaned points
    expect(hrs.includes(0)).toBe(false);
    expect(hrs.includes(255)).toBe(false);
    expect(result.warningsHu?.some((w) => w.includes("Pulzus") || w.includes("kiesés"))).toBe(true);
  });

  it("5. triathlon_multisport.fit: chooses triathlon only for real multisport with swim+bike+run", async () => {
    const fileBuf = fs.readFileSync(path.join(fixturesDir, "triathlon_multisport.fit"));
    const rawFit = parseFIT(fileBuf, "triathlon_multisport.fit");

    expect(rawFit.sport).toBe("triathlon");
    expect(rawFit.laps?.length).toBe(3);
  });

  it("6. sup_activity.gpx and sup_activity.tcx: detect SUP from XML tags", async () => {
    const gpxText = fs.readFileSync(path.join(fixturesDir, "sup_activity.gpx"), "utf8");
    const gpxResult = parseGPX(gpxText, "sup_activity.gpx");
    expect(gpxResult.sport).toBe("stand_up_paddling");

    const tcxText = fs.readFileSync(path.join(fixturesDir, "sup_activity.tcx"), "utf8");
    const tcxResult = parseTCX(tcxText, "sup_activity.tcx");
    expect(tcxResult.sport).toBe("stand_up_paddling");
  });
});
