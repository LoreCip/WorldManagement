use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ArticleMeta {
    pub id: String,
    pub title: String,
    pub category: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResultItem {
    #[serde(flatten)]
    pub meta: ArticleMeta,
    pub snippet: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Article {
    #[serde(flatten)]
    pub meta: ArticleMeta,
    pub content: String,
    pub tags: Vec<String>,
}
