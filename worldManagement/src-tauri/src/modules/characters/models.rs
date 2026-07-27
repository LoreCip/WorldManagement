use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GameSystem {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub schema_json: String,       // JSON formattato come stringa
    pub markdown_template: String,
    pub is_builtin: bool,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CharacterSheet {
    pub id: String,
    pub system_id: String,
    pub article_id: Option<String>,
    pub name: String,
    pub data_json: String,         // JSON con i valori compilati
    pub sheet_variant: String,     // "pg" (Personaggio Giocante) o "png" (Non Giocante)
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

// Struct usata per creare o aggiornare un sistema personalizzato
#[derive(Debug, Deserialize)]
pub struct SaveGameSystemPayload {
    pub id: Option<String>, // None per creazione, Some per modifica
    pub name: String,
    pub description: Option<String>,
    pub schema_json: String,
    pub markdown_template: String,
}

// Struct usata per creare/aggiornare una scheda
#[derive(Debug, Deserialize)]
pub struct SaveCharacterSheetPayload {
    pub id: Option<String>, // Se Some -> Update, se None -> Insert
    pub system_id: String,
    pub article_id: Option<String>,
    pub name: String,
    pub data_json: String,
    #[serde(default = "default_sheet_variant")]
    pub sheet_variant: String,
}

fn default_sheet_variant() -> String {
    "pg".to_string()
}


#[derive(Debug, Serialize, Deserialize)]
pub struct ExtractedPdfField {
    pub key: String,        // Nome interno (es. "character_name")
    pub label: String,      // Etichetta formattata (es. "Character Name")
    pub pdf_field: String,  // Nome originale nel PDF (es. "CharacterName")
    pub r#type: String,     // "text", "number", o "checkbox"
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExtractedPdfSchema {
    pub pdf_template: String,
    pub fields: Vec<ExtractedPdfField>,
}