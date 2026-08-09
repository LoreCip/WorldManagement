import dagre from "dagre";
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from "d3-force";
import { Node, Edge } from "@xyflow/react";

const NODE_WIDTH = 190;
const NODE_HEIGHT = 90;

/** Layout gerarchico top-down per la vista "genealogy", basato su DagreJS. */
export function layoutGenealogy(nodes: Node[], edges: Edge[]): Record<string, { x: number; y: number }> {
	const g = new dagre.graphlib.Graph();
	g.setDefaultEdgeLabel(() => ({}));
	g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 110 });

	nodes.forEach((n) => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
	edges.forEach((e) => {
		// I gap generazionali contano come rank più "lunghi": diamo peso minore
		// per lasciare a dagre libertà di allungare visivamente la distanza.
		g.setEdge(e.source, e.target, { weight: e.data && (e.data as any).edge?.type === "descendant_gap" ? 1 : 2 });
	});

	dagre.layout(g);

	const positions: Record<string, { x: number; y: number }> = {};
	nodes.forEach((n) => {
		const pos = g.node(n.id);
		if (pos) positions[n.id] = { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 };
	});
	return positions;
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
	type SimNode = { id: string; x?: number; y?: number };
	const simNodes: SimNode[] = nodes.map((n) => ({ id: n.id }));
	const simLinks = edges.map((e) => ({ source: e.source, target: e.target }));

	const simulation = forceSimulation(simNodes as any)
		.force("charge", forceManyBody().strength(-320))
		.force("link", forceLink(simLinks as any).id((d: any) => d.id).distance(160))
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
