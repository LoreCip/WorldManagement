import React, { useState } from "react";
import { colors, fonts, radii } from "../theme/theme";
import { useLocalization } from "../../context/LocalizationContext";

interface TagInputProps {
    tags: string[];
    isEditing: boolean;
    onAddTag: (tag: string) => void;
    onRemoveTag: (tag: string) => void;
}

export const TagInput: React.FC<TagInputProps> = ({
    tags,
    isEditing,
    onAddTag,
    onRemoveTag,
}) => {    
    const { t } = useLocalization();
    const [input, setInput] = useState("");

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if ((e.key === "Enter" || e.key === ",") && input.trim()) {
            e.preventDefault();
            const cleanTag = input.trim().replace(",", "").toLowerCase();
            onAddTag(cleanTag);
            setInput("");
        }
    };

    return (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", margin: "0.85rem 0" }}>
            {tags.map((tag) => (
                <span
                    key={tag}
                    style={{
                        backgroundColor: colors.goldWash,
                        color: colors.goldBright,
                        border: `1px solid rgba(201, 161, 90, 0.35)`,
                        padding: "3px 10px",
                        borderRadius: radii.pill,
                        fontFamily: fonts.body,
                        fontSize: "0.8rem",
                        fontWeight: 500,
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        letterSpacing: "0.01em",
                    }}
                >
                    <span style={{ opacity: 0.65 }}>#</span>
                    {tag}
                    {isEditing && (
                        <button
                            onClick={() => onRemoveTag(tag)}
                            aria-label={`Rimuovi tag ${tag}`}
                            style={{
                                background: "none",
                                border: "none",
                                color: colors.goldBright,
                                cursor: "pointer",
                                fontWeight: "bold",
                                fontSize: "0.95rem",
                                padding: 0,
                                lineHeight: 1,
                                opacity: 0.6,
                                transition: "opacity 0.15s ease, color 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = "1";
                                e.currentTarget.style.color = colors.crimsonBright;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = "0.6";
                                e.currentTarget.style.color = colors.goldBright;
                            }}
                        >
                            {t("wiki.tag.delete")}
                        </button>
                    )}
                </span>
            ))}

            {isEditing && (
                <input
                    type="text"
                    placeholder={t("wiki.tag.placeholder")}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    style={{
                        background: "transparent",
                        color: colors.textPrimary,
                        border: "none",
                        borderBottom: `1px solid ${colors.border}`,
                        borderRadius: 0,
                        padding: "3px 2px",
                        fontFamily: fonts.body,
                        fontSize: "0.8rem",
                        outline: "none",
                        minWidth: "160px",
                        transition: "border-color 0.15s ease",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderBottomColor = colors.gold)}
                    onBlur={(e) => (e.currentTarget.style.borderBottomColor = colors.border)}
                />
            )}
        </div>
    );
};