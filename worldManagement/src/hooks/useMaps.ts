import { useState, useEffect, useCallback } from "react";
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

    const clearError = useCallback(() => setError(null), []);

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

            if (res.length > 0 && !currentMapData) {
                const topMap = getTopLevelMap(res);
                if (topMap) {
                    loadMapDetails(topMap.id);
                }
            }
        } catch (err) {
            console.error("Errore nel recupero delle mappe:", err);
            setError("Impossibile caricare l'elenco delle mappe.");
        }
    }, [currentMapData, loadMapDetails]);

    const navigateToMap = useCallback(async (targetMapId: string) => {
        if (!currentMapData || targetMapId === currentMapData.map.id || isTransitioning) return;

        setIsTransitioning(true);
        const previousId = currentMapData.map.id;

        setTimeout(async () => {
            await loadMapDetails(targetMapId);
            setHistory((prev) => {
                // Evita di spingere in history la stessa mappa consecutivamente
                if (prev[prev.length - 1] === previousId) return prev;
                return [...prev, previousId];
            });
            setTimeout(() => setIsTransitioning(false), 100);
        }, 300);
    }, [currentMapData, isTransitioning, loadMapDetails]);

    const navigateBack = useCallback(async () => {
        if (history.length === 0 || isTransitioning) return;

        const previousMapId = history[history.length - 1];
        setIsTransitioning(true);

        setTimeout(async () => {
            await loadMapDetails(previousMapId);
            setHistory((prev) => prev.slice(0, -1));
            setTimeout(() => setIsTransitioning(false), 100);
        }, 300);
    }, [history, isTransitioning, loadMapDetails]);

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
        handleAddPortal,
        handleDeletePortal,
        handleDeleteMap,
        refreshMaps: fetchMaps,
    };
};