/**
 * Street graph for the dispatch map.
 *
 * Nodes are intersections, edges are street segments. Coordinates are normalized
 * to [0, 1] so the same graph maps onto any canvas size. x is a fraction of the
 * map image width, y a fraction of its height; consumers multiply x by the
 * rendered width and y by the rendered height.
 *
 * This graph was hand-authored on the stylized Manhattan map image
 * (`assets/map/manhattan.png`, 688×1316) with `tools/street-graph-editor.html`.
 * Re-edit there and paste a fresh export to replace `nodes`/`edges`; the helpers
 * below work on any normalized graph and don't need touching.
 */

export type GraphNode = { id: string; x: number; y: number };
export type Edge = [string, string];

export const nodes: Record<string, GraphNode> = {
  n_0: { id: "n_0", x: 0.3946, y: 0.2044 },
  n_1: { id: "n_1", x: 0.3975, y: 0.247 },
  n_2: { id: "n_2", x: 0.3961, y: 0.2804 },
  n_3: { id: "n_3", x: 0.3975, y: 0.3176 },
  n_4: { id: "n_4", x: 0.3946, y: 0.3412 },
  n_5: { id: "n_5", x: 0.3961, y: 0.3526 },
  n_6: { id: "n_6", x: 0.3975, y: 0.4415 },
  n_7: { id: "n_7", x: 0.4179, y: 0.2477 },
  n_8: { id: "n_8", x: 0.4179, y: 0.2842 },
  n_9: { id: "n_9", x: 0.4179, y: 0.3191 },
  n_11: { id: "n_11", x: 0.4179, y: 0.3853 },
  n_12: { id: "n_12", x: 0.3975, y: 0.3769 },
  n_13: { id: "n_13", x: 0.4164, y: 0.4422 },
  n_14: { id: "n_14", x: 0.4222, y: 0.4901 },
  n_15: { id: "n_15", x: 0.4077, y: 0.4909 },
  n_18: { id: "n_18", x: 0.4179, y: 0.5426 },
  n_19: { id: "n_19", x: 0.4179, y: 0.5509 },
  n_20: { id: "n_20", x: 0.4411, y: 0.5486 },
  n_21: { id: "n_21", x: 0.4397, y: 0.5403 },
  n_23: { id: "n_23", x: 0.4615, y: 0.5456 },
  n_24: { id: "n_24", x: 0.46, y: 0.4886 },
  n_25: { id: "n_25", x: 0.4629, y: 0.4377 },
  n_26: { id: "n_26", x: 0.4629, y: 0.3883 },
  n_27: { id: "n_27", x: 0.4629, y: 0.3533 },
  n_28: { id: "n_28", x: 0.46, y: 0.3176 },
  n_29: { id: "n_29", x: 0.4615, y: 0.2827 },
  n_30: { id: "n_30", x: 0.4818, y: 0.2827 },
  n_31: { id: "n_31", x: 0.4615, y: 0.3009 },
  n_32: { id: "n_32", x: 0.4862, y: 0.3176 },
  n_33: { id: "n_33", x: 0.5196, y: 0.3169 },
  n_34: { id: "n_34", x: 0.5153, y: 0.3435 },
  n_35: { id: "n_35", x: 0.5443, y: 0.345 },
  n_36: { id: "n_36", x: 0.5443, y: 0.3533 },
  n_37: { id: "n_37", x: 0.5051, y: 0.3541 },
  n_38: { id: "n_38", x: 0.5051, y: 0.3883 },
  n_39: { id: "n_39", x: 0.5443, y: 0.3883 },
  n_40: { id: "n_40", x: 0.5923, y: 0.3868 },
  n_41: { id: "n_41", x: 0.5574, y: 0.4202 },
  n_42: { id: "n_42", x: 0.5371, y: 0.421 },
  n_43: { id: "n_43", x: 0.4833, y: 0.421 },
  n_44: { id: "n_44", x: 0.5051, y: 0.421 },
  n_45: { id: "n_45", x: 0.5007, y: 0.4392 },
  n_46: { id: "n_46", x: 0.4833, y: 0.4407 },
  n_47: { id: "n_47", x: 0.5356, y: 0.44 },
  n_48: { id: "n_48", x: 0.5385, y: 0.4863 },
  n_49: { id: "n_49", x: 0.5661, y: 0.4878 },
  n_50: { id: "n_50", x: 0.5647, y: 0.4536 },
  n_51: { id: "n_51", x: 0.5836, y: 0.4536 },
  n_52: { id: "n_52", x: 0.5981, y: 0.4688 },
  n_53: { id: "n_53", x: 0.5792, y: 0.4688 },
  n_54: { id: "n_54", x: 0.5618, y: 0.4688 },
  n_55: { id: "n_55", x: 0.5996, y: 0.4179 },
  n_56: { id: "n_56", x: 0.5807, y: 0.4202 },
  n_57: { id: "n_57", x: 0.5778, y: 0.3891 },
  n_58: { id: "n_58", x: 0.6228, y: 0.4202 },
  n_59: { id: "n_59", x: 0.6156, y: 0.3936 },
  n_60: { id: "n_60", x: 0.6185, y: 0.4491 },
  n_61: { id: "n_61", x: 0.6185, y: 0.4673 },
  n_62: { id: "n_62", x: 0.6214, y: 0.4833 },
  n_63: { id: "n_63", x: 0.6112, y: 0.5486 },
  n_64: { id: "n_64", x: 0.6185, y: 0.617 },
  n_65: { id: "n_65", x: 0.5661, y: 0.6178 },
  n_66: { id: "n_66", x: 0.5661, y: 0.5509 },
  n_68: { id: "n_68", x: 0.4629, y: 0.6277 },
  n_69: { id: "n_69", x: 0.4237, y: 0.6284 },
  n_70: { id: "n_70", x: 0.4193, y: 0.5957 },
  n_71: { id: "n_71", x: 0.4179, y: 0.6831 },
  n_72: { id: "n_72", x: 0.5327, y: 0.6771 },
  n_73: { id: "n_73", x: 0.5632, y: 0.6748 },
  n_74: { id: "n_74", x: 0.5603, y: 0.7021 },
  n_75: { id: "n_75", x: 0.5385, y: 0.7014 },
  n_76: { id: "n_76", x: 0.444, y: 0.7006 },
  n_77: { id: "n_77", x: 0.4208, y: 0.7462 },
  n_78: { id: "n_78", x: 0.4397, y: 0.747 },
  n_79: { id: "n_79", x: 0.4586, y: 0.747 },
  n_80: { id: "n_80", x: 0.4876, y: 0.747 },
  n_81: { id: "n_81", x: 0.5138, y: 0.7462 },
  n_82: { id: "n_82", x: 0.5414, y: 0.7447 },
  n_83: { id: "n_83", x: 0.5705, y: 0.7447 },
  n_84: { id: "n_84", x: 0.5865, y: 0.7447 },
  n_85: { id: "n_85", x: 0.6156, y: 0.7432 },
  n_86: { id: "n_86", x: 0.6126, y: 0.7014 },
  n_87: { id: "n_87", x: 0.5938, y: 0.7014 },
  n_88: { id: "n_88", x: 0.5094, y: 0.6998 },
  n_89: { id: "n_89", x: 0.4804, y: 0.7014 },
  n_90: { id: "n_90", x: 0.4426, y: 0.6771 },
  n_91: { id: "n_91", x: 0.4702, y: 0.674 },
  n_92: { id: "n_92", x: 0.4891, y: 0.674 },
  n_93: { id: "n_93", x: 0.5182, y: 0.6763 },
  n_94: { id: "n_94", x: 0.4964, y: 0.6223 },
  n_95: { id: "n_95", x: 0.5225, y: 0.6239 },
  n_96: { id: "n_96", x: 0.5734, y: 0.6246 },
  n_97: { id: "n_97", x: 0.3932, y: 0.6269 },
  n_98: { id: "n_98", x: 0.3975, y: 0.576 },
  n_99: { id: "n_99", x: 0.4455, y: 0.5745 },
  n_100: { id: "n_100", x: 0.4615, y: 0.5745 },
  n_101: { id: "n_101", x: 0.4469, y: 0.7751 },
  n_102: { id: "n_102", x: 0.4615, y: 0.7743 },
  n_103: { id: "n_103", x: 0.4789, y: 0.7743 },
  n_104: { id: "n_104", x: 0.5065, y: 0.7743 },
  n_105: { id: "n_105", x: 0.5327, y: 0.7743 },
  n_106: { id: "n_106", x: 0.5501, y: 0.7743 },
  n_107: { id: "n_107", x: 0.5836, y: 0.7751 },
  n_108: { id: "n_108", x: 0.6068, y: 0.7766 },
  n_109: { id: "n_109", x: 0.6374, y: 0.7774 },
  n_110: { id: "n_110", x: 0.665, y: 0.7766 },
  n_111: { id: "n_111", x: 0.6664, y: 0.7584 },
  n_112: { id: "n_112", x: 0.6679, y: 0.8123 },
  n_113: { id: "n_113", x: 0.7115, y: 0.8131 },
  n_114: { id: "n_114", x: 0.6141, y: 0.8199 },
  n_115: { id: "n_115", x: 0.5981, y: 0.8207 },
  n_116: { id: "n_116", x: 0.4964, y: 0.8267 },
  n_117: { id: "n_117", x: 0.508, y: 0.7986 },
  n_118: { id: "n_118", x: 0.4818, y: 0.8321 },
  n_119: { id: "n_119", x: 0.4964, y: 0.8488 },
  n_120: { id: "n_120", x: 0.5283, y: 0.8564 },
  n_121: { id: "n_121", x: 0.5196, y: 0.8777 },
  n_122: { id: "n_122", x: 0.5865, y: 0.8792 },
  n_123: { id: "n_123", x: 0.6141, y: 0.8617 },
  n_124: { id: "n_124", x: 0.601, y: 0.8374 },
  n_125: { id: "n_125", x: 0.5763, y: 0.8374 },
  n_126: { id: "n_126", x: 0.6446, y: 0.8374 },
  n_127: { id: "n_127", x: 0.6417, y: 0.8571 },
  n_128: { id: "n_128", x: 0.6533, y: 0.8799 },
  n_130: { id: "n_130", x: 0.54, y: 0.8982 },
};

export const edges: Edge[] = [
  ["n_0", "n_1"],
  ["n_1", "n_7"],
  ["n_1", "n_2"],
  ["n_2", "n_8"],
  ["n_8", "n_7"],
  ["n_8", "n_29"],
  ["n_29", "n_30"],
  ["n_30", "n_31"],
  ["n_31", "n_29"],
  ["n_29", "n_28"],
  ["n_28", "n_32"],
  ["n_32", "n_33"],
  ["n_33", "n_35"],
  ["n_35", "n_36"],
  ["n_36", "n_37"],
  ["n_37", "n_34"],
  ["n_34", "n_35"],
  ["n_27", "n_37"],
  ["n_28", "n_3"],
  ["n_9", "n_3"],
  ["n_2", "n_3"],
  ["n_3", "n_4"],
  ["n_4", "n_5"],
  ["n_5", "n_12"],
  ["n_12", "n_6"],
  ["n_6", "n_13"],
  ["n_13", "n_11"],
  ["n_11", "n_26"],
  ["n_26", "n_25"],
  ["n_25", "n_13"],
  ["n_26", "n_38"],
  ["n_38", "n_39"],
  ["n_39", "n_57"],
  ["n_57", "n_40"],
  ["n_40", "n_59"],
  ["n_59", "n_58"],
  ["n_58", "n_55"],
  ["n_55", "n_40"],
  ["n_57", "n_56"],
  ["n_56", "n_41"],
  ["n_41", "n_39"],
  ["n_39", "n_42"],
  ["n_42", "n_44"],
  ["n_44", "n_38"],
  ["n_26", "n_43"],
  ["n_43", "n_44"],
  ["n_45", "n_44"],
  ["n_42", "n_47"],
  ["n_47", "n_45"],
  ["n_45", "n_46"],
  ["n_46", "n_25"],
  ["n_15", "n_14"],
  ["n_14", "n_13"],
  ["n_14", "n_24"],
  ["n_24", "n_48"],
  ["n_48", "n_49"],
  ["n_49", "n_54"],
  ["n_54", "n_50"],
  ["n_50", "n_51"],
  ["n_51", "n_53"],
  ["n_53", "n_54"],
  ["n_54", "n_52"],
  ["n_61", "n_60"],
  ["n_60", "n_51"],
  ["n_53", "n_49"],
  ["n_49", "n_62"],
  ["n_49", "n_66"],
  ["n_66", "n_63"],
  ["n_66", "n_65"],
  ["n_65", "n_64"],
  ["n_65", "n_96"],
  ["n_96", "n_95"],
  ["n_65", "n_95"],
  ["n_95", "n_94"],
  ["n_68", "n_94"],
  ["n_68", "n_69"],
  ["n_69", "n_97"],
  ["n_69", "n_70"],
  ["n_70", "n_98"],
  ["n_98", "n_99"],
  ["n_99", "n_100"],
  ["n_99", "n_20"],
  ["n_20", "n_23"],
  ["n_23", "n_100"],
  ["n_20", "n_21"],
  ["n_20", "n_19"],
  ["n_19", "n_18"],
  ["n_18", "n_70"],
  ["n_69", "n_71"],
  ["n_71", "n_90"],
  ["n_90", "n_91"],
  ["n_91", "n_92"],
  ["n_92", "n_72"],
  ["n_72", "n_93"],
  ["n_93", "n_73"],
  ["n_75", "n_74"],
  ["n_74", "n_73"],
  ["n_73", "n_72"],
  ["n_72", "n_75"],
  ["n_75", "n_88"],
  ["n_88", "n_93"],
  ["n_93", "n_92"],
  ["n_92", "n_89"],
  ["n_89", "n_76"],
  ["n_76", "n_91"],
  ["n_90", "n_76"],
  ["n_76", "n_71"],
  ["n_71", "n_77"],
  ["n_77", "n_78"],
  ["n_78", "n_76"],
  ["n_79", "n_80"],
  ["n_80", "n_89"],
  ["n_89", "n_79"],
  ["n_79", "n_78"],
  ["n_80", "n_81"],
  ["n_81", "n_88"],
  ["n_75", "n_82"],
  ["n_82", "n_81"],
  ["n_81", "n_83"],
  ["n_83", "n_74"],
  ["n_74", "n_86"],
  ["n_86", "n_87"],
  ["n_87", "n_74"],
  ["n_87", "n_84"],
  ["n_84", "n_83"],
  ["n_84", "n_85"],
  ["n_85", "n_86"],
  ["n_86", "n_111"],
  ["n_110", "n_111"],
  ["n_110", "n_109"],
  ["n_109", "n_108"],
  ["n_108", "n_85"],
  ["n_85", "n_109"],
  ["n_108", "n_107"],
  ["n_107", "n_84"],
  ["n_83", "n_107"],
  ["n_107", "n_106"],
  ["n_106", "n_82"],
  ["n_81", "n_105"],
  ["n_105", "n_106"],
  ["n_107", "n_105"],
  ["n_105", "n_104"],
  ["n_104", "n_103"],
  ["n_103", "n_80"],
  ["n_80", "n_104"],
  ["n_104", "n_81"],
  ["n_103", "n_79"],
  ["n_79", "n_102"],
  ["n_102", "n_101"],
  ["n_101", "n_78"],
  ["n_101", "n_77"],
  ["n_82", "n_83"],
  ["n_85", "n_111"],
  ["n_110", "n_112"],
  ["n_113", "n_112"],
  ["n_112", "n_114"],
  ["n_114", "n_115"],
  ["n_115", "n_124"],
  ["n_124", "n_126"],
  ["n_126", "n_114"],
  ["n_112", "n_126"],
  ["n_126", "n_127"],
  ["n_127", "n_123"],
  ["n_123", "n_128"],
  ["n_123", "n_122"],
  ["n_122", "n_130"],
  ["n_130", "n_121"],
  ["n_121", "n_120"],
  ["n_120", "n_122"],
  ["n_122", "n_121"],
  ["n_120", "n_123"],
  ["n_123", "n_124"],
  ["n_124", "n_125"],
  ["n_125", "n_115"],
  ["n_125", "n_120"],
  ["n_120", "n_119"],
  ["n_119", "n_118"],
  ["n_118", "n_116"],
  ["n_116", "n_120"],
  ["n_119", "n_125"],
  ["n_125", "n_116"],
  ["n_116", "n_117"],
  ["n_117", "n_104"],
  ["n_105", "n_117"],
  ["n_117", "n_118"],
  ["n_118", "n_101"],
];


const nodeIds = Object.keys(nodes);

/** Adjacency list derived from `edges` (bidirectional). */
const adjacency: Record<string, string[]> = (() => {
  const adj: Record<string, string[]> = {};
  for (const id of nodeIds) adj[id] = [];
  for (const [a, b] of edges) {
    adj[a].push(b);
    adj[b].push(a);
  }
  return adj;
})();

/** Euclidean distance between two nodes (in normalized 0..1 units). */
export function dist(a: GraphNode, b: GraphNode): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function neighbors(id: string): string[] {
  return adjacency[id] ?? [];
}

/**
 * Dijkstra shortest path weighted by edge length. Returns an ordered list of
 * node ids from `from` to `to` (inclusive), or `[]` if unreachable.
 * The graph is tiny (~25 nodes) so a linear-scan priority queue is plenty.
 */
export function shortestPath(from: string, to: string): string[] {
  if (from === to) return [from];
  if (!nodes[from] || !nodes[to]) return [];

  const distTo: Record<string, number> = {};
  const prev: Record<string, string | null> = {};
  const visited = new Set<string>();

  for (const id of nodeIds) distTo[id] = Infinity;
  distTo[from] = 0;
  prev[from] = null;

  while (true) {
    // Pick the unvisited node with the smallest tentative distance.
    let current: string | null = null;
    let best = Infinity;
    for (const id of nodeIds) {
      if (visited.has(id)) continue;
      if (distTo[id] < best) {
        best = distTo[id];
        current = id;
      }
    }

    if (current == null || best === Infinity) break;
    if (current === to) break;
    visited.add(current);

    for (const next of neighbors(current)) {
      if (visited.has(next)) continue;
      const alt = distTo[current] + dist(nodes[current], nodes[next]);
      if (alt < distTo[next]) {
        distTo[next] = alt;
        prev[next] = current;
      }
    }
  }

  if (distTo[to] === Infinity) return [];

  const path: string[] = [];
  let cur: string | null = to;
  while (cur != null) {
    path.unshift(cur);
    cur = prev[cur] ?? null;
  }
  return path;
}

export function randomNodeId(): string {
  return nodeIds[Math.floor(Math.random() * nodeIds.length)];
}

export function randomDifferentNodeId(exclude: string): string {
  if (nodeIds.length <= 1) return nodeIds[0];
  let id = exclude;
  while (id === exclude) {
    id = randomNodeId();
  }
  return id;
}
