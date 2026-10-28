import React, { useState, useEffect } from "react";
import {
  BottomSheet,
  Button,
  Input,
  NumberInput,
  Chip,
  showToast
} from "@shared/ui";
import {
  MealPlanOption,
  AllergenTag,
  MealOptionIngredient
} from "@shared/types/mealPlan";
import { NutritionDayType, FoodItem } from "@shared/types/nutrition";
import { CURATED_SPORTS_FOODS, FoodService } from "@shared/lib/nutrition/foodService";
import { ALLERGEN_DICTIONARY } from "@shared/lib/nutrition/mealPlanEngine";
import { Plus, Trash2, Search } from "lucide-react";

interface OptionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (option: MealPlanOption) => void;
  initialOption?: MealPlanOption | null;
  slotName: string;
  isDietitian: boolean;
  currentUserId?: string;
  currentUserName?: string;
}

const COMMON_TAGS = [
  "gyors",
  "edzés előtt",
  "edzés után",
  "pihenőnap",
  "nagy szénhidrát",
  "vegetáriánus",
  "magas fehérje",
  "alacsony zsír",
  "könnyen emészthető"
];

const DAY_TYPES: { id: NutritionDayType; label: string }[] = [
  { id: "rest", label: "Pihenőnap" },
  { id: "light", label: "Könnyű nap" },
  { id: "moderate", label: "Közepes nap" },
  { id: "hard", label: "Kemény nap" },
  { id: "competition", label: "Versenynap" }
];

export const OptionEditModal: React.FC<OptionEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialOption,
  slotName,
  isDietitian,
  currentUserId = "user",
  currentUserName = "Sportoló"
}) => {
  const [sourceMode, setSourceMode] = useState<"library" | "manual">("library");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [baseCalories, setBaseCalories] = useState<number>(500);
  const [baseProtein, setBaseProtein] = useState<number>(30);
  const [baseCarbs, setBaseCarbs] = useState<number>(65);
  const [baseFat, setBaseFat] = useState<number>(10);
  const [baseServingGrams, setBaseServingGrams] = useState<number>(200);
  const [baseServingUnit, setBaseServingUnit] = useState("adag");

  const [minPortion, setMinPortion] = useState<number>(0.5);
  const [maxPortion, setMaxPortion] = useState<number>(2.0);
  const [defaultPortion, setDefaultPortion] = useState<number>(1.0);

  const [tags, setTags] = useState<string[]>([]);
  const [dayTypeTags, setDayTypeTags] = useState<NutritionDayType[]>([]);
  const [hardDayScaling, setHardDayScaling] = useState<number>(1.3);
  const [restDayScaling, setRestDayScaling] = useState<number>(0.8);
  const [allergens, setAllergens] = useState<AllergenTag[]>([]);
  const [ingredients, setIngredients] = useState<MealOptionIngredient[]>([]);
  const [notes, setNotes] = useState("");

  // Available foods from curated staples + custom foods
  const allLibraryFoods = React.useMemo(() => {
    if (!isOpen) return [];
    return [...CURATED_SPORTS_FOODS, ...FoodService.getCustomFoods()];
  }, [isOpen]);

  const filteredFoods = React.useMemo(() => {
    if (!searchQuery.trim()) return allLibraryFoods.slice(0, 12);
    const q = searchQuery.toLowerCase();
    return allLibraryFoods.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.category && f.category.toLowerCase().includes(q))
    );
  }, [allLibraryFoods, searchQuery]);

  useEffect(() => {
    if (initialOption) {
      setName(initialOption.name);
      setLabel(initialOption.label || "");
      setPhotoUrl(initialOption.photoUrl || "");
      setBaseCalories(initialOption.baseCalories);
      setBaseProtein(initialOption.baseProteinGrams);
      setBaseCarbs(initialOption.baseCarbsGrams);
      setBaseFat(initialOption.baseFatGrams);
      setBaseServingGrams(initialOption.baseServingGrams || 200);
      setBaseServingUnit(initialOption.baseServingUnit || "adag");
      setMinPortion(initialOption.minPortionMultiplier || 0.5);
      setMaxPortion(initialOption.maxPortionMultiplier || 2.0);
      setDefaultPortion(initialOption.defaultPortionMultiplier || 1.0);
      setTags(initialOption.tags || []);
      setDayTypeTags(initialOption.dayTypeTags || []);
      setHardDayScaling(initialOption.dayTypeScaling?.hard ?? 1.3);
      setRestDayScaling(initialOption.dayTypeScaling?.rest ?? 0.8);
      setAllergens(initialOption.allergens || []);
      setIngredients(initialOption.ingredients || []);
      setNotes(initialOption.notes || "");
      setSourceMode("manual");
    } else {
      setName("");
      setLabel("");
      setPhotoUrl("");
      setBaseCalories(500);
      setBaseProtein(30);
      setBaseCarbs(65);
      setBaseFat(10);
      setBaseServingGrams(200);
      setBaseServingUnit("adag");
      setMinPortion(0.5);
      setMaxPortion(2.0);
      setDefaultPortion(1.0);
      setTags([]);
      setDayTypeTags([]);
      setHardDayScaling(1.3);
      setRestDayScaling(0.8);
      setAllergens([]);
      setIngredients([]);
      setNotes("");
      setSourceMode("library");
      setSelectedFood(null);
      setSearchQuery("");
    }
  }, [initialOption, isOpen]);

  const handleSelectFood = (food: FoodItem) => {
    setSelectedFood(food);
    setName(food.name);
    setLabel(food.category || "");
    const serving = food.servingSizeGrams || 100;
    setBaseServingGrams(serving);
    setBaseServingUnit(food.servingUnit || `${serving}g`);

    const calc = FoodService.calculateServingNutrients(food, serving);
    setBaseCalories(calc.calories);
    setBaseProtein(calc.proteinGrams);
    setBaseCarbs(calc.carbsGrams);
    setBaseFat(calc.fatGrams);
    setPhotoUrl(food.imageUrl || "");

    // Default ingredient from source
    setIngredients([{ name: food.name, amount: serving, unit: "g" }]);
    setSourceMode("manual");
  };

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { name: "", amount: 100, unit: "g" }]);
  };

  const handleUpdateIngredient = (index: number, patch: Partial<MealOptionIngredient>) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index]!, ...patch };
    setIngredients(updated);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const toggleTag = (t: string) => {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const toggleDayType = (dt: NutritionDayType) => {
    setDayTypeTags((prev) => (prev.includes(dt) ? prev.filter((x) => x !== dt) : [...prev, dt]));
  };

  const toggleAllergen = (a: AllergenTag) => {
    setAllergens((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  };

  const handleSave = () => {
    if (!name.trim()) {
      showToast({ title: "Hiányzó név", message: "Adj meg egy ételnevet!", variant: "error" });
      return;
    }

    const option: MealPlanOption = {
      id: initialOption?.id || `opt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sourceFoodId: selectedFood?.id || initialOption?.sourceFoodId,
      name: name.trim(),
      label: label.trim() || undefined,
      photoUrl: photoUrl.trim() || undefined,
      authorRole: initialOption?.authorRole || (isDietitian ? "dietitian" : "athlete"),
      authorUid: initialOption?.authorUid || currentUserId,
      authorName: initialOption?.authorName || (isDietitian ? "Dietetikus" : currentUserName),
      baseCalories,
      baseProteinGrams: baseProtein,
      baseCarbsGrams: baseCarbs,
      baseFatGrams: baseFat,
      baseServingGrams,
      baseServingUnit,
      minPortionMultiplier: minPortion,
      maxPortionMultiplier: maxPortion,
      defaultPortionMultiplier: defaultPortion,
      tags,
      dayTypeTags,
      dayTypeScaling: {
        hard: hardDayScaling,
        rest: restDayScaling
      },
      allergens: allergens.length > 0 ? allergens : undefined,
      ingredients: ingredients.filter((i) => i.name.trim().length > 0),
      notes: notes.trim() || undefined,
      usageCount: initialOption?.usageCount || 0,
      createdAt: initialOption?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(option);
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={initialOption ? "Opció szerkesztése" : `+ Új opció hozzáadása: ${slotName}`}
    >
      <div className="space-y-6 pb-6 text-text-primary">
        {/* Source Mode Toggle if creating new */}
        {!initialOption && (
          <div className="flex gap-2 p-1 bg-bg-surface rounded-12 border border-border-hairline">
            <button
              type="button"
              onClick={() => setSourceMode("library")}
              className={`flex-1 py-2 rounded-10 text-13 font-semibold transition-all ${
                sourceMode === "library"
                  ? "bg-brand text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Választás az Ételeimből
            </button>
            <button
              type="button"
              onClick={() => setSourceMode("manual")}
              className={`flex-1 py-2 rounded-10 text-13 font-semibold transition-all ${
                sourceMode === "manual"
                  ? "bg-brand text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Egyéni megadás
            </button>
          </div>
        )}

        {/* Step 1: Library Picker */}
        {sourceMode === "library" && !initialOption && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Keresés az ételek és receptek között..."
                className="w-full bg-bg-surface border border-border-hairline rounded-12 pl-9 pr-3 py-2 text-14 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {filteredFoods.map((food) => (
                <div
                  key={food.id}
                  onClick={() => handleSelectFood(food)}
                  className="p-3 bg-bg-surface hover:bg-bg-elevated cursor-pointer rounded-12 border border-border-hairline transition-all flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="text-13 font-bold text-text-primary block truncate">
                      {food.name}
                    </span>
                    <span className="text-11 text-text-secondary block">
                      {food.category || "Étel"} • {food.caloriesPer100g} kcal / 100g
                    </span>
                  </div>
                  <Button size="sm" variant="ghost">
                    Kiválaszt
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form Fields */}
        {(sourceMode === "manual" || initialOption) && (
          <div className="space-y-4">
            <Input
              label="Étel / recept megnevezése"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="pl. Zabkása tejsavó izolátummal és áfonyával"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Címke / alcím (opcionális)"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="pl. Magas szénhidrát"
              />
              <Input
                label="Fotó / Kép URL (opcionális)"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            {/* Base Macros */}
            <div className="p-4 bg-bg-surface rounded-14 border border-border-hairline space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-12 font-bold text-text-secondary uppercase tracking-wider">
                  Alapadag tápértéke (1.0x adag)
                </span>
                <span className="text-11 text-text-tertiary">
                  {baseServingGrams} g / {baseServingUnit}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <NumberInput
                  label="Kalória (kcal)"
                  value={baseCalories}
                  onChange={(v) => setBaseCalories(Math.max(0, v || 0))}
                  min={0}
                  step={10}
                />
                <NumberInput
                  label="Fehérje (g)"
                  value={baseProtein}
                  onChange={(v) => setBaseProtein(Math.max(0, v || 0))}
                  min={0}
                  step={1}
                />
                <NumberInput
                  label="Szénhidrát (g)"
                  value={baseCarbs}
                  onChange={(v) => setBaseCarbs(Math.max(0, v || 0))}
                  min={0}
                  step={1}
                />
                <NumberInput
                  label="Zsír (g)"
                  value={baseFat}
                  onChange={(v) => setBaseFat(Math.max(0, v || 0))}
                  min={0}
                  step={1}
                />
              </div>
            </div>

            {/* Portion range */}
            <div className="p-4 bg-bg-surface rounded-14 border border-border-hairline space-y-3">
              <span className="text-12 font-bold text-text-secondary uppercase tracking-wider block">
                Adagméret határok az összeállítóban
              </span>
              <div className="grid grid-cols-3 gap-3">
                <NumberInput
                  label="Minimális adag"
                  value={minPortion}
                  onChange={(v) => setMinPortion(Math.max(0.1, v || 0.5))}
                  min={0.1}
                  max={2.0}
                  step={0.1}
                />
                <NumberInput
                  label="Alapértelmezett"
                  value={defaultPortion}
                  onChange={(v) => setDefaultPortion(Math.max(minPortion, v || 1.0))}
                  min={0.1}
                  max={maxPortion}
                  step={0.1}
                />
                <NumberInput
                  label="Maximális adag"
                  value={maxPortion}
                  onChange={(v) => setMaxPortion(Math.max(defaultPortion, v || 2.0))}
                  min={0.5}
                  max={4.0}
                  step={0.1}
                />
              </div>
            </div>

            {/* Day type scaling */}
            <div className="p-4 bg-bg-surface rounded-14 border border-border-hairline space-y-3">
              <span className="text-12 font-bold text-text-secondary uppercase tracking-wider block">
                Edzésnaphoz igazodó adagszorzók
              </span>
              <p className="text-11 text-text-secondary">
                A rendszer kemény vagy pihenőnapokon automatikusan felskálázza vagy csökkenti ezt az opciót.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <NumberInput
                  label="Kemény nap szorzó (pl. 1.3x - 1.5x)"
                  value={hardDayScaling}
                  onChange={(v) => setHardDayScaling(Math.max(0.5, v || 1.0))}
                  min={0.5}
                  max={3.0}
                  step={0.1}
                />
                <NumberInput
                  label="Pihenőnap szorzó (pl. 0.8x)"
                  value={restDayScaling}
                  onChange={(v) => setRestDayScaling(Math.max(0.5, v || 1.0))}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                />
              </div>
            </div>

            {/* Day type suitability */}
            <div className="space-y-2">
              <label className="text-12 font-bold text-text-secondary uppercase tracking-wider block">
                Ajánlott naptípusok (Javaslatokhoz)
              </label>
              <div className="flex flex-wrap gap-2">
                {DAY_TYPES.map((dt) => (
                  <Chip
                    key={dt.id}
                    label={dt.label}
                    selected={dayTypeTags.includes(dt.id)}
                    onClick={() => toggleDayType(dt.id)}
                  />
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-12 font-bold text-text-secondary uppercase tracking-wider block">
                Jellemző címkék
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_TAGS.map((t) => (
                  <Chip
                    key={t}
                    label={t}
                    selected={tags.includes(t)}
                    onClick={() => toggleTag(t)}
                    size="sm"
                  />
                ))}
              </div>
            </div>

            {/* Allergens */}
            <div className="space-y-2">
              <label className="text-12 font-bold text-text-secondary uppercase tracking-wider block">
                Tartalmazott allergének (figyelmeztetéshez)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(Object.entries(ALLERGEN_DICTIONARY) as [AllergenTag, typeof ALLERGEN_DICTIONARY[AllergenTag]][]).map(([key, val]) => (
                  <Chip
                    key={key}
                    label={val.hu}
                    selected={allergens.includes(key)}
                    onClick={() => toggleAllergen(key)}
                    size="sm"
                  />
                ))}
              </div>
            </div>

            {/* Recipe Ingredients for Shopping list */}
            <div className="p-4 bg-bg-surface rounded-14 border border-border-hairline space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-12 font-bold text-text-secondary uppercase tracking-wider">
                  Recept összetevők (Bevásárlólistához)
                </span>
                <Button size="sm" variant="ghost" onClick={handleAddIngredient} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                  + Összetevő
                </Button>
              </div>

              {ingredients.length === 0 ? (
                <p className="text-11 text-text-tertiary italic">
                  Nincsenek megadva összetevők. Adj hozzá tételeket a bevásárlólista automatikus összesítéséhez!
                </p>
              ) : (
                <div className="space-y-2">
                  {ingredients.map((ing, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={ing.name}
                        onChange={(e) => handleUpdateIngredient(i, { name: e.target.value })}
                        placeholder="Összetevő neve (pl. Zabpehely)"
                        className="flex-1 bg-bg-elevated border border-border-hairline rounded-10 px-3 py-1.5 text-13 text-text-primary"
                      />
                      <input
                        type="number"
                        value={ing.amount}
                        onChange={(e) => handleUpdateIngredient(i, { amount: parseFloat(e.target.value) || 0 })}
                        className="w-20 bg-bg-elevated border border-border-hairline rounded-10 px-2 py-1.5 text-13 text-text-primary text-right"
                      />
                      <select
                        value={ing.unit}
                        onChange={(e) => handleUpdateIngredient(i, { unit: e.target.value })}
                        className="bg-bg-elevated border border-border-hairline rounded-10 px-2 py-1.5 text-13 text-text-primary"
                      >
                        <option value="g">g</option>
                        <option value="ml">ml</option>
                        <option value="db">db</option>
                        <option value="ek">ek</option>
                        <option value="tk">tk</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(i)}
                        className="p-1.5 text-text-tertiary hover:text-status-rest transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-12 font-bold text-text-secondary uppercase tracking-wider block">
                {isDietitian ? "Dietetikusi megjegyzés / tipp" : "Megjegyzés"}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="pl. Edzés előtt 90 perccel javasolt fogyasztani."
                rows={2}
                className="w-full bg-bg-surface border border-border-hairline rounded-12 p-3 text-13 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-3">
              <Button variant="secondary" onClick={onClose} className="flex-1">
                Mégse
              </Button>
              <Button variant="primary" onClick={handleSave} className="flex-1">
                Mentés az étrendtervbe
              </Button>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
