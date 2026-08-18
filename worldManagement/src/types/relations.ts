import { GraphNodeId, GraphEdgeId, GraphViewId, CharacterId, ArticleId } from "./core";

export type NodeType = "character" | "placeholder" | "unknown" | "entity";

export type RelationType =
  // Genealogiche
  | "parent_child"
  | "descendant_gap"
  | "spouse"
  | "sibling"
  | "foster"
  // Network / Sociali
  | "ally"
  | "rival"
  | "vassal"
  | "member_of"
  | "custom";

// --- NODI (PERSONAGGI / ENTITÀ) ---
export interface GraphNodeData {
  id: GraphNodeId;
  type: NodeType;

  // Riferimenti opzionali
  characterId?: CharacterId; // ID scheda personaggio (se associata)
  wikiArticleId?: ArticleId; // ID articolo wiki (se associato)

  // Dati di visualizzazione
  displayName: string;
  avatarUrl?: string;
  subtitle?: string; // es. "Duca di Ovestvia"
  notes?: string; // Note veloci visibili nel tooltip/drawer

  // Info temporali per l'ordinamento generazionale
  birthYear?: number;
  deathYear?: number;

  linkedViewId?: GraphViewId;
}

// --- ARCHI (RELAZIONI) ---
export interface GraphEdgeData {
  id: GraphEdgeId;
  sourceNodeId: GraphNodeId;
  targetNodeId: GraphNodeId;
  type: RelationType;

  label?: string; // es. "Figlio illegittimo", "Patto Segreto"
  isUncertain?: boolean; // Se è una diceria / incerto

  description?: string;

  generationalGapCount?: number; // es. 3 (generazioni stimate)

  sourceHandle?: string;
  targetHandle?: string;
}

// --- VISTE SALVATE (PER NON MOSTRARE TUTTO INSIEME) ---
export type GraphViewType = "genealogy" | "network";

export interface GraphView {
  id: GraphViewId;
  title: string;
  description?: string;
  type: GraphViewType;

  // Root node per le viste focalizzate (opzionale)
  focusNodeId?: GraphNodeId;
  focusDepth?: number; // raggio di distanza (es. 1 o 2 livelli)

  // Inclusione manuale nodi/archi
  nodeIds: GraphNodeId[];
  edgeIds: GraphEdgeId[];

  // Posizionamento fisso dei nodi per questa vista
  positions: Record<string, { x: number; y: number }>;
}

export const SYMMETRIC_RELATION_TYPES: RelationType[] = [
  "spouse",
  "sibling",
  "ally",
  "rival",
  "custom",
];
export const GENEALOGY_RELATION_TYPES: RelationType[] = [
  "parent_child",
  "descendant_gap",
  "spouse",
  "sibling",
  "foster",
];
export const NETWORK_RELATION_TYPES: RelationType[] = [
  "ally",
  "rival",
  "vassal",
  "member_of",
  "custom",
];
