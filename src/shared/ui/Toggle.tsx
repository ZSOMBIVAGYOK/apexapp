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
        <div
          className={`flex-1 ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
          onClick={() => !disabled && onChange(!checked)}
        >
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
        className={`touch-target group relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-0.5 border border-transparent transition-colors duration-280 ease-spring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary disabled:opacity-40 disabled:cursor-not-allowed ${
          checked
            ? "bg-brand dark:shadow-[0_0_12px_rgba(61,123,255,0.4)]"
            : "bg-border-subtle/70 dark:bg-white/[0.12]"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-280 ease-spring group-active:scale-95 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
          aria-hidden="true"
        />
      </button>
    </div>
  );
};
