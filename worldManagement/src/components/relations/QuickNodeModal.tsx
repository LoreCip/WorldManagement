import React, { useState } from "react";
import { X } from "lucide-react";
import { colors, radii } from "../theme/theme";
import { useLocalization } from "../../context/LocalizationContext";
import { GraphNodeData, NodeType } from "../../types/relations";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";

interface QuickNodeModalProps {
  onClose: () => void;
  onCreate: (displayName: string, type: NodeType) => void;
  /** Nodi già esistenti nel grafo ma non ancora presenti nella vista corrente. */
  existingNodes: GraphNodeData[];
  onAddExisting: (nodeId: string) => void;
}

const TYPE_OPTIONS: NodeType[] = ["placeholder", "unknown", "entity"];

export const QuickNodeModal: React.FC<QuickNodeModalProps> = ({
  onClose,
  onCreate,
  existingNodes,
  onAddExisting,
}) => {
  const { t } = useLocalization();
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [name, setName] = useState("");
  const [type, setType] = useState<NodeType>("placeholder");
  const [query, setQuery] = useState("");

  const submit = () => {
    if (!name.trim()) return;
    onCreate(name.trim(), type);
  };

  const filteredExisting = existingNodes.filter((n) =>
    n.displayName.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <Modal isOpen onClose={onClose} width="360px" title={t("relations.header.addNode")}>
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem" }}>
        <Button
          variant="secondary"
          size="sm"
          active={mode === "new"}
          onClick={() => setMode("new")}
          style={{ flex: 1 }}
        >
          {t("relations.quickNode.tabNew")}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          active={mode === "existing"}
          onClick={() => setMode("existing")}
          style={{ flex: 1 }}
        >
          {t("relations.quickNode.tabExisting")}
        </Button>
      </div>

      {mode === "new" ? (
        <>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={t("relations.quickNode.namePlaceholder")}
            style={{
              width: "100%",
              backgroundColor: colors.bgPanelRaised,
              color: colors.textPrimary,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.sm,
              padding: "0.55rem 0.7rem",
              fontSize: "0.9rem",
              outline: "none",
              boxSizing: "border-box",
              marginBottom: "0.9rem",
            }}
          />

          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.1rem" }}>
            {TYPE_OPTIONS.map((opt) => (
              <Button
                key={opt}
                variant="secondary"
                size="sm"
                active={type === opt}
                onClick={() => setType(opt)}
                style={{ flex: 1, padding: "0.5rem 0.3rem", fontSize: "0.72rem" }}
              >
                {t(`relations.nodeTypes.${opt}`)}
              </Button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button variant="primary" onClick={submit} style={{ flex: 1 }}>
              {t("common.save")}
            </Button>
            <Button variant="secondary" iconOnly icon={X} onClick={onClose} />
          </div>
        </>
      ) : (
        <>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("relations.quickNode.searchPlaceholder")}
            style={{
              width: "100%",
              backgroundColor: colors.bgPanelRaised,
              color: colors.textPrimary,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.sm,
              padding: "0.55rem 0.7rem",
              fontSize: "0.9rem",
              outline: "none",
              boxSizing: "border-box",
              marginBottom: "0.7rem",
            }}
          />
          <div style={{ maxHeight: "220px", overflowY: "auto", marginBottom: "0.9rem" }}>
            {filteredExisting.length === 0 ? (
              <div
                style={{
                  fontSize: "0.8rem",
                  color: colors.textFaint,
                  textAlign: "center",
                  padding: "1rem 0",
                }}
              >
                {existingNodes.length === 0
                  ? t("relations.quickNode.noneLeft")
                  : t("relations.quickNode.noResults")}
              </div>
            ) : (
              filteredExisting.map((n) => (
                <div
                  key={n.id}
                  onClick={() => onAddExisting(n.id)}
                  style={{
                    padding: "0.55rem 0.7rem",
                    borderRadius: radii.sm,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontSize: "0.85rem",
                    color: colors.textPrimary,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = colors.bgPanelRaised)
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <span style={{ opacity: 0.6, fontSize: "0.72rem" }}>
                    {t(`relations.nodeTypes.${n.type}`)}
                  </span>
                  {n.displayName}
                </div>
              ))
            )}
          </div>
          <Button variant="secondary" onClick={onClose} style={{ width: "100%" }}>
            {t("relations.quickNode.close")}
          </Button>
        </>
      )}
    </Modal>
  );
};
