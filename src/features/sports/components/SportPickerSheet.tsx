import React, { useState, useMemo } from "react";
import {
  SPORT_CATALOG,
  SPORT_CATEGORIES,
  SportCategory,
  MetricProfile,
  SportDefinition,
  createCustomSport,
  getFavoriteSportIds,
  toggleFavoriteSport,
  getRecentSportIds,
  recordRecentSport
} from "@shared/lib/sports";
import { BottomSheet, Button, Input, Badge, showToast } from "@shared/ui";
import {
  Search,
  Star,
  Plus,
  Check,
  Clock,
  Dumbbell
} from "lucide-react";

interface SportPickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSportIds: string[];
  onToggleSport: (sportId: string) => void;
  mainSportId?: string;
  onSetMainSport?: (sportId: string) => void;
  userId?: string;
  customSports?: SportDefinition[];
  onCustomSportCreated?: (sport: SportDefinition) => void;
}

export const SportPickerSheet: React.FC<SportPickerSheetProps> = ({
  isOpen,
  onClose,
  selectedSportIds,
  onToggleSport,
  mainSportId,
  onSetMainSport,
  userId = "current-user",
  customSports = [],
  onCustomSportCreated
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<SportCategory | "all">("all");
  const [favorites, setFavorites] = useState<string[]>(() => getFavoriteSportIds(userId));
  const [showAddCustom, setShowAddCustom] = useState(false);

  // Custom sport form state
  const [newSportName, setNewSportName] = useState("");
  const [newSportCategory, setNewSportCategory] = useState<SportCategory>("endurance");
  const [newSportMetric, setNewSportMetric] = useState<MetricProfile>("distance_duration");
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);

  // Recents
  const recentIds = useMemo(() => {
    if (!isOpen) return [];
    return getRecentSportIds(userId);
  }, [userId, isOpen]);

  // Combined sport pool
  const allSports = useMemo(() => {
    return [...customSports, ...SPORT_CATALOG];
  }, [customSports]);

  // Filtered sports
  const filteredSports = useMemo(() => {
    let list = allSports;
    if (activeCategory !== "all") {
      list = list.filter((s) => s.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.nameHu.toLowerCase().includes(q) ||
          s.nameEn.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allSports, activeCategory, searchQuery]);

  // Favorite sports list
  const favoriteSports = useMemo(() => {
    return allSports.filter((s) => favorites.includes(s.id));
  }, [allSports, favorites]);

  // Recent sports list
  const recentSports = useMemo(() => {
    return recentIds
      .map((id) => allSports.find((s) => s.id === id))
      .filter((s): s is SportDefinition => !!s);
  }, [allSports, recentIds]);

  const handleToggleFavorite = (e: React.MouseEvent, sportId: string) => {
    e.stopPropagation();
    const updated = toggleFavoriteSport(userId, sportId);
    setFavorites(updated);
  };

  const handleSelectSport = (sport: SportDefinition) => {
    onToggleSport(sport.id);
    recordRecentSport(userId, sport.id);
    // If no main sport set yet and this is selected, set as main sport
    if (!mainSportId && onSetMainSport && !selectedSportIds.includes(sport.id)) {
      onSetMainSport(sport.id);
    }
  };

  const handleCreateCustomSport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSportName.trim()) {
      showToast({
        title: "Hiányzó megnevezés",
        message: "Kérjük add meg a sportág nevét.",
        type: "error"
      });
      return;
    }

    setIsSubmittingCustom(true);
    try {
      const created = await createCustomSport(userId, {
        nameHu: newSportName.trim(),
        nameEn: newSportName.trim(),
        category: newSportCategory,
        metricProfile: newSportMetric,
        icon: "⚡"
      });

      onCustomSportCreated?.(created);
      onToggleSport(created.id);
      if (!mainSportId && onSetMainSport) {
        onSetMainSport(created.id);
      }
      recordRecentSport(userId, created.id);

      showToast({
        title: "Egyedi sportág létrehozva",
        message: `A(z) ${created.nameHu} hozzáadva a profilodhoz.`,
        type: "success"
      });

      setNewSportName("");
      setShowAddCustom(false);
    } catch {
      showToast({
        title: "Hiba",
        message: "Nem sikerült elmenteni az egyedi sportágat.",
        type: "error"
      });
    } finally {
      setIsSubmittingCustom(false);
    }
  };

  const metricProfileLabels: Record<MetricProfile, string> = {
    distance_duration: "Táv + Idő",
    duration_only: "Csak időtartam",
    sets_reps_load: "Sorozat + Ismétlés + Súly",
    rounds_time: "Menetek + Idő",
    points: "Pontok + Eredmény"
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Sportág katalógus" maxWidth="lg">
      <div className="space-y-4 max-h-[75vh] flex flex-col">
        {/* Search & Add New button */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Keresés sportág szerint (pl. triatlon, úszás, judo)..."
              className="w-full bg-bg-surface text-text-primary rounded-12 border border-border-hairline pl-9 pr-3 py-2 text-14 focus:outline-none focus:ring-2 focus:ring-brand placeholder:text-text-tertiary"
            />
          </div>
          <Button
            type="button"
            variant={showAddCustom ? "primary" : "secondary"}
            size="sm"
            onClick={() => setShowAddCustom(!showAddCustom)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Új sport
          </Button>
        </div>

        {/* Custom Sport Creation Form */}
        {showAddCustom && (
          <form
            onSubmit={handleCreateCustomSport}
            className="p-4 rounded-16 border border-brand/30 bg-brand/5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-13 font-bold text-text-primary flex items-center gap-1.5">
                <Dumbbell className="h-4 w-4 text-brand" /> Új egyedi sportág hozzáadása
              </span>
              <button
                type="button"
                onClick={() => setShowAddCustom(false)}
                className="text-12 text-text-secondary hover:text-text-primary"
              >
                Mégse
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Sportág neve"
                placeholder="pl. Strandröplabda, Terepduatlon..."
                value={newSportName}
                onChange={(e) => setNewSportName(e.target.value)}
                required
              />

              <div>
                <label className="block text-12 font-medium uppercase tracking-wider text-text-secondary mb-1">
                  Kategória
                </label>
                <select
                  value={newSportCategory}
                  onChange={(e) => setNewSportCategory(e.target.value as SportCategory)}
                  className="w-full bg-bg-surface text-text-primary rounded-12 border border-border-hairline px-3 py-2 text-14 focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  {Object.values(SPORT_CATEGORIES).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.nameHu}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-12 font-medium uppercase tracking-wider text-text-secondary mb-1">
                  Naplózási metrika
                </label>
                <select
                  value={newSportMetric}
                  onChange={(e) => setNewSportMetric(e.target.value as MetricProfile)}
                  className="w-full bg-bg-surface text-text-primary rounded-12 border border-border-hairline px-3 py-2 text-14 focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="distance_duration">Távolság + Időtartam</option>
                  <option value="duration_only">Csak időtartam</option>
                  <option value="sets_reps_load">Sorozat / Ismétlés / Súly</option>
                  <option value="rounds_time">Menetek + Idő</option>
                  <option value="points">Pontszám / Eredmény</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmittingCustom}
              >
                Sportág mentése
              </Button>
            </div>
          </form>
        )}

        {/* Category Filters Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-12">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={`px-3 py-1.5 rounded-full shrink-0 font-medium transition-all ${
              activeCategory === "all"
                ? "bg-brand text-white shadow-sm"
                : "bg-bg-elevated text-text-secondary hover:text-text-primary"
            }`}
          >
            Összes ({allSports.length})
          </button>
          {Object.values(SPORT_CATEGORIES).map((cat) => {
            const count = allSports.filter((s) => s.category === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full shrink-0 font-medium transition-all flex items-center gap-1 ${
                  activeCategory === cat.id
                    ? "bg-brand text-white shadow-sm"
                    : "bg-bg-elevated text-text-secondary hover:text-text-primary"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.nameHu}</span>
                <span className="text-[10px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Sports List Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Favorites (when not actively searching) */}
          {!searchQuery && activeCategory === "all" && favoriteSports.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-12 font-bold uppercase tracking-wider text-brand">
                <Star className="h-3.5 w-3.5 fill-brand text-brand" />
                <span>Kedvenc sportágak</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {favoriteSports.map((sport) => {
                  const isSelected = selectedSportIds.includes(sport.id);
                  const isMain = mainSportId === sport.id;
                  return (
                    <div
                      key={`fav-${sport.id}`}
                      onClick={() => handleSelectSport(sport)}
                      className={`flex items-center justify-between p-3 rounded-14 border cursor-pointer transition-all ${
                        isSelected
                          ? "border-brand bg-brand/10 ring-1 ring-brand"
                          : "border-border-hairline bg-bg-surface hover:bg-bg-elevated"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-18">{sport.icon || "🏅"}</span>
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="text-14 font-semibold text-text-primary truncate">
                              {sport.nameHu}
                            </span>
                            {isMain && (
                              <Badge variant="brand" size="sm">
                                Fő sportág
                              </Badge>
                            )}
                          </div>
                          <span className="text-11 text-text-tertiary">
                            {metricProfileLabels[sport.metricProfile]}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleToggleFavorite(e, sport.id)}
                          aria-label="Kedvenc eltávolítása"
                          className="p-1.5 rounded-lg text-brand hover:bg-bg-elevated"
                        >
                          <Star className="h-4 w-4 fill-brand text-brand" />
                        </button>
                        <div
                          className={`h-6 w-6 rounded-8 flex items-center justify-center ${
                            isSelected ? "bg-brand text-white" : "border border-border-hairline"
                          }`}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recents (when not searching) */}
          {!searchQuery && activeCategory === "all" && recentSports.length > 0 && (
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center gap-1.5 text-12 font-bold uppercase tracking-wider text-text-secondary">
                <Clock className="h-3.5 w-3.5" />
                <span>Legutóbb használt</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSports.map((sport) => {
                  const isSelected = selectedSportIds.includes(sport.id);
                  return (
                    <button
                      key={`recent-${sport.id}`}
                      type="button"
                      onClick={() => handleSelectSport(sport)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-12 text-13 font-medium border transition-all ${
                        isSelected
                          ? "border-brand bg-brand/10 text-brand"
                          : "border-border-hairline bg-bg-surface text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      <span>{sport.icon || "🏅"}</span>
                      <span>{sport.nameHu}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full Catalog / Filtered Results */}
          <div className="space-y-2 pt-2">
            <span className="block text-12 font-bold uppercase tracking-wider text-text-secondary">
              {searchQuery
                ? `Találatok: ${filteredSports.length} sportág`
                : activeCategory === "all"
                  ? "Teljes sportág katalógus"
                  : SPORT_CATEGORIES[activeCategory].nameHu}
            </span>

            {filteredSports.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                <p>Nincs találat a megadott keresési feltételre.</p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => setShowAddCustom(true)}
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  Új sportág létrehozása
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredSports.map((sport) => {
                  const isSelected = selectedSportIds.includes(sport.id);
                  const isMain = mainSportId === sport.id;
                  const isFav = favorites.includes(sport.id);

                  return (
                    <div
                      key={sport.id}
                      onClick={() => handleSelectSport(sport)}
                      className={`flex items-center justify-between p-3 rounded-14 border cursor-pointer transition-all ${
                        isSelected
                          ? "border-brand bg-brand/10 ring-1 ring-brand"
                          : "border-border-hairline bg-bg-surface hover:bg-bg-elevated"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-18">{sport.icon || "🏅"}</span>
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="text-14 font-semibold text-text-primary truncate">
                              {sport.nameHu}
                            </span>
                            {sport.isCustom && (
                              <Badge variant="caution" size="sm">
                                Saját
                              </Badge>
                            )}
                            {isMain && (
                              <Badge variant="brand" size="sm">
                                Fő sportág
                              </Badge>
                            )}
                          </div>
                          <span className="text-11 text-text-tertiary">
                            {SPORT_CATEGORIES[sport.category]?.nameHu || sport.category} •{" "}
                            {metricProfileLabels[sport.metricProfile]}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleToggleFavorite(e, sport.id)}
                          aria-label={isFav ? "Kedvenc eltávolítása" : "Hozzáadás a kedvencekhez"}
                          className={`p-1.5 rounded-lg hover:bg-bg-elevated transition-colors ${
                            isFav ? "text-brand" : "text-text-tertiary hover:text-text-primary"
                          }`}
                        >
                          <Star className={`h-4 w-4 ${isFav ? "fill-brand" : ""}`} />
                        </button>
                        <div
                          className={`h-6 w-6 rounded-8 flex items-center justify-center ${
                            isSelected ? "bg-brand text-white" : "border border-border-hairline"
                          }`}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-3 border-t border-border-hairline flex items-center justify-between">
          <span className="text-13 text-text-secondary">
            <span className="font-bold text-text-primary">{selectedSportIds.length}</span> sportág
            kiválasztva
          </span>
          <Button variant="primary" size="md" onClick={onClose}>
            Kész
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};
