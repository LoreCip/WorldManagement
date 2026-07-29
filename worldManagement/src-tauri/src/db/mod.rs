use rusqlite::Connection;
use uuid::Uuid;

pub fn init_database(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute_batch(
        "
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL
        );

        -- TABELLE WIKI
        CREATE TABLE IF NOT EXISTS wiki_articles (
            id TEXT PRIMARY KEY NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'Generale',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE VIRTUAL TABLE IF NOT EXISTS wiki_fts USING fts5(
            title,
            content,
            category,
            content='wiki_articles',
            content_rowid='rowid'
        );

        CREATE TRIGGER IF NOT EXISTS wiki_ai AFTER INSERT ON wiki_articles BEGIN
            INSERT INTO wiki_fts(rowid, title, content, category) VALUES (new.rowid, new.title, new.content, new.category);
        END;

        CREATE TRIGGER IF NOT EXISTS wiki_ad AFTER DELETE ON wiki_articles BEGIN
            INSERT INTO wiki_fts(wiki_fts, rowid, title, content, category) VALUES('delete', old.rowid, old.title, old.content, old.category);
        END;

        CREATE TRIGGER IF NOT EXISTS wiki_au AFTER UPDATE ON wiki_articles BEGIN
            INSERT INTO wiki_fts(wiki_fts, rowid, title, content, category) VALUES('delete', old.rowid, old.title, old.content, old.category);
            INSERT INTO wiki_fts(rowid, title, content, category) VALUES (new.rowid, new.title, new.content, new.category);
        END;

        CREATE TABLE IF NOT EXISTS tags (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT UNIQUE NOT NULL
        );

        CREATE TABLE IF NOT EXISTS article_tags (
            article_id TEXT REFERENCES wiki_articles(id) ON DELETE CASCADE,
            tag_id TEXT REFERENCES tags(id) ON DELETE CASCADE,
            PRIMARY KEY (article_id, tag_id)
        );

        -- TABELLE MAPPE
        CREATE TABLE IF NOT EXISTS maps (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            image_path TEXT NOT NULL,
            parent_map_id TEXT,
            article_id TEXT,
            width INTEGER DEFAULT 0,
            height INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(parent_map_id) REFERENCES maps(id) ON DELETE SET NULL,
            FOREIGN KEY(article_id) REFERENCES wiki_articles(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS map_portals (
            id TEXT PRIMARY KEY,
            source_map_id TEXT NOT NULL,
            target_map_id TEXT NOT NULL,
            article_id TEXT,
            x REAL NOT NULL,
            y REAL NOT NULL,
            label TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(source_map_id) REFERENCES maps(id) ON DELETE CASCADE,
            FOREIGN KEY(target_map_id) REFERENCES maps(id) ON DELETE CASCADE
        );

        -- TABELLE SCHEDE E MOTORI DI GIOCO
        CREATE TABLE IF NOT EXISTS game_systems (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            schema_json TEXT NOT NULL,
            markdown_template TEXT NOT NULL,
            is_builtin INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS character_sheets (
            id TEXT PRIMARY KEY NOT NULL,
            system_id TEXT NOT NULL,
            article_id TEXT,
            name TEXT NOT NULL,
            data_json TEXT NOT NULL DEFAULT '{}',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(system_id) REFERENCES game_systems(id) ON DELETE RESTRICT,
            FOREIGN KEY(article_id) REFERENCES wiki_articles(id) ON DELETE SET NULL
        );

        -- TABELLA TIMELINE
        CREATE TABLE IF NOT EXISTS timeline_categories (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT UNIQUE NOT NULL,
            color TEXT NOT NULL,
            icon TEXT NOT NULL DEFAULT '📌'
        );

        CREATE TABLE IF NOT EXISTS timeline_events (
            id TEXT PRIMARY KEY NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            time_value INTEGER NOT NULL,
            end_time_value INTEGER,
            precision TEXT NOT NULL DEFAULT 'day',
            article_id TEXT,
            map_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(article_id) REFERENCES wiki_articles(id) ON DELETE SET NULL,
            FOREIGN KEY(map_id) REFERENCES maps(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_timeline_events_time_value
            ON timeline_events(time_value);

        CREATE TABLE IF NOT EXISTS timeline_views (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            center_value INTEGER NOT NULL,
            pixels_per_day REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS campaign_settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            current_date_value INTEGER
        );

        CREATE TABLE IF NOT EXISTS timeline_eras (
            id TEXT PRIMARY KEY NOT NULL,
            label TEXT NOT NULL,
            start_value INTEGER NOT NULL,
            end_value INTEGER NOT NULL,
            color TEXT NOT NULL DEFAULT '#8a6fd1'
        );
        "
    )?;

    ensure_root_map_exists(conn)?;
    ensure_default_game_systems_exist(conn)?;
    ensure_sheet_variant_column_exists(conn)?;
    ensure_timeline_category_column_exists(conn)?;
    ensure_default_timeline_categories_exist(conn)?;
    ensure_campaign_settings_row_exists(conn)?;

    Ok(())
}

pub fn ensure_campaign_settings_row_exists(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute(
        "INSERT OR IGNORE INTO campaign_settings (id, current_date_value) VALUES (1, NULL)",
        [],
    )?;
    Ok(())
}

pub fn ensure_sheet_variant_column_exists(conn: &Connection) -> Result<(), rusqlite::Error> {
    let mut stmt = conn.prepare("PRAGMA table_info(character_sheets)")?;
    let column_exists = stmt
        .query_map([], |row| row.get::<_, String>(1))?
        .filter_map(|r| r.ok())
        .any(|col_name| col_name == "sheet_variant");

    if !column_exists {
        conn.execute(
            "ALTER TABLE character_sheets ADD COLUMN sheet_variant TEXT NOT NULL DEFAULT 'pg'",
            [],
        )?;
    }

    Ok(())
}

/// Migrazione: aggiunge category_id a timeline_events per i DB creati in fase 1.
/// Niente REFERENCES via ALTER TABLE (SQLite non la applica in modo affidabile
/// su tabelle già popolate) — stesso approccio "soft link" già usato per
/// map_portals.article_id.
pub fn ensure_timeline_category_column_exists(conn: &Connection) -> Result<(), rusqlite::Error> {
    let mut stmt = conn.prepare("PRAGMA table_info(timeline_events)")?;
    let column_exists = stmt
        .query_map([], |row| row.get::<_, String>(1))?
        .filter_map(|r| r.ok())
        .any(|col_name| col_name == "category_id");

    if !column_exists {
        conn.execute("ALTER TABLE timeline_events ADD COLUMN category_id TEXT", [])?;
    }

    Ok(())
}

/// Categorie predefinite alla prima creazione del DB (l'utente può rinominarle,
/// cambiarne colore/icona o eliminarle liberamente).
pub fn ensure_default_timeline_categories_exist(conn: &Connection) -> Result<(), rusqlite::Error> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM timeline_categories", [], |row| row.get(0))?;

    if count == 0 {
        let defaults = [
            ("Politica", "#8a6fd1", "👑"),
            ("Guerra", "#c0524a", "⚔️"),
            ("Nascita e Morte", "#5a9e6f", "🕯️"),
            ("Scoperta", "#4a90c0", "🔭"),
            ("Evento Naturale", "#c9a15a", "🌪️"),
        ];
        for (name, color, icon) in defaults {
            let id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO timeline_categories (id, name, color, icon) VALUES (?1, ?2, ?3, ?4)",
                (&id, name, color, icon),
            )?;
        }
    }

    Ok(())
}

pub fn is_image_referenced(conn: &Connection, filename: &str) -> bool {
    let like_pattern = format!("%{}%", filename);
    let count: i64 = conn
        .query_row(
            "SELECT (SELECT COUNT(*) FROM maps WHERE image_path LIKE ?1) + 
                    (SELECT COUNT(*) FROM wiki_articles WHERE content LIKE ?1)",
            [&like_pattern],
            |row| row.get(0),
        )
        .unwrap_or(0);

    count > 0
}

pub fn delete_image_if_unused(conn: &Connection, media_dir: &std::path::Path, path_or_filename: &str) {
    if let Some(filename) = std::path::Path::new(path_or_filename).file_name().map(|f| f.to_string_lossy()) {
        if !is_image_referenced(conn, &filename) {
            let file_path = media_dir.join(filename.as_ref());
            if let Err(e) = std::fs::remove_file(&file_path) {
                eprintln!("Attenzione: impossibile eliminare il file {}: {}", filename, e);
            }
        }
    }
}

pub fn ensure_root_map_exists(conn: &Connection) -> Result<(), rusqlite::Error> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM maps", [], |row| row.get(0))?;

    if count == 0 {
        let root_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO maps (id, title, image_path, parent_map_id, width, height)
             VALUES (?1, ?2, ?3, NULL, 1920, 1080)",
            (&root_id, "Mappa del Mondo", "placeholder_world.png"),
        )?;
    }

    Ok(())
}

pub fn ensure_default_game_systems_exist(conn: &Connection) -> Result<(), rusqlite::Error> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM game_systems", [], |row| row.get(0))?;

    if count == 0 {
        let dnd5e_id = Uuid::new_v4().to_string();

        let schema_json = serde_json::json!({
            "pdf_template": "DnD_5E_pg.pdf",
            "fields": []
        }).to_string();

        let markdown_template = "# {{name}}\n\nScheda Personaggio D&D 5e compilabile in PDF.";

        conn.execute(
            "INSERT INTO game_systems (id, name, description, schema_json, markdown_template, is_builtin)
             VALUES (?1, ?2, ?3, ?4, ?5, 1)",
            (
                &dnd5e_id,
                "D&D 5e (PDF Nativo)",
                "Scheda personaggio ufficiale D&D 5e in formato PDF interattivo",
                &schema_json,
                markdown_template,
            ),
        )?;
    }

    Ok(())
}