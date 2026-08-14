use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Tipo di nodo nel grafo (personaggio reale, nodo rapido, ignoto o entità non-personaggio).
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum NodeType {
    Character,
    Placeholder,
    Unknown,
    Entity,
}

impl NodeType {
    pub fn as_str(&self) -> &'static str {
        match self {
            NodeType::Character => "character",
            NodeType::Placeholder => "placeholder",
            NodeType::Unknown => "unknown",
            NodeType::Entity => "entity",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "character" => NodeType::Character,
            "unknown" => NodeType::Unknown,
            "entity" => NodeType::Entity,
            _ => NodeType::Placeholder,
        }
    }
}

/// Tipo di relazione (arco) tra due nodi.
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum RelationType {
    ParentChild,
    DescendantGap,
    Spouse,
    Sibling,
    Foster,
    Ally,
    Rival,
    Vassal,
    MemberOf,
    Custom,
}

impl RelationType {
    pub fn as_str(&self) -> &'static str {
        match self {
            RelationType::ParentChild => "parent_child",
            RelationType::DescendantGap => "descendant_gap",
            RelationType::Spouse => "spouse",
            RelationType::Sibling => "sibling",
            RelationType::Foster => "foster",
            RelationType::Ally => "ally",
            RelationType::Rival => "rival",
            RelationType::Vassal => "vassal",
            RelationType::MemberOf => "member_of",
            RelationType::Custom => "custom",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "parent_child" => RelationType::ParentChild,
            "descendant_gap" => RelationType::DescendantGap,
            "spouse" => RelationType::Spouse,
            "sibling" => RelationType::Sibling,
            "foster" => RelationType::Foster,
            "ally" => RelationType::Ally,
            "rival" => RelationType::Rival,
            "vassal" => RelationType::Vassal,
            "member_of" => RelationType::MemberOf,
            _ => RelationType::Custom,
        }
    }
}

/// Tipo di vista salvata (albero genealogico o mappa relazionale libera).
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum GraphViewType {
    Genealogy,
    Network,
}

impl GraphViewType {
    pub fn as_str(&self) -> &'static str {
        match self {
            GraphViewType::Genealogy => "genealogy",
            GraphViewType::Network => "network",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "network" => GraphViewType::Network,
            _ => GraphViewType::Genealogy,
        }
    }
}

/// Nodo del grafo (personaggio, entità, segnaposto o ignoto).
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GraphNodeData {
    #[serde(default)]
    pub id: String,
    #[serde(rename = "type")]
    pub node_type: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub character_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub wiki_article_id: Option<String>,

    pub display_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subtitle: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub birth_year: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub death_year: Option<i64>,

    /// Se impostato, il nodo funge da "portale" verso un'altra GraphView:
    /// cliccandolo (o tramite l'icona 🔗 dedicata) l'utente passa direttamente
    /// a quella vista.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub linked_view_id: Option<String>,
}

/// Arco del grafo (relazione tra due nodi).
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GraphEdgeData {
    #[serde(default)]
    pub id: String,
    pub source_node_id: String,
    pub target_node_id: String,
    #[serde(rename = "type")]
    pub relation_type: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    #[serde(default)]
    pub is_uncertain: bool,

    /// Nota più estesa sul legame (contesto, fonte, storia), mostrata come
    /// tooltip invece che scritta per intero sul canvas.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub generational_gap_count: Option<i64>,

    /// Lato esatto (top/right/bottom/left) da cui parte/arriva l'arco sul nodo,
    /// così l'arco riparte sempre dal punto scelto dall'utente e non da un
    /// handle scelto arbitrariamente da React Flow.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_handle: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target_handle: Option<String>,
}

/// Vista salvata: sottoinsieme di nodi/archi con posizioni fisse per una specifica
/// visualizzazione (es. "Casata Eldrin" come genealogy, "Intrighi di Corte" come network).
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GraphView {
    #[serde(default)]
    pub id: String,
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(rename = "type")]
    pub view_type: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub focus_node_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub focus_depth: Option<i64>,

    #[serde(default)]
    pub node_ids: Vec<String>,
    #[serde(default)]
    pub edge_ids: Vec<String>,

    #[serde(default)]
    pub positions: HashMap<String, GraphPosition>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy)]
pub struct GraphPosition {
    pub x: f64,
    pub y: f64,
}
