import React from "react";
import { BottomSheet, Button, Badge } from "@shared/ui";
import {
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Info
} from "lucide-react";
import { AthleteRecoveryScore } from "@shared/lib/scores";

export interface RecoveryDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  recovery: AthleteRecoveryScore;
  onNavigateToCheckIn: () => void;
  historicalTrend?: Array<{ date: string; score: number; hrv?: number; rhr?: number }>;
}

export const RecoveryDetailSheet: React.FC<RecoveryDetailSheetProps> = ({
  isOpen,
  onClose,
  recovery,
  onNavigateToCheckIn,
  historicalTrend = []
}) => {
  const isReady = recovery.band === "green";
  const isCaution = recovery.band === "amber";

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Regeneráció Részletei"
      maxWidth="lg"
    >
      <div className="space-y-6 pb-6">
        {/* HERO SCORE BANNER */}
        <div
          className={`p-5 rounded-24 border ${
            isReady
              ? "bg-ready/10 border-ready/20"
              : isCaution
              ? "bg-caution/10 border-caution/20"
              : "bg-rest/10 border-rest/20"
          } flex items-center justify-between`}
        >
          <div>
            <span className="text-11 font-semibold uppercase tracking-wider text-text-tertiary">
              Napi Kipihentség
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-40 font-mono font-bold tracking-tight text-text-primary tabular-nums">
                {recovery.score}
              </span>
              <span className="text-16 font-semibold text-text-secondary">/ 100</span>
              <Badge
                variant={isReady ? "ready" : isCaution ? "caution" : "rest"}
                size="md"
                className="ml-2"
              >
                {recovery.statusLabelHu}
              </Badge>
            </div>
            <p className="text-12 text-text-secondary mt-1">
              Megbízhatóság: {recovery.confidence}% • {recovery.pathUsed === "biometric" ? "Biometrikus út" : "Hibrid / Kézi út"}
            </p>
          </div>

          <div className="text-right">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onClose();
                onNavigateToCheckIn();
              }}
              className="text-xs"
            >
              Check-in megnyitása
            </Button>
          </div>
        </div>

        {/* SOFT PHYSIOLOGICAL MESSAGE */}
        <div className="p-4 rounded-16 bg-surface-elevated border border-border-hairline text-xs text-text-secondary leading-relaxed flex items-start gap-3">
          <Sparkles className="h-4 w-4 text-brand shrink-0 mt-0.5" />
          <span>{recovery.softMessageHu}</span>
        </div>

        {/* TOP PHYSIOLOGICAL DRIVERS */}
        <div className="space-y-3">
          <h4 className="text-13 font-bold text-text-primary uppercase tracking-wider text-text-tertiary">
            Fő Élettani Befolyásoló Tényezők (Top Drivers)
          </h4>

          {recovery.topDrivers.length === 0 ? (
            <p className="text-xs text-text-tertiary">Nincs rögzített kiugró tényező mára.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {recovery.topDrivers.map((driver) => {
                const isPositive = driver.impact === "positive";
                return (
                  <div
                    key={driver.id}
                    className="p-3 rounded-16 bg-surface-elevated/70 border border-border-hairline flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {isPositive ? (
                        <ArrowUpRight className="h-4 w-4 text-status-ready shrink-0" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-status-caution shrink-0" />
                      )}
                      <span className="text-text-primary font-medium truncate">
                        {driver.labelHu}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        isPositive ? "bg-ready/15 text-ready" : "bg-caution/15 text-caution"
                      }`}
                    >
                      {isPositive ? "Támogató" : "Mérséklő"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 14-DAY TREND */}
        {historicalTrend.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-13 font-bold text-text-primary uppercase tracking-wider text-text-tertiary">
              14 Napos Regenerációs Trend
            </h4>
            <div className="p-4 rounded-20 bg-surface-elevated/50 border border-border-hairline">
              <div className="flex items-end gap-1.5 h-24 pt-4">
                {historicalTrend.slice(-14).map((item, idx) => {
                  const heightPct = Math.min(100, Math.max(10, item.score));
                  const isGreen = item.score >= 67;
                  const isAmber = item.score >= 34 && item.score < 67;
                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center gap-1 group relative"
                    >
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-t-sm transition-all ${
                          isGreen ? "bg-status-ready/80" : isAmber ? "bg-status-caution/80" : "bg-status-rest/80"
                        } group-hover:opacity-100`}
                      />
                      <span className="text-[9px] text-text-tertiary font-mono">
                        {item.date.slice(8)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* MIT TEGYÉL MA AJÁNLÁS */}
        <div className="space-y-2">
          <h4 className="text-13 font-bold text-text-primary uppercase tracking-wider text-text-tertiary">
            Ajánlott Stratégia Mára
          </h4>
          <div className="space-y-2 text-xs">
            {isReady ? (
              <>
                <div className="p-3 rounded-12 bg-surface-elevated flex items-start gap-2 text-text-secondary">
                  <CheckCircle2 className="h-4 w-4 text-status-ready shrink-0 mt-0.5" />
                  <span>A mai nap ideális intenzív résztávokhoz, anaerob vagy erőfejlesztő edzésmunkához.</span>
                </div>
                <div className="p-3 rounded-12 bg-surface-elevated flex items-start gap-2 text-text-secondary">
                  <CheckCircle2 className="h-4 w-4 text-status-ready shrink-0 mt-0.5" />
                  <span>Figyelj az edzés előtti szénhidráttöltésre a csúcsteljesítmény fenntartásához.</span>
                </div>
              </>
            ) : isCaution ? (
              <>
                <div className="p-3 rounded-12 bg-surface-elevated flex items-start gap-2 text-text-secondary">
                  <CheckCircle2 className="h-4 w-4 text-status-caution shrink-0 mt-0.5" />
                  <span>Tartsd a pulzust a 2-es aerob zónában; kerüld a maximális savasodással járó sprinteket.</span>
                </div>
                <div className="p-3 rounded-12 bg-surface-elevated flex items-start gap-2 text-text-secondary">
                  <CheckCircle2 className="h-4 w-4 text-status-caution shrink-0 mt-0.5" />
                  <span>Edzés után fordíts 15 percet dinamikus nyújtásra és hengerezésre.</span>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 rounded-12 bg-surface-elevated flex items-start gap-2 text-text-secondary">
                  <CheckCircle2 className="h-4 w-4 text-status-rest shrink-0 mt-0.5" />
                  <span>Aktív pihenőnap: könnyű séta, mobilizáció vagy úszás könnyű tempóban.</span>
                </div>
                <div className="p-3 rounded-12 bg-surface-elevated flex items-start gap-2 text-text-secondary">
                  <CheckCircle2 className="h-4 w-4 text-status-rest shrink-0 mt-0.5" />
                  <span>Prioritás az esti korai alvás és a gyulladáscsökkentő minőségi étkezés.</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* HOGYAN SZÁMOLJUK INFO */}
        <div className="p-4 rounded-16 bg-surface-elevated/40 border border-border-hairline text-xs text-text-tertiary space-y-2">
          <div className="flex items-center gap-2 font-semibold text-text-secondary">
            <Info className="h-4 w-4 text-brand" />
            <span>Hogyan számoljuk a Regenerációt?</span>
          </div>
          <p className="leading-relaxed">
            A pontszám az éjszakai szívritmus-variabilitás (HRV rMSSD), a nyugalmi pulzus és a reggeli szubjektív kérdőív
            (izomláz, mentális fáradtság, alvásminőség) 28 napos egyéni bázisnormájához viszonyított súlyozott eredménye.
          </p>
          <p className="text-[11px] text-text-tertiary">
            Nem orvosi diagnózis. A sportteljesítmény és terhelhetőség megfigyelésére szolgál.
          </p>
        </div>
      </div>
    </BottomSheet>
  );
};
