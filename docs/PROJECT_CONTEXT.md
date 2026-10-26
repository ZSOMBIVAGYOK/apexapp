# Apex Project Context & Architecture Guide

> **Working Title:** Apex  
> **Visual Direction:** Professional elite-sport tool with Apple-level cleanliness. Calm, spacious, high-contrast, data-first, zero clutter. Think "pro cockpit": big numbers, quiet chrome, color only where it carries meaning.  
> **Target Audience:** Athletes (dedicated hobbyists to Olympic-level competitors), Coaches, and Sports Specialists (Dietitian, Physiotherapist, Strength Coach, Sport Psychologist, Team Physician).  
> **Platform Type:** Progressive Web Application (PWA) with offline-first capabilities.

---

## 1. System Architecture & Tech Stack

```
                   ┌──────────────────────────────────────────┐
                   │           Apex PWA (Frontend)            │
                   │  React 18 + TS (Strict) + Vite + Tailwind │
                   │    react-i18next (HU default / EN)       │
                   └────────────────────┬─────────────────────┘
                                        │
           ┌────────────────────────────┼───────────────────────────┐
           ▼                            ▼                           ▼
   ┌───────────────┐           ┌───────────────────┐      ┌──────────────────┐
   │ React Router  │           │  Zustand & Query  │      │  vite-plugin-pwa │
   │ 9 Lazy Routes │           │ State Management  │      │ Service Worker   │
   │  Auth Guard   │           │ Client / Server   │      │ App-Shell Cache  │
   └───────────────┘           └────────┬──────────┘      └──────────────────┘
                                        │
                   ┌────────────────────┴─────────────────────┐
                   │       Firebase Suite (v10 SDK)           │
                   ├──────────────────────────────────────────┤
                   │  • Firebase Auth (Email/Pass & Roles)    │
                   │  • Cloud Firestore (Security Rules)      │
                   │  • Cloud Storage (Biometrics/Scans)      │
                   │  • Cloud Functions (TypeScript v2)       │
                   │  • Cloud Messaging (Web Push)            │
                   │  • Firebase Hosting (CDN + PWA Headers)  │
                   │  • Firebase Emulator Suite (Local Dev)   │
                   └──────────────────────────────────────────┘
```

---

## 2. Design Tokens & Design System

### A. Color Tokens
Defined via CSS variables in [src/app/index.css](file:///Users/zsombi/Downloads/oly/src/app/index.css) and wired into [tailwind.config.js](file:///Users/zsombi/Downloads/oly/tailwind.config.js):
- **Dark Theme (Default):**
  - Background: `#0B0C0F` (`bg-primary`)
  - Surface: `#14161B` (`bg-surface`)
  - Elevated: `#1C1F26` (`bg-elevated`)
  - Hairline Border: `rgba(255, 255, 255, 0.08)` (`border-hairline`)
  - Text Primary: `#F5F6F8` (`text-primary`)
  - Text Secondary: `#9AA1AD` (`text-secondary`)
  - Text Tertiary: `#606877` (`text-tertiary`)
- **Light Theme (Manual or System Override):**
  - Background: `#F5F6F8` (`bg-primary`)
  - Surface: `#FFFFFF` (`bg-surface`)
  - Elevated: `#FFFFFF` with soft layered shadow (`bg-elevated`)
  - Hairline Border: `rgba(0, 0, 0, 0.08)` (`border-hairline`)
  - Text Primary: `#0B0C0F` (`text-primary`)
  - Text Secondary: `#5B6270` (`text-secondary`)
  - Text Tertiary: `#8B93A0` (`text-tertiary`)
- **Accent (Brand):**
  - Brand: `#3D7BFF`
- **Semantic Status Colors:**
  - *Strict Rule:* Used **ONLY** for readiness, alerts, and mechanical load status. Never for ornamental chrome.
  - Ready / Optimal: `#34D399` (`status-ready`)
  - Caution / Monitor: `#FBBF24` (`status-caution`)
  - Rest / High Risk: `#F87171` (`status-rest`)

### B. Typography & Numerals
- **Typeface:** Inter (self-hosted / Google Fonts) with `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text"` fallback.
- **Tabular Numerals:** All metric numbers enforce `.tabular-nums` (`font-variant-numeric: tabular-nums`).
- **Scale:** 12 / 14 / 16 / 20 / 28 / 40 / 64 pt scale. Large numbers use weight 600 and tight letter-spacing (`tracking-tight`).

### C. Spacing, Geometry & Motion
- **8pt Grid:** Radii 12 (`rounded-12`), 20 (`rounded-20`), 28 (`rounded-28`).
- **Frosted Glass:** Backdrop blur with high-alpha surface backgrounds for mobile bottom bars and modal sheets.
- **Motion:** 200ms ease-out transitions (`cubic-bezier(0.16, 1, 0.3, 1)`), count-up circular gauge animations, respecting `@media (prefers-reduced-motion: reduce)`.

---

## 3. Directory Conventions & Feature-Based Architecture

```
src/
├── app/                  # Application root & shell
│   ├── App.tsx           # Providers (QueryClient, Auth, Theme, Router)
│   ├── AppLayout.tsx     # Shell: Mobile bottom nav, desktop sidebar, top search bar
│   ├── index.css         # CSS Tokens (Dark/Light), typography, tabular numbers
│   ├── main.tsx          # React 18 DOM mount point
│   ├── navigation.ts     # Role-aware navigation definitions (Athlete vs Coach/Specialist)
│   └── routes.tsx        # Lazy-loaded route registry & ProtectedRoute guards
│
├── features/             # Business domain features
│   ├── auth/             # Login, register, demo mode, auth store, protected route
│   ├── onboarding/       # Sport selection, competition tier (Olympic, National, Hobby), roles
│   ├── today/            # Daily morning dashboard, readiness score, biometrics, planned workout
│   ├── checkin/          # Subjective recovery check-in (sleep, soreness, stress, energy, HRV)
│   ├── training/         # Workout periodization, session logging, RPE scale, completion
│   ├── nutrition/        # Macro tracking (protein, carbs, fat), hydration logging
│   ├── devices/          # Wearable sync (Garmin, WHOOP, Apple Health, Polar Flow)
│   ├── coach/            # Multidisciplinary staff collaboration & feedback
│   ├── insights/         # ACWR (Acute:Chronic Workload Ratio), Recharts graphs, trend analytics
│   ├── settings/         # Profile, theme switch (Dark/Light/System), language switch (HU/EN)
│   └── design/           # Dev-only styleguide showcasing all 26 components in both themes
│
├── shared/               # Reusable platform code
│   ├── hooks/            # Custom utilities (e.g. useDebounce)
│   ├── lib/              # Infrastructure libraries (Firebase, i18n, Theme, PWA hooks, cn utility)
│   ├── types/            # TypeScript interfaces and domain models
│   └── ui/               # Complete 26-component design system
│
functions/                # Cloud Functions (TypeScript)
│   └── src/index.ts      # Cloud Functions backend endpoints
│
public/                   # Static assets & PWA manifest
    ├── favicon.ico
    ├── apple-touch-icon.png
    ├── offline.html      # Accessible offline fallback page
    └── icons/            # 192x192 & 512x512 PWA icons
```

---

## 4. UI Components Inventory (`src/shared/ui/`)

| Component | Responsibility & Features |
|---|---|
| `Button` | High-contrast, Apple-level quiet chrome, variants (primary, secondary, tertiary, ghost, danger), sizes (sm, md, lg), loading spinner, active scale feedback. |
| `IconButton` | Compact accessible icon trigger with aria-label and tooltip support. |
| `Card` | Canvas containers with surface, elevated, interactive variants, 1px hairline borders, 12/20/28 radii. |
| `StatTile` | Big numbers (weight 600, tabular-nums), trend diffs, status dots, unit labels, source slot. |
| `ProgressRing` | Circular readiness gauge with animated count-up, semantic color mapping, center value and labels. |
| `SegmentedControl` | Apple-style sliding pill segmented control with keyboard arrow navigation. |
| `Tabs` | WAI-ARIA tab list, tab panels, keyboard arrow navigation, line & pill variants. |
| `BottomSheet` | Mobile drawer sliding from bottom with drag indicator; transforms into centered modal on desktop (>=1024px). |
| `Input` | High-contrast input with floating label, clear button, error state, and leading/trailing icons. |
| `NumberInput` | Metric input with stepper buttons (+/-), tabular numerals, keyboard up/down arrows. |
| `Slider` | Smooth track with labelled steps/ticks (e.g. RPE 1-10, sleep hours), keyboard slider navigation. |
| `Stepper` | Multi-step process indicator for onboarding and multi-stage workouts. |
| `Select` | Custom styled dropdown select with keyboard navigation, option list, checkmarks. |
| `Toggle` | iOS-style switch toggle with smooth spring animation, keyboard Space/Enter. |
| `Chip` | Filter tag and selectable pill with dismissible option. |
| `Avatar` | Profile image with initials fallback and status indicator dot. |
| `Badge` | Micro-badges (neutral, brand, ready, caution, rest, outline) with optional dot. |
| `Toast` & `toastStore` | App-wide notification toasts with status icons and auto-dismissal. |
| `Skeleton` | Pulse placeholders for loading states (text, circular, rectangular, card, tile). |
| `EmptyState` | Quiet empty state with icon, title, description, and primary action button. |
| `ListRow` | Data row with leading icon, title, subtitle, right value, status badge, and chevron. |
| `SectionHeader` | Clean section header with title, description, badge, and action slots. |
| `ChartFrame` | Wrapper for charts with title, time range selector (7D / 28D / YTD), and loading/empty states. |
| `CalendarPrimitives` | `WeekStrip` day selector with workout/readiness indicators for periodization. |
| `SourceBadge` | Biometric data origin indicator: Manual, Garmin, WHOOP, File. |
| `ConfidenceMeter` | Data accuracy and confidence level indicator (High / Medium / Low). |

---

## 5. Screen State Architecture (Quality Bar)

Every screen is required to support three states:
1. **Loading State:** Skeleton layout matching the final page geometry to prevent content layout shifts.
2. **Empty State:** Uncluttered `EmptyState` with descriptive copy and a clear call-to-action button (no dead buttons).
3. **Error State:** High-contrast alert card with an actionable retry button (`Button variant="danger"`).

---

## 6. The 10 Build Stages Roadmap

| Stage | Name | Description | Status |
|---|---|---|---|
| **Stage 1** | **Foundation & Scaffold** | Project scaffold, ESLint, Prettier, path aliases, Firebase config & emulators, PWA manifest, service worker caching, offline fallback, lazy routing shell, Hungarian/English i18n, and WCAG AA mobile-first UI shell. | **Completed** |
| **Stage 2** | **Design System & Cockpit App Shell** | Complete design tokens (Dark `#0B0C0F` default, Light `#F5F6F8`), 26 accessible components, Apple-clean cockpit layout, mobile 5-tab bar with collapsing header, desktop sidebar (>=1024px) with search & notifications, role-aware navigation (Athlete vs Coach/Specialist), dev-only `/design` styleguide. | **Completed** |
| **Stage 3** | **Authentication, Multi-Role Profiles & Onboarding** | Firebase Auth (Email/Pass, Google, Apple), session persistence, localized error codes, multi-role user profile in Firestore (`users/{uid}`), 7-step resumable onboarding state machine with Vitest unit tests, mandatory GDPR Art. 9 health-data consent, adaptive UI via `useAppMode()`, extended settings with units, live mode changers, JSON data export, and Cloud Function `deleteUserData` account erasure. | **Completed** |
| **Stage 4** | **Firestore Data Model, Security Rules & Sharing System** | Granular data model (`athletes/{id}/*`, `relationships/{id}`, `threads`, `invites`), standard record metadata (`source`, `confidence`), strict `firestore.rules` denying by default, zero-trust athlete ownership, 40 unit tests, permission presets (Coach, Dietitian, Physio, Strength, Psychologist, Physician), Cloud Functions (`createInvite`, `acceptInvite`, `updatePermissions`, `revokeAccess`), "Ki mit lát?" UI screen with audit log drawer. Documented in `docs/DATA_MODEL.md`. | **Completed (Current)** |
| **Stage 5** | **Morning Check-in & Readiness Engine** | Recovery score calculation engine, HRV and resting HR integration, daily subjective fatigue markers, persistent Firestore check-in collection. | Upcoming |
| **Stage 6** | **Training Engine & Periodization** | Structured training blocks, interval timer, mechanical volume calculation, session completion logs, RPE-based load adjustment. | Upcoming |
| **Stage 7** | **Nutrition & Hydration Tracking** | Macronutrient distribution, pre/post workout nutrient timing, hydration progress logger with custom water volume increments. | Upcoming |
| **Stage 8** | **Wearable Devices & Sensor Sync** | Webhook and OAuth integrations with Garmin Connect, WHOOP 4.0, Apple HealthKit, and Polar Flow; background biometric syncing. | Upcoming |
| **Stage 9** | **Coaching Staff & Specialist Hub** | Multi-user collaboration for dietitians, physiotherapists, strength coaches, psychologists, and physicians; athlete note sharing and invitation workflows. | Upcoming |
| **Stage 10** | **Push Notifications, Hardening & Deployment** | Firebase Cloud Messaging (FCM) web push notifications, automated daily check-in reminders, scheduled weekly digests via Cloud Functions, security auditing, and production deployment. | Upcoming |

---

## 7. Stage 3 Implementation Details & Architectural Decisions

### A. Authentication & User Model
- **Firebase Auth Providers:** Email + Password, Google Sign-in (`signInWithPopup`), Apple Sign-in (`OAuthProvider("apple.com")`), password reset (`triggerPasswordReset`), email verification reminder banner (`triggerEmailVerification`), and `browserLocalPersistence` session persistence.
- **Error Code Translation:** Clean mapper `getAuthErrorMessageKey` translates raw Firebase codes (`auth/invalid-credential`, `auth/email-already-in-use`, `auth/weak-password`, `auth/popup-closed-by-user`, etc.) into localized Hungarian and English notices.
- **Firestore Schema (`users/{uid}`):**
  - Identity & Locale: `uid`, `email`, `displayName`, `photoURL`, `locale` ('hu' | 'en'), `units` ('metric' | 'imperial'), `timezone`.
  - Roles & Multi-Role Support: `roles` (`('athlete' | 'coach' | 'specialist')[]`), `role` (primary/view), `specialties` (`SpecialistDiscipline[]`).
  - Modes: `dataMode` ('device' | 'manual' | 'hybrid'), `supportMode` (`('solo' | 'coach' | 'specialist')[]`).
  - Compliance: `onboardingCompleted` (boolean), `consent: { healthData: { accepted: boolean, version: string, timestamp: string } }`.
  - Biometric & Athlete Profile: `sports`, `sport`, `level` ('hobby' | 'competitive_amateur' | 'national' | 'national_team' | 'olympic'), `birthDate`, `sex`, `heightCm`, `weightKg`, `goals`, `targetCompetition`, `targetCompetitionDate`.
  - Baseline & Nutrition: `sleepHoursBaseline`, `trainingDaysPerWeek`, `restingHeartRateBaseline`, `currentInjuries`, `dietaryPreferences`, `allergiesIntolerances`, `nutritionGoal`, `plateBasedViewOnly`.

### B. 7-Step Onboarding Wizard & Pure State Machine
- **State Machine (`onboardingMachine.ts`):** Pure reducer handling `NEXT_STEP`, `PREV_STEP`, `GO_TO_STEP`, `UPDATE_DATA`, `SKIP_STEP`, `RESET`, `LOAD_DRAFT`.
- **Steps:**
  1. *Role:* Sportoló, Edző, Szakember (multi-role enabled; specialist chooses discipline).
  2. *Athlete Profile:* Main sports, competition level, birthdate, optional sex, height/weight, goals, target competition (skippable).
  3. *Data Source:* 3 interactive cards (Wearables / Manual / Hybrid).
  4. *Support Mode:* Solo / Coach / Specialist multi-select with coach invite input (skippable).
  5. *Baseline:* Sleep hours slider, training days stepper, resting HR, injury notes (skippable).
  6. *Nutrition Basics:* Diet chips, allergy chips, goal, plate-based view toggle (skippable).
  7. *GDPR Art. 9 Consent:* Explicit health & biometric data consent checkbox, link to `/privacy`, consent versioning. **Non-skippable and blocking**.
- **Draft Persistence:** Auto-saved and resumable via `localStorage` draft key `apex_onboarding_draft_${uid}`.
- **Unit Tests:** 8 pure Vitest unit tests in `src/features/onboarding/onboardingMachine.test.ts` covering initial state, navigation, step skipping, validation, consent blocking, and deserialization.

### C. Adaptive UI (`useAppMode`)
- `useAppMode()` exposes boolean flags (`isManualOnly`, `isDeviceOnly`, `isHybrid`, `isSolo`, `hasCoach`, `hasSpecialist`, `plateBasedViewOnly`) and live mode mutators (`setDataMode`, `setSupportMode`, `toggleRole`).
- UI automatically adapts:
  - In `manual` mode, manual-entry forms are prioritized; device sync displays informative guidance.
  - In `device` mode, automated wearable status is highlighted.
  - In `solo` mode, the app functions as the virtual AI coach.
  - With a coach (`hasCoach`), workouts display head-coach approval badges.
  - With `plateBasedViewOnly`, numerical calories are hidden in favor of visual macronutrient plate proportions.

### D. Settings, Portability & Cloud Function Deletion
- **Settings:** Live theme switch (Dark / Light / System), language switch (HU / EN), measurement units (Metric / Imperial), live data/support mode toggles, and notification preferences.
- **GDPR Art. 20 Data Portability:** Downloadable JSON export containing full profile, settings, and telemetry history.
- **GDPR Art. 17 Right to Erasure:** Dangerous zone confirmation dialog calls `deleteUserData` Cloud Function, recursively wiping Firestore documents, subcollections, collaborations, and Firebase Auth record.

---

## 8. Stage 4 Implementation Details & Data Governance

### A. Granular Data Model & Provenance
- Detailed in [docs/DATA_MODEL.md](file:///Users/zsombi/Downloads/oly/docs/DATA_MODEL.md).
- Isolated root document and subcollections under `athletes/{athleteId}`:
  - `days/{yyyy-MM-dd}`: Recovery & morning check-in aggregates
  - `sessions/{sessionId}`: Completed training sessions with intervals
  - `plannedWorkouts/{workoutId}`: Prescribed workouts
  - `nutritionDays/{date}` & `entries/{entryId}`: Macros & meals
  - `injuries/{injuryId}`: Musculoskeletal injuries (**HEALTH** module)
  - `measurements/{measurementId}`: Lab tests & body composition (**HEALTH** module)
  - `notes/{noteId}`: Confidential consultations (**HEALTH** module)
  - `devices/{deviceId}`: Hardware sensors
- Every data record enforces `source`, `confidence` (0-1), `createdAt`, `updatedAt`, `updatedBy`.

### B. Security Rules & Zero-Trust Governance
- Deny by default (`firestore.rules`).
- The athlete owns their entire data tree (`athletes/{athleteId}/**`).
- Access for coaches and specialists is strictly granted on a per-module basis via `relationships/{athleteId}_{memberId}`.
- Coaches do NOT see the `health` module (injuries, measurements, notes) unless explicitly granted.
- Members cannot elevate their own permissions (enforced by security rules).
- 40 unit tests verifying all security rules in `src/shared/lib/sharing/rules.test.ts`.

### C. Cloud Functions for Access Management
- `createInvite`: Athlete generates 7-day cryptographic invite codes (`APX-XXXXX`) with role presets.
- `acceptInvite`: Member accepts invite, establishing the active relationship and logging the audit event.
- `updatePermissions`: Athlete modifies module permissions, appending a diff to the audit log.
- `revokeAccess`: Athlete instantly revokes access, setting all permissions to `'none'` and recording the revocation.

### D. "Ki mit lát?" (Who Sees What) UI
- Dedicated screen at `/settings/sharing` ([SharingSettingsPage.tsx](file:///Users/zsombi/Downloads/oly/src/features/settings/pages/SharingSettingsPage.tsx)):
  - Zero-Trust ownership banner
  - Connected staff cards with per-module `[none | read | write]` SegmentedControls
  - Special lock indicator and warning on the Health module
  - Instant Revoke confirmation dialog
  - Audit Log drawer displaying immutable history of permission modifications
  - Multi-discipline invite modal with automatic presets (Coach, Dietitian, Physio, Strength, Psychologist, Physician)

---

## 9. Stage 5 Implementation Details: Manual Logging, Daily Check-in & Readiness Engine

### A. Pure Readiness Engine (`src/shared/lib/readiness/`)
- Zero UI dependencies, pure TypeScript module.
- **Config-Driven Architecture (`readinessConfig.ts`):**
  - Tunable weights and thresholds for sports scientists.
  - Dual scoring paths:
    - **(a) Biometric Path:** HRV rMSSD z-score from 28-day rolling baseline, resting HR delta from baseline, sleep duration vs target, sleep quality.
    - **(b) Manual Path:** Hooper-Mackinnon subjective wellness (fatigue, muscle soreness, stress, mood, motivation) combined with sleep duration and quality.
    - **(c) Hybrid Path:** Blended weighted score (60% biometric, 40% subjective).
- **Readiness Bands:**
  - `green` (Score >= 67): Optimal readiness for key high-intensity work.
  - `amber` (Score 34–66): Moderate readiness, prioritize controlled aerobic volume.
  - `red` (Score < 34): Recovery required, focus on sleep, mobility, and light active recovery.
- **Confidence Scoring (0–100%):** Evaluates data completeness based on presence of sleep metrics, full Hooper index, HRV, resting HR, and baseline history.
- **Cold-Start Calibration:**
  - Flags `isCalibrating = true` for athletes with < 14 recorded days.
  - Soft guidance message and progress indicator (`daysCollected / 14`).
- **Primary Driver Diagnostics (Top 3):** Automatically extracts and ranks the top 3 physiological and subjective drivers by absolute impact weight (e.g., sleep deficit, HRV suppression, resting HR elevation, acute load spike, acute illness).
- **Acute Illness Penalty:** Active illness triggers a 35-point deduction, caps maximum readiness score at 40, and ranks illness as the top driver.
- **Unit Test Suite:** 13 unit tests in `src/shared/lib/readiness/readinessEngine.test.ts` verifying all scoring paths, cold-start calibration, confidence calculation, and driver rankings.

### B. Daily Check-in (`src/features/checkin/pages/CheckinPage.tsx`)
- Target: Under 30 seconds completion time with touch-friendly controls.
- **Sleep Module:**
  - Dual input: Duration slider/stepper vs. Bed & Wake time inputs with live duration calculation.
  - Hooper 1–5 sleep quality touch chips.
  - Device prefill support with `SourceBadge` (Garmin / WHOOP) and single-tap override.
- **Hooper Subjective Wellness Index (1–5 Sliders):**
  - Fatigue, Muscle Soreness, Stress, Mood, Motivation with clearly labelled endpoints.
- **Interactive Anatomical Body Map (`SorenessBodyMap.tsx`):**
  - Front and back view silhouette toggle.
  - Tappable muscle groups: neck, shoulders, chest, biceps, abs, quads, knees, shins, traps, lower back, glutes, hamstrings, calves, achilles.
  - Visual pulse indicators and active sore region badges.
- **Optional Morning Biometrics:**
  - Resting HR (bpm), HRV rMSSD (ms), body weight (kg) with device source badges.
  - Appetite rating (1–5) and active illness toggle.

### C. Manual Session Log (`ManualSessionModal.tsx` & `TrainingPage.tsx`)
- Zero-device workout tracking.
- Sport selection (Running, Cycling, Swimming, Strength, Rowing, Mobility, Other).
- Start time, duration (min), notes.
- **Borg CR10 Perceived Exertion Scale:** RPE 1–10 with descriptive plain-language labels.
- **Foster Session-RPE Load Calculation:** Real-time display of `duration (min) × RPE` AU (Arbitrary Units).
- **Quick-Add Templates:** Pre-configured workouts (Z2 Base Run, Strength Block A, Threshold Swim, Recovery Spin).
- **"Tegnapi edzés másolása":** One-click duplication of yesterday's workout.
- Full edit and delete with confirmation dialog.

### D. Sleep & Recovery Overview Screens (`src/features/insights/pages/InsightsPage.tsx`)
- **Sleep Analysis:**
  - Last night sleep details (duration, quality, bed/wake times, device source badge).
  - In-place editable athlete sleep target (default 8.0h).
  - 7-day accumulated sleep debt calculation (`sum(max(0, target - actual))`).
  - 7-day & 30-day interactive Recharts bar chart with target reference line.
- **Recovery Overview:**
  - Large Readiness gauge ring (`ProgressRing`) with color status.
  - Confidence meter (`ConfidenceMeter`) showing data completeness.
  - Cold-start calibration progress bar.
  - Top 3 primary drivers with positive/negative pill indicators.
  - 14-day Readiness & Confidence trend area chart.
  - ACWR (1.14 optimal) and weekly training volume tiles.

### E. Offline-First Architecture (`src/shared/lib/offline/offlineStorage.ts`)
- Immediate local synchronous caching for check-ins and sessions.
- Background queue for mutations when offline with automatic flush upon reconnection (`window.ononline`).
- `SyncStatusBadge` component showing live state: "Szinkronizálva", "Offline mentve", "Szinkronra vár (N)", "Szinkronizálás...".

---

## 10. Stage 6 Implementation Details: Training Calendar, Season Planning, Workout Builder & Load Analytics

### A. Load Analytics Engine (`src/shared/lib/load/loadCalculator.ts`)
- Pure TypeScript module with zero UI dependencies.
- **Session Load Calculation:**
  - **Power TSS (Coggan method):** $TSS = \frac{t_{sec} \times NP \times IF}{FTP \times 3600} \times 100$ when power data and FTP are available.
  - **hrTSS (Heart Rate method):** $hrTSS = t_{hours} \times \left(\frac{avgHR}{LTHR}\right)^2 \times 100$ when HR data and LTHR are available.
  - **Foster Session-RPE:** $AU = \text{duration (min)} \times \text{RPE (1-10)}$ (clamped to $[1, 10]$ Borg CR10 scale).
- **Bannister Impulse-Response Performance Management:**
  - Chronic Training Load (CTL / Fitness): 42-day exponentially weighted moving average ($\lambda_{CTL} = 1 - e^{-1/42} \approx 0.0235$).
  - Acute Training Load (ATL / Fatigue): 7-day exponentially weighted moving average ($\lambda_{ATL} = 1 - e^{-1/7} \approx 0.1331$).
  - Training Stress Balance (TSB / Form): $TSB = CTL_{t-1} - ATL_{t-1}$ (morning freshness balance prior to today's training).
  - Multi-day series calculation with past historical load and projected future planned workouts (rendered as dashed lines).
- **Load Metrics & Ratios:**
  - **Weekly Ramp Rate:** $CTL_{today} - CTL_{today-7d}$ (safe progression $+3$ to $+7$/week; $>+8$ flags rapid ramp).
  - **Acute:Chronic Workload Ratio (ACWR):** 7-day rolling acute load mean divided by 28-day chronic load mean. Safe/Sweet-Spot zone is $0.8 - 1.3$; $>1.5$ indicates high injury risk.
  - **Foster Monotony & Strain:** Monotony is the ratio of daily mean load to standard deviation over 7 days ($\frac{\bar{x}_7}{\sigma_7}$, capped at 4.0). Strain is weekly total load multiplied by monotony. Values $>2.0$ indicate lack of recovery variation.
  - **Weekly Compliance:** $\frac{\text{Completed Load}}{\text{Planned Load}} \times 100\%$ with color status badge ($85\%+$ optimal, $70-84\%$ caution, $<70\%$ low).
- **Unit Tests:** 13 unit tests in `src/shared/lib/load/loadCalculator.test.ts` verifying all formulas, time constants, projections, and metric explanations.

### B. Season Planner & Backward Periodization Engine (`src/shared/lib/periodization/periodizationEngine.ts`)
- **Backward Periodization (`generateBackwardPeriodization`):**
  - Calculates backward in time from the target A-race date:
    - *Race:* 1 week (ends on race date, $30\%$ peak volume, race-day execution).
    - *Taper:* 2 weeks prior ($55\%$ volume, race intensity maintained, supercompensation).
    - *Peak:* 2 weeks prior ($100\%$ peak volume, simulation workouts, nutrition rehearsal).
    - *Build:* 6 weeks prior ($95\%$ volume, threshold intervals, VO2max development).
    - *Base:* 8 weeks prior ($85\%$ volume, aerobic Z2 foundation, mitochondrial density).
    - *Transition:* 2+ weeks prior ($40\%$ volume, active recovery, cross-training).
- **Tapering Helper Curve (`calculateTaperSchedule`):**
  - 14-day progressive exponential volume reduction ($V(t) = preTaper \times (0.35 + 0.55 e^{-0.12 t})$) based on Mujika & Padilla (2003).
  - 4 scientific core principles: Volume drops $40-60\%$, intensity maintained at race pace, frequency maintained at $\ge 80\%$, sleep and carbohydrate loading maximized.
- **A-Race Countdown:** Daily and weekly remaining countdown calculator with status formatting.
- **Unit Tests:** 6 unit tests in `src/shared/lib/periodization/periodizationEngine.test.ts`.

### C. 5-Zone Thresholds & Zone Models (`src/shared/lib/zones/zoneCalculator.ts`)
- **Heart Rate Zones (5-Zone):** Joe Friel model based on LTHR ($Z1 <85\%$, $Z2\ 85-89\%$, $Z3\ 90-94\%$, $Z4\ 95-100\%$, $Z5 >100\%$), with fallback to Max HR percentage model ($50-60\%, 60-70\%, 70-80\%, 80-90\%, 90-100\%$).
- **Power Zones (5-Zone):** Andy Coggan standard (% of FTP: $Z1 <55\%$, $Z2\ 56-75\%$, $Z3\ 76-90\%$, $Z4\ 91-105\%$, $Z5 >105\%$).
- **Running Pace Zones (5-Zone):** Jack Daniels / Joe Friel standard (% of Threshold Pace in seconds/km).
- **Critical Swim Speed (CSS):** Pace offsets per 100m.
- **Unit Tests:** 7 unit tests in `src/shared/lib/zones/zoneCalculator.test.ts`.

### D. Solo Mode Plan Generator (`src/shared/lib/planner/soloPlanGenerator.ts`)
- **Pluggable Architecture:** Implements `IPlanGenerator` interface ready for future AI planner integration.
- **`RuleBasedPlanGenerator`:** Generates full periodized calendar with structured blocks (Warmup, Main, Interval with repeats and rest, Cooldown) mapped to the athlete's training days per week ($3-6$ days) and weekly available hours ($4-18$ hours).
- **Unit Tests:** 2 unit tests in `src/shared/lib/planner/soloPlanGenerator.test.ts`.

### E. Training User Interface Components (`src/features/training/`)
1. **`SeasonPlannerTimeline.tsx`:**
   - Visual periodization timeline strip displaying active phases with colors and status.
   - A-race countdown banner with distance, date, and target time.
   - A/B/C competition chips with priority markers.
   - Interactive Tapering Helper bottom sheet with the 14-day decay curve.
   - Phase detail modal showing physiological targets.
2. **`PerformanceManagementChart.tsx`:**
   - Interactive Recharts composed chart showing CTL (Blue), ATL (Red), TSB (Green), and Daily Load bars.
   - Dashed projection lines for future planned workouts.
   - 4-week, 8-week, and Full Season range toggles.
   - Top metrics strip: Today's CTL, ATL, TSB, Weekly Ramp Rate, ACWR, and Foster Monotony.
   - "Hogyan működik?" bottom sheet with plain-language explanations.
3. **`TrainingCalendar.tsx`:**
   - Week, Month, and Day views with fluid navigation.
   - Distinct styles for Completed (solid, checkmark, actual duration & load), Planned (dashed border, clock, target duration & load), Modified (amber badge), and Skipped (strikethrough, rose badge).
   - Sport color coding (Running: Emerald, Cycling: Blue, Swimming: Cyan, Strength: Purple, Triathlon: Amber).
   - HTML5 drag-and-drop rescheduling on desktop and mobile long-press/touch move sheet.
   - Daily load badges and weekly summary row (Volume, Completed vs. Planned Load, Compliance %).
4. **`WorkoutBuilderModal.tsx`:**
   - Structured blocks builder (Warmup, Main, Interval with repeats & rest, Cooldown) with RPE, HR zone, Power, and Pace targets.
   - Strength session builder with exercises, sets, reps, load (kg), RPE, and rest seconds.
   - Pre-built Template Library quick loader.
   - "Hét másolása" (Copy week) duplication tool.
5. **`WorkoutFeedbackModal.tsx`:**
   - Coach provenance badge ("Edző: Kiss Péter tervezte").
   - Completed, Modified, or Skipped status selector.
   - Borg CR10 RPE slider with descriptive text, actual duration, and athlete feedback comments.
   - Structured skip reasons (fatigue, illness, injury, time, weather, other) and modification reasons.
6. **`ThresholdsAndZonesModal.tsx`:**
   - Physiological inputs (Max HR, LTHR, FTP, Threshold Pace, CSS).
   - Interactive 5-zone tables with automatic recalculation.
7. **`SoloPlanGeneratorWizard.tsx`:**
   - Wizard to generate rule-based periodized training plans from race goals.

---

> **Requirement:** At the completion of each subsequent stage, this document must be updated with the stage's achievements, architectural decisions, and updated status.


