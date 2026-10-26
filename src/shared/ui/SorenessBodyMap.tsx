import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { RotateCw, X } from "lucide-react";
import { Badge } from "./Badge";

export interface BodyRegion {
  id: string;
  labelHu: string;
  labelEn: string;
  view: "front" | "back";
  // SVG coordinates / path representation
  path: string;
  cx: number;
  cy: number;
}

const BODY_REGIONS: BodyRegion[] = [
  // Front regions (viewBox 0 0 200 320)
  {
    id: "neck",
    labelHu: "Nyak",
    labelEn: "Neck",
    view: "front",
    path: "M92 48 Q100 52 108 48 L106 62 Q100 66 94 62 Z",
    cx: 100,
    cy: 56
  },
  {
    id: "shoulders",
    labelHu: "Vállak",
    labelEn: "Shoulders",
    view: "front",
    path: "M68 66 Q84 62 94 66 L92 84 Q76 84 68 66 Z M132 66 Q116 62 106 66 L108 84 Q124 84 132 66 Z",
    cx: 100,
    cy: 74
  },
  {
    id: "chest",
    labelHu: "Mellkas",
    labelEn: "Chest",
    view: "front",
    path: "M78 86 Q100 88 122 86 L120 114 Q100 118 80 114 Z",
    cx: 100,
    cy: 100
  },
  {
    id: "biceps",
    labelHu: "Felkar / Bicepsz",
    labelEn: "Biceps",
    view: "front",
    path: "M58 88 L68 84 L64 126 L54 122 Z M142 88 L132 84 L136 126 L146 122 Z",
    cx: 60,
    cy: 105
  },
  {
    id: "abs",
    labelHu: "Hasizmok (Core)",
    labelEn: "Abs / Core",
    view: "front",
    path: "M80 118 Q100 120 120 118 L116 158 Q100 162 84 158 Z",
    cx: 100,
    cy: 138
  },
  {
    id: "quads",
    labelHu: "Négyfejű combizom",
    labelEn: "Quadriceps",
    view: "front",
    path: "M76 164 Q94 164 96 216 L74 212 Q70 178 76 164 Z M124 164 Q106 164 104 216 L126 212 Q130 178 124 164 Z",
    cx: 100,
    cy: 190
  },
  {
    id: "knees",
    labelHu: "Térdek",
    labelEn: "Knees",
    view: "front",
    path: "M73 218 Q86 218 86 234 L73 234 Z M127 218 Q114 218 114 234 L127 234 Z",
    cx: 100,
    cy: 226
  },
  {
    id: "shins",
    labelHu: "Lábszár / Sípcsont",
    labelEn: "Shins",
    view: "front",
    path: "M73 238 L86 238 L84 286 L74 286 Z M127 238 L114 238 L116 286 L126 286 Z",
    cx: 100,
    cy: 262
  },

  // Back regions (viewBox 0 0 200 320)
  {
    id: "traps",
    labelHu: "Trapéz / Felső hát",
    labelEn: "Upper Back / Traps",
    view: "back",
    path: "M80 62 Q100 66 120 62 L124 94 Q100 98 76 94 Z",
    cx: 100,
    cy: 78
  },
  {
    id: "lower_back",
    labelHu: "Derék / Alsó hát",
    labelEn: "Lower Back",
    view: "back",
    path: "M78 98 Q100 100 122 98 L118 142 Q100 146 82 142 Z",
    cx: 100,
    cy: 120
  },
  {
    id: "glutes",
    labelHu: "Farizmok",
    labelEn: "Glutes",
    view: "back",
    path: "M76 146 Q100 148 124 146 L122 178 Q100 186 78 178 Z",
    cx: 100,
    cy: 164
  },
  {
    id: "hamstrings",
    labelHu: "Combhajlítók",
    labelEn: "Hamstrings",
    view: "back",
    path: "M76 182 Q94 182 96 226 L74 222 Z M124 182 Q106 182 104 226 L126 222 Z",
    cx: 100,
    cy: 204
  },
  {
    id: "calves",
    labelHu: "Vádlik",
    labelEn: "Calves",
    view: "back",
    path: "M72 230 Q86 230 84 278 L72 274 Z M128 230 Q114 230 116 278 L128 274 Z",
    cx: 100,
    cy: 254
  },
  {
    id: "achilles",
    labelHu: "Achilles / Boka",
    labelEn: "Achilles Tendons",
    view: "back",
    path: "M74 280 L84 280 L82 298 L76 298 Z M126 280 L116 280 L118 298 L124 298 Z",
    cx: 100,
    cy: 289
  }
];

export interface SorenessBodyMapProps {
  selectedRegions: string[];
  onChange?: (regions: string[]) => void;
  className?: string;
  readOnly?: boolean;
}

export const SorenessBodyMap: React.FC<SorenessBodyMapProps> = ({
  selectedRegions,
  onChange,
  className = "",
  readOnly = false
}) => {
  const { i18n } = useTranslation();
  const [currentView, setCurrentView] = useState<"front" | "back">("front");

  const isHu = i18n.language.startsWith("hu");

  const toggleRegion = (regionId: string) => {
    if (readOnly || !onChange) return;
    if (selectedRegions.includes(regionId)) {
      onChange(selectedRegions.filter((id) => id !== regionId));
    } else {
      onChange([...selectedRegions, regionId]);
    }
  };

  const handleClearAll = () => {
    if (readOnly || !onChange) return;
    onChange([]);
  };

  const visibleRegions = BODY_REGIONS.filter((r) => r.view === currentView);
  const activeSelectedCount = selectedRegions.length;

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* Controls & Switcher */}
      <div className="flex items-center justify-between w-full max-w-sm mb-3">
        <div className="inline-flex rounded-12 bg-bg-surface p-1 border border-border-hairline">
          <button
            type="button"
            onClick={() => setCurrentView("front")}
            className={`px-3 py-1.5 text-12 font-medium rounded-8 transition-colors ${
              currentView === "front"
                ? "bg-bg-elevated text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {isHu ? "Elölről" : "Front"}
          </button>
          <button
            type="button"
            onClick={() => setCurrentView("back")}
            className={`px-3 py-1.5 text-12 font-medium rounded-8 transition-colors ${
              currentView === "back"
                ? "bg-bg-elevated text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {isHu ? "Hátulról" : "Back"}
          </button>
        </div>

        {!readOnly && activeSelectedCount > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-11 text-text-tertiary hover:text-status-rest transition-colors flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            <span>{isHu ? "Törlés" : "Clear"}</span>
          </button>
        )}
      </div>

      {/* Interactive Silhouette SVG */}
      <div className="relative w-full max-w-[240px] aspect-[200/320] bg-bg-surface/50 rounded-20 border border-border-hairline/80 p-2 shadow-inner flex items-center justify-center">
        <svg
          viewBox="0 0 200 320"
          className="w-full h-full drop-shadow-sm transition-all duration-200"
          aria-label={isHu ? "Interaktív izomláz térkép" : "Interactive body soreness map"}
        >
          {/* Head & generic background figure */}
          <circle cx="100" cy="28" r="16" className="fill-bg-elevated stroke-border-hairline" strokeWidth="1.5" />
          
          {/* Base anatomical outline silhouette */}
          <path
            d="M92 46 Q100 50 108 46 L130 62 L150 90 L140 140 L126 144 L130 216 L128 290 L118 304 L114 290 L106 220 L94 220 L86 290 L82 304 L72 290 L70 216 L74 144 L60 140 L50 90 L70 62 Z"
            className="fill-bg-elevated/80 stroke-border-hairline"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Interactive Clickable Regions */}
          {visibleRegions.map((region) => {
            const isSelected = selectedRegions.includes(region.id);
            return (
              <g
                key={region.id}
                className={readOnly ? "cursor-default" : "cursor-pointer group"}
                onClick={() => toggleRegion(region.id)}
              >
                <path
                  d={region.path}
                  className={`transition-all duration-150 ${
                    isSelected
                      ? "fill-status-rest/85 stroke-status-rest stroke-[2]"
                      : "fill-brand/10 hover:fill-brand/25 stroke-border-hairline hover:stroke-brand/50 stroke-[1]"
                  }`}
                />
                {/* Visual pulse indicator dot if selected */}
                {isSelected && (
                  <circle
                    cx={region.cx}
                    cy={region.cy}
                    r="3.5"
                    className="fill-white animate-pulse pointer-events-none"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* View toggle badge button overlay */}
        <button
          type="button"
          onClick={() => setCurrentView((v) => (v === "front" ? "back" : "front"))}
          className="absolute bottom-3 right-3 p-2 rounded-full bg-bg-elevated text-text-secondary hover:text-text-primary border border-border-hairline shadow-sm"
          title={isHu ? "Nézet megfordítása" : "Flip view"}
          aria-label={isHu ? "Nézet megfordítása" : "Flip view"}
        >
          <RotateCw className="h-4 w-4" />
        </button>
      </div>

      {/* Active Selected Sore Areas Chips */}
      {activeSelectedCount > 0 && (
        <div className="w-full max-w-sm mt-3 flex flex-wrap gap-1.5 justify-center">
          {selectedRegions.map((regionId) => {
            const def = BODY_REGIONS.find((r) => r.id === regionId);
            const label = def ? (isHu ? def.labelHu : def.labelEn) : regionId;
            return (
              <Badge
                key={regionId}
                variant="rest"
                size="sm"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => toggleRegion(regionId)}
              >
                {label}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};
