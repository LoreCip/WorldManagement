use crate::modules::characters::models::*;
use crate::services::AppPaths;
use crate::services::AppPathsState;
use crate::services::DbState;
use crate::utils::ResultExt;

use std::fs;
use std::path::PathBuf;
use tauri::ipc::Response;
use tauri::State;
use uuid::Uuid;

/// Rifiuta valori che potrebbero alterare la posizione di un path costruito a partire
/// da un argomento IPC (separatori di percorso, ".." o valori vuoti).
fn sanitize_path_component(value: &str, field_name: &str) -> Result<(), String> {
    if value.is_empty() || value == "." || value == ".." || value.contains('/') || value.contains('\\')
    {
        return Err(format!("Valore non valido per '{}'.", field_name));
    }
    Ok(())
}

/// Riduce un nome file arbitrario al solo componente "file name", scartando
/// qualunque parte di percorso (protegge da path traversal via "../").
fn sanitize_filename(value: &str, field_name: &str) -> Result<PathBuf, String> {
    let name = std::path::Path::new(value)
        .file_name()
        .ok_or_else(|| format!("Valore non valido per '{}'.", field_name))?;
    Ok(PathBuf::from(name))
}

/// Risolve il path del PDF compilato salvato per una scheda+variante.
/// Ordine di ricerca: "<id>_<variant>.pdf" -> (solo se variant == "pg") "<id>.pdf" legacy -> None.
fn resolve_saved_pdf_path(
    paths: &AppPaths,
    sheet_id: &str,
    variant: &str,
) -> Result<Option<PathBuf>, String> {
    sanitize_path_component(sheet_id, "sheet_id")?;
    sanitize_path_component(variant, "variant")?;

    let variant_path = paths
        .sheets_dir
        .join(format!("{}_{}.pdf", sheet_id, variant));
    if variant_path.exists() {
        return Ok(Some(variant_path));
    }

    if variant == "pg" {
        let legacy_path = paths.sheets_dir.join(format!("{}.pdf", sheet_id));
        if legacy_path.exists() {
            return Ok(Some(legacy_path));
        }
    }

    Ok(None)
}

// ==========================================
// PDF MANAGEMENT COMMANDS
// ==========================================

#[tauri::command]
pub async fn load_sheet_pdf_bytes(
    sheet_id: String,
    variant: String,
    template_filename: String,
    paths_state: State<'_, AppPathsState>,
) -> Result<Response, String> {
    let paths = paths_state.0.lock().map_str()?.clone();
    // 1. Prova prima a cercare il PDF specifico salvato per questa scheda+variante
    // 2. Se non esiste, fallback sul file predefinito per il sistema di gioco
    let target_path = match resolve_saved_pdf_path(&paths, &sheet_id, &variant)? {
        Some(p) => p,
        None => {
            let safe_template = sanitize_filename(&template_filename, "template_filename")?;
            paths.templates_dir.join(safe_template)
        }
    };

    if !target_path.exists() {
        return Err(format!(
            "Impossibile trovare sia il PDF della scheda che il template di default in: {:?}",
            target_path
        ));
    }

    // 3. Ritorna i byte grezzi del file: bypassa la serializzazione JSON
    // (che per un Vec<u8> lo trasformerebbe in un enorme array di numeri).
    let bytes = fs::read(&target_path)
        .map_err(|e| format!("Errore durante la lettura del file PDF: {}", e))?;

    Ok(Response::new(bytes))
}

#[tauri::command]
pub fn save_character_pdf(
    sheet_id: String,
    variant: String,
    pdf_bytes: Vec<u8>,
    paths_state: State<'_, AppPathsState>,
) -> Result<bool, String>  {
    let paths = paths_state.0.lock().map_str()?.clone();
    sanitize_path_component(&sheet_id, "sheet_id")?;
    sanitize_path_component(&variant, "variant")?;

    if !paths.sheets_dir.exists() {
        fs::create_dir_all(&paths.sheets_dir)
            .map_err(|e| format!("Impossibile creare la cartella savedSheets: {}", e))?;
    }

    let file_path = paths
        .sheets_dir
        .join(format!("{}_{}.pdf", sheet_id, variant));
    fs::write(&file_path, pdf_bytes)
        .map_err(|e| format!("Impossibile salvare il PDF in locale: {}", e))?;

    Ok(true)
}

#[tauri::command]
pub fn export_character_pdf(
    sheet_id: String,
    variant: String,
    template_filename: String,
    output_path: String,
    paths_state: State<'_, AppPathsState>,
) -> Result<(), String> {
    let paths = paths_state.0.lock().map_str()?.clone();
    let source_path = match resolve_saved_pdf_path(&paths, &sheet_id, &variant)? {
        Some(p) => p,
        None => {
            let safe_template = sanitize_filename(&template_filename, "template_filename")?;
            paths.templates_dir.join(safe_template)
        }
    };

    if !source_path.exists() {
        return Err(format!(
            "File sorgente PDF non trovato in '{:?}'",
            source_path
        ));
    }

    fs::copy(&source_path, &output_path)
        .map_err(|e| format!("Errore durante l'esportazione del file PDF: {}", e))?;

    Ok(())
}

// ==========================================
// GAME SYSTEMS COMMANDS
// ==========================================

#[tauri::command]
pub fn get_game_systems(state: State<'_, DbState>) -> Result<Vec<GameSystem>, String> {
    let conn = state.0.lock().map_str()?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, description, schema_json, markdown_template, is_builtin, created_at, updated_at
             FROM game_systems
             ORDER BY name ASC",
        )
        .map_str()?;

    let systems = stmt
        .query_map([], |row| {
            let is_builtin_int: i32 = row.get(5)?;
            Ok(GameSystem {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                schema_json: row.get(3)?,
                markdown_template: row.get(4)?,
                is_builtin: is_builtin_int == 1,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_str()?
        .collect::<Result<Vec<_>, _>>()
        .map_str()?;

    Ok(systems)
}

#[tauri::command]
pub fn save_game_system(
    payload: SaveGameSystemPayload,
    state: State<'_, DbState>,
) -> Result<String, String> {
    let conn = state.0.lock().map_str()?;
    let name_trimmed = payload.name.trim();

    if name_trimmed.is_empty() {
        return Err("Il nome del sistema di gioco non può essere vuoto.".into());
    }

    // 1. Controllo duplicati sul nome (case-insensitive)
    let duplicate_count: i64 = match &payload.id {
        Some(existing_id) => conn
            .query_row(
                "SELECT COUNT(*) FROM game_systems WHERE LOWER(name) = LOWER(?1) AND id != ?2",
                [name_trimmed, existing_id],
                |row| row.get(0),
            )
            .unwrap_or(0),
        None => conn
            .query_row(
                "SELECT COUNT(*) FROM game_systems WHERE LOWER(name) = LOWER(?1)",
                [name_trimmed],
                |row| row.get(0),
            )
            .unwrap_or(0),
    };

    if duplicate_count > 0 {
        return Err(format!(
            "Un sistema di gioco chiamato '{}' esiste già.",
            name_trimmed
        ));
    }

    // 2. Inserimento o Modifica
    match payload.id {
        Some(id) => {
            // Controlla se si sta cercando di modificare un sistema predefinito protetto
            let is_builtin: i32 = conn
                .query_row(
                    "SELECT is_builtin FROM game_systems WHERE id = ?1",
                    [&id],
                    |row| row.get(0),
                )
                .map_err(|_| "Sistema non trovato.".to_string())?;

            if is_builtin == 1 {
                return Err("Impossibile modificare un sistema di gioco predefinito.".into());
            }

            conn.execute(
                "UPDATE game_systems 
                 SET name = ?1, description = ?2, schema_json = ?3, markdown_template = ?4, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?5",
                (
                    name_trimmed,
                    &payload.description,
                    &payload.schema_json,
                    &payload.markdown_template,
                    &id,
                ),
            ).map_err(|e| format!("Errore durante l'aggiornamento del sistema: {}", e))?;

            Ok(id)
        }
        None => {
            let new_id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO game_systems (id, name, description, schema_json, markdown_template, is_builtin)
                 VALUES (?1, ?2, ?3, ?4, ?5, 0)",
                (
                    &new_id,
                    name_trimmed,
                    &payload.description,
                    &payload.schema_json,
                    &payload.markdown_template,
                ),
            ).map_err(|e| format!("Errore nel salvataggio del nuovo sistema: {}", e))?;

            Ok(new_id)
        }
    }
}

#[tauri::command]
pub fn delete_game_system(
    id: String,
    state: State<'_, DbState>,
    paths_state: State<'_, AppPathsState>,
) -> Result<(), String> {
    let paths = paths_state.0.lock().map_str()?.clone();
    let conn = state.0.lock().map_str()?;

    // 1. Verifica che non sia un sistema di sistema/builtin
    let (is_builtin, schema_json): (i32, String) = conn
        .query_row(
            "SELECT is_builtin, schema_json FROM game_systems WHERE id = ?1",
            [&id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|_| "Sistema di gioco non trovato.".to_string())?;

    if is_builtin == 1 {
        return Err("Impossibile eliminare un sistema di gioco predefinito.".into());
    }

    // 2. Controllo se ci sono schede collegate a questo sistema
    let sheet_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM character_sheets WHERE system_id = ?1",
            [&id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if sheet_count > 0 {
        return Err(format!(
            "Impossibile eliminare il sistema: ci sono {} schede di personaggi collegate ad esso. Elimina prima le schede associate.",
            sheet_count
        ));
    }

    // 3. Elimina il record dal DB
    conn.execute("DELETE FROM game_systems WHERE id = ?1", [&id])
        .map_err(|e| format!("Errore nell'eliminazione del sistema dal database: {}", e))?;

    // 4. Pulizia automatica file PDF template se non è più usato da altri sistemi
    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&schema_json) {
        let mut pdf_files = Vec::new();
        if let Some(pg) = parsed.get("pdf_template_pg").and_then(|v| v.as_str()) {
            pdf_files.push(pg);
        }
        if let Some(png) = parsed.get("pdf_template_png").and_then(|v| v.as_str()) {
            pdf_files.push(png);
        }
        if let Some(def) = parsed.get("pdf_template").and_then(|v| v.as_str()) {
            pdf_files.push(def);
        }

        for pdf_name in pdf_files {
            let usage_count: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM game_systems WHERE schema_json LIKE ?1",
                    [format!("%{}%", pdf_name)],
                    |row| row.get(0),
                )
                .unwrap_or(0);

            // Non eliminare i PDF di default forniti con l'app
            if usage_count == 0 && pdf_name != "5E_CharacterSheet_Fillable.pdf" {
                let template_path = paths.templates_dir.join(pdf_name);
                if template_path.exists() {
                    let _ = fs::remove_file(template_path);
                }
            }
        }
    }

    Ok(())
}

// ==========================================
// CHARACTER SHEETS COMMANDS
// ==========================================

#[tauri::command]
pub fn get_character_sheets(state: State<'_, DbState>) -> Result<Vec<CharacterSheet>, String> {
    let conn = state.0.lock().map_str()?;
    let mut stmt = conn
        .prepare(
            "SELECT id, system_id, article_id, name, data_json, sheet_variant, created_at, updated_at
             FROM character_sheets 
             ORDER BY name ASC",
        )
        .map_str()?;

    let sheets = stmt
        .query_map([], |row| {
            Ok(CharacterSheet {
                id: row.get(0)?,
                system_id: row.get(1)?,
                article_id: row.get(2)?,
                name: row.get(3)?,
                data_json: row.get(4)?,
                sheet_variant: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_str()?
        .collect::<Result<Vec<_>, _>>()
        .map_str()?;

    Ok(sheets)
}

#[tauri::command]
pub fn save_character_sheet(
    payload: SaveCharacterSheetPayload,
    state: State<'_, DbState>,
) -> Result<String, String> {
    let conn = state.0.lock().map_str()?;

    let sheet_id = payload.id.unwrap_or_else(|| Uuid::new_v4().to_string());

    conn.execute(
        "INSERT INTO character_sheets (id, system_id, article_id, name, data_json, sheet_variant, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET
            system_id = excluded.system_id,
            article_id = excluded.article_id,
            name = excluded.name,
            data_json = excluded.data_json,
            sheet_variant = excluded.sheet_variant,
            updated_at = CURRENT_TIMESTAMP",
        (
            &sheet_id,
            &payload.system_id,
            &payload.article_id,
            &payload.name,
            &payload.data_json,
            &payload.sheet_variant,
        ),
    )
    .map_err(|e| format!("Errore nel salvataggio della scheda: {}", e))?;

    Ok(sheet_id)
}

#[tauri::command]
pub fn delete_character_sheet(
    id: String,
    state: State<'_, DbState>,
    paths_state: State<'_, AppPathsState>,
) -> Result<(), String> {
    sanitize_path_component(&id, "id")?;

    let paths = paths_state.0.lock().map_str()?.clone();
    let conn = state.0.lock().map_str()?;
    conn.execute("DELETE FROM character_sheets WHERE id = ?1", [&id])
        .map_err(|e| format!("Errore nell'eliminazione della scheda: {}", e))?;

    // Cancella tutti i PDF salvati su disco per questa scheda: entrambe le varianti
    // più l'eventuale file legacy senza suffisso (schede create prima delle varianti PG/PNG).
    let candidate_paths = [
        paths.sheets_dir.join(format!("{}_pg.pdf", id)),
        paths.sheets_dir.join(format!("{}_png.pdf", id)),
        paths.sheets_dir.join(format!("{}.pdf", id)),
    ];

    for p in candidate_paths.iter() {
        if p.exists() {
            if let Err(e) = fs::remove_file(p) {
                eprintln!(
                    "Attenzione: impossibile eliminare il PDF salvato {:?}: {}",
                    p, e
                );
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub fn upload_pdf_template(
    filename: String,
    pdf_bytes: Vec<u8>,
    paths_state: State<'_, AppPathsState>,
) -> Result<String, String> {
    let paths = paths_state.0.lock().map_str()?.clone();
    if !paths.templates_dir.exists() {
        fs::create_dir_all(&paths.templates_dir)
            .map_err(|e| format!("Impossibile creare la cartella sheetTemplates: {}", e))?;
    }

    let safe_name = std::path::Path::new(&filename)
        .file_name()
        .ok_or_else(|| "Nome file non valido".to_string())?
        .to_string_lossy()
        .to_string();

    let final_name = if safe_name.to_lowercase().ends_with(".pdf") {
        safe_name
    } else {
        format!("{}.pdf", safe_name)
    };

    let target_path = paths.templates_dir.join(&final_name);

    // Controllo duplicati sul file PDF (case-insensitive su FS)
    if target_path.exists() {
        return Err(format!(
            "Un file PDF denominato '{}' esiste già tra i template. Rinominare il file prima di caricarlo.",
            final_name
        ));
    }

    fs::write(&target_path, pdf_bytes)
        .map_err(|e| format!("Impossibile salvare il template PDF: {}", e))?;

    Ok(final_name)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitize_path_component_accepts_plain_ids() {
        assert!(sanitize_path_component("a1b2c3", "sheet_id").is_ok());
        assert!(sanitize_path_component("pg", "variant").is_ok());
    }

    #[test]
    fn sanitize_path_component_rejects_traversal_attempts() {
        assert!(sanitize_path_component("../../etc/passwd", "sheet_id").is_err());
        assert!(sanitize_path_component("..", "sheet_id").is_err());
        assert!(sanitize_path_component(".", "sheet_id").is_err());
        assert!(sanitize_path_component("", "sheet_id").is_err());
        assert!(sanitize_path_component("a/b", "sheet_id").is_err());
        assert!(sanitize_path_component("a\\b", "sheet_id").is_err());
    }

    #[test]
    fn sanitize_filename_strips_directory_components() {
        let result = sanitize_filename("../../secret.pdf", "template_filename").unwrap();
        assert_eq!(result, PathBuf::from("secret.pdf"));
    }

    #[test]
    fn sanitize_filename_rejects_values_with_no_file_name() {
        assert!(sanitize_filename("..", "template_filename").is_err());
        assert!(sanitize_filename("", "template_filename").is_err());
    }
}
