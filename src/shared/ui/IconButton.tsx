import React from "react";
import { Loader2 } from "lucide-react";

export type IconButtonVariant = "surface" | "ghost" | "brand" | "danger";
export type IconButtonSize = "sm" | "md" | "lg";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  isLoading?: boolean;
  icon: React.ReactNode;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      "aria-label": ariaLabel,
      variant = "surface",
      size = "md",
      isLoading = false,
      icon,
      disabled,
      className = "",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center shrink-0 rounded-12 transition-all duration-200 ease-apex-out select-none active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary disabled:opacity-40 disabled:pointer-events-none";

    const sizeStyles: Record<IconButtonSize, string> = {
      sm: "h-8 w-8 text-14",
      md: "h-10 w-10 text-16",
      lg: "h-12 w-12 text-20 rounded-20"
    };

    const variantStyles: Record<IconButtonVariant, string> = {
      surface:
        "bg-bg-elevated text-text-primary hover:bg-bg-surface border border-border-hairline hover:border-border-subtle shadow-sm",
      ghost:
        "bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-surface border border-transparent",
      brand:
        "bg-brand text-white hover:bg-brand-hover shadow-sm border border-transparent",
      danger:
        "bg-status-rest/10 text-status-rest hover:bg-status-rest/20 border border-status-rest/30"
    };

    return (
      <button
        ref={ref}
        aria-label={ariaLabel}
        title={ariaLabel}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          icon
        )}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
