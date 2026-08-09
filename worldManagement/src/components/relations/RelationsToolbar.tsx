import React, { useState } from "react";
import { colors, fonts, radii } from "../theme/theme";
import { useLocalization } from "../../context/LocalizationContext";
import { GraphView, GraphViewType } from "../../types/relations";

interface RelationsToolbarProps {
	views: GraphView[];
	currentViewId: string | null;
	onSelectView: (id: string | null) => void;
	onCreateView: (title: string, type: GraphViewType) => void;
	searchQuery: string;
	onSearch: (q: string) => void;
	onAddNode: () => void;
	isConnecting: boolean;
	onToggleConnecting: () => void;
	focusMode: boolean;
	onToggleFocusMode: () => void;
}

export const RelationsToolbar: React.FC<RelationsToolbarProps> = ({
	views,
	currentViewId,
	onSelectView,
	onCreateView,
	searchQuery,
	onSearch,
	onAddNode,
	isConnecting,
	onToggleConnecting,
	focusMode,
	onToggleFocusMode,
}) => {
	const { t } = useLocalization();
	const [isCreating, setIsCreating] = useState(false);
	const [newTitle, setNewTitle] = useState("");
	const [newType, setNewType] = useState<GraphViewType>("genealogy");

	const submitNewView = () => {
		if (!newTitle.trim()) return;
		onCreateView(newTitle.trim(), newType);
		setNewTitle("");
		setIsCreating(false);
	};

	const btnStyle = (active?: boolean): React.CSSProperties => ({
		padding: "0.45rem 0.8rem",
		borderRadius: radii.pill,
		fontSize: "0.78rem",
		fontWeight: 600,
		cursor: "pointer",
		border: `1px solid ${active ? colors.gold : colors.border}`,
		backgroundColor: active ? colors.goldWash : "transparent",
		color: active ? colors.goldBright : colors.textSecondary,
		whiteSpace: "nowrap",
	});

	return (
		<header
			style={{
				display: "flex",
				alignItems: "center",
				gap: "0.75rem",
				padding: "0.85rem 1.2rem",
				borderBottom: `1px solid ${colors.borderSubtle}`,
				backgroundColor: colors.bgPanel,
				flexWrap: "wrap",
			}}
		>
			<h2 style={{ fontFamily: fonts.display, margin: 0, fontSize: "1.15rem", color: colors.textPrimary, marginRight: "0.5rem" }}>
				🌳 {t("relations.header.title")}
			</h2>

			<select
				value={currentViewId ?? ""}
				onChange={(e) => onSelectView(e.target.value || null)}
				style={{
					backgroundColor: colors.bgPanelRaised,
					color: colors.textPrimary,
					border: `1px solid ${colors.border}`,
					borderRadius: radii.sm,
					padding: "0.4rem 0.6rem",
					fontSize: "0.82rem",
				}}
			>
				<option value="">{t("relations.views.selectView")}</option>
				{views.map((v) => (
					<option key={v.id} value={v.id}>
						{v.title} · {t(`relations.views.${v.type}`)}
					</option>
				))}
			</select>

			{isCreating ? (
				<div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
					<input
						autoFocus
						value={newTitle}
						onChange={(e) => setNewTitle(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && submitNewView()}
						placeholder={t("relations.views.selectView")}
						style={{
							backgroundColor: colors.bgPanelRaised,
							color: colors.textPrimary,
							border: `1px solid ${colors.gold}77`,
							borderRadius: radii.sm,
							padding: "0.4rem 0.6rem",
							fontSize: "0.82rem",
							width: "150px",
						}}
					/>
					<select
						value={newType}
						onChange={(e) => setNewType(e.target.value as GraphViewType)}
						style={{ backgroundColor: colors.bgPanelRaised, color: colors.textPrimary, border: `1px solid ${colors.border}`, borderRadius: radii.sm, padding: "0.4rem 0.5rem", fontSize: "0.8rem" }}
					>
						<option value="genealogy">{t("relations.views.genealogy")}</option>
						<option value="network">{t("relations.views.network")}</option>
					</select>
					<button onClick={submitNewView} style={btnStyle(true)}>✓</button>
					<button onClick={() => setIsCreating(false)} style={btnStyle(false)}>✕</button>
				</div>
			) : (
				<button onClick={() => setIsCreating(true)} style={btnStyle(false)}>
					{t("relations.header.newView")}
				</button>
			)}

			<div style={{ position: "relative", marginLeft: "0.4rem" }}>
				<input
					value={searchQuery}
					onChange={(e) => onSearch(e.target.value)}
					placeholder={t("relations.header.searchPlaceholder")}
					style={{
						backgroundColor: colors.bgPanelRaised,
						color: colors.textPrimary,
						border: `1px solid ${colors.border}`,
						borderRadius: radii.sm,
						padding: "0.4rem 0.6rem",
						fontSize: "0.82rem",
						width: "190px",
					}}
				/>
			</div>

			<div style={{ display: "flex", gap: "0.5rem", marginLeft: "auto" }}>
				<button onClick={onAddNode} style={btnStyle(false)}>{t("relations.header.addNode")}</button>
				<button onClick={onToggleConnecting} style={btnStyle(isConnecting)}>{t("relations.header.addEdge")}</button>
				<button
					onClick={onToggleFocusMode}
					style={btnStyle(focusMode)}
					title="Mostra solo il nodo selezionato e i suoi collegati entro N passi, nascondendo il resto del grafo. Seleziona prima un nodo, poi attiva la modalità."
				>
					{t("relations.header.focusMode")}
				</button>
			</div>
		</header>
	);
};
