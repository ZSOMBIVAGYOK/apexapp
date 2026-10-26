import React, { useState } from "react";
import { BottomSheet, Button, Avatar, Badge, showToast } from "@shared/ui";
import { CoachAthleteRosterItem } from "@shared/types/coach";
import { ChevronLeft, ChevronRight, CheckCircle2, TrendingUp, AlertTriangle } from "lucide-react";

export interface WeeklyReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  athletes: CoachAthleteRosterItem[];
  onReviewSaved?: (athleteId: string, notes: string) => void;
}

export const WeeklyReviewModal: React.FC<WeeklyReviewModalProps> = ({
  isOpen,
  onClose,
  athletes,
  onReviewSaved
}) => {
  const activeAthletes = athletes.filter((a) => a.status === "active");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [notes, setNotes] = useState<Record<string, string>>({});

  if (activeAthletes.length === 0) return null;

  const currentAthlete = activeAthletes[currentIndex]!;
  const currentNote = notes[currentAthlete.athleteId] || "";

  const handleNext = () => {
    onReviewSaved?.(currentAthlete.athleteId, currentNote);
    if (currentIndex < activeAthletes.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      showToast({
        title: "Heti áttekintés befejezve",
        message: "Minden aktív sportoló heti felülvizsgálata sikeresen lezárult.",
        type: "success"
      });
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Heti Edzői Áttekintés (Review Mode)"
      description={`Sportoló ${currentIndex + 1} / ${activeAthletes.length}`}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            leftIcon={<ChevronLeft className="h-4 w-4" />}
          >
            Előző
          </Button>

          <div className="flex items-center gap-1.5">
            {activeAthletes.map((_, idx) => (
              <span
                key={idx}
                className={`h-2 rounded-full transition-all ${
                  idx === currentIndex
                    ? "w-6 bg-brand"
                    : idx < currentIndex
                    ? "w-2 bg-ready"
                    : "w-2 bg-surface-elevated border border-border-hairline"
                }`}
              />
            ))}
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleNext}
            rightIcon={
              currentIndex === activeAthletes.length - 1 ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )
            }
          >
            {currentIndex === activeAthletes.length - 1 ? "Befejezés" : "Jóváhagyás & Tovább"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        {/* Athlete Header */}
        <div className="flex items-center justify-between p-4 rounded-16 bg-surface-elevated border border-border-hairline">
          <div className="flex items-center gap-3">
            <Avatar name={currentAthlete.displayName} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-16 font-bold text-text-primary">{currentAthlete.displayName}</h3>
                <span className="text-11 px-2 py-0.5 rounded-full bg-brand/10 text-brand font-medium">
                  {currentAthlete.group || currentAthlete.sport}
                </span>
              </div>
              <p className="text-12 text-text-secondary mt-0.5">
                Utolsó check-in: {currentAthlete.lastCheckInTime || "Nem elérhető"}
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="flex items-center justify-end gap-1.5">
              <span
                className={`h-3 w-3 rounded-full ${
                  currentAthlete.readinessZone === "ready"
                    ? "bg-ready"
                    : currentAthlete.readinessZone === "caution"
                    ? "bg-caution"
                    : "bg-rest"
                }`}
              />
              <span className="text-18 font-mono font-bold text-text-primary">
                {currentAthlete.readinessScore ?? "--"}
              </span>
            </div>
            <p className="text-10 text-text-tertiary">Readiness Score</p>
          </div>
        </div>

        {/* Key Weekly Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-12 bg-surface border border-border-hairline text-center">
            <p className="text-11 text-text-secondary">Megfelelés</p>
            <p className="text-18 font-mono font-bold text-text-primary mt-1">
              {currentAthlete.weeklyCompliancePercent}%
            </p>
            <Badge
              variant={currentAthlete.weeklyCompliancePercent >= 80 ? "ready" : "caution"}
              size="sm"
              className="mt-1"
            >
              {currentAthlete.weeklyCompliancePercent >= 80 ? "Célsávban" : "Figyelmet kér"}
            </Badge>
          </div>

          <div className="p-3 rounded-12 bg-surface border border-border-hairline text-center">
            <p className="text-11 text-text-secondary">Forma (TSB)</p>
            <p className="text-18 font-mono font-bold text-text-primary mt-1">
              {currentAthlete.formTsb > 0 ? `+${currentAthlete.formTsb}` : currentAthlete.formTsb}
            </p>
            <span className="text-11 text-text-tertiary capitalize mt-1 block">
              {currentAthlete.formStatus}
            </span>
          </div>

          <div className="p-3 rounded-12 bg-surface border border-border-hairline text-center">
            <p className="text-11 text-text-secondary">7-napos terhelés</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <TrendingUp
                className={`h-4 w-4 ${
                  currentAthlete.sevenDayLoadTrend === "increasing"
                    ? "text-brand rotate-0"
                    : currentAthlete.sevenDayLoadTrend === "decreasing"
                    ? "text-caution rotate-90"
                    : "text-text-secondary rotate-45"
                }`}
              />
              <span className="text-14 font-semibold capitalize text-text-primary">
                {currentAthlete.sevenDayLoadTrend === "increasing"
                  ? "Emelkedő"
                  : currentAthlete.sevenDayLoadTrend === "decreasing"
                  ? "Csökkenő"
                  : "Stabil"}
              </span>
            </div>
            <span className="text-10 text-text-tertiary mt-1 block">TSS / EWMA</span>
          </div>

          <div className="p-3 rounded-12 bg-surface border border-border-hairline text-center">
            <p className="text-11 text-text-secondary">Nyitott riasztások</p>
            <p className="text-18 font-mono font-bold text-text-primary mt-1">
              {currentAthlete.openAlertsCount}
            </p>
            <Badge
              variant={currentAthlete.openAlertsCount === 0 ? "neutral" : "rest"}
              size="sm"
              className="mt-1"
            >
              {currentAthlete.openAlertsCount === 0 ? "Nincs riasztás" : "Aktív figyelem"}
            </Badge>
          </div>
        </div>

        {/* Active Alerts for this Athlete */}
        {currentAthlete.alerts.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-12 font-semibold text-text-primary flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-rest" />
              Aktív riasztások
            </p>
            {currentAthlete.alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-2.5 rounded-10 bg-rest/10 border border-rest/20 text-12 text-rest"
              >
                <p className="font-semibold">{alert.title}</p>
                <p className="text-11 opacity-90 mt-0.5">{alert.message}</p>
              </div>
            ))}
          </div>
        )}

        {/* Coach Weekly Review Notes Field */}
        <div className="space-y-1.5 pt-1">
          <label className="text-12 font-medium text-text-secondary">
            Edzői összefoglaló feljegyzés ehhez a héthez
          </label>
          <textarea
            rows={3}
            value={currentNote}
            onChange={(e) =>
              setNotes({ ...notes, [currentAthlete.athleteId]: e.target.value })
            }
            placeholder={`pl. ${currentAthlete.displayName} jó formában zárta a hetet, a jövő heti résztávok intenzitása emelhető...`}
            className="w-full rounded-12 border border-border-hairline bg-bg-surface p-3 text-13 text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
          />
        </div>
      </div>
    </BottomSheet>
  );
};
