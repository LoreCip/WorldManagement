import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSettings } from "../context/SettingsContext";
import { useLocalization } from "../context/LocalizationContext";
import { colors, fonts, radii } from "../components/theme/theme";

// Le uniche tab che hanno una "casella" nella hub. Relazioni resta fuori
// finché non è implementata: non ha senso farla diventare "hero".
export type HubModuleKey = "wiki" | "maps" | "characters" | "timeline";

interface HubViewProps {
  onNavigate: (tab: HubModuleKey) => void;
  onOpenSettings: () => void;
}

interface HubModuleDef {
  key: HubModuleKey;
  numeral: string;
  icon: string;
  titleKey: string;
  descriptionKey: string;
  countKey: string;
  accent: string;
}

// Definizione statica dei moduli: icona, colore d'accento e texture
// sono identità proprie del modulo, indipendenti da quale slot occupa.
const MODULES: HubModuleDef[] = [
  {
    key: "wiki",
    numeral: "I",
    icon: "📜",
    titleKey: "hub.wikiTitle",
    descriptionKey: "hub.wikiDescription",
    countKey: "hub.wikiCount",
    accent: colors.gold,
  },
  {
    key: "maps",
    numeral: "II",
    icon: "🗺️",
    titleKey: "hub.mapsTitle",
    descriptionKey: "hub.mapsDescription",
    countKey: "hub.mapsCount",
    accent: colors.verdigris,
  },
  {
    key: "characters",
    numeral: "III",
    icon: "🎭",
    titleKey: "hub.charactersTitle",
    descriptionKey: "hub.charactersDescription",
    countKey: "hub.charactersCount",
    accent: colors.crimson,
  },
  {
    key: "timeline",
    numeral: "IV",
    icon: "⏳",
    titleKey: "hub.timelineTitle",
    descriptionKey: "hub.timelineDescription",
    countKey: "hub.timelineCount",
    accent: colors.indigo,
  },
];

const SLOTS = ["hero", "wide", "s1", "s2"] as const;
type Slot = (typeof SLOTS)[number];

const SLOT_GRID_AREA: Record<Slot, string> = {
  hero: "1 / 1 / 3 / 3",
  wide: "1 / 3 / 2 / 5",
  s1: "2 / 3 / 3 / 4",
  s2: "2 / 4 / 3 / 5",
};

export const HubView: React.FC<HubViewProps> = ({ onNavigate, onOpenSettings }) => {
  const { getSetting, isLoaded } = useSettings();
  // Gli hook vanno sempre chiamati al livello più alto del componente,
  // mai dentro useEffect/if/cicli — per questo va qui, non più giù.
  const { t } = useLocalization();

  // Ordine dei moduli: il primo occupa lo slot "hero". Parte da un ordine
  // fisso e si aggiorna appena sappiamo qual è stata l'ultima tab visitata.
  const [order, setOrder] = useState<HubModuleKey[]>(MODULES.map((m) => m.key));

  // Conteggi statici, caricati una volta all'apertura della hub (non un feed live).
  const [counts, setCounts] = useState<Record<HubModuleKey, number | null>>({
    wiki: null,
    maps: null,
    characters: null,
    timeline: null,
  });

  useEffect(() => {
    if (!isLoaded) return;

    const lastVisited = getSetting<HubModuleKey | null>("last_visited_tab");
    if (lastVisited && MODULES.some((m) => m.key === lastVisited)) {
      setOrder([lastVisited, ...MODULES.map((m) => m.key).filter((k) => k !== lastVisited)]);
    }
  }, [isLoaded, getSetting]);

  useEffect(() => {
    // NOTA: i nomi dei comandi Tauri qui sotto sono un'ipotesi ragionevole
    // in base alla convenzione get_all_settings/save_setting già in uso.
    // Vanno allineati ai comandi reali esposti da ciascun modulo
    // (modules/wiki/commands.rs, modules/maps/commands.rs, ecc.).
    // Se un comando fallisce, il conteggio resta vuoto invece di rompere la hub.
    const loadCounts = async () => {
      const safeInvoke = async <T,>(cmd: string): Promise<T[] | null> => {
        try {
          return await invoke<T[]>(cmd);
        } catch (err) {
          console.warn(`Impossibile caricare conteggio da "${cmd}":`, err);
          return null;
        }
      };

      const [articles, maps, sheets, events] = await Promise.all([
        safeInvoke("get_all_articles"),
        safeInvoke("get_all_maps"),
        safeInvoke("get_character_sheets"),
        safeInvoke("get_all_timeline_events"),
      ]);

      setCounts({
        wiki: articles?.length ?? null,
        maps: maps?.length ?? null,
        characters: sheets?.length ?? null,
        timeline: events?.length ?? null,
      });
    };

    loadCounts();
  }, []);

  const slotOf = (key: HubModuleKey): Slot => {
    const idx = order.indexOf(key);
    return SLOTS[idx] ?? "s2";
  };

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "6vh 1.5rem 4rem",
        backgroundColor: colors.bgVoid,
        position: "relative",
      }}
    >
      <style>{hubStyleTag}</style>

      <button
        onClick={onOpenSettings}
        title={t("hub.settingsTooltip")}
        style={{
          position: "fixed",
          top: "1.4rem",
          right: "1.6rem",
          width: "38px",
          height: "38px",
          borderRadius: "50%",
          border: `1px solid ${colors.border}`,
          backgroundColor: colors.bgPanel,
          color: colors.textFaint,
          fontSize: "1rem",
          cursor: "pointer",
        }}
      >
        ⚙️
      </button>

      <div style={{ width: "100%", maxWidth: "860px" }}>
        <div style={{ textAlign: "center", marginBottom: "2.6rem" }}>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: "0.68rem",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: colors.gold,
              opacity: 0.7,
              marginBottom: "0.9rem",
            }}
          >
            {t("hub.eyebrow")}
          </div>
          <h1
            style={{
              fontFamily: fonts.display,
              fontWeight: 500,
              fontSize: "clamp(2.2rem, 5vw, 3.1rem)",
              margin: "0 0 0.4rem",
              color: colors.textPrimary,
            }}
          >
            {t("hub.title")}
          </h1>
          <div
            style={{
              fontFamily: fonts.display,
              fontStyle: "italic",
              fontSize: "1.05rem",
              color: colors.textFaint,
            }}
          >
            {t("hub.subtitle")}
          </div>
        </div>

        <div
          className="hub-bento"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gridTemplateRows: "190px 130px",
            gap: "1rem",
          }}
        >
          {MODULES.map((mod) => {
            const slot = slotOf(mod.key);
            const count = counts[mod.key];
            return (
              <div
                key={mod.key}
                className={`hub-tile hub-tile-${mod.key} hub-slot-${slot}`}
                style={{
                  gridArea: SLOT_GRID_AREA[slot],
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.bgPanel,
                  borderRadius: radii.sm,
                  padding: "1.3rem",
                  position: "relative",
                  overflow: "hidden",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                }}
                onClick={() => onNavigate(mod.key)}
              >
                <div
                  className="hub-tile-accent"
                  style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", backgroundColor: mod.accent, zIndex: 2 }}
                />
                <span
                  className="hub-tile-num"
                  style={{
                    position: "absolute",
                    top: "1rem",
                    left: "1.2rem",
                    zIndex: 2,
                    fontFamily: fonts.display,
                    fontStyle: "italic",
                    fontSize: "1rem",
                    color: colors.gold,
                    opacity: 0.7,
                  }}
                >
                  {mod.numeral}
                </span>
                <span
                  className="hub-tile-icon"
                  style={{ position: "absolute", top: "0.95rem", right: "1.1rem", zIndex: 2, fontSize: "1.5rem" }}
                >
                  {mod.icon}
                </span>

                <span
                  className="hub-tile-title"
                  style={{
                    position: "relative",
                    zIndex: 2,
                    fontFamily: fonts.display,
                    fontWeight: 600,
                    color: colors.textPrimary,
                  }}
                >
                  {t(mod.titleKey)}
                </span>
                <span
                  className="hub-tile-desc"
                  style={{ position: "relative", zIndex: 2, fontSize: "0.76rem", color: colors.textFaint, marginTop: "0.3rem" }}
                >
                  {t(mod.descriptionKey)}
                </span>
                <span
                  style={{
                    position: "relative",
                    zIndex: 2,
                    fontFamily: fonts.mono,
                    fontSize: "0.7rem",
                    color: colors.textFaint,
                    marginTop: "0.5rem",
                  }}
                >
                  {count !== null ? `${count} ${t(mod.countKey)}` : "—"}
                </span>
              </div>
            );
          })}

          {/* Relazioni: striscia fissa, mai coinvolta nella rotazione */}
          <div
            style={{
              gridColumn: "1 / 5",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: "0.8rem",
              padding: "0.85rem 1.3rem",
              border: `1px dashed ${colors.border}`,
              borderRadius: radii.sm,
              opacity: 0.5,
              cursor: "default",
            }}
          >
            <span style={{ fontFamily: fonts.display, fontStyle: "italic", fontSize: "1rem", color: colors.gold, opacity: 0.7 }}>V</span>
            <span style={{ fontSize: "1.5rem" }}>🌳</span>
            <span style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: "1rem", color: colors.textPrimary }}>
              {t("hub.relationsTitle")}
            </span>
            <span
              style={{
                marginLeft: "auto",
                fontFamily: fonts.mono,
                fontSize: "0.6rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: colors.crimson,
                border: `1px solid ${colors.crimson}55`,
                padding: "0.1rem 0.4rem",
                borderRadius: "3px",
              }}
            >
              {t("hub.relationsBadge")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Comportamenti che le sole inline style non gestiscono bene (hover, texture
// di sfondo, dimensioni del testo in base allo slot) — stesso pattern di
// <style>{...}</style> già usato altrove nel progetto.
const hubStyleTag = `
  .hub-tile { transition: transform .3s ease, background-color .3s ease, border-color .3s ease; }
  .hub-tile:hover { transform: translateY(-3px); }
  .hub-tile-icon { transition: transform .35s ease; }
  .hub-tile:hover .hub-tile-icon { transform: scale(1.1); }
  .hub-tile-title { transition: color .3s ease, font-size .3s ease; font-size: 1.15rem; }

  .hub-slot-hero .hub-tile-title { font-size: 1.8rem; }
  .hub-slot-hero .hub-tile-icon { font-size: 2.1rem; }
  .hub-slot-wide .hub-tile-title { font-size: 1.35rem; }
  .hub-slot-s1 .hub-tile-desc, .hub-slot-s2 .hub-tile-desc { display: none; }
  .hub-slot-s1 .hub-tile-title, .hub-slot-s2 .hub-tile-title { font-size: 1.05rem; }

  /* Texture di sfondo — identità propria di ogni modulo */
  .hub-tile-wiki::before {
    content: ""; position: absolute; inset: 0; opacity: 0.5; transition: opacity .35s ease;
    background-image: repeating-linear-gradient(115deg, ${colors.gold}1a 0px, ${colors.gold}1a 1px, transparent 1px, transparent 9px);
  }
  .hub-tile-maps::before {
    content: ""; position: absolute; inset: 0; opacity: 0.5; transition: opacity .35s ease;
    background-image: repeating-radial-gradient(circle at 75% 20%, ${colors.verdigris}29 0px, ${colors.verdigris}29 1px, transparent 1px, transparent 14px);
  }
  .hub-tile-characters::before {
    content: ""; position: absolute; inset: 0; opacity: 0.5; transition: opacity .35s ease;
    background: radial-gradient(ellipse 140px 140px at 80% 15%, ${colors.crimson}29, transparent 70%);
  }
  .hub-tile-timeline::before {
    content: ""; position: absolute; inset: 0; opacity: 0.5; transition: opacity .35s ease;
    background-image: repeating-linear-gradient(0deg, ${colors.indigo}1f 0px, ${colors.indigo}1f 1px, transparent 1px, transparent 22px);
  }
  .hub-tile:hover::before { opacity: 0.85; }

  .hub-tile-wiki:hover { border-color: ${colors.gold}80 !important; }
  .hub-tile-wiki:hover .hub-tile-title { color: ${colors.gold}; }
  .hub-tile-maps:hover { border-color: ${colors.verdigris}80 !important; }
  .hub-tile-maps:hover .hub-tile-title { color: ${colors.verdigris}; }
  .hub-tile-characters:hover { border-color: ${colors.crimson}80 !important; }
  .hub-tile-characters:hover .hub-tile-title { color: ${colors.crimson}; }
  .hub-tile-timeline:hover { border-color: ${colors.indigo}80 !important; }
  .hub-tile-timeline:hover .hub-tile-title { color: ${colors.indigo}; }

  @media (max-width: 640px) {
    .hub-bento { grid-template-columns: 1fr 1fr !important; grid-template-rows: auto !important; }
    .hub-tile { grid-area: auto !important; }
  }
`;