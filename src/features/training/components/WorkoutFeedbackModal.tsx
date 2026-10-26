import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { PlannedWorkout } from "@shared/types/training";
import { BottomSheet, Button } from "@shared/ui";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  UserCheck,
  Sparkles
} from "lucide-react";

interface WorkoutFeedbackModalProps {
  workout: PlannedWorkout | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveFeedback: (
    workoutId: string,
    feedback: {
      status: "completed" | "modified" | "skipped";
      actualDurationMinutes?: number;
      actualRpe?: number;
      athleteComment?: string;
      skipReason?: string;
      modificationReason?: string;
    }
  ) => void;
}

export const WorkoutFeedbackModal: React.FC<WorkoutFeedbackModalProps> = ({
  workout,
  isOpen,
  onClose,
  onSaveFeedback
}) => {
  const { i18n } = useTranslation();
  const isHu = i18n.language.startsWith("hu");

  const [status, setStatus] = useState<"completed" | "modified" | "skipped">("completed");
  const [actualDuration, setActualDuration] = useState<number>(60);
  const [actualRpe, setActualRpe] = useState<number>(6);
  const [skipReason, setSkipReason] = useState<string>("fatigue");
  const [modificationReason, setModificationReason] = useState<string>("time");
  const [athleteComment, setAthleteComment] = useState<string>("");

  useEffect(() => {
    if (workout) {
      setStatus(
        workout.status === "completed" || workout.status === "modified" || workout.status === "skipped"
          ? workout.status
          : "completed"
      );
      setActualDuration(workout.actualDurationMinutes || workout.plannedDurationMinutes);
      setActualRpe(workout.actualRpe || 6);
      setSkipReason(workout.skipReason || "fatigue");
      setModificationReason(workout.modificationReason || "time");
      setAthleteComment(workout.athleteFeedbackComment || "");
    }
  }, [workout]);

  if (!workout) return null;

  const rpeDescriptionsHu: Record<number, string> = {
    1: "Nagyon könnyű (séta/laza mozgás)",
    2: "Könnyű (kényelmes beszélgetős iram)",
    3: "Mérsékelt (folyamatos, laza légzés)",
    4: "Kicsit nehéz (érezhető munka)",
    5: "Nehéz (ritmusos, mélyebb légzés)",
    6: "Erős (feszített, de tartható)",
    7: "Nagyon erős (küszöb közeli erőfeszítés)",
    8: "Kemény (csak rövid mondatokban beszéd)",
    9: "Nagyon kemény (közel a maximumhoz)",
    10: "Maximális kimerülés (mindent bele)"
  };

  const rpeDescriptionsEn: Record<number, string> = {
    1: "Very light (casual walking)",
    2: "Light (conversational pace)",
    3: "Moderate (steady easy breathing)",
    4: "Somewhat hard (felt work)",
    5: "Hard (rhythmic deep breathing)",
    6: "Solid (brisk sustainable tempo)",
    7: "Very hard (threshold pace)",
    8: "Demanding (few words spoken)",
    9: "Extremely hard (near maximum)",
    10: "Maximal exertion (all out)"
  };

  const skipReasonsHu = [
    { id: "fatigue", label: "Kimerültség / Magas fáradtság" },
    { id: "illness", label: "Betegség / Láz / Rosszullét" },
    { id: "injury", label: "Sérülésveszély / Izomfájdalom" },
    { id: "time", label: "Időhiány / Munkahelyi teendő" },
    { id: "weather", label: "Szélsőséges időjárás" },
    { id: "other", label: "Egyéb indok" }
  ];

  const skipReasonsEn = [
    { id: "fatigue", label: "Accumulated fatigue / Exhausion" },
    { id: "illness", label: "Illness / Fever / Unwell" },
    { id: "injury", label: "Injury risk / Pain" },
    { id: "time", label: "Lack of time / Work schedule" },
    { id: "weather", label: "Severe weather conditions" },
    { id: "other", label: "Other reason" }
  ];

  const modReasonsHu = [
    { id: "time", label: "Időhiány (rövidebbre vettem)" },
    { id: "fatigue", label: "Fáradtság miatt alacsonyabb intenzitás" },
    { id: "weather", label: "Időjárás miatt beltéri edzés" },
    { id: "sport", label: "Másik sportágra váltás" },
    { id: "other", label: "Egyéb módosítás" }
  ];

  const modReasonsEn = [
    { id: "time", label: "Lack of time (shortened session)" },
    { id: "fatigue", label: "Lower intensity due to fatigue" },
    { id: "weather", label: "Moved indoors due to weather" },
    { id: "sport", label: "Alternative cross-training sport" },
    { id: "other", label: "Other modification" }
  ];

  const handleSave = () => {
    onSaveFeedback(workout.id, {
      status,
      actualDurationMinutes: status !== "skipped" ? actualDuration : 0,
      actualRpe: status !== "skipped" ? actualRpe : undefined,
      athleteComment,
      skipReason: status === "skipped" ? skipReason : undefined,
      modificationReason: status === "modified" ? modificationReason : undefined
    });
    onClose();
  };

  const isCoachPlanned = workout.author.role === "coach";

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={isHu ? "Edzés visszajelzés és lezárás" : "Workout Feedback"}
    >
      <div className="space-y-5 text-sm p-2">
        {/* Workout Header Info */}
        <div className="bg-[#0B0C0F] p-4 rounded-2xl border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base">{workout.title}</h3>
            {isCoachPlanned ? (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                <UserCheck className="w-3 h-3" />
                {workout.author.name} {isHu ? "(Edző)" : "(Coach)"}
              </span>
            ) : workout.author.role === "solo_generator" ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-500/10 text-brand-300 border border-brand-500/30">
                <Sparkles className="w-3 h-3" />
                {isHu ? "Apex Solo Terv" : "Solo Plan"}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-4 text-xs text-text-secondary font-mono">
            <span>📅 {workout.date}</span>
            <span>⏱️ {workout.plannedDurationMinutes} {isHu ? "perc tervezve" : "min planned"}</span>
            <span>⚡ {workout.plannedLoad} TSS</span>
          </div>

          {workout.notes && (
            <p className="text-xs text-text-secondary border-t border-white/5 pt-2 italic">
              "{workout.notes}"
            </p>
          )}
        </div>

        {/* Status Segmented Selector */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
            {isHu ? "Edzés státusza" : "Workout Status"}
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setStatus("completed")}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                status === "completed"
                  ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-400 font-semibold"
                  : "bg-[#0B0C0F] border-white/5 text-text-secondary hover:text-white"
              }`}
            >
              <CheckCircle2 className="w-5 h-5 mb-1" />
              <span className="text-xs">{isHu ? "Teljesítve" : "Completed"}</span>
            </button>

            <button
              type="button"
              onClick={() => setStatus("modified")}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                status === "modified"
                  ? "bg-amber-500/15 border-amber-500/50 text-amber-400 font-semibold"
                  : "bg-[#0B0C0F] border-white/5 text-text-secondary hover:text-white"
              }`}
            >
              <AlertCircle className="w-5 h-5 mb-1" />
              <span className="text-xs">{isHu ? "Módosítva" : "Modified"}</span>
            </button>

            <button
              type="button"
              onClick={() => setStatus("skipped")}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                status === "skipped"
                  ? "bg-rose-500/15 border-rose-500/50 text-rose-400 font-semibold"
                  : "bg-[#0B0C0F] border-white/5 text-text-secondary hover:text-white"
              }`}
            >
              <XCircle className="w-5 h-5 mb-1" />
              <span className="text-xs">{isHu ? "Kihagyva" : "Skipped"}</span>
            </button>
          </div>
        </div>

        {/* Completed / Modified inputs */}
        {status !== "skipped" ? (
          <>
            {/* Duration */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                {isHu ? "Valós időtartam (perc)" : "Actual Duration (min)"}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="5"
                  max="480"
                  step="5"
                  value={actualDuration}
                  onChange={(e) => setActualDuration(parseInt(e.target.value, 10) || 0)}
                  className="w-32 bg-[#0B0C0F] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-center text-lg focus:border-brand-500 focus:outline-none"
                />
                <span className="text-xs text-text-secondary">
                  {isHu ? "Tervezett:" : "Planned:"}{" "}
                  <strong className="text-white">{workout.plannedDurationMinutes} perc</strong>
                </span>
              </div>
            </div>

            {/* Borg CR10 RPE Slider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  {isHu ? "Érzékelt erőfeszítés (RPE 1-10)" : "Perceived Exertion (RPE 1-10)"}
                </label>
                <span className="font-mono font-bold text-brand-400 text-sm">
                  {actualRpe} / 10
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={actualRpe}
                onChange={(e) => setActualRpe(parseInt(e.target.value, 10))}
                className="w-full accent-brand-500 cursor-pointer"
              />
              <div className="text-xs text-text-secondary mt-1 bg-[#0B0C0F] p-2 rounded-xl border border-white/5">
                {isHu ? rpeDescriptionsHu[actualRpe] : rpeDescriptionsEn[actualRpe]}
              </div>
            </div>

            {/* Modification reason if modified */}
            {status === "modified" && (
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  {isHu ? "Módosítás oka" : "Modification Reason"}
                </label>
                <select
                  value={modificationReason}
                  onChange={(e) => setModificationReason(e.target.value)}
                  className="w-full bg-[#0B0C0F] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 focus:outline-none"
                >
                  {(isHu ? modReasonsHu : modReasonsEn).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        ) : (
          /* Skipped Reason Selector */
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              {isHu ? "Kihagyás oka" : "Skip Reason"}
            </label>
            <select
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              className="w-full bg-[#0B0C0F] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs focus:border-brand-500 focus:outline-none"
            >
              {(isHu ? skipReasonsHu : skipReasonsEn).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Comment field for athlete / coach communication */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
            {isHu ? "Megjegyzés / Visszajelzés" : "Notes / Feedback"}
          </label>
          <textarea
            rows={3}
            value={athleteComment}
            onChange={(e) => setAthleteComment(e.target.value)}
            placeholder={
              isHu
                ? "Hogyan érezted magad? Izomláz, pulzus, időjárási körülmények..."
                : "How did it feel? Soreness, fatigue, weather conditions..."
            }
            className="w-full bg-[#0B0C0F] border border-white/10 rounded-xl p-3 text-white text-xs placeholder:text-text-secondary/50 focus:border-brand-500 focus:outline-none resize-none"
          />
        </div>

        {/* Save button */}
        <div className="pt-2">
          <Button variant="primary" onClick={handleSave} className="w-full">
            {isHu ? "Visszajelzés mentése" : "Save Feedback"}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};
