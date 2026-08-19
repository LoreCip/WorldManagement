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
import { Button } from "./components/common/Button";
import { navIcons } from "./components/common/navIcons";

interface NavIconButtonProps {
  tab: ActiveTab;
  title: string;
  isActive: boolean;
  onClick: () => void;
  pinToBottom?: boolean;
}

const NavIconButton: React.FC<NavIconButtonProps> = ({
  tab,
  title,
  isActive,
  onClick,
  pinToBottom,
}) => (
  <Button
    variant="ghost"
    active={isActive}
    icon={navIcons[tab]}
    iconSize={20}
    onClick={onClick}
    title={title}
    aria-label={title}
    style={{
      width: "40px",
      height: "40px",
      padding: 0,
      borderRadius: radii.md,
      marginTop: pinToBottom ? "auto" : undefined,
    }}
  />
);

const CONTENT_TABS: { tab: ActiveTab; titleKey: string }[] = [
  { tab: "wiki", titleKey: "app.nav.wiki" },
  { tab: "maps", titleKey: "app.nav.maps" },
  { tab: "characters", titleKey: "app.nav.characters" },
  { tab: "timeline", titleKey: "app.nav.timeline" },
  { tab: "relations", titleKey: "app.nav.relations" },
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
            tab="hub"
            title={t("app.nav.hub")}
            isActive={false}
            onClick={() => handleTabChange("hub")}
          />

          <div style={{ width: "28px", height: "1px", backgroundColor: colors.border }} />

          {CONTENT_TABS.map(({ tab, titleKey }) => (
            <NavIconButton
              key={tab}
              tab={tab}
              title={t(titleKey)}
              isActive={activeTab === tab}
              onClick={() => handleTabChange(tab)}
            />
          ))}

          <NavIconButton
            tab="settings"
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
