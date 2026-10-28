/**
 * NOTICE: ADVISORY UI EVALUATION ONLY
 *
 * This evaluator replicates the exact logic of firestore.rules strictly for client-side
 * UI hints (such as rendering lock badges, read-only view states, and action disablement).
 *
 * IT IS NEVER A SECURITY BOUNDARY.
 * Real zero-trust security is strictly enforced on the server by Firestore Security Rules
 * and Firebase Cloud Functions (Admin SDK). Clients cannot bypass server enforcement.
 */

import { ModulePermissions, RelationshipStatus, SharingModule } from "@shared/types";

export interface RulesAuthContext {
  uid: string;
}

export interface MockDatabase {
  users?: Record<string, unknown>;
  athletes?: Record<string, unknown>;
  relationships?: Record<
    string,
    {
      athleteId: string;
      memberId: string;
      status: RelationshipStatus;
      permissions: ModulePermissions;
      [key: string]: unknown;
    }
  >;
  threads?: Record<
    string,
    {
      athleteId: string;
      participantIds: string[];
      [key: string]: unknown;
    }
  >;
  invites?: Record<
    string,
    {
      athleteId: string;
      status: "pending" | "accepted" | "expired";
      [key: string]: unknown;
    }
  >;
}

export interface EvaluationRequest {
  auth: RulesAuthContext | null;
  path: string; // e.g. "athletes/ath-1/days/2026-10-26"
  operation: "read" | "write" | "create" | "update" | "delete";
  resourceData?: Record<string, unknown>;
  requestData?: Record<string, unknown>;
}

/**
 * Pure evaluator replicating the exact AST logic of firestore.rules
 */
export const evaluateFirestoreRules = (
  req: EvaluationRequest,
  db: MockDatabase
): { allowed: boolean; reason?: string } => {
  const { auth, path, operation, resourceData } = req;
  const segments = path.split("/").filter(Boolean);

  const isAuthenticated = Boolean(auth && auth.uid);
  const isUser = (uid: string) => isAuthenticated && auth?.uid === uid;

  const hasActiveRel = (athleteId: string, memberId: string): boolean => {
    const key = `${athleteId}_${memberId}`;
    const rel = db.relationships?.[key];
    return Boolean(rel && rel.status === "active");
  };

  const getRel = (athleteId: string, memberId: string) => {
    const key = `${athleteId}_${memberId}`;
    return db.relationships?.[key];
  };

  const canReadModule = (athleteId: string, moduleName: keyof ModulePermissions): boolean => {
    if (isUser(athleteId)) return true;
    if (!isAuthenticated || !auth?.uid) return false;
    if (!hasActiveRel(athleteId, auth.uid)) return false;
    const rel = getRel(athleteId, auth.uid);
    if (!rel) return false;
    const perm = rel.permissions[moduleName];
    return perm === "read" || perm === "write";
  };

  const canWriteModule = (athleteId: string, moduleName: keyof ModulePermissions): boolean => {
    if (isUser(athleteId)) return true;
    if (!isAuthenticated || !auth?.uid) return false;
    if (!hasActiveRel(athleteId, auth.uid)) return false;
    const rel = getRel(athleteId, auth.uid);
    if (!rel) return false;
    return rel.permissions[moduleName] === "write";
  };

  // 1. users/{userId}
  if (segments[0] === "users" && segments.length === 2) {
    const userId = segments[1]!;
    if (operation === "read") {
      return { allowed: isAuthenticated };
    }
    if (operation === "create" || operation === "update" || operation === "write") {
      return { allowed: isUser(userId) };
    }
    return { allowed: false };
  }

  // 2. athletes/{athleteId}/**
  if (segments[0] === "athletes") {
    const athleteId = segments[1]!;

    // Root athlete document: athletes/{athleteId}
    if (segments.length === 2) {
      if (operation === "read") {
        return {
          allowed: isUser(athleteId) || (isAuthenticated && hasActiveRel(athleteId, auth!.uid))
        };
      }
      if (operation === "create" || operation === "update" || operation === "write") {
        return { allowed: isUser(athleteId) };
      }
      return { allowed: false };
    }

    const subcollection = segments[2]!;

    // days (RECOVERY module)
    if (subcollection === "days") {
      if (operation === "read") {
        return { allowed: canReadModule(athleteId, "recovery") };
      }
      return { allowed: canWriteModule(athleteId, "recovery") };
    }

    // sessions (TRAINING module)
    if (subcollection === "sessions") {
      if (operation === "read") {
        return { allowed: canReadModule(athleteId, "training") };
      }
      return { allowed: canWriteModule(athleteId, "training") };
    }

    // plannedWorkouts (TRAINING module)
    if (subcollection === "plannedWorkouts") {
      if (operation === "read") {
        return { allowed: canReadModule(athleteId, "training") };
      }
      return { allowed: canWriteModule(athleteId, "training") };
    }

    // exercises (TRAINING module - exercise library)
    if (subcollection === "exercises") {
      if (operation === "read") {
        return { allowed: canReadModule(athleteId, "training") };
      }
      return { allowed: canWriteModule(athleteId, "training") };
    }

    // nutritionDays and /entries (NUTRITION module)
    if (
      subcollection === "nutritionDays" ||
      subcollection === "mealPlans" ||
      subcollection === "dayTemplates" ||
      subcollection === "plannedDays"
    ) {
      if (operation === "read") {
        return { allowed: canReadModule(athleteId, "nutrition") };
      }
      return { allowed: canWriteModule(athleteId, "nutrition") };
    }

    // injuries (HEALTH module)
    if (subcollection === "injuries") {
      if (operation === "read") {
        return { allowed: canReadModule(athleteId, "health") };
      }
      return { allowed: canWriteModule(athleteId, "health") };
    }

    // measurements (HEALTH module)
    if (subcollection === "measurements") {
      if (operation === "read") {
        return { allowed: canReadModule(athleteId, "health") };
      }
      return { allowed: canWriteModule(athleteId, "health") };
    }

    // notes (HEALTH module)
    if (subcollection === "notes") {
      if (operation === "read") {
        return { allowed: canReadModule(athleteId, "health") };
      }
      return { allowed: canWriteModule(athleteId, "health") };
    }

    // devices (DEVICES module)
    if (subcollection === "devices") {
      if (operation === "read") {
        return { allowed: canReadModule(athleteId, "devices") };
      }
      return { allowed: canWriteModule(athleteId, "devices") };
    }

    // recoveryActivities (RECOVERY module)
    if (subcollection === "recoveryActivities") {
      if (operation === "read") {
        return { allowed: canReadModule(athleteId, "recovery") };
      }
      return { allowed: canWriteModule(athleteId, "recovery") };
    }

    // customRecoveryActivities (RECOVERY module read, athlete write)
    if (subcollection === "customRecoveryActivities") {
      if (operation === "read") {
        return { allowed: canReadModule(athleteId, "recovery") };
      }
      return { allowed: isUser(athleteId) };
    }

    // records (TRAINING module)
    if (subcollection === "records") {
      if (operation === "read") {
        return { allowed: canReadModule(athleteId, "training") };
      }
      return { allowed: canWriteModule(athleteId, "training") };
    }

    // courses (TRAINING module)
    if (subcollection === "courses") {
      if (operation === "read") {
        return { allowed: canReadModule(athleteId, "training") };
      }
      return { allowed: canWriteModule(athleteId, "training") };
    }

    // equipment (TRAINING module)
    if (subcollection === "equipment") {
      if (operation === "read") {
        return { allowed: canReadModule(athleteId, "training") };
      }
      return { allowed: canWriteModule(athleteId, "training") };
    }
  }

  // 3. relationships/{relId}
  if (segments[0] === "relationships") {
    const relId = segments[1]!;

    // Audit log subcollection: relationships/{relId}/log/{logId}
    if (segments.length >= 4 && segments[2] === "log") {
      const relDoc = db.relationships?.[relId];
      if (!relDoc) return { allowed: false };
      if (operation === "read") {
        return {
          allowed:
            isAuthenticated &&
            (relDoc.athleteId === auth?.uid || relDoc.memberId === auth?.uid)
        };
      }
      // WRITES STRICTLY DENIED TO CLIENTS (Admin SDK / Cloud Functions only)
      return { allowed: false, reason: "Audit log writes are restricted to Cloud Functions Admin SDK" };
    }

    // Main relationship document
    const relDoc = resourceData || db.relationships?.[relId];

    if (operation === "read") {
      if (!isAuthenticated || !relDoc) return { allowed: false };
      return {
        allowed: relDoc.athleteId === auth?.uid || relDoc.memberId === auth?.uid
      };
    }

    // WRITES STRICTLY DENIED TO CLIENTS (Admin SDK / Cloud Functions only)
    if (operation === "create" || operation === "update" || operation === "delete" || operation === "write") {
      return {
        allowed: false,
        reason: "Direct client writes to relationships are prohibited; mutations require Cloud Functions"
      };
    }
  }

  // 4. threads/{threadId} & messages (MESSAGES module)
  if (segments[0] === "threads") {
    const threadId = segments[1]!;
    const threadDoc = db.threads?.[threadId];

    if (segments.length === 2) {
      if (operation === "read") {
        if (!isAuthenticated || !threadDoc) return { allowed: false };
        const isAthlete = threadDoc.athleteId === auth?.uid;
        const isParticipantWithPerm =
          threadDoc.participantIds.includes(auth!.uid) && canReadModule(threadDoc.athleteId, "messages");
        return { allowed: isAthlete || isParticipantWithPerm };
      }
      if (operation === "create" || operation === "update" || operation === "write") {
        if (!isAuthenticated) return { allowed: false };
        const athleteId = threadDoc ? threadDoc.athleteId : auth!.uid;
        const isAthlete = athleteId === auth?.uid;
        const isParticipantWithPerm = canWriteModule(athleteId, "messages");
        return { allowed: isAthlete || isParticipantWithPerm };
      }
    }

    if (segments[2] === "messages") {
      if (!isAuthenticated || !threadDoc) return { allowed: false };
      const isAthlete = threadDoc.athleteId === auth?.uid;
      if (operation === "read") {
        return {
          allowed: isAthlete || (threadDoc.participantIds.includes(auth!.uid) && canReadModule(threadDoc.athleteId, "messages"))
        };
      }
      if (operation === "create" || operation === "write") {
        return {
          allowed: isAthlete || (threadDoc.participantIds.includes(auth!.uid) && canWriteModule(threadDoc.athleteId, "messages"))
        };
      }
      return { allowed: false };
    }
  }

  // 5. invites/{code}
  if (segments[0] === "invites") {
    const code = segments[1]!;
    const invite = resourceData || db.invites?.[code];

    if (operation === "read") {
      // Only the athlete who created the invite may read their own invite document directly
      return {
        allowed: isAuthenticated && Boolean(invite && invite.athleteId === auth?.uid)
      };
    }

    // WRITES STRICTLY DENIED TO CLIENTS (Admin SDK / Cloud Functions only)
    if (operation === "create" || operation === "update" || operation === "delete" || operation === "write") {
      return {
        allowed: false,
        reason: "Invites can only be created and redeemed via Cloud Functions with the Admin SDK"
      };
    }
  }

  // Default deny
  return { allowed: false, reason: "Default catch-all deny" };
};

export interface StorageEvaluationRequest {
  auth: RulesAuthContext | null;
  path: string; // e.g. "athletes/ath-1/workouts/sess-1/run.fit"
  operation: "read" | "write";
  fileSizeBytes?: number;
  contentType?: string;
}

/**
 * Pure evaluator replicating storage.rules for client-side tests and validation
 */
export const evaluateStorageRules = (
  req: StorageEvaluationRequest,
  db: MockDatabase
): { allowed: boolean; reason?: string } => {
  const { auth, path, operation, fileSizeBytes = 1024, contentType = "application/octet-stream" } = req;
  const segments = path.split("/").filter(Boolean);

  const isAuthenticated = Boolean(auth && auth.uid);
  const isUser = (uid: string) => isAuthenticated && auth?.uid === uid;

  if (segments[0] === "athletes" && segments[2] === "workouts") {
    const athleteId = segments[1]!;

    if (operation === "read") {
      if (isUser(athleteId)) return { allowed: true };
      if (!isAuthenticated || !auth?.uid) return { allowed: false, reason: "Unauthenticated" };

      const key = `${athleteId}_${auth.uid}`;
      const rel = db.relationships?.[key];
      const hasTrainingRead = Boolean(
        rel && rel.status === "active" && rel.permissions.training && rel.permissions.training !== "none"
      );

      return { allowed: hasTrainingRead };
    }

    if (operation === "write") {
      if (!isUser(athleteId)) {
        return { allowed: false, reason: "Only athlete can upload their workout files" };
      }

      const isValidSize = fileSizeBytes <= 25 * 1024 * 1024;
      const isValidType =
        contentType.startsWith("application/") ||
        contentType.startsWith("text/") ||
        contentType === "application/octet-stream";

      if (!isValidSize) return { allowed: false, reason: "File exceeds 25 MB" };
      if (!isValidType) return { allowed: false, reason: "Invalid content type" };

      return { allowed: true };
    }
  }

  return { allowed: false, reason: "Default storage deny" };
};

/**
 * UI helper to determine module lock status and access level for visual rendering.
 * Does NOT substitute for server-side rules.
 */
export const getModuleUiAccess = (
  rel: { status: RelationshipStatus; permissions: ModulePermissions } | null | undefined,
  module: SharingModule
): { hasAccess: boolean; canWrite: boolean; isLocked: boolean; level: "none" | "read" | "write" } => {
  if (!rel || rel.status !== "active") {
    return { hasAccess: false, canWrite: false, isLocked: true, level: "none" };
  }
  const level = rel.permissions[module] || "none";
  return {
    hasAccess: level === "read" || level === "write",
    canWrite: level === "write",
    isLocked: level === "none",
    level
  };
};
