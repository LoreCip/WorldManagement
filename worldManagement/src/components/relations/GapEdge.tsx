import React from "react";
import { EdgeLabelRenderer, EdgeProps, getStraightPath } from "@xyflow/react";
import { colors, fonts, radii } from "../theme/theme";
import { useLocalization } from "../../context/LocalizationContext";
import { GraphEdgeData } from "../../types/relations";
import { RelationEdgeFlowData } from "./RelationEdge";

/** Arco "spezzato": due segmenti con un varco al centro, per rappresentare
 *  una discendenza certa ma con generazioni intermedie non documentate. */
export const GapEdge: React.FC<EdgeProps> = ({ id, sourceX, sourceY, targetX, targetY, data }) => {
	const { t } = useLocalization();
	const flowData = data as RelationEdgeFlowData | undefined;
	const relEdge = flowData?.edge as GraphEdgeData | undefined;

	const midX = (sourceX + targetX) / 2;
	const midY = (sourceY + targetY) / 2;

	// Punti di interruzione: due tratti brevi appena prima/dopo il centro,
	// lungo la retta tra sorgente e target.
	const gapFraction = 0.14;
	const beforeGapX = sourceX + (midX - sourceX) * (1 - gapFraction);
	const beforeGapY = sourceY + (midY - sourceY) * (1 - gapFraction);
	const afterGapX = midX + (targetX - midX) * gapFraction;
	const afterGapY = midY + (targetY - midY) * gapFraction;

	const [pathA] = getStraightPath({ sourceX, sourceY, targetX: beforeGapX, targetY: beforeGapY });
	const [pathB] = getStraightPath({ sourceX: afterGapX, sourceY: afterGapY, targetX, targetY });

	const stroke = relEdge?.isUncertain ? `${colors.gold}99` : colors.gold;
	const dash = relEdge?.isUncertain ? "5 4" : undefined;
	const count = relEdge?.generationalGapCount;

	return (
		<>
			<path
				id={`${id}-a`}
				d={pathA}
				fill="none"
				stroke={stroke}
				strokeWidth={1.8}
				strokeDasharray={dash}
				markerEnd="url(#relations-arrow)"
			/>
			<path id={`${id}-b`} d={pathB} fill="none" stroke={stroke} strokeWidth={1.8} strokeDasharray={dash} />

			<EdgeLabelRenderer>
				<div
					style={{
						position: "absolute",
						transform: `translate(-50%, -50%) translate(${midX}px, ${midY}px)`,
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
					title={t("relations.gap.hint")}
				>
					<span>⋯</span>
					{count ? t("relations.gap.unknownGenerations", { count }) : t("relations.gap.label")}
				</div>
			</EdgeLabelRenderer>
		</>
	);
};
