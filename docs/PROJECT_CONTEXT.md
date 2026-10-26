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
| **Stage 3** | **Authentication, Multi-Role Profiles & Onboarding** | Firebase Auth (Email/Pass, Google, Apple), session persistence, localized error codes, multi-role user profile in Firestore (`users/{uid}`), 7-step resumable onboarding state machine with Vitest unit tests, mandatory GDPR Art. 9 health-data consent, adaptive UI via `useAppMode()`, extended settings with units, live mode changers, JSON data export, and Cloud Function `deleteUserData` account erasure. | **Completed (Current)** |
| **Stage 4** | **Morning Check-in & Readiness Engine** | Recovery score calculation engine, HRV and resting HR integration, daily subjective fatigue markers, persistent Firestore check-in collection. | Upcoming |
| **Stage 5** | **Training Engine & Periodization** | Structured training blocks, interval timer, mechanical volume calculation, session completion logs, RPE-based load adjustment. | Upcoming |
| **Stage 6** | **Nutrition & Hydration Tracking** | Macronutrient distribution, pre/post workout nutrient timing, hydration progress logger with custom water volume increments. | Upcoming |
| **Stage 7** | **Wearable Devices & Sensor Sync** | Webhook and OAuth integrations with Garmin Connect, WHOOP 4.0, Apple HealthKit, and Polar Flow; background biometric syncing. | Upcoming |
| **Stage 8** | **Coaching Staff & Specialist Hub** | Multi-user collaboration for dietitians, physiotherapists, strength coaches, psychologists, and physicians; athlete note sharing and invitation workflows. | Upcoming |
| **Stage 9** | **Performance Analytics & ACWR Engine** | Acute:Chronic Workload Ratio (ACWR) safety index calculation, injury risk forecasting models, advanced Recharts trend graphs. | Upcoming |
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

> **Requirement:** At the completion of each subsequent stage, this document must be updated with the stage's achievements, architectural decisions, and updated status.
