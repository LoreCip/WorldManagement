import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { CharacterSheet, GameSystem, SaveCharacterSheetPayload, SaveGameSystemPayload } from "../types/character";

const ACTIVE_SYSTEM_STORAGE_KEY = "worldbuilder_active_game_system_id";

export function useCharacters() {
	const [systems, setSystems] = useState<GameSystem[]>([]);
	const [sheets, setSheets] = useState<CharacterSheet[]>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedSheet, setSelectedSheet] = useState<CharacterSheet | null>(null);
	const [isSystemModalOpen, setIsSystemModalOpen] = useState(false);
	const [isNewSheetModalOpen, setIsNewSheetModalOpen] = useState(false);

	// Sistema di gioco attivo a livello di mondo/UI (non più scelto per ogni scheda)
	const [activeSystemId, setActiveSystemIdState] = useState<string | null>(() => {
		try {
			return localStorage.getItem(ACTIVE_SYSTEM_STORAGE_KEY);
		} catch {
			return null;
		}
	});

	const setActiveSystemId = (id: string | null) => {
		setActiveSystemIdState(id);
		try {
			if (id) {
				localStorage.setItem(ACTIVE_SYSTEM_STORAGE_KEY, id);
			} else {
				localStorage.removeItem(ACTIVE_SYSTEM_STORAGE_KEY);
			}
		} catch {
			// localStorage non disponibile: la scelta vale solo per la sessione corrente
		}
	};

	const loadInitialData = async () => {
		try {
			const [fetchedSystems, fetchedSheets] = await Promise.all([
				invoke<GameSystem[]>("get_game_systems"),
				invoke<CharacterSheet[]>("get_character_sheets"),
			]);
			setSystems(fetchedSystems);
			setSheets(fetchedSheets);
			return fetchedSystems;
		} catch (err) {
			console.error("Errore caricamento dati:", err);
			return [];
		}
	};

	useEffect(() => {
		loadInitialData().then((fetchedSystems) => {
			// Se il sistema salvato non esiste più (es. eliminato), o non ce n'è uno
			// selezionato ma esiste un solo sistema disponibile, adegua la selezione.
			setActiveSystemIdState((current) => {
				const stillValid = current && fetchedSystems.some((s) => s.id === current);
				if (stillValid) return current;
				if (fetchedSystems.length === 1) {
					try {
						localStorage.setItem(ACTIVE_SYSTEM_STORAGE_KEY, fetchedSystems[0].id);
					} catch {
						/* ignore */
					}
					return fetchedSystems[0].id;
				}
				return null;
			});
		});
	}, []);

	const handleSelectSheet = (id: string) => {
		const sheet = sheets.find((s) => s.id === id) || null;
		setSelectedSheet(sheet);
	};

	// Apre il modal di richiesta nome; la creazione vera avviene in createNewSheet
	const handleNewSheet = () => {
		if (systems.length === 0) {
			alert("Nessun sistema di gioco trovato! Creane prima uno dal pulsante 'Nuovo Sistema'.");
			return;
		}
		if (!activeSystemId) {
			alert("Seleziona prima un motore di gioco attivo dalla barra laterale.");
			return;
		}
		setIsNewSheetModalOpen(true);
	};

	// Chiamata dal modal con il nome inserito dall'utente
	const createNewSheet = async (name: string) => {
		const trimmed = name.trim();
		if (!trimmed || !activeSystemId) return;

		try {
			const payload: SaveCharacterSheetPayload = {
				id: null,
				name: trimmed,
				system_id: activeSystemId,
				article_id: null,
				data_json: "{}",
				sheet_variant: "pg",
			};
			const savedId = await invoke<string>("save_character_sheet", { payload });

			await loadInitialData();
			handleSelectSheet(savedId);
			setIsNewSheetModalOpen(false);
		} catch (err) {
			console.error("Errore creazione scheda:", err);
			alert(`Errore nella creazione della scheda: ${err}`);
		}
	};

	const handleDeleteSheet = async (id: string) => {
		if (!id || !window.confirm("Sei sicuro di voler eliminare questa scheda?")) return;
		try {
			await invoke("delete_character_sheet", { id });
			setSelectedSheet(null);
			loadInitialData();
		} catch (err) {
			console.error("Errore eliminazione scheda:", err);
		}
	};

	const handleSaveSystem = async (payload: SaveGameSystemPayload): Promise<boolean> => {
		try {
			const savedId = await invoke<string>("save_game_system", { payload });
			await loadInitialData();
			setActiveSystemId(savedId);
			return true;
		} catch (err) {
			console.error("Errore salvataggio sistema:", err);
			alert(`Errore: ${err}`);
			return false;
		}
	};

	const handleDeleteSystem = async (systemId: string) => {
		const sys = systems.find((s) => s.id === systemId);
		if (!sys) return;

		if (sys.is_builtin) {
			alert("I sistemi di gioco predefiniti non possono essere eliminati.");
			return;
		}

		if (!window.confirm(`Sei sicuro di voler eliminare il sistema "${sys.name}"?`)) {
			return;
		}

		try {
			await invoke("delete_game_system", { id: systemId });
			if (activeSystemId === systemId) {
				setActiveSystemId(null);
			}
			await loadInitialData();
			alert("Sistema di gioco eliminato con successo.");
		} catch (err) {
			console.error("Errore eliminazione sistema:", err);
			alert(`Impossibile eliminare: ${err}`);
		}
	};
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
	};
}