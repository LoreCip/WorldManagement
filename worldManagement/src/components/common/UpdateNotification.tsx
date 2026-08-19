import React, { useEffect, useRef, useState } from "react";
import type { Update } from "@tauri-apps/plugin-updater";
import { DownloadCloud, X } from "lucide-react";
import { colors, fonts, radii, Z_INDEX } from "../theme/theme";
import { ensureCommonAnimations } from "./Animations";
import { Button } from "./Button";
import { useLocalization } from "../../context/LocalizationContext";

type UpdateStage = "idle" | "downloading" | "restarting" | "error";

// Controlla la presenza di aggiornamenti all'avvio e, se disponibile, mostra
// un banner non bloccante (ignorabile) in basso a sinistra. L'utente decide
// se e quando applicare l'update; nessun dialog nativo/bloccante coinvolto.
export const UpdateNotification: React.FC = () => {
  const { t } = useLocalization();
  const [update, setUpdate] = useState<Update | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [stage, setStage] = useState<UpdateStage>("idle");
  const checkedRef = useRef(false);

  useEffect(() => {
    ensureCommonAnimations();
  }, []);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    (async () => {
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const result = await check();
        if (result) setUpdate(result);
      } catch {
        // Non in ambiente Tauri (es. dev browser) o rete non disponibile:
        // fallisce silenziosamente, l'update check non è critico.
      }
    })();
  }, []);

  if (!update || dismissed) return null;

  const handleUpdate = async () => {
    setStage("downloading");
    try {
      await update.downloadAndInstall();
      setStage("restarting");
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch {
      setStage("error");
    }
  };

  const busy = stage === "downloading" || stage === "restarting";

  return (
    <div
      role="status"
      style={{
        position: "fixed",
        left: "1.5rem",
        bottom: "1.5rem",
        zIndex: Z_INDEX.popover,
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.7rem 0.9rem",
        borderRadius: radii.md,
        backgroundColor: colors.bgPanel,
        border: `1px solid ${colors.border}`,
        borderLeft: `3px solid ${colors.gold}`,
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        color: colors.textPrimary,
        fontFamily: fonts.body,
        fontSize: "0.85rem",
        maxWidth: "360px",
        animation: "common-slide-in-left 0.15s ease-out",
      }}
    >
      <DownloadCloud size={18} color={colors.gold} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>
        {stage === "downloading"
          ? t("updater.downloading")
          : stage === "restarting"
            ? t("updater.restarting")
            : stage === "error"
              ? t("updater.error")
              : t("updater.available", { version: update.version })}
      </span>
      {stage !== "error" && (
        <Button variant="primary" size="sm" onClick={handleUpdate} disabled={busy}>
          {t("updater.update")}
        </Button>
      )}
      <Button
        variant="ghost"
        iconOnly
        size="sm"
        icon={X}
        iconSize={14}
        onClick={() => setDismissed(true)}
        aria-label={t("common.close")}
      />
    </div>
  );
};
