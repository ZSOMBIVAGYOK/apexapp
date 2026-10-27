import { describe, it, expect } from "vitest";
import {
  SPORT_CATALOG,
  getAllSports,
  getSportById,
  searchSports,
  getSportsByCategory,
  SPORT_CATEGORIES,
  SportCategory
} from "./index";

describe("Sport Catalog and Lookup Engine", () => {
  it("contains at least 80 sports in the catalog", () => {
    expect(SPORT_CATALOG.length).toBeGreaterThanOrEqual(80);
  });

  it("covers all 9 required categories", () => {
    const requiredCategories: SportCategory[] = [
      "endurance",
      "strength",
      "team",
      "combat",
      "racket",
      "water",
      "winter",
      "gymnastics",
      "other"
    ];

    requiredCategories.forEach((cat) => {
      const sportsInCat = getSportsByCategory(cat);
      expect(sportsInCat.length).toBeGreaterThan(0);
      expect(SPORT_CATEGORIES[cat]).toBeDefined();
    });
  });

  it("contains all critical requested sports", () => {
    const ids = SPORT_CATALOG.map((s) => s.id);
    expect(ids).toContain("running");
    expect(ids).toContain("road_cycling");
    expect(ids).toContain("swimming_pool");
    expect(ids).toContain("triathlon");
    expect(ids).toContain("weightlifting");
    expect(ids).toContain("powerlifting");
    expect(ids).toContain("crossfit");
    expect(ids).toContain("football");
    expect(ids).toContain("basketball");
    expect(ids).toContain("handball");
    expect(ids).toContain("water_polo");
    expect(ids).toContain("volleyball");
    expect(ids).toContain("ice_hockey");
    expect(ids).toContain("tennis");
    expect(ids).toContain("table_tennis");
    expect(ids).toContain("badminton");
    expect(ids).toContain("wrestling");
    expect(ids).toContain("judo");
    expect(ids).toContain("boxing");
    expect(ids).toContain("fencing");
    expect(ids).toContain("equestrian");
    expect(ids).toContain("alpine_skiing");
    expect(ids).toContain("artistic_gymnastics");
    expect(ids).toContain("yoga");
  });

  it("accurately finds sports by id or Hungarian name", () => {
    const triathlon = getSportById("triathlon");
    expect(triathlon).toBeDefined();
    expect(triathlon?.nameHu).toBe("Triatlon");
    expect(triathlon?.metricProfile).toBe("distance_duration");

    const judo = getSportById("judo");
    expect(judo?.category).toBe("combat");
    expect(judo?.metricProfile).toBe("rounds_time");
  });

  it("performs full-text search across Hungarian and English names", () => {
    const kayakResults = searchSports("kajak");
    expect(kayakResults.some((s) => s.id === "kayak")).toBe(true);

    const fencers = searchSports("fencing");
    expect(fencers.some((s) => s.id === "fencing")).toBe(true);

    const weightlifters = searchSports("súlyemelés");
    expect(weightlifters.some((s) => s.id === "weightlifting")).toBe(true);
  });

  it("supports user custom sports alongside standard catalog", () => {
    const customSport = {
      id: "custom_speed_hiking",
      nameHu: "Gyorshegymászás",
      nameEn: "Speed Hiking",
      category: "endurance" as const,
      metricProfile: "distance_duration" as const,
      isCustom: true
    };

    const all = getAllSports([customSport]);
    expect(all.length).toBe(SPORT_CATALOG.length + 1);

    const found = getSportById("custom_speed_hiking", [customSport]);
    expect(found?.nameHu).toBe("Gyorshegymászás");
  });
});
