import { useState } from "react";
import { WikiView } from "./views/WikiView";
import { MapView } from "./views/MapView";
import { CharacterView } from "./views/CharacterView";
import { TimelineView } from "./views/TimelineView";
import { colors, radii } from "./components/theme/theme";
import { SettingsView } from "./views/SettingsView";
import { HubView, HubModuleKey } from "./views/HubView";
import { useSettings } from "./context/SettingsContext";
import { RelationsView } from "./views/RelationsView";

type ActiveTab = "hub" | "wiki" | "maps" | "characters" | "timeline" | "relations" | "settings";

// Le uniche tab "di contenuto" la cui ultima visita viene ricordata dalla hub.
const HUB_TRACKED_TABS: ActiveTab[] = ["wiki", "maps", "characters", "timeline", "relations"];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("hub");
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null); // Stato per la mappa selezionata

  const { setSetting } = useSettings();

  // Ogni cambio di tab passa da qui, così la hub sa sempre qual è stata
  // l'ultima tab di contenuto visitata (usata per scegliere il tile "hero").
  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (HUB_TRACKED_TABS.includes(tab)) {
      setSetting("last_visited_tab", tab);
    }
  };

  const handleOpenArticle = (articleId: string) => {
    setSelectedArticleId(articleId);
    handleTabChange("wiki");
  };

  const handleOpenCharacterSheet = (sheetId: string) => {
    setSelectedSheetId(sheetId);
    handleTabChange("characters");
  };

  const handleOpenMap = (mapId: string) => {
    setSelectedMapId(mapId);
    handleTabChange("maps");
  };

  const handleHubNavigate = (tab: HubModuleKey) => {
    handleTabChange(tab);
  };

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden", backgroundColor: colors.bgVoid }}>
      {activeTab !== "hub" && (
        <nav
          style={{
            width: "56px",
            backgroundColor: colors.bgPanel,
            borderRight: `1px solid ${colors.border}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: "1.2rem",
            gap: "1.2rem",
            zIndex: 100,
          }}
        >
          <button
            onClick={() => handleTabChange("hub")}
            title="Torna alla Hub"
            style={{
              background: "none",
              border: "none",
              borderRadius: radii.md,
              width: "40px",
              height: "40px",
              fontSize: "1.2rem",
              cursor: "pointer",
              opacity: 0.6,
            }}
          >
            🏠
          </button>

          <div style={{ width: "28px", height: "1px", backgroundColor: colors.border }} />

          <button
            onClick={() => handleTabChange("wiki")}
            title="Wiki & Lore"
            style={{
              background: activeTab === "wiki" ? colors.bgPanelRaised : "none",
              border: "none",
              borderRadius: radii.md,
              width: "40px",
              height: "40px",
              fontSize: "1.2rem",
              cursor: "pointer",
              opacity: activeTab === "wiki" ? 1 : 0.4,
            }}
          >
            📜
          </button>

          <button
            onClick={() => handleTabChange("maps")}
            title="Mappe Mondiali"
            style={{
              background: activeTab === "maps" ? colors.bgPanelRaised : "none",
              border: "none",
              borderRadius: radii.md,
              width: "40px",
              height: "40px",
              fontSize: "1.2rem",
              cursor: "pointer",
              opacity: activeTab === "maps" ? 1 : 0.4,
            }}
          >
            🗺️
          </button>

          {/* Pulsante Personaggi */}
          <button
            onClick={() => handleTabChange("characters")}
            title="Schede Personaggi"
            style={{
              background: activeTab === "characters" ? colors.bgPanelRaised : "none",
              border: "none",
              borderRadius: radii.md,
              width: "40px",
              height: "40px",
              fontSize: "1.2rem",
              cursor: "pointer",
              opacity: activeTab === "characters" ? 1 : 0.4,
            }}
          >
            🎭
          </button>

          {/* Pulsante Timeline */}
          <button
            onClick={() => handleTabChange("timeline")}
            title="Linea del Tempo"
            style={{
              background: activeTab === "timeline" ? colors.bgPanelRaised : "none",
              border: "none",
              borderRadius: radii.md,
              width: "40px",
              height: "40px",
              fontSize: "1.2rem",
              cursor: "pointer",
              opacity: activeTab === "timeline" ? 1 : 0.4,
            }}
          >
            ⏳
          </button>

          <button
            onClick={() => handleTabChange("relations")}
            title="Albero Genealogico / Relazioni"
            style={{
              background: activeTab === "relations" ? colors.bgPanelRaised : "none",
              border: "none",
              borderRadius: radii.md,
              width: "40px",
              height: "40px",
              fontSize: "1.2rem",
              cursor: "pointer",
              opacity: activeTab === "relations" ? 1 : 0.4,
            }}
          >
            🌳
          </button>

          <button
            onClick={() => handleTabChange("settings")}
            title="Impostazioni"
            style={{
              background: activeTab === "settings" ? colors.bgPanelRaised : "none",
              border: "none", borderRadius: radii.md, width: "40px", height: "40px",
              fontSize: "1.2rem", cursor: "pointer", opacity: activeTab === "settings" ? 1 : 0.4,
              marginTop: "auto", // spinge l'icona in fondo alla nav, separata dalle altre
            }}
          >
            ⚙️
          </button>
        </nav>
      )}

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {activeTab === "hub" && (
          <HubView
            onNavigate={handleHubNavigate}
            onOpenSettings={() => handleTabChange("settings")}
          />
        )}

        {activeTab === "wiki" && (
          <WikiView
            selectedArticleId={selectedArticleId}
            onSelectArticle={setSelectedArticleId}
            onNavigateToCharacterSheet={handleOpenCharacterSheet}
            onNavigateToMap={handleOpenMap}
          />
        )}

        {activeTab === "maps" && (
          <MapView
            onOpenArticle={handleOpenArticle}
            initialMapId={selectedMapId}
          />
        )}

        {activeTab === "characters" && (
          <CharacterView
            onNavigateToWiki={handleOpenArticle}
            initialSheetId={selectedSheetId}
            onSelectSheet={setSelectedSheetId}
          />
        )}

        {activeTab === "timeline" && (
          <TimelineView
            onNavigateToArticle={handleOpenArticle}
            onNavigateToMap={handleOpenMap}
          />
        )}

        {activeTab === "relations" && (
          <RelationsView
            onNavigateToWiki={handleOpenArticle}
            onNavigateToCharacterSheet={handleOpenCharacterSheet}
          />
        )}

        {activeTab === "settings" && <SettingsView />}
      </div>
    </div>
  );
}