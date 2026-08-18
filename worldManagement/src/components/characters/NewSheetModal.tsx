import React, { useState, useEffect } from "react";
import { colors, radii } from "../theme/theme";
import { useLocalization } from "../../context/LocalizationContext";
import { Modal } from "../common/Modal";

interface NewSheetModalProps {
  isOpen: boolean;
  systemName?: string;
  onClose: () => void;
  onCreate: (name: string) => void;
}

export const NewSheetModal: React.FC<NewSheetModalProps> = ({
  isOpen,
  systemName,
  onClose,
  onCreate,
}) => {
  const { t } = useLocalization();
  const [name, setName] = useState("");

  // Reset del campo ogni volta che il modal viene riaperto
  useEffect(() => {
    if (isOpen) setName("");
  }, [isOpen]);

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate(name.trim());
  };

  // L'Enter per confermare resta un comportamento del form; ESC per
  // chiudere e ora gestito automaticamente da <Modal>.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleCreate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      width="420px"
      title={t("characters.sheetModal.newCharacter")}
      footer={
        <>
          <button
            onClick={onClose}
            style={{
              padding: "0.5rem 1rem",
              background: "transparent",
              color: colors.textPrimary,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.sm,
              cursor: "pointer",
            }}
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: colors.gold,
              color: colors.bgVoid,
              border: "none",
              borderRadius: radii.sm,
              fontWeight: 600,
              cursor: name.trim() ? "pointer" : "not-allowed",
              opacity: name.trim() ? 1 : 0.5,
            }}
          >
            {t("characters.sheetModal.createSheet")}
          </button>
        </>
      }
    >
      {systemName && (
        <div style={{ fontSize: "0.8rem", color: colors.textFaint, marginBottom: "1.2rem" }}>
          {t("characters.sheetModal.activeGame")}{" "}
          <span style={{ color: colors.gold }}>{systemName}</span>
        </div>
      )}

      <label
        style={{
          display: "block",
          marginBottom: "0.4rem",
          fontSize: "0.85rem",
          color: colors.textSecondary,
        }}
      >
        {t("characters.sheetModal.charName")}
      </label>
      <input
        type="text"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t("common.example") + "Elyndra Nightshade"}
        style={{
          width: "100%",
          padding: "0.6rem 0.7rem",
          backgroundColor: colors.bgVoid,
          color: "#fff",
          border: `1px solid ${colors.border}`,
          borderRadius: radii.sm,
          boxSizing: "border-box",
          fontSize: "0.95rem",
          outline: "none",
        }}
      />
    </Modal>
  );
};
