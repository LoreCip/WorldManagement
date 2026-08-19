pub mod db;
pub mod modules;
pub mod services;
pub mod utils;

use db::{ensure_default_game_systems_exist, init_database};

use rusqlite::Connection;
use services::{AppPaths, DbState};
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

            let media_dir = app_dir.join("media");
            std::fs::create_dir_all(&media_dir).ok();

            let templates_dir = app_dir.join("sheetTemplates");
            std::fs::create_dir_all(&templates_dir).ok();

            let sheets_dir = app_dir.join("savedSheets");
            std::fs::create_dir_all(&sheets_dir).ok();

            // Copia PDF di default se assente
            let target_pdf = templates_dir.join("DnD_5E_pg.pdf");
            if !target_pdf.exists() {
                const DEFAULT_PDF_BYTES: &[u8] =
                    include_bytes!("../../sheetTemplates/DnD_5E_pg.pdf");
                let _ = std::fs::write(&target_pdf, DEFAULT_PDF_BYTES);
            }

            // Inizializzazione DB
            let db_path = app_dir.join("worldbuilder.db");
            let conn = Connection::open(db_path).expect("Errore apertura DB");

            init_database(&conn).expect("Errore inizializzazione DB");
            ensure_default_game_systems_exist(&conn).ok(); // <-- Corretto: 1 solo argomento!

            app.manage(AppPaths {
                media_dir,
                templates_dir,
                sheets_dir,
            }); // <-- Corretto: incluso sheets_dir!
            app.manage(DbState(Mutex::new(conn)));

            Ok(())
        })
        .invoke_handler(modules::register_commands())
        .run(tauri::generate_context!())
        .expect("Errore durante l'esecuzione dell'app Tauri");
}
