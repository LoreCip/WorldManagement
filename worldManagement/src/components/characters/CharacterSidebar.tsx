import React from "react";
import { CharacterSheet, GameSystem } from "../../types/character";
import { colors, fonts, radii } from "../theme/theme";
import { useLocalization } from "../../context/LocalizationContext";

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
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside
      style={{
        width: "290px",
        borderRight: `1px solid ${colors.borderSubtle}`,
        display: "flex",
        flexDirection: "column",
        padding: "1.5rem 1.1rem",
        backgroundColor: colors.bgPanel,
        color: colors.textPrimary,
        fontFamily: fonts.body,
      }}
    >

      {/* Intestazione Modulo */}
      <div style={{ marginBottom: "1.2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
          <span style={{ fontSize: "1.2rem" }}>🎭</span>
          <h1 style={{ fontFamily: fonts.display, fontSize: "1.4rem", fontWeight: 600, margin: 0 }}>
            {t("characters.sidebar.title")}
          </h1>
        </div>
        <div style={{ fontSize: "0.66rem", letterSpacing: "0.13em", textTransform: "uppercase", color: colors.textFaint, marginTop: "0.3rem", marginLeft: "1.8rem" }}>
          {t("characters.sidebar.subtitle")}
        </div>
        <div style={{ height: "1px", marginTop: "1rem", background: `linear-gradient(90deg, ${colors.gold}77, transparent 75%)` }} />
      </div>

      {/* Sistema di Gioco Attivo (globale, valido per l'intero mondo) */}
      <div style={{ marginBottom: "1.2rem" }}>
        <label style={{ fontSize: "0.7rem", letterSpacing: "0.06em", textTransform: "uppercase", color: colors.gold, fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>
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
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.1rem" }}>
        <button
          onClick={onNewSheet}
          disabled={!activeSystemId}
          style={{
            padding: "0.6rem 1rem",
            backgroundColor: activeSystemId ? colors.gold : colors.border,
            color: activeSystemId ? colors.bgVoid : colors.textFaint,
            border: "none",
            borderRadius: radii.md,
            cursor: activeSystemId ? "pointer" : "not-allowed",
            fontWeight: 600,
            fontSize: "0.88rem",
          }}
        >
          {t("characters.sidebar.newSheet")}
        </button>

        <button
          onClick={onOpenSystemModal}
          style={{
            padding: "0.45rem 0.8rem",
            backgroundColor: "transparent",
            color: colors.gold,
            border: `1px solid ${colors.gold}55`,
            borderRadius: radii.md,
            cursor: "pointer",
            fontSize: "0.78rem",
            fontWeight: 500,
          }}
        >
          {t("characters.sidebar.newSystem")}
        </button>
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
          <div style={{ color: colors.textFaint, fontStyle: "italic", textAlign: "center", marginTop: "2rem", fontSize: "0.9rem" }}>
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
                <div style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: "1rem", color: colors.textPrimary }}>
                  {sheet.name}
                </div>
                <div style={{ fontSize: "0.68rem", color: colors.goldBright, textTransform: "uppercase", marginTop: "2px" }}>
                  {system?.name || t("characters.sidebar.unkownSystem")}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};