# Apex — Device Integration & Biometric Ingestion Guide

This document is the authoritative developer guide for configuring, registering, and maintaining wearable integrations in Apex. It covers the server-side ingestion pipeline, OAuth 2.0 flows, webhook signature verifications, multi-source deduplication, and deployment commands.

---

## 1. Architecture Overview & Core Principle

Apex follows a **strict provider-agnostic ingestion pipeline**:
1. Regardless of whether biometrics originate from a drag-and-drop file (`.fit`, `.tcx`, `.gpx`, `.csv`), a cloud OAuth webhook (WHOOP, Garmin, Polar, Oura), a native mobile bridge (`POST /ingestHealthData`), or an aggregator (Terra / Junction), all incoming payloads are mapped to standard Zod-validated normalized models:
   - `NormalizedActivity`
   - `NormalizedSleep`
   - `NormalizedDaily`
2. **Strict Server-Side Token Security**: Client applications **never** receive third-party OAuth client secrets, refresh tokens, or bearer tokens. Authentication codes are exchanged server-side, encrypted, and stored in protected Firestore collections (`integrations_tokens/{athleteId}_{provider}`) with **zero client read or write permissions** in `firestore.rules`.
3. **Multi-Source Deduplication & Priority**: When multiple devices record the same workout or day, deduplication rules automatically merge data without data loss (e.g., merging Garmin dual-frequency GPS and power with WHOOP heart rate and strain), while the athlete's custom metric priority hierarchy determines which device wins for daily readiness.

---

## 2. Firebase Cloud Secrets Configuration

All developer credentials and client secrets are managed via **Google Cloud Secret Manager** in Firebase Functions v2 (`defineSecret`). They must **never** be checked into version control or sent to the client browser.

### Secret Names & Keys

| Provider | Secret Name | Description |
|---|---|---|
| **WHOOP** | `WHOOP_CLIENT_ID` | OAuth 2.0 Client ID from WHOOP Developer Dashboard |
| **WHOOP** | `WHOOP_CLIENT_SECRET` | OAuth 2.0 Client Secret (used for token exchange & webhook HMAC-SHA256) |
| **Garmin** | `GARMIN_CONSUMER_KEY` | Garmin Connect Partner OAuth Client ID |
| **Garmin** | `GARMIN_CONSUMER_SECRET`| Garmin Partner Secret (used for HMAC-SHA1 webhook verification) |
| **Polar** | `POLAR_CLIENT_ID` | Polar Open AccessLink Client ID |
| **Polar** | `POLAR_CLIENT_SECRET` | Polar Open AccessLink Client Secret |
| **Oura** | `OURA_CLIENT_ID` | Oura Ring Cloud API v2 Client ID |
| **Oura** | `OURA_CLIENT_SECRET` | Oura Ring Client Secret (used for token exchange & HMAC-SHA256 signature) |

### CLI Setup Commands

Run the following commands in your terminal before deploying Cloud Functions:

```bash
# 1. WHOOP Secrets
firebase functions:secrets:set WHOOP_CLIENT_ID
firebase functions:secrets:set WHOOP_CLIENT_SECRET

# 2. Garmin Connect Secrets
firebase functions:secrets:set GARMIN_CONSUMER_KEY
firebase functions:secrets:set GARMIN_CONSUMER_SECRET

# 3. Polar AccessLink Secrets
firebase functions:secrets:set POLAR_CLIENT_ID
firebase functions:secrets:set POLAR_CLIENT_SECRET

# 4. Oura Ring Secrets
firebase functions:secrets:set OURA_CLIENT_ID
firebase functions:secrets:set OURA_CLIENT_SECRET
```

For local testing with the Firebase Emulator or development servers, you can also set these variables in `.env.local` or standard process environment variables.

---

## 3. Provider-Specific Registration & Configuration Guides

### 3.1 WHOOP Developer API 4.0 (Fully Built)

WHOOP 4.0 provides real-time physiological telemetry including recovery (HRV RMSSD, resting HR, SpO2, skin temperature), sleep stages, day cycle, and workout strain.

#### Step-by-Step Developer Registration
1. Navigate to the [WHOOP Developer Portal](https://developer.whoop.com) and sign in.
2. Under **Developer Dashboard**, click **Create Application**.
3. Name your app (e.g. `Apex Athlete Platform`) and provide description and app icon.
4. Set the **Redirect URIs**:
   - Production Web App: `https://<YOUR-DOMAIN>/devices`
   - Cloud Function Callback: `https://<REGION>-<PROJECT_ID>.cloudfunctions.net/deviceAuthCallback`
   - Local Development: `http://localhost:5173/devices`
5. Note your issued **Client ID** and **Client Secret**.
6. Set the secrets using `firebase functions:secrets:set WHOOP_CLIENT_ID` and `WHOOP_CLIENT_SECRET`.

#### OAuth 2.0 PKCE & Authorization
- **Authorization URL**: `https://api.prod.whoop.com/oauth/oauth2/auth`
- **Token URL**: `https://api.prod.whoop.com/oauth/oauth2/token`
- **Required Scopes**:
  - `read:recovery` — Recovery score, HRV RMSSD, resting HR, SpO2, skin temp
  - `read:cycles` — Physiological day cycle, Day Strain (0–21), kilojoules
  - `read:workout` — Workouts, strain per workout, average HR, max HR, sport type
  - `read:sleep` — Sleep stages, sleep performance %, sleep debt, respiratory rate
  - `read:profile` — Athlete profile details
  - `offline` — Mandatory for issuing refresh tokens
- **Token Refresh**: WHOOP access tokens expire after 1 hour (3600 seconds). The adapter automatically executes a token refresh when an access token is within 5 minutes of expiration.

#### Webhook Subscriptions & Signature Verification
- **Webhook Endpoint**: `https://<REGION>-<PROJECT_ID>.cloudfunctions.net/whoopWebhook`
- **Signature Header**: `X-WHOOP-Signature`
- **Verification Rule**: Compute HMAC-SHA256 over the raw HTTP request body using `WHOOP_CLIENT_SECRET` and Base64-encode. Use timing-safe comparison (`crypto.timingSafeEqual`) to prevent timing attacks.
- **Idempotency**: Every received event is recorded in the private Firestore collection `integrations_events/{eventId}` with a timestamp. Duplicate delivery retries are safely acknowledged with HTTP 200 without duplicate database writes.

---

### 3.2 Garmin Connect Developer Program (Health & Activity API)

Garmin provides dual-frequency GPS trackpoints, second-by-second power, running dynamics, and daily wellness aggregates.

#### Step-by-Step Developer Registration
1. Apply for the [Garmin Connect Developer Program](https://developer.garmin.com/gc-developer-program/overview/).
2. Submit your enterprise application for **Garmin Health API** (wellness, dailies, sleep) and **Garmin Activity API** (FIT activity files, power, laps).
3. Once approved, Garmin issues your `GARMIN_CONSUMER_KEY` and `GARMIN_CONSUMER_SECRET`.
4. Register the webhook URL in the Garmin Developer Management Console:
   - Webhook URL: `https://<REGION>-<PROJECT_ID>.cloudfunctions.net/garminWebhook`

#### OAuth & Webhook Verification
- **Authorization Endpoint**: `https://connect.garmin.com/oauthConfirm`
- **Token Endpoint**: `https://connectapi.garmin.com/oauth-service/oauth/access_token`
- **Required Scopes**: `activity:read`, `dailies:read`, `sleep:read`, `body:read`
- **Signature Header**: `X-Garmin-Signature`
- **Verification Rule**: HMAC-SHA1 over the raw request body with `GARMIN_CONSUMER_SECRET`.
- **Response SLA**: Return HTTP 200 within 2 seconds. Garmin retries aggressively if responses take longer.

---

### 3.3 Polar Open AccessLink v3 API

Polar provides sports watch exercise transactions, cardio load, sleep stages, and Nightly Recharge telemetry.

#### Step-by-Step Developer Registration
1. Navigate to the [Polar Open AccessLink Admin Portal](https://admin.polaraccesslink.com).
2. Register a new client application.
3. Set Redirect URI: `https://<YOUR-DOMAIN>/devices` (or Cloud Function redirect callback).
4. Save your `POLAR_CLIENT_ID` and `POLAR_CLIENT_SECRET`.

#### Transaction-Based Pull Pipeline
Polar utilizes an explicit transaction lifecycle:
1. Athlete completes authorization with scope `accesslink.read_all`.
2. Cloud Function registers the athlete via `POST https://www.polaraccesslink.com/v3/users`.
3. When a webhook notification is received at `/polarWebhook`, the server initiates an exercise transaction:
   - `POST /v3/users/{userId}/exercise-transactions`
   - `GET /v3/users/{userId}/exercise-transactions/{transactionId}`
   - Normalize each exercise using `normalizePolarExercise`
   - Commit transaction with `PUT /v3/users/{userId}/exercise-transactions/{transactionId}` to release the queue.
4. Sleep and Nightly Recharge data are pulled via `/v3/users/sleep` and `/v3/users/nightly-recharge`.

---

### 3.4 Oura Ring Cloud API v2

Oura Ring v2 tracks sleep architecture, readiness score, HRV balance, and temperature deviation.

#### Step-by-Step Developer Registration
1. Visit the [Oura Cloud Developer Portal](https://cloud.ouraring.com/developer/docs/).
2. Click **Create Application**.
3. Set Redirect URI to `https://<YOUR-DOMAIN>/devices`.
4. Note your `OURA_CLIENT_ID` and `OURA_CLIENT_SECRET`.

#### OAuth & Ingestion
- **Authorization Endpoint**: `https://cloud.ouraring.com/oauth/authorize`
- **Token Endpoint**: `https://api.ouraring.com/oauth/token`
- **Scopes**: `daily`, `personal`, `workout`, `heartrate`
- **Webhook Endpoint**: `https://<REGION>-<PROJECT_ID>.cloudfunctions.net/ouraWebhook`
- **Signature Header**: `X-Oura-Signature` (HMAC-SHA256 with client secret).
- **Backfill Endpoints**:
  - `GET /v2/usercollection/daily_sleep?start_date=...&end_date=...`
  - `GET /v2/usercollection/daily_readiness?start_date=...&end_date=...`
  - `GET /v2/usercollection/workout?start_date=...&end_date=...`

---

## 4. Multi-Source Deduplication & Priority Engine

When an athlete uses multiple devices (for example, Garmin for GPS bike rides and WHOOP for continuous 24/7 recovery), Apex executes the following automatic rules:

1. **Activity Duplicate Identification**:
   - Start times within $\pm 5$ minutes (`DUPLICATE_TIME_TOLERANCE_MS = 300,000`).
   - Duration difference within $\pm 8\%$ of the maximum duration (`DUPLICATE_DURATION_TOLERANCE_RATIO = 0.08`).
   - Sport match (or one is `"other"`).
2. **Sensor Merging**:
   - GPS, elevation, laps, and power metrics are preserved from the dedicated sport computer (Garmin / Polar / FIT file).
   - Strain and heart rate metrics are enriched from the continuous wearable (WHOOP).
   - The merged record retains a `mergedFrom` provenance array tracking all source record IDs.
   - Confidence is boosted (`+0.02`, up to `1.0`) when corroborated across multiple sensors.
3. **Daily Biometrics Priority**:
   - Sleep: `WHOOP -> Oura -> Garmin -> Apple Health -> Manual`
   - HRV: `WHOOP -> Oura -> Garmin -> Apple Health`
   - Resting HR: `Garmin -> WHOOP -> Oura -> Polar -> Manual`
   - The athlete can customize this hierarchy at any time on the Devices screen via the **Prioritások** modal.

---

## 5. Security & Zero-Trust Verification

1. **Firestore Client Deny Rules**:
   ```javascript
   match /integrations_tokens/{doc=**} {
     allow read, write: if false;
   }
   match /integrations_events/{doc=**} {
     allow read, write: if false;
   }
   match /integrations_states/{doc=**} {
     allow read, write: if false;
   }
   ```
2. **App Check & Rate Limiting**:
   - `getDeviceOAuthUrl`: 20 requests / minute per user.
   - `exchangeDeviceOAuthCode`: 10 requests / minute per user.
   - `syncDeviceNow`: 15 requests / minute per user.
   - App Check is enforced in production to ensure all requests originate from the verified web app.
3. **OAuth State Nonce Validation**:
   - Every authorization attempt generates a cryptographically random 24-byte state nonce.
   - Stored in `integrations_states` with a 15-minute TTL.
   - During code exchange, the state must match both the authenticated athlete ID and requested provider. The state document is immediately deleted to prevent replay attacks.

---

## 6. List of Verified Items and Unverified Items (TODO)

To comply with the requirement of **never guessing** unverified vendor specifications, the table below documents all verified items and explicitly lists all items requiring partner approval:

| Provider | Feature | Status | Notes & Production Action |
|---|---|---|---|
| **WHOOP** | OAuth 2.0 PKCE (`/oauth/oauth2/auth`, `/oauth/oauth2/token`) | **VERIFIED** | Official v4 specification implemented. |
| **WHOOP** | Webhook HMAC-SHA256 signature verification | **VERIFIED** | Verified with constant-time comparison. |
| **WHOOP** | 30-Day Historical Backfill (`/developer/v1/cycle`, `/recovery`, `/workout`, `/sleep`) | **VERIFIED** | Production endpoints verified. |
| **Garmin** | Webhook HMAC-SHA1 signature verification | **VERIFIED** | Tested with timing-safe SHA1 comparison. |
| **Garmin** | Partner API Backfill (`/wellness-api/rest/backfill/activities`, `dailies`, `sleeps`) | **TODO (Partner)** | Endpoints verified against Garmin Health API docs. Requires Garmin Partner Program approval to activate live traffic. Falls back to simulated mock in demo mode. |
| **Polar** | AccessLink OAuth 2.0 & Token Exchange | **VERIFIED** | Implemented using official Open AccessLink documentation. |
| **Polar** | Transaction Commit Flow (`/v3/users/{id}/exercise-transactions/{id}`) | **VERIFIED** | Implemented with commit step (`PUT`). |
| **Oura** | OAuth 2.0 & Token Exchange (`https://api.ouraring.com/oauth/token`) | **VERIFIED** | Implemented using Oura Ring v2 specifications. |
| **Oura** | Historical Backfill (`/v2/usercollection/daily_sleep`, `daily_readiness`, `workout`) | **VERIFIED** | Implemented with pagination and date range query parameters. |
| **Oura** | Webhook Event Subscription | **TODO (Partner)** | Webhook signature verification verified via HMAC-SHA256. Webhook registration endpoint (`/v2/webhook/subscription`) requires verified Oura production app ID. |
