import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { Article } from "../../types/wiki";
import { TagInput } from "./TagInput";
import { colors, fonts, radii, categories, getCategoryColor, getCategoryLabel, fontImportTag } from "../theme/theme";

interface ArticleEditorProps {
	article: Article;
	isEditing: boolean;
	onChange: (updated: Article) => void;
	onSave: () => void;
	onEdit: () => void;
	onDelete: () => void;
	onNavigateToTitle?: (title: string) => void;
}

const getCaretIndexFromPoint = (textarea: HTMLTextAreaElement, clientX: number, clientY: number): number => {
	const rect = textarea.getBoundingClientRect();
	const style = window.getComputedStyle(textarea);

	const paddingTop = parseFloat(style.paddingTop) || 0;
	const paddingLeft = parseFloat(style.paddingLeft) || 0;
	const lineHeight = parseFloat(style.lineHeight) || 20;

	// Coordinate relative all'area di testo interna (tenendo conto dello scroll)
	const relX = clientX - rect.left - paddingLeft;
	const relY = clientY - rect.top - paddingTop + textarea.scrollTop;

	// Trova l'indice della riga basandosi sull'altezza della linea
	const lines = textarea.value.split("\n");
	const targetLineIndex = Math.max(0, Math.min(lines.length - 1, Math.floor(relY / lineHeight)));

	// Misura la larghezza media di un carattere in font monospaziato
	const font = `${style.fontSize} ${style.fontFamily}`;
	const canvas = document.createElement("canvas");
	const context = canvas.getContext("2d");
	let charWidth = 8.5; // Valore di fallback
	if (context) {
		context.font = font;
		charWidth = context.measureText("M").width || charWidth;
	}

	// Trova la colonna orizzontale stimata
	const targetCol = Math.max(0, Math.round(relX / charWidth));

	// Calcola l'indice assoluto nel testo fino a quella riga e colonna
	let index = 0;
	for (let i = 0; i < targetLineIndex; i++) {
		index += lines[i].length + 1; // +1 per il caratter '\n'
	}

	const currentLineLength = lines[targetLineIndex].length;
	index += Math.min(currentLineLength, targetCol);

	return Math.max(0, Math.min(textarea.value.length, index));
};

const wikiLinkToMarkdown = (content: string) =>
	content
		? content.replace(/\[\[(.*?)\]\]/g, (_, title) => {
			const clean = title.trim();
			return `[${clean}](#wikilink-${encodeURIComponent(clean)})`;
		})
		: "";

export const ArticleEditor: React.FC<ArticleEditorProps> = ({
	article,
	isEditing,
	onChange,
	onSave,
	onEdit,
	onDelete,
	onNavigateToTitle,
}) => {
	const [isDragging, setIsDragging] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const articleRef = useRef(article);
	const isEditingRef = useRef(isEditing);
	useEffect(() => {
		articleRef.current = article;
		isEditingRef.current = isEditing;
	}, [article, isEditing]);

	const handleAddTag = (newTag: string) => {
		if (!article.tags.includes(newTag)) {
			onChange({ ...article, tags: [...article.tags, newTag] });
		}
	};

	const handleRemoveTag = (tagToRemove: string) => {
		onChange({ ...article, tags: article.tags.filter((t) => t !== tagToRemove) });
	};

	const isPointInsideTextarea = (x: number, y: number) => {
		const el = textareaRef.current;
		if (!el) return false;
		const rect = el.getBoundingClientRect();
		const scale = window.devicePixelRatio || 1;
		return x / scale >= rect.left && x / scale <= rect.right && y / scale >= rect.top && y / scale <= rect.bottom;
	};

	const importImageFile = async (filePath: string, dropX?: number, dropY?: number) => {
		try {
			const savedPath = await invoke<string>("save_image", { filePath });
			if (!savedPath) {
				console.error("save_image ha restituito un percorso vuoto per:", filePath);
				return;
			}

			const assetUrl = convertFileSrc(savedPath);
			if (!assetUrl) {
				console.error("convertFileSrc ha restituito una stringa vuota per:", savedPath);
				return;
			}

			const fileName = filePath.split(/[\\/]/).pop() || "immagine";
			const imageMarkdown = `\n![${fileName}](${assetUrl})\n`;
			const currentContent = articleRef.current.content || "";

			const el = textareaRef.current;
			let insertAt = currentContent.length; // fallback: in fondo

			if (el && dropX !== undefined && dropY !== undefined) {
				const scale = window.devicePixelRatio || 1;
				insertAt = getCaretIndexFromPoint(el, dropX / scale, dropY / scale);
			}

			const newContent = currentContent.slice(0, insertAt) + imageMarkdown + currentContent.slice(insertAt);

			onChange({
				...articleRef.current,
				content: newContent,
			});
		} catch (err) {
			console.error("Errore salvataggio immagine:", err);
		}
	};

	useEffect(() => {
		let unlisten: (() => void) | undefined;
		let cancelled = false;

		getCurrentWebview()
			.onDragDropEvent((event) => {
				const { payload } = event;

				if (payload.type === "over") {
					setIsDragging(isEditingRef.current && isPointInsideTextarea(payload.position.x, payload.position.y));
					return;
				}

				if (payload.type === "drop") {
					setIsDragging(false);
					if (isEditingRef.current && isPointInsideTextarea(payload.position.x, payload.position.y)) {
						const [firstPath] = payload.paths ?? [];
						if (firstPath) importImageFile(firstPath, payload.position.x, payload.position.y);
					}
					return;
				}

				setIsDragging(false);
			})
			.then((stop) => (cancelled ? stop() : (unlisten = stop)));

		return () => {
			cancelled = true;
			unlisten?.();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	if (!article.id && !isEditing) {
		return (
			<main
				style={{
					flex: 1,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					backgroundColor: colors.bgVoid,
					color: colors.textFaint,
					fontFamily: fonts.display,
					fontStyle: "italic",
					fontSize: "1.05rem",
				}}
			>
				<style>{fontImportTag}</style>
				Seleziona una voce dalla barra laterale, oppure crea una nuova voce per iniziare.
			</main>
		);
	}

	const categoryColor = getCategoryColor(article.category);

	const btnBase: React.CSSProperties = {
		padding: "0.55rem 1.3rem",
		borderRadius: radii.md,
		cursor: "pointer",
		fontFamily: fonts.body,
		fontWeight: 600,
		fontSize: "0.88rem",
		letterSpacing: "0.01em",
		transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease",
	};

	return (
		<main
			style={{
				flex: 1,
				padding: "2.25rem 2.5rem",
				display: "flex",
				flexDirection: "column",
				overflowY: "auto",
				backgroundColor: colors.bgVoid,
				color: colors.textPrimary,
				fontFamily: fonts.body,
				colorScheme: "dark",
			}}
		>
			<style>{fontImportTag}</style>

			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.1rem" }}>
				{isEditing ? (
					<div style={{ display: "flex", gap: "1rem", flex: 1, marginRight: "1rem" }}>
						<input
							type="text"
							value={article.title || ""}
							onChange={(e) => onChange({ ...article, title: e.target.value })}
							placeholder="Titolo della voce…"
							style={{
								fontFamily: fonts.display,
								fontSize: "1.7rem",
								fontWeight: 600,
								backgroundColor: "transparent",
								color: colors.textPrimary,
								border: "none",
								borderBottom: `1px solid ${colors.border}`,
								padding: "0.4rem 0.1rem",
								flex: 1,
								outline: "none",
							}}
							onFocus={(e) => (e.currentTarget.style.borderBottomColor = colors.gold)}
							onBlur={(e) => (e.currentTarget.style.borderBottomColor = colors.border)}
						/>
						<select
							value={article.category || "Lore"}
							onChange={(e) => onChange({ ...article, category: e.target.value })}
							style={{
								backgroundColor: colors.bgPanelRaised,
								color: colors.textPrimary,
								border: `1px solid ${colors.border}`,
								padding: "0.5rem 0.75rem",
								borderRadius: radii.sm,
								fontFamily: fonts.body,
								fontSize: "0.88rem",
								alignSelf: "center",
								colorScheme: "dark",
							}}
						>
							{Object.entries(categories).map(([key, { label }]) => (
								<option key={key} value={key}>
									{label}
								</option>
							))}
						</select>
					</div>
				) : (
					<div>
						<h1 style={{ fontFamily: fonts.display, fontSize: "2.1rem", fontWeight: 600, margin: 0, color: colors.textPrimary }}>
							{article.title}
						</h1>
						<span
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
								fontSize: "0.72rem",
								fontWeight: 600,
								letterSpacing: "0.08em",
								textTransform: "uppercase",
								color: categoryColor,
								backgroundColor: `${categoryColor}1f`,
								border: `1px solid ${categoryColor}59`,
								padding: "3px 10px",
								borderRadius: radii.pill,
								marginTop: "0.6rem",
							}}
						>
							<span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: categoryColor }} />
							{getCategoryLabel(article.category)}
						</span>
					</div>
				)}

				<div style={{ display: "flex", gap: "0.6rem", flexShrink: 0 }}>
					{isEditing ? (
						<>
							<button
								onClick={onSave}
								style={{ ...btnBase, backgroundColor: colors.gold, color: colors.bgVoid, border: "none" }}
								onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.goldBright)}
								onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.gold)}
							>
								Salva
							</button>

							{article.id && (
								<button
									onClick={onDelete}
									title="Elimina definitivamente questa voce"
									style={{ ...btnBase, backgroundColor: "transparent", color: colors.crimson, border: `1px solid ${colors.crimson}77` }}
									onMouseEnter={(e) => {
										e.currentTarget.style.backgroundColor = colors.crimsonWash;
										e.currentTarget.style.borderColor = colors.crimson;
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.backgroundColor = "transparent";
										e.currentTarget.style.borderColor = `${colors.crimson}77`;
									}}
								>
									Elimina
								</button>
							)}
						</>
					) : (
						<button
							onClick={onEdit}
							style={{ ...btnBase, backgroundColor: "transparent", color: colors.gold, border: `1px solid ${colors.gold}77` }}
							onMouseEnter={(e) => {
								e.currentTarget.style.backgroundColor = colors.goldWash;
								e.currentTarget.style.borderColor = colors.gold;
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.backgroundColor = "transparent";
								e.currentTarget.style.borderColor = `${colors.gold}77`;
							}}
						>
							Modifica
						</button>
					)}
				</div>
			</div>

			<TagInput tags={article.tags || []} isEditing={isEditing} onAddTag={handleAddTag} onRemoveTag={handleRemoveTag} />

			{isEditing ? (
				<div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>
					<textarea
						ref={textareaRef}
						value={article.content || ""}
						onChange={(e) => onChange({ ...article, content: e.target.value })}
						placeholder="Scrivi qui in Markdown. Trascina un'immagine su questa area per allegarla."
						style={{
							flex: 1,
							minHeight: "400px",
							backgroundColor: isDragging ? colors.bgPanelRaised : colors.bgManuscript,
							color: colors.textPrimary,
							border: isDragging ? `2px dashed ${colors.gold}` : `1px solid ${colors.borderSubtle}`,
							borderRadius: radii.lg,
							padding: "1.1rem",
							fontSize: "0.95rem",
							lineHeight: "1.7",
							fontFamily: fonts.mono,
							resize: "vertical",
							outline: "none",
							transition: "all 0.2s ease",
						}}
					/>
					{isDragging && (
						<div
							style={{
								position: "absolute",
								bottom: "1rem",
								right: "1rem",
								backgroundColor: colors.gold,
								color: colors.bgVoid,
								padding: "0.3rem 0.85rem",
								borderRadius: radii.sm,
								fontFamily: fonts.body,
								fontWeight: 600,
								fontSize: "0.8rem",
								pointerEvents: "none",
							}}
						>
							Rilascia l'immagine qui…
						</div>
					)}
				</div>
			) : (
				<div
					className="lore-content"
					style={{
						backgroundColor: colors.bgManuscript,
						padding: "1.75rem 2rem",
						borderRadius: radii.lg,
						border: `1px solid ${colors.borderSubtle}`,
						borderLeft: `3px solid ${colors.borderSubtle}`,
						lineHeight: "1.75",
						fontSize: "1.02rem",
						color: colors.textPrimary,
					}}
				>
					<style>{`
						.lore-content h1, .lore-content h2, .lore-content h3 { font-family: ${fonts.display}; color: ${colors.textPrimary}; font-weight: 600; letter-spacing: 0.01em; }
						.lore-content h1 { font-size: 1.75rem; margin: 0 0 0.75rem; border-bottom: 1px solid ${colors.borderSubtle}; padding-bottom: 0.45rem; }
						.lore-content h2 { font-size: 1.35rem; margin: 1.6rem 0 0.6rem; color: ${colors.gold}; }
						.lore-content h3 { font-size: 1.1rem; margin: 1.3rem 0 0.5rem; }
						.lore-content p { margin: 0 0 1rem; }
						.lore-content a { color: ${colors.gold}; text-decoration: underline; text-decoration-color: ${colors.gold}66; text-underline-offset: 2px; }
						.lore-content blockquote { margin: 1.1rem 0; padding: 0.2rem 0 0.2rem 1.1rem; border-left: 3px solid ${colors.gold}; color: ${colors.textSecondary}; font-style: italic; }
						.lore-content code { font-family: ${fonts.mono}; background: ${colors.bgPanelRaised}; padding: 0.1em 0.4em; border-radius: 4px; font-size: 0.9em; }
						.lore-content pre { background: ${colors.bgPanelRaised}; padding: 1rem; border-radius: ${radii.md}; overflow-x: auto; border: 1px solid ${colors.borderSubtle}; }
						.lore-content pre code { background: none; padding: 0; }
						.lore-content hr { border: none; border-top: 1px dashed ${colors.border}; margin: 2rem 0; }
						.lore-content table { border-collapse: collapse; width: 100%; margin: 1.1rem 0; }
						.lore-content th, .lore-content td { border: 1px solid ${colors.borderSubtle}; padding: 0.5rem 0.75rem; text-align: left; }
						.lore-content th { background: ${colors.bgPanelRaised}; font-family: ${fonts.display}; }
						.lore-content ul, .lore-content ol { padding-left: 1.4rem; margin: 0 0 1rem; }
						.lore-content li { margin-bottom: 0.3rem; }
					`}</style>
					<ReactMarkdown
						remarkPlugins={[remarkGfm]}
						urlTransform={(url) =>
							url.startsWith("asset:") || url.startsWith("https://asset.localhost") ? url : /^javascript:/i.test(url) ? "" : url
						}
						components={{
							img: ({ src, alt, ...props }) =>
								!src ? (
									<span style={{ color: colors.crimsonBright, fontStyle: "italic" }}>[Immagine non disponibile: {alt || "sconosciuta"}]</span>
								) : (
									<img
										{...props}
										src={src}
										alt={alt || "Immagine lore"}
										style={{ maxWidth: "100%", maxHeight: "500px", borderRadius: radii.lg, margin: "1rem 0", border: `1px solid ${colors.borderSubtle}`, display: "block" }}
									/>
								),
							a: ({ href, children }) => {
								if (href?.startsWith("#wikilink-")) {
									const targetTitle = decodeURIComponent(href.replace("#wikilink-", ""));
									const go = () => onNavigateToTitle?.(targetTitle);
									return (
										<span
											role="button"
											tabIndex={0}
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												go();
											}}
											onKeyDown={(e) => {
												if (e.key === "Enter" || e.key === " ") {
													e.preventDefault();
													go();
												}
											}}
											style={{
												color: colors.gold,
												textDecoration: "underline",
												textDecorationColor: `${colors.gold}aa`,
												textUnderlineOffset: "3px",
												fontWeight: 600,
												cursor: "pointer",
											}}
										>
											{children}
										</span>
									);
								}
								return (
									<a href={href} target="_blank" rel="noreferrer">
										{children}
									</a>
								);
							},
						}}
					>
						{wikiLinkToMarkdown(article.content || "")}
					</ReactMarkdown>
				</div>
			)}
		</main>
	);
};