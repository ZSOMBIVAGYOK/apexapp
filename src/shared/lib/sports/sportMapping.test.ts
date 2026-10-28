import { describe, it, expect } from "vitest";
import {
  mapFitSport,
  mapActivityNameToSport,
  isMultisportTriathlon,
  FIT_SPORT
} from "./sportMapping";
import { SPORT_CATALOG } from "./catalog";

describe("Sport Mapping & Detection Suite", () => {
  describe("1. FIT Protocol Sport & SubSport Enum Mapping", () => {
    it("maps FIT sport 37 strictly to stand_up_paddling (SUP != triathlon)", () => {
      const result = mapFitSport(37, 0);
      expect(result.sportId).toBe("stand_up_paddling");
      expect(result.sportNameHu).toContain("SUP");
      expect(result.sportId).not.toBe("triathlon");
      expect(result.isAmbiguous).toBe(false);
    });

    it("maps standard sports accurately (running, cycling, swimming, rowing, strength)", () => {
      expect(mapFitSport(FIT_SPORT.running, 0).sportId).toBe("running");
      expect(mapFitSport(FIT_SPORT.cycling, 0).sportId).toBe("road_cycling");
      expect(mapFitSport(FIT_SPORT.swimming, 0).sportId).toBe("swimming");
      expect(mapFitSport(FIT_SPORT.rowing, 0).sportId).toBe("rowing");
      expect(mapFitSport(FIT_SPORT.training, 0).sportId).toBe("strength");
    });

    it("maps water sports (kayaking, canoeing, rafting, windsurfing, kitesurfing, surfing, sailing)", () => {
      expect(mapFitSport(FIT_SPORT.paddling, 18).sportId).toBe("kayak");
      expect(mapFitSport(FIT_SPORT.paddling, 19).sportId).toBe("canoe");
      expect(mapFitSport(FIT_SPORT.paddling, 20).sportId).toBe("rafting");
      expect(mapFitSport(FIT_SPORT.windsurfing, 0).sportId).toBe("windsurfing");
      expect(mapFitSport(FIT_SPORT.kitesurfing, 0).sportId).toBe("kitesurfing");
      expect(mapFitSport(FIT_SPORT.surfing, 0).sportId).toBe("surfing");
      expect(mapFitSport(FIT_SPORT.sailing, 0).sportId).toBe("sailing");
    });

    it("maps winter & mountain sports (ski touring, roller skiing, alpine, cross country, hiking, climbing)", () => {
      expect(mapFitSport(FIT_SPORT.alpine_skiing, 37).sportId).toBe("ski_touring");
      expect(mapFitSport(FIT_SPORT.cross_country_skiing, 38).sportId).toBe("roller_skiing");
      expect(mapFitSport(FIT_SPORT.alpine_skiing, 0).sportId).toBe("alpine_skiing");
      expect(mapFitSport(FIT_SPORT.cross_country_skiing, 0).sportId).toBe("cross_country_skiing");
      expect(mapFitSport(FIT_SPORT.hiking, 0).sportId).toBe("hiking");
      expect(mapFitSport(FIT_SPORT.rock_climbing, 0).sportId).toBe("climbing_bouldering");
    });
  });

  describe("2. Triathlon Multisport Validation", () => {
    it("selects triathlon ONLY when swim, bike, and run segments are all present", () => {
      const realTriathlonLaps = [
        { sport: FIT_SPORT.swimming },
        { sport: FIT_SPORT.transition },
        { sport: FIT_SPORT.cycling },
        { sport: FIT_SPORT.transition },
        { sport: FIT_SPORT.running }
      ];

      expect(isMultisportTriathlon(realTriathlonLaps)).toBe(true);
      const mapped = mapFitSport(FIT_SPORT.multisport, 0, realTriathlonLaps);
      expect(mapped.sportId).toBe("triathlon");
    });

    it("does NOT classify generic multisport without all 3 disciplines as triathlon", () => {
      const runAndStrengthLaps = [
        { sport: FIT_SPORT.running },
        { sport: FIT_SPORT.training }
      ];

      expect(isMultisportTriathlon(runAndStrengthLaps)).toBe(false);
      const mapped = mapFitSport(FIT_SPORT.multisport, 0, runAndStrengthLaps);
      expect(mapped.sportId).not.toBe("triathlon");
      expect(mapped.isAmbiguous).toBe(true);
    });
  });

  describe("3. Free Text / Name Mapping (Case-insensitivity, Accents, Prefixes)", () => {
    it("handles Hungarian and English variations with accents and normalized strings", () => {
      expect(mapActivityNameToSport("Stand Up Paddleboarding").sportId).toBe("stand_up_paddling");
      expect(mapActivityNameToSport("Stand-up paddle").sportId).toBe("stand_up_paddling");
      expect(mapActivityNameToSport("Könnyű délutáni SUP túra").sportId).toBe("stand_up_paddling");
      expect(mapActivityNameToSport("reggeli futás").sportId).toBe("running");
      expect(mapActivityNameToSport("Reggeli Futas").sportId).toBe("running");
      expect(mapActivityNameToSport("Országúti kerékpározás").sportId).toBe("road_cycling");
      expect(mapActivityNameToSport("Terepfutás a Pilisben").sportId).toBe("trail_running");
      expect(mapActivityNameToSport("Konditermi edzés").sportId).toBe("strength");
      expect(mapActivityNameToSport("Úszás 25m medencében").sportId).toBe("swimming");
    });

    it("marks unknown sports as ambiguous and provides suggestions", () => {
      const result = mapActivityNameToSport("Unicorn Racing Championship 2026");
      expect(result.sportId).toBe("other");
      expect(result.isAmbiguous).toBe(true);
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.suggestedAlternatives.length).toBeGreaterThan(0);
    });
  });

  describe("4. Catalog Completeness", () => {
    it("verifies all core new sports exist in SPORT_CATALOG with Hungarian names", () => {
      const requiredSportIds = [
        "stand_up_paddling",
        "kayak",
        "canoe",
        "rafting",
        "windsurfing",
        "kitesurfing",
        "surfing",
        "sailing",
        "rowing",
        "ski_touring",
        "roller_skiing",
        "alpine_skiing",
        "cross_country_skiing",
        "hiking",
        "climbing_bouldering",
        "cycling",
        "road_cycling",
        "running",
        "swimming",
        "strength"
      ];

      for (const id of requiredSportIds) {
        const found = SPORT_CATALOG.find((s) => s.id === id);
        expect(found, `Expected sport '${id}' to exist in SPORT_CATALOG`).toBeDefined();
        expect(found?.nameHu).toBeTruthy();
        expect(found?.nameEn).toBeTruthy();
      }
    });
  });
});
