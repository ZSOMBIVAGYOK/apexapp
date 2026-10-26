# Apex Firestore Data Model & Data Governance Guide

> **Core Principle:** The athlete owns all of their data. Coaches and specialists see **only** what the athlete has explicitly shared, per module, and the athlete can revoke access instantly.

---

## 1. Architectural Overview & Zero-Trust Tree Structure

Apex utilizes a multi-tenant, athlete-centric document architecture where each athlete possesses an isolated root document and subcollections under `athletes/{athleteId}` (where `athleteId = uid`). Access control is governed by independent relationship documents in `relationships/{athleteId}_{memberId}`.

```
firestore-root/
├── users/{uid}                                    # Global user identity, auth preferences, feature modes
├── athletes/{athleteId}                           # Athlete sports profile, thresholds, competitions
│   ├── days/{yyyy-MM-dd}                          # Daily recovery, sleep, HRV, readiness aggregates
│   ├── sessions/{sessionId}                       # Completed workouts with intervals & load
│   ├── plannedWorkouts/{workoutId}                # Prescribed sessions by athlete or coach
│   ├── nutritionDays/{date}                       # Daily macro targets, calories, hydration
│   │   └── entries/{entryId}                      # Meal logs, pre/post workout nutrition, fluids
│   ├── injuries/{injuryId}                        # [HEALTH] Diagnoses, anatomical sites, rehab plans
│   ├── measurements/{measurementId}              # [HEALTH] Body composition, VO2 max, lactate tests
│   ├── notes/{noteId}                             # [HEALTH] Confidential specialist & medical notes
│   └── devices/{deviceId}                         # Connected wearable hardware & sensor metadata
│
├── relationships/{athleteId}_{memberId}           # Explicit sharing grants & per-module permissions
│   └── log/{logId}                                # Immutable, timestamped audit log of permission changes
│
├── threads/{threadId}                             # In-app messaging channels between athlete & staff
│   └── messages/{messageId}                       # Chat messages & staff feedback
│
└── invites/{code}                                 # 6-8 character invitation codes with preset permissions
```

---

## 2. Standard Metadata on Every Record

Every data record within the `athletes/{athleteId}` hierarchy and `relationships` carries standard provenance and data quality metadata:

```typescript
export interface StandardRecordMetadata {
  source: 'manual' | 'garmin' | 'whoop' | 'file' | 'apple_health' | 'polar' | 'other';
  confidence: number; // Normalized confidence index between 0.0 and 1.0
  createdAt: string;  // ISO 8601 timestamp
  updatedAt: string;  // ISO 8601 timestamp
  updatedBy: string;  // UID of user who authored the change
}
```

- **Source Provenance:** Indicates whether biometric signals originated from validated wearable sensors (Garmin, WHOOP), manual self-reporting, or clinical laboratory files.
- **Confidence Rating:** Quantifies data fidelity. E.g., optical wrist heart rate during high-motion intervals might score `0.70`, while a chest strap ECG or laboratory lactate test scores `0.98`.

---

## 3. Collections & Document Specifications

### A. `users/{uid}`
High-level user account record created at authentication:
- `uid`: String (Firebase Auth UID)
- `email`: String | null
- `displayName`: String | null
- `photoURL`: String | null
- `locale`: `'hu' | 'en'` (Default: `'hu'`)
- `units`: `'metric' | 'imperial'`
- `timezone`: String (e.g. `"Europe/Budapest"`)
- `roles`: `('athlete' | 'coach' | 'specialist')[]` (Multi-role support)
- `specialties`: `SpecialistDiscipline[]`
- `dataMode`: `'device' | 'manual' | 'hybrid'`
- `supportMode`: `('solo' | 'coach' | 'specialist')[]`
- `onboardingCompleted`: Boolean
- `consent`: `{ healthData: { accepted: boolean, version: string, timestamp: string } }`
- `createdAt`: ISO 8601
- `updatedAt`: ISO 8601

### B. `athletes/{athleteId}` (where `athleteId = uid`)
The athlete's athletic profile and physiological thresholds:
- `athleteId`: String (UID)
- `sport`: String (Primary sport)
- `sports`: String[] (All practiced sports)
- `level`: `'hobby' | 'competitive_amateur' | 'national' | 'national_team' | 'olympic'`
- `birthDate`: String (`YYYY-MM-DD`)
- `sex`: `'male' | 'female' | 'other' | 'prefer_not_to_say'`
- `heightCm`: Number
- `weightKg`: Number
- `thresholds`:
  - `maxHR`: Number (Maximum heart rate in bpm)
  - `lthr`: Number (Lactate threshold heart rate in bpm)
  - `ftp`: Number (Functional Threshold Power in Watts)
  - `thresholdPace`: String (Threshold running pace, e.g. `"3:40 /km"`)
  - `css`: String (Critical Swim Speed, e.g. `"1:12 /100m"`)
- `goals`: String
- `competitions`: Array of `{ id, name, date, priority: 'A' | 'B' | 'C', location, targetTime, notes }`
- Standard metadata: `source`, `confidence`, `createdAt`, `updatedAt`, `updatedBy`

### C. `athletes/{id}/days/{yyyy-MM-dd}` (RECOVERY Module)
Daily physiological and wellness summary:
- `date`: String (`YYYY-MM-DD`)
- `athleteId`: String
- `sleep`:
  - `durationMinutes`: Number
  - `qualityScore`: Number (1-10)
  - `deepMinutes`: Number
  - `remMinutes`: Number
  - `awakeMinutes`: Number
- `hrv`:
  - `rmssd`: Number (ms)
  - `score`: Number (0-100)
  - `status`: `'low' | 'balanced' | 'high'`
- `restingHeartRate`: Number (bpm)
- `weightKg`: Number
- `subjective`:
  - `soreness`: Number (1-10)
  - `stress`: Number (1-10)
  - `energy`: Number (1-10)
  - `mood`: Number (1-10)
  - `sleepQuality`: Number (1-10)
- `readinessScore`: Number (0-100)
- `readinessStatus`: `'ready' | 'caution' | 'rest'`
- `sourceFlags`: `{ sleepSource, hrvSource, rhrSource }`
- `notes`: String
- Standard metadata: `source`, `confidence`, `createdAt`, `updatedAt`, `updatedBy`

### D. `athletes/{id}/sessions/{sessionId}` (TRAINING Module)
Completed training sessions:
- `sessionId`: String
- `athleteId`: String
- `date`: String (`YYYY-MM-DD`)
- `sport`: String
- `title`: String
- `startTime`: ISO 8601
- `durationMinutes`: Number
- `rpe`: Number (1-10)
- `targetIntensityRpe`: Number (1-10)
- `trainingLoad`: Number (Calculated sRPE / TRIMP load)
- `metrics`: `{ avgHeartRate, maxHeartRate, avgPower, normalizedPower, distanceMeters, elevationGainMeters, avgPace, calories }`
- `intervals`: Array of `{ index, type: 'work' | 'rest', durationSeconds, targetIntensity, actualValue }`
- `coachFeedback`: String
- `completed`: Boolean
- Standard metadata: `source`, `confidence`, `createdAt`, `updatedAt`, `updatedBy`

### E. `athletes/{id}/plannedWorkouts/{workoutId}` (TRAINING Module)
Workouts prescribed by the athlete or authorized coach:
- `workoutId`: String
- `athleteId`: String
- `date`: String (`YYYY-MM-DD`)
- `sport`: String
- `title`: String
- `plannedDurationMinutes`: Number
- `targetRpe`: Number
- `structuredSteps`: String
- `assignedBy`: String (UID of author)
- `status`: `'scheduled' | 'completed' | 'skipped'`
- Standard metadata: `source`, `confidence`, `createdAt`, `updatedAt`, `updatedBy`

### F. `athletes/{id}/nutritionDays/{date}` & `/entries/{id}` (NUTRITION Module)
Target and actual nutrient values:
- Daily: `targetCalories`, `targetProteinGrams`, `targetCarbsGrams`, `targetFatGrams`, `targetHydrationLiters`, `consumedCalories`, `consumedProteinGrams`, `consumedCarbsGrams`, `consumedFatGrams`, `consumedHydrationLiters`, `platePortions: { proteinPct, vegPct, carbsPct }`
- Subcollection `entries`: individual meal logs (`mealType`, `calories`, `proteinGrams`, `carbsGrams`, `fatGrams`, `waterMilliliters`, `loggedAt`)
- Standard metadata: `source`, `confidence`, `createdAt`, `updatedAt`, `updatedBy`

### G. `athletes/{id}/injuries/{injuryId}` (HEALTH Module - Protected)
Musculoskeletal tracking and therapy:
- `injuryId`: String
- `athleteId`: String
- `title`: String (e.g. "Right Patellar Tendinopathy")
- `anatomicalLocation`: String
- `side`: `'left' | 'right' | 'bilateral' | 'axial'`
- `severity`: `'mild' | 'moderate' | 'severe'`
- `onsetDate`: String
- `status`: `'active' | 'rehab' | 'resolved'`
- `diagnosis`: String
- `treatmentPlan`: String
- `restrictions`: String[] (e.g. `["No plyometrics", "Eccentric loading only"]`)
- Standard metadata: `source`, `confidence`, `createdAt`, `updatedAt`, `updatedBy`

### H. `athletes/{id}/measurements/{measurementId}` (HEALTH Module - Protected)
Physiological evaluations and clinical screens:
- `measurementId`: String
- `date`: String
- `type`: `'body_composition' | 'lactate_test' | 'vo2_max' | 'blood_panel' | 'mobility_screen'`
- `values`: Key-value pairs of biological markers (e.g. `bodyFatPct`, `skeletalMuscleKg`, `vo2Max`, `baselineLactate`)
- `practitionerNotes`: String
- Standard metadata: `source`, `confidence`, `createdAt`, `updatedAt`, `updatedBy`

### I. `athletes/{id}/notes/{noteId}` (HEALTH Module - Protected)
Confidential consultations by medical doctors, psychologists, or physiotherapists:
- `noteId`: String
- `category`: `'medical' | 'physio' | 'psychology' | 'general'`
- `authorId`: String
- `authorName`: String
- `authorRole`: UserRole
- `content`: String
- `confidentiality`: `'standard' | 'restricted'`
- Standard metadata: `source`, `confidence`, `createdAt`, `updatedAt`, `updatedBy`

---

## 4. The Granular Sharing Subsystem (`relationships/{relId}`)

Access to any athlete module is governed strictly through a `relationships/{relId}` document where `relId = ${athleteId}_${memberId}`.

```typescript
export interface SharingRelationship {
  relId: string;
  athleteId: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  memberRole: 'coach' | 'specialist';
  specialty: 'nutrition' | 'physio' | 'strength' | 'psychology' | 'medical' | 'other';
  status: 'pending' | 'active' | 'revoked';
  permissions: {
    training: 'none' | 'read' | 'write';
    recovery: 'none' | 'read' | 'write';
    nutrition: 'none' | 'read' | 'write';
    health: 'none' | 'read' | 'write';    // STRICT: default 'none' for coaches!
    devices: 'none' | 'read' | 'write';
    messages: 'none' | 'read' | 'write';
  };
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}
```

### Permission Presets

| Role / Discipline | Training | Recovery | Nutrition | Health (Protected) | Devices | Messages | Rationale |
|---|---|---|---|---|---|---|---|
| **Head Coach** | `write` | `read` | `read` | **`none`** | `read` | `write` | Coaches design training and view load/recovery, but medical/injury data is strictly isolated by default. |
| **Dietitian** | `read` | `read` | `write` | **`none`** | `none` | `write` | Formulates meal timing & macro targets, monitors training load for energy availability. |
| **Physiotherapist** | `read` | `read` | `none` | **`write`** | `none` | `write` | Documents injuries, functional tests, and rehabilitation exercises. |
| **Strength Coach** | `write` | `read` | `none` | **`none`** | `none` | `write` | Prescribes gym periodization and tracks mechanical volume. |
| **Sport Psychologist** | `none` | `read` | `none` | **`none`** | `none` | `write` | Reads subjective sleep, stress, and mood markers to support mental conditioning. |
| **Team Physician** | `read` | `read` | `read` | **`write`** | `none` | `write` | Comprehensive clinical oversight, bloodwork, and medical clearance. |

---

## 5. Security Rules & Enforced Invariants

1. **Athlete Absolute Ownership:**
   An athlete authenticated as `request.auth.uid == athleteId` has uninhibited read/write privileges over all documents and subcollections within `athletes/{athleteId}/**`.
2. **Deny by Default:**
   All root matchers default to `allow read, write: if false;`.
3. **Module Isolation:**
   Staff members cannot query or read subcollections for which their `relationships` document grants `'none'`.
4. **Health Protection:**
   The `injuries`, `measurements`, and `notes` subcollections require `permissions.health == 'read'` or `'write'`. Even an active Head Coach has zero visibility into health documents unless the athlete explicitly toggles this access.
5. **Self-Elevation Prevention:**
   Security rules strictly dictate:
   ```javascript
   allow update: if isAuthenticated() &&
     resource.data.athleteId == request.auth.uid &&
     request.resource.data.athleteId == request.auth.uid;
   ```
   A member **cannot** modify their own relationship permissions or status. Only the athlete who owns the account can alter permissions.
6. **Instant Revocation:**
   When an athlete sets `status == 'revoked'`, all module permissions are evaluated to `'none'` immediately in real-time Firestore evaluation.
7. **Audit Trail Isolation:**
   Subcollection `relationships/{relId}/log/{logId}` is visible **only** to the athlete (`athleteId == request.auth.uid`). Staff members cannot inspect the audit log.

---

## 6. Cloud Functions & Workflow Lifecycle

- **`createInvite`:** Athlete creates a 7-day cryptographic invite code (`APX-XXXXX`) embedded with preset permissions.
- **`acceptInvite`:** Coach or specialist accepts the code, activating the relationship and creating the initial audit log entry.
- **`updatePermissions`:** Athlete modifies permissions. The function validates athlete ownership and writes a detailed diff to the immutable `log` subcollection.
- **`revokeAccess`:** Athlete revokes relationship. Sets all permissions to `'none'` and writes an audit log entry.
- **`deleteUserData`:** GDPR Article 17 recursive purge of athlete profile, subcollections, relationships, and authentication account.
