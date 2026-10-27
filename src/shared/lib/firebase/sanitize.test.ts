import { describe, it, expect } from "vitest";
import { sanitizeForFirestore } from "./sanitize";

describe("sanitizeForFirestore", () => {
  it("removes top-level undefined properties", () => {
    const input = {
      name: "Teszt Sportoló",
      birthDate: undefined,
      heightCm: 180,
      weightKg: undefined
    };
    const output = sanitizeForFirestore(input);
    expect(output).toEqual({
      name: "Teszt Sportoló",
      heightCm: 180
    });
    expect("birthDate" in output).toBe(false);
    expect("weightKg" in output).toBe(false);
  });

  it("removes nested undefined properties in maps", () => {
    const input = {
      consent: {
        healthData: {
          accepted: true,
          version: "1.0.0",
          timestamp: undefined
        },
        marketing: undefined
      }
    };
    const output = sanitizeForFirestore(input);
    expect(output).toEqual({
      consent: {
        healthData: {
          accepted: true,
          version: "1.0.0"
        }
      }
    });
  });

  it("filters undefined items from arrays", () => {
    const input = {
      sports: ["Futás", undefined, "Úszás"],
      tags: [undefined]
    };
    const output = sanitizeForFirestore(input);
    expect(output).toEqual({
      sports: ["Futás", "Úszás"],
      tags: []
    });
  });

  it("converts Date objects to ISO strings", () => {
    const date = new Date("2026-10-27T12:00:00.000Z");
    const input = { createdAt: date };
    const output = sanitizeForFirestore(input);
    expect(output).toEqual({ createdAt: "2026-10-27T12:00:00.000Z" });
  });

  it("handles primitives and null values safely", () => {
    expect(sanitizeForFirestore(null)).toBe(null);
    expect(sanitizeForFirestore("string")).toBe("string");
    expect(sanitizeForFirestore(42)).toBe(42);
    expect(sanitizeForFirestore(true)).toBe(true);
  });
});
