/**
 * Aggregator Adapter (Terra / Junction API)
 * Implements IDeviceAdapter abstraction for third-party device aggregators.
 * Disabled by default. Enabled via AGGREGATOR_ENABLED environment variable or runtime config.
 */

import {
  IDeviceAdapter,
  NormalizedActivity,
  NormalizedDaily,
  NormalizedSleep
} from "@shared/types/devices";

export interface AggregatorConfig {
  enabled: boolean;
  service: "terra" | "junction";
  apiKey?: string;
  devId?: string;
}

export class AggregatorAdapter implements IDeviceAdapter {
  readonly provider = "aggregator" as const;
  readonly name = "Aggregator (Terra / Junction)";
  readonly isMock: boolean;
  private isEnabled: boolean;
  private config: AggregatorConfig;

  constructor(mockMode = true, config?: Partial<AggregatorConfig>) {
    this.isMock = mockMode;
    this.config = {
      enabled: config?.enabled ?? (process.env.AGGREGATOR_ENABLED === "true"),
      service: config?.service ?? "terra",
      apiKey: config?.apiKey || process.env.AGGREGATOR_API_KEY,
      devId: config?.devId || process.env.AGGREGATOR_DEV_ID
    };
    this.isEnabled = this.config.enabled;
  }

  get enabled(): boolean {
    return this.isEnabled;
  }

  enable(): void {
    this.isEnabled = true;
  }

  disable(): void {
    this.isEnabled = false;
  }

  async connect(
    userId: string,
    redirectUri: string,
    _options?: Record<string, unknown>
  ): Promise<{ authUrl?: string; connected: boolean; state?: string }> {
    if (!this.isEnabled) {
      return {
        connected: false,
        state: "aggregator_disabled"
      };
    }

    if (this.isMock) {
      return {
        connected: true,
        state: `aggregator_mock_connected_${userId}`
      };
    }

    const state = `aggregator_${this.config.service}_${userId}_${Date.now()}`;
    const authUrl = `https://api.tryterra.co/v2/auth/generateWidgetSession?reference_id=${userId}&redirect_url=${encodeURIComponent(
      redirectUri
    )}`;

    return { authUrl, connected: false, state };
  }

  async handleWebhook(
    payload: unknown,
    headers?: Record<string, string>
  ): Promise<{ processed: boolean; recordsCount: number; errors?: string[] }> {
    if (!this.isEnabled) {
      return {
        processed: false,
        recordsCount: 0,
        errors: ["Aggregator adapter is currently disabled."]
      };
    }

    if (this.isMock) {
      return { processed: true, recordsCount: 1 };
    }

    // Aggregator signature check (e.g. terra-signature header)
    const sig = headers?.["terra-signature"] || headers?.["junction-signature"];
    if (!sig && process.env.NODE_ENV === "production") {
      return {
        processed: false,
        recordsCount: 0,
        errors: ["Missing aggregator webhook signature."]
      };
    }

    const raw = payload as Record<string, unknown> | null;
    const type = raw?.type; // e.g. "activity", "sleep", "daily"
    const dataCount = Array.isArray(raw?.data) ? raw.data.length : 1;

    return { processed: Boolean(type), recordsCount: dataCount };
  }

  async backfill(
    userId: string,
    _since: Date
  ): Promise<{
    activities: NormalizedActivity[];
    sleep: NormalizedSleep[];
    daily: NormalizedDaily[];
  }> {
    if (!this.isEnabled && !this.isMock) {
      return { activities: [], sleep: [], daily: [] };
    }

    const today = new Date().toISOString().split("T")[0]!;

    const activities: NormalizedActivity[] = [
      {
        id: `agg_act_${Date.now()}_1`,
        userId,
        provider: "aggregator",
        providerRecordId: "terra_event_19283",
        sport: "rowing",
        title: "Aggregator: Concept2 Ergometer edzés",
        startTime: `${today}T11:00:00.000Z`,
        durationSeconds: 2400, // 40m
        distanceMeters: 8000,
        avgHeartRate: 152,
        maxHeartRate: 171,
        avgPowerWatts: 240,
        calories: 520,
        trainingLoad: 64,
        sourceConfidence: 0.94,
        createdAt: new Date().toISOString()
      }
    ];

    const sleep: NormalizedSleep[] = [
      {
        id: `agg_sleep_${Date.now()}_1`,
        userId,
        provider: "aggregator",
        providerRecordId: "terra_sleep_55112",
        date: today,
        startTime: `${today}T23:15:00.000Z`,
        endTime: `${today}T06:45:00.000Z`,
        durationMinutes: 450,
        efficiencyScore: 87,
        sleepScore: 82,
        stages: {
          deepMinutes: 85,
          remMinutes: 95,
          lightMinutes: 230,
          awakeMinutes: 40
        },
        restingHeartRateBpm: 49,
        sourceConfidence: 0.92,
        createdAt: new Date().toISOString()
      }
    ];

    const daily: NormalizedDaily[] = [
      {
        id: `agg_daily_${Date.now()}_1`,
        userId,
        provider: "aggregator",
        providerRecordId: "terra_daily_77182",
        date: today,
        restingHeartRateBpm: 49,
        hrvRmssdMs: 65,
        steps: 9800,
        sourceConfidence: 0.92,
        createdAt: new Date().toISOString()
      }
    ];

    return { activities, sleep, daily };
  }

  async refresh(_userId: string): Promise<boolean> {
    return this.isEnabled;
  }

  async disconnect(_userId: string): Promise<boolean> {
    return true;
  }
}
