import React, { useEffect } from "react";
import { Sidebar } from "../components/wiki/Sidebar";
import { ArticleEditor } from "../components/wiki/ArticleEditor";
import { useWiki } from "../hooks/useWiki";

interface WikiViewProps {
  selectedArticleId?: string | null;
  onSelectArticle?: (id: string | null) => void;
}

export const WikiView: React.FC<WikiViewProps> = ({
  selectedArticleId,
  onSelectArticle,
}) => {
  const {
    articles,
    searchQuery,
    currentArticle,
    isEditing,
    setIsEditing,
    setCurrentArticle,
    handleSearch,
    handleSelectArticle,
    handleSave,
    handleNewArticle,
    handleDeleteArticle,
    handleNavigateToTitle,
  } = useWiki();

  // Quando si passa un selectedArticleId dall'esterno (es. dalle Mappe)
  useEffect(() => {
    if (selectedArticleId && articles.length > 0) {
      // Se l'articolo richiesto non è quello già caricato, selezionalo
      if (currentArticle?.id !== selectedArticleId) {
        handleSelectArticle(selectedArticleId);
      }
    }
  }, [selectedArticleId, articles]);

  const onSelectArticleWrapper = (id: string) => {
    handleSelectArticle(id);
    if (onSelectArticle) {
      onSelectArticle(id);
    }
  };

  return (
    <div style={{ display: "flex", width: "100%", height: "100%" }}>
      <Sidebar
        articles={articles}
        searchQuery={searchQuery}
        selectedId={currentArticle?.id}
        onSearch={handleSearch}
        onSelectArticle={onSelectArticleWrapper}
        onNewArticle={handleNewArticle}
      />
      <ArticleEditor
        article={currentArticle}
        isEditing={isEditing}
        onChange={setCurrentArticle}
        onSave={handleSave}
        onEdit={() => setIsEditing(true)}
        onDelete={() => handleDeleteArticle(currentArticle?.id)}
        onNavigateToTitle={handleNavigateToTitle}
      />
    </div>
  );
};