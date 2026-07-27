pub mod maps;
pub mod wiki;
pub mod characters;

pub fn register_commands() -> impl Fn(tauri::ipc::Invoke) -> bool {
    tauri::generate_handler![
        // Comandi Wiki
        wiki::save_image,
        wiki::save_article,
        wiki::get_all_articles,
        wiki::search_wiki,
        wiki::get_article_by_id,
        wiki::delete_article,
        wiki::get_character_sheet_id_by_article,
        wiki::get_map_id_by_article,
        // Comandi Mappe
        maps::delete_map,
        maps::update_map,
        maps::save_map,
        maps::get_all_maps,
        maps::get_map_details,
        maps::add_portal,
        maps::delete_portal,
        // Characters & Systems
        characters::commands::get_game_systems,
        characters::commands::save_game_system,
        characters::commands::delete_game_system,
        characters::commands::get_character_sheets,
        characters::commands::save_character_sheet,
        characters::commands::save_character_pdf,
        characters::commands::delete_character_sheet,
        characters::commands::export_character_pdf,
        characters::commands::load_sheet_pdf_bytes,
        characters::commands::upload_pdf_template
    ]
}