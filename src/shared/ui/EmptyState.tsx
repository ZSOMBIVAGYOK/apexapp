import React from "react";
import { Inbox } from "lucide-react";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = ""
}) => {
  return (
    <div
      className={`rounded-28 border border-dashed border-border-subtle bg-bg-surface/50 p-8 sm:p-12 text-center flex flex-col items-center justify-center select-none ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-20 bg-bg-elevated border border-border-hairline text-text-secondary mb-4 shadow-sm">
        {icon || <Inbox className="h-6 w-6" aria-hidden="true" />}
      </div>

      <h3 className="text-16 font-semibold text-text-primary tracking-tight">
        {title}
      </h3>

      {description && (
        <p className="mt-1 max-w-sm text-14 text-text-secondary leading-normal">
          {description}
        </p>
      )}

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};
