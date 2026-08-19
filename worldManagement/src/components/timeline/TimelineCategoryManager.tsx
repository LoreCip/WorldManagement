import React, { useState } from "react";
import { Plus } from "lucide-react";
import { TimelineCategory } from "../../types/timeline";
import { colors, fonts, radii } from "../theme/theme";
import { useLocalization } from "../../context/LocalizationContext";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";

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
            <Button
              variant="danger"
              size="sm"
              onClick={() => onDelete(cat.id)}
              style={{ border: "none", background: "none" }}
            >
              {t("wiki.tag.delete")}
            </Button>
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
        <Button variant="primary" size="sm" icon={Plus} onClick={handleAdd}>
          {t("common.add")}
        </Button>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button variant="secondary" size="sm" onClick={onClose}>
          {t("common.close")}
        </Button>
      </div>
    </Modal>
  );
};
