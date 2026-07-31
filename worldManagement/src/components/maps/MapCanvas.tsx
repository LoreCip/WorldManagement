import React, { useEffect } from "react";
import { useMap, MapContainer, ImageOverlay, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { convertFileSrc } from "@tauri-apps/api/core";

import { MapMeta, MapPortal } from "../../types/map";
import { colors, fonts, radii } from "../theme/theme";
import { useLocalization } from "../../context/LocalizationContext";

const MapAutoFit: React.FC<{ bounds: L.LatLngBoundsExpression }> = ({ bounds }) => {
    const map = useMap();

    useEffect(() => {
        if (!bounds) return;

        // 1. Forziamo Leaflet a ricalcolare le dimensioni del div contenitore
        map.invalidateSize();

        // 2. Usiamo setTimeout(..., 50) per dare il tempo a Flexbox e alla DOM di calcolare le dimensioni reali del Canvas
        const timer = setTimeout(() => {
            map.invalidateSize();
            map.fitBounds(bounds, {
                padding: [20, 20],
                animate: false, // Disabilitiamo l'animazione al primo inquadramento per evitare scatti
            });
            // Impostiamo maxBounds subito DOPO aver inquadrato
            map.setMaxBounds(bounds);
        }, 50);

        return () => clearTimeout(timer);
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
    const { t } = useLocalization();
    const imageUrl = convertFileSrc(map.image_path);
    const bounds: L.LatLngBoundsExpression = [
        [0, 0],
        [map.height || 1080, map.width || 1920],
    ];

    return (
        <div
            className={`map-transition-overlay ${isTransitioning ? "fading" : ""}`}
            style={{ flex: 1, position: "relative", width: "100%", height: "100%" }}
        >
            <MapContainer
                key={map.id}
                crs={L.CRS.Simple}
                bounds={bounds}
                maxZoom={5}
                minZoom={-5}
                scrollWheelZoom={true}
                style={{ width: "100%", height: "100%" }}
            >
                <MapAutoFit bounds={bounds} />
                <ImageOverlay url={imageUrl} bounds={bounds} />

                <MapClickHandler
                    isAddingPortal={isAddingPortal && hasSelectedTarget}
                    onMapClick={onMapClick}
                />

                {/* Rendering dei Portali Cliccabili */}
                {portals.map((portal) => (
                    <Marker key={portal.id} position={[portal.y, portal.x]} icon={portalIcon}>
                        {/* Rimosso 'placement="top"' per risolvere l'errore di build TypeScript */}
                        <Popup>
                            <div style={{ fontFamily: fonts.body, color: colors.bgVoid, textAlign: "center" }}>
                                <strong>{portal.label || t("maps.canvas.portalDefault")}</strong>
                                <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.4rem", justifyContent: "center" }}>
                                    <button
                                        /* Aggiunto il controllo con && per garantire che target_map_id sia definito per TypeScript */
                                        onClick={() => portal.target_map_id && onEnterPortal(portal.target_map_id)}
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
                                        {t("common.delete")}
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