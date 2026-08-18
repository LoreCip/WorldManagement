import React, { useEffect, useRef } from "react";
import { Sidebar } from "../components/wiki/Sidebar";
import { ArticleEditor } from "../components/wiki/ArticleEditor";
import { useWiki } from "../hooks/useWiki";

interface WikiViewProps {
  selectedArticleId?: string | null;
  onSelectArticle?: (id: string | null) => void;
  onNavigateToCharacterSheet?: (sheetId: string) => void;
  onNavigateToMap?: (mapId: string) => void;
}

export const WikiView: React.FC<WikiViewProps> = ({
  selectedArticleId,
  onSelectArticle,
  onNavigateToCharacterSheet,
  onNavigateToMap,
}) => {
  const {
    articles,
    searchQuery,
    currentArticle,
    isEditing,
    linkedSheetId,
    linkedMapId,
    setIsEditing,
    setCurrentArticle,
    handleSearch,
    handleSelectArticle,
    handleSave,
    handleNewArticle,
    handleDeleteArticle,
    handleNavigateToTitle,
  } = useWiki();

  const syncedExternalId = useRef<string | null | undefined>(null);

  useEffect(() => {
    if (
      selectedArticleId &&
      selectedArticleId !== syncedExternalId.current &&
      articles.length > 0
    ) {
      handleSelectArticle(selectedArticleId);
      syncedExternalId.current = selectedArticleId;
    }
  }, [selectedArticleId, articles, handleSelectArticle]);

  const onSelectArticleWrapper = (id: string) => {
    handleSelectArticle(id);
    onSelectArticle?.(id);
  };

  return (
    <div style={{ display: "flex", width: "100%", height: "100%" }}>
      <Sidebar
        articles={articles}
        searchQuery={searchQuery}
        selectedId={currentArticle.id}
        onSearch={handleSearch}
        onSelectArticle={onSelectArticleWrapper}
        onNewArticle={handleNewArticle}
      />
      <ArticleEditor
        article={currentArticle}
        isEditing={isEditing}
        linkedSheetId={linkedSheetId}
        linkedMapId={linkedMapId}
        onChange={setCurrentArticle}
        onSave={handleSave}
        onEdit={() => setIsEditing(true)}
        onDelete={handleDeleteArticle}
        onNavigateToTitle={handleNavigateToTitle}
        onNavigateToCharacterSheet={onNavigateToCharacterSheet}
        onNavigateToMap={onNavigateToMap}
      />
    </div>
  );
};
