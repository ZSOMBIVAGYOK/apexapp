import React from "react";
import { Skeleton } from "./Skeleton";
import { EmptyState } from "./EmptyState";
import { SegmentedControl } from "./SegmentedControl";

export interface ChartFrameProps {
  title: string;
  subtitle?: string;
  timeRanges?: string[];
  selectedRange?: string;
  onRangeChange?: (range: string) => void;
  legend?: React.ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  children: React.ReactNode;
  className?: string;
}

export const ChartFrame: React.FC<ChartFrameProps> = ({
  title,
  subtitle,
  timeRanges,
  selectedRange,
  onRangeChange,
  legend,
  isLoading = false,
  isEmpty = false,
  emptyTitle = "Nincs rögzített adat",
  emptyDescription = "A megadott időszakra vonatkozóan még nem érkeztek biometrikus mérési adatok.",
  children,
  className = ""
}) => {
  return (
    <div
      className={`rounded-card border border-border/60 bg-bg-surface-solid dark:bg-bg-surface p-5 sm:p-6 shadow-sm flex flex-col justify-between ${className}`}
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-border/40">
        <div>
          <h3 className="text-16 font-semibold tracking-tight text-text-primary">
            {title}
          </h3>
          {subtitle && (
            <p className="text-12 text-text-secondary mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {legend && <div className="text-12">{legend}</div>}
          {timeRanges && selectedRange && onRangeChange && (
            <SegmentedControl
              size="sm"
              options={timeRanges.map((r) => ({ value: r, label: r }))}
              value={selectedRange}
              onChange={onRangeChange}
            />
          )}
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="relative min-h-[220px] w-full flex items-center justify-center">
        {isLoading ? (
          <div className="w-full space-y-3">
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="rectangular" height={180} />
          </div>
        ) : isEmpty ? (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          <div className="w-full h-full">{children}</div>
        )}
      </div>
    </div>
  );
};
