use tauri::State;
use uuid::Uuid;
use crate::services::DbState;
use crate::utils::ResultExt;
use crate::modules::timeline::models::*;

// ---------- Eventi ----------

#[tauri::command]
pub fn save_timeline_event(
    state: State<'_, DbState>,
    mut event: TimelineEvent,
) -> Result<String, String> {
    let conn = state.0.lock().map_str()?;

    if event.meta.id.trim().is_empty() {
        event.meta.id = Uuid::new_v4().to_string();
    }

    conn.execute(
        "INSERT OR REPLACE INTO timeline_events
            (id, title, description, time_value, end_time_value, precision, article_id, map_id, category_id, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, CURRENT_TIMESTAMP)",
        (
            &event.meta.id,
            &event.meta.title,
            &event.description,
            &event.meta.time_value,
            &event.end_time_value,
            &event.meta.precision,
            &event.article_id,
            &event.map_id,
            &event.meta.category_id,
        ),
    ).map_str()?;

    Ok(event.meta.id)
}

#[tauri::command]
pub fn get_all_timeline_events(
    state: State<'_, DbState>,
) -> Result<Vec<TimelineEventListItem>, String> {
    let conn = state.0.lock().map_str()?;

    let mut stmt = conn
        .prepare(
            "SELECT e.id, e.title, e.time_value, e.end_time_value, e.precision, e.category_id,
                    e.article_id, e.map_id, c.name, c.color, c.icon
             FROM timeline_events e
             LEFT JOIN timeline_categories c ON c.id = e.category_id
             ORDER BY e.time_value ASC"
        )
        .map_str()?;

    let list = stmt
        .query_map([], |row| {
            Ok(TimelineEventListItem {
                meta: TimelineEventMeta {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    time_value: row.get(2)?,
                    precision: row.get(4)?,
                    category_id: row.get(5)?,
                },
                end_time_value: row.get(3)?,
                article_id: row.get(6)?,
                map_id: row.get(7)?,
                category_name: row.get(8)?,
                category_color: row.get(9)?,
                category_icon: row.get(10)?,
            })
        })
        .map_str()?
        .filter_map(Result::ok)
        .collect();

    Ok(list)
}

#[tauri::command]
pub fn get_timeline_event_by_id(
    state: State<'_, DbState>,
    id: String,
) -> Result<TimelineEvent, String> {
    let conn = state.0.lock().map_str()?;

    conn.query_row(
        "SELECT id, title, description, time_value, end_time_value, precision, article_id, map_id, category_id
         FROM timeline_events WHERE id = ?1",
        [&id],
        |row| {
            Ok(TimelineEvent {
                meta: TimelineEventMeta {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    time_value: row.get(3)?,
                    precision: row.get(5)?,
                    category_id: row.get(8)?,
                },
                description: row.get(2)?,
                end_time_value: row.get(4)?,
                article_id: row.get(6)?,
                map_id: row.get(7)?,
            })
        },
    ).map_str()
}

#[tauri::command]
pub fn delete_timeline_event(
    state: State<'_, DbState>,
    id: String,
) -> Result<(), String> {
    let conn = state.0.lock().map_str()?;
    conn.execute("DELETE FROM timeline_events WHERE id = ?1", [&id]).map_str()?;
    Ok(())
}

#[tauri::command]
pub fn get_timeline_events_by_article(
    article_id: String,
    state: State<'_, DbState>,
) -> Result<Vec<TimelineEventListItem>, String> {
    let conn = state.0.lock().map_str()?;

    let mut stmt = conn
        .prepare(
            "SELECT e.id, e.title, e.time_value, e.end_time_value, e.precision, e.category_id,
                    e.article_id, e.map_id, c.name, c.color, c.icon
             FROM timeline_events e
             LEFT JOIN timeline_categories c ON c.id = e.category_id
             WHERE e.article_id = ?1
             ORDER BY e.time_value ASC"
        )
        .map_str()?;

    let list = stmt
        .query_map([&article_id], |row| {
            Ok(TimelineEventListItem {
                meta: TimelineEventMeta {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    time_value: row.get(2)?,
                    precision: row.get(4)?,
                    category_id: row.get(5)?,
                },
                end_time_value: row.get(3)?,
                article_id: row.get(6)?,
                map_id: row.get(7)?,
                category_name: row.get(8)?,
                category_color: row.get(9)?,
                category_icon: row.get(10)?,
            })
        })
        .map_str()?
        .filter_map(Result::ok)
        .collect();

    Ok(list)
}

#[tauri::command]
pub fn get_timeline_events_by_map(
    map_id: String,
    state: State<'_, DbState>,
) -> Result<Vec<TimelineEventListItem>, String> {
    let conn = state.0.lock().map_str()?;

    let mut stmt = conn
        .prepare(
            "SELECT e.id, e.title, e.time_value, e.end_time_value, e.precision, e.category_id,
                    e.article_id, e.map_id, c.name, c.color, c.icon
             FROM timeline_events e
             LEFT JOIN timeline_categories c ON c.id = e.category_id
             WHERE e.map_id = ?1
             ORDER BY e.time_value ASC"
        )
        .map_str()?;

    let list = stmt
        .query_map([&map_id], |row| {
            Ok(TimelineEventListItem {
                meta: TimelineEventMeta {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    time_value: row.get(2)?,
                    precision: row.get(4)?,
                    category_id: row.get(5)?,
                },
                end_time_value: row.get(3)?,
                article_id: row.get(6)?,
                map_id: row.get(7)?,
                category_name: row.get(8)?,
                category_color: row.get(9)?,
                category_icon: row.get(10)?,
            })
        })
        .map_str()?
        .filter_map(Result::ok)
        .collect();

    Ok(list)
}

// ---------- Categorie ----------

#[tauri::command]
pub fn get_timeline_categories(state: State<'_, DbState>) -> Result<Vec<TimelineCategory>, String> {
    let conn = state.0.lock().map_str()?;
    let mut stmt = conn
        .prepare("SELECT id, name, color, icon FROM timeline_categories ORDER BY name ASC")
        .map_str()?;

    let list = stmt
        .query_map([], |row| {
            Ok(TimelineCategory {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                icon: row.get(3)?,
            })
        })
        .map_str()?
        .filter_map(Result::ok)
        .collect();

    Ok(list)
}

#[tauri::command]
pub fn save_timeline_category(
    state: State<'_, DbState>,
    mut category: TimelineCategory,
) -> Result<String, String> {
    let conn = state.0.lock().map_str()?;

    if category.id.trim().is_empty() {
        category.id = Uuid::new_v4().to_string();
    }

    conn.execute(
        "INSERT OR REPLACE INTO timeline_categories (id, name, color, icon) VALUES (?1, ?2, ?3, ?4)",
        (&category.id, &category.name, &category.color, &category.icon),
    ).map_str()?;

    Ok(category.id)
}

#[tauri::command]
pub fn delete_timeline_category(
    state: State<'_, DbState>,
    id: String,
) -> Result<(), String> {
    let conn = state.0.lock().map_str()?;
    // Sgancia gli eventi collegati invece di lasciarli orfani/rompere l'integrità
    conn.execute("UPDATE timeline_events SET category_id = NULL WHERE category_id = ?1", [&id]).map_str()?;
    conn.execute("DELETE FROM timeline_categories WHERE id = ?1", [&id]).map_str()?;
    Ok(())
}

// ---------- Viste salvate ----------

#[tauri::command]
pub fn get_timeline_views(state: State<'_, DbState>) -> Result<Vec<TimelineSavedView>, String> {
    let conn = state.0.lock().map_str()?;
    let mut stmt = conn
        .prepare("SELECT id, name, center_value, pixels_per_day FROM timeline_views ORDER BY created_at ASC")
        .map_str()?;

    let list = stmt
        .query_map([], |row| {
            Ok(TimelineSavedView {
                id: row.get(0)?,
                name: row.get(1)?,
                center_value: row.get(2)?,
                pixels_per_day: row.get(3)?,
            })
        })
        .map_str()?
        .filter_map(Result::ok)
        .collect();

    Ok(list)
}

#[tauri::command]
pub fn save_timeline_view(
    state: State<'_, DbState>,
    mut view: TimelineSavedView,
) -> Result<String, String> {
    let conn = state.0.lock().map_str()?;

    if view.id.trim().is_empty() {
        view.id = Uuid::new_v4().to_string();
    }

    conn.execute(
        "INSERT OR REPLACE INTO timeline_views (id, name, center_value, pixels_per_day) VALUES (?1, ?2, ?3, ?4)",
        (&view.id, &view.name, &view.center_value, &view.pixels_per_day),
    ).map_str()?;

    Ok(view.id)
}

#[tauri::command]
pub fn delete_timeline_view(
    state: State<'_, DbState>,
    id: String,
) -> Result<(), String> {
    let conn = state.0.lock().map_str()?;
    conn.execute("DELETE FROM timeline_views WHERE id = ?1", [&id]).map_str()?;
    Ok(())
}


// ---------- Impostazioni campagna (marcatore "oggi") ----------

#[tauri::command]
pub fn get_campaign_settings(state: State<'_, DbState>) -> Result<CampaignSettings, String> {
    let conn = state.0.lock().map_str()?;
    conn.query_row(
        "SELECT current_date_value FROM campaign_settings WHERE id = 1",
        [],
        |row| Ok(CampaignSettings { current_date_value: row.get(0)? }),
    ).map_str()
}

#[tauri::command]
pub fn save_campaign_settings(
    state: State<'_, DbState>,
    current_date_value: Option<i64>,
) -> Result<(), String> {
    let conn = state.0.lock().map_str()?;
    conn.execute(
        "UPDATE campaign_settings SET current_date_value = ?1 WHERE id = 1",
        [&current_date_value],
    ).map_str()?;
    Ok(())
}

// ---------- Ere / fasce di sfondo ----------

#[tauri::command]
pub fn get_timeline_eras(state: State<'_, DbState>) -> Result<Vec<TimelineEra>, String> {
    let conn = state.0.lock().map_str()?;
    let mut stmt = conn
        .prepare("SELECT id, label, start_value, end_value, color FROM timeline_eras ORDER BY start_value ASC")
        .map_str()?;

    let list = stmt
        .query_map([], |row| {
            Ok(TimelineEra {
                id: row.get(0)?,
                label: row.get(1)?,
                start_value: row.get(2)?,
                end_value: row.get(3)?,
                color: row.get(4)?,
            })
        })
        .map_str()?
        .filter_map(Result::ok)
        .collect();

    Ok(list)
}

#[tauri::command]
pub fn save_timeline_era(
    state: State<'_, DbState>,
    mut era: TimelineEra,
) -> Result<String, String> {
    let conn = state.0.lock().map_str()?;

    if era.id.trim().is_empty() {
        era.id = Uuid::new_v4().to_string();
    }

    conn.execute(
        "INSERT OR REPLACE INTO timeline_eras (id, label, start_value, end_value, color) VALUES (?1, ?2, ?3, ?4, ?5)",
        (&era.id, &era.label, &era.start_value, &era.end_value, &era.color),
    ).map_str()?;

    Ok(era.id)
}

#[tauri::command]
pub fn delete_timeline_era(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_str()?;
    conn.execute("DELETE FROM timeline_eras WHERE id = ?1", [&id]).map_str()?;
    Ok(())
}