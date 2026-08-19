import React, { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Settings } from "lucide-react";
import { invokeSafe } from "../lib/ipc";
import { useLocalization } from "../context/LocalizationContext";
import { colors, fonts, radii } from "../components/theme/theme";
import { LAST_VISITED_TAB_KEY } from "../hooks/useAppShell";
import { Button } from "../components/common/Button";
import { navIcons } from "../components/common/navIcons";
import styles from "./HubView.module.css";

// Tutte le tab di contenuto rappresentate nella hub, incluse Relazioni.
export type HubModuleKey = "wiki" | "maps" | "characters" | "timeline" | "relations";

interface HubViewProps {
  onNavigate: (tab: HubModuleKey) => void;
  onOpenSettings: () => void;
}

interface HubModuleDef {
  key: HubModuleKey;
  numeral: string;
  icon: LucideIcon;
  titleKey: string;
  descriptionKey: string;
  countKey: string;
  accent: string;
}

// Definizione statica dei moduli: icona, colore d'accento e texture
// sono identità proprie del modulo, indipendenti da quale slot occupa.
// Le icone riusano la stessa mappa della nav rail (navIcons) cosi'
// l'identita' visiva di ogni modulo resta coerente tra hub e nav.
const MODULES: HubModuleDef[] = [
  {
    key: "wiki",
    numeral: "I",
    icon: navIcons.wiki,
    titleKey: "hub.wikiTitle",
    descriptionKey: "hub.wikiDescription",
    countKey: "hub.wikiCount",
    accent: colors.gold,
  },
  {
    key: "maps",
    numeral: "II",
    icon: navIcons.maps,
    titleKey: "hub.mapsTitle",
    descriptionKey: "hub.mapsDescription",
    countKey: "hub.mapsCount",
    accent: colors.verdigris,
  },
  {
    key: "characters",
    numeral: "III",
    icon: navIcons.characters,
    titleKey: "hub.charactersTitle",
    descriptionKey: "hub.charactersDescription",
    countKey: "hub.charactersCount",
    accent: colors.crimson,
  },
  {
    key: "timeline",
    numeral: "IV",
    icon: navIcons.timeline,
    titleKey: "hub.timelineTitle",
    descriptionKey: "hub.timelineDescription",
    countKey: "hub.timelineCount",
    accent: colors.indigo,
  },
  {
    key: "relations",
    numeral: "V",
    icon: navIcons.relations,
    titleKey: "hub.relationsTitle",
    descriptionKey: "hub.relationsDescription",
    countKey: "hub.relationsCount",
    accent: colors.goldBright,
  },
];

// 5 slot: "hero" e "wide" grandi, "s1"/"s2" piccoli, "s3" striscia larga in
// fondo (stesso ruolo visivo che prima occupava la striscia fissa di Relazioni,
// ma ora partecipa alla rotazione come chiunque altro).
const SLOTS = ["hero", "wide", "s1", "s2", "s3"] as const;
type Slot = (typeof SLOTS)[number];

const SLOT_GRID_AREA: Record<Slot, string> = {
  hero: "1 / 1 / 3 / 3",
  wide: "1 / 3 / 2 / 5",
  s1: "2 / 3 / 3 / 4",
  s2: "2 / 4 / 3 / 5",
  s3: "3 / 1 / 4 / 5",
};

export const HubView: React.FC<HubViewProps> = ({ onNavigate, onOpenSettings }) => {
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
    relations: null,
  });

  useEffect(() => {
    let lastVisited: HubModuleKey | null = null;
    try {
      const raw = localStorage.getItem(LAST_VISITED_TAB_KEY);
      if (raw && MODULES.some((m) => m.key === raw)) lastVisited = raw as HubModuleKey;
    } catch {
      lastVisited = null;
    }

    if (lastVisited) {
      setOrder([lastVisited, ...MODULES.map((m) => m.key).filter((k) => k !== lastVisited)]);
    }
  }, []);

  useEffect(() => {
    const loadCounts = async () => {
      const [articles, maps, sheets, events, graphNodes] = await Promise.all([
        invokeSafe<unknown[]>("get_all_articles"),
        invokeSafe<unknown[]>("get_all_maps"),
        invokeSafe<unknown[]>("get_character_sheets"),
        invokeSafe<unknown[]>("get_all_timeline_events"),
        invokeSafe<unknown[]>("get_all_graph_nodes"),
      ]);

      setCounts({
        wiki: articles?.length ?? null,
        maps: maps?.length ?? null,
        characters: sheets?.length ?? null,
        timeline: events?.length ?? null,
        relations: graphNodes?.length ?? null,
      });
    };

    loadCounts();
  }, []);

  const slotOf = (key: HubModuleKey): Slot => {
    const idx = order.indexOf(key);
    return SLOTS[idx] ?? "s3";
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
      <Button
        variant="icon"
        size="lg"
        icon={Settings}
        onClick={onOpenSettings}
        title={t("hub.settingsTooltip")}
        style={{ position: "fixed", top: "1.4rem", right: "1.6rem" }}
      />

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
          className={styles["hub-bento"]}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gridTemplateRows: "190px 130px 96px",
            gap: "1rem",
          }}
        >
          {MODULES.map((mod) => {
            const slot = slotOf(mod.key);
            const count = counts[mod.key];
            const isStrip = slot === "s3";

            return (
              <div
                key={mod.key}
                className={[
                  styles["hub-tile"],
                  styles[`hub-tile-${mod.key}`],
                  styles[`hub-slot-${slot}`],
                ].join(" ")}
                style={{
                  gridArea: SLOT_GRID_AREA[slot],
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.bgPanel,
                  borderRadius: radii.sm,
                  padding: isStrip ? "0.85rem 1.3rem" : "1.3rem",
                  position: "relative",
                  overflow: "hidden",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: isStrip ? "row" : "column",
                  alignItems: isStrip ? "center" : "stretch",
                  justifyContent: isStrip ? "flex-start" : "flex-end",
                  gap: isStrip ? "0.8rem" : undefined,
                }}
                onClick={() => onNavigate(mod.key)}
              >
                <div
                  className={styles["hub-tile-accent"]}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "3px",
                    backgroundColor: mod.accent,
                    zIndex: 2,
                  }}
                />

                {isStrip ? (
                  <>
                    <span
                      className={styles["hub-tile-num"]}
                      style={{
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
                    <span className={styles["hub-tile-icon"]} style={{ zIndex: 2 }}>
                      <mod.icon size={24} color={mod.accent} strokeWidth={1.5} aria-hidden="true" />
                    </span>
                    <span
                      className={styles["hub-tile-title"]}
                      style={{
                        zIndex: 2,
                        fontFamily: fonts.display,
                        fontWeight: 600,
                        color: colors.textPrimary,
                      }}
                    >
                      {t(mod.titleKey)}
                    </span>
                    <span
                      className={styles["hub-tile-desc"]}
                      style={{ zIndex: 2, fontSize: "0.76rem", color: colors.textFaint }}
                    >
                      {t(mod.descriptionKey)}
                    </span>
                    <span
                      style={{
                        zIndex: 2,
                        marginLeft: "auto",
                        fontFamily: fonts.mono,
                        fontSize: "0.7rem",
                        color: colors.textFaint,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {count !== null ? `${count} ${t(mod.countKey)}` : "—"}
                    </span>
                  </>
                ) : (
                  <>
                    <span
                      className={styles["hub-tile-num"]}
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
                      className={styles["hub-tile-icon"]}
                      style={{
                        position: "absolute",
                        top: "0.95rem",
                        right: "1.1rem",
                        zIndex: 2,
                      }}
                    >
                      <mod.icon
                        size={slot === "hero" ? 34 : 24}
                        color={mod.accent}
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                    </span>

                    <span
                      className={styles["hub-tile-title"]}
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
                      className={styles["hub-tile-desc"]}
                      style={{
                        position: "relative",
                        zIndex: 2,
                        fontSize: "0.76rem",
                        color: colors.textFaint,
                        marginTop: "0.3rem",
                      }}
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
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
