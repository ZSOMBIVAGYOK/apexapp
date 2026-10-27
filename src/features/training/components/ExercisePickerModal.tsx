import React, { useState, useMemo, useEffect } from "react";
import { BottomSheet, Button, Input, Chip } from "@shared/ui";
import {
  ExerciseDocument,
  getExercises
} from "@shared/lib/exercises";
import { Search, Star, Plus, Video, Dumbbell } from "lucide-react";
import { ExerciseEditSheet } from "./ExerciseEditSheet";

interface ExercisePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  athleteId: string;
  onSelectExercise: (exercise: ExerciseDocument) => void;
}

export const ExercisePickerModal: React.FC<ExercisePickerModalProps> = ({
  isOpen,
  onClose,
  athleteId,
  onSelectExercise
}) => {
  const [exercises, setExercises] = useState<ExerciseDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);

  // Load exercises
  useEffect(() => {
    if (isOpen) {
      getExercises(athleteId).then(setExercises);
    }
  }, [isOpen, athleteId]);

  // Collect unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    exercises.forEach((ex) => ex.tags.forEach((t: string) => set.add(t)));
    return Array.from(set);
  }, [exercises]);

  // Filtered exercises
  const filtered = useMemo(() => {
    return exercises.filter((ex) => {
      if (onlyFavorites && !ex.isFavorite) return false;
      if (selectedTag !== "all" && !ex.tags.includes(selectedTag)) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = ex.name.toLowerCase().includes(query);
        const matchesDesc = ex.description?.toLowerCase().includes(query);
        const matchesTag = ex.tags.some((t: string) => t.toLowerCase().includes(query));
        return matchesName || matchesDesc || matchesTag;
      }
      return true;
    });
  }, [exercises, searchQuery, selectedTag, onlyFavorites]);

  const handleSelect = (exercise: ExerciseDocument) => {
    onSelectExercise(exercise);
    onClose();
  };

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Gyakorlat választása a könyvtárból"
      >
        <div className="space-y-4 p-4 sm:p-6 max-h-[75vh] flex flex-col">
          {/* Search bar & Create new */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Keresés név, izomcsoport vagy címke szerint..."
                className="pl-9"
                fullWidth
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCreateSheetOpen(true)}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Új gyakorlat
            </Button>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 text-12">
            <Chip
              label="Összes"
              selected={selectedTag === "all" && !onlyFavorites}
              onClick={() => {
                setSelectedTag("all");
                setOnlyFavorites(false);
              }}
            />
            <button
              type="button"
              onClick={() => setOnlyFavorites(!onlyFavorites)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-12 font-medium border transition-colors ${
                onlyFavorites
                  ? "bg-amber-400/10 text-amber-300 border-amber-400/40"
                  : "bg-bg-surface text-text-secondary border-border-hairline hover:text-text-primary"
              }`}
            >
              <Star className={`h-3 w-3 ${onlyFavorites ? "fill-amber-400" : ""}`} />
              <span>Kedvencek</span>
            </button>

            {allTags.slice(0, 8).map((tag) => (
              <Chip
                key={tag}
                label={tag}
                selected={selectedTag === tag}
                onClick={() => setSelectedTag(selectedTag === tag ? "all" : tag)}
              />
            ))}
          </div>

          {/* Exercise list */}
          <div className="overflow-y-auto space-y-2 flex-1 pr-1 divide-y divide-border-hairline">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-text-secondary space-y-2">
                <Dumbbell className="h-8 w-8 mx-auto text-text-tertiary" />
                <p className="text-13 font-medium">Nincs találat a keresési feltételekre.</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsCreateSheetOpen(true)}
                  leftIcon={<Plus className="h-4 w-4" />}
                  className="mx-auto mt-2"
                >
                  Gyakorlat létrehozása most
                </Button>
              </div>
            ) : (
              filtered.map((ex) => (
                <div
                  key={ex.id}
                  onClick={() => handleSelect(ex)}
                  className="pt-2.5 pb-2 cursor-pointer hover:bg-bg-elevated/50 p-2.5 rounded-12 transition-colors flex items-start justify-between gap-3 group"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-14 font-semibold text-text-primary group-hover:text-brand transition-colors">
                        {ex.name}
                      </span>
                      {ex.isFavorite && (
                        <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 shrink-0" />
                      )}
                      {ex.videoUrl && (
                        <span className="flex items-center gap-0.5 text-[10px] text-brand bg-brand/10 px-1.5 py-0.5 rounded-4">
                          <Video className="h-2.5 w-2.5" />
                          <span>Videó</span>
                        </span>
                      )}
                    </div>

                    {ex.defaultSetsRepsLoad && (
                      <p className="text-11 font-mono text-purple-400">
                        {ex.defaultSetsRepsLoad}
                      </p>
                    )}

                    {ex.description && (
                      <p className="text-12 text-text-secondary line-clamp-1">
                        {ex.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {ex.tags.map((t: string) => (
                        <span
                          key={t}
                          className="text-[10px] text-text-tertiary bg-bg-surface px-1.5 py-0.5 rounded-6 border border-border-hairline"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(ex);
                    }}
                    className="shrink-0 group-hover:bg-brand group-hover:text-white"
                  >
                    Kiválasztás
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </BottomSheet>

      {/* Embedded Create Sheet */}
      <ExerciseEditSheet
        isOpen={isCreateSheetOpen}
        onClose={() => setIsCreateSheetOpen(false)}
        athleteId={athleteId}
        onSaved={(created) => {
          setExercises((prev) => [created, ...prev]);
          handleSelect(created);
        }}
      />
    </>
  );
};
