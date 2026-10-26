# Apex Athletic Platform — Roadmap & Next Steps

This document outlines the architectural roadmap and recommended future iterations for **Apex** following the completion of the foundational 10 stages.

---

## 1. AI Planning Assistant & Intelligent Periodization
- **Conversational Planning Co-Pilot:** LLM-powered assistant (via Firebase Vertex AI / Google Gemini Flash) allowing coaches and solo athletes to design complex periodized blocks via natural language (e.g. *"Generate a 4-week build cycle focusing on VO2max swim intervals and aerobic tempo runs, accounting for a B-race on Saturday"*).
- **Rule-Bound Safeguards:** All AI suggestions strictly conform to physiological boundaries (e.g. ACWR $\le 1.4$, load ramp $< 20\%$/week). The AI never silently overwrites plans; every recommendation requires one-click coach or athlete approval.
- **Natural Language Workout Querying:** Athletes can ask *"How did my resting heart rate respond after last Tuesday's 90-minute bike session?"* and receive instant, source-attributed data summaries.

---

## 2. Native Mobile Wrapper (Capacitor / Swift / Kotlin)
- **Apple HealthKit Integration:** Real-time bi-directional sync on iOS using `@capacitor/core` or custom Swift native bridge. Streams sleep analysis stages (REM, Deep, Core), continuous heart rate, resting HR, and HRV (SDNN / rMSSD) directly into the normalized biometrics pipeline (`POST /ingest/health`).
- **Android Health Connect Integration:** Centralized Android biometric sync reading Google Pixel, Samsung Galaxy, and Wear OS wearable data without vendor-specific SDK bloat.
- **Apple Watch & Wear OS Companion Apps:** Standalone wrist check-in, real-time heart rate zone alerts, and tactile RPE logging immediately upon session completion.

---

## 3. Extended Wearable & Hardware Integrations
- **Direct Cloud API Connectors:**
  - **Coros Training Hub API:** Native webhook ingestion for high-precision marathon and trail GPS data.
  - **Suunto Cloud API & Movescount:** Multisport transition tracking.
  - **Wahoo Cloud API:** ELEMNT bike computers and TICKR heart rate straps.
  - **Strava API v3:** Social and segment data with automatic deduplication against Garmin/Wahoo files.
- **Continuous Glucose Monitors (CGM):** Integration with Abbott FreeStyle Libre and Dexcom G7 for intra-workout carbohydrate oxidation tracking and nutritional timing alerts.
- **Core Body Temperature Sensors:** GreenTEG CORE sensor ingestion for heat acclimation and hydration optimization.

---

## 4. Team, Squad & Federation Hierarchy
- **Multi-Tier Organizational Architecture:**
  - **National Sports Federations (Szövetségek):** Centralized administration, anti-doping log verification, squad oversight, and multi-team licensing.
  - **Clubs & Academies (Egyesületek):** Grouping athletes by age categories (U17, U19, Felnőtt, Masters) and sports disciplines.
  - **Squad Roles:** Head Coach, Assistant Coach, Strength & Conditioning Staff, Lead Sports Dietitian, Team Physician, and Sport Psychologist.
- **Aggregated Squad Cockpit:** Team-wide readiness matrix, squad wellness heatmap, and bulk injury surveillance for athletic directors.

---

## 5. Professional Reporting & Advanced Export Suite
- **Medical & Clinical PDF Export:** Formatted clinical dossier for orthopedic surgeons, cardiologists, and sports physicians containing 12-month ECG/HRV history, injury timelines, and medication logs.
- **Sports Science Data Exports:** High-frequency CSV export (second-by-second FIT trackpoints, R-R intervals, power-duration curves) compatible with GoldenCheetah, WKO5, and Python data science pipelines.
- **Automated Stakeholder Digests:** Scheduled weekly or monthly executive summaries delivered via email to athletes, coaches, and sports directors.

---

## 6. Live Telemetry & Field Coaching Mode
- **Real-Time Bluetooth & ANT+ Telemetry:** Coach iPad app receiving live telemetry from up to 20 athletes concurrently (heart rate, power, cadence) during track, velodrome, or pool sessions.
- **Live Video Analysis:** High-framerate video recording with side-by-side split screen and biomechanical drawing tools for swimming stroke and running gait analysis.
