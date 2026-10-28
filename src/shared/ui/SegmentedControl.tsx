import React, { useRef, useState, useLayoutEffect, useCallback } from "react";

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
  const itemsRef = useRef<Map<T, HTMLButtonElement>>(new Map());
  const [lensStyle, setLensStyle] = useState<{ left: number; width: number } | null>(null);

  const updateLens = useCallback(() => {
    const activeEl = itemsRef.current.get(value);
    if (activeEl && containerRef.current) {
      setLensStyle({
        left: activeEl.offsetLeft,
        width: activeEl.offsetWidth
      });
    }
  }, [value]);

  useLayoutEffect(() => {
    updateLens();
    window.addEventListener("resize", updateLens);
    return () => window.removeEventListener("resize", updateLens);
  }, [updateLens, options]);

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let nextIndex = currentIndex;
    if (e.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % options.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + options.length) % options.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = options.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    const nextOption = options[nextIndex];
    if (nextOption) {
      onChange(nextOption.value);
      const targetBtn = itemsRef.current.get(nextOption.value);
      targetBtn?.focus();
    }
  };

  const containerHeight = size === "sm" ? "h-9 p-0.5 text-12" : "h-11 p-1 text-14";
  const itemHeight = size === "sm" ? "h-7.5 px-3" : "h-9 px-4";

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label={ariaLabel}
      className={`relative inline-flex items-center rounded-full bg-bg-surface-solid dark:bg-white/[0.05] border border-border/60 select-none shadow-glass-sm backdrop-blur-md ${
        fullWidth ? "w-full" : ""
      } ${containerHeight} ${className}`}
    >
      {/* Sliding Glass Lens */}
      {lensStyle && (
        <div
          aria-hidden="true"
          className="glass-lens absolute top-1 bottom-1 rounded-full transition-all duration-280 ease-spring pointer-events-none"
          style={{
            left: `${lensStyle.left}px`,
            width: `${lensStyle.width}px`
          }}
        />
      )}

      {options.map((opt, idx) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              if (el) itemsRef.current.set(opt.value, el);
              else itemsRef.current.delete(opt.value);
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`touch-target relative z-10 flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors duration-160 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
              fullWidth ? "flex-1" : ""
            } ${itemHeight} ${
              isSelected
                ? "text-text-primary font-semibold"
                : "text-text-secondary hover:text-text-primary"
            } ${!lensStyle && isSelected ? "bg-bg-elevated dark:bg-white/[0.12] shadow-sm" : ""}`}
          >
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            <span className="truncate">{opt.label}</span>
            {opt.badge !== undefined && (
              <span
                className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-semibold tabular-nums ${
                  isSelected
                    ? "bg-brand text-white"
                    : "bg-border/60 text-text-secondary"
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
