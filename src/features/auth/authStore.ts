import { create } from "zustand";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "@shared/lib/firebase";
import { UserProfile, UserRole } from "@shared/types";
import {
  fetchOrInitUserProfile,
  saveUserProfileToFirestore,
  signOutAuth
} from "./authService";

interface AuthState {
  user: UserProfile | null;
  firebaseUser: User | null;
  isLoading: boolean;
  isDemoUser: boolean;
  setUserProfile: (profile: UserProfile | null) => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  setLoading: (loading: boolean) => void;
  loginDemo: (role?: "athlete" | "coach") => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  firebaseUser: null,
  isLoading: true,
  isDemoUser: false,

  setUserProfile: (profile) => set({ user: profile }),

  updateProfile: async (updates) => {
    const current = get().user;
    if (!current) return;

    const updatedProfile: UserProfile = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    set({ user: updatedProfile });

    if (!get().isDemoUser && current.uid) {
      await saveUserProfileToFirestore(current.uid, updates);
    }
  },

  setLoading: (isLoading) => set({ isLoading }),

  loginDemo: (role = "athlete") => {
    const roles: UserRole[] = role === "coach" ? ["coach", "athlete"] : ["athlete"];
    const demoProfile: UserProfile = {
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

    set({
      user: demoProfile,
      firebaseUser: null,
      isLoading: false,
      isDemoUser: true
    });
  },

  signOut: async () => {
    try {
      await signOutAuth();
    } catch {
      // Ignore in demo mode or offline
    }
    set({
      user: null,
      firebaseUser: null,
      isLoading: false,
      isDemoUser: false
    });
  }
}));

// Setup listener for Firebase Auth state changes
export const initAuthListener = () => {
  return onAuthStateChanged(auth, async (fbUser) => {
    const currentDemo = useAuthStore.getState().isDemoUser;
    if (currentDemo) {
      // Preserve demo session if active
      return;
    }

    if (fbUser) {
      useAuthStore.setState({ firebaseUser: fbUser, isLoading: true });
      try {
        const profile = await fetchOrInitUserProfile(fbUser);
        useAuthStore.setState({
          user: profile,
          isLoading: false
        });
      } catch {
        // Fallback minimal profile
        useAuthStore.setState({
          user: {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName || fbUser.email?.split("@")[0] || "Sportoló",
            photoURL: fbUser.photoURL || null,
            locale: "hu",
            units: "metric",
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Budapest",
            roles: ["athlete"],
            role: "athlete",
            dataMode: "hybrid",
            supportMode: ["solo"],
            onboardingCompleted: false,
            consent: {
              healthData: {
                accepted: false,
                version: "1.0.0",
                timestamp: ""
              }
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          isLoading: false
        });
      }
    } else {
      useAuthStore.setState({
        firebaseUser: null,
        user: null,
        isLoading: false
      });
    }
  });
};
