import { describe, it, expect } from "vitest";
import {
  createInitialOnboardingState,
  onboardingReducer,
  isStepSkippable,
  canAdvanceStep,
  onboardingDataToUserProfile,
  TOTAL_STEPS
} from "./onboardingMachine";

describe("Onboarding State Machine", () => {
  it("initializes with step 1 and valid defaults", () => {
    const state = createInitialOnboardingState();
    expect(state.currentStep).toBe(1);
    expect(state.completed).toBe(false);
    expect(state.data.roles).toContain("athlete");
    expect(state.data.consentAccepted).toBe(false);
    expect(state.data.consentVersion).toBe("1.0.0");
  });

  it("navigates forward and backward between steps", () => {
    let state = createInitialOnboardingState();

    // From step 1 to step 2
    state = onboardingReducer(state, { type: "NEXT_STEP" });
    expect(state.currentStep).toBe(2);

    // From step 2 to step 3
    state = onboardingReducer(state, { type: "NEXT_STEP" });
    expect(state.currentStep).toBe(3);

    // Back to step 2
    state = onboardingReducer(state, { type: "PREV_STEP" });
    expect(state.currentStep).toBe(2);

    // Back to step 1
    state = onboardingReducer(state, { type: "PREV_STEP" });
    expect(state.currentStep).toBe(1);

    // Cannot go below step 1
    state = onboardingReducer(state, { type: "PREV_STEP" });
    expect(state.currentStep).toBe(1);
  });

  it("updates data correctly across steps", () => {
    let state = createInitialOnboardingState();

    // Update role
    state = onboardingReducer(state, {
      type: "UPDATE_DATA",
      data: {
        roles: ["coach", "athlete"],
        specialties: ["strength_coach"]
      }
    });
    expect(state.data.roles).toEqual(["coach", "athlete"]);
    expect(state.data.specialties).toContain("strength_coach");

    // Advance to step 2 and update athlete profile
    state = onboardingReducer(state, { type: "NEXT_STEP" });
    state = onboardingReducer(state, {
      type: "UPDATE_DATA",
      data: {
        mainSports: ["Úszás", "Vízilabda"],
        level: "olympic",
        heightCm: 194,
        weightKg: 88
      }
    });
    expect(state.data.mainSports).toEqual(["Úszás", "Vízilabda"]);
    expect(state.data.level).toBe("olympic");
    expect(state.data.heightCm).toBe(194);
  });

  it("blocks advancement on step 1 if roles are empty", () => {
    let state = createInitialOnboardingState();
    state = onboardingReducer(state, {
      type: "UPDATE_DATA",
      data: { roles: [] }
    });
    expect(canAdvanceStep(state)).toBe(false);

    state = onboardingReducer(state, { type: "NEXT_STEP" });
    expect(state.currentStep).toBe(1);
  });

  it("enforces skippable vs non-skippable steps", () => {
    expect(isStepSkippable(1)).toBe(false); // Role cannot be skipped
    expect(isStepSkippable(2)).toBe(true);  // Athlete profile can be skipped
    expect(isStepSkippable(3)).toBe(false); // Data source cannot be skipped
    expect(isStepSkippable(4)).toBe(true);  // Support can be skipped
    expect(isStepSkippable(5)).toBe(true);  // Baseline can be skipped
    expect(isStepSkippable(6)).toBe(true);  // Nutrition can be skipped
    expect(isStepSkippable(7)).toBe(false); // Consent CANNOT be skipped

    let state = createInitialOnboardingState();
    // Attempt skip on step 1
    state = onboardingReducer(state, { type: "SKIP_STEP" });
    expect(state.currentStep).toBe(1); // Still on step 1

    // Move to step 2 and skip
    state = onboardingReducer(state, { type: "NEXT_STEP" });
    expect(state.currentStep).toBe(2);
    state = onboardingReducer(state, { type: "SKIP_STEP" });
    expect(state.currentStep).toBe(3);
  });

  it("strictly enforces GDPR Art. 9 consent on step 7", () => {
    let state = createInitialOnboardingState();

    // Fast-forward to step 7
    for (let i = 1; i < TOTAL_STEPS; i++) {
      state = onboardingReducer(state, { type: "NEXT_STEP" });
    }
    expect(state.currentStep).toBe(7);
    expect(state.completed).toBe(false);

    // Attempting next without consent fails
    expect(canAdvanceStep(state)).toBe(false);
    state = onboardingReducer(state, { type: "NEXT_STEP" });
    expect(state.completed).toBe(false);

    // Attempting skip on step 7 fails
    state = onboardingReducer(state, { type: "SKIP_STEP" });
    expect(state.completed).toBe(false);
    expect(state.currentStep).toBe(7);

    // Accept consent
    state = onboardingReducer(state, {
      type: "UPDATE_DATA",
      data: { consentAccepted: true }
    });
    expect(canAdvanceStep(state)).toBe(true);

    // Finish onboarding
    state = onboardingReducer(state, { type: "NEXT_STEP" });
    expect(state.completed).toBe(true);
    expect(state.data.consentTimestamp).toBeDefined();
  });

  it("converts completed state into UserProfile properly", () => {
    const state = createInitialOnboardingState({
      roles: ["athlete", "coach"],
      mainSports: ["Triatlon"],
      level: "national_team",
      dataMode: "device",
      supportMode: ["solo", "coach"],
      sleepHoursBaseline: 8,
      trainingDaysPerWeek: 6,
      plateBasedViewOnly: true,
      consentAccepted: true
    });

    const profile = onboardingDataToUserProfile(state.data);
    expect(profile.roles).toEqual(["athlete", "coach"]);
    expect(profile.role).toBe("athlete");
    expect(profile.level).toBe("national_team");
    expect(profile.dataMode).toBe("device");
    expect(profile.supportMode).toEqual(["solo", "coach"]);
    expect(profile.sleepHoursBaseline).toBe(8);
    expect(profile.plateBasedViewOnly).toBe(true);
    expect(profile.consent?.healthData.accepted).toBe(true);
    expect(profile.consent?.healthData.version).toBe("1.0.0");
    expect(profile.onboardingCompleted).toBe(true);
  });

  it("restores draft state properly via LOAD_DRAFT", () => {
    const draft = createInitialOnboardingState({
      roles: ["specialist"],
      specialties: ["physiotherapist"]
    });
    draft.currentStep = 4;

    const restored = onboardingReducer(createInitialOnboardingState(), {
      type: "LOAD_DRAFT",
      state: draft
    });

    expect(restored.currentStep).toBe(4);
    expect(restored.data.roles).toContain("specialist");
    expect(restored.data.specialties).toContain("physiotherapist");
  });
});
