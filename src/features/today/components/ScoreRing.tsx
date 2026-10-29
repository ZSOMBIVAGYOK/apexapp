import React from "react";

export type ScoreRingType = "recovery" | "strain" | "sleep";

export interface ScoreRingProps {
  type: ScoreRingType;
  score: number; // 0-100
  band?: "green" | "amber" | "red"; // For recovery
  targetRange?: { low: number; high: number }; // For strain
  isPending?: boolean; // When checkin is pending
  label: string; // "Regeneráció", "Terhelés", "Alvás"
  statusLabel: string; // "Kipihent", "Célsávban", "Kiváló"
  subtext?: string; // e.g. "+3 vs tegnap" or "7.5h / 8.2h"
  delta?: { value: number; direction: "up" | "down" | "flat" };
  sparkline?: number[]; // 7-day trend values
  onClick?: () => void;
  className?: string;
}

export const ScoreRing: React.FC<ScoreRingProps> = ({
  type,
  score,
  band = "green",
  targetRange,
  isPending = false,
  label,
  statusLabel,
  subtext,
  delta,
  sparkline,
  onClick,
  className = ""
}) => {
  const size = 100; // SVG viewBox coordinate space
  const strokeWidth = 8;
  const radius = 40;
  const circumference = 2 * Math.PI * radius; // ~251.327

  // Clamp percentage
  const percentage = isPending ? 0 : Math.min(100, Math.max(0, score));
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Gradient ID unique by type and band
  const gradientId = `apex-ring-${type}-${band}`;

  // Target range arc on strain ring
  let targetArcDashArray = "";
  let targetArcDashOffset = 0;
  if (type === "strain" && targetRange && targetRange.high > targetRange.low) {
    const rangeSpan = Math.min(100, targetRange.high) - Math.max(0, targetRange.low);
    const arcLength = (rangeSpan / 100) * circumference;
    targetArcDashArray = `${arcLength} ${circumference - arcLength}`;
    // Start of target arc
    targetArcDashOffset = -(Math.max(0, targetRange.low) / 100) * circumference;
  }

  // Accessibility label
  const ariaLabel = `${label} ${isPending ? "függőben" : `${Math.round(score)} pont`}, ${statusLabel}`;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`group flex flex-col items-center text-center p-2 rounded-20 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand hover:bg-surface-elevated/40 active:scale-95 ${className}`}
    >
      {/* Relative container for SVG ring */}
      <div className="relative w-full max-w-[104px] sm:max-w-[124px] aspect-square flex items-center justify-center">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-full h-full transform -rotate-90"
          aria-hidden="true"
        >
          <defs>
            {/* Recovery Gradients */}
            <linearGradient id="apex-ring-recovery-green" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
            <linearGradient id="apex-ring-recovery-amber" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
            <linearGradient id="apex-ring-recovery-red" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F87171" />
              <stop offset="100%" stopColor="#EF4444" />
            </linearGradient>

            {/* Strain Gradient (Blue to Cyan - Never Red/Green) */}
            <linearGradient id="apex-ring-strain-green" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3D7BFF" />
              <stop offset="100%" stopColor="#00D2FF" />
            </linearGradient>
            <linearGradient id="apex-ring-strain-amber" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3D7BFF" />
              <stop offset="100%" stopColor="#00D2FF" />
            </linearGradient>
            <linearGradient id="apex-ring-strain-red" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3D7BFF" />
              <stop offset="100%" stopColor="#00D2FF" />
            </linearGradient>

            {/* Sleep Gradient (Indigo to Violet) */}
            <linearGradient id="apex-ring-sleep-green" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>
            <linearGradient id="apex-ring-sleep-amber" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>
            <linearGradient id="apex-ring-sleep-red" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>
          </defs>

          {/* Background Track Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={isPending ? "4 4" : undefined}
            className={`text-surface-solid/80 dark:text-white/10 ${
              isPending ? "animate-pulse" : ""
            }`}
          />

          {/* Strain Target Range Arc (translucent highlight band) */}
          {type === "strain" && targetRange && targetArcDashArray && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#00D2FF"
              strokeWidth={strokeWidth + 2}
              strokeOpacity="0.25"
              strokeDasharray={targetArcDashArray}
              strokeDashoffset={targetArcDashOffset}
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
            />
          )}

          {/* Active Progress Ring */}
          {!isPending && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{
                transition: "stroke-dashoffset 0.8s cubic-bezier(0.22, 1, 0.36, 1)"
              }}
            />
          )}
        </svg>

        {/* Center Number & Delta */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {isPending ? (
            <span className="text-18 sm:text-22 font-mono font-bold text-text-tertiary">--</span>
          ) : (
            <>
              <span className="text-22 sm:text-28 font-mono font-bold tracking-tight text-text-primary tabular-nums">
                {Math.round(score)}
              </span>
              {delta && (
                <span
                  className={`text-[10px] font-mono flex items-center leading-none ${
                    delta.direction === "up"
                      ? "text-status-ready"
                      : delta.direction === "down"
                      ? "text-text-tertiary"
                      : "text-text-tertiary"
                  }`}
                >
                  {delta.direction === "up" ? "▲" : delta.direction === "down" ? "▼" : ""}
                  {delta.value > 0 ? `+${delta.value}` : delta.value}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Label and Status Underneath */}
      <div className="mt-2 space-y-0.5">
        <span className="text-12 font-bold tracking-tight text-text-primary block truncate">
          {label}
        </span>
        <span
          className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${
            isPending
              ? "bg-surface-elevated text-text-tertiary border border-border-hairline"
              : type === "recovery"
              ? band === "green"
                ? "bg-ready/15 text-ready dark:text-emerald-400"
                : band === "amber"
                ? "bg-caution/15 text-caution dark:text-amber-400"
                : "bg-rest/15 text-rest dark:text-rose-400"
              : type === "strain"
              ? "bg-brand/15 text-brand dark:text-cyan-400"
              : "bg-indigo-500/15 text-indigo-500 dark:text-violet-300"
          }`}
        >
          {statusLabel}
        </span>
        {subtext && (
          <span className="text-[10px] text-text-tertiary block font-mono truncate max-w-[90px] mx-auto">
            {subtext}
          </span>
        )}
      </div>

      {/* Mini 7-day sparkline on wider viewports */}
      {sparkline && sparkline.length > 2 && (
        <div className="hidden sm:flex items-end gap-0.5 h-3 mt-2 px-1 opacity-70 group-hover:opacity-100 transition-opacity">
          {sparkline.map((val, idx) => {
            const heightPct = Math.min(100, Math.max(15, val));
            return (
              <span
                key={idx}
                style={{ height: `${heightPct}%` }}
                className="w-1 rounded-sm bg-text-tertiary/40 group-hover:bg-brand/60"
              />
            );
          })}
        </div>
      )}
    </button>
  );
};
