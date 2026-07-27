import React from "react";
import { MapMeta } from "../../types/map";
import { colors, fonts, radii } from "../theme/theme";

interface MapHeaderProps {
    map: MapMeta;
    totalMapsCount: number; // <-- Aggiunta qui
    hasHistory: boolean;
    onBack: () => void;
    onDelete: () => void;
    onOpenArticle?: (articleId: string) => void;
    onEdit?: () => void;
}

export const MapHeader: React.FC<MapHeaderProps> = ({
    map,
    totalMapsCount, // <-- Aggiunta qui
    hasHistory,
    onBack,
    onDelete,
    onOpenArticle,
    onEdit,
}) => {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", flexWrap: "wrap", minWidth: 0 }}>
            {hasHistory && (
                <button
                    onClick={onBack}
                    title="Mappa precedente"
                    style={{
                        padding: "0.4rem 0.7rem",
                        borderRadius: radii.md,
                        backgroundColor: colors.bgPanelRaised,
                        color: colors.gold,
                        border: `1px solid ${colors.border}`,
                        cursor: "pointer",
                        fontFamily: fonts.body,
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        flexShrink: 0,
                    }}
                >
                    ← <span className="hide-on-small">Indietro</span>
                </button>
            )}

            {/* Titolo e Tag Mappa */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", minWidth: 0 }}>
                <h1
                    style={{
                        fontFamily: fonts.display,
                        fontSize: "1.35rem",
                        fontWeight: 500,
                        color: colors.textPrimary,
                        margin: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                >
                    {map.title}
                </h1>

                <span
                    style={{
                        fontSize: "0.65rem",
                        fontFamily: fonts.body,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        padding: "0.15rem 0.5rem",
                        borderRadius: radii.pill,
                        backgroundColor: `${colors.gold}15`,
                        color: colors.gold,
                        border: `1px solid ${colors.gold}33`,
                        fontWeight: 600,
                        flexShrink: 0,
                    }}
                >
                    MAPPA
                </span>
            </div>

            {/* Azioni secondarie (Lore, Modifica, Elimina) */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
                {map.article_id && onOpenArticle && (
                    <button
                        onClick={() => onOpenArticle(map.article_id!)}
                        title="Apri articolo Wiki associato"
                        style={{
                            padding: "0.4rem 0.7rem",
                            borderRadius: radii.md,
                            backgroundColor: colors.bgPanelRaised,
                            color: colors.gold,
                            border: `1px solid ${colors.gold}44`,
                            cursor: "pointer",
                            fontSize: "0.82rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            fontWeight: 500,
                        }}
                    >
                        📖 <span className="hide-on-small">Lore</span>
                    </button>
                )}

                <button
                    onClick={onEdit}
                    title="Modifica mappa"
                    style={{
                        padding: "0.4rem 0.65rem",
                        borderRadius: radii.md,
                        backgroundColor: colors.bgPanelRaised,
                        color: colors.textPrimary,
                        border: `1px solid ${colors.border}`,
                        cursor: "pointer",
                        fontSize: "0.82rem",
                        fontFamily: fonts.body,
                    }}
                >
                    ✏️ <span className="hide-on-small">Modifica</span>
                </button>

                {/* Mostra il pulsante Elimina solo se ci sono più mappe attive nel sistema */}
                {totalMapsCount > 1 && (
                    <button
                        onClick={onDelete}
                        title="Elimina questa mappa"
                        style={{
                            padding: "0.4rem 0.6rem",
                            borderRadius: radii.md,
                            backgroundColor: "transparent",
                            color: colors.crimson,
                            border: `1px solid ${colors.crimson}44`,
                            cursor: "pointer",
                            fontSize: "0.82rem",
                        }}
                    >
                        🗑️
                    </button>
                )}
            </div>
        </div>
    );
};