import React from "react";
import { useTranslation } from "react-i18next";

export interface WeekdayItem {
  dayNumber: number; // 1 = Monday ... 7 = Sunday (ISO 8601)
  shortHu: string;
  shortEn: string;
  nameHu: string;
  nameEn: string;
}

export const WEEKDAYS: WeekdayItem[] = [
  { dayNumber: 1, shortHu: "H", shortEn: "M", nameHu: "Hétfő", nameEn: "Monday" },
  { dayNumber: 2, shortHu: "K", shortEn: "T", nameHu: "Kedd", nameEn: "Tuesday" },
  { dayNumber: 3, shortHu: "Sz", shortEn: "W", nameHu: "Szerda", nameEn: "Wednesday" },
  { dayNumber: 4, shortHu: "Cs", shortEn: "T", nameHu: "Csütörtök", nameEn: "Thursday" },
  { dayNumber: 5, shortHu: "P", shortEn: "F", nameHu: "Péntek", nameEn: "Friday" },
  { dayNumber: 6, shortHu: "Sz", shortEn: "S", nameHu: "Szombat", nameEn: "Saturday" },
  { dayNumber: 7, shortHu: "V", shortEn: "S", nameHu: "Vasárnap", nameEn: "Sunday" }
];

export interface WeekdayPickerProps {
  value: number[]; // Array of weekday numbers: [1, 2, 3, ...]
  onChange: (days: number[]) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}

export const WeekdayPicker: React.FC<WeekdayPickerProps> = ({
  value = [1, 2, 3, 4, 5],
  onChange,
  label = "Edzésnapok a héten",
  hint,
  disabled = false,
  className = ""
}) => {
  const { i18n } = useTranslation();
  const isHu = i18n.language !== "en";

  const toggleDay = (day: number) => {
    if (disabled) return;
    const exists = value.includes(day);
    const updated = exists ? value.filter((d) => d !== day) : [...value, day];
    // Keep weekdays cleanly sorted 1..7
    updated.sort((a, b) => a - b);
    onChange(updated);
  };

  const applyPreset = (presetDays: number[]) => {
    if (disabled) return;
    onChange([...presetDays].sort((a, b) => a - b));
  };

  const count = value.length;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header and Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <div>
          {label && (
            <span className="block text-12 font-medium uppercase tracking-wider text-text-secondary">
              {label}
            </span>
          )}
          {hint && <span className="text-11 text-text-tertiary block">{hint}</span>}
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-12 font-bold font-mono bg-brand/10 text-brand border border-brand/20">
            {count} {isHu ? "nap / hét" : "days / week"}
          </span>
        </div>
      </div>

      {/* Seven Large Weekday Toggle Chips */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
        {WEEKDAYS.map((day) => {
          const isSelected = value.includes(day.dayNumber);
          const short = isHu ? day.shortHu : day.shortEn;
          const full = isHu ? day.nameHu : day.nameEn;

          return (
            <button
              key={day.dayNumber}
              type="button"
              disabled={disabled}
              onClick={() => toggleDay(day.dayNumber)}
              title={full}
              aria-label={`${full} (${isSelected ? "kiválasztva" : "nincs kiválasztva"})`}
              aria-pressed={isSelected}
              className={`flex flex-col items-center justify-center h-12 sm:h-14 rounded-16 border text-center transition-all ${
                isSelected
                  ? "bg-brand text-white border-brand shadow-sm ring-2 ring-brand/30 active:scale-95"
                  : "bg-bg-elevated text-text-secondary border-border-hairline hover:border-brand/40 hover:text-text-primary hover:bg-bg-surface active:scale-95"
              } disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand`}
            >
              <span className="text-16 sm:text-18 font-bold font-mono tracking-tight leading-none">
                {short}
              </span>
              <span className="text-[9px] sm:text-[10px] font-medium opacity-80 mt-0.5 hidden xs:block truncate max-w-full px-1">
                {full.slice(0, 3)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Quick Presets */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-11 text-text-tertiary mr-1">
          {isHu ? "Gyorsbeállítás:" : "Presets:"}
        </span>

        <button
          type="button"
          disabled={disabled}
          onClick={() => applyPreset([1, 2, 3, 4, 5])}
          className="px-2.5 py-1 text-11 font-medium rounded-8 bg-bg-surface border border-border-hairline text-text-secondary hover:text-text-primary hover:border-border-subtle transition-all"
        >
          {isHu ? "Hétköznap (H-P)" : "Weekdays (M-F)"}
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => applyPreset([6, 7])}
          className="px-2.5 py-1 text-11 font-medium rounded-8 bg-bg-surface border border-border-hairline text-text-secondary hover:text-text-primary hover:border-border-subtle transition-all"
        >
          {isHu ? "Hétvégén (Sz-V)" : "Weekend (S-S)"}
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => applyPreset([1, 3, 5])}
          className="px-2.5 py-1 text-11 font-medium rounded-8 bg-bg-surface border border-border-hairline text-text-secondary hover:text-text-primary hover:border-border-subtle transition-all"
        >
          {isHu ? "Hétfő, Sze, Péntek" : "Mon, Wed, Fri"}
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => applyPreset([1, 2, 3, 4, 5, 6, 7])}
          className="px-2.5 py-1 text-11 font-medium rounded-8 bg-bg-surface border border-border-hairline text-text-secondary hover:text-text-primary hover:border-border-subtle transition-all"
        >
          {isHu ? "Mind (7 nap)" : "Every day (7d)"}
        </button>

        {value.length > 0 && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => applyPreset([])}
            className="px-2 py-1 text-11 font-medium rounded-8 text-status-rest hover:bg-status-rest/10 transition-all ml-auto"
          >
            {isHu ? "Törlés" : "Clear"}
          </button>
        )}
      </div>
    </div>
  );
};
