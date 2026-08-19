import React from "react";
import { colors } from "../../theme/theme";

// Marchio "compendio" disegnato a mano: nessuna icona di lucide-react
// riproduce questo motivo a stella, quindi resta un componente SVG dedicato.
export const CompendiumIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z"
      stroke={colors.gold}
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="1.6" fill={colors.gold} />
  </svg>
);
