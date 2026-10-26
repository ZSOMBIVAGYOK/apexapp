import React, { useRef } from "react";

export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  fullWidth?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = "md",
  fullWidth = false,
  className = "",
  "aria-label": ariaLabel = "Segmented options"
}: SegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let nextIndex = currentIndex;
    if (e.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % options.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + options.length) % options.length;
    } else {
      return;
    }

    e.preventDefault();
    const nextOption = options[nextIndex];
    if (nextOption) {
      onChange(nextOption.value);
      // Focus target element
      const buttons = containerRef.current?.querySelectorAll("button");
      buttons?.[nextIndex]?.focus();
    }
  };

  const heightClass = size === "sm" ? "h-8 p-0.5 text-12" : "h-10 p-1 text-14";

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label={ariaLabel}
      className={`inline-flex items-center rounded-12 bg-bg-surface border border-border-hairline select-none ${
        fullWidth ? "w-full" : ""
      } ${heightClass} ${className}`}
    >
      {options.map((opt, idx) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`relative flex items-center justify-center gap-1.5 px-3 rounded-12 font-medium transition-all duration-200 ease-apex-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
              fullWidth ? "flex-1" : ""
            } ${
              isSelected
                ? "bg-bg-elevated text-text-primary shadow-sm border border-border-hairline"
                : "text-text-secondary hover:text-text-primary border border-transparent"
            } ${size === "sm" ? "h-7" : "h-8"}`}
          >
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            <span className="truncate">{opt.label}</span>
            {opt.badge !== undefined && (
              <span
                className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-semibold tabular-nums ${
                  isSelected
                    ? "bg-brand text-white"
                    : "bg-border-hairline text-text-secondary"
                }`}
              >
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
