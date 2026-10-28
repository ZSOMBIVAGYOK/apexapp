import React, { useState, useEffect } from "react";
import { BottomSheet, Button, showToast } from "@shared/ui";
import {
  MealPlanDocument,
  PlannedDayDocument
} from "@shared/types/mealPlan";
import { DailyNutritionTarget, NutritionDayType } from "@shared/types/nutrition";
import {
  savePlannedDay,
  getPlannedDaysRange
} from "@shared/lib/repositories/plannedDayRepository";
import { suggestDayMeals } from "@shared/lib/nutrition/mealPlanEngine";
import {
  startOfWeek,
  endOfWeek,
  addDays,
  format
} from "date-fns";
import { hu } from "date-fns/locale";
import {
  Lock,
  Unlock,
  Sparkles,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Edit2
} from "lucide-react";
import { DayComposerModal } from "./DayComposerModal";
import { ShoppingListModal } from "./ShoppingListModal";

interface WeekPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: MealPlanDocument;
  athleteId: string;
  target: DailyNutritionTarget;
  userAllergies?: string[];
  hideCalories?: boolean;
}

export const WeekPlannerModal: React.FC<WeekPlannerModalProps> = ({
  isOpen,
  onClose,
  plan,
  athleteId,
  target,
  userAllergies = [],
  hideCalories = false
}) => {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const [weekDays, setWeekDays] = useState<
    Array<{
      date: string;
      dayName: string;
      formattedDate: string;
      plannedDay: PlannedDayDocument | null;
      isLocked: boolean;
      dayType: NutritionDayType;
    }>
  >([]);

  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [showShoppingList, setShowShoppingList] = useState(false);

  const loadWeekData = async () => {
    if (!athleteId) return;
    const startStr = format(currentWeekStart, "yyyy-MM-dd");
    const endStr = format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), "yyyy-MM-dd");

    const days = await getPlannedDaysRange(athleteId, startStr, endStr);
    const dayMap = new Map(days.map((d) => [d.date, d]));

    const daysList = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(currentWeekStart, i);
      const dateStr = format(d, "yyyy-MM-dd");
      const planned = dayMap.get(dateStr) || null;

      // Guess day type: if planned has dayType use it, otherwise default moderate/rest on weekend
      const defaultDt: NutritionDayType = i === 6 ? "rest" : i === 2 || i === 4 ? "hard" : "moderate";
      const dt = planned?.dayType || defaultDt;

      daysList.push({
        date: dateStr,
        dayName: format(d, "EEEE", { locale: hu }),
        formattedDate: format(d, "MM.dd"),
        plannedDay: planned,
        isLocked: planned?.isLocked || false,
        dayType: dt
      });
    }

    setWeekDays(daysList);
  };

  useEffect(() => {
    if (isOpen) {
      loadWeekData();
    }
  }, [isOpen, athleteId, currentWeekStart]);

  const toggleLock = async (index: number) => {
    const dayItem = weekDays[index]!;
    const newLock = !dayItem.isLocked;

    if (dayItem.plannedDay) {
      const updated: PlannedDayDocument = {
        ...dayItem.plannedDay,
        isLocked: newLock
      };
      await savePlannedDay(athleteId, updated);
    }

    const updatedList = [...weekDays];
    updatedList[index] = { ...dayItem, isLocked: newLock };
    setWeekDays(updatedList);
  };

  const handleAutoFillWeek = async () => {
    let recentOptionIds: string[][] = [];

    for (let i = 0; i < weekDays.length; i++) {
      const dayItem = weekDays[i]!;
      if (dayItem.isLocked && dayItem.plannedDay) {
        // Collect locked options into recent list
        const lockedIds = dayItem.plannedDay.slots.flatMap((s) => s.selectedOptions.map((o) => o.optionId));
        recentOptionIds.push(lockedIds);
        if (recentOptionIds.length > 2) recentOptionIds.shift();
        continue;
      }

      // Generate deterministic suggestion matching dayType
      const suggestion = suggestDayMeals(plan, target, recentOptionIds, dayItem.dayType, i * 17);

      const plannedDayDoc: PlannedDayDocument = {
        date: dayItem.date,
        athleteId,
        planId: plan.id,
        dayType: dayItem.dayType,
        slots: suggestion.slots,
        totalCalories: suggestion.totalCalories,
        totalProteinGrams: suggestion.totalProteinGrams,
        totalCarbsGrams: suggestion.totalCarbsGrams,
        totalFatGrams: suggestion.totalFatGrams,
        isLocked: false,
        schemaVersion: 1,
        source: "manual",
        confidence: 1.0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: athleteId
      };

      await savePlannedDay(athleteId, plannedDayDoc);

      const generatedIds = suggestion.slots.flatMap((s) => s.selectedOptions.map((o) => o.optionId));
      recentOptionIds.push(generatedIds);
      if (recentOptionIds.length > 2) recentOptionIds.shift();
    }

    showToast({
      title: "Hétterv kész",
      message: "Hét sikeresen kitöltve változatos, edzésterheléshez illeszkedő étrenddel!",
      variant: "success"
    });
    loadWeekData();
  };

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={onClose} title="Hétterv & Automatikus Étrend Kitöltés">
        <div className="space-y-5 pb-6 text-text-primary">
          {/* Week Navigation Header */}
          <div className="flex items-center justify-between p-3 bg-bg-surface rounded-14 border border-border-hairline">
            <button
              type="button"
              onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}
              className="p-1.5 text-text-secondary hover:text-text-primary transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <span className="text-13 font-bold block">
                {format(currentWeekStart, "yyyy. MMMM d.", { locale: hu })} -{" "}
                {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), "d.", { locale: hu })}
              </span>
              <span className="text-11 text-text-secondary">
                Periodizált heti étrendtervezés
              </span>
            </div>
            <button
              type="button"
              onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
              className="p-1.5 text-text-secondary hover:text-text-primary transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Sparkles className="w-4 h-4" />}
              onClick={handleAutoFillWeek}
              className="flex-1 sm:flex-none"
            >
              Hét automatikus kitöltése
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<ShoppingCart className="w-4 h-4" />}
              onClick={() => setShowShoppingList(true)}
              className="flex-1 sm:flex-none"
            >
              Heti bevásárlólista
            </Button>
          </div>

          {/* 7 Days List */}
          <div className="space-y-2.5">
            {weekDays.map((d, idx) => {
              const optionsSummary = d.plannedDay?.slots
                ?.flatMap((s) => s.selectedOptions.map((o) => o.optionSnapshot.name))
                .slice(0, 3)
                .join(" • ");

              return (
                <div
                  key={d.date}
                  className={`p-3.5 rounded-14 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    d.plannedDay
                      ? "bg-bg-surface border-border-hairline"
                      : "bg-bg-surface/50 border-dashed border-border-hairline"
                  }`}
                >
                  {/* Left Column: Date and DayType */}
                  <div className="min-w-36">
                    <div className="flex items-center gap-2">
                      <span className="text-14 font-bold text-text-primary capitalize">
                        {d.dayName}
                      </span>
                      <span className="text-11 text-text-tertiary">
                        {d.formattedDate}
                      </span>
                    </div>
                    <span className="text-10 font-bold px-1.5 py-0.5 rounded-full bg-brand/10 text-brand inline-block mt-0.5">
                      {d.dayType === "hard"
                        ? "Kemény edzésnap"
                        : d.dayType === "rest"
                        ? "Pihenőnap"
                        : d.dayType === "competition"
                        ? "Versenynap"
                        : "Közepes nap"}
                    </span>
                  </div>

                  {/* Middle Column: Summary of meals */}
                  <div className="flex-1 min-w-0">
                    {d.plannedDay ? (
                      <div className="space-y-0.5">
                        <span className="text-12 text-text-secondary block truncate">
                          {optionsSummary || "Ételek összeállítva"}
                        </span>
                        {!hideCalories && (
                          <span className="text-11 font-bold text-text-primary tabular-nums block">
                            {d.plannedDay.totalCalories} kcal • F: {d.plannedDay.totalProteinGrams}g • SZ: {d.plannedDay.totalCarbsGrams}g
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-11 text-text-tertiary italic">
                        Még nincs étrend ehhez a naphoz
                      </span>
                    )}
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => toggleLock(idx)}
                      title={d.isLocked ? "Zárolva (az automata generálás nem írja felül)" : "Nyitott"}
                      className={`p-2 rounded-10 border transition-colors ${
                        d.isLocked
                          ? "bg-brand text-white border-brand shadow-sm"
                          : "bg-bg-elevated text-text-tertiary border-border-hairline hover:text-text-primary"
                      }`}
                    >
                      {d.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                    <Button
                      size="sm"
                      variant="ghost"
                      leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                      onClick={() => setEditingDate(d.date)}
                    >
                      Szerkesztés
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </BottomSheet>

      {/* Embedded Day Composer when editing a specific day */}
      {editingDate && (
        <DayComposerModal
          isOpen={true}
          onClose={() => {
            setEditingDate(null);
            loadWeekData();
          }}
          plan={plan}
          target={target}
          athleteId={athleteId}
          date={editingDate}
          onApplied={() => {
            setEditingDate(null);
            loadWeekData();
          }}
          userAllergies={userAllergies}
          hideCalories={hideCalories}
        />
      )}

      {/* Shopping List Modal */}
      {showShoppingList && (
        <ShoppingListModal
          isOpen={true}
          onClose={() => setShowShoppingList(false)}
          athleteId={athleteId}
          currentDate={format(currentWeekStart, "yyyy-MM-dd")}
        />
      )}
    </>
  );
};
