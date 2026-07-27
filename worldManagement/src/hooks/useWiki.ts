import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Article, ArticleItem } from "../types/wiki";

export function useWiki() {
	const [articles, setArticles] = useState<ArticleItem[]>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [currentArticle, setCurrentArticle] = useState<Article>({
		id: "",
		title: "",
		content: "",
		category: "Lore",
		tags: [],
	});
	const [isEditing, setIsEditing] = useState(false);

	const loadArticles = async () => {
		try {
			const res = await invoke<ArticleItem[]>("get_all_articles");
			setArticles(res);
		} catch (err) {
			console.error("Errore durante il caricamento degli articoli:", err);
		}
	};

	useEffect(() => {
		loadArticles();
	}, []);

	const handleSearch = async (query: string) => {
		setSearchQuery(query);
		if (query.trim().length > 0) {
			try {
				const res = await invoke<ArticleItem[]>("search_wiki", { query });
				setArticles(res);
			} catch (err) {
				console.error("Errore durante la ricerca:", err);
			}
		} else {
			loadArticles();
		}
	};

	const handleSelectArticle = async (id: string) => {
		try {
			const res = await invoke<Article>("get_article_by_id", { id });
			setCurrentArticle(res);
			setIsEditing(false);
		} catch (err) {
			console.error("Errore durante il recupero dell'articolo:", err);
		}
	};

	const handleSave = async () => {
		if (!currentArticle.title.trim()) return;

		try {
			const savedId = await invoke<string>("save_article", { article: currentArticle });
			setCurrentArticle((prev) => ({ ...prev, id: savedId }));
			setIsEditing(false);
			loadArticles();
		} catch (err) {
			console.error("Errore durante il salvataggio:", err);
		}
	};

	const handleNewArticle = () => {
		setCurrentArticle({
			id: "",
			title: "",
			content: "",
			category: "Lore",
			tags: [],
		});
		setIsEditing(true);
	};

	const handleDeleteArticle = async (id: string) => {
		if (!id) return;
		const confirmDelete = window.confirm("Sei sicuro di voler eliminare questa voce?");
		if (!confirmDelete) return;

		try {
			await invoke("delete_article", { id });
			setCurrentArticle({
				id: "",
				title: "",
				content: "",
				category: "Lore",
				tags: [],
			});
			setIsEditing(false);
			loadArticles();
		} catch (err) {
			console.error("Errore durante l'eliminazione:", err);
		}
	};

	const handleNavigateToTitle = async (title: string) => {
		const cleanTitle = title.trim().toLowerCase();

		// 1. Cerca prima tra tutti gli articoli caricati in memoria
		let target = articles.find(
			(a) => a.title.trim().toLowerCase() === cleanTitle
		);

		if (!target) {
			try {
				const allArticles = await invoke<ArticleItem[]>("get_all_articles");
				target = allArticles.find(
					(a) => a.title.trim().toLowerCase() === cleanTitle
				);
			} catch (err) {
				console.error("Errore durante la ricerca dell'articolo per titolo:", err);
			}
		}

		if (target) {
			try {
				const res = await invoke<Article>("get_article_by_id", { id: target.id });
				setCurrentArticle(res);
				setIsEditing(false);
			} catch (err) {
				console.error("Errore nel caricamento dell'articolo linkato:", err);
			}
		} else {
			const createNew = window.confirm(
				`La voce "${title}" non esiste ancora. Vuoi crearla adesso?`
			);
			if (createNew) {
				setCurrentArticle({
					id: "",
					title: title,
					content: `# ${title}\n\nScrivi qui la descrizione di ${title}...`,
					category: "Lore",
					tags: [],
				});
				setIsEditing(true);
			}
		}
	};

	return {
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
		handleNavigateToTitle
	};
}