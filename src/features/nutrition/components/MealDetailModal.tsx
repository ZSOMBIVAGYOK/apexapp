import React, { useState } from "react";
import { BottomSheet, Button, Badge, Input, showToast } from "@shared/ui";
import {
  Trash2,
  MessageSquare,
  CheckCircle2,
  UserCheck,
  Send
} from "lucide-react";
import { LoggedMeal, MealType } from "@shared/types/nutrition";


interface MealDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  meal: LoggedMeal | null;
  onDeleteItem: (itemId: string) => void;
  onAddDietitianComment?: (comment: string) => void;
  isDietitianView?: boolean;
}

export const MealDetailModal: React.FC<MealDetailModalProps> = ({
  isOpen,
  onClose,
  meal,
  onDeleteItem,
  onAddDietitianComment,
  isDietitianView = false
}) => {
  const [commentText, setCommentText] = useState("");

  if (!meal) return null;

  const mealLabels: Record<MealType, string> = {
    breakfast: "Reggeli",
    lunch: "Ebéd",
    dinner: "Vacsora",
    snack: "Snack / Tízórai",
    during_training: "Edzés közben"
  };

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    if (onAddDietitianComment) {
      onAddDietitianComment(commentText.trim());
      setCommentText("");
      showToast({
        title: "Dietetikusi megjegyzés elküldve",
        message: "A sportoló értesítést kap az étrend elemzéséről.",
        type: "success"
      });
    }
  };

  // Aggregate micronutrients and detect missing coverage
  const aggregatedMicros: Record<string, { total: number; unit: string; missingCount: number }> = {
    fiber: { total: 0, unit: "g", missingCount: 0 },
    sugar: { total: 0, unit: "g", missingCount: 0 },
    saturatedFat: { total: 0, unit: "g", missingCount: 0 },
    sodium: { total: 0, unit: "mg", missingCount: 0 },
    potassium: { total: 0, unit: "mg", missingCount: 0 },
    calcium: { total: 0, unit: "mg", missingCount: 0 },
    iron: { total: 0, unit: "mg", missingCount: 0 },
    vitaminD: { total: 0, unit: "mcg", missingCount: 0 },
    vitaminB12: { total: 0, unit: "mcg", missingCount: 0 },
    magnesium: { total: 0, unit: "mg", missingCount: 0 },
    zinc: { total: 0, unit: "mg", missingCount: 0 },
    omega3: { total: 0, unit: "g", missingCount: 0 }
  };

  const microLabels: Record<string, string> = {
    fiber: "Élelmi rost",
    sugar: "Cukor",
    saturatedFat: "Telített zsírsav",
    sodium: "Nátrium",
    potassium: "Kálium",
    calcium: "Kalcium",
    iron: "Vas",
    vitaminD: "D-vitamin",
    vitaminB12: "B12-vitamin",
    magnesium: "Magnézium",
    zinc: "Cink",
    omega3: "Omega-3"
  };

  for (const item of meal.items) {
    const m = item.micros || {};
    const check = (key: string, val: number | undefined) => {
      const entry = aggregatedMicros[key];
      if (!entry) return;
      if (typeof val === "number") {
        entry.total += val;
      } else {
        entry.missingCount++;
      }
    };

    check("fiber", m.fiberGrams);
    check("sugar", m.sugarGrams);
    check("saturatedFat", m.saturatedFatGrams);
    check("sodium", m.sodiumMg);
    check("potassium", m.potassiumMg);
    check("calcium", m.calciumMg);
    check("iron", m.ironMg);
    check("vitaminD", m.vitaminDMcg);
    check("vitaminB12", m.vitaminB12Mcg);
    check("magnesium", m.magnesiumMg);
    check("zinc", m.zincMg);
    check("omega3", m.omega3Grams);
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={`${mealLabels[meal.mealType]} részletei`}
      description={`Időpont: ${meal.time} • Összesen: ${meal.totalCalories} kcal`}
      footer={
        <Button variant="primary" fullWidth onClick={onClose}>
          Bezárás
        </Button>
      }
    >
      <div className="space-y-6 py-2">
        {/* Macro Summary Header */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-3 rounded-12 bg-bg-surface border border-border-hairline">
            <span className="text-11 text-text-secondary block font-medium">Kalória</span>
            <span className="text-16 font-bold text-text-primary tabular-nums mt-0.5 block">
              {meal.totalCalories}
            </span>
            <span className="text-10 text-text-tertiary">kcal</span>
          </div>
          <div className="p-3 rounded-12 bg-bg-surface border border-border-hairline">
            <span className="text-11 text-text-secondary block font-medium">Fehérje</span>
            <span className="text-16 font-bold text-text-primary tabular-nums mt-0.5 block">
              {meal.totalProteinGrams}
            </span>
            <span className="text-10 text-text-tertiary">g</span>
          </div>
          <div className="p-3 rounded-12 bg-bg-surface border border-border-hairline">
            <span className="text-11 text-text-secondary block font-medium">Szénhidrát</span>
            <span className="text-16 font-bold text-text-primary tabular-nums mt-0.5 block">
              {meal.totalCarbsGrams}
            </span>
            <span className="text-10 text-text-tertiary">g</span>
          </div>
          <div className="p-3 rounded-12 bg-bg-surface border border-border-hairline">
            <span className="text-11 text-text-secondary block font-medium">Zsír</span>
            <span className="text-16 font-bold text-text-primary tabular-nums mt-0.5 block">
              {meal.totalFatGrams}
            </span>
            <span className="text-10 text-text-tertiary">g</span>
          </div>
        </div>

        {/* Logged Items List */}
        <div className="space-y-3">
          <h4 className="text-13 font-semibold text-text-secondary uppercase tracking-wider">
            Rögzített ételek ({meal.items.length})
          </h4>

          {meal.items.length === 0 ? (
            <div className="p-4 rounded-12 bg-bg-surface border border-border-hairline text-center text-12 text-text-secondary">
              Nincs étel ebben az étkezésben.
            </div>
          ) : (
            <div className="space-y-2">
              {meal.items.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-12 bg-bg-surface border border-border-hairline flex items-center justify-between"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-13 font-semibold text-text-primary truncate">
                        {item.name}
                      </span>
                      {item.mode === "quick" && (
                        <Badge variant="neutral" size="sm">
                          Gyors becslés
                        </Badge>
                      )}
                    </div>
                    <div className="text-11 text-text-secondary mt-0.5">
                      {item.servingGrams}g •{" "}
                      <span className="font-semibold text-text-primary tabular-nums">
                        {item.calories} kcal
                      </span>{" "}
                      (F: {item.proteinGrams}g, Sz: {item.carbsGrams}g, Zs: {item.fatGrams}g)
                    </div>
                    {item.photoUrl && (
                      <div className="text-11 text-brand mt-1 truncate">
                        📷 Fotójegyzet: {item.photoUrl}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm("Biztosan törölni szeretnéd ezt az ételt az étkezésből?")) return;
                      if (onDeleteItem) onDeleteItem(item.id);
                    }}
                    className="p-2 text-text-tertiary hover:text-status-rest transition-colors rounded-8 hover:bg-status-rest/10"
                    title="Törlés"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detailed Micronutrient Breakdown with Honest Coverage */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-13 font-semibold text-text-secondary uppercase tracking-wider">
              Mikrotápanyagok & fedettség
            </h4>
            <span className="text-11 text-text-tertiary">
              Címke-alapú analízis
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(aggregatedMicros).map(([key, data]) => {
              const label = microLabels[key] || key;
              const hasData = data.total > 0;
              const isSparse = data.missingCount > 0;

              return (
                <div
                  key={key}
                  className="p-2.5 rounded-10 bg-bg-surface border border-border-hairline space-y-1"
                >
                  <div className="flex items-center justify-between text-11">
                    <span className="text-text-secondary truncate">{label}</span>
                    {isSparse ? (
                      <span
                        className="text-[10px] text-status-caution font-medium px-1 rounded bg-status-caution/10"
                        title={`${data.missingCount} étel címkéje nem tartalmaz erről adatot.`}
                      >
                        Adathiányos
                      </span>
                    ) : (
                      <CheckCircle2 className="w-3 h-3 text-status-ready" />
                    )}
                  </div>
                  <div className="text-14 font-bold text-text-primary tabular-nums">
                    {hasData ? (
                      <>
                        {Math.round(data.total * 10) / 10}{" "}
                        <span className="text-11 font-normal text-text-tertiary">
                          {data.unit}
                        </span>
                      </>
                    ) : (
                      <span className="text-text-tertiary text-12 font-normal">
                        Nincs adat
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dietitian Feedback & Specialist Comments */}
        <div className="space-y-3 pt-2 border-t border-border-hairline">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-brand" />
            <h4 className="text-13 font-semibold text-text-primary">
              Dietetikusi visszajelzés és konzultáció
            </h4>
          </div>

          {meal.dietitianComments && meal.dietitianComments.length > 0 ? (
            <div className="space-y-2">
              {meal.dietitianComments.map((comment) => (
                <div
                  key={comment.id}
                  className="p-3 rounded-12 bg-bg-surface border border-brand/30 space-y-1"
                >
                  <div className="flex items-center justify-between text-11">
                    <span className="font-semibold text-brand">
                      {comment.dietitianName} (Sportdietetikus)
                    </span>
                    <span className="text-text-tertiary">
                      {new Date(comment.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>
                  <p className="text-12 text-text-primary">{comment.comment}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-12 bg-bg-surface/50 border border-border-hairline text-12 text-text-secondary">
              Nincs még dietetikusi megjegyzés ehhez az étkezéshez.
            </div>
          )}

          {/* Form to leave comments if Dietitian */}
          {(isDietitianView || onAddDietitianComment) && (
            <form onSubmit={handleSendComment} className="flex gap-2 pt-1">
              <Input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Írj szakmai megjegyzést vagy javaslatot az étkezéshez..."
                leftIcon={<MessageSquare className="w-4 h-4 text-text-tertiary" />}
              />
              <Button
                variant="primary"
                type="submit"
                disabled={!commentText.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          )}
        </div>
      </div>
    </BottomSheet>
  );
};
