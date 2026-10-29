import React, { useState } from "react";
import { Card, Button, showToast } from "@shared/ui";
import {
  Trophy,
  Share2,
  Sparkles,
  Check
} from "lucide-react";
import { WeeklyScoreSummary } from "@shared/lib/scores";

export interface WeeklyScoreCardProps {
  summary: WeeklyScoreSummary;
  onShare?: () => void;
  className?: string;
}

export const WeeklyScoreCard: React.FC<WeeklyScoreCardProps> = ({
  summary,
  onShare,
  className = ""
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyText = () => {
    const text = `Apex Heti Kör (${summary.startDate} – ${summary.endDate}):\n` +
      `• Átlagos regeneráció: ${summary.avgRecoveryScore}%\n` +
      `• Összesített terhelés: ${summary.totalStrain} pont\n` +
      `• Átlagos alvás: ${summary.avgSleepDurationHours} óra\n` +
      `• Célsávban töltött napok: ${summary.daysInTargetRange}/${summary.totalDaysEvaluated}\n` +
      `"${summary.insightSentenceHu}"\n#ApexAthletics #ProTraining`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast({
        title: "Heti összefoglaló másolva",
        message: "A vágólapra másoltuk a szöveges statisztikát.",
        type: "success"
      });
    }
  };

  return (
    <Card
      variant="surface"
      radius="28"
      className={`p-5 sm:p-6 border border-border-hairline space-y-4 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-12 bg-brand/10 text-brand">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-15 sm:text-17 font-bold text-text-primary tracking-tight">
              Heti Kör (Weekly Review)
            </h3>
            <span className="text-11 text-text-tertiary font-mono">
              {summary.startDate} – {summary.endDate}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopyText}
            leftIcon={copied ? <Check className="h-3.5 w-3.5 text-ready" /> : undefined}
            className="text-xs"
          >
            {copied ? "Másolva" : "Szöveg másolása"}
          </Button>

          {onShare && (
            <Button
              variant="primary"
              size="sm"
              onClick={onShare}
              leftIcon={<Share2 className="h-3.5 w-3.5" />}
              className="text-xs"
            >
              Megosztás
            </Button>
          )}
        </div>
      </div>

      {/* 4 CORE METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        <div className="p-3.5 rounded-16 bg-surface-elevated/70 border border-border-hairline text-center">
          <span className="text-[11px] text-text-tertiary block font-medium">Átlagos Regeneráció</span>
          <span className="text-20 font-mono font-bold text-ready mt-1 block">
            {summary.avgRecoveryScore}%
          </span>
          <span className="text-[10px] text-text-secondary capitalize">
            {summary.avgRecoveryBand === "green" ? "Kipihent" : summary.avgRecoveryBand === "amber" ? "Közepes" : "Fáradt"}
          </span>
        </div>

        <div className="p-3.5 rounded-16 bg-surface-elevated/70 border border-border-hairline text-center">
          <span className="text-[11px] text-text-tertiary block font-medium">Összes Terhelés</span>
          <span className="text-20 font-mono font-bold text-brand mt-1 block">
            {summary.totalStrain}
          </span>
          <span className="text-[10px] text-text-secondary">napi átlag: {summary.avgDailyStrain}</span>
        </div>

        <div className="p-3.5 rounded-16 bg-surface-elevated/70 border border-border-hairline text-center">
          <span className="text-[11px] text-text-tertiary block font-medium">Átlagos Alvás</span>
          <span className="text-20 font-mono font-bold text-indigo-400 mt-1 block">
            {summary.avgSleepDurationHours}h
          </span>
          <span className="text-[10px] text-text-secondary">értékelés: {summary.avgSleepScore}%</span>
        </div>

        <div className="p-3.5 rounded-16 bg-surface-elevated/70 border border-border-hairline text-center">
          <span className="text-[11px] text-text-tertiary block font-medium">Célsávban Töltve</span>
          <span className="text-20 font-mono font-bold text-text-primary mt-1 block">
            {summary.daysInTargetRange} / {summary.totalDaysEvaluated} nap
          </span>
          <span className="text-[10px] text-status-ready font-medium">
            {summary.targetRangeCompliancePercent}% sikerarány
          </span>
        </div>
      </div>

      {/* BEST AND HARDEST DAY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
        {summary.bestDay && (
          <div className="p-3 rounded-16 bg-surface-elevated border border-border-hairline flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-semibold text-text-tertiary block">
                Legjobb regenerációjú nap
              </span>
              <span className="font-bold text-text-primary">
                {summary.bestDay.dayNameHu} ({summary.bestDay.date})
              </span>
            </div>
            <span className="text-16 font-mono font-bold text-ready">
              {summary.bestDay.recoveryScore}%
            </span>
          </div>
        )}

        {summary.hardestDay && (
          <div className="p-3 rounded-16 bg-surface-elevated border border-border-hairline flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-semibold text-text-tertiary block">
                Legnagyobb terhelésű nap
              </span>
              <span className="font-bold text-text-primary">
                {summary.hardestDay.dayNameHu} ({summary.hardestDay.date})
              </span>
            </div>
            <span className="text-16 font-mono font-bold text-brand">
              {summary.hardestDay.strainScore} pont
            </span>
          </div>
        )}
      </div>

      {/* WEEKLY SYNTHESIS INSIGHT */}
      <div className="p-3.5 rounded-16 bg-surface-elevated/50 border border-border-hairline flex items-start gap-2.5 text-xs text-text-secondary leading-relaxed">
        <Sparkles className="h-4 w-4 text-brand shrink-0 mt-0.5" />
        <span>{summary.insightSentenceHu}</span>
      </div>
    </Card>
  );
};
