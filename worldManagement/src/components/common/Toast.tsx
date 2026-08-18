import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { colors, fonts, radii } from "../theme/theme";
import { Z_INDEX } from "./zIndex";
import { ensureCommonAnimations } from "./Animations";

export type ToastVariant = "error" | "success" | "info";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

type ShowToastFn = (message: string, variant?: ToastVariant) => void;

const ToastContext = createContext<ShowToastFn | null>(null);

const AUTO_DISMISS_MS = 4000;

const VARIANT_ACCENT: Record<ToastVariant, string> = {
  error: colors.crimson,
  success: colors.verdigris,
  info: colors.gold,
};

// Sostituisce alert(): notifiche non bloccanti impilate in basso a destra,
// con auto-dismiss. Un click chiude subito la singola notifica.
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    ensureCommonAnimations();
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback<ShowToastFn>(
    (message, variant = "info") => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, variant }]);
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: "1.5rem",
          right: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          zIndex: Z_INDEX.popover,
          maxWidth: "380px",
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            onClick={() => dismiss(toast.id)}
            style={{
              padding: "0.8rem 1rem",
              borderRadius: radii.md,
              backgroundColor: colors.bgPanel,
              borderLeft: `3px solid ${VARIANT_ACCENT[toast.variant]}`,
              color: colors.textPrimary,
              fontFamily: fonts.body,
              fontSize: "0.9rem",
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              cursor: "pointer",
              animation: "common-slide-in-right 0.15s ease-out",
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ShowToastFn {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast deve essere usato dentro un ToastProvider");
  }
  return ctx;
}
