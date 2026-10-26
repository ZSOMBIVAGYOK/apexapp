import React, { useReducer, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@features/auth/authStore";
import {
  onboardingReducer,
  createInitialOnboardingState,
  isStepSkippable,
  canAdvanceStep,
  saveOnboardingDraft,
  loadOnboardingDraft,
  clearOnboardingDraft,
  onboardingDataToUserProfile,
  CONSENT_VERSION,
  TOTAL_STEPS
} from "@features/onboarding/onboardingMachine";
import {
  AthleteLevel,
  NutritionGoal,
  SpecialistDiscipline,
  SupportMode,
  UserRole
} from "@shared/types";
import {
  Card,
  Button,
  Input,
  NumberInput,
  Slider,
  Stepper,
  SegmentedControl,
  Toggle,
  Chip,
  Badge,
  showToast
} from "@shared/ui";
import {
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  SkipForward,
  User,
  Users,
  Stethoscope,
  Watch,
  FileEdit,
  Layers,
  ExternalLink,
  Sparkles,
  CheckCircle2
} from "lucide-react";

const SUGGESTED_SPORTS = [
  "Triatlon",
  "Úszás",
  "Kajak-Kenu",
  "Atlétika",
  "Országúti Kerékpár",
  "Erőemelés / Crossfit",
  "Labdarúgás",
  "Kézilabda",
  "Vízilabda",
  "Evezés"
];

const DIETARY_TAGS = [
  "Mindenevő",
  "Magas fehérjetartalmú",
  "Mediterrán",
  "Vegetáriánus",
  "Vegán",
  "Ketogén",
  "Alacsony FODMAP"
];

const ALLERGY_TAGS = [
  "Nincs ismert allergia",
  "Gluténérzékeny",
  "Laktózérzékeny",
  "Tejfehérje (Kazein)",
  "Diófélék",
  "Tojás",
  "Szója",
  "Tenger gyümölcsei"
];

export const OnboardingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, updateProfile } = useAuthStore();

  const [state, dispatch] = useReducer(
    onboardingReducer,
    createInitialOnboardingState({
      mainSports: user?.sport ? [user.sport] : ["Triatlon"]
    })
  );

  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  // Resume draft from localStorage if present
  useEffect(() => {
    if (user?.uid && !hasLoadedDraft) {
      const draft = loadOnboardingDraft(user.uid);
      if (draft) {
        dispatch({ type: "LOAD_DRAFT", state: draft });
        showToast({
          title: t("common.appName"),
          message: t("onboarding.resumedDraft"),
          type: "info"
        });
      }
      setHasLoadedDraft(true);
    }
  }, [user?.uid, hasLoadedDraft, t]);

  // Auto-save draft on changes
  useEffect(() => {
    if (user?.uid && !state.completed) {
      saveOnboardingDraft(user.uid, state);
    }
  }, [state, user?.uid]);

  const { currentStep, data } = state;
  const canProceed = canAdvanceStep(state);
  const skippable = isStepSkippable(currentStep);

  const handleNext = async () => {
    if (currentStep < TOTAL_STEPS) {
      dispatch({ type: "NEXT_STEP" });
    } else {
      // Step 7: Complete onboarding
      if (!data.consentAccepted) return;
      setIsFinishing(true);
      try {
        const profileUpdates = onboardingDataToUserProfile(data);
        await updateProfile(profileUpdates);
        if (user?.uid) {
          clearOnboardingDraft(user.uid);
        }
        showToast({
          title: "Sikeres beállítás!",
          message: "A sportolói profilod készen áll a felkészülésre.",
          type: "success"
        });
        navigate("/");
      } catch (err: unknown) {
        showToast({
          title: t("common.error"),
          message: "Nem sikerült elmenteni a profilt. Kérjük próbáld újra.",
          type: "error"
        });
      } finally {
        setIsFinishing(false);
      }
    }
  };

  const handleBack = () => {
    dispatch({ type: "PREV_STEP" });
  };

  const handleSkip = () => {
    dispatch({ type: "SKIP_STEP" });
  };

  // Helper toggle functions
  const toggleRole = (r: UserRole) => {
    const roles = data.roles.includes(r)
      ? data.roles.length > 1
        ? data.roles.filter((x) => x !== r)
        : data.roles
      : [...data.roles, r];
    dispatch({ type: "UPDATE_DATA", data: { roles } });
  };

  const toggleSpecialty = (disc: SpecialistDiscipline) => {
    const specialties = data.specialties.includes(disc)
      ? data.specialties.filter((x) => x !== disc)
      : [...data.specialties, disc];
    dispatch({ type: "UPDATE_DATA", data: { specialties } });
  };

  const toggleSport = (sport: string) => {
    const mainSports = data.mainSports.includes(sport)
      ? data.mainSports.length > 1
        ? data.mainSports.filter((s) => s !== sport)
        : data.mainSports
      : [...data.mainSports, sport];
    dispatch({ type: "UPDATE_DATA", data: { mainSports } });
  };

  const toggleSupportMode = (mode: SupportMode) => {
    const supportMode = data.supportMode.includes(mode)
      ? data.supportMode.length > 1
        ? data.supportMode.filter((m) => m !== mode)
        : data.supportMode
      : [...data.supportMode, mode];
    dispatch({ type: "UPDATE_DATA", data: { supportMode } });
  };

  const toggleDiet = (item: string) => {
    const dietaryPreferences = data.dietaryPreferences.includes(item)
      ? data.dietaryPreferences.filter((x) => x !== item)
      : [...data.dietaryPreferences, item];
    dispatch({ type: "UPDATE_DATA", data: { dietaryPreferences } });
  };

  const toggleAllergy = (item: string) => {
    const allergiesIntolerances = data.allergiesIntolerances.includes(item)
      ? data.allergiesIntolerances.filter((x) => x !== item)
      : [...data.allergiesIntolerances, item];
    dispatch({ type: "UPDATE_DATA", data: { allergiesIntolerances } });
  };

  return (
    <div className="mx-auto max-w-2xl py-6 px-4 space-y-6">
      {/* Progress header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-12 text-text-secondary">
          <span className="font-semibold uppercase tracking-wider text-brand">
            {t("onboarding.title")}
          </span>
          <span className="tabular-nums font-mono font-medium">
            {t("onboarding.stepCounter", { current: currentStep, total: TOTAL_STEPS })}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border-hairline">
          <div
            className="h-full bg-brand transition-all duration-300 ease-out"
            style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {/* Main card */}
      <Card variant="surface" radius="28" className="p-6 sm:p-8 space-y-6">
        {/* STEP 1: Roles */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-20 font-bold tracking-tight text-text-primary sm:text-24">
                {t("onboarding.step1.title")}
              </h1>
              <p className="mt-1 text-12 text-text-secondary sm:text-14">
                {t("onboarding.step1.subtitle")}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {/* Athlete Card */}
              <button
                type="button"
                onClick={() => toggleRole("athlete")}
                className={`flex items-start gap-4 p-4 rounded-20 border text-left transition-all ${
                  data.roles.includes("athlete")
                    ? "border-brand bg-brand/5 ring-1 ring-brand"
                    : "border-border-hairline bg-bg-elevated hover:border-brand/40"
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-12 ${
                    data.roles.includes("athlete") ? "bg-brand text-white" : "bg-bg-surface text-text-secondary"
                  }`}
                >
                  <User className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-14 font-bold text-text-primary">
                      {t("onboarding.step1.athlete")}
                    </span>
                    {data.roles.includes("athlete") && (
                      <Badge variant="brand" size="sm">
                        Kiválasztva
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-12 text-text-secondary">
                    {t("onboarding.step1.athleteDesc")}
                  </p>
                </div>
              </button>

              {/* Coach Card */}
              <button
                type="button"
                onClick={() => toggleRole("coach")}
                className={`flex items-start gap-4 p-4 rounded-20 border text-left transition-all ${
                  data.roles.includes("coach")
                    ? "border-brand bg-brand/5 ring-1 ring-brand"
                    : "border-border-hairline bg-bg-elevated hover:border-brand/40"
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-12 ${
                    data.roles.includes("coach") ? "bg-brand text-white" : "bg-bg-surface text-text-secondary"
                  }`}
                >
                  <Users className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-14 font-bold text-text-primary">
                      {t("onboarding.step1.coach")}
                    </span>
                    {data.roles.includes("coach") && (
                      <Badge variant="brand" size="sm">
                        Kiválasztva
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-12 text-text-secondary">
                    {t("onboarding.step1.coachDesc")}
                  </p>
                </div>
              </button>

              {/* Specialist Card */}
              <button
                type="button"
                onClick={() => toggleRole("specialist")}
                className={`flex items-start gap-4 p-4 rounded-20 border text-left transition-all ${
                  data.roles.includes("specialist")
                    ? "border-brand bg-brand/5 ring-1 ring-brand"
                    : "border-border-hairline bg-bg-elevated hover:border-brand/40"
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-12 ${
                    data.roles.includes("specialist") ? "bg-brand text-white" : "bg-bg-surface text-text-secondary"
                  }`}
                >
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-14 font-bold text-text-primary">
                      {t("onboarding.step1.specialist")}
                    </span>
                    {data.roles.includes("specialist") && (
                      <Badge variant="brand" size="sm">
                        Kiválasztva
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-12 text-text-secondary">
                    {t("onboarding.step1.specialistDesc")}
                  </p>
                </div>
              </button>
            </div>

            {/* Specialist Disciplines if specialist role active */}
            {data.roles.includes("specialist") && (
              <div className="p-4 rounded-20 border border-brand/20 bg-brand/5 space-y-3">
                <span className="text-12 font-semibold uppercase tracking-wider text-text-secondary">
                  {t("onboarding.step1.specialtySelect")}
                </span>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["dietitian", t("onboarding.step1.disciplineDietitian")],
                      ["physiotherapist", t("onboarding.step1.disciplinePhysiotherapist")],
                      ["strength_coach", t("onboarding.step1.disciplineStrengthCoach")],
                      ["sport_psychologist", t("onboarding.step1.disciplinePsychologist")],
                      ["physician", t("onboarding.step1.disciplinePhysician")]
                    ] as const
                  ).map(([disc, label]) => (
                    <Chip
                      key={disc}
                      label={label}
                      selected={data.specialties.includes(disc)}
                      onClick={() => toggleSpecialty(disc)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Athlete Profile */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-20 font-bold tracking-tight text-text-primary sm:text-24">
                {t("onboarding.step2.title")}
              </h1>
              <p className="mt-1 text-12 text-text-secondary sm:text-14">
                {t("onboarding.step2.subtitle")}
              </p>
            </div>

            {/* Main sports chips */}
            <div className="space-y-2">
              <span className="block text-12 font-medium uppercase tracking-wider text-text-secondary">
                {t("onboarding.step2.mainSport")}
              </span>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_SPORTS.map((sport) => (
                  <Chip
                    key={sport}
                    label={sport}
                    selected={data.mainSports.includes(sport)}
                    onClick={() => toggleSport(sport)}
                  />
                ))}
              </div>
            </div>

            {/* Competition Level */}
            <div className="space-y-2">
              <span className="block text-12 font-medium uppercase tracking-wider text-text-secondary">
                {t("onboarding.step2.level")}
              </span>
              <SegmentedControl
                options={[
                  { value: "hobby", label: t("onboarding.step2.levelHobby") },
                  { value: "competitive_amateur", label: t("onboarding.step2.levelCompetitiveAmateur") },
                  { value: "national", label: t("onboarding.step2.levelNational") },
                  { value: "national_team", label: t("onboarding.step2.levelNationalTeam") },
                  { value: "olympic", label: t("onboarding.step2.levelOlympic") }
                ]}
                value={data.level}
                onChange={(val) => dispatch({ type: "UPDATE_DATA", data: { level: val as AthleteLevel } })}
                fullWidth
              />
            </div>

            {/* Biometric inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="birth-date"
                type="date"
                label={t("onboarding.step2.birthDate")}
                value={data.birthDate || ""}
                onChange={(e) => dispatch({ type: "UPDATE_DATA", data: { birthDate: e.target.value } })}
              />

              <div className="space-y-1.5">
                <span className="block text-12 font-medium uppercase tracking-wider text-text-secondary">
                  {t("onboarding.step2.sex")}
                </span>
                <SegmentedControl
                  options={[
                    { value: "male", label: t("onboarding.step2.sexMale") },
                    { value: "female", label: t("onboarding.step2.sexFemale") },
                    { value: "prefer_not_to_say", label: t("onboarding.step2.sexNone") }
                  ]}
                  value={data.sex || "prefer_not_to_say"}
                  onChange={(val) =>
                    dispatch({
                      type: "UPDATE_DATA",
                      data: { sex: val as "male" | "female" | "prefer_not_to_say" }
                    })
                  }
                  fullWidth
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumberInput
                label={t("onboarding.step2.height")}
                unit="cm"
                min={120}
                max={230}
                step={1}
                value={data.heightCm || 180}
                onChange={(val) => dispatch({ type: "UPDATE_DATA", data: { heightCm: val } })}
              />

              <NumberInput
                label={t("onboarding.step2.weight")}
                unit="kg"
                min={35}
                max={160}
                step={0.5}
                value={data.weightKg || 74}
                onChange={(val) => dispatch({ type: "UPDATE_DATA", data: { weightKg: val } })}
              />
            </div>

            {/* Target goals & competition */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="target-competition"
                label={t("onboarding.step2.targetCompetition")}
                placeholder={t("onboarding.step2.targetCompetitionPlaceholder")}
                value={data.targetCompetition || ""}
                onChange={(e) =>
                  dispatch({ type: "UPDATE_DATA", data: { targetCompetition: e.target.value } })
                }
              />

              <Input
                id="target-date"
                type="date"
                label={t("onboarding.step2.targetDate")}
                value={data.targetCompetitionDate || ""}
                onChange={(e) =>
                  dispatch({ type: "UPDATE_DATA", data: { targetCompetitionDate: e.target.value } })
                }
              />
            </div>
          </div>
        )}

        {/* STEP 3: Data Source */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-20 font-bold tracking-tight text-text-primary sm:text-24">
                {t("onboarding.step3.title")}
              </h1>
              <p className="mt-1 text-12 text-text-secondary sm:text-14">
                {t("onboarding.step3.subtitle")}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* Device Card */}
              <button
                type="button"
                onClick={() => dispatch({ type: "UPDATE_DATA", data: { dataMode: "device" } })}
                className={`flex items-start gap-4 p-5 rounded-20 border text-left transition-all ${
                  data.dataMode === "device"
                    ? "border-brand bg-brand/5 ring-1 ring-brand shadow-sm"
                    : "border-border-hairline bg-bg-elevated hover:border-brand/40"
                }`}
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-14 ${
                    data.dataMode === "device" ? "bg-brand text-white" : "bg-bg-surface text-text-secondary"
                  }`}
                >
                  <Watch className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-16 font-bold text-text-primary">
                      {t("onboarding.step3.deviceCardTitle")}
                    </span>
                    {data.dataMode === "device" && <Badge variant="brand">Aktív</Badge>}
                  </div>
                  <p className="mt-1 text-12 text-text-secondary">
                    {t("onboarding.step3.deviceCardDesc")}
                  </p>
                </div>
              </button>

              {/* Manual Card */}
              <button
                type="button"
                onClick={() => dispatch({ type: "UPDATE_DATA", data: { dataMode: "manual" } })}
                className={`flex items-start gap-4 p-5 rounded-20 border text-left transition-all ${
                  data.dataMode === "manual"
                    ? "border-brand bg-brand/5 ring-1 ring-brand shadow-sm"
                    : "border-border-hairline bg-bg-elevated hover:border-brand/40"
                }`}
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-14 ${
                    data.dataMode === "manual" ? "bg-brand text-white" : "bg-bg-surface text-text-secondary"
                  }`}
                >
                  <FileEdit className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-16 font-bold text-text-primary">
                      {t("onboarding.step3.manualCardTitle")}
                    </span>
                    {data.dataMode === "manual" && <Badge variant="brand">Aktív</Badge>}
                  </div>
                  <p className="mt-1 text-12 text-text-secondary">
                    {t("onboarding.step3.manualCardDesc")}
                  </p>
                </div>
              </button>

              {/* Hybrid Card */}
              <button
                type="button"
                onClick={() => dispatch({ type: "UPDATE_DATA", data: { dataMode: "hybrid" } })}
                className={`flex items-start gap-4 p-5 rounded-20 border text-left transition-all ${
                  data.dataMode === "hybrid"
                    ? "border-brand bg-brand/5 ring-1 ring-brand shadow-sm"
                    : "border-border-hairline bg-bg-elevated hover:border-brand/40"
                }`}
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-14 ${
                    data.dataMode === "hybrid" ? "bg-brand text-white" : "bg-bg-surface text-text-secondary"
                  }`}
                >
                  <Layers className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-16 font-bold text-text-primary">
                      {t("onboarding.step3.hybridCardTitle")}
                    </span>
                    {data.dataMode === "hybrid" && <Badge variant="brand">Aktív</Badge>}
                  </div>
                  <p className="mt-1 text-12 text-text-secondary">
                    {t("onboarding.step3.hybridCardDesc")}
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Support */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-20 font-bold tracking-tight text-text-primary sm:text-24">
                {t("onboarding.step4.title")}
              </h1>
              <p className="mt-1 text-12 text-text-secondary sm:text-14">
                {t("onboarding.step4.subtitle")}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => toggleSupportMode("solo")}
                className={`flex items-start gap-4 p-4 rounded-20 border text-left transition-all ${
                  data.supportMode.includes("solo")
                    ? "border-brand bg-brand/5 ring-1 ring-brand"
                    : "border-border-hairline bg-bg-elevated hover:border-brand/40"
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-12 ${
                    data.supportMode.includes("solo") ? "bg-brand text-white" : "bg-bg-surface text-text-secondary"
                  }`}
                >
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-14 font-bold text-text-primary">
                      {t("onboarding.step4.solo")}
                    </span>
                    {data.supportMode.includes("solo") && <Badge variant="brand" size="sm">Kiválasztva</Badge>}
                  </div>
                  <p className="text-12 text-text-secondary mt-0.5">
                    {t("onboarding.step4.soloDesc")}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => toggleSupportMode("coach")}
                className={`flex items-start gap-4 p-4 rounded-20 border text-left transition-all ${
                  data.supportMode.includes("coach")
                    ? "border-brand bg-brand/5 ring-1 ring-brand"
                    : "border-border-hairline bg-bg-elevated hover:border-brand/40"
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-12 ${
                    data.supportMode.includes("coach") ? "bg-brand text-white" : "bg-bg-surface text-text-secondary"
                  }`}
                >
                  <Users className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-14 font-bold text-text-primary">
                      {t("onboarding.step4.coach")}
                    </span>
                    {data.supportMode.includes("coach") && <Badge variant="brand" size="sm">Kiválasztva</Badge>}
                  </div>
                  <p className="text-12 text-text-secondary mt-0.5">
                    {t("onboarding.step4.coachDesc")}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => toggleSupportMode("specialist")}
                className={`flex items-start gap-4 p-4 rounded-20 border text-left transition-all ${
                  data.supportMode.includes("specialist")
                    ? "border-brand bg-brand/5 ring-1 ring-brand"
                    : "border-border-hairline bg-bg-elevated hover:border-brand/40"
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-12 ${
                    data.supportMode.includes("specialist") ? "bg-brand text-white" : "bg-bg-surface text-text-secondary"
                  }`}
                >
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-14 font-bold text-text-primary">
                      {t("onboarding.step4.specialist")}
                    </span>
                    {data.supportMode.includes("specialist") && <Badge variant="brand" size="sm">Kiválasztva</Badge>}
                  </div>
                  <p className="text-12 text-text-secondary mt-0.5">
                    {t("onboarding.step4.specialistDesc")}
                  </p>
                </div>
              </button>
            </div>

            {/* Optional invite fields */}
            {(data.supportMode.includes("coach") || data.supportMode.includes("specialist")) && (
              <div className="p-4 rounded-20 border border-border-hairline bg-bg-elevated space-y-3">
                <span className="text-12 font-semibold uppercase tracking-wider text-text-primary">
                  {t("onboarding.step4.inviteTitle")}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    id="invite-email"
                    type="email"
                    label={t("onboarding.step4.inviteEmailLabel")}
                    placeholder={t("onboarding.step4.inviteEmailPlaceholder")}
                    value={data.supportInviteEmail || ""}
                    onChange={(e) =>
                      dispatch({ type: "UPDATE_DATA", data: { supportInviteEmail: e.target.value } })
                    }
                  />
                  <Input
                    id="invite-code"
                    label={t("onboarding.step4.inviteCodeLabel")}
                    placeholder={t("onboarding.step4.inviteCodePlaceholder")}
                    value={data.supportInviteCode || ""}
                    onChange={(e) =>
                      dispatch({ type: "UPDATE_DATA", data: { supportInviteCode: e.target.value } })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: Baseline */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-20 font-bold tracking-tight text-text-primary sm:text-24">
                {t("onboarding.step5.title")}
              </h1>
              <p className="mt-1 text-12 text-text-secondary sm:text-14">
                {t("onboarding.step5.subtitle")}
              </p>
            </div>

            <div className="space-y-5">
              {/* Sleep slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-14">
                  <span className="font-medium text-text-primary">
                    {t("onboarding.step5.sleepHours")}
                  </span>
                  <span className="font-mono font-bold text-brand tabular-nums">
                    {data.sleepHoursBaseline || 8} óra
                  </span>
                </div>
                <Slider
                  min={4}
                  max={12}
                  step={0.5}
                  value={data.sleepHoursBaseline || 8}
                  onChange={(val) => dispatch({ type: "UPDATE_DATA", data: { sleepHoursBaseline: val } })}
                />
              </div>

              {/* Training days per week stepper */}
              <div className="flex items-center justify-between p-4 rounded-20 border border-border-hairline bg-bg-elevated">
                <div>
                  <span className="text-14 font-medium text-text-primary block">
                    {t("onboarding.step5.trainingDays")}
                  </span>
                  <span className="text-12 text-text-secondary">
                    Tervezett heti edzésszám
                  </span>
                </div>
                <Stepper
                  currentStep={data.trainingDaysPerWeek || 5}
                  onStepClick={(val) => dispatch({ type: "UPDATE_DATA", data: { trainingDaysPerWeek: val } })}
                  steps={[
                    { id: "1", label: "1" },
                    { id: "2", label: "2" },
                    { id: "3", label: "3" },
                    { id: "4", label: "4" },
                    { id: "5", label: "5" },
                    { id: "6", label: "6" },
                    { id: "7", label: "7" }
                  ]}
                />
              </div>

              {/* Resting HR */}
              <NumberInput
                label={t("onboarding.step5.restingHr")}
                unit="bpm"
                min={30}
                max={120}
                step={1}
                value={data.restingHeartRateBaseline || 48}
                onChange={(val) => dispatch({ type: "UPDATE_DATA", data: { restingHeartRateBaseline: val } })}
                hint="Ébredéskor mért nyugalmi szívritmus"
              />

              {/* Injuries */}
              <Input
                id="injuries-notes"
                label={t("onboarding.step5.injuries")}
                placeholder={t("onboarding.step5.injuriesPlaceholder")}
                value={data.currentInjuries || ""}
                onChange={(e) =>
                  dispatch({ type: "UPDATE_DATA", data: { currentInjuries: e.target.value } })
                }
              />
            </div>
          </div>
        )}

        {/* STEP 6: Nutrition Basics */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-20 font-bold tracking-tight text-text-primary sm:text-24">
                {t("onboarding.step6.title")}
              </h1>
              <p className="mt-1 text-12 text-text-secondary sm:text-14">
                {t("onboarding.step6.subtitle")}
              </p>
            </div>

            {/* Nutrition Goal */}
            <div className="space-y-2">
              <span className="block text-12 font-medium uppercase tracking-wider text-text-secondary">
                {t("onboarding.step6.goal")}
              </span>
              <SegmentedControl
                options={[
                  { value: "maintain", label: t("onboarding.step6.goalMaintain") },
                  { value: "lose", label: t("onboarding.step6.goalLose") },
                  { value: "gain", label: t("onboarding.step6.goalGain") },
                  { value: "performance", label: t("onboarding.step6.goalPerformance") }
                ]}
                value={data.nutritionGoal}
                onChange={(val) =>
                  dispatch({ type: "UPDATE_DATA", data: { nutritionGoal: val as NutritionGoal } })
                }
                fullWidth
              />
            </div>

            {/* Dietary Preferences */}
            <div className="space-y-2">
              <span className="block text-12 font-medium uppercase tracking-wider text-text-secondary">
                {t("onboarding.step6.dietaryPreferences")}
              </span>
              <div className="flex flex-wrap gap-2">
                {DIETARY_TAGS.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    selected={data.dietaryPreferences.includes(tag)}
                    onClick={() => toggleDiet(tag)}
                  />
                ))}
              </div>
            </div>

            {/* Allergies / Intolerances */}
            <div className="space-y-2">
              <span className="block text-12 font-medium uppercase tracking-wider text-text-secondary">
                {t("onboarding.step6.allergies")}
              </span>
              <div className="flex flex-wrap gap-2">
                {ALLERGY_TAGS.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    selected={data.allergiesIntolerances.includes(tag)}
                    onClick={() => toggleAllergy(tag)}
                  />
                ))}
              </div>
            </div>

            {/* Plate based view toggle */}
            <div className="flex items-center justify-between p-4 rounded-20 border border-border-hairline bg-bg-elevated">
              <div className="space-y-0.5 pr-4">
                <span className="text-14 font-semibold text-text-primary block">
                  {t("onboarding.step6.plateBasedToggle")}
                </span>
                <span className="text-12 text-text-secondary">
                  {t("onboarding.step6.plateBasedDesc")}
                </span>
              </div>
              <Toggle
                checked={data.plateBasedViewOnly}
                onChange={(checked) =>
                  dispatch({ type: "UPDATE_DATA", data: { plateBasedViewOnly: checked } })
                }
                label={t("onboarding.step6.plateBasedToggle")}
              />
            </div>
          </div>
        )}

        {/* STEP 7: Health-Data Consent (GDPR Art. 9) */}
        {currentStep === 7 && (
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-14 bg-status-ready/15 text-status-ready">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-20 font-bold tracking-tight text-text-primary sm:text-24">
                  {t("onboarding.step7.title")}
                </h1>
                <p className="mt-1 text-12 text-text-secondary sm:text-14">
                  {t("onboarding.step7.subtitle")}
                </p>
              </div>
            </div>

            <div className="space-y-4 rounded-20 border border-border-hairline bg-bg-elevated p-5 text-13 leading-relaxed text-text-secondary">
              <p>{t("onboarding.step7.legalText")}</p>
              <p className="text-text-primary font-medium">{t("onboarding.step7.guarantees")}</p>

              <div className="flex items-center justify-between pt-2 border-t border-border-hairline">
                <Link
                  to="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-12 font-semibold text-brand hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t("onboarding.step7.privacyLink")}
                </Link>
                <span className="text-11 text-text-tertiary font-mono">
                  {t("onboarding.step7.consentVersionNotice", { version: CONSENT_VERSION })}
                </span>
              </div>
            </div>

            {/* Explicit Consent Checkbox */}
            <label className="flex items-start gap-3 p-4 rounded-20 border border-brand/30 bg-brand/5 cursor-pointer hover:bg-brand/10 transition-colors">
              <input
                type="checkbox"
                checked={data.consentAccepted}
                onChange={(e) =>
                  dispatch({ type: "UPDATE_DATA", data: { consentAccepted: e.target.checked } })
                }
                className="mt-1 h-5 w-5 rounded-6 border-border-hairline text-brand focus:ring-brand focus:ring-offset-bg-primary"
              />
              <span className="text-13 font-semibold text-text-primary leading-snug">
                {t("onboarding.step7.consentCheckbox")}
              </span>
            </label>

            {!data.consentAccepted && (
              <p className="text-12 font-medium text-status-rest">
                {t("onboarding.step7.requiredError")}
              </p>
            )}
          </div>
        )}

        {/* Navigation Action Buttons */}
        <div className="pt-4 border-t border-border-hairline flex items-center justify-between gap-3">
          {/* Back button */}
          <Button
            type="button"
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 1 || isFinishing}
            leftIcon={<ChevronLeft className="h-4 w-4" />}
          >
            {t("common.back")}
          </Button>

          <div className="flex items-center gap-2">
            {/* Skip button for non-essential steps */}
            {skippable && (
              <Button
                type="button"
                variant="tertiary"
                onClick={handleSkip}
                disabled={isFinishing}
                rightIcon={<SkipForward className="h-3.5 w-3.5" />}
              >
                {t("common.skip")}
              </Button>
            )}

            {/* Next or Finish button */}
            <Button
              type="button"
              variant="primary"
              onClick={handleNext}
              disabled={!canProceed || isFinishing}
              isLoading={isFinishing}
              rightIcon={
                currentStep === TOTAL_STEPS ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )
              }
            >
              {currentStep === TOTAL_STEPS ? t("common.finish") : t("common.next")}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default OnboardingPage;
