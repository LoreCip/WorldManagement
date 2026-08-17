import React, { useState } from "react";
import { TimelineCategory, TimelineSavedView } from "../../types/timeline";
import { timeInputToValue, valueToTimeInput } from "../../utils/timeConversion";
import { colors, fonts, radii } from "../theme/theme";
import { useLocalization } from "../../context/LocalizationContext";
import { ViewHeader } from "../common/ViewHeader";
import { Toolbar, ToolbarButton } from "../common/Toolbar";
import { Popover } from "../common/Popover";

interface TimelineHeaderProps {
	onFitAll: () => void;
	onZoomIn: () => void;
	onZoomOut: () => void;
	onNewEvent: () => void;
	categories: TimelineCategory[];
	activeCategoryIds: Set<string> | null;
	onToggleCategory: (id: string) => void;
	onClearCategoryFilters: () => void;
	onOpenCategoryManager: () => void;
	savedViews: TimelineSavedView[];
	onApplySavedView: (view: TimelineSavedView) => void;
	onDeleteSavedView: (id: string) => void;
	onSaveCurrentView: (name: string) => void;
	searchQuery: string;
	onSearchChange: (q: string) => void;
	onOpenEraManager: () => void;
	todayValue: number | null;
	onSetToday: (value: number | null) => void;
}

export const TimelineHeader: React.FC<TimelineHeaderProps> = ({
	onFitAll,
	onZoomIn,
	onZoomOut,
	onNewEvent,
	categories,
	activeCategoryIds,
	onToggleCategory,
	onClearCategoryFilters,
	onOpenCategoryManager,
	savedViews,
	onApplySavedView,
	onDeleteSavedView,
	onSaveCurrentView,
	searchQuery,
	onSearchChange,
	onOpenEraManager,
	todayValue,
	onSetToday,
}) => {
	const { t } = useLocalization();

	const [showFilters, setShowFilters] = useState(false);
	const [showViews, setShowViews] = useState(false);
	const [showTodayPicker, setShowTodayPicker] = useState(false);
	const [todayInput, setTodayInput] = useState<{ year: number; month: number; day: number }>({
		year: 0,
		month: 1,
		day: 1,
	});
	const [newViewName, setNewViewName] = useState("");

	const smallInput: React.CSSProperties = {
		padding: "0.3rem 0.4rem",
		fontSize: "0.78rem",
		backgroundColor: colors.bgManuscript,
		border: `1px solid ${colors.borderSubtle}`,
		borderRadius: radii.sm,
		color: colors.textPrimary,
		fontFamily: fonts.body,
	};

	const submitNewView = () => {
		if (!newViewName.trim()) return;
		onSaveCurrentView(newViewName.trim());
		setNewViewName("");
		setShowViews(false);
	};

	const openTodayPicker = () => {
		const base = todayValue != null ? valueToTimeInput(todayValue) : { year: 0, month: 1, day: 1 };
		setTodayInput({ year: base.year, month: base.month ?? 1, day: base.day ?? 1 });
		setShowTodayPicker((s) => !s);
		setShowFilters(false);
		setShowViews(false);
	};

	return (
		<ViewHeader
			title={t("timeline.header.title")}
			actions={
				<ToolbarButton onClick={onNewEvent} style={{ backgroundColor: colors.gold, color: colors.bgVoid, border: "none" }}>
					{t("timeline.header.newEvent")}
				</ToolbarButton>
			}
		>
			<Toolbar>
				<input
					type="text"
					placeholder={t("timeline.header.searchPlaceholder")}
					value={searchQuery}
					onChange={(e) => onSearchChange(e.target.value)}
					style={{
						padding: "0.4rem 0.7rem",
						backgroundColor: colors.bgManuscript,
						border: `1px solid ${colors.borderSubtle}`,
						borderRadius: radii.sm,
						color: colors.textPrimary,
						fontFamily: fonts.body,
						fontSize: "0.82rem",
						outline: "none",
						width: "180px",
					}}
				/>

				<ToolbarButton onClick={onZoomOut}>−</ToolbarButton>
				<ToolbarButton onClick={onZoomIn}>+</ToolbarButton>
				<ToolbarButton onClick={onFitAll}>{t("timeline.header.autoFit")}</ToolbarButton>

				<Popover
					isOpen={showFilters}
					onClose={() => setShowFilters(false)}
					trigger={
						<ToolbarButton
							active={!!activeCategoryIds}
							onClick={() => { setShowFilters((s) => !s); setShowViews(false); setShowTodayPicker(false); }}
						>
							{t("timeline.header.filters")}{activeCategoryIds ? ` (${activeCategoryIds.size})` : ""}
						</ToolbarButton>
					}
				>
					{categories.map((cat) => {
						const active = activeCategoryIds?.has(cat.id) ?? false;
						return (
							<label
								key={cat.id}
								style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", color: colors.textPrimary, cursor: "pointer" }}
							>
								<input type="checkbox" checked={active} onChange={() => onToggleCategory(cat.id)} />
								<span>{cat.icon}</span>
								<span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: cat.color }} />
								{cat.name}
							</label>
						);
					})}
					<div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.4rem" }}>
						<ToolbarButton onClick={onClearCategoryFilters}>{t("timeline.header.clearFilters")}</ToolbarButton>
						<ToolbarButton onClick={() => { onOpenCategoryManager(); setShowFilters(false); }}>
							{t("timeline.header.manage")}
						</ToolbarButton>
					</div>
				</Popover>

				<ToolbarButton onClick={onOpenEraManager}>{t("timeline.header.eras")}</ToolbarButton>

				<Popover
					isOpen={showTodayPicker}
					onClose={() => setShowTodayPicker(false)}
					trigger={
						<ToolbarButton active={todayValue != null} onClick={openTodayPicker}>
							{t("timeline.header.today")}
						</ToolbarButton>
					}
				>
					<div style={{ display: "flex", gap: "0.4rem" }}>
						<input
							type="number" value={todayInput.year} placeholder={t("timeline.balloon.year")}
							onChange={(e) => setTodayInput({ ...todayInput, year: parseInt(e.target.value || "0", 10) })}
							style={{ ...smallInput, width: "70px" }}
						/>
						<input
							type="number" value={todayInput.month} min={1} max={12} placeholder={t("timeline.balloon.month")}
							onChange={(e) => setTodayInput({ ...todayInput, month: parseInt(e.target.value || "1", 10) })}
							style={{ ...smallInput, width: "55px" }}
						/>
						<input
							type="number" value={todayInput.day} min={1} max={30} placeholder={t("timeline.balloon.day")}
							onChange={(e) => setTodayInput({ ...todayInput, day: parseInt(e.target.value || "1", 10) })}
							style={{ ...smallInput, width: "55px" }}
						/>
					</div>
					<div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem" }}>
						<ToolbarButton onClick={() => { onSetToday(null); setShowTodayPicker(false); }}>
							{t("common.delete")}
						</ToolbarButton>
						<ToolbarButton onClick={() => { onSetToday(timeInputToValue(todayInput)); setShowTodayPicker(false); }}>
							{t("common.save")}
						</ToolbarButton>
					</div>
				</Popover>

				<Popover
					isOpen={showViews}
					onClose={() => setShowViews(false)}
					trigger={
						<ToolbarButton onClick={() => { setShowViews((s) => !s); setShowFilters(false); setShowTodayPicker(false); }}>
							{t("timeline.header.savedViews")}
						</ToolbarButton>
					}
				>
					{savedViews.map((view) => (
						<div key={view.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
							<button
								onClick={() => { onApplySavedView(view); setShowViews(false); }}
								style={{
									flex: 1, textAlign: "left", background: "none", border: "none",
									color: colors.textPrimary, cursor: "pointer", fontSize: "0.82rem", fontFamily: fonts.body,
									padding: "0.2rem 0",
								}}
							>
								{view.name}
							</button>
							<button
								onClick={() => onDeleteSavedView(view.id)}
								style={{ background: "none", border: "none", color: colors.crimson, cursor: "pointer" }}
							>
								×
							</button>
						</div>
					))}
					{savedViews.length === 0 && (
						<div style={{ color: colors.textFaint, fontSize: "0.78rem", fontStyle: "italic" }}>
							{t("timeline.header.noSavedViews")}
						</div>
					)}

					<div style={{ display: "flex", gap: "0.3rem", marginTop: "0.4rem" }}>
						<input
							value={newViewName}
							onChange={(e) => setNewViewName(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && submitNewView()}
							placeholder={t("timeline.header.newViewNamePlaceholder")}
							style={{ ...smallInput, flex: 1 }}
						/>
						<ToolbarButton onClick={submitNewView}>{t("timeline.header.saveView")}</ToolbarButton>
					</div>
				</Popover>
			</Toolbar>
		</ViewHeader>
	);
};