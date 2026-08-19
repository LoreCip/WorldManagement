import { useCallback, useEffect, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { save } from "@tauri-apps/plugin-dialog";
import { invokeSafe } from "../lib/ipc";
import { useLocalization } from "../context/LocalizationContext";
import { useToast } from "../components/common/Toast";
import { CharacterSheet, SheetVariant } from "../types/character";

type FormFieldValue = string | boolean;

interface UseCharacterSheetPdfParams {
  selectedSheet: CharacterSheet | null;
  activeVariant: SheetVariant;
  pdfTemplateFilename: string;
  /** Mutazione centralizzata della scheda (da useCharacters). */
  updateSheet: (partial: Partial<CharacterSheet> & { id: string }) => Promise<boolean>;
  /** Ref del contenitore scrollabile che ospita le pagine PDF renderizzate
   *  (condiviso con usePinchZoom nella view: serve qui solo in lettura,
   *  per interrogare i campi form gia renderizzati nel DOM). */
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const pdfCacheKey = (sheetId: string, variant: string) => `${sheetId}::${variant}`;

// Incapsula tutto il sottosistema PDF di una scheda: caricamento/cache dei
// bytes, sincronizzazione dei valori dei campi form con il DOM renderizzato
// da react-pdf, salvataggio (pdf-lib + IPC) ed export. Nessun rendering
// proprio: la view resta responsabile solo della composizione JSX.
export function useCharacterSheetPdf({
  selectedSheet,
  activeVariant,
  pdfTemplateFilename,
  updateSheet,
  containerRef,
}: UseCharacterSheetPdfParams) {
  const { t } = useLocalization();
  const showToast = useToast();
  const [pdfArrayBuffer, setPdfArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [isDirty, setIsDirty] = useState(false);

  const formDataRef = useRef<Record<string, FormFieldValue>>({});
  const pristineBufferRef = useRef<ArrayBuffer | null>(null);
  const pdfCacheRef = useRef<Map<string, ArrayBuffer>>(new Map());

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  useEffect(() => {
    let cancelled = false;

    const loadPdfBytes = async () => {
      if (!selectedSheet) {
        setPdfArrayBuffer(null);
        formDataRef.current = {};
        pristineBufferRef.current = null;
        setIsDirty(false);
        return;
      }

      let initialData: Record<string, FormFieldValue> = {};
      try {
        if (selectedSheet.data_json) initialData = JSON.parse(selectedSheet.data_json);
      } catch {
        initialData = {};
      }
      formDataRef.current = initialData;
      setIsDirty(false);

      const cacheKey = pdfCacheKey(selectedSheet.id, activeVariant);
      const cached = pdfCacheRef.current.get(cacheKey);

      let buffer: ArrayBuffer | null;
      if (cached) {
        buffer = cached.slice(0);
      } else {
        buffer = await invokeSafe<ArrayBuffer>("load_sheet_pdf_bytes", {
          sheetId: selectedSheet.id,
          variant: activeVariant,
          templateFilename: pdfTemplateFilename,
        });
        if (buffer) pdfCacheRef.current.set(cacheKey, buffer.slice(0));
      }

      if (cancelled) return;

      if (!buffer) {
        console.error("Errore caricamento PDF per la scheda:", selectedSheet.id);
        setPdfArrayBuffer(null);
        return;
      }

      pristineBufferRef.current = buffer.slice(0);
      setPdfArrayBuffer(buffer);
    };

    loadPdfBytes();
    return () => {
      cancelled = true;
    };
  }, [selectedSheet, activeVariant, pdfTemplateFilename]);

  // Ripopola i campi del PDF renderizzato con i valori salvati, dopo ogni
  // render riuscito di una pagina (i nodi input/textarea vengono ricreati
  // da react-pdf ad ogni pagina).
  const populatePageAnnotations = useCallback(() => {
    if (!containerRef.current) return;
    const inputs = containerRef.current.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      "input, textarea, select",
    );

    inputs.forEach((input) => {
      const name = input.name;
      if (!name || !(name in formDataRef.current)) return;

      const val = formDataRef.current[name];
      if (input.type === "checkbox") {
        (input as HTMLInputElement).checked = Boolean(val);
      } else {
        input.value = String(val ?? "");
      }
    });
  }, [containerRef]);

  const handleFormInputChange = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    if (!target?.name) return;

    const value: FormFieldValue =
      target.type === "checkbox" ? (target as HTMLInputElement).checked : target.value;
    formDataRef.current[target.name] = value;
    setIsDirty(true);
  }, []);

  const handleSavePdf = useCallback(async () => {
    if (!selectedSheet) {
      console.warn("handleSavePdf chiamato senza una scheda selezionata.");
      return;
    }
    if (!pristineBufferRef.current) {
      console.error(
        "Salvataggio PDF interrotto: il buffer del PDF non è ancora caricato in memoria.",
      );
      showToast(t("characters.pdf.notLoaded"), "error");
      return;
    }

    try {
      const pdfDoc = await PDFDocument.load(pristineBufferRef.current.slice(0));
      const form = pdfDoc.getForm();

      let appliedCount = 0;
      const failedFields: string[] = [];

      Object.entries(formDataRef.current).forEach(([fieldName, val]) => {
        try {
          if (typeof val === "boolean") {
            const cb = form.getCheckBox(fieldName);
            if (val) cb.check();
            else cb.uncheck();
          } else {
            const tf = form.getTextField(fieldName);
            tf.setText(String(val ?? ""));
          }
          appliedCount++;
        } catch (fieldErr) {
          failedFields.push(fieldName);
          console.warn(`Campo "${fieldName}" non trovato nel PDF:`, fieldErr);
        }
      });

      console.log(
        `Salvataggio PDF: ${appliedCount} campi applicati, ${failedFields.length} falliti.`,
        failedFields,
      );

      const updatedPdfBytes = await pdfDoc.save();

      const pdfSaved = await invokeSafe<boolean>("save_character_pdf", {
        sheetId: selectedSheet.id,
        variant: activeVariant,
        pdfBytes: Array.from(updatedPdfBytes),
      });
      if (pdfSaved === null) {
        console.error(
          "Salvataggio PDF interrotto: save_character_pdf ha restituito null (vedi il log IPC sopra per il motivo).",
        );
        showToast(t("characters.pdf.saveError"), "error");
        return;
      }

      const jsonStr = JSON.stringify(formDataRef.current);
      const success = await updateSheet({
        id: selectedSheet.id,
        data_json: jsonStr,
        sheet_variant: activeVariant,
      });
      if (!success) {
        console.error(
          "Salvataggio PDF interrotto: updateSheet (save_character_sheet) ha restituito false.",
        );
        showToast(t("characters.pdf.sheetSaveError"), "error");
        return;
      }

      console.log("Salvataggio PDF completato con successo.");
      setIsDirty(false);
      showToast(t("characters.pdf.saveSuccess"), "success");
    } catch (err) {
      console.error("Errore durante il salvataggio:", err);
      showToast(t("characters.pdf.saveException", { error: String(err) }), "error");
    }
  }, [selectedSheet, activeVariant, updateSheet, t, showToast]);

  const handleExportPdf = useCallback(async () => {
    if (!selectedSheet) return;

    const variantSuffix = activeVariant === "png" ? "PNG" : "PG";
    const savePath = await save({
      title: "Esporta copia del PDF",
      filters: [{ name: "Documento PDF", extensions: ["pdf"] }],
      defaultPath: `${selectedSheet.name}_Scheda_${variantSuffix}.pdf`,
    });
    if (!savePath) return;

    const result = await invokeSafe("export_character_pdf", {
      sheetId: selectedSheet.id,
      variant: activeVariant,
      templateFilename: pdfTemplateFilename,
      outputPath: savePath,
    });

    if (result === null) {
      showToast(t("characters.pdf.exportError"), "error");
      return;
    }

    showToast(t("characters.pdf.exportSuccess"), "success");
  }, [selectedSheet, activeVariant, pdfTemplateFilename, t, showToast]);

  return {
    pdfArrayBuffer,
    numPages,
    setNumPages,
    isDirty,
    handleFormInputChange,
    populatePageAnnotations,
    handleSavePdf,
    handleExportPdf,
  };
}
