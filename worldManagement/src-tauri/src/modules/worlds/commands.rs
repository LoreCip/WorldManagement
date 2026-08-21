use super::fs::{
    ensure_world_dirs, now_stamp, open_world_db, save_registry, world_dir, world_paths,
    DEFAULT_PDF_BYTES,
};
use super::models::WorldInfo;
use crate::services::{AppPathsState, DbState, WorldEntry, WorldRegistry, WorldsState};
use crate::utils::ResultExt;
use tauri::State;
use uuid::Uuid;

fn list_infos(registry: &WorldRegistry) -> Vec<WorldInfo> {
    registry
        .worlds
        .iter()
        .map(|e| WorldInfo::from_entry(e, &registry.active_world_id))
        .collect()
}

#[tauri::command]
pub fn list_worlds(worlds: State<'_, WorldsState>) -> Result<Vec<WorldInfo>, String> {
    let registry = worlds.registry.lock().map_str()?;
    Ok(list_infos(&registry))
}

#[tauri::command]
pub fn get_active_world(worlds: State<'_, WorldsState>) -> Result<WorldInfo, String> {
    let registry = worlds.registry.lock().map_str()?;
    registry
        .worlds
        .iter()
        .find(|e| e.id == registry.active_world_id)
        .map(|e| WorldInfo::from_entry(e, &registry.active_world_id))
        .ok_or_else(|| "Nessun mondo attivo trovato.".to_string())
}

/// Apre il db + risolve i path del mondo `world_id` e li installa come stato
/// attivo dell'app (sostituendo connessione e cartelle correnti).
fn swap_active_world(
    world_id: &str,
    worlds: &State<'_, WorldsState>,
    db_state: &State<'_, DbState>,
    paths_state: &State<'_, AppPathsState>,
) -> Result<(), String> {
    let wdir = world_dir(&worlds.app_dir, world_id);
    let paths = world_paths(&worlds.app_dir, world_id);
    ensure_world_dirs(&paths, DEFAULT_PDF_BYTES).map_str()?;
    let conn = open_world_db(&wdir)?;

    *db_state.0.lock().map_str()? = conn;
    *paths_state.0.lock().map_str()? = paths;

    Ok(())
}

#[tauri::command]
pub fn create_world(
    name: String,
    worlds: State<'_, WorldsState>,
    db_state: State<'_, DbState>,
    paths_state: State<'_, AppPathsState>,
) -> Result<WorldInfo, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Il nome del mondo non può essere vuoto.".to_string());
    }

    let new_id = Uuid::new_v4().to_string();
    let entry = WorldEntry {
        id: new_id.clone(),
        name: trimmed.to_string(),
        created_at: now_stamp(),
    };

    swap_active_world(&new_id, &worlds, &db_state, &paths_state)?;

    let mut registry = worlds.registry.lock().map_str()?;
    registry.worlds.push(entry);
    registry.active_world_id = new_id.clone();
    save_registry(&worlds.app_dir, &registry).map_str()?;

    Ok(WorldInfo::from_entry(
        registry.worlds.iter().find(|e| e.id == new_id).unwrap(),
        &registry.active_world_id,
    ))
}

#[tauri::command]
pub fn switch_world(
    id: String,
    worlds: State<'_, WorldsState>,
    db_state: State<'_, DbState>,
    paths_state: State<'_, AppPathsState>,
) -> Result<WorldInfo, String> {
    {
        let registry = worlds.registry.lock().map_str()?;
        if !registry.worlds.iter().any(|e| e.id == id) {
            return Err("Mondo non trovato.".to_string());
        }
    }

    swap_active_world(&id, &worlds, &db_state, &paths_state)?;

    let mut registry = worlds.registry.lock().map_str()?;
    registry.active_world_id = id.clone();
    save_registry(&worlds.app_dir, &registry).map_str()?;

    Ok(WorldInfo::from_entry(
        registry.worlds.iter().find(|e| e.id == id).unwrap(),
        &registry.active_world_id,
    ))
}

#[tauri::command]
pub fn rename_world(
    id: String,
    name: String,
    worlds: State<'_, WorldsState>,
) -> Result<WorldInfo, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Il nome del mondo non può essere vuoto.".to_string());
    }

    let mut registry = worlds.registry.lock().map_str()?;
    let entry = registry
        .worlds
        .iter_mut()
        .find(|e| e.id == id)
        .ok_or_else(|| "Mondo non trovato.".to_string())?;
    entry.name = trimmed.to_string();
    save_registry(&worlds.app_dir, &registry).map_str()?;

    Ok(WorldInfo::from_entry(
        registry.worlds.iter().find(|e| e.id == id).unwrap(),
        &registry.active_world_id,
    ))
}

#[tauri::command]
pub fn delete_world(id: String, worlds: State<'_, WorldsState>) -> Result<Vec<WorldInfo>, String> {
    let mut registry = worlds.registry.lock().map_str()?;

    if registry.worlds.len() <= 1 {
        return Err("Impossibile eliminare l'unico mondo rimanente.".to_string());
    }
    if registry.active_world_id == id {
        return Err("Impossibile eliminare il mondo attualmente attivo.".to_string());
    }
    if !registry.worlds.iter().any(|e| e.id == id) {
        return Err("Mondo non trovato.".to_string());
    }

    registry.worlds.retain(|e| e.id != id);
    save_registry(&worlds.app_dir, &registry).map_str()?;

    let wdir = world_dir(&worlds.app_dir, &id);
    let _ = std::fs::remove_dir_all(wdir);

    Ok(list_infos(&registry))
}
