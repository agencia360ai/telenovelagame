import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Settings = {
  locale: "es" | "en";
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  setLocale: (locale: "es" | "en") => void;
  setSoundEnabled: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
};

const SettingsContext = createContext<Settings>({
  locale: "es",
  soundEnabled: true,
  hapticsEnabled: true,
  setLocale: () => {},
  setSoundEnabled: () => {},
  setHapticsEnabled: () => {},
});

const SETTINGS_KEY = "app_settings";

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<"es" | "en">("es");
  const [soundEnabled, setSoundState] = useState(true);
  const [hapticsEnabled, setHapticsState] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((raw) => {
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.locale) setLocaleState(parsed.locale);
        if (parsed.soundEnabled !== undefined) setSoundState(parsed.soundEnabled);
        if (parsed.hapticsEnabled !== undefined) setHapticsState(parsed.hapticsEnabled);
      }
    });
  }, []);

  const persist = (updates: Partial<{ locale: string; soundEnabled: boolean; hapticsEnabled: boolean }>) => {
    const current = { locale, soundEnabled, hapticsEnabled, ...updates };
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(current));
  };

  const setLocale = (l: "es" | "en") => {
    setLocaleState(l);
    persist({ locale: l });
  };

  const setSoundEnabled = (v: boolean) => {
    setSoundState(v);
    persist({ soundEnabled: v });
  };

  const setHapticsEnabled = (v: boolean) => {
    setHapticsState(v);
    persist({ hapticsEnabled: v });
  };

  return (
    <SettingsContext.Provider
      value={{ locale, soundEnabled, hapticsEnabled, setLocale, setSoundEnabled, setHapticsEnabled }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
