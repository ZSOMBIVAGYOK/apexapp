import React, { useState, useEffect, useRef } from "react";
import { BottomSheet, Button, Input, NumberInput, showToast } from "@shared/ui";
import { CourseDocument, ElevationPoint, TrackPoint } from "@shared/types/records";
import { parseCourseFile, saveCourse } from "@shared/lib/courses";
import { SPORT_CATALOG } from "@shared/lib/sports/catalog";
import { Upload, MapPin, TrendingUp, Compass } from "lucide-react";

interface CourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  athleteId: string;
  courseToEdit?: CourseDocument | null;
  onSaved?: (course: CourseDocument) => void;
}

export const CourseModal: React.FC<CourseModalProps> = ({
  isOpen,
  onClose,
  athleteId,
  courseToEdit,
  onSaved
}) => {
  const [name, setName] = useState("");
  const [sportId, setSportId] = useState("running");
  const [location, setLocation] = useState("");
  const [distanceMeters, setDistanceMeters] = useState(5000);
  const [elevationGainMeters, setElevationGainMeters] = useState(25);
  const [surface, setSurface] = useState("Aszfalt");
  const [notes, setNotes] = useState("");
  const [svgRouteOutline, setSvgRouteOutline] = useState<string | undefined>(undefined);
  const [trackPoints, setTrackPoints] = useState<TrackPoint[] | undefined>(undefined);
  const [elevationProfile, setElevationProfile] = useState<ElevationPoint[] | undefined>(undefined);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (courseToEdit) {
      setName(courseToEdit.name);
      setSportId(courseToEdit.sportId);
      setLocation(courseToEdit.location);
      setDistanceMeters(courseToEdit.distanceMeters);
      setElevationGainMeters(courseToEdit.elevationGainMeters);
      setSurface(courseToEdit.surface);
      setNotes(courseToEdit.notes || "");
      setSvgRouteOutline(courseToEdit.svgRouteOutline);
      setTrackPoints(courseToEdit.trackPoints);
      setElevationProfile(courseToEdit.elevationProfile);
    } else {
      setName("");
      setSportId("running");
      setLocation("");
      setDistanceMeters(5000);
      setElevationGainMeters(25);
      setSurface("Aszfalt");
      setNotes("");
      setSvgRouteOutline(undefined);
      setTrackPoints(undefined);
      setElevationProfile(undefined);
    }
  }, [isOpen, courseToEdit]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const result = parseCourseFile(text, file.name);
        if (result.name && !name) {
          setName(result.name);
        }
        if (result.distanceMeters > 0) {
          setDistanceMeters(result.distanceMeters);
        }
        if (result.elevationGainMeters >= 0) {
          setElevationGainMeters(result.elevationGainMeters);
        }
        setSvgRouteOutline(result.svgRouteOutline);
        setTrackPoints(result.trackPoints);
        setElevationProfile(result.elevationProfile);

        showToast({
          title: "Pálya beolvasva!",
          message: `${file.name} sikeresen feldolgozva (${(result.distanceMeters / 1000).toFixed(2)} km, +${result.elevationGainMeters} m)`,
          variant: "success"
        });
      } catch {
        showToast({ title: "Fájl beolvasási hiba", message: "Érvénytelen GPX vagy TCX fájl.", variant: "error" });
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast({ title: "Hiányzó név", message: "Kérlek add meg a pálya nevét!", variant: "warning" });
      return;
    }

    setIsSaving(true);
    try {
      const saved = await saveCourse(athleteId, {
        id: courseToEdit ? courseToEdit.id : undefined,
        name: name.trim(),
        sportId,
        location: location.trim(),
        distanceMeters,
        elevationGainMeters,
        surface: surface.trim(),
        notes: notes.trim() || undefined,
        svgRouteOutline,
        trackPoints,
        elevationProfile
      });

      showToast({
        title: courseToEdit ? "Pálya frissítve" : "Új pálya mentve!",
        message: `${name} (${(distanceMeters / 1000).toFixed(2)} km)`,
        variant: "success"
      });

      onSaved?.(saved);
      onClose();
    } catch {
      showToast({ title: "Hiba pálya mentésekor", variant: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={courseToEdit ? "Pálya szerkesztése" : "Új pálya létrehozása"}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pb-6">
        {/* GPX / TCX file upload button */}
        <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-600 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                GPX vagy TCX fájl feltöltése
              </div>
              <div className="text-[11px] text-neutral-500">
                Automatikus táv, szint és nyomvonal generálás
              </div>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isParsing}
            onClick={() => fileInputRef.current?.click()}
          >
            {isParsing ? "Beolvasás..." : "Tallózás"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".gpx,.tcx"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {/* SVG Route Outline Preview if available */}
        {svgRouteOutline && (
          <div className="bg-neutral-900 rounded-xl p-3 flex flex-col items-center justify-center">
            <span className="text-[11px] font-semibold text-neutral-400 mb-1 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5" /> Generált útvonal körvonal (offline SVG)
            </span>
            <svg
              viewBox="0 0 240 160"
              className="w-full max-w-[280px] h-36 stroke-brand-primary fill-none"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={svgRouteOutline} />
            </svg>
          </div>
        )}

        {/* Name */}
        <div>
          <label className="text-xs font-semibold text-neutral-500 block mb-1">Pálya neve</label>
          <Input
            placeholder="Pl. Margitszigeti futókör, Normafa csúcsfutás"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        {/* Sport */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-neutral-500 block mb-1">Sportág</label>
            <select
              value={sportId}
              onChange={(e) => setSportId(e.target.value)}
              className="w-full text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-neutral-900 dark:text-neutral-100"
            >
              {SPORT_CATALOG.slice(0, 20).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nameHu}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-500 block mb-1">Helyszín</label>
            <Input
              placeholder="Pl. Budapest, Margitsziget"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </div>

        {/* Distance & Elevation Gain */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-neutral-500 flex items-center gap-1 mb-1">
              <MapPin className="w-3 h-3" /> Távolság (méter)
            </label>
            <NumberInput
              value={distanceMeters}
              onChange={(val) => setDistanceMeters(val || 0)}
              min={10}
              step={100}
            />
            <span className="text-[11px] text-neutral-400 mt-0.5 block">
              = {(distanceMeters / 1000).toFixed(2)} km
            </span>
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-500 flex items-center gap-1 mb-1">
              <TrendingUp className="w-3 h-3" /> Szintemelkedés (m)
            </label>
            <NumberInput
              value={elevationGainMeters}
              onChange={(val) => setElevationGainMeters(val || 0)}
              min={0}
              step={5}
            />
          </div>
        </div>

        {/* Surface & Notes */}
        <div>
          <label className="text-xs font-semibold text-neutral-500 block mb-1">Felszín típusa</label>
          <Input
            placeholder="Pl. Rekortán, Aszfalt, Erdei terep, Murva"
            value={surface}
            onChange={(e) => setSurface(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-neutral-500 block mb-1">Megjegyzés</label>
          <Input
            placeholder="Pl. Vízvételi lehetőség a sziget közepén"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Mégse
          </Button>
          <Button type="submit" variant="primary" className="flex-1" disabled={isSaving}>
            {isSaving ? "Mentés..." : courseToEdit ? "Frissítés" : "Pálya mentése"}
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
};
