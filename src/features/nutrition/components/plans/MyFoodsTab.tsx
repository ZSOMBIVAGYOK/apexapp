import React, { useState } from "react";
import {
  Button,
  Chip,
  Input,
  NumberInput,
  BottomSheet,
  showToast
} from "@shared/ui";
import { CURATED_SPORTS_FOODS, FoodService } from "@shared/lib/nutrition/foodService";
import { Search, Plus, Star } from "lucide-react";

interface MyFoodsTabProps {
  athleteId: string;
  hideCalories?: boolean;
}

export const MyFoodsTab: React.FC<MyFoodsTabProps> = ({ hideCalories = false }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Food form
  const [newName, setNewName] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newCategory, setNewCategory] = useState("Egyéb");
  const [newServingGrams, setNewServingGrams] = useState(100);
  const [newServingUnit, setNewServingUnit] = useState("1 adag (100g)");
  const [newCalories, setNewCalories] = useState(250);
  const [newProtein, setNewProtein] = useState(15);
  const [newCarbs, setNewCarbs] = useState(30);
  const [newFat, setNewFat] = useState(5);

  const customFoods = FoodService.getCustomFoods();
  const allFoods = React.useMemo(() => {
    return [...customFoods, ...CURATED_SPORTS_FOODS];
  }, [customFoods.length, showCreateModal]);

  const categories = ["all", "Fehérjeforrás", "Szénhidrátforrás", "Gabona", "Gyümölcs", "Tejtermék", "Kedvencek"];

  const filteredFoods = React.useMemo(() => {
    return allFoods.filter((f) => {
      if (selectedCategory === "Kedvencek" && !f.isFavorite) return false;
      if (selectedCategory !== "all" && selectedCategory !== "Kedvencek" && f.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          f.name.toLowerCase().includes(q) ||
          (f.brand && f.brand.toLowerCase().includes(q)) ||
          (f.category && f.category.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [allFoods, selectedCategory, searchQuery]);

  const handleToggleFav = (foodId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    FoodService.toggleFavorite(foodId);
    showToast({ title: "Kedvencek", message: "Kedvencek frissítve!", variant: "info" });
  };

  const handleSaveCustomFood = () => {
    if (!newName.trim()) {
      showToast({ title: "Hiányzó név", message: "Kérlek add meg az étel nevét!", variant: "error" });
      return;
    }

    FoodService.saveCustomFood({
      name: newName.trim(),
      brand: newBrand.trim() || undefined,
      category: newCategory,
      source: "custom",
      servingSizeGrams: newServingGrams,
      servingUnit: newServingUnit,
      caloriesPer100g: Math.round((newCalories / Math.max(1, newServingGrams)) * 100),
      proteinPer100g: Math.round(((newProtein / Math.max(1, newServingGrams)) * 100) * 10) / 10,
      carbsPer100g: Math.round(((newCarbs / Math.max(1, newServingGrams)) * 100) * 10) / 10,
      fatPer100g: Math.round(((newFat / Math.max(1, newServingGrams)) * 100) * 10) / 10,
      microsPer100g: {},
      isFavorite: true
    });

    showToast({ title: "Sikeres mentés", message: "Saját étel elmentve az Ételeim könyvtárba!", variant: "success" });
    setShowCreateModal(false);
    setNewName("");
    setNewBrand("");
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Keresés saját ételek és receptek között..."
            className="w-full bg-bg-surface border border-border-hairline rounded-12 pl-9 pr-3 py-2 text-13 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand"
          />
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setShowCreateModal(true)}
        >
          Új saját étel
        </Button>
      </div>

      {/* Category Chips */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <Chip
            key={cat}
            label={cat === "all" ? "Minden étel" : cat}
            selected={selectedCategory === cat}
            onClick={() => setSelectedCategory(cat)}
            size="sm"
          />
        ))}
      </div>

      {/* Food Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredFoods.map((food) => {
          return (
            <div
              key={food.id}
              className="p-4 bg-bg-surface rounded-16 border border-border-hairline flex flex-col justify-between space-y-3 hover:border-brand/50 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-14 font-bold text-text-primary block truncate">
                    {food.name}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleToggleFav(food.id, e)}
                    className="p-1 text-text-tertiary hover:text-amber-400 transition-colors"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        food.isFavorite ? "fill-amber-400 text-amber-400" : ""
                      }`}
                    />
                  </button>
                </div>
                <span className="text-11 text-text-secondary block">
                  {food.brand || food.category || "Általános sportétel"} • {food.servingUnit || `${food.servingSizeGrams}g`}
                </span>
              </div>

              {/* Macros Row */}
              <div className="text-12 font-bold text-text-primary tabular-nums flex items-center justify-between pt-2 border-t border-border-hairline">
                {!hideCalories ? (
                  <span>{Math.round((food.caloriesPer100g * food.servingSizeGrams) / 100)} kcal</span>
                ) : (
                  <span className="text-11 text-text-secondary font-medium">1 adag</span>
                )}
                <div className="flex items-center gap-2 text-11">
                  <span className="text-brand">F: {Math.round((food.proteinPer100g * food.servingSizeGrams) / 100)}g</span>
                  <span className="text-status-ready">SZ: {Math.round((food.carbsPer100g * food.servingSizeGrams) / 100)}g</span>
                  <span className="text-text-secondary">ZS: {Math.round((food.fatPer100g * food.servingSizeGrams) / 100)}g</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Custom Food Modal */}
      {showCreateModal && (
        <BottomSheet
          isOpen={true}
          onClose={() => setShowCreateModal(false)}
          title="Új saját étel vagy recept rögzítése"
        >
          <div className="space-y-4 pb-4 text-text-primary">
            <Input
              label="Étel / recept megnevezése"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="pl. Banános zabpalacsinta"
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Márka / forrás (opcionális)"
                value={newBrand}
                onChange={(e) => setNewBrand(e.target.value)}
                placeholder="pl. Házi készítésű"
              />
              <Input
                label="Kategória"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="pl. Reggeli / Snack"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberInput
                label="Adagméret (gramm)"
                value={newServingGrams}
                onChange={(v) => setNewServingGrams(Math.max(1, v || 100))}
                min={1}
              />
              <Input
                label="Adag megnevezése"
                value={newServingUnit}
                onChange={(e) => setNewServingUnit(e.target.value)}
                placeholder="pl. 1 adag (150g)"
              />
            </div>

            <div className="p-4 bg-bg-surface rounded-14 border border-border-hairline space-y-3">
              <span className="text-12 font-bold text-text-secondary uppercase tracking-wider block">
                Tápérték adagonként ({newServingGrams} g)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <NumberInput
                  label="Kalória (kcal)"
                  value={newCalories}
                  onChange={(v) => setNewCalories(Math.max(0, v || 0))}
                  min={0}
                />
                <NumberInput
                  label="Fehérje (g)"
                  value={newProtein}
                  onChange={(v) => setNewProtein(Math.max(0, v || 0))}
                  min={0}
                />
                <NumberInput
                  label="Szénhidrát (g)"
                  value={newCarbs}
                  onChange={(v) => setNewCarbs(Math.max(0, v || 0))}
                  min={0}
                />
                <NumberInput
                  label="Zsír (g)"
                  value={newFat}
                  onChange={(v) => setNewFat(Math.max(0, v || 0))}
                  min={0}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowCreateModal(false)} className="flex-1">
                Mégse
              </Button>
              <Button variant="primary" onClick={handleSaveCustomFood} className="flex-1">
                Mentés az Ételeim közé
              </Button>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  );
};
