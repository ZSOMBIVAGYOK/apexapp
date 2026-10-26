import React from "react";

export type BadgeVariant = "neutral" | "brand" | "ready" | "caution" | "rest" | "outline";
export type BadgeSize = "sm" | "md";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "neutral",
  size = "md",
  dot = false,
  className = "",
  ...props
}) => {
  const sizeStyles: Record<BadgeSize, string> = {
    sm: "px-2 py-0.5 text-[11px] gap-1",
    md: "px-2.5 py-1 text-12 gap-1.5"
  };

  const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
    neutral: {
      container: "bg-bg-elevated text-text-secondary border border-border-hairline",
      dot: "bg-text-tertiary"
    },
    brand: {
      container: "bg-brand/10 text-brand border border-brand/20",
      dot: "bg-brand"
    },
    ready: {
      container: "bg-status-ready/10 text-status-ready border border-status-ready/20",
      dot: "bg-status-ready"
    },
    caution: {
      container: "bg-status-caution/10 text-status-caution border border-status-caution/20",
      dot: "bg-status-caution"
    },
    rest: {
      container: "bg-status-rest/10 text-status-rest border border-status-rest/20",
      dot: "bg-status-rest"
    },
    outline: {
      container: "bg-transparent text-text-primary border border-border-subtle",
      dot: "bg-text-primary"
    }
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium leading-none select-none ${
        sizeStyles[size]
      } ${variantStyles[variant].container} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${variantStyles[variant].dot}`}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </span>
  );
};
