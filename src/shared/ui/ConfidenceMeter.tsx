import React from "react";

export type ConfidenceLevel = "high" | "medium" | "low";

export interface ConfidenceMeterProps {
  level: ConfidenceLevel;
  score?: number; // Optional exact percentage
  showLabel?: boolean;
  className?: string;
}

export const ConfidenceMeter: React.FC<ConfidenceMeterProps> = ({
  level,
  score,
  showLabel = true,
  className = ""
}) => {
  const configs: Record<ConfidenceLevel, { label: string; activeBars: number; color: string }> = {
    high: {
      label: "Magas megbízhatóság",
      activeBars: 3,
      color: "bg-status-ready"
    },
    medium: {
      label: "Közepes megbízhatóság",
      activeBars: 2,
      color: "bg-status-caution"
    },
    low: {
      label: "Alacsony megbízhatóság",
      activeBars: 1,
      color: "bg-status-rest"
    }
  };

  const current = configs[level];

  return (
    <div
      role="group"
      aria-label={`Adatmegbízhatóság: ${current.label}`}
      className={`inline-flex items-center gap-2 select-none ${className}`}
      title={current.label}
    >
      {/* 3-Bar Indicator */}
      <div className="flex items-center gap-1" aria-hidden="true">
        {[1, 2, 3].map((bar) => {
          const isActive = bar <= current.activeBars;
          return (
            <div
              key={bar}
              className={`h-2.5 w-1 rounded-full transition-colors ${
                isActive ? current.color : "bg-border-hairline"
              }`}
            />
          );
        })}
      </div>

      {showLabel && (
        <span className="text-12 font-medium text-text-secondary tabular-nums">
          {score !== undefined ? `${score}%` : current.label}
        </span>
      )}
    </div>
  );
};
