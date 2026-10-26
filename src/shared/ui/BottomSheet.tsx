import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = "md"
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles: Record<string, string> = {
    sm: "lg:max-w-md",
    md: "lg:max-w-lg",
    lg: "lg:max-w-2xl",
    xl: "lg:max-w-3xl"
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "sheet-title" : undefined}
      aria-describedby={description ? "sheet-description" : undefined}
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center"
    >
      {/* Frosted Glass Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Sheet / Modal Container */}
      <div
        ref={dialogRef}
        className={`relative z-10 w-full rounded-t-28 lg:rounded-28 border border-border-hairline bg-bg-surface p-6 shadow-sheet lg:shadow-elevated transition-transform duration-200 ease-apex-out max-h-[90vh] flex flex-col ${maxWidthStyles[maxWidth]}`}
      >
        {/* Mobile Drag Indicator */}
        <div className="lg:hidden flex justify-center mb-4">
          <div className="h-1.5 w-12 rounded-full bg-border-subtle" aria-hidden="true" />
        </div>

        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-border-hairline mb-4">
            <div>
              {title && (
                <h2 id="sheet-title" className="text-20 font-bold tracking-tight text-text-primary">
                  {title}
                </h2>
              )}
              {description && (
                <p id="sheet-description" className="text-14 text-text-secondary mt-1">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Bezárás"
              className="rounded-12 p-2 text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 pr-1 focus-visible:outline-none">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="pt-4 mt-4 border-t border-border-hairline flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
