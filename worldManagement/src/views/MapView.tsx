import React, { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useMaps } from "../hooks/useMaps";
import { MapHeader } from "../components/maps/MapHeader";
import { PortalControls } from "../components/maps/PortalControls";
import { MapCanvas } from "../components/maps/MapCanvas";
import { AddMapModal } from "../components/maps/AddMapModal";
import { EditMapModal } from "../components/maps/EditMapModal";
import { MapSidebar } from "../components/maps/MapSidebar";
import { colors, fonts, radii } from "../components/theme/theme";

interface MapViewProps {
    onOpenArticle?: (articleId: string) => void;
}

export const MapView: React.FC<MapViewProps> = ({ onOpenArticle }) => {
    const {
        maps,
        currentMapData,
        history,
        isTransitioning,
        isAddingPortal,
        selectedTargetMapId,
        setIsAddingPortal,
        setSelectedTargetMapId,
        navigateToMap,
        navigateBack,
        handleAddPortal,
        handleDeletePortal,
        handleDeleteMap,
        refreshMaps,
    } = useMaps();

    const [portalLabel, setPortalLabel] = useState<string>("");

    // Stati locali per Modal e Drag & Drop
    const [isAddMapOpen, setIsAddMapOpen] = useState(false);
    const [isEditMapOpen, setIsEditMapOpen] = useState(false);
    const [droppedFilePath, setDroppedFilePath] = useState<string | null>(null);
    const [isHoveringDrop, setIsHoveringDrop] = useState(false);

    // Gestione Drag & Drop nativa di Tauri
    useEffect(() => {
        let unlistens: Array<() => void> = [];
        let isMounted = true;

        const setupListeners = async () => {
            const win = getCurrentWindow();

            const u1 = await win.listen<{ paths: string[] }>("tauri://drag-drop", (event) => {
                setIsHoveringDrop(false);
                const paths = event.payload.paths;

                if (paths && paths.length > 0) {
                    const firstPath = paths[0];
                    const ext = firstPath.split(".").pop()?.toLowerCase();

                    if (["png", "jpg", "jpeg", "webp"].includes(ext || "")) {
                        setDroppedFilePath(firstPath);
                        setIsAddMapOpen(true);
                    }
                }
            });

            const u2 = await win.listen("tauri://drag-over", () => setIsHoveringDrop(true));
            const u3 = await win.listen("tauri://drag-cancelled", () => setIsHoveringDrop(false));

            if (isMounted) {
                unlistens = [u1, u2, u3];
            } else {
                u1(); u2(); u3();
            }
        };

        setupListeners();

        return () => {
            isMounted = false;
            unlistens.forEach((unlisten) => unlisten());
        };
    }, []);

    const handleCloseModal = () => {
        setIsAddMapOpen(false);
        setDroppedFilePath(null);
    };

    return (
        <div style={{ flex: 1, display: "flex", backgroundColor: colors.bgVoid, position: "relative", overflow: "hidden" }}>
            {/* Animazioni e regole di transizione per il Canvas */}
            <style>{`
                    .map-transition-overlay {
                        transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s ease-out;
                        opacity: 1;
                        transform: scale(1);
                    }
                    .map-transition-overlay.fading {
                        opacity: 0;
                        transform: scale(1.08);
                        pointer-events: none;
                    }
                    .custom-portal-pin:hover div {
                        transform: scale(1.3);
                        background-color: ${colors.goldBright} !important;
                    }
                    .leaflet-container {
                        background-color: ${colors.bgVoid} !important;
                    }
                    
                    /* Nasconde il testo sui bottoni secondari quando la finestra si rimpicciolisce */
                    @media (max-width: 900px) {
                        .hide-on-small {
                            display: none;
                        }
                    }
                `}
            </style>

            {/* Overlay Drag & Drop */}
            {isHoveringDrop && (
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: `${colors.gold}18`,
                        border: `2px dashed ${colors.gold}`,
                        zIndex: 3000,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: colors.gold,
                        fontSize: "1.2rem",
                        fontWeight: 600,
                        pointerEvents: "none",
                        backdropFilter: "blur(4px)",
                        fontFamily: fonts.body,
                    }}
                >
                    📂 Rilascia qui l'immagine per aggiungere una nuova mappa
                </div>
            )}

            {/* Sidebar della Sezione Cartografia */}
            <MapSidebar
                maps={maps}
                currentMapId={currentMapData?.map.id}
                onSelectMap={(mapId) => navigateToMap(mapId)}
                onNewMap={() => setIsAddMapOpen(true)}
            />

            {/* Area Principale del Contenuto */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
                {/* Header della Mappa */}
                {currentMapData && (
                    <div
                        style={{
                            padding: "1.2rem 2rem",
                            backgroundColor: colors.bgPanel,
                            borderBottom: `1px solid ${colors.border}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            zIndex: 1000,
                        }}
                    >
                        <MapHeader
                            map={currentMapData.map}
                            totalMapsCount={maps.length}
                            hasHistory={history.length > 0}
                            onBack={navigateBack}
                            onDelete={() => handleDeleteMap(currentMapData.map.id)}
                            onOpenArticle={onOpenArticle}
                            onEdit={() => setIsEditMapOpen(true)}
                        />

                        {/* Strumenti Portale */}
                        <PortalControls
                            isAddingPortal={isAddingPortal}
                            maps={maps}
                            currentMapId={currentMapData.map.id}
                            selectedTargetMapId={selectedTargetMapId}
                            portalLabel={portalLabel}
                            onStart={() => setIsAddingPortal(true)}
                            onCancel={() => setIsAddingPortal(false)}
                            onSelectTarget={setSelectedTargetMapId}
                            onLabelChange={setPortalLabel}
                        />
                    </div>
                )}

                {/* Canvas Mappa con dissolvenza e zoom al passaggio */}
                {currentMapData ? (
                    <MapCanvas
                        map={currentMapData.map}
                        portals={currentMapData.portals}
                        isTransitioning={isTransitioning}
                        isAddingPortal={isAddingPortal}
                        hasSelectedTarget={Boolean(selectedTargetMapId)}
                        onMapClick={(x, y) => handleAddPortal(x, y, portalLabel)}
                        onEnterPortal={navigateToMap}
                        onDeletePortal={handleDeletePortal}
                    />
                ) : (
                    <div
                        style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            color: colors.textFaint,
                            gap: "1.2rem",
                        }}
                    >
                        <span style={{ fontSize: "3rem", opacity: 0.3 }}>🗺️</span>
                        <p style={{ fontFamily: fonts.display, fontSize: "1.2rem", color: colors.textSecondary }}>
                            Nessuna mappa selezionata
                        </p>
                        <p style={{ fontFamily: fonts.body, fontSize: "0.9rem", color: colors.textFaint, maxWidth: "400px", textAlign: "center" }}>
                            Seleziona una mappa dalla barra laterale, trascina un'immagine nel canvas o crea una nuova mappa.
                        </p>
                        <button
                            onClick={() => setIsAddMapOpen(true)}
                            style={{
                                padding: "0.6rem 1.4rem",
                                borderRadius: radii.md,
                                backgroundColor: colors.gold,
                                color: colors.bgVoid,
                                border: "none",
                                cursor: "pointer",
                                fontFamily: fonts.body,
                                fontWeight: 600,
                                fontSize: "0.9rem",
                            }}
                        >
                            + Nuova Mappa
                        </button>
                    </div>
                )}
            </div>

            {/* Modali */}
            <AddMapModal
                isOpen={isAddMapOpen}
                existingMaps={maps}
                initialFilePath={droppedFilePath}
                onClose={handleCloseModal}
                onMapAdded={refreshMaps}
            />

            {currentMapData && (
                <EditMapModal
                    isOpen={isEditMapOpen}
                    currentMap={currentMapData.map}
                    existingMaps={maps}
                    onClose={() => setIsEditMapOpen(false)}
                    onMapUpdated={refreshMaps}
                />
            )}
        </div>
    );
};