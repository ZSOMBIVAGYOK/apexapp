import { describe, it, expect } from "vitest";
import { evaluateFirestoreRules, evaluateStorageRules, MockDatabase } from "./rulesEvaluator";

describe("Account Isolation Proof: Account B vs Account A (Zero-Trust Data Separation)", () => {
  const ACCOUNT_A = "athlete-alpha-111";
  const ACCOUNT_B = "athlete-beta-222";

  // Two completely independent accounts with NO coach/team sharing relationship
  const mockDb: MockDatabase = {
    relationships: {},
    users: {
      [ACCOUNT_A]: { uid: ACCOUNT_A, displayName: "Alpha Athlete" },
      [ACCOUNT_B]: { uid: ACCOUNT_B, displayName: "Beta Athlete" }
    }
  };

  it("1. Account B CANNOT write to Account A user profile document", () => {
    const res = evaluateFirestoreRules(
      {
        auth: { uid: ACCOUNT_B },
        path: `users/${ACCOUNT_A}`,
        operation: "update"
      },
      mockDb
    );
    expect(res.allowed).toBe(false);
  });

  it("2. Account B CANNOT read or write Account A athlete profile root", () => {
    const readRes = evaluateFirestoreRules(
      {
        auth: { uid: ACCOUNT_B },
        path: `athletes/${ACCOUNT_A}`,
        operation: "read"
      },
      mockDb
    );
    const writeRes = evaluateFirestoreRules(
      {
        auth: { uid: ACCOUNT_B },
        path: `athletes/${ACCOUNT_A}`,
        operation: "write"
      },
      mockDb
    );
    expect(readRes.allowed).toBe(false);
    expect(writeRes.allowed).toBe(false);
  });

  it("3. Account B CANNOT read or write Account A days (biometrics, sleep, readiness)", () => {
    const readRes = evaluateFirestoreRules(
      {
        auth: { uid: ACCOUNT_B },
        path: `athletes/${ACCOUNT_A}/days/2026-10-27`,
        operation: "read"
      },
      mockDb
    );
    const writeRes = evaluateFirestoreRules(
      {
        auth: { uid: ACCOUNT_B },
        path: `athletes/${ACCOUNT_A}/days/2026-10-27`,
        operation: "write"
      },
      mockDb
    );
    expect(readRes.allowed).toBe(false);
    expect(writeRes.allowed).toBe(false);
  });

  it("4. Account B CANNOT read or write Account A training sessions", () => {
    const readRes = evaluateFirestoreRules(
      {
        auth: { uid: ACCOUNT_B },
        path: `athletes/${ACCOUNT_A}/sessions/session-xyz`,
        operation: "read"
      },
      mockDb
    );
    const writeRes = evaluateFirestoreRules(
      {
        auth: { uid: ACCOUNT_B },
        path: `athletes/${ACCOUNT_A}/sessions/session-xyz`,
        operation: "write"
      },
      mockDb
    );
    expect(readRes.allowed).toBe(false);
    expect(writeRes.allowed).toBe(false);
  });

  it("5. Account B CANNOT read or write Account A planned workouts", () => {
    const readRes = evaluateFirestoreRules(
      {
        auth: { uid: ACCOUNT_B },
        path: `athletes/${ACCOUNT_A}/plannedWorkouts/wo-123`,
        operation: "read"
      },
      mockDb
    );
    const writeRes = evaluateFirestoreRules(
      {
        auth: { uid: ACCOUNT_B },
        path: `athletes/${ACCOUNT_A}/plannedWorkouts/wo-123`,
        operation: "write"
      },
      mockDb
    );
    expect(readRes.allowed).toBe(false);
    expect(writeRes.allowed).toBe(false);
  });

  it("6. Account B CANNOT read or write Account A nutrition days and meals", () => {
    const readRes = evaluateFirestoreRules(
      {
        auth: { uid: ACCOUNT_B },
        path: `athletes/${ACCOUNT_A}/nutritionDays/2026-10-27`,
        operation: "read"
      },
      mockDb
    );
    const writeRes = evaluateFirestoreRules(
      {
        auth: { uid: ACCOUNT_B },
        path: `athletes/${ACCOUNT_A}/nutritionDays/2026-10-27`,
        operation: "write"
      },
      mockDb
    );
    expect(readRes.allowed).toBe(false);
    expect(writeRes.allowed).toBe(false);
  });

  it("7. Account B CANNOT read or write Account A custom exercises", () => {
    const readRes = evaluateFirestoreRules(
      {
        auth: { uid: ACCOUNT_B },
        path: `athletes/${ACCOUNT_A}/exercises/exercise-custom`,
        operation: "read"
      },
      mockDb
    );
    const writeRes = evaluateFirestoreRules(
      {
        auth: { uid: ACCOUNT_B },
        path: `athletes/${ACCOUNT_A}/exercises/exercise-custom`,
        operation: "write"
      },
      mockDb
    );
    expect(readRes.allowed).toBe(false);
    expect(writeRes.allowed).toBe(false);
  });

  it("8. Account B CANNOT read or write Account A sports equipment", () => {
    const readRes = evaluateFirestoreRules(
      {
        auth: { uid: ACCOUNT_B },
        path: `athletes/${ACCOUNT_A}/equipment/bike-canyon-aeroad`,
        operation: "read"
      },
      mockDb
    );
    const writeRes = evaluateFirestoreRules(
      {
        auth: { uid: ACCOUNT_B },
        path: `athletes/${ACCOUNT_A}/equipment/bike-canyon-aeroad`,
        operation: "write"
      },
      mockDb
    );
    expect(readRes.allowed).toBe(false);
    expect(writeRes.allowed).toBe(false);
  });

  it("9. Account B CANNOT read or write Account A sports records and PB courses", () => {
    const readRes = evaluateFirestoreRules(
      {
        auth: { uid: ACCOUNT_B },
        path: `athletes/${ACCOUNT_A}/records/record-5k-pb`,
        operation: "read"
      },
      mockDb
    );
    const writeRes = evaluateFirestoreRules(
      {
        auth: { uid: ACCOUNT_B },
        path: `athletes/${ACCOUNT_A}/records/record-5k-pb`,
        operation: "write"
      },
      mockDb
    );
    expect(readRes.allowed).toBe(false);
    expect(writeRes.allowed).toBe(false);
  });

  it("10. Account B CANNOT read or write Account A Cloud Storage files (FIT, GPX, media)", () => {
    const readRes = evaluateStorageRules(
      {
        auth: { uid: ACCOUNT_B },
        path: `athletes/${ACCOUNT_A}/workouts/wo-123/track.fit`,
        operation: "read"
      },
      mockDb
    );
    const writeRes = evaluateStorageRules(
      {
        auth: { uid: ACCOUNT_B },
        path: `athletes/${ACCOUNT_A}/workouts/wo-123/track.fit`,
        operation: "write"
      },
      mockDb
    );
    expect(readRes.allowed).toBe(false);
    expect(writeRes.allowed).toBe(false);
  });

  it("11. Account B CANNOT read or write Account A GDPR export archives in Storage", () => {
    const readRes = evaluateStorageRules(
      {
        auth: { uid: ACCOUNT_B },
        path: `athletes/${ACCOUNT_A}/exports/gdpr-export.json`,
        operation: "read"
      },
      mockDb
    );
    const writeRes = evaluateStorageRules(
      {
        auth: { uid: ACCOUNT_B },
        path: `athletes/${ACCOUNT_A}/exports/gdpr-export.json`,
        operation: "write"
      },
      mockDb
    );
    expect(readRes.allowed).toBe(false);
    expect(writeRes.allowed).toBe(false);
  });

  it("12. Account A CAN read and write their own data cleanly across all modules", () => {
    const readProfile = evaluateFirestoreRules({ auth: { uid: ACCOUNT_A }, path: `athletes/${ACCOUNT_A}`, operation: "read" }, mockDb);
    const writeDays = evaluateFirestoreRules({ auth: { uid: ACCOUNT_A }, path: `athletes/${ACCOUNT_A}/days/2026-10-27`, operation: "write" }, mockDb);
    const writeSessions = evaluateFirestoreRules({ auth: { uid: ACCOUNT_A }, path: `athletes/${ACCOUNT_A}/sessions/s1`, operation: "write" }, mockDb);
    const writeStorage = evaluateStorageRules({ auth: { uid: ACCOUNT_A }, path: `athletes/${ACCOUNT_A}/workouts/s1/f.fit`, operation: "write" }, mockDb);

    expect(readProfile.allowed).toBe(true);
    expect(writeDays.allowed).toBe(true);
    expect(writeSessions.allowed).toBe(true);
    expect(writeStorage.allowed).toBe(true);
  });
});
