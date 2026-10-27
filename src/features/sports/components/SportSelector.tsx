import React, { useState, useEffect } from "react";
import {
  getCommonSports,
  getSportById,
  SportDefinition,
  getCustomSports
} from "@shared/lib/sports";
import { Button } from "@shared/ui";
import { SportPickerSheet } from "./SportPickerSheet";
import { Plus, X, Star } from "lucide-react";

interface SportSelectorProps {
  selectedSports: string[];
  onSportsChange: (sports: string[]) => void;
  mainSport?: string;
  onMainSportChange?: (mainSport: string) => void;
  userId?: string;
  label?: string;
  hint?: string;
  error?: string;
}

export const SportSelector: React.FC<SportSelectorProps> = ({
  selectedSports,
  onSportsChange,
  mainSport,
  onMainSportChange,
  userId = "current-user",
  label = "Sportágak",
  hint,
  error
}) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [customSports, setCustomSports] = useState<SportDefinition[]>([]);

  // Load user custom sports
  useEffect(() => {
    if (userId) {
      getCustomSports(userId).then(setCustomSports).catch(() => {});
    }
  }, [userId]);

  const commonSports = getCommonSports(customSports).slice(0, 10);

  const handleToggleSport = (sportId: string) => {
    if (selectedSports.includes(sportId)) {
      const updated = selectedSports.filter((id) => id !== sportId);
      onSportsChange(updated);
      // If we removed the main sport, designate the first remaining sport as main sport
      if (mainSport === sportId) {
        onMainSportChange?.(updated[0] || "");
      }
    } else {
      const updated = [...selectedSports, sportId];
      onSportsChange(updated);
      // If no main sport set yet, set this one as main
      if (!mainSport && onMainSportChange) {
        onMainSportChange(sportId);
      }
    }
  };

  const handleSetMainSport = (sportId: string) => {
    if (!selectedSports.includes(sportId)) {
      onSportsChange([...selectedSports, sportId]);
    }
    onMainSportChange?.(sportId);
  };

  const handleCustomSportCreated = (newSport: SportDefinition) => {
    setCustomSports((prev) => [...prev, newSport]);
  };

  return (
    <div className="space-y-3">
      {label && (
        <div className="flex items-center justify-between">
          <span className="block text-12 font-medium uppercase tracking-wider text-text-secondary">
            {label}
          </span>
          {mainSport && (
            <span className="text-11 text-brand font-medium">
              Fő sportág: <span className="font-bold">{getSportById(mainSport, customSports)?.nameHu || mainSport}</span>
            </span>
          )}
        </div>
      )}

      {/* Selected Sports Removable Chips Area */}
      {selectedSports.length > 0 && (
        <div className="p-3.5 rounded-16 border border-border-hairline bg-bg-surface/50 space-y-2">
          <div className="flex items-center justify-between text-11 font-semibold uppercase tracking-wider text-text-tertiary">
            <span>Kiválasztott sportágak ({selectedSports.length})</span>
            <span>Kattints a csillagra a fő sportág kijelöléséhez</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedSports.map((id) => {
              const def = getSportById(id, customSports);
              const name = def?.nameHu || id;
              const icon = def?.icon || "🏅";
              const isMain = mainSport === id;

              return (
                <div
                  key={id}
                  className={`inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-12 border text-13 font-medium transition-all ${
                    isMain
                      ? "border-brand bg-brand/15 text-text-primary ring-1 ring-brand"
                      : "border-border-hairline bg-bg-surface text-text-primary hover:border-brand/40"
                  }`}
                >
                  <span>{icon}</span>
                  <span className="font-semibold">{name}</span>

                  {/* Main Sport Badge / Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleSetMainSport(id)}
                    title={isMain ? "Fő sportág" : "Kijelölés fő sportágként"}
                    aria-label={isMain ? "Fő sportág" : `Kijelölés fő sportágként: ${name}`}
                    className={`p-1 rounded-6 transition-colors ${
                      isMain
                        ? "text-brand hover:text-brand/80"
                        : "text-text-tertiary hover:text-brand"
                    }`}
                  >
                    <Star
                      className={`h-3.5 w-3.5 ${isMain ? "fill-brand text-brand" : ""}`}
                    />
                  </button>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleSport(id)}
                    title={`Eltávolítás: ${name}`}
                    aria-label={`Eltávolítás: ${name}`}
                    className="p-1 rounded-6 text-text-tertiary hover:text-status-rest hover:bg-bg-elevated transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Common Sports Quick-Add Chips */}
      <div className="space-y-1.5">
        <span className="text-11 text-text-secondary block">
          Gyakori sportágak gyors hozzáadása:
        </span>
        <div className="flex flex-wrap gap-2 items-center">
          {commonSports.map((sport) => {
            const isSelected = selectedSports.includes(sport.id);
            return (
              <button
                key={sport.id}
                type="button"
                onClick={() => handleToggleSport(sport.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-12 text-13 font-medium border transition-all ${
                  isSelected
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-border-hairline bg-bg-elevated text-text-secondary hover:text-text-primary hover:border-border-subtle"
                }`}
              >
                <span>{sport.icon || "🏅"}</span>
                <span>{sport.nameHu}</span>
              </button>
            );
          })}

          {/* Több sport button */}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsSheetOpen(true)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Több sport ({getCustomSports.length + 80}+)
          </Button>
        </div>
      </div>

      {error ? (
        <p className="text-12 text-status-rest">{error}</p>
      ) : hint ? (
        <p className="text-12 text-text-secondary">{hint}</p>
      ) : null}

      {/* Searchable Sport Catalog Sheet */}
      <SportPickerSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        selectedSportIds={selectedSports}
        onToggleSport={handleToggleSport}
        mainSportId={mainSport}
        onSetMainSport={handleSetMainSport}
        userId={userId}
        customSports={customSports}
        onCustomSportCreated={handleCustomSportCreated}
      />
    </div>
  );
};
