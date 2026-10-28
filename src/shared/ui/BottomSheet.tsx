import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export type SheetDetent = "peek" | "half" | "full";

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
  detents?: SheetDetent[];
  defaultDetent?: SheetDetent;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = "md",
  detents = ["half", "full"],
  defaultDetent = "full"
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [currentDetent, setCurrentDetent] = useState<SheetDetent>(defaultDetent);

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

  useEffect(() => {
    if (isOpen) {
      setCurrentDetent(defaultDetent);
    }
  }, [isOpen, defaultDetent]);

  if (!isOpen) return null;

  const maxWidthStyles: Record<string, string> = {
    sm: "lg:max-w-md",
    md: "lg:max-w-lg",
    lg: "lg:max-w-2xl",
    xl: "lg:max-w-3xl"
  };

  const detentHeightStyles: Record<SheetDetent, string> = {
    peek: "h-[35dvh]",
    half: "h-[60dvh]",
    full: "h-[92dvh] lg:h-auto lg:max-h-[85vh]"
  };

  const cycleDetent = () => {
    if (detents.length <= 1) return;
    const currentIndex = detents.indexOf(currentDetent);
    const nextIndex = (currentIndex + 1) % detents.length;
    const next = detents[nextIndex];
    if (next) setCurrentDetent(next);
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
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-280"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Sheet / Modal Container */}
      <div
        ref={dialogRef}
        className={`relative z-10 w-full rounded-t-32 lg:rounded-32 border border-border/60 bg-bg-surface-solid dark:bg-[#14161B] p-6 shadow-glass-lg transition-all duration-280 ease-spring flex flex-col ${detentHeightStyles[currentDetent]} ${maxWidthStyles[maxWidth]}`}
      >
        {/* Mobile Drag Indicator / Grab Handle */}
        <div
          className="lg:hidden flex justify-center -mt-2 mb-3 cursor-grab active:cursor-grabbing select-none"
          onClick={cycleDetent}
        >
          <div className="h-1.5 w-12 rounded-full bg-border-subtle hover:bg-border transition-colors" aria-hidden="true" />
        </div>

        {/* Liquid Glass Header */}
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-border/40 mb-4 select-none">
            <div className="min-w-0">
              {title && (
                <h2 id="sheet-title" className="text-20 font-bold tracking-tight text-text-primary truncate">
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
              className="touch-target rounded-full p-2 text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 pr-1 focus-visible:outline-none overscroll-contain">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="pt-4 mt-4 border-t border-border/40 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
