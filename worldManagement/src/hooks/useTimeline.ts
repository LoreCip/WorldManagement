import { useState, useEffect, useCallback, useMemo } from "react";
import { invokeSafe } from "../lib/ipc";
import {
  TimelineEvent,
  TimelineEventListItem,
  TimelineCategory,
  TimelineSavedView,
  CampaignSettings,
  TimelineEra
} from "../types/timeline";

const emptyEvent = (): TimelineEvent => ({
  id: "",
  title: "",
  description: "",
  time_value: 0,
  end_time_value: null,
  precision: "year",
  article_id: null,
  map_id: null,
  category_id: null,
});

export function useTimeline() {
  const [events, setEvents] = useState<TimelineEventListItem[]>([]);
  const [categories, setCategories] = useState<TimelineCategory[]>([]);
  const [savedViews, setSavedViews] = useState<TimelineSavedView[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [campaignSettings, setCampaignSettings] = useState<CampaignSettings>({ current_date_value: null });
  const [eras, setEras] = useState<TimelineEra[]>([]);
  const [activeCategoryIds, setActiveCategoryIds] = useState<Set<string> | null>(null); // null = tutte
  const [currentEvent, setCurrentEvent] = useState<TimelineEvent>(emptyEvent());
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadEvents = useCallback(async () => {
    const res = await invokeSafe<TimelineEventListItem[]>("get_all_timeline_events");
    setEvents(res ?? []);
  }, []);

  const loadCategories = useCallback(async () => {
    const res = await invokeSafe<TimelineCategory[]>("get_timeline_categories");
    setCategories(res ?? []);
  }, []);

  const loadSavedViews = useCallback(async () => {
    const res = await invokeSafe<TimelineSavedView[]>("get_timeline_views");
    setSavedViews(res ?? []);
  }, []);

  useEffect(() => {
    loadEvents();
    loadCategories();
    loadSavedViews();
  }, [loadEvents, loadCategories, loadSavedViews]);

  const toggleCategoryFilter = useCallback((categoryId: string) => {
    setActiveCategoryIds((prev) => {
      const next = new Set(prev ?? []);
      if (prev?.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next.size === 0 ? null : next;
    });
  }, []);

  const clearCategoryFilters = useCallback(() => setActiveCategoryIds(null), []);

  const handleSelectEvent = useCallback(async (id: string) => {
    const res = await invokeSafe<TimelineEvent>("get_timeline_event_by_id", { id });
    if (res === null) return;
    setCurrentEvent(res);
    setIsEditing(false);
    setIsModalOpen(true);
  }, []);

  const handleNewEvent = useCallback((timeValue: number) => {
    setCurrentEvent({ ...emptyEvent(), time_value: Math.round(timeValue) });
    setIsEditing(true);
    setIsModalOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!currentEvent.title.trim()) return;

    const savedId = await invokeSafe<string>("save_timeline_event", { event: currentEvent });
    if (savedId === null) return;

    setCurrentEvent((prev) => ({ ...prev, id: savedId }));
    setIsEditing(false);
    setIsModalOpen(false);
    await loadEvents();
  }, [currentEvent, loadEvents]);

  const handleDeleteEvent = useCallback(async (id: string) => {
    if (!id) return;
    if (!window.confirm("Sei sicuro di voler eliminare questo evento dalla timeline?")) return;

    const result = await invokeSafe<void>("delete_timeline_event", { id });
    if (result === null) return;

    setCurrentEvent(emptyEvent());
    setIsEditing(false);
    setIsModalOpen(false);
    await loadEvents();
  }, [loadEvents]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setIsEditing(false);
  }, []);

  // --- Categorie ---
  const saveCategory = useCallback(async (category: TimelineCategory) => {
    const result = await invokeSafe<string>("save_timeline_category", { category });
    if (result === null) return;
    await loadCategories();
    await loadEvents(); // i marker già disegnati potrebbero cambiare colore/icona
  }, [loadCategories, loadEvents]);

  const deleteCategory = useCallback(async (id: string) => {
    if (!window.confirm("Eliminare questa categoria? Gli eventi collegati resteranno, senza categoria.")) return;

    const result = await invokeSafe<void>("delete_timeline_category", { id });
    if (result === null) return;
    await loadCategories();
    await loadEvents();
  }, [loadCategories, loadEvents]);

  // --- Viste salvate ---
  const saveCurrentView = useCallback(async (name: string, centerValue: number, pixelsPerDay: number) => {
    const result = await invokeSafe<string>("save_timeline_view", {
      view: { id: "", name, center_value: Math.round(centerValue), pixels_per_day: pixelsPerDay },
    });
    if (result === null) return;
    await loadSavedViews();
  }, [loadSavedViews]);

  const deleteSavedView = useCallback(async (id: string) => {
    const result = await invokeSafe<void>("delete_timeline_view", { id });
    if (result === null) return;
    await loadSavedViews();
  }, [loadSavedViews]);

  // --- Ere / campagna ---
  const loadCampaignSettings = useCallback(async () => {
    const res = await invokeSafe<CampaignSettings>("get_campaign_settings");
    if (res) setCampaignSettings(res);
  }, []);

  const loadEras = useCallback(async () => {
    const res = await invokeSafe<TimelineEra[]>("get_timeline_eras");
    setEras(res ?? []);
  }, []);

  useEffect(() => {
    loadCampaignSettings();
    loadEras();
  }, [loadCampaignSettings, loadEras]);

  // Combina filtro categoria + ricerca testuale. Prima ricalcolato inline
  // ad ogni render senza memoizzazione.
  const visibleEvents = useMemo(() => {
    return events
      .filter((e) => !activeCategoryIds || (e.category_id && activeCategoryIds.has(e.category_id)))
      .filter((e) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.trim().toLowerCase();
        return e.title.toLowerCase().includes(q);
      });
  }, [events, activeCategoryIds, searchQuery]);

  const setCampaignToday = useCallback(async (timeValue: number | null) => {
    const result = await invokeSafe<void>("save_campaign_settings", { currentDateValue: timeValue });
    if (result === null) return;
    setCampaignSettings({ current_date_value: timeValue });
  }, []);

  const saveEra = useCallback(async (era: TimelineEra) => {
    const result = await invokeSafe<string>("save_timeline_era", { era });
    if (result === null) return;
    await loadEras();
  }, [loadEras]);

  const deleteEra = useCallback(async (id: string) => {
    if (!window.confirm("Eliminare questa fascia/era?")) return;

    const result = await invokeSafe<void>("delete_timeline_era", { id });
    if (result === null) return;
    await loadEras();
  }, [loadEras]);

  return {
    events,
    visibleEvents,
    categories,
    activeCategoryIds,
    toggleCategoryFilter,
    clearCategoryFilters,
    savedViews,
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
    searchQuery,
    setSearchQuery,
    campaignSettings,
    setCampaignToday,
    eras,
    saveEra,
    deleteEra,
  };
}