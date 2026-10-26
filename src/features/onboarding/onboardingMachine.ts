import {
  AthleteLevel,
  DataMode,
  NutritionGoal,
  SpecialistDiscipline,
  SupportMode,
  UserProfile,
  UserRole
} from "@shared/types";

export const CONSENT_VERSION = "1.0.0";
export const TOTAL_STEPS = 7;

export interface OnboardingData {
  // Step 1: Role
  roles: UserRole[];
  specialties: SpecialistDiscipline[];

  // Step 2: Athlete profile
  mainSports: string[];
  level: AthleteLevel;
  birthDate?: string;
  sex?: "male" | "female" | "other" | "prefer_not_to_say";
  heightCm?: number;
  weightKg?: number;
  goals?: string;
  targetCompetition?: string;
  targetCompetitionDate?: string;

  // Step 3: Data source
  dataMode: DataMode;

  // Step 4: Support
  supportMode: SupportMode[];
  supportInviteEmail?: string;
  supportInviteCode?: string;

  // Step 5: Baseline
  sleepHoursBaseline?: number;
  trainingDaysPerWeek?: number;
  restingHeartRateBaseline?: number;
  currentInjuries?: string;

  // Step 6: Nutrition basics
  dietaryPreferences: string[];
  allergiesIntolerances: string[];
  nutritionGoal: NutritionGoal;
  plateBasedViewOnly: boolean;

  // Step 7: Consent (Mandatory GDPR Art. 9)
  consentAccepted: boolean;
  consentVersion: string;
  consentTimestamp?: string;
}

export interface OnboardingState {
  currentStep: number;
  data: OnboardingData;
  completed: boolean;
}

export type OnboardingAction =
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "GO_TO_STEP"; step: number }
  | { type: "UPDATE_DATA"; data: Partial<OnboardingData> }
  | { type: "SKIP_STEP" }
  | { type: "RESET" }
  | { type: "LOAD_DRAFT"; state: OnboardingState };

export const defaultOnboardingData: OnboardingData = {
  roles: ["athlete"],
  specialties: [],
  mainSports: ["Triatlon"],
  level: "national",
  dataMode: "hybrid",
  supportMode: ["solo"],
  dietaryPreferences: [],
  allergiesIntolerances: [],
  nutritionGoal: "performance",
  plateBasedViewOnly: false,
  consentAccepted: false,
  consentVersion: CONSENT_VERSION
};

export const createInitialOnboardingState = (
  initial?: Partial<OnboardingData>
): OnboardingState => ({
  currentStep: 1,
  data: {
    ...defaultOnboardingData,
    ...initial
  },
  completed: false
});

/**
 * Checks if a particular step can be skipped.
 * Step 1 (Role), Step 3 (Data source), and Step 7 (Consent) cannot be skipped.
 */
export const isStepSkippable = (step: number): boolean => {
  return step === 2 || step === 4 || step === 5 || step === 6;
};

/**
 * Validates whether the user can advance from the current step.
 */
export const canAdvanceStep = (state: OnboardingState): boolean => {
  const { currentStep, data } = state;
  switch (currentStep) {
    case 1:
      return data.roles.length > 0;
    case 2:
      return true; // Skippable or valid
    case 3:
      return Boolean(data.dataMode);
    case 4:
      return data.supportMode.length > 0;
    case 5:
      return true; // Skippable or valid
    case 6:
      return true; // Skippable or valid
    case 7:
      return data.consentAccepted === true;
    default:
      return false;
  }
};

/**
 * Pure reducer for the Onboarding State Machine
 */
export const onboardingReducer = (
  state: OnboardingState,
  action: OnboardingAction
): OnboardingState => {
  switch (action.type) {
    case "UPDATE_DATA": {
      const updatedData = { ...state.data, ...action.data };
      return {
        ...state,
        data: updatedData
      };
    }

    case "NEXT_STEP": {
      if (!canAdvanceStep(state)) {
        return state;
      }
      if (state.currentStep >= TOTAL_STEPS) {
        if (state.data.consentAccepted) {
          return {
            ...state,
            completed: true,
            data: {
              ...state.data,
              consentTimestamp: state.data.consentTimestamp || new Date().toISOString()
            }
          };
        }
        return state;
      }
      return {
        ...state,
        currentStep: state.currentStep + 1
      };
    }

    case "PREV_STEP": {
      if (state.currentStep <= 1) {
        return state;
      }
      return {
        ...state,
        currentStep: state.currentStep - 1
      };
    }

    case "GO_TO_STEP": {
      if (action.step < 1 || action.step > TOTAL_STEPS) {
        return state;
      }
      // Cannot jump past current step unless current is valid
      if (action.step > state.currentStep && !canAdvanceStep(state)) {
        return state;
      }
      return {
        ...state,
        currentStep: action.step
      };
    }

    case "SKIP_STEP": {
      if (!isStepSkippable(state.currentStep)) {
        return state;
      }
      if (state.currentStep < TOTAL_STEPS) {
        return {
          ...state,
          currentStep: state.currentStep + 1
        };
      }
      return state;
    }

    case "RESET": {
      return createInitialOnboardingState();
    }

    case "LOAD_DRAFT": {
      return action.state;
    }

    default:
      return state;
  }
};

/**
 * Converts collected onboarding data to a partial UserProfile for persistence
 */
export const onboardingDataToUserProfile = (
  data: OnboardingData
): Partial<UserProfile> => {
  const primaryRole = data.roles[0] || "athlete";
  const primarySport = data.mainSports[0] || "Egyéb sport";

  return {
    roles: data.roles,
    role: primaryRole,
    specialties: data.specialties,
    discipline: data.specialties[0],
    sports: data.mainSports,
    sport: primarySport,
    level: data.level,
    birthDate: data.birthDate,
    sex: data.sex,
    heightCm: data.heightCm,
    weightKg: data.weightKg,
    goals: data.goals,
    targetCompetition: data.targetCompetition,
    targetCompetitionDate: data.targetCompetitionDate,
    dataMode: data.dataMode,
    supportMode: data.supportMode,
    supportInviteEmail: data.supportInviteEmail,
    supportInviteCode: data.supportInviteCode,
    sleepHoursBaseline: data.sleepHoursBaseline,
    trainingDaysPerWeek: data.trainingDaysPerWeek,
    restingHeartRateBaseline: data.restingHeartRateBaseline,
    currentInjuries: data.currentInjuries,
    dietaryPreferences: data.dietaryPreferences,
    allergiesIntolerances: data.allergiesIntolerances,
    nutritionGoal: data.nutritionGoal,
    plateBasedViewOnly: data.plateBasedViewOnly,
    consent: {
      healthData: {
        accepted: data.consentAccepted,
        version: data.consentVersion,
        timestamp: data.consentTimestamp || new Date().toISOString()
      }
    },
    onboardingCompleted: true
  };
};

// Local storage draft persistence
const DRAFT_PREFIX = "apex_onboarding_draft_";

export const saveOnboardingDraft = (uid: string, state: OnboardingState): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${DRAFT_PREFIX}${uid}`, JSON.stringify(state));
  } catch {
    // Storage quota or blocked
  }
};

export const loadOnboardingDraft = (uid: string): OnboardingState | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${DRAFT_PREFIX}${uid}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OnboardingState;
    if (parsed && typeof parsed.currentStep === "number" && parsed.data) {
      return parsed;
    }
  } catch {
    // Parsing error fallback
  }
  return null;
};

export const clearOnboardingDraft = (uid: string): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`${DRAFT_PREFIX}${uid}`);
  } catch {
    // Fallback
  }
};
