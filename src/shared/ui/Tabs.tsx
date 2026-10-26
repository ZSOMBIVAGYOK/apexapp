import React, { useRef } from "react";

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
  const tablistRef = useRef<HTMLDivElement>(null);

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
      const buttons = tablistRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      buttons?.[nextIndex]?.focus();
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Tab List */}
      <div
        ref={tablistRef}
        role="tablist"
        className={`flex items-center gap-1 overflow-x-auto no-scrollbar ${
          variant === "line"
            ? "border-b border-border-hairline"
            : "bg-bg-surface p-1 rounded-12 border border-border-hairline"
        }`}
      >
        {tabs.map((tab, idx) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`relative inline-flex items-center gap-2 whitespace-nowrap px-3.5 py-2.5 text-14 font-medium transition-all duration-200 ease-apex-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                variant === "line"
                  ? isActive
                    ? "text-text-primary border-b-2 border-brand font-semibold"
                    : "text-text-secondary hover:text-text-primary border-b-2 border-transparent"
                  : isActive
                  ? "bg-bg-elevated text-text-primary rounded-12 shadow-sm border border-border-hairline"
                  : "text-text-secondary hover:text-text-primary rounded-12"
              }`}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold tabular-nums ${
                    isActive
                      ? "bg-brand text-white"
                      : "bg-bg-elevated text-text-secondary"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panel */}
      {tabs.map((tab) => {
        if (tab.id !== activeId) return null;
        return (
          <div
            key={tab.id}
            role="tabpanel"
            id={`panel-${tab.id}`}
            aria-labelledby={`tab-${tab.id}`}
            tabIndex={0}
            className="focus-visible:outline-none"
          >
            {tab.content || children}
          </div>
        );
      })}
    </div>
  );
};
