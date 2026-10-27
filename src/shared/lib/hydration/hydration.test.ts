import { describe, it, expect } from "vitest";
import {
  STANDARD_BEVERAGES,
  calculateEffectiveHydration,
  calculateHydrationTotals,
  HydrationLogEntry
} from "./beverages";

describe("Beverage Hydration Engine", () => {
  it("defines standard beverages with evidence-based hydration factors", () => {
    const water = STANDARD_BEVERAGES.find((b) => b.id === "water");
    expect(water?.hydrationFactor).toBe(1.0);

    const electrolyte = STANDARD_BEVERAGES.find((b) => b.id === "electrolyte_ors");
    expect(electrolyte?.hydrationFactor).toBeGreaterThan(1.0); // 1.15

    const milk = STANDARD_BEVERAGES.find((b) => b.id === "milk");
    expect(milk?.hydrationFactor).toBeGreaterThan(1.1); // 1.2

    const beer = STANDARD_BEVERAGES.find((b) => b.id === "beer_alcohol");
    expect(beer?.hydrationFactor).toBeLessThan(0.8); // 0.65
    expect(beer?.noteHu).toBeDefined();
  });

  it("accurately calculates effective hydration for given volumes", () => {
    // 500ml water -> 500ml
    expect(calculateEffectiveHydration(500, 1.0)).toBe(500);

    // 500ml electrolyte (1.15) -> 575ml
    expect(calculateEffectiveHydration(500, 1.15)).toBe(575);

    // 500ml beer (0.65) -> 325ml
    expect(calculateEffectiveHydration(500, 0.65)).toBe(325);

    // 250ml milk (1.20) -> 300ml
    expect(calculateEffectiveHydration(250, 1.2)).toBe(300);
  });

  it("calculates daily hydration summary comparing raw vs effective volume", () => {
    const mockEntries: HydrationLogEntry[] = [
      {
        id: "1",
        athleteId: "ath-1",
        timestamp: "2026-10-27T08:00:00Z",
        timeStr: "08:00",
        date: "2026-10-27",
        beverageId: "water",
        beverageName: "Víz",
        volumeMl: 500,
        hydrationFactor: 1.0,
        effectiveVolumeMl: 500,
        caffeineMg: 0,
        sugarGrams: 0,
        sodiumMg: 25,
        icon: "💧",
        color: "#0284c7"
      },
      {
        id: "2",
        athleteId: "ath-1",
        timestamp: "2026-10-27T09:30:00Z",
        timeStr: "09:30",
        date: "2026-10-27",
        beverageId: "coffee",
        beverageName: "Kávé",
        volumeMl: 150,
        hydrationFactor: 0.95,
        effectiveVolumeMl: 143,
        caffeineMg: 98,
        sugarGrams: 0,
        sodiumMg: 3,
        icon: "☕",
        color: "#854d0e"
      },
      {
        id: "3",
        athleteId: "ath-1",
        timestamp: "2026-10-27T11:00:00Z",
        timeStr: "11:00",
        date: "2026-10-27",
        beverageId: "electrolyte_ors",
        beverageName: "ORS",
        volumeMl: 500,
        hydrationFactor: 1.15,
        effectiveVolumeMl: 575,
        caffeineMg: 0,
        sugarGrams: 10,
        sodiumMg: 550,
        icon: "🧂",
        color: "#06b6d4"
      }
    ];

    const summary = calculateHydrationTotals(mockEntries, 3500);

    // Raw volume: 500 + 150 + 500 = 1150 ml
    expect(summary.totalRawVolumeMl).toBe(1150);

    // Effective hydration: 500 + 143 + 575 = 1218 ml
    expect(summary.totalEffectiveVolumeMl).toBe(1218);

    // Caffeine: 98 mg
    expect(summary.totalCaffeineMg).toBe(98);

    // Sugar: 10 g
    expect(summary.totalSugarGrams).toBe(10);

    // Sodium: 25 + 3 + 550 = 578 mg
    expect(summary.totalSodiumMg).toBe(578);

    // Progress: 1218 / 3500 = 35%
    expect(summary.progressPercent).toBe(35);
  });
});
