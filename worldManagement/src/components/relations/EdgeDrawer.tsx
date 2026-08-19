import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { colors, fonts, radii } from "../theme/theme";
import { useLocalization } from "../../context/LocalizationContext";
import { GraphEdgeData, GraphNodeData, RelationType } from "../../types/relations";
import { Z_INDEX } from "../common/zIndex";
import { Button } from "../common/Button";

interface EdgeDrawerProps {
  edge: Partial<GraphEdgeData> & { sourceNodeId: string; targetNodeId: string };
  nodesById: Record<string, GraphNodeData>;
  relationOptions: RelationType[];
  onClose: () => void;
  onSave: (edge: Omit<GraphEdgeData, "id"> & { id?: string }) => void;
  onDelete?: (id: string) => void;
  /** Arco già esistente tra questi due nodi (in qualunque direzione). Se presente
   *  e stiamo creando un arco nuovo (edge.id assente), il salvataggio viene bloccato:
   *  non sono ammessi collegamenti bidirezionali/duplicati tra la stessa coppia di nodi. */
  conflictingEdge?: GraphEdgeData;
  onEditConflicting?: (edgeId: string) => void;
  /** Chiamato ad ogni modifica dei campi, prima del salvataggio: permette al
   *  canvas di mostrare un'anteprima live dell'arco invece di farlo sparire
   *  mentre il drawer è aperto. */
  onDraftChange?: (draft: { type: RelationType; label: string; isUncertain: boolean }) => void;
}

const fieldLabelStyle: React.CSSProperties = {
  fontSize: "0.66rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: colors.textFaint,
  marginBottom: "0.3rem",
  display: "block",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  backgroundColor: colors.bgPanelRaised,
  color: colors.textPrimary,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.sm,
  padding: "0.5rem 0.6rem",
  fontFamily: fonts.body,
  fontSize: "0.88rem",
  outline: "none",
  boxSizing: "border-box",
};

// Nota di design: a differenza di NodeDrawer, questo NON usa il componente
// <Drawer> condiviso. <Drawer> e un pannello docked a tutta altezza; qui
// serve una card flottante e compatta (position:absolute, top-right) che
// appare accanto al punto dove si sta disegnando la connessione senza
// coprire meta canvas. Aggiungo solo la chiusura via ESC per coerenza di
// comportamento con gli altri overlay dell'app.
export const EdgeDrawer: React.FC<EdgeDrawerProps> = ({
  edge,
  nodesById,
  relationOptions,
  onClose,
  onSave,
  onDelete,
  conflictingEdge,
  onEditConflicting,
  onDraftChange,
}) => {
  const { t } = useLocalization();
  const [type, setType] = useState<RelationType>(edge.type ?? relationOptions[0] ?? "custom");
  const [label, setLabel] = useState(edge.label ?? "");
  const [description, setDescription] = useState(edge.description ?? "");
  const [isUncertain, setIsUncertain] = useState(edge.isUncertain ?? false);
  const [gapCount, setGapCount] = useState<number | undefined>(edge.generationalGapCount);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    setType(edge.type ?? relationOptions[0] ?? "custom");
    setLabel(edge.label ?? "");
    setDescription(edge.description ?? "");
    setIsUncertain(edge.isUncertain ?? false);
    setGapCount(edge.generationalGapCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edge.id ?? `${edge.sourceNodeId}-${edge.targetNodeId}`]);

  // Notifica il canvas ad ogni cambio, per l'anteprima live dell'arco.
  useEffect(() => {
    onDraftChange?.({ type, label, isUncertain });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, label, isUncertain]);

  const sourceName = nodesById[edge.sourceNodeId]?.displayName ?? "?";
  const targetName = nodesById[edge.targetNodeId]?.displayName ?? "?";
  const isBlocked = !edge.id && !!conflictingEdge;

  const handleSave = () => {
    onSave({
      id: edge.id,
      sourceNodeId: edge.sourceNodeId,
      targetNodeId: edge.targetNodeId,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type,
      label: label.trim() || undefined,
      description: description.trim() || undefined,
      isUncertain,
      generationalGapCount: type === "descendant_gap" ? gapCount : undefined,
    });
  };

  return (
    <div
      style={{
        position: "absolute",
        top: "1.2rem",
        right: "1.2rem",
        width: "300px",
        maxHeight: "calc(100% - 2.4rem)",
        overflowY: "auto",
        backgroundColor: colors.bgPanel,
        border: `1px solid ${colors.borderSubtle}`,
        borderRadius: radii.lg,
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        padding: "1.1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        zIndex: Z_INDEX.drawer,
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h4 style={{ margin: 0, fontFamily: fonts.display, fontSize: "1.02rem" }}>
          {edge.id ? t("relations.edgeDrawer.editTitle") : t("relations.header.addEdge")}
        </h4>
        <Button
          variant="ghost"
          iconOnly
          size="sm"
          icon={X}
          onClick={onClose}
          style={{ border: "none" }}
        />
      </div>

      <div style={{ fontSize: "0.78rem", color: colors.textSecondary }}>
        {sourceName} → {targetName}
      </div>

      {isBlocked && (
        <div
          style={{
            fontSize: "0.76rem",
            color: colors.crimsonBright,
            backgroundColor: colors.crimsonWash,
            border: `1px solid ${colors.crimson}55`,
            borderRadius: radii.sm,
            padding: "0.55rem 0.65rem",
            lineHeight: 1.4,
          }}
        >
          {t("relations.edgeDrawer.conflictMessage", {
            type: t(`relations.relationTypes.${conflictingEdge!.type}`),
          })}
          {onEditConflicting && (
            <button
              onClick={() => onEditConflicting(conflictingEdge!.id)}
              style={{
                display: "block",
                marginTop: "0.5rem",
                background: "none",
                border: "none",
                color: colors.crimsonBright,
                textDecoration: "underline",
                cursor: "pointer",
                padding: 0,
                fontSize: "0.76rem",
              }}
            >
              {t("relations.edgeDrawer.editConflicting")}
            </button>
          )}
        </div>
      )}

      <div>
        <label style={fieldLabelStyle}>{t("relations.edgeDrawer.typeLabel")}</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as RelationType)}
          style={inputStyle}
        >
          {relationOptions.map((opt) => (
            <option key={opt} value={opt}>
              {t(`relations.relationTypes.${opt}`)}
            </option>
          ))}
        </select>
      </div>

      {type === "descendant_gap" && (
        <div>
          <label style={fieldLabelStyle}>{t("relations.gap.label")}</label>
          <input
            type="number"
            min={1}
            style={inputStyle}
            value={gapCount ?? ""}
            onChange={(e) => setGapCount(e.target.value ? Number(e.target.value) : undefined)}
            placeholder={t("relations.edgeDrawer.gapCountPlaceholder")}
          />
        </div>
      )}

      <div>
        <label style={fieldLabelStyle}>{t("relations.edgeDrawer.labelLabel")}</label>
        <input
          style={inputStyle}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t("relations.edgeDrawer.labelPlaceholder")}
        />
      </div>

      <div>
        <label style={fieldLabelStyle}>{t("relations.edgeDrawer.descriptionLabel")}</label>
        <textarea
          style={{ ...inputStyle, minHeight: "64px", resize: "vertical", fontFamily: fonts.body }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("relations.edgeDrawer.descriptionPlaceholder")}
        />
        <div style={{ fontSize: "0.68rem", color: colors.textFaint, marginTop: "0.25rem" }}>
          {t("relations.edgeDrawer.descriptionHint")}
        </div>
      </div>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.82rem",
          color: colors.textSecondary,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={isUncertain}
          onChange={(e) => setIsUncertain(e.target.checked)}
        />
        {t("relations.uncertain.label")}
      </label>

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.3rem" }}>
        <Button variant="primary" onClick={handleSave} disabled={isBlocked} style={{ flex: 1 }}>
          {t("common.save")}
        </Button>
        {edge.id && onDelete && (
          <Button
            variant="danger"
            onClick={() => onDelete(edge.id!)}
            title={t("relations.edgeDrawer.deleteTooltip")}
          >
            {t("common.delete")}
          </Button>
        )}
      </div>
    </div>
  );
};
