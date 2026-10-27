/**
 * Client Service for Server-Side Device Integrations
 *
 * Calls Cloud Functions callables for OAuth start/callback,
 * on-demand sync, disconnect, data deletion, and status fetching.
 */

import { httpsCallable } from "firebase/functions";
import { functions } from "@shared/lib/firebase";
import { DeviceProvider } from "@shared/types/devices";

export interface DeviceStatusItem {
  provider: DeviceProvider;
  name: string;
  connected: boolean;
  status: "connected" | "disconnected" | "syncing" | "error" | "not_configured";
  lastSyncAt: string | null;
  isConfigured: boolean;
  error?: string;
  updatedAt: string;
}

export interface IngestionSummary {
  activitiesCreated: number;
  activitiesMerged: number;
  sleepSaved: number;
  dailySaved: number;
}

/**
 * Fetches real server configuration and connection statuses for all providers
 */
export async function fetchDeviceStatuses(allowMock: boolean = false): Promise<DeviceStatusItem[]> {
  try {
    const fn = httpsCallable<{ allowMock?: boolean }, { devices: DeviceStatusItem[] }>(
      functions,
      "getDeviceIntegrationStatuses"
    );
    const result = await fn({ allowMock });
    return result.data.devices;
  } catch (err) {
    console.warn("Falling back to local status check:", err);
    return [
      {
        provider: "whoop",
        name: "WHOOP 4.0",
        connected: false,
        status: allowMock ? "disconnected" : "not_configured",
        lastSyncAt: null,
        isConfigured: allowMock,
        updatedAt: new Date().toISOString()
      },
      {
        provider: "garmin",
        name: "Garmin Connect",
        connected: false,
        status: allowMock ? "disconnected" : "not_configured",
        lastSyncAt: null,
        isConfigured: allowMock,
        updatedAt: new Date().toISOString()
      },
      {
        provider: "polar",
        name: "Polar AccessLink",
        connected: false,
        status: allowMock ? "disconnected" : "not_configured",
        lastSyncAt: null,
        isConfigured: allowMock,
        updatedAt: new Date().toISOString()
      },
      {
        provider: "oura",
        name: "Oura Ring v2",
        connected: false,
        status: allowMock ? "disconnected" : "not_configured",
        lastSyncAt: null,
        isConfigured: allowMock,
        updatedAt: new Date().toISOString()
      }
    ];
  }
}

/**
 * Initiates OAuth 2.0 authorization flow
 */
export async function startDeviceOAuth(
  provider: DeviceProvider,
  redirectUri: string
): Promise<{ authUrl: string; state: string }> {
  const fn = httpsCallable<
    { provider: DeviceProvider; redirectUri: string },
    { authUrl: string; state: string }
  >(functions, "getDeviceOAuthUrl");

  const res = await fn({ provider, redirectUri });
  return res.data;
}

/**
 * Exchanges OAuth authorization code for server-side stored tokens and initial backfill
 */
export async function completeDeviceOAuth(
  provider: DeviceProvider,
  code: string,
  state: string,
  redirectUri: string
): Promise<{ success: boolean; backfill: IngestionSummary }> {
  const fn = httpsCallable<
    { provider: DeviceProvider; code: string; state: string; redirectUri: string },
    { success: boolean; backfill: IngestionSummary }
  >(functions, "exchangeDeviceOAuthCode");

  const res = await fn({ provider, code, state, redirectUri });
  return res.data;
}

/**
 * Triggers on-demand historical sync
 */
export async function syncDeviceNow(
  provider: DeviceProvider,
  days: number = 30
): Promise<{ success: boolean } & IngestionSummary> {
  const fn = httpsCallable<
    { provider: DeviceProvider; days?: number },
    { success: boolean } & IngestionSummary
  >(functions, "syncDeviceNow");

  const res = await fn({ provider, days });
  return res.data;
}

/**
 * Disconnects provider and revokes server credentials
 */
export async function disconnectDevice(provider: DeviceProvider): Promise<{ success: boolean }> {
  const fn = httpsCallable<{ provider: DeviceProvider }, { success: boolean }>(
    functions,
    "disconnectDevice"
  );

  const res = await fn({ provider });
  return res.data;
}

/**
 * Deletes all imported data associated with a provider
 */
export async function deleteDeviceData(
  provider: DeviceProvider
): Promise<{ success: boolean; deletedSessionsCount: number }> {
  const fn = httpsCallable<
    { provider: DeviceProvider },
    { success: boolean; deletedSessionsCount: number }
  >(functions, "deleteDeviceData");

  const res = await fn({ provider });
  return res.data;
}
