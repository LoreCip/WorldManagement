import { useLocalization } from "../context/LocalizationContext";

export type SettingType = "boolean" | "select" | "text" | "number" | "color";

export interface SettingOption {
  value: string;
  label: string;
}

export interface SettingDefinition<T = any> {
  key: string;              // chiave univoca, usata anche come chiave nel DB
  label: string;
  description?: string;
  category: string;         // raggruppamento nella UI (es. "Generale", "Timeline")
  type: SettingType;
  defaultValue: T;
  options?: SettingOption[]; // richiesto solo per type: "select"
  min?: number;               // richiesto solo per type: "number"
  max?: number;
}

// Struttura base delle impostazioni
export const rawSettingsRegistry = [
  {
    key: "confirm_before_delete",
    categoryKey: "settings.categories.general",
    type: "boolean" as SettingType,
    defaultValue: true,
  },
  {
    key: "default_wiki_category",
    categoryKey: "settings.categories.wiki",
    type: "select" as SettingType,
    defaultValue: "Lore",
    optionKeys: ["Lore", "Personaggi", "Luoghi", "Generale"],
  },
  {
    key: "general_search_case_sensitive",
    categoryKey: "settings.categories.wiki",
    type: "boolean" as SettingType,
    defaultValue: false,
  },
  {
    key: "general_search_fuzzy",
    categoryKey: "settings.categories.wiki",
    type: "boolean" as SettingType,
    defaultValue: false,
  },
  {
    key: "general_search_include_content",
    categoryKey: "settings.categories.wiki",
    type: "boolean" as SettingType,
    defaultValue: true,
  },
  {
    key: "timeline_default_precision",
    categoryKey: "settings.categories.timeline",
    type: "select" as SettingType,
    defaultValue: "year",
    optionKeys: ["year", "month", "day"],
  },
  {
    key: "timeline_days_per_month",
    categoryKey: "settings.categories.timeline",
    type: "number" as SettingType,
    defaultValue: 30,
    min: 1,
    max: 100,
  },
  {
    key: "timeline_days_per_year",
    categoryKey: "settings.categories.timeline",
    type: "number" as SettingType,
    defaultValue: 360,
    min: 1,
    max: 40000,
  },
  {
    key: "timeline_start_year",
    categoryKey: "settings.categories.timeline",
    type: "number" as SettingType,
    defaultValue: 0,
  },
  {
    key: "timeline_end_year",
    categoryKey: "settings.categories.timeline",
    type: "number" as SettingType,
    defaultValue: 1000,
  },
  {
    key: "timeline_category_default_icon",
    categoryKey: "settings.categories.timeline",
    type: "text" as SettingType,
    defaultValue: "📌",
  },
  {
    key: "timeline_category_default_color",
    categoryKey: "settings.categories.timeline",
    type: "color" as SettingType,
    defaultValue: "#c9a15a",
  },
  {
    key: "maps_default_width",
    categoryKey: "settings.categories.maps",
    type: "number" as SettingType,
    defaultValue: 1920,
    min: 1,
    max: 8192,
  },
  {
    key: "maps_default_height",
    categoryKey: "settings.categories.maps",
    type: "number" as SettingType,
    defaultValue: 1080,
    min: 1,
    max: 4096,
  },
  {
    key: "maps_portal_default_label",
    categoryKey: "settings.categories.maps",
    type: "text" as SettingType,
    defaultValue: "Portale",
  },
  {
    key: "maps_portal_snap_to_grid",
    categoryKey: "settings.categories.maps",
    type: "boolean" as SettingType,
    defaultValue: false,
  },
  {
    key: "maps_portal_grid_size",
    categoryKey: "settings.categories.maps",
    type: "number" as SettingType,
    defaultValue: 100,
    min: 10,
    max: 500,
  },
  {
    key: "characters_default_sheet_variant",
    categoryKey: "settings.categories.characters",
    type: "select" as SettingType,
    defaultValue: "pg",
    optionKeys: ["pg", "png"],
  },
  {
    key: "characters_default_markdown_template",
    categoryKey: "settings.categories.characters",
    type: "text" as SettingType,
    defaultValue: "# {{name}}\n\nScheda personaggio per {{name}}",
  },
  {
    key: "localization_language",
    categoryKey: "settings.categories.localization",
    type: "select" as SettingType,
    defaultValue: "it",
    optionKeys: ["it", "en", "fr", "de", "es", "pt"],
  },
];

// Funzione dinamica che traduce il registro
export function getLocalizedSettingsRegistry(t: (key: string) => string): SettingDefinition[] {
  return rawSettingsRegistry.map((item) => {
    const baseKey = `settings.registry.${item.key}`;
    const descriptionKey = `${baseKey}.description`;
    const description = t(descriptionKey);

    const options = item.optionKeys
      ? item.optionKeys.map((opt) => ({
          value: opt,
          label: t(`${baseKey}.options.${opt}`),
        }))
      : undefined;

    return {
      key: item.key,
      label: t(`${baseKey}.label`),
      ...(description !== descriptionKey ? { description } : {}),
      category: t(item.categoryKey),
      type: item.type,
      defaultValue: item.defaultValue,
      min: item.min,
      max: item.max,
      options,
    };
  });
}

// Hook React per i componenti UI
export function useSettingsRegistry(): SettingDefinition[] {
  const { t } = useLocalization();
  return getLocalizedSettingsRegistry(t);
}

export const settingsRegistry: SettingDefinition[] = getLocalizedSettingsRegistry((key) => key);

// Tipo per i valori delle impostazioni
export type AppSettingsValues = {
  [K in typeof rawSettingsRegistry[number]["key"]]: any;
};