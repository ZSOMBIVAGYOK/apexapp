import React, { useState } from "react";
import { useAuthStore } from "@features/auth/authStore";
import { CoachAthleteRosterItem } from "@shared/types/coach";
import { MemberSpecialty } from "@shared/types/dataModel";
import { MOCK_ROSTER_ATHLETES } from "@shared/lib/coach/coachMockData";
import { RosterDashboard } from "../components/RosterDashboard";
import { AthleteDetailView } from "../components/AthleteDetailView";
import { AthleteTeamView } from "../components/AthleteTeamView";
import { InviteAthleteModal } from "../components/InviteAthleteModal";
import { BulkAssignModal } from "../components/BulkAssignModal";
import { CopyWeekModal } from "../components/CopyWeekModal";
import { WeeklyReviewModal } from "../components/WeeklyReviewModal";
import { Button, Badge, Card, Avatar } from "@shared/ui";
import { Users, UserCheck } from "lucide-react";

export const CoachPage: React.FC = () => {
  const { user } = useAuthStore();

  // Determine if active view is coach or athlete
  const userRoles = user?.roles || (user?.role ? [user.role] : ["athlete"]);
  const hasStaffRole = userRoles.includes("coach") || userRoles.includes("specialist");

  // Local active view state for dual-role users
  const [activeViewMode, setActiveViewMode] = useState<"coach" | "athlete">(
    hasStaffRole ? "coach" : "athlete"
  );

  // Specialist persona switcher for demo purposes
  const [specialistPersona, setSpecialistPersona] = useState<MemberSpecialty>("other");
  const [staffRoleTitle, setStaffRoleTitle] = useState<string>("Vezetőedző");

  // Roster state
  const [athletes, setAthletes] = useState<CoachAthleteRosterItem[]>(MOCK_ROSTER_ATHLETES);
  const [selectedAthlete, setSelectedAthlete] = useState<CoachAthleteRosterItem | null>(null);

  // Modals state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [isCopyWeekOpen, setIsCopyWeekOpen] = useState(false);
  const [isWeeklyReviewOpen, setIsWeeklyReviewOpen] = useState(false);

  // Persona switcher helper
  const handlePersonaChange = (specialty: MemberSpecialty, title: string) => {
    setSpecialistPersona(specialty);
    setStaffRoleTitle(title);
  };

  // If user is purely an athlete or explicitly switched to athlete view:
  if (activeViewMode === "athlete") {
    return (
      <div className="space-y-4">
        {/* Dual-role Switcher Bar */}
        {hasStaffRole && (
          <Card
            variant="surface"
            radius="20"
            className="p-3 border border-border-hairline bg-surface-elevated flex items-center justify-between"
          >
            <div className="flex items-center gap-2 text-12 text-text-secondary">
              <UserCheck className="h-4 w-4 text-brand" />
              <span>Jelenleg a <strong>Sportolói nézetben</strong> vagy.</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setActiveViewMode("coach")}
              leftIcon={<Users className="h-3.5 w-3.5" />}
            >
              Váltás Edzői / Szakemberi munkaállomásra
            </Button>
          </Card>
        )}

        {/* Athlete-side My Team Screen */}
        <AthleteTeamView />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // COACH / SPECIALIST WORKSPACE
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6 pb-12">
      {/* Workspace Header Bar & Persona Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-20 bg-surface-elevated border border-border-hairline">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-14 bg-brand/10 text-brand">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-18 font-bold text-text-primary">Edzői & Szakemberi Munkaállomás</h1>
              <Badge variant="brand" size="sm">
                {staffRoleTitle}
              </Badge>
            </div>
            <p className="text-12 text-text-secondary mt-0.5">
              Desktop-optimalizált csapatmenedzsment, riasztásfigyelő és többcsatornás terheléselemzés.
            </p>
          </div>
        </div>

        {/* Specialist Perspective Switcher (Demo controls) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-11 text-text-tertiary whitespace-nowrap">Nézet:</span>
          <select
            value={specialistPersona}
            onChange={(e) => {
              const val = e.target.value as MemberSpecialty;
              const titles: Record<MemberSpecialty, string> = {
                other: "Vezetőedző",
                nutrition: "Sportdietetikus",
                physio: "Fizioterapeuta",
                strength: "Erőnléti edző",
                psychology: "Sportpszichológus",
                medical: "Sportorvos"
              };
              handlePersonaChange(val, titles[val] || "Szakember");
            }}
            className="rounded-10 bg-surface px-3 py-1.5 text-12 font-medium text-text-primary border border-border-hairline focus:outline-none focus:border-brand"
          >
            <option value="other">Vezetőedző (Áttekintés / Edzésterv)</option>
            <option value="nutrition">Dietetikus (Étrend fókusz)</option>
            <option value="physio">Fizioterapeuta (Sérülés & Egészség)</option>
            <option value="strength">Erőnléti edző (Erőedzés & Load)</option>
            <option value="psychology">Sportpszichológus (Regeneráció / Wellness)</option>
            <option value="medical">Sportorvos (Egészségügyi lap)</option>
          </select>

          {/* Switch to Athlete View button for dual roles */}
          {userRoles.includes("athlete") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveViewMode("athlete")}
              className="text-11 whitespace-nowrap"
            >
              Sportoló nézet
            </Button>
          )}
        </div>
      </div>

      {/* Split-Pane Layout on Desktop (if an athlete is selected) or Full Dashboard */}
      {selectedAthlete ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Compact Roster Navigator (Desktop only) */}
          <div className="hidden lg:block lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border-hairline">
              <span className="text-12 font-bold uppercase tracking-wider text-text-secondary">
                Csapatnévsor ({athletes.length})
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAthlete(null)}
                className="text-11 h-7 px-2"
              >
                Minden sportoló
              </Button>
            </div>

            <div className="space-y-2 max-h-[720px] overflow-y-auto pr-1">
              {athletes.map((ath) => {
                const isCurrent = ath.athleteId === selectedAthlete.athleteId;
                return (
                  <div
                    key={ath.athleteId}
                    onClick={() => setSelectedAthlete(ath)}
                    className={`p-3 rounded-14 border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      isCurrent
                        ? "bg-brand/10 border-brand shadow-sm"
                        : "bg-surface border-border-hairline hover:bg-surface-elevated"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={ath.displayName} size="sm" />
                      <div className="truncate">
                        <p className="text-13 font-bold text-text-primary truncate">{ath.displayName}</p>
                        <p className="text-11 text-text-secondary capitalize truncate">
                          {ath.sport} • TSB: {ath.formTsb > 0 ? `+${ath.formTsb}` : ath.formTsb}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {ath.readinessScore !== undefined && (
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            ath.readinessZone === "ready"
                              ? "bg-ready"
                              : ath.readinessZone === "caution"
                              ? "bg-caution"
                              : "bg-rest"
                          }`}
                        />
                      )}
                      {ath.openAlertsCount > 0 && (
                        <Badge variant="rest" size="sm">
                          {ath.openAlertsCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Full Athlete Detail View */}
          <div className="lg:col-span-8">
            <AthleteDetailView
              athlete={selectedAthlete}
              staffSpecialty={specialistPersona}
              staffRole={staffRoleTitle}
              onBack={() => setSelectedAthlete(null)}
              onUpdateAlerts={(updatedAlerts) => {
                setAthletes((prev) =>
                  prev.map((a) =>
                    a.athleteId === selectedAthlete.athleteId
                      ? {
                          ...a,
                          alerts: updatedAlerts,
                          openAlertsCount: updatedAlerts.filter((al) => al.status === "active").length
                        }
                      : a
                  )
                );
              }}
            />
          </div>
        </div>
      ) : (
        /* Full Roster Dashboard */
        <RosterDashboard
          athletes={athletes}
          selectedAthleteId={undefined}
          onSelectAthlete={(ath) => setSelectedAthlete(ath)}
          onOpenInvite={() => setIsInviteOpen(true)}
          onOpenBulkAssign={() => setIsBulkAssignOpen(true)}
          onOpenWeeklyReview={() => setIsWeeklyReviewOpen(true)}
          onOpenCopyWeek={() => setIsCopyWeekOpen(true)}
        />
      )}

      {/* Modals */}
      <InviteAthleteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
      />

      <BulkAssignModal
        isOpen={isBulkAssignOpen}
        onClose={() => setIsBulkAssignOpen(false)}
        athletes={athletes}
      />

      <CopyWeekModal
        isOpen={isCopyWeekOpen}
        onClose={() => setIsCopyWeekOpen(false)}
        athletes={athletes}
        currentAthleteId={selectedAthlete?.athleteId}
      />

      <WeeklyReviewModal
        isOpen={isWeeklyReviewOpen}
        onClose={() => setIsWeeklyReviewOpen(false)}
        athletes={athletes}
      />
    </div>
  );
};

export default CoachPage;
