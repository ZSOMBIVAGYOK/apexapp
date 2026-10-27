import React, { useState, useEffect } from "react";
import { BottomSheet, Button, Input, Chip, showToast } from "@shared/ui";
import {
  ExerciseDocument,
  MUSCLE_GROUPS,
  EQUIPMENT_TAGS,
  SPORT_TAGS,
  saveExercise
} from "@shared/lib/exercises";
import { isValidHttpsUrl } from "@shared/lib/exercises/videoUtils";
import { Star, Video, Tag, Check } from "lucide-react";

interface ExerciseEditSheetProps {
  isOpen: boolean;
  onClose: () => void;
  athleteId: string;
  exerciseToEdit?: ExerciseDocument | null;
  onSaved?: (exercise: ExerciseDocument) => void;
}

export const ExerciseEditSheet: React.FC<ExerciseEditSheetProps> = ({
  isOpen,
  onClose,
  athleteId,
  exerciseToEdit,
  onSaved
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [defaultSetsRepsLoad, setDefaultSetsRepsLoad] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [customTagInput, setCustomTagInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  useEffect(() => {
    if (exerciseToEdit) {
      setName(exerciseToEdit.name);
      setDescription(exerciseToEdit.description || "");
      setVideoUrl(exerciseToEdit.videoUrl || "");
      setDefaultSetsRepsLoad(exerciseToEdit.defaultSetsRepsLoad || "");
      setSelectedTags(exerciseToEdit.tags || []);
      setIsFavorite(exerciseToEdit.isFavorite || false);
    } else {
      setName("");
      setDescription("");
      setVideoUrl("");
      setDefaultSetsRepsLoad("");
      setSelectedTags([]);
      setIsFavorite(false);
    }
    setUrlError(null);
  }, [exerciseToEdit, isOpen]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customTagInput.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags((prev) => [...prev, trimmed]);
      setCustomTagInput("");
    }
  };

  const handleVideoUrlBlur = () => {
    if (!videoUrl.trim()) {
      setUrlError(null);
      return;
    }
    if (!isValidHttpsUrl(videoUrl.trim())) {
      setUrlError("A videó URL-nek https:// protokollal kell kezdődnie.");
    } else {
      setUrlError(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast({
        title: "Hiányzó név",
        message: "Kérjük add meg a gyakorlat elnevezését.",
        type: "error"
      });
      return;
    }

    if (videoUrl.trim() && !isValidHttpsUrl(videoUrl.trim())) {
      setUrlError("A videó URL-nek https:// protokollal kell kezdődnie.");
      return;
    }

    setIsSaving(true);
    try {
      const saved = await saveExercise(athleteId, {
        id: exerciseToEdit?.id,
        name: name.trim(),
        description: description.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
        defaultSetsRepsLoad: defaultSetsRepsLoad.trim() || undefined,
        tags: selectedTags,
        isFavorite,
        createdAt: exerciseToEdit?.createdAt
      });

      showToast({
        title: exerciseToEdit ? "Gyakorlat frissítve" : "Gyakorlat elmentve",
        message: saved.name,
        type: "success"
      });

      onSaved?.(saved);
      onClose();
    } catch {
      showToast({
        title: "Mentési hiba",
        message: "Nem sikerült elmenteni a gyakorlatot.",
        type: "error"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={exerciseToEdit ? "Gyakorlat szerkesztése" : "Új gyakorlat felvétele"}
    >
      <form onSubmit={handleSave} className="space-y-5 p-4 sm:p-6">
        {/* Name & Favorite Toggle */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-12 font-medium uppercase tracking-wider text-text-secondary">
              Gyakorlat neve *
            </label>
            <button
              type="button"
              onClick={() => setIsFavorite(!isFavorite)}
              className={`flex items-center gap-1.5 text-12 font-medium px-2 py-0.5 rounded-8 transition-colors ${
                isFavorite
                  ? "text-amber-400 bg-amber-400/10"
                  : "text-text-tertiary hover:text-text-secondary bg-bg-surface"
              }`}
            >
              <Star className={`h-3.5 w-3.5 ${isFavorite ? "fill-amber-400" : ""}`} />
              <span>Kedvenc</span>
            </button>
          </div>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="pl. Bolgár guggolás kézisúlyzóval"
            required
            fullWidth
          />
        </div>

        {/* Default Sets / Reps / Load Note */}
        <div className="space-y-1.5">
          <label className="text-12 font-medium uppercase tracking-wider text-text-secondary">
            Alapértelmezett terhelési javaslat (opcionális)
          </label>
          <Input
            value={defaultSetsRepsLoad}
            onChange={(e) => setDefaultSetsRepsLoad(e.target.value)}
            placeholder="pl. 3-4 sorozat × 8-10 ism. @ RPE 7-8"
            fullWidth
          />
        </div>

        {/* Video URL */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-12 font-medium uppercase tracking-wider text-text-secondary">
            <Video className="h-3.5 w-3.5 text-brand" />
            <span>Videó link (YouTube, Vimeo, MP4)</span>
          </label>
          <Input
            type="url"
            value={videoUrl}
            onChange={(e) => {
              setVideoUrl(e.target.value);
              setUrlError(null);
            }}
            onBlur={handleVideoUrlBlur}
            placeholder="https://www.youtube.com/watch?v=..."
            fullWidth
          />
          {urlError && <p className="text-11 text-status-rest mt-1">{urlError}</p>}
        </div>

        {/* Description & Technical Cues */}
        <div className="space-y-1.5">
          <label className="text-12 font-medium uppercase tracking-wider text-text-secondary">
            Leírás és technikai instrukciók
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="pl. Fókusz a lassú 3 másodperces leengedésen, robbanékony felállás..."
            className="w-full rounded-12 border border-border-hairline bg-bg-surface px-3 py-2 text-13 text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        {/* Tags Selection */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-12 font-medium uppercase tracking-wider text-text-secondary">
            <Tag className="h-3.5 w-3.5" />
            <span>Címkék & Kategóriák</span>
          </div>

          {/* Muscle Groups */}
          <div className="space-y-1.5">
            <span className="text-11 text-text-tertiary font-semibold block">Izomcsoport</span>
            <div className="flex flex-wrap gap-1.5">
              {MUSCLE_GROUPS.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  selected={selectedTags.includes(tag)}
                  onClick={() => toggleTag(tag)}
                />
              ))}
            </div>
          </div>

          {/* Equipment */}
          <div className="space-y-1.5">
            <span className="text-11 text-text-tertiary font-semibold block">Felszerelés</span>
            <div className="flex flex-wrap gap-1.5">
              {EQUIPMENT_TAGS.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  selected={selectedTags.includes(tag)}
                  onClick={() => toggleTag(tag)}
                />
              ))}
            </div>
          </div>

          {/* Sport / Purpose */}
          <div className="space-y-1.5">
            <span className="text-11 text-text-tertiary font-semibold block">Sportági cél</span>
            <div className="flex flex-wrap gap-1.5">
              {SPORT_TAGS.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  selected={selectedTags.includes(tag)}
                  onClick={() => toggleTag(tag)}
                />
              ))}
            </div>
          </div>

          {/* Custom tag adder */}
          <div className="flex items-center gap-2 pt-1">
            <Input
              value={customTagInput}
              onChange={(e) => setCustomTagInput(e.target.value)}
              placeholder="Egyedi címke hozzáadása..."
              className="text-12"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddCustomTag}
              disabled={!customTagInput.trim()}
            >
              Hozzáadás
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border-hairline">
          <Button type="button" variant="secondary" onClick={onClose}>
            Mégse
          </Button>
          <Button type="submit" variant="primary" isLoading={isSaving} leftIcon={<Check className="h-4 w-4" />}>
            {exerciseToEdit ? "Módosítás mentése" : "Gyakorlat mentése"}
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
};
