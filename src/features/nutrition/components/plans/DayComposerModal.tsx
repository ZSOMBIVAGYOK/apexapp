import React, { useState, useEffect } from "react";
import {
  BottomSheet,
  Button,
  Chip,
  showToast
} from "@shared/ui";
import {
  MealPlanDocument,
  MealPlanOption,
  PlannedDayDocument,
  PlannedDaySlot,
  PlannedDayOptionSelection,
  DayTemplateDocument
} from "@shared/types/mealPlan";
import { DailyNutritionTarget, NutritionDayType } from "@shared/types/nutrition";
import {
  calculateOptionNutrients,
  checkOptionAllergens,
  suggestDayMeals
} from "@shared/lib/nutrition/mealPlanEngine";
import {
  getPlannedDay,
  savePlannedDay
} from "@shared/lib/repositories/plannedDayRepository";
import {
  getDayTemplates,
  saveDayTemplate
} from "@shared/lib/repositories/dayTemplateRepository";
import {
  Sparkles,
  RotateCcw,
  Bookmark,
  Check,
  AlertTriangle,
  Info,
  FolderOpen
} from "lucide-react";

interface DayComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: MealPlanDocument;
  target: DailyNutritionTarget;
  athleteId: string;
  date: string;
  onApplied: () => void;
  userAllergies?: string[];
  hideCalories?: boolean;
}

const DAY_TYPES: { id: NutritionDayType; label: string }[] = [
  { id: "rest", label: "Pihenő" },
  { id: "light", label: "Könnyű" },
  { id: "moderate", label: "Közepes" },
  { id: "hard", label: "Kemény" },
  { id: "competition", label: "Verseny" }
];

export const DayComposerModal: React.FC<DayComposerModalProps> = ({
  isOpen,
  onClose,
  plan,
  target,
  athleteId,
  date,
  onApplied,
  userAllergies = [],
  hideCalories = false
}) => {
  const [dayType, setDayType] = useState<NutritionDayType>(target.dayType || "moderate");
  const [selectedSlotOptions, setSelectedSlotOptions] = useState<
    Record<string, { option: MealPlanOption; portion: number }[]>
  >({});

  const [seed, setSeed] = useState(0);
  const [allergenWarningOption, setAllergenWarningOption] = useState<{
    option: MealPlanOption;
    slotId: string;
    allergens: string[];
  } | null>(null);

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [existingTemplates, setExistingTemplates] = useState<DayTemplateDocument[]>([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  // Load existing planned day or initialize empty
  useEffect(() => {
    if (!isOpen || !athleteId) return;

    getPlannedDay(athleteId, date).then((existing) => {
      if (existing && existing.slots) {
        if (existing.dayType) setDayType(existing.dayType);
        const map: Record<string, { option: MealPlanOption; portion: number }[]> = {};
        for (const slot of existing.slots) {
          map[slot.slotId] = (slot.selectedOptions || []).map((s) => ({
            option: s.optionSnapshot,
            portion: s.portionMultiplier
          }));
        }
        setSelectedSlotOptions(map);
      } else {
        setSelectedSlotOptions({});
      }
    });

    getDayTemplates(athleteId).then(setExistingTemplates);
  }, [isOpen, athleteId, date]);

  // Compute live day totals
  const totals = React.useMemo(() => {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;

    for (const options of Object.values(selectedSlotOptions)) {
      for (const item of options) {
        const nutrients = calculateOptionNutrients(item.option, item.portion, dayType);
        calories += nutrients.calories;
        protein += nutrients.proteinGrams;
        carbs += nutrients.carbsGrams;
        fat += nutrients.fatGrams;
      }
    }

    return {
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10
    };
  }, [selectedSlotOptions, dayType]);

  // Compute Plain Language Hint
  const hintText = React.useMemo(() => {
    const targetC = target.targetCarbsGrams || 350;
    const targetP = target.targetProteinGrams || 150;
    const targetKcal = target.targetCalories || 2600;

    const diffCarbs = targetC - totals.carbs;
    const diffProtein = targetP - totals.protein;
    const diffKcal = targetKcal - totals.calories;

    if (diffCarbs > 35) {
      return `kb. ${Math.round(diffCarbs)} g szénhidrát hiányzik a naphoz: válassz egy energiadúsabb köretet, banánt vagy zabkását!`;
    }
    if (diffProtein > 20) {
      return `kb. ${Math.round(diffProtein)} g fehérje hiányzik az izomregenerációhoz: növeld az adagot vagy válassz tejsavófehérjét!`;
    }
    if (diffKcal < -300) {
      return "A tervezett nap kissé meghaladja a célértéket; csökkentheted a porciót, ha könnyebb napra készülsz.";
    }
    if (Math.abs(diffKcal) <= 150) {
      return "Kiváló egyensúly! A kiválasztott ételek szinte tökéletesen lefedik a napi energiaszükségletedet.";
    }
    return "Válassz opciókat az étkezési idősávokból, vagy kérj egy automatikus javaslatot!";
  }, [totals, target]);

  const handleToggleOption = (slotId: string, option: MealPlanOption) => {
    const currentList = selectedSlotOptions[slotId] || [];
    const isSelected = currentList.some((i) => i.option.id === option.id);

    if (isSelected) {
      setSelectedSlotOptions({
        ...selectedSlotOptions,
        [slotId]: currentList.filter((i) => i.option.id !== option.id)
      });
    } else {
      // Check allergens first
      const allergenCheck = checkOptionAllergens(option, userAllergies);
      if (allergenCheck.hasWarning) {
        setAllergenWarningOption({
          option,
          slotId,
          allergens: allergenCheck.matchedAllergens
        });
        return;
      }

      applyOptionSelection(slotId, option);
    }
  };

  const applyOptionSelection = (slotId: string, option: MealPlanOption) => {
    const currentList = selectedSlotOptions[slotId] || [];
    const initialPortion = option.defaultPortionMultiplier || 1.0;
    setSelectedSlotOptions({
      ...selectedSlotOptions,
      [slotId]: [...currentList, { option, portion: initialPortion }]
    });
  };

  const handlePortionChange = (slotId: string, optionId: string, portion: number) => {
    const currentList = selectedSlotOptions[slotId] || [];
    const updated = currentList.map((i) =>
      i.option.id === optionId ? { ...i, portion: Math.round(portion * 10) / 10 } : i
    );
    setSelectedSlotOptions({
      ...selectedSlotOptions,
      [slotId]: updated
    });
  };

  const handleSuggest = (incrementSeed = false) => {
    const currentSeed = incrementSeed ? seed + 1 : seed;
    if (incrementSeed) setSeed(currentSeed);

    const suggestion = suggestDayMeals(plan, target, [], dayType, currentSeed);
    const map: Record<string, { option: MealPlanOption; portion: number }[]> = {};

    for (const slot of suggestion.slots) {
      map[slot.slotId] = slot.selectedOptions.map((s) => ({
        option: s.optionSnapshot,
        portion: s.portionMultiplier
      }));
    }

    setSelectedSlotOptions(map);
    showToast({
      title: "Javaslat",
      message: incrementSeed ? "Új javaslat betöltve!" : "Javasolt nap összeállítva a céljaidhoz!",
      variant: "success"
    });
  };

  const handleApply = async () => {
    const slots: PlannedDaySlot[] = [];

    for (const slot of plan.slots) {
      const selected = selectedSlotOptions[slot.slotId] || [];
      const optionsSelections: PlannedDayOptionSelection[] = selected.map((item) => {
        const nutrients = calculateOptionNutrients(item.option, item.portion, dayType);
        return {
          optionId: item.option.id,
          optionSnapshot: item.option,
          portionMultiplier: item.portion,
          effectiveCalories: nutrients.calories,
          effectiveProteinGrams: nutrients.proteinGrams,
          effectiveCarbsGrams: nutrients.carbsGrams,
          effectiveFatGrams: nutrients.fatGrams,
          status: "planned"
        };
      });

      slots.push({
        slotId: slot.slotId,
        slotName: slot.name,
        selectedOptions: optionsSelections
      });
    }

    const plannedDay: PlannedDayDocument = {
      date,
      athleteId,
      planId: plan.id,
      dayType,
      slots,
      totalCalories: totals.calories,
      totalProteinGrams: totals.protein,
      totalCarbsGrams: totals.carbs,
      totalFatGrams: totals.fat,
      schemaVersion: 1,
      source: "manual",
      confidence: 1.0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: athleteId
    };

    await savePlannedDay(athleteId, plannedDay);
    showToast({ title: "Sikeres mentés", message: "Összeállított nap elmentve a naplóba!", variant: "success" });
    onApplied();
    onClose();
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) return;

    const slots: PlannedDaySlot[] = plan.slots.map((slot) => {
      const selected = selectedSlotOptions[slot.slotId] || [];
      return {
        slotId: slot.slotId,
        slotName: slot.name,
        selectedOptions: selected.map((item) => {
          const nutrients = calculateOptionNutrients(item.option, item.portion, dayType);
          return {
            optionId: item.option.id,
            optionSnapshot: item.option,
            portionMultiplier: item.portion,
            effectiveCalories: nutrients.calories,
            effectiveProteinGrams: nutrients.proteinGrams,
            effectiveCarbsGrams: nutrients.carbsGrams,
            effectiveFatGrams: nutrients.fatGrams,
            status: "planned"
          };
        })
      };
    });

    const template: DayTemplateDocument = {
      id: `tpl_${Date.now()}`,
      athleteId,
      name: templateName.trim(),
      dayType,
      slots,
      totalCalories: totals.calories,
      totalProteinGrams: totals.protein,
      totalCarbsGrams: totals.carbs,
      totalFatGrams: totals.fat,
      schemaVersion: 1,
      source: "manual",
      confidence: 1.0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: athleteId
    };

    await saveDayTemplate(athleteId, template);
    showToast({ title: "Sablon mentve", message: "Napi sablon elmentve!", variant: "success" });
    setIsTemplateModalOpen(false);
    setTemplateName("");
    getDayTemplates(athleteId).then(setExistingTemplates);
  };

  const handleLoadTemplate = (tpl: DayTemplateDocument) => {
    setDayType(tpl.dayType);
    const map: Record<string, { option: MealPlanOption; portion: number }[]> = {};
    for (const slot of tpl.slots || []) {
      map[slot.slotId] = (slot.selectedOptions || []).map((s) => ({
        option: s.optionSnapshot,
        portion: s.portionMultiplier
      }));
    }
    setSelectedSlotOptions(map);
    setShowTemplatePicker(false);
    showToast({ title: "Sablon betöltve", message: `„${tpl.name}” sablon betöltve!`, variant: "success" });
  };

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title={`Nap összeállítása (${date})`}
      >
        <div className="space-y-6 pb-28 text-text-primary">
          {/* Day type selector */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-12 font-bold text-text-secondary uppercase tracking-wider">
                Naptípus kiválasztása
              </span>
              {existingTemplates.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<FolderOpen className="w-3.5 h-3.5" />}
                  onClick={() => setShowTemplatePicker(true)}
                >
                  Sablon betöltése
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {DAY_TYPES.map((dt) => (
                <Chip
                  key={dt.id}
                  label={dt.label}
                  selected={dayType === dt.id}
                  onClick={() => setDayType(dt.id)}
                />
              ))}
            </div>
          </div>

          {/* Slots & Pool Options */}
          {plan.slots.map((slot) => {
            const selectedList = selectedSlotOptions[slot.slotId] || [];

            return (
              <div key={slot.slotId} className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <h4 className="text-14 font-bold text-text-primary">
                    {slot.name}
                  </h4>
                  {slot.targetCaloriesRange && !hideCalories && (
                    <span className="text-11 text-text-tertiary">
                      Cél: {slot.targetCaloriesRange.min} - {slot.targetCaloriesRange.max} kcal
                    </span>
                  )}
                </div>

                {slot.options.length === 0 ? (
                  <p className="text-12 text-text-tertiary italic p-3 bg-bg-surface rounded-12 border border-border-hairline">
                    Ehhez az idősávhoz még nem rögzítettél opciót az Étrendtervben.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {slot.options.map((opt) => {
                      const isSelected = selectedList.some((i) => i.option.id === opt.id);
                      const currentItem = selectedList.find((i) => i.option.id === opt.id);
                      const portion = currentItem?.portion || opt.defaultPortionMultiplier || 1.0;

                      const nutrients = calculateOptionNutrients(opt, portion, dayType);
                      const allergenInfo = checkOptionAllergens(opt, userAllergies);

                      return (
                        <div
                          key={opt.id}
                          className={`p-3 rounded-14 border transition-all ${
                            isSelected
                              ? "bg-bg-elevated border-brand shadow-sm"
                              : "bg-bg-surface border-border-hairline hover:border-text-tertiary"
                          }`}
                        >
                          {/* Card Header & Selection Toggle */}
                          <div
                            onClick={() => handleToggleOption(slot.slotId, opt)}
                            className="cursor-pointer flex items-start justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-13 font-bold text-text-primary">
                                  {opt.name}
                                </span>
                                {opt.authorRole === "dietitian" ? (
                                  <span className="text-10 font-bold px-1.5 py-0.5 rounded-full bg-brand/10 text-brand">
                                    Dietetikus
                                  </span>
                                ) : (
                                  <span className="text-10 font-bold px-1.5 py-0.5 rounded-full bg-bg-surface text-text-tertiary border border-border-hairline">
                                    Saját
                                  </span>
                                )}
                              </div>
                              {opt.label && (
                                <span className="text-11 text-text-secondary block">
                                  {opt.label}
                                </span>
                              )}
                            </div>

                            <div
                              className={`w-6 h-6 rounded-8 border flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                                  ? "bg-brand border-brand text-white"
                                  : "border-border-hairline bg-bg-surface"
                              }`}
                            >
                              {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                            </div>
                          </div>

                          {/* Nutrition Preview */}
                          <div className="mt-2 text-11 text-text-secondary flex items-center gap-3 tabular-nums">
                            {!hideCalories && (
                              <span className="font-bold text-text-primary">
                                {nutrients.calories} kcal
                              </span>
                            )}
                            <span>F: {nutrients.proteinGrams}g</span>
                            <span>SZ: {nutrients.carbsGrams}g</span>
                            <span>ZS: {nutrients.fatGrams}g</span>
                          </div>

                          {/* Day Type Scaling Alert if applicable */}
                          {nutrients.dayTypeFactor !== 1.0 && (
                            <div className="mt-1.5 text-10 text-brand font-semibold flex items-center gap-1">
                              <span>⚡ {dayType === "hard" ? "Kemény" : "Pihenő"} nap szorzó ({nutrients.dayTypeFactor}x)</span>
                            </div>
                          )}

                          {/* Allergen Warning Badge */}
                          {allergenInfo.hasWarning && (
                            <div className="mt-1.5 text-10 text-status-caution font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>Tartalmazhat: {allergenInfo.matchedAllergens.join(", ")}</span>
                            </div>
                          )}

                          {/* Portion Slider when Selected */}
                          {isSelected && (
                            <div className="mt-3 pt-3 border-t border-border-hairline space-y-1.5">
                              <div className="flex justify-between items-center text-11">
                                <span className="text-text-secondary font-medium">Adagméret:</span>
                                <span className="font-bold text-brand tabular-nums">
                                  {portion}x adag
                                  {opt.baseServingGrams && ` (${Math.round(opt.baseServingGrams * portion)} g)`}
                                </span>
                              </div>
                              <input
                                type="range"
                                min={opt.minPortionMultiplier || 0.5}
                                max={opt.maxPortionMultiplier || 2.0}
                                step={0.1}
                                value={portion}
                                onChange={(e) =>
                                  handlePortionChange(slot.slotId, opt.id, parseFloat(e.target.value))
                                }
                                className="w-full accent-brand cursor-pointer h-1.5 bg-bg-surface rounded-lg"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Sticky Summary Bar */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-bg-surface/95 backdrop-blur-md border-t border-border-hairline shadow-lg space-y-3 z-30 max-w-3xl mx-auto">
          {/* Target Progress Bars */}
          <div className="grid grid-cols-4 gap-2 text-center text-11">
            <div>
              <span className="text-text-tertiary block text-10 uppercase">Kalória</span>
              {!hideCalories ? (
                <span className="font-bold text-text-primary tabular-nums text-13 block">
                  {totals.calories} / {target.targetCalories}
                </span>
              ) : (
                <span className="font-semibold text-text-secondary text-11 block">
                  {totals.calories > 0 ? "Kiegyensúlyozott" : "Üres"}
                </span>
              )}
            </div>
            <div>
              <span className="text-text-tertiary block text-10 uppercase">Fehérje</span>
              <span className="font-bold text-brand tabular-nums text-13 block">
                {totals.protein} / {target.targetProteinGrams}g
              </span>
            </div>
            <div>
              <span className="text-text-tertiary block text-10 uppercase">Szénhidrát</span>
              <span className="font-bold text-status-ready tabular-nums text-13 block">
                {totals.carbs} / {target.targetCarbsGrams}g
              </span>
            </div>
            <div>
              <span className="text-text-tertiary block text-10 uppercase">Zsír</span>
              <span className="font-bold text-text-secondary tabular-nums text-13 block">
                {totals.fat} / {target.targetFatGrams}g
              </span>
            </div>
          </div>

          {/* Plain Language Hint Box */}
          <div className="flex items-center gap-2 p-2.5 bg-bg-elevated rounded-10 border border-border-hairline text-11 text-text-secondary">
            <Info className="w-4 h-4 text-brand shrink-0" />
            <span className="flex-1">{hintText}</span>
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Sparkles className="w-4 h-4 text-brand" />}
              onClick={() => handleSuggest(false)}
            >
              Javasolj egy napot
            </Button>
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={() => handleSuggest(true)}
            >
              Másik javaslat
            </Button>
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<Bookmark className="w-3.5 h-3.5" />}
              onClick={() => setIsTemplateModalOpen(true)}
            >
              Sablonként mentés
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleApply}
              className="ml-auto flex-1 sm:flex-none"
            >
              Alkalmaz a napra
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Allergen Warning Modal Confirmation */}
      {allergenWarningOption && (
        <BottomSheet
          isOpen={true}
          onClose={() => setAllergenWarningOption(null)}
          title="Allergén figyelmeztetés"
        >
          <div className="space-y-4 pb-4 text-text-primary">
            <div className="p-3 bg-status-caution/15 border border-status-caution/40 rounded-14 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-status-caution shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-13 font-bold block text-text-primary">
                  Az étel érzékenységet vagy allergiát kiváltó összetevőt tartalmazhat!
                </span>
                <span className="text-12 text-text-secondary block">
                  Egyező allergének: <strong>{allergenWarningOption.allergens.join(", ")}</strong>.
                </span>
                <span className="text-11 text-text-tertiary block italic">
                  Ez a jelzés figyelmeztetés, nem garancia. Mindig ellenőrizd az összetevők címkéjét!
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setAllergenWarningOption(null)}
                className="flex-1"
              >
                Mégse választom
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  applyOptionSelection(allergenWarningOption.slotId, allergenWarningOption.option);
                  setAllergenWarningOption(null);
                }}
                className="flex-1"
              >
                Kiválasztom így is
              </Button>
            </div>
          </div>
        </BottomSheet>
      )}

      {/* Save Template Dialog */}
      {isTemplateModalOpen && (
        <BottomSheet
          isOpen={true}
          onClose={() => setIsTemplateModalOpen(false)}
          title="Mentés napi sablonként"
        >
          <div className="space-y-4 pb-4">
            <p className="text-12 text-text-secondary">
              Mentsd el ezt a napi kombinációt sablonként (pl. „Verseny előtti szénhidráttöltés” vagy „Hétvégi pihenőnap”), hogy később 1 kattintással betölthesd bármelyik napra!
            </p>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="pl. Kemény edzésnapi összeállítás"
              className="w-full bg-bg-surface border border-border-hairline rounded-12 p-3 text-13 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand"
            />
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setIsTemplateModalOpen(false)} className="flex-1">
                Mégse
              </Button>
              <Button variant="primary" onClick={handleSaveAsTemplate} className="flex-1">
                Mentés sablonként
              </Button>
            </div>
          </div>
        </BottomSheet>
      )}

      {/* Load Template Picker */}
      {showTemplatePicker && (
        <BottomSheet
          isOpen={true}
          onClose={() => setShowTemplatePicker(false)}
          title="Napi sablon kiválasztása"
        >
          <div className="space-y-2 pb-4">
            {existingTemplates.map((tpl) => (
              <div
                key={tpl.id}
                onClick={() => handleLoadTemplate(tpl)}
                className="p-3 bg-bg-surface hover:bg-bg-elevated cursor-pointer rounded-12 border border-border-hairline flex items-center justify-between"
              >
                <div>
                  <span className="text-13 font-bold text-text-primary block">
                    {tpl.name}
                  </span>
                  <span className="text-11 text-text-secondary block">
                    {tpl.dayType} • {tpl.totalCalories} kcal • {tpl.slots.length} étkezés
                  </span>
                </div>
                <Button size="sm" variant="ghost">
                  Betöltés
                </Button>
              </div>
            ))}
          </div>
        </BottomSheet>
      )}
    </>
  );
};
