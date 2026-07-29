import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { MapItem, MapWithPortals } from "../types/map";
import { getTopLevelMap } from "../utils/mapHierarchy";

export const useMaps = () => {
    const [maps, setMaps] = useState<MapItem[]>([]);
    const [currentMapData, setCurrentMapData] = useState<MapWithPortals | null>(null);
    const [history, setHistory] = useState<string[]>([]);
    const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
    const [isAddingPortal, setIsAddingPortal] = useState<boolean>(false);
    const [selectedTargetMapId, setSelectedTargetMapId] = useState<string>("");
    const [error, setError] = useState<string | null>(null);

    // Riferimenti per evitare che transizioni sovrapposte si "scavalchino" a vicenda,
    // e per sapere se abbiamo già caricato la mappa iniziale senza mettere
    // currentMapData nelle dipendenze di fetchMaps (che altrimenti si ricrea
    // ad ogni navigazione, causando un re-fetch continuo).
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
        try {
            const res = await invoke<MapWithPortals>("get_map_details", { id: mapId });
            setCurrentMapData(res);
        } catch (err) {
            console.error("Errore nel caricamento della mappa:", err);
            setError("Impossibile caricare i dettagli della mappa.");
        }
    }, []);

    const fetchMaps = useCallback(async () => {
        try {
            const res = await invoke<MapItem[]>("get_all_maps");
            setMaps(res);

            if (res.length > 0 && !hasLoadedInitialMap.current) {
                hasLoadedInitialMap.current = true;
                const topMap = getTopLevelMap(res);
                if (topMap) {
                    loadMapDetails(topMap.id);
                }
            }
        } catch (err) {
            console.error("Errore nel recupero delle mappe:", err);
            setError("Impossibile caricare l'elenco delle mappe.");
        }
    }, [loadMapDetails]);

    // Navigazione "interna" (click su sidebar/portali): mantiene l'animazione
    // a due tempi e la cronologia per il tasto "indietro".
    const navigateToMap = useCallback((targetMapId: string) => {
        if (!currentMapData || targetMapId === currentMapData.map.id || isTransitioning) return;

        clearPendingTransitions();
        setIsTransitioning(true);
        const previousId = currentMapData.map.id;

        const t1 = window.setTimeout(async () => {
            await loadMapDetails(targetMapId);
            setHistory((prev) => {
                if (prev[prev.length - 1] === previousId) return prev;
                return [...prev, previousId];
            });
            const t2 = window.setTimeout(() => setIsTransitioning(false), 100);
            transitionTimeouts.current.push(t2);
        }, 300);
        transitionTimeouts.current.push(t1);
    }, [currentMapData, isTransitioning, loadMapDetails, clearPendingTransitions]);

    const navigateBack = useCallback(() => {
        if (history.length === 0 || isTransitioning) return;

        clearPendingTransitions();
        const previousMapId = history[history.length - 1];
        setIsTransitioning(true);

        const t1 = window.setTimeout(async () => {
            await loadMapDetails(previousMapId);
            setHistory((prev) => prev.slice(0, -1));
            const t2 = window.setTimeout(() => setIsTransitioning(false), 100);
            transitionTimeouts.current.push(t2);
        }, 300);
        transitionTimeouts.current.push(t1);
    }, [history, isTransitioning, loadMapDetails, clearPendingTransitions]);

    // Navigazione "esterna" (link da un articolo Wiki o da un evento Timeline):
    // niente animazione a due tempi, niente dipendenza da isTransitioning.
    // Non può MAI lasciare isTransitioning bloccato, perché non lo tocca.
    // Interrompe qualsiasi transizione interna in corso e salta subito alla
    // mappa richiesta, aggiungendo comunque la mappa di provenienza alla
    // cronologia se ce n'era una.
    const jumpToMap = useCallback(async (targetMapId: string) => {
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
    }, [loadMapDetails, clearPendingTransitions]);

    const handleAddPortal = async (x: number, y: number, label?: string) => {
        if (!currentMapData || !selectedTargetMapId) return;
        try {
            await invoke<string>("add_portal", {
                sourceMapId: currentMapData.map.id,
                targetMapId: selectedTargetMapId,
                x,
                y,
                label: label || "Portale",
            });
            await loadMapDetails(currentMapData.map.id);
            setIsAddingPortal(false);
            setSelectedTargetMapId("");
        } catch (err) {
            console.error("Errore nella creazione del portale:", err);
            setError("Impossibile creare il portale.");
        }
    };

    const handleDeletePortal = async (portalId: string) => {
        if (!currentMapData) return;
        try {
            await invoke("delete_portal", { id: portalId });
            await loadMapDetails(currentMapData.map.id);
        } catch (err) {
            console.error("Errore nell'eliminazione del portale:", err);
            setError("Impossibile eliminare il portale.");
        }
    };

    const handleDeleteMap = async (mapId: string) => {
        try {
            await invoke("delete_map", { id: mapId });
            if (currentMapData?.map.id === mapId) {
                setCurrentMapData(null);
                hasLoadedInitialMap.current = false;
            }
            await fetchMaps();
        } catch (err) {
            console.error("Errore nell'eliminazione della mappa:", err);
            setError("Impossibile eliminare la mappa.");
        }
    };

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