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
| Background | A **stylized Manhattan image** (`assets/map/manhattan.png`, 688×1316) rendered behind the graph. The graph was **hand-authored on that image** with `tools/street-graph-editor.html`. Faint streets/nodes stay drawn on top for alignment. |
| Shape | Radar changed from a **circle to a portrait rectangle** matching the image aspect ratio, so the whole island shows and nodes land on the streets. Circular rings/crosshair removed; the scan line stays. |
| Units | **One per unlocked unit type** (`getUnlockedUnits()`). Each drives once to its own destination pin and parks (radar "ping" on arrival) — not endless wandering. |
| Location | Started in an **isolated sandbox screen**, then **integrated into `DispatchRadar`** (the real dispatch flow). |
| Libraries | `react-native-reanimated` only. No SVG/Skia — lines and pins are rotated rects / bordered views (same trick as the radar `trail`). |

## 3. Architecture

Graph coordinates are **normalized 0..1** (resolution-independent). `x` is a fraction
of the map image **width**, `y` a fraction of its **height**; components multiply `x`
by the canvas width (`RADAR_W`) and `y` by the canvas height (`RADAR_H`). Because the
canvas is kept at the image's exact aspect ratio, changing the on-screen size never
moves a node off its street — only a change to the image's **aspect ratio** would.

### Graph data + utilities — `src/game/streetGraph.ts`
- `GraphNode = { id, x, y }` with `x,y ∈ [0,1]`; `Edge = [string, string]`.
- The graph is **hand-authored on `assets/map/manhattan.png`** using
  `tools/street-graph-editor.html` (click intersections → connect streets → export).
  Currently **125 nodes / 186 edges**, one connected component. Node ids are opaque
  strings (`n_0`, `n_1`, …); to change the map, re-edit in the tool and paste a fresh
  export over `nodes`/`edges`.
- Pure helpers (no deps), unchanged and graph-agnostic:
  - `dist(a, b)` — euclidean distance.
  - `neighbors(id)` — adjacency derived from `edges`.
  - `shortestPath(from, to): string[]` — **Dijkstra** weighted by edge length.
  - `randomNodeId()` / `randomDifferentNodeId(exclude)`.

### The editor tool — `tools/street-graph-editor.html`
Standalone, dependency-free HTML page (open in a browser). Load the map image, click to
place nodes on intersections, switch to edge mode to connect streets, right-click to
delete, then **Export** a TypeScript block (or JSON, for re-import) with coords in 0..1.

### Faint streets — `src/components/RadarStreets.tsx`
- Props: `size` (width), optional `height` (defaults to `size` for a square canvas).
- Each edge → an absolutely-positioned `View`: a 2px rect anchored at the source node,
  `width = dist*size`, `transform: rotate(atan2(dy,dx))`, `transformOrigin: left center`
  — identical to the `trail` pattern in `DispatchRadar.tsx`. Low-opacity cyan.
- A faint dot at each node (intersection).

### Unit — `src/components/AmbientUnit.tsx`
Despite the name, this is the single reusable unit component for **both** the ambient
"simulation" units and the prominent "hero" unit.

- Props: `size` (width), optional `height` (defaults to `size`), `icon`, `speed` (ms per
  normalized distance unit), plus optional `startId`, `targetId`, `loop`, `dotSize`
  (default 26), `iconSize` (default 14), `dim`, `offset`, `onArrive`. (There is **no**
  `color` prop — the unit is cyan.)
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
- Renders the portrait map image + scan line via local styles (it's a test screen), and
  is the handiest place to **verify the graph aligns with the image**.
- Mounts `<RadarStreets>` + **one `<AmbientUnit>` per unlocked type** from
  `getUnlockedUnits()`, each with its **own unique start node** and **own unique
  destination pin**. On the rectangular map every node is on-canvas, so `pinFits` only
  keeps destinations whose pin bubble won't clip past the top edge; no two pins and no
  two spawn points overlap. The layout is `useMemo`-ized so re-renders don't reshuffle.
- Each unit gets `targetId` (its pin) ⇒ drives once and parks.
- Config constants at top of file:
  - `UNIT_SPEED = 9000` (ms per unit of normalized distance; higher = slower).
  - `SPEED_VARIANCE = 0.25` (each unit's speed varies ±25%).
- "← Exit" button to go back.

### Dispatch integration — `src/components/DispatchRadar.tsx`
This is where the graph is used in the real flow:
- **Canvas**: a portrait rectangle sized from `MAP_ASPECT = 688/1316` fit to the screen
  (`RADAR_H = min(SCREEN_HEIGHT*0.6, (SCREEN_WIDTH-48)/MAP_ASPECT)`, `RADAR_W = RADAR_H *
  MAP_ASPECT`). The Manhattan image sits behind everything at explicit `RADAR_W×RADAR_H`
  with **`resizeMode="stretch"`**, so it uses the *exact same* `[0,1]→[0,W]×[0,H]` mapping
  as the graph — nodes always land on the streets even if `MAP_ASPECT` is imperfect (image
  and overlay scale identically). `MAP_ASPECT` only controls the frame's on-screen shape.
- **Layout** (`useMemo` keyed on `callId`): a deterministic `shuffle(seed)` seeded by
  `hashStr(callId)` allocates unique nodes so a given call keeps a stable map:
  - **hero** = the dispatched unit: its start node + a deterministic objective node.
  - **sims** = one ambient unit per unlocked type, each with its own start node and its
    own destination pin. A shared `used` set prevents any node collision across hero +
    sims.
- **Render**: map `<Image>`; scan line; `<RadarStreets>`; small dim `<AmbientUnit dim>`
  sims each with a small `<MapPin>`; then the prominent hero `<AmbientUnit>` (`dotSize=32`)
  driving to `heroTarget`. The classic **amber blip** is kept, overlaid on the objective.
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

- New: `src/game/streetGraph.ts` (now the hand-authored Manhattan graph)
- New: `src/components/RadarStreets.tsx`
- New: `src/components/AmbientUnit.tsx`
- New: `src/components/MapPin.tsx`
- New: `src/screens/RadarSandboxScreen.tsx`
- New: `tools/street-graph-editor.html` (browser tool to author the graph on the image)
- New: `assets/map/manhattan.png` (stylized map background)
- Edit: `src/components/DispatchRadar.tsx` (map background + portrait canvas + units)
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

- Tune the visual pass over the map: the faint `RadarStreets` overlay is currently kept
  on for alignment checking — dim or drop it once the graph matches the drawn streets.
- For hundreds of units: move to `react-native-skia` (single surface) instead of one
  `Animated.View` per unit.
- Housekeeping: fold the sandbox's inline pin into `MapPin`; either wire up or remove
  `AmbientUnit`'s currently-unused endless-wander (`loop`, no `targetId`) branch.
