// src/context/MapsContext.tsx
import React, { createContext, useContext } from "react";
import { useMaps as useMapsInternal } from "../hooks/useMaps";

type MapsContextType = ReturnType<typeof useMapsInternal>;

const MapsContext = createContext<MapsContextType | null>(null);

export const MapsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mapsState = useMapsInternal();
  return <MapsContext.Provider value={mapsState}>{children}</MapsContext.Provider>;
};

export const useMaps = () => {
  const ctx = useContext(MapsContext);
  if (!ctx) {
    throw new Error("useMaps deve essere usato dentro un MapsProvider");
  }
  return ctx;
};
