import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular" | "card" | "tile";
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = "rectangular",
  width,
  height,
  className = "",
  style,
  ...props
}) => {
  const baseStyles = "animate-pulse bg-border-subtle/50 select-none";

  const variantStyles: Record<string, string> = {
    text: "h-4 w-3/4 rounded-full",
    circular: "h-10 w-10 rounded-full shrink-0",
    rectangular: "h-20 w-full rounded-12",
    card: "h-40 w-full rounded-20 border border-border-hairline bg-bg-surface p-4",
    tile: "h-28 w-full rounded-20 border border-border-hairline bg-bg-surface p-4"
  };

  const inlineStyles: React.CSSProperties = {
    width,
    height,
    ...style
  };

  return (
    <div
      aria-hidden="true"
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      style={inlineStyles}
      {...props}
    />
  );
};
