import React, { useState, useEffect } from "react";
import { BottomSheet, Button, Input, NumberInput, Chip, showToast } from "@shared/ui";
import { EquipmentItem, EquipmentType, MaintenanceMode, MaintenanceTask } from "@shared/types/equipment";
import { EQUIPMENT_TYPES, saveEquipmentItem } from "@shared/lib/equipment";
import { SPORT_CATALOG } from "@shared/lib/sports/catalog";
import { format } from "date-fns";
import { Plus, Trash2, Wrench, Image as ImageIcon } from "lucide-react";

interface EquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  athleteId: string;
  itemToEdit?: EquipmentItem | null;
  onSaved?: (item: EquipmentItem) => void;
}

export const EquipmentModal: React.FC<EquipmentModalProps> = ({
  isOpen,
  onClose,
  athleteId,
  itemToEdit,
  onSaved
}) => {
  const [name, setName] = useState("");
  const [type, setType] = useState<EquipmentType>("shoes");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [startingUsageKm, setStartingUsageKm] = useState(0);
  const [startingUsageHours, setStartingUsageHours] = useState(0);
  const [selectedSportIds, setSelectedSportIds] = useState<string[]>(["running"]);
  const [status, setStatus] = useState<"active" | "retired">("active");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Maintenance tasks
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskMode, setNewTaskMode] = useState<MaintenanceMode>("distance");
  const [newTaskInterval, setNewTaskInterval] = useState(500);

  useEffect(() => {
    if (!isOpen) return;
    if (itemToEdit) {
      setName(itemToEdit.name);
      setType(itemToEdit.type);
      setBrand(itemToEdit.brand);
      setModel(itemToEdit.model || "");
      setImageUrl(itemToEdit.imageUrl || "");
      setPurchaseDate(itemToEdit.purchaseDate);
      setStartingUsageKm(itemToEdit.startingUsageKm);
      setStartingUsageHours(itemToEdit.startingUsageHours);
      setSelectedSportIds(itemToEdit.sportIds || []);
      setStatus(itemToEdit.status);
      setNotes(itemToEdit.notes || "");
      setTasks(itemToEdit.maintenanceTasks || []);
    } else {
      setName("");
      setType("shoes");
      setBrand("");
      setModel("");
      setImageUrl("");
      setPurchaseDate(format(new Date(), "yyyy-MM-dd"));
      setStartingUsageKm(0);
      setStartingUsageHours(0);
      setSelectedSportIds(["running"]);
      setStatus("active");
      setNotes("");
      setTasks([
        {
          id: `task_default_${Date.now()}`,
          name: "Cipőcsere ajánlott",
          mode: "distance",
          intervalValue: 800,
          lastResetDate: format(new Date(), "yyyy-MM-dd"),
          lastResetUsageKm: 0,
          currentUsageSinceReset: 0,
          remaining: 800,
          remainingPercent: 100,
          status: "ok"
        }
      ]);
    }
    setNewTaskName("");
  }, [isOpen, itemToEdit]);

  const toggleSport = (sportId: string) => {
    setSelectedSportIds((prev) =>
      prev.includes(sportId) ? prev.filter((id) => id !== sportId) : [...prev, sportId]
    );
  };

  const handleAddTask = () => {
    if (!newTaskName.trim()) {
      showToast({ title: "Hiányzó feladatnév", variant: "warning" });
      return;
    }
    const newTask: MaintenanceTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newTaskName.trim(),
      mode: newTaskMode,
      intervalValue: newTaskInterval,
      lastResetDate: purchaseDate,
      lastResetUsageKm: startingUsageKm,
      currentUsageSinceReset: 0,
      remaining: newTaskInterval,
      remainingPercent: 100,
      status: "ok"
    };
    setTasks([...tasks, newTask]);
    setNewTaskName("");
  };

  const handleRemoveTask = (taskId: string) => {
    setTasks(tasks.filter((t) => t.id !== taskId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast({ title: "Hiányzó név", message: "Kérlek add meg az eszköz nevét!", variant: "warning" });
      return;
    }

    if (imageUrl && !imageUrl.startsWith("https://")) {
      showToast({ title: "Érvénytelen kép link", message: "A képlinknek https:// URL-nek kell lennie.", variant: "warning" });
      return;
    }

    setIsSaving(true);
    try {
      const saved = await saveEquipmentItem(athleteId, {
        id: itemToEdit ? itemToEdit.id : undefined,
        name: name.trim(),
        type,
        brand: brand.trim(),
        model: model.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        purchaseDate,
        startingUsageKm,
        startingUsageHours,
        sportIds: selectedSportIds,
        status,
        notes: notes.trim() || undefined,
        totalKm: itemToEdit ? itemToEdit.totalKm : startingUsageKm,
        totalHours: itemToEdit ? itemToEdit.totalHours : startingUsageHours,
        maintenanceTasks: tasks,
        maintenanceHistory: itemToEdit ? itemToEdit.maintenanceHistory : []
      });

      showToast({
        title: itemToEdit ? "Eszköz frissítve" : "Új eszköz elmentve!",
        message: `${name} (${brand})`,
        variant: "success"
      });

      onSaved?.(saved);
      onClose();
    } catch {
      showToast({ title: "Hiba mentéskor", variant: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={itemToEdit ? "Eszköz szerkesztése" : "Új eszköz hozzáadása"}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pb-6">
        {/* Type selection */}
        <div>
          <label className="text-xs font-semibold text-neutral-500 block mb-1">Eszköz típusa</label>
          <div className="flex flex-wrap gap-1.5">
            {EQUIPMENT_TYPES.map((t) => (
              <Chip
                key={t.id}
                selected={type === t.id}
                onClick={() => setType(t.id)}
                size="sm"
              >
                {t.icon} {t.nameHu}
              </Chip>
            ))}
          </div>
        </div>

        {/* Name, Brand, Model */}
        <div>
          <label className="text-xs font-semibold text-neutral-500 block mb-1">Eszköz megnevezése</label>
          <Input
            placeholder="Pl. Nike Vaporfly 3, Trek Emonda SL6"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-neutral-500 block mb-1">Márka</label>
            <Input
              placeholder="Pl. Nike, Trek, Garmin"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-500 block mb-1">Modell / Évjárat</label>
            <Input
              placeholder="Pl. 2024"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </div>
        </div>

        {/* Image URL preview */}
        <div>
          <label className="text-xs font-semibold text-neutral-500 flex items-center gap-1 mb-1">
            <ImageIcon className="w-3 h-3" /> Kép linkje (opcionális HTTPS URL)
          </label>
          <Input
            placeholder="https://..."
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
          {imageUrl && (
            <div className="mt-2 flex items-center gap-2 p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <img
                src={imageUrl}
                alt="Előnézet"
                className="w-12 h-12 object-cover rounded-md border border-neutral-200"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
              <span className="text-xs text-neutral-500">Kép előnézet</span>
            </div>
          )}
        </div>

        {/* Purchase Date & Initial Usages */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-neutral-500 block mb-1">Beszerzés dátuma</label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-600 bg-transparent px-2 py-2"
              required
            />
          </div>
          <div>
            <label className="text-xs text-neutral-500 block mb-1">Kezdő km</label>
            <NumberInput
              value={startingUsageKm}
              onChange={(val) => setStartingUsageKm(val || 0)}
              min={0}
              step={10}
            />
          </div>
          <div>
            <label className="text-xs text-neutral-500 block mb-1">Kezdő óra</label>
            <NumberInput
              value={startingUsageHours}
              onChange={(val) => setStartingUsageHours(val || 0)}
              min={0}
              step={1}
            />
          </div>
        </div>

        {/* Applicable Sports */}
        <div>
          <label className="text-xs font-semibold text-neutral-500 block mb-1">
            Hozzárendelt sportágak
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
            {SPORT_CATALOG.slice(0, 15).map((s) => (
              <Chip
                key={s.id}
                selected={selectedSportIds.includes(s.id)}
                onClick={() => toggleSport(s.id)}
                size="sm"
              >
                {s.nameHu}
              </Chip>
            ))}
          </div>
        </div>

        {/* Maintenance Tasks section */}
        <div className="bg-neutral-50 dark:bg-neutral-800/60 rounded-xl p-3.5 border border-neutral-200 dark:border-neutral-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-brand-primary" />
              Karbantartási intervallumok
            </span>
          </div>

          {tasks.length > 0 && (
            <div className="space-y-1.5">
              {tasks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-xs"
                >
                  <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate">
                    {t.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500 font-mono">
                      {t.intervalValue} {t.mode === "distance" ? "km" : "nap"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTask(t.id)}
                      className="text-neutral-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add task inline */}
          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Pl. Lánc kenése, Cipőcsere"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
              />
              <div className="flex gap-1.5">
                <NumberInput
                  value={newTaskInterval}
                  onChange={(val) => setNewTaskInterval(val || 100)}
                  min={1}
                />
                <select
                  value={newTaskMode}
                  onChange={(e) => setNewTaskMode(e.target.value as MaintenanceMode)}
                  className="text-xs rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-2"
                >
                  <option value="distance">km</option>
                  <option value="time">nap</option>
                </select>
              </div>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={handleAddTask}>
              <Plus className="w-3 h-3 mr-1" /> Intervallum hozzáadása
            </Button>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-neutral-500">Állapot</label>
          <div className="flex gap-2">
            <Chip
              selected={status === "active"}
              onClick={() => setStatus("active")}
              size="sm"
            >
              Aktív használatban
            </Chip>
            <Chip
              selected={status === "retired"}
              onClick={() => setStatus("retired")}
              size="sm"
            >
              Nyugdíjazva
            </Chip>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Mégse
          </Button>
          <Button type="submit" variant="primary" className="flex-1" disabled={isSaving}>
            {isSaving ? "Mentés..." : itemToEdit ? "Frissítés" : "Eszköz mentése"}
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
};
