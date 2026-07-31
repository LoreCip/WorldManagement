import React, { useState, useEffect } from "react";
import { colors, fonts, radii } from "../theme/theme";
import { useLocalization } from "../../context/LocalizationContext";

interface NewSheetModalProps {
	isOpen: boolean;
	systemName?: string;
	onClose: () => void;
	onCreate: (name: string) => void;
}

export const NewSheetModal: React.FC<NewSheetModalProps> = ({ isOpen, systemName, onClose, onCreate }) => {
	const { t } = useLocalization();
	const [name, setName] = useState("");

	// Reset del campo ogni volta che il modal viene riaperto
	useEffect(() => {
		if (isOpen) setName("");
	}, [isOpen]);

	if (!isOpen) return null;

	const handleCreate = () => {
		if (!name.trim()) return;
		onCreate(name.trim());
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") handleCreate();
		if (e.key === "Escape") onClose();
	};

	return (
		<div
			style={{
				position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
				backgroundColor: "rgba(0, 0, 0, 0.75)", display: "flex",
				alignItems: "center", justifyContent: "center", zIndex: 1000
			}}
		>
			<div
				style={{
					backgroundColor: colors.bgPanel, padding: "2rem",
					borderRadius: radii.lg, border: `1px solid ${colors.border}`,
					width: "420px", color: colors.textPrimary, fontFamily: fonts.body
				}}
			>
				<h2 style={{ fontFamily: fonts.display, color: colors.gold, marginTop: 0 }}>
					{t("characters.sheetModal.newCharacter")}
				</h2>

				{systemName && (
					<div style={{ fontSize: "0.8rem", color: colors.textFaint, marginBottom: "1.2rem" }}>
						{t("characters.sheetModal.activeGame")} <span style={{ color: colors.gold }}>{systemName}</span>
					</div>
				)}

				<label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", color: colors.textSecondary }}>
					{t("characters.sheetModal.charName")}
				</label>
				<input
					type="text"
					autoFocus
					value={name}
					onChange={(e) => setName(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder={t("common.example") + "Elyndra Nightshade"}
					style={{
						width: "100%", padding: "0.6rem 0.7rem", backgroundColor: colors.bgVoid,
						color: "#fff", border: `1px solid ${colors.border}`, borderRadius: radii.sm,
						boxSizing: "border-box", fontSize: "0.95rem", outline: "none"
					}}
				/>

				<div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.5rem" }}>
					<button
						onClick={onClose}
						style={{ padding: "0.5rem 1rem", background: "transparent", color: colors.textPrimary, border: `1px solid ${colors.border}`, borderRadius: radii.sm, cursor: "pointer" }}
					>
						{t("common.cancel")}
					</button>
					<button
						onClick={handleCreate}
						disabled={!name.trim()}
						style={{
							padding: "0.5rem 1rem", backgroundColor: colors.gold, color: colors.bgVoid,
							border: "none", borderRadius: radii.sm, fontWeight: 600,
							cursor: name.trim() ? "pointer" : "not-allowed",
							opacity: name.trim() ? 1 : 0.5,
						}}
					>
						{t("characters.sheetModal.createSheet")}
					</button>
				</div>
			</div>
		</div>
	);
};