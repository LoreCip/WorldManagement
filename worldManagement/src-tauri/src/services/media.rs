use crate::services::state::AppPaths;
use regex::Regex;
use sha2::{Digest, Sha256};
use std::collections::HashSet;
use std::fs;
use std::path::Path;

pub fn save_image(paths: &AppPaths, file_path: &str) -> Result<String, String> {
    let src_path = Path::new(file_path);
    let extension = src_path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("png");

    let bytes = fs::read(src_path).map_err(|e| e.to_string())?;

    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    let hash_hex = format!("{:x}", hasher.finalize());

    let file_name = format!("{}.{}", hash_hex, extension);
    let dest_path = paths.media_dir.join(&file_name);

    if !dest_path.exists() {
        fs::write(&dest_path, &bytes).map_err(|e| e.to_string())?;
    }

    Ok(dest_path.to_string_lossy().into_owned())
}

pub fn extract_image_filenames(content: &str) -> HashSet<String> {
    let re = Regex::new(r"[0-9a-fA-F]{64}\.(?:png|jpg|jpeg|webp|gif)").unwrap();
    re.find_iter(content)
        .map(|m| m.as_str().to_string())
        .collect()
}
