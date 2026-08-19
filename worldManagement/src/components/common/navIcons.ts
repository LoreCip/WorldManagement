import { Home, ScrollText, Map, Drama, Hourglass, TreePine, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ActiveTab } from "../../hooks/useAppShell";

// Icone della nav rail: unico punto dove un'icona deve essere raggiungibile
// da una chiave stringa (App.tsx la associa alla tab in CONTENT_TABS).
export const navIcons: Record<ActiveTab, LucideIcon> = {
  hub: Home,
  wiki: ScrollText,
  maps: Map,
  characters: Drama,
  timeline: Hourglass,
  relations: TreePine,
  settings: Settings,
};
