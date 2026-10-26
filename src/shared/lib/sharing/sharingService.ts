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
 * Creates an invite for a coach or specialist
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
 * Accepts an invitation code
 */
export const acceptSharingInvite = async (code: string): Promise<AcceptInviteResponse> => {
  const fn = httpsCallable<{ code: string }, AcceptInviteResponse>(functions, "acceptInvite");
  const res = await fn({ code: code.trim().toUpperCase() });
  return res.data;
};

/**
 * Updates permissions for an existing relationship
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
 * Revokes access instantly for a coach or specialist
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
 * Fetches all sharing relationships for an athlete
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
  } catch (err) {
    // If offline or permission error, return empty
    return [];
  }
};

/**
 * Fetches the audit log entries for a relationship
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
  } catch (err) {
    return [];
  }
};
