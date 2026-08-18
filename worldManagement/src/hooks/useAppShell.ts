import { useCallback, useState } from "react";
import { HubModuleKey } from "../views/HubView";

export type ActiveTab =
  "hub" | "wiki" | "maps" | "characters" | "timeline" | "relations" | "settings";

// Le uniche tab "di contenuto" la cui ultima visita viene ricordata dalla hub.
const HUB_TRACKED_TABS: ActiveTab[] = ["wiki", "maps", "characters", "timeline", "relations"];

const LAST_VISITED_TAB_KEY = "worldbuilder_last_visited_tab";

// Stato e navigazione a livello di app shell: quale tab e attiva, quali id
// sono selezionati per il deep-link tra moduli (es. apri un articolo wiki
// da un'altra vista), e i gestori che coordinano i due. Estratto da App.tsx
// perche non e UI: App.tsx resta un componente di solo layout/routing.
export function useAppShell() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("hub");
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);

  const handleTabChange = useCallback((tab: ActiveTab) => {
    setActiveTab(tab);
    if (HUB_TRACKED_TABS.includes(tab)) {
      try {
        localStorage.setItem(LAST_VISITED_TAB_KEY, tab);
      } catch {
        // localStorage non disponibile: la scelta vale solo per la sessione corrente
      }
    }
  }, []);

  const handleOpenArticle = useCallback(
    (articleId: string) => {
      setSelectedArticleId(articleId);
      handleTabChange("wiki");
    },
    [handleTabChange],
  );

  const handleOpenCharacterSheet = useCallback(
    (sheetId: string) => {
      setSelectedSheetId(sheetId);
      handleTabChange("characters");
    },
    [handleTabChange],
  );

  const handleOpenMap = useCallback(
    (mapId: string) => {
      setSelectedMapId(mapId);
      handleTabChange("maps");
    },
    [handleTabChange],
  );

  const handleHubNavigate = useCallback(
    (tab: HubModuleKey) => {
      handleTabChange(tab);
    },
    [handleTabChange],
  );

  return {
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
  };
}
