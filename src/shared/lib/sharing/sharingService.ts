import { httpsCallable } from "firebase/functions";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { functions, firestore } from "@shared/lib/firebase";
import {
  MemberRole,
  MemberSpecialty,
  ModulePermissions,
  RelationshipAuditLogEntry,
  SharingRelationship
} from "@shared/types";

export interface CreateInviteResponse {
  success: boolean;
  code: string;
  expiresAt: string;
  permissions: ModulePermissions;
}

export interface AcceptInviteResponse {
  success: boolean;
  relId: string;
  athleteId: string;
  athleteName: string;
  permissions: ModulePermissions;
}

/**
 * Creates an invite code for a coach or specialist via Cloud Function.
 * Returns an alphanumeric code (e.g., APX-XXXXX) valid for 7 days.
 */
export const createSharingInvite = async (params: {
  memberRole: MemberRole;
  specialty?: MemberSpecialty;
  inviteeEmail?: string;
  customPermissions?: Partial<ModulePermissions>;
}): Promise<CreateInviteResponse> => {
  const fn = httpsCallable<typeof params, CreateInviteResponse>(functions, "createInvite");
  const res = await fn(params);
  return res.data;
};

/**
 * Accepts and redeems an invitation code via Cloud Function with an atomic transaction.
 * Establishes an 'active' relationship and writes an audit log.
 */
export const acceptSharingInvite = async (code: string): Promise<AcceptInviteResponse> => {
  const fn = httpsCallable<{ code: string }, AcceptInviteResponse>(functions, "acceptInvite");
  const res = await fn({ code: code.trim().toUpperCase() });
  return res.data;
};

/**
 * Updates module permissions for an existing relationship via Cloud Function.
 * Only the athlete can call this. Writes old/new values to the audit log.
 */
export const updateMemberPermissions = async (
  relId: string,
  permissions: ModulePermissions,
  reason?: string
): Promise<{ success: boolean; permissions: ModulePermissions }> => {
  const fn = httpsCallable<
    { relId: string; permissions: ModulePermissions; reason?: string },
    { success: boolean; permissions: ModulePermissions }
  >(functions, "updatePermissions");
  const res = await fn({ relId, permissions, reason });
  return res.data;
};

/**
 * Revokes access instantly for a relationship via Cloud Function.
 * Callable by either the athlete or the member leaving. Sets status to 'revoked'
 * and all module permissions to 'none'.
 */
export const revokeMemberAccess = async (
  relId: string,
  reason?: string
): Promise<{ success: boolean; status: string }> => {
  const fn = httpsCallable<
    { relId: string; reason?: string },
    { success: boolean; status: string }
  >(functions, "revokeAccess");
  const res = await fn({ relId, reason });
  return res.data;
};

/**
 * Fetches all sharing relationships for an athlete (read-only client query).
 */
export const fetchAthleteRelationships = async (
  athleteId: string
): Promise<SharingRelationship[]> => {
  try {
    const q = query(
      collection(firestore, "relationships"),
      where("athleteId", "==", athleteId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => docSnap.data() as SharingRelationship);
  } catch {
    return [];
  }
};

/**
 * Fetches all sharing relationships where user is a staff member.
 */
export const fetchMemberRelationships = async (
  memberId: string
): Promise<SharingRelationship[]> => {
  try {
    const q = query(
      collection(firestore, "relationships"),
      where("memberId", "==", memberId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => docSnap.data() as SharingRelationship);
  } catch {
    return [];
  }
};

/**
 * Fetches the audit log entries for a relationship (read-only client query).
 */
export const fetchRelationshipAuditLog = async (
  relId: string
): Promise<RelationshipAuditLogEntry[]> => {
  try {
    const q = query(
      collection(firestore, "relationships", relId, "log"),
      orderBy("timestamp", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => docSnap.data() as RelationshipAuditLogEntry);
  } catch {
    return [];
  }
};
