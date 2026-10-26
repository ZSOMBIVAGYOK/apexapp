import { ModulePermissions, RelationshipStatus } from "@shared/types";

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
  const { auth, path, operation, resourceData, requestData } = req;
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

    // nutritionDays and /entries (NUTRITION module)
    if (subcollection === "nutritionDays") {
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
  }

  // 3. relationships/{relId}
  if (segments[0] === "relationships") {
    const relId = segments[1]!;

    // Audit log subcollection: relationships/{relId}/log/{logId}
    if (segments.length >= 4 && segments[2] === "log") {
      const relDoc = db.relationships?.[relId];
      if (!relDoc) return { allowed: false };
      if (operation === "read") {
        return { allowed: isAuthenticated && relDoc.athleteId === auth?.uid };
      }
      if (operation === "create" || operation === "write") {
        return {
          allowed:
            isAuthenticated &&
            (relDoc.athleteId === auth?.uid || relDoc.memberId === auth?.uid)
        };
      }
      return { allowed: false };
    }

    // Main relationship document
    const relDoc = resourceData || db.relationships?.[relId];

    if (operation === "read") {
      if (!isAuthenticated || !relDoc) return { allowed: false };
      return {
        allowed: relDoc.athleteId === auth?.uid || relDoc.memberId === auth?.uid
      };
    }

    if (operation === "create") {
      const data = requestData || {};
      if (!isAuthenticated) return { allowed: false };
      return {
        allowed: data.athleteId === auth?.uid || data.memberId === auth?.uid
      };
    }

    if (operation === "update" || operation === "write") {
      if (!isAuthenticated || !relDoc) return { allowed: false };
      // ONLY THE ATHLETE can update permissions or status
      const isAthlete = relDoc.athleteId === auth?.uid;
      const targetAthlete = requestData ? requestData.athleteId === auth?.uid : true;
      return { allowed: isAthlete && targetAthlete };
    }

    if (operation === "delete") {
      if (!isAuthenticated || !relDoc) return { allowed: false };
      return { allowed: relDoc.athleteId === auth?.uid };
    }
  }

  // 4. threads/{threadId} & messages
  if (segments[0] === "threads") {
    const threadId = segments[1]!;
    const threadDoc = db.threads?.[threadId];

    if (segments.length === 2) {
      if (operation === "read" || operation === "update") {
        if (!isAuthenticated || !threadDoc) return { allowed: false };
        return {
          allowed:
            threadDoc.athleteId === auth?.uid ||
            threadDoc.participantIds.includes(auth!.uid)
        };
      }
      if (operation === "create") {
        const data = requestData || {};
        return {
          allowed:
            isAuthenticated &&
            (data.athleteId === auth?.uid ||
              (Array.isArray(data.participantIds) && data.participantIds.includes(auth!.uid)))
        };
      }
    }

    if (segments[2] === "messages") {
      if (!isAuthenticated || !threadDoc) return { allowed: false };
      const isParticipant =
        threadDoc.athleteId === auth?.uid || threadDoc.participantIds.includes(auth!.uid);
      if (operation === "read" || operation === "create" || operation === "write") {
        return { allowed: isParticipant };
      }
      return { allowed: false };
    }
  }

  // 5. invites/{code}
  if (segments[0] === "invites") {
    if (operation === "read") {
      return { allowed: isAuthenticated };
    }
    if (operation === "create") {
      const data = requestData || {};
      return { allowed: isAuthenticated && data.athleteId === auth?.uid };
    }
    if (operation === "update") {
      const code = segments[1]!;
      const invite = resourceData || db.invites?.[code];
      const data = requestData || {};
      return {
        allowed:
          isAuthenticated &&
          Boolean(invite && (invite.athleteId === auth?.uid || data.status === "accepted"))
      };
    }
    if (operation === "delete") {
      const code = segments[1]!;
      const invite = resourceData || db.invites?.[code];
      return { allowed: isAuthenticated && Boolean(invite && invite.athleteId === auth?.uid) };
    }
  }

  // Default deny
  return { allowed: false, reason: "Default catch-all deny" };
};
