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

import { Check, X, LocateFixed } from "lucide-react";
import { colors, fonts, radii } from "../components/theme/theme";
import { useLocalization } from "../context/LocalizationContext";
import { useConfirm } from "../components/common/ConfirmDialog";
import { Button } from "../components/common/Button";
import { useRelations } from "../hooks/useRelations";
import { CharacterNode, CharacterNodeFlowData } from "../components/relations/CharacterNode";
import { RelationEdge, RelationEdgeFlowData } from "../components/relations/RelationEdge";
import { GapEdge } from "../components/relations/GapEdge";
import { UncertainEdge } from "../components/relations/UncertainEdge";
import { NodeDrawer } from "../components/relations/NodeDrawer";
import { EdgeDrawer } from "../components/relations/EdgeDrawer";
import { RelationsToolbar } from "../components/relations/RelationsToolbar";
import { QuickNodeModal } from "../components/relations/QuickNodeModal";
import {
  GraphEdgeData,
  GraphNodeData,
  GraphView,
  GENEALOGY_RELATION_TYPES,
  NETWORK_RELATION_TYPES,
  RelationType,
} from "../types/relations";
import { layoutGenealogy, layoutNetwork, getFallbackPosition } from "../utils/graphLayout";

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

type DraftEdgePreview = { type: RelationType; label: string; isUncertain: boolean };

const DEFAULT_FOCUS_DEPTH = 2;

const RelationsCanvas: React.FC<RelationsViewProps> = ({
  onNavigateToWiki,
  onNavigateToCharacterSheet,
}) => {
  const { t } = useLocalization();
  const confirm = useConfirm();
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
    deleteView,
    updateViewPositionsLocal,
    saveNode,
    addQuickNode,
    addExistingNodeToView,
    deleteNode,
    removeNodeFromView,
    promoteNode,
    saveEdge,
    deleteEdge,
    findEdgeBetween,
  } = useRelations();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [pendingEdge, setPendingEdge] = useState<PendingConnection | null>(null);
  const [draftEdgePreview, setDraftEdgePreview] = useState<DraftEdgePreview | null>(null);
  const [isQuickNodeOpen, setIsQuickNodeOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [focusDepth, setFocusDepth] = useState(DEFAULT_FOCUS_DEPTH);
  const [isCreatingFromEmpty, setIsCreatingFromEmpty] = useState(false);
  const [emptyViewTitle, setEmptyViewTitle] = useState("");

  const submitEmptyView = () => {
    if (!emptyViewTitle.trim()) return;
    createView(emptyViewTitle.trim(), "genealogy");
    setEmptyViewTitle("");
    setIsCreatingFromEmpty(false);
  };

  const nodesById = useMemo(() => {
    const map: Record<string, GraphNodeData> = {};
    allNodes.forEach((n) => (map[n.id] = n));
    return map;
  }, [allNodes]);

  // Nodi/archi risultanti dalla "modalità focus" (BFS attorno al nodo selezionato,
  // per N passi dove N è regolabile dallo stepper in toolbar).
  const { focusedNodes, focusedEdges } = useMemo(() => {
    if (!focusMode || !selectedNodeId)
      return { focusedNodes: visibleNodes, focusedEdges: visibleEdges };

    const visited = new Set<string>([selectedNodeId]);
    let frontier = [selectedNodeId];
    for (let i = 0; i < focusDepth; i++) {
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
      focusedEdges: visibleEdges.filter(
        (e) => visited.has(e.sourceNodeId) && visited.has(e.targetNodeId),
      ),
    };
  }, [focusMode, selectedNodeId, focusDepth, visibleNodes, visibleEdges]);

  const relationOptions: RelationType[] =
    currentView?.type === "network" ? NETWORK_RELATION_TYPES : GENEALOGY_RELATION_TYPES;

  // --- Conversione dati grafo -> nodi/archi React Flow -----------------

  const flowNodes: Node[] = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return focusedNodes.map((n) => {
      const pos = currentView?.positions[n.id] ?? getFallbackPosition();
      const matchesSearch = !q || n.displayName.toLowerCase().includes(q);
      const data: CharacterNodeFlowData = {
        node: n,
        onOpenDrawer: setSelectedNodeId,
        onNavigateToView: setCurrentViewId,
      };
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
      const edgeType =
        e.type === "descendant_gap" ? "gap" : e.isUncertain ? "uncertain" : "relation";
      const data: RelationEdgeFlowData = {
        edge: e,
        label: e.label ?? t(`relations.relationTypes.${e.type}`),
        description: e.description,
      };
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

  // Anteprima "live" dell'arco che si sta creando: senza questa, la linea
  // tracciata trascinando sparisce non appena si rilascia il mouse (perché
  // l'arco non esiste ancora nel grafo) e ricompare solo al salvataggio nel
  // drawer. La mostriamo tratteggiata finché non viene confermata.
  const previewEdge: Edge | null = useMemo(() => {
    if (!pendingEdge || pendingEdge.edgeId) return null;
    const relType = draftEdgePreview?.type ?? relationOptions[0] ?? "custom";
    const label = draftEdgePreview?.label?.trim() || t(`relations.relationTypes.${relType}`);
    const data: RelationEdgeFlowData = {
      edge: {
        id: "__draft__",
        sourceNodeId: pendingEdge.sourceNodeId,
        targetNodeId: pendingEdge.targetNodeId,
        type: relType,
        isUncertain: draftEdgePreview?.isUncertain,
        label,
      } as GraphEdgeData,
      label,
    };
    return {
      id: "__draft__",
      source: pendingEdge.sourceNodeId,
      target: pendingEdge.targetNodeId,
      sourceHandle: pendingEdge.sourceHandle,
      targetHandle: pendingEdge.targetHandle,
      type: "relation",
      data,
      style: { strokeDasharray: "5 4", opacity: 0.75 },
      markerEnd: { type: MarkerType.ArrowClosed, color: colors.textFaint, width: 16, height: 16 },
    };
  }, [pendingEdge, draftEdgePreview, relationOptions, t]);

  const displayedEdges = previewEdge ? [...flowEdges, previewEdge] : flowEdges;

  // --- Handlers ----------------------------------------------------------

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const updated = applyNodeChanges(changes, flowNodes);
      const positionChanges = changes.filter(
        (c) => c.type === "position" && !("dragging" in c && c.dragging),
      );
      if (positionChanges.length > 0 && currentView) {
        const positions: Record<string, { x: number; y: number }> = {};
        updated.forEach((n) => (positions[n.id] = n.position));
        updateViewPositionsLocal(currentView.id, positions);
      }
    },
    [flowNodes, currentView, updateViewPositionsLocal],
  );

  const onNodeClick: NodeMouseHandler = useCallback((_evt, node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onEdgeClick: EdgeMouseHandler = useCallback(
    (_evt, edge) => {
      if (edge.id === "__draft__") return;
      const original = allEdges.find((e) => e.id === edge.id);
      if (!original) return;
      setPendingEdge({
        sourceNodeId: original.sourceNodeId,
        targetNodeId: original.targetNodeId,
        edgeId: original.id,
        sourceHandle: original.sourceHandle,
        targetHandle: original.targetHandle,
      });
    },
    [allEdges],
  );

  const onConnect: OnConnect = useCallback(
    (connection) => {
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
      setDraftEdgePreview(null);
    },
    [findEdgeBetween],
  );

  const handleCreateQuickNode = useCallback(
    async (displayName: string, type: GraphNodeData["type"]) => {
      const center = rf.screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
      await addQuickNode(displayName, type, center);
      setIsQuickNodeOpen(false);
    },
    [addQuickNode, rf],
  );

  const handleAddExistingNode = useCallback(
    async (nodeId: string) => {
      const center = rf.screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
      await addExistingNodeToView(nodeId, center);
      setIsQuickNodeOpen(false);
    },
    [addExistingNodeToView, rf],
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
      setDraftEdgePreview(null);
      setIsConnecting(false);
    },
    [saveEdge],
  );

  const handleDeleteEdge = useCallback(
    async (id: string) => {
      const confirmed = await confirm(t("relations.edgeDrawer.deleteConfirm"));
      if (!confirmed) return;

      await deleteEdge(id);
      setPendingEdge(null);
      setDraftEdgePreview(null);
    },
    [deleteEdge, confirm, t],
  );

  const handleCloseEdgeDrawer = useCallback(() => {
    setPendingEdge(null);
    setDraftEdgePreview(null);
  }, []);

  const handleDeleteView = useCallback(
    async (view: GraphView) => {
      const confirmed = await confirm(t("relations.views.deleteConfirm", { title: view.title }));
      if (confirmed) deleteView(view.id);
    },
    [deleteView, t, confirm],
  );

  const handleRecenter = useCallback(() => {
    if (!currentView) return;
    const positions =
      currentView.type === "genealogy"
        ? layoutGenealogy(flowNodes, flowEdges)
        : layoutNetwork(flowNodes, flowEdges);
    updateViewPositionsLocal(currentView.id, positions);
    setTimeout(() => rf.fitView({ padding: 0.2 }), 50);
  }, [currentView, flowNodes, flowEdges, updateViewPositionsLocal, rf]);

  const selectedNode = selectedNodeId ? nodesById[selectedNodeId] : null;

  if (isLoading) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: colors.textFaint,
        }}
      >
        …
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        height: "100%",
        minHeight: 0,
        backgroundColor: colors.bgVoid,
      }}
    >
      <RelationsToolbar
        views={views}
        currentViewId={currentViewId}
        onSelectView={setCurrentViewId}
        onCreateView={(title, type) => createView(title, type)}
        onDeleteView={handleDeleteView}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        onAddNode={() => setIsQuickNodeOpen(true)}
        isConnecting={isConnecting}
        onToggleConnecting={() => setIsConnecting((v) => !v)}
        focusMode={focusMode}
        onToggleFocusMode={() => setFocusMode((v) => !v)}
        focusDepth={focusDepth}
        onFocusDepthChange={setFocusDepth}
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

            {views.length === 0 ? (
              <>
                <div
                  style={{
                    fontFamily: fonts.display,
                    fontSize: "1.15rem",
                    color: colors.textPrimary,
                  }}
                >
                  {t("relations.empty.firstTimeTitle")}
                </div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: colors.textFaint,
                    maxWidth: "380px",
                    lineHeight: 1.5,
                  }}
                >
                  {t("relations.empty.firstTimeBodyPrefix")}{" "}
                  <em>{t("relations.views.genealogy")}</em> {t("relations.empty.firstTimeBodyMid")}{" "}
                  <em>{t("relations.views.network")}</em> {t("relations.empty.firstTimeBodySuffix")}
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    fontFamily: fonts.display,
                    fontSize: "1.15rem",
                    color: colors.textPrimary,
                  }}
                >
                  {t("relations.empty.pickTitle")}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                    justifyContent: "center",
                    maxWidth: "420px",
                  }}
                >
                  {views.map((v) => (
                    <Button
                      key={v.id}
                      variant="secondary"
                      pill
                      onClick={() => setCurrentViewId(v.id)}
                    >
                      {v.title}{" "}
                      <span style={{ color: colors.textFaint }}>
                        · {t(`relations.views.${v.type}`)}
                      </span>
                    </Button>
                  ))}
                </div>
              </>
            )}

            {isCreatingFromEmpty ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  marginTop: "0.4rem",
                }}
              >
                <input
                  autoFocus
                  value={emptyViewTitle}
                  onChange={(e) => setEmptyViewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitEmptyView()}
                  placeholder={t("relations.views.newViewNamePlaceholder")}
                  style={{
                    backgroundColor: colors.bgPanel,
                    color: colors.textPrimary,
                    border: `1px solid ${colors.gold}77`,
                    borderRadius: radii.sm,
                    padding: "0.5rem 0.7rem",
                    fontSize: "0.85rem",
                  }}
                />
                <Button variant="primary" pill iconOnly icon={Check} onClick={submitEmptyView} />
                <Button
                  variant="secondary"
                  pill
                  iconOnly
                  icon={X}
                  onClick={() => setIsCreatingFromEmpty(false)}
                />
              </div>
            ) : (
              <Button variant="primary" pill onClick={() => setIsCreatingFromEmpty(true)}>
                {t("relations.header.newView")}
              </Button>
            )}
          </div>
        ) : (
          <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
            <ReactFlow
              nodes={flowNodes}
              edges={displayedEdges}
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

            <Button
              variant="secondary"
              pill
              icon={LocateFixed}
              onClick={handleRecenter}
              title={t("relations.actions.recenter")}
              style={{
                position: "absolute",
                bottom: "1.2rem",
                left: "1.2rem",
                backgroundColor: colors.bgPanel,
                color: colors.gold,
                borderColor: `${colors.gold}55`,
              }}
            >
              {t("relations.actions.recenter")}
            </Button>

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
                {t("relations.connectingHint")}
              </div>
            )}

            {focusMode && !selectedNodeId && (
              <div
                style={{
                  position: "absolute",
                  top: "1.2rem",
                  left: "1.2rem",
                  padding: "0.4rem 0.8rem",
                  borderRadius: radii.pill,
                  backgroundColor: colors.bgPanel,
                  border: `1px solid ${colors.indigo}55`,
                  color: colors.indigo,
                  fontSize: "0.75rem",
                }}
              >
                {t("relations.focus.needSelection")}
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
                onClose={handleCloseEdgeDrawer}
                onSave={handleSaveEdge}
                onDelete={pendingEdge.edgeId ? handleDeleteEdge : undefined}
                onDraftChange={pendingEdge.edgeId ? undefined : setDraftEdgePreview}
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
              const confirmed = await confirm(t("relations.nodeDrawer.deleteConfirm"));
              if (!confirmed) return;
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
