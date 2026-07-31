import React, { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { GameSystem, SaveGameSystemPayload } from "../../types/character";
import { colors, fonts, radii } from "../theme/theme";
import { useLocalization } from "../../context/LocalizationContext";

interface SystemModalProps {
  isOpen: boolean;
  systemToEdit?: GameSystem | null;
  onClose: () => void;
  onSave: (payload: SaveGameSystemPayload) => Promise<boolean>;
}

export const SystemModal: React.FC<SystemModalProps> = ({
  isOpen,
  systemToEdit,
  onClose,
  onSave,
}) => {
  const { t } = useLocalization();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pdfPgFile, setPdfPgFile] = useState<string>("");
  const [pdfPngFile, setPdfPngFile] = useState<string>("");
  const [markdownTemplate, setMarkdownTemplate] = useState("");

  const pgFileInputRef = useRef<HTMLInputElement | null>(null);
  const pngFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (systemToEdit) {
        setName(systemToEdit.name);
        setDescription(systemToEdit.description || "");
        setMarkdownTemplate(systemToEdit.markdown_template || "");
        try {
          const schema = JSON.parse(systemToEdit.schema_json);
          setPdfPgFile(schema.pdf_template_pg || schema.pdf_template || "");
          setPdfPngFile(schema.pdf_template_png || "");
        } catch {
          setPdfPgFile("");
          setPdfPngFile("");
        }
      } else {
        setName("");
        setDescription("");
        setPdfPgFile("");
        setPdfPngFile("");
        setMarkdownTemplate(t("characters.systemModal.markdownTemplate") + name);
      }
    }
  }, [isOpen, systemToEdit]);

  if (!isOpen) return null;

  // Usa l'API nativa del browser FileReader per inviare i byte a `upload_pdf_template`
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, variant: "pg" | "png") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const arrayBuffer = reader.result as ArrayBuffer;
        const pdfBytes = Array.from(new Uint8Array(arrayBuffer));

        // Invocazione al tuo comando Rust esistente `upload_pdf_template`
        const uploadedFilename = await invoke<string>("upload_pdf_template", {
          filename: file.name,
          pdfBytes: pdfBytes,
        });

        if (variant === "pg") setPdfPgFile(uploadedFilename);
        else setPdfPngFile(uploadedFilename);
      } catch (err) {
        alert(`${t("characters.systemModal.loadError")} ${err}`);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert(t("characters.systemModal.nameError"));
      return;
    }
    if (!pdfPgFile) {
      alert(t("characters.systemModal.pgError"));
      return;
    }

    const schemaJson = JSON.stringify({
      pdf_template_pg: pdfPgFile,
      pdf_template_png: pdfPngFile || undefined,
      fields: [],
    });

    const payload: SaveGameSystemPayload = {
      id: systemToEdit?.id,
      name: name.trim(),
      description: description.trim() || undefined,
      schema_json: schemaJson,
      markdown_template: markdownTemplate || `# ${name.trim()}`,
    };

    const success = await onSave(payload);
    if (success) onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      {/* Input nascosti per la selezione dei file */}
      <input
        type="file"
        ref={pgFileInputRef}
        accept=".pdf"
        style={{ display: "none" }}
        onChange={(e) => handleFileUpload(e, "pg")}
      />
      <input
        type="file"
        ref={pngFileInputRef}
        accept=".pdf"
        style={{ display: "none" }}
        onChange={(e) => handleFileUpload(e, "png")}
      />

      <div style={{ backgroundColor: colors.bgPanel, padding: "1.8rem", borderRadius: radii.lg, border: `1px solid ${colors.border}`, width: "500px", color: colors.textPrimary, fontFamily: fonts.body }}>
        <h2 style={{ fontFamily: fonts.display, color: colors.gold, marginTop: 0 }}>
          {systemToEdit ? t("characters.systemModal.modifySystem") : t("characters.systemModal.newSystem")}
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.85rem", color: colors.textSecondary, display: "block", marginBottom: "0.3rem" }}>{t("characters.systemModal.gameName")}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("common.example") + "Fabula Ultima, Cyberpunk RED..."}
              style={{ width: "100%", padding: "0.5rem", backgroundColor: colors.bgVoid, border: `1px solid ${colors.border}`, color: "#fff", borderRadius: radii.sm }}
            />
          </div>

          <div>
            <label style={{ fontSize: "0.85rem", color: colors.textSecondary, display: "block", marginBottom: "0.3rem" }}>{t("common.description")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              style={{ width: "100%", padding: "0.5rem", backgroundColor: colors.bgVoid, border: `1px solid ${colors.border}`, color: "#fff", borderRadius: radii.sm }}
            />
          </div>

          <div>
            <label style={{ fontSize: "0.85rem", color: colors.textSecondary, display: "block", marginBottom: "0.3rem" }}>{t("characters.systemModal.pdfPg")}</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input type="text" readOnly value={pdfPgFile} placeholder={t("characters.systemModal.noLoadedPdf")} style={{ flex: 1, padding: "0.5rem", backgroundColor: colors.bgVoid, border: `1px solid ${colors.border}`, color: colors.gold, borderRadius: radii.sm }} />
              <button onClick={() => pgFileInputRef.current?.click()} style={{ padding: "0.5rem 0.8rem", backgroundColor: colors.gold, color: colors.bgVoid, border: "none", borderRadius: radii.sm, cursor: "pointer", fontWeight: 600 }}>
                {t("common.browse")}
              </button>
            </div>
          </div>

          <div>
            <label style={{ fontSize: "0.85rem", color: colors.textSecondary, display: "block", marginBottom: "0.3rem" }}>{t("characters.systemModal.pdfPng")}</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input type="text" readOnly value={pdfPngFile} placeholder={t("common.optional")} style={{ flex: 1, padding: "0.5rem", backgroundColor: colors.bgVoid, border: `1px solid ${colors.border}`, color: colors.gold, borderRadius: radii.sm }} />
              <button onClick={() => pngFileInputRef.current?.click()} style={{ padding: "0.5rem 0.8rem", backgroundColor: "transparent", border: `1px solid ${colors.gold}`, color: colors.gold, borderRadius: radii.sm, cursor: "pointer" }}>
                {t("common.browse")}
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.5rem" }}>
          <button onClick={onClose} style={{ padding: "0.5rem 1rem", background: "transparent", color: colors.textPrimary, border: `1px solid ${colors.border}`, borderRadius: radii.sm, cursor: "pointer" }}>
            {t("common.cancel")}
          </button>
          <button onClick={handleSubmit} style={{ padding: "0.5rem 1rem", backgroundColor: colors.gold, color: colors.bgVoid, border: "none", borderRadius: radii.sm, fontWeight: 600, cursor: "pointer" }}>
            {t("characters.systemModal.saveSystem")}
          </button>
        </div>
      </div>
    </div>
  );
};