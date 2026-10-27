import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  HydrationLogEntry,
  getDailyHydration,
  logBeverageIntake,
  deleteHydrationEntry,
  updateHydrationEntry,
  calculateHydrationTotals,
  STANDARD_BEVERAGES,
  BeverageDefinition
} from "@shared/lib/hydration";
import { Card, Button, Badge, showToast } from "@shared/ui";
import { BeveragePickerModal } from "./BeveragePickerModal";
import {
  Droplets,
  Plus,
  Trash2,
  Edit2,
  Check,
  Coffee,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface HydrationTrackerCardProps {
  userId?: string;
  date?: string; // YYYY-MM-DD
  targetLiters?: number;
  className?: string;
}

export const HydrationTrackerCard: React.FC<HydrationTrackerCardProps> = ({
  userId = "current-user",
  date = new Date().toISOString().slice(0, 10),
  targetLiters = 3.5,
  className = ""
}) => {
  const [entries, setEntries] = useState<HydrationLogEntry[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isListExpanded, setIsListExpanded] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editVolume, setEditVolume] = useState<number>(250);

  const targetMl = Math.round(targetLiters * 1000);

  // Fetch hydration entries
  const loadEntries = useCallback(async () => {
    try {
      const data = await getDailyHydration(userId, date);
      setEntries(data);
    } catch {
      // Fallback
    }
  }, [userId, date]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Aggregate totals
  const summary = useMemo(() => {
    return calculateHydrationTotals(entries, targetMl);
  }, [entries, targetMl]);

  // Quick add helpers
  const handleQuickAdd = async (beverageId: string, volumeMl: number) => {
    const beverage = STANDARD_BEVERAGES.find((b) => b.id === beverageId) || STANDARD_BEVERAGES[0]!;
    try {
      const entry = await logBeverageIntake(userId, {
        beverage,
        volumeMl,
        date
      });
      setEntries((prev) => [...prev, entry]);
      showToast({
        title: "Folyadék rögzítve",
        message: `+${volumeMl} ml ${beverage.nameHu.split("(")[0]} hozzáadva.`,
        type: "success"
      });
    } catch {
      showToast({
        title: "Hiba",
        message: "Nem sikerült hozzáadni a folyadékot.",
        type: "error"
      });
    }
  };

  const handleModalLog = async (beverage: BeverageDefinition, volumeMl: number, note?: string) => {
    const entry = await logBeverageIntake(userId, {
      beverage,
      volumeMl,
      date,
      note
    });
    setEntries((prev) => [...prev, entry]);
  };

  const handleDelete = async (entryId: string) => {
    try {
      await deleteHydrationEntry(userId, entryId, date);
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      showToast({
        title: "Törölve",
        message: "Italbejegyzés eltávolítva a mai naplóból.",
        type: "info"
      });
    } catch {
      showToast({
        title: "Hiba",
        message: "Nem sikerült törölni a bejegyzést.",
        type: "error"
      });
    }
  };

  const handleStartEdit = (entry: HydrationLogEntry) => {
    setEditingEntryId(entry.id);
    setEditVolume(entry.volumeMl);
  };

  const handleSaveEdit = async (entry: HydrationLogEntry) => {
    const effective = Math.round(editVolume * entry.hydrationFactor);
    try {
      await updateHydrationEntry(userId, entry.id, date, {
        volumeMl: editVolume,
        effectiveVolumeMl: effective
      });
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id
            ? { ...e, volumeMl: editVolume, effectiveVolumeMl: effective }
            : e
        )
      );
      setEditingEntryId(null);
      showToast({
        title: "Frissítve",
        message: "Mennyiség sikeresen módosítva.",
        type: "success"
      });
    } catch {
      showToast({
        title: "Hiba",
        message: "Nem sikerült frissíteni a mennyiséget.",
        type: "error"
      });
    }
  };

  const effectiveLiters = (summary.totalEffectiveVolumeMl / 1000).toFixed(2);
  const rawLiters = (summary.totalRawVolumeMl / 1000).toFixed(2);

  return (
    <Card variant="surface" radius="20" className={`p-5 sm:p-6 space-y-5 ${className}`}>
      {/* Header and Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-14 bg-sky-500/10 text-sky-400">
            <Droplets className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-16 font-bold text-text-primary">Folyadékbevitel és Hidratáció</h3>
              {summary.progressPercent >= 100 && (
                <Badge variant="ready" size="sm">
                  Cél elérve
                </Badge>
              )}
            </div>
            <p className="text-12 text-text-secondary mt-0.5">
              BHI (Beverage Hydration Index) alapú számítás az effektív sejtszintű folyadékhasznosuláshoz
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsPickerOpen(true)}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Ital hozzáadása
        </Button>
      </div>

      {/* Main Hydration Metrics Cockpit */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-18 bg-bg-elevated/70 border border-border-hairline">
        {/* Effective Hydration */}
        <div className="space-y-1">
          <span className="text-11 font-bold uppercase tracking-wider text-brand block">
            Hatékony Hidratáció
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-28 font-bold font-mono text-text-primary tabular-nums">
              {effectiveLiters}
            </span>
            <span className="text-13 text-text-secondary font-mono">
              / {targetLiters.toFixed(1)} l
            </span>
          </div>
          <span className="text-11 text-text-tertiary block">
            Térfogat × BHI faktor hasznosulás
          </span>
        </div>

        {/* Raw Ingested Volume */}
        <div className="space-y-1">
          <span className="text-11 font-bold uppercase tracking-wider text-text-secondary block">
            Nyers Bevitel
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-28 font-bold font-mono text-text-secondary tabular-nums">
              {rawLiters}
            </span>
            <span className="text-13 text-text-tertiary font-mono">liter</span>
          </div>
          <span className="text-11 text-text-tertiary block">
            Összesen elfogyasztott folyadék
          </span>
        </div>

        {/* Nutritional Byproducts (Caffeine, Sugar, Sodium) */}
        <div className="space-y-1 sm:border-l sm:border-border-hairline sm:pl-4">
          <span className="text-11 font-bold uppercase tracking-wider text-text-secondary block">
            Italokból bevitt anyagok
          </span>
          <div className="space-y-1 pt-0.5 text-12">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-text-secondary">
                <Coffee className="h-3 w-3 text-amber-500" /> Koffein:
              </span>
              <span className={`font-mono font-bold ${summary.totalCaffeineMg > 400 ? "text-amber-400" : "text-text-primary"}`}>
                {summary.totalCaffeineMg} mg
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Cukor:</span>
              <span className="font-mono text-text-primary font-medium">
                {summary.totalSugarGrams} g
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Nátrium:</span>
              <span className="font-mono text-text-primary font-medium">
                {summary.totalSodiumMg} mg
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-12">
          <span className="font-medium text-text-secondary">Napi folyadékcél haladás</span>
          <span className="font-mono font-bold text-brand tabular-nums">
            {summary.progressPercent}%
          </span>
        </div>
        <div className="h-2.5 w-full bg-bg-surface rounded-full overflow-hidden border border-border-hairline">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              summary.progressPercent >= 100
                ? "bg-status-ready"
                : summary.progressPercent >= 60
                  ? "bg-brand"
                  : "bg-status-caution"
            }`}
            style={{ width: `${Math.min(100, summary.progressPercent)}%` }}
          />
        </div>
      </div>

      {/* Quick Add Buttons for User's Frequent Drinks */}
      <div className="space-y-2">
        <span className="text-11 font-semibold uppercase tracking-wider text-text-tertiary block">
          Gyors rögzítés:
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleQuickAdd("water", 250)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-12 text-12 font-medium bg-bg-elevated border border-border-hairline hover:bg-bg-surface hover:border-brand/40 transition-all text-text-primary"
          >
            <span>💧</span>
            <span>Víz 250 ml</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickAdd("water", 500)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-12 text-12 font-medium bg-bg-elevated border border-border-hairline hover:bg-bg-surface hover:border-brand/40 transition-all text-text-primary"
          >
            <span>💧</span>
            <span>Víz 500 ml</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickAdd("electrolyte_ors", 500)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-12 text-12 font-medium bg-bg-elevated border border-border-hairline hover:bg-bg-surface hover:border-brand/40 transition-all text-text-primary"
          >
            <span>🧂</span>
            <span>Elektrolit 500 ml</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickAdd("coffee", 150)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-12 text-12 font-medium bg-bg-elevated border border-border-hairline hover:bg-bg-surface hover:border-brand/40 transition-all text-text-primary"
          >
            <span>☕</span>
            <span>Kávé 150 ml</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPickerOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-12 text-12 font-medium border border-dashed border-border-subtle text-text-secondary hover:text-text-primary hover:border-brand transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Egyéb ital / Saját</span>
          </button>
        </div>
      </div>

      {/* Today's Logged Drinks List (Expandable progressive disclosure) */}
      <div className="pt-2 border-t border-border-hairline space-y-2">
        <button
          type="button"
          onClick={() => setIsListExpanded(!isListExpanded)}
          className="w-full flex items-center justify-between text-12 font-semibold uppercase tracking-wider text-text-secondary hover:text-text-primary py-1 transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <span>Mai italok listája ({entries.length})</span>
            {summary.totalCaffeineMg > 0 && (
              <span className="text-11 normal-case text-amber-400 font-mono">
                • {summary.totalCaffeineMg} mg koffein
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-text-tertiary">
            <span>{isListExpanded ? "Összecsukás" : "Részletek"}</span>
            {isListExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </button>

        {isListExpanded && (
          <div className="space-y-1.5 pt-1">
            {entries.length === 0 ? (
              <div className="text-center py-4 text-text-secondary text-13">
                Még nem rögzítettél folyadékbevitelt a mai napra.
              </div>
            ) : (
              entries.map((entry) => {
                const isEditing = editingEntryId === entry.id;

                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-2.5 rounded-12 bg-bg-surface border border-border-hairline text-13"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-18">{entry.icon || "💧"}</span>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-text-primary truncate">
                            {entry.beverageName.split("(")[0]}
                          </span>
                          <span className="text-11 font-mono text-text-tertiary">
                            {entry.timeStr}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-11 text-text-secondary">
                          <span className="font-mono">{entry.volumeMl} ml</span>
                          <span>→</span>
                          <span className="font-mono text-brand font-medium">
                            {entry.effectiveVolumeMl} ml effektív
                          </span>
                          {entry.caffeineMg > 0 && (
                            <span className="text-amber-400 font-mono">
                              ({entry.caffeineMg} mg koffein)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={editVolume}
                            onChange={(e) => setEditVolume(Number(e.target.value))}
                            className="w-16 h-8 text-center text-12 font-mono bg-bg-elevated border border-border-hairline rounded-8 text-text-primary"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(entry)}
                            className="p-1.5 rounded-8 bg-brand text-white hover:bg-brand/90 transition-colors"
                            title="Mentés"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(entry)}
                            className="p-1.5 rounded-8 text-text-tertiary hover:text-text-primary hover:bg-bg-elevated transition-colors"
                            title="Mennyiség szerkesztése"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(entry.id)}
                            className="p-1.5 rounded-8 text-text-tertiary hover:text-status-rest hover:bg-bg-elevated transition-colors"
                            title="Bejegyzés törlése"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Beverage Picker Bottom Sheet */}
      <BeveragePickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onLogBeverage={handleModalLog}
        userId={userId}
      />
    </Card>
  );
};
