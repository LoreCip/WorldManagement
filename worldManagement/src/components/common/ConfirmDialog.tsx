import React, { createContext, useCallback, useContext, useState } from "react";
import { colors } from "../theme/theme";
import { useLocalization } from "../../context/LocalizationContext";
import { Modal } from "./Modal";
import { Button } from "./Button";

type ConfirmFn = (message: string, title?: string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface PendingConfirm {
  message: string;
  title?: string;
  resolve: (value: boolean) => void;
}

// Sostituisce window.confirm(): un window.confirm() blocca in modo sincrono,
// ma un dialog React e per natura asincrono (l'utente clicca un bottone in un
// render successivo). confirm() ritorna quindi una Promise<boolean> che i
// chiamanti (gia tutti async) possono attendere con await.
export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useLocalization();
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback<ConfirmFn>((message, title) => {
    return new Promise<boolean>((resolve) => {
      setPending({ message, title, resolve });
    });
  }, []);

  const resolvePending = (result: boolean) => {
    pending?.resolve(result);
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        isOpen={pending !== null}
        onClose={() => resolvePending(false)}
        width="380px"
        title={pending?.title ?? t("common.confirm")}
        footer={
          <>
            <Button variant="secondary" onClick={() => resolvePending(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="primary" onClick={() => resolvePending(true)}>
              {t("common.confirm")}
            </Button>
          </>
        }
      >
        <p style={{ margin: 0, color: colors.textPrimary, fontSize: "0.95rem" }}>
          {pending?.message}
        </p>
      </Modal>
    </ConfirmContext.Provider>
  );
};

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm deve essere usato dentro un ConfirmProvider");
  }
  return ctx;
}
