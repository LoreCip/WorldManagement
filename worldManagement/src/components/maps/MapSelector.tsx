import React, { useState, useRef, useEffect, useMemo } from "react";
import { MapItem } from "../../types/map";
import { buildMapHierarchy, flattenMapHierarchy } from "../../utils/mapHierarchy";
import { colors, fonts, radii } from "../theme/theme";

interface MapSelectorProps {
    maps: MapItem[];
    currentMapId?: string;
    onSelectMap: (mapId: string) => void;
    placeholder?: string;
    excludeMapId?: string;
}

export const MapSelector: React.FC<MapSelectorProps> = ({
    maps,
    currentMapId,
    onSelectMap,
    placeholder = "Scegli Mappa...",
    excludeMapId,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Mappa selezionata attualmente
    const selectedMap = useMemo(() => maps.find((m) => m.id === currentMapId), [maps, currentMapId]);

    // Costruzione dell'albero gerarchico
    const flatHierarchy = useMemo(() => {
        const filteredMaps = excludeMapId ? maps.filter((m) => m.id !== excludeMapId) : maps;
        const tree = buildMapHierarchy(filteredMaps);
        return flattenMapHierarchy(tree);
    }, [maps, excludeMapId]);

    // Chiude il dropdown quando si clicca fuori
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
            {/* Pulsante/Preview chiuso: MOSTRA SOLO IL NOME PULITO */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    padding: "0.45rem 0.85rem",
                    borderRadius: radii.sm,
                    backgroundColor: colors.bgPanelRaised,
                    color: colors.textPrimary,
                    border: `1px solid ${colors.border}`,
                    fontFamily: fonts.body,
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    outline: "none",
                    minWidth: "160px",
                    justifyContent: "space-between",
                }}
            >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {selectedMap ? selectedMap.title : placeholder}
                </span>
                <span style={{ fontSize: "0.65rem", color: colors.textSecondary, marginLeft: "0.4rem" }}>
                    {isOpen ? "▲" : "▼"}
                </span>
            </button>

            {/* Menu ad Albero Custom aperto */}
            {isOpen && (
                <div
                    style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        marginTop: "4px",
                        backgroundColor: colors.bgPanelRaised,
                        border: `1px solid ${colors.border}`,
                        borderRadius: radii.sm,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                        zIndex: 2000,
                        minWidth: "220px",
                        maxHeight: "300px",
                        overflowY: "auto",
                        padding: "0.3rem 0",
                    }}
                >
                    {flatHierarchy.map(({ map, level, isLast, ancestorsHasMore }) => {
                        const isSelected = map.id === currentMapId;

                        let treePrefix = "";
                        if (level === 0) {
                            treePrefix = "🗺️\u00A0";
                        } else {
                            // 1. Mette la stanghetta '│' per ogni livello antenato che ha altri elementi dopo
                            for (let i = 0; i < level - 1; i++) {
                                treePrefix += ancestorsHasMore[i] ? "│\u00A0\u00A0\u00A0" : "\u00A0\u00A0\u00A0\u00A0";
                            }
                            // 2. Simbolo del nodo corrente
                            treePrefix += isLast ? "└─\u00A0" : "├─\u00A0";
                        }

                        return (
                            <div
                                key={map.id}
                                onClick={() => {
                                    onSelectMap(map.id);
                                    setIsOpen(false);
                                }}
                                style={{
                                    padding: "0.45rem 0.85rem",
                                    fontSize: "0.85rem",
                                    fontFamily: fonts.mono || "monospace",
                                    cursor: "pointer",
                                    backgroundColor: isSelected ? colors.bgPanel : "transparent",
                                    color: isSelected ? colors.gold : colors.textPrimary,
                                    display: "flex",
                                    alignItems: "center",
                                    whiteSpace: "pre",
                                    transition: "background-color 0.12s ease",
                                }}
                                onMouseEnter={(e) => {
                                    if (!isSelected) e.currentTarget.style.backgroundColor = colors.bgPanel;
                                }}
                                onMouseLeave={(e) => {
                                    if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                                }}
                            >
                                <span style={{ opacity: 0.6, marginRight: "4px" }}>{treePrefix}</span>
                                <span style={{ fontWeight: level === 0 ? 600 : 400 }}>{map.title}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};