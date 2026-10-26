import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@features/auth/authStore";
import {
  BottomSheet,
  Button,
  Input,
  NumberInput,
  Slider,
  showToast
} from "@shared/ui";
import {
  CompletedSessionDocument
} from "@shared/types";
import {
  persistTrainingSession,
  removeTrainingSession,
  getLocalSessions
} from "@shared/lib/offline/offlineStorage";
import {
  Flame,
  Copy,
  Trash2,
  Bookmark,
  Check
} from "lucide-react";

export interface ManualSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionToEdit?: CompletedSessionDocument | null;
  onSessionSaved?: (session: CompletedSessionDocument) => void;
  onSessionDeleted?: (sessionId: string) => void;
}

const RPE_DESCRIPTIONS: Record<number, { hu: string; en: string }> = {
  1: { hu: "Nagyon könnyű (laza séta, regeneráció)", en: "Very light (easy recovery walk)" },
  2: { hu: "Könnyű (kényelmes beszélgetős tempó)", en: "Light (conversational aerobic)" },
  3: { hu: "Mérsékelt (stabil Z2 alapozó terhelés)", en: "Moderate (steady Zone 2)" },
  4: { hu: "Kicsit nehéz (érezhető munka, folyamatos)", en: "Somewhat hard (felt effort)" },
  5: { hu: "Nehéz (Z3 tempó, ritmikus légzés)", en: "Hard (Zone 3 tempo effort)" },
  6: { hu: "Nehezebb (fokozott feszültség)", en: "Harder (sustained rhythm)" },
  7: { hu: "Nagyon nehéz (Z4 laktát-küszöb, szaggatott beszéd)", en: "Very hard (Z4 lactate threshold)" },
  8: { hu: "Nagyon-nagyon nehéz (kemény intervallumok)", en: "Very hard+ (intense intervals)" },
  9: { hu: "Majdnem maximális (VO2max, savasodás)", en: "Near maximal (VO2max exhaustion)" },
  10: { hu: "Maximális erőkifejtés (teljes kimerülésig)", en: "Maximal exertion (all-out)" }
};

const SPORT_OPTIONS = [
  { id: "running", labelHu: "Futás", labelEn: "Running", icon: "🏃" },
  { id: "cycling", labelHu: "Kerékpár", labelEn: "Cycling", icon: "🚴" },
  { id: "swimming", labelHu: "Úszás", labelEn: "Swimming", icon: "🏊" },
  { id: "strength", labelHu: "Kondi / Erő", labelEn: "Strength", icon: "🏋️" },
  { id: "rowing", labelHu: "Evezés", labelEn: "Rowing", icon: "🚣" },
  { id: "mobility", labelHu: "Mobilitás", labelEn: "Mobility", icon: "🧘" },
  { id: "other", labelHu: "Egyéb", labelEn: "Other", icon: "⚡" }
];

const TEMPLATES = [
  {
    titleHu: "Reggeli Z2 Bázis Futás",
    titleEn: "Morning Z2 Base Run",
    sport: "running",
    duration: 45,
    rpe: 4,
    notes: "Könnyű orrlégzéses aerob alapozás."
  },
  {
    titleHu: "Kondi A - Erőfejlesztés",
    titleEn: "Strength Block A",
    sport: "strength",
    duration: 60,
    rpe: 7,
    notes: "Guggolás, felhúzás és törzs stabilizáció."
  },
  {
    titleHu: "Laktát-küszöb Úszás",
    titleEn: "Threshold Swim",
    sport: "swimming",
    duration: 75,
    rpe: 8,
    notes: "5 x 400m küszöb részidők egyenletesen."
  },
  {
    titleHu: "Átmozgató Z1/Z2 Bringa",
    titleEn: "Active Recovery Spin",
    sport: "cycling",
    duration: 60,
    rpe: 3,
    notes: "Alacsony ellenállás, pörgetős pedálfordulat."
  }
];

export const ManualSessionModal: React.FC<ManualSessionModalProps> = ({
  isOpen,
  onClose,
  sessionToEdit,
  onSessionSaved,
  onSessionDeleted
}) => {
  const { i18n } = useTranslation();
  const { user } = useAuthStore();
  const isHu = i18n.language.startsWith("hu");
  const athleteId = user?.uid || "demo-athlete-001";

  const todayStr = new Date().toISOString().split("T")[0] as string;

  // Form Fields
  const [sport, setSport] = useState("running");
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [rpe, setRpe] = useState(6);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Populate fields if editing
  useEffect(() => {
    if (sessionToEdit) {
      setSport(sessionToEdit.sport);
      setTitle(sessionToEdit.title);
      setStartTime(sessionToEdit.startTime.includes("T") ? sessionToEdit.startTime.split("T")[1]?.substring(0, 5) || "09:00" : sessionToEdit.startTime);
      setDurationMinutes(sessionToEdit.durationMinutes);
      setRpe(sessionToEdit.rpe);
      setNotes(sessionToEdit.notes || "");
    } else {
      // Default new session
      setSport("running");
      setTitle("");
      setStartTime("09:00");
      setDurationMinutes(60);
      setRpe(6);
      setNotes("");
    }
    setIsConfirmingDelete(false);
  }, [sessionToEdit, isOpen]);

  // Session-RPE Load Calculation: Foster Method
  const sessionLoad = Math.round(durationMinutes * rpe);

  // Copy yesterday's session
  const handleCopyYesterday = () => {
    const all = getLocalSessions(athleteId);
    if (all.length === 0) {
      showToast({
        title: isHu ? "Nincs előző edzés" : "No previous session",
        message: isHu ? "Még nem rögzítettél korábbi edzést." : "No earlier sessions found.",
        type: "info"
      });
      return;
    }
    const lastSession = all[0];
    if (lastSession) {
      setSport(lastSession.sport);
      setTitle(`${lastSession.title} (${isHu ? "Másolat" : "Copy"})`);
      setDurationMinutes(lastSession.durationMinutes);
      setRpe(lastSession.rpe);
      setNotes(lastSession.notes || "");
      showToast({
        title: isHu ? "Edzés átmásolva" : "Session copied",
        message: `${lastSession.title} (${lastSession.durationMinutes} ${isHu ? "perc" : "min"})`,
        type: "success"
      });
    }
  };

  // Apply quick template
  const handleApplyTemplate = (tmpl: typeof TEMPLATES[0]) => {
    setSport(tmpl.sport);
    setTitle(isHu ? tmpl.titleHu : tmpl.titleEn);
    setDurationMinutes(tmpl.duration);
    setRpe(tmpl.rpe);
    setNotes(tmpl.notes);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const sessionId = sessionToEdit?.sessionId || `sess-${Date.now()}`;
      const defaultTitle =
        title.trim() || `${SPORT_OPTIONS.find((s) => s.id === sport)?.[isHu ? "labelHu" : "labelEn"]} edzés`;

      const sessionDoc: CompletedSessionDocument = {
        sessionId,
        athleteId,
        date: sessionToEdit?.date || todayStr,
        sport,
        title: defaultTitle,
        startTime,
        durationMinutes,
        rpe,
        targetIntensityRpe: sessionToEdit?.targetIntensityRpe || rpe,
        trainingLoad: sessionLoad,
        notes: notes.trim() || undefined,
        completed: true,
        source: "manual",
        confidence: 0.95,
        createdAt: sessionToEdit?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: athleteId
      };

      await persistTrainingSession(sessionDoc);
      onSessionSaved?.(sessionDoc);

      showToast({
        title: isHu ? "Edzés rögzítve" : "Session logged",
        message: `${defaultTitle}: ${durationMinutes} perc × ${rpe} RPE = ${sessionLoad} AU terhelés`,
        type: "success"
      });
      onClose();
    } catch {
      showToast({
        title: isHu ? "Hiba történt" : "Error saving",
        message: isHu ? "Offline tárolva" : "Saved offline",
        type: "warning"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!sessionToEdit) return;
    try {
      await removeTrainingSession(athleteId, sessionToEdit.sessionId);
      onSessionDeleted?.(sessionToEdit.sessionId);
      showToast({
        title: isHu ? "Edzés törölve" : "Session deleted",
        message: sessionToEdit.title,
        type: "info"
      });
      onClose();
    } catch {
      showToast({
        title: isHu ? "Törlési hiba" : "Delete error",
        message: isHu ? "Kérjük próbáld újra" : "Please retry",
        type: "error"
      });
    }
  };

  const rpeInfo = RPE_DESCRIPTIONS[rpe] || { hu: "", en: "" };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={
        sessionToEdit
          ? isHu ? "Edzés szerkesztése" : "Edit Training Session"
          : isHu ? "Manuális Edzés Rögzítése" : "Log Training Session"
      }
    >
      <div className="p-4 sm:p-6 space-y-6">
        {/* Quick Helper Actions Bar */}
        {!sessionToEdit && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-11 font-bold text-text-tertiary uppercase tracking-wider">
                {isHu ? "Gyors sablonok & Másolás" : "Quick Presets"}
              </span>
              <button
                type="button"
                onClick={handleCopyYesterday}
                className="inline-flex items-center gap-1.5 text-12 text-brand font-medium hover:underline cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{isHu ? "Tegnapi edzés másolása" : "Copy yesterday's"}</span>
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar">
              {TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.titleHu}
                  type="button"
                  onClick={() => handleApplyTemplate(tmpl)}
                  className="shrink-0 px-3 py-1.5 rounded-10 bg-bg-surface border border-border-hairline hover:border-brand/40 text-11 text-text-secondary hover:text-text-primary transition-all flex items-center gap-1.5"
                >
                  <Bookmark className="h-3 w-3 text-brand" />
                  <span>{isHu ? tmpl.titleHu : tmpl.titleEn}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Sport Type Chips */}
          <div>
            <label className="text-12 font-medium text-text-secondary block mb-2">
              {isHu ? "Sportág kiválasztása" : "Sport"}
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {SPORT_OPTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSport(item.id)}
                  className={`py-2 px-1 rounded-12 text-center border transition-all ${
                    sport === item.id
                      ? "bg-brand/15 border-brand text-brand font-bold shadow-sm"
                      : "bg-bg-elevated border-border-hairline text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <span className="text-18 block mb-0.5">{item.icon}</span>
                  <span className="text-11 block truncate">
                    {isHu ? item.labelHu : item.labelEn}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Session Title */}
          <Input
            id="session-title"
            label={isHu ? "Edzés megnevezése (opcionális)" : "Session title (optional)"}
            placeholder={isHu ? "pl. 10 x 200m résztáv / Könnyű futás" : "e.g. 10 x 200m Intervals"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {/* Time & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-12 font-medium text-text-secondary block mb-1">
                {isHu ? "Kezdés időpontja" : "Start time"}
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-bg-elevated text-text-primary rounded-12 border border-border-hairline p-2.5 text-14 font-mono font-bold"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-12 font-medium text-text-secondary">
                  {isHu ? "Időtartam (perc)" : "Duration (minutes)"}
                </label>
                <div className="flex gap-1">
                  {[30, 45, 60, 90].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDurationMinutes(m)}
                      className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-bg-surface border border-border-hairline text-text-secondary hover:text-text-primary"
                    >
                      {m}p
                    </button>
                  ))}
                </div>
              </div>
              <NumberInput
                value={durationMinutes}
                onChange={(val) => setDurationMinutes(Math.max(1, val))}
                min={5}
                max={480}
                step={5}
                unit={isHu ? "perc" : "min"}
              />
            </div>
          </div>

          {/* Perceived Exertion (RPE 1-10 Borg CR10 Scale) */}
          <div className="space-y-2 p-4 rounded-16 bg-bg-surface border border-border-hairline">
            <div className="flex items-center justify-between">
              <span className="text-13 font-bold text-text-primary">
                {isHu ? "Érzékelt terhelés (Borg CR10 skála)" : "Perceived Exertion (RPE 1-10)"}
              </span>
              <span className="text-20 font-mono font-bold text-brand tabular-nums">
                {rpe} / 10 RPE
              </span>
            </div>

            <Slider
              min={1}
              max={10}
              step={1}
              value={rpe}
              onChange={setRpe}
            />

            <div className="p-2.5 rounded-10 bg-bg-elevated text-12 text-text-secondary">
              <span className="font-semibold text-text-primary">
                {isHu ? "Szint leírása:" : "Level description:"}
              </span>{" "}
              {isHu ? rpeInfo.hu : rpeInfo.en}
            </div>
          </div>

          {/* Prominent Session-RPE Load Cockpit Box */}
          <div className="p-4 rounded-16 bg-brand/10 border border-brand/25 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-12 bg-brand/20 text-brand">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <span className="text-11 font-bold uppercase tracking-wider text-text-tertiary block">
                  {isHu ? "Számított edzésterhelés (Foster sRPE)" : "Calculated Session Load"}
                </span>
                <span className="text-12 text-text-secondary">
                  {durationMinutes} {isHu ? "perc" : "min"} × {rpe} RPE
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-24 font-bold font-mono text-brand tabular-nums">
                {sessionLoad}
              </span>
              <span className="text-11 font-bold text-brand/80 block uppercase">
                AU (Load)
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-12 font-medium text-text-secondary block mb-1">
              {isHu ? "Megjegyzések / Edzői visszajelzés" : "Notes / Coach feedback"}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isHu ? "pl. Jó pulzusválasz, egyenletes iram..." : "e.g. Felt great, steady pacing..."}
              className="w-full bg-bg-elevated text-text-primary text-13 rounded-12 border border-border-hairline p-3 placeholder:text-text-tertiary focus:border-brand focus:outline-none"
            />
          </div>

          {/* Actions & Delete Confirmation */}
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex justify-end gap-3">
              <Button variant="tertiary" onClick={onClose}>
                {isHu ? "Mégse" : "Cancel"}
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSaving}
                leftIcon={<Check className="h-4 w-4" />}
              >
                {sessionToEdit
                  ? isHu ? "Módosítások mentése" : "Save Changes"
                  : isHu ? "Edzés naplózása" : "Log Session"}
              </Button>
            </div>

            {sessionToEdit && (
              <div className="pt-3 border-t border-border-hairline flex items-center justify-between">
                {!isConfirmingDelete ? (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(true)}
                    className="text-12 text-status-rest hover:underline flex items-center gap-1.5"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>{isHu ? "Edzés törlése" : "Delete session"}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-12 text-status-rest font-medium">
                      {isHu ? "Biztosan törlöd?" : "Confirm delete?"}
                    </span>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={handleDelete}
                    >
                      {isHu ? "Igen, törlés" : "Yes, delete"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsConfirmingDelete(false)}
                    >
                      {isHu ? "Mégse" : "Cancel"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </form>
      </div>
    </BottomSheet>
  );
};
