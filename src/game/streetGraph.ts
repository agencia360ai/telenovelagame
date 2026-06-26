/**
 * Street graph for the dispatch map.
 *
 * Nodes are intersections, edges are street segments. Coordinates are normalized
 * to [0, 1] so the same graph maps onto any canvas size (the radar today, a
 * stylized Manhattan image later). Consumers multiply x/y by the canvas size.
 *
 * The default graph is a code-generated Manhattan-style grid with a few nodes
 * and edges removed so it isn't perfectly regular. Replace `nodes`/`edges` (or
 * regenerate from a real image's coordinates) without touching the helpers.
 */

export type GraphNode = { id: string; x: number; y: number };
export type Edge = [string, string];

const GRID_COLS: number = 5;
const GRID_ROWS: number = 5;
const MARGIN = 0.1; // keep the grid off the canvas edge

/** Grid node id from column/row, e.g. "n_1_2". */
function nid(col: number, row: number): string {
  return `n_${col}_${row}`;
}

function buildGrid(): { nodes: Record<string, GraphNode>; edges: Edge[] } {
  // A couple of holes so the grid isn't a perfect lattice.
  const removedNodes = new Set<string>([nid(2, 2)]);

  const nodes: Record<string, GraphNode> = {};
  const span = 1 - MARGIN * 2;

  for (let col = 0; col < GRID_COLS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      const id = nid(col, row);
      if (removedNodes.has(id)) continue;
      nodes[id] = {
        id,
        x: MARGIN + (GRID_COLS === 1 ? 0 : (col / (GRID_COLS - 1)) * span),
        y: MARGIN + (GRID_ROWS === 1 ? 0 : (row / (GRID_ROWS - 1)) * span),
      };
    }
  }

  // Drop a couple of edges to vary the network.
  const removedEdges = new Set<string>([
    edgeKey(nid(0, 0), nid(1, 0)),
    edgeKey(nid(3, 3), nid(3, 4)),
  ]);

  const edges: Edge[] = [];
  const seen = new Set<string>();
  const addEdge = (a: string, b: string) => {
    if (!nodes[a] || !nodes[b]) return;
    const key = edgeKey(a, b);
    if (seen.has(key) || removedEdges.has(key)) return;
    seen.add(key);
    edges.push([a, b]);
  };

  for (let col = 0; col < GRID_COLS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      const id = nid(col, row);
      if (!nodes[id]) continue;
      if (col + 1 < GRID_COLS) addEdge(id, nid(col + 1, row)); // horizontal
      if (row + 1 < GRID_ROWS) addEdge(id, nid(col, row + 1)); // vertical
    }
  }

  return { nodes, edges };
}

/** Order-independent key for an undirected edge. */
function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

const grid = buildGrid();

export const nodes: Record<string, GraphNode> = grid.nodes;
export const edges: Edge[] = grid.edges;

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
