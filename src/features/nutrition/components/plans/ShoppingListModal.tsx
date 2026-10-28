import React, { useState, useEffect } from "react";
import { BottomSheet, Button, showToast } from "@shared/ui";
import { ShoppingListItem } from "@shared/types/mealPlan";
import { getPlannedDaysRange } from "@shared/lib/repositories/plannedDayRepository";
import { aggregateShoppingList, formatShoppingListAsText } from "@shared/lib/nutrition/mealPlanEngine";
import { CheckSquare, Square, Copy, Share2, ShoppingCart, Calendar } from "lucide-react";
import { addDays, startOfWeek, endOfWeek, format } from "date-fns";

interface ShoppingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  athleteId: string;
  currentDate?: string;
}

export const ShoppingListModal: React.FC<ShoppingListModalProps> = ({
  isOpen,
  onClose,
  athleteId,
  currentDate = new Date().toISOString().split("T")[0]!
}) => {
  const [rangePreset, setRangePreset] = useState<"next3" | "currentWeek" | "nextWeek">("next3");
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dateRangeLabel, setDateRangeLabel] = useState("");

  useEffect(() => {
    if (!isOpen || !athleteId) return;

    const baseDate = new Date(currentDate);
    let start: Date;
    let end: Date;

    if (rangePreset === "next3") {
      start = baseDate;
      end = addDays(baseDate, 2);
    } else if (rangePreset === "currentWeek") {
      start = startOfWeek(baseDate, { weekStartsOn: 1 });
      end = endOfWeek(baseDate, { weekStartsOn: 1 });
    } else {
      const nextMon = addDays(startOfWeek(baseDate, { weekStartsOn: 1 }), 7);
      start = nextMon;
      end = addDays(nextMon, 6);
    }

    const startStr = format(start, "yyyy-MM-dd");
    const endStr = format(end, "yyyy-MM-dd");
    setDateRangeLabel(`${format(start, "yyyy.MM.dd")} - ${format(end, "yyyy.MM.dd")}`);

    setIsLoading(true);
    getPlannedDaysRange(athleteId, startStr, endStr)
      .then((days) => {
        const aggregated = aggregateShoppingList(days);
        setItems(aggregated);
      })
      .catch((err) => {
        console.warn("Failed fetching planned days for shopping list:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, athleteId, currentDate, rangePreset]);

  const toggleCheck = (index: number) => {
    const updated = [...items];
    updated[index] = { ...updated[index]!, checked: !updated[index]!.checked };
    setItems(updated);
  };

  const handleCopy = async () => {
    const text = formatShoppingListAsText(items, dateRangeLabel);
    try {
      await navigator.clipboard.writeText(text);
      showToast({ title: "Vágólapra másolva", message: "Bevásárlólista a vágólapra másolva!", variant: "success" });
    } catch {
      showToast({ title: "Hiba", message: "Nem sikerült a vágólapra másolni.", variant: "error" });
    }
  };

  const handleShare = async () => {
    const text = formatShoppingListAsText(items, dateRangeLabel);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Apex Bevásárlólista (${dateRangeLabel})`,
          text
        });
      } catch {
        // user cancelled
      }
    } else {
      handleCopy();
    }
  };

  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Bevásárlólista">
      <div className="space-y-5 pb-6 text-text-primary">
        {/* Preset Selector */}
        <div className="flex gap-2 p-1 bg-bg-surface rounded-12 border border-border-hairline">
          <button
            type="button"
            onClick={() => setRangePreset("next3")}
            className={`flex-1 py-1.5 rounded-10 text-12 font-semibold transition-all ${
              rangePreset === "next3"
                ? "bg-brand text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Következő 3 nap
          </button>
          <button
            type="button"
            onClick={() => setRangePreset("currentWeek")}
            className={`flex-1 py-1.5 rounded-10 text-12 font-semibold transition-all ${
              rangePreset === "currentWeek"
                ? "bg-brand text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Ez a hét
          </button>
          <button
            type="button"
            onClick={() => setRangePreset("nextWeek")}
            className={`flex-1 py-1.5 rounded-10 text-12 font-semibold transition-all ${
              rangePreset === "nextWeek"
                ? "bg-brand text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Következő hét
          </button>
        </div>

        {/* Date range & Progress */}
        <div className="flex items-center justify-between text-12 text-text-secondary">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-brand" />
            <span className="font-semibold">{dateRangeLabel}</span>
          </div>
          {items.length > 0 && (
            <span>
              {checkedCount} / {items.length} tétel beszerezve
            </span>
          )}
        </div>

        {/* Ingredients Checklist */}
        <div className="min-h-48 max-h-80 overflow-y-auto space-y-2 pr-1">
          {isLoading ? (
            <div className="py-12 text-center text-text-tertiary text-13">
              Összetevők összegzése...
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <ShoppingCart className="w-8 h-8 text-text-tertiary mx-auto" />
              <p className="text-13 text-text-secondary font-medium">
                Nincsenek receptek vagy ételek a kiválasztott időszakra.
              </p>
              <p className="text-11 text-text-tertiary max-w-xs mx-auto">
                Állíts össze napokat az Étrendtervben, és az ételek recept-összetevői automatikusan megjelennek itt!
              </p>
            </div>
          ) : (
            items.map((item, idx) => (
              <div
                key={idx}
                onClick={() => toggleCheck(idx)}
                className={`p-3 rounded-12 border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                  item.checked
                    ? "bg-bg-surface/50 border-border-hairline text-text-tertiary line-through"
                    : "bg-bg-surface border-border-hairline hover:bg-bg-elevated"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.checked ? (
                    <CheckSquare className="w-5 h-5 text-status-ready shrink-0" />
                  ) : (
                    <Square className="w-5 h-5 text-text-tertiary shrink-0" />
                  )}
                  <div className="min-w-0">
                    <span className="text-13 font-bold block truncate">
                      {item.name}
                    </span>
                    {item.sourceRecipes.length > 0 && (
                      <span className="text-10 text-text-tertiary block truncate">
                        {item.sourceRecipes.join(", ")}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-13 font-bold text-brand tabular-nums shrink-0">
                  {item.amount} {item.unit}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Action Buttons */}
        {items.length > 0 && (
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              leftIcon={<Copy className="w-4 h-4" />}
              onClick={handleCopy}
              className="flex-1"
            >
              Másolás
            </Button>
            <Button
              variant="primary"
              leftIcon={<Share2 className="w-4 h-4" />}
              onClick={handleShare}
              className="flex-1"
            >
              Megosztás
            </Button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
