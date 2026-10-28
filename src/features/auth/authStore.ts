import { create } from "zustand";
import { User, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, Unsubscribe } from "firebase/firestore";
import { auth, firestore } from "@shared/lib/firebase";
import { UserProfile, UserRole } from "@shared/types";
import { useSyncStatusStore } from "@shared/lib/sync/syncStatusStore";
import {
  fetchOrInitUserProfile,
  saveUserProfileToFirestore,
  normalizeUserProfile,
  signOutAuth
} from "./authService";

interface AuthState {
  user: UserProfile | null;
  firebaseUser: User | null;
  isLoading: boolean;
  isProfileLoading: boolean;
  isDemoUser: boolean;
  setUserProfile: (profile: UserProfile | null) => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  setLoading: (loading: boolean) => void;
  loginDemo: (role?: "athlete" | "coach") => void;
  signOut: (force?: boolean) => Promise<{ success: boolean; blocked?: boolean; pendingCount?: number }>;
}

let activeProfileUnsubscribe: Unsubscribe | null = null;

const createDemoProfile = (role: UserRole = "athlete"): UserProfile => {
  const roles: UserRole[] = role === "coach" ? ["coach", "athlete"] : ["athlete"];
  return {
    uid: "demo-athlete-001",
    email: "olimpikon@apex.hu",
    displayName: "Kovács Zsombor (Olimpikon)",
    photoURL: null,
    locale: "hu",
    units: "metric",
    timezone: "Europe/Budapest",
    roles,
    role,
    dataMode: "hybrid",
    supportMode: ["solo", "coach"],
    onboardingCompleted: true,
    onboardingStep: 7,
    consent: {
      healthData: {
        accepted: true,
        version: "1.0.0",
        timestamp: new Date().toISOString()
      }
    },
    sports: ["Triatlon", "Úszás"],
    sport: "Triatlon / Úszás",
    level: "olympic",
    goals: "Párizs/LA felkészülés, terhelés-élettani csúcsforma",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};

const getInitialDemoState = () => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("apex_demo_user") === "true";
};

const isInitialDemo = getInitialDemoState();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: isInitialDemo ? createDemoProfile() : null,
  firebaseUser: null,
  isLoading: !isInitialDemo,
  isProfileLoading: false,
  isDemoUser: isInitialDemo,

  setUserProfile: (profile) => set({ user: profile }),

  updateProfile: async (updates) => {
    const current = get().user;
    if (!current) {
      throw new Error("Nincs bejelentkezett felhasználó a profil mentéséhez.");
    }

    const updatedProfile: UserProfile = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Optimistic local update
    set({ user: updatedProfile });

    if (!get().isDemoUser && current.uid) {
      useSyncStatusStore.getState().setSyncing();
      try {
        await saveUserProfileToFirestore(current.uid, updates);
        useSyncStatusStore.getState().setSaved();
      } catch (err: any) {
        useSyncStatusStore.getState().setError(
          err?.message || "Nem sikerült menteni a változtatásokat.",
          () => get().updateProfile(updates)
        );
        throw err;
      }
    }
  },

  setLoading: (isLoading) => set({ isLoading }),

  loginDemo: (role = "athlete") => {
    try {
      localStorage.setItem("apex_demo_user", "true");
    } catch {
      // Ignore storage errors
    }
    const demoProfile = createDemoProfile(role);

    set({
      user: demoProfile,
      firebaseUser: null,
      isLoading: false,
      isProfileLoading: false,
      isDemoUser: true
    });
  },

  signOut: async (force = false) => {
    try {
      localStorage.removeItem("apex_demo_user");
    } catch {
      // Ignore
    }
    try {
      const res = await signOutAuth(force);
      if (res.blocked) {
        return res;
      }
    } catch {
      // Ignore in demo mode or offline
    }

    if (activeProfileUnsubscribe) {
      activeProfileUnsubscribe();
      activeProfileUnsubscribe = null;
    }

    set({
      user: null,
      firebaseUser: null,
      isLoading: false,
      isProfileLoading: false,
      isDemoUser: false
    });

    return { success: true };
  }
}));

// Setup listener for Firebase Auth state changes
export const initAuthListener = () => {
  return onAuthStateChanged(auth, async (fbUser) => {
    const currentDemo = useAuthStore.getState().isDemoUser;
    if (currentDemo) {
      return;
    }

    if (activeProfileUnsubscribe) {
      activeProfileUnsubscribe();
      activeProfileUnsubscribe = null;
    }

    if (fbUser) {
      useAuthStore.setState({
        firebaseUser: fbUser,
        isLoading: false,
        isProfileLoading: true
      });

      try {
        // Initial fresh fetch or initialization
        const profile = await fetchOrInitUserProfile(fbUser);
        useAuthStore.setState({
          user: profile,
          isProfileLoading: false
        });

        // Attach realtime Firestore listener so multiple tabs/devices stay in sync
        const userDocRef = doc(firestore, "users", fbUser.uid);
        activeProfileUnsubscribe = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const remoteProfile = normalizeUserProfile(docSnap.data(), fbUser);
              useAuthStore.setState({
                user: remoteProfile,
                isProfileLoading: false
              });
            }
          },
          (err) => {
            // eslint-disable-next-line no-console
            console.warn("Firestore user sync notice:", err);
          }
        );
      } catch {
        // Safe fallback
        const fallback = normalizeUserProfile(null, fbUser);
        useAuthStore.setState({
          user: fallback,
          isProfileLoading: false
        });
      }
    } else {
      useAuthStore.setState({
        firebaseUser: null,
        user: null,
        isLoading: false,
        isProfileLoading: false
      });
    }
  });
};
