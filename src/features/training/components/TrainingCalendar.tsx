import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { PlannedWorkout, SportType } from "@shared/types/training";
import { Card, Button, BottomSheet } from "@shared/ui";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Calendar as CalendarIcon,
  UserCheck,
  MoveHorizontal
} from "lucide-react";

interface TrainingCalendarProps {
  workouts: PlannedWorkout[];
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  onOpenWorkoutBuilder: (dateStr: string, workoutToEdit?: PlannedWorkout) => void;
  onOpenWorkoutFeedback: (workout: PlannedWorkout) => void;
  onRescheduleWorkout: (workoutId: string, newDateStr: string) => void;
}

const DAY_NAMES_HU = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];
const DAY_NAMES_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES_HU = [
  "Január", "Február", "Március", "Április", "Május", "Június",
  "Július", "Augusztus", "Szeptember", "Október", "November", "December"
];
const MONTH_NAMES_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const TrainingCalendar: React.FC<TrainingCalendarProps> = ({
  workouts,
  selectedDate,
  onSelectDate,
  onOpenWorkoutBuilder,
  onOpenWorkoutFeedback,
  onRescheduleWorkout
}) => {
  const { i18n } = useTranslation();
  const isHu = i18n.language.startsWith("hu");

  const todayStr = new Date().toISOString().split("T")[0] as string;

  const [calendarView, setCalendarView] = useState<"week" | "month" | "day">("week");
  const [currentReferenceDate, setCurrentReferenceDate] = useState<Date>(
    new Date(selectedDate || todayStr)
  );

  // Mobile move sheet state
  const [workoutToMove, setWorkoutToMove] = useState<PlannedWorkout | null>(null);
  const [targetMoveDate, setTargetMoveDate] = useState<string>(todayStr);

  // Helper date functions
  const formatDateStr = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const getWeekDays = (refDate: Date): Date[] => {
    const d = new Date(refDate);
    const day = d.getDay();
    // Monday is first day of week (0 = Sun -> 6, 1 = Mon -> 0)
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));

    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      week.push(nextDay);
    }
    return week;
  };

  const currentWeekDays = React.useMemo(
    () => getWeekDays(currentReferenceDate),
    [currentReferenceDate]
  );

  // Navigation handlers
  const handlePrev = () => {
    const d = new Date(currentReferenceDate);
    if (calendarView === "week") d.setDate(d.getDate() - 7);
    else if (calendarView === "month") d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 1);
    setCurrentReferenceDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentReferenceDate);
    if (calendarView === "week") d.setDate(d.getDate() + 7);
    else if (calendarView === "month") d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 1);
    setCurrentReferenceDate(d);
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentReferenceDate(now);
    onSelectDate(formatDateStr(now));
  };

  // Sport color helpers
  const getSportColorClasses = (sport: SportType) => {
    switch (sport) {
      case "running":
        return {
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/30",
          text: "text-emerald-300",
          indicator: "bg-emerald-500"
        };
      case "cycling":
        return {
          bg: "bg-blue-500/10",
          border: "border-blue-500/30",
          text: "text-blue-300",
          indicator: "bg-blue-500"
        };
      case "swimming":
        return {
          bg: "bg-cyan-500/10",
          border: "border-cyan-500/30",
          text: "text-cyan-300",
          indicator: "bg-cyan-500"
        };
      case "strength":
        return {
          bg: "bg-purple-500/10",
          border: "border-purple-500/30",
          text: "text-purple-300",
          indicator: "bg-purple-500"
        };
      case "triathlon":
        return {
          bg: "bg-amber-500/10",
          border: "border-amber-500/30",
          text: "text-amber-300",
          indicator: "bg-amber-500"
        };
      default:
        return {
          bg: "bg-white/5",
          border: "border-white/10",
          text: "text-white",
          indicator: "bg-brand-500"
        };
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, workoutId: string) => {
    e.dataTransfer.setData("text/plain", workoutId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetDateStr: string, e: React.DragEvent) => {
    e.preventDefault();
    const workoutId = e.dataTransfer.getData("text/plain");
    if (workoutId) {
      onRescheduleWorkout(workoutId, targetDateStr);
    }
  };

  // Week Summary calculation
  const weekSummary = React.useMemo(() => {
    const weekStartStr = formatDateStr(currentWeekDays[0]!);
    const weekEndStr = formatDateStr(currentWeekDays[6]!);

    const weekWorkouts = workouts.filter(
      (w) => w.date >= weekStartStr && w.date <= weekEndStr
    );

    let plannedVolumeMin = 0;
    let completedVolumeMin = 0;
    let plannedLoad = 0;
    let completedLoad = 0;

    weekWorkouts.forEach((w) => {
      plannedVolumeMin += w.plannedDurationMinutes;
      plannedLoad += w.plannedLoad;
      if (w.status === "completed" || w.status === "modified") {
        completedVolumeMin += w.actualDurationMinutes || w.plannedDurationMinutes;
        completedLoad += w.actualRpe
          ? Math.round((w.actualDurationMinutes || w.plannedDurationMinutes) * w.actualRpe)
          : w.plannedLoad;
      }
    });

    const compliancePercent =
      plannedLoad > 0 ? Math.min(150, Math.round((completedLoad / plannedLoad) * 100)) : 100;

    return {
      plannedVolumeHours: +(plannedVolumeMin / 60).toFixed(1),
      completedVolumeHours: +(completedVolumeMin / 60).toFixed(1),
      plannedLoad,
      completedLoad,
      compliancePercent,
      workoutsCount: weekWorkouts.length
    };
  }, [currentWeekDays, workouts]);

  const headerTitle = React.useMemo(() => {
    const m = isHu
      ? MONTH_NAMES_HU[currentReferenceDate.getMonth()]
      : MONTH_NAMES_EN[currentReferenceDate.getMonth()];
    const y = currentReferenceDate.getFullYear();
    return `${m} ${y}`;
  }, [currentReferenceDate, isHu]);

  return (
    <Card className="p-4 sm:p-6 mb-6">
      {/* Top Header: Navigation & View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-white tracking-tight">
            {headerTitle}
          </h2>
          <div className="flex items-center gap-1 bg-[#0B0C0F] p-1 rounded-xl border border-white/5">
            <button
              onClick={handlePrev}
              aria-label="Previous"
              className="p-1 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2 py-0.5 rounded-lg text-xs font-semibold text-brand-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              {isHu ? "Ma" : "Today"}
            </button>
            <button
              onClick={handleNext}
              aria-label="Next"
              className="p-1 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* View Switcher: Week / Month / Day */}
        <div className="flex items-center bg-[#0B0C0F] p-1 rounded-xl border border-white/5 self-start sm:self-auto text-xs">
          <button
            onClick={() => setCalendarView("week")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              calendarView === "week"
                ? "bg-brand-500 text-white shadow"
                : "text-text-secondary hover:text-white"
            }`}
          >
            {isHu ? "Hét nézet" : "Week View"}
          </button>
          <button
            onClick={() => setCalendarView("month")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              calendarView === "month"
                ? "bg-brand-500 text-white shadow"
                : "text-text-secondary hover:text-white"
            }`}
          >
            {isHu ? "Hónap nézet" : "Month View"}
          </button>
          <button
            onClick={() => setCalendarView("day")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              calendarView === "day"
                ? "bg-brand-500 text-white shadow"
                : "text-text-secondary hover:text-white"
            }`}
          >
            {isHu ? "Nap nézet" : "Day View"}
          </button>
        </div>
      </div>

      {/* WEEKLY SUMMARY ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 my-3 bg-[#0B0C0F] p-3 rounded-2xl border border-white/5 text-xs">
        <div>
          <span className="text-[11px] text-text-secondary block">
            {isHu ? "Heti volumen" : "Weekly Volume"}
          </span>
          <div className="font-mono font-bold text-white text-sm mt-0.5">
            {weekSummary.completedVolumeHours} / {weekSummary.plannedVolumeHours} {isHu ? "óra" : "hrs"}
          </div>
        </div>

        <div>
          <span className="text-[11px] text-text-secondary block">
            {isHu ? "Heti terhelés" : "Weekly Load"}
          </span>
          <div className="font-mono font-bold text-amber-400 text-sm mt-0.5">
            {weekSummary.completedLoad} / {weekSummary.plannedLoad} TSS
          </div>
        </div>

        <div>
          <span className="text-[11px] text-text-secondary block">
            {isHu ? "Edzéstervezés teljesülés" : "Compliance Rate"}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={`font-mono font-bold text-sm ${
                weekSummary.compliancePercent >= 85
                  ? "text-emerald-400"
                  : weekSummary.compliancePercent >= 70
                  ? "text-amber-400"
                  : "text-rose-400"
              }`}
            >
              {weekSummary.compliancePercent}%
            </span>
          </div>
        </div>

        <div>
          <span className="text-[11px] text-text-secondary block">
            {isHu ? "Edzésszám" : "Total Workouts"}
          </span>
          <div className="font-mono font-bold text-white text-sm mt-0.5">
            {weekSummary.workoutsCount} {isHu ? "edzés a héten" : "sessions"}
          </div>
        </div>
      </div>

      {/* VIEW: WEEK VIEW */}
      {calendarView === "week" && (
        <div className="grid grid-cols-1 sm:grid-cols-7 gap-2.5 mt-4">
          {currentWeekDays.map((dayDate, idx) => {
            const dateStr = formatDateStr(dayDate);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;

            // Day workouts
            const dayWorkouts = workouts.filter((w) => w.date === dateStr);
            const dayTotalLoad = dayWorkouts.reduce(
              (sum, w) =>
                sum +
                (w.status === "completed"
                  ? w.actualRpe
                    ? (w.actualDurationMinutes || w.plannedDurationMinutes) * w.actualRpe
                    : w.plannedLoad
                  : w.plannedLoad),
              0
            );

            return (
              <div
                key={dateStr}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(dateStr, e)}
                onClick={() => onSelectDate(dateStr)}
                className={`min-h-[220px] rounded-2xl p-2.5 flex flex-col justify-between border transition-all ${
                  isSelected
                    ? "bg-[#14161B] border-brand-500/60 ring-1 ring-brand-500/30"
                    : "bg-[#0B0C0F] border-white/5 hover:border-white/10"
                }`}
              >
                {/* Day Header */}
                <div>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
                    <div>
                      <span className="text-[11px] font-semibold text-text-secondary uppercase">
                        {isHu ? DAY_NAMES_HU[idx] : DAY_NAMES_EN[idx]}
                      </span>
                      <div
                        className={`text-sm font-bold font-mono ${
                          isToday ? "text-brand-400" : "text-white"
                        }`}
                      >
                        {dayDate.getDate()}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {dayTotalLoad > 0 && (
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full bg-white/5 text-amber-300">
                          {dayTotalLoad} TSS
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenWorkoutBuilder(dateStr);
                        }}
                        title={isHu ? "Új edzés hozzáadása" : "Add workout"}
                        className="p-1 rounded-lg text-text-secondary hover:text-white hover:bg-white/10"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Workouts list for the day */}
                  <div className="space-y-1.5">
                    {dayWorkouts.map((workout) => {
                      const colors = getSportColorClasses(workout.sport);
                      const isCompleted = workout.status === "completed";
                      const isModified = workout.status === "modified";
                      const isSkipped = workout.status === "skipped";

                      return (
                        <div
                          key={workout.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, workout.id)}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenWorkoutFeedback(workout);
                          }}
                          className={`p-2 rounded-xl text-xs cursor-pointer border transition-all ${
                            isCompleted
                              ? `${colors.bg} ${colors.border} shadow-sm`
                              : isModified
                              ? "bg-amber-500/10 border-amber-500/30"
                              : isSkipped
                              ? "bg-rose-500/5 border-rose-500/20 opacity-60 line-through"
                              : "bg-[#14161B] border-dashed border-white/20 hover:border-white/40"
                          }`}
                        >
                          {/* Title and Status Icon */}
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <span
                              className={`font-semibold text-[11px] leading-tight line-clamp-2 ${
                                isCompleted
                                  ? colors.text
                                  : isModified
                                  ? "text-amber-300"
                                  : isSkipped
                                  ? "text-rose-400"
                                  : "text-white"
                              }`}
                            >
                              {workout.title}
                            </span>
                            {isCompleted ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            ) : isModified ? (
                              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            ) : isSkipped ? (
                              <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-text-secondary shrink-0 mt-0.5" />
                            )}
                          </div>

                          {/* Details: Duration & Load */}
                          <div className="flex items-center justify-between text-[10px] text-text-secondary font-mono">
                            <span>
                              {isCompleted && workout.actualDurationMinutes
                                ? `${workout.actualDurationMinutes}p`
                                : `${workout.plannedDurationMinutes}p`}
                            </span>
                            <span>{workout.plannedLoad} TSS</span>
                          </div>

                          {/* Author Badge */}
                          {workout.author.role === "coach" && (
                            <div className="flex items-center gap-1 mt-1 text-[9px] text-indigo-300 font-medium">
                              <UserCheck className="w-2.5 h-2.5" />
                              <span className="truncate">{workout.author.name}</span>
                            </div>
                          )}

                          {/* Mobile move button */}
                          <div className="sm:hidden mt-1.5 pt-1 border-t border-white/5 flex justify-end">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setWorkoutToMove(workout);
                                setTargetMoveDate(workout.date);
                              }}
                              className="text-[9px] text-text-secondary flex items-center gap-1 hover:text-white"
                            >
                              <MoveHorizontal className="w-2.5 h-2.5" />
                              <span>{isHu ? "Áthelyezés" : "Move"}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Empty day prompt */}
                {dayWorkouts.length === 0 && (
                  <div className="text-[10px] text-text-secondary/50 text-center py-4">
                    {isHu ? "Pihenőnap" : "Rest day"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW: MONTH VIEW */}
      {calendarView === "month" && (
        <div className="mt-4">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-text-secondary mb-2">
            {(isHu ? DAY_NAMES_HU : DAY_NAMES_EN).map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Month grid (simplified 35 days) */}
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 35 }).map((_, idx) => {
              const startOfMonth = new Date(
                currentReferenceDate.getFullYear(),
                currentReferenceDate.getMonth(),
                1
              );
              const dayOffset = idx - (startOfMonth.getDay() === 0 ? 6 : startOfMonth.getDay() - 1);
              const cellDate = new Date(startOfMonth);
              cellDate.setDate(startOfMonth.getDate() + dayOffset);
              const dateStr = formatDateStr(cellDate);

              const isCurrentMonth = cellDate.getMonth() === currentReferenceDate.getMonth();
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;

              const cellWorkouts = workouts.filter((w) => w.date === dateStr);
              const totalLoad = cellWorkouts.reduce((s, w) => s + w.plannedLoad, 0);

              return (
                <div
                  key={dateStr}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(dateStr, e)}
                  onClick={() => onSelectDate(dateStr)}
                  className={`min-h-[85px] p-1.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                    isSelected
                      ? "bg-[#14161B] border-brand-500/60"
                      : isCurrentMonth
                      ? "bg-[#0B0C0F] border-white/5 hover:border-white/10"
                      : "bg-[#0B0C0F]/40 border-transparent opacity-40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] font-mono font-bold ${
                        isToday ? "text-brand-400" : "text-white"
                      }`}
                    >
                      {cellDate.getDate()}
                    </span>
                    {totalLoad > 0 && (
                      <span className="text-[9px] font-mono text-amber-300">
                        {totalLoad}
                      </span>
                    )}
                  </div>

                  {/* Workout dots or chips */}
                  <div className="space-y-0.5 mt-1">
                    {cellWorkouts.slice(0, 2).map((w) => {
                      const colors = getSportColorClasses(w.sport);
                      return (
                        <div
                          key={w.id}
                          className={`text-[9px] truncate px-1 py-0.5 rounded font-medium ${
                            w.status === "completed"
                              ? `${colors.bg} ${colors.text}`
                              : "text-text-secondary bg-white/5"
                          }`}
                        >
                          {w.title}
                        </div>
                      );
                    })}
                    {cellWorkouts.length > 2 && (
                      <div className="text-[8px] text-text-secondary text-center">
                        +{cellWorkouts.length - 2}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW: DAY VIEW */}
      {calendarView === "day" && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div>
              <h3 className="font-bold text-white text-base">
                {selectedDate} {selectedDate === todayStr && `(${isHu ? "Ma" : "Today"})`}
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                {isHu ? "Részletes napi edzésprogram és blokkok" : "Detailed daily workout blocks"}
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onOpenWorkoutBuilder(selectedDate)}
              className="flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{isHu ? "Edzés hozzáadása" : "Add Workout"}</span>
            </Button>
          </div>

          {/* List of full workouts for the selected day */}
          {workouts.filter((w) => w.date === selectedDate).length === 0 ? (
            <div className="text-center py-12 bg-[#0B0C0F] rounded-2xl border border-white/5">
              <CalendarIcon className="w-10 h-10 text-text-secondary/40 mx-auto mb-2" />
              <p className="text-sm font-semibold text-white">
                {isHu ? "Nincs betervezett edzés erre a napra" : "No workouts scheduled for this day"}
              </p>
              <p className="text-xs text-text-secondary mt-1">
                {isHu ? "Kattints a fenti gombra új edzés rögzítéséhez." : "Click above to add a workout."}
              </p>
            </div>
          ) : (
            workouts
              .filter((w) => w.date === selectedDate)
              .map((w) => {
                const colors = getSportColorClasses(w.sport);
                return (
                  <div
                    key={w.id}
                    className="p-4 rounded-2xl bg-[#0B0C0F] border border-white/5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${colors.indicator}`} />
                        <h4 className="font-bold text-white text-sm">{w.title}</h4>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onOpenWorkoutFeedback(w)}
                      >
                        {w.status === "completed"
                          ? isHu ? "Módosítás" : "Edit Feedback"
                          : isHu ? "Lezárás / Visszajelzés" : "Log / Feedback"}
                      </Button>
                    </div>

                    {/* Workout structured blocks preview */}
                    {w.blocks && w.blocks.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-white/5">
                        <span className="text-[11px] font-semibold text-text-secondary uppercase">
                          {isHu ? "Blokkok" : "Blocks"}
                        </span>
                        {w.blocks.map((b) => (
                          <div
                            key={b.id}
                            className="flex items-center justify-between text-xs p-2 rounded-xl bg-[#14161B]"
                          >
                            <span className="text-white">{b.name}</span>
                            <span className="text-text-secondary font-mono">
                              {b.durationMinutes}p{" "}
                              {b.targetRpe ? `(RPE ${b.targetRpe})` : b.targetZone ? `(Z${b.targetZone})` : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Strength exercises preview */}
                    {w.strengthExercises && w.strengthExercises.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-white/5">
                        <span className="text-[11px] font-semibold text-text-secondary uppercase">
                          {isHu ? "Gyakorlatok" : "Exercises"}
                        </span>
                        {w.strengthExercises.map((e) => (
                          <div
                            key={e.id}
                            className="flex items-center justify-between text-xs p-2 rounded-xl bg-[#14161B]"
                          >
                            <span className="text-white">{e.name}</span>
                            <span className="text-text-secondary font-mono">
                              {e.sets} x {e.reps} @ {e.loadKg} kg
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
          )}
        </div>
      )}

      {/* Mobile Move Sheet */}
      <BottomSheet
        isOpen={Boolean(workoutToMove)}
        onClose={() => setWorkoutToMove(null)}
        title={isHu ? "Edzés áthelyezése" : "Reschedule Workout"}
      >
        {workoutToMove && (
          <div className="space-y-4 text-sm p-2">
            <div className="bg-[#0B0C0F] p-3 rounded-xl border border-white/5">
              <span className="font-semibold text-white block">{workoutToMove.title}</span>
              <span className="text-xs text-text-secondary font-mono">
                {isHu ? "Jelenlegi nap:" : "Current date:"} {workoutToMove.date}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                {isHu ? "Új nap kiválasztása" : "Select New Date"}
              </label>
              <input
                type="date"
                value={targetMoveDate}
                onChange={(e) => setTargetMoveDate(e.target.value)}
                className="w-full bg-[#0B0C0F] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setWorkoutToMove(null)}
                className="flex-1"
              >
                {isHu ? "Mégse" : "Cancel"}
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  onRescheduleWorkout(workoutToMove.id, targetMoveDate);
                  setWorkoutToMove(null);
                }}
                className="flex-1"
              >
                {isHu ? "Áthelyezés" : "Move"}
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </Card>
  );
};
