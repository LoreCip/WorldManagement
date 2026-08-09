import React from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { colors, fonts, radii } from "../theme/theme";
import { useLocalization } from "../../context/LocalizationContext";
import { GraphNodeData } from "../../types/relations";

export interface CharacterNodeFlowData extends Record<string, unknown> {
	node: GraphNodeData;
	factionColor?: string;
	onOpenDrawer: (nodeId: string) => void;
	/** Se il nodo ha un linkedViewId, permette di saltare direttamente
	 *  alla vista collegata cliccando il badge 🔗 (senza aprire il drawer). */
	onNavigateToView?: (viewId: string) => void;
}

const handleStyle: React.CSSProperties = {
	width: 8,
	height: 8,
	background: colors.gold,
	border: `1.5px solid ${colors.bgVoid}`,
};

/** Un handle per lato, ciascuno utilizzabile sia come punto di partenza che
 *  di arrivo di un collegamento (isConnectableStart/End): permette di agganciare
 *  un arco da/verso qualunque lato del nodo, non solo sopra/sotto. */
const FourWayHandles: React.FC = () => (
	<>
		<Handle type="source" id="top" position={Position.Top} style={handleStyle} isConnectableStart isConnectableEnd />
		<Handle type="source" id="right" position={Position.Right} style={handleStyle} isConnectableStart isConnectableEnd />
		<Handle type="source" id="bottom" position={Position.Bottom} style={handleStyle} isConnectableStart isConnectableEnd />
		<Handle type="source" id="left" position={Position.Left} style={handleStyle} isConnectableStart isConnectableEnd />
	</>
);

const PortalBadge: React.FC<{ node: GraphNodeData; onNavigateToView?: (viewId: string) => void }> = ({ node, onNavigateToView }) => {
	if (!node.linkedViewId) return null;
	return (
		<button
			onClick={(e) => {
				e.stopPropagation();
				onNavigateToView?.(node.linkedViewId!);
			}}
			title="Vai alla vista collegata"
			className="nodrag"
			style={{
				position: "absolute",
				top: -8,
				right: -8,
				width: 22,
				height: 22,
				borderRadius: "50%",
				border: `1.5px solid ${colors.indigo}`,
				backgroundColor: colors.bgPanel,
				color: colors.indigo,
				fontSize: "0.7rem",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				cursor: "pointer",
				zIndex: 5,
			}}
		>
			🔗
		</button>
	);
};

export const CharacterNode: React.FC<NodeProps> = ({ data, selected }) => {
	const { t } = useLocalization();
	const { node, factionColor, onOpenDrawer, onNavigateToView } = data as CharacterNodeFlowData;

	const accent = factionColor ?? (node.type === "character" ? colors.crimson : colors.gold);

	// --- Stato "Unknown": silhouette sbiadita con punto di domanda ---
	if (node.type === "unknown") {
		return (
			<div
				onClick={() => onOpenDrawer(node.id)}
				style={{
					position: "relative",
					width: 150,
					padding: "0.7rem 0.85rem",
					borderRadius: radii.lg,
					border: `1px dashed ${colors.textFaint}`,
					backgroundColor: `${colors.bgPanel}cc`,
					color: colors.textFaint,
					fontFamily: fonts.display,
					fontStyle: "italic",
					textAlign: "center",
					cursor: "pointer",
					opacity: selected ? 1 : 0.75,
					boxShadow: selected ? `0 0 0 2px ${colors.gold}55` : "none",
				}}
			>
				<PortalBadge node={node} onNavigateToView={onNavigateToView} />
				<FourWayHandles />
				<div style={{ fontSize: "1.4rem", marginBottom: "0.2rem" }}>❔</div>
				<div style={{ fontSize: "0.85rem" }}>{node.displayName || t("relations.nodeTypes.unknown")}</div>
			</div>
		);
	}

	// --- Stato "Placeholder": bordo tratteggiato, invito a promuovere ---
	if (node.type === "placeholder") {
		return (
			<div
				onClick={() => onOpenDrawer(node.id)}
				style={{
					position: "relative",
					width: 170,
					padding: "0.7rem 0.9rem",
					borderRadius: radii.lg,
					border: `1px dashed ${colors.textSecondary}`,
					backgroundColor: colors.bgPanel,
					color: colors.textPrimary,
					cursor: "pointer",
					boxShadow: selected ? `0 0 0 2px ${colors.gold}55` : "none",
				}}
			>
				<PortalBadge node={node} onNavigateToView={onNavigateToView} />
				<FourWayHandles />
				<div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
					<span style={{ fontSize: "0.9rem", opacity: 0.55 }}>✎</span>
					<span style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: "0.95rem" }}>
						{node.displayName}
					</span>
				</div>
				<div style={{ fontSize: "0.66rem", letterSpacing: "0.05em", textTransform: "uppercase", color: colors.textFaint, marginTop: "0.2rem" }}>
					{t("relations.nodeTypes.placeholder")}
				</div>
			</div>
		);
	}

	// --- Stato "Full": personaggio o entità con scheda ---
	return (
		<div
			onClick={() => onOpenDrawer(node.id)}
			style={{
				position: "relative",
				width: 190,
				borderRadius: radii.lg,
				border: `1.5px solid ${accent}`,
				backgroundColor: colors.bgPanelRaised,
				color: colors.textPrimary,
				cursor: "pointer",
				overflow: "visible",
				boxShadow: selected ? `0 0 0 2px ${accent}77` : "0 2px 6px rgba(0,0,0,0.25)",
			}}
		>
			<PortalBadge node={node} onNavigateToView={onNavigateToView} />
			<FourWayHandles />

			<div style={{ borderRadius: radii.lg, overflow: "hidden" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.65rem 0.8rem" }}>
					<div
						style={{
							width: 34,
							height: 34,
							borderRadius: "50%",
							flexShrink: 0,
							backgroundColor: colors.bgVoid,
							border: `1px solid ${accent}77`,
							backgroundImage: node.avatarUrl ? `url(${node.avatarUrl})` : undefined,
							backgroundSize: "cover",
							backgroundPosition: "center",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							fontFamily: fonts.display,
							fontSize: "1rem",
							color: accent,
						}}
					>
						{!node.avatarUrl && (node.displayName?.[0]?.toUpperCase() ?? "?")}
					</div>
					<div style={{ minWidth: 0 }}>
						<div
							style={{
								fontFamily: fonts.display,
								fontWeight: 600,
								fontSize: "0.98rem",
								whiteSpace: "nowrap",
								overflow: "hidden",
								textOverflow: "ellipsis",
							}}
						>
							{node.displayName}
						</div>
						{node.subtitle && (
							<div
								style={{
									fontSize: "0.7rem",
									color: colors.textSecondary,
									whiteSpace: "nowrap",
									overflow: "hidden",
									textOverflow: "ellipsis",
								}}
							>
								{node.subtitle}
							</div>
						)}
					</div>
				</div>

				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						padding: "0.3rem 0.8rem",
						backgroundColor: `${accent}1a`,
						fontSize: "0.62rem",
						letterSpacing: "0.05em",
						textTransform: "uppercase",
						color: accent,
						fontWeight: 600,
					}}
				>
					<span>{node.type === "entity" ? t("relations.nodeTypes.entity") : t("relations.nodeTypes.character")}</span>
					{node.characterId && <span title={t("relations.actions.linkWiki")}>🎭</span>}
				</div>
			</div>
		</div>
	);
};

