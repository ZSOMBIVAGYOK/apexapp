import React, { useEffect, useState } from "react";

export type RingStatus = "ready" | "caution" | "rest" | "brand" | "auto";

export interface ProgressRingProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 - 100
  max?: number;
  size?: number; // In px, default 140
  strokeWidth?: number; // In px, default 10
  status?: RingStatus;
  label?: string;
  unit?: string;
  subtext?: string;
  animate?: boolean;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  max = 100,
  size = 140,
  strokeWidth = 10,
  status = "auto",
  label = "Readiness",
  unit = "%",
  subtext,
  animate = true,
  className = "",
  ...props
}) => {
  const [animatedValue, setAnimatedValue] = useState(animate ? 0 : value);

  useEffect(() => {
    if (!animate) {
      setAnimatedValue(value);
      return;
    }

    // Check prefers-reduced-motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setAnimatedValue(value);
      return;
    }

    const duration = 800; // ms
    const startTime = performance.now();

    const frame = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setAnimatedValue(Math.round(ease * value));

      if (progress < 1) {
        requestAnimationFrame(frame);
      }
    };

    const anim = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(anim);
  }, [value, animate]);

  const percentage = Math.min(100, Math.max(0, (animatedValue / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Resolve semantic color
  const resolvedStatus: "ready" | "caution" | "rest" | "brand" =
    status === "auto"
      ? value >= 80
        ? "ready"
        : value >= 60
        ? "caution"
        : "rest"
      : status;

  const strokeColorMap: Record<"ready" | "caution" | "rest" | "brand", string> = {
    ready: "var(--status-ready)",
    caution: "var(--status-caution)",
    rest: "var(--status-rest)",
    brand: "var(--accent-brand)"
  };

  const statusTextColorMap: Record<"ready" | "caution" | "rest" | "brand", string> = {
    ready: "text-status-ready",
    caution: "text-status-caution",
    rest: "text-status-rest",
    brand: "text-brand"
  };

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={`relative inline-flex flex-col items-center justify-center select-none ${className}`}
      {...props}
    >
      <svg
        width={size}
        height={size}
        className="rotate-[-90deg] transform"
        aria-hidden="true"
      >
        {/* Background track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--border-hairline)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Animated Progress Ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColorMap[resolvedStatus]}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-300 ease-apex-out"
        />
      </svg>

      {/* Center Value and Label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
        <div className="flex items-baseline justify-center">
          <span
            className={`font-semibold tabular-nums tracking-tight text-text-primary ${
              size >= 160 ? "text-40" : size >= 120 ? "text-28" : "text-20"
            }`}
          >
            {animatedValue}
          </span>
          {unit && (
            <span className="text-12 font-medium text-text-secondary ml-0.5">
              {unit}
            </span>
          )}
        </div>
        {label && (
          <span
            className={`text-12 font-medium uppercase tracking-wider mt-0.5 ${statusTextColorMap[resolvedStatus]}`}
          >
            {label}
          </span>
        )}
        {subtext && (
          <span className="text-12 text-text-secondary mt-0.5 truncate max-w-[80%]">
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
};
