pub mod maps;
pub mod wiki;
pub mod characters;
pub mod timeline;
pub mod settings;
pub mod relations;

pub fn register_commands() -> impl Fn(tauri::ipc::Invoke) -> bool {
    tauri::generate_handler![
        // Settings
        settings::commands::get_all_settings,
        settings::commands::save_setting,
        settings::commands::delete_setting,
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
        characters::commands::upload_pdf_template,
        // Timeline
        timeline::commands::save_timeline_event,
        timeline::commands::get_all_timeline_events,
        timeline::commands::get_timeline_event_by_id,
        timeline::commands::delete_timeline_event,
        timeline::commands::get_timeline_events_by_article,
        timeline::commands::get_timeline_events_by_map,
        timeline::commands::get_timeline_categories,
        timeline::commands::save_timeline_category,
        timeline::commands::delete_timeline_category,
        timeline::commands::get_timeline_views,
        timeline::commands::save_timeline_view,
        timeline::commands::delete_timeline_view,
        timeline::commands::get_campaign_settings,
        timeline::commands::save_campaign_settings,
        timeline::commands::get_timeline_eras,
        timeline::commands::save_timeline_era,
        timeline::commands::delete_timeline_era,
        // Relations
        relations::commands::get_all_graph_nodes,
        relations::commands::save_graph_node,
        relations::commands::delete_graph_node,
        relations::commands::promote_node_to_character,
        relations::commands::get_all_graph_edges,
        relations::commands::save_graph_edge,
        relations::commands::delete_graph_edge,
        relations::commands::get_all_graph_views,
        relations::commands::get_graph_view_by_id,
        relations::commands::save_graph_view,
        relations::commands::delete_graph_view,
        relations::commands::update_graph_view_positions
    ]
}