import React from "react";
import { BottomSheet, Badge } from "@shared/ui";
import {
  Activity,
  Bike,
  Waves,
  Dumbbell,
  Info,
  ShieldCheck
} from "lucide-react";
import { AthleteStrainScore } from "@shared/lib/scores";

export interface StrainDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  strain: AthleteStrainScore;
  historicalTrend?: Array<{ date: string; strain: number; targetLow?: number; targetHigh?: number }>;
  weeklyTotalStrain?: number;
  acwr?: number;
}

export const StrainDetailSheet: React.FC<StrainDetailSheetProps> = ({
  isOpen,
  onClose,
  strain,
  historicalTrend = [],
  weeklyTotalStrain = 0,
  acwr = 1.0
}) => {
  const getSportIcon = (sport: string) => {
    switch (sport.toLowerCase()) {
      case "cycling":
        return <Bike className="h-4 w-4 text-brand" />;
      case "swimming":
        return <Waves className="h-4 w-4 text-cyan-400" />;
      case "strength":
        return <Dumbbell className="h-4 w-4 text-amber-400" />;
      default:
        return <Activity className="h-4 w-4 text-brand" />;
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Terhelés Részletei"
      maxWidth="lg"
    >
      <div className="space-y-6 pb-6">
        {/* HERO STRAIN BANNER */}
        <div className="p-5 rounded-24 bg-brand/10 border border-brand/20 flex items-center justify-between">
          <div>
            <span className="text-11 font-semibold uppercase tracking-wider text-text-tertiary">
              Napi Terhelés (Strain)
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-40 font-mono font-bold tracking-tight text-text-primary tabular-nums">
                {strain.score}
              </span>
              <span className="text-16 font-semibold text-text-secondary">/ 100</span>
              <Badge variant="brand" size="md" className="ml-2">
                {strain.targetRange.statusLabelHu}
              </Badge>
            </div>
            <p className="text-12 text-text-secondary mt-1">
              Napi összesített terhelés: {strain.dailyLoadTotal} TSS/AU • {strain.targetRange.roomDescriptionHu}
            </p>
          </div>

          <div className="text-right">
            <span className="text-11 text-text-tertiary font-mono block">Célsáv</span>
            <span className="text-18 font-mono font-bold text-text-primary">
              {strain.targetRange.low} – {strain.targetRange.high}
            </span>
            <span className="text-[10px] text-text-secondary block mt-0.5">
              Forrás: {strain.targetRange.sourceLabelHu}
            </span>
          </div>
        </div>

        {/* REST DAY SUCCESS OR WARNING */}
        {strain.isRestDaySuccess && (
          <div className="p-3.5 rounded-16 bg-ready/10 border border-ready/20 text-xs text-status-ready flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>Sikeres pihenőnap a célsávban. A pihenés ma a fejlődés kulcsa.</span>
          </div>
        )}

        {strain.targetRange.softWarningHu && (
          <div className="p-3.5 rounded-16 bg-caution/10 border border-caution/20 text-xs text-status-caution flex items-center gap-2">
            <Info className="h-4 w-4 shrink-0" />
            <span>{strain.targetRange.softWarningHu}</span>
          </div>
        )}

        {/* CONTRIBUTING SESSIONS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-13 font-bold text-text-primary uppercase tracking-wider text-text-tertiary">
              Mai Edzések ({strain.contributingSessions.length})
            </h4>
            <span className="text-11 text-text-tertiary font-mono">
              Összesen {strain.contributingSessions.reduce((acc, s) => acc + s.durationMinutes, 0)} perc
            </span>
          </div>

          {strain.contributingSessions.length === 0 ? (
            <div className="p-4 rounded-16 bg-surface-elevated text-center text-xs text-text-tertiary">
              Még nincs rögzített edzés a mai napon.
            </div>
          ) : (
            <div className="space-y-2">
              {strain.contributingSessions.map((s, idx) => (
                <div
                  key={s.sessionId || idx}
                  className="p-3.5 rounded-16 bg-surface-elevated border border-border-hairline flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-10 bg-surface/80 shrink-0">
                      {getSportIcon(s.sport)}
                    </div>
                    <div className="truncate">
                      <span className="font-semibold text-text-primary block truncate">
                        {s.title}
                      </span>
                      <span className="text-11 text-text-tertiary">
                        {s.durationMinutes} perc • {s.load} TSS/AU
                        {s.isManual && " • Kézi RPE"}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-14 font-mono font-bold text-brand block">
                      +{s.strainContribution} pont
                    </span>
                    <span className="text-[10px] text-text-tertiary">hozzájárulás</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 14-DAY TREND WITH TARGET BANDS */}
        {historicalTrend.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-13 font-bold text-text-primary uppercase tracking-wider text-text-tertiary">
                14 Napos Terhelési Trend
              </h4>
              <span className="text-11 text-text-tertiary font-mono">
                Heti összeg: ~{weeklyTotalStrain} TSS
              </span>
            </div>
            <div className="p-4 rounded-20 bg-surface-elevated/50 border border-border-hairline">
              <div className="flex items-end gap-1.5 h-24 pt-4">
                {historicalTrend.slice(-14).map((item, idx) => {
                  const heightPct = Math.min(100, Math.max(10, item.strain));
                  const isToday = idx === historicalTrend.slice(-14).length - 1;
                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center gap-1 group relative"
                    >
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-t-sm transition-all ${
                          isToday ? "bg-cyan-400" : "bg-brand/80"
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

        {/* ACUTE:CHRONIC WORKLOAD RATIO (ACWR) SUMMARY */}
        <div className="p-4 rounded-16 bg-surface-elevated border border-border-hairline space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-text-primary">Akut:Krónikus Terhelési Arány (ACWR)</span>
            <span className="font-mono font-bold text-text-primary">{acwr.toFixed(2)}</span>
          </div>
          <p className="text-text-secondary leading-relaxed">
            {acwr > 1.5 ? (
              <span className="text-status-rest">
                Kiugró terhelési ugrás (&gt;1.5). Fokozott sérüléskockázat; a célzott regeneráció kötelező.
              </span>
            ) : acwr > 1.3 ? (
              <span className="text-status-caution">
                Gyors terhelésnövekedés (1.3–1.5). Az elkövetkező napokban az intenzitás stabilizálása javasolt.
              </span>
            ) : acwr >= 0.8 ? (
              <span className="text-status-ready">
                Optimális terhelési tartomány (0.8–1.3). Kiegyensúlyozott adaptációs stimuláció.
              </span>
            ) : (
              <span className="text-text-tertiary">
                Alacsony terhelési szint (&lt;0.8). Pihenő- vagy visszatérő fázis.
              </span>
            )}
          </p>
        </div>

        {/* HOGYAN SZÁMOLJUK INFO */}
        <div className="p-4 rounded-16 bg-surface-elevated/40 border border-border-hairline text-xs text-text-tertiary space-y-2">
          <div className="flex items-center gap-2 font-semibold text-text-secondary">
            <Info className="h-4 w-4 text-brand" />
            <span>Hogyan számoljuk a Terhelést (Strain)?</span>
          </div>
          <p className="leading-relaxed">
            A napi pulzusterhelést (TRIMP), watt-alapú TSS-t és az edzés-RPE értékeket egy egyéni kapacitási görbével
            alakítjuk át 0–100 közötti pontszámmá. A görbe figyelembe veszi a sportolói szintet és a krónikus edzettséget (CTL),
            így a pontszám hűen tükrözi a szervezet valós élettani igénybevételét.
          </p>
        </div>
      </div>
    </BottomSheet>
  );
};
