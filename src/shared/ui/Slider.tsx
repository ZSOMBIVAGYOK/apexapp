import React, { useId } from "react";

export interface SliderStep {
  value: number;
  label?: string;
}

export interface SliderProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  steps?: SliderStep[];
  unit?: string;
  statusColor?: "ready" | "caution" | "rest" | "brand";
  disabled?: boolean;
  className?: string;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  onChange,
  min = 1,
  max = 10,
  step = 1,
  steps,
  unit,
  statusColor = "brand",
  disabled = false,
  className = ""
}) => {
  const id = useId();

  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  const colorStyles: Record<string, string> = {
    brand: "bg-brand",
    ready: "bg-status-ready",
    caution: "bg-status-caution",
    rest: "bg-status-rest"
  };

  return (
    <div className={`space-y-2 select-none ${className}`}>
      {/* Top Header */}
      <div className="flex items-center justify-between text-12">
        {label && (
          <label
            htmlFor={id}
            className="font-medium uppercase tracking-wider text-text-secondary"
          >
            {label}
          </label>
        )}
        <span className="font-semibold tabular-nums text-text-primary text-14">
          {value} {unit}
        </span>
      </div>

      {/* Track & Native Input */}
      <div className="relative flex items-center py-2">
        {/* Glass Track Background */}
        <div className="relative h-2 w-full rounded-full bg-bg-surface-solid dark:bg-white/[0.08] border border-border/40 overflow-hidden shadow-inner">
          <div
            className={`h-full ${colorStyles[statusColor]} transition-all duration-120`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Tactile Native Range Input */}
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="touch-target absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
        />

        {/* Visible Tactile Thumb */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute h-5 w-5 -ml-2.5 rounded-full bg-white shadow-md border border-black/10 transition-transform duration-120 ease-spring"
          style={{ left: `${percentage}%` }}
        />
      </div>

      {/* Discrete Step Labels */}
      {steps && steps.length > 0 && (
        <div className="flex justify-between text-[11px] text-text-tertiary px-1">
          {steps.map((s) => (
            <span
              key={s.value}
              onClick={() => !disabled && onChange(s.value)}
              className={`cursor-pointer hover:text-text-primary transition-colors ${
                s.value === value ? "font-semibold text-brand" : ""
              }`}
            >
              {s.label || s.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
