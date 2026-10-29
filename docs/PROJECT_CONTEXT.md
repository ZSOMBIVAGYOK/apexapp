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

## 2. Liquid Glass Design System & Design Tokens

Detailed reference documented in [docs/DESIGN_SYSTEM.md](file:///Users/zsombi/Downloads/oly/docs/DESIGN_SYSTEM.md) and [src/shared/ui/tokens/](file:///Users/zsombi/Downloads/oly/src/shared/ui/tokens/index.ts).

### A. Color & Material Tokens
- **Dark Theme (Default):**
  - Base Background: `#07080B` (`bg-primary`)
  - Content Surface: `rgba(255, 255, 255, 0.05)` with solid fallback `#14161B` (`bg-surface`)
  - Elevated: `#1C1F26` (`bg-elevated`)
  - Hairline Border: `rgba(255, 255, 255, 0.08)`
  - Text Primary: `#F5F6F8`, Secondary: `#A3AAB6`, Tertiary: `#6F7785`
  - Accent: `#3D7BFF` (Apex blue)
  - Status: `#34D399` (ready), `#FBBF24` (caution), `#F87171` (rest)
- **Light Theme:**
  - Base Background: `#F2F4F8`
  - Content Surface: `#FFFFFF`
  - Elevated: `#FFFFFF` with soft shadow
  - Hairline Border: `rgba(11, 12, 15, 0.08)`
  - Text Primary: `#0B0C0F`, Secondary: `#4F5663`, Tertiary: `#7C8493`
- **Liquid Glass Materials:**
  - `glass-thin` (20px blur, 180% sat) for floating tab bar and top bar
  - `glass-regular` (28px blur, 180% sat) for sheets and toasts
  - `glass-thick` (40px blur, 180% sat) for modals
  - `glass-lens` for sliding segmented lens indicators
  - Performance modes: `full` (real-time blur), `reduced` (8px blur), `none` (solid opaque)
  - Static ambient background gradient mesh at `-z-10` with zero layout thrash.
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
## 11. Nutrition Module Architecture & Guidelines
### A. Scientific Foundation & Literature Citations
All nutrition constants and formulas are documented in `src/shared/lib/nutrition/nutritionConstants.ts` with direct sports-nutrition literature citations:
1. **Basal Metabolic Rate (BMR):**
- **Mifflin-St Jeor (1990):** Default equation based on weight, height, age, and sex ($BMR_{male} = 10W + 6.25H - 5A + 5$; $BMR_{female} = 10W + 6.25H - 5A - 161$).
- **Cunningham (1980):** Activated when athlete body fat % / Lean Body Mass (LBM) is available: $BMR = 500 + 22 \times LBM_{kg}$.
2. **Energy Expenditure (TDEE):**
- Non-exercise activity thermogenesis (NEAT + TEF) baseline factor ($1.25 \times BMR$).
- Dynamic Exercise Energy Expenditure (EEE) calculated from training load (TSS / sRPE) and session duration.
3. **Periodized Macronutrients by Day Type (ACSM/IOC/ISSN Guidelines):**
- `rest`: Carbs 2.5 g/kg (2.0 - 3.0), Protein 1.8 g/kg (1.6 - 2.0), Fat $\ge 1.0$ g/kg. Plate: 1/4 carb, 1/4 protein, 1/2 vegetables.
- `light`: Carbs 4.0 g/kg (3.0 - 5.0), Protein 1.8 g/kg (1.6 - 2.0). Plate: 30% carb, 30% protein, 40% vegetables.
- `moderate`: Carbs 6.0 g/kg (5.0 - 7.0), Protein 1.9 g/kg (1.7 - 2.2). Plate: 40% carb, 30% protein, 30% vegetables.
- `hard`: Carbs 8.5 g/kg (7.0 - 10.0), Protein 2.0 g/kg (1.8 - 2.4). Plate: 1/2 carb, 1/4 protein, 1/4 vegetables.
- `competition`: Carbs 10.0 g/kg (8.0 - 12.0), Protein 1.6 g/kg (moderate to avoid GI fullness), controlled fat (0.7 - 1.0 g/kg).
4. **Intra-Workout Carbohydrate Tiers (Jeukendrup 2014):**
- $<45$ min: 0 g/h (plain water/electrolytes).
- $45-75$ min: up to 30 g/h or carb mouth rinse.
- $75-150$ min: 30-60 g/h single-source carbohydrate (glucose/maltodextrin).
- $>150$ min: 60-90 g/h multiple-transportable carbohydrate mixture (2:1 glucose:fructose ratio).
5. **Hydration & Electrolytes (Sawka et al. 2007):**
- Baseline fluid 35 ml/kg/day + 600 ml/h of training (multiplied by 1.35 in hot/humid conditions).
- Sodium replacement ~450 mg/h for sessions $>60$ min or hot conditions.
6. **Post-Workout Recovery Window (Kerksick et al. 2017 ISSN):**
- Rapid glycogen restoration: 1.0-1.2 g/kg carbs within 0-2 hours.
- Muscle protein synthesis: 0.3-0.4 g/kg high-biological value protein (20-35g) with $\ge 2.5$g leucine.
### B. Sensitive-Use Safeguards & Non-Moralizing Design
- **"Hide Calorie Numbers" Mode:** Toggle that replaces numeric kcal displays with Plate Method shares (Carbs %, Protein %, Vegetables %) and portion sizes (Small, Medium, Large).
- **Non-Moralizing Language:** Zero shaming words ("jó/rossz étel", "bűnözés", "csaló étkezés", "túl sok"). Purely performance, fuel, and recovery terminology.
- **Low Energy Availability (LEA / REDs) Notice:** Conservative heuristic checking for $\ge 3$ consecutive days of severe caloric deficit ($<60\%$ of target) under meaningful training load. Phrased as a gentle suggestion to consult a sports dietitian or team physician, explicitly disclaiming that it does not constitute a medical diagnosis.
### C. Anti-Doping Compliance (WADA Strict Liability)
- **Permanent, Un-dismissible Alert Banner:** Cites WADA Strict Liability principle: the athlete is strictly responsible for any substance in their specimen. No supplement can be guaranteed 100% free of contamination.
- **Batch Number Tracking (Tételszám):** Required for all logged supplements to enable audit trails against lab contamination batches.
- **Third-Party Lab Certification Badges:** Informed Sport (LGC), Kölner Liste (Cologne List), NSF Certified for Sport, BSCG.
### D. Two Logging Modes & Honest Micronutrient Coverage
- **Quick Mode:** Small / Medium / Large portions, Plate Method shares, and photo notes for manual/beginner athletes.
- **Precise Mode:** Exact gram weights, quick steppers (+10g, +50g, +100g), and BarcodeDetector scanner integration with manual fallback.
- **Honest Coverage Display:** When a food label omits micronutrients, the app honestly displays an "Adathiányos" tag instead of displaying misleading 0mg values.
### E. Food Data Cloud Functions Proxy & Caching
- `searchFoods` callable Cloud Function proxying Open Food Facts and USDA FoodData Central with Firestore `foodCache` collection caching (7-day TTL).
- `getFoodByBarcode` callable Cloud Function with Firestore cache.
- Built-in curated sports nutrition food database (`CURATED_SPORTS_FOODS`) in `FoodService` providing instant offline responsiveness.
### F. Dietitian Collaboration Mode
- Specialists with `permissions.nutrition !== 'none'` see the athlete's nutrition diary.
- Target Provenance stamp (`setBy: { id, name, role, title }`) clearly displays when targets were set by a sports dietitian.
- Clinical comment threads attached to any logged meal.
- Dietitian Meal Plan creator assigning periodized meal structures and plate suggestions into the athlete's Étrend tab.
### G. Body Metrics 7-Day Moving Average Smoothing
- 7-day trailing moving average filters acute water/glycogen shifts (each 1g glycogen binds 3-4g water).
- Recharts composed chart showing raw weigh-in dots against a smoothed trend line and weekly rate of change (kg/week).
---

## 12. Stage 8: Device Integration Layer (COMPLETED)

### A. Provider-Agnostic Ingestion Architecture
- **Normalized Data Schemas:** Pure TypeScript + Zod schemas (`NormalizedActivity`, `NormalizedSleep`, `NormalizedDaily`) with strict field definitions, confidence scores, and raw payload references.
- **Unified Ingestion Interface (`IDeviceAdapter`):** `connect()`, `handleWebhook()`, `backfill()`, `refresh()`, `disconnect()`.
- **Server-Side Token Security:** OAuth client secrets and user refresh tokens are restricted to server-side Cloud Functions and protected Firestore collections; the client application never receives vendor secrets.
- **Multi-Source Deduplication:** Identifies identical workouts across devices ($\pm 5$ min start time, $\pm 8\%$ duration tolerance, matching sport), merging streams (e.g. GPS, pace, and power from Garmin; heart rate and strain from WHOOP) while tracking provenance in `mergedFrom`.
- **User-Configured Priority Ranking:** Athletes control which device source wins per metric (`sleep`, `activity`, `hrv`, `restingHR`, `weight`) with instant re-ordering in `PrioritySettingsModal`.

### B. Level 1 — File Import Pipeline (Fully Built)
- **Supported Formats:** `.fit` (Garmin binary FIT Protocol 2.0 parser), `.tcx` (Garmin Training Center XML), `.gpx` (GPX 1.1 with trackpoint Haversine distance and elevation), `.csv` (tabular workout logs with auto-delimiter detection).
- **Drag-and-Drop Zone:** `FileUploadZone` with live processing feedback, load calculation via `calculateSessionLoad`, and real-time duplicate detection.
- **Audit History:** `ImportHistoryModal` and Firestore `athletes/{id}/importHistory` recording total files, created sessions, and duplicate counts.

### C. Level 2 — Device Adapters with Realistic Mock Mode
- **Garmin Connect:** Implements Garmin Health & Activity API adapter, OAuth PKCE flow, `X-Garmin-Signature` webhook verification, and 90-day backfill generator.
- **WHOOP 4.0:** Implements OAuth 2.0, Day Strain (0–21), recovery biometrics, sleep stages, and `X-WHOOP-Signature` verification.
- **Polar AccessLink:** Implements AccessLink v3 API with exercise transaction lifecycle and Nightly Recharge metrics.
- **Oura Ring v2:** Implements OAuth 2.0, sleep efficiency, skin temperature deviation, and readiness biometrics.

### D. Level 3 — Aggregator Abstraction (Terra / Junction)
- `AggregatorAdapter` implementing `IDeviceAdapter`, disabled by default and togglable via environment variable or the Devices screen.

### E. Native Wrapper Readiness
- Ingestion endpoint `POST /ingest/health` (Cloud Function `ingestHealthData`) designed for future Capacitor / native iOS HealthKit and Android Health Connect bridges.
- "Apple Health / Health Connect - hamarosan" card with interactive test simulator button.

### F. Devices UI (`DevicesPage.tsx`)
- Provider cards with live connection toggle, "Sync now" with realistic mock data backfill, disconnect, and confirmation modal for deleting provider-specific data.
- Data-quality diagnostic hints (e.g. missing HRV nights, optical HR warning).
- Manual mode friendly helper card explaining automatic readiness advantages with easy switch to Hybrid mode.
- Comprehensive unit tests: 15/15 device engine tests passing (120/120 total test suite passing).
- Detailed developer documentation in `docs/INTEGRATIONS.md`.

---

## 13. Stage 9: Coach & Specialist Workspace ("Csapat" Section) (COMPLETED)

### A. Roster Dashboard (`RosterDashboard.tsx`)
- **Athlete Cards & Table Views:** Switchable grid card view and tabular roster with readiness dot (green/amber/red) and confidence rating, last check-in timestamp with relative time, 7-day load trend indicator, TSB form status, weekly compliance %, and open alerts badge.
- **Filtering & Search:** Real-time search by athlete name and sport; filtering by sport and training group/team (`availableGroups`); filtering by status (`all`, `attention`, `active`); multi-criteria sorting (open alerts count, readiness ascending, weekly compliance %, alphabetical).
- **Pinned Attention-Needed Section:** High-priority banner and card list pinned to the top of the dashboard highlighting athletes requiring immediate staff attention (readiness score $< 40$, active red readiness, open alerts, compliance $< 60\%$, or missed check-ins $\ge 3$ days).
- **Empty States & Onboarding:** Coach with 0 athletes displays an inviting empty state with an athlete invitation trigger.

### B. Athlete Detail View (`AthleteDetailView.tsx`)
- **Permission-Gated Tabs:** Tabs for `Overview`, `Training`, `Recovery`, `Nutrition`, `Health`, `Notes`, `Messages`. Each tab verifies explicit permissions (`permissions[module] !== 'none'`). Hidden/unauthorized modules display a clear lock screen with "Nincs megosztva" and an explanation that the athlete has not granted access.
- **Read vs Write Enforcement:** Write actions (e.g. assigning workouts, modifying nutrition targets, updating injury records) are only active if the staff member holds write permissions (`permissions[module] === 'write'`); otherwise the interface renders in high-fidelity read-only mode (e.g. read-only `SorenessBodyMap`).
- **Mid-Session Access Revocation Lockout:** Automatic permission validation immediately locks the screen if the athlete revokes sharing during an active session.
- **Specialist Auto-Landing Tabs:** Tailored landing views based on role:
  - Dietitian $\rightarrow$ Nutrition
  - Physiotherapist $\rightarrow$ Health (injuries, body map)
  - Strength Coach $\rightarrow$ Training
  - Sport Psychologist $\rightarrow$ Recovery
  - Physician $\rightarrow$ Health
  - Head/Assistant Coach $\rightarrow$ Overview

### C. Alerts Engine (`alertsEngine.ts`) & Scheduled Cloud Function
- **8 Proactive Clinical Rules Evaluated:**
  1. `missed_checkin`: 3+ consecutive days without daily check-in.
  2. `readiness_red_consecutive`: Red readiness score ($\le 39$) for 2+ consecutive days.
  3. `acwr_spike`: Acute:Chronic Workload Ratio (ACWR) $> 1.5$ (coupled with load ramp $> 20\%$/week).
  4. `sleep_deprivation`: Total sleep $< 6$ hours for 3 or more consecutive nights.
  5. `rapid_weight_change`: $> 2\%$ body weight change within a 48-hour window.
  6. `illness_injury_reported`: Athlete flagged active illness or reported pain/injury during check-in.
  7. `low_compliance`: Weekly completed workout compliance $< 60\%$.
  8. `low_energy_availability`: Sustained low caloric intake combined with high training load.
- **Strict Permission Routing (`filterAlertsForStaff`):** Alerts are dispatched strictly to staff members whose relationship permissions cover the underlying domain:
  - Training alerts $\rightarrow$ Staff with `training` read/write permission.
  - Health/Illness alerts $\rightarrow$ Staff with `health` read/write permission (Coaches and Dietitians without health access do NOT receive injury/illness alerts).
  - Nutrition alerts $\rightarrow$ Staff with `nutrition` read/write permission (Physios and general staff do NOT receive nutrition alerts).
- **Alert Lifecycle Management:** Staff can acknowledge alerts, snooze for 24/48/72 hours, and annotate with resolution comments.
- **Scheduled Cloud Function (`runAthleteAlertCheck`):** Daily automated evaluation across all active athlete rosters with push notification dispatch hook.

### D. Multi-Staff Collaboration, Messaging & Activity Feed
- **Per-Athlete Topic Threads:** Segmented messaging threads (`general`, `training`, `recovery`, `nutrition`, `health`) preventing clutter and ensuring domain-specific conversations. Read receipts and FCM notification hooks.
- **Private Staff Notes vs Shared Athlete Notes:** Notes tab cleanly distinguishes athlete-visible notes from confidential internal staff notes (accessible only to authorized coaching staff).
- **Staff Activity Audit Trail:** Unified chronological feed recording who modified what, workout assignments, target changes, and alert resolutions.

### E. Bulk Tools for Coaches
- **`InviteAthleteModal`:** Generates unique 6-character alphanumeric codes (`APX-XXXXX`) with expiration date and instant clipboard copy.
- **`BulkAssignModal`:** Enables batch workout scheduling by group or multi-select athletes, specifying sport, target date, duration, target RPE, and workout descriptions.
- **`CopyWeekModal`:** Clones a full training week from a source athlete to one or multiple target athletes with date offset recalculation.
- **`WeeklyReviewModal`:** Guided carousel modal allowing coaches to step through each athlete sequentially, reviewing weekly load, compliance, readiness, and submitting weekly feedback.

### F. Athlete-Side "Csapatom" Screen (`AthleteTeamView.tsx`)
- Full athlete transparency: lists connected coaches and specialists, their assigned roles and specialties, quick message buttons, and direct link to permission sharing settings (`/sharing`).

### G. Dual-Role Experience (`CoachPage.tsx`)
- Full support for users holding both athlete and coach/specialist roles, with a persistent header toggle to instantly switch between the athlete cockpit and coach workspace. Responsive split-pane layout on desktop and single-pane drill-down on mobile.
- Comprehensive unit test suite: **13/13 vitest tests passing** in `alertsEngine.test.ts` (133/133 total project tests passing), 0 TypeScript errors, 0 ESLint warnings.

---

## 14. Stage 10: Today Screen, Insights, Notifications, Hardening & Final Pass (COMPLETED)

### A. Today Screen Experience (`TodayPage.tsx`)
- **Readiness Ring & Top Driver Sentence:** Hero ProgressRing displays readiness score (0–100), dynamic status band (`ready` / `caution` / `rest`), confidence rating, and a synthesized single plain-language sentence attributing top autonomic drivers (e.g. HRV rMSSD deviation, sleep duration, Hooper fatigue/soreness).
- **Adaptive Workout Adjustment Suggestion:** When readiness enters amber or red, an adaptive coaching banner surfaces a concrete recommendation to downscale intensity or duration by one step (e.g. Z4 threshold $\rightarrow$ Z2 aerobic base). Crucially adheres to the core principle: *the platform never silently alters a coach's plan; it only suggests, leaving the final decision to the athlete or coach*.
- **Fuel Card & Session-Fuelling Hints:** Displays daily target vs consumed calories and macronutrient progress bars (Protein, Carbs, Fats), accompanied by pre-workout nutritional timing recommendations (e.g. 45g rapid carbs and 500ml hydration 60–90 min before key sessions).
- **Hydration Progress & Quick Action Bar:** Real-time water intake tracking with instant `+250ml` / `+500ml` logging buttons. Top action bar gives immediate access to Daily Check-in, Session Logging, and Meal Logging.
- **Adaptive Mode Layouts:**
  - *Manual Mode:* Emphasizes quick manual check-in, RPE session logger, and nutrition entry without device clutter.
  - *Device Mode:* Surfaces auto-synced Garmin/WHOOP biometric tiles with SourceBadges and synchronization status.
  - *Solo Mode:* Displays periodization progress and solo plan generator hints.
  - *Coach Mode:* Shows pinned coach instructions and feedback notes from staff.
  - *First-Day Experience:* Welcoming 3-step onboarding guide for fresh users with 0 historical check-ins.

### B. Comprehensive Insights Suite (`InsightsPage.tsx` & `weeklyReviewEngine.ts`)
- **Rule-Based Automated Weekly Review (`weeklyReviewEngine.ts`):** Deterministic natural language synthesis (Hungarian & English) analyzing weekly training load (AU) vs previous weeks, acute load ramp rate ($<20\%$ safe progressive overload vs acute spike warning), average sleep duration vs target, cumulative sleep debt, readiness distribution (ready/caution/rest days), workout compliance %, and macronutrient adherence. Thoroughly covered by unit tests.
- **Physiological Correlation Views:**
  - *Sleep Duration vs Next-Day Readiness:* Scatter chart with regression trendline illustrating strong positive correlation ($r = 0.78$) between 7.5h+ sleep and peak readiness.
  - *Training Load vs Delayed Soreness:* Multi-axis chart visualizing the 24–48h delayed onset muscle soreness (DOMS) lag following key high-threshold sessions.
- **Tests & Records Dashboard:** Tracks aerobic milestones (VO2max 62.4 ml/kg/min, FTP 310W, LTHR 172 bpm, CSS 1:22/100m), neuromuscular strength benchmarks (CMJ 44.5cm, Trap Bar Deadlift 165kg, Back Squat 135kg), and 90-day lean body composition trendline (weight, body fat %, muscle mass).
- **A-Race Goal Progression & Countdown:** Real-time countdown clock (days, hours, minutes) to the target A-competition ("Budapest Nemzetközi Triatlon OB") with macrocycle phase tracking (Build 2 $\rightarrow$ Peak $\rightarrow$ Taper) and milestone checklists.

### C. Notifications & In-App Notification Center (`notificationStore.ts` & `NotificationCenter.tsx`)
- **FCM Architecture & Local Store:** Zustand persistent notification store handling four core notification categories: `checkin_reminder`, `upcoming_workout`, `coach_message`, and `staff_alert`.
- **User Customization:**
  - Custom morning check-in reminder time picker (`<input type="time" />`).
  - Quiet hours scheduling (`quietHoursEnabled`, `quietHoursStart`, `quietHoursEnd`) suppressing non-critical alerts during rest.
  - Category-level toggles.
- **Interactive Header Notification Center:** Bell icon with live unread badge, categorized popover list, relative time formatting ("20 perce", "2 órája"), mark-as-read, clear-all, and one-click deep link navigation to relevant screens.

### D. Hardening, Security & Compliance
- **Content Security Policy & Security Headers (`firebase.json`):** Strict CSP (`default-src 'self' ...`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- **Firebase App Check:** Initializer module in `src/shared/lib/firebase/index.ts` with reCAPTCHA Enterprise provider support.
- **Cloud Functions Rate Limiting & Input Validation:** In-memory token bucket rate limiter (`assertRateLimit`) and rigorous input sanitization on all callable functions and webhooks.
- **GDPR Compliance (Articles 17 & 20):**
  - *Right to Erasure (Article 17):* Recursive deletion of user documents, athlete subcollections, relationship records, Cloud Storage files, and Firebase Auth account in `deleteUserData`.
  - *Data Portability (Article 20):* Full structured JSON data export (`exportUserData` Cloud Function and client-side download) bundling profile, daily check-ins, sessions, nutrition days, and measurements.
  - *Consent Versioning:* GDPR Health Data Consent v1.1 tracking with automatic prompt if policy versions update.
- **Sanitized Logging:** All tokens, passwords, and raw biometric streams are excluded from server and client logs.

### E. Demo Seed Data & E2E Testing
- **Demo Seed Generator (`scripts/seedDemoData.ts` / `npm run seed`):** Generates 90 days of realistic data for an Olympic-tier athlete (Nagy Bence), complete with 90 daily check-ins, 96 training sessions, 90 nutrition days, performance benchmarks, and relationships with demo Head Coach (Kovács Péter) and Sports Dietitian (Molnár Eszter).
- **Playwright E2E Smoke Suite (`e2e/smoke.spec.ts` / `npm run test:e2e`):** 5 end-to-end smoke tests verifying Onboarding in manual mode, Daily Check-in, Session Logging, Meal Logging, and Coach Invitation & Access Revocation.
- **Project Roadmap (`docs/NEXT_STEPS.md`):** Comprehensive architectural roadmap covering AI Planning Assistants, Native Capacitor wrappers, extended wearable APIs, team/federation hierarchies, and reporting exports.

---
> **Requirement:** All 10 stages of the Apex Athletic Platform are completed, tested, documented, and hardened.

---

## 15. Invitation & Sharing Permission Subsystem Hardening (COMPLETED)

### A. Security Audit & Zero-Trust Vulnerability Remediation
- Full architectural audit documented in `docs/SECURITY_AUDIT.md`. Identified and closed:
  1. *Direct Client Relationship Writes:* Eliminated client-side creation/updates to `relationships/{relId}` in `firestore.rules`. Previously an attacker could create an active relationship bypassing athlete consent.
  2. *Direct Client Audit Log Writes:* Prohibited client mutations to `relationships/{relId}/log/{logId}` (`allow write: if false;`). Logs are append-only via the Admin SDK.
  3. *Insecure Invite Enumeration:* Restricted `invites/{code}` reads exclusively to the athlete who generated them (`resource.data.athleteId == request.auth.uid`). Client writes prohibited.
  4. *Staff Departure Support:* Extended `revokeAccess` to allow either the athlete to revoke access or a staff member to voluntarily leave.
  5. *Replay Attacks Closed:* Enforced single-use invite codes with Firestore transactions (`db.runTransaction()`).

### B. Cloud Functions Hardening (`functions/src/index.ts`)
- **Strict Zod Input Validation:** All callables (`createInvite`, `acceptInvite`, `updatePermissions`, `revokeAccess`) validate payloads against runtime schemas (`CreateInviteInputSchema`, `AcceptInviteInputSchema`, `UpdatePermissionsInputSchema`, `RevokeAccessInputSchema`).
- **App Check & Rate Limiting:** Enforced via `assertAppCheck` and token-bucket `assertRateLimit(request.auth.uid, maxRequests, windowSeconds)`.
- **Atomic Transactions:** Single-use verification, expiration checks (7 days), and relationship activation executed in a single atomic transaction.
- **Audit Logging:** Every state transition logs who (`performedBy`), what (`action`), when (`timestamp`), old values (`previousStatus`, `previousPermissions`), and new values (`newStatus`, `newPermissions`).

### C. Client & UI Layer (`SharingSettingsPage.tsx` & `InviteAthleteModal.tsx`)
- Eliminated mock alphanumeric code generation and local client fallbacks.
- Connected `InviteAthleteModal` directly to `createSharingInvite` Cloud Function.
- Added "Meghívókód beváltása" (Redeem Invite) modal with instant single-use redemption and live list refresh.
- Restricted `rulesEvaluator.ts` strictly to advisory UI hints (lock icons, disabled states), never as a security boundary.

### D. Comprehensive Verification Suite (160 / 160 Tests Passing)
- **`src/shared/lib/sharing/rules.test.ts` (45 Tests):** Complete coverage of athlete, coach, dietitian, physiotherapist, strength coach, sport psychologist, stranger, pending, revoked, and direct client write rejection.
- **`src/shared/lib/sharing/sharingFunctions.test.ts` (20 Tests):** Validation of Zod schemas, 7-day expiration, single-use reuse rejection, expired invite rejection, self-invite blocking, athlete-only permission updates, staff resignation, and audit trail structure.

---

## 16. Wearable & Device Integrations Subsystem (COMPLETED)

### A. Architecture (`functions/src/integrations/` & `src/shared/lib/devices/`)
- **Normalized Multi-Source Pipeline:** Provider data is converted through provider-specific normalizers into `NormalizedActivity`, `NormalizedSleep`, and `NormalizedDaily` domain records.
- **Merge & Deduplication Priority:** Multi-source hierarchy prioritizes high-fidelity sources (`garmin` > `whoop` > `polar` > `oura` > `manual`) using overlapping timestamp detection to prevent duplicate workout records.
- **Server-Side Token Storage & Secrets:** Client secrets stored strictly in Firebase Functions secrets (`defineSecret`), never exposed to frontend. Tokens stored in dedicated subcollections with zero client write access (`allow read, write: if false;` in `firestore.rules`).
- **OAuth 2.0 PKCE & Webhook Verification:**
  - **WHOOP:** Complete OAuth 2.0 authorization, state CSRF validation, token exchange, HMAC SHA-256 webhook signature verification, 30-day historical backfill, disconnect, and GDPR data deletion.
  - **Garmin Connect Developer Program:** Structure ready for Health API & Activity API with mock mode toggle until production developer approval.
  - **Polar AccessLink & Oura Ring:** Adapter structure for authorization and activity/sleep normalizers.
- **Devices Cockpit UI (`DevicesPage.tsx`):** Displays real connection status badges (Connected with last sync timestamp, Connecting, Error with readable reason, Not configured), real OAuth connect triggers, "Sync now", "Disconnect", "Delete imported data", and an explicit "Demo data" toggle disabled in production builds.

---

## 17. Setup Flow, Athlete Profile & Hydration Tracking Subsystem (COMPLETED)

### A. Number Input Overhaul (`NumberInput.tsx`)
- **Typing Experience:** Controlled raw string state (`type="text"`, `inputMode="decimal"`). Users can clear all digits freely without snapping to `0` or `min`.
- **Hungarian Locale Support:** Seamlessly handles both comma `,` and dot `.` as decimal separators (e.g. typing `72,5` parses cleanly to `72.5` on blur).
- **Validation Timing:** No disruptive errors or value mutations while typing; validation errors and min/max clamping trigger strictly on `onBlur` or form submit.
- **Accessibility & Controls:** Steppers (`+` and `-`) are optional secondary conveniences; the text field is fully keyboard and paste friendly.
- **Unit Tests (`src/shared/ui/NumberInput.test.ts`):** 11 tests verifying empty input, typing integer, typing decimal with comma, pasting, invalid characters, and min/max clamping.

### B. Shared Sport Catalog (`src/shared/lib/sports/`)
- **Standard Catalog (`catalog.ts`):** 96 sports categorized across 9 Olympic and elite domains:
  1. *Állóképesség* (Endurance)
  2. *Erő és kondíció* (Strength & Conditioning)
  3. *Csapatsportok* (Team Sports)
  4. *Küzdősportok* (Combat Sports)
  5. *Ütős/ütőjátékok* (Racket Sports)
  6. *Vízi sportok* (Water Sports)
  7. *Téli sportok* (Winter Sports)
  8. *Torna és mozgás* (Gymnastics & Movement)
  9. *Egyéb* (Other / Tactical)
- **Metric Profiles (`types.ts`):** Tailors session logging fields to each sport's physiological nature:
  - `distance_duration`: distance, time, pace/speed, elevation, heart rate (e.g. futás, kerékpár, úszás).
  - `duration_only`: duration, heart rate, RPE (e.g. jóga, nyújtás).
  - `sets_reps_load`: sets, reps, load weight, rest time (e.g. súlyemelés, erőemelés).
  - `rounds_time`: rounds, work/rest interval (e.g. box, birkózás, crossfit).
  - `points`: score, sets/games, opponent (e.g. tenisz, asztalitenisz).
- **User Custom Sports:** Athletes can create custom sports via "Új sport hozzáadása" modal, specifying name, category, and metric profile. Persisted to Firestore (`athletes/{athleteId}/customSports`) with localStorage fallback.
- **Sport Selector & Picker UI (`SportSelector.tsx`, `SportPickerSheet.tsx`):**
  - Common sports chips displayed upfront for instant one-tap selection.
  - "Több sport" bottom sheet with Favorites and Recents on top, live search across Hungarian and English names, category filtering tabs, and custom sport creator.
  - Multi-select with removable chips and main sport star toggle (`mainSport`).
- **Unit Tests (`src/shared/lib/sports/sports.test.ts`):** 6 tests verifying catalog depth (80+ sports), category coverage, search by Hungarian and English, and custom sport lifecycle.

### C. Weekday Picker (`WeekdayPicker.tsx`)
- **Large Touch Chips:** 7 weekday toggle buttons (`H`, `K`, `Sz`, `Cs`, `P`, `Sz`, `V`) with full screen-reader accessibility (`Hétfő`, `Kedd`, etc.).
- **Summary & Quick Presets:** Live summary counter ("3 nap / hét") and quick preset buttons ("Hétköznap", "Hétvégén", "Mind", "Törlés").
- **Data Model:** Values stored as an array of ISO weekday numbers (`1..7`). Mapped directly into the solo plan generator (`soloPlanGenerator.ts`) and calendar scheduling.

### D. Profile Overview Page (`ProfilePage.tsx`)
- **Decoupled from Onboarding:** Pressing "Profil szerkesztése" in Settings navigates to `/profile` instead of restarting the onboarding wizard.
- **Progressive Disclosure Section Cards:**
  1. *Alapadatok:* Név, születési dátum, nem, magasság, testsúly.
  2. *Sportok:* Kiválasztott sportágak, fő sportág jelölése, versenyszint.
  3. *Edzésnapok és elérhetőség:* Heti edzésnapok picker, alvásigény, nyugalmi pulzus, jelenlegi sérülések.
  4. *Célok és versenyek:* Célverseny, dátum, egyéni szezoncélok.
  5. *Étrend alapok:* Táplálkozási fókusz, tányérmodell nézet toggle, étrendi preferenciák, allergiák/intoleranciák.
  6. *Adatforrás és támogatás:* Okoseszköz / Manuális / Hibrid mód, Solo / Edzői / Szakemberi támogatási forma.
  7. *Nyelv és mértékegység:* Magyar / Angol, Metrikus / Angolszász egységek.
- **Section Editing Drawers:** Each card contains an independent "Szerkesztés" button opening only that section in a bottom sheet (`BottomSheet`). Saving updates strictly that slice of data via `updateProfile`.
- **First-Time Wizard Guard:** The onboarding wizard executes only once for fresh accounts. A subtle "Beállítás folytatása" banner surfaces on the Today screen only if onboarding was left incomplete.

### E. Beverage-Engine Hydration Tracking (`src/shared/lib/hydration/`)
- **Beverage Hydration Index (BHI):** Config file `beverages.ts` incorporates scientific hydration factors derived from clinical literature (e.g. Maughan et al., *Am J Clin Nutr*, 2016):
  - Víz: 1.00
  - Izotóniás sportital: 1.02
  - Elektrolit / ORS: 1.15
  - Teljes tej: 1.25 (hosszabb gyomorürülési idő, nátrium- és fehérjetartalom)
  - Növényi tej: 1.05
  - Gyümölcslé (100% narancs/alma): 1.00
  - Zöld / fekete tea: 0.98
  - Kávé / eszpresszó: 0.95 (enyhe diuretikus hatás, de túlnyomórészt hidratál)
  - Diétás üdítő: 0.96
  - Cukros üdítő: 0.95
  - Sör / alacsony alkohol: 0.65 (egyértelmű diuretikus hatás, nem minősítő élettani magyarázattal)
- **Nutritional & Electrolyte Metadata:** Per 100ml values for caffeine (mg), sugar (g), and sodium (mg).
- **Dual Volume Display:** Hydration metrics present both *Raw Volume* (összes fogyasztott milliliter) and *Effective Cellular Hydration* (effektív térfogat = térfogat × BHI faktor) evaluated against the athlete's daily fluid target.
- **Interactive Logging & Cockpit UI (`HydrationTrackerCard.tsx`, `BeveragePickerModal.tsx`):**
  - Quick-add buttons for favorite drinks and sizes (150 ml kávé, 250 ml víz, 330 ml üdítő, 500 ml izotóniás sportital).
  - "Ital hozzáadása" modal with beverage selector, portion sizing (150, 250, 330, 500 ml, vagy egyéni ml), és "Saját ital" (custom beverage) készítő.
  - Napi fogyasztott italok listája szerkesztéssel és törléssel.
  - Folyadékbevitelből származó koffein összegzése és megjelenítése a Nutrition összefoglaló kártyán.
- **Unit Tests (`src/shared/lib/hydration/hydration.test.ts`):** 3 tests validating hydration factor calculations, BHI effective volume aggregation, and custom beverage lifecycle.

---

## 18. Retroactive Training Logging & Exercise Library Subsystem (COMPLETED)

### A. Retroactive Session Logging & Load Recomputation
- **Retroactive Date & Time Pickers:** Session logging accepts any past date without weekly restriction, supplemented by quick one-tap shortcuts ("Ma", "Tegnap", "Két napja").
- **Calendar Integration:** Tapping any past or future day in the training calendar (Week view, Month view, Day view) offers "Edzés rögzítése erre a napra".
- **Session Rescheduling / Date Moves:** Moving an existing session updates its date and triggers recalculation from the earliest affected date forward.
- **Load Recalculation Engine (`src/shared/lib/load/loadRecomputation.ts`):**
  - Moving, editing, adding, or deleting a session in the past recalculates affected load metrics from that date forward: Fitness (CTL, 42d EWMA), Fatigue (ATL, 7d EWMA), Form (TSB = CTL - ATL), Acute:Chronic Workload Ratio (ACWR), and daily readiness scores.
  - Handles DST transitions safely using noon-anchored local date processing (`parseYMD`/`formatYMD`).
  - Unit tests in `src/shared/lib/load/loadRecomputation.test.ts` (5 tests) verify historical insertion, date moving, ACWR adjustments, and fatigue reduction upon deletion.
- **Universal DaySwitcher Component (`DaySwitcher.tsx`):**
  - Reusable date navigator featuring previous/next arrows, Hungarian display labels ("Ma", "Tegnap", "Két napja"), date picker input accepting any past date, and quick shortcut chips.
  - Integrated into Training Calendar, Daily Check-in (`CheckinPage.tsx`), and Nutrition Log (`NutritionPage.tsx`).

### B. Adaptive Sport Logging (`ManualSessionModal.tsx`)
- **Shared Catalog Integration:** Uses the shared sport catalog (`SportPickerSheet` / `SportSelector`) with favorite/recent chips upfront and full searchable catalog.
- **Adaptive Metric Profiles:** Form inputs dynamically adjust to the sport's physiological metric profile:
  - `distance_duration`: Distance, duration, pace/speed, elevation, HR.
  - `duration_only`: Duration, RPE, HR.
  - `sets_reps_load`: Exercise rows (sets, reps, load in kg, rest seconds).
  - `rounds_time`: Rounds, work interval, rest interval.
  - `points`: Final score, sets, result notes.
- **Progressive Disclosure:** Simple default (Sport, Date, Duration, RPE); advanced metric fields and notes are cleanly tucked into a collapsible "Részletek" drawer.

### C. Exercise Library (`src/features/training/components/ExerciseLibraryView.tsx`)
- **Athlete Exercise Repository:** Stored under `athletes/{athleteId}/exercises` with full offline localStorage mirror and starter catalog (Squat, Deadlift, Bench Press, Pull-ups, Split Squat, Plank, Banded Rotator Cuff).
- **Metadata Fields:** `name`, `description`, optional `videoUrl` (HTTPS validated), `defaultSetsRepsLoad`, tags (muscle groups, equipment, sport), and favorite star toggle.
- **Interactive Filtering:** Live search, muscle group chips (`Láb / Guggoló lánc`, `Mell / Nyomó lánc`, `Hát / Húzó lánc`, `Váll / Kar`, `Törzs / Core`, `Egész test`), equipment chips, and favorites-only filter.
- **Creation & Modification Sheet (`ExerciseEditSheet.tsx`):** Slide-out drawer with tag selectors and validation.

### D. Safe Video Player Modal & Strict CSP (`VideoPlayerModal.tsx`, `firebase.json`)
- **Zero-Trust URL Parsing (`videoUtils.ts`):**
  - Requires valid `https://` URLs.
  - YouTube: Auto-extracts video ID and embeds via privacy-enhanced `https://www.youtube-nocookie.com/embed/{id}`.
  - Vimeo: Auto-extracts video ID and embeds via `https://player.vimeo.com/video/{id}`.
  - Direct Video Files: Direct `.mp4`, `.webm`, or `.mov` files render using native HTML5 `<video controls playsInline>`.
  - External Fallback: Any arbitrary external link presents a secure "Megnyitás új lapon" button with `rel="noopener noreferrer"`.
- **Content-Security-Policy:** Updated `firebase.json` with strict `frame-src https://*.firebaseapp.com https://www.youtube-nocookie.com https://player.vimeo.com;` blocking arbitrary iframes.

### E. Decoupled Exercise Snapshots in Workouts (`WorkoutBuilderModal.tsx`)
- **Snapshot Immutability:** Adding an exercise from the library into a planned workout or strength session creates an independent snapshot. Edits made inside the workout (sets, reps, load, custom name) never mutate the library entry.
- **Explicit Library Actions:**
  - "Mentés a könyvtárba": Saves freehand exercises typed into a workout into the athlete's exercise library.
  - "Frissítés a könyvtárban": Explicitly pushes modifications back to the original library entry only when the user deliberately chooses to do so.
- **Direct Video Preview:** Exercise cards in the workout builder and session modal provide one-click video modals.

### F. Navigation & Segmented Control (`TrainingPage.tsx`)
- **Terv Tab Segmented Control:**
  - `Naptár & Tervezés`: Periodized timeline, Performance Management Chart (PMC), and Training Calendar.
  - `Gyakorlatok könyvtára`: Full Exercise Library management view.
  - `Eszközök` & `Rekordok`: Reserved layout slots with "Hamarosan" badges.

### G. Security & Multi-Role Permissions
- **Firestore Security Rules (`firestore.rules`):**
  - `match /exercises/{exerciseId}` subcollection under `match /athletes/{athleteId}`:
    - `allow read: if canReadModule(athleteId, 'training');`
    - `allow write: if canWriteModule(athleteId, 'training');`
- **Rules Evaluator & Test Suite (`rules.test.ts`):**
  - 5 new test cases (tests 46–50) verifying athlete self-access, coach `training:write` access, physiotherapist read-only access, psychologist blocked access, and stranger rejection (50/50 tests passing).

---

## 19. Recovery Activities, Records & Courses, and Equipment & Maintenance Subsystems (COMPLETED)

### A. Recovery Activities (`Regeneráció -> Aktivitások` / `InsightsPage.tsx`, `RecoveryActivitiesView.tsx`)
- **Data-Driven Catalog (`catalog.ts`):** Predefined recovery modalities grouped into 7 categories:
  1. *Mobilitás és torna:* korrekciós torna, nyújtás, foam roller, jóga, légzőgyakorlat.
  2. *Hideg:* hidegvizes merülés, jégfürdő, hideg zuhany.
  3. *Meleg:* szauna, gőzfürdő, meleg fürdő.
  4. *Kontraszt:* kontrasztvizes terápia.
  5. *Masszázs és terápia:* sportmasszázs, fizioterápia, kompressziós csizma, kinezio tapasz.
  6. *Alvás és relaxáció:* szieszta / power nap, vezetett meditáció / mindfulness.
  7. *Egyéb:* hiperbár kamra, kryoterápia.
- **Custom Modalities (`athletes/{athleteId}/customRecoveryActivities`):** Athletes can register custom modalities specifying name, category, icon, and dynamic field toggles (hőmérséklet °C, körök száma, testtáj, intenzitás).
- **Activity Logging (`RecoveryActivityModal.tsx`):** Retroactive date/time selector with "Tegnap" shortcut, category/activity pickers with favorites & recents, conditional fields, perceived effect rating (1–5 scale), and notes.
- **"Ugyanaz, mint tegnap" One-Tap Cloning:** Instantly clones yesterday's recovery protocols to today with a single button press.
- **Aggregations & Cross-Screen Integration:**
  - Weekly summary card aggregating total minutes and breakdown per category.
  - Recovery timeline feed with inline edit/delete.
  - Today screen (`TodayPage.tsx`): Displays today's recovery activity count, minutes, and protocol tags.
  - Coach recovery tab (`AthleteDetailView.tsx`): Coaches with `recovery:read` permission review athlete recovery protocols alongside subjective Hooper metrics.
- **Readiness Invariant:** Does NOT modify the readiness calculation algorithm weights yet; strictly stores and visualizes protocol compliance for correlation analysis.

### B. Records and Courses (`Terv -> Rekordok` / `TrainingPage.tsx`, `RecordsCoursesView.tsx`)
- **Personal Records Engine (`recordsService.ts`):**
  - Personal records cataloged per sport (reusing shared sport catalog) and metric profile (`time_for_distance`, `distance_for_time`, `weight_reps_1rm`, `reps_count`, `duration`, `points`, `custom`).
  - Discipline grouping with current best record highlighted on top, accompanied by a history progression drawer and progression chart.
  - Non-intrusive "Új egyéni rekord? Mentsd el" prompt (`RecordBeatPromptModal.tsx`): Evaluates completed sessions against existing records for matching distances/metrics. When an athlete beats a record, a clean confirmation dialog offers one-tap saving. Records are NEVER auto-created silently.
- **Course & Route Management (`coursesService.ts`, `CourseModal.tsx`):**
  - Courses define sport, name, location, distance km, elevation gain meters, surface type, and notes.
  - GPX/TCX file parser extracting trackpoints and elevation profile offline.
  - **Zero External Map Tiles (Strict CSP Compliant):** `generateSvgRouteOutline` normalizes GPS coordinates into a crisp vector 2D SVG path (`<path d="..." />`) and elevation chart, completely eliminating external map tile dependencies and CSP vulnerabilities.
  - Courses linkable directly from training session logging and record entries.

### C. Equipment and Maintenance Tracking (`Terv -> Eszközök` / `TrainingPage.tsx`, `EquipmentView.tsx`)
- **Equipment Repository (`equipmentService.ts`, `EquipmentModal.tsx`):**
  - Gear schema: name, type (`shoes`, `bike`, `chain`, `wheels`, `racket`, `skis`, `rowing_oar`, `watch`, `other`), brand, model, HTTPS image URL with graceful fallback, purchase date, starting usage (`km` and `hours`), applicable sports, status (`active` / `retired`), notes.
  - Session linking: "Eszköz" selector inside session logging modal (`ManualSessionModal.tsx` under Részletek), remembering last used gear per sport as an intelligent default.
- **Robust Dynamic Usage Recomputation (`recomputeEquipmentTotals`):**
  - Gear distance (km) and hours are dynamically recomputed from starting usage plus all linked completed sessions.
  - Editing, moving dates, backdating, or deleting past sessions automatically recalculates gear totals to guarantee zero drift.
- **Maintenance Countdown Engine (`evaluateMaintenanceTask`):**
  - Maintenance tasks configured by distance (km) or time (days) with custom warning thresholds (default 15%).
  - Live color-coded countdown indicators: Green (healthy), Yellow (approaching limit $< 15\%$), Red (due/overdue $\le 0$).
  - "Karbantartás elvégezve" dialog (`MaintenanceModal.tsx`): Resets countdown from the current mileage/date and logs an immutable service entry with cost, service notes, and timestamp.
  - Proactive due alert banner on the Today screen, "Karbantartás szükséges" badge on the Eszközök sub-tab, and integration with `notificationStore.ts`.

### D. Security, Permissions & Test Suite
- **Security Rules (`firestore.rules` & `rulesEvaluator.ts`):**
  - `match /recoveryActivities/{id}` & `match /customRecoveryActivities/{id}`: Governed by `canReadModule(athleteId, 'recovery')` and `canWriteModule(athleteId, 'recovery')`.
  - `match /records/{id}`, `match /courses/{id}`, `match /equipment/{id}`: Governed by `canReadModule(athleteId, 'training')` and `canWriteModule(athleteId, 'training')`.
- **Comprehensive Unit Testing:**
  - `src/shared/lib/sharing/rules.test.ts`: Added tests 51–55 verifying cross-role authorization for recovery, records, courses, and equipment (55/55 tests passing).
  - `src/shared/lib/equipment/equipment.test.ts`: 6 tests covering usage aggregation, maintenance countdown, due status, and retroactive session updates.
  - `src/shared/lib/records/records.test.ts`: 5 tests covering metric comparison, string formatting, beat detection, and progression history.
  - `src/shared/lib/recovery/recovery.test.ts`: 2 tests covering catalog integrity and weekly category aggregation.
  - Full project test suite: **220 / 220 tests passing** across 20 suites with zero failures.

---

## 20. Fill From File (FIT, GPX, TCX) & Session Visualizations Subsystem (COMPLETED)

### A. Architecture & Browser-Side Parsing Pipeline (`workoutFileService.ts`)
- **Zero Backend Dependency:** Complete in-browser parsing of FIT, GPX, and TCX binary and XML formats reusing existing parsers from `src/shared/lib/devices/` (`parseFitFile`, `parseGpxXml`, `parseTcxXml`).
- **Normalized Result Structure (`ParsedWorkoutFile`):**
  - Activity metadata: mapped catalog sport (`mapFileSportToCatalog`), start timestamp, duration seconds, distance meters, elevation gain, calories, average/max heart rate, average power in Watts.
  - Granular time series: downsampled to $\le 500$ evenly spaced track points (`downsampleTimeSeries`) to prevent Firestore 1MB document bloating while delivering high-fidelity interactive visualization.
  - Normalized SVG route outline (`generateSvgRouteOutline`): 2D projected SVG path (`M x y L ...`) rendered entirely without external map tiles.
- **Robust Error Handling (Hungarian Localization):**
  - Max file size guard: 25 MB hard cap with friendly localized error (`"A fájl mérete meghaladja a 25 MB-os határt."`).
  - Unsupported format check: validates extension and MIME type (`"Nem támogatott fájlformátum. Kérlek FIT, GPX vagy TCX fájlt tölts fel."`).
  - Corrupt / unreadable file check: catches corrupt headers or empty track records (`"A fájl sérült vagy nem olvasható."` / `"A fájl nem tartalmaz feldolgozható edzésadatot."`).

### B. Session Logging Form Integration (`ManualSessionModal.tsx`, `WorkoutFileDropzone.tsx`)
- **Compact Dropzone:** Positioned at the top of the manual logging modal with drag-and-drop and native mobile file input support.
- **Progressive Prefill with Badges:**
  - Prefills Sport, Start Date & Time, Duration, Distance, Heart Rate (Avg & Max), Elevation Gain, Average Power, and Calories.
  - Prefilled fields display a subtle `"Fájlból kitöltve"` badge. Every field remains completely unlocked and editable by the athlete.
  - Summary card shows high-level metrics of the parsed file with a clear "Fájl eltávolítása" option.
- **RPE & Training Load Integrity:**
  - RPE is never guessed from the file; users are prompted to enter their subjective exertion (1–10).
  - When heart rate or power data allows algorithmic load computation (TRIMP or hrLoad), a banner displays the computed training load while still allowing RPE input.

### C. Duplicate Detection & Merge Flow
- **Fuzzy Proximity Check (`findDuplicateSession`):**
  - Searches athlete's existing completed sessions within a $\pm 10$ minute start time window, matching duration ($\pm 20\%$) and sport.
- **Interactive Resolution Banner:**
  - If a potential duplicate is detected, a non-intrusive warning card provides three clear choices:
    1. **"Összefésülés" (Merge):** Enriches the existing session with file data (metrics, time series, file storage ref) without creating duplicate workload or distorting PMC stress balance.
    2. **"Új edzésként mentés" (Save as New):** Persists the session as an independent entry.
    3. **"Mégse" (Cancel):** Dismisses the file and resets the form.

### D. Session Detail View & Visualizations (`SessionDetailModal.tsx`)
- **"Fájl csatolása" Action:** Enables retroactively attaching a FIT, GPX, or TCX workout file to an existing manual session with seamless data merging.
- **Pure Vector Route Outline (Zero External Map Tiles):**
  - Adheres strictly to the app's zero-trust Content Security Policy by projecting GPS trackpoints into a local bounding box SVG path with start (green) and finish (red) dots.
  - Completely eliminates Google Maps, Mapbox, or OpenStreetMap external tile downloads.
- **Pure SVG Metric Charts:**
  - Responsive SVG area and line charts for Heart Rate (bpm), Power (W), and Elevation profile (m) with min/max gridlines and interactive hover tooltips.

### E. Cloud Storage & Security Architecture (`storage.rules`)
- **Storage Path Convention:** Original files are uploaded to `athletes/{athleteId}/workouts/{sessionId}/{filename}` with metadata (`fileRef`, `fileType`, `fileSizeBytes`, `importedAt`).
- **Security Rules & Access Control:**
  - Upload / Write: restricted to authenticated athlete owner, file size $\le 25\text{ MB}$, and valid content types (`application/octet-stream`, `application/gpx+xml`, `application/vnd.garmin.tcx+xml`, etc.).
  - Read: permitted for the athlete owner and coaches/specialists with active relationship and `training` module permission (`permissions.training != 'none'`).
- **Unit & Security Tests:**
  - `src/shared/lib/devices/workoutFileService.test.ts`: 15 comprehensive unit tests for downsampling, sport catalog mapping, duplicate detection, session merging, and parser validation.
  - `src/shared/lib/sharing/rules.test.ts`: Tests 56–60 covering Cloud Storage rules for athlete writes, 25MB rejection, coach read authorization, and psychologist/stranger rejection.
  - Full project test suite: **240 / 240 tests passing** across 21 test suites with 0 lint errors and 0 TypeScript errors.

---

## 21. Session Share Subsystem (Stickers, Photo Stories & Overlay Architecture) (COMPLETED)

### A. Pure, Framework-Free Overlay Architecture (`src/shared/lib/share/overlay/`)
- **Render Engine (`renderer.ts`):** `drawOverlay(ctx, layout, data, options)` operates purely on standard HTML5 or `OffscreenCanvas` 2D rendering contexts without framework dependencies.
- **Frame-by-Frame Data Contract (`types.ts`):** `data` is a normalized, plain object of formatted values (`OverlayData`), architected specifically to be reused without modification for future video overlay generation frame-by-frame.
- **Single Source of Truth for Branding (`branding.ts`):**
  - **APEX Branding Lockup Above Data Block:** The brand name sits directly ABOVE the data block as a unified group with wide tracking (`letterSpacing: 6px`, ~0.25em), bold weight (`800`), refined compact size (~25-30% of data block width), and a short thin cyan accent line (`#06B6D4`, 28x2px).
  - **Non-Optional:** Cannot be hidden or disabled; wordmark toggle removed everywhere.
  - **Per-Layout Alignment:** Centered for Kompakt & Minimál; left-aligned for Statisztika & Verseny; centered above route for Útvonal; positioned above live telemetry blocks on video HUDs (Alsó sáv, Sarok, Minimál, Verseny) and intro/outro cards.
  - **Crop & Drag Sync:** Moves and scales seamlessly with the overlay during touch drags/pinches and is included inside tightly cropped stickers.
  - **Custom Logo Asset Slot:** `logoUrl`, `logoWidth`, `logoHeight` can be set in `branding.ts` to replace or accompany the text across all templates without altering layouts.
- **Theme Tokens & Safe Zones (`theme.ts`):**
  - Presets for 9:16 (1080x1920 story), 4:5 (1080x1350 feed), and 1:1 (1080x1080 square).
  - Strict safe-zone constraints (top 250px and bottom 340px for 9:16 stories to avoid Instagram/TikTok UI overlaps).
  - Magnetic snapping to center guidelines and safe-zone boundaries (`snapToSafeZones`) with subtle dashed visual guides displayed during drag gestures.

### B. Four Curated Layouts
1. **Kompakt (`compact.ts`):** Centered APEX lockup + accent line, sport chip, title, date, and 2–3 big hero metrics with secondary metric badges.
2. **Statisztika (`stats.ts`):** Left-aligned APEX lockup + accent line, title block, and structured 2-column grid of all chosen biometric metrics with tabular numerals.
3. **Útvonal (`route.ts`):** Centered APEX lockup + accent line, route polyline rendered as the hero widget in the center, flanked by sport title above and key stats below.
4. **Minimál (`minimal.ts`):** Centered APEX lockup + accent line, one massive hero metric (110px font) with an understated caption line.

### C. Background Modes & Interaction
- **Transparent Sticker Mode:**
  - 1080x1920 transparent PNG with centered overlay.
  - "Szűkre vágott" (Tight crop) toggle: crops the canvas precisely to the bounding box (including the APEX lockup) plus padding for seamless use as an Instagram Story sticker.
  - Card background variants: Nincs (Átlátszó), Sötét kártya (`rgba(14, 16, 22, 0.82)`), Világos kártya (`rgba(255, 255, 255, 0.92)`).
- **Photo Story Mode:**
  - Gallery upload and mobile camera capture (`<input type="file" accept="image/*" capture="environment">`).
  - Safe in-memory downscaling (capped at 2560px) to prevent mobile browser memory exhaustion.
  - Pan and pinch/scroll-zoom of the photo beneath the overlay.
  - Touch/pointer drag repositioning of the overlay with magnetic safe-zone snapping.
  - Soft gradient scrim slider ("Sötétítés", 0–80%) and text drop shadow for maximum legibility on high-contrast photos.
  - Automatic luminance detection (`calculateAreaLuminance`) sampling underlying photo pixels to pick light or dark text.
  - Re-encoding strips all EXIF and GPS metadata from the photo with a reassuring localized notice (*"A fotó helyadatai nem kerülnek át"*).
  - Default format is PNG; optional smaller JPEG format available under details with a brief warning banner when the PNG is very large (> 2.5 MB).

### D. Route Privacy & Zero Map Tiles
- **Privacy Trimming (`trimRoutePrivacy`):** Automatically hides the first and last 200 meters of the route (using Haversine calculations) to safeguard home/residence privacy.
- **Zero External Map Tiles:** Vector projected SVG/Canvas polyline rendered entirely client-side without map tiles or external tile servers.

### E. Export Pipeline & Action Buttons (`imageExporter.ts`, `SessionShareModal.tsx`)
- **Action Suite (Sticker & Photo Modes):**
  - **Megosztás:** Triggers the native Web Share API (`navigator.share({ files: [file] })`) on mobile/supported platforms with automatic fallback to download.
  - **Másolás:** Copies generated image to clipboard as PNG (`ClipboardItem` with `image/png`) using the Safari-compatible Promise form; falls back with clear guidance to download button and touch long-press note. Shows toast *"Kép a vágólapon"*.
  - **Letöltés:** Direct instant client-side download of PNG/JPEG file.
- **Video Mode:**
  - Retains "Megosztás" and "Letöltés" only (clipboard does not support video files).
- **Unit & Smoke Tests:**
  - `src/shared/lib/share/share.test.ts`: 18 comprehensive unit tests verifying duration, distance, and pace formatting by sport, Haversine route trimming, safe-zone snapping, sport archetypes, luminance calculations, canvas rendering, and PNG/JPEG blob generation.
  - `e2e/smoke.spec.ts`: Flow 6 verifying share modal opening, canvas rendering, and non-empty image blob generation.
---

## 22. Video Telemetry HUD & Synchronization Subsystem (COMPLETED)

### A. Pure Video HUD Rendering Architecture (`src/shared/lib/share/overlay/widgets/videoHud.ts`)
- **HUD Layout Presets:**
  1. **Alsó sáv (Lower Third):** Horizontally spanning rounded glass banner (`rgba(10, 13, 20, 0.82)`) anchored above the bottom safe zone with primary metric (52px tabular font), heart rate chip with glowing zone indicator, distance, elapsed time, and grade.
  2. **Sarok (Corner Cluster):** Compact HUD cluster anchored in the corner safe zone (380px wide), leaving the center 100% open for the athlete.
  3. **Minimál (Minimal Hero Stat):** Giant 96px tabular telemetry number (speed/pace or heart rate) with uppercase unit and high-contrast drop shadow, pro cinematic aesthetic.
  4. **Verseny (Race / Action Cam Dashboard):** Dashboard featuring an active speedometer arc gauge, heart rate zone progression bar, telemetry grid, and mini GPS route map with animated pulsating current position dot.
- **Intro & Outro Cards:**
  - **Felvezető címkártya (Intro Card, 1.5s):** Dark frosted glass card showing sport icon, session title, date, athlete name, and APEX branding with smooth 0.3s fade-in/fade-out.
  - **Záró összegző kártya (Outro Summary Card, 2.0s):** Summary card in the final 2 seconds showcasing total distance, time, and key biometric averages.
- **Tabular Figures & Zero Jitter:**
  - Semicolon-free tabular formatting (`toFixed(1)`, zero-padded `MM:SS`, integer `bpm`) ensures constant string width across frame updates without visual text jumping.

### B. Time Series Interpolation & Live Data Engine (`src/shared/lib/share/video/liveDataEngine.ts`)
- **Binary Search & Continuous Interpolation:** Fast $O(\log N)$ lookup finding bounding points $p_0, p_1$ for any timestamp $t$; linear interpolation for distance, elevation, heart rate, power, and GPS lat/lon.
- **Moving Average Smoothing:** 3-point moving average filter on speed/pace eliminates GPS multipath noise and sudden spikes.
- **Heart Rate 5-Zone Model:**
  - Zone 1 (< 60% maxHr): `#60A5FA` (Regeneráció)
  - Zone 2 (60-70% maxHr): `#34D399` (Állóképesség)
  - Zone 3 (70-80% maxHr): `#FACC15` (Tempó)
  - Zone 4 (80-90% maxHr): `#FB923C` (Küszöb)
  - Zone 5 (90%+ maxHr): `#EF4444` (Maximális)
- **Moving Route & Elevation Marker:**
  - Computes exact route index and fractional completion ($0.0 \dots 1.0$), drawing a glowing emerald green dot along the vector route.

### C. In-Browser ISO BMFF Metadata Parser (`src/shared/lib/share/video/mp4MetaParser.ts`)
- **Zero-Dependency Atom Reader:**
  - Reads `moov`, `mvhd`, and `tkhd` boxes directly from file slices (head/tail 2MB), avoiding loading 500MB videos into memory.
  - QuickTime epoch conversion (`2082844800` seconds offset from 1904-01-01) extracts real creation timestamp.
  - Reads 3x3 transformation matrix in `tkhd` to detect video rotation (0°, 90°, 180°, 270°) for iPhone portrait videos.

### D. Native Browser Export Pipeline (`src/shared/lib/share/video/videoExporter.ts`)
- **Canvas CaptureStream + MediaRecorder:**
  - Combines 30 FPS canvas rendering with captured HTMLVideoElement audio track via Web Audio API (`AudioContext.createMediaElementSource`).
  - Output formats: `video/mp4` (H.264 + AAC) with fallback to `video/webm` (VP9/VP8).
  - Bitrate: 8 Mbps for 1080p, 4 Mbps for 720p.
  - Enforces even pixel dimensions required by H.264 codecs.
- **Screen Wake Lock API:**
  - `navigator.wakeLock.request('screen')` keeps the mobile display active during export, releasing on completion or abort.
- **Progress & Cancel:**
  - Emits real-time percentage progress, elapsed seconds, and estimated time remaining (ETA).
  - Clean `AbortController` support allowing instantaneous cancellation.

### E. 4-Step Wizard UI (`VideoShareWizard.tsx` & `SessionShareModal.tsx`)
- **Availability Guard:**
  - If session lacks time series, displays an informative card with "Fájl csatolása (FIT, GPX, TCX)" action which parses files client-side and immediately unlocks video sync.
- **Step 1: Videó kiválasztása:**
  - File picker (gallery / camera), 500MB size limit check, codec support detection (HEVC/HDR diagnostic tip), zero-upload privacy guarantee notice.
- **Step 2: Szinkron:**
  - Automatic suggestion banner from MP4 QuickTime creation date vs session start time.
  - Interactive dual scrubbers: video scrubber on top, workout profile timeline below.
  - "Ez a pillanat" sync matcher locking the current video frame to the workout time offset.
  - Micro-adjust buttons (`-1s`, `-0.1s`, `+0.1s`, `+1s`) with live updating telemetry card.
  - Overlap check warning if video falls outside workout range.
  - Clip trimming (default 60s max, hard limit 120s with mobile performance explanation).
- **Step 3: Adatok és stílus:**
  - 4 visual layout preset cards ("Alsó sáv", "Sarok", "Minimál", "Verseny").
  - Pill toggles for speed/pace, heart rate (OFF by default for privacy), distance, elapsed time, elevation/grade, power, cadence, and moving GPS dot.
  - Framing: Original aspect ratio vs 9:16 (Stories/Reels/TikTok).
  - Instagram/TikTok safe zone guide overlay toggle.
  - Intro card and Outro summary card toggles.
  - Background dimming scrim slider (0% to 70%) and APEX wordmark toggle.
- **Step 4: Előnézet és export:**
  - Real-time continuous canvas preview player with play/pause/replay and mute controls.
  - 1080p / 720p resolution selection.
  - Animated progress bar with ETA and "Mégse" cancel button.
  - Finished export player with Web Share API and direct download buttons.

### F. Verification & Quality
- **Unit Tests:** `src/shared/lib/share/video/video.test.ts` (17 tests covering tabular duration/pace, 5 HR zones, sample point and midpoint interpolation, clamp boundaries, ISO BMFF QuickTime creation date parser, export dimensions, and overlay HUD layouts).
- **Full Test Suite:** **310 / 310 tests passing** across 29 test files.
- **Build & Quality Gates:** `npm run typecheck`, `npm run lint`, and `npm run build` pass with 0 errors and 0 warnings.

---

## 18. Critical Data Safety, Persistence Architecture & Disaster Recovery (COMPLETED)

### A. Root Cause Resolution
- **Undefined Field Sanitization (`sanitizeForFirestore`):** Recursive pre-write cleanup removing `undefined` properties, nested map values, and array entries that previously caused Firestore writes to crash silently with `Unsupported field value: undefined`.
- **Legacy Storage Migration:** Replaced isolated local-only storage keys (`apex_planned_workouts_${athleteId}`, `apex_competitions_${athleteId}`) with bidirectional Firestore sync under `athletes/{athleteId}/...`.
- **Logout Isolation Guard (`clearUserLocalData` & `checkPendingWritesBeforeSignOut`):** Signout intercepts unsynced offline mutations, prompts the athlete with `LogoutConfirmationModal`, and strictly preserves global sync queues (`apex_offline_mutation_queue`), theme preferences, and internationalization state.

### B. Central Typed Repository Layer (`src/shared/lib/repositories/`)
- **`sessionRepository.ts`:** Manages completed sessions under `athletes/{athleteId}/sessions/{sessionId}`. Writes 30-day revision snapshots to `sessions/{sessionId}/revisions/{revId}` on each edit for disaster recovery. Implements soft deletion with `deletedAt`.
- **`plannedWorkoutRepository.ts`:** Syncs structured workout plans with Firestore and local caches.
- **`checkinRepository.ts` & `nutritionRepository.ts`:** Centralized daily check-ins (`athletes/{athleteId}/days/{date}`) and meal plans (`athletes/{athleteId}/nutritionDays/{date}`).
- **`competitionRepository.ts`:** Manages athlete target events and A/B/C race dates under `athletes/{athleteId}/competitions/{compId}`.
- **`trashRepository.ts`:** Unified soft-delete trash manager providing 30-day retention countdown, one-click restoration, and permanent purge across all entity types.

### C. UI & Recovery Controls
- **Sync Status & Outbox Screen (`SettingsPage.tsx`):** Real-time badge in settings indicating cloud sync status and pending outbox count with manual "Szinkronizálás most" force trigger.
- **Full JSON Data Export & 30-Day Reminder:** Complete data export covering profile, sessions, planned workouts, daily check-ins, nutrition, equipment, exercises, and competitions, with automated 30-day backup reminder alert.
- **Emergency Data Recovery Routine (`recoveryRoutine.ts`):** Automatically invoked on application startup to discover orphaned legacy data keys in browser localStorage and cleanly back them up to Firestore.

---

## 19. Training Blocks with Rounds & Rest Times Subsystem (COMPLETED)

### A. Shared Block Model & Data Architecture
- **Unified `TrainingBlock` Type (`src/shared/types/training.ts`):** A single schema used across both planned workouts and completed sessions (`athletes/{athleteId}/plannedWorkouts` and `athletes/{athleteId}/sessions`).
  - Block types: Warmup (`bemelegítés`), Alphabetic (`A`, `B`, `C`, `D`, `E`, `F`, `G`, `H`), Cooldown (`levezetés`), Other (`egyéb` with custom name).
  - Rounds & Rest: `rounds` (default 1), `restBetweenRoundsSeconds` (mm:ss input e.g. 1:00), `restAfterBlockSeconds` (e.g. 2:00).
  - One-line block summary: e.g. `"A blokk • 3 kör • 1:00 pihenő körök között • 2:00 pihenő utána"`.
  - Quick-pick rest chips: `0:30`, `1:00`, `1:30`, `2:00`, `3:00` plus free text/numeric mm:ss input.
  - Rows (`TrainingBlockRow`): Exercise rows (sets, reps, load, RPE, rest between sets) or endurance rows (duration/distance, target, actual).
  - Round Overrides (`RoundOverride`): Per-round modifications for progressive overload / drop sets without duplicate rows.
  - Volume calculation: Total volume = `rounds x sets (default 1) x reps x loadKg` (or sum of round overrides), strictly preventing double-counting.
- **Estimated Duration Engine (`calculateEstimatedDurationMinutes`):** Planned workouts compute total time based on rows (`DEFAULT_SECONDS_PER_REP = 4` seconds per rep, or duration seconds) + intra-set rests + inter-round rests + post-block rests, labeled as `(becsült)`.

### B. FIT File & Device Derivation (`fitParser.ts`, `blockUtils.ts`)
- **Laps to Blocks:** Converts recorded laps from FIT/GPX/TCX into structured blocks with pace, HR, power, and time offsets.
- **FIT Strength Sets (Global Message 225):** Automatically parses strength sets recorded by Garmin/wearable devices (reps, weight in kg, active vs rest intervals) into structured strength exercise blocks.
- **Chart Interactive Highlighting:** Tapping a block highlights the semi-transparent cyan band over the multi-channel time-series charts. Editing blocks does not mutate raw file telemetry.

### C. UI & Workflow Integration
- **`TrainingBlockList.tsx`:** Shared collapsible block editor component. Supports reordering via drag-and-drop and mobile up/down buttons, duplicate block, delete with confirmation, and exercise library integration with "Mentés a könyvtárba".
- **`RestTimerModal.tsx`:** Floating circular progress countdown timer with Web Audio ascending chime, device vibration, and "+30 mp" button.
- **`ManualSessionModal.tsx`:** Collapsible "Blokkok" drawer under "Részletek", "Előző edzés másolása" (retains block structure and targets, clears actual values), block-averaged RPE calculation toggle.
- **`WorkoutBuilderModal.tsx` & `WorkoutFeedbackModal.tsx`:** Seamless plan-to-completion conversion with side-by-side planned vs actual comparison.
- **`SessionShareModal.tsx`:** Optional "Blokk összegző" chip displaying compact block breakdown on export stickers and photos.

---

## 20. Meal Pools & Flexible Diet Planning Subsystem (COMPLETED)

### A. Core Concept & Architectural Model
- **Flexible Meal Pools ("Étrendterv"):** Rather than prescribing rigid calendar days, dietitians and athletes construct pools of meal options for each meal slot (Reggeli, Ebéd, Vacsora, Tízórai/Uzsonna, Edzés előtt/után). Athletes mix and match options into actual days based on daily schedule and training demands.
- **Author Roles & Permission Protection:**
  - Plans and options carry `authorRole: 'athlete' | 'dietitian'`.
  - When a dietitian issues a plan (`isDietitianAuthored`), their options are protected (read-only for the athlete).
  - The athlete cannot modify or delete the dietitian's options, but can freely supplement each slot with their own options in a distinct "Saját" pool.
  - In dietitian mode (`isDietitianMode`), dietitians can author, modify, and leave clinical/practical notes per option.
- **Decoupled Snapshots (`PlannedDayOptionSelection`):**
  - Planned days store self-contained option snapshots (`optionSnapshot`).
  - If a saved food in the library is modified or deleted, historical plans and past days remain intact, showing `"az étel törölve"` gracefully without breaking nutrient accounting.

### B. Suggestion & Scaling Engines (`mealPlanEngine.ts`)
- **Deterministic Suggestion Engine (`suggestDayMeals`):**
  - Synthesizes a balanced day from the active plan's meal pools based on user target (calories, protein, carbs, fat) and day type (pihenő, könnyű, mérsékelt, kemény, verseny).
  - Avoids repeating options used in the preceding 2 days (`recentOptionIds`).
  - Clamps portion multipliers within the option's configured min/max limits (`portionLimits: { minMultiplier, maxMultiplier }`).
- **Day-Type Scaling (`calculateOptionNutrients`):**
  - Scales carbohydrate and calorie density automatically according to training load (e.g., hard days scale carbohydrate-rich options by 1.3-1.5x, rest days reduce to 0.8-0.9x).
- **Allergen Cross-Matching (`checkOptionAllergens`):**
  - Bidirectional keyword and tag matching across Hungarian and English allergen dictionaries (glutén, laktóz, mogyorófélék, szója, tojás, hal, rákfélék, szezámmag, stb.).
  - Alerts users with an informational confirmation dialog ("figyelmeztetés, nem garancia").
- **Shopping List Aggregation (`aggregateShoppingList`, `formatShoppingListAsText`):**
  - Traverses ingredients across all planned days in a selected date range.
  - Normalizes and aggregates quantities across matching items and units (g, dkg, kg, ml, dl, l, db, csipet, ek, tk).
  - Generates clean, copyable and shareable grocery checklists grouped by food category (Zöldség & Gyümölcs, Hús & Hal, Tejtermék, Gabonafélék, stb.).

### C. UI Components & Daily Workflows (`src/features/nutrition/components/plans/`)
- **Étrendterv Screen (`MealPlanEditor.tsx`):**
  - Visual grid displaying slots as cards with option chips showing photo, name, macros, and author attribution badge (`"Dietetikus: Dr. Kovács Anna"` vs `"Saját"`).
  - Drag-and-drop and arrow reordering of options.
  - Option creation/editing modal (`OptionEditModal.tsx`) with search from Ételeim library, manual macro inputs, portion ranges, day-type tags, allergen markers, and recipe ingredients.
  - Plan duplication, archiving, and soft-deletion with 30-day trash retention.
- **Nap Összeállító Sheet (`DayComposerModal.tsx`):**
  - Selectable option cards per meal slot with interactive portion slider (0.5x - 2.0x).
  - Sticky summary bar comparing day total against target calories and macros with live status colors.
  - "Javasolj egy napot" deterministic generation button with "Másik javaslat" seed rotator.
  - "Mentés napi sablonként" and "Alkalmaz a napra" storing directly to `plannedDays/{date}`.
- **Napló Integration (`NutritionPage.tsx`):**
  - Top 3 pool options from active plan displayed as instant 1-tap logging chips on empty meal cards.
  - Planned meals highlighted with 1-tap "Megettem" (logs meal items and marks status as consumed) and "Mást ettem" (marks status as replaced and opens food picker).
  - Quick action buttons in header: "Nap összeállítása", "Hétterv", "Bevásárlólista".
- **Hétterv Sheet (`WeekPlannerModal.tsx`):**
  - 7-day strip (Hétfő - Vasárnap) showing planned meals and macro totals per day.
  - Individual day lock toggles (🔒/🔓) to protect user-chosen days.
  - "Hét automatikus kitöltése" button generating a varied, load-adapted weekly diet plan.
- **Bevásárlólista Sheet (`ShoppingListModal.tsx`):**
  - Preset date range selector ("Következő 3 nap", "Ez a hét", "Jövő hét").
  - Interactive checkbox list with crossed-out completed items.
  - Native clipboard copy with toast confirmation and Web Share API integration.
- **Ételeim Library Tab (`MyFoodsTab.tsx`):**
  - Unified repository of staples, curated sports nutrition items, and custom user-created foods with favorite toggles.

### D. Sensitive-Use Safeguards & Ethics
- **Tányérmódszer (Plate Method) & Hide Calories:**
  - Respects athlete's `apex_hide_calories` setting everywhere: hides numerical calorie and gram counts in plan cards, option cards, summary bars, and shopping lists, replacing them with qualitative plate balance and portion sizing.
- **Non-Shaming Language:**
  - All hints and feedback provide constructive, supportive physiological explanations (e.g. `"kb. 40 g szénhidrát hiányzik a glikogénraktárak feltöltéséhez"` instead of deficit/surplus shaming).
- **Medical Disclaimer:**
  - Clearly identifies diet plans as sports nutrition guidance and includes mandatory disclaimer that plans do not constitute clinical medical nutrition therapy.

---

## 15. Liquid-Glass Design System & Stability Hardening

### A. Liquid-Glass Foundations
- **Design Principles:** Content-first, calm dark/light surfaces with elevated functional glass layers (floating tab bar, header, sheets, segmented controls).
- **Glass Tokens & Fallbacks:** High-precision CSS tokens (`--glass-surface`, `--glass-blur`, `--shadow-glass`) with automatic reduced-transparency fallback for accessibility and low-power hardware.

### B. React Error #185 Resolution & Loop Prevention
- **Root Cause:** Sliding glass lens effect in `src/app/AppLayout.tsx` combined unmemoized `navItems` array references with an unguarded `setMobileLens` update inside `useLayoutEffect`, causing synchronous re-render loops on route `"/"`.
- **Sliding Lens Stabilizations:** Applied coordinate equality checks `prev.left === nextLeft && prev.width === nextWidth` to `AppLayout.tsx`, `SegmentedControl.tsx`, and `Tabs.tsx`, ensuring zero re-renders when positions remain unchanged.
- **Store & Hook Hardening:** Primitive selectors adopted across shell layout; `appearanceStore` and `themeStore` setters made strictly idempotent.
- **Development Render-Loop Detector:** Added `useRenderLoopDetector` hook warning when a component exceeds 50 renders in 1000ms.
- **ESLint Strictness:** Configured `react-hooks/rules-of-hooks` and `react-hooks/exhaustive-deps` as errors; resolved all hook dependency warnings codebase-wide.
- **Source Maps:** Added `build.sourcemap: "hidden"` to `vite.config.ts` for clean production debugging.
- **Automated Verification:** Added `AppLayout.reproduce.test.tsx` and `slidingLensStability.test.tsx` covering all viewport, role, and resize permutations.

### C. Screen-by-Screen UI/UX Refactor & Responsive Harness
- **12 Refactored Surfaces:** Auth & Onboarding, Today Dashboard, Training Calendar & Day Detail, Session Detail & Biometric Charts, Workout Builder & Feedback (progressive disclosure, exercise picker), Nutrition & Meal Pools, Recovery & Insights, Profile & Settings (inset grouped lists, privacy controls), Devices & File Upload (FIT/TCX/GPX), Coach Workspace, Session Share Sheet (canvas preview), and System UI (Toasts, ErrorBoundary, Sync Badges).
- **Public Styleguide Route:** Direct access to `/design` (`DesignSystemPage`) for isolated component and token auditing.
- **Automated Responsive Matrix:** 25 Playwright tests passing across 11 viewports (320px to 1920px) in both dark and light modes, verifying zero horizontal scroll, >=44px mobile touch targets, safe area compliance, and visual snapshots (`docs/DESIGN_QA.md`).

---

## 16. Three Scores System (Recovery, Strain, Sleep) & Scoring Engines

### A. Scoring Engines (`src/shared/lib/scores/`)
- **Central Configuration (`config.ts`):** Single source of truth for sports science tuning, athlete level capacities ($k$), strain diminishing-returns coefficients, and sleep weights.
- **Recovery (Regeneráció):** Reuses the existing readiness engine (0–100, green $\ge 67$, amber 34–66, red $< 34$), returning score, status band, confidence index, and top 3 drivers.
- **Strain (Terhelés):** Computes daily load via diminishing-returns exponential curve: $\text{Strain} = 100 \times (1 - \exp(-\text{dailyLoad} / k))$. Computes session breakdowns and target strain range ("célsáv") based on planned workout load or recovery score + TSB recommendation.
- **Sleep (Alvás):** Calculates sleep need (baseline + strain extra + 7-day debt repayment - naps), evaluates device/manual sleep performance (0–100), and computes optimal bedtime.
- **Daily Rhythm State Machine (`dailyRhythm.ts`):** 5 stages (morning pending, morning ready, daytime training, post-training recovery, evening wind-down) driving contextual prompts and next-step actions.
- **Weekly Summary ("Heti kör"):** 7-day retrospective score analysis, best/worst day metrics, target compliance rate, and shareable/copyable summary overlay.
- **Data Persistence:** Unified daily score record stored in `athletes/{id}/days/{date}` with idempotent updates on session/check-in changes.
- **Documentation:** Full methodology, inputs, and disclaimer documented in `docs/SCORES.md`.

### B. Today Cockpit & Detail Sheets
- **Three Scores Hero Card (`ThreeScoresHeroCard.tsx`):** Three SVG rings side-by-side with fluid `clamp()` sizing, target range arc on strain ring, and zero layout thrash.
- **Stability & Performance (React #185 Loop Prevention):** Pure SVG `stroke-dashoffset` CSS transitions, memoized selectors, zero per-frame React state updates. Render count settled in $\le 3$ renders (`TodayPage.renderCount.test.tsx`).
- **Detail Sheets:** `RecoveryDetailSheet`, `StrainDetailSheet`, and `SleepDetailSheet` providing 14-day trends, driver breakdowns, and direct action triggers.

### C. Coach Workspace & Multi-Domain Alerts
- Roster cards display 3 mini score dots with strict permission gating (`Nincs megosztva` fallback when locked).
- Alerts engine checks for `sustained_high_strain` (strain exceeding target for 3+ consecutive days) and `consecutive_low_sleep` (sleep score $< 60$ for 3+ consecutive nights).


