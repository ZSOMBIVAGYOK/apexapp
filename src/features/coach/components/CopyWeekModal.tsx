import React, { useState } from "react";
import { BottomSheet, Button, Select, Input, showToast } from "@shared/ui";
import { CoachAthleteRosterItem } from "@shared/types/coach";
import { ArrowRight, Check } from "lucide-react";

export interface CopyWeekModalProps {
  isOpen: boolean;
  onClose: () => void;
  athletes: CoachAthleteRosterItem[];
  currentAthleteId?: string;
}

export const CopyWeekModal: React.FC<CopyWeekModalProps> = ({
  isOpen,
  onClose,
  athletes,
  currentAthleteId
}) => {
  const activeAthletes = athletes.filter((a) => a.status === "active");

  const [sourceAthleteId, setSourceAthleteId] = useState<string>(
    currentAthleteId || activeAthletes[0]?.athleteId || ""
  );
  const [sourceWeekStart, setSourceWeekStart] = useState("2026-10-26");
  const [targetAthleteIds, setTargetAthleteIds] = useState<string[]>([]);
  const [targetWeekStart, setTargetWeekStart] = useState("2026-11-02");
  const [isCopying, setIsCopying] = useState(false);

  const toggleTargetAthlete = (id: string) => {
    setTargetAthleteIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCopy = () => {
    if (targetAthleteIds.length === 0) {
      showToast({
        title: "Nincs cél-sportoló kiválasztva",
        message: "Válassz legalább egy sportolót, akihez a hetet másolni szeretnéd.",
        type: "warning"
      });
      return;
    }

    setIsCopying(true);
    setTimeout(() => {
      setIsCopying(false);
      showToast({
        title: "Hét sikeresen átmásolva",
        message: `Az edzéshét átmásolva ${targetAthleteIds.length} sportoló naptárába a ${targetWeekStart} kezdődő hétre.`,
        type: "success"
      });
      onClose();
    }, 600);
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Edzéshét másolása sportolók között"
      description="Egy sportoló meglévő heti edzéstervét egy az egyben átmásolhatod más sportolókhoz vagy későbbi hetekre."
      maxWidth="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-12 text-text-secondary">
            Cél: <strong>{targetAthleteIds.length} sportoló</strong>
          </span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={isCopying}>
              Mégse
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCopy}
              isLoading={isCopying}
              leftIcon={<Check className="h-4 w-4" />}
            >
              Hét másolása
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        {/* Source Section */}
        <div className="p-3.5 rounded-14 bg-surface-elevated border border-border-hairline space-y-3">
          <h4 className="text-12 font-semibold uppercase tracking-wider text-brand">Forrás hét</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Forrás sportoló"
              value={sourceAthleteId}
              onChange={(val) => setSourceAthleteId(val)}
              options={activeAthletes.map((a) => ({
                value: a.athleteId,
                label: a.displayName
              }))}
            />
            <Input
              type="date"
              label="Hét kezdőnapja (hétfő)"
              value={sourceWeekStart}
              onChange={(e) => setSourceWeekStart(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-center -my-2 text-text-tertiary">
          <ArrowRight className="h-5 w-5 rotate-90 sm:rotate-0" />
        </div>

        {/* Target Section */}
        <div className="p-3.5 rounded-14 bg-surface-elevated border border-border-hairline space-y-3">
          <h4 className="text-12 font-semibold uppercase tracking-wider text-text-primary">Cél hét és sportolók</h4>
          <Input
            type="date"
            label="Cél hét kezdőnapja (hétfő)"
            value={targetWeekStart}
            onChange={(e) => setTargetWeekStart(e.target.value)}
          />

          <div className="space-y-1">
            <label className="text-12 font-medium text-text-secondary">Cél sportolók kijelölése</label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {activeAthletes
                .filter((a) => a.athleteId !== sourceAthleteId)
                .map((ath) => (
                  <label
                    key={ath.athleteId}
                    className="flex items-center justify-between p-2 rounded-10 bg-surface/60 border border-border-hairline text-12 cursor-pointer hover:bg-surface"
                  >
                    <span>{ath.displayName} ({ath.sport})</span>
                    <input
                      type="checkbox"
                      checked={targetAthleteIds.includes(ath.athleteId)}
                      onChange={() => toggleTargetAthlete(ath.athleteId)}
                      className="rounded text-brand"
                    />
                  </label>
                ))}
            </div>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
};
