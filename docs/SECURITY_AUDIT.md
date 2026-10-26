# Apex Security Audit: Invitation & Sharing Permission Subsystem
**Date**: October 26, 2026  
**Auditor**: Antigravity Security & Architecture Agent  
**Scope**: `firestore.rules`, `functions/src/index.ts`, `src/shared/lib/sharing/*`, and client sharing components  
**Status**: Critical Vulnerabilities Identified & Remediated  

---

## 1. Executive Summary & Architecture Posture

The core principle of the Apex platform is that **the athlete is the sole owner of their biometric and performance data**. Coaches, dietitians, physiotherapists, and medical staff may only access specific modules (`training`, `recovery`, `nutrition`, `health`, `devices`, `messages`) if and only if the athlete has explicitly granted permissions. Furthermore, coaches must never see the `health` module (injuries, clinical measurements, medical notes) unless explicitly granted by the athlete.

During this security audit of the initial implementation, **multiple severe privilege escalation and unauthorized read/write vulnerabilities** were identified in `firestore.rules`, `functions/src/index.ts`, and client-side sharing components. The client-side library (`rulesEvaluator.ts`) was functioning as a UI simulation rather than an enforced server-side boundary, and client rules allowed direct Firestore mutations that bypassed the athlete's consent entirely.

---

## 2. Identified Vulnerabilities & Exploit Vectors

### Vulnerability 1: Critical Privilege Escalation via Direct Client Creation of Relationships
- **File**: `firestore.rules` (lines 120–124)
- **Vulnerable Rule**:
  ```javascript
  // Create: athlete can create, or member with matching ID on invite accept
  allow create: if isAuthenticated() && (
    request.resource.data.athleteId == request.auth.uid ||
    request.resource.data.memberId == request.auth.uid
  );
  ```
- **Exploit Vector**:
  Any authenticated user (such as an unauthorized coach or malicious actor with a valid Firebase Auth token) could issue a direct client `setDoc` or `addDoc` to `/relationships/{victimAthleteId}_{attackerUid}` with:
  ```json
  {
    "athleteId": "victimAthleteId",
    "memberId": "attackerUid",
    "status": "active",
    "permissions": {
      "training": "write",
      "recovery": "write",
      "nutrition": "write",
      "health": "write",
      "devices": "write",
      "messages": "write"
    }
  }
  ```
  Because `request.resource.data.memberId == request.auth.uid` evaluated to `true`, the write succeeded. Since subsequent subcollection rules (`athletes/{athleteId}/days/*`, `sessions/*`, `injuries/*`) rely on `hasActiveRel(athleteId, request.auth.uid)`, this rogue active relationship immediately granted the attacker complete read and write access to the victim athlete's biometric and medical data without the athlete ever generating an invite.
- **Severity**: **CRITICAL (CVSS 9.8)**
- **Remediation**:
  Clients must be **strictly prohibited from creating, updating, or deleting** `/relationships/*` documents directly (`allow write: if false;`). All relationship state transitions must execute solely inside authenticated Cloud Functions utilizing the Firebase Admin SDK.

---

### Vulnerability 2: Direct Client Tampering with Audit Logs
- **File**: `firestore.rules` (lines 139–144)
- **Vulnerable Rule**:
  ```javascript
  match /log/{logId} {
    allow create: if isAuthenticated() && (
      get(/databases/$(database)/documents/relationships/$(relId)).data.athleteId == request.auth.uid ||
      get(/databases/$(database)/documents/relationships/$(relId)).data.memberId == request.auth.uid
    );
  }
  ```
- **Exploit Vector**:
  Members or athletes could insert fraudulent audit log entries, falsify timestamps, or spam audit collections from the client.
- **Severity**: **MEDIUM (CVSS 5.3)**
- **Remediation**:
  Prohibit direct client creation of audit logs (`allow write: if false;`). Audit logs must be appended atomically by Cloud Functions during transaction commits.

---

### Vulnerability 3: Public Enumeration and Client Manipulation of Invites
- **File**: `firestore.rules` (lines 176–184)
- **Vulnerable Rule**:
  ```javascript
  match /invites/{code} {
    allow read: if isAuthenticated();
    allow create: if isAuthenticated() && request.resource.data.athleteId == request.auth.uid;
    allow update: if isAuthenticated() && (
      resource.data.athleteId == request.auth.uid ||
      (request.resource.data.status == 'accepted')
    );
  }
  ```
- **Exploit Vectors**:
  1. **Global Read / Sensitive Data Harvesting**: `allow read: if isAuthenticated();` enabled any logged-in user to query the `/invites` collection, retrieving pending invite codes, athlete names, email addresses, and granted permissions.
  2. **Client-side Update Race / Forgery**: A client could directly update `status: 'accepted'` without validating single-use guarantees or caller identity.
- **Severity**: **HIGH (CVSS 7.5)**
- **Remediation**:
  Block client writes to `/invites/*` completely (`allow write: if false;`). Invites are created and redeemed exclusively through backend Cloud Functions. Only the creating athlete may read their own invite documents (`allow read: if isAuthenticated() && resource.data.athleteId == request.auth.uid;`).

---

### Vulnerability 4: Inability for Staff Members to Resign / Leave (Voluntary Revocation Blocked)
- **Files**: `firestore.rules` (line 128) and `functions/src/index.ts` (line 391)
- **Vulnerable Code**:
  ```typescript
  if (relData?.athleteId !== athleteId) {
    throw new HttpsError("permission-denied", "Only the athlete can revoke sharing access.");
  }
  ```
- **Issue**:
  If a coach, dietitian, or physiotherapist ends their professional engagement with an athlete or leaves a sports club, they could not voluntarily revoke their own access.
- **Severity**: **MEDIUM (CVSS 4.3)**
- **Remediation**:
  Allow either the athlete **or** the member (`request.auth.uid === relData.athleteId || request.auth.uid === relData.memberId`) to call `revokeAccess`. The audit log records who initiated the revocation (`action: "revoked" | "member_left"`).

---

### Vulnerability 5: Missing Input Schema Validation and Rate Limiting on Backend Callables
- **File**: `functions/src/index.ts` (lines 124–436)
- **Issues**:
  1. Primitive manual property checks instead of strict, type-safe Zod schema validation.
  2. The `assertRateLimit` function was defined at the top of the file but never called in `createInvite`, `acceptInvite`, `updatePermissions`, or `revokeAccess`.
  3. App Check verification was not enforced on callable endpoints.
- **Severity**: **HIGH (CVSS 7.1)**
- **Remediation**:
  Enforce Zod schema validation on all callable requests, invoke `assertRateLimit(request.auth.uid, maxRequests, windowSeconds)`, and verify Firebase App Check in production environments.

---

### Vulnerability 6: Race Conditions in Invite Code Redemption (Replay Attacks)
- **File**: `functions/src/index.ts` (lines 213–290)
- **Issue**:
  `acceptInvite` read the invite document using `await inviteRef.get()`, followed by separate operations in `db.batch()`. Two concurrent requests using the same invite code could pass the check simultaneously, allowing multiple users to redeem a single-use code.
- **Severity**: **HIGH (CVSS 7.4)**
- **Remediation**:
  Execute invite code validation and redemption inside an atomic Firestore transaction (`db.runTransaction()`).

---

### Vulnerability 7: Client-side Mock Code Generation and Fallbacks
- **Files**: `src/features/coach/components/InviteAthleteModal.tsx` and `src/features/settings/pages/SharingSettingsPage.tsx`
- **Issue**:
  `InviteAthleteModal.tsx` used `setTimeout` to generate mock alphanumeric codes (`APX-XXXXX`) without persisting them to Firestore or calling `createInvite`. `SharingSettingsPage.tsx` fell back to generating random mock codes in memory if offline.
- **Severity**: **MEDIUM (CVSS 5.0)**
- **Remediation**:
  Refactor client components to invoke `createSharingInvite` and `acceptSharingInvite` via Cloud Functions. Remove mock code generators. Retain `rulesEvaluator.ts` strictly as an advisory UI helper for displaying lock indicators.

---

## 3. Remediation Matrix

| Component | Identified Flaw | Remediated State |
| :--- | :--- | :--- |
| `firestore.rules` (`relationships/*`) | Direct client create/update allowed | **Locked**: `allow write: if false;` |
| `firestore.rules` (`invites/*`) | Global read & direct client update | **Locked**: `allow write: if false;`, read restricted to creator |
| `firestore.rules` (`log/*`) | Direct client create allowed | **Locked**: `allow write: if false;`, append-only via Admin SDK |
| `functions` (`createInvite`) | No Zod validation, no rate limit | Zod-validated, rate-limited, single-use, 7-day expiration |
| `functions` (`acceptInvite`) | Non-atomic batch, potential replay | Atomic Firestore transaction, single-use strictly enforced |
| `functions` (`updatePermissions`) | Missing Zod schema, no rate limit | Athlete-only validation, rate-limited, comprehensive audit log |
| `functions` (`revokeAccess`) | Blocked staff from resigning | Athlete or member may revoke; immediate lockout |
| Client UI (`InviteAthleteModal`) | Mock client code generation | Wired directly to Cloud Function `createSharingInvite` |
| Client UI (`rulesEvaluator.ts`) | Relied on as security boundary | Documented and restricted to UI lock hint computation only |

---

## 4. Verification Strategy

1. **Security Rules AST & Evaluator Tests**: Comprehensive 40+ unit test suite verifying zero-trust denial by default, module access gates (`training`, `recovery`, `nutrition`, `health`, `devices`, `messages`), role isolation (coaches blocked from `health`), and unauthorized write rejection.
2. **Backend Function Unit & Integration Tests**: Testing Zod input validation, invite expiration, single-use replay rejection, athlete-only permission updates, staff resignation, and audit logging.
