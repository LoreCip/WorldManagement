import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invokeSafe, invokeOrThrow } from "../lib/ipc";
import {
  GraphEdgeData,
  GraphNodeData,
  GraphView,
  GraphViewType,
  NodeType,
  RelationType,
} from "../types/relations";

const EMPTY_VIEW = (type: GraphViewType): GraphView => ({
  id: "",
  title: "",
  type,
  nodeIds: [],
  edgeIds: [],
  positions: {},
});

export function useRelations() {
  const [nodes, setNodes] = useState<GraphNodeData[]>([]);
  const [edges, setEdges] = useState<GraphEdgeData[]>([]);
  const [views, setViews] = useState<GraphView[]>([]);
  const [currentViewId, setCurrentViewId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    const [n, e, v] = await Promise.all([
      invokeSafe<GraphNodeData[]>("get_all_graph_nodes"),
      invokeSafe<GraphEdgeData[]>("get_all_graph_edges"),
      invokeSafe<GraphView[]>("get_all_graph_views"),
    ]);
    setNodes(n ?? []);
    setEdges(e ?? []);
    setViews(v ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const currentView = useMemo(
    () => views.find((v) => v.id === currentViewId) ?? null,
    [views, currentViewId],
  );

  // Nodi/archi effettivamente visibili: se una vista è selezionata, solo quelli
  // inclusi in quella vista; altrimenti l'intero grafo (utile in fase di
  // esplorazione/creazione, prima di organizzare tutto in viste dedicate).
  const visibleNodes = useMemo(() => {
    if (!currentView) return nodes;
    const idSet = new Set(currentView.nodeIds);
    return nodes.filter((n) => idSet.has(n.id));
  }, [nodes, currentView]);

  const visibleEdges = useMemo(() => {
    if (!currentView) return edges;
    const idSet = new Set(currentView.edgeIds);
    return edges.filter((e) => idSet.has(e.id));
  }, [edges, currentView]);

  // -------------------------------------------------------------------
  // VISTE
  // -------------------------------------------------------------------

  const createView = useCallback(
    async (title: string, type: GraphViewType) => {
      const draft = { ...EMPTY_VIEW(type), title };
      const id = await invokeSafe<string>("save_graph_view", { view: draft });
      if (id === null) return null;
      await loadAll();
      setCurrentViewId(id);
      return id;
    },
    [loadAll],
  );

  const deleteView = useCallback(
    async (id: string) => {
      try {
        await invokeOrThrow<void>("delete_graph_view", { id });
      } catch {
        return;
      }
      if (currentViewId === id) setCurrentViewId(null);
      await loadAll();
    },
    [currentViewId, loadAll],
  );

  const renameView = useCallback(
    async (view: GraphView, title: string, description?: string) => {
      const result = await invokeSafe<string>("save_graph_view", {
        view: { ...view, title, description },
      });
      if (result === null) return;
      await loadAll();
    },
    [loadAll],
  );

  // Persistenza posizioni con debounce: durante il drag sul canvas evitiamo
  // di scrivere sul DB ad ogni frame.
  const positionsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistPositions = useCallback(
    (viewId: string, positions: Record<string, { x: number; y: number }>) => {
      if (positionsSaveTimer.current) clearTimeout(positionsSaveTimer.current);
      positionsSaveTimer.current = setTimeout(() => {
        invokeSafe("update_graph_view_positions", { id: viewId, positions });
      }, 400);
    },
    [],
  );

  const updateViewPositionsLocal = useCallback(
    (viewId: string, positions: Record<string, { x: number; y: number }>) => {
      setViews((prev) =>
        prev.map((v) =>
          v.id === viewId ? { ...v, positions: { ...v.positions, ...positions } } : v,
        ),
      );
      persistPositions(viewId, positions);
    },
    [persistPositions],
  );

  // -------------------------------------------------------------------
  // NODI
  // -------------------------------------------------------------------

  const saveNode = useCallback(
    async (node: GraphNodeData) => {
      const id = await invokeSafe<string>("save_graph_node", { node });
      if (id === null) return null;
      await loadAll();
      return id;
    },
    [loadAll],
  );

  /** Crea un nodo rapido (placeholder/unknown/entity) e lo aggiunge subito alla vista corrente. */
  const addQuickNode = useCallback(
    async (displayName: string, type: NodeType, position: { x: number; y: number }) => {
      const id = await invokeSafe<string>("save_graph_node", {
        node: { id: "", type, displayName },
      });
      if (id === null) return null;

      if (currentView) {
        const updated: GraphView = {
          ...currentView,
          nodeIds: [...currentView.nodeIds, id],
          positions: { ...currentView.positions, [id]: position },
        };
        await invokeSafe<string>("save_graph_view", { view: updated });
      }

      await loadAll();
      return id;
    },
    [currentView, loadAll],
  );

  /** Aggiunge un nodo già esistente (es. una scheda personaggio) alla vista corrente. */
  const addExistingNodeToView = useCallback(
    async (nodeId: string, position: { x: number; y: number }) => {
      if (!currentView) return;
      const updated: GraphView = {
        ...currentView,
        nodeIds: currentView.nodeIds.includes(nodeId)
          ? currentView.nodeIds
          : [...currentView.nodeIds, nodeId],
        positions: { ...currentView.positions, [nodeId]: position },
      };
      await invokeSafe<string>("save_graph_view", { view: updated });
      await loadAll();
    },
    [currentView, loadAll],
  );

  const deleteNode = useCallback(
    async (id: string) => {
      try {
        await invokeOrThrow<void>("delete_graph_node", { id });
      } catch {
        return;
      }
      await loadAll();
    },
    [loadAll],
  );

  /** Rimuove il nodo solo dalla vista corrente, senza cancellarlo dal grafo globale. */
  const removeNodeFromView = useCallback(
    async (id: string) => {
      if (!currentView) return;
      const updated: GraphView = {
        ...currentView,
        nodeIds: currentView.nodeIds.filter((n) => n !== id),
        edgeIds: currentView.edgeIds.filter((eId) => {
          const e = edges.find((edge) => edge.id === eId);
          return e && e.sourceNodeId !== id && e.targetNodeId !== id;
        }),
      };
      await invokeSafe<string>("save_graph_view", { view: updated });
      await loadAll();
    },
    [currentView, edges, loadAll],
  );

  const promoteNode = useCallback(
    async (nodeId: string, systemId: string) => {
      const sheetId = await invokeSafe<string>("promote_node_to_character", { nodeId, systemId });
      if (sheetId === null) {
        throw new Error("Impossibile promuovere il nodo a personaggio.");
      }
      await loadAll();
      return sheetId;
    },
    [loadAll],
  );

  // -------------------------------------------------------------------
  // ARCHI
  // -------------------------------------------------------------------

  const saveEdge = useCallback(
    async (edge: Omit<GraphEdgeData, "id"> & { id?: string }) => {
      const id = await invokeSafe<string>("save_graph_edge", {
        edge: { ...edge, id: edge.id ?? "" },
      });
      if (id === null) return null;

      if (currentView && !currentView.edgeIds.includes(id)) {
        const updated: GraphView = { ...currentView, edgeIds: [...currentView.edgeIds, id] };
        await invokeSafe<string>("save_graph_view", { view: updated });
      }

      await loadAll();
      return id;
    },
    [currentView, loadAll],
  );

  const deleteEdge = useCallback(
    async (id: string) => {
      try {
        await invokeOrThrow<void>("delete_graph_edge", { id });
      } catch {
        return;
      }
      await loadAll();
    },
    [loadAll],
  );

  /** Rimuove l'arco solo dalla vista corrente, senza cancellarlo dal grafo globale
   *  (utile se lo stesso arco è condiviso da più viste, es. genealogy + network). */
  const removeEdgeFromView = useCallback(
    async (id: string) => {
      if (!currentView) return;
      const updated: GraphView = {
        ...currentView,
        edgeIds: currentView.edgeIds.filter((e) => e !== id),
      };
      await invokeSafe<string>("save_graph_view", { view: updated });
      await loadAll();
    },
    [currentView, loadAll],
  );

  const findEdgeBetween = useCallback(
    (nodeAId: string, nodeBId: string, excludeEdgeId?: string) => {
      return edges.find((e) => {
        if (excludeEdgeId && e.id === excludeEdgeId) return false;
        const sameDirection = e.sourceNodeId === nodeAId && e.targetNodeId === nodeBId;
        const oppositeDirection = e.sourceNodeId === nodeBId && e.targetNodeId === nodeAId;
        return sameDirection || oppositeDirection;
      });
    },
    [edges],
  );

  return {
    isLoading,
    nodes,
    edges,
    views,
    currentView,
    currentViewId,
    setCurrentViewId,
    visibleNodes,
    visibleEdges,

    createView,
    deleteView,
    renameView,
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

    reload: loadAll,
  };
}

export type UseRelationsReturn = ReturnType<typeof useRelations>;
export type { RelationType };
