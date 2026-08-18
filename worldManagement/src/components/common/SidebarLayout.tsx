import React from "react";
import { colors, fonts } from "../theme/theme";

export interface SidebarLayoutProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  width?: string | number;
  /** Contenuto sotto l'header: search, liste, azioni di modulo... */
  children: React.ReactNode;
}

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({
  icon,
  title,
  subtitle,
  width = "290px",
  children,
}) => {
  return (
    <aside
      style={{
        width,
        borderRight: `1px solid ${colors.borderSubtle}`,
        display: "flex",
        flexDirection: "column",
        padding: "1.5rem 1.1rem",
        backgroundColor: colors.bgPanel,
        color: colors.textPrimary,
        fontFamily: fonts.body,
        boxSizing: "border-box",
        height: "100%",
      }}
    >
      <div style={{ marginBottom: "1.2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
          <span style={{ fontSize: "1.2rem", lineHeight: 1, display: "flex" }}>{icon}</span>
          <h1 style={{ fontFamily: fonts.display, fontSize: "1.4rem", fontWeight: 600, margin: 0 }}>
            {title}
          </h1>
        </div>

        {subtitle && (
          <div
            style={{
              fontSize: "0.66rem",
              letterSpacing: "0.13em",
              textTransform: "uppercase",
              color: colors.textFaint,
              marginTop: "0.3rem",
              marginLeft: "1.8rem",
            }}
          >
            {subtitle}
          </div>
        )}

        <div
          style={{
            height: "1px",
            marginTop: "1rem",
            background: `linear-gradient(90deg, ${colors.gold}77, transparent 75%)`,
          }}
        />
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </div>
    </aside>
  );
};
