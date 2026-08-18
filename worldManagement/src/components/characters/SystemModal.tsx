import React, { useState, useEffect, useRef } from "react";
import { invokeSafe } from "../../lib/ipc";
import { GameSystem, SaveGameSystemPayload } from "../../types/character";
import { colors, radii } from "../theme/theme";
import { useLocalization } from "../../context/LocalizationContext";
import { Modal } from "../common/Modal";

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
  const [pdfPgFile, setPdfPgFile] = useState("");
  const [pdfPngFile, setPdfPngFile] = useState("");
  const [markdownTemplate, setMarkdownTemplate] = useState("");

  const pgFileInputRef = useRef<HTMLInputElement | null>(null);
  const pngFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

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
      // Prima: `t(...) + name`. `name` qui leggeva ancora il valore del
      // render precedente (il setName("") sopra non e sincrono), quindi
      // il template di un sistema nuovo veniva seminato col nome
      // dell'ultimo sistema aperto invece che vuoto.
      setMarkdownTemplate(t("characters.systemModal.markdownTemplate"));
    }
  }, [isOpen, systemToEdit, t]);

  // Usa FileReader per inviare i byte a upload_pdf_template via IPC
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, variant: "pg" | "png") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const pdfBytes = Array.from(new Uint8Array(arrayBuffer));

      const uploadedFilename = await invokeSafe<string>("upload_pdf_template", {
        filename: file.name,
        pdfBytes,
      });

      if (uploadedFilename === null) {
        alert(t("characters.systemModal.loadError"));
        return;
      }

      if (variant === "pg") setPdfPgFile(uploadedFilename);
      else setPdfPngFile(uploadedFilename);
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      width="500px"
      title={
        systemToEdit
          ? t("characters.systemModal.modifySystem")
          : t("characters.systemModal.newSystem")
      }
      footer={
        <>
          <button
            onClick={onClose}
            style={{
              padding: "0.5rem 1rem",
              background: "transparent",
              color: colors.textPrimary,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.sm,
              cursor: "pointer",
            }}
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleSubmit}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: colors.gold,
              color: colors.bgVoid,
              border: "none",
              borderRadius: radii.sm,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t("characters.systemModal.saveSystem")}
          </button>
        </>
      }
    >
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

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label
            style={{
              fontSize: "0.85rem",
              color: colors.textSecondary,
              display: "block",
              marginBottom: "0.3rem",
            }}
          >
            {t("characters.systemModal.gameName")}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("common.example") + "Fabula Ultima, Cyberpunk RED..."}
            style={{
              width: "100%",
              padding: "0.5rem",
              backgroundColor: colors.bgVoid,
              border: `1px solid ${colors.border}`,
              color: "#fff",
              borderRadius: radii.sm,
            }}
          />
        </div>

        <div>
          <label
            style={{
              fontSize: "0.85rem",
              color: colors.textSecondary,
              display: "block",
              marginBottom: "0.3rem",
            }}
          >
            {t("common.description")}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            style={{
              width: "100%",
              padding: "0.5rem",
              backgroundColor: colors.bgVoid,
              border: `1px solid ${colors.border}`,
              color: "#fff",
              borderRadius: radii.sm,
            }}
          />
        </div>

        <div>
          <label
            style={{
              fontSize: "0.85rem",
              color: colors.textSecondary,
              display: "block",
              marginBottom: "0.3rem",
            }}
          >
            {t("characters.systemModal.pdfPg")}
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              readOnly
              value={pdfPgFile}
              placeholder={t("characters.systemModal.noLoadedPdf")}
              style={{
                flex: 1,
                padding: "0.5rem",
                backgroundColor: colors.bgVoid,
                border: `1px solid ${colors.border}`,
                color: colors.gold,
                borderRadius: radii.sm,
              }}
            />
            <button
              onClick={() => pgFileInputRef.current?.click()}
              style={{
                padding: "0.5rem 0.8rem",
                backgroundColor: colors.gold,
                color: colors.bgVoid,
                border: "none",
                borderRadius: radii.sm,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {t("common.browse")}
            </button>
          </div>
        </div>

        <div>
          <label
            style={{
              fontSize: "0.85rem",
              color: colors.textSecondary,
              display: "block",
              marginBottom: "0.3rem",
            }}
          >
            {t("characters.systemModal.pdfPng")}
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              readOnly
              value={pdfPngFile}
              placeholder={t("common.optional")}
              style={{
                flex: 1,
                padding: "0.5rem",
                backgroundColor: colors.bgVoid,
                border: `1px solid ${colors.border}`,
                color: colors.gold,
                borderRadius: radii.sm,
              }}
            />
            <button
              onClick={() => pngFileInputRef.current?.click()}
              style={{
                padding: "0.5rem 0.8rem",
                backgroundColor: "transparent",
                border: `1px solid ${colors.gold}`,
                color: colors.gold,
                borderRadius: radii.sm,
                cursor: "pointer",
              }}
            >
              {t("common.browse")}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
