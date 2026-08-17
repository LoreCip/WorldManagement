import dagre from "dagre";
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, SimulationNodeDatum } from "d3-force";
import { Node, Edge } from "@xyflow/react";

const NODE_WIDTH = 190;
const NODE_HEIGHT = 90;

// Forma minima dei dati custom di un arco React Flow, sufficiente per
// leggere il tipo di relazione senza importare i tipi del componente
// RelationEdge da questo modulo di utility.
interface EdgeFlowDataLike {
	edge?: { type?: string };
}

/** Layout gerarchico top-down per la vista "genealogy", basato su DagreJS. */
export function layoutGenealogy(nodes: Node[], edges: Edge[]): Record<string, { x: number; y: number }> {
	const g = new dagre.graphlib.Graph();
	g.setDefaultEdgeLabel(() => ({}));
	g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 110 });

	nodes.forEach((n) => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
	edges.forEach((e) => {
		// I gap generazionali contano come rank più "lunghi": diamo peso minore
		// per lasciare a dagre libertà di allungare visivamente la distanza.
		const flowData = e.data as EdgeFlowDataLike | undefined;
		const weight = flowData?.edge?.type === "descendant_gap" ? 1 : 2;
		g.setEdge(e.source, e.target, { weight });
	});

	dagre.layout(g);

	const positions: Record<string, { x: number; y: number }> = {};
	nodes.forEach((n) => {
		const pos = g.node(n.id);
		if (pos) positions[n.id] = { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 };
	});
	return positions;
}

interface SimNode extends SimulationNodeDatum {
	id: string;
}

interface SimLink {
	source: string;
	target: string;
}

/** Layout force-directed per la vista "network", basato su d3-force. Sincrono:
 *  esegue un numero fisso di iterazioni "a caldo" e ritorna il risultato finale
 *  (adatto a un posizionamento iniziale, non a un'animazione continua). */
export function layoutNetwork(
	nodes: Node[],
	edges: Edge[],
	width = 900,
	height = 620
): Record<string, { x: number; y: number }> {
	const simNodes: SimNode[] = nodes.map((n) => ({ id: n.id }));
	const simLinks: SimLink[] = edges.map((e) => ({ source: e.source, target: e.target }));

	const simulation = forceSimulation<SimNode>(simNodes)
		.force("charge", forceManyBody().strength(-320))
		.force(
			"link",
			forceLink<SimNode, SimLink>(simLinks)
				.id((d) => d.id)
				.distance(160)
		)
		.force("center", forceCenter(width / 2, height / 2))
		.force("collide", forceCollide(NODE_WIDTH / 2 + 10))
		.stop();

	for (let i = 0; i < 300; i++) simulation.tick();

	const positions: Record<string, { x: number; y: number }> = {};
	simNodes.forEach((n) => {
		positions[n.id] = { x: n.x ?? 0, y: n.y ?? 0 };
	});
	return positions;
}

// Posizione di fallback per un nodo privo di posizione salvata nella vista
// corrente (es. appena aggiunto al grafo). Prima era un'espressione
// Math.random() inline in RelationsView.tsx: un algoritmo di posizionamento
// a tutti gli effetti, per quanto minimale, lasciato fuori da questo modulo.
export function getFallbackPosition(spreadWidth = 500, spreadHeight = 400): { x: number; y: number } {
	return { x: Math.random() * spreadWidth, y: Math.random() * spreadHeight };
}