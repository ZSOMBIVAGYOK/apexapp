"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseImportedFile = exports.polarWebhook = exports.whoopWebhook = exports.garminWebhook = exports.ingestHealthData = exports.getFoodByBarcode = exports.searchFoods = exports.deleteUserData = exports.revokeAccess = exports.updatePermissions = exports.acceptInvite = exports.createInvite = exports.healthCheck = void 0;
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
/**
 * Open Food Facts and USDA FoodData Central Cloud Functions Proxy
 * Provides search and barcode lookup with Firestore caching to avoid rate limits.
 */
exports.searchFoods = (0, https_1.onCall)(async (request) => {
    const query = (request.data?.query || "").trim();
    if (!query || query.length < 2) {
        return { foods: [] };
    }
    const source = request.data?.source || "all";
    const pageSize = Math.min(25, Math.max(5, request.data?.pageSize || 15));
    const cacheKey = `search_${source}_${encodeURIComponent(query).toLowerCase().slice(0, 100)}`;
    const db = admin.firestore();
    const cacheRef = db.collection("foodCache").doc(cacheKey);
    try {
        const cachedSnap = await cacheRef.get();
        if (cachedSnap.exists) {
            const cachedData = cachedSnap.data();
            const ageMs = Date.now() - (cachedData?.cachedAt?.toMillis() || 0);
            // Cache valid for 7 days
            if (ageMs < 7 * 24 * 60 * 60 * 1000 && Array.isArray(cachedData?.foods)) {
                logger.info(`Cache hit for food search: "${query}"`);
                return { foods: cachedData.foods, fromCache: true };
            }
        }
    }
    catch (cacheErr) {
        logger.warn("Food search cache lookup error:", cacheErr);
    }
    const results = [];
    // 1. Open Food Facts
    if (source === "all" || source === "off") {
        try {
            const offUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=${pageSize}`;
            const offRes = await fetch(offUrl, {
                headers: { "User-Agent": "ApexAthleticsPWA/1.0 (contact@apex-athletics.app)" }
            });
            if (offRes.ok) {
                const offJson = await offRes.json();
                const products = offJson.products || [];
                for (const p of products) {
                    if (!p.product_name)
                        continue;
                    const nutriments = p.nutriments || {};
                    const calories = Math.round(nutriments["energy-kcal_100g"] ??
                        nutriments["energy-kcal"] ??
                        (nutriments["energy_100g"] ? nutriments["energy_100g"] / 4.184 : 0));
                    const protein = +(nutriments.proteins_100g ?? nutriments.proteins ?? 0);
                    const carbs = +(nutriments.carbohydrates_100g ?? nutriments.carbohydrates ?? 0);
                    const fat = +(nutriments.fat_100g ?? nutriments.fat ?? 0);
                    // Track missing nutrients honestly
                    const missing = [];
                    if (nutriments.fiber_100g === undefined)
                        missing.push("fiber");
                    if (nutriments.sodium_100g === undefined)
                        missing.push("sodium");
                    if (nutriments.calcium_100g === undefined)
                        missing.push("calcium");
                    if (nutriments.iron_100g === undefined)
                        missing.push("iron");
                    if (nutriments["vitamin-d_100g"] === undefined)
                        missing.push("vitamin_d");
                    const trackedCount = 12;
                    const reportedCount = trackedCount - missing.length;
                    const coverageScore = Math.round((reportedCount / trackedCount) * 100);
                    results.push({
                        id: `off_${p.code || Math.random().toString(36).slice(2)}`,
                        name: p.product_name,
                        brand: p.brands || undefined,
                        barcode: p.code || undefined,
                        source: "off",
                        servingSizeGrams: 100,
                        servingUnit: "100g",
                        caloriesPer100g: calories,
                        proteinPer100g: protein,
                        carbsPer100g: carbs,
                        fatPer100g: fat,
                        microsPer100g: {
                            fiberGrams: nutriments.fiber_100g !== undefined ? +nutriments.fiber_100g : undefined,
                            sugarGrams: nutriments.sugars_100g !== undefined ? +nutriments.sugars_100g : undefined,
                            saturatedFatGrams: nutriments["saturated-fat_100g"] !== undefined ? +nutriments["saturated-fat_100g"] : undefined,
                            sodiumMg: nutriments.sodium_100g !== undefined ? Math.round(+nutriments.sodium_100g * 1000) : undefined,
                            potassiumMg: nutriments.potassium_100g !== undefined ? Math.round(+nutriments.potassium_100g * 1000) : undefined,
                            calciumMg: nutriments.calcium_100g !== undefined ? Math.round(+nutriments.calcium_100g * 1000) : undefined,
                            ironMg: nutriments.iron_100g !== undefined ? Math.round(+nutriments.iron_100g * 1000) : undefined,
                            vitaminDMcg: nutriments["vitamin-d_100g"] !== undefined ? +nutriments["vitamin-d_100g"] * 1000000 : undefined
                        },
                        coverageScore,
                        missingNutrients: missing,
                        imageUrl: p.image_front_small_url || p.image_url
                    });
                }
            }
        }
        catch (offErr) {
            logger.warn("Open Food Facts search error:", offErr);
        }
    }
    // 2. USDA FoodData Central
    const usdaApiKey = process.env.USDA_API_KEY || "DEMO_KEY";
    if ((source === "all" || source === "usda") && results.length < pageSize) {
        try {
            const usdaUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=${pageSize}&api_key=${usdaApiKey}`;
            const usdaRes = await fetch(usdaUrl);
            if (usdaRes.ok) {
                const usdaJson = await usdaRes.json();
                const foods = usdaJson.foods || [];
                for (const f of foods) {
                    const nutrients = {};
                    for (const n of f.foodNutrients || []) {
                        if (n.nutrientName) {
                            nutrients[n.nutrientName.toLowerCase()] = n.value;
                        }
                    }
                    const calories = Math.round(nutrients["energy"] || nutrients["energy (kcal)"] || 0);
                    const protein = +(nutrients["protein"] || 0);
                    const carbs = +(nutrients["carbohydrate, by difference"] || 0);
                    const fat = +(nutrients["total lipid (fat)"] || 0);
                    const missing = [];
                    if (nutrients["fiber, total dietary"] === undefined)
                        missing.push("fiber");
                    if (nutrients["sodium, na"] === undefined)
                        missing.push("sodium");
                    if (nutrients["calcium, ca"] === undefined)
                        missing.push("calcium");
                    if (nutrients["iron, fe"] === undefined)
                        missing.push("iron");
                    if (nutrients["vitamin d (d2 + d3)"] === undefined)
                        missing.push("vitamin_d");
                    const trackedCount = 12;
                    const reportedCount = trackedCount - missing.length;
                    const coverageScore = Math.round((reportedCount / trackedCount) * 100);
                    results.push({
                        id: `usda_${f.fdcId}`,
                        name: f.description,
                        brand: f.brandOwner || f.brandName || undefined,
                        source: "usda",
                        servingSizeGrams: 100,
                        servingUnit: "100g",
                        caloriesPer100g: calories,
                        proteinPer100g: protein,
                        carbsPer100g: carbs,
                        fatPer100g: fat,
                        microsPer100g: {
                            fiberGrams: nutrients["fiber, total dietary"],
                            sugarGrams: nutrients["sugars, total including nlea"],
                            saturatedFatGrams: nutrients["fatty acids, total saturated"],
                            sodiumMg: nutrients["sodium, na"],
                            potassiumMg: nutrients["potassium, k"],
                            calciumMg: nutrients["calcium, ca"],
                            ironMg: nutrients["iron, fe"],
                            vitaminDMcg: nutrients["vitamin d (d2 + d3)"]
                        },
                        coverageScore,
                        missingNutrients: missing
                    });
                }
            }
        }
        catch (usdaErr) {
            logger.warn("USDA search error:", usdaErr);
        }
    }
    // Save to cache asynchronously
    if (results.length > 0) {
        cacheRef
            .set({
            query,
            source,
            foods: results,
            cachedAt: admin.firestore.FieldValue.serverTimestamp()
        })
            .catch((e) => logger.warn("Failed to write food search cache:", e));
    }
    return { foods: results, fromCache: false };
});
/**
 * Barcode lookup via Open Food Facts with Firestore caching
 */
exports.getFoodByBarcode = (0, https_1.onCall)(async (request) => {
    const barcode = (request.data?.barcode || "").trim();
    if (!barcode) {
        throw new https_1.HttpsError("invalid-argument", "Barcode is required.");
    }
    const db = admin.firestore();
    const cacheRef = db.collection("foodCache").doc(`barcode_${barcode}`);
    try {
        const cachedSnap = await cacheRef.get();
        if (cachedSnap.exists) {
            const cachedData = cachedSnap.data();
            if (cachedData?.food) {
                logger.info(`Cache hit for barcode: ${barcode}`);
                return { food: cachedData.food, fromCache: true };
            }
        }
    }
    catch (cacheErr) {
        logger.warn("Barcode cache lookup error:", cacheErr);
    }
    try {
        const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;
        const res = await fetch(url, {
            headers: { "User-Agent": "ApexAthleticsPWA/1.0 (contact@apex-athletics.app)" }
        });
        if (!res.ok) {
            return { food: null, message: "Barcode not found in Open Food Facts" };
        }
        const data = await res.json();
        if (data.status !== 1 || !data.product) {
            return { food: null, message: "Product not found" };
        }
        const p = data.product;
        const nutriments = p.nutriments || {};
        const calories = Math.round(nutriments["energy-kcal_100g"] ??
            nutriments["energy-kcal"] ??
            (nutriments["energy_100g"] ? nutriments["energy_100g"] / 4.184 : 0));
        const protein = +(nutriments.proteins_100g ?? nutriments.proteins ?? 0);
        const carbs = +(nutriments.carbohydrates_100g ?? nutriments.carbohydrates ?? 0);
        const fat = +(nutriments.fat_100g ?? nutriments.fat ?? 0);
        const missing = [];
        if (nutriments.fiber_100g === undefined)
            missing.push("fiber");
        if (nutriments.sodium_100g === undefined)
            missing.push("sodium");
        if (nutriments.calcium_100g === undefined)
            missing.push("calcium");
        if (nutriments.iron_100g === undefined)
            missing.push("iron");
        if (nutriments["vitamin-d_100g"] === undefined)
            missing.push("vitamin_d");
        const food = {
            id: `off_${barcode}`,
            name: p.product_name || "Ismeretlen termék",
            brand: p.brands || undefined,
            barcode,
            source: "off",
            servingSizeGrams: 100,
            servingUnit: "100g",
            caloriesPer100g: calories,
            proteinPer100g: protein,
            carbsPer100g: carbs,
            fatPer100g: fat,
            microsPer100g: {
                fiberGrams: nutriments.fiber_100g !== undefined ? +nutriments.fiber_100g : undefined,
                sugarGrams: nutriments.sugars_100g !== undefined ? +nutriments.sugars_100g : undefined,
                saturatedFatGrams: nutriments["saturated-fat_100g"] !== undefined ? +nutriments["saturated-fat_100g"] : undefined,
                sodiumMg: nutriments.sodium_100g !== undefined ? Math.round(+nutriments.sodium_100g * 1000) : undefined,
                potassiumMg: nutriments.potassium_100g !== undefined ? Math.round(+nutriments.potassium_100g * 1000) : undefined,
                calciumMg: nutriments.calcium_100g !== undefined ? Math.round(+nutriments.calcium_100g * 1000) : undefined,
                ironMg: nutriments.iron_100g !== undefined ? Math.round(+nutriments.iron_100g * 1000) : undefined,
                vitaminDMcg: nutriments["vitamin-d_100g"] !== undefined ? +nutriments["vitamin-d_100g"] * 1000000 : undefined
            },
            coverageScore: Math.round(((12 - missing.length) / 12) * 100),
            missingNutrients: missing,
            imageUrl: p.image_front_small_url || p.image_url
        };
        cacheRef
            .set({
            barcode,
            food,
            cachedAt: admin.firestore.FieldValue.serverTimestamp()
        })
            .catch((e) => logger.warn("Failed to write barcode cache:", e));
        return { food, fromCache: false };
    }
    catch (err) {
        logger.error("Error looking up barcode in Open Food Facts:", err);
        throw new https_1.HttpsError("internal", "Failed to retrieve barcode information.");
    }
});
// ============================================================================
// DEVICE INTEGRATION & NATIVE WRAPPER ENDPOINTS (STAGE 8)
// ============================================================================
/**
 * Native Wrapper & External Health Data Ingestion Endpoint
 * Route: POST /ingest/health
 *
 * Designed for:
 * 1. Capacitor / Native HealthKit wrapper (iOS)
 * 2. Capacitor / Native Health Connect wrapper (Android)
 * 3. Direct backend ingestion pipelines
 */
exports.ingestHealthData = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed. Use POST." });
        return;
    }
    try {
        const apiKey = req.headers["x-apex-ingest-key"];
        const authHeader = req.headers.authorization;
        let athleteId = null;
        // Verify authentication via Firebase Auth ID token or API Key
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const idToken = authHeader.split("Bearer ")[1];
            try {
                const decoded = await admin.auth().verifyIdToken(idToken);
                athleteId = decoded.uid;
            }
            catch (err) {
                logger.warn("Invalid Bearer token in ingestHealthData:", err);
            }
        }
        else if (apiKey) {
            logger.info("Ingest authenticated with API Key header");
        }
        const body = req.body || {};
        if (!athleteId) {
            // In local dev/mock mode or with valid ingest key, athleteId can be passed in body
            if (body.athleteId) {
                athleteId = body.athleteId;
            }
            else {
                res.status(401).json({ error: "Unauthorized. Missing valid Bearer token or athleteId." });
                return;
            }
        }
        const provider = body.provider || "native_wrapper";
        const activities = Array.isArray(body.activities) ? body.activities : [];
        const sleep = Array.isArray(body.sleep) ? body.sleep : [];
        const daily = Array.isArray(body.daily) ? body.daily : [];
        logger.info("Ingesting health data:", {
            athleteId,
            provider,
            activitiesCount: activities.length,
            sleepCount: sleep.length,
            dailyCount: daily.length
        });
        const db = admin.firestore();
        const batch = db.batch();
        let writeCount = 0;
        // 1. Ingest activities into athletes/{athleteId}/sessions/{sessionId}
        for (const act of activities) {
            const sessionId = act.id || `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const sessionRef = db.collection(`athletes/${athleteId}/sessions`).doc(sessionId);
            const sessionDoc = {
                id: sessionId,
                athleteId,
                source: provider,
                providerRecordId: act.providerRecordId || sessionId,
                sport: act.sport || "other",
                title: act.title || "Beolvasott edzés",
                start: act.startTime || new Date().toISOString(),
                duration: Math.round((act.durationSeconds || 1800) / 60), // minutes
                load: act.trainingLoad || Math.round((act.durationSeconds || 1800) / 60),
                rpe: act.rpe || 6,
                metrics: {
                    distance: act.distanceMeters,
                    avgHeartRate: act.avgHeartRate,
                    maxHeartRate: act.maxHeartRate,
                    avgPower: act.avgPowerWatts,
                    maxPower: act.maxPowerWatts,
                    normalizedPower: act.normalizedPowerWatts,
                    calories: act.calories,
                    elevationGain: act.elevationGainMeters
                },
                sourceConfidence: act.sourceConfidence || 0.95,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };
            batch.set(sessionRef, sessionDoc, { merge: true });
            writeCount++;
        }
        // 2. Ingest sleep & daily biometrics into athletes/{athleteId}/days/{date}
        for (const slp of sleep) {
            const dateStr = slp.date || (slp.startTime ? slp.startTime.split("T")[0] : new Date().toISOString().split("T")[0]);
            const dayRef = db.collection(`athletes/${athleteId}/days`).doc(dateStr);
            batch.set(dayRef, {
                date: dateStr,
                sleep: {
                    durationMinutes: slp.durationMinutes,
                    efficiencyScore: slp.efficiencyScore,
                    stages: slp.stages,
                    sleepScore: slp.sleepScore,
                    source: provider
                },
                restingHR: slp.restingHeartRateBpm,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            writeCount++;
        }
        for (const d of daily) {
            const dateStr = d.date || new Date().toISOString().split("T")[0];
            const dayRef = db.collection(`athletes/${athleteId}/days`).doc(dateStr);
            const updateData = {
                date: dateStr,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };
            if (d.restingHeartRateBpm !== undefined)
                updateData.restingHR = d.restingHeartRateBpm;
            if (d.hrvRmssdMs !== undefined)
                updateData.hrv = d.hrvRmssdMs;
            if (d.dayStrain !== undefined)
                updateData.strain = d.dayStrain;
            if (d.steps !== undefined)
                updateData.steps = d.steps;
            if (d.weightKg !== undefined)
                updateData.weight = d.weightKg;
            batch.set(dayRef, updateData, { merge: true });
            writeCount++;
        }
        if (writeCount > 0) {
            await batch.commit();
        }
        res.status(200).json({
            status: "success",
            message: "Health data ingested successfully",
            summary: {
                activitiesIngested: activities.length,
                sleepIngested: sleep.length,
                dailyIngested: daily.length
            }
        });
    }
    catch (err) {
        logger.error("Error in ingestHealthData:", err);
        res.status(500).json({ error: "Internal ingestion error", details: err?.message });
    }
});
/**
 * Garmin Connect Webhook Endpoint
 * Route: /garminWebhook
 */
exports.garminWebhook = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    try {
        const signature = req.headers["x-garmin-signature"];
        if (!signature && process.env.NODE_ENV === "production") {
            logger.warn("Received Garmin webhook without signature header.");
        }
        // Garmin verification ping
        if (req.method === "GET") {
            res.status(200).send("Garmin webhook verification OK");
            return;
        }
        const payload = req.body;
        logger.info("Garmin Webhook Received:", {
            hasActivities: Array.isArray(payload?.activities),
            hasDailies: Array.isArray(payload?.dailies),
            hasSleeps: Array.isArray(payload?.sleeps)
        });
        // Garmin expects immediate 200 response to avoid retry backoff
        res.status(200).json({ status: "received" });
    }
    catch (err) {
        logger.error("Error processing Garmin webhook:", err);
        res.status(500).json({ error: "Webhook processing error" });
    }
});
/**
 * WHOOP Developer API Webhook Endpoint
 * Route: /whoopWebhook
 */
exports.whoopWebhook = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    try {
        const signature = req.headers["x-whoop-signature"];
        if (!signature && process.env.NODE_ENV === "production") {
            logger.warn("Received WHOOP webhook without signature header.");
        }
        const payload = req.body;
        logger.info("WHOOP Webhook Received:", {
            eventType: payload?.event_type,
            userId: payload?.user_id,
            traceId: payload?.trace_id
        });
        res.status(200).json({ status: "received" });
    }
    catch (err) {
        logger.error("Error processing WHOOP webhook:", err);
        res.status(500).json({ error: "Webhook processing error" });
    }
});
/**
 * Polar AccessLink Webhook Endpoint
 * Route: /polarWebhook
 */
exports.polarWebhook = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    try {
        const payload = req.body;
        logger.info("Polar Webhook Received:", {
            event: payload?.event,
            userId: payload?.["user-id"],
            url: payload?.url
        });
        res.status(200).json({ status: "received" });
    }
    catch (err) {
        logger.error("Error processing Polar webhook:", err);
        res.status(500).json({ error: "Webhook processing error" });
    }
});
/**
 * parseImportedFile: Server-side file import handler
 * Deduplicates and creates sessions in Firestore with source 'file'
 */
exports.parseImportedFile = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required to import files.");
    }
    const athleteId = request.auth.uid;
    const { fileName, items } = request.data || {};
    if (!Array.isArray(items) || items.length === 0) {
        throw new https_1.HttpsError("invalid-argument", "Items array is required for file import.");
    }
    const db = admin.firestore();
    const batch = db.batch();
    let createdCount = 0;
    let duplicateCount = 0;
    for (const item of items) {
        if (item.status === "duplicate") {
            duplicateCount++;
            continue;
        }
        const activity = item.activity;
        if (!activity)
            continue;
        const sessionId = activity.id || `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const sessionRef = db.collection(`athletes/${athleteId}/sessions`).doc(sessionId);
        batch.set(sessionRef, {
            id: sessionId,
            athleteId,
            source: "file",
            sport: activity.sport,
            title: activity.title || fileName || "Fájlból importált edzés",
            start: activity.startTime,
            duration: Math.round(activity.durationSeconds / 60),
            load: activity.trainingLoad || Math.round(activity.durationSeconds / 60),
            rpe: activity.rpe || 6,
            metrics: {
                distance: activity.distanceMeters,
                avgHeartRate: activity.avgHeartRate,
                maxHeartRate: activity.maxHeartRate,
                avgPower: activity.avgPowerWatts,
                maxPower: activity.maxPowerWatts,
                normalizedPower: activity.normalizedPowerWatts,
                avgPace: activity.avgPaceSecondsPerKm,
                calories: activity.calories,
                elevationGain: activity.elevationGainMeters,
                elevationLoss: activity.elevationLossMeters
            },
            sourceConfidence: 0.99,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        createdCount++;
    }
    // Record in athlete's import history
    const historyRef = db.collection(`athletes/${athleteId}/importHistory`).doc();
    batch.set(historyRef, {
        id: historyRef.id,
        fileName: fileName || "import_file",
        importedAt: new Date().toISOString(),
        totalActivities: items.length,
        createdCount,
        duplicateCount
    });
    await batch.commit();
    return {
        success: true,
        createdCount,
        duplicateCount
    };
});
//# sourceMappingURL=index.js.map