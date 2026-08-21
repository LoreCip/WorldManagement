use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;

pub struct DbState(pub Mutex<Connection>);

#[derive(Clone)]
pub struct AppPaths {
    pub media_dir: PathBuf,
    pub templates_dir: PathBuf,
    pub sheets_dir: PathBuf,
}

pub struct AppPathsState(pub Mutex<AppPaths>);

#[derive(Clone, Serialize, Deserialize)]
pub struct WorldEntry {
    pub id: String,
    pub name: String,
    pub created_at: String,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct WorldRegistry {
    pub worlds: Vec<WorldEntry>,
    pub active_world_id: String,
}

pub struct WorldsState {
    pub app_dir: PathBuf,
    pub registry: Mutex<WorldRegistry>,
}
