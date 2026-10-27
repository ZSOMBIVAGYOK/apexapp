import React from "react";
import { BottomSheet, Button, showToast } from "@shared/ui";
import { RecordBeatPrompt } from "@shared/types/records";
import { saveRecord } from "@shared/lib/records";
import { Trophy, ArrowRight, Sparkles } from "lucide-react";

interface RecordBeatPromptModalProps {
  prompt: RecordBeatPrompt | null;
  athleteId: string;
  onClose: () => void;
  onSaved?: () => void;
}

export const RecordBeatPromptModal: React.FC<RecordBeatPromptModalProps> = ({
  prompt,
  athleteId,
  onClose,
  onSaved
}) => {
  if (!prompt) return null;

  const handleConfirmSave = async () => {
    try {
      await saveRecord(athleteId, {
        sportId: prompt.sportId,
        sportName: prompt.sportId,
        discipline: prompt.discipline,
        recordType: prompt.recordType,
        value: prompt.newValue,
        displayValue: prompt.newDisplayValue,
        date: prompt.date,
        sessionId: prompt.sessionId,
        isCurrentBest: true,
        notes: `Automatikusan észlelt csúcs a(z) "${prompt.sessionTitle}" edzésből.`
      });

      showToast({
        title: "Egyéni rekord elmentve! 🏆",
        message: `${prompt.discipline}: ${prompt.newDisplayValue}`,
        variant: "success"
      });

      onSaved?.();
      onClose();
    } catch {
      showToast({ title: "Hiba mentés során", variant: "error" });
    }
  };

  return (
    <BottomSheet isOpen={Boolean(prompt)} onClose={onClose} title="Új egyéni rekord észlelve!">
      <div className="space-y-4 pb-6 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-500 shadow-inner">
          <Trophy className="w-8 h-8 animate-bounce" />
        </div>

        <div>
          <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            Új egyéni rekord? Mentsd el!
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            A legutóbbi edzésed során megdöntötted az eddigi legjobb eredményedet.
          </p>
        </div>

        {/* Comparison card */}
        <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
          <div className="text-xs font-semibold text-neutral-500 mb-2">
            {prompt.discipline}
          </div>
          <div className="flex items-center justify-center gap-4 text-base font-bold">
            {prompt.previousBestDisplayValue && (
              <>
                <span className="text-neutral-400 line-through">
                  {prompt.previousBestDisplayValue}
                </span>
                <ArrowRight className="w-4 h-4 text-neutral-400" />
              </>
            )}
            <span className="text-emerald-600 dark:text-emerald-400 text-xl font-extrabold flex items-center gap-1">
              <Sparkles className="w-4 h-4" />
              {prompt.newDisplayValue}
            </span>
          </div>
          <div className="text-[11px] text-neutral-400 mt-2">
            Edzés: {prompt.sessionTitle} ({prompt.date})
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Most nem
          </Button>
          <Button
            type="button"
            variant="primary"
            className="flex-1 flex items-center justify-center gap-1.5"
            onClick={handleConfirmSave}
          >
            <Trophy className="w-4 h-4 text-amber-300" />
            Rekord mentése
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};
