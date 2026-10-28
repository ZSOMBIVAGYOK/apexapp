import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  connectFirestoreEmulator
} from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase App (singleton pattern)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Use initializeFirestore with experimentalAutoDetectLongPolling for reliable iOS/Safari and mobile network sync
function getOrInitFirestore() {
  try {
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true
    });
  } catch {
    return getFirestore(app);
  }
}

export const firestore = getOrInitFirestore();
export const db = firestore;
export const storage = getStorage(app);
export const functions = getFunctions(app);
export { sanitizeForFirestore } from "./sanitize";

// Connect emulators in local testing if flagged
if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true") {
  try {
    connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    connectFirestoreEmulator(firestore, "localhost", 8080);
    connectStorageEmulator(storage, "localhost", 9199);
    connectFunctionsEmulator(functions, "localhost", 5001);
    // eslint-disable-next-line no-console
    console.info("⚡ Connected to Firebase Local Emulator Suite");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("Firebase emulator connection notice:", err);
  }
}

// Cloud Messaging instance if supported (browser dependent)
export const getCloudMessaging = async () => {
  const supported = await isSupported();
  if (supported) {
    return getMessaging(app);
  }
  return null;
};

// App Check status tracking
export let appCheckStatus: {
  configured: boolean;
  active: boolean;
  error: string | null;
} = {
  configured: Boolean(import.meta.env.VITE_RECAPTCHA_ENTERPRISE_KEY),
  active: false,
  error: null
};

// App Check initialization (reCAPTCHA Enterprise / Debug Token)
export const initAppCheck = () => {
  if (typeof window === "undefined") return null;
  const siteKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_KEY;
  if (!siteKey) {
    appCheckStatus = { configured: false, active: false, error: null };
    return null;
  }
  try {
    import("firebase/app-check").then(({ initializeAppCheck, ReCaptchaEnterpriseProvider }) => {
      try {
        initializeAppCheck(app, {
          provider: new ReCaptchaEnterpriseProvider(siteKey),
          isTokenAutoRefreshEnabled: true
        });
        appCheckStatus = { configured: true, active: true, error: null };
      } catch (innerErr: any) {
        appCheckStatus = { configured: true, active: false, error: innerErr?.message || "Inicializálási hiba" };
      }
    }).catch((err) => {
      appCheckStatus = { configured: true, active: false, error: err?.message || "Modul betöltési hiba" };
    });
  } catch (err: any) {
    appCheckStatus = { configured: true, active: false, error: err?.message || "App Check hiba" };
    // eslint-disable-next-line no-console
    console.warn("App Check initialization error:", err);
  }
  return null;
};
