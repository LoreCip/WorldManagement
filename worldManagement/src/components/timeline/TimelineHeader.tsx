import React, { useState } from "react";
import { TimelineCategory, TimelineSavedView } from "../../types/timeline";
import { timeInputToValue, valueToTimeInput } from "../../utils/timeConversion";
import { colors, fonts, radii } from "../theme/theme";
import { useLocalization } from "../../context/LocalizationContext";

interface TimelineHeaderProps {
  onFitAll: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onNewEvent: () => void;
  categories: TimelineCategory[];
  activeCategoryIds: Set<string> | null;
  onToggleCategory: (id: string) => void;
  onClearCategoryFilters: () => void;
  onOpenCategoryManager: () => void;
  savedViews: TimelineSavedView[];
  onApplySavedView: (view: TimelineSavedView) => void;
  onDeleteSavedView: (id: string) => void;
  onSaveCurrentView: (name: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenEraManager: () => void;
  todayValue: number | null;
  onSetToday: (value: number | null) => void;
}

export const TimelineHeader: React.FC<TimelineHeaderProps> = ({
  onFitAll,
  onZoomIn,
  onZoomOut,
  onNewEvent,
  categories,
  activeCategoryIds,
  onToggleCategory,
  onClearCategoryFilters,
  onOpenCategoryManager,
  savedViews,
  onApplySavedView,
  onDeleteSavedView,
  onSaveCurrentView,
  searchQuery,
  onSearchChange,
  onOpenEraManager,
  todayValue,
  onSetToday,
}) => {
  const { t } = useLocalization();

  const [showFilters, setShowFilters] = useState(false);
  const [showViews, setShowViews] = useState(false);
  const [showTodayPicker, setShowTodayPicker] = useState(false);
  const [todayInput, setTodayInput] = useState<{ year: number; month: number; day: number }>({
    year: 0,
    month: 1,
    day: 1,
  });

  const btn: React.CSSProperties = {
    padding: "0.45rem 0.8rem",
    backgroundColor: "transparent",
    color: colors.gold,
    border: `1px solid ${colors.gold}77`,
    borderRadius: radii.md,
    cursor: "pointer",
    fontFamily: fonts.body,
    fontWeight: 600,
    fontSize: "0.82rem",
  };

  const dropdown: React.CSSProperties = {
    position: "absolute", top: "calc(100% + 6px)", right: 0,
    backgroundColor: colors.bgPanel, border: `1px solid ${colors.borderSubtle}`,
    borderRadius: radii.md, padding: "0.6rem", minWidth: "220px", zIndex: 50,
    display: "flex", flexDirection: "column", gap: "0.35rem",
    maxHeight: "min(320px, 60vh)",   // non supera mai il 60% dell'altezza finestra
    overflowY: "auto",
  };

  const smallInput: React.CSSProperties = {
    padding: "0.3rem 0.4rem",
    fontSize: "0.78rem",
    backgroundColor: colors.bgManuscript,
    border: `1px solid ${colors.borderSubtle}`,
    borderRadius: radii.sm,
    color: colors.textPrimary,
    fontFamily: fonts.body,
  };

  const handleSaveView = () => {
    const name = window.prompt("Nome per questa vista:");
    if (name && name.trim()) onSaveCurrentView(name.trim());
  };

  const openTodayPicker = () => {
    const base = todayValue != null ? valueToTimeInput(todayValue) : { year: 0, month: 1, day: 1 };
    setTodayInput({ year: base.year, month: base.month ?? 1, day: base.day ?? 1 });
    setShowTodayPicker((s) => !s);
    setShowFilters(false);
    setShowViews(false);
  };

  return (
    <div
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.9rem 1.4rem", borderBottom: `1px solid ${colors.borderSubtle}`,
        backgroundColor: colors.bgPanel, position: "relative", gap: "1rem", flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "1.2rem" }}>
        <h2 style={{ fontFamily: fonts.display, fontSize: "1.2rem", fontWeight: 600, color: colors.textPrimary, margin: 0 }}>
          {t("timeline.header.title")}
        </h2>

        <input
          type="text"
          placeholder={t("timeline.header.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            padding: "0.4rem 0.7rem",
            backgroundColor: colors.bgManuscript,
            border: `1px solid ${colors.borderSubtle}`,
            borderRadius: radii.sm,
            color: colors.textPrimary,
            fontFamily: fonts.body,
            fontSize: "0.82rem",
            outline: "none",
            width: "180px",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: "0.5rem", position: "relative", flexWrap: "wrap" }}>
        <button style={btn} onClick={onZoomOut}>−</button>
        <button style={btn} onClick={onZoomIn}>+</button>
        <button style={btn} onClick={onFitAll}>{t("timeline.header.autoFit")}</button>

        <div style={{ position: "relative" }}>
          <button
            style={{ ...btn, backgroundColor: activeCategoryIds ? `${colors.gold}22` : "transparent" }}
            onClick={() => { setShowFilters((s) => !s); setShowViews(false); setShowTodayPicker(false); }}
          >
            {t("timeline.header.filters")} + {activeCategoryIds ? ` (${activeCategoryIds.size})` : ""}
          </button>
          {showFilters && (
            <div style={dropdown}>
              {categories.map((cat) => {
                const active = activeCategoryIds?.has(cat.id) ?? false;
                return (
                  <label
                    key={cat.id}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.5rem",
                      fontSize: "0.82rem", color: colors.textPrimary, cursor: "pointer",
                    }}
                  >
                    <input type="checkbox" checked={active} onChange={() => onToggleCategory(cat.id)} />
                    <span>{cat.icon}</span>
                    <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: cat.color }} />
                    {cat.name}
                  </label>
                );
              })}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.4rem" }}>
                <button
                  onClick={onClearCategoryFilters}
                  style={{ ...btn, padding: "0.25rem 0.5rem", fontSize: "0.72rem" }}
                >
                  {t("timeline.header.clearFilters")}
                </button>
                <button
                  onClick={() => { onOpenCategoryManager(); setShowFilters(false); }}
                  style={{ ...btn, padding: "0.25rem 0.5rem", fontSize: "0.72rem" }}
                >
                  {t("timeline.header.manage")}
                </button>
              </div>
            </div>
          )}
        </div>

        <button style={btn} onClick={onOpenEraManager}>{t("timeline.header.eras")}</button>

        <div style={{ position: "relative" }}>
          <button
            style={{ ...btn, backgroundColor: todayValue != null ? `${colors.crimsonBright}22` : "transparent" }}
            onClick={openTodayPicker}
          >
            {t("timeline.header.today")}
          </button>
          {showTodayPicker && (
            <div style={dropdown}>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <input
                  type="number" value={todayInput.year} placeholder={t("timeline.balloon.year")}
                  onChange={(e) => setTodayInput({ ...todayInput, year: parseInt(e.target.value || "0", 10) })}
                  style={{ ...smallInput, width: "70px" }}
                />
                <input
                  type="number" value={todayInput.month} min={1} max={12} placeholder={t("timeline.balloon.month")}
                  onChange={(e) => setTodayInput({ ...todayInput, month: parseInt(e.target.value || "1", 10) })}
                  style={{ ...smallInput, width: "55px" }}
                />
                <input
                  type="number" value={todayInput.day} min={1} max={30} placeholder={t("timeline.balloon.day")}
                  onChange={(e) => setTodayInput({ ...todayInput, day: parseInt(e.target.value || "1", 10) })}
                  style={{ ...smallInput, width: "55px" }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem" }}>
                <button
                  onClick={() => { onSetToday(null); setShowTodayPicker(false); }}
                  style={{ ...btn, padding: "0.25rem 0.5rem", fontSize: "0.72rem", color: colors.textFaint, borderColor: colors.borderSubtle }}
                >
                  {t("common.delete")}
                </button>
                <button
                  onClick={() => { onSetToday(timeInputToValue(todayInput)); setShowTodayPicker(false); }}
                  style={{ ...btn, padding: "0.25rem 0.5rem", fontSize: "0.72rem" }}
                >
                  {t("common.save")}
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ position: "relative" }}>
          <button style={btn} onClick={() => { setShowViews((s) => !s); setShowFilters(false); setShowTodayPicker(false); }}>
            {t("timeline.header.savedViews")}
          </button>
          {showViews && (
            <div style={dropdown}>
              {savedViews.map((view) => (
                <div key={view.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <button
                    onClick={() => { onApplySavedView(view); setShowViews(false); }}
                    style={{
                      flex: 1, textAlign: "left", background: "none", border: "none",
                      color: colors.textPrimary, cursor: "pointer", fontSize: "0.82rem", fontFamily: fonts.body,
                      padding: "0.2rem 0",
                    }}
                  >
                    {view.name}
                  </button>
                  <button
                    onClick={() => onDeleteSavedView(view.id)}
                    style={{ background: "none", border: "none", color: colors.crimson, cursor: "pointer" }}
                  >
                    ×
                  </button>
                </div>
              ))}
              {savedViews.length === 0 && (
                <div style={{ color: colors.textFaint, fontSize: "0.78rem", fontStyle: "italic" }}>Nessuna vista salvata.</div>
              )}
              <button
                onClick={() => { handleSaveView(); setShowViews(false); }}
                style={{ ...btn, marginTop: "0.4rem", padding: "0.3rem 0.5rem", fontSize: "0.75rem" }}
              >
                {t("timeline.header.saveView")}
              </button>
            </div>
          )}
        </div>

        <button
          style={{ ...btn, backgroundColor: colors.gold, color: colors.bgVoid, border: "none" }}
          onClick={onNewEvent}
        >
          {t("timeline.header.newEvent")}
        </button>
      </div>
    </div>
  );
};