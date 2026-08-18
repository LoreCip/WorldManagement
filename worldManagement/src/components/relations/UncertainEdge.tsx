import React from "react";
import { BaseEdge, EdgeLabelRenderer, EdgeProps, getBezierPath } from "@xyflow/react";
import { colors, fonts, radii } from "../theme/theme";
import { useLocalization } from "../../context/LocalizationContext";
import { relationColor, RelationEdgeFlowData } from "./RelationEdge";

/** Arco tratteggiato con opacità ridotta, per relazioni non confermate / dicerie. */
export const UncertainEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
}) => {
  const { t } = useLocalization();
  const flowData = data as RelationEdgeFlowData | undefined;
  const stroke = relationColor(flowData?.edge?.type ?? "custom");

  // Bezier come tutti gli altri archi (prima era sempre una retta, mentre
  // gli archi standard erano a volte curvi: risultava incoerente).
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{ stroke, strokeWidth: 1.4, strokeDasharray: "3 5", opacity: 0.6 }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            backgroundColor: colors.bgPanel,
            color: stroke,
            border: `1px dashed ${stroke}66`,
            borderRadius: radii.pill,
            padding: "2px 9px",
            fontFamily: fonts.body,
            fontSize: "0.65rem",
            fontStyle: "italic",
            fontWeight: 500,
            opacity: 0.85,
            whiteSpace: "nowrap",
            pointerEvents: "all",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
          className="nodrag nopan"
          title={flowData?.description || t("relations.uncertain.tooltip")}
        >
          <span>❓</span>
          {flowData?.label || t("relations.uncertain.label")}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
