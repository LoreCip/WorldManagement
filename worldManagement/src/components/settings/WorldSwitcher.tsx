import React, { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useWorlds } from "../../hooks/useWorlds";
import { useConfirm } from "../common/ConfirmDialog";
import { Button } from "../common/Button";
import { colors, fonts, radii } from "../theme/theme";
import { useLocalization } from "../../context/LocalizationContext";

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "0.4rem 0.6rem",
  backgroundColor: colors.bgVoid,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.sm,
  color: colors.textPrimary,
  fontFamily: fonts.body,
  fontSize: "0.85rem",
  outline: "none",
};

export const WorldSwitcher: React.FC = () => {
  const { t } = useLocalization();
  const confirm = useConfirm();
  const { worlds, isLoaded, error, clearError, createWorld, switchWorld, renameWorld, deleteWorld } =
    useWorlds();

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createWorld(trimmed);
  };

  const startEditing = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const commitEditing = () => {
    const trimmed = editingName.trim();
    if (editingId && trimmed) {
      renameWorld(editingId, trimmed);
    }
    setEditingId(null);
    setEditingName("");
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirm(t("settings.worlds.deleteConfirm", { name }));
    if (!confirmed) return;
    deleteWorld(id);
  };

  if (!isLoaded) return null;

  return (
    <div style={{ marginBottom: "2.2rem" }}>
      <h2
        style={{
          fontFamily: fonts.display,
          fontSize: "1.05rem",
          color: colors.gold,
          margin: "0 0 0.5rem",
          paddingBottom: "0.4rem",
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        {t("settings.worlds.title")}
      </h2>
      <p style={{ fontSize: "0.8rem", color: colors.textFaint, margin: "0 0 0.9rem" }}>
        {t("settings.worlds.subtitle")}
      </p>

      {error && (
        <div
          style={{
            fontSize: "0.8rem",
            color: colors.crimson,
            marginBottom: "0.7rem",
            cursor: "pointer",
          }}
          onClick={clearError}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.9rem" }}>
        {worlds.map((world) => {
          const isEditing = editingId === world.id;
          return (
            <div
              key={world.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                padding: "0.6rem 0.75rem",
                borderRadius: radii.sm,
                backgroundColor: world.is_active ? colors.bgPanelRaised : "transparent",
                borderLeft: `3px solid ${world.is_active ? colors.gold : "transparent"}`,
              }}
            >
              {isEditing ? (
                <>
                  <input
                    autoFocus
                    style={inputStyle}
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEditing();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                  <Button variant="icon" size="sm" icon={Check} onClick={commitEditing} />
                  <Button variant="icon" size="sm" icon={X} onClick={() => setEditingId(null)} />
                </>
              ) : (
                <>
                  <div
                    onClick={() => !world.is_active && switchWorld(world.id)}
                    style={{
                      flex: 1,
                      cursor: world.is_active ? "default" : "pointer",
                      fontFamily: fonts.display,
                      fontWeight: 600,
                      fontSize: "0.95rem",
                      color: world.is_active ? colors.gold : colors.textPrimary,
                    }}
                  >
                    {world.name}
                    {world.is_active && (
                      <span
                        style={{
                          marginLeft: "0.5rem",
                          fontFamily: fonts.mono,
                          fontSize: "0.65rem",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: colors.textFaint,
                        }}
                      >
                        {t("settings.worlds.activeLabel")}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="icon"
                    size="sm"
                    icon={Pencil}
                    title={t("settings.worlds.renameTooltip")}
                    onClick={() => startEditing(world.id, world.name)}
                  />
                  <Button
                    variant="icon"
                    size="sm"
                    icon={Trash2}
                    title={
                      world.is_active
                        ? t("settings.worlds.cannotDeleteActive")
                        : t("settings.worlds.deleteTooltip")
                    }
                    disabled={world.is_active || worlds.length <= 1}
                    onClick={() => handleDelete(world.id, world.name)}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          style={inputStyle}
          placeholder={t("settings.worlds.namePlaceholder")}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
        />
        <Button variant="primary" size="sm" icon={Plus} onClick={handleCreate}>
          {t("settings.worlds.createButton")}
        </Button>
      </div>
    </div>
  );
};
