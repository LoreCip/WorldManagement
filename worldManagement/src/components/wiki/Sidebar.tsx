import React from "react";
import { Search } from "lucide-react";
import { ArticleItem } from "../../types/wiki";
import { colors, fonts, radii, getCategoryColor, getCategoryLabel } from "../theme/theme";
import { useLocalization } from "../../context/LocalizationContext";
import { SidebarLayout } from "../common/SidebarLayout";
import { Button } from "../common/Button";
import { Icon } from "../common/Icon";
import { CompendiumIcon } from "../common/icons/CompendiumIcon";

interface SidebarProps {
  articles: ArticleItem[];
  searchQuery: string;
  selectedId: string;
  onSearch: (query: string) => void;
  onSelectArticle: (id: string) => void;
  onNewArticle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  articles,
  searchQuery,
  selectedId,
  onSearch,
  onSelectArticle,
  onNewArticle,
}) => {
  const { t } = useLocalization();

  return (
    <SidebarLayout
      icon={<CompendiumIcon />}
      title={t("wiki.sidebar.title")}
      subtitle={t("wiki.sidebar.subtitle")}
    >
      <Button
        variant="primary"
        onClick={onNewArticle}
        style={{
          width: "100%",
          letterSpacing: "0.01em",
          marginBottom: "1.1rem",
        }}
      >
        {t("wiki.sidebar.newWiki")}
      </Button>

      <div style={{ position: "relative", marginBottom: "1.3rem" }}>
        <Icon
          icon={Search}
          size={14}
          color={colors.textFaint}
          style={{ position: "absolute", left: "0.15rem", top: "50%", transform: "translateY(-50%)" }}
        />
        <input
          type="text"
          placeholder={t("wiki.sidebar.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
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

      <div style={{ flex: 1, overflowY: "auto" }}>
        {articles.length === 0 ? (
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
            {t("wiki.sidebar.noResults")}
          </div>
        ) : (
          articles.map((item) => {
            const isSelected = selectedId === item.id;
            const catColor = getCategoryColor(item.category);
            return (
              <div
                key={item.id}
                onClick={() => onSelectArticle(item.id)}
                style={{
                  padding: "0.65rem 0.75rem",
                  borderRadius: radii.sm,
                  backgroundColor: isSelected ? colors.bgPanelRaised : "transparent",
                  borderLeft: `3px solid ${isSelected ? catColor : "transparent"}`,
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
                    color: colors.textPrimary,
                  }}
                >
                  {item.title}
                </div>
                <div
                  style={{
                    fontSize: "0.68rem",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: catColor,
                    margin: "3px 0 4px",
                    fontWeight: 600,
                  }}
                >
                  {getCategoryLabel(t, item.category)}
                </div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: colors.textSecondary,
                    lineHeight: 1.4,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                  dangerouslySetInnerHTML={{ __html: item.snippet || t("wiki.sidebar.noSnippet") }}
                />
              </div>
            );
          })
        )}
      </div>
    </SidebarLayout>
  );
};
