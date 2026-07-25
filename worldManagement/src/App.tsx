import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

// Definizione base dei metadati
interface ArticleMeta {
	id: string;
	title: string;
	category: string;
}

interface ArticleItem extends ArticleMeta {
	snippet: string;
}

interface Article extends ArticleMeta {
	content: string;
	tags: string[];
}

export default function App() {
	// 1. La lista delle voci mostrate nella sidebar
	const [articles, setArticles] = useState<ArticleItem[]>([]);
	// 2. Il testo attualmente digitato nella barra di ricerca
	const [searchQuery, setSearchQuery] = useState("");
	// 3. La scheda aperta attualmente nell'editor centrale
	const [currentArticle, setCurrentArticle] = useState<Article>({
		id: "",
		title: "",
		content: "",
		category: "Lore",
		tags: [],
	});
	// 4. Indica se la scheda aperta è in modalità "Lettura" o "Modifica"
	const [isEditing, setIsEditing] = useState(false);

	// Carica la lista iniziale di tutti gli articoli
	const loadArticles = async () => {
		try {
			const res = await invoke<ArticleItem[]>("get_all_articles");
			setArticles(res);
		} catch (err) {
			console.error("Errore caricamento articoli:", err);
		}
	};

	// useEffect con [] vuoto = esegui 'loadArticles' UNA SOLA VOLTA all'avvio dell'app
	useEffect(() => {
		loadArticles();
	}, []);

	// Gestione Ricerca FTS5
	const handleSearch = async (query: string) => {
		setSearchQuery(query);
		if (query.trim().length > 0) {
			try {
				const res = await invoke<ArticleItem[]>("search_wiki", { query });
				setArticles(res);
			} catch (err) {
				console.error("Errore ricerca:", err);
			}
		} else {
			loadArticles();
		}
	};

	// Seleziona un articolo dalla sidebar
	const selectArticle = async (id: string) => {
		try {
			const res = await invoke<Article>("get_article_by_id", { id });
			setCurrentArticle(res);
			setIsEditing(false);
		} catch (err) {
			console.error("Errore caricamento articolo:", err);
		}
	};

	// Salva l'articolo corrente
	const handleSave = async () => {
		if (!currentArticle.title.trim()){
			console.log("Title must not be empty!")	
			return
		};
		try {
			console.log("Invio dati a Rust:", currentArticle);
			const savedId = await invoke<string>("save_article", {
				article: currentArticle,
			});
			console.log("Articolo salvato con ID:", savedId);
			
			setCurrentArticle((prev) => ({ ...prev, id: savedId }));
			setIsEditing(false);
			loadArticles();
		} catch (err) {
			console.error("Errore durante il salvataggio da Rust:", err);
		}
	};

	const [tagInput, setTagInput] = useState("");

	// Aggiunge un tag all'articolo corrente
	const handleAddTag = (e: React.KeyboardEvent) => {
		if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
			e.preventDefault();
			const cleanTag = tagInput.trim().replace(",", "").toLowerCase();
			
			if (!currentArticle.tags.includes(cleanTag)) {
			setCurrentArticle({
				...currentArticle,
				tags: [...currentArticle.tags, cleanTag],
			});
			}
			setTagInput("");
		}
	};

	// Rimuove un tag
	const handleRemoveTag = (tagToRemove: string) => {
		setCurrentArticle({
			...currentArticle,
			tags: currentArticle.tags.filter((t) => t !== tagToRemove),
		});
	};

	// Crea nuova voce vuota
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

	return (
		<div style={{ display: "flex", height: "100vh", backgroundColor: "#0f172a", color: "#f8fafc", fontFamily: "sans-serif" }}>
			{/* Sidebar Sinistra */}
			<div style={{ width: "300px", borderRight: "1px solid #334155", display: "flex", flexDirection: "column", padding: "1rem" }}>
				<h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem", color: "#f59e0b" }}>
					📜 Fantasy Worldbuilder
				</h2>

				<button
					onClick={handleNewArticle}
					style={{
						padding: "0.5rem 1rem",
						backgroundColor: "#d97706",
						color: "#fff",
						border: "none",
						borderRadius: "6px",
						cursor: "pointer",
						fontWeight: "bold",
						marginBottom: "1rem",
					}}
				>
					+ Nuova Voce
				</button>

				<input
					type="text"
					placeholder="🔍 Cerca nell'ambientazione..."
					value={searchQuery}
					onChange={(e) => handleSearch(e.target.value)}
					style={{
						width: "100%",
						padding: "0.5rem",
						backgroundColor: "#1e293b",
						border: "1px solid #475569",
						color: "#fff",
						borderRadius: "4px",
						marginBottom: "1rem",
						boxSizing: "border-box",
					}}
				/>

				<div style={{ flex: 1, overflowY: "auto" }}>
					{articles.map((item) => (
						<div
							key={item.id}
							onClick={() => selectArticle(item.id)}
							style={{
								padding: "0.75rem",
								borderRadius: "6px",
								backgroundColor: currentArticle.id === item.id ? "#334155" : "transparent",
								cursor: "pointer",
								marginBottom: "0.5rem",
								borderBottom: "1px solid #1e293b",
							}}
						>
							<div style={{ fontWeight: "bold", fontSize: "0.95rem", color: "#e2e8f0" }}>{item.title}</div>
							<div style={{ fontSize: "0.75rem", color: "#f59e0b", margin: "2px 0" }}>[{item.category}]</div>
							<div
								style={{ fontSize: "0.8rem", color: "#94a3b8" }}
								dangerouslySetInnerHTML={{ __html: item.snippet || "Nessun contenuto..." }}
							/>
						</div>
					))}
				</div>
			</div>

			{/* Area Principale / Editor */}
			<div style={{ flex: 1, padding: "2rem", display: "flex", flexDirection: "column", overflowY: "auto" }}>
				{currentArticle.id || isEditing ? (
					<>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
							{isEditing ? (
								<div style={{ display: "flex", gap: "1rem", width: "100%" }}>
									<input
										type="text"
										value={currentArticle.title}
										placeholder="Titolo"
										onChange={(e) => setCurrentArticle({ ...currentArticle, title: e.target.value })}
										style={{
											fontSize: "1.5rem",
											fontWeight: "bold",
											backgroundColor: "#1e293b",
											color: "#fff",
											border: "1px solid #475569",
											padding: "0.5rem",
											borderRadius: "6px",
											flex: 1,
										}}
									/>
									<select
										value={currentArticle.category}
										onChange={(e) => setCurrentArticle({ ...currentArticle, category: e.target.value })}
										style={{
											backgroundColor: "#1e293b",
											color: "#fff",
											border: "1px solid #475569",
											padding: "0.5rem",
											borderRadius: "6px",
										}}
									>
										<option value="Lore">Lore / Storia</option>
										<option value="Personaggio">Personaggio</option>
										<option value="Luogo">Luogo</option>
										<option value="Fazione">Fazione</option>
									</select>
								</div>
							) : (
								<div>
									<h1 style={{ fontSize: "2rem", fontWeight: "bold", margin: 0, color: "#f1f5f9" }}>{currentArticle.title}</h1>
									<span style={{ fontSize: "0.85rem", color: "#f59e0b", backgroundColor: "#78350f", padding: "2px 8px", borderRadius: "4px" }}>
										{currentArticle.category}
									</span>
								</div>
							)}

							{/* Sezione Tag */}
							<div style={{ marginBottom: "1rem" }}>
							<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", marginBottom: "0.5rem" }}>
								{/* Lista dei Tag Correnti */}
								{currentArticle.tags.map((tag) => (
								<span
									key={tag}
									style={{
									backgroundColor: "#3b82f6",
									color: "#fff",
									padding: "2px 8px",
									borderRadius: "12px",
									fontSize: "0.85rem",
									display: "flex",
									alignItems: "center",
									gap: "4px",
									}}
								>
									#{tag}
									{isEditing && (
									<button
										onClick={() => handleRemoveTag(tag)}
										style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontWeight: "bold" }}
									>
										×
									</button>
									)}
								</span>
								))}

								{/* Input per aggiungere nuovi Tag (Visibile solo in modalità Modifica) */}
								{isEditing && (
								<input
									type="text"
									placeholder="Aggiungi tag (premi Invio)..."
									value={tagInput}
									onChange={(e) => setTagInput(e.target.value)}
									onKeyDown={handleAddTag}
									style={{
									backgroundColor: "#1e293b",
									color: "#fff",
									border: "1px solid #475569",
									borderRadius: "4px",
									padding: "2px 8px",
									fontSize: "0.85rem",
									}}
								/>
								)}
							</div>
							</div>

							<div style={{ display: "flex", gap: "0.5rem", marginLeft: "1rem" }}>
								{isEditing ? (
									<button
										onClick={handleSave}
										style={{ padding: "0.5rem 1.5rem", backgroundColor: "#16a34a", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
									>
										Salva
									</button>
								) : (
									<button
										onClick={() => setIsEditing(true)}
										style={{ padding: "0.5rem 1.5rem", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
									>
										Modifica
									</button>
								)}
							</div>
						</div>

						{isEditing ? (
							<textarea
								value={currentArticle.content}
								onChange={(e) => setCurrentArticle({ ...currentArticle, content: e.target.value })}
								placeholder="Scrivi qui i dettagli della lore, eventi, descrizioni..."
								style={{
									flex: 1,
									minHeight: "400px",
									backgroundColor: "#1e293b",
									color: "#f8fafc",
									border: "1px solid #475569",
									borderRadius: "6px",
									padding: "1rem",
									fontSize: "1rem",
									lineHeight: "1.6",
									fontFamily: "inherit",
									resize: "vertical",
								}}
							/>
						) : (
							<div
								style={{
									backgroundColor: "#1e293b",
									padding: "1.5rem",
									borderRadius: "8px",
									border: "1px solid #334155",
									lineHeight: "1.7",
									whiteSpace: "pre-wrap",
									fontSize: "1.05rem",
								}}
							>
								{currentArticle.content || "Nessun contenuto in questa voce."}
							</div>
						)}
					</>
				) : (
					<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#64748b" }}>
						Seleziona una voce dalla sidebar o clicca su "+ Nuova Voce" per iniziare.
					</div>
				)}
			</div>
		</div>
	);
}