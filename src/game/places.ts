import { MissionCondition } from "../lib/missions/types";

/**
 * City places — the travel system's data registry.
 *
 * The lobby's SALIR button opens the city map (ExcursionMap) with one pin per
 * place. Traveling costs the bus fare (real wallet cash) and plays the place's
 * SCENE: a standalone `category: "place"` mission (never scheduled by the
 * calendar) that runs like an off-duty event — story flags/variables commit,
 * but no XP and no calendar advance. State-dependent content lives inside each
 * scene as `variants`, so places react to love, debt, envelope flags, etc.
 *
 * To add a place: add an entry here + a `place_<id>.json` mission (category
 * "place") registered in src/content/missions/index.ts.
 */
export type PlaceScene = {
  missionId: string;
  /** Optional gate — first matching scene wins; leave undefined as fallback. */
  when?: MissionCondition;
};

export type CityPlace = {
  id: string;
  label: string;
  icon: string;
  /** Normalized pin coordinates on the city map, [0,1]. */
  x: number;
  y: number;
  /** Bus fare in cash (0 = walking distance). */
  fare: number;
  scenes: PlaceScene[];
};

export const CITY_PLACES: CityPlace[] = [
  {
    id: "home",
    label: "Home",
    icon: "🏠",
    x: 0.3,
    y: 0.74,
    fare: 0,
    scenes: [{ missionId: "place_home" }],
  },
  {
    id: "cafe",
    label: "Café",
    icon: "☕",
    x: 0.56,
    y: 0.46,
    fare: 2,
    scenes: [{ missionId: "place_cafe" }],
  },
  {
    id: "market",
    label: "Night Market",
    icon: "🏮",
    x: 0.68,
    y: 0.2,
    fare: 5,
    scenes: [{ missionId: "place_market" }],
  },
];
