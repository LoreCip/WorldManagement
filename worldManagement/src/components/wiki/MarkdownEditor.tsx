import React, { useRef } from "react";
import { colors, fonts, radii } from "../theme/theme";
import { useLocalization } from "../../context/LocalizationContext";
import { useImageDrop } from "../../hooks/useImageDrop";

interface MarkdownEditorProps {
  value: string;
  onChange: (content: string) => void;
  isActive: boolean;
}

// Editor Markdown puro: textarea + drop di immagini. La logica IPC
// (salvataggio immagine, calcolo del punto di inserimento) vive in
// useImageDrop; questo componente resta presentational/controllato.
export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ value, onChange, isActive }) => {
  const { t } = useLocalization();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { isDragging } = useImageDrop({
    enabled: isActive,
    textareaRef,
    content: value,
    onInsert: onChange,
  });

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Scrivi qui in Markdown. Trascina un'immagine su questa area per allegarla."
        style={{
          flex: 1,
          minHeight: "400px",
          backgroundColor: isDragging ? colors.bgPanelRaised : colors.bgManuscript,
          color: colors.textPrimary,
          border: isDragging ? `2px dashed ${colors.gold}` : `1px solid ${colors.borderSubtle}`,
          borderRadius: radii.lg,
          padding: "1.1rem",
          fontSize: "0.95rem",
          lineHeight: "1.7",
          fontFamily: fonts.mono,
          resize: "vertical",
          outline: "none",
          transition: "all 0.2s ease",
        }}
      />
      {isDragging && (
        <div
          style={{
            position: "absolute",
            bottom: "1rem",
            right: "1rem",
            backgroundColor: colors.gold,
            color: colors.bgVoid,
            padding: "0.3rem 0.85rem",
            borderRadius: radii.sm,
            fontFamily: fonts.body,
            fontWeight: 600,
            fontSize: "0.8rem",
            pointerEvents: "none",
          }}
        >
          {t("common.dropImage")}
        </div>
      )}
    </div>
  );
};