import React, { createContext, useContext } from "react";
import { useSettingsInternal } from "../hooks/useSettings";

type SettingsContextType = ReturnType<typeof useSettingsInternal>;

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const state = useSettingsInternal();
  return <SettingsContext.Provider value={state}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings deve essere usato dentro un SettingsProvider");
  }
  return ctx;
};
