use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
pub struct SettingEntry {
    pub key: String,
    pub value: String, // sempre una stringa JSON-encoded: il tipo reale lo conosce solo il frontend
}

pub type SettingsMap = HashMap<String, String>;
