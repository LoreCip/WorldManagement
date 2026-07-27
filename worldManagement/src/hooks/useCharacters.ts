import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { CharacterSheet, GameSystem, SaveCharacterPayload, SaveGameSystemPayload, SystemSchema } from "../types/character";

const ACTIVE_SYSTEM_STORAGE_KEY = "worldbuilder_active_game_system_id";

export function useCharacters() {
	const [systems, setSystems] = useState<GameSystem[]>([]);
	const [sheets, setSheets] = useState<CharacterSheet[]>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedSheet, setSelectedSheet] = useState<CharacterSheet | null>(null);
	const [parsedData, setParsedData] = useState<Record<string, any>>({});
	const [renderedMarkdown, setRenderedMarkdown] = useState<string>("");
	const [isEditing, setIsEditing] = useState(false);
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

	useEffect(() => {
		if (selectedSheet) {
			try {
				setParsedData(JSON.parse(selectedSheet.data_json || "{}"));
			} catch {
				setParsedData({});
			}
			updateMarkdownPreview(selectedSheet);
		} else {
			setParsedData({});
			setRenderedMarkdown("");
		}
	}, [selectedSheet]);

	const updateMarkdownPreview = async (sheet: CharacterSheet) => {
		const system = systems.find((s) => s.id === sheet.system_id);
		if (!system) return;

		try {
			const combinedData = { name: sheet.name, ...JSON.parse(sheet.data_json || "{}") };
			const md = await invoke<string>("render_sheet_markdown", {
				dataJson: JSON.stringify(combinedData),
				template: system.markdown_template,
			});
			setRenderedMarkdown(md);
		} catch (err) {
			console.error("Errore rendering markdown:", err);
		}
	};

	const handleSelectSheet = (id: string) => {
		const sheet = sheets.find((s) => s.id === id) || null;
		setSelectedSheet(sheet);
		setIsEditing(false);
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
			const savedId = await invoke<string>("save_character_sheet", {
				payload: {
					id: null,
					name: trimmed,
					system_id: activeSystemId,
					article_id: null,
					data_json: "{}",
					sheet_variant: "pg",
				},
			});

			await loadInitialData();
			handleSelectSheet(savedId);
			setIsNewSheetModalOpen(false);
		} catch (err) {
			console.error("Errore creazione scheda:", err);
			alert(`Errore nella creazione della scheda: ${err}`);
		}
	};

	const handleSaveSheet = async () => {
		if (!selectedSheet || !selectedSheet.name.trim()) return;

		const payload = {
			id: selectedSheet.id || null,
			system_id: selectedSheet.system_id,
			article_id: selectedSheet.article_id,
			name: selectedSheet.name,
			data_json: JSON.stringify(parsedData),
			sheet_variant: selectedSheet.sheet_variant || "pg",
		};

		try {
			const savedId = await invoke<string>("save_character_sheet", { payload });
			await loadInitialData();
			handleSelectSheet(savedId);
			setIsEditing(false);
		} catch (err) {
			console.error("Errore salvataggio scheda:", err);
		}
	};

	const handleDeleteSheet = async (id: string) => {
		if (!id || !window.confirm("Sei sicuro di voler eliminare questa scheda?")) return;
		try {
			await invoke("delete_character_sheet", { id });
			setSelectedSheet(null);
			setIsEditing(false);
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
	const currentSystem = systems.find((s) => s.id === selectedSheet?.system_id);
	let currentFields: SystemSchema = { fields: [] };
	if (currentSystem) {
		try {
			currentFields = JSON.parse(currentSystem.schema_json);
		} catch {
			currentFields = { fields: [] };
		}
	}

	return {
		systems,
		sheets,
		searchQuery,
		setSearchQuery,
		selectedSheet,
		setSelectedSheet,
		parsedData,
		setParsedData,
		renderedMarkdown,
		isEditing,
		setIsEditing,
		isSystemModalOpen,
		setIsSystemModalOpen,
		isNewSheetModalOpen,
		setIsNewSheetModalOpen,
		activeSystemId,
		setActiveSystemId,
		currentFields,
		handleSelectSheet,
		handleNewSheet,
		createNewSheet,
		handleSaveSheet,
		handleDeleteSheet,
		handleSaveSystem,
		handleDeleteSystem,
	};
}