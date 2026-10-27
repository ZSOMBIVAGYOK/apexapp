import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  setPersistence,
  browserLocalPersistence,
  User as FirebaseUser
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, firestore, sanitizeForFirestore } from "@shared/lib/firebase";
import { clearUserLocalData } from "@shared/lib/storage/userStorage";
import { UserProfile, UserRole } from "@shared/types";

// Ensure persistent sessions
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence).catch(() => {
    // Persistence setup error fallback
  });
}

/**
 * Creates default UserProfile for a new user
 */
export const createDefaultProfile = (
  user?: Partial<FirebaseUser> | null,
  customProps: Partial<UserProfile> = {}
): UserProfile => {
  const defaultDisplayName =
    user?.displayName || (user?.email ? user.email.split("@")[0] : null) || "Sportoló";

  return {
    uid: user?.uid || "",
    email: user?.email || null,
    displayName: defaultDisplayName,
    photoURL: user?.photoURL || null,
    locale: "hu",
    units: "metric",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Budapest",
    roles: (customProps.roles?.length ? customProps.roles : ["athlete"]) as UserRole[],
    role: customProps.role || "athlete",
    dataMode: customProps.dataMode || "hybrid",
    supportMode: customProps.supportMode || ["solo"],
    onboardingCompleted: false,
    consent: {
      healthData: {
        accepted: false,
        version: "1.0.0",
        timestamp: ""
      }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...customProps
  };
};

/**
 * Normalizes user profile data read from Firestore or cache, ensuring all required fields
 * exist and safely migrating existing accounts that have profile data but missing onboardingCompleted flag.
 */
export const normalizeUserProfile = (
  raw: any,
  fbUser?: Partial<FirebaseUser> | null,
  customProps: Partial<UserProfile> = {}
): UserProfile => {
  const effectiveUser = fbUser || {
    uid: raw?.uid || "",
    email: raw?.email || null,
    displayName: raw?.displayName || null,
    photoURL: raw?.photoURL || null
  };
  const base = createDefaultProfile(effectiveUser, customProps);
  if (!raw) return base;

  // Check if user already has meaningful profile answers even if onboardingCompleted is missing/false
  const hasMeaningfulData = Boolean(
    (Array.isArray(raw.sports) && raw.sports.length > 0) ||
    raw.sport ||
    raw.mainSport ||
    raw.heightCm ||
    raw.weightKg ||
    raw.birthDate ||
    raw.targetCompetition ||
    (raw.consent?.healthData?.accepted === true && raw.dataMode)
  );

  const onboardingCompleted = raw.onboardingCompleted === true || hasMeaningfulData;

  return {
    ...base,
    ...raw,
    uid: effectiveUser.uid,
    email: effectiveUser.email ?? raw.email ?? base.email,
    displayName: raw.displayName || effectiveUser.displayName || base.displayName,
    photoURL: effectiveUser.photoURL ?? raw.photoURL ?? base.photoURL,
    roles: (Array.isArray(raw.roles) && raw.roles.length > 0 ? raw.roles : base.roles) as UserRole[],
    role: raw.role || base.role,
    dataMode: raw.dataMode || base.dataMode,
    supportMode: Array.isArray(raw.supportMode) && raw.supportMode.length > 0 ? raw.supportMode : base.supportMode,
    onboardingCompleted,
    onboardingStep: raw.onboardingStep ?? (onboardingCompleted ? 7 : 1),
    consent: {
      healthData: {
        accepted: raw.consent?.healthData?.accepted ?? false,
        version: raw.consent?.healthData?.version ?? "1.0.0",
        timestamp: raw.consent?.healthData?.timestamp ?? ""
      }
    }
  };
};

/**
 * Fetch or initialize Firestore UserProfile with safe normalization
 */
export const fetchOrInitUserProfile = async (
  fbUser: FirebaseUser,
  customProps: Partial<UserProfile> = {}
): Promise<UserProfile> => {
  try {
    const userDocRef = doc(firestore, "users", fbUser.uid);
    const snap = await getDoc(userDocRef);

    if (snap.exists()) {
      const normalized = normalizeUserProfile(snap.data(), fbUser, customProps);

      // Auto-migrate in background if existing account had meaningful data but false/unset onboardingCompleted
      if (normalized.onboardingCompleted && snap.data()?.onboardingCompleted !== true) {
        setDoc(userDocRef, { onboardingCompleted: true, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {
          // Non-blocking migration
        });
      }

      return normalized;
    }

    // Initialize in Firestore if new user
    const initialProfile = createDefaultProfile(fbUser, customProps);
    const sanitized = sanitizeForFirestore(initialProfile);
    await setDoc(userDocRef, sanitized, { merge: true });
    return initialProfile;
  } catch (err) {
    // If offline or permission issue, fallback to normalized minimal profile
    return createDefaultProfile(fbUser, customProps);
  }
};

/**
 * Update profile in Firestore with sanitization and guaranteed error propagation
 */
export const saveUserProfileToFirestore = async (
  uid: string,
  updates: Partial<UserProfile>
): Promise<void> => {
  if (!uid) {
    throw new Error("Hiányzó felhasználói azonosító a mentéshez.");
  }

  const sanitized = sanitizeForFirestore({
    ...updates,
    updatedAt: new Date().toISOString()
  });

  const userDocRef = doc(firestore, "users", uid);
  await setDoc(userDocRef, sanitized, { merge: true });
};

/**
 * Email/password login
 */
export const loginWithEmail = async (email: string, pass: string) => {
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  const profile = await fetchOrInitUserProfile(cred.user);
  return { user: cred.user, profile };
};

/**
 * Email/password registration
 */
export const registerWithEmail = async (email: string, pass: string) => {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  const profile = await fetchOrInitUserProfile(cred.user);
  return { user: cred.user, profile };
};

/**
 * Google Sign-In with popup
 */
export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const cred = await signInWithPopup(auth, provider);
  const profile = await fetchOrInitUserProfile(cred.user);
  return { user: cred.user, profile };
};

/**
 * Apple Sign-In with popup
 */
export const loginWithApple = async () => {
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  const cred = await signInWithPopup(auth, provider);
  const profile = await fetchOrInitUserProfile(cred.user);
  return { user: cred.user, profile };
};

/**
 * Send email verification to current user
 */
export const triggerEmailVerification = async () => {
  if (!auth.currentUser) {
    throw new Error("No authenticated user");
  }
  await sendEmailVerification(auth.currentUser);
};

/**
 * Send password reset email
 */
export const triggerPasswordReset = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};

/**
 * Sign out
 */
export const signOutAuth = async () => {
  const currentUid = auth.currentUser?.uid;
  await firebaseSignOut(auth);
  clearUserLocalData(currentUid);
};

/**
 * Permanently delete user account via Cloud Function
 */
export const callDeleteUserData = async (): Promise<{ success: boolean; message: string }> => {
  const { functions } = await import("@shared/lib/firebase");
  const { httpsCallable } = await import("firebase/functions");
  const deleteFn = httpsCallable<void, { success: boolean; message: string }>(
    functions,
    "deleteUserData"
  );
  const result = await deleteFn();
  return result.data;
};

/**
 * Map Firebase Auth error codes to clean i18n keys
 */
export const getAuthErrorMessageKey = (errorCode: string): string => {
  switch (errorCode) {
    case "auth/invalid-email":
      return "auth.errors.invalidEmail";
    case "auth/user-disabled":
      return "auth.errors.userDisabled";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "auth.errors.invalidCredentials";
    case "auth/email-already-in-use":
      return "auth.errors.emailAlreadyInUse";
    case "auth/weak-password":
      return "auth.errors.weakPassword";
    case "auth/popup-closed-by-user":
      return "auth.errors.popupClosed";
    case "auth/popup-blocked":
      return "auth.errors.popupBlocked";
    case "auth/network-request-failed":
      return "auth.errors.networkError";
    case "auth/too-many-requests":
      return "auth.errors.tooManyRequests";
    case "auth/operation-not-allowed":
      return "auth.errors.operationNotAllowed";
    default:
      return "auth.errors.generic";
  }
};
