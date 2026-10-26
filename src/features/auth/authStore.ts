import { create } from "zustand";
import { User, onAuthStateChanged, signOut as fbSignOut } from "firebase/auth";
import { auth } from "@shared/lib/firebase";
import { UserProfile } from "@shared/types";

interface AuthState {
  user: UserProfile | null;
  firebaseUser: User | null;
  isLoading: boolean;
  isDemoUser: boolean;
  setUserProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  loginDemo: (role?: "athlete" | "coach") => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  firebaseUser: null,
  isLoading: true,
  isDemoUser: false,

  setUserProfile: (profile) => set({ user: profile }),
  setLoading: (isLoading) => set({ isLoading }),

  loginDemo: (role = "athlete") => {
    const demoProfile: UserProfile = {
      uid: "demo-athlete-001",
      email: "olimpikon@apex.hu",
      displayName: "Kovács Zsombor (Olimpiai kerettag)",
      role,
      sport: "Triatlon / Úszás",
      level: "olympic",
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
      await fbSignOut(auth);
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
  return onAuthStateChanged(auth, (user) => {
    const currentDemo = useAuthStore.getState().isDemoUser;
    if (currentDemo) {
      // Preserve demo session if active
      return;
    }

    if (user) {
      useAuthStore.setState({
        firebaseUser: user,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split("@")[0] || "Sportoló",
          role: "athlete",
          level: "national",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        isLoading: false
      });
    } else {
      useAuthStore.setState({
        firebaseUser: null,
        user: null,
        isLoading: false
      });
    }
  });
};
