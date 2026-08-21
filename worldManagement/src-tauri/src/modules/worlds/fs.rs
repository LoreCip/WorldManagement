use crate::db::{ensure_default_game_systems_exist, init_database};
use crate::services::{AppPaths, WorldEntry, WorldRegistry};
use rusqlite::Connection;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

pub const DEFAULT_PDF_BYTES: &[u8] =
    include_bytes!("../../../../sheetTemplates/DnD_5E_pg.pdf");

pub fn now_stamp() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs().to_string())
        .unwrap_or_default()
}

pub fn world_dir(app_dir: &Path, world_id: &str) -> PathBuf {
    app_dir.join("worlds").join(world_id)
}

pub fn world_paths(app_dir: &Path, world_id: &str) -> AppPaths {
    let wdir = world_dir(app_dir, world_id);
    AppPaths {
        media_dir: wdir.join("media"),
        templates_dir: wdir.join("sheetTemplates"),
        sheets_dir: wdir.join("savedSheets"),
    }
}

pub fn ensure_world_dirs(paths: &AppPaths, default_pdf_bytes: &[u8]) -> std::io::Result<()> {
    fs::create_dir_all(&paths.media_dir)?;
    fs::create_dir_all(&paths.templates_dir)?;
    fs::create_dir_all(&paths.sheets_dir)?;

    let target_pdf = paths.templates_dir.join("DnD_5E_pg.pdf");
    if !target_pdf.exists() {
        let _ = fs::write(&target_pdf, default_pdf_bytes);
    }

    Ok(())
}

pub fn open_world_db(wdir: &Path) -> Result<Connection, String> {
    let conn = Connection::open(wdir.join("world.db")).map_err(|e| e.to_string())?;
    init_database(&conn).map_err(|e| e.to_string())?;
    ensure_default_game_systems_exist(&conn).map_err(|e| e.to_string())?;
    Ok(conn)
}

fn registry_path(app_dir: &Path) -> PathBuf {
    app_dir.join("worlds.json")
}

pub fn save_registry(app_dir: &Path, registry: &WorldRegistry) -> std::io::Result<()> {
    let json = serde_json::to_string_pretty(registry)?;
    fs::write(registry_path(app_dir), json)
}

fn load_registry(app_dir: &Path) -> Option<WorldRegistry> {
    let raw = fs::read_to_string(registry_path(app_dir)).ok()?;
    serde_json::from_str(&raw).ok()
}

/// Crea un nuovo mondo vuoto (cartelle + db inizializzato) e lo aggiunge al registro.
fn create_fresh_world(app_dir: &Path, name: &str) -> std::io::Result<WorldEntry> {
    let world_id = Uuid::new_v4().to_string();
    let paths = world_paths(app_dir, &world_id);
    ensure_world_dirs(&paths, DEFAULT_PDF_BYTES)?;
    open_world_db(&world_dir(app_dir, &world_id))
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;

    Ok(WorldEntry {
        id: world_id,
        name: name.to_string(),
        created_at: now_stamp(),
    })
}

/// Migra un'installazione pre-esistente (db unico "worldbuilder.db" nella root
/// di app_dir) verso il nuovo layout multi-mondo, spostando db e cartelle
/// dentro worlds/<uuid>/.
fn migrate_legacy_world(app_dir: &Path, legacy_db: &Path) -> std::io::Result<WorldEntry> {
    let world_id = Uuid::new_v4().to_string();
    let wdir = world_dir(app_dir, &world_id);
    fs::create_dir_all(&wdir)?;

    fs::rename(legacy_db, wdir.join("world.db"))?;

    for (src_name, dst_name) in [
        ("media", "media"),
        ("sheetTemplates", "sheetTemplates"),
        ("savedSheets", "savedSheets"),
    ] {
        let src = app_dir.join(src_name);
        if src.exists() {
            fs::rename(src, wdir.join(dst_name))?;
        }
    }

    let paths = world_paths(app_dir, &world_id);
    ensure_world_dirs(&paths, DEFAULT_PDF_BYTES)?;

    Ok(WorldEntry {
        id: world_id,
        name: "Il Mio Mondo".to_string(),
        created_at: now_stamp(),
    })
}

/// Carica il registro dei mondi da disco, oppure lo crea al primo avvio:
/// migra un'installazione a mondo singolo pre-esistente se presente, altrimenti
/// crea un mondo vuoto.
pub fn bootstrap_registry(app_dir: &Path) -> WorldRegistry {
    if let Some(registry) = load_registry(app_dir) {
        return registry;
    }

    let legacy_db = app_dir.join("worldbuilder.db");
    let entry = if legacy_db.exists() {
        migrate_legacy_world(app_dir, &legacy_db)
    } else {
        create_fresh_world(app_dir, "Il Mio Mondo")
    }
    .expect("Errore durante l'inizializzazione del registro dei mondi");

    let registry = WorldRegistry {
        active_world_id: entry.id.clone(),
        worlds: vec![entry],
    };

    save_registry(app_dir, &registry).ok();
    registry
}
