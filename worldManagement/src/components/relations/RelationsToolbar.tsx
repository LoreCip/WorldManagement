import React, { useState } from "react";
import { Trash2, Minus, Plus, Check, X, TreePine } from "lucide-react";
import { colors, radii } from "../theme/theme";
import { useLocalization } from "../../context/LocalizationContext";
import { GraphView, GraphViewType } from "../../types/relations";
import { ViewHeader } from "../common/ViewHeader";
import { ToolbarButton } from "../common/Toolbar";
import { Button } from "../common/Button";
import { Icon } from "../common/Icon";

interface RelationsToolbarProps {
  views: GraphView[];
  currentViewId: string | null;
  onSelectView: (id: string | null) => void;
  onCreateView: (title: string, type: GraphViewType) => void;
  onDeleteView: (view: GraphView) => void;
  searchQuery: string;
  onSearch: (q: string) => void;
  onAddNode: () => void;
  isConnecting: boolean;
  onToggleConnecting: () => void;
  focusMode: boolean;
  onToggleFocusMode: () => void;
  focusDepth: number;
  onFocusDepthChange: (n: number) => void;
}

export const RelationsToolbar: React.FC<RelationsToolbarProps> = ({
  views,
  currentViewId,
  onSelectView,
  onCreateView,
  onDeleteView,
  searchQuery,
  onSearch,
  onAddNode,
  isConnecting,
  onToggleConnecting,
  focusMode,
  onToggleFocusMode,
  focusDepth,
  onFocusDepthChange,
}) => {
  const { t } = useLocalization();
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<GraphViewType>("genealogy");

  const currentView = views.find((v) => v.id === currentViewId) ?? null;

  const submitNewView = () => {
    if (!newTitle.trim()) return;
    onCreateView(newTitle.trim(), newType);
    setNewTitle("");
    setIsCreating(false);
  };

  const viewControls = (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
        <select
          value={currentViewId ?? ""}
          onChange={(e) => onSelectView(e.target.value || null)}
          style={{
            backgroundColor: colors.bgPanelRaised,
            color: colors.textPrimary,
            border: `1px solid ${colors.border}`,
            borderRadius: radii.sm,
            padding: "0.4rem 0.6rem",
            fontSize: "0.82rem",
          }}
        >
          <option value="">{t("relations.views.selectView")}</option>
          {views.map((v) => (
            <option key={v.id} value={v.id}>
              {v.title} · {t(`relations.views.${v.type}`)}
            </option>
          ))}
        </select>

        {currentView && (
          <Button
            variant="danger"
            iconOnly
            size="sm"
            icon={Trash2}
            onClick={() => onDeleteView(currentView)}
            title={t("relations.views.deleteView")}
            style={{ borderRadius: radii.sm }}
          />
        )}
      </div>

      {isCreating ? (
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitNewView()}
            placeholder={t("relations.views.newViewNamePlaceholder")}
            style={{
              backgroundColor: colors.bgPanelRaised,
              color: colors.textPrimary,
              border: `1px solid ${colors.gold}77`,
              borderRadius: radii.sm,
              padding: "0.4rem 0.6rem",
              fontSize: "0.82rem",
              width: "150px",
            }}
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as GraphViewType)}
            style={{
              backgroundColor: colors.bgPanelRaised,
              color: colors.textPrimary,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.sm,
              padding: "0.4rem 0.5rem",
              fontSize: "0.8rem",
            }}
          >
            <option value="genealogy">{t("relations.views.genealogy")}</option>
            <option value="network">{t("relations.views.network")}</option>
          </select>
          <ToolbarButton active onClick={submitNewView} icon={Check} />
          <ToolbarButton onClick={() => setIsCreating(false)} icon={X} />
        </div>
      ) : (
        <ToolbarButton onClick={() => setIsCreating(true)}>
          {t("relations.header.newView")}
        </ToolbarButton>
      )}

      <div style={{ position: "relative" }}>
        <input
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={t("relations.header.searchPlaceholder")}
          style={{
            backgroundColor: colors.bgPanelRaised,
            color: colors.textPrimary,
            border: `1px solid ${colors.border}`,
            borderRadius: radii.sm,
            padding: "0.4rem 0.6rem",
            fontSize: "0.82rem",
            width: "190px",
          }}
        />
      </div>
    </div>
  );

  const actions = (
    <>
      <ToolbarButton onClick={onAddNode}>{t("relations.header.addNode")}</ToolbarButton>
      <ToolbarButton
        active={isConnecting}
        onClick={onToggleConnecting}
        title={t("relations.header.addEdgeTooltip")}
      >
        {t("relations.header.addEdge")}
      </ToolbarButton>

      <ToolbarButton
        active={focusMode}
        onClick={onToggleFocusMode}
        title={t("relations.header.focusModeTooltip")}
      >
        {t("relations.header.focusMode")}
      </ToolbarButton>

      {focusMode && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.3rem",
            padding: "0.2rem 0.4rem",
            borderRadius: radii.pill,
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.bgPanelRaised,
          }}
          title={t("relations.focus.depthTooltip")}
        >
          <span style={{ fontSize: "0.68rem", color: colors.textFaint, paddingLeft: "0.3rem" }}>
            {t("relations.focus.depthLabel")}
          </span>
          <Button
            variant="stepper"
            icon={Minus}
            onClick={() => onFocusDepthChange(Math.max(1, focusDepth - 1))}
          />
          <span
            style={{
              fontSize: "0.8rem",
              color: colors.textPrimary,
              minWidth: "1rem",
              textAlign: "center",
            }}
          >
            {focusDepth}
          </span>
          <Button
            variant="stepper"
            icon={Plus}
            onClick={() => onFocusDepthChange(Math.min(6, focusDepth + 1))}
          />
        </div>
      )}
    </>
  );

  return (
    <ViewHeader
      icon={<Icon icon={TreePine} color={colors.goldBright} size={20} />}
      title={t("relations.header.title")}
      actions={actions}
    >
      {viewControls}
    </ViewHeader>
  );
};
