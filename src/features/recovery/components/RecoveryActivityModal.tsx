import React, { useState, useEffect } from "react";
import { BottomSheet, Button, Input, NumberInput, Chip, showToast } from "@shared/ui";
import {
  RecoveryActivityLog,
  RecoveryActivityType,
  RecoveryCategory
} from "@shared/types/recovery";
import {
  RECOVERY_CATEGORIES,
  getRecoveryActivityTypes,
  saveCustomRecoveryActivity,
  saveRecoveryLog
} from "@shared/lib/recovery";
import { format, subDays, parseISO } from "date-fns";
import { Plus, Check, Star, Thermometer, RotateCcw } from "lucide-react";

interface RecoveryActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  athleteId: string;
  activityToEdit?: RecoveryActivityLog | null;
  onSaved?: (log: RecoveryActivityLog) => void;
}

export const RecoveryActivityModal: React.FC<RecoveryActivityModalProps> = ({
  isOpen,
  onClose,
  athleteId,
  activityToEdit,
  onSaved
}) => {
  const [types, setTypes] = useState<RecoveryActivityType[]>([]);
  const [selectedType, setSelectedType] = useState<RecoveryActivityType | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<RecoveryCategory | "all">("all");

  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState(format(new Date(), "HH:mm"));
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [temperatureCelsius, setTemperatureCelsius] = useState<number | undefined>(undefined);
  const [rounds, setRounds] = useState<number | undefined>(undefined);
  const [bodyArea, setBodyArea] = useState("");
  const [intensity, setIntensity] = useState<"low" | "medium" | "high" | undefined>("medium");
  const [perceivedEffect, setPerceivedEffect] = useState(4);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Custom activity creation state
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState<RecoveryCategory>("other");
  const [customShowTemp, setCustomShowTemp] = useState(false);
  const [customShowRounds, setCustomShowRounds] = useState(false);
  const [customShowBodyArea, setCustomShowBodyArea] = useState(true);
  const [customShowIntensity, setCustomShowIntensity] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    getRecoveryActivityTypes(athleteId).then((loaded) => {
      setTypes(loaded);
      if (activityToEdit) {
        setDate(activityToEdit.date);
        setStartTime(activityToEdit.startTime || "18:00");
        setDurationMinutes(activityToEdit.durationMinutes || 20);
        setTemperatureCelsius(activityToEdit.temperatureCelsius);
        setRounds(activityToEdit.rounds);
        setBodyArea(activityToEdit.bodyArea || "");
        setIntensity(activityToEdit.intensity || "medium");
        setPerceivedEffect(activityToEdit.perceivedEffect || 4);
        setNotes(activityToEdit.notes || "");

        const matched = loaded.find((t) => t.id === activityToEdit.activityTypeId);
        if (matched) {
          setSelectedType(matched);
        } else {
          setSelectedType({
            id: activityToEdit.activityTypeId,
            nameHu: activityToEdit.activityName,
            nameEn: activityToEdit.activityName,
            category: activityToEdit.category,
            icon: "✨"
          });
        }
      } else {
        setDate(format(new Date(), "yyyy-MM-dd"));
        setStartTime(format(new Date(), "HH:mm"));
        setDurationMinutes(20);
        setTemperatureCelsius(undefined);
        setRounds(undefined);
        setBodyArea("");
        setIntensity("medium");
        setPerceivedEffect(4);
        setNotes("");
        setSelectedType(loaded[0] || null);
      }
    });
  }, [isOpen, athleteId, activityToEdit]);

  const handleSelectType = (type: RecoveryActivityType) => {
    setSelectedType(type);
    if (type.defaultDurationMinutes) {
      setDurationMinutes(type.defaultDurationMinutes);
    }
    if (type.category === "cold" && temperatureCelsius === undefined) {
      setTemperatureCelsius(8);
    } else if (type.category === "heat" && temperatureCelsius === undefined) {
      setTemperatureCelsius(85);
    }
  };

  const handleSetYesterday = () => {
    const cur = parseISO(date);
    setDate(format(subDays(cur, 1), "yyyy-MM-dd"));
  };

  const handleSaveCustom = async () => {
    if (!customName.trim()) {
      showToast({ title: "Hiányzó név", message: "Kérlek add meg a típus nevét!", variant: "warning" });
      return;
    }
    try {
      const created = await saveCustomRecoveryActivity(athleteId, {
        nameHu: customName.trim(),
        nameEn: customName.trim(),
        category: customCategory,
        icon: "✨",
        showTemperature: customShowTemp,
        showRounds: customShowRounds,
        showBodyArea: customShowBodyArea,
        showIntensity: customShowIntensity,
        defaultDurationMinutes: 20
      });
      setTypes((prev) => [...prev, created]);
      setSelectedType(created);
      setIsCreatingCustom(false);
      setCustomName("");
      showToast({ title: "Egyedi aktivitás elmentve", variant: "success" });
    } catch {
      showToast({ title: "Hiba mentéskor", variant: "error" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) {
      showToast({ title: "Válassz típust", variant: "warning" });
      return;
    }
    if (durationMinutes <= 0) {
      showToast({ title: "Érvénytelen időtartam", variant: "warning" });
      return;
    }

    setIsSaving(true);
    try {
      const saved = await saveRecoveryLog(athleteId, {
        id: activityToEdit ? activityToEdit.id : undefined,
        date,
        startTime,
        activityTypeId: selectedType.id,
        activityName: selectedType.nameHu,
        category: selectedType.category,
        durationMinutes,
        temperatureCelsius: selectedType.showTemperature ? temperatureCelsius : undefined,
        rounds: selectedType.showRounds ? rounds : undefined,
        bodyArea: selectedType.showBodyArea ? bodyArea.trim() : undefined,
        intensity: selectedType.showIntensity ? intensity : undefined,
        perceivedEffect,
        notes: notes.trim() || undefined
      });

      showToast({
        title: activityToEdit ? "Aktivitás frissítve" : "Regeneráció rögzítve",
        message: `${selectedType.nameHu} (${durationMinutes} perc)`,
        variant: "success"
      });

      onSaved?.(saved);
      onClose();
    } catch {
      showToast({ title: "Hiba mentés során", variant: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredTypes = types.filter((t) => {
    return selectedCategory === "all" || t.category === selectedCategory;
  });

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={activityToEdit ? "Regenerációs aktivitás szerkesztése" : "Új regeneráció rögzítése"}
    >
      <form onSubmit={handleSubmit} className="space-y-5 pb-6">
        {/* Date & Time with quick shortcut */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-3 border border-neutral-200 dark:border-neutral-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Időpont
            </span>
            <button
              type="button"
              onClick={handleSetYesterday}
              className="text-xs text-brand-primary hover:underline font-medium inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Tegnap
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-500 block mb-1">Dátum</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-transparent px-3 py-2 text-neutral-900 dark:text-neutral-100"
                required
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500 block mb-1">Kezdés</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-transparent px-3 py-2 text-neutral-900 dark:text-neutral-100"
                required
              />
            </div>
          </div>
        </div>

        {/* Activity Type Picker */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              Aktivitás típusa
            </label>
            <button
              type="button"
              onClick={() => setIsCreatingCustom(!isCreatingCustom)}
              className="text-xs font-medium text-brand-primary hover:underline inline-flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> {isCreatingCustom ? "Mégse" : "Egyedi típus"}
            </button>
          </div>

          {isCreatingCustom ? (
            <div className="bg-neutral-50 dark:bg-neutral-800/80 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-3 mb-3">
              <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                Új egyedi aktivitástípus létrehozása
              </div>
              <Input
                placeholder="Pl. Hideg-meleg lábfürdő"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
              <div>
                <label className="text-xs text-neutral-500 block mb-1">Kategória</label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value as RecoveryCategory)}
                  className="w-full text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2"
                >
                  {RECOVERY_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.nameHu}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 pt-1">
                <span className="text-xs text-neutral-500 block">Bekérendő mezők:</span>
                <div className="flex flex-wrap gap-2">
                  <Chip
                    selected={customShowTemp}
                    onClick={() => setCustomShowTemp(!customShowTemp)}
                    size="sm"
                  >
                    Hőmérséklet (°C)
                  </Chip>
                  <Chip
                    selected={customShowRounds}
                    onClick={() => setCustomShowRounds(!customShowRounds)}
                    size="sm"
                  >
                    Körök száma
                  </Chip>
                  <Chip
                    selected={customShowBodyArea}
                    onClick={() => setCustomShowBodyArea(!customShowBodyArea)}
                    size="sm"
                  >
                    Testtáj
                  </Chip>
                  <Chip
                    selected={customShowIntensity}
                    onClick={() => setCustomShowIntensity(!customShowIntensity)}
                    size="sm"
                  >
                    Intenzitás
                  </Chip>
                </div>
              </div>
              <Button type="button" size="sm" variant="primary" onClick={handleSaveCustom}>
                Típus mentése és kiválasztása
              </Button>
            </div>
          ) : (
            <>
              {/* Category filter pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                <Chip
                  selected={selectedCategory === "all"}
                  onClick={() => setSelectedCategory("all")}
                  size="sm"
                >
                  Mind
                </Chip>
                {RECOVERY_CATEGORIES.map((cat) => (
                  <Chip
                    key={cat.id}
                    selected={selectedCategory === cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    size="sm"
                  >
                    {cat.icon} {cat.nameHu}
                  </Chip>
                ))}
              </div>

              {/* Types list */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                {filteredTypes.map((type) => {
                  const isSelected = selectedType?.id === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => handleSelectType(type)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs transition-all ${
                        isSelected
                          ? "border-brand-primary bg-brand-primary/10 text-brand-primary font-medium shadow-sm"
                          : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
                      }`}
                    >
                      <span className="text-base">{type.icon}</span>
                      <span className="truncate flex-1">{type.nameHu}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-brand-primary flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Dynamic Fields Based on Selected Type */}
        {selectedType && (
          <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-3.5 border border-neutral-200 dark:border-neutral-700 space-y-4">
            <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
              <span>{selectedType.icon}</span>
              <span>{selectedType.nameHu} részletei</span>
            </div>

            {/* Duration */}
            <div>
              <label className="text-xs text-neutral-500 block mb-1">Időtartam (perc)</label>
              <NumberInput
                value={durationMinutes}
                onChange={(val) => setDurationMinutes(val || 0)}
                min={1}
                max={300}
                step={1}
              />
            </div>

            {/* Optional Temperature */}
            {selectedType.showTemperature && (
              <div>
                <label className="text-xs text-neutral-500 flex items-center gap-1 mb-1">
                  <Thermometer className="w-3.5 h-3.5" /> Hőmérséklet (°C)
                </label>
                <NumberInput
                  value={temperatureCelsius ?? 0}
                  onChange={(val) => setTemperatureCelsius(val ?? undefined)}
                  min={-15}
                  max={120}
                  step={0.5}
                />
              </div>
            )}

            {/* Optional Rounds */}
            {selectedType.showRounds && (
              <div>
                <label className="text-xs text-neutral-500 block mb-1">Körök / menetek száma</label>
                <NumberInput
                  value={rounds ?? 1}
                  onChange={(val) => setRounds(val ?? undefined)}
                  min={1}
                  max={20}
                  step={1}
                />
              </div>
            )}

            {/* Optional Body Area */}
            {selectedType.showBodyArea && (
              <div>
                <label className="text-xs text-neutral-500 block mb-1">Célzott testtáj</label>
                <Input
                  placeholder="Pl. Vádli, comb, csípőhorpasz"
                  value={bodyArea}
                  onChange={(e) => setBodyArea(e.target.value)}
                />
              </div>
            )}

            {/* Optional Intensity */}
            {selectedType.showIntensity && (
              <div>
                <label className="text-xs text-neutral-500 block mb-1">Intenzitás</label>
                <div className="flex gap-2">
                  <Chip
                    selected={intensity === "low"}
                    onClick={() => setIntensity("low")}
                    size="sm"
                  >
                    Könnyű / Enyhe
                  </Chip>
                  <Chip
                    selected={intensity === "medium"}
                    onClick={() => setIntensity("medium")}
                    size="sm"
                  >
                    Közepes
                  </Chip>
                  <Chip
                    selected={intensity === "high"}
                    onClick={() => setIntensity("high")}
                    size="sm"
                  >
                    Erős / Intenzív
                  </Chip>
                </div>
              </div>
            )}

            {/* Perceived Effect (1-5) */}
            <div>
              <label className="text-xs text-neutral-500 block mb-1">
                Érzékelt hatás (1-től 5-ig)
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setPerceivedEffect(star)}
                    className={`flex items-center justify-center p-2 rounded-lg text-sm font-semibold transition-all ${
                      perceivedEffect === star
                        ? "bg-amber-400 text-neutral-900 shadow-sm"
                        : "bg-white dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100"
                    }`}
                  >
                    <Star
                      className={`w-4 h-4 mr-1 ${
                        perceivedEffect >= star ? "fill-amber-500 text-amber-500" : "text-neutral-400"
                      }`}
                    />
                    {star}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs text-neutral-500 block mb-1">Megjegyzés (opcionális)</label>
              <Input
                placeholder="Pl. Érezhetően fellazult a combhajlító"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Mégse
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            disabled={!selectedType || isSaving}
          >
            {isSaving ? "Mentés..." : activityToEdit ? "Frissítés" : "Rögzítés"}
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
};
