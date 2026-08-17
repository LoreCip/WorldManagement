import React, { useEffect, useRef } from "react";
import { colors, radii } from "../theme/theme";
import { Z_INDEX } from "./zIndex";
import { ensureCommonAnimations } from "./Animations";

export interface PopoverProps {
  isOpen: boolean;
  onClose: () => void;
  /** Elemento che apre/chiude il popover (bottone, icona...). */
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  width?: string | number;
}

// Dropdown posizionato sotto il trigger, con click-outside ed ESC per
// chiudere.
export const Popover: React.FC<PopoverProps> = ({ isOpen, onClose, trigger, children, align = "right", width = "220px" }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    ensureCommonAnimations();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const alignStyle = align === "right" ? { right: 0 } : { left: 0 };

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-flex" }}>
      {trigger}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            ...alignStyle,
            backgroundColor: colors.bgPanel,
            border: `1px solid ${colors.borderSubtle}`,
            borderRadius: radii.md,
            padding: "0.6rem",
            minWidth: width,
            zIndex: Z_INDEX.popover,
            display: "flex",
            flexDirection: "column",
            gap: "0.35rem",
            maxHeight: "min(320px, 60vh)",
            overflowY: "auto",
            boxSizing: "border-box",
            animation: "common-fade-in 0.12s ease-out",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};