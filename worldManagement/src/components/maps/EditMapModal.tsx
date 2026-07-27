import React, { useState, useEffect } from "react";

import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

import { colors, fonts, radii } from "../theme/theme";
import { MapItem } from "../../types/map";

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
    const [title, setTitle] = useState(currentMap.title);
    const [newFilePath, setNewFilePath] = useState<string>("");
    const [parentMapId, setParentMapId] = useState<string>(currentMap.parent_map_id || "");
    const [associatedArticleId, setAssociatedArticleId] = useState<string>(currentMap.article_id || "");
    const [articles, setArticles] = useState<{ id: string; title: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Sincronizza lo stato ogni volta che cambia la mappa o viene aperto il modal
    useEffect(() => {
        if (isOpen) {
            setTitle(currentMap.title);
            setNewFilePath(""); // Reset del percorso della NUOVA immagine
            setParentMapId(currentMap.parent_map_id || "");
            setAssociatedArticleId(currentMap.article_id || "");

            invoke<{ id: string; title: string }[]>("get_all_articles")
                .then(setArticles)
                .catch(console.error);
        }
    }, [isOpen, currentMap]);

    if (!isOpen) return null;

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
        setIsLoading(true);

        try {
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

            await invoke("update_map", {
                id: currentMap.id,
                title,
                imagePath: newFilePath || null, // Se vuoto, Rust manterrà l'immagine esistente
                parentMapId: parentMapId || null,
                articleId: associatedArticleId || null,
                width,
                height,
            });

            onMapUpdated();
            onClose();
        } catch (err) {
            console.error("Errore nell'aggiornamento della mappa:", err);
        } finally {
            setIsLoading(false);
        }
    };

    // Estrae solo il nome del file dall'impostazione attuale o dal nuovo percorso
    const currentImageName = currentMap.image_path.split(/[\\/]/).pop();
    const newImageName = newFilePath ? newFilePath.split(/[\\/]/).pop() : null;

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.75)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 2000,
                backdropFilter: "blur(4px)",
            }}
        >
            <div
                style={{
                    backgroundColor: colors.bgPanel,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radii.lg,
                    padding: "2rem",
                    width: "450px",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.8)",
                    color: colors.textPrimary,
                    fontFamily: fonts.body,
                }}
            >
                <h3 style={{ fontFamily: fonts.display, margin: "0 0 1.2rem", color: colors.gold, fontSize: "1.4rem" }}>
                    ⚙️ Modifica Dettagli Mappa
                </h3>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {/* Titolo Mappa */}
                    <div>
                        <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.4rem", color: colors.textSecondary }}>
                            Titolo Mappa *
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
                        <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.4rem", color: colors.textSecondary }}>
                            File Immagine Mappa
                        </label>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                            <input
                                type="text"
                                readOnly
                                value={newImageName ? `Nuova: ${newImageName}` : `Attuale: ${currentImageName}`}
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
                                Cambia…
                            </button>
                        </div>
                    </div>

                    {/* Articolo Wiki Correlato */}
                    <div>
                        <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.4rem", color: colors.textSecondary }}>
                            Articolo Wiki Correlato
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
                            <option value="">-- Nessun articolo collegato --</option>
                            {articles.map((art) => (
                                <option key={art.id} value={art.id}>
                                    📖 {art.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Mappa Padre */}
                    <div>
                        <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.4rem", color: colors.textSecondary }}>
                            Mappa Padre
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
                            <option value="">-- Nessuna (Mappa di Livello Superiore) --</option>
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
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8rem", marginTop: "1rem" }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: "0.55rem 1.2rem",
                                borderRadius: radii.md,
                                backgroundColor: "transparent",
                                color: colors.textSecondary,
                                border: `1px solid ${colors.border}`,
                                cursor: "pointer",
                            }}
                        >
                            Annulla
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
                            {isLoading ? "Salvataggio..." : "Salva Modifiche"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};