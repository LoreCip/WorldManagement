import React from "react";
import { FieldSchema } from "../../types/character";
import { ArticleItem } from "../../types/wiki";
import { colors, fonts, radii } from "../theme/theme";

interface SheetFormProps {
  fields: FieldSchema[];
  values: Record<string, any>;
  articleId?: string | null;
  wikiArticles: ArticleItem[];
  onChangeValue: (key: string, val: any) => void;
  onChangeArticle: (articleId: string | null) => void;
}

export const SheetForm: React.FC<SheetFormProps> = ({
  fields,
  values,
  articleId,
  wikiArticles,
  onChangeValue,
  onChangeArticle,
}) => {
  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: colors.bgPanelRaised,
    color: colors.textPrimary,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.sm,
    padding: "0.55rem 0.75rem",
    fontFamily: fonts.body,
    fontSize: "0.9rem",
    boxSizing: "border-box",
    outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
      {/* Associazione Articolo Wiki */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        <label style={{ fontSize: "0.8rem", color: colors.gold, fontWeight: 600 }}>
          🔗 Articolo Wiki Collegato (Opzionale)
        </label>
        <select
          value={articleId || ""}
          onChange={(e) => onChangeArticle(e.target.value || null)}
          style={{ ...inputStyle, cursor: "pointer", colorScheme: "dark" }}
        >
          <option value="">-- Nessun collegamento --</option>
          {wikiArticles.map((art) => (
            <option key={art.id} value={art.id}>
              {art.title} ({art.category})
            </option>
          ))}
        </select>
      </div>

      <hr style={{ border: "none", borderTop: `1px dashed ${colors.borderSubtle}`, margin: "0.5rem 0" }} />

      {/* Form Dinamico in base allo Schema */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
        {fields.map((field) => {
          const val = values[field.key] ?? field.default ?? "";

          if (field.type === "textarea") {
            return (
              <div key={field.key} style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={{ fontSize: "0.82rem", color: colors.textSecondary, fontWeight: 600 }}>
                  {field.label}
                </label>
                <textarea
                  value={val}
                  onChange={(e) => onChangeValue(field.key, e.target.value)}
                  rows={4}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
            );
          }

          if (field.type === "checkbox") {
            return (
              <div key={field.key} style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "1rem" }}>
                <input
                  type="checkbox"
                  checked={Boolean(val)}
                  onChange={(e) => onChangeValue(field.key, e.target.checked)}
                  style={{ width: "18px", height: "18px", accentColor: colors.gold, cursor: "pointer" }}
                />
                <label style={{ fontSize: "0.88rem", color: colors.textPrimary, cursor: "pointer" }}>
                  {field.label}
                </label>
              </div>
            );
          }

          return (
            <div key={field.key} style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.82rem", color: colors.textSecondary, fontWeight: 600 }}>
                {field.label}
              </label>
              <input
                type={field.type === "number" ? "number" : "text"}
                value={val}
                onChange={(e) =>
                  onChangeValue(field.key, field.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)
                }
                style={inputStyle}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};