# Apex — Athletic Training, Recovery & Nutrition PWA

Apex is an elite, production-grade Progressive Web Application (PWA) engineered for athletes ranging from dedicated hobbyists to Olympic-level competitors. It facilitates daily high-performance training periodization, subjective and biometric morning check-ins, targeted macronutrient and hydration tracking, and seamless multidisciplinary collaboration between athletes, head coaches, sports dietitians, physiotherapists, strength & conditioning coaches, sport psychologists, and team physicians.

---

## 🛠 Tech Stack

- **Frontend Core:** React 18 (Strict Mode), TypeScript (Strict), Vite
- **UI & Styling:** Tailwind CSS, Lucide Icons, Mobile-First, WCAG AA Accessible
- **Routing & State:** React Router (lazy-loaded routes with Auth Guard), Zustand (lightweight client state), TanStack Query (server state & caching)
- **Data & Charts:** Zod (schema validation), date-fns, Recharts (ACWR & biometric trends)
- **Internationalization:** `react-i18next` with Hungarian (`hu`, default) and English (`en`)
- **PWA:** `vite-plugin-pwa`, app-shell caching, standalone display, offline fallback, install prompt handling, and instant "update available" toast
- **Backend & Cloud Services:** Firebase Authentication, Cloud Firestore, Cloud Storage, Cloud Messaging, Cloud Functions (TypeScript), Firebase Hosting, and the Firebase Emulator Suite

---

## 🚀 Setup & Local Development

### 1. Prerequisites
- **Node.js**: v20+ or v22 LTS
- **Firebase CLI**: Install globally via `npm install -g firebase-tools`
- **Java JRE 11+** (required only for running local Firebase emulators)

### 2. Configure Environment Variables
Copy `.env.example` to `.env` (a ready-to-use `.env` with configured project keys is already included in this repository):

```bash
cp .env.example .env
```

Environment variables structure:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
VITE_USE_FIREBASE_EMULATORS=false
```

### 3. Firebase Console Configuration
If setting up a new Firebase project or verifying the active project (`zsombor-etrend`):
1. Navigate to the [Firebase Console](https://console.firebase.google.com/).
2. **Authentication**: Enable the **Email/Password** sign-in provider.
3. **Firestore Database**: Create database in production mode.
4. **Cloud Storage**: Enable storage bucket for user profile/check-in media.
5. **Cloud Functions**: Ensure the Blaze (pay-as-you-go) plan is enabled for Cloud Functions v2.
6. **Cloud Messaging**: Enable Web Push certificates if browser push is needed.

### 4. Running the App

Install dependencies:
```bash
npm install
npm --prefix functions install
```

Start the Vite development server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Running with Firebase Local Emulators
To run Firestore, Auth, Storage, Functions, and the Emulator UI locally without touching production:
1. Set `VITE_USE_FIREBASE_EMULATORS=true` in your `.env`.
2. Start the emulators:
```bash
npm run emulators
```
3. Open the Firebase Emulator Suite UI at [http://localhost:4000](http://localhost:4000).

---

## 📦 Available Scripts

- `npm run dev`: Starts the Vite local development server with HMR.
- `npm run build`: Typechecks and builds production PWA assets into `dist/`.
- `npm run preview`: Locally previews the production build from `dist/`.
- `npm run lint`: Runs ESLint with zero-warning threshold.
- `npm run typecheck`: Runs strict TypeScript type checks across app and node configs.
- `npm run emulators`: Starts the full Firebase Emulator Suite.
- `npm run deploy`: Deploys Hosting, Firestore rules/indexes, Storage rules, and Functions to Firebase.

---

## 📱 Progressive Web App (PWA) Features

- **Install Prompt:** Custom install banner automatically triggers the native browser install dialog for home screen installation.
- **Update Toast:** When a new service worker version is detected, a non-intrusive toast allows the athlete to update and reload seamlessly with zero data loss.
- **Offline Fallback:** If internet connectivity drops, the app serves cached app-shell assets and displays a dedicated offline fallback screen (`/offline.html`) and in-app offline banner.

---

## 🏛 Feature Architecture

- `src/app`: Application bootstrapping, Router, QueryClient, global CSS, layout shell.
- `src/features/auth`: Authentication state (Zustand), Firebase Auth integration, Demo athlete mode, ProtectedRoute guard.
- `src/features/onboarding`: Athlete profile creation, sport selection, competition tier, support role configuration.
- `src/features/today`: Morning overview dashboard, Readiness Index, key biometrics, daily planned workout, hydration.
- `src/features/checkin`: Morning subjective check-in (sleep, soreness, mental stress, energy, HRV, resting HR).
- `src/features/training`: Workout periodization, session logging, RPE intensity rating, completion toggles.
- `src/features/nutrition`: Target vs. consumed calories, macronutrient balance (protein/carbs/fat), hydration logging.
- `src/features/devices`: Biometric device connections (Garmin, WHOOP, Apple Health, Polar Flow) with manual sync triggers.
- `src/features/coach`: Support staff directory, role assignments, feedback messaging, and specialist invitations.
- `src/features/insights`: Performance analytics, Acute:Chronic Workload Ratio (ACWR) safety index, Recharts visualizations.
- `src/features/settings`: Language selector (HU/EN), theme, runtime emulator status, profile settings.
- `src/shared/ui`: Reusable WCAG AA components, PWA install banner, update toast, offline indicator, 404 page.
- `src/shared/lib`: Firebase clients, i18next configuration, PWA hooks, styling utilities.
- `functions/src`: Cloud Functions backend.
