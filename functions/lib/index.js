"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUserData = exports.healthCheck = void 0;
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
        // 2. Delete collaborations referencing this user as athlete or specialist
        const athleteCollabs = await db
            .collection("collaborations")
            .where("athleteId", "==", uid)
            .get();
        const specialistCollabs = await db
            .collection("collaborations")
            .where("specialistId", "==", uid)
            .get();
        const batch = db.batch();
        athleteCollabs.forEach((docSnap) => batch.delete(docSnap.ref));
        specialistCollabs.forEach((docSnap) => batch.delete(docSnap.ref));
        await batch.commit();
        // 3. Delete user account from Firebase Auth
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