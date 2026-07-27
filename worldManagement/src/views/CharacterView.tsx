import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { PDFDocument } from "pdf-lib";
import { Document, Page, pdfjs } from "react-pdf";
import { useCharacters } from "../hooks/useCharacters";
import { CharacterSidebar } from "../components/characters/CharacterSidebar";
import { SystemModal } from "../components/characters/SystemModal";
import { NewSheetModal } from "../components/characters/NewSheetModal";
import { colors, fonts, radii, fontImportTag } from "../components/theme/theme";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.js";

interface WikiArticle {
	id: string;
	title: string;
	category: string;
}

interface CharacterViewProps {
	onNavigateToWiki?: (articleId: string) => void;
}

export const CharacterView: React.FC<CharacterViewProps> = ({ onNavigateToWiki }) => {
	const {
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
	} = useCharacters();

	const [pdfArrayBuffer, setPdfArrayBuffer] = useState<ArrayBuffer | null>(null);
	const [numPages, setNumPages] = useState<number>(0);
	const [characterArticles, setCharacterArticles] = useState<WikiArticle[]>([]);

	const formDataRef = useRef<Record<string, any>>({});
	const pdfContainerRef = useRef<HTMLDivElement | null>(null);

	// 1. Carica articoli Wiki (categoria Personaggio)
	useEffect(() => {
		const fetchWikiArticles = async () => {
			try {
				const articles = await invoke<WikiArticle[]>("get_all_articles");
				const filtered = articles.filter((a) => {
					if (!a.category) return false;
					const cat = a.category.trim().toLowerCase();
					return cat === "personaggio" || cat === "personaggi";
				});
				setCharacterArticles(filtered);
			} catch (err) {
				console.error("Errore caricamento articoli wiki:", err);
			}
		};

		fetchWikiArticles();
	}, []);

	// 2. Sistema di gioco selezionato e nome del file PDF (in base alla variante PG/PNG attiva)
	const selectedSystem = useMemo(() => {
		if (!selectedSheet) return null;
		return systems.find((s) => s.id === selectedSheet.system_id) || null;
	}, [selectedSheet, systems]);

	const activeVariant = selectedSheet?.sheet_variant || "pg";

	// Elenco delle varianti disponibili per il sistema corrente (per mostrare/nascondere il toggle)
	const availableVariants = useMemo(() => {
		if (!selectedSystem) return ["pg"];
		try {
			const parsedSchema = JSON.parse(selectedSystem.schema_json);
			const variants: string[] = [];
			if (parsedSchema.pdf_template_pg || parsedSchema.pdf_template) variants.push("pg");
			if (parsedSchema.pdf_template_png) variants.push("png");
			return variants.length > 0 ? variants : ["pg"];
		} catch {
			return ["pg"];
		}
	}, [selectedSystem]);

	const pdfTemplateFilename = useMemo(() => {
		if (!selectedSystem) return "5E_CharacterSheet_Fillable.pdf";
		try {
			const parsedSchema = JSON.parse(selectedSystem.schema_json);
			if (activeVariant === "png" && parsedSchema.pdf_template_png) {
				return parsedSchema.pdf_template_png;
			}
			// Variante "pg", o fallback su "pg" se la scheda è impostata su "png"
			// ma il sistema (vecchio, pre-migrazione) non ha ancora quella distinzione.
			return parsedSchema.pdf_template_pg || parsedSchema.pdf_template || "5E_CharacterSheet_Fillable.pdf";
		} catch {
			return "5E_CharacterSheet_Fillable.pdf";
		}
	}, [selectedSystem, activeVariant]);

	// 3. Carica i byte del PDF tramite Rust (con fallback automatico al template se il salvato non esiste)
	useEffect(() => {
		const loadPdfBytes = async () => {
			if (!selectedSheet) {
				setPdfArrayBuffer(null);
				formDataRef.current = {};
				return;
			}

			try {
				let initialData = {};
				try {
					if (selectedSheet.data_json) {
						initialData = JSON.parse(selectedSheet.data_json);
					}
				} catch {
					initialData = {};
				}
				formDataRef.current = initialData;

				// Invocazione a Rust: cerca prima in savedSheets/<sheet_id>_<variant>.pdf
				// Se non lo trova, carica automaticamente sheetTemplates/<pdfTemplateFilename>
				const bytes = await invoke<number[]>("load_sheet_pdf_bytes", {
					sheetId: selectedSheet.id,
					variant: activeVariant,
					templateFilename: pdfTemplateFilename,
				});

				const buffer = new Uint8Array(bytes).buffer;
				setPdfArrayBuffer(buffer);
			} catch (err) {
				console.error("Errore caricamento PDF:", err);
				setPdfArrayBuffer(null);
			}
		};

		loadPdfBytes();
	}, [selectedSheet, activeVariant, pdfTemplateFilename]);

	// Popola gli input nell'AnnotationLayer una volta che la pagina PDF è renderizzata
	const populatePageAnnotations = useCallback(() => {
		if (!pdfContainerRef.current) return;
		const inputs = pdfContainerRef.current.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea, select");

		inputs.forEach((input) => {
			const name = input.name;
			if (!name) return;

			if (formDataRef.current.hasOwnProperty(name)) {
				const val = formDataRef.current[name];
				if (input.type === "checkbox") {
					(input as HTMLInputElement).checked = Boolean(val);
				} else {
					input.value = String(val ?? "");
				}
			}
		});
	}, []);

	// Gestione input senza causare re-render React continuativi
	const handleFormInputChange = (e: React.FormEvent<HTMLDivElement>) => {
		const target = e.target as HTMLInputElement | HTMLTextAreaElement;
		if (!target || !target.name) return;

		const fieldName = target.name;
		const value = target.type === "checkbox" ? (target as HTMLInputElement).checked : target.value;

		formDataRef.current[fieldName] = value;
	};

	// Salvataggio definitivo del PDF e dei dati nel DB
	const handleSavePdf = async () => {
		if (!selectedSheet) return;

		try {
			// IMPORTANTE: non riusare `pdfArrayBuffer` (stato del visualizzatore).
			// react-pdf/pdf.js trasferisce quel buffer al proprio worker per il parsing,
			// rendendolo "detached": pdf-lib non potrebbe più leggerlo.
			// Richiediamo quindi byte freschi e indipendenti al backend Rust.
			const freshBytes = await invoke<number[]>("load_sheet_pdf_bytes", {
				sheetId: selectedSheet.id,
				variant: activeVariant,
				templateFilename: pdfTemplateFilename,
			});
			const freshBuffer = new Uint8Array(freshBytes).buffer;

			const pdfDoc = await PDFDocument.load(freshBuffer);
			const form = pdfDoc.getForm();

			Object.entries(formDataRef.current).forEach(([fieldName, val]) => {
				try {
					if (typeof val === "boolean") {
						const cb = form.getCheckBox(fieldName);
						if (val) cb.check(); else cb.uncheck();
					} else {
						const tf = form.getTextField(fieldName);
						tf.setText(String(val ?? ""));
					}
				} catch (fieldErr) {
					console.warn(`Campo "${fieldName}" non trovato nel PDF:`, fieldErr);
				}
			});

			const updatedPdfBytes = await pdfDoc.save();

			await invoke("save_character_pdf", {
				sheetId: selectedSheet.id,
				variant: activeVariant,
				pdfBytes: Array.from(updatedPdfBytes),
			});

			const jsonStr = JSON.stringify(formDataRef.current);
			await invoke("save_character_sheet", {
				payload: {
					id: selectedSheet.id,
					name: selectedSheet.name,
					system_id: selectedSheet.system_id,
					article_id: selectedSheet.article_id,
					data_json: jsonStr,
					sheet_variant: activeVariant,
				},
			});

			setSelectedSheet({ ...selectedSheet, data_json: jsonStr });
			alert("Scheda salvata con successo!");
		} catch (err) {
			console.error("Errore durante il salvataggio:", err);
			alert(`Errore durante il salvataggio: ${err}`);
		}
	};

	// Cambio variante scheda (PG <-> PNG): ricarica il PDF corrispondente e persiste la scelta
	const handleSetVariant = async (variant: string) => {
		if (!selectedSheet || selectedSheet.sheet_variant === variant) return;

		try {
			await invoke("save_character_sheet", {
				payload: {
					id: selectedSheet.id,
					name: selectedSheet.name,
					system_id: selectedSheet.system_id,
					article_id: selectedSheet.article_id,
					data_json: selectedSheet.data_json || "{}",
					sheet_variant: variant,
				},
			});

			setSelectedSheet({ ...selectedSheet, sheet_variant: variant });
		} catch (err) {
			console.error("Errore cambio variante scheda:", err);
			alert(`Errore durante il cambio di scheda: ${err}`);
		}
	};

	// Associazione articolo Wiki
	const handleLinkArticle = async (articleId: string | null) => {
		if (!selectedSheet) return;

		try {
			await invoke("save_character_sheet", {
				payload: {
					id: selectedSheet.id,
					name: selectedSheet.name,
					system_id: selectedSheet.system_id,
					article_id: articleId,
					data_json: selectedSheet.data_json || "{}",
					sheet_variant: activeVariant,
				},
			});

			setSelectedSheet({ ...selectedSheet, article_id: articleId });
		} catch (err) {
			console.error("Errore associazione wiki:", err);
		}
	};

	// Esportazione del PDF
	const handleExportPdf = async () => {
		if (!selectedSheet) return;

		try {
			const variantSuffix = activeVariant === "png" ? "PNG" : "PG";
			const savePath = await save({
				title: "Esporta copia del PDF",
				filters: [{ name: "Documento PDF", extensions: ["pdf"] }],
				defaultPath: `${selectedSheet.name}_Scheda_${variantSuffix}.pdf`,
			});

			if (!savePath) return;

			await invoke("export_character_pdf", {
				sheetId: selectedSheet.id,
				variant: activeVariant,
				templateFilename: pdfTemplateFilename,
				outputPath: savePath,
			});

			alert("Copia del PDF esportata con successo!");
		} catch (err) {
			console.error("Errore durante l'esportazione:", err);
			alert(`Errore nell'esportazione: ${err}`);
		}
	};

	const btnBase: React.CSSProperties = {
		padding: "0.5rem 1rem",
		borderRadius: radii.md,
		cursor: "pointer",
		fontFamily: fonts.body,
		fontWeight: 600,
		fontSize: "0.85rem",
		transition: "all 0.15s ease",
	};

	return (
		<div style={{ display: "flex", width: "100%", height: "100%" }}>
			<style>{fontImportTag}</style>

			<CharacterSidebar
				systems={systems}
				sheets={sheets}
				selectedSheetId={selectedSheet?.id || null}
				searchQuery={searchQuery}
				activeSystemId={activeSystemId}
				onActiveSystemChange={setActiveSystemId}
				onSearchChange={setSearchQuery}
				onSelectSheet={handleSelectSheet}
				onNewSheet={handleNewSheet}
				onOpenSystemModal={() => setIsSystemModalOpen(true)}
			/>

			<main
				style={{
					flex: 1,
					padding: "1.2rem 1.8rem",
					display: "flex",
					flexDirection: "column",
					backgroundColor: colors.bgVoid,
					color: colors.textPrimary,
					fontFamily: fonts.body,
					height: "100%",
				}}
			>
				{!selectedSheet ? (
					<div
						style={{
							flex: 1,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: colors.textFaint,
							fontFamily: fonts.display,
							fontStyle: "italic",
						}}
					>
						Seleziona una scheda dalla barra laterale o creane una nuova.
					</div>
				) : (
					<>
						{/* Header */}
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem" }}>
							<div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
								<div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
									<h1 style={{ fontFamily: fonts.display, fontSize: "1.6rem", margin: 0, color: colors.textPrimary }}>
										{selectedSheet.name}
									</h1>

									{selectedSystem && (
										<span
											style={{
												backgroundColor: `${colors.gold}22`,
												color: colors.gold,
												border: `1px solid ${colors.gold}55`,
												padding: "0.2rem 0.6rem",
												borderRadius: radii.sm,
												fontSize: "0.75rem",
												fontWeight: 600,
											}}
										>
											{selectedSystem.name}
										</span>
									)}

									{availableVariants.length > 1 && (
										<div
											style={{
												display: "flex",
												border: `1px solid ${colors.border}`,
												borderRadius: radii.sm,
												overflow: "hidden",
											}}
										>
											{(["pg", "png"] as const)
												.filter((v) => availableVariants.includes(v))
												.map((v) => {
													const isActive = activeVariant === v;
													return (
														<button
															key={v}
															onClick={() => handleSetVariant(v)}
															title={v === "pg" ? "Scheda Personaggio Giocante" : "Scheda Personaggio Non Giocante"}
															style={{
																padding: "0.25rem 0.7rem",
																fontSize: "0.72rem",
																fontWeight: 700,
																letterSpacing: "0.04em",
																textTransform: "uppercase",
																border: "none",
																cursor: "pointer",
																backgroundColor: isActive ? colors.gold : "transparent",
																color: isActive ? colors.bgVoid : colors.textFaint,
															}}
														>
															{v === "pg" ? "PG" : "PNG"}
														</button>
													);
												})}
										</div>
									)}
								</div>

								<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
									<label style={{ fontSize: "0.78rem", color: colors.gold, fontWeight: 500 }}>
										Personaggio Wiki:
									</label>
									<select
										value={selectedSheet.article_id || ""}
										onChange={(e) => handleLinkArticle(e.target.value || null)}
										style={{
											backgroundColor: colors.bgPanel,
											color: colors.textPrimary,
											border: `1px solid ${colors.border}`,
											borderRadius: radii.sm,
											padding: "0.25rem 0.5rem",
											fontSize: "0.8rem",
											outline: "none",
											colorScheme: "dark",
										}}
									>
										<option value="">-- Nessun collegamento --</option>
										{characterArticles.map((art) => (
											<option key={art.id} value={art.id}>
												{art.title}
											</option>
										))}
									</select>

									{selectedSheet.article_id && onNavigateToWiki && (
										<button
											onClick={() => onNavigateToWiki(selectedSheet.article_id!)}
											style={{
												background: "none",
												border: "none",
												color: colors.gold,
												fontSize: "0.8rem",
												cursor: "pointer",
												textDecoration: "underline",
												padding: 0,
											}}
										>
											Vai alla voce →
										</button>
									)}
								</div>
							</div>

							<div style={{ display: "flex", gap: "0.5rem" }}>
								<button
									onClick={handleSavePdf}
									style={{ ...btnBase, backgroundColor: colors.gold, color: colors.bgVoid, border: "none" }}
								>
									Salva Scheda
								</button>

								<button
									onClick={handleExportPdf}
									style={{ ...btnBase, backgroundColor: "transparent", color: colors.gold, border: `1px solid ${colors.gold}77` }}
								>
									Esporta PDF
								</button>

								<button
									onClick={() => handleDeleteSheet(selectedSheet.id)}
									style={{ ...btnBase, backgroundColor: "transparent", color: colors.crimson, border: `1px solid ${colors.crimson}77` }}
								>
									Elimina
								</button>
							</div>
						</div>

						{/* Visualizzatore PDF.js Canvas Interattivo */}
						<div
							ref={pdfContainerRef}
							onInput={handleFormInputChange}
							onChange={handleFormInputChange}
							style={{
								flex: 1,
								width: "100%",
								height: "100%",
								minHeight: 0,
								borderRadius: radii.md,
								overflowY: "auto",
								border: `1px solid ${colors.border}`,
								backgroundColor: "#525659",
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								padding: "1rem 0",
							}}
						>
							{pdfArrayBuffer ? (
								<Document
									file={pdfArrayBuffer}
									onLoadSuccess={({ numPages }) => setNumPages(numPages)}
									loading={<div style={{ color: "#fff" }}>Caricamento PDF...</div>}
								>
									{Array.from(new Array(numPages), (_, index) => (
										<div key={`page_${index + 1}`} style={{ marginBottom: "1.5rem" }}>
											<Page
												pageNumber={index + 1}
												renderAnnotationLayer={true}
												renderTextLayer={true}
												renderForms={true}
												width={800}
												onRenderSuccess={populatePageAnnotations}
											/>
										</div>
									))}
								</Document>
							) : (
								<div style={{ padding: "2rem", color: colors.textFaint }}>
									Caricamento PDF del sistema in corso...
								</div>
							)}
						</div>
					</>
				)}
			</main>

			<SystemModal
				isOpen={isSystemModalOpen}
				onClose={() => setIsSystemModalOpen(false)}
				onSave={handleSaveSystem}
			/>

			<NewSheetModal
				isOpen={isNewSheetModalOpen}
				systemName={systems.find((s) => s.id === activeSystemId)?.name}
				onClose={() => setIsNewSheetModalOpen(false)}
				onCreate={createNewSheet}
			/>
		</div>
	);
};