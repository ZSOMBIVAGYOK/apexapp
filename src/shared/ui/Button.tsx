import React from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "ghost" | "danger" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className = "",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-200 ease-apex-out select-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary disabled:opacity-40 disabled:pointer-events-none disabled:active:scale-100";

    const sizeStyles: Record<ButtonSize, string> = {
      sm: "h-8 px-3 text-12 rounded-12 gap-1.5",
      md: "h-10 px-4 text-14 rounded-12 gap-2",
      lg: "h-12 px-6 text-16 rounded-20 gap-2.5"
    };

    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        "bg-brand text-white hover:bg-brand-hover shadow-sm border border-transparent",
      secondary:
        "bg-bg-elevated text-text-primary hover:bg-bg-surface border border-border-hairline hover:border-border-subtle shadow-sm",
      tertiary:
        "bg-transparent text-text-primary hover:bg-bg-elevated border border-border-hairline",
      ghost:
        "bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-surface border border-transparent",
      danger:
        "bg-status-rest/10 text-status-rest hover:bg-status-rest/20 border border-status-rest/30",
      outline:
        "bg-transparent text-text-primary hover:bg-bg-elevated border border-border-hairline hover:border-border-subtle shadow-sm"
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${
          fullWidth ? "w-full" : ""
        } ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
