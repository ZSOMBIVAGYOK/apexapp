import React from "react";

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className = "",
  "aria-label": ariaLabel
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <div className={`flex items-start justify-between gap-4 select-none ${className}`}>
      {(label || description) && (
        <div className="flex-1 cursor-pointer" onClick={() => !disabled && onChange(!checked)}>
          {label && (
            <p className="text-14 font-medium text-text-primary leading-tight">
              {label}
            </p>
          )}
          {description && (
            <p className="text-12 text-text-secondary mt-0.5 leading-normal">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Switch Button */}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel || label}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        onKeyDown={handleKeyDown}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-apex-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary disabled:opacity-40 disabled:cursor-not-allowed ${
          checked ? "bg-brand" : "bg-border-subtle"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-apex-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
          aria-hidden="true"
        />
      </button>
    </div>
  );
};
