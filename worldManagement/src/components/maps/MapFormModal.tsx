import React, { useEffect, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

import { colors, radii } from "../theme/theme";
import { MapItem } from "../../types/map";
import { useLocalization } from "../../context/LocalizationContext";
import { useLinkableOptions } from "../../hooks/useLinkableOptions";
import { useAsync } from "../../hooks/useAsync";
import { useToast } from "../common/Toast";
import { Modal } from "../common/Modal";

interface MapFormModalProps {
  mode: "add" | "edit";
  isOpen: boolean;
  existingMaps: MapItem[];
  /** Richiesto in modalita "edit": la mappa da modificare. */
  currentMap?: MapItem;
  /** Usato solo in modalita "add": path pre-selezionato (es. drag&drop sul canvas). */
  initialFilePath?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

// Unifica AddMapModal e EditMapModal: i due form erano ~90% identici
// (titolo, file picker, mappa padre, articolo collegato), differendo solo
// nei valori iniziali, nel comando IPC da chiamare (save_map vs update_map)
// e in alcuni dettagli di copy/label.
export const MapFormModal: React.FC<MapFormModalProps> = ({
  mode,
  isOpen,
  existingMaps,
  currentMap,
  initialFilePath,
  onClose,
  onSaved,
}) => {
  const { t } = useLocalization();
  const showToast = useToast();
  const [title, setTitle] = useState("");
  const [selectedFilePath, setSelectedFilePath] = useState("");
  const [parentMapId, setParentMapId] = useState<string>("");
  const [associatedArticleId, setAssociatedArticleId] = useState<string>("");
  const { articles } = useLinkableOptions({ articles: isOpen });
  const { run: runSave, isLoading } = useAsync<string>(mode === "add" ? "save_map" : "update_map");

  useEffect(() => {
    if (mode === "add") {
      if (initialFilePath) {
        setSelectedFilePath(initialFilePath);
        const fileName =
          initialFilePath
            .split(/[\\/]/)
            .pop()
            ?.replace(/\.[^/.]+$/, "") || "";
        setTitle(fileName);
      } else if (!isOpen) {
        setTitle("");
        setSelectedFilePath("");
        setParentMapId("");
        setAssociatedArticleId("");
      }
      return;
    }

    if (isOpen && currentMap) {
      setTitle(currentMap.title);
      setSelectedFilePath(""); // reset del percorso della NUOVA immagine
      setParentMapId(currentMap.parent_map_id || "");
      setAssociatedArticleId(currentMap.article_id || "");
    }
  }, [mode, initialFilePath, isOpen, currentMap]);

  const handleSelectFile = async () => {
    try {
      const file = await open({
        multiple: false,
        filters: [{ name: "Immagini", extensions: ["png", "jpg", "jpeg", "webp"] }],
      });
      if (!file) return;

      const path = file as string;
      setSelectedFilePath(path);
      if (mode === "add" && !title) {
        const fileName =
          path
            .split(/[\\/]/)
            .pop()
            ?.replace(/\.[^/.]+$/, "") || "";
        setTitle(fileName);
      }
    } catch (err) {
      console.error("Errore nella selezione del file:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "add" && (!title.trim() || !selectedFilePath)) return;

    let width: number | null = null;
    let height: number | null = null;

    // In "add" c'e sempre un'immagine da misurare; in "edit" solo se ne e
    // stata scelta una nuova (altrimenti Rust mantiene le dimensioni esistenti).
    if (selectedFilePath) {
      const img = new Image();
      img.src = convertFileSrc(selectedFilePath);
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
      width = img.naturalWidth || 1920;
      height = img.naturalHeight || 1080;
    }

    const payload: Record<string, unknown> = {
      title,
      imagePath: mode === "add" ? selectedFilePath : selectedFilePath || null,
      parentMapId: parentMapId || null,
      articleId: associatedArticleId || null,
      width,
      height,
    };
    if (mode === "edit" && currentMap) payload.id = currentMap.id;

    const result = await runSave(payload);
    if (result === null) {
      showToast(t(mode === "add" ? "maps.form.saveError" : "maps.form.updateError"), "error");
      return;
    }

    if (mode === "add") {
      setTitle("");
      setSelectedFilePath("");
      setParentMapId("");
      setAssociatedArticleId("");
    }
    onSaved();
    onClose();
  };

  const currentImageName = currentMap?.image_path.split(/[\\/]/).pop();
  const newImageName = selectedFilePath ? selectedFilePath.split(/[\\/]/).pop() : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      width="450px"
      title={mode === "add" ? t("maps.form.newMap") : t("maps.form.modDetails")}
      closeDisabled={isLoading}
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.85rem",
              marginBottom: "0.4rem",
              color: colors.textSecondary,
            }}
          >
            {t("maps.form.mapTitle")}
            {mode === "add" && " *"}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              mode === "add" ? t("common.example") + t("maps.form.mapNamePlaceholder") : undefined
            }
            required
            style={{
              width: "100%",
              padding: "0.6rem",
              borderRadius: radii.sm,
              backgroundColor: colors.bgPanelRaised,
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary,
              outline: "none",
              fontSize: "0.9rem",
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.85rem",
              marginBottom: "0.4rem",
              color: colors.textSecondary,
            }}
          >
            {mode === "add" ? `${t("maps.form.imageFile")} *` : t("maps.form.imageFileChange")}
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              readOnly
              value={
                mode === "add"
                  ? selectedFilePath
                    ? selectedFilePath.split(/[\\/]/).pop()
                    : ""
                  : newImageName
                    ? `${t("common.newF")}: ${newImageName}`
                    : `${t("common.current")}: ${currentImageName}`
              }
              placeholder={mode === "add" ? t("maps.form.imageFilePlaceholder") : undefined}
              style={{
                flex: 1,
                padding: "0.6rem",
                borderRadius: radii.sm,
                backgroundColor: colors.bgPanelRaised,
                border: `1px solid ${colors.border}`,
                color: mode === "edit" && selectedFilePath ? colors.gold : colors.textPrimary,
                fontSize: "0.85rem",
              }}
            />
            <button
              type="button"
              onClick={handleSelectFile}
              style={{
                padding: "0.6rem 1rem",
                borderRadius: radii.sm,
                backgroundColor: colors.bgPanelRaised,
                color: colors.gold,
                border: `1px solid ${colors.border}`,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.85rem",
              }}
            >
              {mode === "add" ? t("common.browse") : t("maps.form.changeFile")}
            </button>
          </div>
        </div>

        {mode === "edit" && (
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                marginBottom: "0.4rem",
                color: colors.textSecondary,
              }}
            >
              {t("maps.form.associatedArticle")}
            </label>
            <select
              value={associatedArticleId}
              onChange={(e) => setAssociatedArticleId(e.target.value)}
              style={{
                width: "100%",
                padding: "0.6rem",
                borderRadius: radii.sm,
                backgroundColor: colors.bgPanelRaised,
                color: colors.textPrimary,
                border: `1px solid ${colors.border}`,
                fontSize: "0.9rem",
              }}
            >
              <option value="">{t("maps.form.noLinkWiki")}</option>
              {articles.map((art) => (
                <option key={art.id} value={art.id}>
                  📖 {art.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.85rem",
              marginBottom: "0.4rem",
              color: colors.textSecondary,
            }}
          >
            {mode === "add" ? t("maps.form.parentMapOptional") : t("maps.form.parentMap")}
          </label>
          <select
            value={parentMapId}
            onChange={(e) => setParentMapId(e.target.value)}
            style={{
              width: "100%",
              padding: "0.6rem",
              borderRadius: radii.sm,
              backgroundColor: colors.bgPanelRaised,
              color: colors.textPrimary,
              border: `1px solid ${colors.border}`,
              fontSize: "0.9rem",
            }}
          >
            <option value="">
              {mode === "add" ? t("maps.form.parentMapPlaceholder") : t("maps.form.noParent")}
            </option>
            {existingMaps
              .filter((m) => mode === "add" || m.id !== currentMap?.id)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
          </select>
        </div>

        {mode === "add" && (
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                marginBottom: "0.4rem",
                color: colors.textSecondary,
              }}
            >
              {t("maps.form.associatedArticleOptional")}
            </label>
            <select
              value={associatedArticleId}
              onChange={(e) => setAssociatedArticleId(e.target.value)}
              style={{
                width: "100%",
                padding: "0.6rem",
                borderRadius: radii.sm,
                backgroundColor: colors.bgPanelRaised,
                color: colors.textPrimary,
                border: `1px solid ${colors.border}`,
                fontSize: "0.9rem",
              }}
            >
              <option value="">{t("maps.form.associatedArticlePlaceholder")}</option>
              {articles.map((art) => (
                <option key={art.id} value={art.id}>
                  📖 {art.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "0.8rem", marginTop: "1rem" }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: "0.55rem 1.2rem",
              borderRadius: radii.md,
              backgroundColor: "transparent",
              color: colors.textSecondary,
              border: `1px solid ${colors.border}`,
              cursor: "pointer",
            }}
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={isLoading || (mode === "add" && (!title.trim() || !selectedFilePath))}
            style={{
              padding: "0.55rem 1.2rem",
              borderRadius: radii.md,
              backgroundColor: colors.gold,
              color: colors.bgVoid,
              border: "none",
              fontWeight: 600,
              cursor: isLoading ? "wait" : "pointer",
              opacity: mode === "add" && (!title.trim() || !selectedFilePath) ? 0.5 : 1,
            }}
          >
            {isLoading
              ? t("common.saving")
              : mode === "add"
                ? t("maps.form.saveMap")
                : t("common.save")}
          </button>
        </div>
      </form>
    </Modal>
  );
};
