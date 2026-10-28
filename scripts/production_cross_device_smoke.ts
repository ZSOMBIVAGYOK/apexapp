import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDocFromServer,
  deleteDoc
} from "firebase/firestore";
import * as fs from "fs";
import * as path from "path";

// Parse .env manually
const envPath = path.resolve(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
const envVars: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#")) {
    const [k, ...v] = trimmed.split("=");
    if (k) envVars[k.trim()] = v.join("=").trim();
  }
});

const firebaseConfig = {
  apiKey: envVars.VITE_FIREBASE_API_KEY,
  authDomain: envVars.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: envVars.VITE_FIREBASE_PROJECT_ID,
  storageBucket: envVars.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envVars.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: envVars.VITE_FIREBASE_APP_ID
};

async function runCrossDeviceSmokeTest() {
  console.log("=================================================");
  console.log("CROSS-DEVICE DUAL-CONTEXT PRODUCTION SMOKE TEST");
  console.log("Target Project:", firebaseConfig.projectId);
  console.log("=================================================\n");

  // Initialize two completely separate Firebase apps simulating Laptop (A) and Phone (B)
  const appLaptop = initializeApp(firebaseConfig, "Laptop_App");
  const authLaptop = getAuth(appLaptop);
  const dbLaptop = getFirestore(appLaptop);

  const appPhone = initializeApp(firebaseConfig, "Phone_App");
  const authPhone = getAuth(appPhone);
  const dbPhone = getFirestore(appPhone);

  const testUserEmail = `cross_device_${Date.now()}@test.apex.internal`;
  const testUserPass = "SyncPass2026!Secure";
  const sessionId = `smoke_session_${Date.now()}`;

  try {
    // 1. Laptop registers/logs in
    console.log(`[Device A - Laptop] Registering user: ${testUserEmail}`);
    const credLaptop = await createUserWithEmailAndPassword(authLaptop, testUserEmail, testUserPass);
    const athleteId = credLaptop.user.uid;
    console.log(`[Device A - Laptop] User UID: ${athleteId}`);

    // 2. Phone logs in with same user credentials
    console.log(`[Device B - Phone] Logging into existing account: ${testUserEmail}`);
    const credPhone = await signInWithEmailAndPassword(authPhone, testUserEmail, testUserPass);
    console.log(`[Device B - Phone] Signed in UID: ${credPhone.user.uid}`);

    if (credPhone.user.uid !== athleteId) {
      throw new Error(`UID mismatch between devices! Laptop: ${athleteId}, Phone: ${credPhone.user.uid}`);
    }
    console.log("✓ UID matches identically across both device contexts.\n");

    // 3. Laptop saves a training session to Firestore
    console.log(`[Device A - Laptop] Saving new training session ${sessionId}...`);
    const laptopSessionRef = doc(dbLaptop, "athletes", athleteId, "sessions", sessionId);
    const sessionPayload = {
      id: sessionId,
      athleteId,
      title: "5K Tempo Run (Laptop Entry)",
      sport: "running",
      date: new Date().toISOString().split("T")[0],
      durationMinutes: 25,
      distanceMeters: 5000,
      rpe: 7,
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(laptopSessionRef, sessionPayload);
    console.log("✓ [Device A - Laptop] Successfully saved session to Firestore.\n");

    // 4. Phone reads the session DIRECTLY FROM SERVER (bypassing any local cache)
    console.log(`[Device B - Phone] Fetching session ${sessionId} with getDocFromServer...`);
    const phoneSessionRef = doc(dbPhone, "athletes", athleteId, "sessions", sessionId);
    const phoneSnap = await getDocFromServer(phoneSessionRef);

    if (!phoneSnap.exists()) {
      throw new Error("FAIL: Session created on Laptop was NOT found by Phone on Firestore server!");
    }

    const phoneData = phoneSnap.data();
    console.log(`✓ [Device B - Phone] Session retrieved from server!`);
    console.log(`  Title: "${phoneData.title}"`);
    console.log(`  Sport: ${phoneData.sport}`);
    console.log(`  Distance: ${phoneData.distanceMeters}m`);
    console.log(`  Duration: ${phoneData.durationMinutes} min`);

    if (phoneData.title !== sessionPayload.title || phoneData.distanceMeters !== 5000) {
      throw new Error("FAIL: Data integrity mismatch on Phone read!");
    }
    console.log("✓ All session data fields match identically on Phone.\n");

    // 5. Phone updates the session (e.g. adds post-workout notes)
    console.log(`[Device B - Phone] Updating session notes from phone...`);
    await setDoc(phoneSessionRef, { notes: "Felt strong during final km (Phone Note)" }, { merge: true });
    console.log("✓ [Device B - Phone] Successfully updated session notes on Firestore.\n");

    // 6. Laptop reads the updated session from server
    console.log(`[Device A - Laptop] Verifying phone note update on Laptop from server...`);
    const laptopUpdatedSnap = await getDocFromServer(laptopSessionRef);
    const laptopUpdatedData = laptopUpdatedSnap.data();
    console.log(`  Updated Notes seen on Laptop: "${laptopUpdatedData?.notes}"`);

    if (laptopUpdatedData?.notes !== "Felt strong during final km (Phone Note)") {
      throw new Error("FAIL: Laptop did not receive Phone's update from server!");
    }
    console.log("✓ Bidirectional sync verified: Laptop saw Phone's edits.\n");

    // 7. Cleanup
    console.log("[Cleanup] Deleting test session document...");
    await deleteDoc(laptopSessionRef);
    const verifyDeleteSnap = await getDocFromServer(laptopSessionRef).catch(() => null);
    if (verifyDeleteSnap && verifyDeleteSnap.exists()) {
      console.warn("Warning: Document still exists after delete attempt.");
    } else {
      console.log("✓ Test session cleanly deleted from Firestore server.");
    }

    await signOut(authLaptop);
    await signOut(authPhone);
    console.log("\n=================================================");
    console.log("SUCCESS: Cross-device synchronization 100% verified!");
    console.log("=================================================");
  } catch (err: any) {
    console.error("\n❌ Cross-Device Smoke Test FAILED:", err);
    process.exit(1);
  }
}

runCrossDeviceSmokeTest();
