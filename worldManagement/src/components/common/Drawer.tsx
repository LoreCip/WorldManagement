import React, { useEffect } from "react";
import { colors, fonts } from "../theme/theme";
import { Z_INDEX } from "./zIndex";
import { ensureCommonAnimations } from "./Animations";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  width?: string | number;
  side?: "left" | "right";
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  width = "320px",
  side = "right",
  footer,
  children,
}) => {
  useEffect(() => {
    ensureCommonAnimations();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const borderStyle =
    side === "right"
      ? { borderLeft: `1px solid ${colors.borderSubtle}` }
      : { borderRight: `1px solid ${colors.borderSubtle}` };

  return (
    <aside
      style={{
        width,
        flexShrink: 0,
        height: "100%",
        minHeight: 0,
        ...borderStyle,
        backgroundColor: colors.bgPanel,
        color: colors.textPrimary,
        padding: "1.3rem 1.1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.9rem",
        overflowY: "auto",
        boxSizing: "border-box",
        zIndex: Z_INDEX.drawer,
        animation: `common-slide-in-${side} 0.15s ease-out`,
      }}
    >
      {title && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontFamily: fonts.display, margin: 0, fontSize: "1.15rem" }}>{title}</h3>
          <button
            onClick={onClose}
            aria-label="Chiudi"
            style={{ background: "none", border: "none", color: colors.textFaint, cursor: "pointer", fontSize: "1.1rem" }}
          >
            ✕
          </button>
        </div>
      )}

      {children}

      {footer && (
        <div style={{ marginTop: "auto", paddingTop: "0.8rem", borderTop: `1px solid ${colors.borderSubtle}` }}>
          {footer}
        </div>
      )}
    </aside>
  );
};