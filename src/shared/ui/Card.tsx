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
      radius = "20",
      as: Component = "div",
      className = "",
      ...props
    },
    ref
  ) => {
    const variantStyles: Record<CardVariant, string> = {
      surface: "bg-bg-surface border border-border-hairline shadow-sm",
      elevated: "bg-bg-elevated border border-border-hairline shadow-elevated",
      ghost: "bg-transparent border border-border-hairline",
      interactive:
        "bg-bg-surface border border-border-hairline hover:border-border-subtle hover:bg-bg-elevated transition-all duration-200 ease-apex-out cursor-pointer active:scale-[0.99] shadow-sm"
    };

    const paddingStyles: Record<CardPadding, string> = {
      none: "p-0",
      sm: "p-3 sm:p-4",
      md: "p-4 sm:p-5",
      lg: "p-6 sm:p-8"
    };

    const radiusStyles: Record<CardRadius, string> = {
      "12": "rounded-12",
      "20": "rounded-20",
      "28": "rounded-28"
    };

    return (
      <Component
        ref={ref}
        className={`${variantStyles[variant]} ${paddingStyles[padding]} ${radiusStyles[radius]} ${className}`}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Card.displayName = "Card";
