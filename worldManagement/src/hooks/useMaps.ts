import { useState, useEffect, useCallback, useRef } from "react";
import { invokeSafe, invokeOrThrow } from "../lib/ipc";
import { useLocalization } from "../context/LocalizationContext";
import { useConfirm } from "../components/common/ConfirmDialog";
import { MapItem, MapWithPortals } from "../types/map";
import { getTopLevelMap } from "../utils/mapHierarchy";

export const useMaps = () => {
  const { t } = useLocalization();
  const confirm = useConfirm();
  const [maps, setMaps] = useState<MapItem[]>([]);
  const [currentMapData, setCurrentMapData] = useState<MapWithPortals | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [isAddingPortal, setIsAddingPortal] = useState<boolean>(false);
  const [selectedTargetMapId, setSelectedTargetMapId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const transitionTimeouts = useRef<number[]>([]);
  const hasLoadedInitialMap = useRef(false);
  const currentMapDataRef = useRef<MapWithPortals | null>(null);
  currentMapDataRef.current = currentMapData;

  const clearError = useCallback(() => setError(null), []);

  const clearPendingTransitions = useCallback(() => {
    transitionTimeouts.current.forEach((id) => clearTimeout(id));
    transitionTimeouts.current = [];
  }, []);

  // Ripulisce eventuali timeout pendenti se l'hook viene smontato
  // (es. l'utente cambia tab mentre un'animazione è in corso).
  useEffect(() => {
    return () => clearPendingTransitions();
  }, [clearPendingTransitions]);

  const loadMapDetails = useCallback(async (mapId: string) => {
    const res = await invokeSafe<MapWithPortals>("get_map_details", { id: mapId });
    if (res === null) {
      setError("Impossibile caricare i dettagli della mappa.");
      // La mappa richiesta non esiste più lato backend (es. una voce di
      // sidebar rimasta visibile da uno stato non ancora riallineato):
      // la togliamo localmente così non resta più cliccabile/in cronologia.
      setMaps((prev) => prev.filter((m) => m.id !== mapId));
      setHistory((prev) => prev.filter((id) => id !== mapId));
      return;
    }
    setCurrentMapData(res);
  }, []);

  const fetchMaps = useCallback(async () => {
    const res = await invokeSafe<MapItem[]>("get_all_maps");
    if (res === null) {
      setError("Impossibile caricare l'elenco delle mappe.");
      return;
    }
    setMaps(res);

    if (res.length > 0 && !hasLoadedInitialMap.current) {
      hasLoadedInitialMap.current = true;
      const topMap = getTopLevelMap(res);
      if (topMap) {
        loadMapDetails(topMap.id);
      }
    }
  }, [loadMapDetails]);

  const runTransition = useCallback(
    (targetMapId: string, updateHistory: (leavingMapId: string | undefined) => void) => {
      clearPendingTransitions();
      setIsTransitioning(true);
      const leavingMapId = currentMapDataRef.current?.map.id;

      const t1 = window.setTimeout(async () => {
        await loadMapDetails(targetMapId);
        updateHistory(leavingMapId);
        const t2 = window.setTimeout(() => setIsTransitioning(false), 100);
        transitionTimeouts.current.push(t2);
      }, 300);
      transitionTimeouts.current.push(t1);
    },
    [loadMapDetails, clearPendingTransitions],
  );

  // Navigazione "interna" (click su sidebar/portali): mantiene l'animazione
  // a due tempi e la cronologia per il tasto "indietro".
  const navigateToMap = useCallback(
    (targetMapId: string) => {
      if (!currentMapData || targetMapId === currentMapData.map.id || isTransitioning) return;

      runTransition(targetMapId, (leavingMapId) => {
        if (!leavingMapId) return;
        setHistory((prev) =>
          prev[prev.length - 1] === leavingMapId ? prev : [...prev, leavingMapId],
        );
      });
    },
    [currentMapData, isTransitioning, runTransition],
  );

  const navigateBack = useCallback(() => {
    if (history.length === 0 || isTransitioning) return;

    const previousMapId = history[history.length - 1];
    runTransition(previousMapId, () => {
      setHistory((prev) => prev.slice(0, -1));
    });
  }, [history, isTransitioning, runTransition]);

  const jumpToMap = useCallback(
    async (targetMapId: string) => {
      if (currentMapDataRef.current?.map.id === targetMapId) return;

      clearPendingTransitions();
      setIsTransitioning(false); // sblocca forzatamente qualunque stato precedente

      const previousId = currentMapDataRef.current?.map.id;
      await loadMapDetails(targetMapId);

      if (previousId) {
        setHistory((prev) => {
          if (prev[prev.length - 1] === previousId) return prev;
          return [...prev, previousId];
        });
      }
    },
    [loadMapDetails, clearPendingTransitions],
  );

  const handleAddPortal = useCallback(
    async (x: number, y: number, label?: string) => {
      if (!currentMapData || !selectedTargetMapId) return;

      const result = await invokeSafe<string>("add_portal", {
        sourceMapId: currentMapData.map.id,
        targetMapId: selectedTargetMapId,
        x,
        y,
        label: label || "Portale",
      });
      if (result === null) {
        setError("Impossibile creare il portale.");
        return;
      }

      await loadMapDetails(currentMapData.map.id);
      setIsAddingPortal(false);
      setSelectedTargetMapId("");
    },
    [currentMapData, selectedTargetMapId, loadMapDetails],
  );

  const handleDeletePortal = useCallback(
    async (portalId: string) => {
      if (!currentMapData) return;

      const confirmed = await confirm(t("maps.hook.deletePortalConfirm"));
      if (!confirmed) return;

      try {
        await invokeOrThrow<void>("delete_portal", { id: portalId });
      } catch {
        setError("Impossibile eliminare il portale.");
        return;
      }

      await loadMapDetails(currentMapData.map.id);
    },
    [currentMapData, loadMapDetails, confirm, t],
  );

  const handleDeleteMap = useCallback(
    async (mapId: string) => {
      const confirmed = await confirm(t("maps.hook.deleteMapConfirm"));
      if (!confirmed) return;

      const wasCurrentMap = currentMapDataRef.current?.map.id === mapId;
      const parentMapId = wasCurrentMap ? currentMapDataRef.current?.map.parent_map_id : null;

      try {
        await invokeOrThrow<void>("delete_map", { id: mapId });
      } catch {
        setError("Impossibile eliminare la mappa.");
        return;
      }

      // Aggiorna la lista in locale subito invece di aspettare un
      // round-trip fetchMaps(): la voce sparisce dalla sidebar all'istante.
      // I figli della mappa eliminata diventano orfani (il backend fa
      // ON DELETE SET NULL su parent_map_id), quindi li rispecchiamo qui.
      setMaps((prev) =>
        prev
          .filter((m) => m.id !== mapId)
          .map((m) => (m.parent_map_id === mapId ? { ...m, parent_map_id: null } : m)),
      );

      // La mappa eliminata potrebbe comparire nella cronologia "indietro"
      // (es. l'utente l'ha visitata in passato ma sta guardando un'altra
      // mappa ora): senza questa pulizia, un successivo "indietro" tenta di
      // ricaricare un id ormai inesistente e get_map_details fallisce.
      setHistory((prev) => prev.filter((id) => id !== mapId));

      if (wasCurrentMap) {
        clearPendingTransitions();
        setIsTransitioning(false);
        if (parentMapId) {
          await loadMapDetails(parentMapId);
        } else {
          setCurrentMapData(null);
          hasLoadedInitialMap.current = false;
        }
      }
    },
    [confirm, t, loadMapDetails, clearPendingTransitions],
  );

  useEffect(() => {
    fetchMaps();
  }, [fetchMaps]);

  return {
    maps,
    currentMapData,
    history,
    isTransitioning,
    isAddingPortal,
    selectedTargetMapId,
    error,
    clearError,
    setIsAddingPortal,
    setSelectedTargetMapId,
    loadMapDetails,
    navigateToMap,
    navigateBack,
    jumpToMap,
    handleAddPortal,
    handleDeletePortal,
    handleDeleteMap,
    refreshMaps: fetchMaps,
  };
};
