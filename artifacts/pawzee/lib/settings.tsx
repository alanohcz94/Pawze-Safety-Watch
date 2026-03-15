import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "pawzee_settings";

interface Settings {
  notifications: boolean;
  alertRadius: number;
  stepCounter: boolean;
}

interface SettingsContextValue extends Settings {
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

const DEFAULT_SETTINGS: Settings = {
  notifications: true,
  alertRadius: 3,
  stepCounter: false,
};

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
          setSettings((prev) => ({ ...prev, ...parsed }));
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
