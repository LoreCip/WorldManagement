export type FieldType = "text" | "number" | "textarea" | "checkbox";

export interface FieldSchema {
  key: string;
  label: string;
  type: FieldType;
  default?: string | number | boolean;
}

export interface SystemSchema {
  fields: FieldSchema[];
}

export interface GameSystem {
  id: string;
  name: string;
  description?: string;
  schema_json: string; // Serializzato JSON di SystemSchema
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
  data_json: string; // Record<string, any> in formato stringa
  created_at?: string;
  updated_at?: string;
}

export interface SaveCharacterPayload {
  id?: string;
  system_id: string;
  article_id?: string | null;
  name: string;
  data_json: string;
}

export interface SaveGameSystemPayload {
  id?: string; // Presente in modifica, assente in creazione
  name: string;
  description?: string;
  schema_json: string;
  markdown_template: string;
}