export interface MapMeta {
  id: string;
  title: string;
  image_path: string;
  parent_map_id?: string | null;
  article_id?: string | null;
  width: number;
  height: number;
}

// Alias per compatibilità con il codice esistente
export type MapItem = MapMeta;

export interface MapPortal {
  id: string;
  source_map_id: string;
  target_map_id?: string | null;
  target_article_id?: string | null;
  x: number;
  y: number;
  label?: string | null;
}

export interface MapWithPortals {
  map: MapMeta;
  portals: MapPortal[];
}