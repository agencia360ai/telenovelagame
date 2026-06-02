import React, { createContext, useContext, useMemo } from "react";
import { useSettings } from "./SettingsContext";
import es from "../i18n/es.json";
import en from "../i18n/en.json";

type Translations = Record<string, string>;
const locales: Record<string, Translations> = { es, en };

type I18n = {
  t: (key: string, vars?: Record<string, string | number>) => string;
  locale: string;
};

const I18nContext = createContext<I18n>({
  t: (key) => key,
  locale: "es",
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { locale } = useSettings();

  const value = useMemo<I18n>(() => {
    const strings = locales[locale] ?? locales.en ?? {};
    const fallback = locales.en ?? {};

    const t = (key: string, vars?: Record<string, string | number>): string => {
      let text = strings[key] ?? fallback[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
        }
      }
      return text;
    };

    return { t, locale };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
