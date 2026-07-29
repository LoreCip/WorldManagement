import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { settingsRegistry } from "../types/settingsRegistry";

interface SettingsContextType {
  isLoaded: boolean;
  getSetting: <T = any>(key: string) => T;
  setSetting: (key: string, value: any) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await invoke<Record<string, string>>("get_all_settings");
        // Parte dai default dichiarati nel registro, poi sovrascrive con
        // ciò che è effettivamente salvato nel DB — così una chiave mai
        // salvata (impostazione nuova, DB vecchio) ha comunque un valore valido.
        const merged: Record<string, any> = {};
        for (const def of settingsRegistry) {
          merged[def.key] = def.defaultValue;
        }
        for (const [key, jsonValue] of Object.entries(raw)) {
          try {
            merged[key] = JSON.parse(jsonValue);
          } catch {
            merged[key] = jsonValue;
          }
        }
        setValues(merged);
      } catch (err) {
        console.error("Errore caricamento impostazioni:", err);
        // Fallback totale ai default, così l'app resta usabile anche se il DB fallisce
        const fallback: Record<string, any> = {};
        for (const def of settingsRegistry) fallback[def.key] = def.defaultValue;
        setValues(fallback);
      } finally {
        setIsLoaded(true);
      }
    };
    load();
  }, []);

  const getSetting = useCallback(
    <T,>(key: string): T => {
      if (key in values) return values[key] as T;
      const def = settingsRegistry.find((d) => d.key === key);
      return (def?.defaultValue ?? null) as T;
    },
    [values]
  );

  const setSetting = useCallback(async (key: string, value: any) => {
    setValues((prev) => ({ ...prev, [key]: value })); // aggiornamento ottimistico
    try {
      await invoke("save_setting", { key, value: JSON.stringify(value) });
    } catch (err) {
      console.error(`Errore salvataggio impostazione "${key}":`, err);
    }
  }, []);

  return (
    <SettingsContext.Provider value={{ isLoaded, getSetting, setSetting }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings deve essere usato dentro un SettingsProvider");
  }
  return ctx;
};