# Street-Graph Units — Radar Sandbox + Dispatch Map

> Status: implemented · Author: Christian Aldaco + Claude · Date: 2026-06-26 (updated)

## 1. Problem & goal

The dispatch view ([`src/components/DispatchRadar.tsx`](../../src/components/DispatchRadar.tsx))
originally showed a circular radar where a **single** unit travelled from the center
to a blip (position derived from a hash of `callId`). There was no notion of
**streets** or of **multiple** moving units.

This work introduces a stylized Manhattan-style **street graph** and units that move
in **straight, segment-by-segment** lines along the streets. It was first validated
in an **isolated sandbox screen** and then **integrated into the real `DispatchRadar`**,
where the dispatched ("hero") unit and a set of ambient "simulation" units all drive
along the grid.

> This is still NOT the 3-map (country → state → city) zoom plan. It's the
> Manhattan-style grid graph, rendered over the existing radar look.

## 2. Decisions (confirmed with the user)

| Topic | Decision |
| --- | --- |
| Streets | **Drawn faintly** for now. Later replaced by a stylized image + recreated graph. |
| Units | **One per unlocked unit type** (`getUnlockedUnits()`). Each drives once to its own destination pin and parks (radar "ping" on arrival) — not endless wandering. |
| Location | Started in an **isolated sandbox screen**, then **integrated into `DispatchRadar`** (the real dispatch flow). |
| Libraries | `react-native-reanimated` only. No SVG/Skia — lines and pins are rotated rects / bordered views (same trick as the radar `trail`). |

## 3. Architecture

Graph coordinates are **normalized 0..1** (resolution-independent). Each component
multiplies by the canvas size (`RADAR_SIZE`). The same graph data will later map onto
a larger stylized image without rewriting it.

### Graph data + utilities — `src/game/streetGraph.ts`
- `GraphNode = { id, x, y }` with `x,y ∈ [0,1]`; `Edge = [string, string]`.
- A code-generated **Manhattan-style grid** (`GRID_COLS × GRID_ROWS`, 5×5) with one
  node (`n_2_2`) and two edges removed so it isn't a perfect lattice. `MARGIN = 0.1`
  keeps it off the canvas edge.
- Pure helpers (no deps):
  - `dist(a, b)` — euclidean distance.
  - `neighbors(id)` — adjacency derived from `edges`.
  - `shortestPath(from, to): string[]` — **Dijkstra** weighted by edge length
    (linear-scan priority queue; the graph is ~24 nodes).
  - `randomNodeId()` / `randomDifferentNodeId(exclude)`.

### Faint streets — `src/components/RadarStreets.tsx`
- Props: `size`.
- Each edge → an absolutely-positioned `View`: a 2px rect anchored at the source node,
  `width = dist*size`, `transform: rotate(atan2(dy,dx))`, `transformOrigin: left center`
  — identical to the `trail` pattern in `DispatchRadar.tsx`. Low-opacity cyan.
- A faint dot at each node (intersection).

### Unit — `src/components/AmbientUnit.tsx`
Despite the name, this is the single reusable unit component for **both** the ambient
"simulation" units and the prominent "hero" unit.

- Props: `size`, `icon`, `speed` (ms per normalized distance unit), plus optional
  `startId`, `targetId`, `loop`, `dotSize` (default 26), `iconSize` (default 14),
  `dim`, `offset`, `onArrive`. (There is **no** `color` prop — the unit is cyan.)
- Position via `useSharedValue` `tx`/`ty`; `useAnimatedStyle` translate.
- **Straight per-segment movement, whole route at once**: `shortestPath` is turned into
  one `withSequence` per axis (`tx` and `ty` each get a `withTiming` step per segment,
  sharing that segment's duration). Because both axes advance in lockstep, movement is
  always **axis-aligned / L-shaped — never diagonal**, and a unit can never cut across a
  block. Each step uses `Easing.linear` with `duration = max(150, dist(seg)*speed)`
  ⇒ roughly **constant visual speed**.
- **Spawn**: instant (no animation) on `startId`, else `randomDifferentNodeId(targetId)`
  if a target is set, else `randomNodeId()`. An `opacity` shared value avoids a
  one-frame flash at the (0,0) corner.
- **Two modes**:
  - With `targetId`: drives once to that node, then on the final segment's completion
    callback fires a subtle radar **"ping"** (an expanding ring ×2 + a steady faint
    glow via `interpolate`) and calls `onArrive?.()` on the JS thread. This is the mode
    every current caller uses.
  - Without `targetId` and `loop=true`: wanders forever, picking a new
    `randomDifferentNodeId` at each route end. (Currently unused by all callers.)
- `dim` lowers rest opacity so ambient units recede behind the hero unit.
- `cancelAnimation` on `tx`/`ty`/`ringScale`/`ringOpacity` on unmount.

### Destination pin — `src/components/MapPin.tsx`
- Props: `x`, `y` (pixel position of the marked node — the tip points here), `icon`,
  optional `size` (default 18) and `color` (default dispatch amber).
- A round bubble holding the icon plus a downward triangular tip whose point sits
  exactly on `(x, y)`. Size is parameterized so simulation pins can be smaller than the
  main objective. Built from plain `View`s (no SVG). (The sandbox screen still inlines
  an equivalent amber pin with local styles.)

### Sandbox screen — `src/screens/RadarSandboxScreen.tsx`
- Replicates the radar frame (rings / cross / scan) via local styles (it's a test screen).
- Mounts `<RadarStreets>` + **one `<AmbientUnit>` per unlocked type** from
  `getUnlockedUnits()`, each with its **own unique start node** and **own unique
  destination pin**. Destination nodes are restricted to those where the pin fits fully
  inside the radar circle (`pinFits`/`within` geometry); no two pins and no two spawn
  points overlap. The layout is `useMemo`-ized so re-renders don't reshuffle.
- Each unit gets `targetId` (its pin) ⇒ drives once and parks.
- Config constants at top of file:
  - `UNIT_SPEED = 9000` (ms per unit of normalized distance; higher = slower).
  - `SPEED_VARIANCE = 0.25` (each unit's speed varies ±25%).
- "← Exit" button to go back.

### Dispatch integration — `src/components/DispatchRadar.tsx`
This is where the graph is used in the real flow (the doc's old "next step", now done):
- **Layout** (`useMemo` keyed on `callId`): a deterministic `shuffle(seed)` seeded by
  `hashStr(callId)` allocates unique nodes so a given call keeps a stable map:
  - **hero** = the dispatched unit: its start node + a deterministic objective node
    inside the circle.
  - **sims** = one ambient unit per unlocked type, each with its own start node and its
    own destination pin (constrained to fit the circle). A shared `used` set prevents
    any node collision across hero + sims.
- **Render**: `<RadarStreets>`; small dim `<AmbientUnit dim>` sims each with a small
  `<MapPin>`; then the prominent hero `<AmbientUnit>` (`dotSize=32`) driving to
  `heroTarget`. The classic **amber blip** is kept, overlaid on the objective node.
- **Flow control**: hero's `onArrive` fades in an "arrived" label and calls
  `onComplete()`. A **9s safety `setTimeout`** always advances the flow even if the
  arrival callback never fires. Sizing knobs (`SIM_UNIT_DOT`, `HERO_UNIT_DOT`,
  `DISPATCH_SPEED = 2200`, `SPEED_VARIANCE`) live at the top of the file.

### Dev access — navigation
- [`src/navigation/AppNavigator.tsx`](../../src/navigation/AppNavigator.tsx):
  `RadarSandbox: undefined` in `RootStackParamList` + a `<Stack.Screen>`.
- [`src/screens/DispatchLobbyScreen.tsx`](../../src/screens/DispatchLobbyScreen.tsx):
  **long-press the "DISPATCH CENTER" title** → `navigation.navigate("RadarSandbox")`.
  Temporary dev hook, easy to remove.

## 4. Files

- New: `src/game/streetGraph.ts`
- New: `src/components/RadarStreets.tsx`
- New: `src/components/AmbientUnit.tsx`
- New: `src/components/MapPin.tsx`
- New: `src/screens/RadarSandboxScreen.tsx`
- Edit: `src/components/DispatchRadar.tsx` (street map + hero/sim units integrated)
- Edit: `src/navigation/AppNavigator.tsx`
- Edit: `src/screens/DispatchLobbyScreen.tsx`

## 5. How to test

1. `npx expo start`, open the app.
2. Real flow: take a dispatch call — the radar now shows the faint street grid, ambient
   units of each unlocked type driving to their pins, and the dispatched unit driving
   along the streets to the amber objective; on arrival the flow advances.
3. Sandbox: in the Dispatch Center, **long-press "DISPATCH CENTER"** → opens the sandbox.
   Confirm one unit per unlocked type spawns on its own intersection, drives in straight
   lines along streets (turning only at intersections, never crossing a block), reaches
   its own pin and pings.
4. Tweak `UNIT_SPEED` / `DISPATCH_SPEED` / sizing knobs, reload, check look & performance.
5. No Reanimated warnings; leaving the screen leaves no dangling animations.

## 6. Next steps (out of scope)

- Replace the radar background with the stylized Manhattan image and **recreate the
  graph** on that image's coordinates (same 0..1 format).
- For hundreds of units: move to `react-native-skia` (single surface) instead of one
  `Animated.View` per unit.
- Housekeeping: fold the sandbox's inline pin into `MapPin`; either wire up or remove
  `AmbientUnit`'s currently-unused endless-wander (`loop`, no `targetId`) branch.
