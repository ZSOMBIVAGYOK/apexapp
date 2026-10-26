import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface DayItem {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  dayName: string;
  isToday?: boolean;
  hasWorkout?: boolean;
  isCompleted?: boolean;
  readinessStatus?: "ready" | "caution" | "rest";
}

export interface WeekStripProps {
  days: DayItem[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  title?: string;
  className?: string;
}

export const WeekStrip: React.FC<WeekStripProps> = ({
  days,
  selectedDate,
  onSelectDate,
  onPrevWeek,
  onNextWeek,
  title,
  className = ""
}) => {
  return (
    <div
      role="region"
      aria-label="Heti edzésnaptár"
      className={`rounded-20 border border-border-hairline bg-bg-surface p-4 shadow-sm ${className}`}
    >
      {(title || onPrevWeek || onNextWeek) && (
        <div className="flex items-center justify-between mb-3 text-12">
          {title && (
            <span className="font-semibold uppercase tracking-wider text-text-secondary">
              {title}
            </span>
          )}
          <div className="flex items-center gap-1 ml-auto">
            {onPrevWeek && (
              <button
                type="button"
                onClick={onPrevWeek}
                aria-label="Előző hét"
                className="h-7 w-7 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            {onNextWeek && (
              <button
                type="button"
                onClick={onNextWeek}
                aria-label="Következő hét"
                className="h-7 w-7 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 7-Day Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 select-none">
        {days.map((day) => {
          const isSelected = day.date === selectedDate;

          return (
            <button
              key={day.date}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => onSelectDate(day.date)}
              className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-12 transition-all duration-200 ease-apex-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                isSelected
                  ? "bg-brand text-white shadow-sm"
                  : day.isToday
                  ? "bg-bg-elevated border border-border-subtle text-text-primary font-semibold"
                  : "hover:bg-bg-elevated text-text-secondary hover:text-text-primary"
              }`}
            >
              <span
                className={`text-12 font-medium ${
                  isSelected ? "text-white/80" : "text-text-secondary"
                }`}
              >
                {day.dayName}
              </span>

              <span className="text-16 font-semibold tabular-nums my-1">
                {day.dayNumber}
              </span>

              {/* Status Dot */}
              <div className="h-1.5 flex items-center justify-center gap-0.5">
                {day.readinessStatus && (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isSelected
                        ? "bg-white"
                        : day.readinessStatus === "ready"
                        ? "bg-status-ready"
                        : day.readinessStatus === "caution"
                        ? "bg-status-caution"
                        : "bg-status-rest"
                    }`}
                    aria-hidden="true"
                  />
                )}
                {day.hasWorkout && !day.readinessStatus && (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isSelected ? "bg-white" : "bg-text-tertiary"
                    }`}
                    aria-hidden="true"
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
