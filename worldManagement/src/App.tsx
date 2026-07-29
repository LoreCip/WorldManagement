import { useState } from "react";
import { WikiView } from "./views/WikiView";
import { MapView } from "./views/MapView";
import { CharacterView } from "./views/CharacterView";
import { TimelineView } from "./views/TimelineView";
import { colors, radii } from "./components/theme/theme";
import { SettingsView } from "./views/SettingsView";

type ActiveTab = "wiki" | "maps" | "characters" | "timeline" | "relations" | "settings";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("wiki");
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null); // Stato per la mappa selezionata

  const handleOpenArticle = (articleId: string) => {
    setSelectedArticleId(articleId);
    setActiveTab("wiki");
  };

  const handleOpenCharacterSheet = (sheetId: string) => {
    setSelectedSheetId(sheetId);
    setActiveTab("characters");
  };

  const handleOpenMap = (mapId: string) => {
    setSelectedMapId(mapId);
    setActiveTab("maps");
  };

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden", backgroundColor: colors.bgVoid }}>
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
          onClick={() => setActiveTab("wiki")}
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
          onClick={() => setActiveTab("maps")}
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
          onClick={() => setActiveTab("characters")}
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
          onClick={() => setActiveTab("timeline")}
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
          onClick={() => setActiveTab("relations")}
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
          onClick={() => setActiveTab("settings")}
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

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
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
          <div style={{ padding: "2rem", color: colors.textFaint, flex: 1, textAlign: "center" }}>
            Modulo Relazioni & Alberi Genealogici in arrivo…
          </div>
        )}
        
        {activeTab === "settings" && <SettingsView />}
      </div>
    </div>
  );
}