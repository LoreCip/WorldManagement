import { WikiView } from "./views/WikiView";
import { MapView } from "./views/MapView";
import { CharacterView } from "./views/CharacterView";
import { TimelineView } from "./views/TimelineView";
import { colors, radii } from "./components/theme/theme";
import { SettingsView } from "./views/SettingsView";
import { HubView } from "./views/HubView";
import { RelationsView } from "./views/RelationsView";
import { useAppShell, ActiveTab } from "./hooks/useAppShell";
import { useLocalization } from "./context/LocalizationContext";

interface NavIconButtonProps {
  icon: string;
  title: string;
  isActive: boolean;
  onClick: () => void;
  pinToBottom?: boolean;
}

const NavIconButton: React.FC<NavIconButtonProps> = ({
  icon,
  title,
  isActive,
  onClick,
  pinToBottom,
}) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      background: isActive ? colors.bgPanelRaised : "none",
      border: "none",
      borderRadius: radii.md,
      width: "40px",
      height: "40px",
      fontSize: "1.2rem",
      cursor: "pointer",
      opacity: isActive ? 1 : 0.4,
      marginTop: pinToBottom ? "auto" : undefined,
    }}
  >
    {icon}
  </button>
);

const CONTENT_TABS: { tab: ActiveTab; icon: string; titleKey: string }[] = [
  { tab: "wiki", icon: "📜", titleKey: "app.nav.wiki" },
  { tab: "maps", icon: "🗺️", titleKey: "app.nav.maps" },
  { tab: "characters", icon: "🎭", titleKey: "app.nav.characters" },
  { tab: "timeline", icon: "⏳", titleKey: "app.nav.timeline" },
  { tab: "relations", icon: "🌳", titleKey: "app.nav.relations" },
];

export default function App() {
  const { t } = useLocalization();
  const {
    activeTab,
    selectedArticleId,
    selectedSheetId,
    selectedMapId,
    setSelectedArticleId,
    setSelectedSheetId,
    handleTabChange,
    handleOpenArticle,
    handleOpenCharacterSheet,
    handleOpenMap,
    handleHubNavigate,
  } = useAppShell();

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        backgroundColor: colors.bgVoid,
      }}
    >
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
          <NavIconButton
            icon="🏠"
            title={t("app.nav.hub")}
            isActive={false}
            onClick={() => handleTabChange("hub")}
          />

          <div style={{ width: "28px", height: "1px", backgroundColor: colors.border }} />

          {CONTENT_TABS.map(({ tab, icon, titleKey }) => (
            <NavIconButton
              key={tab}
              icon={icon}
              title={t(titleKey)}
              isActive={activeTab === tab}
              onClick={() => handleTabChange(tab)}
            />
          ))}

          <NavIconButton
            icon="⚙️"
            title={t("app.nav.settings")}
            isActive={activeTab === "settings"}
            onClick={() => handleTabChange("settings")}
            pinToBottom
          />
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
          <MapView onOpenArticle={handleOpenArticle} initialMapId={selectedMapId} />
        )}

        {activeTab === "characters" && (
          <CharacterView
            onNavigateToWiki={handleOpenArticle}
            initialSheetId={selectedSheetId}
            onSelectSheet={setSelectedSheetId}
          />
        )}

        {activeTab === "timeline" && (
          <TimelineView onNavigateToArticle={handleOpenArticle} onNavigateToMap={handleOpenMap} />
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
