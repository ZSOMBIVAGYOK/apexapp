import React, { useRef, useState, useLayoutEffect, useCallback } from "react";
import { useRenderLoopDetector } from "../hooks/useRenderLoopDetector";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  content?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  variant?: "line" | "pill";
  className?: string;
  children?: React.ReactNode;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeId,
  onChange,
  variant = "line",
  className = "",
  children
}) => {
  useRenderLoopDetector("Tabs");
  const tablistRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [lensStyle, setLensStyle] = useState<{ left: number; width: number } | null>(null);

  const updateLens = useCallback(() => {
    const activeEl = itemsRef.current.get(activeId);
    if (activeEl && tablistRef.current) {
      const nextLeft = activeEl.offsetLeft;
      const nextWidth = activeEl.offsetWidth;
      setLensStyle((prev) => {
        if (prev && prev.left === nextLeft && prev.width === nextWidth) return prev;
        return { left: nextLeft, width: nextWidth };
      });
    }
  }, [activeId]);

  const tabsKey = tabs.map((t) => t.id).join(",");

  useLayoutEffect(() => {
    updateLens();
    window.addEventListener("resize", updateLens);
    return () => window.removeEventListener("resize", updateLens);
  }, [updateLens, tabsKey]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;
    if (e.key === "ArrowRight") {
      nextIndex = (index + 1) % tabs.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    const nextTab = tabs[nextIndex];
    if (nextTab) {
      onChange(nextTab.id);
      const targetBtn = itemsRef.current.get(nextTab.id);
      targetBtn?.focus();
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Tab List */}
      <div
        ref={tablistRef}
        role="tablist"
        className={`relative flex items-center gap-1 overflow-x-auto no-scrollbar ${
          variant === "line"
            ? "border-b border-border/60 pb-px"
            : "p-1 rounded-full bg-bg-surface-solid dark:bg-white/[0.05] border border-border/60 backdrop-blur-md shadow-glass-sm"
        }`}
      >
        {/* Sliding Lens Indicator for Pill Variant */}
        {variant === "pill" && lensStyle && (
          <div
            aria-hidden="true"
            className="glass-lens absolute top-1 bottom-1 rounded-full transition-all duration-280 ease-spring pointer-events-none"
            style={{
              left: `${lensStyle.left}px`,
              width: `${lensStyle.width}px`
            }}
          />
        )}

        {/* Sliding Underline for Line Variant */}
        {variant === "line" && lensStyle && (
          <div
            aria-hidden="true"
            className="absolute bottom-0 h-0.5 bg-brand transition-all duration-280 ease-spring pointer-events-none"
            style={{
              left: `${lensStyle.left}px`,
              width: `${lensStyle.width}px`
            }}
          />
        )}

        {tabs.map((tab, idx) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                if (el) itemsRef.current.set(tab.id, el);
                else itemsRef.current.delete(tab.id);
              }}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`touch-target relative z-10 inline-flex items-center gap-2 whitespace-nowrap px-4 py-2 text-14 font-medium transition-colors duration-160 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                variant === "line"
                  ? isActive
                    ? "text-text-primary font-semibold"
                    : "text-text-secondary hover:text-text-primary"
                  : `rounded-full ${
                      isActive
                        ? "text-text-primary font-semibold"
                        : "text-text-secondary hover:text-text-primary"
                    } ${!lensStyle && isActive ? "bg-bg-elevated dark:bg-white/[0.12] shadow-sm" : ""}`
              }`}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold tabular-nums ${
                    isActive
                      ? "bg-brand text-white"
                      : "bg-bg-elevated text-text-secondary border border-border/40"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {tabs.map((tab) => {
        if (tab.id !== activeId || !tab.content) return null;
        return (
          <div
            key={tab.id}
            role="tabpanel"
            id={`panel-${tab.id}`}
            aria-labelledby={`tab-${tab.id}`}
            className="focus:outline-none"
          >
            {tab.content}
          </div>
        );
      })}

      {children}
    </div>
  );
};
