import React, { useMemo } from "react";
import { useSettings } from "../context/SettingsContext";
import { settingsRegistry } from "../types/settingsRegistry";
import { SettingsField } from "../components/settings/SettingsField";
import { colors, fonts, fontImportTag } from "../components/theme/theme";

export const SettingsView: React.FC = () => {
  const { isLoaded, getSetting, setSetting } = useSettings();

  const grouped = useMemo(() => {
    const map = new Map<string, typeof settingsRegistry>();
    for (const def of settingsRegistry) {
      const list = map.get(def.category) ?? [];
      list.push(def);
      map.set(def.category, list);
    }
    return Array.from(map.entries());
  }, []);

  if (!isLoaded) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: colors.textFaint }}>
        Caricamento impostazioni…
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "2.5rem 3rem", backgroundColor: colors.bgVoid }}>
      <style>{fontImportTag}</style>

      <h1 style={{ fontFamily: fonts.display, fontSize: "1.6rem", color: colors.textPrimary, margin: "0 0 0.3rem" }}>
        Impostazioni
      </h1>
      <p style={{ color: colors.textFaint, fontSize: "0.85rem", margin: "0 0 2rem" }}>
        Preferenze generali dell'applicazione, valide per tutta l'ambientazione.
      </p>

      <div style={{ maxWidth: "680px" }}>
        {grouped.map(([category, defs]) => (
          <div key={category} style={{ marginBottom: "2.2rem" }}>
            <h2
              style={{
                fontFamily: fonts.display,
                fontSize: "1.05rem",
                color: colors.gold,
                margin: "0 0 0.5rem",
                paddingBottom: "0.4rem",
                borderBottom: `1px solid ${colors.border}`,
              }}
            >
              {category}
            </h2>
            {defs.map((def) => (
              <SettingsField
                key={def.key}
                definition={def}
                value={getSetting(def.key)}
                onChange={(v) => setSetting(def.key, v)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};