import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AthleteTrainingZones
} from "@shared/types/training";
import {
  AthleteThresholds,
  calculateAllZones,
  formatPaceSeconds,
  parsePaceString
} from "@shared/lib/zones/zoneCalculator";
import { BottomSheet, Button } from "@shared/ui";
import { Activity, Zap, Compass, RotateCcw, Save } from "lucide-react";

interface ThresholdsAndZonesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialThresholds?: AthleteThresholds;
  initialZones?: AthleteTrainingZones;
  onSave: (thresholds: AthleteThresholds, zones: AthleteTrainingZones) => void;
}

export const ThresholdsAndZonesModal: React.FC<ThresholdsAndZonesModalProps> = ({
  isOpen,
  onClose,
  initialThresholds,
  initialZones,
  onSave
}) => {
  const { i18n } = useTranslation();
  const isHu = i18n.language.startsWith("hu");

  const [maxHr, setMaxHr] = useState<number>(initialThresholds?.maxHr || 192);
  const [lthr, setLthr] = useState<number>(initialThresholds?.lthr || 170);
  const [ftp, setFtp] = useState<number>(initialThresholds?.ftp || 280);
  const [thresholdPaceStr, setThresholdPaceStr] = useState<string>(
    formatPaceSeconds(initialThresholds?.thresholdPaceSeconds || 260)
  );
  const [cssStr, setCssStr] = useState<string>(
    formatPaceSeconds(initialThresholds?.criticalSwimSpeedSeconds || 85)
  );

  const [activeTab, setActiveTab] = useState<"hr" | "power" | "pace">("hr");

  // Computed or edited zones
  const [zones, setZones] = useState<AthleteTrainingZones>(() => {
    if (initialZones) return initialZones;
    return calculateAllZones({
      maxHr: initialThresholds?.maxHr || 192,
      lthr: initialThresholds?.lthr || 170,
      ftp: initialThresholds?.ftp || 280,
      thresholdPaceSeconds: initialThresholds?.thresholdPaceSeconds || 260,
      criticalSwimSpeedSeconds: initialThresholds?.criticalSwimSpeedSeconds || 85
    });
  });

  const handleRecalculate = () => {
    const paceSec = parsePaceString(thresholdPaceStr) || 260;
    const cssSec = parsePaceString(cssStr) || 85;
    const newZones = calculateAllZones({
      maxHr,
      lthr,
      ftp,
      thresholdPaceSeconds: paceSec,
      criticalSwimSpeedSeconds: cssSec
    });
    setZones(newZones);
  };

  const handleSave = () => {
    const paceSec = parsePaceString(thresholdPaceStr) || 260;
    const cssSec = parsePaceString(cssStr) || 85;
    const thresholds: AthleteThresholds = {
      maxHr,
      lthr,
      ftp,
      thresholdPaceSeconds: paceSec,
      criticalSwimSpeedSeconds: cssSec
    };
    onSave(thresholds, zones);
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={isHu ? "Küszöbértékek és Edzészónák" : "Thresholds & Training Zones"}
    >
      <div className="space-y-6 text-sm p-1">
        {/* Physiological Thresholds Input Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              {isHu ? "Fiziológiai Küszöbértékek" : "Physiological Thresholds"}
            </h4>
            <button
              onClick={handleRecalculate}
              className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isHu ? "Zónák újraszámolása" : "Recalculate zones"}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* LTHR */}
            <div className="bg-[#0B0C0F] p-3 rounded-2xl border border-white/5">
              <label className="block text-[11px] text-text-secondary mb-1">
                {isHu ? "Laktát-küszöb pulzus (LTHR)" : "Lactate Threshold HR (LTHR)"}
              </label>
              <div className="flex items-baseline gap-1.5">
                <input
                  type="number"
                  value={lthr}
                  onChange={(e) => setLthr(parseInt(e.target.value, 10) || 0)}
                  className="w-20 bg-transparent text-white font-mono font-bold text-lg focus:outline-none"
                />
                <span className="text-xs text-text-secondary">bpm</span>
              </div>
            </div>

            {/* Max HR */}
            <div className="bg-[#0B0C0F] p-3 rounded-2xl border border-white/5">
              <label className="block text-[11px] text-text-secondary mb-1">
                {isHu ? "Maximális pulzus (Max HR)" : "Max Heart Rate (HRmax)"}
              </label>
              <div className="flex items-baseline gap-1.5">
                <input
                  type="number"
                  value={maxHr}
                  onChange={(e) => setMaxHr(parseInt(e.target.value, 10) || 0)}
                  className="w-20 bg-transparent text-white font-mono font-bold text-lg focus:outline-none"
                />
                <span className="text-xs text-text-secondary">bpm</span>
              </div>
            </div>

            {/* FTP */}
            <div className="bg-[#0B0C0F] p-3 rounded-2xl border border-white/5">
              <label className="block text-[11px] text-text-secondary mb-1">
                {isHu ? "Kerékpár FTP" : "Cycling FTP"}
              </label>
              <div className="flex items-baseline gap-1.5">
                <input
                  type="number"
                  value={ftp}
                  onChange={(e) => setFtp(parseInt(e.target.value, 10) || 0)}
                  className="w-20 bg-transparent text-white font-mono font-bold text-lg focus:outline-none"
                />
                <span className="text-xs text-text-secondary">Watt</span>
              </div>
            </div>

            {/* Running Threshold Pace */}
            <div className="bg-[#0B0C0F] p-3 rounded-2xl border border-white/5">
              <label className="block text-[11px] text-text-secondary mb-1">
                {isHu ? "Futó Küszöbtempó (T-Pace)" : "Threshold Run Pace"}
              </label>
              <div className="flex items-baseline gap-1.5">
                <input
                  type="text"
                  value={thresholdPaceStr}
                  onChange={(e) => setThresholdPaceStr(e.target.value)}
                  placeholder="4:15"
                  className="w-20 bg-transparent text-white font-mono font-bold text-lg focus:outline-none"
                />
                <span className="text-xs text-text-secondary">/km</span>
              </div>
            </div>

            {/* Critical Swim Speed */}
            <div className="bg-[#0B0C0F] p-3 rounded-2xl border border-white/5">
              <label className="block text-[11px] text-text-secondary mb-1">
                {isHu ? "Kritikus Úszótempó (CSS)" : "Critical Swim Speed (CSS)"}
              </label>
              <div className="flex items-baseline gap-1.5">
                <input
                  type="text"
                  value={cssStr}
                  onChange={(e) => setCssStr(e.target.value)}
                  placeholder="1:25"
                  className="w-20 bg-transparent text-white font-mono font-bold text-lg focus:outline-none"
                />
                <span className="text-xs text-text-secondary">/100m</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5-Zone Model View Tabs */}
        <div>
          <div className="flex items-center gap-2 border-b border-white/10 pb-3 mb-4">
            <button
              onClick={() => setActiveTab("hr")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === "hr"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  : "text-text-secondary hover:text-white"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{isHu ? "Pulzuszónák (HR)" : "Heart Rate Zones"}</span>
            </button>

            <button
              onClick={() => setActiveTab("power")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === "power"
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  : "text-text-secondary hover:text-white"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isHu ? "Wattzónák (Power)" : "Power Zones"}</span>
            </button>

            <button
              onClick={() => setActiveTab("pace")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === "pace"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "text-text-secondary hover:text-white"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{isHu ? "Tempózónák (Pace)" : "Pace Zones"}</span>
            </button>
          </div>

          {/* Zones Table List */}
          <div className="space-y-2">
            {(activeTab === "hr"
              ? zones.hrZones
              : activeTab === "power"
              ? zones.powerZones
              : zones.paceZones
            ).map((zone) => (
              <div
                key={zone.zoneNumber}
                className="flex items-center justify-between p-3 rounded-2xl bg-[#0B0C0F] border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3.5 h-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: zone.color }}
                  />
                  <div>
                    <div className="font-semibold text-white text-xs">
                      {isHu ? zone.nameHu : zone.nameEn}
                    </div>
                    <div className="text-[11px] text-text-secondary mt-0.5 line-clamp-1">
                      {isHu ? zone.descriptionHu : zone.descriptionEn}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-white text-xs">
                    {zone.min} - {zone.max}{" "}
                    {activeTab === "hr"
                      ? "bpm"
                      : activeTab === "power"
                      ? "W"
                      : "/km"}
                  </div>
                  <div className="text-[10px] text-text-secondary font-mono">
                    {zone.percentMin}% - {zone.percentMax}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            {isHu ? "Mégse" : "Cancel"}
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{isHu ? "Zónák mentése" : "Save Zones"}</span>
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};
