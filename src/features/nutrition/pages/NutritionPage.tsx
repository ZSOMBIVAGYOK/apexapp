import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  Button,
  Badge,
  Toggle,
  Tabs,
  DaySwitcher,
  showToast,
  ServerSyncBanner
} from "@shared/ui";
import {
  Plus,
  Zap,
  UserCheck,
  Utensils,
  Sparkles,
  Scale,
  HeartPulse
} from "lucide-react";
import {
  calculateDailyNutritionTarget,
  planSessionFuelling,
  detectLowEnergyAvailability
} from "@shared/lib/nutrition";

import {
  DailyNutritionTarget,
  LoggedMeal,
  LoggedFoodItem,
  MealType,
  WorkoutFuellingPlan,
  DietitianMealPlan,
  LowEnergyAvailabilityAlert
} from "@shared/types/nutrition";
import { AddFoodModal } from "../components/AddFoodModal";
import { MealDetailModal } from "../components/MealDetailModal";
import { NutritionTargetsModal } from "../components/NutritionTargetsModal";
import { SessionFuellingModal } from "../components/SessionFuellingModal";
import { SupplementsTab } from "../components/SupplementsTab";
import { BodyMetricsTab } from "../components/BodyMetricsTab";
import { DietitianPlanModal } from "../components/DietitianPlanModal";
import { HydrationTrackerCard } from "../components/HydrationTrackerCard";
import { MealPlanEditor } from "../components/plans/MealPlanEditor";
import { MyFoodsTab } from "../components/plans/MyFoodsTab";
import { DayComposerModal } from "../components/plans/DayComposerModal";
import { WeekPlannerModal } from "../components/plans/WeekPlannerModal";
import { ShoppingListModal } from "../components/plans/ShoppingListModal";
import { getActiveMealPlan } from "@shared/lib/repositories/mealPlanRepository";
import { getPlannedDay, subscribePlannedDay, savePlannedDay } from "@shared/lib/repositories/plannedDayRepository";
import { MealPlanDocument, PlannedDayDocument, MealPlanOption, PlannedDayOptionSelection } from "@shared/types/mealPlan";
import { calculateOptionNutrients, generateStarterMealPlan } from "@shared/lib/nutrition/mealPlanEngine";
import { Layers, Calendar, ShoppingCart, Check } from "lucide-react";
import { useAuthStore } from "@features/auth/authStore";
import { getNutritionDay, saveNutritionDay, subscribeNutritionDay } from "@shared/lib/repositories/nutritionRepository";
import {
  normalizeNutritionMeals,
  CANONICAL_MEAL_TYPES,
  createDefaultMeal
} from "@shared/lib/nutrition";
import { getUserStorageKey } from "@shared/lib/storage/userStorage";

export const NutritionPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  // Selected date
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]!
  );

  // Active top-level navigation tab
  const [activeTab, setActiveTab] = useState<
    "overview" | "meal_plan" | "my_foods" | "targets" | "dietitian_plan" | "supplements" | "body_metrics"
  >("overview");

  // Meal pool active plan & planned day for selected date
  const [activeMealPlan, setActiveMealPlan] = useState<MealPlanDocument | null>(null);
  const [currentPlannedDay, setCurrentPlannedDay] = useState<PlannedDayDocument | null>(null);
  const [showDayComposerFromNaplo, setShowDayComposerFromNaplo] = useState(false);
  const [showWeekPlannerModal, setShowWeekPlannerModal] = useState(false);
  const [showShoppingModal, setShowShoppingModal] = useState(false);

  // Sensitive-use safeguard: "Hide calorie numbers" -> switches to plate-method portion view
  const [hideCalories, setHideCalories] = useState<boolean>(() => {
    return localStorage.getItem("apex_hide_calories") === "true";
  });

  // Dietitian simulation mode toggle
  const [isDietitianMode, setIsDietitianMode] = useState(false);

  // Daily target state
  const [currentTarget, setCurrentTarget] = useState<DailyNutritionTarget>(() => {
    const isRealUser = import.meta.env.PROD || user?.uid !== "demo-athlete-001";
    return calculateDailyNutritionTarget({
      date: new Date().toISOString().split("T")[0]!,
      weightKg: user?.weightKg || 70,
      heightCm: user?.heightCm || 175,
      ageYears: 25,
      sex: user?.sex === "female" ? "female" : "male",
      bodyFatPct: 12,
      dayType: "moderate",
      sessionDurationMinutes: 0,
      plannedOrActualLoadTss: 0,
      setBy: isRealUser
        ? {
            userId: user?.uid || "self",
            userName: user?.displayName || "Sportoló",
            role: "athlete",
            title: "Saját cél",
            updatedAt: new Date().toISOString()
          }
        : {
            userId: "dietitian-1",
            userName: "Dr. Kovács Anna",
            role: "dietitian",
            title: "Vezető Sportdietetikus",
            updatedAt: "2026-10-26T08:00:00Z"
          }
    });
  });

  // Daily meals log
  const [meals, setMeals] = useState<Record<MealType, LoggedMeal>>(() => {
    const storageKey = getUserStorageKey("daily_nutrition_data", user?.uid);
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return normalizeNutritionMeals(JSON.parse(raw));
    } catch {
      // fallback
    }

    if (import.meta.env.PROD || user?.uid !== "demo-athlete-001") {
      return normalizeNutritionMeals(null);
    }

    return {
      breakfast: {
        id: "meal_bf",
        mealType: "breakfast",
        time: "07:30",
        items: [
          {
            id: "i_1",
            foodId: "curated_oats",
            name: "Zabpehely (egész szemű)",
            servingGrams: 80,
            mode: "precise",
            calories: 300,
            proteinGrams: 10.8,
            carbsGrams: 49.6,
            fatGrams: 5.6,
            micros: { fiberGrams: 8.0, magnesiumMg: 110, potassiumMg: 280 },
            coverageScore: 85,
            missingNutrients: [],
            createdAt: "2026-10-26T07:30:00Z"
          },
          {
            id: "i_2",
            foodId: "curated_whey_isolate",
            name: "Tejsavófehérje izolátum (WPI 90)",
            servingGrams: 30,
            mode: "precise",
            calories: 111,
            proteinGrams: 26.4,
            carbsGrams: 0.5,
            fatGrams: 0.3,
            micros: { calciumMg: 135 },
            coverageScore: 50,
            missingNutrients: ["iron", "vitamin_d"],
            createdAt: "2026-10-26T07:35:00Z"
          },
          {
            id: "i_3",
            foodId: "curated_banana",
            name: "Banán (friss)",
            servingGrams: 120,
            mode: "precise",
            calories: 107,
            proteinGrams: 1.3,
            carbsGrams: 27.4,
            fatGrams: 0.4,
            micros: { potassiumMg: 430, fiberGrams: 3.1 },
            coverageScore: 75,
            missingNutrients: [],
            createdAt: "2026-10-26T07:35:00Z"
          }
        ],
        totalCalories: 518,
        totalProteinGrams: 38.5,
        totalCarbsGrams: 77.5,
        totalFatGrams: 6.3,
        dietitianComments: [
          {
            id: "c_1",
            dietitianId: "d1",
            dietitianName: "Dr. Kovács Anna",
            comment: "Kiváló edzés előtti szénhidrát- és fehérjearány alacsony zsírtartalommal.",
            createdAt: "2026-10-26T08:15:00Z"
          }
        ],
        createdAt: "2026-10-26T07:30:00Z"
      },
      during_training: {
        id: "meal_during",
        mealType: "during_training",
        time: "10:30",
        items: [
          {
            id: "i_4",
            foodId: "curated_energy_gel",
            name: "Energiagél (maltodextrin + fruktóz 2:1)",
            servingGrams: 60,
            mode: "precise",
            calories: 129,
            proteinGrams: 0,
            carbsGrams: 32.4,
            fatGrams: 0,
            micros: { sodiumMg: 210 },
            coverageScore: 60,
            missingNutrients: ["calcium", "iron"],
            createdAt: "2026-10-26T10:30:00Z"
          },
          {
            id: "i_5",
            foodId: "curated_isotonic_drink",
            name: "Izotóniás sportital (elektrolitos)",
            servingGrams: 500,
            mode: "precise",
            calories: 140,
            proteinGrams: 0,
            carbsGrams: 34.0,
            fatGrams: 0,
            micros: { sodiumMg: 300, potassiumMg: 125 },
            coverageScore: 70,
            missingNutrients: [],
            createdAt: "2026-10-26T10:45:00Z"
          }
        ],
        totalCalories: 269,
        totalProteinGrams: 0,
        totalCarbsGrams: 66.4,
        totalFatGrams: 0,
        createdAt: "2026-10-26T10:30:00Z"
      },
      lunch: {
        id: "meal_lunch",
        mealType: "lunch",
        time: "13:00",
        items: [
          {
            id: "i_6",
            foodId: "curated_jasmine_rice",
            name: "Jázminrizs (főzetlen)",
            servingGrams: 100,
            mode: "precise",
            calories: 355,
            proteinGrams: 7.1,
            carbsGrams: 79.0,
            fatGrams: 0.7,
            micros: {},
            coverageScore: 65,
            missingNutrients: [],
            createdAt: "2026-10-26T13:00:00Z"
          },
          {
            id: "i_7",
            foodId: "curated_chicken_breast",
            name: "Csirkemellfilé (nyers)",
            servingGrams: 180,
            mode: "precise",
            calories: 216,
            proteinGrams: 40.5,
            carbsGrams: 0,
            fatGrams: 4.7,
            micros: { ironMg: 1.6, potassiumMg: 590 },
            coverageScore: 80,
            missingNutrients: [],
            createdAt: "2026-10-26T13:00:00Z"
          }
        ],
        totalCalories: 571,
        totalProteinGrams: 47.6,
        totalCarbsGrams: 79.0,
        totalFatGrams: 5.4,
        createdAt: "2026-10-26T13:00:00Z"
      },
      dinner: {
        id: "meal_dinner",
        mealType: "dinner",
        time: "19:00",
        items: [
          {
            id: "i_8",
            foodId: "curated_salmon",
            name: "Lazacfilé (nyers)",
            servingGrams: 150,
            mode: "precise",
            calories: 312,
            proteinGrams: 30.6,
            carbsGrams: 0,
            fatGrams: 20.1,
            micros: { omega3Grams: 3.9, vitaminDMcg: 16.5 },
            coverageScore: 90,
            missingNutrients: [],
            createdAt: "2026-10-26T19:00:00Z"
          },
          {
            id: "i_9",
            foodId: "curated_sweet_potato",
            name: "Édesburgonya (sütve)",
            servingGrams: 200,
            mode: "precise",
            calories: 180,
            proteinGrams: 4.0,
            carbsGrams: 41.4,
            fatGrams: 0.2,
            micros: { potassiumMg: 950 },
            coverageScore: 80,
            missingNutrients: [],
            createdAt: "2026-10-26T19:00:00Z"
          }
        ],
        totalCalories: 492,
        totalProteinGrams: 34.6,
        totalCarbsGrams: 41.4,
        totalFatGrams: 20.3,
        createdAt: "2026-10-26T19:00:00Z"
      },
      snack: {
        id: "meal_snack",
        mealType: "snack",
        time: "16:00",
        items: [
          {
            id: "i_10",
            foodId: "curated_greek_yogurt",
            name: "Görög joghurt 0% / 2%",
            servingGrams: 150,
            mode: "precise",
            calories: 87,
            proteinGrams: 15.3,
            carbsGrams: 5.4,
            fatGrams: 0.6,
            micros: { calciumMg: 165 },
            coverageScore: 70,
            missingNutrients: [],
            createdAt: "2026-10-26T16:00:00Z"
          }
        ],
        totalCalories: 87,
        totalProteinGrams: 15.3,
        totalCarbsGrams: 5.4,
        totalFatGrams: 0.6,
        createdAt: "2026-10-26T16:00:00Z"
      }
    };
  });

  // Hydration state
  const [caffeineMg] = useState(160);

  // Active dietitian meal plan (demo data only in development)
  const [_activePlan, setActivePlan] = useState<DietitianMealPlan | null>(() => {
    if (import.meta.env.PROD || user?.uid !== "demo-athlete-001") {
      return null;
    }
    return {
      id: "plan_1",
      title: "Mérsékelt Edzésnapi Szénhidrát- és Izomvédelmi Étrend",
      description: "Periodizált tápanyagbevitel a délelőtti zóna 2 és késő délutáni erőfejlesztő edzés támogatására.",
      dietitianId: "d1",
      dietitianName: "Dr. Kovács Anna (Sportdietetikus)",
      targetDayType: "moderate",
      targetCalories: 2850,
      targetProteinGrams: 145,
      targetCarbsGrams: 420,
      targetFatGrams: 65,
      meals: [
      {
        mealType: "breakfast",
        suggestedName: "Zabkása bogyós gyümölccsel és tejsavó izolátummal",
        targetCarbsGrams: 75,
        targetProteinGrams: 35,
        plateSuggestion: "1/3 szénhidrát, 1/3 fehérje, 1/3 gyümölcs"
      },
      {
        mealType: "during_training",
        suggestedName: "Izotóniás ital és banán vagy energiagél",
        targetCarbsGrams: 60,
        targetProteinGrams: 0,
        plateSuggestion: "Óránként 60g gyors szénhidrát + 500ml folyadék"
      },
      {
        mealType: "lunch",
        suggestedName: "Jázminrizs grillezett csirkemellel és zöldsalátával",
        targetCarbsGrams: 85,
        targetProteinGrams: 45,
        plateSuggestion: "2/5 jázminrizs, 2/5 csirkemell, 1/5 zöldségek"
      },
      {
        mealType: "dinner",
        suggestedName: "Lazacfilé édesburgonyával és párolt brokkolival",
        targetCarbsGrams: 45,
        targetProteinGrams: 35,
        plateSuggestion: "1/4 édesburgonya, 1/4 lazac, 1/2 zöldségek"
      }
    ],
    createdAt: "2026-10-25T14:00:00Z"
    };
  });

  // Modal states
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);
  const [addFoodMealType, setAddFoodMealType] = useState<MealType>("lunch");
  const [inspectingMeal, setInspectingMeal] = useState<LoggedMeal | null>(null);
  const [showTargetsModal, setShowTargetsModal] = useState(false);
  const [showFuellingModal, setShowFuellingModal] = useState(false);
  const [showDietitianPlanModal, setShowDietitianPlanModal] = useState(false);

  const isRemoteUpdate = useRef(false);

  // Subscribe to daily meals in real time on user/date change
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeNutritionDay(
      user.uid,
      selectedDate,
      (serverData) => {
        if (serverData?.meals) {
          isRemoteUpdate.current = true;
          setMeals(normalizeNutritionMeals(serverData.meals));
        } else if (!serverData) {
          if (import.meta.env.PROD || user?.uid !== "demo-athlete-001") {
            isRemoteUpdate.current = true;
            setMeals(normalizeNutritionMeals(null));
          }
        }
      }
    );
    return () => unsub();
  }, [user?.uid, selectedDate]);

  // Persist meals to local storage and Firestore
  useEffect(() => {
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }
    try {
      const storageKey = getUserStorageKey("daily_nutrition_data", user?.uid);
      localStorage.setItem(storageKey, JSON.stringify(meals));
      if (user?.uid) {
        saveNutritionDay(user.uid, selectedDate, { meals });
      }
    } catch {
      // ignore
    }
  }, [meals, user?.uid, selectedDate]);

  // Subscribe to active meal plan and current planned day
  useEffect(() => {
    if (!user?.uid) return;
    getActiveMealPlan(user.uid).then(setActiveMealPlan);
  }, [user?.uid, activeTab]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribePlannedDay(user.uid, selectedDate, (day) => {
      setCurrentPlannedDay(day);
    });
    return () => unsub();
  }, [user?.uid, selectedDate]);

  // One-tap log from active plan option pool
  const handleLogOptionOneTap = (mType: MealType, option: MealPlanOption, portion: number = 1.0) => {
    const nutrients = calculateOptionNutrients(option, portion, currentTarget.dayType);
    const servingGrams = Math.round((option.baseServingGrams || 100) * portion);

    const newItem: LoggedFoodItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      foodId: option.sourceFoodId || option.id,
      name: option.name,
      servingGrams,
      mode: "precise",
      calories: nutrients.calories,
      proteinGrams: nutrients.proteinGrams,
      carbsGrams: nutrients.carbsGrams,
      fatGrams: nutrients.fatGrams,
      micros: {},
      coverageScore: 80,
      missingNutrients: [],
      createdAt: new Date().toISOString()
    };

    const currentMeal = meals[mType] || createDefaultMeal(mType);
    const updatedItems = [...(currentMeal.items || []), newItem];

    const updatedMeal: LoggedMeal = {
      ...currentMeal,
      items: updatedItems,
      totalCalories: updatedItems.reduce((acc, i) => acc + i.calories, 0),
      totalProteinGrams: Math.round(updatedItems.reduce((acc, i) => acc + i.proteinGrams, 0) * 10) / 10,
      totalCarbsGrams: Math.round(updatedItems.reduce((acc, i) => acc + i.carbsGrams, 0) * 10) / 10,
      totalFatGrams: Math.round(updatedItems.reduce((acc, i) => acc + i.fatGrams, 0) * 10) / 10,
      time: currentMeal.time || new Date().toTimeString().slice(0, 5)
    };

    setMeals((prev) => ({
      ...prev,
      [mType]: updatedMeal
    }));

    showToast({ title: "Naplózva", message: `„${option.name}” hozzáadva a naplóhoz!`, variant: "success" });
  };

  // One-tap consume on planned meal
  const handleConsumePlannedOption = (mType: MealType, selection: PlannedDayOptionSelection) => {
    handleLogOptionOneTap(mType, selection.optionSnapshot, selection.portionMultiplier);

    if (currentPlannedDay && user?.uid) {
      const updatedSlots = currentPlannedDay.slots.map((s) => {
        if (s.slotId !== mType) return s;
        return {
          ...s,
          selectedOptions: s.selectedOptions.map((o) =>
            o.optionId === selection.optionId
              ? { ...o, status: "consumed" as const, loggedAt: new Date().toISOString() }
              : o
          )
        };
      });
      const updatedDay: PlannedDayDocument = { ...currentPlannedDay, slots: updatedSlots };
      setCurrentPlannedDay(updatedDay);
      savePlannedDay(user.uid, updatedDay);
    }
  };

  const handleReplacePlannedOption = (mType: MealType, selection: PlannedDayOptionSelection) => {
    if (currentPlannedDay && user?.uid) {
      const updatedSlots = currentPlannedDay.slots.map((s) => {
        if (s.slotId !== mType) return s;
        return {
          ...s,
          selectedOptions: s.selectedOptions.map((o) =>
            o.optionId === selection.optionId
              ? { ...o, status: "replaced" as const, replacementItemName: "Egyéni választás" }
              : o
          )
        };
      });
      const updatedDay: PlannedDayDocument = { ...currentPlannedDay, slots: updatedSlots };
      setCurrentPlannedDay(updatedDay);
      savePlannedDay(user.uid, updatedDay);
    }
    setAddFoodMealType(mType);
    setShowAddFoodModal(true);
  };

  // Persist hide calories setting
  const toggleHideCalories = (val: boolean) => {
    setHideCalories(val);
    localStorage.setItem("apex_hide_calories", String(val));
    showToast({
      title: val ? "Tányérmódszer nézet aktív" : "Kalóriaszámok megjelenítve",
      message: val
        ? "A numerikus kalóriák helyett az adagok és a tányéron belüli arányok jelennek meg."
        : "Numerikus energiamutatók és grammok láthatóak.",
      type: "info"
    });
  };

  // Calculate day totals
  const mealList = Object.values(meals || {});
  const totalCalories = mealList.reduce((sum, m) => sum + (m?.totalCalories || 0), 0);
  const totalProtein = Math.round(
    mealList.reduce((sum, m) => sum + (m?.totalProteinGrams || 0), 0)
  );
  const totalCarbs = Math.round(
    mealList.reduce((sum, m) => sum + (m?.totalCarbsGrams || 0), 0)
  );
  const totalFat = Math.round(
    mealList.reduce((sum, m) => sum + (m?.totalFatGrams || 0), 0)
  );

  // Check for Low Energy Availability (LEA) condition
  const recentDaysForLea = [
    { date: "2026-10-24", consumedCalories: 2600, targetCalories: 2900, trainingLoadTss: 85 },
    { date: "2026-10-25", consumedCalories: 2750, targetCalories: 2850, trainingLoadTss: 90 },
    { date: selectedDate, consumedCalories: totalCalories, targetCalories: currentTarget.targetCalories, trainingLoadTss: 85 }
  ];
  const leaAlert: LowEnergyAvailabilityAlert = detectLowEnergyAvailability(recentDaysForLea);

  // Today's workout session fuelling plan
  const todayWorkoutFuelling: WorkoutFuellingPlan = planSessionFuelling({
    workoutId: "session_today_run",
    title: "90p Zóna 2 Hosszú futás",
    sport: "running",
    durationMinutes: 90,
    intensityRpe: 6,
    athleteWeightKg: 72,
    isHotOrHumid: false
  });

  const handleAddFoodItem = (mealType: MealType, loggedItem: LoggedFoodItem) => {
    setMeals((prev) => {
      const currentMeal = prev[mealType] || createDefaultMeal(mealType);
      const nextItems = [...(currentMeal.items || []), loggedItem];
      const nextTotalCal = nextItems.reduce((acc, i) => acc + (i.calories || 0), 0);
      const nextTotalProt = +(nextItems.reduce((acc, i) => acc + (i.proteinGrams || 0), 0)).toFixed(1);
      const nextTotalCarb = +(nextItems.reduce((acc, i) => acc + (i.carbsGrams || 0), 0)).toFixed(1);
      const nextTotalFat = +(nextItems.reduce((acc, i) => acc + (i.fatGrams || 0), 0)).toFixed(1);

      return {
        ...prev,
        [mealType]: {
          ...currentMeal,
          items: nextItems,
          totalCalories: nextTotalCal,
          totalProteinGrams: nextTotalProt,
          totalCarbsGrams: nextTotalCarb,
          totalFatGrams: nextTotalFat
        }
      };
    });
  };

  const handleDeleteItem = (itemId: string) => {
    if (!inspectingMeal) return;
    const mealKey = inspectingMeal.mealType;

    setMeals((prev) => {
      const currentMeal = prev[mealKey] || createDefaultMeal(mealKey);
      const nextItems = (currentMeal.items || []).filter((i) => i.id !== itemId);
      const nextTotalCal = nextItems.reduce((acc, i) => acc + (i.calories || 0), 0);
      const nextTotalProt = +(nextItems.reduce((acc, i) => acc + (i.proteinGrams || 0), 0)).toFixed(1);
      const nextTotalCarb = +(nextItems.reduce((acc, i) => acc + (i.carbsGrams || 0), 0)).toFixed(1);
      const nextTotalFat = +(nextItems.reduce((acc, i) => acc + (i.fatGrams || 0), 0)).toFixed(1);

      const updated = {
        ...currentMeal,
        items: nextItems,
        totalCalories: nextTotalCal,
        totalProteinGrams: nextTotalProt,
        totalCarbsGrams: nextTotalCarb,
        totalFatGrams: nextTotalFat
      };

      setInspectingMeal(updated);
      return {
        ...prev,
        [mealKey]: updated
      };
    });

    showToast({
      title: "Étel törölve",
      type: "info"
    });
  };

  const handleAddDietitianComment = (comment: string) => {
    if (!inspectingMeal) return;
    const mealKey = inspectingMeal.mealType;

    const newComment = {
      id: `c_${Date.now()}`,
      dietitianId: "dietitian-1",
      dietitianName: "Dr. Kovács Anna",
      comment,
      createdAt: new Date().toISOString()
    };

    setMeals((prev) => {
      const current = prev[mealKey] || createDefaultMeal(mealKey);
      const updated = {
        ...current,
        dietitianComments: [...(current.dietitianComments || []), newComment]
      };
      setInspectingMeal(updated);
      return {
        ...prev,
        [mealKey]: updated
      };
    });
  };

  const mealLabels: Record<MealType, string> = {
    breakfast: "Reggeli",
    during_training: "Edzés közben",
    lunch: "Ebéd",
    snack: "Snack / Uzsonna",
    dinner: "Vacsora"
  };

  const dayTypeLabels: Record<string, string> = {
    rest: "Pihenőnap",
    light: "Könnyű nap",
    moderate: "Mérsékelt nap",
    hard: "Nehéz nap",
    competition: "Versenynap"
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header & Date Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-28 font-bold text-text-primary tracking-tight">
              {t("nutrition.title")}
            </h1>
            <Badge variant="brand" size="sm">
              {dayTypeLabels[currentTarget.dayType] || currentTarget.dayType}
            </Badge>
            {isDietitianMode && (
              <Badge variant="ready" size="sm">
                Dietetikus mód
              </Badge>
            )}

          </div>
          <p className="text-14 text-text-secondary mt-0.5">
            Tudományos alapú sporttáplálkozás, makro-periodizáció és edzés körüli üzemanyag-stratégia.
          </p>
        </div>

        {/* Date Switcher & Add Food */}
        <div className="flex flex-wrap items-center gap-2">
          <DaySwitcher
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />

          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setAddFoodMealType("lunch");
              setShowAddFoodModal(true);
            }}
          >
            {t("nutrition.logMeal")}
          </Button>
        </div>
      </div>

      {/* Server Sync Status Banner */}
      <ServerSyncBanner
        onRetry={() => {
          if (user?.uid) {
            getNutritionDay(user.uid, selectedDate, { forceServer: true }).then((data) => {
              if (data?.meals) setMeals(normalizeNutritionMeals(data.meals));
            });
          }
        }}
      />

      {/* Target Provenance & Sensitive-use Safeguard Bar */}
      <div className="rounded-16 bg-bg-surface p-4 border border-border-hairline flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Provenance badge */}
        <div
          onClick={() => setShowTargetsModal(true)}
          className="flex items-center gap-3 cursor-pointer group hover:opacity-90 transition-opacity"
        >
          <div className="w-9 h-9 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0">
            {currentTarget.setBy?.role === "dietitian" ? (
              <UserCheck className="w-5 h-5" />
            ) : (
              <Utensils className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-11 text-text-secondary uppercase tracking-wider font-semibold">
                Célértékek forrása
              </span>
              <span className="text-10 text-brand group-hover:underline">
                (Módosítás)
              </span>
            </div>
            <span className="text-13 font-bold text-text-primary block">
              {currentTarget.setBy?.userName || "Sportoló (Saját cél)"}
              {currentTarget.setBy?.title ? ` • ${currentTarget.setBy.title}` : ""}
            </span>
          </div>
        </div>

        {/* Sensitive-use toggle: Hide calorie numbers */}
        <div className="flex items-center gap-4 pt-2 md:pt-0 border-t md:border-t-0 border-border-hairline">
          <div className="flex items-center gap-2">
            <Toggle
              checked={hideCalories}
              onChange={toggleHideCalories}
              label="Kalóriaszámok elrejtése (Tányérmódszer)"
            />
          </div>

          {/* Dietitian mode toggle */}
          <button
            type="button"
            onClick={() => setIsDietitianMode(!isDietitianMode)}
            className={`px-3 py-1.5 rounded-10 text-11 font-semibold border transition-all ${
              isDietitianMode
                ? "bg-brand text-white border-brand shadow-sm"
                : "bg-bg-elevated text-text-secondary border-border-hairline hover:text-text-primary"
            }`}
          >
            {isDietitianMode ? "✓ Dietetikus nézet" : "Dietetikus nézet szimulálása"}
          </button>
        </div>
      </div>

      {/* Low Energy Availability (LEA / REDs) Sensitive Notice Banner */}
      {leaAlert.triggered && (
        <div className="rounded-16 bg-status-caution/10 border border-status-caution/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-status-caution">
            <HeartPulse className="w-5 h-5 shrink-0" />
            <h4 className="text-13 font-bold uppercase tracking-wider">
              Energia-egyensúly és Regeneráció Értesítő
            </h4>
          </div>
          <p className="text-12 text-text-primary leading-relaxed">
            {leaAlert.message}
          </p>
          <p className="text-11 text-text-secondary italic">
            {leaAlert.disclaimer}
          </p>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <Tabs
        activeId={activeTab}
        onChange={(tab) =>
          setActiveTab(
            tab as any
          )
        }
        tabs={[
          { id: "overview", label: "Napló", icon: <Utensils className="w-4 h-4" /> },
          { id: "meal_plan", label: "Étrendterv", icon: <Sparkles className="w-4 h-4" /> },
          { id: "my_foods", label: "Ételeim", icon: <Layers className="w-4 h-4" /> },
          { id: "targets", label: "Célok", icon: <Scale className="w-4 h-4" /> }
        ]}
      />


      {/* TAB 1: OVERVIEW & DIARY */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Energy & Macronutrient Cockpit Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card variant="surface" radius="20" className="p-6 space-y-6 lg:col-span-2">
              <div className="flex justify-between items-baseline">
                <div>
                  <h3 className="text-12 font-bold uppercase tracking-wider text-text-secondary">
                    {hideCalories ? "Napi tápanyagbevitel" : "Napi kalóriacél"}
                  </h3>
                  <span className="text-11 text-text-tertiary">
                    {currentTarget.goal === "maintain"
                      ? "Egyensúlyi fenntartás"
                      : currentTarget.goal === "lose"
                      ? "Fokozatos szálkásítás"
                      : currentTarget.goal === "gain"
                      ? "Izomépítés"
                      : "Teljesítmény-optimalizálás"}
                  </span>
                </div>
                {!hideCalories && (
                  <span className="text-28 font-bold text-text-primary tabular-nums">
                    {totalCalories} / {currentTarget.targetCalories} kcal
                  </span>
                )}
              </div>

              {/* Progress Bar (hidden or plate-based in hideCalories mode) */}
              {!hideCalories ? (
                <div className="w-full bg-bg-elevated rounded-full h-3 overflow-hidden border border-border-hairline">
                  <div
                    className="bg-brand h-3 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        (totalCalories / currentTarget.targetCalories) * 100
                      )}%`
                    }}
                  />
                </div>
              ) : (
                <div className="p-4 rounded-14 bg-bg-elevated border border-border-hairline space-y-2">
                  <span className="text-12 font-semibold text-text-primary block">
                    Tányérmódszeres megoszlás a mai napon:
                  </span>
                  <div className="flex h-3 rounded-full overflow-hidden w-full">
                    <div className="bg-brand w-2/5" title="Szénhidrát (40%)" />
                    <div className="bg-status-ready w-3/10" title="Fehérje (30%)" />
                    <div className="bg-status-caution w-3/10" title="Zöldség & Rost (30%)" />
                  </div>
                  <div className="flex justify-between text-11 text-text-secondary pt-1">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-brand" /> Szénhidrát (Glikogén)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-status-ready" /> Fehérje (Izomzat)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-status-caution" /> Zöldség & Rost
                    </span>
                  </div>
                </div>
              )}

              {/* Macronutrient & Caffeine Status Boxes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-center">
                <div className="rounded-16 bg-bg-elevated p-4 border border-border-hairline">
                  <span className="text-12 text-text-secondary font-medium block">
                    Fehérje
                  </span>
                  <span className="text-20 font-bold text-text-primary mt-1 block tabular-nums">
                    {totalProtein}g
                  </span>
                  <span className="text-11 text-text-tertiary">
                    Cél: {currentTarget.targetProteinGrams}g
                  </span>
                </div>
                <div className="rounded-16 bg-bg-elevated p-4 border border-border-hairline">
                  <span className="text-12 text-text-secondary font-medium block">
                    Szénhidrát
                  </span>
                  <span className="text-20 font-bold text-text-primary mt-1 block tabular-nums">
                    {totalCarbs}g
                  </span>
                  <span className="text-11 text-text-tertiary">
                    Cél: {currentTarget.targetCarbsGrams}g
                  </span>
                </div>
                <div className="rounded-16 bg-bg-elevated p-4 border border-border-hairline">
                  <span className="text-12 text-text-secondary font-medium block">
                    Zsír
                  </span>
                  <span className="text-20 font-bold text-text-primary mt-1 block tabular-nums">
                    {totalFat}g
                  </span>
                  <span className="text-11 text-text-tertiary">
                    Cél: {currentTarget.targetFatGrams}g
                  </span>
                </div>
                <div className="rounded-16 bg-bg-elevated p-4 border border-border-hairline">
                  <span className="text-12 text-text-secondary font-medium block">
                    Koffein (Italok)
                  </span>
                  <span className="text-20 font-bold text-amber-400 mt-1 block tabular-nums">
                    {caffeineMg} mg
                  </span>
                  <span className="text-11 text-text-tertiary">
                    Max: 400 mg (EFSA)
                  </span>
                </div>
              </div>
            </Card>

            {/* Beverage-Engine Driven Hydration Card */}
            <HydrationTrackerCard
              userId={user?.uid}
              date={selectedDate}
              targetLiters={currentTarget.targetHydrationLiters}
            />
          </div>

          {/* Session Fuelling Quick Card */}
          <div className="rounded-20 bg-bg-surface p-5 border border-border-hairline flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-14 bg-brand/10 text-brand flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-14 font-bold text-text-primary">
                    Mai edzés üzemanyag-stratégiája: {todayWorkoutFuelling.title}
                  </h4>
                  <Badge variant="brand" size="sm">
                    {todayWorkoutFuelling.duringSession.carbsPerHourGrams}g CHO/h
                  </Badge>
                </div>
                <p className="text-12 text-text-secondary mt-0.5">
                  Előtte: ~{todayWorkoutFuelling.preSession.carbsGrams}g szénhidrát • Utána: ~{todayWorkoutFuelling.postSession.proteinGrams}g fehérje + ~{todayWorkoutFuelling.postSession.carbsGrams}g visszatöltés.
                </p>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowFuellingModal(true)}
            >
              Részletes időzítés megtekintése
            </Button>
          </div>

          {/* Meals Diary List */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-16 font-bold text-text-primary">
                  Napi étkezések
                </h3>
                {currentPlannedDay && (
                  <p className="text-12 text-brand font-medium">
                    ✓ Étrendterv alkalmazva erre a napra ({currentPlannedDay.dayType ? (dayTypeLabels[currentPlannedDay.dayType] || currentPlannedDay.dayType) : ""})
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Sparkles className="w-3.5 h-3.5 text-brand" />}
                  onClick={() => setShowDayComposerFromNaplo(true)}
                >
                  Nap összeállítása
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Calendar className="w-3.5 h-3.5" />}
                  onClick={() => setShowWeekPlannerModal(true)}
                >
                  Hétterv
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<ShoppingCart className="w-3.5 h-3.5" />}
                  onClick={() => setShowShoppingModal(true)}
                >
                  Bevásárlólista
                </Button>
              </div>
            </div>

            {CANONICAL_MEAL_TYPES.map((mType) => {
              const meal = meals[mType] || createDefaultMeal(mType);
              const hasItems = Array.isArray(meal?.items) && meal.items.length > 0;
              const plannedSlot = currentPlannedDay?.slots?.find((s) => s.slotId === mType);
              const poolSlot = activeMealPlan?.slots?.find((s) => s.slotId === mType);
              const topPoolOptions = poolSlot?.options?.slice(0, 3) || [];

              return (
                <Card
                  key={mType}
                  variant="surface"
                  radius="20"
                  className="p-5 space-y-4 hover:border-border-subtle transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-14 font-bold text-text-primary">
                        {mealLabels[mType] || mType}
                      </span>
                      <span className="text-12 text-text-tertiary">
                        {meal?.time || "—"}
                      </span>
                      {meal?.dietitianComments && meal.dietitianComments.length > 0 && (
                        <Badge variant="ready" size="sm">
                          Dietetikusi megjegyzés
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {!hideCalories && (
                        <span className="text-14 font-bold text-text-primary tabular-nums">
                          {meal?.totalCalories ?? 0} kcal
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Plus className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setAddFoodMealType(mType);
                          setShowAddFoodModal(true);
                        }}
                      >
                        Étel hozzáadása
                      </Button>
                    </div>
                  </div>

                  {/* Planned meal selection from Étrendterv */}
                  {plannedSlot && plannedSlot.selectedOptions.length > 0 && (
                    <div className="p-3.5 rounded-14 bg-brand/5 border border-brand/20 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-brand">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span className="text-11 font-bold uppercase tracking-wider">
                            Tervezett étkezés (Étrendterv)
                          </span>
                        </div>
                        {plannedSlot.selectedOptions.every((o) => o.status === "consumed") ? (
                          <Badge variant="ready" size="sm">
                            Minden tervezett elem megevve ✓
                          </Badge>
                        ) : (
                          <span className="text-11 text-text-secondary">
                            1 koppintás a naplózáshoz
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        {plannedSlot.selectedOptions.map((sel) => {
                          const opt = sel.optionSnapshot;
                          const isConsumed = sel.status === "consumed";
                          const isReplaced = sel.status === "replaced";
                          const scaled = calculateOptionNutrients(
                            opt,
                            sel.portionMultiplier,
                            currentTarget.dayType
                          );

                          return (
                            <div
                              key={sel.optionId}
                              className={`p-3 rounded-12 border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
                                isConsumed
                                  ? "bg-status-ready/10 border-status-ready/30 opacity-75"
                                  : isReplaced
                                  ? "bg-bg-elevated/50 border-border-hairline opacity-60"
                                  : "bg-bg-surface border-border-hairline shadow-xs"
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-13 font-bold text-text-primary truncate">
                                    {opt.name}
                                  </span>
                                  <Badge variant="outline" size="sm">
                                    {sel.portionMultiplier}x adag
                                  </Badge>
                                  {isConsumed && (
                                    <Badge variant="ready" size="sm">
                                      Megetve ✓
                                    </Badge>
                                  )}
                                  {isReplaced && (
                                    <Badge variant="neutral" size="sm">
                                      Mást ettél
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-11 text-text-secondary mt-0.5">
                                  {!hideCalories && (
                                    <span className="font-medium text-text-primary">
                                      {scaled.calories} kcal •{" "}
                                    </span>
                                  )}
                                  F: {scaled.proteinGrams}g, Sz: {scaled.carbsGrams}g, Zs:{" "}
                                  {scaled.fatGrams}g
                                </div>
                              </div>

                              {!isConsumed && (
                                <div className="flex items-center gap-2 shrink-0">
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    leftIcon={<Check className="w-3.5 h-3.5" />}
                                    onClick={() => handleConsumePlannedOption(mType, sel)}
                                  >
                                    Megettem
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleReplacePlannedOption(mType, sel)}
                                  >
                                    Mást ettem
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Items inside this meal */}
                  {hasItems ? (
                    <div
                      onClick={() => setInspectingMeal(meal)}
                      className="space-y-1.5 cursor-pointer group"
                    >
                      {meal.items.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-12 bg-bg-elevated border border-border-hairline flex items-center justify-between group-hover:border-border-subtle transition-colors"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="text-13 font-semibold text-text-primary block truncate">
                              {item.name}
                            </span>
                            <div className="text-11 text-text-secondary mt-0.5">
                              {item.servingGrams}g {!hideCalories ? `• ${item.calories} kcal ` : ""}
                              (F: {item.proteinGrams}g, Sz: {item.carbsGrams}g, Zs: {item.fatGrams}g)
                            </div>
                          </div>
                          <div className="text-11 text-brand font-medium">
                            Részletek &raquo;
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    (!plannedSlot || plannedSlot.selectedOptions.length === 0) && (
                      <div className="p-4 rounded-12 bg-bg-elevated/40 border border-dashed border-border-hairline text-center text-12 text-text-secondary">
                        Még nem rögzítettél ételt ehhez az étkezéshez.
                      </div>
                    )
                  )}

                  {/* Quick-pick Pool chips from Étrendterv */}
                  {topPoolOptions.length > 0 && (
                    <div className="pt-2 border-t border-border-hairline space-y-1.5">
                      <span className="text-11 font-semibold text-text-tertiary uppercase tracking-wider block">
                        Gyors opciók az étrendtervből:
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {topPoolOptions.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleLogOptionOneTap(mType, opt, 1.0)}
                            className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-10 bg-bg-elevated hover:bg-brand/10 border border-border-hairline hover:border-brand/40 text-12 text-text-primary transition-all text-left"
                            title={`1 koppintásos naplózás: ${opt.name}`}
                          >
                            <Plus className="w-3.5 h-3.5 text-text-tertiary group-hover:text-brand" />
                            <span className="font-medium">{opt.name}</span>
                            {!hideCalories && opt.baseCalories && (
                              <span className="text-10 text-text-tertiary group-hover:text-brand tabular-nums">
                                ({opt.baseCalories} kcal)
                              </span>
                            )}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setAddFoodMealType(mType);
                            setShowAddFoodModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-10 bg-bg-surface hover:bg-bg-elevated border border-dashed border-border-hairline text-11 text-text-secondary hover:text-text-primary"
                        >
                          + Más étel
                        </button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: MEAL PLAN (ÉTRENDTERV) */}
      {activeTab === "meal_plan" && (
        <MealPlanEditor
          athleteId={user?.uid || "demo_athlete"}
          isDietitianMode={isDietitianMode}
          currentUserId={user?.uid || "demo_athlete"}
          currentUserName={user?.displayName || "Sportoló"}
          target={currentTarget}
          hideCalories={hideCalories}
        />
      )}

      {/* TAB 3: MY FOODS (ÉTELEIM) */}
      {activeTab === "my_foods" && (
        <MyFoodsTab athleteId={user?.uid || "demo_athlete"} />
      )}

      {/* TAB 4: TARGETS & COCKPIT */}
      {activeTab === "targets" && (
        <div className="space-y-6">
          <div className="rounded-20 bg-bg-surface p-6 border border-border-hairline space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-16 font-bold text-text-primary">
                  Napi célok és makrotápanyagok
                </h3>
                <p className="text-12 text-text-secondary">
                  Periodizált kalória- és fehérjecélok a testsúlyod és edzésintenzitásod alapján.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowTargetsModal(true)}
              >
                Célértékek módosítása
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-14 bg-bg-elevated border border-border-hairline">
                <span className="text-11 text-text-secondary font-medium block">Napi kalória</span>
                <span className="text-22 font-bold text-text-primary mt-1 block tabular-nums">
                  {currentTarget.targetCalories} kcal
                </span>
                <span className="text-10 text-text-tertiary">
                  Alapanyagcsere + edzésigény
                </span>
              </div>
              <div className="p-4 rounded-14 bg-bg-elevated border border-border-hairline">
                <span className="text-11 text-text-secondary font-medium block">Fehérje</span>
                <span className="text-22 font-bold text-text-primary mt-1 block tabular-nums">
                  {currentTarget.targetProteinGrams}g
                </span>
                <span className="text-10 text-text-tertiary">
                  ~{(currentTarget.targetProteinGrams / (user?.weightKg || 70)).toFixed(1)} g/ttkg
                </span>
              </div>
              <div className="p-4 rounded-14 bg-bg-elevated border border-border-hairline">
                <span className="text-11 text-text-secondary font-medium block">Szénhidrát</span>
                <span className="text-22 font-bold text-text-primary mt-1 block tabular-nums">
                  {currentTarget.targetCarbsGrams}g
                </span>
                <span className="text-10 text-text-tertiary">
                  Naptípustól függő glikogéntöltés
                </span>
              </div>
              <div className="p-4 rounded-14 bg-bg-elevated border border-border-hairline">
                <span className="text-11 text-text-secondary font-medium block">Zsír</span>
                <span className="text-22 font-bold text-text-primary mt-1 block tabular-nums">
                  {currentTarget.targetFatGrams}g
                </span>
                <span className="text-10 text-text-tertiary">
                  Esszenciális zsírsavak
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SupplementsTab />
            <BodyMetricsTab />
          </div>
        </div>
      )}

      {/* FALLBACK OLD TABS */}
      {activeTab === "supplements" && <SupplementsTab />}
      {activeTab === "body_metrics" && <BodyMetricsTab />}

      {/* MODALS */}
      <AddFoodModal
        isOpen={showAddFoodModal}
        onClose={() => setShowAddFoodModal(false)}
        defaultMealType={addFoodMealType}
        onAddFood={handleAddFoodItem}
      />

      <MealDetailModal
        isOpen={!!inspectingMeal}
        onClose={() => setInspectingMeal(null)}
        meal={inspectingMeal}
        onDeleteItem={handleDeleteItem}
        onAddDietitianComment={handleAddDietitianComment}
        isDietitianView={isDietitianMode}
      />

      <NutritionTargetsModal
        isOpen={showTargetsModal}
        onClose={() => setShowTargetsModal(false)}
        currentTarget={currentTarget}
        onSaveTarget={(newTarget) => setCurrentTarget(newTarget)}
        isDietitian={isDietitianMode}
        dietitianName="Dr. Kovács Anna"
      />

      <SessionFuellingModal
        isOpen={showFuellingModal}
        onClose={() => setShowFuellingModal(false)}
        fuellingPlan={todayWorkoutFuelling}
      />

      <DietitianPlanModal
        isOpen={showDietitianPlanModal}
        onClose={() => setShowDietitianPlanModal(false)}
        onSavePlan={(plan) => setActivePlan(plan)}
        dietitianName="Dr. Kovács Anna (Sportdietetikus)"
      />

      {showDayComposerFromNaplo && (
        <DayComposerModal
          isOpen={showDayComposerFromNaplo}
          onClose={() => setShowDayComposerFromNaplo(false)}
          athleteId={user?.uid || "demo_athlete"}
          date={selectedDate}
          plan={activeMealPlan || generateStarterMealPlan(user?.uid || "demo_athlete", user?.displayName || "Sportoló", "athlete")}
          target={currentTarget}
          onApplied={() => {
            if (user?.uid) {
              getPlannedDay(user.uid, selectedDate).then(setCurrentPlannedDay);
            }
          }}
          hideCalories={hideCalories}
        />
      )}

      {showWeekPlannerModal && (
        <WeekPlannerModal
          isOpen={showWeekPlannerModal}
          onClose={() => setShowWeekPlannerModal(false)}
          athleteId={user?.uid || "demo_athlete"}
          plan={activeMealPlan || generateStarterMealPlan(user?.uid || "demo_athlete", user?.displayName || "Sportoló", "athlete")}
          target={currentTarget}
          hideCalories={hideCalories}
        />
      )}

      {showShoppingModal && (
        <ShoppingListModal
          isOpen={showShoppingModal}
          onClose={() => setShowShoppingModal(false)}
          athleteId={user?.uid || "demo_athlete"}
        />
      )}
    </div>
  );
};

export default NutritionPage;
