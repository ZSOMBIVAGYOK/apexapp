import React, { useState, useEffect } from "react";
import {
  Button,
  showToast
} from "@shared/ui";
import {
  MealPlanDocument,
  MealPlanOption,
  MealPlanSlot
} from "@shared/types/mealPlan";
import { DailyNutritionTarget } from "@shared/types/nutrition";
import {
  getMealPlans,
  saveMealPlan,
  duplicateMealPlan,
  archiveMealPlan
} from "@shared/lib/repositories/mealPlanRepository";
import { generateStarterMealPlan } from "@shared/lib/nutrition/mealPlanEngine";
import {
  Sparkles,
  Plus,
  Calendar,
  ShoppingCart,
  UserCheck,
  Edit2,
  Trash2,
  Copy,
  Archive,
  ArrowUp,
  ArrowDown,
  Info,
  Utensils
} from "lucide-react";
import { OptionEditModal } from "./OptionEditModal";
import { DayComposerModal } from "./DayComposerModal";
import { WeekPlannerModal } from "./WeekPlannerModal";
import { ShoppingListModal } from "./ShoppingListModal";

interface MealPlanEditorProps {
  athleteId: string;
  isDietitianMode: boolean;
  currentUserId: string;
  currentUserName: string;
  target: DailyNutritionTarget;
  userAllergies?: string[];
  hideCalories?: boolean;
}

export const MealPlanEditor: React.FC<MealPlanEditorProps> = ({
  athleteId,
  isDietitianMode,
  currentUserId,
  currentUserName,
  target,
  userAllergies = [],
  hideCalories = false
}) => {
  const [plans, setPlans] = useState<MealPlanDocument[]>([]);
  const [activePlan, setActivePlan] = useState<MealPlanDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [optionModalSlot, setOptionModalSlot] = useState<MealPlanSlot | null>(null);
  const [editingOption, setEditingOption] = useState<MealPlanOption | null>(null);
  const [showDayComposer, setShowDayComposer] = useState(false);
  const [showWeekPlanner, setShowWeekPlanner] = useState(false);
  const [showShoppingList, setShowShoppingList] = useState(false);

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const all = await getMealPlans(athleteId);
      setPlans(all);
      const active = all.find((p) => p.isActive) || all[0] || null;
      setActivePlan(active);
    } catch (err) {
      console.warn("Failed loading meal plans:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (athleteId) loadPlans();
  }, [athleteId]);

  const handleCreateStarterPlan = async () => {
    const starter = generateStarterMealPlan(
      athleteId,
      currentUserName,
      isDietitianMode ? "dietitian" : "athlete"
    );
    await saveMealPlan(athleteId, starter);
    showToast({ title: "Új étrendterv", message: "Új étrendterv létrehozva!", variant: "success" });
    loadPlans();
  };

  const handleSaveOption = async (option: MealPlanOption) => {
    if (!activePlan || !optionModalSlot) return;

    const updatedSlots = activePlan.slots.map((slot) => {
      if (slot.slotId !== optionModalSlot.slotId) return slot;

      const existingIndex = slot.options.findIndex((o) => o.id === option.id);
      let updatedOptions: MealPlanOption[];
      if (existingIndex >= 0) {
        updatedOptions = [...slot.options];
        updatedOptions[existingIndex] = option;
      } else {
        updatedOptions = [...slot.options, option];
      }
      return { ...slot, options: updatedOptions };
    });

    const updatedPlan: MealPlanDocument = {
      ...activePlan,
      slots: updatedSlots
    };

    await saveMealPlan(athleteId, updatedPlan);
    setActivePlan(updatedPlan);
    showToast({ title: "Sikeres mentés", message: "Opció elmentve!", variant: "success" });
  };

  const handleDeleteOption = async (slotId: string, optionId: string) => {
    if (!activePlan) return;

    const updatedSlots = activePlan.slots.map((slot) => {
      if (slot.slotId !== slotId) return slot;
      return {
        ...slot,
        options: slot.options.filter((o) => o.id !== optionId)
      };
    });

    const updatedPlan: MealPlanDocument = {
      ...activePlan,
      slots: updatedSlots
    };

    await saveMealPlan(athleteId, updatedPlan);
    setActivePlan(updatedPlan);
    showToast({ title: "Opció törölve", message: "Opció eltávolítva.", variant: "info" });
  };

  const handleMoveOption = async (slotId: string, optionIndex: number, direction: "up" | "down") => {
    if (!activePlan) return;

    const updatedSlots = activePlan.slots.map((slot) => {
      if (slot.slotId !== slotId) return slot;
      const options = [...slot.options];
      const targetIndex = direction === "up" ? optionIndex - 1 : optionIndex + 1;
      if (targetIndex < 0 || targetIndex >= options.length) return slot;

      const temp = options[optionIndex]!;
      options[optionIndex] = options[targetIndex]!;
      options[targetIndex] = temp;
      return { ...slot, options };
    });

    const updatedPlan: MealPlanDocument = { ...activePlan, slots: updatedSlots };
    await saveMealPlan(athleteId, updatedPlan);
    setActivePlan(updatedPlan);
  };

  const handleDuplicatePlan = async () => {
    if (!activePlan) return;
    const cloned = await duplicateMealPlan(athleteId, activePlan.id);
    if (cloned) {
      showToast({ title: "Másolás", message: "Étrendterv lemásolva!", variant: "success" });
      loadPlans();
    }
  };

  const handleArchivePlan = async () => {
    if (!activePlan) return;
    await archiveMealPlan(athleteId, activePlan.id);
    showToast({ title: "Archiválás", message: "Étrendterv archiválva.", variant: "info" });
    loadPlans();
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-text-tertiary text-14">
        Étrendtervek betöltése...
      </div>
    );
  }

  // Empty state if no meal plans exist
  if (!activePlan || plans.length === 0) {
    return (
      <div className="p-8 md:p-12 bg-bg-surface rounded-20 border border-border-hairline text-center space-y-5 max-w-xl mx-auto my-8">
        <div className="w-14 h-14 rounded-full bg-brand/10 text-brand flex items-center justify-center mx-auto">
          <Utensils className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h3 className="text-18 font-bold text-text-primary">
            Még nincs aktív étrendterved
          </h3>
          <p className="text-13 text-text-secondary leading-relaxed">
            A sportdietetikusok nem egy merev napot írnak elő, hanem 4-5 variálható opciót adnak étkezésenként (Reggeli, Ebéd, Vacsora), amit kedvedre kombinálhatsz az edzésterhelésedhez.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={handleCreateStarterPlan}
          className="mx-auto"
        >
          Étrendterv létrehozása
        </Button>
      </div>
    );
  }

  const isDietitianAuthored = activePlan.authorRole === "dietitian";
  const canEditDietitianOptions = isDietitianMode;

  return (
    <div className="space-y-6">
      {/* Plan Header Card */}
      <div className="p-5 bg-bg-surface rounded-20 border border-border-hairline space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-18 font-bold text-text-primary">
                {activePlan.title}
              </h2>
              <span className="text-11 font-bold px-2 py-0.5 rounded-full bg-status-ready/15 text-status-ready border border-status-ready/30">
                Aktív terv
              </span>
            </div>

            {/* Author Attribution */}
            <div className="flex items-center gap-2 text-12 text-text-secondary">
              {isDietitianAuthored ? (
                <div className="flex items-center gap-1.5 text-brand font-semibold">
                  <UserCheck className="w-4 h-4" />
                  <span>Dietetikus: {activePlan.authorName}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-text-secondary font-medium">
                  <Utensils className="w-4 h-4" />
                  <span>Saját étrendterv</span>
                </div>
              )}
              {activePlan.targetCalories && !hideCalories && (
                <span>
                  • Napi cél: {activePlan.targetCalories.min} - {activePlan.targetCalories.max} kcal
                </span>
              )}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Sparkles className="w-4 h-4" />}
              onClick={() => setShowDayComposer(true)}
            >
              Nap összeállítása
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Calendar className="w-4 h-4" />}
              onClick={() => setShowWeekPlanner(true)}
            >
              Hétterv
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<ShoppingCart className="w-4 h-4" />}
              onClick={() => setShowShoppingList(true)}
            >
              Bevásárlólista
            </Button>

            {/* Plan duplicate/archive */}
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Copy className="w-3.5 h-3.5" />}
              onClick={handleDuplicatePlan}
              title="Terv másolása"
            >
              Másolat
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Archive className="w-3.5 h-3.5" />}
              onClick={handleArchivePlan}
              title="Terv archiválása"
            >
              Archiválás
            </Button>
          </div>
        </div>

        {/* Protection Notice for Athlete viewing Dietitian Plan */}
        {isDietitianAuthored && !canEditDietitianOptions && (
          <div className="p-3 bg-brand/10 border border-brand/20 rounded-12 flex items-start gap-2.5 text-12 text-text-secondary">
            <Info className="w-4 h-4 text-brand shrink-0 mt-0.5" />
            <span>
              Ezt az étrendtervet a dietetikusod készítette. A szakember opciói védettek, de a <strong>„+ Opció”</strong> gombbal bármikor hozzáadhatsz saját ételeket is az étkezési idősávokhoz!
            </span>
          </div>
        )}
      </div>

      {/* Slots and Pool Grid */}
      <div className="space-y-6">
        {activePlan.slots.map((slot) => {
          return (
            <div
              key={slot.slotId}
              className="p-5 bg-bg-surface rounded-20 border border-border-hairline space-y-4"
            >
              {/* Slot Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-16 font-bold text-text-primary flex items-center gap-2">
                    {slot.name}
                    <span className="text-11 font-normal text-text-tertiary">
                      ({slot.options.length} opció a medencében)
                    </span>
                  </h3>
                  {slot.targetCaloriesRange && !hideCalories && (
                    <span className="text-11 text-text-secondary">
                      Cél: {slot.targetCaloriesRange.min} - {slot.targetCaloriesRange.max} kcal
                    </span>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setOptionModalSlot(slot);
                    setEditingOption(null);
                  }}
                >
                  + Opció
                </Button>
              </div>

              {/* Options Grid */}
              {slot.options.length === 0 ? (
                <div className="py-6 text-center text-text-tertiary text-12 italic border border-dashed border-border-hairline rounded-14">
                  Még nincsenek opciók felvéve ehhez az étkezéshez. Kattints a „+ Opció” gombra!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {slot.options.map((option, optIdx) => {
                    const isDietitianOption = option.authorRole === "dietitian";
                    const isProtected = isDietitianOption && !canEditDietitianOptions;

                    return (
                      <div
                        key={option.id}
                        className="p-4 bg-bg-elevated rounded-14 border border-border-hairline flex flex-col justify-between space-y-3 relative group"
                      >
                        <div className="space-y-2">
                          {/* Option Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-14 font-bold text-text-primary block">
                                {option.name}
                              </span>
                              {option.label && (
                                <span className="text-11 text-text-secondary block">
                                  {option.label}
                                </span>
                              )}
                            </div>

                            <span
                              className={`text-10 font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                                isDietitianOption
                                  ? "bg-brand/15 text-brand"
                                  : "bg-bg-surface text-text-secondary border border-border-hairline"
                              }`}
                            >
                              {isDietitianOption ? "Dietetikus" : "Saját"}
                            </span>
                          </div>

                          {/* Base Macros */}
                          <div className="text-12 font-bold text-text-primary tabular-nums flex items-center gap-3">
                            {!hideCalories && (
                              <span>{option.baseCalories} kcal</span>
                            )}
                            <span className="text-brand">F: {option.baseProteinGrams}g</span>
                            <span className="text-status-ready">SZ: {option.baseCarbsGrams}g</span>
                            <span className="text-text-secondary">ZS: {option.baseFatGrams}g</span>
                          </div>

                          {/* Tags */}
                          {option.tags && option.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {option.tags.map((t) => (
                                <span
                                  key={t}
                                  className="text-10 px-1.5 py-0.5 bg-bg-surface rounded-6 text-text-tertiary"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Usage Count if in Dietitian Mode */}
                          {isDietitianMode && option.usageCount !== undefined && (
                            <span className="text-10 text-brand font-semibold block">
                              Sportoló választási gyakorisága: {option.usageCount}x
                            </span>
                          )}

                          {/* Notes */}
                          {option.notes && (
                            <p className="text-11 text-text-tertiary italic line-clamp-2">
                              „{option.notes}”
                            </p>
                          )}
                        </div>

                        {/* Card Footer: Reorder & Edit actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-border-hairline text-text-tertiary">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={optIdx === 0}
                              onClick={() => handleMoveOption(slot.slotId, optIdx, "up")}
                              className="p-1 hover:text-text-primary disabled:opacity-30"
                              title="Mozgatás fel"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={optIdx === slot.options.length - 1}
                              onClick={() => handleMoveOption(slot.slotId, optIdx, "down")}
                              className="p-1 hover:text-text-primary disabled:opacity-30"
                              title="Mozgatás le"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            {!isProtected && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOptionModalSlot(slot);
                                    setEditingOption(option);
                                  }}
                                  className="p-1 hover:text-brand"
                                  title="Szerkesztés"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteOption(slot.slotId, option.id)}
                                  className="p-1 hover:text-status-rest"
                                  title="Törlés"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Option Edit / Create Modal */}
      {optionModalSlot && (
        <OptionEditModal
          isOpen={true}
          onClose={() => {
            setOptionModalSlot(null);
            setEditingOption(null);
          }}
          onSave={handleSaveOption}
          initialOption={editingOption}
          slotName={optionModalSlot.name}
          isDietitian={isDietitianMode}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
        />
      )}

      {/* Day Composer Sheet */}
      {showDayComposer && (
        <DayComposerModal
          isOpen={true}
          onClose={() => setShowDayComposer(false)}
          plan={activePlan}
          target={target}
          athleteId={athleteId}
          date={target.date || new Date().toISOString().split("T")[0]!}
          onApplied={() => {
            setShowDayComposer(false);
            loadPlans();
          }}
          userAllergies={userAllergies}
          hideCalories={hideCalories}
        />
      )}

      {/* Week Planner Sheet */}
      {showWeekPlanner && (
        <WeekPlannerModal
          isOpen={true}
          onClose={() => setShowWeekPlanner(false)}
          plan={activePlan}
          athleteId={athleteId}
          target={target}
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
          currentDate={target.date}
        />
      )}
    </div>
  );
};
