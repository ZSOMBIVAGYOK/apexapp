import { describe, it, expect } from "vitest";
import { evaluateFirestoreRules, MockDatabase } from "./rulesEvaluator";
import { PERMISSION_PRESETS } from "./permissionPresets";

describe("Firestore Security Rules - Granular Sharing Suite (35+ Tests)", () => {
  const ATHLETE_UID = "athlete-kovacs-01";
  const COACH_UID = "coach-nagy-02";
  const DIETITIAN_UID = "dietitian-molnar-03";
  const PHYSIO_UID = "physio-szabo-04";
  const STRENGTH_UID = "strength-toth-05";
  const PSYCHOLOGIST_UID = "psych-varga-06";
  const STRANGER_UID = "stranger-hack-99";
  const REVOKED_COACH_UID = "coach-revoked-07";
  const PENDING_MEMBER_UID = "member-pending-08";

  const mockDb: MockDatabase = {
    relationships: {
      // 1. Active Head Coach (training write, recovery read, nutrition read, devices read, health NONE)
      [`${ATHLETE_UID}_${COACH_UID}`]: {
        athleteId: ATHLETE_UID,
        memberId: COACH_UID,
        status: "active",
        permissions: PERMISSION_PRESETS.coach.permissions
      },
      // 2. Active Dietitian (nutrition write, recovery read, training read, health NONE)
      [`${ATHLETE_UID}_${DIETITIAN_UID}`]: {
        athleteId: ATHLETE_UID,
        memberId: DIETITIAN_UID,
        status: "active",
        permissions: PERMISSION_PRESETS.dietitian.permissions
      },
      // 3. Active Physiotherapist (health write, training read, recovery read)
      [`${ATHLETE_UID}_${PHYSIO_UID}`]: {
        athleteId: ATHLETE_UID,
        memberId: PHYSIO_UID,
        status: "active",
        permissions: PERMISSION_PRESETS.physiotherapist.permissions
      },
      // 4. Active Strength Coach (training write, recovery read)
      [`${ATHLETE_UID}_${STRENGTH_UID}`]: {
        athleteId: ATHLETE_UID,
        memberId: STRENGTH_UID,
        status: "active",
        permissions: PERMISSION_PRESETS.strengthCoach.permissions
      },
      // 5. Active Sport Psychologist (recovery read, messages write)
      [`${ATHLETE_UID}_${PSYCHOLOGIST_UID}`]: {
        athleteId: ATHLETE_UID,
        memberId: PSYCHOLOGIST_UID,
        status: "active",
        permissions: PERMISSION_PRESETS.psychologist.permissions
      },
      // 6. Revoked relationship
      [`${ATHLETE_UID}_${REVOKED_COACH_UID}`]: {
        athleteId: ATHLETE_UID,
        memberId: REVOKED_COACH_UID,
        status: "revoked",
        permissions: PERMISSION_PRESETS.coach.permissions
      },
      // 7. Pending relationship
      [`${ATHLETE_UID}_${PENDING_MEMBER_UID}`]: {
        athleteId: ATHLETE_UID,
        memberId: PENDING_MEMBER_UID,
        status: "pending",
        permissions: PERMISSION_PRESETS.coach.permissions
      }
    },
    threads: {
      "thread-1": {
        athleteId: ATHLETE_UID,
        participantIds: [ATHLETE_UID, COACH_UID]
      }
    },
    invites: {
      "APX-1234": {
        athleteId: ATHLETE_UID,
        status: "pending"
      }
    }
  };

  // Group 1: Athlete Full Tree Access (10 tests)
  describe("Athlete Access to Own Tree", () => {
    it("1. Athlete can read own recovery days", () => {
      const res = evaluateFirestoreRules(
        { auth: { uid: ATHLETE_UID }, path: `athletes/${ATHLETE_UID}/days/2026-10-26`, operation: "read" },
        mockDb
      );
      expect(res.allowed).toBe(true);
    });

    it("2. Athlete can write own recovery days", () => {
      const res = evaluateFirestoreRules(
        { auth: { uid: ATHLETE_UID }, path: `athletes/${ATHLETE_UID}/days/2026-10-26`, operation: "write" },
        mockDb
      );
      expect(res.allowed).toBe(true);
    });

    it("3. Athlete can read own training sessions", () => {
      const res = evaluateFirestoreRules(
        { auth: { uid: ATHLETE_UID }, path: `athletes/${ATHLETE_UID}/sessions/sess-1`, operation: "read" },
        mockDb
      );
      expect(res.allowed).toBe(true);
    });

    it("4. Athlete can write own training sessions", () => {
      const res = evaluateFirestoreRules(
        { auth: { uid: ATHLETE_UID }, path: `athletes/${ATHLETE_UID}/sessions/sess-1`, operation: "write" },
        mockDb
      );
      expect(res.allowed).toBe(true);
    });

    it("5. Athlete can read own planned workouts", () => {
      const res = evaluateFirestoreRules(
        { auth: { uid: ATHLETE_UID }, path: `athletes/${ATHLETE_UID}/plannedWorkouts/plan-1`, operation: "read" },
        mockDb
      );
      expect(res.allowed).toBe(true);
    });

    it("6. Athlete can write own planned workouts", () => {
      const res = evaluateFirestoreRules(
        { auth: { uid: ATHLETE_UID }, path: `athletes/${ATHLETE_UID}/plannedWorkouts/plan-1`, operation: "write" },
        mockDb
      );
      expect(res.allowed).toBe(true);
    });

    it("7. Athlete can read own injuries (HEALTH)", () => {
      const res = evaluateFirestoreRules(
        { auth: { uid: ATHLETE_UID }, path: `athletes/${ATHLETE_UID}/injuries/inj-1`, operation: "read" },
        mockDb
      );
      expect(res.allowed).toBe(true);
    });

    it("8. Athlete can write own injuries (HEALTH)", () => {
      const res = evaluateFirestoreRules(
        { auth: { uid: ATHLETE_UID }, path: `athletes/${ATHLETE_UID}/injuries/inj-1`, operation: "write" },
        mockDb
      );
      expect(res.allowed).toBe(true);
    });

    it("9. Athlete can read own nutrition days", () => {
      const res = evaluateFirestoreRules(
        { auth: { uid: ATHLETE_UID }, path: `athletes/${ATHLETE_UID}/nutritionDays/2026-10-26`, operation: "read" },
        mockDb
      );
      expect(res.allowed).toBe(true);
    });

    it("10. Athlete can read own devices", () => {
      const res = evaluateFirestoreRules(
        { auth: { uid: ATHLETE_UID }, path: `athletes/${ATHLETE_UID}/devices/garmin`, operation: "read" },
        mockDb
      );
      expect(res.allowed).toBe(true);
    });
  });

  // Group 2: Coach Role & Strict Health Exclusion (7 tests)
  describe("Coach Role & Strict Health Isolation", () => {
    it("11. Coach can read training sessions (training: write)", () => {
      const res = evaluateFirestoreRules(
        { auth: { uid: COACH_UID }, path: `athletes/${ATHLETE_UID}/sessions/sess-1`, operation: "read" },
        mockDb
      );
      expect(res.allowed).toBe(true);
    });

    it("12. Coach can write planned workouts (training: write)", () => {
      const res = evaluateFirestoreRules(
        { auth: { uid: COACH_UID }, path: `athletes/${ATHLETE_UID}/plannedWorkouts/plan-1`, operation: "write" },
        mockDb
      );
      expect(res.allowed).toBe(true);
    });

    it("13. Coach can read recovery days (recovery: read)", () => {
      const res = evaluateFirestoreRules(
        { auth: { uid: COACH_UID }, path: `athletes/${ATHLETE_UID}/days/2026-10-26`, operation: "read" },
        mockDb
      );
      expect(res.allowed).toBe(true);
    });

    it("14. Coach CANNOT write recovery days (recovery is read-only)", () => {
      const res = evaluateFirestoreRules(
        { auth: { uid: COACH_UID }, path: `athletes/${ATHLETE_UID}/days/2026-10-26`, operation: "write" },
        mockDb
      );
      expect(res.allowed).toBe(false);
    });

    it("15. Coach CANNOT read health injuries (health: none STRICT REQUIREMENT)", () => {
      const res = evaluateFirestoreRules(
        { auth: { uid: COACH_UID }, path: `athletes/${ATHLETE_UID}/injuries/inj-1`, operation: "read" },
        mockDb
      );
      expect(res.allowed).toBe(false);
    });

    it("16. Coach CANNOT write health injuries", () => {
      const res = evaluateFirestoreRules(
        { auth: { uid: COACH_UID }, path: `athletes/${ATHLETE_UID}/injuries/inj-1`, operation: "write" },
        mockDb
      );
      expect(res.allowed).toBe(false);
    });

    it("17. Coach CANNOT read medical notes (health: none)", () => {
      const res = evaluateFirestoreRules(
        { auth: { uid: COACH_UID }, path: `athletes/${ATHLETE_UID}/notes/note-1`, operation: "read" },
        mockDb
      );
      expect(res.allowed).toBe(false);
    });
  });

  // Group 3: Dietitian Access (4 tests)
  describe("Dietitian Role", () => {
    it("18. Dietitian can read nutrition days (nutrition: write)", () => {
      const res = evaluateFirestoreRules(
        { auth: { uid: DIETITIAN_UID }, path: `athletes/${ATHLETE_UID}/nutritionDays/2026-10-26`, operation: "read" },
        mockDb
      );
      expect(res.allowed).toBe(true);
    });

    it("19. Dietitian can write nutrition entries", () => {
      const res = evaluateFirestoreRules(
        { auth: { uid: DIETITIAN_UID }, path: `athletes/${ATHLETE_UID}/nutritionDays/2026-10-26/entries/entry-1`, operation: "write" },
        mockDb
      );
      expect(res.allowed).toBe(true);
    });

    it("20. Dietitian CANNOT read injuries (health: none)", () => {
      const res = evaluateFirestoreRules(
        { auth: { uid: DIETITIAN_UID }, path: `athletes/${ATHLETE_UID}/injuries/inj-1`, operation: "read" },
        mockDb
      );
      expect(res.allowed).toBe(false);
    });

    it("21. Dietitian CANNOT read devices (devices: none)", () => {
      const res = evaluateFirestoreRules(
        { auth: { uid: DIETITIAN_UID }, path: `athletes/${ATHLETE_UID}/devices/whoop`, operation: "read" },
        mockDb
      );
      expect(res.allowed).toBe(false);
    });
  });

  // Group 4: Physiotherapist & Strength Coach (5 tests)
  describe("Physiotherapist & Strength Coach Roles", () => {
    it("22. Physiotherapist can read injuries (health: write)", () => {
      const res = evaluateFirestoreRules(
        { auth: { uid: PHYSIO_UID }, path: `athletes/${ATHLETE_UID}/injuries/inj-1`, operation: "read" },
        mockDb
      );
      expect(res.allowed).toBe(true);
    });

    it("23. Physiotherapist can write injuries", () => {
      const res = evaluateFirestoreRules(
        { auth: { uid: PHYSIO_UID }, path: `athletes/${ATHLETE_UID}/injuries/inj-1`, operation: "write" },
        mockDb
      );
      expect(res.allowed).toBe(true);
    });

    it("24. Physiotherapist CANNOT read nutrition days (nutrition: none)", () => {
      const res = evaluateFirestoreRules(
        { auth: { uid: PHYSIO_UID }, path: `athletes/${ATHLETE_UID}/nutritionDays/2026-10-26`, operation: "read" },
        mockDb
      );
      expect(res.allowed).toBe(false);
    });

    it("25. Strength coach can write planned workouts (training: write)", () => {
      const res = evaluateFirestoreRules(
        { auth: { uid: STRENGTH_UID }, path: `athletes/${ATHLETE_UID}/plannedWorkouts/plan-2`, operation: "write" },
        mockDb
      );
      expect(res.allowed).toBe(true);
    });

    it("26. Strength coach CANNOT read injuries (health: none)", () => {
      const res = evaluateFirestoreRules(
        { auth: { uid: STRENGTH_UID }, path: `athletes/${ATHLETE_UID}/injuries/inj-1`, operation: "read" },
        mockDb
      );
      expect(res.allowed).toBe(false);
    });
  });

  // Group 5: Sport Psychologist (2 tests)
  describe("Sport Psychologist Role", () => {
    it("27. Sport psychologist can read recovery days (recovery: read)", () => {
      const res = evaluateFirestoreRules(
        { auth: { uid: PSYCHOLOGIST_UID }, path: `athletes/${ATHLETE_UID}/days/2026-10-26`, operation: "read" },
        mockDb
      );
      expect(res.allowed).toBe(true);
    });

    it("28. Sport psychologist CANNOT read training sessions (training: none)", () => {
      const res = evaluateFirestoreRules(
        { auth: { uid: PSYCHOLOGIST_UID }, path: `athletes/${ATHLETE_UID}/sessions/sess-1`, operation: "read" },
        mockDb
      );
      expect(res.allowed).toBe(false);
    });
  });

  // Group 6: Revoked, Pending, and Stranger Access (6 tests)
  describe("Revocation and Stranger Isolation", () => {
    it("29. Revoked coach CANNOT read training sessions", () => {
      const res = evaluateFirestoreRules(
        { auth: { uid: REVOKED_COACH_UID }, path: `athletes/${ATHLETE_UID}/sessions/sess-1`, operation: "read" },
        mockDb
      );
      expect(res.allowed).toBe(false);
    });

    it("30. Revoked coach CANNOT read recovery days", () => {
      const res = evaluateFirestoreRules(
        { auth: { uid: REVOKED_COACH_UID }, path: `athletes/${ATHLETE_UID}/days/2026-10-26`, operation: "read" },
        mockDb
      );
      expect(res.allowed).toBe(false);
    });

    it("31. Pending member CANNOT read recovery days before invite is accepted", () => {
      const res = evaluateFirestoreRules(
        { auth: { uid: PENDING_MEMBER_UID }, path: `athletes/${ATHLETE_UID}/days/2026-10-26`, operation: "read" },
        mockDb
      );
      expect(res.allowed).toBe(false);
    });

    it("32. Stranger with no relationship CANNOT read athlete recovery days", () => {
      const res = evaluateFirestoreRules(
        { auth: { uid: STRANGER_UID }, path: `athletes/${ATHLETE_UID}/days/2026-10-26`, operation: "read" },
        mockDb
      );
      expect(res.allowed).toBe(false);
    });

    it("33. Stranger with no relationship CANNOT read athlete training sessions", () => {
      const res = evaluateFirestoreRules(
        { auth: { uid: STRANGER_UID }, path: `athletes/${ATHLETE_UID}/sessions/sess-1`, operation: "read" },
        mockDb
      );
      expect(res.allowed).toBe(false);
    });

    it("34. Unauthenticated user CANNOT read any athlete data", () => {
      const res = evaluateFirestoreRules(
        { auth: null, path: `athletes/${ATHLETE_UID}/days/2026-10-26`, operation: "read" },
        mockDb
      );
      expect(res.allowed).toBe(false);
    });
  });

  // Group 7: Relationship Management, Self-Elevation Prevention & Audit Log (6 tests)
  describe("Relationship Ownership & Permission Modification Enforcement", () => {
    const relKey = `${ATHLETE_UID}_${COACH_UID}`;

    it("35. Member CANNOT modify their own relationship permissions (Self-Elevation Block)", () => {
      const res = evaluateFirestoreRules(
        {
          auth: { uid: COACH_UID },
          path: `relationships/${relKey}`,
          operation: "update",
          resourceData: mockDb.relationships![relKey],
          requestData: {
            athleteId: ATHLETE_UID,
            permissions: { ...PERMISSION_PRESETS.coach.permissions, health: "write" }
          }
        },
        mockDb
      );
      expect(res.allowed).toBe(false);
    });

    it("36. Athlete CAN update relationship permissions for a member", () => {
      const res = evaluateFirestoreRules(
        {
          auth: { uid: ATHLETE_UID },
          path: `relationships/${relKey}`,
          operation: "update",
          resourceData: mockDb.relationships![relKey],
          requestData: {
            athleteId: ATHLETE_UID,
            permissions: { ...PERMISSION_PRESETS.coach.permissions, health: "read" }
          }
        },
        mockDb
      );
      expect(res.allowed).toBe(true);
    });

    it("37. Athlete CAN revoke member access in relationship", () => {
      const res = evaluateFirestoreRules(
        {
          auth: { uid: ATHLETE_UID },
          path: `relationships/${relKey}`,
          operation: "update",
          resourceData: mockDb.relationships![relKey],
          requestData: {
            athleteId: ATHLETE_UID,
            status: "revoked"
          }
        },
        mockDb
      );
      expect(res.allowed).toBe(true);
    });

    it("38. Stranger CANNOT read another athlete's relationship record", () => {
      const res = evaluateFirestoreRules(
        {
          auth: { uid: STRANGER_UID },
          path: `relationships/${relKey}`,
          operation: "read",
          resourceData: mockDb.relationships![relKey]
        },
        mockDb
      );
      expect(res.allowed).toBe(false);
    });

    it("39. Athlete CAN read relationship audit log (relationships/{relId}/log/{logId})", () => {
      const res = evaluateFirestoreRules(
        {
          auth: { uid: ATHLETE_UID },
          path: `relationships/${relKey}/log/log-01`,
          operation: "read"
        },
        mockDb
      );
      expect(res.allowed).toBe(true);
    });

    it("40. Member CANNOT read relationship audit log (strictly visible to athlete)", () => {
      const res = evaluateFirestoreRules(
        {
          auth: { uid: COACH_UID },
          path: `relationships/${relKey}/log/log-01`,
          operation: "read"
        },
        mockDb
      );
      expect(res.allowed).toBe(false);
    });
  });
});
