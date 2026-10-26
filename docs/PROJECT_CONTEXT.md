# Apex Project Context & Architecture Guide

> **Working Title:** Apex  
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
   │ 8 Lazy Routes │           │ State Management  │      │ Service Worker   │
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

## 2. Directory Conventions & Feature-Based Architecture

The codebase strictly enforces a modular, feature-based architecture:

```
src/
├── app/                  # Application root & shell
│   ├── App.tsx           # Providers (QueryClient, Auth, Router)
│   ├── AppLayout.tsx     # Shell: Mobile bottom nav, desktop sidebar, language switcher
│   ├── index.css         # Tailwind directives & accessibility styles
│   ├── main.tsx          # React 18 DOM mount point
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
│   └── settings/         # Profile, language switch (HU/EN), emulator toggle, system diagnostics
│
├── shared/               # Reusable platform code
│   ├── hooks/            # Custom utilities (e.g. useDebounce)
│   ├── lib/              # Infrastructure libraries (Firebase, i18n, PWA hooks, cn utility)
│   ├── types/            # TypeScript interfaces and domain models
│   └── ui/               # PwaInstallBanner, PwaUpdateToast, OfflineIndicator, NotFoundPage
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

## 3. Engineering & Design Rules

1. **Mobile-First & PWA First:** Every view is engineered for thumb-friendly mobile interaction with bottom navigation, responsive breakpoints for tablet/desktop, and standalone display mode.
2. **WCAG AA Accessibility:**
   - Color contrast ratio >= 4.5:1.
   - Screen-reader skip-to-content links.
   - Proper semantic HTML `<main>`, `<header>`, `<nav>`, `<aside>`, `<section>` and ARIA attributes (`aria-live`, `aria-atomic`, `role="status"`).
3. **Strict Localization (i18n):**
   - No hardcoded UI strings.
   - Hungarian (`hu.json`) is the default language; English (`en.json`) is fully supported.
   - All interactive controls consume `useTranslation()`.
4. **Interactive Fidelity:**
   - No dead buttons: all interactive elements trigger state modifications, navigation, or feedback toasts.
   - No lorem ipsum text: realistic athletic and sports science terminology throughout.
5. **Security & Data Integrity:**
   - Never commit production secrets.
   - Strict Firestore security rules with athlete-owner validation and collaboration check functions.

---

## 4. The 10 Build Stages Roadmap

| Stage | Name | Description | Status |
|---|---|---|---|
| **Stage 1** | **Foundation & Scaffold** | Project scaffold, ESLint, Prettier, path aliases, Firebase config & emulators, PWA manifest, service worker caching, offline fallback, lazy routing shell, Hungarian/English i18n, and WCAG AA mobile-first UI shell. | **Completed (Current)** |
| **Stage 2** | **Firebase Auth & Multi-Role Profiles** | Production Firebase Auth lifecycle, persistent athlete/coach profiles in Firestore, role-based claims, onboarding completion logic. | Upcoming |
| **Stage 3** | **Morning Check-in & Readiness Engine** | Recovery score calculation engine, HRV and resting HR integration, daily subjective fatigue markers, persistent Firestore check-in collection. | Upcoming |
| **Stage 4** | **Training Engine & Periodization** | Structured training blocks, interval timer, mechanical volume calculation, session completion logs, RPE-based load adjustment. | Upcoming |
| **Stage 5** | **Nutrition & Hydration Tracking** | Macronutrient distribution, pre/post workout nutrient timing, hydration progress logger with custom water volume increments. | Upcoming |
| **Stage 6** | **Wearable Devices & Sensor Sync** | Webhook and OAuth integrations with Garmin Connect, WHOOP 4.0, Apple HealthKit, and Polar Flow; background biometric syncing. | Upcoming |
| **Stage 7** | **Coaching Staff & Specialist Hub** | Multi-user collaboration for dietitians, physiotherapists, strength coaches, psychologists, and physicians; athlete note sharing and invitation workflows. | Upcoming |
| **Stage 8** | **Performance Analytics & ACWR Engine** | Acute:Chronic Workload Ratio (ACWR) safety index calculation, injury risk forecasting models, advanced Recharts trend graphs. | Upcoming |
| **Stage 9** | **Push Notifications & Cloud Functions** | Firebase Cloud Messaging (FCM) web push notifications, automated daily check-in reminders, scheduled weekly digests via Cloud Functions. | Upcoming |
| **Stage 10** | **Production Hardening, Auditing & Deployment** | Lighthouse PWA 100/100 audit, WCAG AA automated accessibility testing, security rules validation, production deployment to Firebase Hosting and Functions. | Upcoming |

> **Requirement:** At the completion of each subsequent stage, this document must be updated with the stage's achievements, architectural decisions, and updated status.
