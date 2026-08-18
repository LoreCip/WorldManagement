import React from "react";
import { colors, radii } from "../theme/theme";

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

export interface ToolbarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

// Bottone "a pillola" con stato attivo/inattivo.
export const ToolbarButton: React.FC<ToolbarButtonProps> = ({ active, style, ...rest }) => (
  <button
    {...rest}
    style={{
      padding: "0.45rem 0.8rem",
      borderRadius: radii.pill,
      fontSize: "0.78rem",
      fontWeight: 600,
      cursor: "pointer",
      border: `1px solid ${active ? colors.gold : colors.border}`,
      backgroundColor: active ? colors.goldWash : "transparent",
      color: active ? colors.goldBright : colors.textSecondary,
      whiteSpace: "nowrap",
      ...style,
    }}
  />
);
