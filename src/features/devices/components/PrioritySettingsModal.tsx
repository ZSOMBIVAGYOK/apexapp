import React, { useState } from "react";
import { BottomSheet, Button, Badge, SourceBadge, showToast } from "@shared/ui";
import { MetricPriorityConfig, DEFAULT_METRIC_PRIORITIES } from "@shared/types/devices";
import { ChevronUp, ChevronDown, RotateCcw, Check } from "lucide-react";

export interface PrioritySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPriorities: MetricPriorityConfig;
  onSave: (updated: MetricPriorityConfig) => void;
}

type MetricKey = keyof MetricPriorityConfig;

const METRIC_TABS: Array<{ id: MetricKey; label: string; description: string }> = [
  {
    id: "sleep",
    label: "Alvás",
    description: "Melyik eszköz alváshossza és alvási stádiumai számítanak elsődlegesnek az aggregált napban?"
  },
  {
    id: "activity",
    label: "Edzés",
    description: "Ha két eszköz rögzíti ugyanazt az edzést, melyik szolgáltató az alapadat-forrás?"
  },
  {
    id: "hrv",
    label: "HRV (RMSSD)",
    description: "Melyik biometrikus szenzor éjszakai szívritmus-variabilitása határozza meg a readiness számítást?"
  },
  {
    id: "restingHR",
    label: "Nyugalmi pulzus",
    description: "Melyik eszköz éjszakai nyugalmi pulzusértéke érvényesül?"
  },
  {
    id: "weight",
    label: "Testsúly",
    description: "Mérleg szinkronizáció vagy kézi beírás elsőbbsége?"
  }
];

export const PrioritySettingsModal: React.FC<PrioritySettingsModalProps> = ({
  isOpen,
  onClose,
  currentPriorities,
  onSave
}) => {
  const [activeMetric, setActiveMetric] = useState<MetricKey>("sleep");
  const [priorities, setPriorities] = useState<MetricPriorityConfig>({ ...currentPriorities });

  const currentList = priorities[activeMetric];
  const activeTabMeta = METRIC_TABS.find((t) => t.id === activeMetric)!;

  const moveItem = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentList.length) return;

    const updated = [...currentList];
    const temp = updated[index]!;
    updated[index] = updated[targetIndex]!;
    updated[targetIndex] = temp;

    setPriorities((prev) => ({
      ...prev,
      [activeMetric]: updated
    }));
  };

  const handleReset = () => {
    setPriorities({ ...DEFAULT_METRIC_PRIORITIES });
    showToast({
      title: "Alapértelmezett prioritások",
      message: "A gyári eszközprioritások visszaállításra kerültek.",
      type: "info"
    });
  };

  const handleSave = () => {
    onSave(priorities);
    showToast({
      title: "Prioritások elmentve",
      message: "Az automatikus forrásválasztási szabályok frissültek.",
      type: "success"
    });
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Metrika prioritások"
      description="Állítsd be, hogy melyik eszköz forrása élvezzen elsőbbséget többcsatornás mérések esetén."
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
          >
            Alapértelmezett
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Mégse
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              leftIcon={<Check className="h-3.5 w-3.5" />}
            >
              Mentés
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        {/* Metric Switcher Tabs */}
        <div className="overflow-x-auto pb-1 scrollbar-none">
          <div className="flex gap-1.5 p-1 bg-surface-elevated rounded-12 w-max">
            {METRIC_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveMetric(tab.id)}
                className={`px-3 py-1.5 rounded-8 text-12 font-medium transition-all ${
                  activeMetric === tab.id
                    ? "bg-surface text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Description */}
        <p className="text-12 text-text-secondary">{activeTabMeta.description}</p>

        {/* Priority Ordered List */}
        <div className="space-y-2">
          {currentList.map((provider, index) => {
            const isFirst = index === 0;
            const isLast = index === currentList.length - 1;

            return (
              <div
                key={provider}
                className={`flex items-center justify-between p-3 rounded-14 border transition-all ${
                  isFirst
                    ? "bg-brand/5 border-brand/30 shadow-sm"
                    : "bg-surface-elevated/40 border-border-hairline"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center text-11 font-mono font-bold ${
                      isFirst
                        ? "bg-brand text-white"
                        : "bg-surface border border-border-hairline text-text-secondary"
                    }`}
                  >
                    {index + 1}
                  </div>

                  <div className="flex items-center gap-2">
                    <SourceBadge source={provider} />
                    {isFirst && (
                      <Badge variant="ready" size="sm">
                        Elsődleges nyertes
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Move Controls */}
                <div className="flex items-center gap-1">
                  <button
                    disabled={isFirst}
                    onClick={() => moveItem(index, "up")}
                    className="p-1.5 rounded-8 bg-surface hover:bg-surface-elevated disabled:opacity-30 disabled:pointer-events-none text-text-secondary hover:text-text-primary border border-border-hairline transition-colors"
                    title="Előre sorolás"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    disabled={isLast}
                    onClick={() => moveItem(index, "down")}
                    className="p-1.5 rounded-8 bg-surface hover:bg-surface-elevated disabled:opacity-30 disabled:pointer-events-none text-text-secondary hover:text-text-primary border border-border-hairline transition-colors"
                    title="Hátra sorolás"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </BottomSheet>
  );
};
