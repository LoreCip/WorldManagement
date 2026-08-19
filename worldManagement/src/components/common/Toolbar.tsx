import React from "react";
import { Button, ButtonProps } from "./Button";

export interface ToolbarProps {
  children: React.ReactNode;
}

// Contenitore per righe di controlli (select, bottoni, ricerca...), da
// usare dentro un ViewHeader o standalone. Centralizza solo il layout;
// i controlli interni restano componenti normali.
export const Toolbar: React.FC<ToolbarProps> = ({ children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
    {children}
  </div>
);

export interface ToolbarButtonProps extends Omit<ButtonProps, "variant" | "size" | "pill"> {
  active?: boolean;
}

// Bottone "a pillola" con stato attivo/inattivo: wrapper sottile su Button
// che fissa variante/forma cosi' i chiamanti esistenti non cambiano.
export const ToolbarButton: React.FC<ToolbarButtonProps> = ({ active, style, ...rest }) => (
  <Button
    variant="secondary"
    pill
    active={active}
    style={{ padding: "0.45rem 0.8rem", fontSize: "0.78rem", ...style }}
    {...rest}
  />
);
