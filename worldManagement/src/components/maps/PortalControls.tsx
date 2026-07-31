import React from "react";
import { MapItem } from "../../types/map";
import { colors, fonts, radii } from "../theme/theme";
import { useLocalization } from "../../context/LocalizationContext";

interface PortalControlsProps {
    isAddingPortal: boolean;
    maps: MapItem[];
    currentMapId: string;
    selectedTargetMapId: string;
    portalLabel: string;
    onStart: () => void;
    onCancel: () => void;
    onSelectTarget: (id: string) => void;
    onLabelChange: (label: string) => void;
}

export const PortalControls: React.FC<PortalControlsProps> = ({
    isAddingPortal,
    maps,
    currentMapId,
    selectedTargetMapId,
    portalLabel,
    onStart,
    onCancel,
    onSelectTarget,
    onLabelChange,
}) => {    
    const { t } = useLocalization();

    if (!isAddingPortal) {
        return (
            <button
                onClick={onStart}
                title={t("maps.portal.addPortal")}
                style={{
                    padding: "0.4rem 0.8rem",
                    borderRadius: radii.md,
                    backgroundColor: colors.bgPanelRaised,
                    color: colors.gold,
                    border: `1px solid ${colors.border}`,
                    cursor: "pointer",
                    fontFamily: fonts.body,
                    fontWeight: 500,
                    fontSize: "0.82rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                }}
            >
                🌀 <span className="hide-on-small">{t("maps.portal.newPortal")}</span>
            </button>
        );
    }

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                backgroundColor: colors.bgPanelRaised,
                padding: "0.25rem 0.5rem",
                borderRadius: radii.md,
                border: `1px solid ${colors.gold}55`,
                flexShrink: 0,
            }}
        >
            <select
                value={selectedTargetMapId}
                onChange={(e) => onSelectTarget(e.target.value)}
                style={{
                    padding: "0.3rem 0.5rem",
                    borderRadius: radii.sm,
                    backgroundColor: colors.bgPanel,
                    color: colors.textPrimary,
                    border: `1px solid ${colors.border}`,
                    fontSize: "0.82rem",
                    outline: "none",
                    maxWidth: "130px",
                }}
            >
                <option value="">{t("maps.portal.destination")}</option>
                {maps
                    .filter((m) => m.id !== currentMapId)
                    .map((m) => (
                        <option key={m.id} value={m.id}>
                            {m.title}
                        </option>
                    ))}
            </select>

            <input
                type="text"
                placeholder={t("maps.portal.label")}
                value={portalLabel}
                onChange={(e) => onLabelChange(e.target.value)}
                style={{
                    padding: "0.3rem 0.5rem",
                    borderRadius: radii.sm,
                    backgroundColor: colors.bgPanel,
                    color: colors.textPrimary,
                    border: `1px solid ${colors.border}`,
                    fontSize: "0.82rem",
                    outline: "none",
                    width: "100px",
                }}
            />

            <button
                onClick={onCancel}
                title={t("common.cancel")}
                style={{
                    padding: "0.3rem 0.5rem",
                    borderRadius: radii.sm,
                    backgroundColor: "transparent",
                    color: colors.crimson,
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                }}
            >
                ✕
            </button>
        </div>
    );
};