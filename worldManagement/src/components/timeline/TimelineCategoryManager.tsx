import React, { useState } from "react";
import { TimelineCategory } from "../../types/timeline";
import { colors, fonts, radii } from "../theme/theme";
import { useLocalization } from "../../context/LocalizationContext";
import { Modal } from "../common/Modal";

interface TimelineCategoryManagerProps {
  categories: TimelineCategory[];
  onSave: (category: TimelineCategory) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const emptyCategory = (): TimelineCategory => ({ id: "", name: "", color: "#c9a15a", icon: "📌" });

export const TimelineCategoryManager: React.FC<TimelineCategoryManagerProps> = ({
  categories,
  onSave,
  onDelete,
  onClose,
}) => {
  const { t } = useLocalization();
  const [draft, setDraft] = useState<TimelineCategory>(emptyCategory());

  const inputStyle: React.CSSProperties = {
    padding: "0.4rem 0.5rem",
    backgroundColor: colors.bgManuscript,
    border: `1px solid ${colors.borderSubtle}`,
    borderRadius: radii.sm,
    color: colors.textPrimary,
    fontFamily: fonts.body,
    fontSize: "0.85rem",
    outline: "none",
  };

  const handleAdd = () => {
    if (!draft.name.trim()) return;
    onSave(draft);
    setDraft(emptyCategory());
  };

  return (
    <Modal isOpen onClose={onClose} width="420px" title={t("timeline.category.title")}>
      <div
        style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.2rem" }}
      >
        {categories.map((cat) => (
          <div
            key={cat.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              padding: "0.4rem 0.5rem",
              borderRadius: radii.sm,
              backgroundColor: colors.bgManuscript,
            }}
          >
            <span style={{ fontSize: "1rem" }}>{cat.icon}</span>
            <span
              style={{
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                backgroundColor: cat.color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                flex: 1,
                color: colors.textPrimary,
                fontFamily: fonts.body,
                fontSize: "0.88rem",
              }}
            >
              {cat.name}
            </span>
            <button
              onClick={() => onDelete(cat.id)}
              style={{
                background: "none",
                border: "none",
                color: colors.crimson,
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              {t("wiki.tag.delete")}
            </button>
          </div>
        ))}
        {categories.length === 0 && (
          <div style={{ color: colors.textFaint, fontStyle: "italic", fontSize: "0.85rem" }}>
            {t("timeline.category.noCategory")}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1rem" }}>
        <input
          type="text"
          value={draft.icon}
          maxLength={2}
          onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
          style={{ ...inputStyle, width: "42px", textAlign: "center" }}
        />
        <input
          type="color"
          value={draft.color}
          onChange={(e) => setDraft({ ...draft, color: e.target.value })}
          style={{
            width: "36px",
            height: "30px",
            border: "none",
            borderRadius: radii.sm,
            cursor: "pointer",
            background: "none",
          }}
        />
        <input
          type="text"
          placeholder={t("timeline.category.catNamePlaceholder")}
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          style={{ ...inputStyle, flex: 1 }}
        />
        <button
          onClick={handleAdd}
          style={{
            padding: "0.4rem 0.8rem",
            backgroundColor: colors.gold,
            color: colors.bgVoid,
            border: "none",
            borderRadius: radii.sm,
            cursor: "pointer",
            fontFamily: fonts.body,
            fontWeight: 600,
            fontSize: "0.82rem",
          }}
        >
          + {t("common.add")}
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={onClose}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "transparent",
            color: colors.textFaint,
            border: `1px solid ${colors.borderSubtle}`,
            borderRadius: radii.md,
            cursor: "pointer",
            fontFamily: fonts.body,
            fontSize: "0.82rem",
          }}
        >
          {t("common.close")}
        </button>
      </div>
    </Modal>
  );
};
