/**
 * Oura Ring Cloud API v2 Server Adapter
 *
 * Implements:
 * 1. OAuth 2.0 Authorization Code flow (start, callback, refresh)
 * 2. Webhook event ingestion with HMAC-SHA256 signature verification
 * 3. 30-Day historical backfill (daily_sleep, daily_readiness, workout)
 * 4. Disconnect & token revocation
 * 5. Mock mode support for development/demo testing
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
  normalizeOuraDaily,
  normalizeOuraSleep,
  normalizeOuraWorkout,
  OuraDailyReadinessPayload,
  OuraDailySleepPayload,
  OuraWorkoutPayload
} from "../normalizers/ouraNormalizer";

export class OuraServerAdapter implements IDeviceAdapterServer {
  readonly provider = "oura" as const;
  readonly name = "Oura Ring";

  constructor(
    private readonly getClientId: () => string,
    private readonly getClientSecret: () => string,
    private readonly db: admin.firestore.Firestore,
    public readonly mockMode: boolean = false
  ) {}

  isConfigured(): boolean {
    const id = this.getClientId();
    const secret = this.getClientSecret();
    return Boolean(id && secret && id !== "MOCK_KEY");
  }

  getAuthUrl(_athleteId: string, redirectUri: string, state: string): string {
    if (this.mockMode && !this.isConfigured()) {
      return `${redirectUri}?provider=oura&mock=true&state=${state}`;
    }

    const clientId = this.getClientId();
    if (!clientId) {
      throw new Error("OURA_CLIENT_ID is not configured on the server.");
    }

    // Official Oura API v2 scopes: daily, email, personal, workout, heartrate
    const scopes = ["daily", "personal", "workout", "heartrate"].join(" ");

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      state
    });

    return `https://cloud.ouraring.com/oauth/authorize?${params.toString()}`;
  }

  async handleCallback(
    athleteId: string,
    code: string,
    redirectUri: string
  ): Promise<ServerStoredToken> {
    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();

    if (this.mockMode && (!clientId || !clientSecret)) {
      const mockToken: ServerStoredToken = {
        athleteId,
        provider: "oura",
        accessToken: `oura_mock_token_${Date.now()}`,
        refreshToken: `oura_mock_refresh_${Date.now()}`,
        expiresAt: Date.now() + 30 * 86400 * 1000,
        providerUserId: `oura_user_${athleteId}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await this.db
        .collection("integrations_tokens")
        .doc(`${athleteId}_oura`)
        .set(mockToken);

      await this.db
        .collection("athletes")
        .doc(athleteId)
        .collection("devices")
        .doc("oura")
        .set(
          {
            provider: "oura",
            name: "Oura Ring",
            connected: true,
            status: "connected",
            lastSyncAt: new Date().toISOString(),
            isConfigured: false,
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        );

      return mockToken;
    }

    if (!clientId || !clientSecret) {
      throw new Error("Oura Ring credentials missing on server.");
    }

    const bodyParams = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri
    });

    const tokenRes = await fetch("https://api.ouraring.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: bodyParams.toString()
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`Oura token exchange failed (${tokenRes.status}): ${errText}`);
    }

    const data = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      token_type: string;
      user_id?: string;
    };

    const tokenDoc: ServerStoredToken = {
      athleteId,
      provider: "oura",
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      providerUserId: data.user_id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.db
      .collection("integrations_tokens")
      .doc(`${athleteId}_oura`)
      .set(tokenDoc);

    await this.db
      .collection("athletes")
      .doc(athleteId)
      .collection("devices")
      .doc("oura")
      .set(
        {
          provider: "oura",
          name: "Oura Ring",
          connected: true,
          status: "connected",
          lastSyncAt: new Date().toISOString(),
          isConfigured: true,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );

    return tokenDoc;
  }

  async refreshToken(token: ServerStoredToken): Promise<ServerStoredToken> {
    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();

    if (!token.refreshToken) {
      throw new Error("No refresh token available for Oura account.");
    }

    if (!clientId || !clientSecret) {
      if (this.mockMode) return token;
      throw new Error("Oura credentials missing for token refresh.");
    }

    const bodyParams = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
      client_id: clientId,
      client_secret: clientSecret
    });

    const res = await fetch("https://api.ouraring.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: bodyParams.toString()
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to refresh Oura token: ${errText}`);
    }

    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    const updated: ServerStoredToken = {
      ...token,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || token.refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
      updatedAt: new Date().toISOString()
    };

    await this.db
      .collection("integrations_tokens")
      .doc(`${token.athleteId}_oura`)
      .set(updated, { merge: true });

    return updated;
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
    const secret = this.getClientSecret();
    const signature = headers["x-oura-signature"];

    // Signature verification (HMAC-SHA256)
    if (secret && signature) {
      const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
      const sigBuf = Buffer.from(signature);
      const expBuf = Buffer.from(expected);
      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        return { processed: false, error: "Invalid Oura webhook signature" };
      }
    }

    // TODO: Verify Oura API v2 webhook subscription event types (e.g., "create", "update" on daily_sleep, workout).
    let payload: {
      event_type?: string;
      user_id?: string;
      data_type?: string;
      event_time?: string;
    };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return { processed: false, error: "Invalid JSON webhook payload" };
    }

    const eventId = `oura_${payload.user_id || "event"}_${payload.event_time || Date.now()}`;
    const eventRef = this.db.collection("integrations_events").doc(eventId);
    const existing = await eventRef.get();
    if (existing.exists) {
      return { processed: true, eventType: payload.data_type, recordsCount: 0 };
    }

    await eventRef.set({
      provider: "oura",
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      payload
    });

    return {
      processed: true,
      eventType: payload.data_type || payload.event_type || "webhook_ping",
      recordsCount: 1
    };
  }

  async backfill(
    athleteId: string,
    token: ServerStoredToken,
    days: number = 30
  ): Promise<{
    activities: NormalizedActivity[];
    sleep: NormalizedSleep[];
    daily: NormalizedDaily[];
  }> {
    if (this.mockMode && !this.isConfigured()) {
      return this.generateMockBackfill(athleteId, days);
    }

    let activeToken = token;
    if (Date.now() >= activeToken.expiresAt - 5 * 60 * 1000) {
      activeToken = await this.refreshToken(activeToken);
    }

    const now = new Date();
    const startDateObj = new Date(now.getTime() - days * 86400 * 1000);
    const startDate = startDateObj.toISOString().slice(0, 10);
    const endDate = now.toISOString().slice(0, 10);

    const headers = { Authorization: `Bearer ${activeToken.accessToken}` };

    // Fetch Sleep
    const sleepRes = await fetch(
      `https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${startDate}&end_date=${endDate}`,
      { headers }
    );
    const sleepItems: OuraDailySleepPayload[] = sleepRes.ok
      ? ((await sleepRes.json()) as { data: OuraDailySleepPayload[] }).data || []
      : [];

    // Fetch Readiness / Daily
    const readRes = await fetch(
      `https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${startDate}&end_date=${endDate}`,
      { headers }
    );
    const readItems: OuraDailyReadinessPayload[] = readRes.ok
      ? ((await readRes.json()) as { data: OuraDailyReadinessPayload[] }).data || []
      : [];

    // Fetch Workouts
    const workRes = await fetch(
      `https://api.ouraring.com/v2/usercollection/workout?start_date=${startDate}&end_date=${endDate}`,
      { headers }
    );
    const workItems: OuraWorkoutPayload[] = workRes.ok
      ? ((await workRes.json()) as { data: OuraWorkoutPayload[] }).data || []
      : [];

    const sleepMap = new Map<string, OuraDailySleepPayload>();
    const normalizedSleep: NormalizedSleep[] = [];
    for (const item of sleepItems) {
      sleepMap.set(item.day, item);
      normalizedSleep.push(normalizeOuraSleep(athleteId, item));
    }

    const normalizedDaily: NormalizedDaily[] = [];
    for (const item of readItems) {
      const matchedSleep = sleepMap.get(item.day) || null;
      normalizedDaily.push(normalizeOuraDaily(athleteId, item, matchedSleep));
    }

    const normalizedActivities: NormalizedActivity[] = [];
    for (const item of workItems) {
      normalizedActivities.push(normalizeOuraWorkout(athleteId, item));
    }

    return {
      activities: normalizedActivities,
      sleep: normalizedSleep,
      daily: normalizedDaily
    };
  }

  async disconnect(athleteId: string): Promise<boolean> {
    await this.db
      .collection("integrations_tokens")
      .doc(`${athleteId}_oura`)
      .delete();

    await this.db
      .collection("athletes")
      .doc(athleteId)
      .collection("devices")
      .doc("oura")
      .set(
        {
          provider: "oura",
          name: "Oura Ring",
          connected: false,
          status: "disconnected",
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );

    return true;
  }

  private generateMockBackfill(
    athleteId: string,
    days: number
  ): {
    activities: NormalizedActivity[];
    sleep: NormalizedSleep[];
    daily: NormalizedDaily[];
  } {
    const activities: NormalizedActivity[] = [];
    const sleep: NormalizedSleep[] = [];
    const daily: NormalizedDaily[] = [];

    const now = Date.now();
    for (let i = 0; i < Math.min(days, 14); i++) {
      const date = new Date(now - i * 86400 * 1000).toISOString().slice(0, 10);
      const sleepPayload: OuraDailySleepPayload = {
        id: `mock_sleep_${i}`,
        day: date,
        score: 75 + (i % 15),
        bedtime_start: `${date}T23:15:00.000Z`,
        bedtime_end: `${date}T07:10:00.000Z`,
        total_sleep_duration: 7.2 * 3600,
        deep_sleep_duration: 1.5 * 3600,
        rem_sleep_duration: 1.8 * 3600,
        light_sleep_duration: 3.5 * 3600,
        awake_time: 0.4 * 3600,
        efficiency: 91,
        average_hrv: 48 + (i % 20),
        lowest_heart_rate: 47 + (i % 6)
      };
      sleep.push(normalizeOuraSleep(athleteId, sleepPayload));

      const readinessPayload: OuraDailyReadinessPayload = {
        id: `mock_readiness_${i}`,
        day: date,
        score: 78 + (i % 12),
        temperature_deviation: ((i % 5) - 2) * 0.1,
        resting_heart_rate: 49 + (i % 4)
      };
      daily.push(normalizeOuraDaily(athleteId, readinessPayload, sleepPayload));

      if (i % 3 === 0) {
        const workoutPayload: OuraWorkoutPayload = {
          id: `mock_workout_${i}`,
          activity: "walking",
          start_datetime: `${date}T16:00:00.000Z`,
          end_datetime: `${date}T16:45:00.000Z`,
          intensity: "easy",
          distance: 4200,
          calories: 220,
          average_heart_rate: 105,
          max_heart_rate: 122
        };
        activities.push(normalizeOuraWorkout(athleteId, workoutPayload));
      }
    }

    return { activities, sleep, daily };
  }
}
