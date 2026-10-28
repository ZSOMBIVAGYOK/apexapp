import React from "react";
import { X } from "lucide-react";

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  selected?: boolean;
  onRemove?: () => void;
  size?: "sm" | "md";
  icon?: React.ReactNode;
}

export const Chip: React.FC<ChipProps> = ({
  children,
  label,
  selected = false,
  onRemove,
  size = "md",
  icon,
  className = "",
  disabled,
  ...props
}) => {
  const sizeStyles: Record<string, string> = {
    sm: "h-7 px-3 text-12 gap-1.5",
    md: "h-8.5 px-3.5 text-14 gap-2"
  };

  return (
    <button
      type="button"
      disabled={disabled}
      className={`touch-target inline-flex items-center justify-center font-medium rounded-full select-none transition-all duration-120 ease-spring active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-40 ${
        sizeStyles[size]
      } ${
        selected
          ? "bg-brand text-white shadow-sm border border-brand/50 dark:shadow-[0_2px_8px_rgba(61,123,255,0.35)]"
          : "bg-bg-surface-solid dark:bg-white/[0.06] text-text-secondary hover:text-text-primary hover:bg-bg-elevated border border-border/60 hover:border-border"
      } ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="truncate">{label || children}</span>
      {onRemove && (
        <span
          role="button"
          tabIndex={0}
          aria-label="Eltávolítás"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              onRemove();
            }
          }}
          className="ml-1 -mr-1 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        >
          <X className="h-3 w-3" aria-hidden="true" />
        </span>
      )}
    </button>
  );
};
