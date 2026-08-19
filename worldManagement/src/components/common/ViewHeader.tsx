import React from "react";
import { ArrowLeft } from "lucide-react";
import { colors, fonts, radii } from "../theme/theme";
import { Button } from "./Button";

export interface ViewHeaderProps {
  title: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
  /** Controlli extra (select, search...) sulla stessa riga del titolo. */
  children?: React.ReactNode;
  /** Azioni allineate a destra (bottoni Modifica/Elimina/Lore...). */
  actions?: React.ReactNode;
}

// Intestazione condivisa per le viste di modulo. Prima MapHeader (<div>
// grezzo) e RelationsToolbar (<header> semantico) reimplementavano la
// stessa riga — titolo + tag + azioni — con markup e spaziatura diversi.
export const ViewHeader: React.FC<ViewHeaderProps> = ({
  title,
  icon,
  badge,
  onBack,
  backLabel,
  children,
  actions,
}) => {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.8rem",
        flexWrap: "wrap",
        padding: "0.85rem 1.2rem",
        borderBottom: `1px solid ${colors.borderSubtle}`,
        backgroundColor: colors.bgPanel,
        minWidth: 0,
      }}
    >
      {onBack && (
        <Button
          variant="secondary"
          size="sm"
          icon={ArrowLeft}
          onClick={onBack}
          style={{ backgroundColor: colors.bgPanelRaised, flexShrink: 0 }}
        >
          {backLabel && <span className="hide-on-small">{backLabel}</span>}
        </Button>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", minWidth: 0 }}>
        {icon}
        <h1
          style={{
            fontFamily: fonts.display,
            fontSize: "1.35rem",
            fontWeight: 500,
            color: colors.textPrimary,
            margin: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </h1>
        {badge && (
          <span
            style={{
              fontSize: "0.65rem",
              fontFamily: fonts.body,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              padding: "0.15rem 0.5rem",
              borderRadius: radii.pill,
              backgroundColor: `${colors.gold}15`,
              color: colors.gold,
              border: `1px solid ${colors.gold}33`,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {badge}
          </span>
        )}
      </div>

      {children}

      {actions && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            flexShrink: 0,
            marginLeft: "auto",
          }}
        >
          {actions}
        </div>
      )}
    </header>
  );
};
