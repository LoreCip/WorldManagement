export type FieldType = "text" | "number" | "textarea" | "checkbox";

export interface FieldSchema {
  key: string;
  label: string;
  type: FieldType;
  default?: string | number | boolean;
}

// Unico punto di verità per lo schema_json di GameSystem.
// Rispecchia esattamente ciò che SystemModal.tsx scrive e CharacterView.tsx legge.
export interface SystemSchema {
  pdf_template_pg?: string;   // variante Personaggio Giocante
  pdf_template_png?: string;  // variante Personaggio Non Giocante (opzionale)
  /** @deprecated legacy, pre-varianti PG/PNG. Fallback su pdf_template_pg. */
  pdf_template?: string;
  fields: FieldSchema[];
}

export type SheetVariant = "pg" | "png";

export interface GameSystem {
  id: string;
  name: string;
  description?: string;
  schema_json: string; // JSON serializzato di SystemSchema
  markdown_template: string;
  is_builtin: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CharacterSheet {
  id: string;
  system_id: string;
  article_id?: string | null;
  name: string;
  data_json: string;         // Record<string, any> in formato stringa
  sheet_variant: SheetVariant; // mancava: usato ovunque in CharacterView/useCharacters
  created_at?: string;
  updated_at?: string;
}

export interface SaveCharacterSheetPayload {
  id?: string | null;
  system_id: string;
  article_id?: string | null;
  name: string;
  data_json: string;
  sheet_variant: SheetVariant;
}

export interface SaveGameSystemPayload {
  id?: string;
  name: string;
  description?: string;
  schema_json: string;
  markdown_template: string;
}