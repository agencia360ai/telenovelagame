# Street-Graph Ambient Units — Radar Sandbox

> Status: implemented · Author: Christian Aldaco + Claude · Date: 2026-06-26

## 1. Problem & goal

The dispatch view ([`src/components/DispatchRadar.tsx`](../../src/components/DispatchRadar.tsx))
shows a circular radar where a **single** unit travels from the center to a blip
(position derived from a hash of `callId`). There is no notion of **streets** or of
**multiple** moving units.

This is the **first experiment** toward replacing the radar with a stylized Manhattan
map: validate a **street-graph** approach. We want **N ambient units** that spawn on
random intersections and move in **straight, segment-by-segment** lines along the
streets toward random destinations, looping forever — rendered over the existing radar
look in an **isolated sandbox screen**.

> This is NOT the 3-map (country → state → city) zoom plan. Just the Manhattan-style
> grid graph, tested inside the radar look.

## 2. Decisions (confirmed with the user)

| Topic | Decision |
| --- | --- |
| Streets | **Drawn faintly** for now. Later replaced by a stylized image + recreated graph. |
| Duration | **Long test loop** — ambient units never stop, so movement can be observed. |
| Location | **Isolated sandbox screen**; do NOT touch `DispatchRadar` or the real dispatch flow. |
| Libraries | Reuse `react-native-reanimated` only. No SVG/Skia — lines are rotated rects (same trick as the radar `trail`). |

## 3. Architecture

Graph coordinates are **normalized 0..1** (resolution-independent). Each component
multiplies by the canvas size (`RADAR_SIZE`). The same graph data will later map onto a
larger stylized image without rewriting it.

### Graph data + utilities — `src/game/streetGraph.ts`
- `GraphNode = { id, x, y }` with `x,y ∈ [0,1]`.
- A code-generated **Manhattan-style grid** (`GRID_COLS × GRID_ROWS`, default 5×5 ≈ 25
  nodes) with a couple of nodes/edges removed so it isn't perfectly regular.
- Pure helpers (no deps):
  - `dist(a, b)` — euclidean distance.
  - `neighbors(id)` — adjacency derived from `edges`.
  - `shortestPath(from, to): string[]` — **Dijkstra** weighted by edge length.
  - `randomNodeId()` / `randomDifferentNodeId(exclude)`.

### Faint streets — `src/components/RadarStreets.tsx`
- Props: `size`.
- Each edge → an absolutely-positioned `View`: a ~2px rect anchored at the source node,
  `width = dist*size`, `transform: rotate(atan2(dy,dx))`, `transformOrigin: left center`
  — identical to the `trail` pattern in `DispatchRadar.tsx`. Low-opacity cyan.
- A faint dot at each node (intersection).

### Ambient unit — `src/components/AmbientUnit.tsx`
- Props: `size`, `icon`, `color?`, `speed`, `loop`.
- State: current route (`string[]` of node ids) + segment index.
- Position via `useSharedValue` `tx`/`ty`; `useAnimatedStyle` translate (like `unitStyle`).
- **Straight per-segment movement**: animate `tx`/`ty` with
  `withTiming(target, { duration: dist(seg)*speed, easing: Easing.linear })`. The timing
  completion callback `(finished) => finished && runOnJS(advance)()` advances the segment;
  at route end it picks a new `randomDifferentNodeId`, recomputes `shortestPath`, continues.
- Initial spawn: random node (instant, no animation) + random first destination.
- `Easing.linear` + duration ∝ length ⇒ **constant visual speed**; positions are always a
  linear combination of two valid nodes ⇒ a unit can never cut across a block.
- `cancelAnimation` on unmount.

### Sandbox screen — `src/screens/RadarSandboxScreen.tsx`
- Replicates the radar frame (rings / cross / scan) via local styles (it's a test screen).
- Mounts `<RadarStreets>` + `NUM_AMBIENT_UNITS` `<AmbientUnit>` with a random icon from
  `["🚔","🚑","🚒"]`.
- Config constants at top of file:
  - `NUM_AMBIENT_UNITS = 6` ← requested count knob.
  - `UNIT_SPEED = 1800` (ms per unit of normalized distance).
  - `TEST_LOOP = true` ← long test mode (units never stop).
- "← Exit" button to go back.

### Dev access — navigation
- [`src/navigation/AppNavigator.tsx`](../../src/navigation/AppNavigator.tsx): add
  `RadarSandbox: undefined` to `RootStackParamList` + a `<Stack.Screen>`.
- [`src/screens/DispatchLobbyScreen.tsx`](../../src/screens/DispatchLobbyScreen.tsx):
  **long-press the "DISPATCH CENTER" title** → `navigation.navigate("RadarSandbox")`.
  Temporary dev hook, easy to remove.

## 4. Files

- New: `src/game/streetGraph.ts`
- New: `src/components/RadarStreets.tsx`
- New: `src/components/AmbientUnit.tsx`
- New: `src/screens/RadarSandboxScreen.tsx`
- Edit: `src/navigation/AppNavigator.tsx`
- Edit: `src/screens/DispatchLobbyScreen.tsx`

`DispatchRadar.tsx` and the real dispatch flow are untouched.

## 5. How to test

1. `npx expo start`, open the app.
2. In the Dispatch Center, **long-press the title "DISPATCH CENTER"** → opens the sandbox.
3. Confirm: faint street grid visible; `NUM_AMBIENT_UNITS` icons spawn on intersections;
   each moves in **straight lines along streets**, turning only at intersections, never
   crossing a block; on arrival it picks a new destination and continues; speed looks
   roughly constant (longer segments take longer).
4. Tweak `NUM_AMBIENT_UNITS` / `UNIT_SPEED`, reload, check look & performance.
5. No Reanimated warnings; leaving the screen leaves no dangling animations.

## 6. Next steps (out of scope)

- Replace the radar background with the stylized Manhattan image and **recreate the graph**
  on that image's coordinates (same 0..1 format).
- Integrate the map into the real dispatch flow, replacing `DispatchRadar`.
- For hundreds of units: move to `react-native-skia` (single surface) instead of one
  `Animated.View` per unit.
