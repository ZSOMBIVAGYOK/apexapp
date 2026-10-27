import React, { useId, useState, useEffect } from "react";
import { Plus, Minus } from "lucide-react";

export interface NumberValidationResult {
  isValid: boolean;
  value: number | null;
  error: string | null;
}

/**
 * Normalizes input string (e.g. replacing comma with dot for Hungarian locale)
 * and validates according to numerical bounds and format.
 */
export function parseAndValidateNumber(
  raw: string,
  options: {
    min?: number;
    max?: number;
    required?: boolean;
    step?: number;
  } = {}
): NumberValidationResult {
  const { min, max, required = true } = options;
  const trimmed = raw.trim();

  // Handle empty input
  if (trimmed === "") {
    if (required) {
      return {
        isValid: false,
        value: null,
        error: "A mező kitöltése kötelező"
      };
    }
    return {
      isValid: true,
      value: null,
      error: null
    };
  }

  // Replace Hungarian decimal comma with dot
  const normalized = trimmed.replace(",", ".");

  // Check valid numerical format (allows optional minus and decimals)
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return {
      isValid: false,
      value: null,
      error: "Kérjük, érvényes számot adjon meg"
    };
  }

  const parsed = parseFloat(normalized);

  if (isNaN(parsed)) {
    return {
      isValid: false,
      value: null,
      error: "Kérjük, érvényes számot adjon meg"
    };
  }

  if (min !== undefined && parsed < min) {
    return {
      isValid: false,
      value: parsed,
      error: `A minimális érték: ${min}`
    };
  }

  if (max !== undefined && parsed > max) {
    return {
      isValid: false,
      value: parsed,
      error: `A maximális érték: ${max}`
    };
  }

  return {
    isValid: true,
    value: parsed,
    error: null
  };
}

export interface NumberInputProps {
  label?: string;
  value: number | undefined | null;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  showSteppers?: boolean;
  placeholder?: string;
  id?: string;
  name?: string;
  onBlur?: () => void;
  allowEmpty?: boolean;
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
  className = "",
  showSteppers = true,
  placeholder,
  id: explicitId,
  name,
  onBlur,
  allowEmpty = false
}) => {
  const generatedId = useId();
  const id = explicitId || generatedId;

  // Raw string value during editing
  const [rawInput, setRawInput] = useState<string>(() =>
    value !== undefined && value !== null && !isNaN(value) ? String(value) : ""
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Synchronize with external value changes when not actively typing
  useEffect(() => {
    if (!isEditing) {
      if (value !== undefined && value !== null && !isNaN(value)) {
        setRawInput(String(value));
      } else if (allowEmpty) {
        setRawInput("");
      }
    }
  }, [value, isEditing, allowEmpty]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Preserve exact user input while typing without validating or snapping
    setRawInput(e.target.value);
    if (localError) {
      // Clear previous validation error when user resumes typing
      setLocalError(null);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    const result = parseAndValidateNumber(rawInput, {
      min,
      max,
      required: !allowEmpty,
      step
    });

    if (result.isValid && result.value !== null) {
      setLocalError(null);
      setRawInput(String(result.value));
      onChange(result.value);
    } else if (!result.isValid) {
      setLocalError(result.error);
    }

    onBlur?.();
  };

  const handleFocus = () => {
    setIsEditing(true);
  };

  const handleDecrement = () => {
    if (disabled) return;
    const current =
      value !== undefined && value !== null && !isNaN(value)
        ? value
        : parseFloat(rawInput.replace(",", ".")) || 0;
    const next = Math.max(min, +(current - step).toFixed(4));
    setLocalError(null);
    setRawInput(String(next));
    onChange(next);
  };

  const handleIncrement = () => {
    if (disabled) return;
    const current =
      value !== undefined && value !== null && !isNaN(value)
        ? value
        : parseFloat(rawInput.replace(",", ".")) || 0;
    const next = Math.min(max, +(current + step).toFixed(4));
    setLocalError(null);
    setRawInput(String(next));
    onChange(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      handleIncrement();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      handleDecrement();
    } else if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  const displayError = error || localError;

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
        {showSteppers && (
          <button
            type="button"
            onClick={handleDecrement}
            disabled={disabled || (value !== undefined && value !== null && value <= min)}
            aria-label="Csökkentés"
            className="h-10 w-10 shrink-0 rounded-12 bg-bg-surface border border-border-hairline text-text-primary hover:bg-bg-elevated hover:border-border-subtle active:scale-95 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

        {/* Normal Text Input with Decimal Mode */}
        <div className="relative flex-1">
          <input
            id={id}
            name={name}
            type="text"
            inputMode="decimal"
            value={rawInput}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            aria-invalid={!!displayError}
            className={`w-full ${showSteppers ? "text-center" : "text-left"} h-10 px-3 rounded-12 border ${
              displayError ? "border-status-rest ring-1 ring-status-rest" : "border-border-hairline"
            } bg-bg-surface text-text-primary text-16 font-semibold tabular-nums tracking-tight focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent disabled:opacity-40 transition-colors`}
          />
          {unit && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-12 font-medium text-text-secondary pointer-events-none">
              {unit}
            </span>
          )}
        </div>

        {/* Increment Button */}
        {showSteppers && (
          <button
            type="button"
            onClick={handleIncrement}
            disabled={disabled || (value !== undefined && value !== null && value >= max)}
            aria-label="Növelés"
            className="h-10 w-10 shrink-0 rounded-12 bg-bg-surface border border-border-hairline text-text-primary hover:bg-bg-elevated hover:border-border-subtle active:scale-95 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {displayError ? (
        <p className="text-12 text-status-rest" role="alert">{displayError}</p>
      ) : hint ? (
        <p className="text-12 text-text-secondary">{hint}</p>
      ) : null}
    </div>
  );
};
