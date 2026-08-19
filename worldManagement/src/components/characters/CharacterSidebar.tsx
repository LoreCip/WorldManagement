import React from "react";
import { Drama } from "lucide-react";
import { CharacterSheet, GameSystem } from "../../types/character";
import { colors, fonts, radii } from "../theme/theme";
import { useLocalization } from "../../context/LocalizationContext";
import { SidebarLayout } from "../common/SidebarLayout";
import { Icon } from "../common/Icon";
import { Button } from "../common/Button";

interface CharacterSidebarProps {
  systems: GameSystem[];
  sheets: CharacterSheet[];
  selectedSheetId: string | null;
  searchQuery: string;
  activeSystemId: string | null;
  onActiveSystemChange: (id: string | null) => void;
  onSearchChange: (q: string) => void;
  onSelectSheet: (id: string) => void;
  onNewSheet: () => void;
  onOpenSystemModal: () => void;
}

export const CharacterSidebar: React.FC<CharacterSidebarProps> = ({
  systems,
  sheets,
  selectedSheetId,
  searchQuery,
  activeSystemId,
  onActiveSystemChange,
  onSearchChange,
  onSelectSheet,
  onNewSheet,
  onOpenSystemModal,
}) => {
  const { t } = useLocalization();

  const filteredSheets = sheets.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <SidebarLayout
      icon={<Icon icon={Drama} color={colors.crimson} size={20} />}
      title={t("characters.sidebar.title")}
      subtitle={t("characters.sidebar.subtitle")}
    >
      {/* Sistema di Gioco Attivo (globale, valido per l'intero mondo) */}
      <div style={{ marginBottom: "1.2rem" }}>
        <label
          style={{
            fontSize: "0.7rem",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: colors.gold,
            fontWeight: 600,
            display: "block",
            marginBottom: "0.4rem",
          }}
        >
          {t("characters.sidebar.activeSystem")}
        </label>
        <select
          value={activeSystemId || ""}
          onChange={(e) => onActiveSystemChange(e.target.value || null)}
          style={{
            width: "100%",
            padding: "0.5rem 0.6rem",
            backgroundColor: colors.bgPanelRaised,
            color: colors.textPrimary,
            border: `1px solid ${activeSystemId ? colors.border : colors.crimson + "88"}`,
            borderRadius: radii.sm,
            fontSize: "0.85rem",
            outline: "none",
            cursor: "pointer",
            colorScheme: "dark",
            boxSizing: "border-box",
          }}
        >
          <option value="" disabled>
            {t("characters.sidebar.selectSystem")}
          </option>
          {systems.map((sys) => (
            <option key={sys.id} value={sys.id}>
              {sys.name}
            </option>
          ))}
        </select>
        {!activeSystemId && (
          <div style={{ fontSize: "0.7rem", color: colors.crimson, marginTop: "0.3rem" }}>
            {t("characters.sidebar.sysNotSelected")}
          </div>
        )}
      </div>

      {/* Azioni Principali */}
      <div
        style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.1rem" }}
      >
        <Button variant="primary" onClick={onNewSheet} disabled={!activeSystemId}>
          {t("characters.sidebar.newSheet")}
        </Button>

        <Button variant="secondary" size="sm" onClick={onOpenSystemModal}>
          {t("characters.sidebar.newSystem")}
        </Button>
      </div>

      {/* Ricerca */}
      <div style={{ position: "relative", marginBottom: "1.3rem" }}>
        <input
          type="text"
          placeholder={t("characters.sidebar.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            width: "100%",
            padding: "0.5rem 0.4rem",
            backgroundColor: "transparent",
            border: "none",
            borderBottom: `1px solid ${colors.border}`,
            color: colors.textPrimary,
            fontSize: "0.88rem",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Lista Personaggi */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filteredSheets.length === 0 ? (
          <div
            style={{
              color: colors.textFaint,
              fontStyle: "italic",
              textAlign: "center",
              marginTop: "2rem",
              fontSize: "0.9rem",
            }}
          >
            {t("characters.sidebar.noResults")}
          </div>
        ) : (
          filteredSheets.map((sheet) => {
            const isSelected = selectedSheetId === sheet.id;
            const system = systems.find((sys) => sys.id === sheet.system_id);

            return (
              <div
                key={sheet.id}
                onClick={() => onSelectSheet(sheet.id)}
                style={{
                  padding: "0.65rem 0.75rem",
                  borderRadius: radii.sm,
                  backgroundColor: isSelected ? colors.bgPanelRaised : "transparent",
                  borderLeft: `3px solid ${isSelected ? colors.gold : "transparent"}`,
                  cursor: "pointer",
                  marginBottom: "0.3rem",
                }}
              >
                <div
                  style={{
                    fontFamily: fonts.display,
                    fontWeight: 600,
                    fontSize: "1rem",
                    color: colors.textPrimary,
                  }}
                >
                  {sheet.name}
                </div>
                <div
                  style={{
                    fontSize: "0.68rem",
                    color: colors.goldBright,
                    textTransform: "uppercase",
                    marginTop: "2px",
                  }}
                >
                  {system?.name || t("characters.sidebar.unknownSystem")}
                </div>
              </div>
            );
          })
        )}
      </div>
    </SidebarLayout>
  );
};
