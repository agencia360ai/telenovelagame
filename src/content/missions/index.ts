import { Mission } from "../../lib/missions/types";
import { DispatchOption, DispatchType } from "../../game/types";

import armedRobbery from "./armed-robbery.json";
import kitchenFire from "./kitchen-fire.json";
import borderRunners from "./border-runners.json";

// Converted from dispatcher-game.json — first 3 narratives, for testing.
import casoCocina from "./caso_cocina.json";
import casoPapel from "./caso_papel.json";
import casoBitcoin from "./caso_bitcoin.json";

/**
 * The mission registry. To add an interactive call:
 *   1. create ./<id>.json following the `mission@1` schema
 *      (see docs/CONTENT_FRAMEWORK.md)
 *   2. import it here and add it to BUNDLED_MISSIONS
 *   3. run `npm run validate-missions`
 *
 * This is the OFFLINE source of truth. When remote content is enabled
 * (src/lib/content), cloud missions are merged on top of these by id.
 */
export const BUNDLED_MISSIONS: Mission[] = [
  // Only the 3 dispatcher narratives are served for now (demos disabled).
  casoCocina as unknown as Mission, // "My Kitchen's on Fire"
  casoPapel as unknown as Mission, // "I'm Out of Toilet Paper"
  casoBitcoin as unknown as Mission, // "I Lost Everything in Bitcoin"
];

// Demo missions kept available but out of rotation (re-add to the array to use).
void armedRobbery;
void kitchenFire;
void borderRunners;

/**
 * The units the operator can dispatch (rendered as buttons in a mission).
 * A mission can show a tailored subset via its `units` field; otherwise all of
 * these appear. "NO UNIT" is the correct response to prank / non-emergencies.
 */
export const DISPATCH_OPTIONS: DispatchOption[] = [
  { id: "police", label: "POLICE", icon: "🚔" },
  { id: "firefighters", label: "FIRE DEPT", icon: "🚒" },
  { id: "ambulance", label: "AMBULANCE", icon: "🚑" },
  { id: "animal_control", label: "ANIMAL\nCONTROL", icon: "🐾" },
  { id: "border_patrol", label: "BORDER\nPATROL", icon: "🛂" },
  { id: "no_unit", label: "NO UNIT", icon: "🚫" },
];

export function getDispatchLabel(id: DispatchType): string {
  return (
    DISPATCH_OPTIONS.find((o) => o.id === id)?.label.replace("\n", " ") ?? id
  );
}

/**
 * The active mission list. Today it's just the bundled set; the remote content
 * layer can replace this at runtime via `setMissionCatalog` once a manifest is
 * synced — keeping a single lookup path for the rest of the app.
 */
let catalog: Mission[] = [...BUNDLED_MISSIONS];

export function setMissionCatalog(missions: Mission[]): void {
  // Merge: remote definitions override bundled ones by id; bundled-only
  // missions remain available offline.
  const byId = new Map<string, Mission>();
  for (const m of BUNDLED_MISSIONS) byId.set(m.id, m);
  for (const m of missions) byId.set(m.id, m);
  catalog = Array.from(byId.values());
}

export function getMissions(): Mission[] {
  return catalog;
}

export function getMissionById(id: string): Mission {
  return catalog.find((m) => m.id === id) ?? catalog[0];
}

export function getMissionIndex(id: string): number {
  return Math.max(0, catalog.findIndex((m) => m.id === id));
}

// Remembers the previous pick so we can avoid back-to-back repeats.
let lastServedId: string | null = null;

/**
 * Difficulty-paced selection (match challenge to skill). The first mission is
 * the easiest; the ceiling ramps with experience and rank; immediate repeats
 * are avoided. Scales automatically as missions are added.
 */
export function getNextMissionId(missionsHandled: number, rankIndex = 0): string {
  const all = catalog;
  const difficultyOf = (m: Mission) => m.difficulty ?? 1;

  if (missionsHandled === 0) {
    const easiest = [...all].sort((a, b) => difficultyOf(a) - difficultyOf(b))[0];
    lastServedId = easiest.id;
    return easiest.id;
  }

  let maxDifficulty: number;
  if (missionsHandled < 2) maxDifficulty = 1;
  else if (missionsHandled < 5) maxDifficulty = 2;
  else maxDifficulty = 3;
  maxDifficulty = Math.min(3, Math.max(maxDifficulty, rankIndex));

  const pool = all.filter((m) => difficultyOf(m) <= maxDifficulty);
  const eligible = pool.length > 0 ? pool : all;

  const candidates =
    eligible.length > 1
      ? eligible.filter((m) => m.id !== lastServedId)
      : eligible;

  const choice = candidates[Math.floor(Math.random() * candidates.length)];
  lastServedId = choice.id;
  return choice.id;
}
