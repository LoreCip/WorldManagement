export type SettingType = "boolean" | "select" | "text" | "number";

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

// Unico punto in cui si dichiarano TUTTE le impostazioni dell'app.
// Per aggiungerne una nuova: aggiungi un oggetto qui, nient'altro —
// storage, Context e UI la gestiscono automaticamente.
export const settingsRegistry: SettingDefinition[] = [
  {
    key: "confirm_before_delete",
    label: "Conferma prima di eliminare",
    description: "Mostra sempre un avviso di conferma prima di eliminare articoli, mappe, eventi o schede.",
    category: "Generale",
    type: "boolean",
    defaultValue: true,
  },
  {
    key: "default_wiki_category",
    label: "Categoria predefinita nuove voci Wiki",
    category: "Wiki",
    type: "select",
    defaultValue: "Lore",
    options: [
      { value: "Lore", label: "Lore" },
      { value: "Personaggi", label: "Personaggi" },
      { value: "Luoghi", label: "Luoghi" },
      { value: "Generale", label: "Generale" },
    ],
  },
  {
    key: "timeline_default_precision",
    label: "Precisione predefinita nuovi eventi",
    description: "Il livello di dettaglio temporale proposto quando crei un nuovo evento in timeline.",
    category: "Timeline",
    type: "select",
    defaultValue: "year",
    options: [
      { value: "year", label: "Anno" },
      { value: "month", label: "Mese" },
      { value: "day", label: "Giorno" },
    ],
  },
  {
    key: "timeline_days_per_month",
    label: "Giorni per mese (calendario del mondo)",
    description: "Lunghezza convenzionale di un mese nel tuo calendario, usata per calcolare le date sulla timeline.",
    category: "Timeline",
    type: "number",
    defaultValue: 30,
    min: 1,
    max: 100,
  },
];

// Tipo derivato automaticamente dal registro: { confirm_before_delete: boolean, ... }
export type AppSettingsValues = {
  [K in typeof settingsRegistry[number]["key"]]: any;
};