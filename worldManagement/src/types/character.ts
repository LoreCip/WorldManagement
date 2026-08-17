import { CharacterId, GameSystemId, ArticleId } from "./core";

export type FieldType = "text" | "number" | "textarea" | "checkbox";

export interface FieldSchema {
  key: string;
  label: string;
  type: FieldType;
  default?: string | number | boolean;
}

export interface SystemSchema {
  pdf_template_pg?: string;   // variante Personaggio Giocante
  pdf_template_png?: string;  // variante Personaggio Non Giocante (opzionale)
  /** @deprecated legacy, pre-varianti PG/PNG. Fallback su pdf_template_pg. */
  pdf_template?: string;
  fields: FieldSchema[];
}

export type SheetVariant = "pg" | "png";

export interface GameSystem {
  id: GameSystemId;
  name: string;
  description?: string;
  schema_json: string; // JSON serializzato di SystemSchema
  markdown_template: string;
  is_builtin: boolean;
  created_at?: string;
  updated_at?: string;
}

// Modello di lettura: riga DB, colonna sempre presente ma nullable.
export interface CharacterSheet {
  id: CharacterId;
  system_id: GameSystemId;
  article_id: ArticleId | null;
  name: string;
  data_json: string; // Record<string, any> in formato stringa
  sheet_variant: SheetVariant;
  created_at?: string;
  updated_at?: string;
}

export interface SaveCharacterSheetPayload {
  id?: CharacterId | null;
  system_id: GameSystemId;
  article_id?: ArticleId | null;
  name: string;
  data_json: string;
  sheet_variant: SheetVariant;
}

export interface SaveGameSystemPayload {
  id?: GameSystemId;
  name: string;
  description?: string;
  schema_json: string;
  markdown_template: string;
}