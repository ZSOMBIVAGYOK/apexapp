import React, { useState, useEffect } from "react";
import { BottomSheet, Button, Input, NumberInput, showToast } from "@shared/ui";
import { EquipmentItem, MaintenanceTask } from "@shared/types/equipment";
import { CompletedSessionDocument } from "@shared/types/dataModel";
import { logMaintenanceAction } from "@shared/lib/equipment";
import { format } from "date-fns";
import { Wrench, CheckCircle2 } from "lucide-react";

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  athleteId: string;
  equipment: EquipmentItem | null;
  task: MaintenanceTask | null;
  allSessions: CompletedSessionDocument[];
  onLogged?: () => void;
}

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
  isOpen,
  onClose,
  athleteId,
  equipment,
  task,
  allSessions,
  onLogged
}) => {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [costAmount, setCostAmount] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [performedBy, setPerformedBy] = useState("Saját magam");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDate(format(new Date(), "yyyy-MM-dd"));
    setCostAmount(undefined);
    setNotes("");
    setPerformedBy("Saját magam");
  }, [isOpen]);

  if (!equipment || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await logMaintenanceAction(
        athleteId,
        equipment.id,
        task.id,
        {
          date,
          costAmount,
          costCurrency: "HUF",
          notes: notes.trim() || undefined,
          performedBy: performedBy.trim() || undefined
        },
        allSessions
      );

      showToast({
        title: "Karbantartás rögzítve!",
        message: `${task.name} elvégezve. A számláló nullázódott.`,
        variant: "success"
      });

      onLogged?.();
      onClose();
    } catch {
      showToast({ title: "Hiba rögzítéskor", variant: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Karbantartás elvégzése">
      <form onSubmit={handleSubmit} className="space-y-4 pb-6">
        <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-3.5 border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">
            <Wrench className="w-4 h-4 text-brand-primary" />
            {equipment.name}
          </div>
          <div className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            {task.name}
          </div>
          <div className="text-xs text-neutral-500 mt-0.5">
            Intervallum: {task.intervalValue} {task.mode === "distance" ? "km" : "nap"}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-neutral-500 block mb-1">
            Elvégzés dátuma
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-transparent px-3 py-2 text-neutral-900 dark:text-neutral-100"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-neutral-500 block mb-1">
              Költség (opcionális HUF)
            </label>
            <NumberInput
              value={costAmount ?? 0}
              onChange={(val) => setCostAmount(val ?? undefined)}
              min={0}
              step={500}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-500 block mb-1">
              Ki végezte el?
            </label>
            <Input
              placeholder="Pl. Szerviz, Saját magam"
              value={performedBy}
              onChange={(e) => setPerformedBy(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-neutral-500 block mb-1">
            Megjegyzés / Alkatrész adatok
          </label>
          <Input
            placeholder="Pl. Shimano HG-701 lánc, féktárcsa zsírtalanítva"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Mégse
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1 flex items-center justify-center gap-1.5"
            disabled={isSaving}
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSaving ? "Mentés..." : "Elvégezve & Nullázás"}
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
};
