import React from "react";
import type { LucideIcon } from "lucide-react";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "icon" | "stepper";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Stato "premuto"/selezionato, per usi a toggle (nav rail, filtri...). */
  active?: boolean;
  /** Forza la forma a pillola indipendentemente dalla variante. */
  pill?: boolean;
  /** Icona lucide-react opzionale, renderizzata prima del testo (o da sola
   * per le varianti "icon"/"stepper"). */
  icon?: LucideIcon;
  iconSize?: number;
}

// Dimensioni fisse per le varianti icon-only: sostituiscono i tre valori
// incoerenti trovati nel codice esistente (38px, 30px, 20px) con una scala
// deliberata invece che accidentale.
const ICON_BUTTON_SIZE: Record<ButtonSize, number> = { sm: 26, md: 30, lg: 38 };
const STEPPER_SIZE = 20;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "secondary",
      size = "md",
      active,
      pill,
      icon: IconComponent,
      iconSize,
      className,
      children,
      style,
      ...rest
    },
    ref,
  ) => {
    const isIconOnly = variant === "icon" || variant === "stepper";
    const dimension = isIconOnly ? (variant === "stepper" ? STEPPER_SIZE : ICON_BUTTON_SIZE[size]) : undefined;

    const classNames = [
      styles.button,
      styles[variant],
      !isIconOnly ? styles[`size-${size}`] : "",
      pill ? styles.pill : "",
      active ? styles.active : "",
      isIconOnly ? styles.iconOnly : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        ref={ref}
        className={classNames}
        style={dimension ? { width: `${dimension}px`, height: `${dimension}px`, ...style } : style}
        {...rest}
      >
        {IconComponent && (
          <IconComponent size={iconSize ?? (isIconOnly ? Math.round(dimension! * 0.55) : 16)} strokeWidth={1.75} />
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
