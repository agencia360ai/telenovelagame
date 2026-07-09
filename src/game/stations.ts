import type { MapPinChoice } from "../lib/missions/types";

/**
 * 911 stations across the country — the rank-up posting map.
 *
 * On every promotion, before the "pov-promotion" cutscene plays, the player is
 * shown the national map (`usamap`) and picks the station they transfer to. The
 * choice is persisted as the integer story variable `workplace` (see
 * DispatchStoryContext), so mission content can react to where the player is
 * stationed via `{ "var": "workplace", "op": "==", "value": N }`.
 *
 * Coordinates match the pins authored in content/missions/test_usamap.json.
 */
export type Station = {
  id: string;
  /** Integer stored in the `workplace` story variable when chosen. */
  workplace: number;
  label: string;
  icon: string;
  /** Normalized pin coordinates on the usamap image, [0,1]. */
  x: number;
  y: number;
  /** Blurb shown in the map's info panel before confirming. */
  description: string;
};

export const STATIONS: Station[] = [
  {
    id: "wa",
    workplace: 1,
    label: "Seattle, WA",
    icon: "🚓",
    x: 0.14,
    y: 0.2,
    description: "Estación Pacífico Noroeste. Turno de noche, lluvia constante.",
  },
  {
    id: "ca",
    workplace: 2,
    label: "Los Ángeles, CA",
    icon: "🚑",
    x: 0.12,
    y: 0.58,
    description: "Central de la Costa Oeste. La más saturada del país.",
  },
  {
    id: "tx",
    workplace: 3,
    label: "Houston, TX",
    icon: "🚒",
    x: 0.52,
    y: 0.8,
    description: "Estación del Golfo. Tormentas y refinerías.",
  },
  {
    id: "il",
    workplace: 4,
    label: "Chicago, IL",
    icon: "🚓",
    x: 0.66,
    y: 0.38,
    description: "Central del Medio Oeste. El corazón del país.",
  },
  {
    id: "ny",
    workplace: 5,
    label: "Nueva York, NY",
    icon: "🚑",
    x: 0.86,
    y: 0.34,
    description: "Estación Noreste. Nunca duerme.",
  },
  {
    id: "fl",
    workplace: 6,
    label: "Miami, FL",
    icon: "🚒",
    x: 0.83,
    y: 0.87,
    description: "Central del Sureste. Calor, costa y huracanes.",
  },
];

/** The station pins as `MapPinChoice`es for the ExcursionMap. */
export function stationPins(): MapPinChoice[] {
  return STATIONS.map((s) => ({
    id: s.id,
    x: s.x,
    y: s.y,
    icon: s.icon,
    label: s.label,
    description: s.description,
    next: "",
  }));
}
