import React, { useState } from "react";
import {
  TrainingBlock,
  TrainingBlockRow,
  TrainingBlockType,
  RoundOverride
} from "@shared/types/training";
import { NormalizedLap, NormalizedStrengthSet } from "@shared/types/devices";
import { SessionTimeSeriesPoint } from "@shared/types/dataModel";
import { Button, Badge, showToast } from "@shared/ui";
import {
  formatDurationMmSs,
  parseDurationMmSs,
  suggestNextBlockType,
  getBlockTitle,
  getBlockHeaderSummary,
  calculateRowVolume,
  calculateBlockVolume,
  calculateSessionTonnage,
  calculateEstimatedDurationMinutes,
  deriveBlocksFromLaps,
  deriveBlocksFromStrengthSets,
  STANDARD_BLOCK_TYPES,
  QUICK_REST_DURATIONS
} from "@shared/lib/blocks";
import { ExercisePickerModal } from "../ExercisePickerModal";
import { saveExercise, ExerciseDocument } from "@shared/lib/exercises";
import {
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Dumbbell,
  Activity,
  Timer,
  Clock,
  Bookmark,
  Layers,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Zap
} from "lucide-react";

interface TrainingBlockListProps {
  blocks: TrainingBlock[];
  onChange: (blocks: TrainingBlock[]) => void;
  athleteId: string;
  isCompletedSession?: boolean;
  onCopyLastSessionBlocks?: () => void;
  hasLastSession?: boolean;
  laps?: NormalizedLap[];
  strengthSets?: NormalizedStrengthSet[];
  onOpenTimer?: (block: TrainingBlock) => void;
  timeSeriesPoints?: SessionTimeSeriesPoint[];
  sport?: string;
}

export const TrainingBlockList: React.FC<TrainingBlockListProps> = ({
  blocks = [],
  onChange,
  athleteId,
  isCompletedSession = false,
  onCopyLastSessionBlocks,
  hasLastSession = false,
  laps,
  strengthSets,
  onOpenTimer
}) => {
  const [expandedBlockIds, setExpandedBlockIds] = useState<Set<string>>(() => {
    // If only 1 or 2 blocks exist, expand them initially; otherwise collapsed
    return new Set(blocks.slice(0, 2).map((b) => b.id));
  });

  const [expandedRoundRowIds, setExpandedRoundRowIds] = useState<Set<string>>(new Set());
  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false);
  const [activeRowForPicker, setActiveRowForPicker] = useState<{ blockId: string; rowId: string } | null>(null);
  const [deletingBlockId, setDeletingBlockId] = useState<string | null>(null);

  const toggleBlockExpanded = (id: string) => {
    setExpandedBlockIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleRoundRowExpanded = (rowId: string) => {
    setExpandedRoundRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  // Add a new block with automatically suggested type
  const handleAddBlock = () => {
    const nextType = suggestNextBlockType(blocks);
    const newBlock: TrainingBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: nextType,
      order: blocks.length + 1,
      rounds: 1,
      completedRounds: 1,
      restBetweenRoundsSeconds: nextType === "warmup" || nextType === "cooldown" ? undefined : 60,
      restAfterBlockSeconds: nextType === "warmup" ? 120 : nextType === "cooldown" ? undefined : 120,
      rows: [
        {
          id: `row-${Date.now()}-1`,
          type: nextType === "warmup" || nextType === "cooldown" ? "endurance" : "exercise",
          sets: 1,
          reps: 8,
          loadKg: 0,
          completed: true
        }
      ]
    };
    const nextBlocks = [...blocks, newBlock];
    onChange(nextBlocks);
    setExpandedBlockIds((prev) => new Set(prev).add(newBlock.id));
  };

  // Duplicate an existing block
  const handleDuplicateBlock = (blockId: string) => {
    const target = blocks.find((b) => b.id === blockId);
    if (!target) return;

    const duplicated: TrainingBlock = {
      ...target,
      id: `block-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      order: blocks.length + 1,
      rows: (target.rows || []).map((r) => ({
        ...r,
        id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        roundOverrides: r.roundOverrides ? r.roundOverrides.map((o) => ({ ...o })) : undefined
      }))
    };

    const nextBlocks = [...blocks, duplicated];
    onChange(nextBlocks);
    setExpandedBlockIds((prev) => new Set(prev).add(duplicated.id));
    showToast({
      title: "Blokk duplikálva",
      message: `${getBlockTitle(target)} sikeresen másolva.`,
      variant: "success"
    });
  };

  // Move block up or down
  const handleMoveBlock = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;

    const reordered = [...blocks];
    const temp = reordered[index]!;
    reordered[index] = reordered[targetIndex]!;
    reordered[targetIndex] = temp;

    // Update order numbers
    const updated = reordered.map((b, idx) => ({ ...b, order: idx + 1 }));
    onChange(updated);
  };

  // Delete block
  const handleDeleteBlock = (blockId: string) => {
    const filtered = blocks.filter((b) => b.id !== blockId);
    const updated = filtered.map((b, idx) => ({ ...b, order: idx + 1 }));
    onChange(updated);
    setDeletingBlockId(null);
  };

  // Update block properties
  const handleUpdateBlock = (blockId: string, patch: Partial<TrainingBlock>) => {
    const updated = blocks.map((b) => {
      if (b.id === blockId) {
        return { ...b, ...patch };
      }
      return b;
    });
    onChange(updated);
  };

  // Add row to block
  const handleAddRow = (blockId: string, rowType: "exercise" | "endurance") => {
    const updated = blocks.map((b) => {
      if (b.id === blockId) {
        const rows = b.rows || [];
        const groupCode = b.type !== "warmup" && b.type !== "cooldown" && b.type !== "other"
          ? `${b.type}${rows.length + 1}`
          : undefined;

        const newRow: TrainingBlockRow = {
          id: `row-${Date.now()}-${rows.length + 1}`,
          type: rowType,
          groupCode,
          exerciseName: rowType === "exercise" ? "" : undefined,
          sets: 1,
          reps: rowType === "exercise" ? 8 : undefined,
          loadKg: rowType === "exercise" ? 0 : undefined,
          durationSeconds: rowType === "endurance" ? 300 : undefined,
          completed: true
        };
        return { ...b, rows: [...rows, newRow] };
      }
      return b;
    });
    onChange(updated);
  };

  // Update a row in a block
  const handleUpdateRow = (
    blockId: string,
    rowId: string,
    patch: Partial<TrainingBlockRow>
  ) => {
    const updated = blocks.map((b) => {
      if (b.id === blockId) {
        const rows = (b.rows || []).map((r) => {
          if (r.id === rowId) {
            return { ...r, ...patch };
          }
          return r;
        });
        return { ...b, rows };
      }
      return b;
    });
    onChange(updated);
  };

  // Delete row
  const handleDeleteRow = (blockId: string, rowId: string) => {
    const updated = blocks.map((b) => {
      if (b.id === blockId) {
        return { ...b, rows: (b.rows || []).filter((r) => r.id !== rowId) };
      }
      return b;
    });
    onChange(updated);
  };

  // Per-round override update (Körönkénti eltérés)
  const handleUpdateRoundOverride = (
    blockId: string,
    rowId: string,
    roundNumber: number,
    patch: Partial<RoundOverride>
  ) => {
    const updated = blocks.map((b) => {
      if (b.id === blockId) {
        const rows = (b.rows || []).map((r) => {
          if (r.id === rowId) {
            const rounds = b.rounds || 1;
            const existingOverrides: RoundOverride[] = r.roundOverrides && r.roundOverrides.length > 0
              ? [...r.roundOverrides]
              : Array.from({ length: rounds }, (_, i) => ({
                  roundNumber: i + 1,
                  reps: r.reps,
                  loadKg: r.loadKg,
                  rpe: r.rpe,
                  completed: true
                }));

            const targetIdx = existingOverrides.findIndex((o) => o.roundNumber === roundNumber);
            if (targetIdx >= 0) {
              existingOverrides[targetIdx] = { ...existingOverrides[targetIdx]!, ...patch };
            } else {
              existingOverrides.push({ roundNumber, reps: r.reps, loadKg: r.loadKg, ...patch });
            }

            return { ...r, roundOverrides: existingOverrides };
          }
          return r;
        });
        return { ...b, rows };
      }
      return b;
    });
    onChange(updated);
  };

  // Save freehand exercise to library
  const handleSaveToLibrary = async (name?: string) => {
    if (!name || !name.trim()) return;
    try {
      await saveExercise(athleteId, {
        name: name.trim(),
        tags: ["egyéni"],
        isFavorite: false
      });
      showToast({
        title: "Gyakorlat elmentve",
        message: `"${name}" hozzáadva a gyakorlatkönyvtárhoz.`,
        variant: "success"
      });
    } catch {
      showToast({
        title: "Mentési hiba",
        message: "Nem sikerült elmenteni a gyakorlatot.",
        variant: "error"
      });
    }
  };

  // Convert laps into blocks
  const handleConvertLaps = () => {
    if (!laps || laps.length === 0) return;
    const derived = deriveBlocksFromLaps(laps);
    onChange(derived);
    setExpandedBlockIds(new Set(derived.map((b) => b.id)));
    showToast({
      title: "Körök blokkokká alakítva",
      message: `${laps.length} kör sikeresen átalakítva edzésblokkokká.`,
      variant: "success"
    });
  };

  // Convert strength sets into blocks
  const handleConvertStrengthSets = () => {
    if (!strengthSets || strengthSets.length === 0) return;
    const derived = deriveBlocksFromStrengthSets(strengthSets);
    onChange(derived);
    setExpandedBlockIds(new Set(derived.map((b) => b.id)));
    showToast({
      title: "Sorozatok blokkokká alakítva",
      message: `${strengthSets.length} sorozat sikeresen csoportosítva és blokkokká alakítva.`,
      variant: "success"
    });
  };

  const sessionTonnage = calculateSessionTonnage(blocks);
  const estimatedMin = calculateEstimatedDurationMinutes(blocks);

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-bg-surface/80 border border-border-hairline">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-brand-primary" />
          <span className="text-13 font-semibold text-text-primary">
            Edzésblokkok {blocks.length > 0 && `(${blocks.length})`}
          </span>

          {sessionTonnage.totalTonnageKg > 0 && (
            <Badge variant="brand" size="sm">
              <Dumbbell className="w-3 h-3 mr-1" />
              {sessionTonnage.totalTonnageKg.toLocaleString()} kg összsúly
            </Badge>
          )}

          {estimatedMin > 0 && (
            <Badge variant="outline" size="sm" className="hidden sm:inline-flex">
              <Clock className="w-3 h-3 mr-1" />
              becsült: {estimatedMin} perc
            </Badge>
          )}
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {hasLastSession && onCopyLastSessionBlocks && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCopyLastSessionBlocks}
              leftIcon={<Copy className="w-3.5 h-3.5" />}
            >
              Előző edzés másolása
            </Button>
          )}

          {laps && laps.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleConvertLaps}
              leftIcon={<Sparkles className="w-3.5 h-3.5 text-brand-primary" />}
            >
              Körök blokkokká alakítása ({laps.length})
            </Button>
          )}

          {strengthSets && strengthSets.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleConvertStrengthSets}
              leftIcon={<Zap className="w-3.5 h-3.5 text-amber-400" />}
            >
              Sorozatok blokkokká ({strengthSets.length})
            </Button>
          )}

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleAddBlock}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            + Blokk
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {blocks.length === 0 && (
        <div className="text-center py-6 px-4 rounded-xl border border-dashed border-border-hairline text-text-secondary text-xs space-y-2">
          <p>Még nem adtál hozzá blokkokat ehhez az edzéshez.</p>
          <p className="text-[11px] text-text-tertiary">
            A blokkok opcionálisak. Kattints a <strong>+ Blokk</strong> gombra a körök, szuperszettek és pihenők rögzítéséhez!
          </p>
        </div>
      )}

      {/* Blocks List */}
      <div className="space-y-3">
        {blocks.map((block, index) => {
          const isExpanded = expandedBlockIds.has(block.id);
          const blockSummary = getBlockHeaderSummary(block, true);
          const blockVol = calculateBlockVolume(block);
          const isDeleting = deletingBlockId === block.id;

          return (
            <div
              key={block.id}
              className="rounded-xl bg-bg-surface border border-border-hairline overflow-hidden transition-all duration-200"
            >
              {/* BLOCK HEADER */}
              <div className="p-3 bg-neutral-900/60 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {/* Reorder Buttons */}
                  <div className="flex flex-col sm:flex-row items-center gap-0.5 text-text-tertiary">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveBlock(index, "up")}
                      className="p-1 hover:text-text-primary disabled:opacity-20 transition-colors"
                      title="Mozgatás feljebb"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === blocks.length - 1}
                      onClick={() => handleMoveBlock(index, "down")}
                      className="p-1 hover:text-text-primary disabled:opacity-20 transition-colors"
                      title="Mozgatás lejjebb"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Block Type Picker */}
                  <select
                    value={block.type}
                    onChange={(e) =>
                      handleUpdateBlock(block.id, { type: e.target.value as TrainingBlockType })
                    }
                    className="bg-bg-elevated text-xs font-semibold text-text-primary border border-border-hairline rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  >
                    {STANDARD_BLOCK_TYPES.map((bt) => (
                      <option key={bt.id} value={bt.id}>
                        {bt.nameHu}
                      </option>
                    ))}
                  </select>

                  {/* Custom Name for "other" type */}
                  {block.type === "other" && (
                    <input
                      type="text"
                      placeholder="Blokk neve (pl. Törzsizomzat)"
                      value={block.customTypeName || ""}
                      onChange={(e) => handleUpdateBlock(block.id, { customTypeName: e.target.value })}
                      className="w-36 bg-bg-elevated text-xs text-text-primary border border-border-hairline rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    />
                  )}

                  {/* Optional Block Label */}
                  <input
                    type="text"
                    placeholder="Opcionális címke (pl. Guggolás)"
                    value={block.label || ""}
                    onChange={(e) => handleUpdateBlock(block.id, { label: e.target.value })}
                    className="hidden md:inline-block w-40 bg-transparent text-xs text-text-secondary placeholder:text-text-tertiary border-b border-dashed border-border-subtle px-1 py-0.5 focus:outline-none focus:border-brand-primary"
                  />

                  {/* One-Line Summary Badge */}
                  <span className="text-[11px] text-text-secondary hidden lg:inline-block truncate">
                    {blockSummary}
                  </span>
                </div>

                {/* Compact Rounds & Rest Fields in Header */}
                <div className="flex items-center flex-wrap gap-2 text-xs">
                  {/* Rounds */}
                  <div className="flex items-center gap-1 bg-bg-elevated/70 border border-border-subtle rounded-lg px-2 py-1">
                    <span className="text-[10px] text-text-secondary uppercase">Körök:</span>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={block.rounds || 1}
                      onChange={(e) =>
                        handleUpdateBlock(block.id, {
                          rounds: Math.max(1, parseInt(e.target.value, 10) || 1)
                        })
                      }
                      className="w-10 bg-transparent text-center font-bold text-xs text-text-primary focus:outline-none"
                    />
                  </div>

                  {/* Completed Rounds in Completed Session mode */}
                  {isCompletedSession && (
                    <div className="flex items-center gap-1 bg-emerald-950/40 border border-emerald-800/40 rounded-lg px-2 py-1 text-emerald-400">
                      <span className="text-[10px] uppercase">Kész:</span>
                      <input
                        type="number"
                        min={0}
                        max={block.rounds || 99}
                        value={block.completedRounds !== undefined ? block.completedRounds : block.rounds || 1}
                        onChange={(e) =>
                          handleUpdateBlock(block.id, {
                            completedRounds: Math.max(0, parseInt(e.target.value, 10) || 0)
                          })
                        }
                        className="w-10 bg-transparent text-center font-bold text-xs text-emerald-300 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Rest between rounds */}
                  <div className="flex items-center gap-1 bg-bg-elevated/70 border border-border-subtle rounded-lg px-2 py-1">
                    <span className="text-[10px] text-text-secondary uppercase">Kör pihi:</span>
                    <input
                      type="text"
                      placeholder="pl. 1:00"
                      value={formatDurationMmSs(block.restBetweenRoundsSeconds)}
                      onChange={(e) =>
                        handleUpdateBlock(block.id, {
                          restBetweenRoundsSeconds: parseDurationMmSs(e.target.value)
                        })
                      }
                      className="w-12 bg-transparent text-center text-xs text-text-primary focus:outline-none font-mono"
                    />
                  </div>

                  {/* Rest after block */}
                  <div className="flex items-center gap-1 bg-bg-elevated/70 border border-border-subtle rounded-lg px-2 py-1">
                    <span className="text-[10px] text-text-secondary uppercase">Utána:</span>
                    <input
                      type="text"
                      placeholder="pl. 2:00"
                      value={formatDurationMmSs(block.restAfterBlockSeconds)}
                      onChange={(e) =>
                        handleUpdateBlock(block.id, {
                          restAfterBlockSeconds: parseDurationMmSs(e.target.value)
                        })
                      }
                      className="w-12 bg-transparent text-center text-xs text-text-primary focus:outline-none font-mono"
                    />
                  </div>

                  {/* Header Actions */}
                  {onOpenTimer && (
                    <button
                      type="button"
                      onClick={() => onOpenTimer(block)}
                      className="p-1.5 text-text-secondary hover:text-brand-primary rounded-lg hover:bg-neutral-800 transition-colors"
                      title="Pihenő időzítő indítása"
                    >
                      <Timer className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDuplicateBlock(block.id)}
                    className="p-1.5 text-text-secondary hover:text-text-primary rounded-lg hover:bg-neutral-800 transition-colors"
                    title="Blokk másolása"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  {isDeleting ? (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        onClick={() => handleDeleteBlock(block.id)}
                      >
                        Törlés
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => setDeletingBlockId(null)}
                      >
                        Mégse
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeletingBlockId(block.id)}
                      className="p-1.5 text-text-tertiary hover:text-status-danger rounded-lg hover:bg-neutral-800 transition-colors"
                      title="Blokk törlése"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Toggle expand/collapse */}
                  <button
                    type="button"
                    onClick={() => toggleBlockExpanded(block.id)}
                    className="p-1.5 text-text-secondary hover:text-text-primary rounded-lg hover:bg-neutral-800 transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Quick Rest Preset Chips in Subheader */}
              <div className="px-3 py-1.5 bg-neutral-950/40 border-b border-border-subtle flex flex-wrap items-center gap-1.5 text-[11px] text-text-tertiary">
                <span className="text-[10px] uppercase font-mono">Gyors pihenők:</span>
                <span className="text-[10px]">Körök közt:</span>
                {QUICK_REST_DURATIONS.map((sec) => (
                  <button
                    key={`br-${sec}`}
                    type="button"
                    onClick={() => handleUpdateBlock(block.id, { restBetweenRoundsSeconds: sec })}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                      block.restBetweenRoundsSeconds === sec
                        ? "border-brand-primary bg-brand-primary/20 text-brand-primary font-bold"
                        : "border-border-subtle bg-bg-surface hover:text-text-primary"
                    }`}
                  >
                    {formatDurationMmSs(sec)}
                  </button>
                ))}

                <span className="text-[10px] ml-2">Blokk után:</span>
                {QUICK_REST_DURATIONS.map((sec) => (
                  <button
                    key={`ba-${sec}`}
                    type="button"
                    onClick={() => handleUpdateBlock(block.id, { restAfterBlockSeconds: sec })}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                      block.restAfterBlockSeconds === sec
                        ? "border-blue-500 bg-blue-500/20 text-blue-400 font-bold"
                        : "border-border-subtle bg-bg-surface hover:text-text-primary"
                    }`}
                  >
                    {formatDurationMmSs(sec)}
                  </button>
                ))}
              </div>

              {/* BLOCK BODY (COLLAPSIBLE) */}
              {isExpanded && (
                <div className="p-3 space-y-3">
                  {/* Rows List */}
                  <div className="space-y-2">
                    {(block.rows || []).map((row) => {
                      const isRoundExpanded = expandedRoundRowIds.has(row.id);
                      const rowVol = calculateRowVolume(row, block.rounds || 1);
                      const roundsCount = block.rounds && block.rounds > 0 ? block.rounds : 1;

                      return (
                        <div
                          key={row.id}
                          className="p-2.5 rounded-lg bg-bg-elevated/40 border border-border-subtle space-y-2"
                        >
                          {/* Row Primary Line */}
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              {/* Row Group Code (A1, A2...) */}
                              <input
                                type="text"
                                placeholder="A1"
                                value={row.groupCode || ""}
                                onChange={(e) =>
                                  handleUpdateRow(block.id, row.id, { groupCode: e.target.value })
                                }
                                className="w-10 bg-bg-surface text-center font-bold font-mono text-[11px] text-text-secondary border border-border-subtle rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-brand-primary"
                                title="Szuperszett / kör csoportkód (pl. A1, A2)"
                              />

                              {/* Row Type Indicator Toggle */}
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateRow(block.id, row.id, {
                                    type: row.type === "exercise" ? "endurance" : "exercise"
                                  })
                                }
                                className={`px-2 py-1 rounded text-[10px] font-semibold flex items-center gap-1 border transition-colors ${
                                  row.type === "exercise"
                                    ? "bg-amber-950/30 text-amber-400 border-amber-800/40"
                                    : "bg-cyan-950/30 text-cyan-400 border-cyan-800/40"
                                }`}
                              >
                                {row.type === "exercise" ? (
                                  <>
                                    <Dumbbell className="w-3 h-3" />
                                    Kondi
                                  </>
                                ) : (
                                  <>
                                    <Activity className="w-3 h-3" />
                                    Szakasz
                                  </>
                                )}
                              </button>

                              {/* Exercise Name with Library Picker */}
                              {row.type === "exercise" ? (
                                <div className="flex items-center gap-1 flex-1 min-w-36">
                                  <input
                                    type="text"
                                    placeholder="Gyakorlat neve (pl. Guggolás)"
                                    value={row.exerciseName || ""}
                                    onChange={(e) =>
                                      handleUpdateRow(block.id, row.id, { exerciseName: e.target.value })
                                    }
                                    className="flex-1 bg-bg-surface text-xs text-text-primary border border-border-hairline rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-primary"
                                  />
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setActiveRowForPicker({ blockId: block.id, rowId: row.id });
                                      setIsExercisePickerOpen(true);
                                    }}
                                    title="Választás a gyakorlattárból"
                                  >
                                    Könyvtár
                                  </Button>
                                  {row.exerciseName?.trim() && (
                                    <button
                                      type="button"
                                      onClick={() => handleSaveToLibrary(row.exerciseName)}
                                      className="p-1 text-text-tertiary hover:text-brand-primary transition-colors"
                                      title="Mentés a könyvtárba"
                                    >
                                      <Bookmark className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              ) : (
                                /* Endurance Target / Label */
                                <input
                                  type="text"
                                  placeholder="Szakasz cél (pl. Z4 küszöb vagy 400m tempó)"
                                  value={row.target || ""}
                                  onChange={(e) =>
                                    handleUpdateRow(block.id, row.id, { target: e.target.value })
                                  }
                                  className="flex-1 bg-bg-surface text-xs text-text-primary border border-border-hairline rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-primary min-w-36"
                                />
                              )}
                            </div>

                            {/* Numbers Inputs */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {row.type === "exercise" ? (
                                <>
                                  {/* Sets */}
                                  <div className="flex items-center gap-0.5 bg-bg-surface border border-border-hairline rounded px-1.5 py-0.5">
                                    <span className="text-[10px] text-text-tertiary">sor:</span>
                                    <input
                                      type="number"
                                      min={1}
                                      value={row.sets || 1}
                                      onChange={(e) =>
                                        handleUpdateRow(block.id, row.id, {
                                          sets: Math.max(1, parseInt(e.target.value, 10) || 1)
                                        })
                                      }
                                      className="w-7 bg-transparent text-center font-bold text-xs text-text-primary focus:outline-none"
                                      title="Sorozatok száma körönként"
                                    />
                                  </div>

                                  {/* Reps */}
                                  <div className="flex items-center gap-0.5 bg-bg-surface border border-border-hairline rounded px-1.5 py-0.5">
                                    <span className="text-[10px] text-text-tertiary">rep:</span>
                                    <input
                                      type="number"
                                      min={1}
                                      value={row.reps || 8}
                                      onChange={(e) =>
                                        handleUpdateRow(block.id, row.id, {
                                          reps: Math.max(1, parseInt(e.target.value, 10) || 0)
                                        })
                                      }
                                      className="w-8 bg-transparent text-center font-bold text-xs text-text-primary focus:outline-none"
                                      title="Ismétlések"
                                    />
                                  </div>

                                  {/* Load (kg) */}
                                  <div className="flex items-center gap-0.5 bg-bg-surface border border-border-hairline rounded px-1.5 py-0.5">
                                    <span className="text-[10px] text-text-tertiary">kg:</span>
                                    <input
                                      type="number"
                                      step="0.5"
                                      min={0}
                                      value={row.loadKg || 0}
                                      onChange={(e) =>
                                        handleUpdateRow(block.id, row.id, {
                                          loadKg: Math.max(0, parseFloat(e.target.value) || 0)
                                        })
                                      }
                                      className="w-10 bg-transparent text-center font-bold text-xs text-text-primary focus:outline-none"
                                      title="Súly (kg)"
                                    />
                                  </div>

                                  {/* RPE */}
                                  <div className="flex items-center gap-0.5 bg-bg-surface border border-border-hairline rounded px-1.5 py-0.5">
                                    <span className="text-[10px] text-text-tertiary">rpe:</span>
                                    <input
                                      type="number"
                                      min={1}
                                      max={10}
                                      value={row.rpe || ""}
                                      onChange={(e) =>
                                        handleUpdateRow(block.id, row.id, {
                                          rpe: e.target.value ? parseInt(e.target.value, 10) : undefined
                                        })
                                      }
                                      className="w-6 bg-transparent text-center font-bold text-xs text-amber-300 focus:outline-none"
                                      placeholder="-"
                                      title="Megerőltetés (1-10)"
                                    />
                                  </div>

                                  {/* Rest between sets */}
                                  <div className="flex items-center gap-0.5 bg-bg-surface border border-border-hairline rounded px-1.5 py-0.5">
                                    <span className="text-[10px] text-text-tertiary">pihi:</span>
                                    <input
                                      type="text"
                                      placeholder="0:00"
                                      value={formatDurationMmSs(row.restBetweenSetsSeconds)}
                                      onChange={(e) =>
                                        handleUpdateRow(block.id, row.id, {
                                          restBetweenSetsSeconds: parseDurationMmSs(e.target.value)
                                        })
                                      }
                                      className="w-10 bg-transparent text-center text-xs text-text-primary focus:outline-none font-mono"
                                      title="Pihenőidő sorozatok között (mm:ss)"
                                    />
                                  </div>
                                </>
                              ) : (
                                <>
                                  {/* Duration */}
                                  <div className="flex items-center gap-0.5 bg-bg-surface border border-border-hairline rounded px-1.5 py-0.5">
                                    <span className="text-[10px] text-text-tertiary">idő:</span>
                                    <input
                                      type="text"
                                      placeholder="5:00"
                                      value={formatDurationMmSs(row.durationSeconds)}
                                      onChange={(e) =>
                                        handleUpdateRow(block.id, row.id, {
                                          durationSeconds: parseDurationMmSs(e.target.value)
                                        })
                                      }
                                      className="w-12 bg-transparent text-center text-xs text-text-primary focus:outline-none font-mono"
                                      title="Időtartam (mm:ss)"
                                    />
                                  </div>

                                  {/* Distance */}
                                  <div className="flex items-center gap-0.5 bg-bg-surface border border-border-hairline rounded px-1.5 py-0.5">
                                    <span className="text-[10px] text-text-tertiary">táv:</span>
                                    <input
                                      type="number"
                                      placeholder="m"
                                      value={row.distanceMeters || ""}
                                      onChange={(e) =>
                                        handleUpdateRow(block.id, row.id, {
                                          distanceMeters: e.target.value ? parseInt(e.target.value, 10) : undefined
                                        })
                                      }
                                      className="w-14 bg-transparent text-center text-xs text-text-primary focus:outline-none"
                                      title="Távolság (méter)"
                                    />
                                  </div>

                                  {/* Result */}
                                  <input
                                    type="text"
                                    placeholder="Eredmény (pl. 3:45 /km)"
                                    value={row.result || ""}
                                    onChange={(e) =>
                                      handleUpdateRow(block.id, row.id, { result: e.target.value })
                                    }
                                    className="w-24 bg-bg-surface text-xs text-text-primary border border-border-hairline rounded px-1.5 py-0.5 focus:outline-none font-mono"
                                    title="Mért eredmény"
                                  />
                                </>
                              )}

                              {/* Row Volume Badge */}
                              {rowVol.tonnageKg > 0 && (
                                <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                                  {rowVol.tonnageKg} kg
                                </Badge>
                              )}

                              {/* Round Variations Expander Toggle Button */}
                              {roundsCount > 1 && row.type === "exercise" && (
                                <button
                                  type="button"
                                  onClick={() => toggleRoundRowExpanded(row.id)}
                                  className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors flex items-center gap-0.5 ${
                                    isRoundExpanded || (row.roundOverrides && row.roundOverrides.length > 0)
                                      ? "border-brand-primary text-brand-primary bg-brand-primary/10 font-medium"
                                      : "border-border-subtle text-text-tertiary hover:text-text-primary"
                                  }`}
                                  title="Körönkénti eltérés beállítása"
                                >
                                  {isRoundExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                  Körönkénti eltérés
                                </button>
                              )}

                              {/* Delete Row Button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(block.id, row.id)}
                                className="p-1 text-text-tertiary hover:text-status-danger transition-colors"
                                title="Sor törlése"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* KÖRÖNKÉNTI ELTÉRÉS EXPANDER (ROUND OVERRIDES) */}
                          {isRoundExpanded && roundsCount > 1 && row.type === "exercise" && (
                            <div className="pt-2 border-t border-border-hairline/60 space-y-1.5">
                              <div className="text-[11px] font-medium text-text-secondary flex items-center justify-between">
                                <span>Körönkénti súly és ismétlés (tervezett vs tényleges):</span>
                                <span className="text-[10px] text-text-tertiary">
                                  Összesen {roundsCount} kör
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                                {Array.from({ length: roundsCount }, (_, rIdx) => {
                                  const rNum = rIdx + 1;
                                  const override = row.roundOverrides?.find((o) => o.roundNumber === rNum);
                                  const curReps = override?.reps !== undefined ? override.reps : row.reps || 8;
                                  const curLoad = override?.loadKg !== undefined ? override.loadKg : row.loadKg || 0;
                                  const isDone = override?.completed !== undefined ? override.completed : true;

                                  return (
                                    <div
                                      key={rNum}
                                      className={`p-2 rounded border text-xs flex items-center justify-between gap-1.5 ${
                                        isDone
                                          ? "bg-neutral-900/80 border-border-subtle"
                                          : "bg-neutral-950/40 border-border-hairline opacity-60"
                                      }`}
                                    >
                                      <span className="font-semibold text-text-secondary font-mono w-10">
                                        {rNum}. kör:
                                      </span>

                                      <div className="flex items-center gap-1">
                                        <input
                                          type="number"
                                          step="0.5"
                                          value={curLoad}
                                          onChange={(e) =>
                                            handleUpdateRoundOverride(block.id, row.id, rNum, {
                                              loadKg: parseFloat(e.target.value) || 0
                                            })
                                          }
                                          className="w-12 bg-bg-surface text-center font-bold text-xs text-text-primary border border-border-hairline rounded px-1 py-0.5 focus:outline-none"
                                          placeholder="kg"
                                          title="Súly (kg)"
                                        />
                                        <span className="text-[10px] text-text-tertiary">kg</span>

                                        <input
                                          type="number"
                                          value={curReps}
                                          onChange={(e) =>
                                            handleUpdateRoundOverride(block.id, row.id, rNum, {
                                              reps: parseInt(e.target.value, 10) || 0
                                            })
                                          }
                                          className="w-10 bg-bg-surface text-center font-bold text-xs text-text-primary border border-border-hairline rounded px-1 py-0.5 focus:outline-none"
                                          placeholder="rep"
                                          title="Ismétlés"
                                        />
                                        <span className="text-[10px] text-text-tertiary">x</span>
                                      </div>

                                      {/* Done checkbox */}
                                      <label className="flex items-center gap-1 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={isDone}
                                          onChange={(e) =>
                                            handleUpdateRoundOverride(block.id, row.id, rNum, {
                                              completed: e.target.checked
                                            })
                                          }
                                          className="rounded border-border-hairline text-brand-primary focus:ring-0"
                                        />
                                        <span className="text-[10px] text-text-tertiary">Kész</span>
                                      </label>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Row Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddRow(block.id, "exercise")}
                      leftIcon={<Plus className="w-3 h-3" />}
                    >
                      + Gyakorlat
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddRow(block.id, "endurance")}
                      leftIcon={<Plus className="w-3 h-3" />}
                    >
                      + Állóképességi szakasz
                    </Button>
                  </div>

                  {/* Block Notes and Footer Summary */}
                  <div className="pt-2 border-t border-border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <input
                      type="text"
                      placeholder="Blokk megjegyzés (pl. 'Koncentrálj a mély beülésre')..."
                      value={block.notes || ""}
                      onChange={(e) => handleUpdateBlock(block.id, { notes: e.target.value })}
                      className="flex-1 bg-transparent text-xs text-text-secondary placeholder:text-text-tertiary border-b border-border-subtle px-1 py-1 focus:outline-none focus:border-brand-primary"
                    />

                    {blockVol.tonnageKg > 0 && (
                      <div className="text-[11px] text-text-secondary font-mono">
                        Blokk összsúly: <strong className="text-text-primary">{blockVol.tonnageKg.toLocaleString()} kg</strong> ({blockVol.totalReps} ismétlés)
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Exercise Picker Modal */}
      <ExercisePickerModal
        isOpen={isExercisePickerOpen}
        onClose={() => {
          setIsExercisePickerOpen(false);
          setActiveRowForPicker(null);
        }}
        athleteId={athleteId}
        onSelectExercise={(exercise: ExerciseDocument) => {
          if (activeRowForPicker) {
            handleUpdateRow(activeRowForPicker.blockId, activeRowForPicker.rowId, {
              exerciseId: exercise.id,
              exerciseName: exercise.name
            });
          }
          setIsExercisePickerOpen(false);
          setActiveRowForPicker(null);
        }}
      />
    </div>
  );
};
