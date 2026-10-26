/**
 * Device Adapters Registry and Factory
 */

import { IDeviceAdapter, DeviceProvider } from "@shared/types/devices";
import { GarminAdapter } from "./garminAdapter";
import { WhoopAdapter } from "./whoopAdapter";
import { PolarAdapter } from "./polarAdapter";
import { OuraAdapter } from "./ouraAdapter";
import { AggregatorAdapter } from "./aggregatorAdapter";

export * from "./garminAdapter";
export * from "./whoopAdapter";
export * from "./polarAdapter";
export * from "./ouraAdapter";
export * from "./aggregatorAdapter";

/**
 * Returns the appropriate adapter instance for a device provider.
 */
export function getDeviceAdapter(
  provider: DeviceProvider,
  mockMode = true
): IDeviceAdapter {
  switch (provider) {
    case "garmin":
      return new GarminAdapter(mockMode);
    case "whoop":
      return new WhoopAdapter(mockMode);
    case "polar":
      return new PolarAdapter(mockMode);
    case "oura":
      return new OuraAdapter(mockMode);
    case "aggregator":
      return new AggregatorAdapter(mockMode);
    default:
      throw new Error(`No native adapter implemented for provider: ${provider}`);
  }
}
