# Apex — Device Integration & Biometric Ingestion Guide

This document is the authoritative guide for configuring, registering, and promoting device adapters in Apex from **Mock Mode** to **Live Production Connections**.

---

## 1. Architecture Overview & Core Principle

Apex follows a **strict provider-agnostic ingestion pipeline**:
1. Regardless of whether biometrics originate from a drag-and-drop file (`.fit`, `.tcx`, `.gpx`, `.csv`), a cloud OAuth webhook (Garmin, WHOOP, Polar, Oura), a multi-device aggregator (Terra / Junction), or a native bridge (HealthKit / Health Connect), all incoming payloads are mapped to standard Zod-validated normalized models:
   - `NormalizedActivity`
   - `NormalizedSleep`
   - `NormalizedDaily`
2. **Server-Side Token Security**: Client applications **never** receive third-party OAuth client secrets, refresh tokens, or bearer tokens. Authentication codes are exchanged server-side, encrypted, and stored in protected Firestore collections (`athleteIntegrations/{athleteId}/tokens/{provider}`) accessible only to Cloud Functions and Firebase Admin.
3. **Multi-Source Deduplication & Priority**: When multiple devices record the same workout or day, deduplication rules automatically merge data without data loss, while the athlete's custom metric priority hierarchy determines which device wins for daily readiness.

---

## 2. Garmin Connect Developer Program

### Developer Portal & Registration
1. **Portal**: [Garmin Developer Portal](https://developer.garmin.com/gc-developer-program/overview/)
2. **Program**: Apply for the **Garmin Connect Developer Program** and request access to:
   - **Garmin Health API** (Dailies, Epochs, Sleep, Body Composition)
   - **Garmin Activity API** (Workouts, FIT files, Laps)
3. **Credentials Issued**:
   - `GARMIN_CONSUMER_KEY` (OAuth 1.0a / OAuth 2.0 Client ID)
   - `GARMIN_CONSUMER_SECRET`

### OAuth 2.0 PKCE Flow
- **Authorization Endpoint**: `https://connect.garmin.com/oauthConfirm`
- **Token Endpoint**: `https://connectapi.garmin.com/oauth-service/oauth/access_token`
- **Required Scopes**: `activity:read`, `dailies:read`, `sleep:read`, `body:read`
- **Redirect URI**: `https://<YOUR-APP-DOMAIN>/devices/callback`

### Webhook Signatures & Push Ingestion
- **Webhook Endpoint**: `https://<REGION>-<PROJECT_ID>.cloudfunctions.net/garminWebhook`
- **Headers to verify**: `X-Garmin-Signature`
- **Verification Rule**: HMAC-SHA1 signature computed over the raw HTTP request body using your `GARMIN_CONSUMER_SECRET`.
- **Response Requirement**: Return HTTP `200 OK` within 2 seconds. Garmin employs an aggressive retry backoff if responses take longer.

### Backfill & Pagination
- **Backfill Endpoint**: `GET https://healthapi.garmin.com/wellness-api/rest/backfill/{summaryType}`
- **Range Limit**: Maximum 90 days per backfill request.
- **Payload Types**:
  - `dailies`: Steps, resting HR, average stress, active calories
  - `sleeps`: Duration, light/deep/rem duration, sleep score
  - `activities`: Summary metadata and download URLs for binary `.fit` files

---

## 3. WHOOP Developer API 4.0

### Developer Portal & Registration
1. **Portal**: [WHOOP Developer Portal](https://developer.whoop.com)
2. **Create App**: Register a new client application under "Developer Dashboard".
3. **Credentials**:
   - `WHOOP_CLIENT_ID`
   - `WHOOP_CLIENT_SECRET`

### OAuth 2.0 Flow
- **Authorization Endpoint**: `https://api.prod.whoop.com/oauth/oauth2/auth`
- **Token Endpoint**: `https://api.prod.whoop.com/oauth/oauth2/token`
- **Required Scopes**:
  - `read:recovery` (Recovery score, HRV RMSSD, resting HR, SpO2, skin temp)
  - `read:cycles` (Physiological day cycle, Day Strain 0–21, kilojoules)
  - `read:workout` (Strain per workout, average HR, max HR, sport type)
  - `read:sleep` (Sleep stages, sleep performance %, sleep debt)
  - `read:profile` (User profile info)
- **Token Expiry**: Access tokens expire in 1 hour; use the `refresh_token` to maintain persistent access.

### Webhook Subscriptions
- **Webhook Endpoint**: `https://<REGION>-<PROJECT_ID>.cloudfunctions.net/whoopWebhook`
- **Signature Header**: `X-WHOOP-Signature`
- **Events**:
  - `recovery.updated`
  - `workout.updated`
  - `sleep.updated`
- **Signature Verification**: HMAC-SHA256 of the raw body payload with your WHOOP Client Secret.

---

## 4. Polar AccessLink API v3

### Developer Portal & Registration
1. **Portal**: [Polar Open AccessLink](https://admin.polaraccesslink.com)
2. **Create Client**: Register your client ID and generate client secret.
3. **Credentials**:
   - `POLAR_CLIENT_ID`
   - `POLAR_CLIENT_SECRET`

### OAuth 2.0 Flow
- **Authorization Endpoint**: `https://flow.polar.com/oauth2/authorization`
- **Token Endpoint**: `https://polarremote.com/v2/oauth2/token`
- **Scopes**: `accesslink.read_all`
- **User Registration Step**: After OAuth, call `POST https://www.polaraccesslink.com/v3/users` to register the athlete under your client.

### Exercise Transaction Pipeline
Polar uses a transaction-based pull model:
1. Webhook ping received at `https://<REGION>-<PROJECT_ID>.cloudfunctions.net/polarWebhook` with event `EXERCISE`.
2. Cloud Function calls `POST /v3/users/{userId}/exercise-transactions` to create a transaction.
3. Fetch exercise summary list: `GET /v3/users/{userId}/exercise-transactions/{transactionId}`.
4. Download TCX / FIT samples: `GET /v3/users/{userId}/exercise-transactions/{transactionId}/exercises/{exerciseId}/tcx`.
5. Commit and close transaction: `PUT /v3/users/{userId}/exercise-transactions/{transactionId}`.

---

## 5. Oura Ring API v2

### Developer Portal & Registration
1. **Portal**: [Oura Cloud Developer Portal](https://cloud.ouraring.com/developer/docs/)
2. **Create Application**: Register OAuth application.
3. **Credentials**:
   - `OURA_CLIENT_ID`
   - `OURA_CLIENT_SECRET`

### OAuth 2.0 Flow
- **Authorization Endpoint**: `https://cloud.ouraring.com/oauth/authorize`
- **Token Endpoint**: `https://api.ouraring.com/oauth/token`
- **Scopes**: `daily heartrate workout tag session daily_readiness daily_sleep daily_activity`

### Webhook Subscriptions
- Subscribe to real-time events via `POST https://api.ouraring.com/v2/webhook/subscription`:
  - `event_type`: `daily_readiness`, `daily_sleep`, `workout`
  - `callback_url`: `https://<REGION>-<PROJECT_ID>.cloudfunctions.net/ouraWebhook`
  - `verification_token`: shared secret verified via `X-Oura-Signature`.

---

## 6. Aggregator Abstraction (Terra / Junction)

Apex includes a pre-built aggregator adapter (`AggregatorAdapter`) implementing `IDeviceAdapter`.
- **Default State**: Disabled by default (`enabled: false`).
- **Activation**: Set `AGGREGATOR_ENABLED=true` in environment variables or toggle via the Devices UI.
- **Use Case**: Allows connecting over 200 fitness apps and niche hardware (Coros, Suunto, Wahoo, Zwift, Concept2, Eight Sleep, Dexcom CGMs) via a single unified webhook gateway without individual vendor contracts.

---

## 7. Native Mobile Wrapper Readiness (HealthKit & Health Connect)

To ingest data directly from an iOS or Android device running a Capacitor or React Native container:
- **HTTP Route**: `POST /ingest/health` (Cloud Function `ingestHealthData`)
- **Authentication**:
  - Client sends Firebase Auth ID token in header: `Authorization: Bearer <ID_TOKEN>`
  - Or automated backend ingest key: `x-apex-ingest-key: <API_KEY>`
- **Payload Schema**:
  ```json
  {
    "athleteId": "uid_12345",
    "provider": "apple_health", // or "health_connect"
    "activities": [
      {
        "id": "healthkit_workout_99182",
        "sport": "running",
        "title": "Outdoor Run",
        "startTime": "2026-10-26T07:30:00Z",
        "durationSeconds": 2700,
        "distanceMeters": 6400,
        "avgHeartRate": 154,
        "calories": 420
      }
    ],
    "sleep": [
      {
        "date": "2026-10-26",
        "durationMinutes": 480,
        "efficiencyScore": 92,
        "stages": {
          "deepMinutes": 90,
          "remMinutes": 110,
          "lightMinutes": 240,
          "awakeMinutes": 40
        },
        "sleepScore": 88
      }
    ],
    "daily": [
      {
        "date": "2026-10-26",
        "restingHeartRateBpm": 44,
        "hrvRmssdMs": 86,
        "steps": 11400,
        "weightKg": 74.2
      }
    ]
  }
  ```
- **Pipeline Execution**: The endpoint automatically normalizes, computes Foster / TSS training load, applies the athlete's metric priority hierarchy, and writes directly into `athletes/{athleteId}/sessions` and `athletes/{athleteId}/days/{date}`.

---

## 8. File Import Engine (FIT, TCX, GPX, CSV)

Level 1 is **fully operational**:
1. Drag-and-drop or file selector uploads files directly in the browser or via Cloud Storage.
2. In-browser pure TypeScript parsers:
   - `parseFIT`: Binary Garmin FIT Protocol 2.0 parser (decodes session msg 18, laps msg 19, power, HR).
   - `parseTCX`: XML parser for Garmin Training Center Database.
   - `parseGPX`: GPX 1.1 with trackpoint distance (Haversine calculation) and extensions.
   - `parseCSV`: Tabular parser with flexible column header mapping and auto-delimiter detection.
3. **Deduplication Engine**:
   - Compares candidate workout start time ($\pm 5$ min), duration ($\pm 8\%$), and matching sport.
   - Flags duplicates clearly in the UI with the existing workout's title and start time.
   - Prevents double-counting in chronic and acute training load calculations.
