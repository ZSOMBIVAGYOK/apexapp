import React, { useState } from "react";
import { CoachAthleteRosterItem } from "@shared/types/coach";
import { Card, Button, Avatar, Badge } from "@shared/ui";
import {
  Search,
  UserPlus,
  AlertTriangle,
  TrendingUp,
  LayoutGrid,
  List,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Users,
  Copy
} from "lucide-react";

export interface RosterDashboardProps {
  athletes: CoachAthleteRosterItem[];
  selectedAthleteId?: string | null;
  onSelectAthlete: (athlete: CoachAthleteRosterItem) => void;
  onOpenInvite: () => void;
  onOpenBulkAssign: () => void;
  onOpenWeeklyReview: () => void;
  onOpenCopyWeek: () => void;
}

export const RosterDashboard: React.FC<RosterDashboardProps> = ({
  athletes,
  selectedAthleteId,
  onSelectAthlete,
  onOpenInvite,
  onOpenBulkAssign,
  onOpenWeeklyReview,
  onOpenCopyWeek
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSport, setSelectedSport] = useState("all");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<"all" | "attention" | "active">("all");
  const [sortBy, setSortBy] = useState<"readiness" | "compliance" | "alerts" | "name" | "checkin">("alerts");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Groups list
  const availableGroups = Array.from(
    new Set(athletes.map((a) => a.group).filter(Boolean) as string[])
  );

  // Attention Needed Athletes (Red readiness, active alerts, or missed check-in >= 3 days)
  const attentionAthletes = athletes.filter(
    (a) =>
      a.status === "active" &&
      ((a.readinessScore !== undefined && a.readinessScore < 40) ||
        a.readinessZone === "rest" ||
        a.openAlertsCount > 0 ||
        a.weeklyCompliancePercent < 60)
  );

  // Filtered & Sorted Athletes
  const filteredAthletes = athletes
    .filter((athlete) => {
      // Search
      const matchesSearch =
        athlete.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        athlete.sport.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // Sport
      if (selectedSport !== "all" && athlete.sport !== selectedSport) return false;

      // Group
      if (selectedGroup !== "all" && athlete.group !== selectedGroup) return false;

      // Status filter
      if (selectedStatusFilter === "attention") {
        return (
          athlete.status === "active" &&
          (athlete.openAlertsCount > 0 ||
            (athlete.readinessScore !== undefined && athlete.readinessScore < 40) ||
            athlete.weeklyCompliancePercent < 60)
        );
      }
      if (selectedStatusFilter === "active") {
        return athlete.status === "active";
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === "alerts") {
        return b.openAlertsCount - a.openAlertsCount;
      }
      if (sortBy === "readiness") {
        return (a.readinessScore ?? 100) - (b.readinessScore ?? 100);
      }
      if (sortBy === "compliance") {
        return b.weeklyCompliancePercent - a.weeklyCompliancePercent;
      }
      if (sortBy === "name") {
        return a.displayName.localeCompare(b.displayName);
      }
      return 0;
    });

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenInvite}
            leftIcon={<UserPlus className="h-4 w-4" />}
          >
            Sportoló meghívása
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenBulkAssign}
            leftIcon={<Calendar className="h-4 w-4" />}
          >
            Tömeges edzés kiírás
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenWeeklyReview}
            leftIcon={<CheckCircle2 className="h-4 w-4" />}
          >
            Heti felülvizsgálat
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenCopyWeek}
            leftIcon={<Copy className="h-4 w-4" />}
          >
            Hét másolása
          </Button>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-10 bg-surface-elevated border border-border-hairline">
          <button
            onClick={() => setViewMode("cards")}
            className={`p-1.5 rounded-8 text-12 transition-all ${
              viewMode === "cards" ? "bg-surface text-brand shadow-sm" : "text-text-secondary"
            }`}
            title="Kártya nézet"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-8 text-12 transition-all ${
              viewMode === "table" ? "bg-surface text-brand shadow-sm" : "text-text-secondary"
            }`}
            title="Táblázat nézet"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* PINNED "ATTENTION NEEDED" SECTION */}
      {attentionAthletes.length > 0 && selectedStatusFilter !== "active" && (
        <Card
          variant="surface"
          radius="20"
          className="p-5 border-2 border-rest/30 bg-rest/5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-10 bg-rest/10 text-rest">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-14 font-bold text-text-primary">
                  Kiemelt figyelmet igénylő sportolók ({attentionAthletes.length})
                </h3>
                <p className="text-11 text-text-secondary">
                  Kritikus terhelési ugrás, vörös zónás readiness vagy alacsony edzésmegfelelés.
                </p>
              </div>
            </div>

            <Badge variant="rest" size="sm">
              Azonnali beavatkozás
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {attentionAthletes.map((ath) => (
              <div
                key={ath.athleteId}
                onClick={() => onSelectAthlete(ath)}
                className="p-3.5 rounded-14 bg-surface border border-border-hairline hover:border-rest/50 cursor-pointer transition-all flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={ath.displayName} size="md" />
                  <div className="truncate">
                    <p className="text-13 font-bold text-text-primary group-hover:text-brand truncate">
                      {ath.displayName}
                    </p>
                    <p className="text-11 text-text-secondary truncate">
                      {ath.alerts[0]?.title || `Readiness: ${ath.readinessScore}/100 • Teljesítés: ${ath.weeklyCompliancePercent}%`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {ath.openAlertsCount > 0 && (
                    <Badge variant="rest" size="sm">
                      {ath.openAlertsCount} riasztás
                    </Badge>
                  )}
                  <ArrowRight className="h-4 w-4 text-text-tertiary group-hover:text-brand transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Search & Filters Row */}
      <Card variant="surface" radius="20" className="p-4 space-y-3 border border-border-hairline">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Keresés sportoló neve vagy sportág szerint..."
              className="w-full rounded-12 bg-surface-elevated pl-10 pr-4 py-2 text-13 text-text-primary border border-border-hairline focus:outline-none focus:border-brand"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as "readiness" | "compliance" | "alerts" | "name" | "checkin"
                )
              }
              className="rounded-12 bg-surface-elevated px-3 py-2 text-12 text-text-primary border border-border-hairline focus:outline-none focus:border-brand"
            >
              <option value="alerts">Rendezés: Riasztások száma</option>
              <option value="readiness">Rendezés: Readiness (alacsony elöl)</option>
              <option value="compliance">Rendezés: Megfelelés %</option>
              <option value="name">Rendezés: Név (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border-hairline text-12">
          <span className="text-text-tertiary font-medium">Szűrők:</span>

          <div className="flex gap-1">
            <button
              onClick={() => setSelectedStatusFilter("all")}
              className={`px-2.5 py-1 rounded-8 text-11 transition-all ${
                selectedStatusFilter === "all"
                  ? "bg-brand text-white font-semibold"
                  : "bg-surface-elevated text-text-secondary hover:text-text-primary"
              }`}
            >
              Mind ({athletes.length})
            </button>
            <button
              onClick={() => setSelectedStatusFilter("attention")}
              className={`px-2.5 py-1 rounded-8 text-11 transition-all ${
                selectedStatusFilter === "attention"
                  ? "bg-rest text-white font-semibold"
                  : "bg-surface-elevated text-text-secondary hover:text-text-primary"
              }`}
            >
              Figyelmet kér ({attentionAthletes.length})
            </button>
            <button
              onClick={() => setSelectedStatusFilter("active")}
              className={`px-2.5 py-1 rounded-8 text-11 transition-all ${
                selectedStatusFilter === "active"
                  ? "bg-ready text-white font-semibold"
                  : "bg-surface-elevated text-text-secondary hover:text-text-primary"
              }`}
            >
              Aktív sportolók
            </button>
          </div>

          <div className="h-3 w-px bg-border-hairline mx-1" />

          {/* Sport Filter */}
          <select
            value={selectedSport}
            onChange={(e) => setSelectedSport(e.target.value)}
            className="rounded-8 bg-surface-elevated px-2 py-1 text-11 text-text-secondary border border-border-hairline"
          >
            <option value="all">Minden sportág</option>
            <option value="running">Futás</option>
            <option value="cycling">Kerékpár</option>
            <option value="swimming">Úszás</option>
            <option value="triathlon">Triatlon</option>
          </select>

          {/* Group Filter */}
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="rounded-8 bg-surface-elevated px-2 py-1 text-11 text-text-secondary border border-border-hairline"
          >
            <option value="all">Minden csoport</option>
            {availableGroups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* ATHLETES LIST: CARDS OR TABLE */}
      {filteredAthletes.length === 0 ? (
        <Card variant="surface" radius="20" className="p-12 text-center space-y-3 border border-border-hairline">
          <Users className="h-10 w-10 text-text-tertiary mx-auto stroke-1" />
          <h4 className="text-15 font-bold text-text-primary">Nincs megjeleníthető sportoló</h4>
          <p className="text-12 text-text-secondary max-w-sm mx-auto">
            A megadott szűrési feltételeknek nem felelt meg egyetlen sportoló sem, vagy még nem csatlakoztattál sportolókat.
          </p>
          <Button variant="primary" size="sm" onClick={onOpenInvite} leftIcon={<UserPlus className="h-4 w-4" />}>
            Sportoló meghívása
          </Button>
        </Card>
      ) : viewMode === "cards" ? (
        /* Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAthletes.map((athlete) => {
            const isSelected = selectedAthleteId === athlete.athleteId;
            const isRevoked = athlete.status === "revoked";

            return (
              <Card
                key={athlete.athleteId}
                variant="surface"
                radius="20"
                onClick={() => onSelectAthlete(athlete)}
                className={`p-5 flex flex-col justify-between space-y-4 border cursor-pointer transition-all hover:border-brand/50 ${
                  isSelected
                    ? "border-brand bg-brand/5 shadow-md"
                    : isRevoked
                    ? "border-rest/30 bg-surface/50 opacity-80"
                    : "border-border-hairline hover:bg-surface-elevated/40"
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={athlete.displayName} size="lg" />
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-15 font-bold text-text-primary truncate">
                            {athlete.displayName}
                          </h4>
                          {isRevoked && (
                            <Badge variant="rest" size="sm">
                              Visszavonva
                            </Badge>
                          )}
                        </div>
                        <p className="text-11 text-text-secondary capitalize truncate">
                          {athlete.sport} {athlete.group ? `• ${athlete.group}` : ""}
                        </p>
                      </div>
                    </div>

                    {/* Three Scores Mini Badges/Dots */}
                    {!isRevoked ? (
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Recovery mini badge */}
                        {athlete.permissions?.recovery !== "none" ? (
                          <div className="text-right" title="Regeneráció">
                            <div className="flex items-center justify-end gap-1">
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  (athlete.recoveryBand || athlete.readinessZone) === "ready" || (athlete.recoveryScore || athlete.readinessScore || 0) >= 67
                                    ? "bg-ready"
                                    : (athlete.recoveryBand || athlete.readinessZone) === "caution" || (athlete.recoveryScore || athlete.readinessScore || 0) >= 34
                                    ? "bg-caution"
                                    : "bg-rest"
                                }`}
                              />
                              <span className="text-13 font-mono font-bold text-text-primary">
                                {athlete.recoveryScore ?? athlete.readinessScore ?? "--"}
                              </span>
                            </div>
                            <span className="text-[9px] text-text-tertiary block">Regen</span>
                          </div>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-elevated text-text-tertiary border border-border-hairline">
                            Nincs megosztva
                          </span>
                        )}

                        {/* Strain mini badge */}
                        {athlete.permissions?.training !== "none" && (
                          <div className="text-right pl-1.5 border-l border-border-hairline" title="Terhelés">
                            <div className="flex items-center justify-end gap-1">
                              <span className="h-2 w-2 rounded-full bg-brand" />
                              <span className="text-13 font-mono font-bold text-text-primary">
                                {athlete.strainScore ?? (athlete.formTsb > 0 ? `+${athlete.formTsb}` : athlete.formTsb)}
                              </span>
                            </div>
                            <span className="text-[9px] text-text-tertiary block">Strain</span>
                          </div>
                        )}

                        {/* Sleep mini badge */}
                        {athlete.permissions?.recovery !== "none" && athlete.sleepScore !== undefined && (
                          <div className="text-right pl-1.5 border-l border-border-hairline" title="Alvás">
                            <div className="flex items-center justify-end gap-1">
                              <span className="h-2 w-2 rounded-full bg-indigo-400" />
                              <span className="text-13 font-mono font-bold text-text-primary">
                                {athlete.sleepScore}
                              </span>
                            </div>
                            <span className="text-[9px] text-text-tertiary block">Alvás</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-11 text-text-tertiary font-mono">--</span>
                    )}
                  </div>

                  {/* Metrics Bar */}
                  {!isRevoked && (
                    <div className="grid grid-cols-3 gap-2 pt-3 mt-3 border-t border-border-hairline text-center">
                      <div className="p-2 rounded-10 bg-surface-elevated/60">
                        <p className="text-10 text-text-tertiary">Forma (TSB)</p>
                        <p className="text-13 font-mono font-bold text-text-primary mt-0.5">
                          {athlete.formTsb > 0 ? `+${athlete.formTsb}` : athlete.formTsb}
                        </p>
                      </div>

                      <div className="p-2 rounded-10 bg-surface-elevated/60">
                        <p className="text-10 text-text-tertiary">Megfelelés</p>
                        <p className="text-13 font-mono font-bold text-text-primary mt-0.5">
                          {athlete.weeklyCompliancePercent}%
                        </p>
                      </div>

                      <div className="p-2 rounded-10 bg-surface-elevated/60">
                        <p className="text-10 text-text-tertiary">7-napos terhelés</p>
                        <div className="flex items-center justify-center gap-1 mt-0.5">
                          <TrendingUp
                            className={`h-3 w-3 ${
                              athlete.sevenDayLoadTrend === "increasing"
                                ? "text-brand rotate-0"
                                : athlete.sevenDayLoadTrend === "decreasing"
                                ? "text-caution rotate-90"
                                : "text-text-secondary rotate-45"
                            }`}
                          />
                          <span className="text-11 font-medium text-text-primary">
                            {athlete.sevenDayLoadTrend === "increasing"
                              ? "Nő"
                              : athlete.sevenDayLoadTrend === "decreasing"
                              ? "Csökken"
                              : "Stabil"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-border-hairline text-11 text-text-tertiary">
                  <span>Check-in: {athlete.lastCheckInTime || "Nem elérhető"}</span>

                  {athlete.openAlertsCount > 0 && (
                    <Badge variant="rest" size="sm">
                      {athlete.openAlertsCount} riasztás
                    </Badge>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <Card variant="surface" radius="20" className="overflow-hidden border border-border-hairline">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-13">
              <thead className="bg-surface-elevated border-b border-border-hairline text-11 font-semibold text-text-secondary uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Sportoló</th>
                  <th className="py-3 px-3">Sportág & Csoport</th>
                  <th className="py-3 px-3">Readiness</th>
                  <th className="py-3 px-3">Forma (TSB)</th>
                  <th className="py-3 px-3">Megfelelés %</th>
                  <th className="py-3 px-3">Utolsó check-in</th>
                  <th className="py-3 px-4 text-right">Riasztások</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-hairline">
                {filteredAthletes.map((athlete) => (
                  <tr
                    key={athlete.athleteId}
                    onClick={() => onSelectAthlete(athlete)}
                    className="hover:bg-surface-elevated/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={athlete.displayName} size="sm" />
                        <span className="font-bold text-text-primary">{athlete.displayName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="capitalize text-text-secondary">{athlete.sport}</span>
                      {athlete.group && <span className="block text-11 text-text-tertiary">{athlete.group}</span>}
                    </td>
                    <td className="py-3 px-3">
                      {athlete.readinessScore !== undefined ? (
                        <div className="flex items-center gap-1.5 font-mono font-bold text-text-primary">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              athlete.readinessZone === "ready"
                                ? "bg-ready"
                                : athlete.readinessZone === "caution"
                                ? "bg-caution"
                                : "bg-rest"
                            }`}
                          />
                          {athlete.readinessScore}
                        </div>
                      ) : (
                        <span className="text-text-tertiary">--</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono font-medium text-text-primary">
                      {athlete.formTsb > 0 ? `+${athlete.formTsb}` : athlete.formTsb}
                    </td>
                    <td className="py-3 px-3 font-mono font-medium text-text-primary">
                      {athlete.weeklyCompliancePercent}%
                    </td>
                    <td className="py-3 px-3 text-12 text-text-secondary">
                      {athlete.lastCheckInTime || "--"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {athlete.openAlertsCount > 0 ? (
                        <Badge variant="rest" size="sm">
                          {athlete.openAlertsCount} riasztás
                        </Badge>
                      ) : (
                        <span className="text-11 text-text-tertiary">Rendben</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
