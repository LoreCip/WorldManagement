import React from "react";
import { MapMeta } from "../../types/map";
import { colors, radii } from "../theme/theme";
import { useLocalization } from "../../context/LocalizationContext";
import { ViewHeader } from "../common/ViewHeader";

interface MapHeaderProps {
    map: MapMeta;
    totalMapsCount: number;
    hasHistory: boolean;
    onBack: () => void;
    onDelete: () => void;
    onOpenArticle?: (articleId: string) => void;
    onEdit?: () => void;
    /** Controlli aggiuntivi da affiancare alle azioni (qui: PortalControls). */
    children?: React.ReactNode;
}

export const MapHeader: React.FC<MapHeaderProps> = ({
    map,
    totalMapsCount,
    hasHistory,
    onBack,
    onDelete,
    onOpenArticle,
    onEdit,
    children,
}) => {
    const { t } = useLocalization();

    const actions = (
        <>
            {map.article_id && onOpenArticle && (
                <button
                    onClick={() => onOpenArticle(map.article_id!)}
                    title={t("maps.header.openLinkedArticle")}
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
                    📖 <span className="hide-on-small">{t("common.lore")}</span>
                </button>
            )}

            <button
                onClick={onEdit}
                title={t("maps.header.changeMap")}
                style={{
                    padding: "0.4rem 0.65rem",
                    borderRadius: radii.md,
                    backgroundColor: colors.bgPanelRaised,
                    color: colors.textPrimary,
                    border: `1px solid ${colors.border}`,
                    cursor: "pointer",
                    fontSize: "0.82rem",
                }}
            >
                ✏️ <span className="hide-on-small">{t("common.edit")}</span>
            </button>

            {/* Mostra il pulsante Elimina solo se ci sono più mappe attive nel sistema */}
            {totalMapsCount > 1 && (
                <button
                    onClick={onDelete}
                    title={t("maps.header.deleteMap")}
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

            {children}
        </>
    );

    return (
        <ViewHeader title={map.title} badge={t("maps.map")} onBack={hasHistory ? onBack : undefined} backLabel={t("common.back")} actions={actions} />
    );
};