import React, { useState } from "react";
import { colors, fonts, radii } from "../theme/theme";
import { useLocalization } from "../../context/LocalizationContext";
import { GraphNodeData, NodeType } from "../../types/relations";

interface QuickNodeModalProps {
	onClose: () => void;
	onCreate: (displayName: string, type: NodeType) => void;
	/** Nodi già esistenti nel grafo ma non ancora presenti nella vista corrente. */
	existingNodes: GraphNodeData[];
	onAddExisting: (nodeId: string) => void;
}

const TYPE_OPTIONS: NodeType[] = ["placeholder", "unknown", "entity"];

export const QuickNodeModal: React.FC<QuickNodeModalProps> = ({ onClose, onCreate, existingNodes, onAddExisting }) => {
	const { t } = useLocalization();
	const [mode, setMode] = useState<"new" | "existing">("new");
	const [name, setName] = useState("");
	const [type, setType] = useState<NodeType>("placeholder");
	const [query, setQuery] = useState("");

	const submit = () => {
		if (!name.trim()) return;
		onCreate(name.trim(), type);
	};

	const filteredExisting = existingNodes.filter((n) => n.displayName.toLowerCase().includes(query.toLowerCase()));

	return (
		<div
			onClick={onClose}
			style={{
				position: "fixed",
				inset: 0,
				backgroundColor: "rgba(10,11,16,0.55)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 50,
			}}
		>
			<div
				onClick={(e) => e.stopPropagation()}
				style={{
					width: "360px",
					backgroundColor: colors.bgPanel,
					border: `1px solid ${colors.borderSubtle}`,
					borderRadius: radii.lg,
					padding: "1.3rem",
					boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
				}}
			>
				<h3 style={{ fontFamily: fonts.display, margin: "0 0 0.9rem", fontSize: "1.1rem", color: colors.textPrimary }}>
					{t("relations.header.addNode")}
				</h3>

				<div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem" }}>
					<button
						onClick={() => setMode("new")}
						style={{
							flex: 1,
							padding: "0.4rem",
							borderRadius: radii.sm,
							border: `1px solid ${mode === "new" ? colors.gold : colors.border}`,
							backgroundColor: mode === "new" ? colors.goldWash : "transparent",
							color: mode === "new" ? colors.goldBright : colors.textSecondary,
							cursor: "pointer",
							fontSize: "0.78rem",
							fontWeight: 600,
						}}
					>
						Nuovo nodo
					</button>
					<button
						onClick={() => setMode("existing")}
						style={{
							flex: 1,
							padding: "0.4rem",
							borderRadius: radii.sm,
							border: `1px solid ${mode === "existing" ? colors.gold : colors.border}`,
							backgroundColor: mode === "existing" ? colors.goldWash : "transparent",
							color: mode === "existing" ? colors.goldBright : colors.textSecondary,
							cursor: "pointer",
							fontSize: "0.78rem",
							fontWeight: 600,
						}}
					>
						Nodo esistente
					</button>
				</div>

				{mode === "new" ? (
					<>
						<input
							autoFocus
							value={name}
							onChange={(e) => setName(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && submit()}
							placeholder="es. Messaggero Anonimo"
							style={{
								width: "100%",
								backgroundColor: colors.bgPanelRaised,
								color: colors.textPrimary,
								border: `1px solid ${colors.border}`,
								borderRadius: radii.sm,
								padding: "0.55rem 0.7rem",
								fontFamily: fonts.body,
								fontSize: "0.9rem",
								outline: "none",
								boxSizing: "border-box",
								marginBottom: "0.9rem",
							}}
						/>

						<div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.1rem" }}>
							{TYPE_OPTIONS.map((opt) => (
								<button
									key={opt}
									onClick={() => setType(opt)}
									style={{
										flex: 1,
										padding: "0.5rem 0.3rem",
										borderRadius: radii.sm,
										border: `1px solid ${type === opt ? colors.gold : colors.border}`,
										backgroundColor: type === opt ? colors.goldWash : "transparent",
										color: type === opt ? colors.goldBright : colors.textSecondary,
										cursor: "pointer",
										fontSize: "0.72rem",
										fontWeight: 600,
									}}
								>
									{t(`relations.nodeTypes.${opt}`)}
								</button>
							))}
						</div>

						<div style={{ display: "flex", gap: "0.5rem" }}>
							<button
								onClick={submit}
								style={{
									flex: 1,
									padding: "0.55rem",
									backgroundColor: colors.gold,
									color: colors.bgVoid,
									border: "none",
									borderRadius: radii.sm,
									fontWeight: 600,
									cursor: "pointer",
								}}
							>
								{t("common.save")}
							</button>
							<button
								onClick={onClose}
								style={{
									padding: "0.55rem 1rem",
									backgroundColor: "transparent",
									color: colors.textSecondary,
									border: `1px solid ${colors.border}`,
									borderRadius: radii.sm,
									cursor: "pointer",
								}}
							>
								✕
							</button>
						</div>
					</>
				) : (
					<>
						<input
							autoFocus
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Cerca un nodo già esistente…"
							style={{
								width: "100%",
								backgroundColor: colors.bgPanelRaised,
								color: colors.textPrimary,
								border: `1px solid ${colors.border}`,
								borderRadius: radii.sm,
								padding: "0.55rem 0.7rem",
								fontFamily: fonts.body,
								fontSize: "0.9rem",
								outline: "none",
								boxSizing: "border-box",
								marginBottom: "0.7rem",
							}}
						/>
						<div style={{ maxHeight: "220px", overflowY: "auto", marginBottom: "0.9rem" }}>
							{filteredExisting.length === 0 ? (
								<div style={{ fontSize: "0.8rem", color: colors.textFaint, textAlign: "center", padding: "1rem 0" }}>
									{existingNodes.length === 0
										? "Tutti i nodi del grafo sono già in questa vista."
										: "Nessun risultato."}
								</div>
							) : (
								filteredExisting.map((n) => (
									<div
										key={n.id}
										onClick={() => onAddExisting(n.id)}
										style={{
											padding: "0.55rem 0.7rem",
											borderRadius: radii.sm,
											cursor: "pointer",
											display: "flex",
											alignItems: "center",
											gap: "0.5rem",
											fontSize: "0.85rem",
											color: colors.textPrimary,
										}}
										onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.bgPanelRaised)}
										onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
									>
										<span style={{ opacity: 0.6, fontSize: "0.72rem" }}>{t(`relations.nodeTypes.${n.type}`)}</span>
										{n.displayName}
									</div>
								))
							)}
						</div>
						<button
							onClick={onClose}
							style={{
								width: "100%",
								padding: "0.5rem",
								backgroundColor: "transparent",
								color: colors.textSecondary,
								border: `1px solid ${colors.border}`,
								borderRadius: radii.sm,
								cursor: "pointer",
							}}
						>
							Chiudi
						</button>
					</>
				)}
			</div>
		</div>
	);
};

