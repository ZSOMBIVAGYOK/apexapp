import React, { useState, useMemo, useEffect } from "react";
import {
  BeverageDefinition,
  STANDARD_BEVERAGES,
  STANDARD_PORTION_SIZES,
  calculateEffectiveHydration,
  getAllBeverages,
  createCustomBeverage
} from "@shared/lib/hydration";
import { BottomSheet, Button, Input, NumberInput, showToast } from "@shared/ui";
import { Plus, Check, Info, Sparkles, Coffee, Droplets } from "lucide-react";

interface BeveragePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogBeverage: (beverage: BeverageDefinition, volumeMl: number, note?: string) => Promise<void>;
  userId?: string;
}

export const BeveragePickerModal: React.FC<BeveragePickerModalProps> = ({
  isOpen,
  onClose,
  onLogBeverage,
  userId = "current-user"
}) => {
  const [selectedBeverageId, setSelectedBeverageId] = useState<string>("water");
  const [selectedPortion, setSelectedPortion] = useState<number>(250);
  const [customPortion, setCustomPortion] = useState<number>(250);
  const [isCustomSizeActive, setIsCustomSizeActive] = useState<boolean>(false);
  const [note, setNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Custom beverage form state
  const [showAddCustom, setShowAddCustom] = useState<boolean>(false);
  const [customName, setCustomName] = useState("");
  const [customFactor, setCustomFactor] = useState<number>(1.0);
  const [customCaffeine, setCustomCaffeine] = useState<number>(0);
  const [customSugar, setCustomSugar] = useState<number>(0);
  const [customSodium, setCustomSodium] = useState<number>(0);

  const [allBeverages, setAllBeverages] = useState<BeverageDefinition[]>(() => getAllBeverages(userId));

  useEffect(() => {
    if (isOpen) {
      setAllBeverages(getAllBeverages(userId));
    }
  }, [userId, isOpen]);

  const currentBeverage: BeverageDefinition = useMemo(() => {
    return allBeverages.find((b) => b.id === selectedBeverageId) || STANDARD_BEVERAGES[0]!;
  }, [allBeverages, selectedBeverageId]);

  const activeVolume = isCustomSizeActive ? customPortion : selectedPortion;
  const effectiveVolume = calculateEffectiveHydration(activeVolume, currentBeverage.hydrationFactor);

  const ratio = activeVolume / 100;
  const caffeineMg = Math.round((currentBeverage.caffeineMgPer100ml || 0) * ratio);
  const sugarGrams = +( (currentBeverage.sugarGramsPer100ml || 0) * ratio ).toFixed(1);
  const sodiumMg = Math.round((currentBeverage.sodiumMgPer100ml || 0) * ratio);

  const handleSelectPortion = (size: number) => {
    setSelectedPortion(size);
    setIsCustomSizeActive(false);
  };

  const handleCustomSizeChange = (val: number) => {
    setCustomPortion(val);
    setIsCustomSizeActive(true);
  };

  const handleCreateCustomBeverage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) {
      showToast({
        title: "Hiányzó név",
        message: "Kérjük add meg az egyedi ital elnevezését.",
        type: "error"
      });
      return;
    }

    const created = createCustomBeverage(userId, {
      nameHu: customName.trim(),
      nameEn: customName.trim(),
      hydrationFactor: customFactor,
      caffeineMgPer100ml: customCaffeine,
      sugarGramsPer100ml: customSugar,
      sodiumMgPer100ml: customSodium,
      icon: "🥤",
      color: "#8b5cf6"
    });

    setAllBeverages((prev) => [...prev, created]);
    setSelectedBeverageId(created.id);
    setShowAddCustom(false);
    showToast({
      title: "Egyedi ital létrehozva",
      message: `${created.nameHu} sikeresen elmentve.`,
      type: "success"
    });
  };

  const handleSubmit = async () => {
    if (activeVolume <= 0) return;
    setIsSubmitting(true);
    try {
      await onLogBeverage(currentBeverage, activeVolume, note.trim() || undefined);
      showToast({
        title: "Folyadékbevitel rögzítve",
        message: `${activeVolume} ml ${currentBeverage.nameHu} (hatékony: ${effectiveVolume} ml)`,
        type: "success"
      });
      setNote("");
      onClose();
    } catch {
      showToast({
        title: "Hiba",
        message: "Nem sikerült rögzíteni az italbevitelt.",
        type: "error"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Ital és folyadékbevitel naplózása" maxWidth="lg">
      <div className="space-y-5 max-h-[80vh] flex flex-col">
        {/* Top Toggle: Standard list or Add Custom */}
        <div className="flex items-center justify-between">
          <span className="text-12 font-bold uppercase tracking-wider text-text-secondary">
            Válassz italt ({allBeverages.length})
          </span>
          <Button
            type="button"
            variant={showAddCustom ? "primary" : "secondary"}
            size="sm"
            onClick={() => setShowAddCustom(!showAddCustom)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Saját ital
          </Button>
        </div>

        {/* Custom Beverage Creator Form */}
        {showAddCustom && (
          <form
            onSubmit={handleCreateCustomBeverage}
            className="p-4 rounded-16 border border-brand/30 bg-brand/5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-13 font-bold text-text-primary flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-brand" /> Egyedi ital definiálása
              </span>
              <button
                type="button"
                onClick={() => setShowAddCustom(false)}
                className="text-12 text-text-secondary hover:text-text-primary"
              >
                Mégse
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Ital neve"
                placeholder="pl. Házi gyömbér tea, BCAA sportital..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                required
              />

              <NumberInput
                label="Hidratációs faktor (BHI)"
                hint="1.0 = víz; >1.0 = elektrolitos/tejes; <1.0 = koffeines/alkoholos"
                value={customFactor}
                onChange={setCustomFactor}
                min={0.2}
                max={2.0}
                step={0.05}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <NumberInput
                label="Koffein / 100ml"
                unit="mg"
                value={customCaffeine}
                onChange={setCustomCaffeine}
                min={0}
                max={500}
                step={5}
              />
              <NumberInput
                label="Cukor / 100ml"
                unit="g"
                value={customSugar}
                onChange={setCustomSugar}
                min={0}
                max={50}
                step={0.5}
              />
              <NumberInput
                label="Nátrium / 100ml"
                unit="mg"
                value={customSodium}
                onChange={setCustomSodium}
                min={0}
                max={500}
                step={5}
              />
            </div>

            <div className="flex justify-end pt-1">
              <Button type="submit" variant="primary" size="sm">
                Ital mentése
              </Button>
            </div>
          </form>
        )}

        {/* Beverage Selection Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-y-auto max-h-48 pr-1">
          {allBeverages.map((bev) => {
            const isSelected = selectedBeverageId === bev.id;
            return (
              <button
                key={bev.id}
                type="button"
                onClick={() => setSelectedBeverageId(bev.id)}
                className={`p-3 rounded-14 border text-left transition-all flex items-start gap-2.5 ${
                  isSelected
                    ? "border-brand bg-brand/10 ring-1 ring-brand"
                    : "border-border-hairline bg-bg-surface hover:bg-bg-elevated"
                }`}
              >
                <span className="text-22">{bev.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-13 font-bold text-text-primary truncate block">
                      {bev.nameHu.split("(")[0]}
                    </span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-brand shrink-0" />}
                  </div>
                  <span className="text-11 font-mono font-medium text-text-secondary block">
                    Faktor: {bev.hydrationFactor.toFixed(2)}×
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Beverage Physiological Note (if present) */}
        {currentBeverage.noteHu && (
          <div className="p-3 rounded-12 bg-bg-surface border border-border-hairline flex items-start gap-2 text-12 text-text-secondary">
            <Info className="h-4 w-4 text-brand shrink-0 mt-0.5" />
            <p>{currentBeverage.noteHu}</p>
          </div>
        )}

        {/* Portion Size Chooser */}
        <div className="space-y-2">
          <span className="block text-12 font-bold uppercase tracking-wider text-text-secondary">
            Adag kiválasztása
          </span>
          <div className="grid grid-cols-4 gap-2">
            {STANDARD_PORTION_SIZES.map((size) => {
              const isSelected = !isCustomSizeActive && selectedPortion === size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => handleSelectPortion(size)}
                  className={`py-2 rounded-12 text-center text-13 font-bold font-mono border transition-all ${
                    isSelected
                      ? "bg-brand text-white border-brand shadow-sm"
                      : "bg-bg-elevated text-text-secondary border-border-hairline hover:text-text-primary"
                  }`}
                >
                  {size} ml
                </button>
              );
            })}
          </div>

          {/* Custom Size NumberInput */}
          <div className="pt-1">
            <NumberInput
              label="Egyedi mennyiség (ml)"
              unit="ml"
              min={10}
              max={3000}
              step={50}
              value={activeVolume}
              onChange={handleCustomSizeChange}
            />
          </div>
        </div>

        {/* Real-time Physiological Hydration Preview Cockpit */}
        <div className="p-4 rounded-16 bg-brand/10 border border-brand/25 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-11 font-bold uppercase tracking-wider text-text-tertiary block">
                Nyers térfogat
              </span>
              <span className="text-16 font-bold font-mono text-text-primary">
                {activeVolume} ml
              </span>
            </div>

            <div className="text-center">
              <span className="text-11 font-bold uppercase tracking-wider text-text-tertiary block">
                BHI Faktor
              </span>
              <span className="text-14 font-bold font-mono text-brand">
                × {currentBeverage.hydrationFactor.toFixed(2)}
              </span>
            </div>

            <div className="text-right">
              <span className="text-11 font-bold uppercase tracking-wider text-brand block">
                Hatékony hidratáció
              </span>
              <span className="text-22 font-bold font-mono text-brand tabular-nums">
                {effectiveVolume} ml
              </span>
            </div>
          </div>

          {/* Nutritional metadata chips */}
          <div className="flex items-center gap-2 pt-2 border-t border-brand/20 text-11 text-text-secondary">
            {caffeineMg > 0 && (
              <span className="inline-flex items-center gap-1 font-mono font-medium text-amber-400">
                <Coffee className="h-3 w-3" /> {caffeineMg} mg koffein
              </span>
            )}
            {sugarGrams > 0 && (
              <span className="font-mono">
                {sugarGrams} g cukor
              </span>
            )}
            {sodiumMg > 0 && (
              <span className="font-mono">
                {sodiumMg} mg nátrium
              </span>
            )}
          </div>
        </div>

        {/* Optional note */}
        <Input
          placeholder="Opcionális megjegyzés (pl. edzés előtti adag, hideg frissítő)..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-hairline">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Mégse
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            leftIcon={<Droplets className="h-4 w-4" />}
          >
            Bevitel rögzítése ({effectiveVolume} ml)
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};
