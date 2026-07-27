use uuid::Uuid;
use tauri::State;
use crate::services::{DbState, AppPaths, save_image};
use crate::db::delete_image_if_unused;
use crate::utils::ResultExt;
use super::models::{MapPortal, MapWithPortals, MapMeta};

#[tauri::command]
pub fn delete_map(
    state: State<'_, DbState>,
    paths: State<'_, AppPaths>,
    id: String,
) -> Result<(), String> {
    let conn = state.0.lock().map_str()?;

    // 1. Controlla che non sia l'ultima mappa rimasta
    let total_maps: i64 = conn
        .query_row("SELECT COUNT(*) FROM maps", [], |row| row.get(0))
        .map_str()?;

    if total_maps <= 1 {
        return Err("Impossibile eliminare l'unica mappa rimanente. È richiesta almeno una mappa di livello globale.".to_string());
    }

    // 2. Recupera l'immagine ed elimina il record
    let image_path: Option<String> = conn
        .query_row("SELECT image_path FROM maps WHERE id = ?1", [&id], |row| row.get(0))
        .ok();

    conn.execute("DELETE FROM maps WHERE id = ?1", [&id]).map_str()?;

    // 3. Cancella l'immagine se non è usata altrove
    if let Some(path) = image_path {
        delete_image_if_unused(&conn, &paths.media_dir, &path);
    }

    Ok(())
}

#[tauri::command]
pub fn update_map(
    state: State<'_, DbState>,
    paths: State<'_, AppPaths>,
    id: String,
    title: String,
    image_path: Option<String>,
    parent_map_id: Option<String>,
    article_id: Option<String>,
    width: Option<u32>,
    height: Option<u32>,
) -> Result<(), String> {
    let conn = state.0.lock().map_str()?;

    let old_image_path: Option<String> = conn
        .query_row("SELECT image_path FROM maps WHERE id = ?1", [&id], |row| row.get(0))
        .ok();

    let stored_path = match &image_path {
        Some(path) => Some(save_image(&paths, path)?),
        None => None,
    };

    conn.execute(
        "UPDATE maps 
         SET title = ?1, 
             image_path = COALESCE(?2, image_path), 
             parent_map_id = ?3, 
             article_id = ?4, 
             width = COALESCE(?5, width), 
             height = COALESCE(?6, height) 
         WHERE id = ?7",
        (&title, &stored_path, &parent_map_id, &article_id, &width, &height, &id),
    ).map_str()?;

    if let (Some(old_path), Some(new_path)) = (old_image_path, stored_path) {
        if old_path != new_path {
            delete_image_if_unused(&conn, &paths.media_dir, &old_path);
        }
    }

    Ok(())
}

#[tauri::command]
pub fn save_map(
    state: State<'_, DbState>,
    paths: State<'_, AppPaths>,
    title: String,
    image_path: String,
    parent_map_id: Option<String>,
    article_id: Option<String>,
    width: u32,
    height: u32,
) -> Result<String, String> {
    let id = Uuid::new_v4().to_string();
    let stored_path = save_image(&paths, &image_path)?;

    let conn = state.0.lock().map_str()?;
    conn.execute(
        "INSERT INTO maps (id, title, image_path, parent_map_id, article_id, width, height)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        (&id, &title, &stored_path, &parent_map_id, &article_id, &width, &height),
    ).map_str()?;

    Ok(id)
}

#[tauri::command]
pub fn get_all_maps(state: State<'_, DbState>) -> Result<Vec<MapMeta>, String> {
    let conn = state.0.lock().map_str()?;
    let mut stmt = conn
        .prepare("SELECT id, title, image_path, parent_map_id, article_id, width, height FROM maps ORDER BY title ASC")
        .map_str()?;

    let maps = stmt
        .query_map([], |row| {
            Ok(MapMeta {
                id: row.get(0)?,
                title: row.get(1)?,
                image_path: row.get(2)?,
                parent_map_id: row.get(3)?,
                article_id: row.get(4)?,
                width: row.get(5)?,
                height: row.get(6)?,
            })
        })
        .map_str()?
        .collect::<Result<Vec<_>, _>>()
        .map_str()?;

    Ok(maps)
}

#[tauri::command]
pub fn get_map_details(state: State<'_, DbState>, id: String) -> Result<MapWithPortals, String> {
    let conn = state.0.lock().map_str()?;

    let map = conn
        .query_row(
            "SELECT id, title, image_path, parent_map_id, article_id, width, height FROM maps WHERE id = ?1",
            [&id],
            |row| {
                Ok(MapMeta {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    image_path: row.get(2)?,
                    parent_map_id: row.get(3)?,
                    article_id: row.get(4)?,
                    width: row.get(5)?,
                    height: row.get(6)?,
                })
            },
        )
        .map_str()?;

    let mut portal_stmt = conn
        .prepare("SELECT id, source_map_id, target_map_id, article_id, x, y, label FROM map_portals WHERE source_map_id = ?1")
        .map_str()?;

    let portals = portal_stmt
        .query_map([&id], |row| {
            Ok(MapPortal {
                id: row.get(0)?,
                source_map_id: row.get(1)?,
                target_map_id: row.get(2)?,
                target_article_id: row.get(3)?,
                x: row.get(4)?,
                y: row.get(5)?,
                label: row.get(6)?,
            })
        })
        .map_str()?
        .collect::<Result<Vec<_>, _>>()
        .map_str()?;

    Ok(MapWithPortals { map, portals })
}

#[tauri::command]
pub fn add_portal(
    state: State<'_, DbState>,
    source_map_id: String,
    target_map_id: String,
    x: f64,
    y: f64,
    label: Option<String>,
) -> Result<String, String> {
    let conn = state.0.lock().map_str()?;
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO map_portals (id, source_map_id, target_map_id, x, y, label) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        (&id, &source_map_id, &target_map_id, &x, &y, &label),
    ).map_str()?;

    Ok(id)
}

#[tauri::command]
pub fn delete_portal(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_str()?;
    conn.execute("DELETE FROM map_portals WHERE id = ?1", [&id]).map_str()?;
    Ok(())
}