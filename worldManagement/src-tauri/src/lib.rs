pub mod db;
pub mod modules;
pub mod services;
pub mod utils;

use modules::worlds::fs::{bootstrap_registry, ensure_world_dirs, open_world_db, world_dir, world_paths, DEFAULT_PDF_BYTES};
use services::{AppPathsState, DbState, WorldsState};
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default();

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        builder = builder
            .plugin(tauri_plugin_updater::Builder::new().build())
            .plugin(tauri_plugin_process::init());
    }

    builder
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let app_dir = app.path().app_data_dir().expect("Errore app_data_dir");
            std::fs::create_dir_all(&app_dir).ok();

            // Registro dei mondi: al primo avvio migra un'installazione a
            // mondo singolo pre-esistente (se presente) o ne crea una vuota.
            let registry = bootstrap_registry(&app_dir);
            let active_id = registry.active_world_id.clone();

            let paths = world_paths(&app_dir, &active_id);
            ensure_world_dirs(&paths, DEFAULT_PDF_BYTES).expect("Errore creazione cartelle mondo");

            let conn =
                open_world_db(&world_dir(&app_dir, &active_id)).expect("Errore apertura DB");

            app.manage(AppPathsState(Mutex::new(paths)));
            app.manage(DbState(Mutex::new(conn)));
            app.manage(WorldsState {
                app_dir,
                registry: Mutex::new(registry),
            });

            Ok(())
        })
        .invoke_handler(modules::register_commands())
        .run(tauri::generate_context!())
        .expect("Errore durante l'esecuzione dell'app Tauri");
}
