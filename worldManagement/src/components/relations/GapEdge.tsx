import React from "react";
import { EdgeLabelRenderer, EdgeProps, getBezierPath } from "@xyflow/react";
import { colors, fonts, radii } from "../theme/theme";
import { useLocalization } from "../../context/LocalizationContext";
import { GraphEdgeData } from "../../types/relations";
import { RelationEdgeFlowData } from "./RelationEdge";

/** Arco "spezzato": una curva continua (coerente con lo stile bezier degli
 *  altri archi) con un varco visivo al centro, per rappresentare una
 *  discendenza certa ma con generazioni intermedie non documentate.
 *  Il varco è ottenuto con pathLength=100 + strokeDasharray in percentuale,
 *  così la curvatura resta identica a quella degli altri tipi di arco. */
export const GapEdge: React.FC<EdgeProps> = ({
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
	const relEdge = flowData?.edge as GraphEdgeData | undefined;

	const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

	const stroke = relEdge?.isUncertain ? `${colors.gold}99` : colors.gold;
	const dashStyle = relEdge?.isUncertain ? "3 3.5 3 3.5" : undefined; // tratteggio extra se anche incerto
	const count = relEdge?.generationalGapCount;

	return (
		<>
			{/* dash 0-42%, gap 42-58%, dash 58-100%: varco centrato, curvatura invariata */}
			<path
				id={id}
				d={path}
				fill="none"
				stroke={stroke}
				strokeWidth={1.8}
				pathLength={100}
				strokeDasharray={dashStyle ?? "42 16"}
				markerEnd={markerEnd}
			/>

			<EdgeLabelRenderer>
				<div
					style={{
						position: "absolute",
						transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
						backgroundColor: colors.bgPanelRaised,
						color: colors.gold,
						border: `1px solid ${colors.gold}77`,
						borderRadius: radii.pill,
						padding: "3px 10px",
						fontFamily: fonts.display,
						fontStyle: "italic",
						fontSize: "0.72rem",
						fontWeight: 600,
						whiteSpace: "nowrap",
						pointerEvents: "all",
						display: "flex",
						alignItems: "center",
						gap: "4px",
					}}
					className="nodrag nopan"
					title={flowData?.description || t("relations.gap.hint")}
				>
					<span>⋯</span>
					{count ? t("relations.gap.unknownGenerations", { count }) : t("relations.gap.label")}
				</div>
			</EdgeLabelRenderer>
		</>
	);
};

