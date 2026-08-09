use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TimelineEventMeta {
    pub id: String,
    pub title: String,
    pub time_value: i64,
    pub precision: String, // "day" | "month" | "year"
    pub category_id: Option<String>,
}

/// Dati leggeri per canvas e sidebar: includono end_time_value (per disegnare
/// le barre di durata) e i dati della categoria già risolti via JOIN, per
/// evitare N+1 chiamate dal frontend quando renderizza i marker.
#[derive(Debug, Serialize, Deserialize)]
pub struct TimelineEventListItem {
    #[serde(flatten)]
    pub meta: TimelineEventMeta,
    pub end_time_value: Option<i64>,
    pub article_id: Option<String>,
    pub map_id: Option<String>,
    pub category_name: Option<String>,
    pub category_color: Option<String>,
    pub category_icon: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TimelineEvent {
    #[serde(flatten)]
    pub meta: TimelineEventMeta,
    pub description: Option<String>,
    pub end_time_value: Option<i64>,
    pub article_id: Option<String>,
    pub map_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TimelineCategory {
    pub id: String,
    pub name: String,
    pub color: String, // hex, es. "#c0524a"
    pub icon: String,  // emoji singola
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TimelineSavedView {
    pub id: String,
    pub name: String,
    pub center_value: i64,
    pub pixels_per_day: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CampaignSettings {
    pub current_date_value: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TimelineEra {
    pub id: String,
    pub label: String,
    pub start_value: i64,
    pub end_value: i64,
    pub color: String,
}
