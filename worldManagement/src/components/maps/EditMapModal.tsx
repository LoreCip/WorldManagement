import React, { useState, useEffect } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

import { colors, radii } from "../theme/theme";
import { MapItem } from "../../types/map";
import { useLocalization } from "../../context/LocalizationContext";
import { useLinkableOptions } from "../../hooks/useLinkableOptions";
import { useAsync } from "../../hooks/useAsync";
import { Modal } from "../common/Modal";

interface EditMapModalProps {
  isOpen: boolean;
  currentMap: MapItem;
  existingMaps: MapItem[];
  onClose: () => void;
  onMapUpdated: () => void;
}

export const EditMapModal: React.FC<EditMapModalProps> = ({
  isOpen,
  currentMap,
  existingMaps,
  onClose,
  onMapUpdated,
}) => {
  const { t } = useLocalization();

  const [title, setTitle] = useState(currentMap.title);
  const [newFilePath, setNewFilePath] = useState<string>("");
  const [parentMapId, setParentMapId] = useState<string>(currentMap.parent_map_id || "");
  const [associatedArticleId, setAssociatedArticleId] = useState<string>(
    currentMap.article_id || "",
  );
  const { articles } = useLinkableOptions({ articles: isOpen });
  const { run: updateMap, isLoading } = useAsync<string>("update_map");

  // Sincronizza lo stato ogni volta che cambia la mappa o viene aperto il modal
  useEffect(() => {
    if (!isOpen) return;

    setTitle(currentMap.title);
    setNewFilePath(""); // Reset del percorso della NUOVA immagine
    setParentMapId(currentMap.parent_map_id || "");
    setAssociatedArticleId(currentMap.article_id || "");
  }, [isOpen, currentMap]);

  // Gestione selezione nuovo file tramite dialog
  const handleSelectFile = async () => {
    try {
      const file = await open({
        multiple: false,
        filters: [{ name: "Immagini", extensions: ["png", "jpg", "jpeg", "webp"] }],
      });

      if (file) {
        setNewFilePath(file as string);
      }
    } catch (err) {
      console.error("Errore nella selezione dell'immagine:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let width: number | null = null;
    let height: number | null = null;

    // Se è stata scelta una NUOVA immagine, ne calcoliamo le dimensioni
    if (newFilePath) {
      const img = new Image();
      img.src = convertFileSrc(newFilePath);
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
      width = img.naturalWidth || 1920;
      height = img.naturalHeight || 1080;
    }

    const result = await updateMap({
      id: currentMap.id,
      title,
      imagePath: newFilePath || null, // Se vuoto, Rust manterrà l'immagine esistente
      parentMapId: parentMapId || null,
      articleId: associatedArticleId || null,
      width,
      height,
    });

    if (result === null) {
      alert(t("maps.form.updateError"));
      return;
    }

    onMapUpdated();
    onClose();
  };

  // Estrae solo il nome del file dall'impostazione attuale o dal nuovo percorso
  const currentImageName = currentMap.image_path.split(/[\\/]/).pop();
  const newImageName = newFilePath ? newFilePath.split(/[\\/]/).pop() : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      width="450px"
      title={t("maps.form.modDetails")}
      closeDisabled={isLoading}
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        {/* Titolo Mappa */}
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
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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

        {/* CAMBIO IMMAGINE */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.85rem",
              marginBottom: "0.4rem",
              color: colors.textSecondary,
            }}
          >
            {t("maps.form.imageFileChange")}
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              readOnly
              value={
                newImageName
                  ? `${t("common.newF")}: ${newImageName}`
                  : `${t("common.current")}: ${currentImageName}`
              }
              style={{
                flex: 1,
                padding: "0.6rem",
                borderRadius: radii.sm,
                backgroundColor: colors.bgPanelRaised,
                border: `1px solid ${colors.border}`,
                color: newFilePath ? colors.gold : colors.textPrimary,
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
              {/* Prima: "Cambia…" hardcoded, unico testo non tradotto del form */}
              {t("maps.form.changeFile")}
            </button>
          </div>
        </div>

        {/* Articolo Wiki Correlato */}
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

        {/* Mappa Padre */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.85rem",
              marginBottom: "0.4rem",
              color: colors.textSecondary,
            }}
          >
            {t("maps.form.parentMap")}
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
            <option value="">{t("maps.form.noParent")}</option>
            {existingMaps
              .filter((m) => m.id !== currentMap.id)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
          </select>
        </div>

        {/* Bottoni di Azione */}
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
            disabled={isLoading || !title.trim()}
            style={{
              padding: "0.55rem 1.2rem",
              borderRadius: radii.md,
              backgroundColor: colors.gold,
              color: colors.bgVoid,
              border: "none",
              fontWeight: 600,
              cursor: isLoading ? "wait" : "pointer",
            }}
          >
            {isLoading ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </form>
    </Modal>
  );
};
