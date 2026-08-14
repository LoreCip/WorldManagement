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
	id: string;
	type: NodeType;

	// Riferimenti opzionali
	characterId?: string; // ID scheda personaggio (se associata)
	wikiArticleId?: string; // ID articolo wiki (se associato)

	// Dati di visualizzazione
	displayName: string;
	avatarUrl?: string;
	subtitle?: string; // es. "Duca di Ovestvia"
	notes?: string; // Note veloci visibili nel tooltip/drawer

	// Info temporali per l'ordinamento generazionale
	birthYear?: number;
	deathYear?: number;

	// Collegamento "portale": se impostato, il nodo funge da scorciatoia verso
	// un'altra vista (es. un nodo "Casata Stark" in una mappa relazionale che
	// porta all'albero genealogico dedicato).
	linkedViewId?: string;
}

// --- ARCHI (RELAZIONI) ---
export interface GraphEdgeData {
	id: string;
	sourceNodeId: string;
	targetNodeId: string;
	type: RelationType;

	label?: string; // es. "Figlio illegittimo", "Patto Segreto"
	isUncertain?: boolean; // Se è una diceria / incerto

	// Nota più estesa sul legame (es. contesto, fonte della diceria, storia),
	// mostrata come tooltip sull'etichetta invece che scritta per intero sul canvas.
	description?: string;

	// Specifico per i Gap Generazionali
	generationalGapCount?: number; // es. 3 (generazioni stimate)

	// Lato esatto del nodo da cui parte/arriva l'arco (top/right/bottom/left).
	// Senza questi, React Flow non sa quale dei 4 handle disegnare come punto
	// di aggancio e ne sceglie uno di default invece di quello scelto dall'utente.
	sourceHandle?: string;
	targetHandle?: string;
}

// --- VISTE SALVATE (PER NON MOSTRARE TUTTO INSIEME) ---
export type GraphViewType = "genealogy" | "network";

export interface GraphView {
	id: string;
	title: string;
	description?: string;
	type: GraphViewType;

	// Root node per le viste focalizzate (opzionale)
	focusNodeId?: string;
	focusDepth?: number; // raggio di distanza (es. 1 o 2 livelli)

	// Inclusione manuale nodi/archi
	nodeIds: string[];
	edgeIds: string[];

	// Posizionamento fisso dei nodi per questa vista
	positions: Record<string, { x: number; y: number }>;
}

// Relazioni "inverse" usate per calcolare automaticamente l'arco di ritorno
// quando ha senso mostrarlo nella stessa direzione semantica (utile per la UI
// del modale di creazione/​modifica arco).
export const SYMMETRIC_RELATION_TYPES: RelationType[] = ["spouse", "sibling", "ally", "rival", "custom"];

export const GENEALOGY_RELATION_TYPES: RelationType[] = ["parent_child", "descendant_gap", "spouse", "sibling", "foster"];

export const NETWORK_RELATION_TYPES: RelationType[] = ["ally", "rival", "vassal", "member_of", "custom"];
