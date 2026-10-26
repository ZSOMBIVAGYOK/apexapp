import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { TrainingSession } from "@shared/types";
import { useAppMode } from "@shared/hooks/useAppMode";
import {
  Card,
  Button,
  Badge,
  SectionHeader,
  BottomSheet,
  Input,
  NumberInput,
  Slider,
  WeekStrip,
  showToast
} from "@shared/ui";
import { Plus, CheckCircle2, Clock, Zap, Play, Sparkles, ShieldCheck } from "lucide-react";

export const TrainingPage: React.FC = () => {
  const { t } = useTranslation();
  const { hasCoach, isSolo } = useAppMode();

  const [selectedDate, setSelectedDate] = useState("2026-10-26");
  const [sessions, setSessions] = useState<TrainingSession[]>([
    {
      id: "train-1",
      athleteId: "demo-athlete-001",
      date: "2026-10-26",
      title: "5 x 400m Laktát-küszöb sorozat (Úszás)",
      type: "threshold",
      durationMinutes: 90,
      targetIntensityRpe: 8.5,
      actualRpe: 8,
      completed: true,
      notes: "Egyenletes 1:08-as 100 méteres részidők."
    },
    {
      id: "train-2",
      athleteId: "demo-athlete-001",
      date: "2026-10-26",
      title: "Délutáni Aerob Bázis Futás (Z2)",
      type: "endurance",
      durationMinutes: 60,
      targetIntensityRpe: 6,
      completed: false
    },
    {
      id: "train-3",
      athleteId: "demo-athlete-001",
      date: "2026-10-27",
      title: "Erőfejlesztés & Posterior Chain Stabilitás",
      type: "strength",
      durationMinutes: 75,
      targetIntensityRpe: 7.5,
      completed: false
    }
  ]);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDuration, setNewDuration] = useState(60);
  const [newRpe, setNewRpe] = useState(7);

  const days = [
    { date: "2026-10-26", dayNumber: 26, dayName: "H", isToday: true, readinessStatus: "ready" as const, hasWorkout: true },
    { date: "2026-10-27", dayNumber: 27, dayName: "K", readinessStatus: "ready" as const, hasWorkout: true },
    { date: "2026-10-28", dayNumber: 28, dayName: "Sze", readinessStatus: "caution" as const, hasWorkout: false },
    { date: "2026-10-29", dayNumber: 29, dayName: "Cs", readinessStatus: "ready" as const, hasWorkout: true },
    { date: "2026-10-30", dayNumber: 30, dayName: "P", readinessStatus: "rest" as const, hasWorkout: false },
    { date: "2026-10-31", dayNumber: 31, dayName: "Szo", readinessStatus: "ready" as const, hasWorkout: true },
    { date: "2026-11-01", dayNumber: 1, dayName: "V", readinessStatus: "ready" as const, hasWorkout: false }
  ];

  const toggleComplete = (id: string) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const next = !s.completed;
          showToast({
            title: next ? "Edzés teljesítve" : "Edzés státusz visszaállítva",
            message: `${s.title}`,
            type: next ? "success" : "info"
          });
          return { ...s, completed: next };
        }
        return s;
      })
    );
  };

  const handleAddSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newSession: TrainingSession = {
      id: `train-${Date.now()}`,
      athleteId: "demo-athlete-001",
      date: selectedDate,
      title: newTitle.trim(),
      type: "threshold",
      durationMinutes: newDuration,
      targetIntensityRpe: newRpe,
      completed: false
    };

    setSessions([newSession, ...sessions]);
    setNewTitle("");
    setIsSheetOpen(false);
    showToast({
      title: "Új edzés rögzítve",
      message: `${newSession.title} hozzáadva a tervhez`,
      type: "success"
    });
  };

  return (
    <div className="space-y-6 pb-12">
      <SectionHeader
        title={t("training.title")}
        description={t("training.subtitle")}
        action={
          <Button
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setIsSheetOpen(true)}
          >
            {t("training.logSession")}
          </Button>
        }
      />

      {/* Week Calendar Strip */}
      <WeekStrip
        days={days}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        title="Heti Periodizáció"
      />

      {/* Sessions List */}
      <div className="space-y-3">
        {sessions.map((session) => (
          <Card
            key={session.id}
            variant={session.completed ? "surface" : "elevated"}
            radius="20"
            className={`p-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              session.completed ? "opacity-75" : ""
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant={session.completed ? "ready" : "brand"}
                  size="sm"
                >
                  {session.type.toUpperCase()}
                </Badge>
                <span className="text-12 text-text-secondary">{session.date}</span>
                {hasCoach && (
                  <Badge variant="brand" size="sm" className="hidden sm:inline-flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    {t("training.coachPlanBadge")}
                  </Badge>
                )}
                {isSolo && (
                  <Badge variant="outline" size="sm" className="hidden sm:inline-flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-brand" />
                    AI Terv
                  </Badge>
                )}
                {session.completed && (
                  <Badge variant="ready" dot size="sm">
                    Elvégezve
                  </Badge>
                )}
              </div>

              <h3 className="text-16 font-bold text-text-primary">{session.title}</h3>

              <div className="flex items-center gap-4 text-12 text-text-secondary">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {session.durationMinutes} perc
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5 text-status-caution" aria-hidden="true" />
                  RPE {session.targetIntensityRpe} / 10
                </span>
                {session.notes && (
                  <span className="italic text-text-tertiary">{session.notes}</span>
                )}
              </div>
            </div>

            <Button
              variant={session.completed ? "secondary" : "primary"}
              size="sm"
              leftIcon={
                session.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-status-ready" />
                ) : (
                  <Play className="h-4 w-4" />
                )
              }
              onClick={() => toggleComplete(session.id)}
            >
              {session.completed ? t("training.completed") : t("training.startSession")}
            </Button>
          </Card>
        ))}
      </div>

      {/* Log Session BottomSheet / Modal */}
      <BottomSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title={t("training.logSession")}
        description="Új edzésblokk ütemezése vagy manuális rögzítése az edzéstervbe."
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsSheetOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="primary" onClick={handleAddSession}>
              {t("common.save")}
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddSession} className="space-y-4 py-2">
          <Input
            label="Edzés megnevezése"
            required
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="pl. 10x100m gyorsúszás felkészülés"
          />

          <NumberInput
            label={t("training.duration")}
            value={newDuration}
            onChange={setNewDuration}
            min={10}
            max={300}
            unit="perc"
          />

          <Slider
            label="Tervezett Intenzitás (RPE)"
            value={newRpe}
            onChange={setNewRpe}
            min={1}
            max={10}
            unit="/ 10"
            statusColor={newRpe >= 8 ? "rest" : newRpe >= 5 ? "caution" : "ready"}
          />
        </form>
      </BottomSheet>
    </div>
  );
};

export default TrainingPage;
