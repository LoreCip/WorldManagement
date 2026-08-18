import { useCallback, useEffect, useState } from "react";
import { invokeSafe } from "../lib/ipc";
import { useLocalization } from "../context/LocalizationContext";
import { Article, ArticleItem } from "../types/wiki";

const EMPTY_ARTICLE: Article = { id: "", title: "", content: "", category: "Lore", tags: [] };

export function useWiki() {
  const { t } = useLocalization();
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentArticle, setCurrentArticle] = useState<Article>(EMPTY_ARTICLE);
  const [isEditing, setIsEditing] = useState(false);
  const [linkedSheetId, setLinkedSheetId] = useState<string | null>(null);
  const [linkedMapId, setLinkedMapId] = useState<string | null>(null);

  const loadArticles = useCallback(async () => {
    const res = await invokeSafe<ArticleItem[]>("get_all_articles");
    setArticles(res ?? []);
  }, []);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  useEffect(() => {
    if (!currentArticle.id) {
      setLinkedSheetId(null);
      setLinkedMapId(null);
      return;
    }

    let cancelled = false;
    (async () => {
      const [sheetId, mapId] = await Promise.all([
        invokeSafe<string | null>("get_character_sheet_id_by_article", {
          articleId: currentArticle.id,
        }),
        invokeSafe<string | null>("get_map_id_by_article", { articleId: currentArticle.id }),
      ]);
      if (!cancelled) {
        setLinkedSheetId(sheetId ?? null);
        setLinkedMapId(mapId ?? null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentArticle.id]);

  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      if (query.trim().length === 0) {
        await loadArticles();
        return;
      }
      const res = await invokeSafe<ArticleItem[]>("search_wiki", { query });
      if (res) setArticles(res);
    },
    [loadArticles],
  );

  const handleSelectArticle = useCallback(async (id: string) => {
    const res = await invokeSafe<Article>("get_article_by_id", { id });
    console.log("handleSelectArticle: risposta IPC per id", id, "->", res);
    if (res) {
      setCurrentArticle(res);
      setIsEditing(false);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!currentArticle.title.trim()) return;

    const savedId = await invokeSafe<string>("save_article", { article: currentArticle });
    if (savedId === null) return;

    setCurrentArticle((prev) => ({ ...prev, id: savedId }));
    setIsEditing(false);
    await loadArticles();
  }, [currentArticle, loadArticles]);

  const handleNewArticle = useCallback(() => {
    setCurrentArticle(EMPTY_ARTICLE);
    setIsEditing(true);
  }, []);

  const handleDeleteArticle = useCallback(async () => {
    if (!currentArticle.id) return;

    const confirmed = window.confirm(t("wiki.hook.deleteArticleConfirm"));
    if (!confirmed) return;

    const result = await invokeSafe<void>("delete_article", { id: currentArticle.id });
    if (result === null) return;

    setCurrentArticle(EMPTY_ARTICLE);
    setIsEditing(false);
    await loadArticles();
  }, [currentArticle.id, loadArticles, t]);

  const handleNavigateToTitle = useCallback(
    async (title: string) => {
      console.log("navigateToTitle chiamato con:", title);
      const cleanTitle = title.trim().toLowerCase();

      // 1. Cerca prima tra gli articoli gia caricati in memoria
      let target = articles.find((a) => a.title.trim().toLowerCase() === cleanTitle);

      if (!target) {
        const allArticles = await invokeSafe<ArticleItem[]>("get_all_articles");
        target = allArticles?.find((a) => a.title.trim().toLowerCase() === cleanTitle);
      }

      console.log(
        "navigateToTitle: match trovato?",
        target ? target.id : "NESSUNO",
        "articoli in memoria:",
        articles.length,
      );
      if (target) {
        await handleSelectArticle(target.id);
        console.log("navigateToTitle: handleSelectArticle completato per id", target.id);
        return;
      }

      const createNew = window.confirm(t("wiki.hook.createFromTitleConfirm", { title }));
      if (!createNew) return;

      setCurrentArticle({
        id: "",
        title,
        content: `# ${title}\n\nScrivi qui la descrizione di ${title}...`,
        category: "Lore",
        tags: [],
      });
      setIsEditing(true);
    },
    [articles, handleSelectArticle, t],
  );

  return {
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
  };
}
