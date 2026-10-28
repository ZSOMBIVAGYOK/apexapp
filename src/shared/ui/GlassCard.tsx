import React from "react";

export type GlassCardVariant = "thin" | "regular" | "thick" | "interactive";
export type GlassCardPadding = "none" | "sm" | "md" | "lg";

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: GlassCardVariant;
  padding?: GlassCardPadding;
  sheen?: boolean;
  as?: React.ElementType;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      children,
      variant = "regular",
      padding = "md",
      sheen = true,
      as: Component = "div",
      className = "",
      ...props
    },
    ref
  ) => {
    const variantStyles: Record<GlassCardVariant, string> = {
      thin: "glass-thin shadow-glass-sm",
      regular: "glass-regular shadow-glass-md",
      thick: "glass-thick shadow-glass-lg",
      interactive:
        "glass-regular shadow-glass-md hover:border-border transition-all duration-160 ease-spring cursor-pointer active:scale-[0.985]"
    };

    const paddingStyles: Record<GlassCardPadding, string> = {
      none: "p-0",
      sm: "p-3 sm:p-4",
      md: "p-4 sm:p-6",
      lg: "p-6 sm:p-8"
    };

    return (
      <Component
        ref={ref}
        className={`rounded-card relative ${variantStyles[variant]} ${sheen ? "glass-sheen" : ""} ${paddingStyles[padding]} ${className}`}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

GlassCard.displayName = "GlassCard";
