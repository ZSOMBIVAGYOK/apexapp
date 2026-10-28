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
      container: "bg-bg-elevated dark:bg-white/[0.08] text-text-secondary border border-border/60",
      dot: "bg-text-tertiary"
    },
    brand: {
      container: "bg-brand/12 text-brand border border-brand/25 dark:shadow-[0_0_8px_rgba(61,123,255,0.2)]",
      dot: "bg-brand"
    },
    ready: {
      container: "bg-status-ready/12 text-status-ready border border-status-ready/25 dark:shadow-[0_0_8px_rgba(52,211,153,0.2)]",
      dot: "bg-status-ready"
    },
    caution: {
      container: "bg-status-caution/12 text-status-caution border border-status-caution/25 dark:shadow-[0_0_8px_rgba(251,191,36,0.2)]",
      dot: "bg-status-caution"
    },
    rest: {
      container: "bg-status-rest/12 text-status-rest border border-status-rest/25 dark:shadow-[0_0_8px_rgba(248,113,113,0.2)]",
      dot: "bg-status-rest"
    },
    outline: {
      container: "bg-transparent text-text-primary border border-border/80",
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
