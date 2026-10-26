import React from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

export type StatStatus = "ready" | "caution" | "rest" | "neutral";

export interface StatTrend {
  direction: "up" | "down" | "neutral";
  value: string;
  isGood?: boolean; // If true, green for up, etc.
}

export interface StatTileProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  status?: StatStatus;
  trend?: StatTrend;
  topRight?: React.ReactNode;
  icon?: React.ReactNode;
  size?: "md" | "lg";
}

export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  unit,
  subtext,
  status = "neutral",
  trend,
  topRight,
  icon,
  size = "md",
  className = "",
  onClick,
  ...props
}) => {
  const statusDot: Record<StatStatus, string> = {
    ready: "bg-status-ready shadow-[0_0_8px_rgba(52,211,153,0.5)]",
    caution: "bg-status-caution shadow-[0_0_8px_rgba(251,191,36,0.5)]",
    rest: "bg-status-rest shadow-[0_0_8px_rgba(248,113,113,0.5)]",
    neutral: "bg-text-tertiary"
  };

  const isClickable = Boolean(onClick);

  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (isClickable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>);
        }
      }}
      className={`rounded-20 border border-border-hairline bg-bg-surface p-4 sm:p-5 transition-all duration-200 ease-apex-out shadow-sm flex flex-col justify-between ${
        isClickable
          ? "cursor-pointer hover:bg-bg-elevated hover:border-border-subtle active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          : ""
      } ${className}`}
      {...props}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {status !== "neutral" && (
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${statusDot[status]}`}
              aria-hidden="true"
            />
          )}
          <span className="text-12 font-medium text-text-secondary uppercase tracking-wider truncate">
            {label}
          </span>
        </div>
        {topRight ? (
          <div>{topRight}</div>
        ) : icon ? (
          <div className="text-text-secondary">{icon}</div>
        ) : null}
      </div>

      {/* Big Number Cockpit Display */}
      <div className="flex items-baseline gap-1.5 my-1">
        <span
          className={`tabular-nums font-semibold tracking-tight text-text-primary ${
            size === "lg" ? "text-40 sm:text-64" : "text-28 sm:text-40"
          }`}
        >
          {value}
        </span>
        {unit && (
          <span className="text-14 font-medium text-text-secondary">{unit}</span>
        )}
      </div>

      {/* Footer / Trend / Subtext */}
      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border-hairline/50 text-12">
        {trend && (
          <div
            className={`inline-flex items-center gap-0.5 font-medium tabular-nums ${
              trend.direction === "neutral"
                ? "text-text-secondary"
                : trend.isGood
                ? "text-status-ready"
                : "text-status-rest"
            }`}
          >
            {trend.direction === "up" && <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />}
            {trend.direction === "down" && <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />}
            {trend.direction === "neutral" && <Minus className="h-3.5 w-3.5" aria-hidden="true" />}
            <span>{trend.value}</span>
          </div>
        )}
        {subtext && (
          <span className="text-text-secondary truncate text-right ml-auto">{subtext}</span>
        )}
      </div>
    </div>
  );
};
