import React, { useRef, useState, useCallback } from "react";
import { TimelineEventListItem } from "../../types/timeline";
import { colors, fonts, radii } from "../theme/theme";
import { Viewport } from "./TimelineCanvas";
import { useLocalization } from "../../context/LocalizationContext";

interface TimelineMinimapProps {
  events: TimelineEventListItem[];
  viewport: Viewport | null;
  onJumpTo: (value: number) => void;
  onPanBy: (deltaValue: number) => void;
  onShowAll: () => void;
}

const HEIGHT = 44;
// Quanto larga (in multipli del viewport corrente) è la finestra della minimappa
// quando siamo zoomati abbastanza da rendere necessaria una vista "localizzata".
// Con 8, il rettangolo del viewport occupa sempre ~1/8 della minimappa: visibile
// e trascinabile con precisione, indipendentemente da quanto si è zoomati.
const WINDOW_MULTIPLIER = 8;

export const TimelineMinimap: React.FC<TimelineMinimapProps> = ({
  events,
  viewport,
  onJumpTo,
  onPanBy,
  onShowAll,
}) => {  
  const { t } = useLocalization();

  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const isDraggingViewport = useRef(false);
  const dragStartX = useRef(0);

  const measure = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el;
    if (el) setWidth(el.getBoundingClientRect().width);
  }, []);

  if (events.length === 0) return null;

  const allValues = events.flatMap((e) => [e.time_value, e.end_time_value ?? e.time_value]);
  const totalMin = Math.min(...allValues);
  const totalMax = Math.max(...allValues);
  const totalRange = Math.max(1, totalMax - totalMin);

  const viewportRange = viewport ? Math.max(1, viewport.maxValue - viewport.minValue) : totalRange;

  // Finestra della minimappa: piena estensione dei dati quando lo zoom è "normale",
  // ma si restringe attorno al viewport corrente quando si è molto zoomati, così
  // il rettangolo resta sempre leggibile e il drag resta sempre preciso.
  const windowRange = Math.min(totalRange, viewportRange * WINDOW_MULTIPLIER);
  const isWindowed = windowRange < totalRange - 1;

  const windowCenter = viewport ? viewport.centerValue : (totalMin + totalMax) / 2;
  const padding = windowRange * 0.08;
  let spanMin = windowCenter - windowRange / 2 - padding;
  let spanMax = windowCenter + windowRange / 2 + padding;

  // Se la finestra non è ristretta (siamo zoomati poco), mostro sempre l'intero
  // range dei dati con un margine fisso, come prima.
  if (!isWindowed) {
    const fullPadding = totalRange * 0.05;
    spanMin = totalMin - fullPadding;
    spanMax = totalMax + fullPadding;
  }

  const spanRange = spanMax - spanMin;

  const valueToX = (v: number) => ((v - spanMin) / spanRange) * width;
  const xToValue = (x: number) => spanMin + (x / width) * spanRange;

  const viewX1 = viewport ? valueToX(viewport.minValue) : 0;
  const viewX2 = viewport ? valueToX(viewport.maxValue) : width;
  const rectWidth = Math.max(6, viewX2 - viewX1); // mai sotto i 6px: resta sempre afferrabile

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingViewport.current = true;
    dragStartX.current = e.clientX;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingViewport.current) return;
    const deltaPx = e.clientX - dragStartX.current;
    dragStartX.current = e.clientX;
    onPanBy((deltaPx / width) * spanRange);
  };

  const endDrag = () => (isDraggingViewport.current = false);

  const handleTrackClick = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    onJumpTo(xToValue(e.clientX - rect.left));
  };

  return (
    <div
      ref={measure}
      onMouseMove={handleMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onClick={handleTrackClick}
      style={{
        position: "relative",
        width: "100%",
        height: `${HEIGHT}px`,
        backgroundColor: colors.bgPanel,
        borderTop: `1px solid ${colors.borderSubtle}`,
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <svg width={width} height={HEIGHT} style={{ display: "block" }}>
        <line x1={0} y1={HEIGHT / 2} x2={width} y2={HEIGHT / 2} stroke={colors.borderSubtle} strokeWidth={1} />

        {events.map((ev) => {
          const x = valueToX(ev.time_value);
          if (x < -10 || x > width + 10) return null; // fuori dalla finestra corrente, non disegnare
          return (
            <circle
              key={ev.id}
              cx={x}
              cy={HEIGHT / 2}
              r={2.5}
              fill={ev.category_color ?? colors.gold}
              opacity={0.85}
            />
          );
        })}

        <rect
          x={Math.max(0, viewX1)}
          y={4}
          width={rectWidth}
          height={HEIGHT - 8}
          fill={`${colors.gold}22`}
          stroke={colors.gold}
          strokeWidth={1.4}
          rx={4}
          onMouseDown={handleMouseDown}
          style={{ cursor: "grab" }}
        />
      </svg>

      <div
        style={{
          position: "absolute",
          top: "2px",
          left: "6px",
          fontSize: "0.62rem",
          color: colors.textFaint,
          fontFamily: fonts.body,
          pointerEvents: "none",
        }}
      >
        {isWindowed ? t("timeline.minimap.localView") : t("timeline.minimap.fullView")}
      </div>

      {isWindowed && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShowAll();
          }}
          style={{
            position: "absolute",
            top: "2px",
            right: "6px",
            fontSize: "0.62rem",
            padding: "1px 6px",
            backgroundColor: "transparent",
            color: colors.gold,
            border: `1px solid ${colors.gold}55`,
            borderRadius: radii.pill,
            cursor: "pointer",
            fontFamily: fonts.body,
          }}
        >
          {t("timeline.minimap.showAll")}
        </button>
      )}
    </div>
  );
};