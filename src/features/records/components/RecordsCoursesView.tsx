import React, { useState, useEffect, useCallback } from "react";
import { Button, SegmentedControl, EmptyState, showToast } from "@shared/ui";
import { AthleteRecord, CourseDocument } from "@shared/types/records";
import { getRecords, deleteRecord, getRecordProgression } from "@shared/lib/records";
import { getCourses, deleteCourse } from "@shared/lib/courses";
import { RecordModal } from "./RecordModal";
import { CourseModal } from "./CourseModal";
import {
  Trophy,
  MapPin,
  TrendingUp,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  History
} from "lucide-react";

interface RecordsCoursesViewProps {
  athleteId: string;
}

export const RecordsCoursesView: React.FC<RecordsCoursesViewProps> = ({ athleteId }) => {
  const [subTab, setSubTab] = useState<"records" | "courses">("records");

  const [records, setRecords] = useState<AthleteRecord[]>([]);
  const [courses, setCourses] = useState<CourseDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AthleteRecord | null>(null);

  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseDocument | null>(null);

  // Selected discipline for progression view
  const [selectedDiscipline, setSelectedDiscipline] = useState<{ sportId: string; discipline: string } | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [recs, crss] = await Promise.all([
        getRecords(athleteId),
        getCourses(athleteId)
      ]);
      setRecords(recs);
      setCourses(crss);
    } catch {
      showToast({ title: "Nem sikerült betölteni az adatokat", variant: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteRecord = async (recordId: string) => {
    if (!window.confirm("Biztosan törlöd ezt a rekordot?")) return;
    try {
      await deleteRecord(athleteId, recordId);
      showToast({ title: "Rekord törölve", variant: "info" });
      loadData();
    } catch {
      showToast({ title: "Hiba törléskor", variant: "error" });
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!window.confirm("Biztosan törlöd ezt a pályát?")) return;
    try {
      await deleteCourse(athleteId, courseId);
      showToast({ title: "Pálya törölve", variant: "info" });
      loadData();
    } catch {
      showToast({ title: "Hiba törléskor", variant: "error" });
    }
  };

  // Group records by sport and discipline
  const groupedBySport: Record<string, AthleteRecord[]> = {};
  for (const r of records) {
    const key = r.sportName || r.sportId;
    if (!groupedBySport[key]) {
      groupedBySport[key] = [];
    }
    groupedBySport[key]!.push(r);
  }

  // Active progression records
  const progressionList = selectedDiscipline
    ? getRecordProgression(records, selectedDiscipline.sportId, selectedDiscipline.discipline)
    : [];

  return (
    <div className="space-y-6">
      {/* Sub-tab switcher and add button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <SegmentedControl
          value={subTab}
          onChange={(val) => setSubTab(val as "records" | "courses")}
          options={[
            { value: "records", label: "Egyéni Rekordok" },
            { value: "courses", label: "Pályák és szakaszok" }
          ]}
        />

        <div>
          {subTab === "records" ? (
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setEditingRecord(null);
                setIsRecordModalOpen(true);
              }}
              className="flex items-center gap-1.5 text-xs"
            >
              <Plus className="w-4 h-4" />
              Új rekord
            </Button>
          ) : (
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setEditingCourse(null);
                setIsCourseModalOpen(true);
              }}
              className="flex items-center gap-1.5 text-xs"
            >
              <Plus className="w-4 h-4" />
              Új pálya
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="text-center py-10 text-neutral-400 text-sm">Betöltés...</div>
      ) : subTab === "records" ? (
        /* ================= RECORDS TAB ================= */
        records.length === 0 ? (
          <EmptyState
            title="Még nincs rögzített rekordod"
            message="Rögzítsd a legjobb 5 km-es idődet, 1RM súlyodat vagy versenyszámodat."
            action={{
              label: "Új rekord rögzítése",
              onClick: () => {
                setEditingRecord(null);
                setIsRecordModalOpen(true);
              }
            }}
          />
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedBySport).map(([sportName, sportRecords]) => {
              // Group by discipline
              const disciplinesMap: Record<string, AthleteRecord[]> = {};
              for (const r of sportRecords) {
                if (!disciplinesMap[r.discipline]) {
                  disciplinesMap[r.discipline] = [];
                }
                disciplinesMap[r.discipline]!.push(r);
              }

              return (
                <div key={sportName} className="space-y-3">
                  <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    {sportName}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(disciplinesMap).map(([discipline, discRecords]) => {
                      const bestRecord = discRecords.find((r) => r.isCurrentBest) || discRecords[0]!;
                      const hasHistory = discRecords.length > 1;

                      return (
                        <div
                          key={discipline}
                          className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700 shadow-sm hover:border-neutral-300 transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                {bestRecord.discipline}
                              </span>
                              <div className="text-2xl font-black text-neutral-900 dark:text-neutral-100 flex items-center gap-2 mt-0.5">
                                <Trophy className="w-5 h-5 text-amber-400" />
                                {bestRecord.displayValue}
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingRecord(bestRecord);
                                  setIsRecordModalOpen(true);
                                }}
                                className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
                                title="Szerkesztés"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRecord(bestRecord.id)}
                                className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30"
                                title="Törlés"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-2 text-xs text-neutral-500 flex items-center gap-3 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {bestRecord.date}
                            </span>
                            {bestRecord.venue && <span>Hely: {bestRecord.venue}</span>}
                            {bestRecord.conditions?.surface && (
                              <span>Felszín: {bestRecord.conditions.surface}</span>
                            )}
                          </div>

                          {bestRecord.notes && (
                            <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400 italic">
                              "{bestRecord.notes}"
                            </p>
                          )}

                          {hasHistory && (
                            <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-700/60 flex items-center justify-between">
                              <span className="text-[11px] text-neutral-400">
                                {discRecords.length} bejegyzés rögzítve
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedDiscipline({
                                    sportId: bestRecord.sportId,
                                    discipline: bestRecord.discipline
                                  })
                                }
                                className="text-xs font-semibold text-brand-primary hover:underline flex items-center gap-1"
                              >
                                <History className="w-3 h-3" /> Fejlődéstörténet
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Progression Drawer/Section if discipline selected */}
            {selectedDiscipline && progressionList.length > 0 && (
              <div className="bg-neutral-50 dark:bg-neutral-800/80 rounded-2xl p-4 border border-brand-primary/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-brand-primary flex items-center gap-1.5">
                    <History className="w-4 h-4" />
                    Fejlődés: {selectedDiscipline.discipline}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setSelectedDiscipline(null)}
                    className="text-xs text-neutral-400 hover:text-neutral-600"
                  >
                    Bezárás
                  </button>
                </div>

                <div className="space-y-1.5">
                  {progressionList.map((rec, idx) => (
                    <div
                      key={rec.id}
                      className="bg-white dark:bg-neutral-700 rounded-lg p-2.5 flex items-center justify-between text-xs border border-neutral-200 dark:border-neutral-600"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-400 font-mono">#{idx + 1}</span>
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {rec.displayValue}
                        </span>
                        {rec.isCurrentBest && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-bold">
                            Legjobb
                          </span>
                        )}
                      </div>
                      <span className="text-neutral-500">{rec.date} {rec.venue ? `• ${rec.venue}` : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      ) : (
        /* ================= COURSES TAB ================= */
        courses.length === 0 ? (
          <EmptyState
            title="Még nincsenek elmentett pályáid"
            message="Hozz létre kedvenc futó- vagy kerékpár útvonalakat GPX feltöltéssel vagy kézzel."
            action={{
              label: "Új pálya létrehozása",
              onClick: () => {
                setEditingCourse(null);
                setIsCourseModalOpen(true);
              }
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white dark:bg-neutral-800 rounded-2xl p-4 border border-neutral-200 dark:border-neutral-700 shadow-sm flex flex-col justify-between hover:border-neutral-300 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-base text-neutral-900 dark:text-neutral-100">
                        {course.name}
                      </h4>
                      <div className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {course.location} • {course.surface}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCourse(course);
                          setIsCourseModalOpen(true);
                        }}
                        className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
                        title="Szerkesztés"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCourse(course.id)}
                        className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30"
                        title="Törlés"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* SVG Route Outline if available */}
                  {course.svgRouteOutline && (
                    <div className="my-3 bg-neutral-900/90 rounded-xl p-2.5 flex items-center justify-center">
                      <svg
                        viewBox="0 0 240 160"
                        className="w-full h-28 stroke-brand-primary fill-none"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d={course.svgRouteOutline} />
                      </svg>
                    </div>
                  )}

                  {/* Course stats */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-700/60">
                    <div className="bg-neutral-50 dark:bg-neutral-700/50 p-2 rounded-xl text-center">
                      <div className="text-[11px] text-neutral-400">Távolság</div>
                      <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                        {(course.distanceMeters / 1000).toFixed(2)} km
                      </div>
                    </div>
                    <div className="bg-neutral-50 dark:bg-neutral-700/50 p-2 rounded-xl text-center">
                      <div className="text-[11px] text-neutral-400">Szintemelkedés</div>
                      <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center justify-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                        +{course.elevationGainMeters} m
                      </div>
                    </div>
                  </div>

                  {course.notes && (
                    <p className="mt-2.5 text-xs text-neutral-500 italic">
                      "{course.notes}"
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Record Modal */}
      <RecordModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        athleteId={athleteId}
        recordToEdit={editingRecord}
        onSaved={() => loadData()}
      />

      {/* Course Modal */}
      <CourseModal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        athleteId={athleteId}
        courseToEdit={editingCourse}
        onSaved={() => loadData()}
      />
    </div>
  );
};
