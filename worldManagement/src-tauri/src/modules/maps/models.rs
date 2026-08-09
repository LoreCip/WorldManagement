use serde::{Deserialize, Serialize};

/// Metadati base della Mappa
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MapMeta {
    pub id: String,
    pub title: String,
    pub image_path: String,
    pub parent_map_id: Option<String>,
    pub article_id: Option<String>,
    pub width: u32,
    pub height: u32,
}

/// Portale di collegamento tra mappe
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MapPortal {
    pub id: String,
    pub source_map_id: String,
    pub target_map_id: Option<String>,
    pub target_article_id: Option<String>,
    pub x: f64,
    pub y: f64,
    pub label: Option<String>,
}

/// Mappa completa caricata con i suoi portali
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MapWithPortals {
    pub map: MapMeta,
    pub portals: Vec<MapPortal>,
}
