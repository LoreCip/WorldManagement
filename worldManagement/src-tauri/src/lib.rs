use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::Manager;
use uuid::Uuid;

// Mantiene lo stato della connessione al Database
pub struct DbState(pub Mutex<Connection>);

// Struttura che rappresenta un articolo nella documentazione
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

fn init_database(conn: &Connection) -> Result<(), rusqlite::Error> {
    // Attiva le relazioni tra tabelle (Foreign Keys)
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;

    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS wiki_articles (
            id TEXT PRIMARY KEY NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'Generale',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Tabella Full-Text Search (FTS5) per ricerche velocissime
        CREATE VIRTUAL TABLE IF NOT EXISTS wiki_fts USING fts5(
            title,
            content,
            category,
            content='wiki_articles',
            content_rowid='rowid'
        );

        -- Triggers per sincronizzare automaticamente l'indice FTS5
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

        -- Tabella per memorizzare i tag unici
        CREATE TABLE IF NOT EXISTS tags (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT UNIQUE NOT NULL
        );

        -- Tabella di collegamento tra Articoli e Tag
        CREATE TABLE IF NOT EXISTS article_tags (
            article_id TEXT REFERENCES wiki_articles(id) ON DELETE CASCADE,
            tag_id TEXT REFERENCES tags(id) ON DELETE CASCADE,
            PRIMARY KEY (article_id, tag_id)
            );
        "
    )?;

    Ok(())
}

#[tauri::command]
fn save_article(
    state: tauri::State<'_, DbState>,
    mut article: Article,
) -> Result<String, String> {
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;

    if article.meta.id.trim().is_empty() {
        article.meta.id = Uuid::new_v4().to_string();
    }

    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    // 1. Salva l'articolo
    tx.execute(
        "INSERT OR REPLACE INTO wiki_articles (id, title, content, category, updated_at) 
         VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP)",
        (
            &article.meta.id,
            &article.meta.title,
            &article.content,
            &article.meta.category,
        ),
    ).map_err(|e| e.to_string())?;

    // 2. Rimuovi i vecchi tag associati a questo articolo
    tx.execute("DELETE FROM article_tags WHERE article_id = ?1", [&article.meta.id])
              .map_err(|e| e.to_string())?;

    // 3. Inserisci i nuovi tag
    for tag_name in &article.tags {
        let tag_name_clean = tag_name.trim().to_lowercase();
        if tag_name_clean.is_empty() { continue; }

        let tag_id = Uuid::new_v4().to_string();

        // Inserisci il tag se non esiste già
        let _ = tx.execute(
            "INSERT OR IGNORE INTO tags (id, name) VALUES (?1, ?2)",
            (&tag_id, &tag_name_clean),
        );

        // Collega il tag all'articolo
        tx.execute(
            "INSERT OR IGNORE INTO article_tags (article_id, tag_id) 
             SELECT ?1, id FROM tags WHERE name = ?2",
            (&article.meta.id, &tag_name_clean),
        ).map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;

    Ok(article.meta.id)
}

// Command: Ottieni tutti gli articoli per la barra laterale
#[tauri::command]
fn get_all_articles(state: tauri::State<'_, DbState>) -> Result<Vec<SearchResultItem>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, title, category, SUBSTR(content, 1, 100) 
                  FROM wiki_articles 
                  ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(SearchResultItem {
                meta: ArticleMeta {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    category: row.get(2)?,
                },
                snippet: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let list = rows.filter_map(Result::ok).collect();
    Ok(list)
}

// Command: Ricerca Full-Text (FTS5)
#[tauri::command]
fn search_wiki(
    state: tauri::State<'_, DbState>,
    query: String,
) -> Result<Vec<SearchResultItem>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare(
        "SELECT a.id, a.title, a.category, snippet(wiki_fts, 1, '<mark>', '</mark>', '...', 15) as snippet
         FROM wiki_fts f
         JOIN wiki_articles a ON f.rowid = a.rowid
         WHERE wiki_fts MATCH ?1
         ORDER BY rank
         LIMIT 30"
    ).map_err(|e| e.to_string())?;

    let fts_query = format!("{}*", query);
    let rows = stmt.query_map([&fts_query], |row| {
        Ok(SearchResultItem {
                meta: ArticleMeta {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    category: row.get(2)?,
                },
                snippet: row.get(3)?,
        })
    }).map_err(|e| e.to_string())?;

    let list = rows.filter_map(Result::ok).collect();
    Ok(list)
}

// Command: Carica un articolo singolo per ID
#[tauri::command]
fn get_article_by_id(state: tauri::State<'_, DbState>, id: String) -> Result<Article, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    // Legge l'articolo
    let mut stmt = conn
        .prepare("SELECT id, title, content, category FROM wiki_articles WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    let mut article = stmt
        .query_row([&id], |row| {
            Ok(Article {
                meta: ArticleMeta {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    category: row.get(3)?,
                },
                content: row.get(2)?,
                tags: vec![],
            })
        })
        .map_err(|e| e.to_string())?;

    // Recupera tutti i tag associati
    let mut tag_stmt = conn
        .prepare("SELECT t.name FROM tags t JOIN article_tags at ON t.id = at.tag_id WHERE at.article_id = ?1")
        .map_err(|e| e.to_string())?;

    let tag_rows = tag_stmt
        .query_map([&id], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?;

    for tag in tag_rows {
        if let Ok(t) = tag {
            article.tags.push(t);
        }
    }

    Ok(article)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // 1. Trova o crea la cartella dei dati dell'app su Linux (~/.local/share/...)
            let app_dir = app.path().app_data_dir().expect("Impossibile trovare app_data_dir");
            std::fs::create_dir_all(&app_dir).ok();
            let db_path = app_dir.join("worldbuilder.db");
            
            // 2. Apre il database ed esegue init_database
            let conn = Connection::open(db_path).expect("Errore apertura DB");
            init_database(&conn).expect("Errore inizializzazione DB");

            // 3. Rende la connessione DB disponibile a tutti i comandi Tauri
            app.manage(DbState(Mutex::new(conn)));
            Ok(())
        })
        // 4. Registra i comandi che React ha il permesso di chiamare
        .invoke_handler(tauri::generate_handler![
            save_article,
            get_all_articles,
            search_wiki,
            get_article_by_id
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}