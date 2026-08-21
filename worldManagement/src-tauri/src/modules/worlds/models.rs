use crate::services::WorldEntry;
use serde::Serialize;

#[derive(Serialize, Clone)]
pub struct WorldInfo {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub is_active: bool,
}

impl WorldInfo {
    pub fn from_entry(entry: &WorldEntry, active_id: &str) -> Self {
        WorldInfo {
            id: entry.id.clone(),
            name: entry.name.clone(),
            created_at: entry.created_at.clone(),
            is_active: entry.id == active_id,
        }
    }
}
