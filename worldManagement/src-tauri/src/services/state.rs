use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct DbState(pub Mutex<Connection>);

#[derive(Clone)]
pub struct AppPaths {
    pub media_dir: PathBuf,
    pub templates_dir: PathBuf,
    pub sheets_dir: PathBuf,
}
