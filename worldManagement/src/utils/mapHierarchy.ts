import { MapItem } from "../types/map";

export interface HierarchicalMapNode {
  map: MapItem;
  level: number;
  children: HierarchicalMapNode[];
}

export interface FlatMapItem {
  map: MapItem;
  level: number;
  isLast: boolean;
  ancestorsHasMore: boolean[]; // true se per quel livello c'è ancora un fratello successivo
}

const getParentId = (map: MapItem): string | null => {
  if (!map.parent_map_id || map.parent_map_id.trim() === "") {
    return null;
  }
  return map.parent_map_id;
};

export const getTopLevelMap = (maps: MapItem[]): MapItem | null => {
  if (maps.length === 0) return null;
  const rootMap = maps.find((m) => !m.parent_map_id || m.parent_map_id.trim() === "");
  return rootMap || maps[0];
};

export const buildMapHierarchy = (maps: MapItem[]): HierarchicalMapNode[] => {
  const rootMaps = maps.filter((m) => getParentId(m) === null);

  const buildNode = (map: MapItem, currentLevel: number): HierarchicalMapNode => {
    const childMaps = maps.filter((m) => getParentId(m) === map.id);
    return {
      map,
      level: currentLevel,
      children: childMaps.map((child) => buildNode(child, currentLevel + 1)),
    };
  };

  return rootMaps.map((root) => buildNode(root, 0));
};

export const flattenMapHierarchy = (
  nodes: HierarchicalMapNode[],
  ancestorsHasMore: boolean[] = [],
): FlatMapItem[] => {
  let result: FlatMapItem[] = [];

  nodes.forEach((node, index) => {
    const isLastChild = index === nodes.length - 1;
    // Se NON è l'ultimo figlio, significa che quel livello ha ancora fratelli dopo
    const hasMore = !isLastChild;

    result.push({
      map: node.map,
      level: node.level,
      isLast: isLastChild,
      ancestorsHasMore: ancestorsHasMore,
    });

    if (node.children.length > 0) {
      // I figli ereditano la storia di tutti i livelli superiori
      result = result.concat(flattenMapHierarchy(node.children, [...ancestorsHasMore, hasMore]));
    }
  });

  return result;
};

export const getTreePrefix = (
  item: Pick<FlatMapItem, "level" | "isLast" | "ancestorsHasMore">,
): string => {
  if (item.level === 0) return "🗺️\u00A0";

  let prefix = "";
  // Mette la stanghetta '│' per ogni livello antenato che ha altri elementi dopo
  for (let i = 0; i < item.level - 1; i++) {
    prefix += item.ancestorsHasMore[i] ? "│\u00A0\u00A0\u00A0" : "\u00A0\u00A0\u00A0\u00A0";
  }
  // Simbolo del nodo corrente
  prefix += item.isLast ? "└─\u00A0" : "├─\u00A0";
  return prefix;
};
