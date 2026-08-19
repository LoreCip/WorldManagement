import React, { useState } from "react";
import { Plus } from "lucide-react";
import { TimelineEra } from "../../types/timeline";
import { timeInputToValue } from "../../utils/timeConversion";
import { colors, fonts, radii } from "../theme/theme";
import { useLocalization } from "../../context/LocalizationContext";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";

interface TimelineEraManagerProps {
  eras: TimelineEra[];
  onSave: (era: TimelineEra) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const emptyEra = (): { label: string; startYear: number; endYear: number; color: string } => ({
  label: "",
  startYear: 0,
  endYear: 100,
  color: "#8a6fd1",
});

export const TimelineEraManager: React.FC<TimelineEraManagerProps> = ({
  eras,
  onSave,
  onDelete,
  onClose,
}) => {
  const { t } = useLocalization();
  const [draft, setDraft] = useState(emptyEra());

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
    if (!draft.label.trim() || draft.endYear <= draft.startYear) return;
    onSave({
      id: "",
      label: draft.label.trim(),
      start_value: timeInputToValue({ year: draft.startYear, month: null, day: null }),
      end_value: timeInputToValue({ year: draft.endYear, month: null, day: null }),
      color: draft.color,
    });
    setDraft(emptyEra());
  };

  return (
    <Modal isOpen onClose={onClose} width="460px" title={t("timeline.eras.title")}>
      <p style={{ color: colors.textFaint, fontSize: "0.78rem", margin: "0 0 1rem" }}>
        {t("timeline.eras.subtitle")}
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          marginBottom: "1.2rem",
          maxHeight: "min(240px, 32vh)",
          overflowY: "auto",
        }}
      >
        {eras.map((era) => (
          <div
            key={era.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              padding: "0.4rem 0.5rem",
              borderRadius: radii.sm,
              backgroundColor: colors.bgManuscript,
            }}
          >
            <span
              style={{
                width: "16px",
                height: "16px",
                borderRadius: "3px",
                backgroundColor: era.color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                flex: 1,
                color: colors.textPrimary,
                fontFamily: fonts.body,
                fontSize: "0.85rem",
              }}
            >
              {era.label}
            </span>
            <Button
              variant="danger"
              size="sm"
              onClick={() => onDelete(era.id)}
              style={{ border: "none", background: "none" }}
            >
              {t("wiki.tag.delete")}
            </Button>
          </div>
        ))}
        {eras.length === 0 && (
          <div style={{ color: colors.textFaint, fontStyle: "italic", fontSize: "0.85rem" }}>
            {t("timeline.eras.noEra")}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.6rem" }}>
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
          placeholder={t("timeline.eras.namePlaceholder")}
          value={draft.label}
          onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          style={{ ...inputStyle, flex: 1, minWidth: 0 }}
        />
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <input
          type="number"
          placeholder={t("timeline.eras.startDatePlaceholder")}
          value={draft.startYear}
          onChange={(e) => setDraft({ ...draft, startYear: parseInt(e.target.value || "0", 10) })}
          style={{ ...inputStyle, flex: "1 1 70px", minWidth: 0 }}
        />
        <input
          type="number"
          placeholder={t("timeline.eras.endDatePlaceholder")}
          value={draft.endYear}
          onChange={(e) => setDraft({ ...draft, endYear: parseInt(e.target.value || "0", 10) })}
          style={{ ...inputStyle, flex: "1 1 70px", minWidth: 0 }}
        />
        <Button variant="primary" size="sm" icon={Plus} onClick={handleAdd} style={{ flexShrink: 0 }}>
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
