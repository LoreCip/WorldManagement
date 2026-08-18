import React, { useState, useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useMaps } from "../hooks/useMaps";
import { MapHeader } from "../components/maps/MapHeader";
import { PortalControls } from "../components/maps/PortalControls";
import { MapCanvas } from "../components/maps/MapCanvas";
import { MapFormModal } from "../components/maps/MapFormModal";
import { MapSidebar } from "../components/maps/MapSidebar";
import { colors, fonts, radii } from "../components/theme/theme";
import { useLocalization } from "../context/LocalizationContext";
import { Z_INDEX } from "../components/common/zIndex";

interface MapViewProps {
  onOpenArticle?: (articleId: string) => void;
  initialMapId?: string | null;
}

export const MapView: React.FC<MapViewProps> = ({ onOpenArticle, initialMapId }) => {
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
    jumpToMap,
    handleAddPortal,
    handleDeletePortal,
    handleDeleteMap,
    refreshMaps,
  } = useMaps();

  const { t } = useLocalization();

  const [portalLabel, setPortalLabel] = useState<string>("");

  const [isAddMapOpen, setIsAddMapOpen] = useState(false);
  const [isEditMapOpen, setIsEditMapOpen] = useState(false);
  const [droppedFilePath, setDroppedFilePath] = useState<string | null>(null);
  const [isHoveringDrop, setIsHoveringDrop] = useState(false);

  const lastHandledInitialMapIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!initialMapId || maps.length === 0) return;
    if (lastHandledInitialMapIdRef.current === initialMapId) return;

    const targetExists = maps.some((m) => m.id === initialMapId);
    if (!targetExists) return;

    lastHandledInitialMapIdRef.current = initialMapId;
    jumpToMap(initialMapId);
  }, [initialMapId, maps, jumpToMap]);

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
        u1();
        u2();
        u3();
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
    <div
      style={{
        flex: 1,
        display: "flex",
        backgroundColor: colors.bgVoid,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>
        {`
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
                    
                    @media (max-width: 900px) {
                        .hide-on-small {
                            display: none;
                        }
                    }
                `}
      </style>

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
            zIndex: Z_INDEX.dragOverlay,
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
          {t("maps.dropImage")}
        </div>
      )}

      <MapSidebar
        maps={maps}
        currentMapId={currentMapData?.map.id}
        onSelectMap={(mapId) => navigateToMap(mapId)}
        onNewMap={() => setIsAddMapOpen(true)}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          position: "relative",
        }}
      >
        {currentMapData && (
          <MapHeader
            map={currentMapData.map}
            totalMapsCount={maps.length}
            hasHistory={history.length > 0}
            onBack={navigateBack}
            onDelete={() => handleDeleteMap(currentMapData.map.id)}
            onOpenArticle={onOpenArticle}
            onEdit={() => setIsEditMapOpen(true)}
          >
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
          </MapHeader>
        )}

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
            <p
              style={{ fontFamily: fonts.display, fontSize: "1.2rem", color: colors.textSecondary }}
            >
              {t("maps.noMapSelected")}
            </p>
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: "0.9rem",
                color: colors.textFaint,
                maxWidth: "400px",
                textAlign: "center",
              }}
            >
              {t("maps.selectMap")}
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
              {t("maps.newMap")}
            </button>
          </div>
        )}
      </div>

      <MapFormModal
        mode="add"
        isOpen={isAddMapOpen}
        existingMaps={maps}
        initialFilePath={droppedFilePath}
        onClose={handleCloseModal}
        onSaved={refreshMaps}
      />

      {currentMapData && (
        <MapFormModal
          mode="edit"
          isOpen={isEditMapOpen}
          currentMap={currentMapData.map}
          existingMaps={maps}
          onClose={() => setIsEditMapOpen(false)}
          onSaved={refreshMaps}
        />
      )}
    </div>
  );
};
