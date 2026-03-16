import {
  EventEmitter,
  PermissionStatus,
  UnavailabilityError,
  requireOptionalNativeModule,
  type EventSubscription,
  type PermissionResponse,
} from "expo-modules-core";

export interface PedometerResult {
  steps: number;
}

interface NativePedometerModule {
  isAvailableAsync: () => Promise<boolean>;
  getStepCountAsync?: (
    startMs: number,
    endMs: number,
  ) => Promise<PedometerResult>;
  getPermissionsAsync?: () => Promise<PermissionResponse>;
  requestPermissionsAsync?: () => Promise<PermissionResponse>;
}

type PedometerEvents = {
  "Exponent.pedometerUpdate": (result: PedometerResult) => void;
};

const nativePedometer =
  requireOptionalNativeModule<NativePedometerModule>("ExponentPedometer");

const pedometerEmitter = nativePedometer
  ? new EventEmitter<PedometerEvents>(nativePedometer as never)
  : null;

const defaultPermissionsResponse: PermissionResponse = {
  granted: true,
  expires: "never",
  canAskAgain: true,
  status: PermissionStatus.GRANTED,
};

export async function isPedometerAvailableAsync(): Promise<boolean> {
  if (!nativePedometer) {
    return false;
  }

  return nativePedometer.isAvailableAsync();
}

export async function getPedometerStepCountAsync(
  start: Date,
  end: Date,
): Promise<PedometerResult> {
  if (!nativePedometer?.getStepCountAsync) {
    throw new UnavailabilityError("ExponentPedometer", "getStepCountAsync");
  }

  if (start > end) {
    throw new Error("Pedometer: the start date must be before the end date.");
  }

  return nativePedometer.getStepCountAsync(start.getTime(), end.getTime());
}

export async function requestPedometerPermissionsAsync(): Promise<PermissionResponse> {
  if (!nativePedometer?.requestPermissionsAsync) {
    return defaultPermissionsResponse;
  }

  return nativePedometer.requestPermissionsAsync();
}

export function supportsPedometerHistory(): boolean {
  return Boolean(nativePedometer?.getStepCountAsync);
}

export function watchPedometerStepCount(
  callback: (result: PedometerResult) => void,
): EventSubscription | null {
  if (!pedometerEmitter) {
    return null;
  }

  return pedometerEmitter.addListener("Exponent.pedometerUpdate", callback);
}
