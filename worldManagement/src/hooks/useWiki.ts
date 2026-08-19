import { useCallback, useEffect, useRef, useState } from "react";
import { invokeSafe, invokeOrThrow } from "../lib/ipc";
import { useLocalization } from "../context/LocalizationContext";
import { useConfirm } from "../components/common/ConfirmDialog";
import { Article, ArticleItem } from "../types/wiki";

const EMPTY_ARTICLE: Article = { id: "", title: "", content: "", category: "Lore", tags: [] };

export function useWiki() {
  const { t } = useLocalization();
  const confirm = useConfirm();
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentArticle, setCurrentArticle] = useState<Article>(EMPTY_ARTICLE);
  const [isEditing, setIsEditing] = useState(false);
  const [linkedSheetId, setLinkedSheetId] = useState<string | null>(null);
  const [linkedMapId, setLinkedMapId] = useState<string | null>(null);

  // Snapshot dell'ultima versione caricata/salvata: confrontandolo con
  // currentArticle sappiamo se ci sono modifiche non salvate prima di
  // scartarle (cambio articolo, "nuovo articolo", chiusura finestra).
  const savedSnapshotRef = useRef<string>(JSON.stringify(EMPTY_ARTICLE));
  const isDirty = isEditing && JSON.stringify(currentArticle) !== savedSnapshotRef.current;

  const confirmDiscardChanges = useCallback(async () => {
    if (!isDirty) return true;
    return confirm(t("wiki.hook.unsavedChangesConfirm"));
  }, [isDirty, confirm, t]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

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

  const handleSelectArticle = useCallback(
    async (id: string) => {
      if (!(await confirmDiscardChanges())) return;

      const res = await invokeSafe<Article>("get_article_by_id", { id });
      if (res) {
        setCurrentArticle(res);
        savedSnapshotRef.current = JSON.stringify(res);
        setIsEditing(false);
      }
    },
    [confirmDiscardChanges],
  );

  const handleSave = useCallback(async () => {
    if (!currentArticle.title.trim()) return;

    const savedId = await invokeSafe<string>("save_article", { article: currentArticle });
    if (savedId === null) return;

    const saved = { ...currentArticle, id: savedId };
    setCurrentArticle(saved);
    savedSnapshotRef.current = JSON.stringify(saved);
    setIsEditing(false);
    await loadArticles();
  }, [currentArticle, loadArticles]);

  const handleNewArticle = useCallback(async () => {
    if (!(await confirmDiscardChanges())) return;

    setCurrentArticle(EMPTY_ARTICLE);
    savedSnapshotRef.current = JSON.stringify(EMPTY_ARTICLE);
    setIsEditing(true);
  }, [confirmDiscardChanges]);

  const handleDeleteArticle = useCallback(async () => {
    if (!currentArticle.id) return;

    const confirmed = await confirm(t("wiki.hook.deleteArticleConfirm"));
    if (!confirmed) return;

    try {
      await invokeOrThrow<void>("delete_article", { id: currentArticle.id });
    } catch {
      return;
    }

    setCurrentArticle(EMPTY_ARTICLE);
    savedSnapshotRef.current = JSON.stringify(EMPTY_ARTICLE);
    setIsEditing(false);
    await loadArticles();
  }, [currentArticle.id, loadArticles, t, confirm]);

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

      const createNew = await confirm(t("wiki.hook.createFromTitleConfirm", { title }));
      if (!createNew) return;

      if (!(await confirmDiscardChanges())) return;

      const draft: Article = {
        id: "",
        title,
        content: `# ${title}\n\nScrivi qui la descrizione di ${title}...`,
        category: "Lore",
        tags: [],
      };
      setCurrentArticle(draft);
      savedSnapshotRef.current = JSON.stringify(draft);
      setIsEditing(true);
    },
    [articles, handleSelectArticle, t, confirm, confirmDiscardChanges],
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
