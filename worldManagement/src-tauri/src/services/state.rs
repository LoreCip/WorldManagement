use std::path::PathBuf;
use std::sync::Mutex;
use rusqlite::Connection;

pub struct DbState(pub Mutex<Connection>);

#[derive(Clone)]
pub struct AppPaths {
    pub media_dir: PathBuf,
    pub templates_dir: PathBuf,
    pub sheets_dir: PathBuf,
}