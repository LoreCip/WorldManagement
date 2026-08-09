import React, { useState, useEffect } from "react";

import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

import { colors, fonts, radii } from "../theme/theme";
import { MapItem } from "../../types/map";
import { useLocalization } from "../../context/LocalizationContext";

interface ArticleSummary {
    id: string;
    title: string;
}

interface AddMapModalProps {
    isOpen: boolean;
    existingMaps: MapItem[];
    initialFilePath?: string | null;
    onClose: () => void;
    onMapAdded: () => void;
}

export const AddMapModal: React.FC<AddMapModalProps> = ({
    isOpen,
    existingMaps,
    initialFilePath,
    onClose,
    onMapAdded,
}) => {
    const { t } = useLocalization();
    const [title, setTitle] = useState("");
    const [selectedFilePath, setSelectedFilePath] = useState("");
    const [parentMapId, setParentMapId] = useState<string>("");
    const [associatedArticleId, setAssociatedArticleId] = useState<string>("");
    const [articles, setArticles] = useState<ArticleSummary[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Carica l'elenco degli articoli per il dropdown quando si apre il modal
    useEffect(() => {
        if (isOpen) {
            invoke<ArticleSummary[]>("get_all_articles")
                .then(setArticles)
                .catch((err) => console.error("Errore caricamento articoli:", err));
        }
    }, [isOpen]);

    useEffect(() => {
        if (initialFilePath) {
            setSelectedFilePath(initialFilePath);
            const fileName = initialFilePath.split(/[\\/]/).pop()?.replace(/\.[^/.]+$/, "") || "";
            setTitle(fileName);
        } else if (!isOpen) {
            setTitle("");
            setSelectedFilePath("");
            setParentMapId("");
            setAssociatedArticleId("");
        }
    }, [initialFilePath, isOpen]);

    if (!isOpen) return null;

    const handleSelectFile = async () => {
        try {
            const file = await open({
                multiple: false,
                filters: [{ name: "Immagini", extensions: ["png", "jpg", "jpeg", "webp"] }],
            });

            if (file) {
                const path = file as string;
                setSelectedFilePath(path);
                if (!title) {
                    const fileName = path.split(/[\\/]/).pop()?.replace(/\.[^/.]+$/, "") || "";
                    setTitle(fileName);
                }
            }
        } catch (err) {
            console.error("Errore nella selezione del file:", err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !selectedFilePath) return;

        setIsLoading(true);

        try {
            const img = new Image();
            img.src = convertFileSrc(selectedFilePath);

            await new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
            });

            const width = img.naturalWidth || 1920;
            const height = img.naturalHeight || 1080;

            await invoke("save_map", {
                title,
                imagePath: selectedFilePath,
                parentMapId: parentMapId || null,
                articleId: associatedArticleId || null, // <--- Inviamo l'ID dell'articolo associato
                width,
                height,
            });

            setTitle("");
            setSelectedFilePath("");
            setParentMapId("");
            setAssociatedArticleId("");
            onMapAdded();
            onClose();
        } catch (err) {
            console.error("Errore nel salvataggio della mappa:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, backdropFilter: "blur(4px)" }}>
            <div style={{ backgroundColor: colors.bgPanel, border: `1px solid ${colors.border}`, borderRadius: radii.lg, padding: "2rem", width: "450px", boxShadow: "0 10px 30px rgba(0,0,0,0.8)", color: colors.textPrimary, fontFamily: fonts.body }}>
                <h3 style={{ fontFamily: fonts.display, margin: "0 0 1.2rem", color: colors.gold, fontSize: "1.4rem" }}>
                    {t("maps.form.newMap")}
                </h3>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div>
                        <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.4rem", color: colors.textSecondary }}>{t("maps.form.mapTitle")} *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t("common.example") + t("maps.form.mapNamePlaceholder")}
                            required
                            style={{ width: "100%", padding: "0.6rem", borderRadius: radii.sm, backgroundColor: colors.bgPanelRaised, border: `1px solid ${colors.border}`, color: colors.textPrimary, outline: "none", fontSize: "0.9rem" }}
                        />
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.4rem", color: colors.textSecondary }}>{t("maps.form.imageFile")} *</label>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                            <input
                                type="text"
                                readOnly
                                value={selectedFilePath ? selectedFilePath.split(/[\\/]/).pop() : ""}
                                placeholder={t("maps.form.imageFilePlaceholder")}
                                style={{ flex: 1, padding: "0.6rem", borderRadius: radii.sm, backgroundColor: colors.bgPanelRaised, border: `1px solid ${colors.border}`, color: colors.textPrimary, fontSize: "0.85rem" }}
                            />
                            <button type="button" onClick={handleSelectFile} style={{ padding: "0.6rem 1rem", borderRadius: radii.sm, backgroundColor: colors.bgPanelRaised, color: colors.gold, border: `1px solid ${colors.border}`, cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>
                                {t("common.browse")}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.4rem", color: colors.textSecondary }}>{t("maps.form.parentMapOptional")}</label>
                        <select
                            value={parentMapId}
                            onChange={(e) => setParentMapId(e.target.value)}
                            style={{ width: "100%", padding: "0.6rem", borderRadius: radii.sm, backgroundColor: colors.bgPanelRaised, color: colors.textPrimary, border: `1px solid ${colors.border}`, fontSize: "0.9rem" }}
                        >
                            <option value="">{t("maps.form.parentMapPlaceholder")}</option>
                            {existingMaps.map((m) => (
                                <option key={m.id} value={m.id}>{m.title}</option>
                            ))}
                        </select>
                    </div>

                    {/* SELETTORE ARTICOLO WIKI */}
                    <div>
                        <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.4rem", color: colors.textSecondary }}>
                            {t("maps.form.associatedArticleOptional")}
                        </label>
                        <select
                            value={associatedArticleId}
                            onChange={(e) => setAssociatedArticleId(e.target.value)}
                            style={{ width: "100%", padding: "0.6rem", borderRadius: radii.sm, backgroundColor: colors.bgPanelRaised, color: colors.textPrimary, border: `1px solid ${colors.border}`, fontSize: "0.9rem" }}
                        >
                            <option value="">{t("maps.form.associatedArticlePlaceholder")}</option>
                            {articles.map((art) => (
                                <option key={art.id} value={art.id}>📖 {art.title}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8rem", marginTop: "1rem" }}>
                        <button type="button" onClick={onClose} style={{ padding: "0.55rem 1.2rem", borderRadius: radii.md, backgroundColor: "transparent", color: colors.textSecondary, border: `1px solid ${colors.border}`, cursor: "pointer" }}>
                            {t("common.cancel")}
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !title.trim() || !selectedFilePath}
                            style={{ padding: "0.55rem 1.2rem", borderRadius: radii.md, backgroundColor: colors.gold, color: colors.bgVoid, border: "none", fontWeight: 600, cursor: isLoading ? "wait" : "pointer", opacity: !title.trim() || !selectedFilePath ? 0.5 : 1 }}
                        >
                            {isLoading ? t("common.saving") : t("maps.form.saveMap")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};