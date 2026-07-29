use tauri::State;
use crate::services::DbState;
use crate::utils::ResultExt;
use crate::modules::settings::models::SettingsMap;

#[tauri::command]
pub fn get_all_settings(state: State<'_, DbState>) -> Result<SettingsMap, String> {
    let conn = state.0.lock().map_str()?;
    let mut stmt = conn.prepare("SELECT key, value FROM app_settings").map_str()?;

    let map = stmt
        .query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))
        .map_str()?
        .filter_map(Result::ok)
        .collect();

    Ok(map)
}

#[tauri::command]
pub fn save_setting(
    state: State<'_, DbState>,
    key: String,
    value: String,
) -> Result<(), String> {
    let conn = state.0.lock().map_str()?;
    conn.execute(
        "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?1, ?2)",
        (&key, &value),
    ).map_str()?;
    Ok(())
}

#[tauri::command]
pub fn delete_setting(state: State<'_, DbState>, key: String) -> Result<(), String> {
    let conn = state.0.lock().map_str()?;
    conn.execute("DELETE FROM app_settings WHERE key = ?1", [&key]).map_str()?;
    Ok(())
}