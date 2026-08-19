import React, { useState, useMemo } from "react";
import { Plus, Search } from "lucide-react";
import { MapItem } from "../../types/map";
import { buildMapHierarchy, flattenMapHierarchy } from "../../utils/mapHierarchy";
import { colors, fonts, radii } from "../theme/theme";
import { useLocalization } from "../../context/LocalizationContext";
import { SidebarLayout } from "../common/SidebarLayout";
import { Button } from "../common/Button";
import { Icon } from "../common/Icon";
import { CompendiumIcon as MapMarkIcon } from "../common/icons/CompendiumIcon";

interface MapSidebarProps {
  maps: MapItem[];
  currentMapId?: string;
  onSelectMap: (mapId: string) => void;
  onNewMap: () => void;
}

export const MapSidebar: React.FC<MapSidebarProps> = ({
  maps,
  currentMapId,
  onSelectMap,
  onNewMap,
}) => {
  const { t } = useLocalization();
  const [searchQuery, setSearchQuery] = useState("");

  const flatHierarchy = useMemo(() => {
    const tree = buildMapHierarchy(maps);
    return flattenMapHierarchy(tree);
  }, [maps]);

  const filteredHierarchy = useMemo(() => {
    if (!searchQuery.trim()) return flatHierarchy;
    const q = searchQuery.toLowerCase();
    return flatHierarchy.filter((item) => item.map.title.toLowerCase().includes(q));
  }, [flatHierarchy, searchQuery]);

  return (
    <SidebarLayout
      icon={<MapMarkIcon />}
      title={t("maps.sidebar.title")}
      subtitle={t("maps.sidebar.subtitle")}
    >
      {/* Pulsante Nuova Mappa */}
      <Button
        variant="primary"
        icon={Plus}
        onClick={onNewMap}
        style={{ width: "100%", letterSpacing: "0.01em", marginBottom: "1.1rem" }}
      >
        {t("maps.form.newMap")}
      </Button>

      {/* Ricerca */}
      <div style={{ position: "relative", marginBottom: "1.3rem" }}>
        <Icon
          icon={Search}
          size={14}
          color={colors.textFaint}
          style={{ position: "absolute", left: "0.15rem", top: "50%", transform: "translateY(-50%)" }}
        />
        <input
          type="text"
          placeholder={t("maps.sidebar.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "0.5rem 0.4rem 0.5rem 1.5rem",
            backgroundColor: "transparent",
            border: "none",
            borderBottom: `1px solid ${colors.border}`,
            color: colors.textPrimary,
            fontFamily: fonts.body,
            fontSize: "0.88rem",
            borderRadius: 0,
            boxSizing: "border-box",
            outline: "none",
            transition: "border-color 0.15s ease",
          }}
          onFocus={(e) => (e.currentTarget.style.borderBottomColor = colors.gold)}
          onBlur={(e) => (e.currentTarget.style.borderBottomColor = colors.border)}
        />
      </div>

      {/* Lista Mappe in Albero Gerarchico */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filteredHierarchy.length === 0 ? (
          <div
            style={{
              color: colors.textFaint,
              fontFamily: fonts.display,
              fontStyle: "italic",
              fontSize: "0.95rem",
              textAlign: "center",
              marginTop: "2rem",
            }}
          >
            {t("maps.sidebar.noResults")}
          </div>
        ) : (
          filteredHierarchy.map(({ map, level }) => {
            const isSelected = currentMapId === map.id;
            return (
              <div
                key={map.id}
                onClick={() => onSelectMap(map.id)}
                style={{
                  padding: "0.65rem 0.75rem",
                  paddingLeft: `${0.75 + level * 0.85}rem`,
                  borderRadius: radii.sm,
                  backgroundColor: isSelected ? colors.bgPanelRaised : "transparent",
                  borderLeft: `3px solid ${isSelected ? colors.gold : "transparent"}`,
                  cursor: "pointer",
                  marginBottom: "0.3rem",
                  transition: "background-color 0.15s ease, border-color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected)
                    e.currentTarget.style.backgroundColor = colors.bgPanelRaised + "80";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <div
                  style={{
                    fontFamily: fonts.display,
                    fontWeight: 600,
                    fontSize: "1rem",
                    color: isSelected ? colors.gold : colors.textPrimary,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {level > 0 ? "↳ " : ""}
                  {map.title}
                </div>
                <div
                  style={{
                    fontSize: "0.68rem",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: level === 0 ? colors.gold : colors.textFaint,
                    margin: "3px 0 2px",
                    fontWeight: 600,
                  }}
                >
                  {level === 0 ? t("maps.sidebar.mainMap") : t("maps.sidebar.subMap") + ` ${level}`}
                </div>
              </div>
            );
          })
        )}
      </div>
    </SidebarLayout>
  );
};
