import React, { useState, useEffect, useCallback } from "react";
import { Button, EmptyState, showToast } from "@shared/ui";
import { EquipmentItem, MaintenanceTask } from "@shared/types/equipment";
import { CompletedSessionDocument } from "@shared/types/dataModel";
import {
  deleteEquipmentItem,
  recomputeEquipmentTotals,
  hasDueMaintenance,
  EQUIPMENT_TYPES
} from "@shared/lib/equipment";
import { getLocalSessions } from "@shared/lib/offline/offlineStorage";
import { EquipmentModal } from "./EquipmentModal";
import { MaintenanceModal } from "./MaintenanceModal";
import {
  Plus,
  Wrench,
  Trash2,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  History
} from "lucide-react";

interface EquipmentViewProps {
  athleteId: string;
}

export const EquipmentView: React.FC<EquipmentViewProps> = ({ athleteId }) => {
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);
  const [sessions, setSessions] = useState<CompletedSessionDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipmentItem | null>(null);

  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [activeEquipment, setActiveEquipment] = useState<EquipmentItem | null>(null);
  const [activeTask, setActiveTask] = useState<MaintenanceTask | null>(null);

  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const allSess = getLocalSessions(athleteId);
      setSessions(allSess);
      // Recompute totals from sessions to guarantee fresh state
      const updated = await recomputeEquipmentTotals(athleteId, allSess);
      setEquipmentList(updated);
    } catch {
      showToast({ title: "Nem sikerült betölteni az eszközöket", variant: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (itemId: string) => {
    if (!window.confirm("Biztosan törlöd ezt az eszközt?")) return;
    try {
      await deleteEquipmentItem(athleteId, itemId);
      showToast({ title: "Eszköz törölve", variant: "info" });
      loadData();
    } catch {
      showToast({ title: "Hiba törléskor", variant: "error" });
    }
  };

  const handleOpenMaintenance = (equipment: EquipmentItem, task: MaintenanceTask) => {
    setActiveEquipment(equipment);
    setActiveTask(task);
    setIsMaintenanceModalOpen(true);
  };

  const dueInfo = hasDueMaintenance(equipmentList);

  return (
    <div className="space-y-6">
      {/* Header with Due Alerts & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-brand-primary" />
            Felszerelés és karbantartás
          </h2>
          <p className="text-xs text-neutral-500">
            Kövesd nyomon cipőid, kerékpárjaid használatát és szervizintervallumait.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setEditingItem(null);
              setIsEquipmentModalOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs"
          >
            <Plus className="w-4 h-4" />
            Új eszköz
          </Button>
        </div>
      </div>

      {/* Due Banner if any maintenance required */}
      {dueInfo.hasDue && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div>
              <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Karbantartás esedékes!
              </div>
              <div className="text-[11px] text-amber-700 dark:text-amber-300">
                {dueInfo.overdueCount > 0 && `${dueInfo.overdueCount} feladat túllépve. `}
                {dueInfo.dueSoonCount > 0 && `${dueInfo.dueSoonCount} feladat hamarosan esedékes.`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Equipment Grid */}
      {isLoading ? (
        <div className="text-center py-10 text-neutral-400 text-sm">Betöltés...</div>
      ) : equipmentList.length === 0 ? (
        <EmptyState
          title="Még nincsenek rögzített felszereléseid"
          message="Vegyél fel futócipőt vagy kerékpárt a kilométerek és lánccsere követéséhez."
          action={{
            label: "Eszköz hozzáadása",
            onClick: () => {
              setEditingItem(null);
              setIsEquipmentModalOpen(true);
            }
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {equipmentList.map((item) => {
            const typeMeta = EQUIPMENT_TYPES.find((t) => t.id === item.type);
            const isRetired = item.status === "retired";

            return (
              <div
                key={item.id}
                className={`bg-white dark:bg-neutral-800 rounded-2xl p-4 border shadow-sm flex flex-col justify-between transition-all ${
                  isRetired
                    ? "opacity-60 border-neutral-200 dark:border-neutral-700"
                    : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300"
                }`}
              >
                <div>
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-12 h-12 rounded-xl object-cover border border-neutral-200 dark:border-neutral-700 flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-2xl flex-shrink-0">
                          {typeMeta?.icon || "👟"}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 truncate">
                            {item.name}
                          </h4>
                          {isRetired && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                              Nyugdíjazva
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-neutral-500 truncate">
                          {item.brand} {item.model ? `• ${item.model}` : ""}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem(item);
                          setIsEquipmentModalOpen(true);
                        }}
                        className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
                        title="Szerkesztés"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30"
                        title="Törlés"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Totals */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-700/60">
                    <div className="bg-neutral-50 dark:bg-neutral-700/50 p-2 rounded-xl text-center">
                      <span className="text-[11px] text-neutral-400 block">Összes futás / használat</span>
                      <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                        {item.totalKm.toLocaleString("hu-HU")} km
                      </span>
                    </div>
                    <div className="bg-neutral-50 dark:bg-neutral-700/50 p-2 rounded-xl text-center">
                      <span className="text-[11px] text-neutral-400 block">Használati idő</span>
                      <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                        {item.totalHours.toLocaleString("hu-HU")} óra
                      </span>
                    </div>
                  </div>

                  {/* Maintenance Countdown Tasks */}
                  {item.maintenanceTasks && item.maintenanceTasks.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
                        Karbantartási feladatok
                      </span>

                      {item.maintenanceTasks.map((t) => {
                        const isOverdue = t.status === "overdue";
                        const isDueSoon = t.status === "due_soon";

                        const barColor = isOverdue
                          ? "bg-red-500"
                          : isDueSoon
                          ? "bg-amber-400"
                          : "bg-emerald-500";

                        const statusBadgeClass = isOverdue
                          ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40"
                          : isDueSoon
                          ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40"
                          : "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40";

                        return (
                          <div
                            key={t.id}
                            className="bg-neutral-50 dark:bg-neutral-700/30 p-2.5 rounded-xl border border-neutral-200/80 dark:border-neutral-700 space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                                {t.name}
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${statusBadgeClass}`}>
                                {isOverdue
                                  ? `Túllépve: ${Math.abs(t.remaining)} ${t.mode === "distance" ? "km" : "nap"}`
                                  : isDueSoon
                                  ? `${t.remaining} ${t.mode === "distance" ? "km" : "nap"} maradt`
                                  : `${t.remaining} ${t.mode === "distance" ? "km" : "nap"} maradt`}
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-neutral-200 dark:bg-neutral-600 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${barColor} transition-all duration-300`}
                                style={{ width: `${t.remainingPercent}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[10px] text-neutral-400">
                                Intervallum: {t.intervalValue} {t.mode === "distance" ? "km" : "nap"}
                              </span>

                              <Button
                                size="sm"
                                variant="outline"
                                className="text-[11px] py-0.5 px-2 h-auto"
                                onClick={() => handleOpenMaintenance(item, t)}
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
                                Elvégezve
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* History Section Toggle */}
                  {item.maintenanceHistory && item.maintenanceHistory.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-700/60">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedHistoryId(
                            expandedHistoryId === item.id ? null : item.id
                          )
                        }
                        className="text-xs font-semibold text-neutral-500 hover:text-brand-primary flex items-center gap-1"
                      >
                        <History className="w-3 h-3" />
                        {expandedHistoryId === item.id
                          ? "Karbantartási napló elrejtése"
                          : `Előzmények (${item.maintenanceHistory.length})`}
                      </button>

                      {expandedHistoryId === item.id && (
                        <div className="mt-2 space-y-1">
                          {item.maintenanceHistory.map((h) => (
                            <div
                              key={h.id}
                              className="text-[11px] p-2 bg-neutral-50 dark:bg-neutral-700/40 rounded-lg flex items-center justify-between text-neutral-600 dark:text-neutral-300"
                            >
                              <div>
                                <span className="font-semibold">{h.taskName}</span>
                                {h.notes && <span className="italic block text-neutral-400">"{h.notes}"</span>}
                              </div>
                              <span className="font-mono text-neutral-400">{h.date}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Equipment Add/Edit Modal */}
      <EquipmentModal
        isOpen={isEquipmentModalOpen}
        onClose={() => setIsEquipmentModalOpen(false)}
        athleteId={athleteId}
        itemToEdit={editingItem}
        onSaved={() => loadData()}
      />

      {/* Maintenance Action Modal */}
      <MaintenanceModal
        isOpen={isMaintenanceModalOpen}
        onClose={() => setIsMaintenanceModalOpen(false)}
        athleteId={athleteId}
        equipment={activeEquipment}
        task={activeTask}
        allSessions={sessions}
        onLogged={() => loadData()}
      />
    </div>
  );
};
