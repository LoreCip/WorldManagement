import React, { useEffect } from "react";
import { colors, fonts, radii, Z_INDEX } from "../theme/theme";
import { ensureCommonAnimations } from "./Animations";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  footer?: React.ReactNode;
  width?: string | number;
  children: React.ReactNode;
  /** Disabilita ESC/click-outside, es. mentre e in corso un salvataggio. */
  closeDisabled?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  footer,
  width = "420px",
  children,
  closeDisabled = false,
}) => {
  useEffect(() => {
    ensureCommonAnimations();
  }, []);

  useEffect(() => {
    if (!isOpen || closeDisabled) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeDisabled, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeDisabled) return;
    // Chiude solo se il click e sul backdrop stesso, non su un figlio
    // (equivalente allo stopPropagation manuale usato prima in QuickNodeModal).
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(10, 11, 16, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: Z_INDEX.modal,
        animation: "common-fade-in 0.15s ease-out",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          backgroundColor: colors.bgPanel,
          border: `1px solid ${colors.border}`,
          borderRadius: radii.lg,
          padding: "1.8rem",
          width,
          maxWidth: "calc(100vw - 2rem)",
          maxHeight: "calc(100vh - 4rem)",
          overflowY: "auto",
          boxShadow: "0 10px 30px rgba(0,0,0,0.8)",
          color: colors.textPrimary,
          fontFamily: fonts.body,
          boxSizing: "border-box",
          animation: "common-scale-in 0.15s ease-out",
        }}
      >
        {title && (
          <h2
            style={{
              fontFamily: fonts.display,
              color: colors.gold,
              marginTop: 0,
              marginBottom: "1.2rem",
            }}
          >
            {title}
          </h2>
        )}

        {children}

        {footer && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.5rem",
              marginTop: "1.5rem",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
