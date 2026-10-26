import React from "react";

export type ConfidenceLevel = "high" | "medium" | "low";

export interface ConfidenceMeterProps {
  level?: ConfidenceLevel;
  score?: number; // Optional exact percentage
  confidence?: number; // Alias for score
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

export const ConfidenceMeter: React.FC<ConfidenceMeterProps> = ({
  level,
  score,
  confidence,
  size = "md",
  showLabel = true,
  className = ""
}) => {
  const effectiveScore = score ?? confidence;
  const effectiveLevel: ConfidenceLevel =
    level ||
    (effectiveScore !== undefined
      ? effectiveScore >= 80
        ? "high"
        : effectiveScore >= 50
          ? "medium"
          : "low"
      : "medium");

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

  const current = configs[effectiveLevel];
  const barHeight = size === "sm" ? "h-2 w-0.5" : "h-2.5 w-1";
  const fontSize = size === "sm" ? "text-11" : "text-12";

  return (
    <div
      role="group"
      aria-label={`Adatmegbízhatóság: ${current.label}`}
      className={`inline-flex items-center gap-1.5 select-none ${className}`}
      title={current.label}
    >
      {/* 3-Bar Indicator */}
      <div className="flex items-center gap-0.5" aria-hidden="true">
        {[1, 2, 3].map((bar) => {
          const isActive = bar <= current.activeBars;
          return (
            <div
              key={bar}
              className={`${barHeight} rounded-full transition-colors ${
                isActive ? current.color : "bg-border-hairline"
              }`}
            />
          );
        })}
      </div>

      {showLabel && (
        <span className={`${fontSize} font-medium text-text-secondary tabular-nums`}>
          {effectiveScore !== undefined ? `${effectiveScore}%` : current.label}
        </span>
      )}
    </div>
  );
};
