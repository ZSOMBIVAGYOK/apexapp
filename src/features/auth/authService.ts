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
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, firestore } from "@shared/lib/firebase";
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
  user: FirebaseUser,
  customProps: Partial<UserProfile> = {}
): UserProfile => {
  const defaultDisplayName =
    user.displayName || (user.email ? user.email.split("@")[0] : null) || "Sportoló";

  return {
    uid: user.uid,
    email: user.email,
    displayName: defaultDisplayName,
    photoURL: user.photoURL || null,
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
 * Fetch or initialize Firestore UserProfile
 */
export const fetchOrInitUserProfile = async (
  fbUser: FirebaseUser,
  customProps: Partial<UserProfile> = {}
): Promise<UserProfile> => {
  try {
    const userDocRef = doc(firestore, "users", fbUser.uid);
    const snap = await getDoc(userDocRef);

    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      return {
        ...data,
        uid: fbUser.uid,
        email: fbUser.email ?? data.email,
        photoURL: fbUser.photoURL ?? data.photoURL
      };
    }

    // Initialize in Firestore if new
    const initialProfile = createDefaultProfile(fbUser, customProps);
    await setDoc(userDocRef, initialProfile, { merge: true });
    return initialProfile;
  } catch (err) {
    // If offline or permission issue, fallback to minimal local profile
    return createDefaultProfile(fbUser, customProps);
  }
};

/**
 * Update profile in Firestore
 */
export const saveUserProfileToFirestore = async (
  uid: string,
  updates: Partial<UserProfile>
): Promise<void> => {
  try {
    const userDocRef = doc(firestore, "users", uid);
    await updateDoc(userDocRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    // Fallback: If document didn't exist yet, try set with merge
    try {
      const userDocRef = doc(firestore, "users", uid);
      await setDoc(
        userDocRef,
        {
          ...updates,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    } catch {
      // Allow optimistic client updates if offline
    }
  }
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
  await firebaseSignOut(auth);
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
