use crate::modules::relations::models::{GraphEdgeData, GraphNodeData, GraphPosition, GraphView};
use crate::services::DbState;
use crate::utils::ResultExt;
use std::collections::HashMap;
use tauri::State;
use uuid::Uuid;

// ---------------------------------------------------------------------------
// NODI
// ---------------------------------------------------------------------------

fn row_to_node(row: &rusqlite::Row) -> rusqlite::Result<GraphNodeData> {
    Ok(GraphNodeData {
        id: row.get(0)?,
        node_type: row.get(1)?,
        character_id: row.get(2)?,
        wiki_article_id: row.get(3)?,
        display_name: row.get(4)?,
        avatar_url: row.get(5)?,
        subtitle: row.get(6)?,
        notes: row.get(7)?,
        birth_year: row.get(8)?,
        death_year: row.get(9)?,
        linked_view_id: row.get(10)?,
    })
}

const NODE_COLUMNS: &str = "id, type, character_id, wiki_article_id, display_name, avatar_url, subtitle, notes, birth_year, death_year, linked_view_id";

#[tauri::command]
pub fn get_all_graph_nodes(state: State<'_, DbState>) -> Result<Vec<GraphNodeData>, String> {
    let conn = state.0.lock().map_str()?;
    let mut stmt = conn
        .prepare(&format!("SELECT {} FROM graph_nodes ORDER BY display_name ASC", NODE_COLUMNS))
        .map_str()?;

    let list = stmt
        .query_map([], row_to_node)
        .map_str()?
        .filter_map(Result::ok)
        .collect();

    Ok(list)
}

#[tauri::command]
pub fn save_graph_node(state: State<'_, DbState>, mut node: GraphNodeData) -> Result<String, String> {
    let conn = state.0.lock().map_str()?;

    if node.id.trim().is_empty() {
        node.id = Uuid::new_v4().to_string();
    }

    conn.execute(
        "INSERT INTO graph_nodes (id, type, character_id, wiki_article_id, display_name, avatar_url, subtitle, notes, birth_year, death_year, linked_view_id, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET
            type = excluded.type,
            character_id = excluded.character_id,
            wiki_article_id = excluded.wiki_article_id,
            display_name = excluded.display_name,
            avatar_url = excluded.avatar_url,
            subtitle = excluded.subtitle,
            notes = excluded.notes,
            birth_year = excluded.birth_year,
            death_year = excluded.death_year,
            linked_view_id = excluded.linked_view_id,
            updated_at = CURRENT_TIMESTAMP",
        (
            &node.id,
            &node.node_type,
            &node.character_id,
            &node.wiki_article_id,
            &node.display_name,
            &node.avatar_url,
            &node.subtitle,
            &node.notes,
            &node.birth_year,
            &node.death_year,
            &node.linked_view_id,
        ),
    ).map_str()?;

    Ok(node.id)
}

#[tauri::command]
pub fn delete_graph_node(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_str()?;
    // Gli archi collegati vengono rimossi automaticamente (ON DELETE CASCADE).
    conn.execute("DELETE FROM graph_nodes WHERE id = ?1", [&id]).map_str()?;
    Ok(())
}

/// Converte un nodo "placeholder" (o "unknown") in una scheda personaggio vera e propria,
/// mantenendo intatti tutti i legami (archi) esistenti sul grafo.
#[tauri::command]
pub fn promote_node_to_character(
    state: State<'_, DbState>,
    node_id: String,
    system_id: String,
) -> Result<String, String> {
    let mut conn = state.0.lock().map_str()?;
    let tx = conn.transaction().map_str()?;

    let display_name: String = tx
        .query_row("SELECT display_name FROM graph_nodes WHERE id = ?1", [&node_id], |r| r.get(0))
        .map_str()?;

    let sheet_id = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO character_sheets (id, system_id, name, data_json) VALUES (?1, ?2, ?3, '{}')",
        (&sheet_id, &system_id, &display_name),
    ).map_str()?;

    tx.execute(
        "UPDATE graph_nodes SET type = 'character', character_id = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        (&sheet_id, &node_id),
    ).map_str()?;

    tx.commit().map_str()?;

    Ok(sheet_id)
}

// ---------------------------------------------------------------------------
// ARCHI
// ---------------------------------------------------------------------------

fn row_to_edge(row: &rusqlite::Row) -> rusqlite::Result<GraphEdgeData> {
    Ok(GraphEdgeData {
        id: row.get(0)?,
        source_node_id: row.get(1)?,
        target_node_id: row.get(2)?,
        relation_type: row.get(3)?,
        label: row.get(4)?,
        is_uncertain: row.get::<_, i64>(5)? != 0,
        generational_gap_count: row.get(6)?,
        source_handle: row.get(7)?,
        target_handle: row.get(8)?,
        description: row.get(9)?,
    })
}

const EDGE_COLUMNS: &str = "id, source_node_id, target_node_id, type, label, is_uncertain, generational_gap_count, source_handle, target_handle, description";

#[tauri::command]
pub fn get_all_graph_edges(state: State<'_, DbState>) -> Result<Vec<GraphEdgeData>, String> {
    let conn = state.0.lock().map_str()?;
    let mut stmt = conn.prepare(&format!("SELECT {} FROM graph_edges", EDGE_COLUMNS)).map_str()?;

    let list = stmt
        .query_map([], row_to_edge)
        .map_str()?
        .filter_map(Result::ok)
        .collect();

    Ok(list)
}

#[tauri::command]
pub fn save_graph_edge(state: State<'_, DbState>, mut edge: GraphEdgeData) -> Result<String, String> {
    let conn = state.0.lock().map_str()?;

    if edge.id.trim().is_empty() {
        edge.id = Uuid::new_v4().to_string();
    }

    conn.execute(
        "INSERT INTO graph_edges (id, source_node_id, target_node_id, type, label, is_uncertain, generational_gap_count, source_handle, target_handle, description)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
         ON CONFLICT(id) DO UPDATE SET
            source_node_id = excluded.source_node_id,
            target_node_id = excluded.target_node_id,
            type = excluded.type,
            label = excluded.label,
            is_uncertain = excluded.is_uncertain,
            generational_gap_count = excluded.generational_gap_count,
            source_handle = excluded.source_handle,
            target_handle = excluded.target_handle,
            description = excluded.description",
        (
            &edge.id,
            &edge.source_node_id,
            &edge.target_node_id,
            &edge.relation_type,
            &edge.label,
            edge.is_uncertain as i64,
            &edge.generational_gap_count,
            &edge.source_handle,
            &edge.target_handle,
            &edge.description,
        ),
    ).map_str()?;

    Ok(edge.id)
}

#[tauri::command]
pub fn delete_graph_edge(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_str()?;
    conn.execute("DELETE FROM graph_edges WHERE id = ?1", [&id]).map_str()?;
    Ok(())
}

// ---------------------------------------------------------------------------
// VISTE
// ---------------------------------------------------------------------------

fn row_to_view(row: &rusqlite::Row) -> rusqlite::Result<GraphView> {
    let node_ids_json: String = row.get(5)?;
    let edge_ids_json: String = row.get(6)?;
    let positions_json: String = row.get(7)?;

    Ok(GraphView {
        id: row.get(0)?,
        title: row.get(1)?,
        description: row.get(2)?,
        view_type: row.get(3)?,
        focus_node_id: row.get(4)?,
        focus_depth: row.get(8)?,
        node_ids: serde_json::from_str(&node_ids_json).unwrap_or_default(),
        edge_ids: serde_json::from_str(&edge_ids_json).unwrap_or_default(),
        positions: serde_json::from_str(&positions_json).unwrap_or_default(),
    })
}

const VIEW_COLUMNS: &str =
    "id, title, description, type, focus_node_id, node_ids, edge_ids, positions, focus_depth";

#[tauri::command]
pub fn get_all_graph_views(state: State<'_, DbState>) -> Result<Vec<GraphView>, String> {
    let conn = state.0.lock().map_str()?;
    let mut stmt = conn
        .prepare(&format!("SELECT {} FROM graph_views ORDER BY title ASC", VIEW_COLUMNS))
        .map_str()?;

    let list = stmt
        .query_map([], row_to_view)
        .map_str()?
        .filter_map(Result::ok)
        .collect();

    Ok(list)
}

#[tauri::command]
pub fn get_graph_view_by_id(state: State<'_, DbState>, id: String) -> Result<GraphView, String> {
    let conn = state.0.lock().map_str()?;
    conn.query_row(
        &format!("SELECT {} FROM graph_views WHERE id = ?1", VIEW_COLUMNS),
        [&id],
        row_to_view,
    ).map_str()
}

#[tauri::command]
pub fn save_graph_view(state: State<'_, DbState>, mut view: GraphView) -> Result<String, String> {
    let conn = state.0.lock().map_str()?;

    if view.id.trim().is_empty() {
        view.id = Uuid::new_v4().to_string();
    }

    let node_ids_json = serde_json::to_string(&view.node_ids).map_str()?;
    let edge_ids_json = serde_json::to_string(&view.edge_ids).map_str()?;
    let positions_json = serde_json::to_string(&view.positions).map_str()?;

    conn.execute(
        "INSERT INTO graph_views (id, title, description, type, focus_node_id, focus_depth, node_ids, edge_ids, positions, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            description = excluded.description,
            type = excluded.type,
            focus_node_id = excluded.focus_node_id,
            focus_depth = excluded.focus_depth,
            node_ids = excluded.node_ids,
            edge_ids = excluded.edge_ids,
            positions = excluded.positions,
            updated_at = CURRENT_TIMESTAMP",
        (
            &view.id,
            &view.title,
            &view.description,
            &view.view_type,
            &view.focus_node_id,
            &view.focus_depth,
            &node_ids_json,
            &edge_ids_json,
            &positions_json,
        ),
    ).map_str()?;

    Ok(view.id)
}

#[tauri::command]
pub fn delete_graph_view(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_str()?;
    conn.execute("DELETE FROM graph_views WHERE id = ?1", [&id]).map_str()?;
    Ok(())
}

/// Aggiorna solo le posizioni di una vista (chiamata frequente durante il drag dei nodi
/// sul canvas: evita di dover reinviare titolo/descrizione/nodeIds ad ogni spostamento).
#[tauri::command]
pub fn update_graph_view_positions(
    state: State<'_, DbState>,
    id: String,
    positions: HashMap<String, GraphPosition>,
) -> Result<(), String> {
    let conn = state.0.lock().map_str()?;
    let positions_json = serde_json::to_string(&positions).map_str()?;

    conn.execute(
        "UPDATE graph_views SET positions = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        (&positions_json, &id),
    ).map_str()?;

    Ok(())
}
