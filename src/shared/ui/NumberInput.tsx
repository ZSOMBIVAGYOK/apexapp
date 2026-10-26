import React, { useId } from "react";
import { Plus, Minus } from "lucide-react";

export interface NumberInputProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  label,
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  unit,
  hint,
  error,
  disabled = false,
  className = ""
}) => {
  const id = useId();

  const handleDecrement = () => {
    if (disabled) return;
    const next = Math.max(min, +(value - step).toFixed(2));
    onChange(next);
  };

  const handleIncrement = () => {
    if (disabled) return;
    const next = Math.min(max, +(value + step).toFixed(2));
    onChange(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      handleIncrement();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      handleDecrement();
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-12 font-medium uppercase tracking-wider text-text-secondary"
        >
          {label}
        </label>
      )}

      <div className="flex items-center gap-2">
        {/* Decrement Button */}
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || value <= min}
          aria-label="Csökkentés"
          className="h-10 w-10 shrink-0 rounded-12 bg-bg-surface border border-border-hairline text-text-primary hover:bg-bg-elevated hover:border-border-subtle active:scale-95 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Input with Tabular Numeral Display */}
        <div className="relative flex-1">
          <input
            id={id}
            type="number"
            value={isNaN(value) ? "" : value}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) {
                onChange(Math.min(max, Math.max(min, val)));
              }
            }}
            onKeyDown={handleKeyDown}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            className="w-full text-center h-10 px-3 rounded-12 border border-border-hairline bg-bg-surface text-text-primary text-16 font-semibold tabular-nums tracking-tight focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent disabled:opacity-40"
          />
          {unit && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-12 font-medium text-text-secondary pointer-events-none">
              {unit}
            </span>
          )}
        </div>

        {/* Increment Button */}
        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || value >= max}
          aria-label="Növelés"
          className="h-10 w-10 shrink-0 rounded-12 bg-bg-surface border border-border-hairline text-text-primary hover:bg-bg-elevated hover:border-border-subtle active:scale-95 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {error ? (
        <p className="text-12 text-status-rest">{error}</p>
      ) : hint ? (
        <p className="text-12 text-text-secondary">{hint}</p>
      ) : null}
    </div>
  );
};
