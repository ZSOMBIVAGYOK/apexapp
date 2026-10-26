/**
 * Mock Data for Coach & Specialist Workspace
 */

import {
  CoachAthleteRosterItem,
  CoachMessage,
  CoachAthleteNote,
  StaffActivityLogEntry
} from "@shared/types/coach";

export const MOCK_ROSTER_ATHLETES: CoachAthleteRosterItem[] = [
  {
    athleteId: "ath-001",
    displayName: "Kovács Zsombor",
    photoURL: null,
    sport: "running",
    group: "Felnőtt Válogatott",
    readinessScore: 84,
    readinessZone: "ready",
    readinessConfidence: 0.95,
    lastCheckInTime: "Ma, 07:15",
    sevenDayLoadTrend: "increasing",
    formTsb: 4,
    formStatus: "optimal",
    weeklyCompliancePercent: 94,
    openAlertsCount: 0,
    alerts: [],
    permissions: {
      training: "write",
      recovery: "read",
      nutrition: "read",
      health: "write",
      devices: "read",
      messages: "write"
    },
    status: "active",
    memberRole: "coach",
    specialty: "other"
  },
  {
    athleteId: "ath-002",
    displayName: "Nagy Dániel",
    photoURL: null,
    sport: "triathlon",
    group: "U23 Triatlon",
    readinessScore: 32,
    readinessZone: "rest",
    readinessConfidence: 0.92,
    lastCheckInTime: "Ma, 06:40",
    sevenDayLoadTrend: "increasing",
    formTsb: -22,
    formStatus: "overreaching",
    weeklyCompliancePercent: 88,
    openAlertsCount: 2,
    alerts: [
      {
        id: "alert-001",
        athleteId: "ath-002",
        athleteName: "Nagy Dániel",
        type: "load_spike",
        module: "training",
        severity: "critical",
        title: "Hirtelen terhelési ugrás (ACWR 1.64)",
        message: "Az Akut:Krónikus Terhelési Arány (ACWR) elérte az 1.64-es értéket. Túlterhelés és sérüléskockázat a hétvégi hosszú futás után.",
        metricValue: "1.64",
        thresholdValue: "1.50",
        createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        status: "active"
      },
      {
        id: "alert-002",
        athleteId: "ath-002",
        athleteName: "Nagy Dániel",
        type: "readiness_red",
        module: "recovery",
        severity: "critical",
        title: "Kritikusan alacsony readiness 2 napja",
        message: "Dániel készenléti indexe 2 egymást követő napon a Pihenő (vörös) zónában van (32/100 és 29/100).",
        metricValue: "32",
        thresholdValue: "40",
        createdAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
        status: "active"
      }
    ],
    permissions: {
      training: "write",
      recovery: "read",
      nutrition: "read",
      health: "none", // Health is NOT shared with coach!
      devices: "read",
      messages: "write"
    },
    status: "active",
    memberRole: "coach"
  },
  {
    athleteId: "ath-003",
    displayName: "Szabó Lili",
    photoURL: null,
    sport: "swimming",
    group: "Felnőtt Válogatott",
    readinessScore: 56,
    readinessZone: "caution",
    readinessConfidence: 0.88,
    lastCheckInTime: "Tegnap, 21:45",
    sevenDayLoadTrend: "stable",
    formTsb: -6,
    formStatus: "neutral",
    weeklyCompliancePercent: 78,
    openAlertsCount: 1,
    alerts: [
      {
        id: "alert-003",
        athleteId: "ath-003",
        athleteName: "Szabó Lili",
        type: "sleep_deprivation",
        module: "recovery",
        severity: "caution",
        title: "Krónikus alváshiány (3 éjszaka < 6h)",
        message: "Lili alvásideje az elmúlt 3 éjszaka átlagosan 5 óra 25 perc volt. Regenerációs deficit várható a hajnali edzések előtt.",
        metricValue: "5.4h",
        thresholdValue: "6.0h",
        createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        status: "active"
      }
    ],
    permissions: {
      training: "write",
      recovery: "read",
      nutrition: "write",
      health: "none",
      devices: "read",
      messages: "write"
    },
    status: "active",
    memberRole: "coach"
  },
  {
    athleteId: "ath-004",
    displayName: "Tóth Bence",
    photoURL: null,
    sport: "running",
    group: "Maraton Keret",
    readinessScore: 48,
    readinessZone: "caution",
    readinessConfidence: 0.72,
    lastCheckInTime: "3 napja",
    sevenDayLoadTrend: "decreasing",
    formTsb: 14,
    formStatus: "optimal",
    weeklyCompliancePercent: 52,
    openAlertsCount: 2,
    alerts: [
      {
        id: "alert-004",
        athleteId: "ath-004",
        athleteName: "Tóth Bence",
        type: "missed_checkins",
        module: "recovery",
        severity: "caution",
        title: "Hiányzó reggeli check-in (3 napja)",
        message: "Bence 3 napja nem rögzített reggeli alvás- és wellness adatokat.",
        metricValue: "3 nap",
        thresholdValue: "3 nap",
        createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        status: "active"
      },
      {
        id: "alert-005",
        athleteId: "ath-004",
        athleteName: "Tóth Bence",
        type: "low_compliance",
        module: "training",
        severity: "caution",
        title: "Alacsony edzésterv-megfelelés (52%)",
        message: "A héten kiírt 6 edzésből csupán 3 valósult meg.",
        metricValue: "52%",
        thresholdValue: "60%",
        createdAt: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
        status: "active"
      }
    ],
    permissions: {
      training: "write",
      recovery: "read",
      nutrition: "none",
      health: "none",
      devices: "none",
      messages: "write"
    },
    status: "active",
    memberRole: "coach"
  },
  {
    athleteId: "ath-005",
    displayName: "Horváth Máté (Visszavont)",
    photoURL: null,
    sport: "cycling",
    group: "U23 Triatlon",
    readinessScore: undefined,
    sevenDayLoadTrend: "stable",
    formTsb: 0,
    formStatus: "neutral",
    weeklyCompliancePercent: 0,
    openAlertsCount: 0,
    alerts: [],
    permissions: {
      training: "none",
      recovery: "none",
      nutrition: "none",
      health: "none",
      devices: "none",
      messages: "none"
    },
    status: "revoked", // REVOKED ACCESS DEMO
    memberRole: "coach"
  }
];

export const MOCK_COACH_MESSAGES: Record<string, CoachMessage[]> = {
  "ath-001": [
    {
      id: "msg-101",
      athleteId: "ath-001",
      senderId: "coach-001",
      senderName: "Dr. Varga Tamás (Vezetőedző)",
      senderRole: "coach",
      topic: "Edzés",
      text: "Szia Zsombor! A holnapi 6x1000m küszöbök tempóját 3:05-re terveztem. Hogy érzed a combhajlítódat a tegnapi súlyzózás után?",
      readBy: ["ath-001", "coach-001"],
      readAt: { "ath-001": "2026-10-26T15:20:00Z" },
      createdAt: "2026-10-26T14:30:00Z"
    },
    {
      id: "msg-102",
      athleteId: "ath-001",
      senderId: "ath-001",
      senderName: "Kovács Zsombor",
      senderRole: "athlete",
      topic: "Edzés",
      text: "Szia Tamás bá! Teljesen rendben vagyok, a nyújtás és hengerezés segített. A 3:05 reális lesz a reggeli hűvösben.",
      readBy: ["ath-001", "coach-001"],
      readAt: { "coach-001": "2026-10-26T15:45:00Z" },
      createdAt: "2026-10-26T15:35:00Z"
    }
  ],
  "ath-002": [
    {
      id: "msg-201",
      athleteId: "ath-002",
      senderId: "coach-001",
      senderName: "Dr. Varga Tamás (Vezetőedző)",
      senderRole: "coach",
      topic: "Regeneráció",
      text: "Dani, látom a mai WHOOP adataidat, a readiness 32-re esett. A mai résztávot átállítom könnyű 40 perces zóna 2 regenerációra.",
      readBy: ["coach-001"],
      readAt: {},
      createdAt: "2026-10-26T08:15:00Z"
    }
  ]
};

export const MOCK_COACH_NOTES: Record<string, CoachAthleteNote[]> = {
  "ath-001": [
    {
      id: "note-1",
      athleteId: "ath-001",
      authorId: "coach-001",
      authorName: "Dr. Varga Tamás",
      authorRole: "Vezetőedző",
      isPrivateToStaff: true, // PRIVATE STAFF NOTE
      text: "A szintfelmérő adatok alapján Zsombor VO2max-ja 76 ml/kg/min-re emelkedett. Az olimpia felkészülés csúcsidőszakát november 15-re időzítjük.",
      tags: ["VO2max", "Olimpia", "Periodizáció"],
      createdAt: "2026-10-24T18:00:00Z",
      updatedAt: "2026-10-24T18:00:00Z"
    },
    {
      id: "note-2",
      athleteId: "ath-001",
      authorId: "staff-diet",
      authorName: "Molnár Eszter",
      authorRole: "Sportdietetikus",
      isPrivateToStaff: false, // SHARED WITH ATHLETE
      text: "A hétvégi hosszú futás előtt emeltük a szénhidráttöltést 9 g/ttkg-ra. Frissítés verseny közben: óránként 90g CH maltodextrin/fruktóz arányban.",
      tags: ["Szénhidrát", "Frissítés"],
      createdAt: "2026-10-25T11:30:00Z",
      updatedAt: "2026-10-25T11:30:00Z"
    }
  ]
};

export const MOCK_STAFF_ACTIVITY_FEED: StaffActivityLogEntry[] = [
  {
    id: "act-1",
    athleteId: "ath-001",
    staffId: "coach-001",
    staffName: "Dr. Varga Tamás",
    staffRole: "Vezetőedző",
    actionType: "workout_modified",
    description: "Módosította a keddi 6x1000m küszöbedzés céltempóját (3:05 /km).",
    timestamp: "2026-10-26 14:30"
  },
  {
    id: "act-2",
    athleteId: "ath-001",
    staffId: "staff-diet",
    staffName: "Molnár Eszter",
    staffRole: "Sportdietetikus",
    actionType: "target_updated",
    description: "Frissítette a versenyhét makrotápanyag célszámait (520g CH, 145g Fehérje).",
    timestamp: "2026-10-25 11:30"
  },
  {
    id: "act-3",
    athleteId: "ath-002",
    staffId: "coach-001",
    staffName: "Dr. Varga Tamás",
    staffRole: "Vezetőedző",
    actionType: "alert_acknowledged",
    description: "Nyugtázta az ACWR terhelési ugrás (1.64) riasztást.",
    timestamp: "2026-10-26 08:30"
  }
];

export const MOCK_GROUPS = [
  "Mindegyik csoport",
  "Felnőtt Válogatott",
  "U23 Triatlon",
  "Maraton Keret"
];
