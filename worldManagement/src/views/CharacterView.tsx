import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { PDFDocument } from "pdf-lib";
import { Document, Page, pdfjs } from "react-pdf";
import { useCharacters } from "../hooks/useCharacters";
import { CharacterSidebar } from "../components/characters/CharacterSidebar";
import { SystemModal } from "../components/characters/SystemModal";
import { NewSheetModal } from "../components/characters/NewSheetModal";
import { colors, fonts, radii } from "../components/theme/theme";
import { useLocalization } from "../context/LocalizationContext";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

interface WikiArticle {
	id: string;
	title: string;
	category: string;
}

interface CharacterViewProps {
	onNavigateToWiki?: (articleId: string) => void;
	initialSheetId?: string | null;
	onSelectSheet?: (id: string | null) => void;
}

// Limiti di zoom
const MIN_SCALE = 0.4;
const MAX_SCALE = 3;
const ZOOM_SENSITIVITY = 0.012; // quanto reattivo è il pinch/ctrl+wheel

export const CharacterView: React.FC<CharacterViewProps> = ({
	onNavigateToWiki,
	initialSheetId,
	onSelectSheet,
}) => {
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

    const { t } = useLocalization();

	const [pdfArrayBuffer, setPdfArrayBuffer] = useState<ArrayBuffer | null>(null);
	const [numPages, setNumPages] = useState<number>(0);
	const [characterArticles, setCharacterArticles] = useState<WikiArticle[]>([]);
	const [scale, setScale] = useState<number>(1);

	const formDataRef = useRef<Record<string, any>>({});
	const pdfContainerRef = useRef<HTMLDivElement | null>(null);
	const pdfContentRef = useRef<HTMLDivElement | null>(null);
	const pristineBufferRef = useRef<ArrayBuffer | null>(null);

	const pdfCacheRef = useRef<Map<string, ArrayBuffer>>(new Map());
	const pdfCacheKey = (sheetId: string, variant: string) => `${sheetId}::${variant}`;

	// Ref per il rAF-throttling dello zoom e per l'aggiustamento dello scroll "verso il cursore"
	const rafIdRef = useRef<number | null>(null);
	const pendingScaleRef = useRef<number | null>(null);
	const pendingAnchorRef = useRef<{ clientX: number; clientY: number } | null>(null);

	// Reset dello zoom quando cambio scheda
	useEffect(() => {
		setScale(1);
	}, [selectedSheet?.id]);

	useEffect(() => {
		if (initialSheetId && sheets.length > 0) {
			if (selectedSheet?.id !== initialSheetId) {
				handleSelectSheet(initialSheetId);
			}
		}
	}, [initialSheetId, sheets]);

	const onSelectSheetWrapper = (id: string) => {
		handleSelectSheet(id);
		if (onSelectSheet) {
			onSelectSheet(id);
		}
	};

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

	const selectedSystem = useMemo(() => {
		if (!selectedSheet) return null;
		return systems.find((s) => s.id === selectedSheet.system_id) || null;
	}, [selectedSheet, systems]);

	const activeVariant = selectedSheet?.sheet_variant || "pg";

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
			return parsedSchema.pdf_template_pg || parsedSchema.pdf_template || "5E_CharacterSheet_Fillable.pdf";
		} catch {
			return "5E_CharacterSheet_Fillable.pdf";
		}
	}, [selectedSystem, activeVariant]);

	useEffect(() => {
		const loadPdfBytes = async () => {
			if (!selectedSheet) {
				setPdfArrayBuffer(null);
				formDataRef.current = {};
				pristineBufferRef.current = null;
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

				const cacheKey = pdfCacheKey(selectedSheet.id, activeVariant);
				const cached = pdfCacheRef.current.get(cacheKey);

				let buffer: ArrayBuffer;
				if (cached) {
					buffer = cached.slice(0);
				} else {
					buffer = await invoke<ArrayBuffer>("load_sheet_pdf_bytes", {
						sheetId: selectedSheet.id,
						variant: activeVariant,
						templateFilename: pdfTemplateFilename,
					});
					pdfCacheRef.current.set(cacheKey, buffer.slice(0));
				}

				pristineBufferRef.current = buffer.slice(0);
				setPdfArrayBuffer(buffer);
			} catch (err) {
				console.error("Errore caricamento PDF:", err);
				setPdfArrayBuffer(null);
			}
		};

		loadPdfBytes();
	}, [selectedSheet, activeVariant, pdfTemplateFilename]);

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

	const handleFormInputChange = (e: React.FormEvent<HTMLDivElement>) => {
		const target = e.target as HTMLInputElement | HTMLTextAreaElement;
		if (!target || !target.name) return;

		const fieldName = target.name;
		const value = target.type === "checkbox" ? (target as HTMLInputElement).checked : target.value;

		formDataRef.current[fieldName] = value;
	};

	const handleSavePdf = async () => {
		if (!selectedSheet) return;

		try {
			if (!pristineBufferRef.current) {
				throw new Error("PDF non ancora caricato in memoria.");
			}

			const pdfDoc = await PDFDocument.load(pristineBufferRef.current.slice(0));
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

	const handleSetVariant = async (variant: "pg" | "png") => {
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

	// ---- ZOOM: pinch trackpad (wheel + ctrlKey) e Ctrl/Cmd + rotellina ----
	// Applica lo scale mantenendo il punto sotto il cursore fisso (zoom-to-cursor),
	// throttlato via requestAnimationFrame per restare fluido durante il pinch continuo.
	const applyPendingZoom = useCallback(() => {
		rafIdRef.current = null;

		const container = pdfContainerRef.current;
		const nextScale = pendingScaleRef.current;
		const anchor = pendingAnchorRef.current;
		if (!container || nextScale == null) return;

		setScale((prevScale) => {
			if (Math.abs(nextScale - prevScale) < 0.001) return prevScale;

			if (anchor) {
				const rect = container.getBoundingClientRect();
				// Posizione del cursore relativa al contenuto scrollabile (prima dello zoom)
				const offsetX = anchor.clientX - rect.left + container.scrollLeft;
				const offsetY = anchor.clientY - rect.top + container.scrollTop;
				const ratio = nextScale / prevScale;

				// Applichiamo il nuovo scroll DOPO che React ha ri-renderizzato con la nuova scala
				requestAnimationFrame(() => {
					if (!container) return;
					container.scrollLeft = offsetX * ratio - (anchor.clientX - rect.left);
					container.scrollTop = offsetY * ratio - (anchor.clientY - rect.top);
				});
			}

			return nextScale;
		});
	}, []);

	const scheduleZoom = useCallback(
		(nextScale: number, clientX: number, clientY: number) => {
			pendingScaleRef.current = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));
			pendingAnchorRef.current = { clientX, clientY };

			if (rafIdRef.current == null) {
				rafIdRef.current = requestAnimationFrame(applyPendingZoom);
			}
		},
		[applyPendingZoom]
	);

	useEffect(() => {
		const container = pdfContainerRef.current;
		if (!container) return;

		const handleWheel = (e: WheelEvent) => {
			// Il pinch a due dita sul trackpad viene esposto dal browser come
			// evento "wheel" con ctrlKey=true (così come Ctrl/Cmd + rotellina del mouse).
			// Senza questo intercetto, il browser farebbe lo zoom dell'intera pagina.
			if (!e.ctrlKey) return; // lascia passare lo scroll normale a due dita

			e.preventDefault();

			setScale((current) => {
				const factor = Math.exp(-e.deltaY * ZOOM_SENSITIVITY);
				const next = current * factor;
				scheduleZoom(next, e.clientX, e.clientY);
				return current; // lo stato reale viene aggiornato dentro scheduleZoom/applyPendingZoom
			});
		};

		container.addEventListener("wheel", handleWheel, { passive: false });
		return () => {
			container.removeEventListener("wheel", handleWheel);
			if (rafIdRef.current != null) {
				cancelAnimationFrame(rafIdRef.current);
				rafIdRef.current = null;
			}
		};
	}, [scheduleZoom]);

	const zoomIn = () => setScale((s) => Math.min(MAX_SCALE, +(s + 0.15).toFixed(3)));
	const zoomOut = () => setScale((s) => Math.max(MIN_SCALE, +(s - 0.15).toFixed(3)));
	const zoomReset = () => setScale(1);

	const btnBase: React.CSSProperties = {
		padding: "0.5rem 1rem",
		borderRadius: radii.md,
		cursor: "pointer",
		fontFamily: fonts.body,
		fontWeight: 600,
		fontSize: "0.85rem",
		transition: "all 0.15s ease",
	};

	const zoomBtnBase: React.CSSProperties = {
		width: "1.8rem",
		height: "1.8rem",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		border: "none",
		background: "transparent",
		color: colors.textFaint,
		cursor: "pointer",
		fontSize: "1rem",
		fontWeight: 700,
	};

	return (
		<div style={{ display: "flex", width: "100%", height: "100%" }}>

			<CharacterSidebar
				systems={systems}
				sheets={sheets}
				selectedSheetId={selectedSheet?.id || null}
				searchQuery={searchQuery}
				activeSystemId={activeSystemId}
				onActiveSystemChange={setActiveSystemId}
				onSearchChange={setSearchQuery}
				onSelectSheet={onSelectSheetWrapper}
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
						{t("characters.hook.hint")}
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
															{v === "pg" ? t("characters.systemModal.pc") : t("characters.systemModal.npc")}
														</button>
													);
												})}
										</div>
									)}
								</div>

								<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
									<label style={{ fontSize: "0.78rem", color: colors.gold, fontWeight: 500 }}>
										{t("characters.hook.characterWiki")}
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
										<option value="">{t("characters.hook.noLink")}</option>
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
											{t("characters.hook.go")}
										</button>
									)}
								</div>
							</div>

							<div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
								{/* Controlli zoom */}
								<div
									style={{
										display: "flex",
										alignItems: "center",
										border: `1px solid ${colors.border}`,
										borderRadius: radii.sm,
										overflow: "hidden",
										marginRight: "0.3rem",
									}}
								>
									<button onClick={zoomOut} title="Riduci zoom" style={zoomBtnBase}>
										−
									</button>
									<button
										onClick={zoomReset}
										title="Ripristina zoom (100%)"
										style={{
											...zoomBtnBase,
											width: "3.2rem",
											fontSize: "0.72rem",
											fontWeight: 600,
											borderLeft: `1px solid ${colors.border}`,
											borderRight: `1px solid ${colors.border}`,
										}}
									>
										{Math.round(scale * 100)}%
									</button>
									<button onClick={zoomIn} title="Aumenta zoom" style={zoomBtnBase}>
										+
									</button>
								</div>

								<button
									onClick={handleSavePdf}
									style={{ ...btnBase, backgroundColor: colors.gold, color: colors.bgVoid, border: "none" }}
								>
									{t("common.save")}
								</button>

								<button
									onClick={handleExportPdf}
									style={{ ...btnBase, backgroundColor: "transparent", color: colors.gold, border: `1px solid ${colors.gold}77` }}
								>
									{t("common.export")}
								</button>

								<button
									onClick={() => handleDeleteSheet(selectedSheet.id)}
									style={{ ...btnBase, backgroundColor: "transparent", color: colors.crimson, border: `1px solid ${colors.crimson}77` }}
								>
									{t("common.save")}
								</button>
							</div>
						</div>

						{/* Visualizzatore PDF */}
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
								overflow: "auto", // scroll sia verticale che orizzontale (necessario quando si fa zoom)
								border: `1px solid ${colors.border}`,
								backgroundColor: "#525659",
								// overscrollBehavior evita che lo scroll "sfondi" verso la pagina quando si arriva ai bordi
								overscrollBehavior: "contain",
							}}
						>
							{pdfArrayBuffer ? (
								<div
									ref={pdfContentRef}
									style={{
										display: "flex",
										flexDirection: "column",
										alignItems: "center",
										padding: "1rem 0",
										// margine extra per poter scrollare oltre i bordi quando si è zoomati
										minWidth: "100%",
										width: "fit-content",
										margin: "0 auto",
									}}
								>
									<Document
										file={pdfArrayBuffer}
										onLoadSuccess={({ numPages }) => setNumPages(numPages)}
										loading={<div style={{ color: "#fff" }}>{t("characters.hook.loadingShort")}</div>}
									>
										{Array.from(new Array(numPages), (_, index) => (
											<div key={`page_${index + 1}`} style={{ marginBottom: "1.5rem" }}>
												<Page
													pageNumber={index + 1}
													renderAnnotationLayer={true}
													renderTextLayer={true}
													renderForms={true}
													scale={scale}
													onRenderSuccess={populatePageAnnotations}
												/>
											</div>
										))}
									</Document>
								</div>
							) : (
								<div style={{ padding: "2rem", color: colors.textFaint }}>
									{t("characters.hook.loading")}
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