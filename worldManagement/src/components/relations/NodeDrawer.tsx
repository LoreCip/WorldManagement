import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { colors, fonts, radii } from "../theme/theme";
import { useLocalization } from "../../context/LocalizationContext";
import { GraphNodeData, GraphView } from "../../types/relations";

interface GameSystemOption {
	id: string;
	name: string;
}

interface ArticleOption {
	id: string;
	title: string;
}

interface CharacterSheetOption {
	id: string;
	name: string;
}

interface NodeDrawerProps {
	node: GraphNodeData;
	views: GraphView[];
	currentViewId: string | null;
	onClose: () => void;
	onSave: (node: GraphNodeData) => void;
	onDelete: (id: string) => void;
	onRemoveFromView: (id: string) => void;
	onPromote: (nodeId: string, systemId: string) => Promise<string>;
	onOpenWiki?: (articleId: string) => void;
	onOpenCharacterSheet?: (sheetId: string) => void;
	onNavigateToView?: (viewId: string) => void;
}

const fieldLabelStyle: React.CSSProperties = {
	fontSize: "0.66rem",
	letterSpacing: "0.08em",
	textTransform: "uppercase",
	color: colors.textFaint,
	marginBottom: "0.3rem",
	display: "block",
};

const inputStyle: React.CSSProperties = {
	width: "100%",
	backgroundColor: colors.bgPanelRaised,
	color: colors.textPrimary,
	border: `1px solid ${colors.border}`,
	borderRadius: radii.sm,
	padding: "0.5rem 0.6rem",
	fontFamily: fonts.body,
	fontSize: "0.88rem",
	outline: "none",
	boxSizing: "border-box",
};

export const NodeDrawer: React.FC<NodeDrawerProps> = ({
	node,
	views,
	currentViewId,
	onClose,
	onSave,
	onDelete,
	onRemoveFromView,
	onPromote,
	onOpenWiki,
	onOpenCharacterSheet,
	onNavigateToView,
}) => {
	const { t } = useLocalization();
	const [draft, setDraft] = useState<GraphNodeData>(node);
	const [systems, setSystems] = useState<GameSystemOption[]>([]);
	const [selectedSystemId, setSelectedSystemId] = useState<string>("");
	const [isPromoting, setIsPromoting] = useState(false);

	// Elenchi per i collegamenti manuali (wiki / scheda personaggio esistente).
	const [articles, setArticles] = useState<ArticleOption[]>([]);
	const [sheets, setSheets] = useState<CharacterSheetOption[]>([]);
	const [articleQuery, setArticleQuery] = useState("");
	const [sheetQuery, setSheetQuery] = useState("");

	useEffect(() => setDraft(node), [node]);

	useEffect(() => {
		if (node.type !== "placeholder" && node.type !== "unknown") return;
		invoke<GameSystemOption[]>("get_all_game_systems")
			.then((res) => {
				setSystems(res);
				if (res.length > 0) setSelectedSystemId(res[0].id);
			})
			.catch((err) => console.error("Errore caricamento sistemi di gioco:", err));
	}, [node.type]);

	// Elenco articoli wiki, per poter collegare una voce esistente al nodo.
	useEffect(() => {
		invoke<Array<{ id: string; title: string }>>("get_all_articles")
			.then((res) => setArticles(res.map((a) => ({ id: a.id, title: a.title }))))
			.catch((err) => console.error("Errore caricamento articoli wiki:", err));
	}, []);

	// Elenco schede personaggio esistenti, per collegarne una senza crearne una nuova.
	useEffect(() => {
		invoke<Array<{ id: string; name: string }>>("get_character_sheets")
			.then((res) => setSheets(res.map((s) => ({ id: s.id, name: s.name }))))
			.catch((err) => console.error("Errore caricamento schede personaggio:", err));
	}, []);

	const filteredArticles = articles.filter((a) => a.title.toLowerCase().includes(articleQuery.toLowerCase())).slice(0, 8);
	const filteredSheets = sheets.filter((s) => s.name.toLowerCase().includes(sheetQuery.toLowerCase())).slice(0, 8);
	const linkedArticleTitle = articles.find((a) => a.id === draft.wikiArticleId)?.title;
	const linkedSheetName = sheets.find((s) => s.id === draft.characterId)?.name;
	const otherViews = views.filter((v) => v.id !== currentViewId);
	const linkedViewTitle = views.find((v) => v.id === draft.linkedViewId)?.title;

	const handlePromote = async () => {
		if (!selectedSystemId) return;
		setIsPromoting(true);
		try {
			const sheetId = await onPromote(node.id, selectedSystemId);
			onOpenCharacterSheet?.(sheetId);
		} finally {
			setIsPromoting(false);
		}
	};

	return (
		<aside
			style={{
				width: "320px",
				flexShrink: 0,
				height: "100%",
				minHeight: 0,
				borderLeft: `1px solid ${colors.borderSubtle}`,
				backgroundColor: colors.bgPanel,
				color: colors.textPrimary,
				padding: "1.3rem 1.1rem",
				display: "flex",
				flexDirection: "column",
				gap: "0.9rem",
				overflowY: "auto",
				boxSizing: "border-box",
			}}
		>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
				<h3 style={{ fontFamily: fonts.display, margin: 0, fontSize: "1.15rem" }}>{t("relations.actions.editNode")}</h3>
				<button
					onClick={onClose}
					style={{ background: "none", border: "none", color: colors.textFaint, cursor: "pointer", fontSize: "1.1rem" }}
					aria-label="Chiudi"
				>
					✕
				</button>
			</div>

			<div>
				<label style={fieldLabelStyle}>{t("relations.nodeDrawer.nameLabel")}</label>
				<input
					style={inputStyle}
					value={draft.displayName}
					onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
				/>
			</div>

			{draft.type !== "unknown" && (
				<div>
					<label style={fieldLabelStyle}>{t("relations.nodeDrawer.subtitleLabel")}</label>
					<input
						style={inputStyle}
						value={draft.subtitle ?? ""}
						placeholder={t("relations.nodeDrawer.subtitlePlaceholder")}
						onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
					/>
				</div>
			)}

			<div style={{ display: "flex", gap: "0.6rem" }}>
				<div style={{ flex: 1 }}>
					<label style={fieldLabelStyle}>{t("relations.nodeDrawer.birthLabel")}</label>
					<input
						style={inputStyle}
						type="number"
						value={draft.birthYear ?? ""}
						onChange={(e) => setDraft({ ...draft, birthYear: e.target.value ? Number(e.target.value) : undefined })}
					/>
				</div>
				<div style={{ flex: 1 }}>
					<label style={fieldLabelStyle}>{t("relations.nodeDrawer.deathLabel")}</label>
					<input
						style={inputStyle}
						type="number"
						value={draft.deathYear ?? ""}
						onChange={(e) => setDraft({ ...draft, deathYear: e.target.value ? Number(e.target.value) : undefined })}
					/>
				</div>
			</div>

			<div>
				<label style={fieldLabelStyle}>{t("relations.nodeDrawer.notesLabel")}</label>
				<textarea
					style={{ ...inputStyle, minHeight: "80px", resize: "vertical", fontFamily: fonts.body }}
					value={draft.notes ?? ""}
					onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
				/>
			</div>

			{/* Collegamento a voce Wiki */}
			<div style={{ borderTop: `1px solid ${colors.borderSubtle}`, paddingTop: "0.8rem" }}>
				<label style={fieldLabelStyle}>{t("relations.actions.linkWiki")}</label>
				{draft.wikiArticleId ? (
					<div style={{ display: "flex", gap: "0.4rem" }}>
						<button onClick={() => onOpenWiki?.(draft.wikiArticleId!)} style={{ ...linkButtonStyle, flex: 1 }}>
							📜 {linkedArticleTitle ?? draft.wikiArticleId} →
						</button>
						<button
							onClick={() => setDraft({ ...draft, wikiArticleId: undefined })}
							title={t("relations.nodeDrawer.unlink")}
							style={{ ...ghostButtonStyle, padding: "0.5rem 0.6rem" }}
						>
							✕
						</button>
					</div>
				) : (
					<div style={{ position: "relative" }}>
						<input
							style={inputStyle}
							placeholder={t("relations.nodeDrawer.wikiSearchPlaceholder")}
							value={articleQuery}
							onChange={(e) => setArticleQuery(e.target.value)}
						/>
						{articleQuery.trim().length > 0 && (
							<div
								style={{
									backgroundColor: colors.bgPanelRaised,
									border: `1px solid ${colors.border}`,
									borderRadius: radii.sm,
									marginTop: "0.3rem",
									maxHeight: "160px",
									overflowY: "auto",
								}}
							>
								{filteredArticles.length === 0 ? (
									<div style={{ padding: "0.5rem 0.6rem", fontSize: "0.78rem", color: colors.textFaint }}>
										{t("relations.nodeDrawer.noResults")}
									</div>
								) : (
									filteredArticles.map((a) => (
										<div
											key={a.id}
											onClick={() => {
												setDraft({ ...draft, wikiArticleId: a.id });
												setArticleQuery("");
											}}
											style={{
												padding: "0.5rem 0.6rem",
												fontSize: "0.82rem",
												cursor: "pointer",
												borderBottom: `1px solid ${colors.borderSubtle}`,
											}}
											onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.bgPanel)}
											onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
										>
											{a.title}
										</div>
									))
								)}
							</div>
						)}
					</div>
				)}
			</div>

			{/* Collegamento a scheda personaggio esistente (alternativa alla promozione) */}
			<div>
				<label style={fieldLabelStyle}>{t("relations.nodeDrawer.sheetLabel")}</label>
				{draft.characterId ? (
					<div style={{ display: "flex", gap: "0.4rem" }}>
						<button onClick={() => onOpenCharacterSheet?.(draft.characterId!)} style={{ ...linkButtonStyle, flex: 1 }}>
							🎭 {linkedSheetName ?? draft.characterId} →
						</button>
						<button
							onClick={() => setDraft({ ...draft, characterId: undefined })}
							title={t("relations.nodeDrawer.unlink")}
							style={{ ...ghostButtonStyle, padding: "0.5rem 0.6rem" }}
						>
							✕
						</button>
					</div>
				) : (
					<div style={{ position: "relative" }}>
						<input
							style={inputStyle}
							placeholder={t("relations.nodeDrawer.sheetSearchPlaceholder")}
							value={sheetQuery}
							onChange={(e) => setSheetQuery(e.target.value)}
						/>
						{sheetQuery.trim().length > 0 && (
							<div
								style={{
									backgroundColor: colors.bgPanelRaised,
									border: `1px solid ${colors.border}`,
									borderRadius: radii.sm,
									marginTop: "0.3rem",
									maxHeight: "160px",
									overflowY: "auto",
								}}
							>
								{filteredSheets.length === 0 ? (
									<div style={{ padding: "0.5rem 0.6rem", fontSize: "0.78rem", color: colors.textFaint }}>
										{t("relations.nodeDrawer.noResults")}
									</div>
								) : (
									filteredSheets.map((s) => (
										<div
											key={s.id}
											onClick={() => {
												setDraft({ ...draft, characterId: s.id, type: "character" });
												setSheetQuery("");
											}}
											style={{
												padding: "0.5rem 0.6rem",
												fontSize: "0.82rem",
												cursor: "pointer",
												borderBottom: `1px solid ${colors.borderSubtle}`,
											}}
											onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.bgPanel)}
											onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
										>
											{s.name}
										</div>
									))
								)}
							</div>
						)}
					</div>
				)}
			</div>

			{/* Vista collegata: trasforma il nodo in un "portale" verso un'altra vista */}
			<div>
				<label style={fieldLabelStyle}>{t("relations.nodeDrawer.linkedViewLabel")}</label>
				{draft.linkedViewId ? (
					<div style={{ display: "flex", gap: "0.4rem" }}>
						<button
							onClick={() => onNavigateToView?.(draft.linkedViewId!)}
							style={{ ...linkButtonStyle, flex: 1, color: colors.indigo, borderColor: `${colors.indigo}55` }}
						>
							🔗 {linkedViewTitle ?? draft.linkedViewId} →
						</button>
						<button
							onClick={() => setDraft({ ...draft, linkedViewId: undefined })}
							title={t("relations.nodeDrawer.unlink")}
							style={{ ...ghostButtonStyle, padding: "0.5rem 0.6rem" }}
						>
							✕
						</button>
					</div>
				) : otherViews.length > 0 ? (
					<select
						value=""
						onChange={(e) => e.target.value && setDraft({ ...draft, linkedViewId: e.target.value })}
						style={inputStyle}
					>
						<option value="">{t("relations.nodeDrawer.linkedViewNone")}</option>
						{otherViews.map((v) => (
							<option key={v.id} value={v.id}>
								{v.title}
							</option>
						))}
					</select>
				) : (
					<div style={{ fontSize: "0.76rem", color: colors.textFaint }}>{t("relations.nodeDrawer.linkedViewEmpty")}</div>
				)}
				<div style={{ fontSize: "0.7rem", color: colors.textFaint, marginTop: "0.3rem" }}>
					{t("relations.nodeDrawer.linkedViewHint")}
				</div>
			</div>

			<button
				onClick={() => onSave(draft)}
				style={{
					padding: "0.55rem 1rem",
					backgroundColor: colors.gold,
					color: colors.bgVoid,
					border: "none",
					borderRadius: radii.md,
					fontWeight: 600,
					cursor: "pointer",
				}}
			>
				{t("common.save")}
			</button>

			{/* Promozione a scheda personaggio */}
			{(draft.type === "placeholder" || draft.type === "unknown") && (
				<div
					style={{
						marginTop: "0.4rem",
						padding: "0.8rem",
						borderRadius: radii.md,
						border: `1px dashed ${colors.gold}55`,
						backgroundColor: colors.goldWash,
					}}
				>
					<div style={{ fontSize: "0.8rem", color: colors.textSecondary, marginBottom: "0.5rem" }}>
						{t("relations.actions.promoteToCharacter")}
					</div>
					{systems.length > 0 ? (
						<>
							<select
								value={selectedSystemId}
								onChange={(e) => setSelectedSystemId(e.target.value)}
								style={{ ...inputStyle, marginBottom: "0.5rem" }}
							>
								{systems.map((s) => (
									<option key={s.id} value={s.id}>
										{s.name}
									</option>
								))}
							</select>
							<button
								onClick={handlePromote}
								disabled={isPromoting}
								style={{
									width: "100%",
									padding: "0.5rem",
									backgroundColor: "transparent",
									color: colors.gold,
									border: `1px solid ${colors.gold}77`,
									borderRadius: radii.sm,
									cursor: isPromoting ? "wait" : "pointer",
									fontWeight: 600,
								}}
							>
								{isPromoting ? "…" : t("relations.actions.promoteToCharacter")}
							</button>
						</>
					) : (
						<div style={{ fontSize: "0.75rem", color: colors.textFaint }}>{t("relations.nodeDrawer.promoteEmpty")}</div>
					)}
				</div>
			)}

			<div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "0.5rem", paddingTop: "0.8rem", borderTop: `1px solid ${colors.borderSubtle}` }}>
				<button onClick={() => onRemoveFromView(node.id)} style={{ ...ghostButtonStyle, color: colors.textSecondary }}>
					{t("relations.nodeDrawer.removeFromView")}
				</button>
				<button onClick={() => onDelete(node.id)} style={{ ...ghostButtonStyle, color: colors.crimson, borderColor: `${colors.crimson}77` }}>
					{t("relations.actions.deleteNode")}
				</button>
			</div>
		</aside>
	);
};

const linkButtonStyle: React.CSSProperties = {
	textAlign: "left",
	backgroundColor: "transparent",
	color: colors.gold,
	border: `1px solid ${colors.gold}55`,
	borderRadius: radii.sm,
	padding: "0.5rem 0.7rem",
	cursor: "pointer",
	fontSize: "0.82rem",
};

const ghostButtonStyle: React.CSSProperties = {
	backgroundColor: "transparent",
	border: `1px solid ${colors.border}`,
	borderRadius: radii.sm,
	padding: "0.5rem 0.7rem",
	cursor: "pointer",
	fontSize: "0.82rem",
};
