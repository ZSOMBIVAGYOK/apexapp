/**
 * Apex Server Integrations Hub
 *
 * Provides central secret management via Secret Manager / defineSecret,
 * adapter factory, and public device connection management.
 */

import * as admin from "firebase-admin";
import {
  DeviceConnectionPublicStatus,
  DeviceProvider,
  IDeviceAdapterServer
} from "./types";
import { WhoopServerAdapter } from "./adapters/whoopAdapter";
import { GarminServerAdapter } from "./adapters/garminAdapter";
import { PolarServerAdapter } from "./adapters/polarAdapter";
import { OuraServerAdapter } from "./adapters/ouraAdapter";

// Environment / Secret definitions for Firebase Functions
const makeSecret = (key: string) => ({ value: () => process.env[key] || "" });
export const whoopClientId = makeSecret("WHOOP_CLIENT_ID");
export const whoopClientSecret = makeSecret("WHOOP_CLIENT_SECRET");
export const garminConsumerKey = makeSecret("GARMIN_CONSUMER_KEY");
export const garminConsumerSecret = makeSecret("GARMIN_CONSUMER_SECRET");
export const polarClientId = makeSecret("POLAR_CLIENT_ID");
export const polarClientSecret = makeSecret("POLAR_CLIENT_SECRET");
export const ouraClientId = makeSecret("OURA_CLIENT_ID");
export const ouraClientSecret = makeSecret("OURA_CLIENT_SECRET");

export const ALL_DEVICE_SECRETS: any[] = [];

/**
 * Safely resolves secret value with fallback to process.env (useful for local dev / testing)
 */
export function resolveSecret(secret: { value: () => string }, envKey: string): string {
  try {
    const val = secret.value();
    if (val && typeof val === "string") return val;
  } catch {
    // Secret.value() throws outside of an active function invocation or in tests
  }
  return process.env[envKey] || "";
}

/**
 * Creates provider adapter instances configured with server secrets.
 */
export function getAdapter(
  provider: DeviceProvider,
  db: admin.firestore.Firestore,
  allowMock: boolean = true
): IDeviceAdapterServer | null {
  switch (provider) {
    case "whoop":
      return new WhoopServerAdapter(
        () => resolveSecret(whoopClientId, "WHOOP_CLIENT_ID"),
        () => resolveSecret(whoopClientSecret, "WHOOP_CLIENT_SECRET"),
        db
      );

    case "garmin":
      return new GarminServerAdapter(
        () => resolveSecret(garminConsumerKey, "GARMIN_CONSUMER_KEY"),
        () => resolveSecret(garminConsumerSecret, "GARMIN_CONSUMER_SECRET"),
        db,
        allowMock
      );

    case "polar":
      return new PolarServerAdapter(
        () => resolveSecret(polarClientId, "POLAR_CLIENT_ID"),
        () => resolveSecret(polarClientSecret, "POLAR_CLIENT_SECRET"),
        db,
        allowMock
      );

    case "oura":
      return new OuraServerAdapter(
        () => resolveSecret(ouraClientId, "OURA_CLIENT_ID"),
        () => resolveSecret(ouraClientSecret, "OURA_CLIENT_SECRET"),
        db,
        allowMock
      );

    default:
      return null;
  }
}

/**
 * Queries all supported providers and athlete's connection status.
 */
export async function getAllDeviceStatuses(
  athleteId: string,
  db: admin.firestore.Firestore,
  allowMock: boolean = false
): Promise<DeviceConnectionPublicStatus[]> {
  const supportedProviders: DeviceProvider[] = ["whoop", "garmin", "polar", "oura"];
  const devicesSnap = await db
    .collection("athletes")
    .doc(athleteId)
    .collection("devices")
    .get();

  const savedMap = new Map<string, admin.firestore.DocumentData>();
  devicesSnap.forEach((doc) => {
    savedMap.set(doc.id, doc.data());
  });

  return supportedProviders.map((provider) => {
    const adapter = getAdapter(provider, db, allowMock);
    const isConfigured = adapter ? adapter.isConfigured() : false;
    const existing = savedMap.get(provider);

    const isConnected = Boolean(existing?.connected);
    let status: DeviceConnectionPublicStatus["status"] = "disconnected";

    if (!isConfigured && !allowMock) {
      status = "not_configured";
    } else if (isConnected) {
      status = "connected";
    }

    return {
      provider,
      name: adapter?.name || provider.toUpperCase(),
      connected: isConnected,
      status,
      lastSyncAt: existing?.lastSyncAt || null,
      isConfigured: isConfigured || allowMock,
      error: existing?.error,
      updatedAt: existing?.updatedAt || new Date().toISOString()
    };
  });
}

// Export domain types, adapters, normalizers and deduplication
export * from "./types";
export * from "./deduplication";
export * from "./adapters/whoopAdapter";
export * from "./adapters/garminAdapter";
export * from "./adapters/polarAdapter";
export * from "./adapters/ouraAdapter";
export * from "./normalizers/whoopNormalizer";
export * from "./normalizers/garminNormalizer";
export * from "./normalizers/polarNormalizer";
export * from "./normalizers/ouraNormalizer";
