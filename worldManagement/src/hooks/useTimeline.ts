import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
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
    try {
      const res = await invoke<TimelineEventListItem[]>("get_all_timeline_events");
      setEvents(res);
    } catch (err) {
      console.error("Errore durante il caricamento della timeline:", err);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const res = await invoke<TimelineCategory[]>("get_timeline_categories");
      setCategories(res);
    } catch (err) {
      console.error("Errore durante il caricamento delle categorie:", err);
    }
  }, []);

  const loadSavedViews = useCallback(async () => {
    try {
      const res = await invoke<TimelineSavedView[]>("get_timeline_views");
      setSavedViews(res);
    } catch (err) {
      console.error("Errore durante il caricamento delle viste salvate:", err);
    }
  }, []);

  useEffect(() => {
    loadEvents();
    loadCategories();
    loadSavedViews();
  }, [loadEvents, loadCategories, loadSavedViews]);

  const toggleCategoryFilter = (categoryId: string) => {
    setActiveCategoryIds((prev) => {
      const next = new Set(prev ?? []);
      if (prev?.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next.size === 0 ? null : next;
    });
  };

  const clearCategoryFilters = () => setActiveCategoryIds(null);

  const handleSelectEvent = async (id: string) => {
    try {
      const res = await invoke<TimelineEvent>("get_timeline_event_by_id", { id });
      setCurrentEvent(res);
      setIsEditing(false);
      setIsModalOpen(true);
    } catch (err) {
      console.error("Errore durante il recupero dell'evento:", err);
    }
  };

  const handleNewEvent = (timeValue: number) => {
    setCurrentEvent({ ...emptyEvent(), time_value: Math.round(timeValue) });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!currentEvent.title.trim()) return;
    try {
      const savedId = await invoke<string>("save_timeline_event", { event: currentEvent });
      setCurrentEvent((prev) => ({ ...prev, id: savedId }));
      setIsEditing(false);
      setIsModalOpen(false);
      loadEvents();
    } catch (err) {
      console.error("Errore durante il salvataggio dell'evento:", err);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!id) return;
    const confirmDelete = window.confirm("Sei sicuro di voler eliminare questo evento dalla timeline?");
    if (!confirmDelete) return;
    try {
      await invoke("delete_timeline_event", { id });
      setCurrentEvent(emptyEvent());
      setIsEditing(false);
      setIsModalOpen(false);
      loadEvents();
    } catch (err) {
      console.error("Errore durante l'eliminazione dell'evento:", err);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
  };

  // --- Categorie ---
  const saveCategory = async (category: TimelineCategory) => {
    try {
      await invoke<string>("save_timeline_category", { category });
      loadCategories();
      loadEvents(); // i marker già disegnati potrebbero cambiare colore/icona
    } catch (err) {
      console.error("Errore durante il salvataggio della categoria:", err);
    }
  };

  const deleteCategory = async (id: string) => {
    const confirmDelete = window.confirm("Eliminare questa categoria? Gli eventi collegati resteranno, senza categoria.");
    if (!confirmDelete) return;
    try {
      await invoke("delete_timeline_category", { id });
      loadCategories();
      loadEvents();
    } catch (err) {
      console.error("Errore durante l'eliminazione della categoria:", err);
    }
  };

  // --- Viste salvate ---
  const saveCurrentView = async (name: string, centerValue: number, pixelsPerDay: number) => {
    try {
      await invoke<string>("save_timeline_view", {
        view: { id: "", name, center_value: Math.round(centerValue), pixels_per_day: pixelsPerDay },
      });
      loadSavedViews();
    } catch (err) {
      console.error("Errore durante il salvataggio della vista:", err);
    }
  };

  const deleteSavedView = async (id: string) => {
    try {
      await invoke("delete_timeline_view", { id });
      loadSavedViews();
    } catch (err) {
      console.error("Errore durante l'eliminazione della vista:", err);
    }
  };

  //Eras

  const loadCampaignSettings = useCallback(async () => {
    try {
      const res = await invoke<CampaignSettings>("get_campaign_settings");
      setCampaignSettings(res);
    } catch (err) {
      console.error("Errore caricamento impostazioni campagna:", err);
    }
  }, []);

  const loadEras = useCallback(async () => {
    try {
      const res = await invoke<TimelineEra[]>("get_timeline_eras");
      setEras(res);
    } catch (err) {
      console.error("Errore caricamento ere:", err);
    }
  }, []);

  useEffect(() => {
    loadCampaignSettings();
    loadEras();
  }, [loadCampaignSettings, loadEras]);

  // Sostituisce il precedente `visibleEvents`: ora combina filtro categoria + ricerca testuale
  const visibleEvents = events
    .filter((e) => !activeCategoryIds || (e.category_id && activeCategoryIds.has(e.category_id)))
    .filter((e) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      return e.title.toLowerCase().includes(q);
    });

  const setCampaignToday = async (timeValue: number | null) => {
    try {
      await invoke("save_campaign_settings", { currentDateValue: timeValue });
      setCampaignSettings({ current_date_value: timeValue });
    } catch (err) {
      console.error("Errore salvataggio data odierna campagna:", err);
    }
  };

  const saveEra = async (era: TimelineEra) => {
    try {
      await invoke<string>("save_timeline_era", { era });
      loadEras();
    } catch (err) {
      console.error("Errore salvataggio era:", err);
    }
  };

  const deleteEra = async (id: string) => {
    const confirmDelete = window.confirm("Eliminare questa fascia/era?");
    if (!confirmDelete) return;
    try {
      await invoke("delete_timeline_era", { id });
      loadEras();
    } catch (err) {
      console.error("Errore eliminazione era:", err);
    }
  };

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