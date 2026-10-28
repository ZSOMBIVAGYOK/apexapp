import React from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

export interface DaySwitcherProps {
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (dateStr: string) => void;
  showQuickPresets?: boolean;
  className?: string;
  allowFuture?: boolean;
}

export const DaySwitcher: React.FC<DaySwitcherProps> = ({
  selectedDate,
  onDateChange,
  showQuickPresets = true,
  className = "",
  allowFuture = true
}) => {
  // Helper to format date in local YYYY-MM-DD
  const formatDateYMD = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const todayStr = formatDateYMD(new Date());

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = formatDateYMD(yesterdayDate);

  const twoDaysAgoDate = new Date();
  twoDaysAgoDate.setDate(twoDaysAgoDate.getDate() - 2);
  const twoDaysAgoStr = formatDateYMD(twoDaysAgoDate);

  const handlePrevDay = () => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const prev = new Date(y!, m! - 1, d! - 1, 12, 0, 0);
    onDateChange(formatDateYMD(prev));
  };

  const handleNextDay = () => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const next = new Date(y!, m! - 1, d! + 1, 12, 0, 0);
    const nextStr = formatDateYMD(next);
    if (!allowFuture && nextStr > todayStr) return;
    onDateChange(nextStr);
  };

  // Human-readable date label in Hungarian
  const formatDisplayLabel = (dateStr: string): string => {
    if (dateStr === todayStr) return "Ma";
    if (dateStr === yesterdayStr) return "Tegnap";
    if (dateStr === twoDaysAgoStr) return "Két napja";

    try {
      const [y, m, d] = dateStr.split("-").map(Number);
      const dateObj = new Date(y!, m! - 1, d!, 12, 0, 0);
      const monthNames = [
        "jan.", "febr.", "márc.", "ápr.", "máj.", "jún.",
        "júl.", "aug.", "szept.", "okt.", "nov.", "dec."
      ];
      const dayNames = ["Vas.", "Hét.", "Kedd", "Szer.", "Csüt.", "Pént.", "Szomb."];
      return `${dayNames[dateObj.getDay()]}, ${monthNames[dateObj.getMonth()]} ${dateObj.getDate()}.`;
    } catch {
      return dateStr;
    }
  };

  const isNextDisabled = !allowFuture && selectedDate >= todayStr;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Date Navigator Bar */}
      <div className="inline-flex items-center rounded-full bg-bg-surface-solid dark:bg-white/[0.05] border border-border/60 p-1 shadow-glass-sm backdrop-blur-md">
        <button
          type="button"
          onClick={handlePrevDay}
          className="touch-target p-2 text-text-secondary hover:text-text-primary rounded-full hover:bg-bg-elevated transition-colors"
          title="Előző nap"
          aria-label="Előző nap"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Date Selector input overlay */}
        <div className="relative px-2 flex items-center gap-1.5 cursor-pointer">
          <CalendarIcon className="h-3.5 w-3.5 text-brand shrink-0" />
          <span className="text-12 font-bold tabular-nums text-text-primary select-none whitespace-nowrap">
            {formatDisplayLabel(selectedDate)}
            <span className="text-11 font-normal text-text-tertiary ml-1 hidden sm:inline">
              ({selectedDate})
            </span>
          </span>
          <input
            type="date"
            value={selectedDate}
            max={allowFuture ? undefined : todayStr}
            onChange={(e) => {
              if (e.target.value) {
                onDateChange(e.target.value);
              }
            }}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            aria-label="Válassz dátumot"
          />
        </div>

        <button
          type="button"
          onClick={handleNextDay}
          disabled={isNextDisabled}
          className={`touch-target p-2 rounded-full transition-colors ${
            isNextDisabled
              ? "opacity-30 cursor-not-allowed text-text-tertiary"
              : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
          }`}
          title="Következő nap"
          aria-label="Következő nap"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Quick shortcuts */}
      {showQuickPresets && (
        <div className="flex items-center gap-1.5 text-11">
          <button
            type="button"
            onClick={() => onDateChange(todayStr)}
            className={`touch-target px-3 py-1 rounded-full font-medium border transition-colors ${
              selectedDate === todayStr
                ? "bg-brand text-white border-brand/50 shadow-sm"
                : "bg-bg-surface-solid dark:bg-white/[0.05] text-text-secondary border-border/60 hover:text-text-primary"
            }`}
          >
            Ma
          </button>
          <button
            type="button"
            onClick={() => onDateChange(yesterdayStr)}
            className={`touch-target px-3 py-1 rounded-full font-medium border transition-colors ${
              selectedDate === yesterdayStr
                ? "bg-brand text-white border-brand/50 shadow-sm"
                : "bg-bg-surface text-text-secondary border-border-hairline hover:text-text-primary"
            }`}
          >
            Tegnap
          </button>
          <button
            type="button"
            onClick={() => onDateChange(twoDaysAgoStr)}
            className={`px-2.5 py-1 rounded-8 font-medium border transition-colors ${
              selectedDate === twoDaysAgoStr
                ? "bg-brand text-white border-brand shadow-sm"
                : "bg-bg-surface text-text-secondary border-border-hairline hover:text-text-primary"
            }`}
          >
            Két napja
          </button>
        </div>
      )}
    </div>
  );
};
