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
  getDoc,
  deleteDoc,
  getDocFromServer
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

async function main() {
  console.log("Testing Production Firebase Connection...");
  console.log("Project ID:", firebaseConfig.projectId);
  console.log("Auth Domain:", firebaseConfig.authDomain);

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const testEmail = `diag_test_${Date.now()}@example.com`;
  const testPassword = "Password123!Safe";

  try {
    console.log("\n1. Testing Auth: Creating test user:", testEmail);
    const cred = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
    const uid = cred.user.uid;
    console.log("✓ User created successfully. UID:", uid);

    console.log("\n2. Testing Firestore Write to athletes/{uid}/sessions/test-session-1...");
    const sessionRef = doc(db, "athletes", uid, "sessions", "test-session-1");
    await setDoc(sessionRef, {
      sessionId: "test-session-1",
      athleteId: uid,
      title: "Diagnostic Test Session",
      sport: "running",
      date: "2026-10-28",
      durationMinutes: 30,
      rpe: 5,
      createdAt: new Date().toISOString()
    });
    console.log("✓ Firestore write SUCCEEDED!");

    console.log("\n3. Testing Firestore Read from SERVER (bypassing cache)...");
    const serverSnap = await getDocFromServer(sessionRef);
    if (serverSnap.exists()) {
      console.log("✓ Read from server SUCCEEDED! Data:", serverSnap.data().title);
    } else {
      console.error("✗ Document does not exist on server!");
    }

    console.log("\n4. Testing Firestore Cleanup...");
    await deleteDoc(sessionRef);
    console.log("✓ Cleanup SUCCEEDED!");

    console.log("\n5. Testing Sign Out...");
    await signOut(auth);
    console.log("✓ Sign out SUCCEEDED!");

    console.log("\n>>> ALL PRODUCTION FIRESTORE CHECKS PASSED! <<<");
  } catch (err: any) {
    console.error("\n❌ ERROR DETECTED:", err.code, err.message);
    if (err.stack) console.error(err.stack);
  }
}

main();
