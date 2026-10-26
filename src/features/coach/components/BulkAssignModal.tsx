import React, { useState } from "react";
import { BottomSheet, Button, Input, NumberInput, Select, showToast } from "@shared/ui";
import { Users, Check } from "lucide-react";
import type { CoachAthleteRosterItem } from "@shared/types";

export interface BulkAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  athletes: CoachAthleteRosterItem[];
  onAssignCompleted?: (count: number) => void;
}

export const BulkAssignModal: React.FC<BulkAssignModalProps> = ({
  isOpen,
  onClose,
  athletes,
  onAssignCompleted
}) => {
  const [targetType, setTargetType] = useState<"group" | "selected">("group");
  const [selectedGroup, setSelectedGroup] = useState<string>("Felnőtt Válogatott");
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>(
    athletes.map((a) => a.athleteId)
  );

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]!);
  const [sport, setSport] = useState("running");
  const [title, setTitle] = useState("Közös csapat-küszöbedzés");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [rpeTarget, setRpeTarget] = useState(7);
  const [description, setDescription] = useState("Bemelegítés 15p, majd 5x1000m küszöb (RPE 7-8), 2p aktív pihenővel, levezetés 15p.");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableGroups = Array.from(
    new Set(athletes.map((a) => a.group).filter(Boolean) as string[])
  );

  const targetAthletes =
    targetType === "group"
      ? athletes.filter((a) => a.group === selectedGroup && a.status === "active")
      : athletes.filter((a) => selectedAthleteIds.includes(a.athleteId) && a.status === "active");

  const toggleAthleteSelection = (id: string) => {
    setSelectedAthleteIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAssign = () => {
    if (targetAthletes.length === 0) {
      showToast({
        title: "Nincs kiválasztott sportoló",
        message: "Válassz legalább egy aktív sportolót a hozzárendeléshez.",
        type: "warning"
      });
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onAssignCompleted?.(targetAthletes.length);
      showToast({
        title: "Edzés sikeresen kiosztva",
        message: `${targetAthletes.length} sportoló edzéstervébe került beillesztésre (${title}).`,
        type: "success"
      });
      onClose();
    }, 500);
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Tömeges edzés hozzárendelés"
      description="Írj ki edzést egy teljes csoportnak vagy több kiválasztott sportolónak egyszerre."
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-12 text-text-secondary">
            Címzettek: <strong>{targetAthletes.length} sportoló</strong>
          </span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
              Mégse
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAssign}
              isLoading={isSubmitting}
              leftIcon={<Check className="h-4 w-4" />}
            >
              Hozzárendelés mindenkinek
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        {/* Target Selector */}
        <div className="space-y-1.5">
          <label className="text-12 font-medium text-text-secondary">Célcsoport kiválasztása</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTargetType("group")}
              className={`p-2.5 rounded-12 text-13 font-medium border text-left flex items-center gap-2 transition-all ${
                targetType === "group"
                  ? "bg-brand/10 border-brand text-brand font-semibold"
                  : "bg-surface-elevated/40 border-border-hairline text-text-secondary"
              }`}
            >
              <Users className="h-4 w-4 shrink-0" />
              Csoport szerint
            </button>
            <button
              type="button"
              onClick={() => setTargetType("selected")}
              className={`p-2.5 rounded-12 text-13 font-medium border text-left flex items-center gap-2 transition-all ${
                targetType === "selected"
                  ? "bg-brand/10 border-brand text-brand font-semibold"
                  : "bg-surface-elevated/40 border-border-hairline text-text-secondary"
              }`}
            >
              <Check className="h-4 w-4 shrink-0" />
              Egyéni kijelölés
            </button>
          </div>
        </div>

        {targetType === "group" ? (
          <Select
            label="Válassz csoportot"
            value={selectedGroup}
            onChange={(val) => setSelectedGroup(val)}
            options={availableGroups.map((g) => ({
              value: g,
              label: `${g} (${athletes.filter((a) => a.group === g).length} fő)`
            }))}
          />
        ) : (
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {athletes
              .filter((a) => a.status === "active")
              .map((ath) => (
                <label
                  key={ath.athleteId}
                  className="flex items-center justify-between p-2 rounded-10 bg-surface-elevated/50 border border-border-hairline text-13 cursor-pointer hover:bg-surface-elevated"
                >
                  <span className="font-medium text-text-primary">{ath.displayName}</span>
                  <input
                    type="checkbox"
                    checked={selectedAthleteIds.includes(ath.athleteId)}
                    onChange={() => toggleAthleteSelection(ath.athleteId)}
                    className="rounded text-brand focus:ring-brand/30"
                  />
                </label>
              ))}
          </div>
        )}

        {/* Workout Details Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border-hairline">
          <Input
            label="Edzés dátuma"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          <Select
            label="Sportág"
            value={sport}
            onChange={(val) => setSport(val)}
            options={[
              { value: "running", label: "Futás" },
              { value: "cycling", label: "Kerékpár" },
              { value: "swimming", label: "Úszás" },
              { value: "strength", label: "Erőnlét / Kondi" },
              { value: "triathlon", label: "Triatlon" }
            ]}
          />
        </div>

        <Input
          label="Edzés megnevezése"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="pl. 5x1000m küszöb intervallumok"
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <NumberInput
            label="Tervezett időtartam (perc)"
            value={durationMinutes}
            onChange={(val) => setDurationMinutes(val || 60)}
            min={10}
            max={360}
            step={5}
          />

          <NumberInput
            label="Cél RPE (1-10)"
            value={rpeTarget}
            onChange={(val) => setRpeTarget(val || 7)}
            min={1}
            max={10}
            step={1}
          />
        </div>

        <div className="space-y-1">
          <label className="text-12 font-medium text-text-secondary">Edzésleírás és instrukciók</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-12 border border-border-hairline bg-bg-surface p-3 text-13 text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
          />
        </div>
      </div>
    </BottomSheet>
  );
};
