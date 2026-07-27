use tauri::State;
use uuid::Uuid;
use crate::services::{DbState, AppPaths, extract_image_filenames};
use crate::db::delete_image_if_unused;
use crate::utils::ResultExt;
use crate::modules::wiki::models::{Article, ArticleMeta, SearchResultItem};


#[tauri::command]
pub fn save_image(
    paths: State<'_, AppPaths>,
    file_path: String,
) -> Result<String, String> {
    crate::services::save_image(&paths, &file_path)
}


#[tauri::command]
pub fn save_article(
    state: State<'_, DbState>,
    mut article: Article,
) -> Result<String, String> {
    let mut conn = state.0.lock().map_str()?;

    if article.meta.id.trim().is_empty() {
        article.meta.id = Uuid::new_v4().to_string();
    }

    let tx = conn.transaction().map_str()?;

    tx.execute(
        "INSERT OR REPLACE INTO wiki_articles (id, title, content, category, updated_at) 
         VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP)",
        (
            &article.meta.id,
            &article.meta.title,
            &article.content,
            &article.meta.category,
        ),
    ).map_str()?;

    tx.execute("DELETE FROM article_tags WHERE article_id = ?1", [&article.meta.id]).map_str()?;

    for tag_name in &article.tags {
        let tag_name_clean = tag_name.trim().to_lowercase();
        if tag_name_clean.is_empty() { continue; }

        let tag_id = Uuid::new_v4().to_string();

        let _ = tx.execute(
            "INSERT OR IGNORE INTO tags (id, name) VALUES (?1, ?2)",
            (&tag_id, &tag_name_clean),
        );

        tx.execute(
            "INSERT OR IGNORE INTO article_tags (article_id, tag_id) 
             SELECT ?1, id FROM tags WHERE name = ?2",
            (&article.meta.id, &tag_name_clean),
        ).map_str()?;
    }

    tx.commit().map_str()?;

    Ok(article.meta.id)
}

#[tauri::command]
pub fn get_all_articles(state: State<'_, DbState>) -> Result<Vec<SearchResultItem>, String> {
    let conn = state.0.lock().map_str()?;
    let mut stmt = conn
        .prepare("SELECT id, title, category, SUBSTR(content, 1, 100) FROM wiki_articles ORDER BY updated_at DESC")
        .map_str()?;

    let list = stmt
        .query_map([], |row| {
            Ok(SearchResultItem {
                meta: ArticleMeta {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    category: row.get(2)?,
                },
                snippet: row.get(3)?,
            })
        })
        .map_str()?
        .filter_map(Result::ok)
        .collect();

    Ok(list)
}

#[tauri::command]
pub fn search_wiki(
    state: State<'_, DbState>,
    query: String,
) -> Result<Vec<SearchResultItem>, String> {
    let conn = state.0.lock().map_str()?;
    
    let mut stmt = conn.prepare(
        "SELECT a.id, a.title, a.category, snippet(wiki_fts, 1, '<mark>', '</mark>', '...', 15) as snippet
         FROM wiki_fts f
         JOIN wiki_articles a ON f.rowid = a.rowid
         WHERE wiki_fts MATCH ?1
         ORDER BY rank
         LIMIT 30"
    ).map_str()?;

    let fts_query = format!("{}*", query);
    let results = stmt
        .query_map([&fts_query], |row| {
            Ok(SearchResultItem {
                meta: ArticleMeta {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    category: row.get(2)?,
                },
                snippet: row.get(3)?,
            })
        })
        .map_str()?
        .filter_map(Result::ok)
        .collect();

    Ok(results)
}

#[tauri::command]
pub fn get_article_by_id(state: State<'_, DbState>, id: String) -> Result<Article, String> {
    let conn = state.0.lock().map_str()?;

    let meta_and_content = conn.query_row(
        "SELECT id, title, content, category FROM wiki_articles WHERE id = ?1",
        [&id],
        |row| {
            Ok((
                ArticleMeta {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    category: row.get(3)?,
                },
                row.get::<_, String>(2)?,
            ))
        },
    ).map_str()?;

    let mut tag_stmt = conn
        .prepare("SELECT t.name FROM tags t JOIN article_tags at ON t.id = at.tag_id WHERE at.article_id = ?1")
        .map_str()?;

    let tags = tag_stmt
        .query_map([&id], |row| row.get::<_, String>(0))
        .map_str()?
        .filter_map(Result::ok)
        .collect();

    Ok(Article {
        meta: meta_and_content.0,
        content: meta_and_content.1,
        tags,
    })
}

#[tauri::command]
pub fn delete_article(
    state: State<'_, DbState>,
    paths: State<'_, AppPaths>,
    id: String,
) -> Result<(), String> {
    let conn = state.0.lock().map_str()?;

    let content: Option<String> = conn
        .query_row("SELECT content FROM wiki_articles WHERE id = ?1", [&id], |row| row.get(0))
        .ok();

    conn.execute("DELETE FROM wiki_articles WHERE id = ?1", [&id]).map_str()?;

    if let Some(content) = content {
        for filename in extract_image_filenames(&content) {
            delete_image_if_unused(&conn, &paths.media_dir, &filename);
        }
    }

    Ok(())
}