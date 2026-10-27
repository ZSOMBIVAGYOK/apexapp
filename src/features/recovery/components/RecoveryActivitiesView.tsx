import React, { useState, useEffect, useCallback } from "react";
import { Button, EmptyState, showToast } from "@shared/ui";
import {
  RecoveryActivityLog,
  RecoveryWeeklySummary
} from "@shared/types/recovery";
import {
  getRecoveryLogs,
  deleteRecoveryLog,
  cloneYesterdayRecoveryLogs,
  calculateWeeklyRecoverySummary,
  RECOVERY_CATEGORIES
} from "@shared/lib/recovery";
import { RecoveryActivityModal } from "./RecoveryActivityModal";
import { Plus, RotateCcw, Clock, Trash2, Edit2, Star, Sparkles } from "lucide-react";

interface RecoveryActivitiesViewProps {
  athleteId: string;
}

export const RecoveryActivitiesView: React.FC<RecoveryActivitiesViewProps> = ({ athleteId }) => {
  const [logs, setLogs] = useState<RecoveryActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<RecoveryActivityLog | null>(null);
  const [summary, setSummary] = useState<RecoveryWeeklySummary | null>(null);
  const [isCloning, setIsCloning] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getRecoveryLogs(athleteId);
      setLogs(data);
      const summ = calculateWeeklyRecoverySummary(data);
      setSummary(summ);
    } catch {
      showToast({ title: "Nem sikerült betölteni a regenerációs naplót", variant: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (logId: string) => {
    if (!window.confirm("Biztosan törlöd ezt a regenerációs aktivitást?")) return;
    try {
      await deleteRecoveryLog(athleteId, logId);
      showToast({ title: "Aktivitás törölve", variant: "info" });
      loadData();
    } catch {
      showToast({ title: "Hiba törléskor", variant: "error" });
    }
  };

  const handleCloneYesterday = async () => {
    setIsCloning(true);
    try {
      const cloned = await cloneYesterdayRecoveryLogs(athleteId);
      if (cloned.length === 0) {
        showToast({
          title: "Nincs tegnapi aktivitás",
          message: "Tegnapra nem találtunk rögzített regenerációt.",
          variant: "warning"
        });
      } else {
        showToast({
          title: "Sikeres másolás!",
          message: `${cloned.length} aktivitás átmásolva a mai napra.`,
          variant: "success"
        });
        loadData();
      }
    } catch {
      showToast({ title: "Hiba a másolás során", variant: "error" });
    } finally {
      setIsCloning(false);
    }
  };

  const openNew = () => {
    setEditingLog(null);
    setIsModalOpen(true);
  };

  const openEdit = (log: RecoveryActivityLog) => {
    setEditingLog(log);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-primary" />
            Regenerációs aktivitások
          </h2>
          <p className="text-xs text-neutral-500">
            Kövesd nyomon a mobilitást, szaunát, hidegvizes merülést és masszázst.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCloneYesterday}
            disabled={isCloning}
            className="flex items-center gap-1.5 text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {isCloning ? "Másolás..." : "Ugyanaz, mint tegnap"}
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={openNew}
            className="flex items-center gap-1.5 text-xs"
          >
            <Plus className="w-4 h-4" />
            Új aktivitás
          </Button>
        </div>
      </div>

      {/* Weekly Summary Card */}
      {summary && (
        <div className="bg-gradient-to-br from-brand-primary/5 via-neutral-50 to-neutral-100 dark:from-neutral-800/80 dark:to-neutral-800 rounded-2xl p-4 border border-brand-primary/20 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              E heti regenerációs összegzés
            </span>
            <span className="text-sm font-bold text-brand-primary">
              {summary.totalMinutes} perc ({summary.totalActivitiesCount} alkalom)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {RECOVERY_CATEGORIES.map((cat) => {
              const mins = summary.byCategory[cat.id] || 0;
              if (mins === 0) return null;
              return (
                <div
                  key={cat.id}
                  className="bg-white/80 dark:bg-neutral-700/60 rounded-xl p-2.5 border border-neutral-200/60 dark:border-neutral-600/60 flex items-center gap-2"
                >
                  <span className="text-lg">{cat.icon}</span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300 truncate">
                      {cat.nameHu}
                    </div>
                    <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      {mins} perc
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Activities Timeline List */}
      {isLoading ? (
        <div className="text-center py-10 text-neutral-400 text-sm">Betöltés...</div>
      ) : logs.length === 0 ? (
        <EmptyState
          title="Még nincs rögzített regenerációs aktivitás"
          message="Rögzítsd az első szaunázást, nyújtást vagy masszázst a gyorsabb felépülésért."
          action={{
            label: "Aktivitás rögzítése",
            onClick: openNew
          }}
        />
      ) : (
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Korábbi aktivitások
          </div>
          <div className="space-y-2">
            {logs.map((log) => {
              const catMeta = RECOVERY_CATEGORIES.find((c) => c.id === log.category);
              return (
                <div
                  key={log.id}
                  className="bg-white dark:bg-neutral-800 rounded-xl p-3.5 border border-neutral-200 dark:border-neutral-700 shadow-sm flex items-start justify-between gap-3 hover:border-neutral-300 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-xl flex-shrink-0">
                      {catMeta?.icon || "✨"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                          {log.activityName}
                        </span>
                        <span className="text-xs text-neutral-400">•</span>
                        <span className="text-xs text-neutral-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {log.durationMinutes} perc
                        </span>
                        {log.temperatureCelsius !== undefined && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium">
                            {log.temperatureCelsius}°C
                          </span>
                        )}
                        {log.rounds !== undefined && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                            {log.rounds} kör
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 text-xs text-neutral-500 flex-wrap">
                        <span>{log.date} {log.startTime}</span>
                        {log.bodyArea && (
                          <span>Cél: <strong className="text-neutral-700 dark:text-neutral-300">{log.bodyArea}</strong></span>
                        )}
                        <span className="flex items-center gap-0.5 text-amber-500 font-medium">
                          <Star className="w-3 h-3 fill-amber-400" />
                          {log.perceivedEffect}/5
                        </span>
                      </div>

                      {log.notes && (
                        <p className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-400 italic">
                          "{log.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(log)}
                      className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
                      title="Szerkesztés"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(log.id)}
                      className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30"
                      title="Törlés"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit/Create Modal */}
      <RecoveryActivityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        athleteId={athleteId}
        activityToEdit={editingLog}
        onSaved={() => loadData()}
      />
    </div>
  );
};
