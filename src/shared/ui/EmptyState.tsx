import React from "react";
import { Inbox } from "lucide-react";

import { Button } from "./Button";

export interface EmptyStateActionObject {
  label: string;
  onClick: () => void;
}

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  message?: string;
  action?: React.ReactNode | EmptyStateActionObject;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  message,
  action,
  className = ""
}) => {
  const effectiveDescription = description || message;
  const isActionObject =
    action && typeof action === "object" && "label" in action && "onClick" in action;

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

      {effectiveDescription && (
        <p className="mt-1 max-w-sm text-14 text-text-secondary leading-normal">
          {effectiveDescription}
        </p>
      )}

      {action && (
        <div className="mt-5">
          {isActionObject ? (
            <Button onClick={(action as EmptyStateActionObject).onClick}>
              {(action as EmptyStateActionObject).label}
            </Button>
          ) : (
            action as React.ReactNode
          )}
        </div>
      )}
    </div>
  );
};
