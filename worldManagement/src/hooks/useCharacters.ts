import { useCallback, useEffect, useState } from "react";
import { invokeSafe } from "../lib/ipc";
import {
  CharacterSheet,
  GameSystem,
  SaveCharacterSheetPayload,
  SaveGameSystemPayload,
} from "../types/character";

const ACTIVE_SYSTEM_STORAGE_KEY = "worldbuilder_active_game_system_id";

function readStoredActiveSystemId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_SYSTEM_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredActiveSystemId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTIVE_SYSTEM_STORAGE_KEY, id);
    else localStorage.removeItem(ACTIVE_SYSTEM_STORAGE_KEY);
  } catch {
    // localStorage non disponibile: la scelta vale solo per la sessione corrente
  }
}

export function useCharacters() {
  const [systems, setSystems] = useState<GameSystem[]>([]);
  const [sheets, setSheets] = useState<CharacterSheet[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSheet, setSelectedSheet] = useState<CharacterSheet | null>(null);
  const [isSystemModalOpen, setIsSystemModalOpen] = useState(false);
  const [isNewSheetModalOpen, setIsNewSheetModalOpen] = useState(false);

  // Sistema di gioco attivo a livello di mondo/UI (non piu scelto per ogni scheda)
  const [activeSystemId, setActiveSystemIdState] = useState<string | null>(
    readStoredActiveSystemId,
  );

  const setActiveSystemId = useCallback((id: string | null) => {
    setActiveSystemIdState(id);
    writeStoredActiveSystemId(id);
  }, []);

  // Carica sistemi e schede in parallelo. Ogni chiamata fallisce in modo
  // indipendente grazie a invokeSafe: prima, con invoke() grezze dentro
  // Promise.all, un solo errore scartava entrambi i risultati (anche
  // quello riuscito).
  const loadInitialData = useCallback(async () => {
    const [fetchedSystems, fetchedSheets] = await Promise.all([
      invokeSafe<GameSystem[]>("get_game_systems"),
      invokeSafe<CharacterSheet[]>("get_character_sheets"),
    ]);
    setSystems(fetchedSystems ?? []);
    setSheets(fetchedSheets ?? []);
    return fetchedSystems ?? [];
  }, []);

  useEffect(() => {
    loadInitialData().then((fetchedSystems) => {
      // Se il sistema salvato non esiste piu (es. eliminato), o non ce
      // n'e uno selezionato ma esiste un solo sistema disponibile, adegua
      // la selezione.
      setActiveSystemIdState((current) => {
        const stillValid = current && fetchedSystems.some((s) => s.id === current);
        if (stillValid) return current;
        if (fetchedSystems.length === 1) {
          writeStoredActiveSystemId(fetchedSystems[0].id);
          return fetchedSystems[0].id;
        }
        return null;
      });
    });
  }, [loadInitialData]);

  const handleSelectSheet = useCallback(
    (id: string) => {
      setSelectedSheet(sheets.find((s) => s.id === id) || null);
    },
    [sheets],
  );

  // Apre il modal di richiesta nome; la creazione vera avviene in createNewSheet
  const handleNewSheet = useCallback(() => {
    if (systems.length === 0) {
      alert("Nessun sistema di gioco trovato! Creane prima uno dal pulsante 'Nuovo Sistema'.");
      return;
    }
    if (!activeSystemId) {
      alert("Seleziona prima un motore di gioco attivo dalla barra laterale.");
      return;
    }
    setIsNewSheetModalOpen(true);
  }, [systems.length, activeSystemId]);

  // Chiamata dal modal con il nome inserito dall'utente
  const createNewSheet = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed || !activeSystemId) return;

      const payload: SaveCharacterSheetPayload = {
        id: null,
        name: trimmed,
        system_id: activeSystemId,
        article_id: null,
        data_json: "{}",
        sheet_variant: "pg",
      };

      const savedId = await invokeSafe<string>("save_character_sheet", { payload });
      if (savedId === null) {
        alert("Errore nella creazione della scheda.");
        return;
      }

      await loadInitialData();
      setSelectedSheet({ ...payload, id: savedId, article_id: payload.article_id ?? null });
      setIsNewSheetModalOpen(false);
    },
    [activeSystemId, loadInitialData],
  );

  const handleDeleteSheet = useCallback(
    async (id: string) => {
      if (!id || !window.confirm("Sei sicuro di voler eliminare questa scheda?")) return;

      const result = await invokeSafe<void>("delete_character_sheet", { id });
      if (result === null) return;

      setSelectedSheet(null);
      await loadInitialData();
    },
    [loadInitialData],
  );

  const handleSaveSystem = useCallback(
    async (payload: SaveGameSystemPayload): Promise<boolean> => {
      const savedId = await invokeSafe<string>("save_game_system", { payload });
      if (savedId === null) {
        alert("Errore nel salvataggio del sistema di gioco.");
        return false;
      }
      await loadInitialData();
      setActiveSystemId(savedId);
      return true;
    },
    [loadInitialData, setActiveSystemId],
  );

  // Unico punto di mutazione della scheda attiva (dati form, variante,
  // link wiki...). Prima CharacterView costruiva 3 volte lo stesso
  // SaveCharacterSheetPayload completo (in handleSavePdf, handleSetVariant,
  // handleLinkArticle) cambiando un solo campo alla volta, ciascuna con la
  // propria gestione IPC/errori e senza aggiornare la lista `sheets` (solo
  // `selectedSheet`, lasciando la sidebar disallineata fino al prossimo
  // reload). Qui basta passare i campi che cambiano.
  const updateSheet = useCallback(
    async (partial: Partial<CharacterSheet> & { id: string }): Promise<boolean> => {
      const current =
        sheets.find((s) => s.id === partial.id) ??
        (selectedSheet?.id === partial.id ? selectedSheet : null);
      if (!current) return false;

      const merged: CharacterSheet = { ...current, ...partial };
      const payload: SaveCharacterSheetPayload = {
        id: merged.id,
        name: merged.name,
        system_id: merged.system_id,
        article_id: merged.article_id,
        data_json: merged.data_json,
        sheet_variant: merged.sheet_variant,
      };

      const savedId = await invokeSafe<string>("save_character_sheet", { payload });
      if (savedId === null) return false;

      setSelectedSheet((prev) => (prev && prev.id === merged.id ? merged : prev));
      setSheets((prev) => prev.map((s) => (s.id === merged.id ? merged : s)));
      return true;
    },
    [sheets, selectedSheet],
  );

  const handleDeleteSystem = useCallback(
    async (systemId: string) => {
      const sys = systems.find((s) => s.id === systemId);
      if (!sys) return;

      if (sys.is_builtin) {
        alert("I sistemi di gioco predefiniti non possono essere eliminati.");
        return;
      }
      if (!window.confirm(`Sei sicuro di voler eliminare il sistema "${sys.name}"?`)) return;

      const result = await invokeSafe<void>("delete_game_system", { id: systemId });
      if (result === null) {
        alert("Impossibile eliminare il sistema di gioco.");
        return;
      }

      if (activeSystemId === systemId) setActiveSystemId(null);
      await loadInitialData();
      alert("Sistema di gioco eliminato con successo.");
    },
    [systems, activeSystemId, loadInitialData, setActiveSystemId],
  );

  return {
    systems,
    sheets,
    searchQuery,
    setSearchQuery,
    selectedSheet,
    setSelectedSheet,
    isSystemModalOpen,
    setIsSystemModalOpen,
    isNewSheetModalOpen,
    setIsNewSheetModalOpen,
    activeSystemId,
    setActiveSystemId,
    handleSelectSheet,
    handleNewSheet,
    createNewSheet,
    handleDeleteSheet,
    handleSaveSystem,
    handleDeleteSystem,
    updateSheet,
  };
}
