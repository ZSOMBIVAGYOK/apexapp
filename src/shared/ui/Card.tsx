import React from "react";

export type CardVariant = "surface" | "elevated" | "ghost" | "interactive";
export type CardPadding = "none" | "sm" | "md" | "lg";
export type CardRadius = "12" | "20" | "28";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  radius?: CardRadius;
  as?: React.ElementType;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = "surface",
      padding = "md",
      radius = "28",
      as: Component = "div",
      className = "",
      ...props
    },
    ref
  ) => {
    const variantStyles: Record<CardVariant, string> = {
      surface: "bg-bg-surface-solid dark:bg-bg-surface border border-border/60 shadow-sm",
      elevated: "bg-bg-elevated border border-border/80 shadow-elevated",
      ghost: "bg-transparent border border-border/40",
      interactive:
        "bg-bg-surface-solid dark:bg-bg-surface border border-border/60 hover:border-border hover:bg-bg-elevated transition-all duration-160 ease-spring cursor-pointer active:scale-[0.985] shadow-sm"
    };

    const paddingStyles: Record<CardPadding, string> = {
      none: "p-0",
      sm: "p-3 sm:p-4",
      md: "p-4 sm:p-6",
      lg: "p-6 sm:p-8"
    };

    const radiusStyles: Record<CardRadius, string> = {
      "12": "rounded-12",
      "20": "rounded-20",
      "28": "rounded-card"
    };

    return (
      <Component
        ref={ref}
        className={`relative ${variantStyles[variant]} ${paddingStyles[padding]} ${radiusStyles[radius]} ${className}`}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Card.displayName = "Card";
