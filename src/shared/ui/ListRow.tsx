import React from "react";
import { ChevronRight } from "lucide-react";

export interface ListRowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  value?: React.ReactNode;
  showChevron?: boolean;
  divider?: boolean;
  onClick?: () => void;
}

export const ListRow: React.FC<ListRowProps> = ({
  leading,
  title,
  subtitle,
  trailing,
  value,
  showChevron = false,
  divider = false,
  onClick,
  className = "",
  ...props
}) => {
  const isClickable = Boolean(onClick);

  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (isClickable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`group flex items-center justify-between gap-3 px-4 py-3.5 transition-all duration-200 ease-apex-out ${
        isClickable
          ? "cursor-pointer hover:bg-bg-elevated active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-12"
          : ""
      } ${divider ? "border-b border-border-hairline last:border-b-0" : ""} ${className}`}
      {...props}
    >
      {/* Left Slot + Title */}
      <div className="flex items-center gap-3 min-w-0">
        {leading && <div className="shrink-0 text-text-secondary">{leading}</div>}
        <div className="min-w-0">
          <div className="text-14 font-medium text-text-primary truncate">
            {title}
          </div>
          {subtitle && (
            <div className="text-12 text-text-secondary truncate mt-0.5">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {/* Right Slot: Value / Trailing / Chevron */}
      <div className="flex items-center gap-2.5 shrink-0 ml-2">
        {value && (
          <span className="text-14 font-semibold tabular-nums text-text-primary">
            {value}
          </span>
        )}
        {trailing && <div>{trailing}</div>}
        {showChevron && (
          <ChevronRight
            className="h-4 w-4 text-text-tertiary group-hover:text-text-primary transition-colors"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
};
