import React from "react";
import { MapContainer, ImageOverlay, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { convertFileSrc } from "@tauri-apps/api/core";
import { MapMeta, MapPortal } from "../../types/map";
import { colors, fonts, radii } from "../theme/theme";
import "leaflet/dist/leaflet.css";

import { useEffect } from "react";
import { useMap } from "react-leaflet";

const MapAutoFit: React.FC<{ bounds: L.LatLngBoundsExpression }> = ({ bounds }) => {
    const map = useMap();

    useEffect(() => {
        if (!bounds) return;

        // Adatta lo zoom per mostrare l'intera mappa perfettamente centrata nel canvas
        map.fitBounds(bounds, {
            padding: [20, 20], // Margine di respiro opzionale (in pixel)
            animate: true,
        });

        // Opzionale: imposta i confini massimi per evitare di trascinare la mappa fuori dallo schermo
        map.setMaxBounds(bounds);
    }, [map, bounds]);

    return null;
};

// Icona personalizzata per i pin dei portali
const portalIcon = new L.DivIcon({
    className: "custom-portal-pin",
    html: `<div style="
        width: 24px;
        height: 24px;
        background-color: ${colors.gold};
        border: 2px solid ${colors.bgVoid};
        border-radius: 50%;
        box-shadow: 0 0 12px ${colors.goldBright};
        cursor: pointer;
        transition: transform 0.2s ease;
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

// Sub-componente per catturare i click sulla mappa durante l'inserimento di un portale
const MapClickHandler: React.FC<{
    isAddingPortal: boolean;
    onMapClick: (x: number, y: number) => void;
}> = ({ isAddingPortal, onMapClick }) => {
    useMapEvents({
        click(e) {
            if (isAddingPortal) {
                // e.latlng mappa direttamente sulle coordinate pixel [y, x] in CRS.Simple
                onMapClick(e.latlng.lng, e.latlng.lat);
            }
        },
    });
    return null;
};

interface MapCanvasProps {
    map: MapMeta;
    portals: MapPortal[];
    isTransitioning: boolean;
    isAddingPortal: boolean;
    hasSelectedTarget: boolean;
    onMapClick: (x: number, y: number) => void;
    onEnterPortal: (targetMapId: string) => void;
    onDeletePortal: (portalId: string) => void;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({
    map,
    portals,
    isTransitioning,
    isAddingPortal,
    hasSelectedTarget,
    onMapClick,
    onEnterPortal,
    onDeletePortal,
}) => {
    const imageUrl = convertFileSrc(map.image_path);
    
    const bounds: L.LatLngBoundsExpression = [
        [0, 0],
        [map.height || 1080, map.width || 1920],
    ];

    return (
        <div
            className={`map-transition-overlay ${isTransitioning ? "fading" : ""}`}
            style={{ flex: 1, position: "relative" }}
        >
            <MapContainer
                key={map.id}
                crs={L.CRS.Simple}
                bounds={bounds}
                maxZoom={3}
                minZoom={-3}
                scrollWheelZoom={true}
                style={{ width: "100%", height: "100%" }}
            >
                <ImageOverlay url={imageUrl} bounds={bounds} />

                <MapClickHandler
                    isAddingPortal={isAddingPortal && hasSelectedTarget}
                    onMapClick={onMapClick}
                />

                {/* Rendering dei Portali Cliccabili */}
                {portals.map((portal) => (
                    <Marker key={portal.id} position={[portal.y, portal.x]} icon={portalIcon}>
                        <Popup placement="top">
                            <div style={{ fontFamily: fonts.body, color: colors.bgVoid, textAlign: "center" }}>
                                <strong>{portal.label || "Portale"}</strong>
                                <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.4rem", justifyContent: "center" }}>
                                    <button
                                        onClick={() => onEnterPortal(portal.target_map_id)}
                                        style={{
                                            padding: "0.25rem 0.6rem",
                                            borderRadius: "4px",
                                            backgroundColor: colors.gold,
                                            color: colors.bgVoid,
                                            border: "none",
                                            cursor: "pointer",
                                            fontWeight: 600,
                                            fontSize: "0.75rem",
                                        }}
                                    >
                                        Entra ➔
                                    </button>
                                    <button
                                        onClick={() => onDeletePortal(portal.id)}
                                        style={{
                                            padding: "0.25rem 0.5rem",
                                            borderRadius: "4px",
                                            backgroundColor: colors.crimson,
                                            color: "#fff",
                                            border: "none",
                                            cursor: "pointer",
                                            fontSize: "0.75rem",
                                        }}
                                    >
                                        Elimina
                                    </button>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* Banner di aiuto durante la creazione di un portale */}
            {isAddingPortal && (
                <div
                    style={{
                        position: "absolute",
                        bottom: "1.5rem",
                        left: "50%",
                        transform: "translateX(-50%)",
                        backgroundColor: colors.gold,
                        color: colors.bgVoid,
                        padding: "0.5rem 1.2rem",
                        borderRadius: radii.pill,
                        fontFamily: fonts.body,
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
                        zIndex: 1000,
                        pointerEvents: "none",
                    }}
                >
                    {hasSelectedTarget
                        ? "Clicca un punto sulla mappa per posizionare il portale"
                        : "Seleziona prima la mappa di destinazione dal menu in alto"}
                </div>
            )}
        </div>
    );
};