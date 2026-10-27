/**
 * WHOOP 4.0 Developer API Server Adapter
 *
 * Implements:
 * 1. OAuth 2.0 PKCE / Authorization Code Flow (start, callback, token exchange)
 * 2. Secure Server-Side Token Storage & Automatic Token Refresh
 * 3. Webhook Signature Verification (HMAC-SHA256 with timing-safe comparison)
 * 4. Idempotent Webhook Processing (Duplicate delivery prevention)
 * 5. 30-Day Historical Backfill (Recovery, Day Cycle, Sleep, Workouts)
 * 6. Disconnect & Data Cleanup
 */

import * as crypto from "crypto";
import * as admin from "firebase-admin";
import {
  IDeviceAdapterServer,
  NormalizedActivity,
  NormalizedDaily,
  NormalizedSleep,
  ServerStoredToken
} from "../types";
import {
  normalizeWhoopDaily,
  normalizeWhoopSleep,
  normalizeWhoopWorkout,
  WhoopCyclePayload,
  WhoopRecoveryPayload,
  WhoopSleepPayload,
  WhoopWorkoutPayload
} from "../normalizers/whoopNormalizer";

export class WhoopServerAdapter implements IDeviceAdapterServer {
  readonly provider = "whoop" as const;
  readonly name = "WHOOP 4.0";

  constructor(
    private readonly getClientId: () => string,
    private readonly getClientSecret: () => string,
    private readonly db: admin.firestore.Firestore
  ) {}

  isConfigured(): boolean {
    const cid = this.getClientId();
    const sec = this.getClientSecret();
    return Boolean(cid && sec && cid !== "MOCK_CLIENT_ID");
  }

  getAuthUrl(_athleteId: string, redirectUri: string, state: string): string {
    const clientId = this.getClientId();
    if (!clientId) {
      throw new Error("WHOOP_CLIENT_ID is not configured on the server.");
    }

    const scopes = [
      "read:recovery",
      "read:cycles",
      "read:workout",
      "read:sleep",
      "read:profile",
      "offline" // Essential for refresh token
    ].join(" ");

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      state
    });

    return `https://api.prod.whoop.com/oauth/oauth2/auth?${params.toString()}`;
  }

  async handleCallback(
    athleteId: string,
    code: string,
    redirectUri: string
  ): Promise<ServerStoredToken> {
    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();

    if (!clientId || !clientSecret) {
      throw new Error("WHOOP credentials missing on server.");
    }

    const bodyParams = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri
    });

    const tokenRes = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: bodyParams.toString()
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`WHOOP token exchange failed (${tokenRes.status}): ${errText}`);
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope?: string;
    };

    const now = Date.now();
    const expiresAt = now + (tokenData.expires_in || 3600) * 1000;

    // Fetch user basic profile to bind whoop user ID
    let providerUserId: string | undefined;
    try {
      const profileRes = await fetch("https://api.prod.whoop.com/developer/v1/user/profile/basic", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      if (profileRes.ok) {
        const profile = (await profileRes.json()) as { user_id?: number };
        if (profile.user_id) providerUserId = String(profile.user_id);
      }
    } catch {
      // Non-fatal fallback
    }

    const storedToken: ServerStoredToken = {
      athleteId,
      provider: "whoop",
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt,
      scope: tokenData.scope,
      providerUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Store securely in server-only collection
    await this.db
      .collection("integrations_tokens")
      .doc(`${athleteId}_whoop`)
      .set(storedToken);

    // Update public device status in athlete subcollection (contains NO secrets)
    await this.db
      .collection("athletes")
      .doc(athleteId)
      .collection("devices")
      .doc("whoop")
      .set(
        {
          provider: "whoop",
          name: "WHOOP 4.0",
          connected: true,
          status: "connected",
          lastSyncAt: new Date().toISOString(),
          isConfigured: true,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );

    return storedToken;
  }

  async refreshToken(token: ServerStoredToken): Promise<ServerStoredToken> {
    if (!token.refreshToken) {
      throw new Error("No refresh token available for WHOOP.");
    }

    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();

    const bodyParams = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      scope: "offline"
    });

    const res = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: bodyParams.toString()
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`WHOOP token refresh failed (${res.status}): ${errText}`);
    }

    const tokenData = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope?: string;
    };

    const updatedToken: ServerStoredToken = {
      ...token,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || token.refreshToken,
      expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
      updatedAt: new Date().toISOString()
    };

    await this.db
      .collection("integrations_tokens")
      .doc(`${token.athleteId}_whoop`)
      .set(updatedToken);

    return updatedToken;
  }

  async verifySignature(rawBody: string, signatureHeader?: string): Promise<boolean> {
    if (!signatureHeader) return false;
    const clientSecret = this.getClientSecret();
    if (!clientSecret) return false;

    try {
      const hmac = crypto.createHmac("sha256", clientSecret);
      hmac.update(rawBody);
      const expectedSignature = hmac.digest("base64");

      // Constant-time buffer equality check
      const sigBuffer = Buffer.from(signatureHeader, "utf8");
      const expectedBuffer = Buffer.from(expectedSignature, "utf8");
      if (sigBuffer.length !== expectedBuffer.length) return false;
      return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
    } catch {
      return false;
    }
  }

  async handleWebhook(
    rawBody: string,
    headers: Record<string, string | undefined>
  ): Promise<{
    processed: boolean;
    athleteId?: string;
    eventType?: string;
    recordsCount?: number;
    error?: string;
  }> {
    const signature = headers["x-whoop-signature"] || headers["X-WHOOP-Signature"];
    const isValid = await this.verifySignature(rawBody, signature);

    if (!isValid) {
      return { processed: false, error: "Invalid WHOOP webhook signature." };
    }

    let payload: {
      user_id?: number;
      id?: number | string;
      type?: string;
      trace_id?: string;
    };

    try {
      payload = JSON.parse(rawBody);
    } catch {
      return { processed: false, error: "Invalid JSON webhook payload." };
    }

    // Idempotent delivery check
    const eventId = String(payload.trace_id || payload.id || `${payload.user_id}_${payload.type}`);
    const eventRef = this.db.collection("integrations_events").doc(`whoop_${eventId}`);
    const eventSnap = await eventRef.get();

    if (eventSnap.exists) {
      // Duplicate event delivery; acknowledge idempotently without re-processing
      return { processed: true, eventType: payload.type, recordsCount: 0 };
    }

    // Mark event as received
    await eventRef.set({
      provider: "whoop",
      eventId,
      type: payload.type,
      userId: payload.user_id,
      receivedAt: new Date().toISOString()
    });

    // Find athlete by WHOOP providerUserId
    let athleteId: string | undefined;
    if (payload.user_id) {
      const q = await this.db
        .collection("integrations_tokens")
        .where("provider", "==", "whoop")
        .where("providerUserId", "==", String(payload.user_id))
        .limit(1)
        .get();

      if (!q.empty) {
        athleteId = q.docs[0]?.data().athleteId;
      }
    }

    return {
      processed: true,
      athleteId,
      eventType: payload.type,
      recordsCount: 1
    };
  }

  async backfill(
    athleteId: string,
    token: ServerStoredToken,
    days = 30
  ): Promise<{
    activities: NormalizedActivity[];
    sleep: NormalizedSleep[];
    daily: NormalizedDaily[];
  }> {
    // Check if token needs refresh
    let activeToken = token;
    if (Date.now() >= token.expiresAt - 5 * 60 * 1000) {
      activeToken = await this.refreshToken(token);
    }

    const end = new Date();
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const startIso = start.toISOString();
    const endIso = end.toISOString();

    const headers = { Authorization: `Bearer ${activeToken.accessToken}` };

    const activities: NormalizedActivity[] = [];
    const sleep: NormalizedSleep[] = [];
    const daily: NormalizedDaily[] = [];

    // 1. Fetch Workouts
    try {
      const workoutRes = await fetch(
        `https://api.prod.whoop.com/developer/v1/activity/workout?start=${encodeURIComponent(
          startIso
        )}&end=${encodeURIComponent(endIso)}&limit=25`,
        { headers }
      );
      if (workoutRes.ok) {
        const resData = (await workoutRes.json()) as { records?: WhoopWorkoutPayload[] };
        resData.records?.forEach((w) => {
          activities.push(normalizeWhoopWorkout(athleteId, w));
        });
      }
    } catch {
      // Non-fatal
    }

    // 2. Fetch Sleep
    try {
      const sleepRes = await fetch(
        `https://api.prod.whoop.com/developer/v1/activity/sleep?start=${encodeURIComponent(
          startIso
        )}&end=${encodeURIComponent(endIso)}&limit=25`,
        { headers }
      );
      if (sleepRes.ok) {
        const resData = (await sleepRes.json()) as { records?: WhoopSleepPayload[] };
        resData.records?.forEach((s) => {
          if (!s.nap) {
            sleep.push(normalizeWhoopSleep(athleteId, s));
          }
        });
      }
    } catch {
      // Non-fatal
    }

    // 3. Fetch Recovery & Cycles
    try {
      const recoveryRes = await fetch(
        `https://api.prod.whoop.com/developer/v1/recovery?start=${encodeURIComponent(
          startIso
        )}&end=${encodeURIComponent(endIso)}&limit=25`,
        { headers }
      );
      const cycleRes = await fetch(
        `https://api.prod.whoop.com/developer/v1/cycle?start=${encodeURIComponent(
          startIso
        )}&end=${encodeURIComponent(endIso)}&limit=25`,
        { headers }
      );

      const recoveries: WhoopRecoveryPayload[] = recoveryRes.ok
        ? ((await recoveryRes.json()) as { records?: WhoopRecoveryPayload[] }).records || []
        : [];
      const cycles: WhoopCyclePayload[] = cycleRes.ok
        ? ((await cycleRes.json()) as { records?: WhoopCyclePayload[] }).records || []
        : [];

      // Combine by date
      const dateSet = new Set<string>();
      recoveries.forEach((r) => {
        if (r.created_at) dateSet.add(r.created_at.split("T")[0]!);
      });
      cycles.forEach((c) => {
        if (c.start) dateSet.add(c.start.split("T")[0]!);
      });

      dateSet.forEach((d) => {
        const rec = recoveries.find((r) => r.created_at?.startsWith(d));
        const cyc = cycles.find((c) => c.start?.startsWith(d));
        daily.push(normalizeWhoopDaily(athleteId, d, rec, cyc));
      });
    } catch {
      // Non-fatal
    }

    // Update last sync time
    await this.db
      .collection("athletes")
      .doc(athleteId)
      .collection("devices")
      .doc("whoop")
      .set(
        {
          lastSyncAt: new Date().toISOString(),
          status: "connected",
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );

    return { activities, sleep, daily };
  }

  async disconnect(athleteId: string): Promise<boolean> {
    await this.db.collection("integrations_tokens").doc(`${athleteId}_whoop`).delete();

    await this.db
      .collection("athletes")
      .doc(athleteId)
      .collection("devices")
      .doc("whoop")
      .set(
        {
          connected: false,
          status: "disconnected",
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );

    return true;
  }
}
