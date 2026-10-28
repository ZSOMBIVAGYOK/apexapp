import React from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "plain" | "tertiary" | "ghost" | "destructive" | "danger" | "outline";
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
      "touch-target inline-flex items-center justify-center font-medium rounded-full select-none transition-all duration-120 ease-spring active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary disabled:opacity-40 disabled:pointer-events-none disabled:active:scale-100";

    const sizeStyles: Record<ButtonSize, string> = {
      sm: "h-8 px-3.5 text-12 gap-1.5",
      md: "h-10 px-4.5 text-14 gap-2",
      lg: "h-12 px-6 text-16 gap-2.5"
    };

    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        "bg-brand text-white hover:bg-brand-hover shadow-sm border border-brand/40 dark:shadow-[0_2px_12px_rgba(61,123,255,0.35)] dark:hover:brightness-110",
      secondary:
        "bg-bg-surface-solid dark:bg-white/[0.08] text-text-primary hover:bg-bg-elevated dark:hover:bg-white/[0.12] border border-border/60 hover:border-border shadow-sm",
      plain:
        "bg-transparent text-text-secondary hover:text-text-primary hover:bg-white/[0.06] border border-transparent",
      tertiary:
        "bg-transparent text-text-secondary hover:text-text-primary hover:bg-white/[0.06] border border-border/40 hover:border-border",
      ghost:
        "bg-transparent text-text-secondary hover:text-text-primary hover:bg-white/[0.06] border border-transparent",
      destructive:
        "bg-status-rest/15 text-status-rest hover:bg-status-rest/25 border border-status-rest/30 shadow-sm",
      danger:
        "bg-status-rest/15 text-status-rest hover:bg-status-rest/25 border border-status-rest/30 shadow-sm",
      outline:
        "bg-transparent text-text-primary hover:bg-white/[0.06] border border-border/60 hover:border-border shadow-sm"
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
