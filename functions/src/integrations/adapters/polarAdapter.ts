/**
 * Polar Open AccessLink v3 API Server Adapter
 *
 * Implements Polar OAuth2, Exercise transactions, and Sleep/Nightly Recharge ingestion.
 */

import * as admin from "firebase-admin";
import {
  IDeviceAdapterServer,
  NormalizedActivity,
  NormalizedDaily,
  NormalizedSleep,
  ServerStoredToken
} from "../types";
import {
  normalizePolarDaily,
  normalizePolarExercise,
  normalizePolarSleep,
  PolarExercisePayload,
  PolarNightlyRechargePayload,
  PolarSleepPayload
} from "../normalizers/polarNormalizer";

export class PolarServerAdapter implements IDeviceAdapterServer {
  readonly provider = "polar" as const;
  readonly name = "Polar AccessLink";

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
      return `${redirectUri}?provider=polar&mock=true&state=${state}`;
    }

    const clientId = this.getClientId();
    if (!clientId) {
      throw new Error("POLAR_CLIENT_ID is not configured on the server.");
    }

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "accesslink.read_all",
      state
    });

    return `https://flow.polar.com/oauth2/authorization?${params.toString()}`;
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
        provider: "polar",
        accessToken: `polar_mock_token_${Date.now()}`,
        expiresAt: Date.now() + 30 * 86400 * 1000,
        providerUserId: `polar_user_${athleteId}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await this.db
        .collection("integrations_tokens")
        .doc(`${athleteId}_polar`)
        .set(mockToken);

      await this.db
        .collection("athletes")
        .doc(athleteId)
        .collection("devices")
        .doc("polar")
        .set(
          {
            provider: "polar",
            name: "Polar AccessLink",
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

    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch("https://polarremote.com/v2/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri
      }).toString()
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Polar token exchange failed (${res.status}): ${err}`);
    }

    const data = (await res.json()) as {
      access_token: string;
      token_type: string;
      expires_in: number;
      x_user_id?: number;
    };

    // TODO: Polar requires registering the user under your client:
    // Call: POST https://www.polaraccesslink.com/v3/users
    try {
      await fetch("https://www.polaraccesslink.com/v3/users", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${data.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ "member-id": athleteId })
      });
    } catch {
      // User may already be registered
    }

    const storedToken: ServerStoredToken = {
      athleteId,
      provider: "polar",
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
      providerUserId: data.x_user_id ? String(data.x_user_id) : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.db
      .collection("integrations_tokens")
      .doc(`${athleteId}_polar`)
      .set(storedToken);

    await this.db
      .collection("athletes")
      .doc(athleteId)
      .collection("devices")
      .doc("polar")
      .set(
        {
          provider: "polar",
          name: "Polar AccessLink",
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
    // Polar AccessLink tokens are long-lived unless revoked
    return token;
  }

  async handleWebhook(
    rawBody: string,
    _headers: Record<string, string | undefined>
  ): Promise<{
    processed: boolean;
    athleteId?: string;
    eventType?: string;
    recordsCount?: number;
    error?: string;
  }> {
    // Polar sends webhook ping with user_id and event (EXERCISE, SLEEP)
    let payload: { user_id?: number; event?: string };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return { processed: false, error: "Malformed Polar webhook payload." };
    }

    // TODO: In production, trigger Polar transaction pull pipeline:
    // 1. POST /v3/users/{userId}/exercise-transactions
    // 2. GET /v3/users/{userId}/exercise-transactions/{transactionId}
    // 3. Commit PUT /v3/users/{userId}/exercise-transactions/{transactionId}

    return {
      processed: true,
      eventType: payload.event || "exercise",
      recordsCount: 1
    };
  }

  async backfill(
    athleteId: string,
    token: ServerStoredToken,
    _days = 30
  ): Promise<{
    activities: NormalizedActivity[];
    sleep: NormalizedSleep[];
    daily: NormalizedDaily[];
  }> {
    const activities: NormalizedActivity[] = [];
    const sleep: NormalizedSleep[] = [];
    const daily: NormalizedDaily[] = [];

    if (this.mockMode && !this.isConfigured()) {
      const today = new Date().toISOString().split("T")[0]!;
      activities.push({
        id: `polar_mock_act_${Date.now()}`,
        userId: athleteId,
        provider: "polar",
        providerRecordId: "polar_ex_441",
        sport: "cycling",
        title: "Polar Országúti kerékpározás",
        startTime: `${today}T09:15:00.000Z`,
        durationSeconds: 4200,
        distanceMeters: 31500,
        avgHeartRate: 144,
        maxHeartRate: 168,
        calories: 780,
        trainingLoad: 85,
        sourceConfidence: 0.96,
        createdAt: new Date().toISOString()
      });

      sleep.push({
        id: `polar_mock_sleep_${today}`,
        userId: athleteId,
        provider: "polar",
        providerRecordId: `polar_sleep_${today}`,
        date: today,
        startTime: `${today}T22:45:00.000Z`,
        endTime: `${today}T06:45:00.000Z`,
        durationMinutes: 480,
        sleepScore: 84,
        stages: {
          deepMinutes: 80,
          remMinutes: 95,
          lightMinutes: 260,
          awakeMinutes: 45
        },
        sourceConfidence: 0.93,
        createdAt: new Date().toISOString()
      });

      return { activities, sleep, daily };
    }

    // Live Polar AccessLink pull:
    // 1. POST /v3/users/{userId}/exercise-transactions
    // 2. GET /v3/users/{userId}/exercise-transactions/{transactionId}
    // 3. PUT /v3/users/{userId}/exercise-transactions/{transactionId} (commit)
    if (token.providerUserId) {
      try {
        const transRes = await fetch(
          `https://www.polaraccesslink.com/v3/users/${token.providerUserId}/exercise-transactions`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token.accessToken}`,
              Accept: "application/json"
            }
          }
        );
        if (transRes.ok) {
          const trans = (await transRes.json()) as { "transaction-id": number };
          const transId = trans["transaction-id"];
          const listRes = await fetch(
            `https://www.polaraccesslink.com/v3/users/${token.providerUserId}/exercise-transactions/${transId}`,
            {
              headers: {
                Authorization: `Bearer ${token.accessToken}`,
                Accept: "application/json"
              }
            }
          );
          if (listRes.ok) {
            const listData = (await listRes.json()) as { exercises?: string[] };
            for (const url of listData.exercises || []) {
              const exRes = await fetch(url, {
                headers: {
                  Authorization: `Bearer ${token.accessToken}`,
                  Accept: "application/json"
                }
              });
              if (exRes.ok) {
                const exPayload = (await exRes.json()) as PolarExercisePayload;
                activities.push(normalizePolarExercise(athleteId, exPayload));
              }
            }
          }
          // Commit transaction to acknowledge receipt
          await fetch(
            `https://www.polaraccesslink.com/v3/users/${token.providerUserId}/exercise-transactions/${transId}`,
            {
              method: "PUT",
              headers: { Authorization: `Bearer ${token.accessToken}` }
            }
          );
        }
      } catch {
        // Non-fatal
      }

      try {
        const sleepRes = await fetch("https://www.polaraccesslink.com/v3/users/sleep", {
          headers: {
            Authorization: `Bearer ${token.accessToken}`,
            Accept: "application/json"
          }
        });
        if (sleepRes.ok) {
          const sleepData = (await sleepRes.json()) as { nights?: PolarSleepPayload[] };
          for (const s of sleepData.nights || []) {
            sleep.push(normalizePolarSleep(athleteId, s));
          }
        }
      } catch {
        // Non-fatal
      }

      try {
        const rechRes = await fetch("https://www.polaraccesslink.com/v3/users/nightly-recharge", {
          headers: {
            Authorization: `Bearer ${token.accessToken}`,
            Accept: "application/json"
          }
        });
        if (rechRes.ok) {
          const rechData = (await rechRes.json()) as { "recharge-status"?: PolarNightlyRechargePayload[] };
          for (const r of rechData["recharge-status"] || []) {
            daily.push(normalizePolarDaily(athleteId, r));
          }
        }
      } catch {
        // Non-fatal
      }
    }

    return { activities, sleep, daily };
  }


  async disconnect(athleteId: string): Promise<boolean> {
    await this.db.collection("integrations_tokens").doc(`${athleteId}_polar`).delete();

    await this.db
      .collection("athletes")
      .doc(athleteId)
      .collection("devices")
      .doc("polar")
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
