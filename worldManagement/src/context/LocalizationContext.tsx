import React, { createContext, useContext, useMemo } from "react";
import { useSettings } from "./SettingsContext";

// Import statici: essendo un numero fisso e piccolo di lingue, non serve
// un caricamento dinamico
import it_IT from "../localization/it_IT.json";
import en_US from "../localization/en_US.json";


// Mappa tra il valore salvato in `localization_language` (settingsRegistry)
// e il file di traduzione corrispondente.
const LOCALES: Record<string, any> = {
  it: it_IT,
  en: en_US,
};

const FALLBACK_LOCALE = "it";

interface LocalizationContextType {
  t: (key: string, vars?: Record<string, string | number>) => string;
  language: string;
}

const LocalizationContext = createContext<LocalizationContextType | null>(null);

// Naviga un oggetto annidato tramite chiave puntata, es. "hub.subtitle"
function resolveKey(dict: any, key: string): string | undefined {
  return key.split(".").reduce((acc, part) => (acc && typeof acc === "object" ? acc[part] : undefined), dict);
}

// Sostituisce {{variabile}} nella stringa con i valori passati in `vars`
function interpolate(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => (key in vars ? String(vars[key]) : `{{${key}}}`));
}

export const LocalizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getSetting, isLoaded } = useSettings();

  const language = isLoaded ? getSetting("localization_language") || FALLBACK_LOCALE : FALLBACK_LOCALE;

  const dict = LOCALES[language] ?? LOCALES[FALLBACK_LOCALE];

  const t = useMemo(() => {
    return (key: string, vars?: Record<string, string | number>): string => {
      const value = resolveKey(dict, key);
      if (typeof value !== "string") {
        console.warn(`Traduzione mancante per la chiave "${key}" (lingua: ${language})`);
        return key;
      }
      return interpolate(value, vars);
    };
  }, [dict, language]);

  return (
    <LocalizationContext.Provider value={{ t, language }}>
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = () => {
  const ctx = useContext(LocalizationContext);
  if (!ctx) {
    throw new Error("useLocalization deve essere usato dentro un LocalizationProvider");
  }
  return ctx;
};