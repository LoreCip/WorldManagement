import React, { useState, useMemo } from "react";
import { MapItem } from "../../types/map";
import { buildMapHierarchy, flattenMapHierarchy } from "../../utils/mapHierarchy";
import { colors, fonts, radii, fontImportTag } from "../theme/theme";

interface MapSidebarProps {
    maps: MapItem[];
    currentMapId?: string;
    onSelectMap: (mapId: string) => void;
    onNewMap: () => void;
}

export const MapSidebar: React.FC<MapSidebarProps> = ({
    maps,
    currentMapId,
    onSelectMap,
    onNewMap,
}) => {
    const [searchQuery, setSearchQuery] = useState("");

    const flatHierarchy = useMemo(() => {
        const tree = buildMapHierarchy(maps);
        return flattenMapHierarchy(tree);
    }, [maps]);

    const filteredHierarchy = useMemo(() => {
        if (!searchQuery.trim()) return flatHierarchy;
        const q = searchQuery.toLowerCase();
        return flatHierarchy.filter((item) => item.map.title.toLowerCase().includes(q));
    }, [flatHierarchy, searchQuery]);

    return (
        <aside
            style={{
                width: "290px",
                borderRight: `1px solid ${colors.borderSubtle}`,
                display: "flex",
                flexDirection: "column",
                padding: "1.5rem 1.1rem",
                backgroundColor: colors.bgPanel,
                color: colors.textPrimary,
                fontFamily: fonts.body,
                boxSizing: "border-box",
                height: "100%",
            }}
        >
            <style>{fontImportTag}</style>

            {/* Header / Brand Mark */}
            <div style={{ marginBottom: "1.6rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                            d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z"
                            stroke={colors.gold}
                            strokeWidth="1.1"
                            strokeLinejoin="round"
                        />
                        <circle cx="12" cy="12" r="1.6" fill={colors.gold} />
                    </svg>
                    <h1
                        style={{
                            fontFamily: fonts.display,
                            fontSize: "1.4rem",
                            fontWeight: 600,
                            letterSpacing: "0.01em",
                            color: colors.textPrimary,
                            margin: 0,
                        }}
                    >
                        Cartografia
                    </h1>
                </div>
                <div
                    style={{
                        fontSize: "0.66rem",
                        letterSpacing: "0.13em",
                        textTransform: "uppercase",
                        color: colors.textFaint,
                        marginTop: "0.3rem",
                        marginLeft: "1.8rem",
                    }}
                >
                    Atlante dell'ambientazione
                </div>
                <div
                    style={{
                        height: "1px",
                        marginTop: "1rem",
                        background: `linear-gradient(90deg, ${colors.gold}77, transparent 75%)`,
                    }}
                />
            </div>

            {/* Pulsante Nuova Mappa */}
            <button
                onClick={onNewMap}
                style={{
                    padding: "0.6rem 1rem",
                    backgroundColor: colors.gold,
                    color: colors.bgVoid,
                    border: "none",
                    borderRadius: radii.md,
                    cursor: "pointer",
                    fontFamily: fonts.body,
                    fontWeight: 600,
                    fontSize: "0.88rem",
                    letterSpacing: "0.01em",
                    marginBottom: "1.1rem",
                    transition: "background-color 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.goldBright)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.gold)}
            >
                + Nuova mappa
            </button>

            {/* Input di ricerca nello stesso stile della Wiki */}
            <div style={{ position: "relative", marginBottom: "1.3rem" }}>
                <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={colors.textFaint}
                    strokeWidth="2"
                    style={{ position: "absolute", left: "0.15rem", top: "50%", transform: "translateY(-50%)" }}
                    aria-hidden="true"
                >
                    <circle cx="11" cy="11" r="7" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                    type="text"
                    placeholder="Cerca un territorio o mappa…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                        width: "100%",
                        padding: "0.5rem 0.4rem 0.5rem 1.5rem",
                        backgroundColor: "transparent",
                        border: "none",
                        borderBottom: `1px solid ${colors.border}`,
                        color: colors.textPrimary,
                        fontFamily: fonts.body,
                        fontSize: "0.88rem",
                        borderRadius: 0,
                        boxSizing: "border-box",
                        outline: "none",
                        transition: "border-color 0.15s ease",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderBottomColor = colors.gold)}
                    onBlur={(e) => (e.currentTarget.style.borderBottomColor = colors.border)}
                />
            </div>

            {/* Lista Mappe in Albero Gerarchico */}
            <div style={{ flex: 1, overflowY: "auto" }}>
                {filteredHierarchy.length === 0 ? (
                    <div
                        style={{
                            color: colors.textFaint,
                            fontFamily: fonts.display,
                            fontStyle: "italic",
                            fontSize: "0.95rem",
                            textAlign: "center",
                            marginTop: "2rem",
                        }}
                    >
                        Nessuna mappa corrisponde alla ricerca.
                    </div>
                ) : (
                    filteredHierarchy.map(({ map, level }) => {
                        const isSelected = currentMapId === map.id;
                        return (
                            <div
                                key={map.id}
                                onClick={() => onSelectMap(map.id)}
                                style={{
                                    padding: "0.65rem 0.75rem",
                                    paddingLeft: `${0.75 + level * 0.85}rem`,
                                    borderRadius: radii.sm,
                                    backgroundColor: isSelected ? colors.bgPanelRaised : "transparent",
                                    borderLeft: `3px solid ${isSelected ? colors.gold : "transparent"}`,
                                    cursor: "pointer",
                                    marginBottom: "0.3rem",
                                    transition: "background-color 0.15s ease, border-color 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                    if (!isSelected) e.currentTarget.style.backgroundColor = colors.bgPanelRaised + "80";
                                }}
                                onMouseLeave={(e) => {
                                    if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                                }}
                            >
                                <div
                                    style={{
                                        fontFamily: fonts.display,
                                        fontWeight: 600,
                                        fontSize: "1rem",
                                        color: isSelected ? colors.gold : colors.textPrimary,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {level > 0 ? "↳ " : ""}{map.title}
                                </div>
                                <div
                                    style={{
                                        fontSize: "0.68rem",
                                        letterSpacing: "0.06em",
                                        textTransform: "uppercase",
                                        color: level === 0 ? colors.gold : colors.textFaint,
                                        margin: "3px 0 2px",
                                        fontWeight: 600,
                                    }}
                                >
                                    {level === 0 ? "Mappa Principale" : `Sotto-mappa liv. ${level}`}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </aside>
    );
};