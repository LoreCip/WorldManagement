import { useState, useEffect, useCallback } from "react";
import { invokeSafe } from "../lib/ipc";
import { settingsRegistry, AppSettingsValues } from "../types/settingsRegistry";

export interface GetSetting {
  <K extends keyof AppSettingsValues>(key: K): AppSettingsValues[K];
  (key: string): boolean | number | string | null;
}

export interface SetSetting {
  <K extends keyof AppSettingsValues>(key: K, value: AppSettingsValues[K]): Promise<void>;
  (key: string, value: boolean | number | string): Promise<void>;
}

export function useSettingsInternal() {
  const [values, setValues] = useState<Partial<AppSettingsValues>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const raw = await invokeSafe<Record<string, string>>("get_all_settings");

      // Parte dai default dichiarati nel registro, poi sovrascrive con
      // cio che e effettivamente salvato nel DB
      const merged = {} as Partial<AppSettingsValues>;
      for (const def of settingsRegistry) {
        (merged as Record<string, unknown>)[def.key] = def.defaultValue;
      }
      if (raw) {
        for (const [key, jsonValue] of Object.entries(raw)) {
          try {
            (merged as Record<string, unknown>)[key] = JSON.parse(jsonValue);
          } catch {
            (merged as Record<string, unknown>)[key] = jsonValue;
          }
        }
      }

      setValues(merged);
      setIsLoaded(true);
    };
    load();
  }, []);

  const getSetting = useCallback(
    ((key: string) => {
      if (key in values) return values[key as keyof AppSettingsValues];
      const def = settingsRegistry.find((d) => d.key === key);
      return def?.defaultValue ?? null;
    }) as GetSetting,
    [values]
  );

  const setSetting = useCallback(
    (async (key: string, value: boolean | number | string) => {
      setValues((prev) => ({ ...prev, [key]: value })); // aggiornamento ottimistico
      const result = await invokeSafe("save_setting", { key, value: JSON.stringify(value) });
      if (result === null) {
        console.error(`Salvataggio impostazione "${key}" fallito`);
      }
    }) as SetSetting,
    []
  );

  return { isLoaded, getSetting, setSetting };
}