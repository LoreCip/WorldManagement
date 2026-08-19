import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { TimelineEventListItem, TimelineEra } from "../../types/timeline";
import { computeNiceTicks, formatTimeValue, formatDuration } from "../../utils/timeConversion";
import { colors, fonts, radii } from "../theme/theme";
import { useLocalization } from "../../context/LocalizationContext";
import { BALLOON_WIDTH, BALLOON_MAX_HEIGHT, SCREEN_MARGIN } from "./balloonLayout";

interface TimelineCanvasProps {
  events: TimelineEventListItem[];
  eras?: TimelineEra[];
  todayValue?: number | null;
  selectedId?: string | null;
  onSelectEvent: (id: string) => void;
  onCreateEvent: (timeValue: number, screenX?: number, screenY?: number) => void;
  onViewportChange?: (viewport: Viewport) => void;
  onSelectedAnchorChange?: (anchor: SelectedAnchor | null) => void;
  zoomDisabled?: boolean; // disattiva zoom (rotella + pulsanti) mentre si crea un nuovo evento
}

export interface Viewport {
  centerValue: number;
  pixelsPerDay: number;
  minValue: number;
  maxValue: number;
}

export interface TimelineCanvasHandle {
  fitAll: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  jumpTo: (value: number) => void;
  panBy: (deltaValue: number) => void;
  applyView: (centerValue: number, pixelsPerDay: number) => void;
  getViewport: () => Viewport;
  // Calcola la posizione (e il lato sopra/sotto) del balloon a partire da un
  // punto qualsiasi in coordinate di PAGINA, riusando lo stesso clamping
  // applicato ai marker selezionati. Utile per il balloon di un evento
  // appena creato, che non ha ancora un marker disegnato sulla timeline.
  getAnchorForPoint: (
    pageX: number,
    pageY: number,
    preferredSide?: "above" | "below",
  ) => SelectedAnchor;
  // Centro del canvas in coordinate di PAGINA — usato quando non abbiamo
  // un punto di click (es. bottone "+ Nuovo evento" nell'header).
  getCenterPoint: () => { x: number; y: number };
}

export interface SelectedAnchor {
  x: number; // coordinate di PAGINA (viewport), non più locali al canvas
  y: number;
  side: "above" | "below";
}

const MIN_PIXELS_PER_DAY = 0.00002;
const MAX_PIXELS_PER_DAY = 40;

const CLUSTER_THRESHOLD_PX = 26;
const MAX_POINT_LANES = 5;

const POINT_LANE_STEP = 46;
const POINT_LANE_BASE = 26;

const BAR_HEIGHT = 12;
const BAR_LANE_STEP = 40;
const BAR_LANE_BASE = 24;
const BAR_MIN_GAP_PX = 6;

const LABEL_EDGE_MARGIN = 60;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

interface Cluster {
  x: number;
  items: TimelineEventListItem[];
  minValue: number;
  maxValue: number;
}

interface LanedBar {
  event: TimelineEventListItem;
  x1: number;
  x2: number;
  lane: number;
}

const TextChip: React.FC<{
  x: number;
  y: number;
  text: string;
  color: string;
  fontWeight: number;
  fontSize?: number;
  anchor?: "middle" | "start";
}> = ({ x, y, text, color, fontWeight, fontSize = 12, anchor = "middle" }) => {
  const approxWidth = text.length * (fontSize * 0.56) + 12;
  const rectX = anchor === "middle" ? x - approxWidth / 2 : x - 4;
  return (
    <g>
      <rect
        x={rectX}
        y={y - fontSize - 2}
        width={approxWidth}
        height={fontSize + 6}
        rx={4}
        fill={colors.bgVoid}
        opacity={0.72}
      />
      <text
        x={x}
        y={y}
        fill={color}
        fontSize={fontSize}
        fontWeight={fontWeight}
        fontFamily={fonts.display}
        textAnchor={anchor}
      >
        {text}
      </text>
    </g>
  );
};

export const TimelineCanvas = forwardRef<TimelineCanvasHandle, TimelineCanvasProps>(
  (
    {
      events,
      eras,
      todayValue,
      selectedId,
      onSelectEvent,
      onCreateEvent,
      onViewportChange,
      onSelectedAnchorChange,
      zoomDisabled,
    },
    ref,
  ) => {
    const { t } = useLocalization();

    const containerRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(800);
    const [height, setHeight] = useState(500);
    const [centerValue, setCenterValue] = useState(0);
    const [pixelsPerDay, setPixelsPerDay] = useState(2);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [isPanning, setIsPanning] = useState(false);
    const [openOverflow, setOpenOverflow] = useState<Cluster | null>(null);

    const dragStartX = useRef(0);
    const dragStartCenter = useRef(0);
    const didDrag = useRef(false);
    const hasFramedOnce = useRef(false);

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setWidth(entry.contentRect.width);
          setHeight(entry.contentRect.height);
        }
      });
      observer.observe(el);
      return () => observer.disconnect();
    }, []);

    const computeAnchor = useCallback(
      (pageX: number, pageY: number, preferredSide: "above" | "below"): SelectedAnchor => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return { x: pageX, y: pageY, side: preferredSide };

        const safeTop = rect.top + SCREEN_MARGIN;
        const safeBottom = rect.bottom - SCREEN_MARGIN;

        const spaceAbove = pageY - safeTop;
        const spaceBelow = safeBottom - pageY;

        let side: "above" | "below" = preferredSide;
        if (side === "above" && spaceAbove < BALLOON_MAX_HEIGHT && spaceBelow > spaceAbove) {
          side = "below";
        } else if (side === "below" && spaceBelow < BALLOON_MAX_HEIGHT && spaceAbove > spaceBelow) {
          side = "above";
        }

        const clampedX = clamp(
          pageX,
          BALLOON_WIDTH / 2 + SCREEN_MARGIN,
          window.innerWidth - BALLOON_WIDTH / 2 - SCREEN_MARGIN,
        );

        const clampedY =
          side === "above"
            ? clamp(pageY, safeTop + BALLOON_MAX_HEIGHT, safeBottom)
            : clamp(pageY, safeTop, safeBottom - BALLOON_MAX_HEIGHT);

        return { x: clampedX, y: clampedY, side };
      },
      [],
    );

    const fitToRange = useCallback(
      (min: number, max: number) => {
        const span = Math.max(1, max - min) * 1.3;
        setCenterValue((min + max) / 2);
        setPixelsPerDay(clamp(width / span, MIN_PIXELS_PER_DAY, MAX_PIXELS_PER_DAY));
      },
      [width],
    );

    const fitAll = useCallback(() => {
      if (events.length === 0) return;
      const values = events.flatMap((e) => [e.time_value, e.end_time_value ?? e.time_value]);
      fitToRange(Math.min(...values), Math.max(...values));
    }, [events, fitToRange]);

    useEffect(() => {
      if (!hasFramedOnce.current && events.length > 0 && width > 0) {
        fitAll();
        hasFramedOnce.current = true;
      }
    }, [events, width, fitAll]);

    useImperativeHandle(ref, () => ({
      fitAll,
      zoomIn: () => {
        if (zoomDisabled) return;
        setPixelsPerDay((p) => clamp(p * 1.4, MIN_PIXELS_PER_DAY, MAX_PIXELS_PER_DAY));
      },
      zoomOut: () => {
        if (zoomDisabled) return;
        setPixelsPerDay((p) => clamp(p / 1.4, MIN_PIXELS_PER_DAY, MAX_PIXELS_PER_DAY));
      },
      jumpTo: (value: number) => setCenterValue(value),
      panBy: (deltaValue: number) => setCenterValue((c) => c + deltaValue),
      applyView: (c: number, p: number) => {
        setCenterValue(c);
        setPixelsPerDay(clamp(p, MIN_PIXELS_PER_DAY, MAX_PIXELS_PER_DAY));
      },
      getViewport: () => ({
        centerValue,
        pixelsPerDay,
        minValue: centerValue - width / 2 / pixelsPerDay,
        maxValue: centerValue + width / 2 / pixelsPerDay,
      }),
      getAnchorForPoint: (
        pageX: number,
        pageY: number,
        preferredSide: "above" | "below" = "below",
      ) => computeAnchor(pageX, pageY, preferredSide),
      getCenterPoint: () => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      },
    }));

    const valueToX = useCallback(
      (value: number) => width / 2 + (value - centerValue) * pixelsPerDay,
      [width, centerValue, pixelsPerDay],
    );
    const xToValue = useCallback(
      (x: number) => centerValue + (x - width / 2) / pixelsPerDay,
      [width, centerValue, pixelsPerDay],
    );

    const minValue = xToValue(0);
    const maxValue = xToValue(width);

    useEffect(() => {
      onViewportChange?.({ centerValue, pixelsPerDay, minValue, maxValue });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [centerValue, pixelsPerDay, width]);

    const ticks = useMemo(
      () => computeNiceTicks(minValue, maxValue, width),
      [minValue, maxValue, width],
    );

    const tickStep = ticks.length >= 2 ? ticks[1].value - ticks[0].value : Infinity;
    const isDayResolution = tickStep <= 1;

    const axisY = Math.max(120, height / 2);

    const pointEvents = useMemo(() => events.filter((e) => !e.end_time_value), [events]);
    const barEvents = useMemo(() => events.filter((e) => !!e.end_time_value), [events]);

    const clusters = useMemo<Cluster[]>(() => {
      const sorted = [...pointEvents].sort((a, b) => a.time_value - b.time_value);
      const result: Cluster[] = [];
      for (const ev of sorted) {
        const x = valueToX(ev.time_value);
        const last = result[result.length - 1];
        if (
          last &&
          x - valueToX(last.items[last.items.length - 1].time_value) < CLUSTER_THRESHOLD_PX
        ) {
          last.items.push(ev);
        } else {
          result.push({ x, items: [ev], minValue: ev.time_value, maxValue: ev.time_value });
        }
      }
      return result.map((c) => {
        const values = c.items.map((e) => e.time_value);
        return {
          items: c.items,
          minValue: Math.min(...values),
          maxValue: Math.max(...values),
          x: c.items.reduce((sum, e) => sum + valueToX(e.time_value), 0) / c.items.length,
        };
      });
    }, [pointEvents, valueToX]);

    const lanedBars = useMemo<LanedBar[]>(() => {
      const sorted = [...barEvents].sort((a, b) => a.time_value - b.time_value);
      const laneEndX: number[] = [];
      const result: LanedBar[] = [];

      for (const ev of sorted) {
        const x1 = valueToX(ev.time_value);
        const x2 = valueToX(ev.end_time_value!);
        let lane = laneEndX.findIndex((endX) => endX + BAR_MIN_GAP_PX <= x1);
        if (lane === -1) {
          lane = laneEndX.length;
          laneEndX.push(x2);
        } else {
          laneEndX[lane] = x2;
        }
        result.push({ event: ev, x1, x2, lane });
      }
      return result;
    }, [barEvents, valueToX]);

    // Posizione locale del marker selezionato (coordinate SVG), con un lato "preferito"
    // in base al tipo di elemento — usato solo come punto di partenza.
    const selectedLocalAnchor = useMemo<{
      x: number;
      y: number;
      preferredSide: "above" | "below";
    } | null>(() => {
      if (!selectedId) return null;

      const laned = lanedBars.find((b) => b.event.id === selectedId);
      if (laned) {
        const barBottom = axisY - BAR_LANE_BASE - laned.lane * BAR_LANE_STEP;
        const barTop = barBottom - BAR_HEIGHT;
        const visibleX1 = Math.max(laned.x1, LABEL_EDGE_MARGIN);
        const visibleX2 = Math.min(laned.x2, width - LABEL_EDGE_MARGIN);
        const rawX =
          visibleX2 > visibleX1 ? (visibleX1 + visibleX2) / 2 : (laned.x1 + laned.x2) / 2;
        if (rawX < -100 || rawX > width + 100) return null;
        return { x: rawX, y: barTop, preferredSide: "above" };
      }

      for (const cluster of clusters) {
        const idx = cluster.items.findIndex((e) => e.id === selectedId);
        if (idx === -1) continue;
        if (cluster.x < -100 || cluster.x > width + 100) return null;

        if (cluster.items.length === 1) {
          return { x: cluster.x, y: axisY + POINT_LANE_BASE, preferredSide: "below" };
        }
        if (!isDayResolution) {
          return { x: cluster.x, y: axisY + POINT_LANE_BASE, preferredSide: "below" };
        }
        if (idx < MAX_POINT_LANES) {
          return {
            x: cluster.x,
            y: axisY + POINT_LANE_BASE + idx * POINT_LANE_STEP,
            preferredSide: "below",
          };
        }
        return {
          x: cluster.x,
          y: axisY + POINT_LANE_BASE + MAX_POINT_LANES * POINT_LANE_STEP,
          preferredSide: "below",
        };
      }

      return null;
    }, [selectedId, clusters, lanedBars, axisY, width, isDayResolution]);

    // Conversione in coordinate di PAGINA + controllo di collisione reale con i bordi
    // della finestra: risolve sia il clipping da overflow:hidden dell'ancestor sia il
    // caso in cui non c'è spazio a sufficienza nella direzione "preferita" dal tipo
    // di marker (es. una barra vicino alla cima dello schermo, come nello screenshot).
    const [layoutTick, setLayoutTick] = useState(0);
    useEffect(() => {
      const bump = () => setLayoutTick((t) => t + 1);
      window.addEventListener("resize", bump);
      window.addEventListener("scroll", bump, true);
      return () => {
        window.removeEventListener("resize", bump);
        window.removeEventListener("scroll", bump, true);
      };
    }, []);

    useEffect(() => {
      if (!selectedId) {
        return;
      }

      if (!selectedLocalAnchor || !containerRef.current) {
        onSelectedAnchorChange?.(null);
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const pageX = rect.left + selectedLocalAnchor.x;
      const pageY = rect.top + selectedLocalAnchor.y;

      onSelectedAnchorChange?.(computeAnchor(pageX, pageY, selectedLocalAnchor.preferredSide));
    }, [selectedId, selectedLocalAnchor, layoutTick, onSelectedAnchorChange, computeAnchor]);

    const handleWheel = (e: React.WheelEvent) => {
      e.preventDefault();
      if (zoomDisabled) return;
      const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const rect = containerRef.current?.getBoundingClientRect();
      const mouseX = e.clientX - (rect?.left ?? 0);
      const valueAtMouse = xToValue(mouseX);

      const newPixelsPerDay = clamp(
        pixelsPerDay * zoomFactor,
        MIN_PIXELS_PER_DAY,
        MAX_PIXELS_PER_DAY,
      );
      const newCenter = valueAtMouse - (mouseX - width / 2) / newPixelsPerDay;

      setPixelsPerDay(newPixelsPerDay);
      setCenterValue(newCenter);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
      setIsPanning(true);
      didDrag.current = false;
      dragStartX.current = e.clientX;
      dragStartCenter.current = centerValue;
      setOpenOverflow(null);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      if (!isPanning) return;
      const deltaX = e.clientX - dragStartX.current;
      if (Math.abs(deltaX) > 3) didDrag.current = true;
      setCenterValue(dragStartCenter.current - deltaX / pixelsPerDay);
    };

    const endDrag = () => setIsPanning(false);

    const handleTrackClick = (e: React.MouseEvent) => {
      if (didDrag.current) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const value = xToValue(e.clientX - rect.left);
      onCreateEvent(value, e.clientX, e.clientY);
    };

    return (
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onClick={handleTrackClick}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          backgroundColor: colors.bgVoid,
          cursor: isPanning ? "grabbing" : "crosshair",
          userSelect: "none",
        }}
      >
        <svg width={width} height={height} style={{ display: "block" }}>
          {/* Fasce/ere di sfondo — disegnate per prime, sotto a tutto il resto */}
          {(eras ?? []).map((era) => {
            const x1 = valueToX(era.start_value);
            const x2 = valueToX(era.end_value);
            if (x2 < 0 || x1 > width) return null;
            const clampedX1 = Math.max(0, x1);
            const clampedX2 = Math.min(width, x2);
            const labelX = (clampedX1 + clampedX2) / 2;

            return (
              <g key={era.id}>
                <rect
                  x={clampedX1}
                  y={0}
                  width={Math.max(0, clampedX2 - clampedX1)}
                  height={height}
                  fill={era.color}
                  opacity={0.08}
                />
                <rect x={x1} y={0} width={2} height={height} fill={era.color} opacity={0.35} />
                <rect x={x2} y={0} width={2} height={height} fill={era.color} opacity={0.35} />
                <text
                  x={labelX}
                  y={18}
                  fill={era.color}
                  fontSize={11}
                  fontWeight={600}
                  fontFamily={fonts.body}
                  textAnchor="middle"
                  opacity={0.85}
                >
                  {era.label.toUpperCase()}
                </text>
              </g>
            );
          })}

          <line x1={0} y1={axisY} x2={width} y2={axisY} stroke={colors.border} strokeWidth={2} />

          {/* Marcatore "oggi della campagna" */}
          {todayValue != null &&
            (() => {
              const x = valueToX(todayValue);
              if (x < -20 || x > width + 20) return null;
              return (
                <g>
                  <line
                    x1={x}
                    y1={0}
                    x2={x}
                    y2={height}
                    stroke={colors.crimsonBright}
                    strokeWidth={1.5}
                    strokeDasharray="5 4"
                    opacity={0.75}
                  />
                  <rect
                    x={x - 24}
                    y={height - 22}
                    width={48}
                    height={18}
                    rx={4}
                    fill={colors.crimsonBright}
                    opacity={0.9}
                  />
                  <text
                    x={x}
                    y={height - 9}
                    fill={colors.bgVoid}
                    fontSize={10}
                    fontWeight={700}
                    fontFamily={fonts.body}
                    textAnchor="middle"
                  >
                    {t("timeline.canvas.today")}
                  </text>
                </g>
              );
            })()}

          {ticks.map((tick) => {
            const x = valueToX(tick.value);
            if (x < -50 || x > width + 50) return null;
            return (
              <g key={tick.value}>
                <line
                  x1={x}
                  y1={axisY - 6}
                  x2={x}
                  y2={axisY + 6}
                  stroke={colors.borderSubtle}
                  strokeWidth={1}
                />
                <text
                  x={x}
                  y={axisY + 24}
                  fill={colors.textFaint}
                  fontSize={11}
                  fontFamily={fonts.body}
                  textAnchor="middle"
                >
                  {tick.label}
                </text>
              </g>
            );
          })}

          {/* Barre con durata — sempre SOPRA l'asse */}
          {lanedBars.map(({ event: ev, x1, x2, lane }) => {
            if (x2 < -50 || x1 > width + 50) return null;
            const isSelected = ev.id === selectedId;
            const color = ev.category_color ?? colors.gold;
            const barBottom = axisY - BAR_LANE_BASE - lane * BAR_LANE_STEP;
            const barTop = barBottom - BAR_HEIGHT;

            const visibleX1 = Math.max(x1, LABEL_EDGE_MARGIN);
            const visibleX2 = Math.min(x2, width - LABEL_EDGE_MARGIN);
            const labelX = visibleX2 > visibleX1 ? (visibleX1 + visibleX2) / 2 : (x1 + x2) / 2;

            const label = `${ev.category_icon ? ev.category_icon + " " : ""}${
              ev.title.length > 26 ? ev.title.slice(0, 24) + "…" : ev.title
            }`;

            return (
              <g
                key={ev.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectEvent(ev.id);
                }}
                onMouseEnter={() => setHoveredId(ev.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{ cursor: "pointer" }}
              >
                <line
                  x1={x1}
                  y1={barBottom}
                  x2={x1}
                  y2={axisY}
                  stroke={`${colors.gold}55`}
                  strokeWidth={1.2}
                />
                <rect
                  x={Math.min(x1, x2)}
                  y={barTop}
                  width={Math.max(2, Math.abs(x2 - x1))}
                  height={BAR_HEIGHT}
                  rx={BAR_HEIGHT / 2}
                  fill={color}
                  opacity={isSelected ? 1 : 0.78}
                  stroke={isSelected ? colors.textPrimary : "none"}
                  strokeWidth={isSelected ? 1.5 : 0}
                />
                <TextChip
                  x={labelX}
                  y={barTop - 8}
                  text={label}
                  color={isSelected ? colors.gold : colors.textSecondary}
                  fontWeight={isSelected ? 700 : 500}
                />
                {hoveredId === ev.id && !isSelected && (
                  <TextChip
                    x={labelX}
                    y={barTop - 24}
                    text={formatDuration(ev.time_value, ev.end_time_value!, ev.precision)}
                    color={colors.textFaint}
                    fontWeight={400}
                    fontSize={10}
                  />
                )}
              </g>
            );
          })}

          {/* Eventi puntuali — sempre SOTTO l'asse */}
          {clusters.map((cluster, clusterIdx) => {
            if (cluster.x < -80 || cluster.x > width + 80) return null;

            if (cluster.items.length === 1) {
              const ev = cluster.items[0];
              const markerY = axisY + POINT_LANE_BASE;
              const isSelected = ev.id === selectedId;
              const isHovered = hoveredId === ev.id;
              const color = ev.category_color ?? colors.gold;
              const label = `${ev.category_icon ? ev.category_icon + " " : ""}${
                ev.title.length > 22 ? ev.title.slice(0, 20) + "…" : ev.title
              }`;

              return (
                <g
                  key={ev.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectEvent(ev.id);
                  }}
                  onMouseEnter={() => setHoveredId(ev.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{ cursor: "pointer" }}
                >
                  <line
                    x1={cluster.x}
                    y1={axisY}
                    x2={cluster.x}
                    y2={markerY}
                    stroke={isSelected ? colors.gold : `${colors.gold}55`}
                    strokeWidth={isSelected ? 2 : 1.2}
                  />
                  <circle
                    cx={cluster.x}
                    cy={markerY}
                    r={isSelected || isHovered ? 7 : 5.5}
                    fill={isSelected ? color : colors.bgPanelRaised}
                    stroke={color}
                    strokeWidth={isSelected ? 0 : 1.8}
                  />
                  <TextChip
                    x={cluster.x + 14}
                    y={markerY + 4}
                    text={label}
                    color={isSelected ? colors.gold : colors.textSecondary}
                    fontWeight={isSelected ? 700 : 500}
                    anchor="start"
                  />
                  {isHovered && !isSelected && (
                    <TextChip
                      x={cluster.x + 14}
                      y={markerY + 20}
                      text={formatTimeValue(ev.time_value, ev.precision)}
                      color={colors.textFaint}
                      fontWeight={400}
                      fontSize={10}
                      anchor="start"
                    />
                  )}
                </g>
              );
            }

            if (!isDayResolution) {
              const markerY = axisY + POINT_LANE_BASE;
              return (
                <g
                  key={`blob-${cluster.minValue}-${cluster.maxValue}-${clusterIdx}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenOverflow(openOverflow === cluster ? null : cluster);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <line
                    x1={cluster.x}
                    y1={axisY}
                    x2={cluster.x}
                    y2={markerY}
                    stroke={`${colors.gold}55`}
                    strokeWidth={1.2}
                  />
                  <circle
                    cx={cluster.x}
                    cy={markerY}
                    r={11}
                    fill={colors.bgPanelRaised}
                    stroke={colors.gold}
                    strokeWidth={2}
                  />
                  <text
                    x={cluster.x}
                    y={markerY + 4}
                    fill={colors.gold}
                    fontSize={11}
                    fontWeight={700}
                    fontFamily={fonts.body}
                    textAnchor="middle"
                  >
                    {cluster.items.length}
                  </text>
                  <TextChip
                    x={cluster.x + 16}
                    y={markerY + 4}
                    text={t("timeline.canvas.closeEvents", { count: cluster.items.length })}
                    color={colors.textSecondary}
                    fontWeight={500}
                    anchor="start"
                  />
                </g>
              );
            }

            const visibleItems = cluster.items.slice(0, MAX_POINT_LANES);
            const overflowCount = cluster.items.length - visibleItems.length;

            return (
              <g key={`cluster-${cluster.minValue}-${cluster.maxValue}-${clusterIdx}`}>
                {visibleItems.map((ev, laneIdx) => {
                  const markerY = axisY + POINT_LANE_BASE + laneIdx * POINT_LANE_STEP;
                  const isSelected = ev.id === selectedId;
                  const isHovered = hoveredId === ev.id;
                  const color = ev.category_color ?? colors.gold;
                  const label = `${ev.category_icon ? ev.category_icon + " " : ""}${
                    ev.title.length > 22 ? ev.title.slice(0, 20) + "…" : ev.title
                  }`;

                  return (
                    <g
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(ev.id);
                      }}
                      onMouseEnter={() => setHoveredId(ev.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{ cursor: "pointer" }}
                    >
                      <line
                        x1={cluster.x}
                        y1={axisY}
                        x2={cluster.x}
                        y2={markerY}
                        stroke={isSelected ? colors.gold : `${colors.gold}55`}
                        strokeWidth={isSelected ? 2 : 1.2}
                      />
                      <circle
                        cx={cluster.x}
                        cy={markerY}
                        r={isSelected || isHovered ? 7 : 5.5}
                        fill={isSelected ? color : colors.bgPanelRaised}
                        stroke={color}
                        strokeWidth={isSelected ? 0 : 1.8}
                      />
                      <TextChip
                        x={cluster.x + 14}
                        y={markerY + 4}
                        text={label}
                        color={isSelected ? colors.gold : colors.textSecondary}
                        fontWeight={isSelected ? 700 : 500}
                        anchor="start"
                      />
                      {isHovered && !isSelected && (
                        <TextChip
                          x={cluster.x + 14}
                          y={markerY + 20}
                          text={formatTimeValue(ev.time_value, ev.precision)}
                          color={colors.textFaint}
                          fontWeight={400}
                          fontSize={10}
                          anchor="start"
                        />
                      )}
                    </g>
                  );
                })}

                {overflowCount > 0 &&
                  (() => {
                    const markerY = axisY + POINT_LANE_BASE + visibleItems.length * POINT_LANE_STEP;
                    return (
                      <g
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenOverflow(openOverflow === cluster ? null : cluster);
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <line
                          x1={cluster.x}
                          y1={axisY}
                          x2={cluster.x}
                          y2={markerY}
                          stroke={`${colors.gold}55`}
                          strokeWidth={1.2}
                        />
                        <circle
                          cx={cluster.x}
                          cy={markerY}
                          r={10}
                          fill={colors.bgPanelRaised}
                          stroke={colors.gold}
                          strokeWidth={2}
                        />
                        <text
                          x={cluster.x}
                          y={markerY + 4}
                          fill={colors.gold}
                          fontSize={11}
                          fontWeight={700}
                          fontFamily={fonts.body}
                          textAnchor="middle"
                        >
                          +{overflowCount}
                        </text>
                      </g>
                    );
                  })()}
              </g>
            );
          })}
        </svg>

        {openOverflow && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              // Clampata come il balloon: senza questo, un cluster vicino al
              // bordo sinistro/destro del canvas apre il popup mezzo tagliato
              // fuori dall'area visibile.
              left: `${clamp(openOverflow.x, 100 + SCREEN_MARGIN, Math.max(100 + SCREEN_MARGIN, width - 100 - SCREEN_MARGIN))}px`,
              top: "50%",
              transform: "translate(-50%, -50%)",
              backgroundColor: colors.bgPanel,
              border: `1px solid ${colors.borderSubtle}`,
              borderRadius: radii.md,
              padding: "0.5rem",
              minWidth: "200px",
              maxHeight: "260px",
              overflowY: "auto",
              zIndex: 60,
              boxShadow: "0 4px 18px rgba(0,0,0,0.4)",
            }}
          >
            {openOverflow.items.map((ev) => (
              <button
                key={ev.id}
                onClick={() => {
                  onSelectEvent(ev.id);
                  setOpenOverflow(null);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  color: colors.textPrimary,
                  fontFamily: fonts.body,
                  fontSize: "0.82rem",
                  padding: "0.35rem 0.4rem",
                  cursor: "pointer",
                  borderRadius: radii.sm,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.bgPanelRaised)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                {ev.category_icon ? `${ev.category_icon} ` : ""}
                {ev.title}
                <span
                  style={{ color: colors.textFaint, marginLeft: "0.4rem", fontSize: "0.72rem" }}
                >
                  {formatTimeValue(ev.time_value, ev.precision)}
                </span>
              </button>
            ))}
          </div>
        )}

        <div
          style={{
            position: "absolute",
            bottom: "0.8rem",
            left: "1rem",
            fontSize: "0.72rem",
            color: colors.textFaint,
            fontFamily: fonts.body,
            pointerEvents: "none",
          }}
        >
          {t("timeline.canvas.footnote")}
        </div>
      </div>
    );
  },
);

TimelineCanvas.displayName = "TimelineCanvas";
