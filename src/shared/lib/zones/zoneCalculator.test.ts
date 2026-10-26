import { describe, it, expect } from "vitest";
import {
  formatPaceSeconds,
  parsePaceString,
  calculateDefaultHeartRateZones,
  calculateDefaultPowerZones,
  calculateDefaultPaceZones,
  calculateAllZones
} from "./zoneCalculator";

describe("Thresholds & Zones Engine", () => {
  describe("Pace formatting and parsing", () => {
    it("formats seconds into M:SS pace format", () => {
      expect(formatPaceSeconds(270)).toBe("4:30");
      expect(formatPaceSeconds(305)).toBe("5:05");
      expect(formatPaceSeconds(225)).toBe("3:45");
      expect(formatPaceSeconds(0)).toBe("--:--");
    });

    it("parses M:SS pace string into seconds", () => {
      expect(parsePaceString("4:30")).toBe(270);
      expect(parsePaceString("5:05")).toBe(305);
      expect(parsePaceString("3:45")).toBe(225);
      expect(parsePaceString("")).toBe(0);
    });
  });

  describe("calculateDefaultHeartRateZones", () => {
    it("calculates 5 zones based on LTHR (Joe Friel standard)", () => {
      const lthr = 170;
      const zones = calculateDefaultHeartRateZones(lthr, 192);

      expect(zones).toHaveLength(5);

      // Z1 < 85% of LTHR
      expect(zones[0]!.zoneNumber).toBe(1);
      expect(zones[0]!.max).toBe(Math.round(170 * 0.84));

      // Z2 85-89%
      expect(zones[1]!.zoneNumber).toBe(2);
      expect(zones[1]!.min).toBe(Math.round(170 * 0.85));
      expect(zones[1]!.max).toBe(Math.round(170 * 0.89));

      // Z4 95-100% (Threshold)
      expect(zones[3]!.zoneNumber).toBe(4);
      expect(zones[3]!.min).toBe(Math.round(170 * 0.95));
      expect(zones[3]!.max).toBe(170);

      // Z5 > 100%
      expect(zones[4]!.zoneNumber).toBe(5);
      expect(zones[4]!.min).toBe(Math.round(170 * 1.01));
    });

    it("falls back to Max HR percentage model when LTHR is not provided", () => {
      const maxHr = 190;
      const zones = calculateDefaultHeartRateZones(undefined, maxHr);

      expect(zones).toHaveLength(5);
      expect(zones[0]!.min).toBe(Math.round(maxHr * 0.5));
      expect(zones[4]!.max).toBe(maxHr);
    });
  });

  describe("calculateDefaultPowerZones", () => {
    it("calculates 5 zones from FTP based on Coggan standard", () => {
      const ftp = 300;
      const zones = calculateDefaultPowerZones(ftp);

      expect(zones).toHaveLength(5);

      // Z1 < 55%
      expect(zones[0]!.max).toBe(Math.round(300 * 0.55));

      // Z2 56-75% (Endurance)
      expect(zones[1]!.min).toBe(Math.round(300 * 0.56));
      expect(zones[1]!.max).toBe(Math.round(300 * 0.75));

      // Z4 91-105% (Threshold)
      expect(zones[3]!.min).toBe(Math.round(300 * 0.91));
      expect(zones[3]!.max).toBe(Math.round(300 * 1.05));

      // Z5 > 105% (VO2max)
      expect(zones[4]!.min).toBe(Math.round(300 * 1.06));
    });
  });

  describe("calculateDefaultPaceZones", () => {
    it("calculates 5 running pace zones from threshold pace (sec/km)", () => {
      // 4:00/km threshold pace = 240 seconds
      const zones = calculateDefaultPaceZones(240);

      expect(zones).toHaveLength(5);
      // All zones have formatted min/max strings
      zones.forEach((z) => {
        expect(typeof z.min).toBe("string");
        expect(typeof z.max).toBe("string");
        expect(z.min).toContain(":");
        expect(z.max).toContain(":");
      });

      // Z4 contains threshold pace ~4:00
      expect(zones[3]!.zoneNumber).toBe(4);
    });
  });

  describe("calculateAllZones", () => {
    it("derives all zone collections from athlete thresholds", () => {
      const allZones = calculateAllZones({
        maxHr: 195,
        lthr: 172,
        ftp: 280,
        thresholdPaceSeconds: 270
      });

      expect(allZones.hrZones).toHaveLength(5);
      expect(allZones.powerZones).toHaveLength(5);
      expect(allZones.paceZones).toHaveLength(5);
      expect(allZones.updatedAt).toBeDefined();
    });
  });
});
