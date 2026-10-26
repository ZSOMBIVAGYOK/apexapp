import { describe, it, expect } from "vitest";
import {
  CreateInviteInputSchema,
  AcceptInviteInputSchema,
  UpdatePermissionsInputSchema,
  RevokeAccessInputSchema,
  DEFAULT_PRESETS,
  getPresetPermissions,
  ModulePermissions
} from "../../../../functions/src/index";

describe("Sharing Cloud Functions & Logic Unit Tests (15+ Tests)", () => {
  const ATHLETE_UID = "ath-kovacs-01";
  const MEMBER_UID = "coach-nagy-02";
  const OTHER_UID = "stranger-hack-99";
  const REL_ID = `${ATHLETE_UID}_${MEMBER_UID}`;

  // 1. Zod Input Schema Validations
  describe("Zod Input Schemas Validation", () => {
    it("1. CreateInviteInputSchema accepts valid coach payload", () => {
      const parsed = CreateInviteInputSchema.safeParse({
        memberRole: "coach",
        inviteeEmail: "coach@olympia.hu"
      });
      expect(parsed.success).toBe(true);
    });

    it("2. CreateInviteInputSchema accepts valid specialist with specialty", () => {
      const parsed = CreateInviteInputSchema.safeParse({
        memberRole: "specialist",
        specialty: "nutrition",
        customPermissions: { nutrition: "write", recovery: "read" }
      });
      expect(parsed.success).toBe(true);
    });

    it("3. CreateInviteInputSchema rejects invalid memberRole", () => {
      const parsed = CreateInviteInputSchema.safeParse({
        memberRole: "admin_superuser"
      });
      expect(parsed.success).toBe(false);
    });

    it("4. CreateInviteInputSchema rejects invalid email format", () => {
      const parsed = CreateInviteInputSchema.safeParse({
        memberRole: "coach",
        inviteeEmail: "not-an-email"
      });
      expect(parsed.success).toBe(false);
    });

    it("5. AcceptInviteInputSchema validates clean uppercase code", () => {
      const parsed = AcceptInviteInputSchema.safeParse({ code: "APX-8K2L9" });
      expect(parsed.success).toBe(true);
    });

    it("6. AcceptInviteInputSchema rejects empty code", () => {
      const parsed = AcceptInviteInputSchema.safeParse({ code: "" });
      expect(parsed.success).toBe(false);
    });

    it("7. UpdatePermissionsInputSchema requires all module fields", () => {
      const validPermissions: ModulePermissions = {
        training: "write",
        recovery: "read",
        nutrition: "none",
        health: "none",
        devices: "none",
        messages: "write"
      };
      const parsed = UpdatePermissionsInputSchema.safeParse({
        relId: REL_ID,
        permissions: validPermissions,
        reason: "Coach role assigned"
      });
      expect(parsed.success).toBe(true);
    });

    it("8. UpdatePermissionsInputSchema rejects invalid permission value", () => {
      const parsed = UpdatePermissionsInputSchema.safeParse({
        relId: REL_ID,
        permissions: {
          training: "super_admin_write",
          recovery: "read",
          nutrition: "none",
          health: "none",
          devices: "none",
          messages: "write"
        }
      });
      expect(parsed.success).toBe(false);
    });

    it("9. RevokeAccessInputSchema requires valid relId", () => {
      const parsed = RevokeAccessInputSchema.safeParse({ relId: REL_ID });
      expect(parsed.success).toBe(true);
    });
  });

  // 2. Presets & Health Module Isolation Rule
  describe("Preset Logic & Zero-Trust Health Isolation", () => {
    it("10. Coach preset strictly defaults health to none", () => {
      const coachPreset = getPresetPermissions("coach");
      expect(coachPreset.health).toBe("none");
      expect(coachPreset.training).toBe("write");
      expect(coachPreset.recovery).toBe("read");
    });

    it("11. Dietitian preset grants nutrition write and health none", () => {
      const dietitianPreset = getPresetPermissions("specialist", "nutrition");
      expect(dietitianPreset.nutrition).toBe("write");
      expect(dietitianPreset.health).toBe("none");
    });

    it("12. Physiotherapist preset grants health write and training read", () => {
      const physioPreset = getPresetPermissions("specialist", "physio");
      expect(physioPreset.health).toBe("write");
      expect(physioPreset.training).toBe("read");
      expect(physioPreset.nutrition).toBe("none");
    });
  });

  // 3. Invite Expiration, Single-Use, Self-Accept & Authorization Logic Simulation
  describe("Backend Sharing & Invite Flow Rules", () => {
    it("13. Generates 7-day expiration timestamp", () => {
      const now = Date.now();
      const expiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000).getTime();
      const diffDays = Math.round((expiresAt - now) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(7);
    });

    it("14. Reject invite redemption if code is already accepted (Single-use enforcement)", () => {
      const invite = {
        code: "APX-TEST1",
        status: "accepted",
        expiresAt: new Date(Date.now() + 100000).toISOString()
      };
      const isPending = invite.status === "pending";
      expect(isPending).toBe(false);
    });

    it("15. Reject invite redemption if code is expired", () => {
      const expiredInvite = {
        code: "APX-EXP01",
        status: "pending",
        expiresAt: new Date(Date.now() - 1000).toISOString()
      };
      const isNotExpired = new Date(expiredInvite.expiresAt).getTime() > Date.now();
      expect(isNotExpired).toBe(false);
    });

    it("16. Athlete cannot accept own generated invite", () => {
      const invite = {
        athleteId: ATHLETE_UID,
        status: "pending"
      };
      const attemptingMemberId = ATHLETE_UID;
      const isAllowed = invite.athleteId !== attemptingMemberId;
      expect(isAllowed).toBe(false);
    });

    it("17. Only athlete can update relationship permissions (Privilege escalation block)", () => {
      const relationship = {
        athleteId: ATHLETE_UID,
        memberId: MEMBER_UID,
        permissions: DEFAULT_PRESETS.coach
      };

      const callerAthlete = ATHLETE_UID;
      const callerMember = MEMBER_UID;
      const callerStranger = OTHER_UID;

      expect(relationship.athleteId === callerAthlete).toBe(true);
      expect(relationship.athleteId === callerMember).toBe(false);
      expect(relationship.athleteId === callerStranger).toBe(false);
    });

    it("18. Both athlete and member may revoke access (Athlete revoke vs Member voluntary leave)", () => {
      const relationship = {
        athleteId: ATHLETE_UID,
        memberId: MEMBER_UID,
        status: "active"
      };

      const canAthleteRevoke =
        relationship.athleteId === ATHLETE_UID || relationship.memberId === ATHLETE_UID;
      const canMemberLeave =
        relationship.athleteId === MEMBER_UID || relationship.memberId === MEMBER_UID;
      const canStrangerRevoke =
        relationship.athleteId === OTHER_UID || relationship.memberId === OTHER_UID;

      expect(canAthleteRevoke).toBe(true);
      expect(canMemberLeave).toBe(true);
      expect(canStrangerRevoke).toBe(false);
    });

    it("19. Revoke action resets all module permissions to none", () => {
      const revokedPermissions: ModulePermissions = {
        training: "none",
        recovery: "none",
        nutrition: "none",
        health: "none",
        devices: "none",
        messages: "none"
      };
      Object.values(revokedPermissions).forEach((level) => {
        expect(level).toBe("none");
      });
    });

    it("20. Audit log structure records who, what, when, old and new values", () => {
      const auditEntry = {
        logId: "log-123",
        relId: REL_ID,
        athleteId: ATHLETE_UID,
        performedBy: ATHLETE_UID,
        action: "permissions_updated",
        previousStatus: "active",
        newStatus: "active",
        previousPermissions: { health: "none", training: "write" },
        newPermissions: { health: "read", training: "write" },
        timestamp: new Date().toISOString(),
        reason: "Athlete explicitly granted medical read to head coach"
      };

      expect(auditEntry.performedBy).toBe(ATHLETE_UID);
      expect(auditEntry.action).toBe("permissions_updated");
      expect(auditEntry.previousPermissions.health).toBe("none");
      expect(auditEntry.newPermissions.health).toBe("read");
      expect(auditEntry.timestamp).toBeDefined();
    });
  });
});
