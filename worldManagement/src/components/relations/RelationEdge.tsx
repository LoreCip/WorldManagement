import React from "react";
import { BaseEdge, EdgeLabelRenderer, EdgeProps, getBezierPath } from "@xyflow/react";
import { colors, fonts, radii } from "../theme/theme";
import { GraphEdgeData } from "../../types/relations";

export interface RelationEdgeFlowData extends Record<string, unknown> {
	edge: GraphEdgeData;
	label?: string;
	description?: string;
}

/** Colore dell'arco in base alla categoria della relazione (genealogica vs. sociale). */
export function relationColor(type: GraphEdgeData["type"]): string {
	switch (type) {
		case "parent_child":
		case "foster":
			return colors.gold;
		case "spouse":
			return colors.crimsonBright;
		case "sibling":
			return colors.indigo;
		case "ally":
		case "member_of":
			return colors.verdigris;
		case "rival":
			return colors.crimson;
		case "vassal":
			return colors.textSecondary;
		default:
			return colors.textFaint;
	}
}

export const RelationEdge: React.FC<EdgeProps> = ({
	id,
	sourceX,
	sourceY,
	targetX,
	targetY,
	sourcePosition,
	targetPosition,
	data,
	markerEnd,
	style,
}) => {
	const flowData = data as RelationEdgeFlowData | undefined;
	const relEdge = flowData?.edge;
	const stroke = relationColor(relEdge?.type ?? "custom");

	// Bezier ovunque: uniforme su tutti i tipi di relazione, indipendentemente
	// dal lato del nodo da cui parte/arriva (prima alcuni tipi usavano una
	// spezzata "a gradino" e altri una retta, con un effetto incoerente).
	const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

	return (
		<>
			<BaseEdge id={id} path={path} markerEnd={markerEnd} style={{ ...style, stroke, strokeWidth: 1.6 }} />
			{flowData?.label && (
				<EdgeLabelRenderer>
					<div
						style={{
							position: "absolute",
							transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
							backgroundColor: colors.bgPanel,
							color: stroke,
							border: `1px solid ${stroke}55`,
							borderRadius: radii.pill,
							padding: "2px 8px",
							fontFamily: fonts.body,
							fontSize: "0.65rem",
							fontWeight: 600,
							letterSpacing: "0.02em",
							pointerEvents: "all",
							whiteSpace: "nowrap",
						}}
						className="nodrag nopan"
						title={flowData.description}
					>
						{flowData.label}
					</div>
				</EdgeLabelRenderer>
			)}
		</>
	);
};
