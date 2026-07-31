import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/700.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";

export const colors = {
	bgVoid: "#12141c",          // app shell background
	bgPanel: "#181b26",         // sidebar / chrome
	bgPanelRaised: "#222739",   // inputs, hovered rows
	bgManuscript: "#1c1f2c",    // editor / reading surface

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

export type CategoryKey = "Lore" | "Personaggio" | "Luogo" | "Fazione";

export const categories: Record<CategoryKey, { label: string; color: string }> = {
	Lore: { label: "Lore / Storia", color: colors.gold },
	Personaggio: { label: "Personaggio", color: colors.crimson },
	Luogo: { label: "Luogo", color: colors.verdigris },
	Fazione: { label: "Fazione", color: colors.indigo },
};

export function getCategoryColor(category?: string): string {
	return categories[category as CategoryKey]?.color ?? colors.gold;
}

export function getCategoryLabel(category?: string): string {
	return categories[category as CategoryKey]?.label ?? category ?? "Lore / Storia";
}

