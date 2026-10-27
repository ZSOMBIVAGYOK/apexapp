import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, Button, Input, Chip, showToast } from "@shared/ui";
import {
  ExerciseDocument,
  getExercises,
  deleteExercise,
  toggleFavoriteExercise,
  MUSCLE_GROUPS,
  EQUIPMENT_TAGS
} from "@shared/lib/exercises";
import {
  Search,
  Plus,
  Star,
  Video,
  Edit2,
  Trash2,
  Dumbbell
} from "lucide-react";
import { ExerciseEditSheet } from "./ExerciseEditSheet";
import { VideoPlayerModal } from "./VideoPlayerModal";

interface ExerciseLibraryViewProps {
  athleteId: string;
}

export const ExerciseLibraryView: React.FC<ExerciseLibraryViewProps> = ({ athleteId }) => {
  const [exercises, setExercises] = useState<ExerciseDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedEquipment, setSelectedEquipment] = useState<string>("all");
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Edit / Create sheet state
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<ExerciseDocument | null>(null);

  // Video player modal state
  const [videoModalExercise, setVideoModalExercise] = useState<ExerciseDocument | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await getExercises(athleteId);
      setExercises(data);
    } catch {
      // offline fallback
    }
  }, [athleteId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle favorite toggle
  const handleToggleFavorite = async (ex: ExerciseDocument) => {
    const updatedStatus = await toggleFavoriteExercise(athleteId, ex.id);
    setExercises((prev) =>
      prev.map((e) => (e.id === ex.id ? { ...e, isFavorite: updatedStatus } : e))
    );
  };

  // Handle delete
  const handleDelete = async (exercise: ExerciseDocument) => {
    if (confirm(`Biztosan törölni szeretnéd a(z) "${exercise.name}" gyakorlatot a könyvtárból?`)) {
      await deleteExercise(athleteId, exercise.id);
      setExercises((prev) => prev.filter((e) => e.id !== exercise.id));
      showToast({
        title: "Gyakorlat törölve",
        message: exercise.name,
        type: "info"
      });
    }
  };

  // Filter exercises
  const filtered = useMemo(() => {
    return exercises.filter((ex) => {
      if (onlyFavorites && !ex.isFavorite) return false;
      if (activeCategory !== "all" && !ex.tags.includes(activeCategory)) return false;
      if (selectedEquipment !== "all" && !ex.tags.includes(selectedEquipment)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inName = ex.name.toLowerCase().includes(q);
        const inDesc = ex.description?.toLowerCase().includes(q);
        const inTags = ex.tags.some((t: string) => t.toLowerCase().includes(q));
        return inName || inDesc || inTags;
      }
      return true;
    });
  }, [exercises, searchQuery, activeCategory, selectedEquipment, onlyFavorites]);

  return (
    <div className="space-y-6">
      {/* Search, Filter Bar and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Gyakorlatok keresése név, izom vagy cél szerint..."
            className="pl-9"
            fullWidth
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingExercise(null);
              setIsEditSheetOpen(true);
            }}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Új gyakorlat felvétele
          </Button>
        </div>
      </div>

      {/* Muscle Group Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-12">
        <Chip
          label="Összes izomcsoport"
          selected={activeCategory === "all" && !onlyFavorites}
          onClick={() => {
            setActiveCategory("all");
            setOnlyFavorites(false);
          }}
        />
        <button
          type="button"
          onClick={() => setOnlyFavorites(!onlyFavorites)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-12 font-medium border transition-colors ${
            onlyFavorites
              ? "bg-amber-400/10 text-amber-300 border-amber-400/40"
              : "bg-bg-surface text-text-secondary border-border-hairline hover:text-text-primary"
          }`}
        >
          <Star className={`h-3 w-3 ${onlyFavorites ? "fill-amber-400" : ""}`} />
          <span>Kedvencek ({exercises.filter((e) => e.isFavorite).length})</span>
        </button>

        {MUSCLE_GROUPS.map((mg) => (
          <Chip
            key={mg}
            label={mg}
            selected={activeCategory === mg}
            onClick={() => setActiveCategory(activeCategory === mg ? "all" : mg)}
          />
        ))}
      </div>

      {/* Equipment secondary chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-11 text-text-secondary">
        <span className="font-semibold text-text-tertiary uppercase text-[10px] tracking-wider pl-1 shrink-0">
          Eszköz:
        </span>
        <button
          type="button"
          onClick={() => setSelectedEquipment("all")}
          className={`px-2 py-0.5 rounded-6 text-11 font-medium transition-colors ${
            selectedEquipment === "all"
              ? "bg-brand text-white"
              : "bg-bg-surface text-text-secondary hover:text-text-primary"
          }`}
        >
          Mind
        </button>
        {EQUIPMENT_TAGS.map((eq) => (
          <button
            key={eq}
            type="button"
            onClick={() => setSelectedEquipment(selectedEquipment === eq ? "all" : eq)}
            className={`px-2 py-0.5 rounded-6 text-11 font-medium transition-colors ${
              selectedEquipment === eq
                ? "bg-brand text-white"
                : "bg-bg-surface text-text-secondary hover:text-text-primary"
            }`}
          >
            {eq}
          </button>
        ))}
      </div>

      {/* Exercise Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-text-secondary space-y-3">
            <Dumbbell className="h-10 w-10 mx-auto text-text-tertiary" />
            <p className="text-14 font-medium text-text-primary">Nem található gyakorlat</p>
            <p className="text-12 text-text-tertiary">
              Próbálj más keresési kifejezést vagy hozz létre egy új egyedi gyakorlatot.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setEditingExercise(null);
                setIsEditSheetOpen(true);
              }}
              leftIcon={<Plus className="h-4 w-4" />}
              className="mx-auto mt-2"
            >
              Új gyakorlat létrehozása
            </Button>
          </div>
        ) : (
          filtered.map((ex) => (
            <Card
              key={ex.id}
              variant="surface"
              radius="20"
              className="p-4 flex flex-col justify-between border-border-hairline hover:border-border-hairline/80 transition-all space-y-3"
            >
              <div className="space-y-2">
                {/* Header: Name + Favorite */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-14 font-bold text-text-primary leading-snug">
                    {ex.name}
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleToggleFavorite(ex)}
                    className="p-1 text-text-tertiary hover:text-amber-400 transition-colors shrink-0"
                    title={ex.isFavorite ? "Eltávolítás a kedvencek közül" : "Hozzáadás a kedvencekhez"}
                  >
                    <Star
                      className={`h-4 w-4 ${
                        ex.isFavorite ? "text-amber-400 fill-amber-400" : ""
                      }`}
                    />
                  </button>
                </div>

                {/* Default target / recommendation */}
                {ex.defaultSetsRepsLoad && (
                  <div className="text-11 font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-6 inline-block font-medium">
                    {ex.defaultSetsRepsLoad}
                  </div>
                )}

                {/* Description snippet */}
                {ex.description && (
                  <p className="text-12 text-text-secondary line-clamp-2 leading-relaxed">
                    {ex.description}
                  </p>
                )}

                {/* Tags */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {ex.tags.map((t: string) => (
                    <span
                      key={t}
                      className="text-[10px] text-text-tertiary bg-bg-elevated px-1.5 py-0.5 rounded-6 border border-border-hairline"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Footer: Video & Edit Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-border-hairline">
                {ex.videoUrl ? (
                  <button
                    type="button"
                    onClick={() => setVideoModalExercise(ex)}
                    className="inline-flex items-center gap-1.5 text-12 font-medium text-brand hover:underline"
                  >
                    <Video className="h-3.5 w-3.5" />
                    <span>Videó megtekintése</span>
                  </button>
                ) : (
                  <span className="text-11 text-text-tertiary italic">Nincs videó</span>
                )}

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingExercise(ex);
                      setIsEditSheetOpen(true);
                    }}
                    className="p-1.5 text-text-secondary hover:text-text-primary rounded-8 hover:bg-bg-elevated transition-colors"
                    title="Szerkesztés"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(ex)}
                    className="p-1.5 text-text-secondary hover:text-status-rest rounded-8 hover:bg-bg-elevated transition-colors"
                    title="Törlés"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Edit / Create Sheet */}
      <ExerciseEditSheet
        isOpen={isEditSheetOpen}
        onClose={() => setIsEditSheetOpen(false)}
        athleteId={athleteId}
        exerciseToEdit={editingExercise}
        onSaved={(saved) => {
          setExercises((prev) => {
            const idx = prev.findIndex((e) => e.id === saved.id);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = saved;
              return copy;
            }
            return [saved, ...prev];
          });
        }}
      />

      {/* Video Modal Player */}
      {videoModalExercise && (
        <VideoPlayerModal
          isOpen={Boolean(videoModalExercise)}
          onClose={() => setVideoModalExercise(null)}
          videoUrl={videoModalExercise.videoUrl}
          title={videoModalExercise.name}
          description={videoModalExercise.description}
        />
      )}
    </div>
  );
};
