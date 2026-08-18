import { MapId, MapPortalId, ArticleId } from "./core";

// Modello di lettura: riga DB, colonne sempre presenti ma nullable
// (allineato alla convenzione di timeline.ts).
export interface MapMeta {
  id: MapId;
  title: string;
  image_path: string;
  parent_map_id: MapId | null;
  article_id: ArticleId | null;
  width: number;
  height: number;
}

// Alias per compatibilita con il codice esistente
export type MapItem = MapMeta;

export interface MapPortal {
  id: MapPortalId;
  source_map_id: MapId;
  target_map_id: MapId | null;
  target_article_id: ArticleId | null;
  x: number;
  y: number;
  label: string | null;
}

export interface MapWithPortals {
  map: MapMeta;
  portals: MapPortal[];
}
