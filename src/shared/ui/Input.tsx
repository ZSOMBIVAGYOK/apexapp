import React, { useId } from "react";
import { AlertCircle, X } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onClear?: () => void;
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      hint,
      error,
      leftIcon,
      rightIcon,
      onClear,
      fullWidth = true,
      id: customId,
      value,
      disabled,
      className = "",
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = customId || generatedId;

    return (
      <div className={`${fullWidth ? "w-full" : "inline-block"} space-y-1.5`}>
        {label && (
          <label
            htmlFor={id}
            className="block text-12 font-medium uppercase tracking-wider text-text-secondary"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-text-secondary">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={id}
            value={value}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
            className={`w-full rounded-12 border bg-bg-surface text-text-primary text-14 h-10 px-3.5 transition-all duration-200 ease-apex-out placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent disabled:opacity-40 disabled:cursor-not-allowed ${
              leftIcon ? "pl-10" : ""
            } ${rightIcon || onClear || error ? "pr-10" : ""} ${
              error
                ? "border-status-rest focus:ring-status-rest"
                : "border-border-hairline hover:border-border-subtle"
            } ${className}`}
            {...props}
          />

          <div className="absolute right-3.5 flex items-center gap-1.5">
            {onClear && value && !disabled && (
              <button
                type="button"
                onClick={onClear}
                aria-label="Törlés"
                className="text-text-secondary hover:text-text-primary p-0.5 rounded-full"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            {error ? (
              <AlertCircle className="h-4 w-4 text-status-rest shrink-0" aria-hidden="true" />
            ) : (
              rightIcon && <div className="text-text-secondary pointer-events-none">{rightIcon}</div>
            )}
          </div>
        </div>

        {error ? (
          <p id={`${id}-error`} className="text-12 text-status-rest">
            {error}
          </p>
        ) : hint ? (
          <p id={`${id}-hint`} className="text-12 text-text-secondary">
            {hint}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
