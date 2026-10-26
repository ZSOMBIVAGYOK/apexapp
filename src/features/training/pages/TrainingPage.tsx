import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CompletedSessionDocument } from "@shared/types";
import { useAuthStore } from "@features/auth/authStore";
import { useAppMode } from "@shared/hooks/useAppMode";
import {
  Card,
  Button,
  Badge,
  SectionHeader,
  WeekStrip,
  SyncStatusBadge,
  showToast
} from "@shared/ui";
import {
  Plus,
  CheckCircle2,
  Clock,
  Zap,
  Play,
  Sparkles,
  ShieldCheck,
  Flame,
  FileEdit
} from "lucide-react";
import { ManualSessionModal } from "../components/ManualSessionModal";
import {
  getLocalSessions,
  persistTrainingSession
} from "@shared/lib/offline/offlineStorage";

export const TrainingPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const { hasCoach, isSolo } = useAppMode();
  const isHu = i18n.language.startsWith("hu");

  const todayStr = new Date().toISOString().split("T")[0] as string;
  const athleteId = user?.uid || "demo-athlete-001";

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [sessions, setSessions] = useState<CompletedSessionDocument[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState<CompletedSessionDocument | null>(null);

  // Load completed & scheduled sessions
  useEffect(() => {
    const local = getLocalSessions(athleteId);
    if (local.length > 0) {
      setSessions(local);
    } else {
      // Seed default initial sessions
      const initial: CompletedSessionDocument[] = [
        {
          sessionId: "train-1",
          athleteId,
          date: todayStr,
          sport: "swimming",
          title: isHu ? "5 x 400m Laktát-küszöb sorozat (Úszás)" : "5 x 400m Threshold Series (Swim)",
          startTime: "07:30",
          durationMinutes: 90,
          rpe: 8,
          targetIntensityRpe: 8,
          trainingLoad: 720,
          completed: true,
          notes: isHu ? "Egyenletes 1:08-as 100 méteres részidők." : "Consistent 1:08 splits per 100m.",
          source: "manual",
          confidence: 0.95,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          updatedBy: athleteId
        },
        {
          sessionId: "train-2",
          athleteId,
          date: todayStr,
          sport: "running",
          title: isHu ? "Délutáni Aerob Bázis Futás (Z2)" : "Afternoon Aerobic Base Run (Z2)",
          startTime: "17:00",
          durationMinutes: 60,
          rpe: 4,
          targetIntensityRpe: 4,
          trainingLoad: 240,
          completed: false,
          notes: isHu ? "Kényelmes orrlégzéses tempó." : "Comfortable conversational pace.",
          source: "manual",
          confidence: 0.95,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          updatedBy: athleteId
        }
      ];
      setSessions(initial);
      initial.forEach((s) => persistTrainingSession(s));
    }
  }, [athleteId, todayStr, isHu]);

  const days = [
    { date: "2026-10-26", dayNumber: 26, dayName: "H", isToday: true, readinessStatus: "ready" as const, hasWorkout: true },
    { date: "2026-10-27", dayNumber: 27, dayName: "K", readinessStatus: "ready" as const, hasWorkout: true },
    { date: "2026-10-28", dayNumber: 28, dayName: "Sze", readinessStatus: "caution" as const, hasWorkout: false },
    { date: "2026-10-29", dayNumber: 29, dayName: "Cs", readinessStatus: "ready" as const, hasWorkout: true },
    { date: "2026-10-30", dayNumber: 30, dayName: "P", readinessStatus: "rest" as const, hasWorkout: false },
    { date: "2026-10-31", dayNumber: 31, dayName: "Szo", readinessStatus: "ready" as const, hasWorkout: true },
    { date: "2026-11-01", dayNumber: 1, dayName: "V", readinessStatus: "ready" as const, hasWorkout: false }
  ];

  const toggleComplete = (sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.sessionId === sessionId) {
          const next = !s.completed;
          const updated: CompletedSessionDocument = {
            ...s,
            completed: next,
            updatedAt: new Date().toISOString()
          };
          persistTrainingSession(updated);
          showToast({
            title: next ? (isHu ? "Edzés teljesítve" : "Session completed") : (isHu ? "Edzés újranyitva" : "Session reopened"),
            message: s.title,
            type: next ? "success" : "info"
          });
          return updated;
        }
        return s;
      })
    );
  };

  const handleOpenAddModal = () => {
    setSessionToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (session: CompletedSessionDocument) => {
    setSessionToEdit(session);
    setIsModalOpen(true);
  };

  const handleSessionSaved = (saved: CompletedSessionDocument) => {
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.sessionId === saved.sessionId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [saved, ...prev];
    });
  };

  const handleSessionDeleted = (deletedId: string) => {
    setSessions((prev) => prev.filter((s) => s.sessionId !== deletedId));
  };

  // Filter sessions for selected date
  const filteredSessions = sessions.filter((s) => s.date === selectedDate || selectedDate === todayStr);

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <SectionHeader
          title={t("training.title", "Edzéstervezés & Napló")}
          description={t("training.subtitle", "Strukturált edzések és valós terhelés nyomon követése.")}
        />
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <SyncStatusBadge />
          <Button
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={handleOpenAddModal}
          >
            {t("training.logSession", "Manuális rögzítés")}
          </Button>
        </div>
      </div>

      {/* Week Calendar Strip */}
      <WeekStrip
        days={days}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        title={isHu ? "Heti Periodizáció & Naptár" : "Weekly Periodization"}
      />

      {/* Sessions List */}
      <div className="space-y-3">
        {filteredSessions.length === 0 ? (
          <Card variant="surface" radius="20" className="p-8 text-center text-text-secondary">
            <p className="text-14">{isHu ? "Nincs rögzített edzés erre a napra." : "No training sessions for this day."}</p>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={handleOpenAddModal}
              className="mt-3"
            >
              {isHu ? "Edzés naplózása" : "Log session"}
            </Button>
          </Card>
        ) : (
          filteredSessions.map((session) => (
            <Card
              key={session.sessionId}
              variant={session.completed ? "surface" : "elevated"}
              radius="20"
              className={`p-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 border ${
                session.completed ? "border-status-ready/20 bg-bg-surface/70" : "border-border-hairline"
              }`}
            >
              <div className="space-y-2 flex-1 cursor-pointer" onClick={() => handleOpenEditModal(session)}>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant={session.completed ? "ready" : "brand"}
                    size="sm"
                  >
                    {session.sport.toUpperCase()}
                  </Badge>
                  <span className="text-12 text-text-secondary font-mono">{session.startTime}</span>

                  {session.trainingLoad && (
                    <Badge variant="outline" size="sm" className="inline-flex items-center gap-1">
                      <Flame className="h-3 w-3 text-brand" />
                      <span>{session.trainingLoad} AU</span>
                    </Badge>
                  )}

                  {hasCoach && (
                    <Badge variant="brand" size="sm" className="hidden sm:inline-flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" />
                      {t("training.coachPlanBadge", "Edző által tervezve")}
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
                      {isHu ? "Elvégezve" : "Completed"}
                    </Badge>
                  )}
                </div>

                <h3 className="text-16 font-bold text-text-primary hover:text-brand transition-colors">
                  {session.title}
                </h3>

                <div className="flex items-center gap-4 text-12 text-text-secondary">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    {session.durationMinutes} {isHu ? "perc" : "min"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap className="h-3.5 w-3.5 text-status-caution" aria-hidden="true" />
                    RPE {session.rpe} / 10
                  </span>
                  {session.notes && (
                    <span className="italic text-text-tertiary truncate max-w-xs">{session.notes}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenEditModal(session)}
                  title={isHu ? "Szerkesztés" : "Edit"}
                >
                  <FileEdit className="h-4 w-4" />
                </Button>

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
                  onClick={() => toggleComplete(session.sessionId)}
                >
                  {session.completed
                    ? t("training.completed", "Elvégezve")
                    : t("training.startSession", "Indítás / Kész")}
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Manual Session Modal / Bottom Sheet */}
      <ManualSessionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sessionToEdit={sessionToEdit}
        onSessionSaved={handleSessionSaved}
        onSessionDeleted={handleSessionDeleted}
      />
    </div>
  );
};

export default TrainingPage;
