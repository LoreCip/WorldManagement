import React, { useEffect, useRef, useState, useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { invokeSafe } from "../lib/ipc";
import { useCharacters } from "../hooks/useCharacters";
import { useCharacterSheetPdf } from "../hooks/useCharacterSheetPdf";
import { usePinchZoom } from "../hooks/usePinchZoom";
import { CharacterSidebar } from "../components/characters/CharacterSidebar";
import { SystemModal } from "../components/characters/SystemModal";
import { NewSheetModal } from "../components/characters/NewSheetModal";
import { colors, fonts, radii } from "../components/theme/theme";
import { useLocalization } from "../context/LocalizationContext";
import { ArticleMeta } from "../types/wiki";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

interface CharacterViewProps {
  onNavigateToWiki?: (articleId: string) => void;
  initialSheetId?: string | null;
  onSelectSheet?: (id: string | null) => void;
}

export const CharacterView: React.FC<CharacterViewProps> = ({ onNavigateToWiki, initialSheetId, onSelectSheet }) => {
  const {
    systems,
    sheets,
    searchQuery,
    setSearchQuery,
    selectedSheet,
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
    updateSheet,
  } = useCharacters();

  const { t } = useLocalization();
  const [characterArticles, setCharacterArticles] = useState<ArticleMeta[]>([]);
  const syncedInitialSheetId = useRef<string | null | undefined>(null);

  useEffect(() => {
    if (initialSheetId && initialSheetId !== syncedInitialSheetId.current && sheets.length > 0) {
      handleSelectSheet(initialSheetId);
      syncedInitialSheetId.current = initialSheetId;
    }
  }, [initialSheetId, sheets, handleSelectSheet]);

  const onSelectSheetWrapper = (id: string) => {
    handleSelectSheet(id);
    onSelectSheet?.(id);
  };

  // Articoli wiki di categoria "personaggio", per il collegamento scheda<->wiki.
  useEffect(() => {
    const fetchWikiArticles = async () => {
      const articles = await invokeSafe<ArticleMeta[]>("get_all_articles");
      if (!articles) return;

      // Doppio confronto "personaggio"/"personaggi": compensa il
      // disallineamento tra le chiavi categoria di settingsRegistry.ts e
      // la union CategoryKey di theme.ts (gia segnalato nello step Wiki,
      // non risolto qui).
      const filtered = articles.filter((a) => {
        if (!a.category) return false;
        const cat = a.category.trim().toLowerCase();
        return cat === "personaggio" || cat === "personaggi";
      });
      setCharacterArticles(filtered);
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
      if (activeVariant === "png" && parsedSchema.pdf_template_png) return parsedSchema.pdf_template_png;
      return parsedSchema.pdf_template_pg || parsedSchema.pdf_template || "5E_CharacterSheet_Fillable.pdf";
    } catch {
      return "5E_CharacterSheet_Fillable.pdf";
    }
  }, [selectedSystem, activeVariant]);

  // Lo zoom possiede il ref del contenitore scrollabile (serve al suo
  // listener "wheel"); il sottosistema PDF lo riusa in sola lettura per
  // interrogare i campi form gia renderizzati nel DOM.
  const { scale, containerRef, zoomIn, zoomOut, zoomReset, setScale } = usePinchZoom();

  const { pdfArrayBuffer, numPages, setNumPages, handleFormInputChange, populatePageAnnotations, handleSavePdf, handleExportPdf } =
    useCharacterSheetPdf({ selectedSheet, activeVariant, pdfTemplateFilename, updateSheet, containerRef });

  // Reset dello zoom quando cambio scheda
  useEffect(() => {
    setScale(1);
  }, [selectedSheet?.id, setScale]);

  const handleSetVariant = async (variant: "pg" | "png") => {
    if (!selectedSheet || selectedSheet.sheet_variant === variant) return;
    const success = await updateSheet({ id: selectedSheet.id, sheet_variant: variant });
    if (!success) alert("Errore durante il cambio di scheda.");
  };

  const handleLinkArticle = async (articleId: string | null) => {
    if (!selectedSheet) return;
    const success = await updateSheet({ id: selectedSheet.id, article_id: articleId });
    if (!success) alert("Errore durante l'associazione alla wiki.");
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
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: colors.textFaint, fontFamily: fonts.display, fontStyle: "italic" }}>
            {t("characters.hook.hint")}
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                  <h1 style={{ fontFamily: fonts.display, fontSize: "1.6rem", margin: 0, color: colors.textPrimary }}>{selectedSheet.name}</h1>

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
                    <div style={{ display: "flex", border: `1px solid ${colors.border}`, borderRadius: radii.sm, overflow: "hidden" }}>
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
                  <label style={{ fontSize: "0.78rem", color: colors.gold, fontWeight: 500 }}>{t("characters.hook.characterWiki")}</label>
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
                      style={{ background: "none", border: "none", color: colors.gold, fontSize: "0.8rem", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                    >
                      {t("characters.hook.go")}
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                {/* Controlli zoom */}
                <div style={{ display: "flex", alignItems: "center", border: `1px solid ${colors.border}`, borderRadius: radii.sm, overflow: "hidden", marginRight: "0.3rem" }}>
                  <button onClick={zoomOut} title="Riduci zoom" style={zoomBtnBase}>
                    −
                  </button>
                  <button
                    onClick={zoomReset}
                    title="Ripristina zoom (100%)"
                    style={{ ...zoomBtnBase, width: "3.2rem", fontSize: "0.72rem", fontWeight: 600, borderLeft: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}` }}
                  >
                    {Math.round(scale * 100)}%
                  </button>
                  <button onClick={zoomIn} title="Aumenta zoom" style={zoomBtnBase}>
                    +
                  </button>
                </div>

                <button onClick={handleSavePdf} style={{ ...btnBase, backgroundColor: colors.gold, color: colors.bgVoid, border: "none" }}>
                  {t("common.save")}
                </button>

                <button onClick={handleExportPdf} style={{ ...btnBase, backgroundColor: "transparent", color: colors.gold, border: `1px solid ${colors.gold}77` }}>
                  {t("common.export")}
                </button>

                <button
                  onClick={() => handleDeleteSheet(selectedSheet.id)}
                  style={{ ...btnBase, backgroundColor: "transparent", color: colors.crimson, border: `1px solid ${colors.crimson}77` }}
                >
                  {/* Prima: t("common.save") - mostrava l'etichetta sbagliata sul bottone Elimina */}
                  {t("common.delete")}
                </button>
              </div>
            </div>

            {/* Visualizzatore PDF */}
            <div
              ref={containerRef}
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
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "1rem 0",
                    // margine extra per poter scrollare oltre i bordi quando si e zoomati
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
                        <Page pageNumber={index + 1} renderAnnotationLayer renderTextLayer renderForms scale={scale} onRenderSuccess={populatePageAnnotations} />
                      </div>
                    ))}
                  </Document>
                </div>
              ) : (
                <div style={{ padding: "2rem", color: colors.textFaint }}>{t("characters.hook.loading")}</div>
              )}
            </div>
          </>
        )}
      </main>

      <SystemModal isOpen={isSystemModalOpen} onClose={() => setIsSystemModalOpen(false)} onSave={handleSaveSystem} />

      <NewSheetModal
        isOpen={isNewSheetModalOpen}
        systemName={systems.find((s) => s.id === activeSystemId)?.name}
        onClose={() => setIsNewSheetModalOpen(false)}
        onCreate={createNewSheet}
      />
    </div>
  );
};