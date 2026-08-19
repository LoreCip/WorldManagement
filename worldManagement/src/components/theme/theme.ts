import type { CSSProperties } from "react";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/700.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";

export const colors = {
  bgVoid: "#12141c", // app shell background
  bgPanel: "#181b26", // sidebar / chrome
  bgPanelRaised: "#222739", // inputs, hovered rows
  bgManuscript: "#1c1f2c", // editor / reading surface

  border: "#333850",
  borderSubtle: "#262b3a",

  textPrimary: "#eae6da",
  textSecondary: "#9c9686",
  textFaint: "#5f6275",

  gold: "#c9a15a",
  goldBright: "#e0bd7a",
  goldWash: "rgba(201, 161, 90, 0.12)",

  crimson: "#b6544a",
  crimsonBright: "#cf695e",
  crimsonWash: "rgba(182, 84, 74, 0.12)",

  verdigris: "#5f9484",
  indigo: "#7579ad",
} as const;

export const fonts = {
  display: "'Cormorant Garamond', 'Iowan Old Style', Georgia, 'Times New Roman', serif",
  body: "'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace",
} as const;

export const radii = {
  sm: "8px",
  md: "12px",
  lg: "18px",
  pill: "999px",
} as const;

export const Z_INDEX = {
  drawer: 900,
  modal: 1000,
  popover: 1100,
  dragOverlay: 3000,
} as const;

export const fieldLabelStyle: CSSProperties = {
  fontSize: "0.66rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: colors.textFaint,
  marginBottom: "0.3rem",
  display: "block",
};

export const inputStyle: CSSProperties = {
  width: "100%",
  backgroundColor: colors.bgPanelRaised,
  color: colors.textPrimary,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.sm,
  padding: "0.5rem 0.6rem",
  fontFamily: fonts.body,
  fontSize: "0.88rem",
  outline: "none",
  boxSizing: "border-box",
};

export type CategoryKey = "Lore" | "Personaggio" | "Luogo" | "Fazione";

export const categories: Record<CategoryKey, { color: string }> = {
  Lore: { color: colors.gold },
  Personaggio: { color: colors.crimson },
  Luogo: { color: colors.verdigris },
  Fazione: { color: colors.indigo },
};

export function getCategoryColor(category?: string): string {
  return categories[category as CategoryKey]?.color ?? colors.gold;
}

/**
 * Ritorna l'etichetta localizzata per la categoria specificata.
 * @param t La funzione di traduzione t ritornata da useLocalization()
 * @param category La chiave di categoria (es. "Lore", "Personaggio")
 */
export function getCategoryLabel(t: (key: string) => string, category?: string): string {
  if (!category) {
    return t("wiki.categories.Lore");
  }

  // Se la chiave esiste nel file json la traduciamo, altrimenti usiamo la stringa passata come fallback
  const translationKey = `wiki.categories.${category}`;
  const translated = t(translationKey);

  return translated !== translationKey ? translated : category;
}

// --- Bridge verso le CSS custom properties -------------------------------
function toCssVarName(key: string): string {
  return `--${key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}`;
}

export function injectThemeCssVariables() {
  if (typeof document === "undefined") return;
  const root = document.documentElement.style;
  Object.entries(colors).forEach(([key, value]) => {
    root.setProperty(toCssVarName(key), value);
  });
}
