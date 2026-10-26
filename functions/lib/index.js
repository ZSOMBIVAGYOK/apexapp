"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUserData = exports.revokeAccess = exports.updatePermissions = exports.acceptInvite = exports.createInvite = exports.healthCheck = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
if (!admin.apps.length) {
    admin.initializeApp();
}
// Apex Cloud Functions health check
exports.healthCheck = (0, https_1.onRequest)((request, response) => {
    logger.info("Apex Health Check pinged", { structuredData: true });
    response.json({
        status: "ok",
        app: "Apex",
        timestamp: new Date().toISOString()
    });
});
const DEFAULT_PRESETS = {
    coach: {
        training: "write",
        recovery: "read",
        nutrition: "read",
        devices: "read",
        messages: "write",
        health: "none" // Coaches must NOT see health unless explicitly granted!
    },
    nutrition: {
        nutrition: "write",
        recovery: "read",
        training: "read",
        messages: "write",
        devices: "none",
        health: "none"
    },
    physio: {
        health: "write",
        training: "read",
        recovery: "read",
        messages: "write",
        nutrition: "none",
        devices: "none"
    },
    strength: {
        training: "write",
        recovery: "read",
        messages: "write",
        nutrition: "none",
        devices: "none",
        health: "none"
    },
    psychology: {
        recovery: "read",
        messages: "write",
        training: "none",
        nutrition: "none",
        devices: "none",
        health: "none"
    },
    medical: {
        health: "write",
        recovery: "read",
        nutrition: "read",
        training: "read",
        messages: "write",
        devices: "none"
    }
};
const getPresetPermissions = (role, specialty) => {
    if (role === "coach") {
        return { ...DEFAULT_PRESETS.coach };
    }
    if (specialty && DEFAULT_PRESETS[specialty]) {
        return { ...DEFAULT_PRESETS[specialty] };
    }
    return {
        training: "read",
        recovery: "read",
        nutrition: "none",
        health: "none",
        devices: "none",
        messages: "write"
    };
};
/**
 * 1. createInvite: Athlete creates an invitation code for a coach or specialist.
 */
exports.createInvite = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required to create invites.");
    }
    const athleteId = request.auth.uid;
    const { memberRole, specialty, inviteeEmail, customPermissions } = request.data || {};
    if (!memberRole || (memberRole !== "coach" && memberRole !== "specialist")) {
        throw new https_1.HttpsError("invalid-argument", "Valid memberRole ('coach' | 'specialist') is required.");
    }
    const db = admin.firestore();
    // Fetch athlete profile for display name
    let athleteName = "Sportoló";
    let athleteEmail = "";
    try {
        const userSnap = await db.collection("users").doc(athleteId).get();
        if (userSnap.exists) {
            const uData = userSnap.data();
            athleteName = uData?.displayName || athleteName;
            athleteEmail = uData?.email || athleteEmail;
        }
    }
    catch {
        // Fallback to defaults
    }
    // Generate unique 6-character alphanumeric code e.g. APX-98K2
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let randomPart = "";
    for (let i = 0; i < 5; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const code = `APX-${randomPart}`;
    const basePermissions = getPresetPermissions(memberRole, specialty);
    const permissions = {
        ...basePermissions,
        ...(customPermissions || {})
    };
    // 7 days expiration
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const createdAt = new Date().toISOString();
    const inviteDoc = {
        code,
        athleteId,
        athleteName,
        athleteEmail,
        inviteeEmail: inviteeEmail || null,
        memberRole,
        specialty: specialty || (memberRole === "coach" ? "other" : "other"),
        permissions,
        status: "pending",
        expiresAt,
        createdAt
    };
    await db.collection("invites").doc(code).set(inviteDoc);
    logger.info(`Invite created by athlete ${athleteId} with code: ${code}`);
    return {
        success: true,
        code,
        expiresAt,
        permissions
    };
});
/**
 * 2. acceptInvite: Coach or specialist accepts an invitation code.
 */
exports.acceptInvite = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required to accept an invite.");
    }
    const memberId = request.auth.uid;
    const { code } = request.data || {};
    if (!code || typeof code !== "string") {
        throw new https_1.HttpsError("invalid-argument", "Invite code is required.");
    }
    const db = admin.firestore();
    const inviteRef = db.collection("invites").doc(code.trim().toUpperCase());
    const inviteSnap = await inviteRef.get();
    if (!inviteSnap.exists) {
        throw new https_1.HttpsError("not-found", "A megadott meghívókód nem létezik vagy lejárt.");
    }
    const inviteData = inviteSnap.data();
    if (inviteData?.status !== "pending") {
        throw new https_1.HttpsError("failed-precondition", "Ez a meghívókód már fel lett használva.");
    }
    if (new Date(inviteData.expiresAt).getTime() < Date.now()) {
        throw new https_1.HttpsError("failed-precondition", "A meghívókód érvényessége lejárt.");
    }
    if (inviteData.athleteId === memberId) {
        throw new https_1.HttpsError("invalid-argument", "Nem fogadhatod el a saját magad által generált meghívót.");
    }
    // Fetch member info
    let memberName = "Szakember";
    let memberEmail = "";
    try {
        const memberSnap = await db.collection("users").doc(memberId).get();
        if (memberSnap.exists) {
            const mData = memberSnap.data();
            memberName = mData?.displayName || memberName;
            memberEmail = mData?.email || memberEmail;
        }
    }
    catch {
        // Fallback
    }
    const athleteId = inviteData.athleteId;
    const relId = `${athleteId}_${memberId}`;
    const now = new Date().toISOString();
    // Create or update relationships/{relId}
    const relDoc = {
        relId,
        athleteId,
        memberId,
        memberName,
        memberEmail,
        memberRole: inviteData.memberRole,
        specialty: inviteData.specialty,
        status: "active",
        permissions: inviteData.permissions,
        createdAt: now,
        updatedAt: now,
        updatedBy: memberId
    };
    const batch = db.batch();
    batch.set(db.collection("relationships").doc(relId), relDoc, { merge: true });
    // Append audit log entry
    const logRef = db.collection("relationships").doc(relId).collection("log").doc();
    batch.set(logRef, {
        logId: logRef.id,
        relId,
        athleteId,
        performedBy: memberId,
        action: "accepted",
        newStatus: "active",
        newPermissions: inviteData.permissions,
        timestamp: now,
        reason: `Invite code ${code} accepted by ${memberName}`
    });
    // Mark invite as accepted
    batch.update(inviteRef, {
        status: "accepted",
        acceptedAt: now,
        acceptedBy: memberId
    });
    await batch.commit();
    logger.info(`Relationship ${relId} established via invite ${code}`);
    return {
        success: true,
        relId,
        athleteId,
        athleteName: inviteData.athleteName,
        permissions: inviteData.permissions
    };
});
/**
 * 3. updatePermissions: Athlete modifies per-module permissions for a coach or specialist.
 */
exports.updatePermissions = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required to update permissions.");
    }
    const athleteId = request.auth.uid;
    const { relId, permissions, reason } = request.data || {};
    if (!relId || !permissions) {
        throw new https_1.HttpsError("invalid-argument", "relId and permissions are required.");
    }
    const db = admin.firestore();
    const relRef = db.collection("relationships").doc(relId);
    const relSnap = await relRef.get();
    if (!relSnap.exists) {
        throw new https_1.HttpsError("not-found", "Relationship record not found.");
    }
    const relData = relSnap.data();
    // CORE PRINCIPLE: athlete owns the data
    if (relData?.athleteId !== athleteId) {
        throw new https_1.HttpsError("permission-denied", "Only the athlete can modify sharing permissions.");
    }
    const previousPermissions = relData.permissions;
    const now = new Date().toISOString();
    const batch = db.batch();
    batch.update(relRef, {
        permissions,
        updatedAt: now,
        updatedBy: athleteId
    });
    // Append to audit log
    const logRef = relRef.collection("log").doc();
    batch.set(logRef, {
        logId: logRef.id,
        relId,
        athleteId,
        performedBy: athleteId,
        action: "permissions_updated",
        previousPermissions,
        newPermissions: permissions,
        timestamp: now,
        reason: reason || "Athlete updated sharing module permissions"
    });
    await batch.commit();
    logger.info(`Permissions updated for rel ${relId} by athlete ${athleteId}`);
    return {
        success: true,
        relId,
        permissions
    };
});
/**
 * 4. revokeAccess: Athlete instantly revokes a member's access.
 */
exports.revokeAccess = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required to revoke access.");
    }
    const athleteId = request.auth.uid;
    const { relId, reason } = request.data || {};
    if (!relId) {
        throw new https_1.HttpsError("invalid-argument", "relId is required.");
    }
    const db = admin.firestore();
    const relRef = db.collection("relationships").doc(relId);
    const relSnap = await relRef.get();
    if (!relSnap.exists) {
        throw new https_1.HttpsError("not-found", "Relationship record not found.");
    }
    const relData = relSnap.data();
    if (relData?.athleteId !== athleteId) {
        throw new https_1.HttpsError("permission-denied", "Only the athlete can revoke sharing access.");
    }
    const now = new Date().toISOString();
    const revokedPermissions = {
        training: "none",
        recovery: "none",
        nutrition: "none",
        health: "none",
        devices: "none",
        messages: "none"
    };
    const batch = db.batch();
    batch.update(relRef, {
        status: "revoked",
        permissions: revokedPermissions,
        updatedAt: now,
        updatedBy: athleteId
    });
    // Append to audit log
    const logRef = relRef.collection("log").doc();
    batch.set(logRef, {
        logId: logRef.id,
        relId,
        athleteId,
        performedBy: athleteId,
        action: "revoked",
        previousStatus: relData.status,
        newStatus: "revoked",
        timestamp: now,
        reason: reason || "Athlete instantly revoked all module permissions"
    });
    await batch.commit();
    logger.info(`Access revoked for rel ${relId} by athlete ${athleteId}`);
    return {
        success: true,
        relId,
        status: "revoked"
    };
});
/**
 * Permanently deletes all user data (Firestore documents, subcollections, collaborations, and Firebase Auth record).
 * GDPR Right to Erasure (Article 17) compliance.
 */
exports.deleteUserData = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication is required to permanently delete an account.");
    }
    const uid = request.auth.uid;
    logger.info(`Initiating permanent data deletion for user: ${uid}`);
    const db = admin.firestore();
    try {
        // 1. Recursively delete users/{uid} document and all subcollections
        const userDocRef = db.collection("users").doc(uid);
        await db.recursiveDelete(userDocRef);
        // 2. Recursively delete athletes/{uid} tree
        const athleteDocRef = db.collection("athletes").doc(uid);
        await db.recursiveDelete(athleteDocRef);
        // 3. Delete relationships where this user was athlete or member
        const athleteRels = await db
            .collection("relationships")
            .where("athleteId", "==", uid)
            .get();
        const memberRels = await db
            .collection("relationships")
            .where("memberId", "==", uid)
            .get();
        const batch = db.batch();
        for (const docSnap of athleteRels.docs) {
            await db.recursiveDelete(docSnap.ref);
        }
        for (const docSnap of memberRels.docs) {
            batch.delete(docSnap.ref);
        }
        await batch.commit();
        // 4. Delete user account from Firebase Auth
        try {
            await admin.auth().deleteUser(uid);
            logger.info(`Firebase Auth account deleted for uid: ${uid}`);
        }
        catch (authError) {
            logger.warn(`Firebase Auth user deletion note for ${uid}:`, authError);
        }
        return {
            success: true,
            message: "All athlete profile, biometric, and account records have been permanently erased."
        };
    }
    catch (error) {
        logger.error(`Error deleting user data for ${uid}:`, error);
        throw new https_1.HttpsError("internal", "Failed to permanently delete user data. Please try again or contact support.");
    }
});
//# sourceMappingURL=index.js.map