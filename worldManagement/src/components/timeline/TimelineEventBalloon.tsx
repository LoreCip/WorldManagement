import React, { useEffect } from "react";
import { TimelineEvent, TimePrecision, TimelineCategory } from "../../types/timeline";
import { timeInputToValue, valueToTimeInput } from "../../utils/timeConversion";
import { colors, fonts, radii } from "../theme/theme";
import { SelectedAnchor } from "./TimelineCanvas";
import { useLocalization } from "../../context/LocalizationContext";
import { useLinkableOptions } from "../../hooks/useLinkableOptions";
import { Z_INDEX } from "../common/zIndex";

interface TimelineEventBalloonProps {
    event: TimelineEvent;
    anchor: SelectedAnchor;
    isEditing: boolean;
    categories: TimelineCategory[];
    onChange: (updated: TimelineEvent) => void;
    onSave: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onClose: () => void;
    onNavigateToArticle?: (articleId: string) => void;
    onNavigateToMap?: (mapId: string) => void;
}

const BALLOON_WIDTH = 300;
const GAP = 14; // distanza fra il marker e il balloon

export const TimelineEventBalloon: React.FC<TimelineEventBalloonProps> = ({
    event,
    anchor,
    isEditing,
    categories,
    onChange,
    onSave,
    onEdit,
    onDelete,
    onClose,
    onNavigateToArticle,
    onNavigateToMap,
}) => {
    const { t } = useLocalization();

    const { articles, maps } = useLinkableOptions({ articles: true, maps: true });
    const timeInput = valueToTimeInput(event.time_value);

    // Chiudi con Escape
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    const updateTime = (patch: Partial<{ year: number; month: number | null; day: number | null }>) => {
        const next = { ...timeInput, ...patch };
        onChange({ ...event, time_value: timeInputToValue(next) });
    };

    const setPrecision = (precision: TimePrecision) => {
        onChange({
            ...event,
            precision,
            time_value: timeInputToValue({
                year: timeInput.year,
                month: precision === "year" ? null : timeInput.month,
                day: precision === "day" ? timeInput.day : null,
            }),
        });
    };

    const hasDuration = event.end_time_value != null;
    const endTimeInput = valueToTimeInput(event.end_time_value ?? event.time_value);

    const toggleDuration = () => {
        onChange({ ...event, end_time_value: hasDuration ? null : timeInputToValue(timeInput) });
    };

    const updateEndTime = (patch: Partial<{ year: number; month: number | null; day: number | null }>) => {
        const next = { ...endTimeInput, ...patch };
        onChange({ ...event, end_time_value: timeInputToValue(next) });
    };

    const linkedArticle = articles.find((a) => a.id === event.article_id);
    const linkedMap = maps.find((m) => m.id === event.map_id);
    const linkedCategory = categories.find((c) => c.id === event.category_id);

    const labelStyle: React.CSSProperties = {
        display: "block", fontSize: "0.66rem", letterSpacing: "0.05em", textTransform: "uppercase",
        color: colors.textFaint, marginBottom: "0.25rem", fontWeight: 600,
    };

    const inputStyle: React.CSSProperties = {
        width: "100%", padding: "0.4rem 0.5rem", backgroundColor: colors.bgManuscript,
        border: `1px solid ${colors.borderSubtle}`, borderRadius: radii.sm, color: colors.textPrimary,
        fontFamily: fonts.body, fontSize: "0.82rem", outline: "none", boxSizing: "border-box",
    };

    const btnBase: React.CSSProperties = {
        padding: "0.4rem 0.75rem", borderRadius: radii.md, cursor: "pointer",
        fontFamily: fonts.body, fontWeight: 600, fontSize: "0.76rem",
    };

    const isAbove = anchor.side === "above";

    return (
        <div
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            style={{
                position: "fixed",              // <-- era "absolute"
                left: `${anchor.x}px`,
                top: `${anchor.y + (isAbove ? -GAP : GAP)}px`,
                transform: `translate(-50%, ${isAbove ? "-100%" : "0"})`,
                width: `${BALLOON_WIDTH}px`,
                maxHeight: "min(420px, 70vh)",
                overflowY: "auto",
                overscrollBehavior: "contain",
                backgroundColor: colors.bgPanel,
                border: `1px solid ${colors.borderSubtle}`,
                borderRadius: radii.lg,
                padding: "1rem",
                boxShadow: "0 8px 28px rgba(0,0,0,0.5)",
                zIndex: Z_INDEX.drawer,
            }}
        >

            {/* Freccina che punta al marker */}
            <div
                style={{
                    position: "absolute",
                    left: "50%",
                    [isAbove ? "bottom" : "top"]: "-8px",
                    transform: "translateX(-50%)",
                    width: 0, height: 0,
                    borderLeft: "8px solid transparent",
                    borderRight: "8px solid transparent",
                    [isAbove ? "borderTop" : "borderBottom"]: `8px solid ${colors.bgPanel}`,
                } as React.CSSProperties}
            />

            <button
                onClick={onClose}
                title={t("common.close")}
                style={{
                    position: "absolute", top: "0.5rem", right: "0.5rem",
                    background: "none", border: "none", color: colors.textFaint,
                    cursor: "pointer", fontSize: "1rem", lineHeight: 1, padding: "0.2rem",
                }}
            >
                {/* Simbolo, non testo: non serve passare da t() */}
                ×
            </button>

            {isEditing ? (
                <input
                    value={event.title}
                    onChange={(e) => onChange({ ...event, title: e.target.value })}
                    placeholder={t("timeline.balloon.titlePlaceholder")}
                    style={{ ...inputStyle, fontFamily: fonts.display, fontSize: "1rem", fontWeight: 600, marginBottom: "0.7rem", paddingRight: "1.5rem" }}
                />
            ) : (
                <h3 style={{ fontFamily: fonts.display, color: colors.textPrimary, margin: "0 1.2rem 0.6rem 0", fontSize: "1.05rem" }}>
                    {event.title}
                </h3>
            )}

            {/* Precisione + tempo */}
            <div style={{ marginBottom: "0.7rem" }}>
                {isEditing && (
                    <div style={{ display: "flex", gap: "0.3rem", marginBottom: "0.4rem" }}>
                        {(["year", "month", "day"] as TimePrecision[]).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPrecision(p)}
                                style={{
                                    ...btnBase, padding: "0.25rem 0.5rem", fontSize: "0.68rem",
                                    backgroundColor: event.precision === p ? colors.gold : "transparent",
                                    color: event.precision === p ? colors.bgVoid : colors.gold,
                                    border: `1px solid ${colors.gold}77`,
                                }}
                            >
                                {p === "year" ? t("timeline.balloon.year") : p === "month" ? t("timeline.balloon.month") : t("timeline.balloon.day")}
                            </button>
                        ))}
                    </div>
                )}

                {isEditing ? (
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                        <input
                            type="number" value={timeInput.year}
                            onChange={(e) => updateTime({ year: parseInt(e.target.value || "0", 10) })}
                            placeholder={t("timeline.balloon.year")} style={{ ...inputStyle, flex: 1 }}
                        />
                        {event.precision !== "year" && (
                            <input
                                type="number" min={1} max={12} value={timeInput.month ?? 1}
                                onChange={(e) => updateTime({ month: clampInt(e.target.value, 1, 12) })}
                                placeholder={t("timeline.balloon.month")} style={{ ...inputStyle, flex: 1 }}
                            />
                        )}
                        {event.precision === "day" && (
                            <input
                                type="number" min={1} max={30} value={timeInput.day ?? 1}
                                onChange={(e) => updateTime({ day: clampInt(e.target.value, 1, 30) })}
                                placeholder={t("timeline.balloon.day")} style={{ ...inputStyle, flex: 1 }}
                            />
                        )}
                    </div>
                ) : (
                    <div style={{ color: colors.gold, fontFamily: fonts.display, fontSize: "0.92rem" }}>
                        {formatDisplayTime(event, t)}
                    </div>
                )}
            </div>

            {/* Durata */}
            <div style={{ marginBottom: "0.7rem" }}>
                {isEditing ? (
                    <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.76rem", color: colors.textSecondary, cursor: "pointer" }}>
                        <input type="checkbox" checked={hasDuration} onChange={toggleDuration} />
                        {t("timeline.balloon.hasDuration")}
                    </label>
                ) : hasDuration ? (
                    <div style={{ color: colors.textSecondary, fontSize: "0.78rem" }}>
                        {t("timeline.balloon.until", { date: formatDisplayTime({ ...event, time_value: event.end_time_value! }, t) })}
                    </div>
                ) : null}

                {isEditing && hasDuration && (
                    <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.4rem" }}>
                        <input
                            type="number" value={endTimeInput.year}
                            onChange={(e) => updateEndTime({ year: parseInt(e.target.value || "0", 10) })}
                            placeholder={t("timeline.balloon.endYearPlaceholder")} style={{ ...inputStyle, flex: 1 }}
                        />
                        {event.precision !== "year" && (
                            <input
                                type="number" min={1} max={12} value={endTimeInput.month ?? 1}
                                onChange={(e) => updateEndTime({ month: clampInt(e.target.value, 1, 12) })}
                                placeholder={t("timeline.balloon.endMonthPlaceholder")} style={{ ...inputStyle, flex: 1 }}
                            />
                        )}
                        {event.precision === "day" && (
                            <input
                                type="number" min={1} max={30} value={endTimeInput.day ?? 1}
                                onChange={(e) => updateEndTime({ day: clampInt(e.target.value, 1, 30) })}
                                placeholder={t("timeline.balloon.endDayPlaceholder")} style={{ ...inputStyle, flex: 1 }}
                            />  
                        )}
                    </div>
                )}
            </div>

            {/* Categoria */}
            <div style={{ marginBottom: "0.7rem" }}>
                <label style={labelStyle}>{t("timeline.balloon.cat")}</label>
                {isEditing ? (
                    <select
                        value={event.category_id ?? ""}
                        onChange={(e) => onChange({ ...event, category_id: e.target.value || null })}
                        style={inputStyle}
                    >
                        <option value="">{t("timeline.balloon.noCatF")}</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                        ))}
                    </select>
                ) : linkedCategory ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", color: colors.textPrimary, fontSize: "0.82rem" }}>
                        <span>{linkedCategory.icon}</span>
                        <span style={{ width: "9px", height: "9px", borderRadius: "50%", backgroundColor: linkedCategory.color }} />
                        {linkedCategory.name}
                    </span>
                ) : (
                    <span style={{ color: colors.textFaint, fontStyle: "italic", fontSize: "0.78rem" }}>{t("timeline.balloon.noCatF")}</span>
                )}
            </div>

            {/* Descrizione */}
            <div style={{ marginBottom: "0.7rem" }}>
                <label style={labelStyle}>{t("common.description")}</label>
                {isEditing ? (
                    <textarea
                        value={event.description}
                        onChange={(e) => onChange({ ...event, description: e.target.value })}
                        rows={3}
                        style={{ ...inputStyle, resize: "vertical" }}
                    />
                ) : (
                    <div style={{ color: colors.textPrimary, lineHeight: 1.5, fontSize: "0.84rem", whiteSpace: "pre-wrap" }}>
                        {event.description || <span style={{ color: colors.textFaint, fontStyle: "italic" }}>{t("timeline.balloon.noDescr")}</span>}
                    </div>
                )}
            </div>

            {/* Collegamenti */}
            <div style={{ marginBottom: "0.9rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div>
                    <label style={labelStyle}>{t("timeline.balloon.article")}</label>
                    {isEditing ? (
                        <select
                            value={event.article_id ?? ""}
                            onChange={(e) => onChange({ ...event, article_id: e.target.value || null })}
                            style={inputStyle}
                        >
                            <option value="">{t("timeline.balloon.noCatM")}</option>
                            {articles.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
                        </select>
                    ) : linkedArticle ? (
                        <button
                            onClick={() => onNavigateToArticle?.(linkedArticle.id)}
                            style={{
                                ...btnBase, backgroundColor: `${colors.gold}1f`, color: colors.gold,
                                border: `1px solid ${colors.gold}59`, borderRadius: radii.pill,
                            }}
                        >
                            📜 {linkedArticle.title} →
                        </button>
                    ) : (
                        <span style={{ color: colors.textFaint, fontStyle: "italic", fontSize: "0.78rem" }}>{t("timeline.balloon.noCatM")}</span>
                    )}
                </div>

                <div>
                    <label style={labelStyle}>{t("timeline.balloon.map")}</label>
                    {isEditing ? (
                        <select
                            value={event.map_id ?? ""}
                            onChange={(e) => onChange({ ...event, map_id: e.target.value || null })}
                            style={inputStyle}
                        >
                            <option value="">{t("timeline.balloon.noCatF")}</option>
                            {maps.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                        </select>
                    ) : linkedMap ? (
                        <button
                            onClick={() => onNavigateToMap?.(linkedMap.id)}
                            style={{
                                ...btnBase, backgroundColor: `${colors.gold}1f`, color: colors.gold,
                                border: `1px solid ${colors.gold}59`, borderRadius: radii.pill,
                            }}
                        >
                            🗺️ {linkedMap.title} →
                        </button>
                    ) : (
                        <span style={{ color: colors.textFaint, fontStyle: "italic", fontSize: "0.78rem" }}>{t("timeline.balloon.noCatF")}</span>
                    )}
                </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.4rem" }}>
                {isEditing ? (
                    <>
                        <button onClick={onSave} style={{ ...btnBase, backgroundColor: colors.gold, color: colors.bgVoid, border: "none" }}>
                            {t("common.save")}
                        </button>
                        {event.id && (
                            <button
                                onClick={onDelete}
                                style={{ ...btnBase, backgroundColor: "transparent", color: colors.crimson, border: `1px solid ${colors.crimson}77` }}
                            >
                                {t("common.delete")}
                            </button>
                        )}
                    </>
                ) : (
                    <button onClick={onEdit} style={{ ...btnBase, backgroundColor: "transparent", color: colors.gold, border: `1px solid ${colors.gold}77` }}>
                        {t("common.edit")}
                    </button>
                )}
            </div>
        </div>
    );
};

function clampInt(value: string, min: number, max: number): number {
    const n = parseInt(value || String(min), 10);
    return Math.min(max, Math.max(min, n));
}

function formatDisplayTime(event: TimelineEvent, t: (key: string, vars?: Record<string, string | number>) => string): string {
    const { year, month, day } = valueToTimeInput(event.time_value);
    if (event.precision === "year") return t("timeline.balloon.yearDisplay", { year });
    if (event.precision === "month") return t("timeline.balloon.monthDisplay", { month: month ?? 1, year });
    return t("timeline.balloon.dayDisplay", { day: day ?? 1, month: month ?? 1, year });
}