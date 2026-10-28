import { describe, it, expect } from "vitest";
import { evaluateFirestoreRules, evaluateStorageRules, MockDatabase } from "./rulesEvaluator";
import { PERMISSION_PRESETS } from "./permissionPresets";

describe("Firestore Security Rules - Zero-Trust Sharing Suite (45+ Tests)", () => {
  const ATHLETE_UID = "athlete-kovacs-01";
  const OTHER_ATHLETE_UID = "athlete-szabo-99";
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
      // 1. Active Head Coach (training write, recovery read, nutrition read, devices read, messages write, health NONE)
      [`${ATHLETE_UID}_${COACH_UID}`]: {
        athleteId: ATHLETE_UID,
        memberId: COACH_UID,
        status: "active",
        permissions: PERMISSION_PRESETS.coach.permissions
      },
      // 2. Active Dietitian (nutrition write, recovery read, training read, messages write, health NONE)
      [`${ATHLETE_UID}_${DIETITIAN_UID}`]: {
        athleteId: ATHLETE_UID,
        memberId: DIETITIAN_UID,
        status: "active",
        permissions: PERMISSION_PRESETS.dietitian.permissions
      },
      // 3. Active Physiotherapist (health write, training read, recovery read, messages write)
      [`${ATHLETE_UID}_${PHYSIO_UID}`]: {
        athleteId: ATHLETE_UID,
        memberId: PHYSIO_UID,
        status: "active",
        permissions: PERMISSION_PRESETS.physiotherapist.permissions
      },
      // 4. Active Strength Coach (training write, recovery read, messages write)
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
      },
      "APX-5678": {
        athleteId: OTHER_ATHLETE_UID,
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

    it("19b. Dietitian can create and manage meal plans (nutrition: write)", () => {
      const planRes = evaluateFirestoreRules(
        { auth: { uid: DIETITIAN_UID }, path: `athletes/${ATHLETE_UID}/mealPlans/plan-1`, operation: "write" },
        mockDb
      );
      expect(planRes.allowed).toBe(true);

      const dayRes = evaluateFirestoreRules(
        { auth: { uid: DIETITIAN_UID }, path: `athletes/${ATHLETE_UID}/plannedDays/2026-10-28`, operation: "write" },
        mockDb
      );
      expect(dayRes.allowed).toBe(true);

      const tplRes = evaluateFirestoreRules(
        { auth: { uid: DIETITIAN_UID }, path: `athletes/${ATHLETE_UID}/dayTemplates/tpl-1`, operation: "write" },
        mockDb
      );
      expect(tplRes.allowed).toBe(true);
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

  // Group 7: Server-Only Enforcement: Block All Client Writes to Relationships & Invites (11 tests)
  describe("Server-Only Enforcement & Privilege Escalation Prevention", () => {
    const relKey = `${ATHLETE_UID}_${COACH_UID}`;

    it("35. Member CANNOT directly modify relationship document (Privilege Escalation Block)", () => {
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

    it("36. Athlete CANNOT directly update relationship from client (Must use Cloud Functions)", () => {
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
      expect(res.allowed).toBe(false);
    });

    it("37. Member CANNOT directly create a relationship document (Bypass Prevention)", () => {
      const res = evaluateFirestoreRules(
        {
          auth: { uid: COACH_UID },
          path: `relationships/${ATHLETE_UID}_${COACH_UID}`,
          operation: "create",
          requestData: {
            athleteId: ATHLETE_UID,
            memberId: COACH_UID,
            status: "active",
            permissions: PERMISSION_PRESETS.coach.permissions
          }
        },
        mockDb
      );
      expect(res.allowed).toBe(false);
    });

    it("38. Stranger CANNOT directly create a relationship document", () => {
      const res = evaluateFirestoreRules(
        {
          auth: { uid: STRANGER_UID },
          path: `relationships/${ATHLETE_UID}_${STRANGER_UID}`,
          operation: "create",
          requestData: {
            athleteId: ATHLETE_UID,
            memberId: STRANGER_UID,
            status: "active"
          }
        },
        mockDb
      );
      expect(res.allowed).toBe(false);
    });

    it("39. Client CANNOT directly create audit log entries (Audit Tampering Block)", () => {
      const res = evaluateFirestoreRules(
        {
          auth: { uid: ATHLETE_UID },
          path: `relationships/${relKey}/log/log-fake`,
          operation: "create",
          requestData: {
            action: "tampered"
          }
        },
        mockDb
      );
      expect(res.allowed).toBe(false);
    });

    it("40. Client CANNOT directly create invites in invites collection", () => {
      const res = evaluateFirestoreRules(
        {
          auth: { uid: ATHLETE_UID },
          path: `invites/APX-FAKE`,
          operation: "create",
          requestData: {
            athleteId: ATHLETE_UID,
            status: "pending"
          }
        },
        mockDb
      );
      expect(res.allowed).toBe(false);
    });

    it("41. Client CANNOT directly update invites in invites collection", () => {
      const res = evaluateFirestoreRules(
        {
          auth: { uid: COACH_UID },
          path: `invites/APX-1234`,
          operation: "update",
          resourceData: mockDb.invites!["APX-1234"],
          requestData: {
            status: "accepted"
          }
        },
        mockDb
      );
      expect(res.allowed).toBe(false);
    });

    it("42. Athlete CAN read their own pending invite", () => {
      const res = evaluateFirestoreRules(
        {
          auth: { uid: ATHLETE_UID },
          path: `invites/APX-1234`,
          operation: "read",
          resourceData: mockDb.invites!["APX-1234"]
        },
        mockDb
      );
      expect(res.allowed).toBe(true);
    });

    it("43. Athlete CANNOT read another athlete's invite", () => {
      const res = evaluateFirestoreRules(
        {
          auth: { uid: ATHLETE_UID },
          path: `invites/APX-5678`,
          operation: "read",
          resourceData: mockDb.invites!["APX-5678"]
        },
        mockDb
      );
      expect(res.allowed).toBe(false);
    });

    it("44. Athlete CANNOT read another athlete's subcollections", () => {
      const res = evaluateFirestoreRules(
        {
          auth: { uid: ATHLETE_UID },
          path: `athletes/${OTHER_ATHLETE_UID}/days/2026-10-26`,
          operation: "read"
        },
        mockDb
      );
      expect(res.allowed).toBe(false);
    });

    it("45. Both athlete and member CAN read their relationship record", () => {
      const athleteRead = evaluateFirestoreRules(
        {
          auth: { uid: ATHLETE_UID },
          path: `relationships/${relKey}`,
          operation: "read",
          resourceData: mockDb.relationships![relKey]
        },
        mockDb
      );
      const memberRead = evaluateFirestoreRules(
        {
          auth: { uid: COACH_UID },
          path: `relationships/${relKey}`,
          operation: "read",
          resourceData: mockDb.relationships![relKey]
        },
        mockDb
      );
      expect(athleteRead.allowed).toBe(true);
      expect(memberRead.allowed).toBe(true);
    });

    it("46. Athlete CAN read and write own exercise library", () => {
      const readRes = evaluateFirestoreRules(
        {
          auth: { uid: ATHLETE_UID },
          path: `athletes/${ATHLETE_UID}/exercises/ex-1`,
          operation: "read"
        },
        mockDb
      );
      const writeRes = evaluateFirestoreRules(
        {
          auth: { uid: ATHLETE_UID },
          path: `athletes/${ATHLETE_UID}/exercises/ex-1`,
          operation: "write"
        },
        mockDb
      );
      expect(readRes.allowed).toBe(true);
      expect(writeRes.allowed).toBe(true);
    });

    it("47. Coach with training:write CAN read and write athlete's exercise library", () => {
      const readRes = evaluateFirestoreRules(
        {
          auth: { uid: COACH_UID },
          path: `athletes/${ATHLETE_UID}/exercises/ex-1`,
          operation: "read"
        },
        mockDb
      );
      const writeRes = evaluateFirestoreRules(
        {
          auth: { uid: COACH_UID },
          path: `athletes/${ATHLETE_UID}/exercises/ex-1`,
          operation: "write"
        },
        mockDb
      );
      expect(readRes.allowed).toBe(true);
      expect(writeRes.allowed).toBe(true);
    });

    it("48. Staff with training:read (Physio) CAN read athlete's exercise library, but CANNOT write", () => {
      const readRes = evaluateFirestoreRules(
        {
          auth: { uid: PHYSIO_UID },
          path: `athletes/${ATHLETE_UID}/exercises/ex-1`,
          operation: "read"
        },
        mockDb
      );
      const writeRes = evaluateFirestoreRules(
        {
          auth: { uid: PHYSIO_UID },
          path: `athletes/${ATHLETE_UID}/exercises/ex-1`,
          operation: "write"
        },
        mockDb
      );
      expect(readRes.allowed).toBe(true);
      expect(writeRes.allowed).toBe(false);
    });

    it("49. Staff with training:none (Psychologist) CANNOT read athlete's exercise library", () => {
      const readRes = evaluateFirestoreRules(
        {
          auth: { uid: PSYCHOLOGIST_UID },
          path: `athletes/${ATHLETE_UID}/exercises/ex-1`,
          operation: "read"
        },
        mockDb
      );
      expect(readRes.allowed).toBe(false);
    });

    it("50. Stranger CANNOT read or write athlete's exercise library", () => {
      const readRes = evaluateFirestoreRules(
        {
          auth: { uid: STRANGER_UID },
          path: `athletes/${ATHLETE_UID}/exercises/ex-1`,
          operation: "read"
        },
        mockDb
      );
      const writeRes = evaluateFirestoreRules(
        {
          auth: { uid: STRANGER_UID },
          path: `athletes/${ATHLETE_UID}/exercises/ex-1`,
          operation: "write"
        },
        mockDb
      );
      expect(readRes.allowed).toBe(false);
      expect(writeRes.allowed).toBe(false);
    });

    it("51. Coach with recovery:read CAN read recoveryActivities, but CANNOT write (athlete can write)", () => {
      const coachRead = evaluateFirestoreRules(
        {
          auth: { uid: COACH_UID },
          path: `athletes/${ATHLETE_UID}/recoveryActivities/rec-1`,
          operation: "read"
        },
        mockDb
      );
      const coachWrite = evaluateFirestoreRules(
        {
          auth: { uid: COACH_UID },
          path: `athletes/${ATHLETE_UID}/recoveryActivities/rec-1`,
          operation: "write"
        },
        mockDb
      );
      const athleteWrite = evaluateFirestoreRules(
        {
          auth: { uid: ATHLETE_UID },
          path: `athletes/${ATHLETE_UID}/recoveryActivities/rec-1`,
          operation: "write"
        },
        mockDb
      );
      expect(coachRead.allowed).toBe(true);
      expect(coachWrite.allowed).toBe(false);
      expect(athleteWrite.allowed).toBe(true);
    });

    it("52. Coach with training:write CAN read and write athlete records", () => {
      const coachRead = evaluateFirestoreRules(
        {
          auth: { uid: COACH_UID },
          path: `athletes/${ATHLETE_UID}/records/rec-5k`,
          operation: "read"
        },
        mockDb
      );
      const coachWrite = evaluateFirestoreRules(
        {
          auth: { uid: COACH_UID },
          path: `athletes/${ATHLETE_UID}/records/rec-5k`,
          operation: "write"
        },
        mockDb
      );
      expect(coachRead.allowed).toBe(true);
      expect(coachWrite.allowed).toBe(true);
    });

    it("53. Coach with training:write CAN read and write courses", () => {
      const coachRead = evaluateFirestoreRules(
        {
          auth: { uid: COACH_UID },
          path: `athletes/${ATHLETE_UID}/courses/course-lake`,
          operation: "read"
        },
        mockDb
      );
      const coachWrite = evaluateFirestoreRules(
        {
          auth: { uid: COACH_UID },
          path: `athletes/${ATHLETE_UID}/courses/course-lake`,
          operation: "write"
        },
        mockDb
      );
      expect(coachRead.allowed).toBe(true);
      expect(coachWrite.allowed).toBe(true);
    });

    it("54. Coach with training:write CAN read and write equipment", () => {
      const coachRead = evaluateFirestoreRules(
        {
          auth: { uid: COACH_UID },
          path: `athletes/${ATHLETE_UID}/equipment/eq-shoes-1`,
          operation: "read"
        },
        mockDb
      );
      const coachWrite = evaluateFirestoreRules(
        {
          auth: { uid: COACH_UID },
          path: `athletes/${ATHLETE_UID}/equipment/eq-shoes-1`,
          operation: "write"
        },
        mockDb
      );
      expect(coachRead.allowed).toBe(true);
      expect(coachWrite.allowed).toBe(true);
    });

    it("55. Stranger CANNOT read or write records, courses, equipment, or recovery activities", () => {
      const paths = [
        `athletes/${ATHLETE_UID}/records/rec-1`,
        `athletes/${ATHLETE_UID}/courses/course-1`,
        `athletes/${ATHLETE_UID}/equipment/eq-1`,
        `athletes/${ATHLETE_UID}/recoveryActivities/rec-1`
      ];
      for (const p of paths) {
        const readRes = evaluateFirestoreRules(
          { auth: { uid: STRANGER_UID }, path: p, operation: "read" },
          mockDb
        );
        const writeRes = evaluateFirestoreRules(
          { auth: { uid: STRANGER_UID }, path: p, operation: "write" },
          mockDb
        );
        expect(readRes.allowed).toBe(false);
        expect(writeRes.allowed).toBe(false);
      }
    });

    it("56. Athlete CAN write workout file up to 25 MB in Storage", () => {
      const res = evaluateStorageRules(
        {
          auth: { uid: ATHLETE_UID },
          path: `athletes/${ATHLETE_UID}/workouts/sess-1/run.fit`,
          operation: "write",
          fileSizeBytes: 10 * 1024 * 1024,
          contentType: "application/octet-stream"
        },
        mockDb
      );
      expect(res.allowed).toBe(true);
    });

    it("57. Storage rejects workout file exceeding 25 MB limit", () => {
      const res = evaluateStorageRules(
        {
          auth: { uid: ATHLETE_UID },
          path: `athletes/${ATHLETE_UID}/workouts/sess-1/big.fit`,
          operation: "write",
          fileSizeBytes: 26 * 1024 * 1024,
          contentType: "application/octet-stream"
        },
        mockDb
      );
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe("File exceeds 25 MB");
    });

    it("58. Coach with training permission CAN read athlete workout files in Storage", () => {
      const res = evaluateStorageRules(
        {
          auth: { uid: COACH_UID },
          path: `athletes/${ATHLETE_UID}/workouts/sess-1/run.gpx`,
          operation: "read"
        },
        mockDb
      );
      expect(res.allowed).toBe(true);
    });

    it("59. Psychologist (no training permission) CANNOT read athlete workout files in Storage", () => {
      const res = evaluateStorageRules(
        {
          auth: { uid: PSYCHOLOGIST_UID },
          path: `athletes/${ATHLETE_UID}/workouts/sess-1/run.gpx`,
          operation: "read"
        },
        mockDb
      );
      expect(res.allowed).toBe(false);
    });

    it("60. Stranger CANNOT read or write athlete workout files in Storage", () => {
      const readRes = evaluateStorageRules(
        {
          auth: { uid: STRANGER_UID },
          path: `athletes/${ATHLETE_UID}/workouts/sess-1/run.fit`,
          operation: "read"
        },
        mockDb
      );
      const writeRes = evaluateStorageRules(
        {
          auth: { uid: STRANGER_UID },
          path: `athletes/${ATHLETE_UID}/workouts/sess-1/run.fit`,
          operation: "write"
        },
        mockDb
      );
      expect(readRes.allowed).toBe(false);
      expect(writeRes.allowed).toBe(false);
    });
  });
});

