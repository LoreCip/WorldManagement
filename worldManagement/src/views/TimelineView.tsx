import React, { useRef, useState, useCallback } from "react";
import { useTimeline } from "../hooks/useTimeline";
import { TimelineCanvas, TimelineCanvasHandle, Viewport, SelectedAnchor } from "../components/timeline/TimelineCanvas";
import { TimelineMinimap } from "../components/timeline/TimelineMinimap";
import { TimelineHeader } from "../components/timeline/TimelineHeader";
import { TimelineEventBalloon } from "../components/timeline/TimelineEventBalloon";
import { TimelineCategoryManager } from "../components/timeline/TimelineCategoryManager";
import { TimelineEraManager } from "../components/timeline/TimelineEraManager";
import { TimelineSavedView } from "../types/timeline";

interface TimelineViewProps {
	onNavigateToArticle?: (articleId: string) => void;
	onNavigateToMap?: (mapId: string) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
	onNavigateToArticle,
	onNavigateToMap,
}) => {
	const canvasRef = useRef<TimelineCanvasHandle>(null);
	const [viewport, setViewport] = useState<Viewport | null>(null);
	const [anchor, setAnchor] = useState<SelectedAnchor | null>(null);
	const [showCategoryManager, setShowCategoryManager] = useState(false);
	const [showEraManager, setShowEraManager] = useState(false);

	const {
		visibleEvents,
		categories,
		activeCategoryIds,
		toggleCategoryFilter,
		clearCategoryFilters,
		searchQuery,
		setSearchQuery,
		savedViews,
		campaignSettings,
		setCampaignToday,
		eras,
		saveEra,
		deleteEra,
		currentEvent,
		isEditing,
		isModalOpen,
		setIsEditing,
		setCurrentEvent,
		handleSelectEvent,
		handleNewEvent,
		handleSave,
		handleDeleteEvent,
		closeModal,
		saveCategory,
		deleteCategory,
		saveCurrentView,
		deleteSavedView,
	} = useTimeline();

	const handleApplySavedView = useCallback((view: TimelineSavedView) => {
		canvasRef.current?.applyView(view.center_value, view.pixels_per_day);
	}, []);

	const handleSaveCurrentView = useCallback(
		(name: string) => {
			const vp = canvasRef.current?.getViewport();
			if (vp) saveCurrentView(name, vp.centerValue, vp.pixelsPerDay);
		},
		[saveCurrentView]
	);

	return (
		<div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
			<TimelineHeader
				onFitAll={() => canvasRef.current?.fitAll()}
				onZoomIn={() => canvasRef.current?.zoomIn()}
				onZoomOut={() => canvasRef.current?.zoomOut()}
				onNewEvent={() => handleNewEvent(viewport?.centerValue ?? 0)}
				categories={categories}
				activeCategoryIds={activeCategoryIds}
				onToggleCategory={toggleCategoryFilter}
				onClearCategoryFilters={clearCategoryFilters}
				onOpenCategoryManager={() => setShowCategoryManager(true)}
				savedViews={savedViews}
				onApplySavedView={handleApplySavedView}
				onDeleteSavedView={deleteSavedView}
				onSaveCurrentView={handleSaveCurrentView}
				searchQuery={searchQuery}
				onSearchChange={setSearchQuery}
				onOpenEraManager={() => setShowEraManager(true)}
				todayValue={campaignSettings.current_date_value}
				onSetToday={setCampaignToday}
			/>

			{/* position:relative — il balloon si ancora dentro questo contenitore */}
			<div style={{ flex: 1, minHeight: 0, position: "relative" }}>
				<TimelineCanvas
					ref={canvasRef}
					events={visibleEvents}
					eras={eras}
					todayValue={campaignSettings.current_date_value}
					selectedId={isModalOpen ? currentEvent.id || null : null}
					onSelectEvent={handleSelectEvent}
					onCreateEvent={handleNewEvent}
					onViewportChange={setViewport}
					onSelectedAnchorChange={setAnchor}
				/>

				{isModalOpen && anchor && (
					<TimelineEventBalloon
						event={currentEvent}
						anchor={anchor}
						isEditing={isEditing}
						categories={categories}
						onChange={setCurrentEvent}
						onSave={handleSave}
						onEdit={() => setIsEditing(true)}
						onDelete={() => handleDeleteEvent(currentEvent.id)}
						onClose={closeModal}
						onNavigateToArticle={onNavigateToArticle}
						onNavigateToMap={onNavigateToMap}
					/>
				)}
			</div>

			<TimelineMinimap
				events={visibleEvents}
				viewport={viewport}
				onJumpTo={(v) => canvasRef.current?.jumpTo(v)}
				onPanBy={(delta) => canvasRef.current?.panBy(delta)}
				onShowAll={() => canvasRef.current?.fitAll()}
			/>

			{showCategoryManager && (
				<TimelineCategoryManager
					categories={categories}
					onSave={saveCategory}
					onDelete={deleteCategory}
					onClose={() => setShowCategoryManager(false)}
				/>
			)}

			{showEraManager && (
				<TimelineEraManager
					eras={eras}
					onSave={saveEra}
					onDelete={deleteEra}
					onClose={() => setShowEraManager(false)}
				/>
			)}
		</div>
	);
};