import React, { useEffect, useState } from "react";
import { colors, fonts, radii } from "../theme/theme";
import { useLocalization } from "../../context/LocalizationContext";
import { GraphEdgeData, GraphNodeData, RelationType } from "../../types/relations";

interface EdgeDrawerProps {
	edge: Partial<GraphEdgeData> & { sourceNodeId: string; targetNodeId: string };
	nodesById: Record<string, GraphNodeData>;
	relationOptions: RelationType[];
	onClose: () => void;
	onSave: (edge: Omit<GraphEdgeData, "id"> & { id?: string }) => void;
	onDelete?: (id: string) => void;
	onRemoveFromView?: (id: string) => void;
	/** Arco già esistente tra questi due nodi (in qualunque direzione). Se presente
	 *  e stiamo creando un arco nuovo (edge.id assente), il salvataggio viene bloccato:
	 *  non sono ammessi collegamenti bidirezionali/duplicati tra la stessa coppia di nodi. */
	conflictingEdge?: GraphEdgeData;
	onEditConflicting?: (edgeId: string) => void;
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

export const EdgeDrawer: React.FC<EdgeDrawerProps> = ({
	edge,
	nodesById,
	relationOptions,
	onClose,
	onSave,
	onDelete,
	onRemoveFromView,
	conflictingEdge,
	onEditConflicting,
}) => {
	const { t } = useLocalization();
	const [type, setType] = useState<RelationType>(edge.type ?? relationOptions[0] ?? "custom");
	const [label, setLabel] = useState(edge.label ?? "");
	const [isUncertain, setIsUncertain] = useState(edge.isUncertain ?? false);
	const [gapCount, setGapCount] = useState<number | undefined>(edge.generationalGapCount);

	useEffect(() => {
		setType(edge.type ?? relationOptions[0] ?? "custom");
		setLabel(edge.label ?? "");
		setIsUncertain(edge.isUncertain ?? false);
		setGapCount(edge.generationalGapCount);
	}, [edge]);

	const sourceName = nodesById[edge.sourceNodeId]?.displayName ?? "?";
	const targetName = nodesById[edge.targetNodeId]?.displayName ?? "?";
	const isBlocked = !edge.id && !!conflictingEdge;

	const handleSave = () => {
		onSave({
			id: edge.id,
			sourceNodeId: edge.sourceNodeId,
			targetNodeId: edge.targetNodeId,
			sourceHandle: edge.sourceHandle,
			targetHandle: edge.targetHandle,
			type,
			label: label.trim() || undefined,
			isUncertain,
			generationalGapCount: type === "descendant_gap" ? gapCount : undefined,
		});
	};

	return (
		<div
			style={{
				position: "absolute",
				top: "1.2rem",
				right: "1.2rem",
				width: "300px",
				backgroundColor: colors.bgPanel,
				border: `1px solid ${colors.borderSubtle}`,
				borderRadius: radii.lg,
				boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
				padding: "1.1rem",
				display: "flex",
				flexDirection: "column",
				gap: "0.75rem",
				zIndex: 20,
			}}
		>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
				<h4 style={{ margin: 0, fontFamily: fonts.display, fontSize: "1.02rem" }}>{t("relations.header.addEdge")}</h4>
				<button onClick={onClose} style={{ background: "none", border: "none", color: colors.textFaint, cursor: "pointer" }}>
					✕
				</button>
			</div>

			<div style={{ fontSize: "0.78rem", color: colors.textSecondary }}>
				{sourceName} → {targetName}
			</div>

			{isBlocked && (
				<div
					style={{
						fontSize: "0.76rem",
						color: colors.crimsonBright,
						backgroundColor: colors.crimsonWash,
						border: `1px solid ${colors.crimson}55`,
						borderRadius: radii.sm,
						padding: "0.55rem 0.65rem",
						lineHeight: 1.4,
					}}
				>
					Esiste già un collegamento tra questi due nodi ({t(`relations.relationTypes.${conflictingEdge!.type}`)}).
					Non sono ammessi due archi diversi tra la stessa coppia: modifica quello esistente invece di crearne uno nuovo.
					{onEditConflicting && (
						<button
							onClick={() => onEditConflicting(conflictingEdge!.id)}
							style={{
								display: "block",
								marginTop: "0.5rem",
								background: "none",
								border: "none",
								color: colors.crimsonBright,
								textDecoration: "underline",
								cursor: "pointer",
								padding: 0,
								fontSize: "0.76rem",
							}}
						>
							Modifica il collegamento esistente →
						</button>
					)}
				</div>
			)}

			<div>
				<label style={fieldLabelStyle}>Tipo di relazione</label>
				<select value={type} onChange={(e) => setType(e.target.value as RelationType)} style={inputStyle}>
					{relationOptions.map((opt) => (
						<option key={opt} value={opt}>
							{t(`relations.relationTypes.${opt}`)}
						</option>
					))}
				</select>
			</div>

			{type === "descendant_gap" && (
				<div>
					<label style={fieldLabelStyle}>{t("relations.gap.label")}</label>
					<input
						type="number"
						min={1}
						style={inputStyle}
						value={gapCount ?? ""}
						onChange={(e) => setGapCount(e.target.value ? Number(e.target.value) : undefined)}
						placeholder="es. 4"
					/>
				</div>
			)}

			<div>
				<label style={fieldLabelStyle}>Etichetta (opzionale)</label>
				<input
					style={inputStyle}
					value={label}
					onChange={(e) => setLabel(e.target.value)}
					placeholder='es. "Figlio illegittimo"'
				/>
			</div>

			<label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", color: colors.textSecondary, cursor: "pointer" }}>
				<input type="checkbox" checked={isUncertain} onChange={(e) => setIsUncertain(e.target.checked)} />
				{t("relations.uncertain.label")}
			</label>

			<div style={{ display: "flex", gap: "0.5rem", marginTop: "0.3rem" }}>
				<button
					onClick={handleSave}
					disabled={isBlocked}
					style={{
						flex: 1,
						padding: "0.5rem",
						backgroundColor: isBlocked ? colors.border : colors.gold,
						color: isBlocked ? colors.textFaint : colors.bgVoid,
						border: "none",
						borderRadius: radii.sm,
						fontWeight: 600,
						cursor: isBlocked ? "not-allowed" : "pointer",
					}}
				>
					{t("common.save")}
				</button>
				{edge.id && onRemoveFromView && (
					<button
						onClick={() => onRemoveFromView(edge.id!)}
						title="Rimuove l'arco solo da questa vista, senza cancellarlo dal grafo"
						style={{
							padding: "0.5rem 0.7rem",
							backgroundColor: "transparent",
							color: colors.textSecondary,
							border: `1px solid ${colors.border}`,
							borderRadius: radii.sm,
							cursor: "pointer",
							fontSize: "0.78rem",
						}}
					>
						Rimuovi da vista
					</button>
				)}
				{edge.id && onDelete && (
					<button
						onClick={() => onDelete(edge.id!)}
						title="Elimina l'arco definitivamente dal grafo (da tutte le viste)"
						style={{
							padding: "0.5rem 0.8rem",
							backgroundColor: "transparent",
							color: colors.crimson,
							border: `1px solid ${colors.crimson}77`,
							borderRadius: radii.sm,
							cursor: "pointer",
						}}
					>
						{t("common.delete")}
					</button>
				)}
			</div>
		</div>
	);
};
