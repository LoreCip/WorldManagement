import React, { useEffect, useState } from "react";
import { X, ScrollText, Drama, Link2 } from "lucide-react";
import { colors, fonts, radii } from "../theme/theme";
import { useLocalization } from "../../context/LocalizationContext";
import { GraphNodeData, GraphView } from "../../types/relations";
import { useLinkableOptions } from "../../hooks/useLinkableOptions";
import { Drawer } from "../common/Drawer";
import { Button } from "../common/Button";

interface NodeDrawerProps {
  node: GraphNodeData;
  views: GraphView[];
  currentViewId: string | null;
  onClose: () => void;
  onSave: (node: GraphNodeData) => void;
  onDelete: (id: string) => void;
  onRemoveFromView: (id: string) => void;
  onPromote: (nodeId: string, systemId: string) => Promise<string>;
  onOpenWiki?: (articleId: string) => void;
  onOpenCharacterSheet?: (sheetId: string) => void;
  onNavigateToView?: (viewId: string) => void;
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

export const NodeDrawer: React.FC<NodeDrawerProps> = ({
  node,
  views,
  currentViewId,
  onClose,
  onSave,
  onDelete,
  onRemoveFromView,
  onPromote,
  onOpenWiki,
  onOpenCharacterSheet,
  onNavigateToView,
}) => {
  const { t } = useLocalization();
  const [draft, setDraft] = useState<GraphNodeData>(node);
  const [selectedSystemId, setSelectedSystemId] = useState<string>("");
  const [isPromoting, setIsPromoting] = useState(false);

  // Elenchi per i collegamenti manuali (wiki / scheda personaggio esistente).
  const [articleQuery, setArticleQuery] = useState("");
  const [sheetQuery, setSheetQuery] = useState("");

  const needsGameSystems = node.type === "placeholder" || node.type === "unknown";
  const {
    articles,
    characterSheets: sheets,
    gameSystems: systems,
  } = useLinkableOptions({
    articles: true,
    characterSheets: true,
    gameSystems: needsGameSystems,
  });

  useEffect(() => setDraft(node), [node]);

  useEffect(() => {
    if (systems.length > 0 && !selectedSystemId) setSelectedSystemId(systems[0].id);
  }, [systems, selectedSystemId]);

  const filteredArticles = articles
    .filter((a) => a.title.toLowerCase().includes(articleQuery.toLowerCase()))
    .slice(0, 8);
  const filteredSheets = sheets
    .filter((s) => s.name.toLowerCase().includes(sheetQuery.toLowerCase()))
    .slice(0, 8);
  const linkedArticleTitle = articles.find((a) => a.id === draft.wikiArticleId)?.title;
  const linkedSheetName = sheets.find((s) => s.id === draft.characterId)?.name;
  const otherViews = views.filter((v) => v.id !== currentViewId);
  const linkedViewTitle = views.find((v) => v.id === draft.linkedViewId)?.title;

  const handlePromote = async () => {
    if (!selectedSystemId) return;
    setIsPromoting(true);
    try {
      const sheetId = await onPromote(node.id, selectedSystemId);
      onOpenCharacterSheet?.(sheetId);
    } finally {
      setIsPromoting(false);
    }
  };

  const footer = (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <Button variant="secondary" size="sm" onClick={() => onRemoveFromView(node.id)}>
        {t("relations.nodeDrawer.removeFromView")}
      </Button>
      <Button variant="danger" size="sm" onClick={() => onDelete(node.id)}>
        {t("relations.actions.deleteNode")}
      </Button>
    </div>
  );

  return (
    <Drawer
      isOpen
      onClose={onClose}
      title={t("relations.actions.editNode")}
      width="320px"
      footer={footer}
    >
      <div>
        <label style={fieldLabelStyle}>{t("relations.nodeDrawer.nameLabel")}</label>
        <input
          style={inputStyle}
          value={draft.displayName}
          onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
        />
      </div>

      {draft.type !== "unknown" && (
        <div>
          <label style={fieldLabelStyle}>{t("relations.nodeDrawer.subtitleLabel")}</label>
          <input
            style={inputStyle}
            value={draft.subtitle ?? ""}
            placeholder={t("relations.nodeDrawer.subtitlePlaceholder")}
            onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
          />
        </div>
      )}

      <div style={{ display: "flex", gap: "0.6rem" }}>
        <div style={{ flex: 1 }}>
          <label style={fieldLabelStyle}>{t("relations.nodeDrawer.birthLabel")}</label>
          <input
            style={inputStyle}
            type="number"
            value={draft.birthYear ?? ""}
            onChange={(e) =>
              setDraft({ ...draft, birthYear: e.target.value ? Number(e.target.value) : undefined })
            }
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={fieldLabelStyle}>{t("relations.nodeDrawer.deathLabel")}</label>
          <input
            style={inputStyle}
            type="number"
            value={draft.deathYear ?? ""}
            onChange={(e) =>
              setDraft({ ...draft, deathYear: e.target.value ? Number(e.target.value) : undefined })
            }
          />
        </div>
      </div>

      <div>
        <label style={fieldLabelStyle}>{t("relations.nodeDrawer.notesLabel")}</label>
        <textarea
          style={{ ...inputStyle, minHeight: "80px", resize: "vertical", fontFamily: fonts.body }}
          value={draft.notes ?? ""}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
        />
      </div>

      {/* Collegamento a voce Wiki */}
      <div style={{ borderTop: `1px solid ${colors.borderSubtle}`, paddingTop: "0.8rem" }}>
        <label style={fieldLabelStyle}>{t("relations.actions.linkWiki")}</label>
        {draft.wikiArticleId ? (
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <Button
              variant="secondary"
              size="sm"
              icon={ScrollText}
              onClick={() => onOpenWiki?.(draft.wikiArticleId!)}
              style={{ flex: 1, justifyContent: "flex-start", color: colors.gold, borderColor: `${colors.gold}55` }}
            >
              {linkedArticleTitle ?? draft.wikiArticleId} →
            </Button>
            <Button
              variant="secondary"
              iconOnly
              size="sm"
              icon={X}
              onClick={() => setDraft({ ...draft, wikiArticleId: undefined })}
              title={t("relations.nodeDrawer.unlink")}
            />
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            <input
              style={inputStyle}
              placeholder={t("relations.nodeDrawer.wikiSearchPlaceholder")}
              value={articleQuery}
              onChange={(e) => setArticleQuery(e.target.value)}
            />
            {articleQuery.trim().length > 0 && (
              <div
                style={{
                  backgroundColor: colors.bgPanelRaised,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radii.sm,
                  marginTop: "0.3rem",
                  maxHeight: "160px",
                  overflowY: "auto",
                }}
              >
                {filteredArticles.length === 0 ? (
                  <div
                    style={{
                      padding: "0.5rem 0.6rem",
                      fontSize: "0.78rem",
                      color: colors.textFaint,
                    }}
                  >
                    {t("relations.nodeDrawer.noResults")}
                  </div>
                ) : (
                  filteredArticles.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => {
                        setDraft({ ...draft, wikiArticleId: a.id });
                        setArticleQuery("");
                      }}
                      style={{
                        padding: "0.5rem 0.6rem",
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        borderBottom: `1px solid ${colors.borderSubtle}`,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.bgPanel)}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      {a.title}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Collegamento a scheda personaggio esistente (alternativa alla promozione) */}
      <div>
        <label style={fieldLabelStyle}>{t("relations.nodeDrawer.sheetLabel")}</label>
        {draft.characterId ? (
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <Button
              variant="secondary"
              size="sm"
              icon={Drama}
              onClick={() => onOpenCharacterSheet?.(draft.characterId!)}
              style={{ flex: 1, justifyContent: "flex-start", color: colors.gold, borderColor: `${colors.gold}55` }}
            >
              {linkedSheetName ?? draft.characterId} →
            </Button>
            <Button
              variant="secondary"
              iconOnly
              size="sm"
              icon={X}
              onClick={() => setDraft({ ...draft, characterId: undefined })}
              title={t("relations.nodeDrawer.unlink")}
            />
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            <input
              style={inputStyle}
              placeholder={t("relations.nodeDrawer.sheetSearchPlaceholder")}
              value={sheetQuery}
              onChange={(e) => setSheetQuery(e.target.value)}
            />
            {sheetQuery.trim().length > 0 && (
              <div
                style={{
                  backgroundColor: colors.bgPanelRaised,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radii.sm,
                  marginTop: "0.3rem",
                  maxHeight: "160px",
                  overflowY: "auto",
                }}
              >
                {filteredSheets.length === 0 ? (
                  <div
                    style={{
                      padding: "0.5rem 0.6rem",
                      fontSize: "0.78rem",
                      color: colors.textFaint,
                    }}
                  >
                    {t("relations.nodeDrawer.noResults")}
                  </div>
                ) : (
                  filteredSheets.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setDraft({ ...draft, characterId: s.id, type: "character" });
                        setSheetQuery("");
                      }}
                      style={{
                        padding: "0.5rem 0.6rem",
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        borderBottom: `1px solid ${colors.borderSubtle}`,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.bgPanel)}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      {s.name}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Vista collegata: trasforma il nodo in un "portale" verso un'altra vista */}
      <div>
        <label style={fieldLabelStyle}>{t("relations.nodeDrawer.linkedViewLabel")}</label>
        {draft.linkedViewId ? (
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <Button
              variant="secondary"
              size="sm"
              icon={Link2}
              onClick={() => onNavigateToView?.(draft.linkedViewId!)}
              style={{
                flex: 1,
                justifyContent: "flex-start",
                color: colors.indigo,
                borderColor: `${colors.indigo}55`,
              }}
            >
              {linkedViewTitle ?? draft.linkedViewId} →
            </Button>
            <Button
              variant="secondary"
              iconOnly
              size="sm"
              icon={X}
              onClick={() => setDraft({ ...draft, linkedViewId: undefined })}
              title={t("relations.nodeDrawer.unlink")}
            />
          </div>
        ) : otherViews.length > 0 ? (
          <select
            value=""
            onChange={(e) => e.target.value && setDraft({ ...draft, linkedViewId: e.target.value })}
            style={inputStyle}
          >
            <option value="">{t("relations.nodeDrawer.linkedViewNone")}</option>
            {otherViews.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title}
              </option>
            ))}
          </select>
        ) : (
          <div style={{ fontSize: "0.76rem", color: colors.textFaint }}>
            {t("relations.nodeDrawer.linkedViewEmpty")}
          </div>
        )}
        <div style={{ fontSize: "0.7rem", color: colors.textFaint, marginTop: "0.3rem" }}>
          {t("relations.nodeDrawer.linkedViewHint")}
        </div>
      </div>

      <Button variant="primary" onClick={() => onSave(draft)}>
        {t("common.save")}
      </Button>

      {/* Promozione a scheda personaggio */}
      {(draft.type === "placeholder" || draft.type === "unknown") && (
        <div
          style={{
            marginTop: "0.4rem",
            padding: "0.8rem",
            borderRadius: radii.md,
            border: `1px dashed ${colors.gold}55`,
            backgroundColor: colors.goldWash,
          }}
        >
          <div style={{ fontSize: "0.8rem", color: colors.textSecondary, marginBottom: "0.5rem" }}>
            {t("relations.actions.promoteToCharacter")}
          </div>
          {systems.length > 0 ? (
            <>
              <select
                value={selectedSystemId}
                onChange={(e) => setSelectedSystemId(e.target.value)}
                style={{ ...inputStyle, marginBottom: "0.5rem" }}
              >
                {systems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <Button
                variant="secondary"
                onClick={handlePromote}
                disabled={isPromoting}
                style={{ width: "100%" }}
              >
                {isPromoting ? "…" : t("relations.actions.promoteToCharacter")}
              </Button>
            </>
          ) : (
            <div style={{ fontSize: "0.75rem", color: colors.textFaint }}>
              {t("relations.nodeDrawer.promoteEmpty")}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
};
