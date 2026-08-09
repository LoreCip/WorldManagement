import React, { useCallback, useMemo, useState } from "react";
import {
	ReactFlow,
	ReactFlowProvider,
	Background,
	Controls,
	MiniMap,
	useReactFlow,
	NodeMouseHandler,
	EdgeMouseHandler,
	OnConnect,
	NodeChange,
	applyNodeChanges,
	Node,
	Edge,
	MarkerType,
	ConnectionMode,
	ConnectionLineType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { colors, fonts, radii } from "../components/theme/theme";
import { useLocalization } from "../context/LocalizationContext";
import { useRelations } from "../hooks/useRelations";
import { CharacterNode, CharacterNodeFlowData } from "../components/relations/CharacterNode";
import { RelationEdge, RelationEdgeFlowData } from "../components/relations/RelationEdge";
import { GapEdge } from "../components/relations/GapEdge";
import { UncertainEdge } from "../components/relations/UncertainEdge";
import { NodeDrawer } from "../components/relations/NodeDrawer";
import { EdgeDrawer } from "../components/relations/EdgeDrawer";
import { RelationsToolbar } from "../components/relations/RelationsToolbar";
import { QuickNodeModal } from "../components/relations/QuickNodeModal";
import { GraphEdgeData, GraphNodeData, GENEALOGY_RELATION_TYPES, NETWORK_RELATION_TYPES, RelationType } from "../types/relations";
import { layoutGenealogy, layoutNetwork } from "../utils/graphLayout";

interface RelationsViewProps {
	onNavigateToWiki?: (articleId: string) => void;
	onNavigateToCharacterSheet?: (sheetId: string) => void;
}

const nodeTypes = { relationNode: CharacterNode };
const edgeTypes = { relation: RelationEdge, gap: GapEdge, uncertain: UncertainEdge };

type PendingConnection = {
	sourceNodeId: string;
	targetNodeId: string;
	edgeId?: string;
	sourceHandle?: string;
	targetHandle?: string;
};

const RelationsCanvas: React.FC<RelationsViewProps> = ({ onNavigateToWiki, onNavigateToCharacterSheet }) => {
	const { t } = useLocalization();
	const rf = useReactFlow();
	const {
		isLoading,
		nodes: allNodes,
		edges: allEdges,
		views,
		currentView,
		currentViewId,
		setCurrentViewId,
		visibleNodes,
		visibleEdges,
		createView,
		updateViewPositionsLocal,
		saveNode,
		addQuickNode,
		addExistingNodeToView,
		deleteNode,
		removeNodeFromView,
		promoteNode,
		saveEdge,
		deleteEdge,
		removeEdgeFromView,
		findEdgeBetween,
	} = useRelations();

	const [searchQuery, setSearchQuery] = useState("");
	const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
	const [pendingEdge, setPendingEdge] = useState<PendingConnection | null>(null);
	const [isQuickNodeOpen, setIsQuickNodeOpen] = useState(false);
	const [isConnecting, setIsConnecting] = useState(false);
	const [focusMode, setFocusMode] = useState(false);

	const nodesById = useMemo(() => {
		const map: Record<string, GraphNodeData> = {};
		allNodes.forEach((n) => (map[n.id] = n));
		return map;
	}, [allNodes]);

	// Nodi/archi risultanti dalla "modalità focus" (BFS attorno al nodo selezionato).
	const { focusedNodes, focusedEdges } = useMemo(() => {
		if (!focusMode || !selectedNodeId) return { focusedNodes: visibleNodes, focusedEdges: visibleEdges };

		const depth = currentView?.focusDepth ?? 2;
		const visited = new Set<string>([selectedNodeId]);
		let frontier = [selectedNodeId];
		for (let i = 0; i < depth; i++) {
			const next: string[] = [];
			visibleEdges.forEach((e) => {
				if (frontier.includes(e.sourceNodeId) && !visited.has(e.targetNodeId)) {
					visited.add(e.targetNodeId);
					next.push(e.targetNodeId);
				}
				if (frontier.includes(e.targetNodeId) && !visited.has(e.sourceNodeId)) {
					visited.add(e.sourceNodeId);
					next.push(e.sourceNodeId);
				}
			});
			frontier = next;
		}

		return {
			focusedNodes: visibleNodes.filter((n) => visited.has(n.id)),
			focusedEdges: visibleEdges.filter((e) => visited.has(e.sourceNodeId) && visited.has(e.targetNodeId)),
		};
	}, [focusMode, selectedNodeId, visibleNodes, visibleEdges, currentView]);

	const relationOptions: RelationType[] = currentView?.type === "network" ? NETWORK_RELATION_TYPES : GENEALOGY_RELATION_TYPES;

	// --- Conversione dati grafo -> nodi/archi React Flow -----------------

	const flowNodes: Node[] = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		return focusedNodes.map((n) => {
			const pos = currentView?.positions[n.id] ?? { x: Math.random() * 500, y: Math.random() * 400 };
			const matchesSearch = !q || n.displayName.toLowerCase().includes(q);
			const data: CharacterNodeFlowData = { node: n, onOpenDrawer: setSelectedNodeId, onNavigateToView: setCurrentViewId };
			return {
				id: n.id,
				type: "relationNode",
				position: pos,
				data,
				selected: n.id === selectedNodeId,
				style: matchesSearch ? undefined : { opacity: 0.25 },
			};
		});
	}, [focusedNodes, currentView, searchQuery, selectedNodeId, setCurrentViewId]);

	const flowEdges: Edge[] = useMemo(() => {
		return focusedEdges.map((e) => {
			const edgeType = e.type === "descendant_gap" ? "gap" : e.isUncertain ? "uncertain" : "relation";
			const data: RelationEdgeFlowData = { edge: e, label: e.label ?? t(`relations.relationTypes.${e.type}`) };
			return {
				id: e.id,
				source: e.sourceNodeId,
				target: e.targetNodeId,
				// Handle esatto (top/right/bottom/left) da cui l'arco deve partire/arrivare:
				// senza questi React Flow sceglierebbe un handle di default invece di
				// quello scelto dall'utente durante il trascinamento.
				sourceHandle: e.sourceHandle,
				targetHandle: e.targetHandle,
				type: edgeType,
				data,
				markerEnd: { type: MarkerType.ArrowClosed, color: colors.textFaint, width: 16, height: 16 },
			};
		});
	}, [focusedEdges, t]);

	// --- Handlers ----------------------------------------------------------

	const onNodesChange = useCallback(
		(changes: NodeChange[]) => {
			const updated = applyNodeChanges(changes, flowNodes);
			const positionChanges = changes.filter((c) => c.type === "position" && !("dragging" in c && c.dragging));
			if (positionChanges.length > 0 && currentView) {
				const positions: Record<string, { x: number; y: number }> = {};
				updated.forEach((n) => (positions[n.id] = n.position));
				updateViewPositionsLocal(currentView.id, positions);
			}
		},
		[flowNodes, currentView, updateViewPositionsLocal]
	);

	const onNodeClick: NodeMouseHandler = useCallback((_evt, node) => {
		setSelectedNodeId(node.id);
	}, []);

	const onEdgeClick: EdgeMouseHandler = useCallback((_evt, edge) => {
		const original = allEdges.find((e) => e.id === edge.id);
		if (!original) return;
		setPendingEdge({
			sourceNodeId: original.sourceNodeId,
			targetNodeId: original.targetNodeId,
			edgeId: original.id,
			sourceHandle: original.sourceHandle,
			targetHandle: original.targetHandle,
		});
	}, [allEdges]);

	const onConnect: OnConnect = useCallback((connection) => {
		if (!connection.source || !connection.target) return;
		// Se tra questi due nodi esiste già un arco (in qualunque direzione), apriamo
		// quello per la modifica invece di permettere un duplicato/bidirezionale.
		const existing = findEdgeBetween(connection.source, connection.target);
		if (existing) {
			setPendingEdge({
				sourceNodeId: existing.sourceNodeId,
				targetNodeId: existing.targetNodeId,
				edgeId: existing.id,
				sourceHandle: existing.sourceHandle,
				targetHandle: existing.targetHandle,
			});
		} else {
			// connection.sourceHandle/targetHandle sono l'id esatto (top/right/bottom/left)
			// dell'handle da cui l'utente ha effettivamente iniziato/terminato il trascinamento:
			// li conserviamo così l'arco riparte sempre da lì, non da un punto arbitrario.
			setPendingEdge({
				sourceNodeId: connection.source,
				targetNodeId: connection.target,
				sourceHandle: connection.sourceHandle ?? undefined,
				targetHandle: connection.targetHandle ?? undefined,
			});
		}
	}, [findEdgeBetween]);

	const handleCreateQuickNode = useCallback(
		async (displayName: string, type: GraphNodeData["type"]) => {
			const center = rf.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
			await addQuickNode(displayName, type, center);
			setIsQuickNodeOpen(false);
		},
		[addQuickNode, rf]
	);

	const handleAddExistingNode = useCallback(
		async (nodeId: string) => {
			const center = rf.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
			await addExistingNodeToView(nodeId, center);
			setIsQuickNodeOpen(false);
		},
		[addExistingNodeToView, rf]
	);

	const nodesNotInView = useMemo(() => {
		if (!currentView) return [];
		const idSet = new Set(currentView.nodeIds);
		return allNodes.filter((n) => !idSet.has(n.id));
	}, [allNodes, currentView]);

	const handleSaveEdge = useCallback(
		async (edge: Omit<GraphEdgeData, "id"> & { id?: string }) => {
			await saveEdge(edge);
			setPendingEdge(null);
			setIsConnecting(false);
		},
		[saveEdge]
	);

	const handleDeleteEdge = useCallback(
		async (id: string) => {
			await deleteEdge(id);
			setPendingEdge(null);
		},
		[deleteEdge]
	);

	const handleRecenter = useCallback(() => {
		if (!currentView) return;
		const positions =
			currentView.type === "genealogy" ? layoutGenealogy(flowNodes, flowEdges) : layoutNetwork(flowNodes, flowEdges);
		updateViewPositionsLocal(currentView.id, positions);
		setTimeout(() => rf.fitView({ padding: 0.2 }), 50);
	}, [currentView, flowNodes, flowEdges, updateViewPositionsLocal, rf]);

	const selectedNode = selectedNodeId ? nodesById[selectedNodeId] : null;

	if (isLoading) {
		return (
			<div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: colors.textFaint }}>
				…
			</div>
		);
	}

	return (
		<div style={{ display: "flex", flexDirection: "column", flex: 1, height: "100%", minHeight: 0, backgroundColor: colors.bgVoid }}>
			<RelationsToolbar
				views={views}
				currentViewId={currentViewId}
				onSelectView={setCurrentViewId}
				onCreateView={(title, type) => createView(title, type)}
				searchQuery={searchQuery}
				onSearch={setSearchQuery}
				onAddNode={() => setIsQuickNodeOpen(true)}
				isConnecting={isConnecting}
				onToggleConnecting={() => setIsConnecting((v) => !v)}
				focusMode={focusMode}
				onToggleFocusMode={() => setFocusMode((v) => !v)}
			/>

			<div style={{ flex: 1, display: "flex", position: "relative", minHeight: 0 }}>
				{!currentView ? (
					<div
						style={{
							flex: 1,
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							justifyContent: "center",
							gap: "0.9rem",
							padding: "2rem",
							textAlign: "center",
						}}
					>
						<div style={{ fontSize: "2rem" }}>🌳</div>
						<div style={{ fontFamily: fonts.display, fontSize: "1.15rem", color: colors.textPrimary }}>
							{t("relations.views.noViews")}
						</div>
						<div style={{ fontSize: "0.85rem", color: colors.textFaint, maxWidth: "380px", lineHeight: 1.5 }}>
							Una <strong>vista</strong> è uno spazio di lavoro separato: crea un{" "}
							<em>{t("relations.views.genealogy")}</em> per un albero genealogico gerarchico (genitori/figli, coniugi),
							oppure una <em>{t("relations.views.network")}</em> per una mappa libera di alleanze, rivalità e fazioni.
							Gli stessi nodi possono comparire in più viste.
						</div>
						<button
							onClick={() => {
								const title = window.prompt("Nome della nuova vista:");
								if (title && title.trim()) createView(title.trim(), "genealogy");
							}}
							style={{
								marginTop: "0.4rem",
								padding: "0.55rem 1.1rem",
								backgroundColor: colors.gold,
								color: colors.bgVoid,
								border: "none",
								borderRadius: radii.pill,
								fontWeight: 600,
								cursor: "pointer",
							}}
						>
							{t("relations.header.newView")}
						</button>
					</div>
				) : (
					<div style={{ flex: 1, position: "relative", minHeight: 0 }}>
						<ReactFlow
							nodes={flowNodes}
							edges={flowEdges}
							nodeTypes={nodeTypes}
							edgeTypes={edgeTypes}
							onNodesChange={onNodesChange}
							onNodeClick={onNodeClick}
							onEdgeClick={onEdgeClick}
							onConnect={isConnecting ? onConnect : undefined}
							nodesConnectable={isConnecting}
							connectionMode={ConnectionMode.Loose}
							connectionLineType={ConnectionLineType.Bezier}
							connectionLineStyle={{ stroke: colors.goldBright, strokeWidth: 2.5 }}
							fitView
							proOptions={{ hideAttribution: true }}
							style={{ backgroundColor: colors.bgVoid }}
						>
							<Background color={colors.borderSubtle} gap={22} />
							<Controls showInteractive={false} />
							<MiniMap
								pannable
								zoomable
								maskColor="rgba(18,20,28,0.75)"
								style={{ backgroundColor: colors.bgPanel }}
								nodeColor={colors.gold}
							/>
						</ReactFlow>

						<button
							onClick={handleRecenter}
							title={t("relations.actions.recenter")}
							style={{
								position: "absolute",
								bottom: "1.2rem",
								left: "1.2rem",
								padding: "0.5rem 0.9rem",
								borderRadius: "999px",
								border: `1px solid ${colors.gold}55`,
								backgroundColor: colors.bgPanel,
								color: colors.gold,
								fontSize: "0.78rem",
								fontWeight: 600,
								cursor: "pointer",
							}}
						>
							⤾ {t("relations.actions.recenter")}
						</button>

						{isConnecting && (
							<div
								style={{
									position: "absolute",
									top: "1.2rem",
									left: "1.2rem",
									padding: "0.4rem 0.8rem",
									borderRadius: radii.pill,
									backgroundColor: colors.bgPanel,
									border: `1px solid ${colors.gold}55`,
									color: colors.goldBright,
									fontSize: "0.75rem",
								}}
							>
								Trascina da un lato qualsiasi di un nodo verso un altro per collegarli.
							</div>
						)}

						{pendingEdge && (
							<EdgeDrawer
								edge={{
									id: pendingEdge.edgeId,
									sourceNodeId: pendingEdge.sourceNodeId,
									targetNodeId: pendingEdge.targetNodeId,
									sourceHandle: pendingEdge.sourceHandle,
									targetHandle: pendingEdge.targetHandle,
									...(pendingEdge.edgeId ? allEdges.find((e) => e.id === pendingEdge.edgeId) : {}),
								}}
								nodesById={nodesById}
								relationOptions={relationOptions}
								onClose={() => setPendingEdge(null)}
								onSave={handleSaveEdge}
								onDelete={pendingEdge.edgeId ? handleDeleteEdge : undefined}
								onRemoveFromView={
									pendingEdge.edgeId
										? async (id) => {
												await removeEdgeFromView(id);
												setPendingEdge(null);
										  }
										: undefined
								}
								conflictingEdge={
									!pendingEdge.edgeId
										? findEdgeBetween(pendingEdge.sourceNodeId, pendingEdge.targetNodeId)
										: undefined
								}
								onEditConflicting={(edgeId) => {
									const conflict = allEdges.find((e) => e.id === edgeId);
									if (conflict) {
										setPendingEdge({
											sourceNodeId: conflict.sourceNodeId,
											targetNodeId: conflict.targetNodeId,
											edgeId: conflict.id,
											sourceHandle: conflict.sourceHandle,
											targetHandle: conflict.targetHandle,
										});
									}
								}}
							/>
						)}
					</div>
				)}

				{selectedNode && (
					<NodeDrawer
						node={selectedNode}
						views={views}
						currentViewId={currentViewId}
						onClose={() => setSelectedNodeId(null)}
						onSave={async (n) => {
							await saveNode(n);
						}}
						onDelete={async (id) => {
							await deleteNode(id);
							setSelectedNodeId(null);
						}}
						onRemoveFromView={async (id) => {
							await removeNodeFromView(id);
							setSelectedNodeId(null);
						}}
						onPromote={promoteNode}
						onOpenWiki={onNavigateToWiki}
						onOpenCharacterSheet={onNavigateToCharacterSheet}
						onNavigateToView={(viewId) => {
							setCurrentViewId(viewId);
							setSelectedNodeId(null);
						}}
					/>
				)}
			</div>

			{isQuickNodeOpen && (
				<QuickNodeModal
					onClose={() => setIsQuickNodeOpen(false)}
					onCreate={handleCreateQuickNode}
					existingNodes={nodesNotInView}
					onAddExisting={handleAddExistingNode}
				/>
			)}
		</div>
	);
};

export const RelationsView: React.FC<RelationsViewProps> = (props) => (
	<ReactFlowProvider>
		<RelationsCanvas {...props} />
	</ReactFlowProvider>
);
