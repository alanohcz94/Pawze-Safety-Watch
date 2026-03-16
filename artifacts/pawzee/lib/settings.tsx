import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "pawzee_settings";
export const ALERT_RADIUS_OPTIONS = [3, 5, 8, 10, 12] as const;
export const DEFAULT_ALERT_RADIUS_METERS = 10;

interface Settings {
  notifications: boolean;
  alertRadius: number;
  audioReport: boolean;
  stepCounter: boolean;
}

interface SettingsContextValue extends Settings {
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

const DEFAULT_SETTINGS: Settings = {
  notifications: true,
  alertRadius: DEFAULT_ALERT_RADIUS_METERS,
  audioReport: false,
  stepCounter: false,
};

function isAlertRadiusOption(value: unknown): value is number {
  return (
    typeof value === "number" &&
    ALERT_RADIUS_OPTIONS.includes(
      value as (typeof ALERT_RADIUS_OPTIONS)[number],
    )
  );
}

function normalizeSettings(raw: Partial<Settings>): Settings {
  return {
    notifications:
      typeof raw.notifications === "boolean"
        ? raw.notifications
        : DEFAULT_SETTINGS.notifications,
    alertRadius: isAlertRadiusOption(raw.alertRadius)
      ? raw.alertRadius
      : DEFAULT_SETTINGS.alertRadius,
    audioReport:
      typeof raw.audioReport === "boolean"
        ? raw.audioReport
        : DEFAULT_SETTINGS.audioReport,
    stepCounter:
      typeof raw.stepCounter === "boolean"
        ? raw.stepCounter
        : DEFAULT_SETTINGS.stepCounter,
  };
}

const SettingsContext = createContext<SettingsContextValue>({
  ...DEFAULT_SETTINGS,
  updateSetting: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<Settings>;
          setSettings(normalizeSettings(parsed));
        }
      } catch {}
    })();
  }, []);

  const updateSetting = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [],
  );

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        updateSetting,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}
