import React, { useState } from "react";
import {
  CoachAthleteRosterItem,
  AthleteAlert,
  CoachAthleteNote,
  CoachMessage
} from "@shared/types/coach";
import {
  Card,
  Button,
  Badge,
  Avatar,
  SorenessBodyMap,
  SourceBadge,
  ConfidenceMeter,
  showToast
} from "@shared/ui";
import {
  ArrowLeft,
  Lock,
  AlertTriangle,
  Activity,
  Apple,
  Heart,
  FileText,
  MessageSquare,
  Clock,
  Send,
  Plus,
  Eye,
  EyeOff,
  Dumbbell,
  ShieldAlert,
  Check,
  TrendingUp
} from "lucide-react";
import {
  MOCK_COACH_MESSAGES,
  MOCK_COACH_NOTES,
  MOCK_STAFF_ACTIVITY_FEED
} from "@shared/lib/coach/coachMockData";
import {
  canStaffAccessModule,
  canStaffWriteModule,
  acknowledgeAlert,
  snoozeAlert,
  annotateAlert
} from "@shared/lib/coach/alertsEngine";
import { MemberSpecialty } from "@shared/types/dataModel";

export interface AthleteDetailViewProps {
  athlete: CoachAthleteRosterItem;
  staffSpecialty?: MemberSpecialty;
  staffRole?: string;
  onBack: () => void;
  onUpdateAlerts?: (updatedAlerts: AthleteAlert[]) => void;
}

export const AthleteDetailView: React.FC<AthleteDetailViewProps> = ({
  athlete,
  staffSpecialty,
  staffRole = "Vezetőedző",
  onBack,
  onUpdateAlerts
}) => {
  // Determine default tab based on specialist role
  const getDefaultTab = (): string => {
    switch (staffSpecialty) {
      case "nutrition":
        return "nutrition";
      case "physio":
      case "medical":
        return "health";
      case "strength":
        return "training";
      case "psychology":
        return "recovery";
      default:
        return "overview";
    }
  };

  const [activeTab, setActiveTab] = useState<string>(getDefaultTab());
  const [alerts, setAlerts] = useState<AthleteAlert[]>(athlete.alerts);

  // Notes state
  const [notes, setNotes] = useState<CoachAthleteNote[]>(
    MOCK_COACH_NOTES[athlete.athleteId] || []
  );
  const [newNoteText, setNewNoteText] = useState("");
  const [isPrivateNote, setIsPrivateNote] = useState(true);

  // Messages state
  const [messages, setMessages] = useState<CoachMessage[]>(
    MOCK_COACH_MESSAGES[athlete.athleteId] || []
  );
  const [newMessageText, setNewMessageText] = useState("");
  const [activeTopic, setActiveTopic] = useState<string>("Mind");

  // Nutrition target edit state
  const [carbTarget, setCarbTarget] = useState<number>(450);
  const [proteinTarget, setProteinTarget] = useState<number>(140);
  const [isNutritionEditing, setIsNutritionEditing] = useState(false);

  // Alert annotation state
  const [annotatingAlertId, setAnnotatingAlertId] = useState<string | null>(null);
  const [annotationText, setAnnotationText] = useState("");

  const permissions = athlete.permissions;
  const isRevoked = athlete.status === "revoked";

  // Tab configurations with lock status
  const tabs = [
    { id: "overview", label: "Áttekintés", icon: <Activity className="h-4 w-4" /> },
    {
      id: "training",
      label: "Edzésterv",
      icon: <Dumbbell className="h-4 w-4" />,
      locked: !canStaffAccessModule(permissions, "training")
    },
    {
      id: "recovery",
      label: "Regeneráció",
      icon: <Heart className="h-4 w-4" />,
      locked: !canStaffAccessModule(permissions, "recovery")
    },
    {
      id: "nutrition",
      label: "Étrend",
      icon: <Apple className="h-4 w-4" />,
      locked: !canStaffAccessModule(permissions, "nutrition")
    },
    {
      id: "health",
      label: "Egészség",
      icon: <ShieldAlert className="h-4 w-4" />,
      locked: !canStaffAccessModule(permissions, "health")
    },
    { id: "notes", label: "Feljegyzések", icon: <FileText className="h-4 w-4" /> },
    {
      id: "messages",
      label: "Üzenetek",
      icon: <MessageSquare className="h-4 w-4" />,
      locked: !canStaffAccessModule(permissions, "messages")
    }
  ];

  // Alert Actions
  const handleAcknowledge = (alertId: string) => {
    const updated = alerts.map((a) =>
      a.id === alertId ? acknowledgeAlert(a, "current-staff", staffRole) : a
    );
    setAlerts(updated);
    onUpdateAlerts?.(updated);
    showToast({
      title: "Riasztás nyugtázva",
      message: "A riasztás státusza nyugtázottra váltott.",
      type: "success"
    });
  };

  const handleSnooze = (alertId: string) => {
    const updated = alerts.map((a) =>
      a.id === alertId ? snoozeAlert(a, 24) : a
    );
    setAlerts(updated);
    onUpdateAlerts?.(updated);
    showToast({
      title: "Riasztás elhalasztva",
      message: "A riasztás 24 órára el lett némítva.",
      type: "info"
    });
  };

  const handleAnnotate = (alertId: string) => {
    if (!annotationText.trim()) return;
    const target = alerts.find((a) => a.id === alertId);
    if (!target) return;

    const updatedAlert = annotateAlert(
      target,
      "current-staff",
      "Stábtag",
      staffRole,
      annotationText
    );
    const updated = alerts.map((a) => (a.id === alertId ? updatedAlert : a));
    setAlerts(updated);
    onUpdateAlerts?.(updated);
    setAnnotationText("");
    setAnnotatingAlertId(null);

    showToast({
      title: "Feljegyzés mentve",
      message: "A szakmai komment rögzítve lett a riasztáshoz.",
      type: "success"
    });
  };

  // Add Note
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const newNote: CoachAthleteNote = {
      id: `note_${Date.now()}`,
      athleteId: athlete.athleteId,
      authorId: "current-staff",
      authorName: staffRole,
      authorRole: staffRole,
      isPrivateToStaff: isPrivateNote,
      text: newNoteText.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setNotes([newNote, ...notes]);
    setNewNoteText("");

    showToast({
      title: isPrivateNote ? "Belső feljegyzés mentve" : "Megosztott feljegyzés mentve",
      message: isPrivateNote
        ? "Csak a szakmai stáb számára látható."
        : "A sportoló is látja a profiljában.",
      type: "success"
    });
  };

  // Send Message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim()) return;

    const newMsg: CoachMessage = {
      id: `msg_${Date.now()}`,
      athleteId: athlete.athleteId,
      senderId: "current-staff",
      senderName: staffRole,
      senderRole: "coach",
      topic: activeTopic === "Mind" ? "Általános" : activeTopic,
      text: newMessageText.trim(),
      readBy: ["current-staff"],
      readAt: { "current-staff": new Date().toISOString() },
      createdAt: new Date().toISOString()
    };

    setMessages([...messages, newMsg]);
    setNewMessageText("");

    showToast({
      title: "Üzenet elküldve",
      message: `${athlete.displayName} megkapta az üzenetet. (FCM push kiküldve)`,
      type: "success"
    });
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-hairline">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Vissza a csapathoz
          </Button>

          <div className="h-4 w-px bg-border-hairline hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-12 text-text-tertiary">Sportoló adatlap:</span>
            <span className="text-14 font-bold text-text-primary">{athlete.displayName}</span>
            <Badge variant="brand" size="sm">
              {athlete.group || athlete.sport}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 text-11 text-text-tertiary self-end sm:self-auto">
          <span>Státusz:</span>
          {isRevoked ? (
            <Badge variant="rest" size="sm" dot>
              Hozzáférés visszavonva
            </Badge>
          ) : (
            <Badge variant="ready" size="sm" dot>
              Aktív kapcsolat
            </Badge>
          )}
        </div>
      </div>

      {/* REVOKED ACCESS MID-SESSION LOCKOUT BANNER */}
      {isRevoked && (
        <Card
          variant="surface"
          radius="20"
          className="p-6 border-2 border-rest/40 bg-rest/10 text-center space-y-3"
        >
          <div className="p-3 rounded-full bg-rest/20 text-rest w-max mx-auto">
            <Lock className="h-8 w-8" />
          </div>
          <h3 className="text-16 font-bold text-rest">Hozzáférési jogosultság visszavonva</h3>
          <p className="text-13 text-text-secondary max-w-lg mx-auto">
            A sportoló (<strong>{athlete.displayName}</strong>) visszavonta az edzői és szakemberi
            hozzáférést a fiókjához. Az adatok megtekintése, az edzéstervezés és az üzenetküldés
            azonnali hatállyal zárolásra került.
          </p>
          <Button variant="secondary" size="sm" onClick={onBack}>
            Visszatérés a névsorhoz
          </Button>
        </Card>
      )}

      {/* Normal View if not revoked */}
      {!isRevoked && (
        <>
          {/* Athlete Profile Summary Bar */}
          <Card variant="surface" radius="20" className="p-4 sm:p-5 border border-border-hairline">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <Avatar name={athlete.displayName} size="xl" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-18 font-bold text-text-primary">{athlete.displayName}</h2>
                    <span className="text-11 px-2.5 py-0.5 rounded-full bg-brand/10 text-brand font-medium">
                      {athlete.sport.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-12 text-text-secondary mt-0.5">
                    Utolsó check-in: <strong>{athlete.lastCheckInTime || "Nem elérhető"}</strong>
                  </p>
                </div>
              </div>

              {/* Quick Biometrics Pills */}
              <div className="flex items-center gap-3 overflow-x-auto pb-1 sm:pb-0">
                <div className="p-2.5 rounded-12 bg-surface-elevated border border-border-hairline text-center min-w-[90px]">
                  <p className="text-10 text-text-tertiary">Readiness</p>
                  <div className="flex items-center justify-center gap-1 mt-0.5">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        athlete.readinessZone === "ready"
                          ? "bg-ready"
                          : athlete.readinessZone === "caution"
                          ? "bg-caution"
                          : "bg-rest"
                      }`}
                    />
                    <span className="text-16 font-mono font-bold text-text-primary">
                      {athlete.readinessScore ?? "--"}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-12 bg-surface-elevated border border-border-hairline text-center min-w-[90px]">
                  <p className="text-10 text-text-tertiary">Forma (TSB)</p>
                  <p className="text-16 font-mono font-bold text-text-primary mt-0.5">
                    {athlete.formTsb > 0 ? `+${athlete.formTsb}` : athlete.formTsb}
                  </p>
                </div>

                <div className="p-2.5 rounded-12 bg-surface-elevated border border-border-hairline text-center min-w-[90px]">
                  <p className="text-10 text-text-tertiary">Heti telj.</p>
                  <p className="text-16 font-mono font-bold text-text-primary mt-0.5">
                    {athlete.weeklyCompliancePercent}%
                  </p>
                </div>

                <div className="p-2.5 rounded-12 bg-surface-elevated border border-border-hairline text-center min-w-[90px]">
                  <p className="text-10 text-text-tertiary">Riasztások</p>
                  <p className="text-16 font-mono font-bold text-text-primary mt-0.5">
                    {alerts.filter((a) => a.status === "active").length}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Navigation Tabs */}
          <div className="overflow-x-auto pb-1 scrollbar-none">
            <div className="flex gap-1.5 p-1 bg-surface-elevated rounded-14 w-max border border-border-hairline">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-10 text-13 font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-surface text-text-primary shadow-sm font-semibold"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.locked && <Lock className="h-3 w-3 text-text-tertiary" />}
                </button>
              ))}
            </div>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Active Alerts Section */}
              {alerts.length > 0 && (
                <Card variant="surface" radius="20" className="p-5 border border-rest/20 bg-rest/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-14 font-semibold text-rest flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Aktív riasztások ehhez a sportolóhoz ({alerts.length})
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="p-3.5 rounded-14 bg-surface border border-border-hairline space-y-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant={alert.severity === "critical" ? "rest" : "caution"} size="sm">
                                {alert.severity.toUpperCase()}
                              </Badge>
                              <span className="text-13 font-bold text-text-primary">{alert.title}</span>
                              <span className="text-11 text-text-tertiary">
                                {new Date(alert.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <p className="text-12 text-text-secondary mt-1">{alert.message}</p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {alert.status === "active" ? (
                              <>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleAcknowledge(alert.id)}
                                  leftIcon={<Check className="h-3.5 w-3.5" />}
                                >
                                  Nyugtázás
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSnooze(alert.id)}
                                  leftIcon={<Clock className="h-3.5 w-3.5" />}
                                >
                                  Halasztás 24h
                                </Button>
                              </>
                            ) : (
                              <Badge variant="ready" size="sm">
                                {alert.status === "acknowledged" ? "Nyugtázva" : "Elhalasztva"}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Annotations */}
                        {alert.annotations && alert.annotations.length > 0 && (
                          <div className="pl-3 border-l-2 border-brand/30 space-y-1 mt-2">
                            {alert.annotations.map((ann) => (
                              <p key={ann.id} className="text-11 text-text-secondary">
                                <strong className="text-text-primary">{ann.authorRole}:</strong> {ann.text}
                              </p>
                            ))}
                          </div>
                        )}

                        {/* Annotate Inline Form */}
                        {annotatingAlertId === alert.id ? (
                          <div className="flex items-center gap-2 pt-2">
                            <input
                              type="text"
                              value={annotationText}
                              onChange={(e) => setAnnotationText(e.target.value)}
                              placeholder="Edzői megjegyzés a riasztáshoz..."
                              className="flex-1 rounded-8 bg-surface-elevated px-3 py-1.5 text-12 text-text-primary border border-border-hairline focus:outline-none focus:border-brand"
                            />
                            <Button variant="primary" size="sm" onClick={() => handleAnnotate(alert.id)}>
                              Mentés
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setAnnotatingAlertId(null)}>
                              Mégse
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAnnotatingAlertId(alert.id)}
                            className="text-11 text-brand hover:underline pt-1 inline-block"
                          >
                            + Feljegyzés hozzáadása
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Key Metric Gauges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card variant="surface" radius="20" className="p-5 space-y-2 border border-border-hairline">
                  <span className="text-12 font-medium text-text-secondary">Readiness Biztonság & Forrás</span>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-28 font-mono font-bold text-text-primary">
                      {athlete.readinessScore ?? 84} / 100
                    </span>
                    <SourceBadge source="whoop" />
                  </div>
                  <ConfidenceMeter confidence={athlete.readinessConfidence || 0.95} />
                  <p className="text-11 text-text-tertiary">3 biometriai adatfolyam alapján számítva</p>
                </Card>

                <Card variant="surface" radius="20" className="p-5 space-y-2 border border-border-hairline">
                  <span className="text-12 font-medium text-text-secondary">7-Napos Terhelési Trend</span>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-28 font-mono font-bold text-text-primary">
                      {athlete.sevenDayLoadTrend === "increasing"
                        ? "Emelkedő"
                        : athlete.sevenDayLoadTrend === "decreasing"
                        ? "Csökkenő"
                        : "Stabil"}
                    </span>
                    <TrendingUp className="h-6 w-6 text-brand" />
                  </div>
                  <p className="text-11 text-text-secondary">Forma (TSB): {athlete.formTsb} • {athlete.formStatus}</p>
                </Card>

                <Card variant="surface" radius="20" className="p-5 space-y-2 border border-border-hairline">
                  <span className="text-12 font-medium text-text-secondary">Heti Edzésterv Megfelelés</span>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-28 font-mono font-bold text-text-primary">
                      {athlete.weeklyCompliancePercent}%
                    </span>
                    <Badge variant={athlete.weeklyCompliancePercent >= 80 ? "ready" : "caution"} size="sm">
                      {athlete.weeklyCompliancePercent >= 80 ? "Kiváló" : "Elmaradás"}
                    </Badge>
                  </div>
                  <p className="text-11 text-text-secondary">6 tervezett edzésből 5 teljesítve</p>
                </Card>
              </div>

              {/* Activity Audit Log */}
              <Card variant="surface" radius="20" className="p-5 space-y-3 border border-border-hairline">
                <h3 className="text-14 font-semibold text-text-primary">Stáb tevékenységi napló (Audit Feed)</h3>
                <div className="space-y-2">
                  {MOCK_STAFF_ACTIVITY_FEED.filter(
                    (item) => item.athleteId === athlete.athleteId || item.athleteId === "ath-001"
                  ).map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3 rounded-12 bg-surface-elevated/40 text-12 border border-border-hairline flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-text-primary">{entry.staffName} ({entry.staffRole}):</span>{" "}
                        <span className="text-text-secondary">{entry.description}</span>
                      </div>
                      <span className="text-11 text-text-tertiary shrink-0 ml-3">{entry.timestamp}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* TAB 2: TRAINING (PERMISSION-GATED) */}
          {activeTab === "training" && (
            <div>
              {!canStaffAccessModule(permissions, "training") ? (
                <Card variant="surface" radius="20" className="p-10 text-center space-y-2 border border-border-hairline">
                  <Lock className="h-8 w-8 text-text-tertiary mx-auto" />
                  <h4 className="text-15 font-bold text-text-primary">Nincs megosztva</h4>
                  <p className="text-12 text-text-secondary max-w-md mx-auto">
                    A sportoló nem engedélyezte az edzéstervek megtekintését ehhez a szakmai kapcsolathoz.
                  </p>
                </Card>
              ) : (
                <Card variant="surface" radius="20" className="p-6 space-y-4 border border-border-hairline">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-16 font-bold text-text-primary">Edzéstervező és Naptár</h3>
                      <p className="text-12 text-text-secondary">
                        {canStaffWriteModule(permissions, "training")
                          ? "Írási joggal rendelkezel: kiírhatsz és módosíthatsz edzéseket."
                          : "Csak olvasási joggal rendelkezel: a kiírt edzések nem módosíthatók."}
                      </p>
                    </div>
                    {canStaffWriteModule(permissions, "training") && (
                      <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                        Új edzés kiírása
                      </Button>
                    )}
                  </div>

                  <div className="p-4 rounded-14 bg-surface-elevated border border-border-hairline space-y-2">
                    <p className="text-13 font-semibold text-text-primary">Kovács Zsombor heti struktúrája (Olimpiai Terv)</p>
                    <div className="space-y-1.5 text-12 text-text-secondary">
                      <div className="p-2 rounded-8 bg-surface flex justify-between">
                        <span>Hétfő: 60p Könnyű aerob futás (Z2, 4:45 /km)</span>
                        <Badge variant="ready" size="sm">Teljesítve (62p, Load 58)</Badge>
                      </div>
                      <div className="p-2 rounded-8 bg-surface flex justify-between">
                        <span>Kedd: 5x1000m Küszöb (RPE 8, 3:05 /km) + levezetés</span>
                        <Badge variant="ready" size="sm">Teljesítve (55p, Load 84)</Badge>
                      </div>
                      <div className="p-2 rounded-8 bg-surface flex justify-between">
                        <span>Szerda: Erőnlét & Core stabilitás (45p)</span>
                        <Badge variant="neutral" size="sm">Tervezett</Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* TAB 3: RECOVERY (PERMISSION-GATED) */}
          {activeTab === "recovery" && (
            <div>
              {!canStaffAccessModule(permissions, "recovery") ? (
                <Card variant="surface" radius="20" className="p-10 text-center space-y-2 border border-border-hairline">
                  <Lock className="h-8 w-8 text-text-tertiary mx-auto" />
                  <h4 className="text-15 font-bold text-text-primary">Nincs megosztva</h4>
                  <p className="text-12 text-text-secondary max-w-md mx-auto">
                    A sportoló nem osztotta meg a regenerációs és alvási adatait.
                  </p>
                </Card>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card variant="surface" radius="20" className="p-5 space-y-3 border border-border-hairline">
                      <h4 className="text-14 font-semibold text-text-primary">Szubjektív Wellness & Izomfeszülés</h4>
                      <p className="text-12 text-text-secondary">A reggeli check-in során rögzített Hooper pontszámok (1-5):</p>
                      <div className="space-y-2 text-12">
                        <div className="flex justify-between"><span>Kipihentség:</span> <strong>4 / 5</strong></div>
                        <div className="flex justify-between"><span>Izomláz / Feszülés:</span> <strong>2 / 5 (alacsony)</strong></div>
                        <div className="flex justify-between"><span>Stressz szint:</span> <strong>1 / 5 (nyugodt)</strong></div>
                        <div className="flex justify-between"><span>Kedélyállapot / Hangulat:</span> <strong>5 / 5</strong></div>
                      </div>
                    </Card>

                    <Card variant="surface" radius="20" className="p-5 space-y-3 border border-border-hairline">
                      <h4 className="text-14 font-semibold text-text-primary">Éjszakai Alvás & HRV</h4>
                      <div className="space-y-2 text-12">
                        <div className="flex justify-between"><span>Alvás időtartam:</span> <strong>7 óra 45 perc</strong></div>
                        <div className="flex justify-between"><span>Alváshatékonyság:</span> <strong>92% (Kiváló)</strong></div>
                        <div className="flex justify-between"><span>HRV RMSSD:</span> <strong>84 ms (+12% bázis felett)</strong></div>
                        <div className="flex justify-between"><span>Nyugalmi pulzus:</span> <strong>44 bpm</strong></div>
                      </div>
                    </Card>
                  </div>

                  <Card variant="surface" radius="20" className="p-5 border border-border-hairline">
                    <h4 className="text-14 font-semibold text-text-primary mb-3">Izomláz és Érzékenység Testtérkép</h4>
                    <div className="max-w-xs mx-auto">
                      <SorenessBodyMap
                        selectedRegions={["calves", "quads"]}
                        readOnly={true}
                      />
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: NUTRITION (PERMISSION-GATED) */}
          {activeTab === "nutrition" && (
            <div>
              {!canStaffAccessModule(permissions, "nutrition") ? (
                <Card variant="surface" radius="20" className="p-10 text-center space-y-2 border border-border-hairline">
                  <Lock className="h-8 w-8 text-text-tertiary mx-auto" />
                  <h4 className="text-15 font-bold text-text-primary">Nincs megosztva</h4>
                  <p className="text-12 text-text-secondary max-w-md mx-auto">
                    A sportoló nem osztotta meg a táplálkozási naplóját és makrócéljait.
                  </p>
                </Card>
              ) : (
                <div className="space-y-4">
                  <Card variant="surface" radius="20" className="p-5 border border-border-hairline space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-15 font-bold text-text-primary">Makrotápanyag Célszámok</h4>
                        <p className="text-11 text-text-secondary">
                          {canStaffWriteModule(permissions, "nutrition")
                            ? "Dietetikusi írási joggal rendelkezel: a célszámok közvetlenül módosíthatók."
                            : "Csak megtekintési jog."}
                        </p>
                      </div>

                      {canStaffWriteModule(permissions, "nutrition") && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            if (isNutritionEditing) {
                              showToast({
                                title: "Új táplálkozási cél elmentve",
                                message: `Szénhidrát: ${carbTarget}g, Fehérje: ${proteinTarget}g (Beállította: ${staffRole})`,
                                type: "success"
                              });
                            }
                            setIsNutritionEditing(!isNutritionEditing);
                          }}
                        >
                          {isNutritionEditing ? "Célok mentése" : "Célok szerkesztése"}
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-12 bg-surface-elevated text-center">
                        <p className="text-11 text-text-secondary">Szénhidrát (g/nap)</p>
                        {isNutritionEditing ? (
                          <input
                            type="number"
                            value={carbTarget}
                            onChange={(e) => setCarbTarget(+e.target.value)}
                            className="w-20 text-center font-mono font-bold text-18 bg-surface rounded-8 border border-border-hairline mt-1"
                          />
                        ) : (
                          <p className="text-18 font-mono font-bold text-text-primary mt-1">{carbTarget}g</p>
                        )}
                        <p className="text-10 text-text-tertiary">~6.0 g/ttkg (Közepes terhelés)</p>
                      </div>

                      <div className="p-3 rounded-12 bg-surface-elevated text-center">
                        <p className="text-11 text-text-secondary">Fehérje (g/nap)</p>
                        {isNutritionEditing ? (
                          <input
                            type="number"
                            value={proteinTarget}
                            onChange={(e) => setProteinTarget(+e.target.value)}
                            className="w-20 text-center font-mono font-bold text-18 bg-surface rounded-8 border border-border-hairline mt-1"
                          />
                        ) : (
                          <p className="text-18 font-mono font-bold text-text-primary mt-1">{proteinTarget}g</p>
                        )}
                        <p className="text-10 text-text-tertiary">~1.8 g/ttkg (Izomregeneráció)</p>
                      </div>

                      <div className="p-3 rounded-12 bg-surface-elevated text-center">
                        <p className="text-11 text-text-secondary">Energia cél</p>
                        <p className="text-18 font-mono font-bold text-text-primary mt-1">3 150 kcal</p>
                        <p className="text-10 text-text-tertiary">BMR + Aktív edzésterhelés</p>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: HEALTH (STRICT PERMISSION GUARD) */}
          {activeTab === "health" && (
            <div>
              {!canStaffAccessModule(permissions, "health") ? (
                <Card variant="surface" radius="20" className="p-10 text-center space-y-3 border-2 border-border-hairline bg-surface/50">
                  <div className="p-3.5 rounded-full bg-surface-elevated text-text-tertiary w-max mx-auto">
                    <Lock className="h-8 w-8" />
                  </div>
                  <h4 className="text-16 font-bold text-text-primary">Nincs megosztva — Egészségügyi adatok védve</h4>
                  <p className="text-13 text-text-secondary max-w-md mx-auto">
                    A sportorvosi, sérülési és fizioterápiás adatok szigorúan védettek. A sportoló ezt a modult
                    kifejezetten nem osztotta meg a fiókoddal.
                  </p>
                  <p className="text-11 text-text-tertiary">
                    (Csak a sportoló kifejezett engedélyével és a kezelőorvos/fizioterapeuta számára érhető el.)
                  </p>
                </Card>
              ) : (
                <div className="space-y-4">
                  <Card variant="surface" radius="20" className="p-5 border border-border-hairline space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-15 font-bold text-text-primary">Orvosi & Fizioterápiás Státusz</h4>
                      <Badge variant="ready" size="sm">Nincs aktív sérülés</Badge>
                    </div>
                    <div className="space-y-2 text-12 text-text-secondary">
                      <p><strong>Utolsó sportorvosi vizsgálat:</strong> 2026-09-15 (Érvényes versenyengedély)</p>
                      <p><strong>Fizioterápiás prevenció:</strong> Heti 2x csípő- és boka mobilitási gyakorlatsor kiírva.</p>
                      <p><strong>Gyógyszer/Allergia:</strong> Nincs bejegyzett gyógyszerhasználat (WADA doppingmentes profil).</p>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: NOTES (STAFF-ONLY PRIVATE VS SHARED) */}
          {activeTab === "notes" && (
            <div className="space-y-4">
              {/* Add Note Form */}
              <Card variant="surface" radius="20" className="p-5 border border-border-hairline space-y-3">
                <h4 className="text-14 font-semibold text-text-primary">Új feljegyzés rögzítése</h4>

                <form onSubmit={handleAddNote} className="space-y-3">
                  <textarea
                    rows={3}
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Szakmai megjegyzés, edzéstapasztalat vagy dietetikusi javaslat..."
                    className="w-full rounded-12 border border-border-hairline bg-bg-surface p-3 text-13 text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <label className="flex items-center gap-2 cursor-pointer text-12 text-text-secondary select-none">
                      <input
                        type="checkbox"
                        checked={isPrivateNote}
                        onChange={(e) => setIsPrivateNote(e.target.checked)}
                        className="rounded text-brand"
                      />
                      <span className="flex items-center gap-1.5 font-medium">
                        {isPrivateNote ? (
                          <>
                            <EyeOff className="h-3.5 w-3.5 text-caution" />
                            Csak szakmai stáb látja (belső titkos jegyzet)
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5 text-ready" />
                            Megosztva a sportolóval (a sportoló is látja)
                          </>
                        )}
                      </span>
                    </label>

                    <Button variant="primary" size="sm" type="submit">
                      Feljegyzés mentése
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Notes List */}
              <div className="space-y-3">
                {notes.map((note) => (
                  <Card
                    key={note.id}
                    variant="surface"
                    radius="20"
                    className={`p-4 border space-y-2 ${
                      note.isPrivateToStaff
                        ? "border-caution/30 bg-caution/5"
                        : "border-border-hairline"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-12 font-bold text-text-primary">{note.authorName}</span>
                        <span className="text-11 text-text-tertiary">({note.authorRole})</span>
                        {note.isPrivateToStaff ? (
                          <Badge variant="caution" size="sm">
                            Belső stábjegyzet
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">
                            Sportolóval megosztva
                          </Badge>
                        )}
                      </div>
                      <span className="text-11 text-text-tertiary">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-13 text-text-secondary leading-relaxed">{note.text}</p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: MESSAGES (PER-ATHLETE TOPIC THREAD) */}
          {activeTab === "messages" && (
            <div className="space-y-4">
              {/* Topic Filters */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {["Mind", "Általános", "Edzés", "Regeneráció", "Étrend", "Sérülés"].map((topic) => (
                  <button
                    key={topic}
                    onClick={() => setActiveTopic(topic)}
                    className={`px-3 py-1.5 rounded-10 text-12 font-medium transition-all ${
                      activeTopic === topic
                        ? "bg-brand text-white font-semibold"
                        : "bg-surface-elevated text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {topic}
                  </button>
                ))}
              </div>

              {/* Message Thread Box */}
              <Card variant="surface" radius="20" className="p-4 border border-border-hairline flex flex-col h-[400px]">
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {messages
                    .filter((m) => activeTopic === "Mind" || m.topic === activeTopic)
                    .map((msg) => {
                      const isMe = msg.senderRole === "coach" || msg.senderId === "current-staff";
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-16 p-3 text-13 ${
                              isMe
                                ? "bg-brand text-white rounded-tr-sm"
                                : "bg-surface-elevated text-text-primary border border-border-hairline rounded-tl-sm"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 text-11 opacity-80 mb-1">
                              <span className="font-semibold">{msg.senderName}</span>
                              <span className="px-1.5 py-0.2 rounded bg-black/20 text-10 font-mono">
                                {msg.topic || "Általános"}
                              </span>
                            </div>
                            <p className="leading-relaxed">{msg.text}</p>
                          </div>

                          <span className="text-10 text-text-tertiary mt-1 px-1">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            {isMe && msg.readBy.length > 1 && " • Látta"}
                          </span>
                        </div>
                      );
                    })}
                </div>

                {/* Send Message Input */}
                <form onSubmit={handleSendMessage} className="pt-3 border-t border-border-hairline flex gap-2">
                  <input
                    type="text"
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    placeholder={`Üzenet ${athlete.displayName} számára (${activeTopic === "Mind" ? "Általános" : activeTopic})...`}
                    className="flex-1 rounded-12 bg-surface-elevated px-3.5 py-2.5 text-13 text-text-primary border border-border-hairline focus:outline-none focus:border-brand"
                  />
                  <Button variant="primary" size="md" type="submit" leftIcon={<Send className="h-4 w-4" />}>
                    Küldés
                  </Button>
                </form>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};
