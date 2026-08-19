import React from "react";
import type { LucideIcon } from "lucide-react";
import { colors } from "../theme/theme";

export interface IconProps {
  icon: LucideIcon;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

// Wrapper sottile attorno alle icone lucide-react: applica i default del
// tema (colore, spessore tratto) invece di ripeterli ad ogni call site.
export const Icon: React.FC<IconProps> = ({
  icon: IconComponent,
  size = 18,
  color = colors.textPrimary,
  strokeWidth = 1.75,
  className,
}) => (
  <IconComponent size={size} color={color} strokeWidth={strokeWidth} className={className} aria-hidden="true" />
);
