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

      {/* Slider Track */}
      <div className="relative flex items-center h-6 py-2">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-2 opacity-0 z-10 cursor-pointer disabled:cursor-not-allowed"
        />

        {/* Custom Track Background */}
        <div className="w-full h-2 rounded-full bg-border-hairline relative overflow-hidden">
          <div
            className={`h-full transition-all duration-100 ease-apex-out ${colorStyles[statusColor]}`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Custom Thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white shadow-elevated border-2 border-brand pointer-events-none transition-all duration-100 ease-apex-out"
          style={{ left: `calc(${percentage}% - 10px)` }}
        />
      </div>

      {/* Labelled Steps / Ticks */}
      {steps && steps.length > 0 && (
        <div className="flex justify-between items-center text-[11px] text-text-tertiary px-1 pt-0.5">
          {steps.map((st) => (
            <button
              key={st.value}
              type="button"
              onClick={() => onChange(st.value)}
              className={`hover:text-text-primary transition-colors tabular-nums ${
                st.value === value ? "text-text-primary font-bold" : ""
              }`}
            >
              {st.label || st.value}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
