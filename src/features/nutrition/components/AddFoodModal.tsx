import React, { useState, useEffect } from "react";
import {
  BottomSheet,
  Button,
  Input,
  NumberInput,
  SegmentedControl,
  Tabs,
  Badge,
  showToast
} from "@shared/ui";
import {
  Search,
  Barcode,
  Star,
  Clock,
  Plus,
  Camera,
  Check,
  AlertTriangle
} from "lucide-react";

import { FoodService, CURATED_SPORTS_FOODS } from "@shared/lib/nutrition";
import {
  FoodItem,
  LoggedFoodItem,
  MealType,
  PortionSize,
  PlatePortionShares
} from "@shared/types/nutrition";
import { BarcodeScannerModal } from "./BarcodeScannerModal";

interface AddFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMealType?: MealType;
  onAddFood: (mealType: MealType, loggedItem: LoggedFoodItem) => void;
}

export const AddFoodModal: React.FC<AddFoodModalProps> = ({
  isOpen,
  onClose,
  defaultMealType = "lunch",
  onAddFood
}) => {
  const [mealType, setMealType] = useState<MealType>(defaultMealType);
  const [loggingMode, setLoggingMode] = useState<"quick" | "precise">("precise");
  const [activeTab, setActiveTab] = useState<"search" | "favorites" | "recents" | "custom">("search");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodItem[]>(CURATED_SPORTS_FOODS);
  const [isSearching, setIsSearching] = useState(false);
  const [favorites, setFavorites] = useState<FoodItem[]>([]);
  const [recents, setRecents] = useState<FoodItem[]>([]);

  // Selected food state
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(CURATED_SPORTS_FOODS[0] ?? null);

  // Precise mode fields
  const [grams, setGrams] = useState<number>(100);

  // Quick mode fields
  const [portionSize, setPortionSize] = useState<PortionSize>("medium");
  const [platePortion, setPlatePortion] = useState<PlatePortionShares>({
    carbsPct: 35,
    proteinPct: 30,
    vegPct: 35
  });
  const [photoNote, setPhotoNote] = useState<string>("");

  // Barcode scanner modal
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  // Custom food creator form state
  const [customName, setCustomName] = useState("");
  const [customBrand, setCustomBrand] = useState("");
  const [customCalories, setCustomCalories] = useState(150);
  const [customProtein, setCustomProtein] = useState(15);
  const [customCarbs, setCustomCarbs] = useState(10);
  const [customFat, setCustomFat] = useState(5);

  useEffect(() => {
    if (isOpen) {
      setFavorites(FoodService.getFavorites());
      setRecents(FoodService.getRecents());
    }
  }, [isOpen]);

  useEffect(() => {
    setMealType(defaultMealType);
  }, [defaultMealType]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await FoodService.searchFoods(searchQuery);
        setSearchResults(results);
        if (results.length > 0) {
          setSelectedFood((prev) => prev ?? results[0] ?? null);
        }
      } catch {
        // Fallback
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);


  const handleSelectFood = (food: FoodItem) => {
    setSelectedFood(food);
    setGrams(food.servingSizeGrams || 100);
  };

  const handleCreateCustomFood = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newFood = FoodService.saveCustomFood({
      name: customName.trim(),
      brand: customBrand.trim() || undefined,
      source: "custom",
      servingSizeGrams: 100,
      caloriesPer100g: customCalories,
      proteinPer100g: customProtein,
      carbsPer100g: customCarbs,
      fatPer100g: customFat,
      microsPer100g: {}
    });

    showToast({
      title: "Saját étel mentve",
      message: `${newFood.name} hozzáadva a recepttárhoz.`,
      type: "success"
    });

    setSelectedFood(newFood);
    setActiveTab("search");
    setCustomName("");
  };

  const handleSaveLoggedFood = () => {
    if (!selectedFood) {
      showToast({
        title: "Válassz ételt",
        message: "Kérjük válassz ki egy ételt a listából.",
        type: "warning"
      });
      return;
    }

    // Determine actual grams based on mode
    let effectiveGrams = grams;
    if (loggingMode === "quick") {
      const baseServing = selectedFood.servingSizeGrams || 100;
      if (portionSize === "small") effectiveGrams = Math.round(baseServing * 0.7);
      else if (portionSize === "medium") effectiveGrams = baseServing;
      else if (portionSize === "large") effectiveGrams = Math.round(baseServing * 1.5);
    }

    const calculated = FoodService.calculateServingNutrients(selectedFood, effectiveGrams);

    const loggedItem: LoggedFoodItem = {
      id: `logged_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      foodId: selectedFood.id,
      name: selectedFood.name,
      brand: selectedFood.brand,
      servingGrams: effectiveGrams,
      mode: loggingMode,
      portionSize: loggingMode === "quick" ? portionSize : undefined,
      platePortion: loggingMode === "quick" ? platePortion : undefined,
      photoUrl: photoNote || undefined,
      calories: calculated.calories,
      proteinGrams: calculated.proteinGrams,
      carbsGrams: calculated.carbsGrams,
      fatGrams: calculated.fatGrams,
      micros: calculated.micros,
      coverageScore: calculated.coverageScore,
      missingNutrients: calculated.missingNutrients,
      createdAt: new Date().toISOString()
    };

    FoodService.addRecent(selectedFood);
    onAddFood(mealType, loggedItem);
    onClose();

    showToast({
      title: "Étel rögzítve",
      message: `${loggedItem.name} (${effectiveGrams}g) hozzáadva: ${loggedItem.calories} kcal`,
      type: "success"
    });
  };

  const mealTypeLabels: Record<MealType, string> = {
    breakfast: "Reggeli",
    lunch: "Ebéd",
    dinner: "Vacsora",
    snack: "Snack / Tízórai",
    during_training: "Edzés közben"
  };

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Étel hozzáadása"
        description="Rögzítsd a bevitelt gyors adagbecsléssel vagy pontos gramm/vonalkód módban."
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              Mégse
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveLoggedFood}
              disabled={!selectedFood}
            >
              Hozzáadás ({mealTypeLabels[mealType]})
            </Button>
          </>
        }
      >
        <div className="space-y-5 py-2">
          {/* Meal Type & Mode Segmented Controls */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-12 font-medium text-text-secondary uppercase tracking-wider">
                Étkezés típusa
              </span>
              <span className="text-12 font-semibold text-brand">
                {mealTypeLabels[mealType]}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1 p-1 bg-bg-surface rounded-12 border border-border-hairline text-11">
              {(["breakfast", "lunch", "dinner", "snack", "during_training"] as MealType[]).map(
                (m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMealType(m)}
                    className={`py-1.5 px-1 rounded-8 font-medium transition-all text-center truncate ${
                      mealType === m
                        ? "bg-brand text-white shadow-sm"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {m === "breakfast"
                      ? "Reggeli"
                      : m === "lunch"
                      ? "Ebéd"
                      : m === "dinner"
                      ? "Vacsora"
                      : m === "snack"
                      ? "Snack"
                      : "Edzés alatti"}
                  </button>
                )
              )}
            </div>

            {/* Switchable Mode: Quick vs Precise */}
            <div className="pt-1">
              <SegmentedControl
                value={loggingMode}
                onChange={(val) => setLoggingMode(val as "quick" | "precise")}
                options={[
                  { value: "quick", label: "Gyors mód (adag & tányér)" },
                  { value: "precise", label: "Pontos mód (gramm & vonalkód)" }
                ]}
                fullWidth
              />
            </div>
          </div>

          {/* Search bar & Barcode scanner trigger */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Keress ételt, alapanyagot, terméket..."
                leftIcon={<Search className="w-4 h-4 text-text-tertiary" />}
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => setShowBarcodeScanner(true)}
              aria-label="Vonalkód beolvasása"
            >
              <Barcode className="w-5 h-5 text-brand" />
            </Button>
          </div>

          {/* Source Tabs */}
          <Tabs
            activeId={activeTab}
            onChange={(tab) =>
              setActiveTab(tab as "search" | "favorites" | "recents" | "custom")
            }

            tabs={[
              { id: "search", label: "Adatbázis", icon: <Search className="w-3.5 h-3.5" /> },
              { id: "favorites", label: "Kedvencek", icon: <Star className="w-3.5 h-3.5" /> },
              { id: "recents", label: "Előzmények", icon: <Clock className="w-3.5 h-3.5" /> },
              { id: "custom", label: "+ Saját étel", icon: <Plus className="w-3.5 h-3.5" /> }
            ]}
          />

          {/* Tab Content */}
          {activeTab === "custom" ? (
            <form onSubmit={handleCreateCustomFood} className="space-y-3 p-4 rounded-16 bg-bg-surface border border-border-hairline">
              <h4 className="text-14 font-semibold text-text-primary">
                Új saját étel vagy recept rögzítése
              </h4>
              <Input
                label="Étel megnevezése"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="pl. Házi fehérjeturmix gyümölccsel"
                required
              />
              <Input
                label="Márka / megjegyzés (opcionális)"
                value={customBrand}
                onChange={(e) => setCustomBrand(e.target.value)}
                placeholder="pl. Saját recept"
              />
              <div className="grid grid-cols-2 gap-3">
                <NumberInput
                  label="Kalória / 100g (kcal)"
                  value={customCalories}
                  onChange={setCustomCalories}
                  min={0}
                  max={900}
                />
                <NumberInput
                  label="Fehérje / 100g (g)"
                  value={customProtein}
                  onChange={setCustomProtein}
                  min={0}
                  max={100}
                />
                <NumberInput
                  label="Szénhidrát / 100g (g)"
                  value={customCarbs}
                  onChange={setCustomCarbs}
                  min={0}
                  max={100}
                />
                <NumberInput
                  label="Zsír / 100g (g)"
                  value={customFat}
                  onChange={setCustomFat}
                  min={0}
                  max={100}
                />
              </div>
              <Button variant="primary" type="submit" fullWidth>
                Étel mentése
              </Button>
            </form>
          ) : (
            <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
              {isSearching ? (
                <div className="py-6 text-center text-text-secondary text-12">
                  Keresés az Open Food Facts és USDA adatbázisban...
                </div>
              ) : (activeTab === "favorites"
                  ? favorites
                  : activeTab === "recents"
                  ? recents
                  : searchResults
                ).length === 0 ? (
                <div className="py-6 text-center text-text-secondary text-12">
                  Nem található a keresésnek megfelelő étel.
                </div>
              ) : (
                (activeTab === "favorites"
                  ? favorites
                  : activeTab === "recents"
                  ? recents
                  : searchResults
                ).map((food) => {
                  const isSelected = selectedFood?.id === food.id;
                  return (
                    <div
                      key={food.id}
                      onClick={() => handleSelectFood(food)}
                      className={`p-3 rounded-12 border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-brand/10 border-brand text-text-primary"
                          : "bg-bg-surface border-border-hairline hover:border-border-subtle"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-13 font-semibold text-text-primary truncate">
                            {food.name}
                          </span>
                          {food.source === "verified" && (
                            <Badge variant="ready" size="sm">
                              Sport-hiteles
                            </Badge>
                          )}

                        </div>
                        <div className="text-11 text-text-secondary mt-0.5">
                          {food.brand ? `${food.brand} • ` : ""}
                          <span className="tabular-nums font-medium text-text-primary">
                            {food.caloriesPer100g} kcal
                          </span>{" "}
                          (F: {food.proteinPer100g}g, Sz: {food.carbsPer100g}g, Zs: {food.fatPer100g}g)
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            FoodService.toggleFavorite(food.id);
                            setFavorites(FoodService.getFavorites());
                          }}
                          className="p-1 text-text-tertiary hover:text-status-caution transition-colors"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              favorites.some((f) => f.id === food.id)
                                ? "fill-status-caution text-status-caution"
                                : ""
                            }`}
                          />
                        </button>
                        {isSelected && <Check className="w-4 h-4 text-brand" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Selected Food Logging Inputs */}
          {selectedFood && (
            <div className="rounded-16 bg-bg-elevated p-4 border border-border-hairline space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-11 text-text-secondary uppercase tracking-wider block font-medium">
                    Kiválasztott tétel
                  </span>
                  <h4 className="text-15 font-bold text-text-primary mt-0.5">
                    {selectedFood.name}
                  </h4>
                  {selectedFood.brand && (
                    <span className="text-12 text-text-tertiary">{selectedFood.brand}</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-18 font-bold text-text-primary tabular-nums block">
                    {loggingMode === "precise"
                      ? FoodService.calculateServingNutrients(selectedFood, grams).calories
                      : FoodService.calculateServingNutrients(
                          selectedFood,
                          portionSize === "small"
                            ? Math.round(selectedFood.servingSizeGrams * 0.7)
                            : portionSize === "large"
                            ? Math.round(selectedFood.servingSizeGrams * 1.5)
                            : selectedFood.servingSizeGrams
                        ).calories}{" "}
                    kcal
                  </span>
                </div>
              </div>

              {/* MODE 1: QUICK MODE */}
              {loggingMode === "quick" ? (
                <div className="space-y-4 pt-2 border-t border-border-hairline">
                  <div>
                    <label className="text-12 font-medium text-text-secondary block mb-2">
                      Becsült adagméret
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "small", label: "Kicsi", desc: "~70% adag" },
                        { id: "medium", label: "Közepes", desc: "Normál (100%)" },
                        { id: "large", label: "Nagy", desc: "~150% adag" }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setPortionSize(item.id as PortionSize)}
                          className={`p-2.5 rounded-12 border text-center transition-all ${
                            portionSize === item.id
                              ? "bg-brand text-white border-brand shadow-sm"
                              : "bg-bg-surface border-border-hairline text-text-secondary hover:text-text-primary"
                          }`}
                        >
                          <div className="text-13 font-semibold">{item.label}</div>
                          <div className="text-10 opacity-80 mt-0.5">{item.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Plate method shares */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-12 font-medium text-text-secondary">
                        Tányérmódszer megoszlás (Plate Method)
                      </label>
                      <span className="text-11 text-text-tertiary">
                        Szénhidrát / Fehérje / Zöldség
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "1/4 Szénhidrát (Könnyű nap)", carbs: 25, prot: 25, veg: 50 },
                        { label: "1/3 Kiegyensúlyozott", carbs: 35, prot: 30, veg: 35 },
                        { label: "1/2 Szénhidrát (Nehéz nap)", carbs: 50, prot: 25, veg: 25 }
                      ].map((plate, idx) => {
                        const isMatch = platePortion.carbsPct === plate.carbs;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() =>
                              setPlatePortion({
                                carbsPct: plate.carbs,
                                proteinPct: plate.prot,
                                vegPct: plate.veg
                              })
                            }
                            className={`p-2 rounded-10 border text-center text-11 transition-all ${
                              isMatch
                                ? "bg-bg-surface border-brand font-semibold text-text-primary"
                                : "bg-bg-surface/50 border-border-hairline text-text-secondary"
                            }`}
                          >
                            {plate.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Photo note */}
                  <div>
                    <label className="text-12 font-medium text-text-secondary block mb-1.5">
                      Fotójegyzet csatolása (opcionális)
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={photoNote}
                        onChange={(e) => setPhotoNote(e.target.value)}
                        placeholder="Fotó megjegyzés vagy URL..."
                        leftIcon={<Camera className="w-4 h-4 text-text-tertiary" />}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* MODE 2: PRECISE MODE */
                <div className="space-y-4 pt-2 border-t border-border-hairline">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-12 font-medium text-text-secondary">
                        Pontos mennyiség grammban
                      </label>
                      <div className="flex gap-1">
                        {[50, 100, 150, 200].map((step) => (
                          <button
                            key={step}
                            type="button"
                            onClick={() => setGrams(step)}
                            className="px-2 py-0.5 rounded-6 bg-bg-surface border border-border-hairline text-11 text-text-secondary hover:text-text-primary"
                          >
                            {step}g
                          </button>
                        ))}
                      </div>
                    </div>
                    <NumberInput
                      value={grams}
                      onChange={setGrams}
                      min={1}
                      max={2000}
                      step={5}
                      unit="g"
                    />
                  </div>

                  {/* Calculated Nutrients & Honest Coverage Indicator */}
                  {(() => {
                    const nutrients = FoodService.calculateServingNutrients(selectedFood, grams);
                    return (
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2 text-center text-12">
                          <div className="p-2 rounded-8 bg-bg-surface border border-border-hairline">
                            <span className="text-text-secondary block text-11">Fehérje</span>
                            <span className="font-bold text-text-primary tabular-nums">
                              {nutrients.proteinGrams}g
                            </span>
                          </div>
                          <div className="p-2 rounded-8 bg-bg-surface border border-border-hairline">
                            <span className="text-text-secondary block text-11">Szénhidrát</span>
                            <span className="font-bold text-text-primary tabular-nums">
                              {nutrients.carbsGrams}g
                            </span>
                          </div>
                          <div className="p-2 rounded-8 bg-bg-surface border border-border-hairline">
                            <span className="text-text-secondary block text-11">Zsír</span>
                            <span className="font-bold text-text-primary tabular-nums">
                              {nutrients.fatGrams}g
                            </span>
                          </div>
                        </div>

                        {/* Honest Coverage Badge */}
                        <div className="flex items-center justify-between text-11 px-1 text-text-secondary">
                          <div className="flex items-center gap-1.5">
                            {nutrients.missingNutrients.length > 0 ? (
                              <>
                                <AlertTriangle className="w-3.5 h-3.5 text-status-caution shrink-0" />
                                <span>
                                  Mikrotápanyag fedettség:{" "}
                                  <strong className="text-text-primary">
                                    {nutrients.coverageScore}%
                                  </strong>
                                </span>
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5 text-status-ready shrink-0" />
                                <span>Teljes mikrotápanyag adatfedettség</span>
                              </>
                            )}
                          </div>
                          {nutrients.missingNutrients.length > 0 && (
                            <span
                              className="text-text-tertiary underline decoration-dotted cursor-help"
                              title={`Nem szerepel a hivatalos címkén: ${nutrients.missingNutrients.join(", ")}`}
                            >
                              Hiányzó adatok ({nutrients.missingNutrients.length})
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onFoodFound={(food) => {
          handleSelectFood(food);
          setLoggingMode("precise");
        }}
      />
    </>
  );
};
