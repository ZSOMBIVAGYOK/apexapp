import React from "react";
import { Card, Button } from "@shared/ui";
import { Sparkles, Clock, Target, ShieldCheck, ChevronRight } from "lucide-react";
import { ScoreRing, ScoreRingType } from "./ScoreRing";
import { DailyScoresRecord } from "@shared/lib/scores";

export interface ThreeScoresHeroCardProps {
  scoresRecord: DailyScoresRecord;
  historicalRecords?: DailyScoresRecord[];
  onOpenDetail: (type: ScoreRingType) => void;
  onOpenCheckIn: () => void;
  className?: string;
}

export const ThreeScoresHeroCard: React.FC<ThreeScoresHeroCardProps> = ({
  scoresRecord,
  historicalRecords = [],
  onOpenDetail,
  onOpenCheckIn,
  className = ""
}) => {
  const { recovery, strain, sleep, rhythm, hasCheckIn } = scoresRecord;

  // Extract sparklines from last 7 days history
  const sparklineRecovery = historicalRecords.slice(-7).map((r) => r.recoveryScore);
  const sparklineStrain = historicalRecords.slice(-7).map((r) => r.strainScore);
  const sparklineSleep = historicalRecords.slice(-7).map((r) => r.sleepScore);

  // Sleep hours formatted (e.g. "7.2h / 8.0h")
  const actualSleepHours = (sleep.durationMinutes / 60).toFixed(1);
  const neededSleepHours = (sleep.needMinutes / 60).toFixed(1);
  const sleepSubtext = sleep.durationMinutes > 0 ? `${actualSleepHours}h / ${neededSleepHours}h` : "Nincs adat";

  // Target range string
  const targetSubtext = `${strain.targetRange.low}–${strain.targetRange.high} sáv`;

  return (
    <Card
      variant="surface"
      radius="28"
      className={`p-4 sm:p-6 border border-border-hairline space-y-5 ${className}`}
    >
      {/* Top Header / Mode indication */}
      <div className="flex items-center justify-between text-xs text-text-secondary border-b border-border-hairline pb-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-brand" />
          <span className="font-semibold text-text-primary tracking-tight">Napi Egyensúly</span>
          {strain.targetRange.source === "plan" && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand/10 text-brand font-medium">
              Terv alapú célsáv
            </span>
          )}
        </div>
        <span className="text-[11px] text-text-tertiary font-mono">
          Koppints a részletekért
        </span>
      </div>

      {/* THREE RINGS SIDE BY SIDE - Responsive 3-column layout */}
      <div className="grid grid-cols-3 gap-1 sm:gap-4 items-start">
        {/* 1. RECOVERY RING */}
        <ScoreRing
          type="recovery"
          score={recovery.score}
          band={recovery.band}
          isPending={!hasCheckIn}
          label="Regeneráció"
          statusLabel={recovery.statusLabelHu}
          subtext={hasCheckIn ? recovery.pathUsed === "biometric" ? "Biometrikus" : "Hibrid / Kézi" : "Reggeli check-in"}
          sparkline={sparklineRecovery}
          onClick={() => (hasCheckIn ? onOpenDetail("recovery") : onOpenCheckIn())}
        />

        {/* 2. STRAIN RING */}
        <ScoreRing
          type="strain"
          score={strain.score}
          targetRange={{ low: strain.targetRange.low, high: strain.targetRange.high }}
          label="Terhelés"
          statusLabel={strain.targetRange.statusLabelHu}
          subtext={targetSubtext}
          sparkline={sparklineStrain}
          onClick={() => onOpenDetail("strain")}
        />

        {/* 3. SLEEP RING */}
        <ScoreRing
          type="sleep"
          score={sleep.score}
          label="Alvás"
          statusLabel={sleep.statusLabelHu}
          subtext={sleepSubtext}
          sparkline={sparklineSleep}
          onClick={() => onOpenDetail("sleep")}
        />
      </div>

      {/* MAI FÓKUSZ & KÖVETKEZŐ LÉPÉS */}
      <div className="pt-3 border-t border-border-hairline space-y-3">
        {/* Focus Statement */}
        <div className="flex items-start gap-2.5 p-3 rounded-16 bg-surface-elevated/60 border border-border-hairline">
          <Sparkles className="h-4 w-4 text-brand shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-xs">
            <span className="font-semibold text-text-primary block">Mai fókusz</span>
            <p className="text-text-secondary leading-relaxed">
              {rhythm.focusSentenceHu}
            </p>
          </div>
        </div>

        {/* Soft warning if planned strain exceeds recovery recommendation */}
        {strain.targetRange.softWarningHu && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-12 bg-caution/10 border border-caution/20 text-xs text-caution">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span>{strain.targetRange.softWarningHu}</span>
          </div>
        )}

        {/* Next Step Bar */}
        <div className="flex items-center justify-between text-xs pt-1 px-1">
          <div className="flex items-center gap-2 text-text-secondary min-w-0">
            <Clock className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
            <span className="font-medium text-text-primary truncate">
              {rhythm.nextStepLineHu}
            </span>
          </div>

          {!hasCheckIn ? (
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenCheckIn}
              className="shrink-0 text-xs py-1.5 px-3 h-auto"
            >
              Check-in kitöltése
            </Button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenDetail("strain")}
              className="text-11 text-brand font-medium hover:underline shrink-0 flex items-center gap-1"
            >
              Részletek <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
};
