import React from "react";

export interface SectionHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  badge,
  action,
  className = ""
}) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-4 select-none ${className}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="text-20 font-bold tracking-tight text-text-primary">
            {title}
          </h2>
          {badge && <div>{badge}</div>}
        </div>
        {description && (
          <p className="text-12 text-text-secondary mt-0.5">
            {description}
          </p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
