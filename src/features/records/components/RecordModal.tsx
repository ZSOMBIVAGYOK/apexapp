import React, { useState, useEffect } from "react";
import { BottomSheet, Button, Input, NumberInput, Chip, showToast } from "@shared/ui";
import { AthleteRecord, RecordMetricType } from "@shared/types/records";
import { formatRecordDisplay, saveRecord } from "@shared/lib/records";
import { SPORT_CATALOG } from "@shared/lib/sports/catalog";
import { format } from "date-fns";
import { Trophy } from "lucide-react";

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  athleteId: string;
  recordToEdit?: AthleteRecord | null;
  onSaved?: (record: AthleteRecord) => void;
}

const METRIC_TYPES: Array<{ id: RecordMetricType; labelHu: string; placeholder: string; unit: string }> = [
  { id: "time_for_distance", labelHu: "Idő adott távra", placeholder: "pl. 1182 (mp) = 19:42", unit: "másodperc" },
  { id: "distance_in_time", labelHu: "Távolság adott idő alatt", placeholder: "pl. 3250 (méter)", unit: "méter" },
  { id: "weight_reps_1rm", labelHu: "Súly / 1RM", placeholder: "pl. 145 (kg)", unit: "kg" },
  { id: "max_reps", labelHu: "Ismétlésszám", placeholder: "pl. 28 (db)", unit: "db" },
  { id: "max_duration", labelHu: "Időtartam", placeholder: "pl. 270 (mp) = 4:30", unit: "másodperc" },
  { id: "points", labelHu: "Pontszám", placeholder: "pl. 850", unit: "pont" },
  { id: "custom", labelHu: "Egyedi érték", placeholder: "pl. 42", unit: "egység" }
];

export const RecordModal: React.FC<RecordModalProps> = ({
  isOpen,
  onClose,
  athleteId,
  recordToEdit,
  onSaved
}) => {
  const [sportId, setSportId] = useState("running");
  const [discipline, setDiscipline] = useState("");
  const [recordType, setRecordType] = useState<RecordMetricType>("time_for_distance");
  const [value, setValue] = useState<number>(0);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [venue, setVenue] = useState("");
  const [weather, setWeather] = useState("");
  const [surface, setSurface] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (recordToEdit) {
      setSportId(recordToEdit.sportId);
      setDiscipline(recordToEdit.discipline);
      setRecordType(recordToEdit.recordType);
      setValue(recordToEdit.value);
      setDate(recordToEdit.date);
      setVenue(recordToEdit.venue || "");
      setWeather(recordToEdit.conditions?.weather || "");
      setSurface(recordToEdit.conditions?.surface || "");
      setNotes(recordToEdit.notes || "");
    } else {
      setSportId("running");
      setDiscipline("5 km");
      setRecordType("time_for_distance");
      setValue(1200); // 20:00
      setDate(format(new Date(), "yyyy-MM-dd"));
      setVenue("");
      setWeather("");
      setSurface("");
      setNotes("");
    }
  }, [isOpen, recordToEdit]);

  const selectedSport = SPORT_CATALOG.find((s) => s.id === sportId);
  const sportName = selectedSport ? selectedSport.nameHu : "Futás";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discipline.trim()) {
      showToast({ title: "Hiányzó versenyszám", message: "Kérlek add meg a versenyszámot (pl. 5 km, 100m, 1RM)!", variant: "warning" });
      return;
    }
    if (value <= 0) {
      showToast({ title: "Érvénytelen érték", message: "Kérlek pozitív értéket adj meg!", variant: "warning" });
      return;
    }

    setIsSaving(true);
    try {
      const displayVal = formatRecordDisplay(recordType, value);
      const saved = await saveRecord(athleteId, {
        id: recordToEdit ? recordToEdit.id : undefined,
        sportId,
        sportName,
        discipline: discipline.trim(),
        recordType,
        value,
        displayValue: displayVal,
        date,
        venue: venue.trim() || undefined,
        conditions: weather || surface ? { weather: weather.trim() || undefined, surface: surface.trim() || undefined } : undefined,
        notes: notes.trim() || undefined,
        isCurrentBest: true
      });

      showToast({
        title: recordToEdit ? "Rekord frissítve" : "Új rekord rögzítve!",
        message: `${discipline}: ${displayVal}`,
        variant: "success"
      });

      onSaved?.(saved);
      onClose();
    } catch {
      showToast({ title: "Hiba rekord mentésekor", variant: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const previewDisplay = formatRecordDisplay(recordType, value);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={recordToEdit ? "Rekord szerkesztése" : "Új egyéni rekord rögzítése"}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pb-6">
        {/* Sport selection */}
        <div>
          <label className="text-xs font-semibold text-neutral-500 block mb-1">Sportág</label>
          <select
            value={sportId}
            onChange={(e) => setSportId(e.target.value)}
            className="w-full text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-neutral-900 dark:text-neutral-100"
          >
            {SPORT_CATALOG.slice(0, 25).map((s) => (
              <option key={s.id} value={s.id}>
                {s.nameHu}
              </option>
            ))}
          </select>
        </div>

        {/* Discipline / Versenyszám */}
        <div>
          <label className="text-xs font-semibold text-neutral-500 block mb-1">
            Versenyszám / Gyakorlat
          </label>
          <Input
            placeholder="Pl. 5 km, Félmaraton, 1RM Guggolás, 400m vegyes"
            value={discipline}
            onChange={(e) => setDiscipline(e.target.value)}
            required
          />
        </div>

        {/* Metric type */}
        <div>
          <label className="text-xs font-semibold text-neutral-500 block mb-1">
            Mértékegység jellege
          </label>
          <div className="flex flex-wrap gap-1.5">
            {METRIC_TYPES.map((m) => (
              <Chip
                key={m.id}
                selected={recordType === m.id}
                onClick={() => setRecordType(m.id)}
                size="sm"
              >
                {m.labelHu}
              </Chip>
            ))}
          </div>
        </div>

        {/* Value and Preview */}
        <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
              Nyers érték ({METRIC_TYPES.find((m) => m.id === recordType)?.unit})
            </label>
            <div className="text-sm font-bold text-brand-primary flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              Kijelzés: {previewDisplay}
            </div>
          </div>
          <NumberInput
            value={value}
            onChange={(val) => setValue(val || 0)}
            min={0}
            step={recordType === "weight_reps_1rm" ? 0.5 : 1}
          />
          <p className="text-[11px] text-neutral-400">
            {METRIC_TYPES.find((m) => m.id === recordType)?.placeholder}
          </p>
        </div>

        {/* Date */}
        <div>
          <label className="text-xs font-semibold text-neutral-500 block mb-1">Dátum</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-transparent px-3 py-2 text-neutral-900 dark:text-neutral-100"
            required
          />
        </div>

        {/* Venue & Conditions */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-neutral-500 block mb-1">Helyszín / Verseny</label>
            <Input
              placeholder="Pl. Margitsziget"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-neutral-500 block mb-1">Felszín / Körülmények</label>
            <Input
              placeholder="Pl. Aszfalt, 18°C szélcsend"
              value={surface}
              onChange={(e) => setSurface(e.target.value)}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs text-neutral-500 block mb-1">Megjegyzés</label>
          <Input
            placeholder="Pl. Erős utolsó 1000m hajrá"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Mégse
          </Button>
          <Button type="submit" variant="primary" className="flex-1" disabled={isSaving}>
            {isSaving ? "Mentés..." : recordToEdit ? "Frissítés" : "Rekord mentése"}
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
};
