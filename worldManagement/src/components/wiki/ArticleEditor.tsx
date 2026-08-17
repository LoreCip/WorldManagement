import React from "react";
import { Article } from "../../types/wiki";
import { TagInput } from "./TagInput";
import { MarkdownEditor } from "./MarkdownEditor";
import { MarkdownPreview } from "./MarkdownPreview";
import { ViewHeader } from "../common/ViewHeader";
import { colors, fonts, radii, categories, getCategoryColor, getCategoryLabel, CategoryKey } from "../theme/theme";
import { useLocalization } from "../../context/LocalizationContext";

interface ArticleEditorProps {
  article: Article;
  isEditing: boolean;
  linkedSheetId: string | null;
  linkedMapId: string | null;
  onChange: (updated: Article) => void;
  onSave: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onNavigateToTitle?: (title: string) => void;
  onNavigateToCharacterSheet?: (sheetId: string) => void;
  onNavigateToMap?: (mapId: string) => void;
}

// Orchestratore della vista articolo: possiede solo la composizione UI e
// inoltra gli eventi. Il markdown (MarkdownEditor/MarkdownPreview), i tag
// (TagInput) e le entita collegate (linkedSheetId/linkedMapId, calcolate
// in useWiki) sono tutti responsabilita di componenti/hook separati.
export const ArticleEditor: React.FC<ArticleEditorProps> = ({
  article,
  isEditing,
  linkedSheetId,
  linkedMapId,
  onChange,
  onSave,
  onEdit,
  onDelete,
  onNavigateToTitle,
  onNavigateToCharacterSheet,
  onNavigateToMap,
}) => {
  const { t } = useLocalization();

  const handleAddTag = (newTag: string) => {
    if (!article.tags.includes(newTag)) onChange({ ...article, tags: [...article.tags, newTag] });
  };
  const handleRemoveTag = (tagToRemove: string) => {
    onChange({ ...article, tags: article.tags.filter((tag) => tag !== tagToRemove) });
  };

  if (!article.id && !isEditing) {
    return (
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.bgVoid,
          color: colors.textFaint,
          fontFamily: fonts.display,
          fontStyle: "italic",
          fontSize: "1.05rem",
        }}
      >
        {t("wiki.editor.mainHint")}
      </main>
    );
  }

  const categoryColor = getCategoryColor(article.category);

  const btnBase: React.CSSProperties = {
    padding: "0.55rem 1.3rem",
    borderRadius: radii.md,
    cursor: "pointer",
    fontFamily: fonts.body,
    fontWeight: 600,
    fontSize: "0.88rem",
    letterSpacing: "0.01em",
    transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease",
  };

  const pillBase: React.CSSProperties = {
    backgroundColor: `${colors.gold}1f`,
    color: colors.gold,
    border: `1px solid ${colors.gold}59`,
    padding: "3px 10px",
    borderRadius: radii.pill,
    fontSize: "0.72rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    transition: "all 0.15s ease",
  };

  // In modifica il "titolo" del ViewHeader e un vero form (input + select
  // categoria); in lettura e semplice testo. ViewHeader accetta un
  // ReactNode qualsiasi in `title`, quindi entrambe le forme si adattano
  // senza bisogno di due componenti diversi.
  const headerTitle = isEditing ? (
    <div style={{ display: "flex", gap: "1rem", flex: 1 }}>
      <input
        type="text"
        value={article.title || ""}
        onChange={(e) => onChange({ ...article, title: e.target.value })}
        placeholder={t("wiki.editor.titlePlaceholder")}
        style={{
          fontFamily: fonts.display,
          fontSize: "1.7rem",
          fontWeight: 600,
          backgroundColor: "transparent",
          color: colors.textPrimary,
          border: "none",
          borderBottom: `1px solid ${colors.border}`,
          padding: "0.4rem 0.1rem",
          flex: 1,
          outline: "none",
        }}
        onFocus={(e) => (e.currentTarget.style.borderBottomColor = colors.gold)}
        onBlur={(e) => (e.currentTarget.style.borderBottomColor = colors.border)}
      />
      <select
        value={article.category || "Lore"}
        onChange={(e) => onChange({ ...article, category: e.target.value as CategoryKey })}
        style={{
          backgroundColor: colors.bgPanelRaised,
          color: colors.textPrimary,
          border: `1px solid ${colors.border}`,
          padding: "0.5rem 0.75rem",
          borderRadius: radii.sm,
          fontFamily: fonts.body,
          fontSize: "0.88rem",
          alignSelf: "center",
          colorScheme: "dark",
        }}
      >
        {Object.keys(categories).map((key) => (
          <option key={key} value={key}>
            {getCategoryLabel(t, key)}
          </option>
        ))}
      </select>
    </div>
  ) : (
    article.title
  );

  const editActions = isEditing ? (
    <>
      <button
        onClick={onSave}
        style={{ ...btnBase, backgroundColor: colors.gold, color: colors.bgVoid, border: "none" }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.goldBright)}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.gold)}
      >
        {t("common.save")}
      </button>

      {article.id && (
        <button
          onClick={onDelete}
          title={t("wiki.editor.confirmDelete")}
          style={{ ...btnBase, backgroundColor: "transparent", color: colors.crimson, border: `1px solid ${colors.crimson}77` }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.crimsonWash;
            e.currentTarget.style.borderColor = colors.crimson;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.borderColor = `${colors.crimson}77`;
          }}
        >
          {t("common.delete")}
        </button>
      )}
    </>
  ) : (
    <button
      onClick={onEdit}
      style={{ ...btnBase, backgroundColor: "transparent", color: colors.gold, border: `1px solid ${colors.gold}77` }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = colors.goldWash;
        e.currentTarget.style.borderColor = colors.gold;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
        e.currentTarget.style.borderColor = `${colors.gold}77`;
      }}
    >
      {t("common.edit")}
    </button>
  );

  return (
    <main
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        backgroundColor: colors.bgVoid,
        color: colors.textPrimary,
        fontFamily: fonts.body,
        colorScheme: "dark",
      }}
    >
      <ViewHeader title={headerTitle} actions={editActions}>
        {/* Il badge categoria e colorato per categoria (rosso/verde/oro...),
            diversamente dal badge fisso oro di ViewHeader: resta qui come
            markup dedicato invece di forzarlo nello slot `badge`. */}
        {!isEditing && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.72rem",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: categoryColor,
                backgroundColor: `${categoryColor}1f`,
                border: `1px solid ${categoryColor}59`,
                padding: "3px 10px",
                borderRadius: radii.pill,
              }}
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: categoryColor }} />
              {getCategoryLabel(t, article.category)}
            </span>

            {linkedSheetId && onNavigateToCharacterSheet && (
              <button
                onClick={() => onNavigateToCharacterSheet(linkedSheetId)}
                style={pillBase}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = `${colors.gold}35`;
                  e.currentTarget.style.borderColor = colors.gold;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = `${colors.gold}1f`;
                  e.currentTarget.style.borderColor = `${colors.gold}59`;
                }}
              >
                🎭 Apri Scheda PG →
              </button>
            )}

            {linkedMapId && onNavigateToMap && (
              <button
                onClick={() => onNavigateToMap(linkedMapId)}
                style={pillBase}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = `${colors.gold}35`;
                  e.currentTarget.style.borderColor = colors.gold;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = `${colors.gold}1f`;
                  e.currentTarget.style.borderColor = `${colors.gold}59`;
                }}
              >
                {t("wiki.editor.openMapButton")}
              </button>
            )}
          </div>
        )}
      </ViewHeader>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, padding: "1.6rem 2.5rem 2.25rem" }}>
        <TagInput tags={article.tags || []} isEditing={isEditing} onAddTag={handleAddTag} onRemoveTag={handleRemoveTag} />

        {isEditing ? (
          <MarkdownEditor value={article.content || ""} onChange={(content) => onChange({ ...article, content })} isActive={isEditing} />
        ) : (
          <MarkdownPreview content={article.content || ""} onNavigateToTitle={onNavigateToTitle} />
        )}
      </div>
    </main>
  );
};