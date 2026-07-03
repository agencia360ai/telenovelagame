/**
 * Street graph for the dispatch map.
 *
 * Nodes are intersections, edges are street segments. Coordinates are normalized
 * to [0, 1] so the same graph maps onto any canvas size. x is a fraction of the
 * map image width, y a fraction of its height; consumers multiply x by the
 * rendered width and y by the rendered height.
 *
 * This graph was hand-authored on the stylized Manhattan map image
 * (`assets/map/manhattan2.png`, 720×1280) with `tools/street-graph-editor.html`.
 * Re-edit there and paste a fresh export to replace `nodes`/`edges`; the helpers
 * below work on any normalized graph and don't need touching.
 */

export type GraphNode = { id: string; x: number; y: number };
export type Edge = [string, string];

export const nodes: Record<string, GraphNode> = {
  n_0: { id: "n_0", x: 0.5285, y: 0.3711 },
  n_1: { id: "n_1", x: 0.6007, y: 0.3867 },
  n_2: { id: "n_2", x: 0.5688, y: 0.4344 },
  n_3: { id: "n_3", x: 0.4979, y: 0.418 },
  n_4: { id: "n_4", x: 0.4104, y: 0.5477 },
  n_5: { id: "n_5", x: 0.4785, y: 0.5641 },
  n_6: { id: "n_6", x: 0.509, y: 0.5711 },
  n_7: { id: "n_7", x: 0.5563, y: 0.5828 },
  n_8: { id: "n_8", x: 0.5951, y: 0.5922 },
  n_9: { id: "n_9", x: 0.5257, y: 0.4953 },
  n_10: { id: "n_10", x: 0.5576, y: 0.5016 },
  n_11: { id: "n_11", x: 0.6049, y: 0.5141 },
  n_12: { id: "n_12", x: 0.6507, y: 0.5297 },
  n_13: { id: "n_13", x: 0.6007, y: 0.4414 },
  n_14: { id: "n_14", x: 0.666, y: 0.4586 },
  n_15: { id: "n_15", x: 0.6521, y: 0.4539 },
  n_16: { id: "n_16", x: 0.6313, y: 0.3938 },
  n_17: { id: "n_17", x: 0.5549, y: 0.3258 },
  n_18: { id: "n_18", x: 0.591, y: 0.3336 },
  n_19: { id: "n_19", x: 0.6285, y: 0.3438 },
  n_20: { id: "n_20", x: 0.6618, y: 0.35 },
  n_21: { id: "n_21", x: 0.7285, y: 0.3625 },
  n_22: { id: "n_22", x: 0.5604, y: 0.3773 },
  n_23: { id: "n_23", x: 0.6785, y: 0.325 },
  n_24: { id: "n_24", x: 0.6688, y: 0.2859 },
  n_25: { id: "n_25", x: 0.6521, y: 0.2484 },
  n_26: { id: "n_26", x: 0.6368, y: 0.2188 },
  n_27: { id: "n_27", x: 0.4854, y: 0.2906 },
  n_28: { id: "n_28", x: 0.5438, y: 0.3391 },
  n_29: { id: "n_29", x: 0.4549, y: 0.407 },
  n_30: { id: "n_30", x: 0.3979, y: 0.4922 },
  n_31: { id: "n_31", x: 0.4688, y: 0.3555 },
  n_32: { id: "n_32", x: 0.5049, y: 0.3008 },
  n_33: { id: "n_33", x: 0.5632, y: 0.2211 },
  n_34: { id: "n_34", x: 0.5299, y: 0.2133 },
  n_35: { id: "n_35", x: 0.5507, y: 0.1461 },
  n_37: { id: "n_37", x: 0.641, y: 0.1609 },
  n_38: { id: "n_38", x: 0.6174, y: 0.1547 },
  n_39: { id: "n_39", x: 0.4243, y: 0.5266 },
  n_40: { id: "n_40", x: 0.4938, y: 0.543 },
  n_41: { id: "n_41", x: 0.4743, y: 0.4539 },
  n_42: { id: "n_42", x: 0.5368, y: 0.475 },
  n_43: { id: "n_43", x: 0.4285, y: 0.4453 },
  n_44: { id: "n_44", x: 0.3535, y: 0.55 },
  n_45: { id: "n_45", x: 0.3174, y: 0.5438 },
  n_46: { id: "n_46", x: 0.3993, y: 0.5633 },
  n_47: { id: "n_47", x: 0.4688, y: 0.5789 },
  n_48: { id: "n_48", x: 0.4979, y: 0.5859 },
  n_49: { id: "n_49", x: 0.5465, y: 0.5977 },
  n_50: { id: "n_50", x: 0.5813, y: 0.607 },
  n_51: { id: "n_51", x: 0.2743, y: 0.593 },
  n_52: { id: "n_52", x: 0.3188, y: 0.6031 },
  n_53: { id: "n_53", x: 0.3632, y: 0.6141 },
  n_54: { id: "n_54", x: 0.4368, y: 0.6313 },
  n_55: { id: "n_55", x: 0.4646, y: 0.6352 },
  n_56: { id: "n_56", x: 0.5076, y: 0.6492 },
  n_57: { id: "n_57", x: 0.2535, y: 0.6242 },
  n_58: { id: "n_58", x: 0.2993, y: 0.6375 },
  n_59: { id: "n_59", x: 0.3438, y: 0.6484 },
  n_60: { id: "n_60", x: 0.4104, y: 0.6617 },
  n_61: { id: "n_61", x: 0.4396, y: 0.6719 },
  n_62: { id: "n_62", x: 0.484, y: 0.6828 },
  n_63: { id: "n_63", x: 0.2382, y: 0.6695 },
  n_64: { id: "n_64", x: 0.2674, y: 0.6758 },
  n_65: { id: "n_65", x: 0.3132, y: 0.6875 },
  n_66: { id: "n_66", x: 0.384, y: 0.7031 },
  n_67: { id: "n_67", x: 0.4049, y: 0.7102 },
  n_68: { id: "n_68", x: 0.4521, y: 0.7211 },
  n_69: { id: "n_69", x: 0.2424, y: 0.7078 },
  n_70: { id: "n_70", x: 0.284, y: 0.7211 },
  n_71: { id: "n_71", x: 0.3618, y: 0.7383 },
  n_72: { id: "n_72", x: 0.4215, y: 0.7578 },
  n_73: { id: "n_73", x: 0.2313, y: 0.7273 },
  n_74: { id: "n_74", x: 0.234, y: 0.8047 },
  n_75: { id: "n_75", x: 0.2646, y: 0.8164 },
  n_76: { id: "n_76", x: 0.2688, y: 0.7391 },
  n_77: { id: "n_77", x: 0.2896, y: 0.8297 },
  n_78: { id: "n_78", x: 0.2979, y: 0.7852 },
  n_79: { id: "n_79", x: 0.3326, y: 0.7305 },
  n_80: { id: "n_80", x: 0.3563, y: 0.8023 },
  n_81: { id: "n_81", x: 0.384, y: 0.8063 },
  n_82: { id: "n_82", x: 0.3201, y: 0.8398 },
  n_83: { id: "n_83", x: 0.3674, y: 0.8578 },
  n_84: { id: "n_84", x: 0.391, y: 0.7461 },
  n_85: { id: "n_85", x: 0.5049, y: 0.7758 },
  n_86: { id: "n_86", x: 0.4674, y: 0.8227 },
  n_87: { id: "n_87", x: 0.409, y: 0.8094 },
  n_88: { id: "n_88", x: 0.3951, y: 0.8344 },
  n_89: { id: "n_89", x: 0.3813, y: 0.8672 },
  n_90: { id: "n_90", x: 0.5132, y: 0.8586 },
  n_91: { id: "n_91", x: 0.5201, y: 0.8344 },
  n_92: { id: "n_92", x: 0.5368, y: 0.7836 },
  n_93: { id: "n_93", x: 0.5007, y: 0.7344 },
  n_94: { id: "n_94", x: 0.516, y: 0.6906 },
  n_95: { id: "n_95", x: 0.5438, y: 0.6539 },
  n_96: { id: "n_96", x: 0.4979, y: 0.8797 },
  n_97: { id: "n_97", x: 0.4035, y: 0.8938 },
  n_98: { id: "n_98", x: 0.3451, y: 0.907 },
  n_99: { id: "n_99", x: 0.284, y: 0.9414 },
  n_100: { id: "n_100", x: 0.241, y: 0.9539 },
  n_101: { id: "n_101", x: 0.2326, y: 0.9328 },
  n_102: { id: "n_102", x: 0.2104, y: 0.9273 },
  n_103: { id: "n_103", x: 0.2271, y: 0.8742 },
  n_104: { id: "n_104", x: 0.2563, y: 0.8836 },
  n_105: { id: "n_105", x: 0.2715, y: 0.8891 },
  n_106: { id: "n_106", x: 0.3063, y: 0.882 },
  n_107: { id: "n_107", x: 0.3146, y: 0.8617 },
  n_108: { id: "n_108", x: 0.3549, y: 0.4813 },
  n_109: { id: "n_109", x: 0.384, y: 0.4227 },
  n_110: { id: "n_110", x: 0.416, y: 0.4008 },
  n_111: { id: "n_111", x: 0.441, y: 0.3461 },
  n_112: { id: "n_112", x: 0.5188, y: 0.2516 },
  n_113: { id: "n_113", x: 0.6951, y: 0.4398 },
  n_114: { id: "n_114", x: 0.7063, y: 0.4195 },
  n_115: { id: "n_115", x: 0.7424, y: 0.4 },
  n_116: { id: "n_116", x: 0.6854, y: 0.4063 },
  n_117: { id: "n_117", x: 0.5705, y: 0.1046 },
  n_118: { id: "n_118", x: 0.5962, y: 0.0661 },
  n_119: { id: "n_119", x: 0.6667, y: 0.1142 },
  n_120: { id: "n_120", x: 0.5855, y: 0.1478 },
  n_121: { id: "n_121", x: 0.609, y: 0.107 },
  n_122: { id: "n_122", x: 0.6154, y: 0.0793 },
  n_123: { id: "n_123", x: 0.6538, y: 0.1022 },
  n_124: { id: "n_124", x: 0.5748, y: 0.1827 },
  n_125: { id: "n_125", x: 0.6798, y: 0.4977 },
};

export const edges: Edge[] = [
  ["n_118", "n_122"],
  ["n_122", "n_123"],
  ["n_123", "n_119"],
  ["n_119", "n_121"],
  ["n_121", "n_117"],
  ["n_117", "n_118"],
  ["n_121", "n_122"],
  ["n_121", "n_123"],
  ["n_117", "n_35"],
  ["n_35", "n_120"],
  ["n_120", "n_121"],
  ["n_120", "n_38"],
  ["n_38", "n_37"],
  ["n_37", "n_119"],
  ["n_38", "n_123"],
  ["n_35", "n_34"],
  ["n_34", "n_112"],
  ["n_112", "n_27"],
  ["n_27", "n_111"],
  ["n_111", "n_110"],
  ["n_110", "n_109"],
  ["n_109", "n_108"],
  ["n_108", "n_45"],
  ["n_45", "n_51"],
  ["n_51", "n_57"],
  ["n_57", "n_63"],
  ["n_63", "n_69"],
  ["n_69", "n_73"],
  ["n_73", "n_74"],
  ["n_74", "n_103"],
  ["n_103", "n_102"],
  ["n_102", "n_101"],
  ["n_101", "n_100"],
  ["n_100", "n_99"],
  ["n_99", "n_98"],
  ["n_98", "n_97"],
  ["n_97", "n_96"],
  ["n_96", "n_90"],
  ["n_90", "n_91"],
  ["n_91", "n_92"],
  ["n_92", "n_93"],
  ["n_93", "n_94"],
  ["n_94", "n_95"],
  ["n_95", "n_50"],
  ["n_50", "n_8"],
  ["n_8", "n_12"],
  ["n_12", "n_125"],
  ["n_125", "n_14"],
  ["n_14", "n_113"],
  ["n_113", "n_114"],
  ["n_114", "n_115"],
  ["n_21", "n_115"],
  ["n_21", "n_23"],
  ["n_23", "n_24"],
  ["n_24", "n_25"],
  ["n_25", "n_26"],
  ["n_26", "n_37"],
  ["n_124", "n_34"],
  ["n_34", "n_33"],
  ["n_33", "n_124"],
  ["n_33", "n_38"],
  ["n_120", "n_124"],
  ["n_124", "n_38"],
  ["n_25", "n_33"],
  ["n_32", "n_33"],
  ["n_32", "n_28"],
  ["n_28", "n_17"],
  ["n_17", "n_32"],
  ["n_17", "n_18"],
  ["n_18", "n_25"],
  ["n_24", "n_19"],
  ["n_19", "n_18"],
  ["n_19", "n_20"],
  ["n_20", "n_23"],
  ["n_21", "n_20"],
  ["n_28", "n_0"],
  ["n_0", "n_22"],
  ["n_22", "n_1"],
  ["n_1", "n_16"],
  ["n_16", "n_20"],
  ["n_19", "n_1"],
  ["n_22", "n_18"],
  ["n_17", "n_0"],
  ["n_0", "n_31"],
  ["n_31", "n_111"],
  ["n_31", "n_32"],
  ["n_24", "n_112"],
  ["n_16", "n_116"],
  ["n_116", "n_21"],
  ["n_116", "n_15"],
  ["n_15", "n_14"],
  ["n_15", "n_13"],
  ["n_13", "n_16"],
  ["n_13", "n_2"],
  ["n_2", "n_1"],
  ["n_0", "n_3"],
  ["n_3", "n_2"],
  ["n_3", "n_29"],
  ["n_29", "n_110"],
  ["n_29", "n_31"],
  ["n_29", "n_43"],
  ["n_43", "n_41"],
  ["n_41", "n_3"],
  ["n_41", "n_42"],
  ["n_42", "n_2"],
  ["n_42", "n_9"],
  ["n_9", "n_10"],
  ["n_10", "n_11"],
  ["n_11", "n_12"],
  ["n_11", "n_15"],
  ["n_13", "n_10"],
  ["n_41", "n_39"],
  ["n_39", "n_4"],
  ["n_4", "n_5"],
  ["n_5", "n_40"],
  ["n_40", "n_39"],
  ["n_40", "n_9"],
  ["n_43", "n_30"],
  ["n_30", "n_108"],
  ["n_30", "n_4"],
  ["n_4", "n_46"],
  ["n_46", "n_44"],
  ["n_44", "n_45"],
  ["n_44", "n_30"],
  ["n_46", "n_47"],
  ["n_47", "n_5"],
  ["n_5", "n_6"],
  ["n_6", "n_48"],
  ["n_48", "n_47"],
  ["n_48", "n_49"],
  ["n_49", "n_7"],
  ["n_7", "n_6"],
  ["n_7", "n_8"],
  ["n_50", "n_49"],
  ["n_7", "n_11"],
  ["n_6", "n_10"],
  ["n_51", "n_52"],
  ["n_52", "n_44"],
  ["n_52", "n_53"],
  ["n_53", "n_46"],
  ["n_53", "n_54"],
  ["n_54", "n_47"],
  ["n_54", "n_55"],
  ["n_55", "n_48"],
  ["n_55", "n_56"],
  ["n_56", "n_49"],
  ["n_56", "n_62"],
  ["n_62", "n_61"],
  ["n_61", "n_55"],
  ["n_54", "n_60"],
  ["n_60", "n_61"],
  ["n_60", "n_59"],
  ["n_59", "n_53"],
  ["n_59", "n_58"],
  ["n_58", "n_52"],
  ["n_58", "n_57"],
  ["n_63", "n_64"],
  ["n_64", "n_58"],
  ["n_59", "n_65"],
  ["n_65", "n_64"],
  ["n_65", "n_66"],
  ["n_66", "n_60"],
  ["n_61", "n_67"],
  ["n_67", "n_66"],
  ["n_67", "n_68"],
  ["n_68", "n_62"],
  ["n_62", "n_94"],
  ["n_93", "n_68"],
  ["n_64", "n_69"],
  ["n_69", "n_70"],
  ["n_70", "n_65"],
  ["n_66", "n_71"],
  ["n_71", "n_79"],
  ["n_79", "n_70"],
  ["n_71", "n_84"],
  ["n_84", "n_67"],
  ["n_68", "n_72"],
  ["n_72", "n_84"],
  ["n_72", "n_85"],
  ["n_85", "n_92"],
  ["n_91", "n_86"],
  ["n_86", "n_85"],
  ["n_86", "n_87"],
  ["n_87", "n_81"],
  ["n_81", "n_72"],
  ["n_84", "n_81"],
  ["n_81", "n_80"],
  ["n_80", "n_78"],
  ["n_78", "n_79"],
  ["n_70", "n_76"],
  ["n_75", "n_76"],
  ["n_75", "n_74"],
  ["n_75", "n_77"],
  ["n_77", "n_78"],
  ["n_77", "n_82"],
  ["n_82", "n_80"],
  ["n_81", "n_83"],
  ["n_83", "n_82"],
  ["n_83", "n_89"],
  ["n_89", "n_88"],
  ["n_88", "n_87"],
  ["n_90", "n_88"],
  ["n_89", "n_97"],
  ["n_98", "n_106"],
  ["n_106", "n_107"],
  ["n_107", "n_82"],
  ["n_106", "n_105"],
  ["n_105", "n_104"],
  ["n_104", "n_77"],
  ["n_104", "n_103"],
  ["n_101", "n_104"],
  ["n_101", "n_105"],
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
