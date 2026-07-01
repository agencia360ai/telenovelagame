import { Mission, MissionCategory } from "../../lib/missions/types";
import { DispatchOption, DispatchType } from "../../game/types";

import armedRobbery from "./armed-robbery.json";
import kitchenFire from "./kitchen-fire.json";
import borderRunners from "./border-runners.json";

// Converted from dispatcher-game.json — first 3 narratives, for testing.
import casoCocina from "./caso_cocina.json";
import casoPapel from "./caso_papel.json";
import casoBitcoin from "./caso_bitcoin.json";

// Prologue — one-off intro scene (category "intro", outside the calendar).
import prologue from "./prologue.json";

// Game Plot — systemic-corruption arc (narrative, no dispatch). No single
// villain: the player uncovers it case by case as the system buries calls.
import w1Plot from "./w1_plot.json"; // game_plot, order 10 (prologue + The Call That Drops)
import w2Plot from "./w2_plot.json"; // game_plot, order 20 (Same Block — the board re-routes)
import w3Plot from "./w3_plot.json"; // game_plot, order 30 (The House on Calder)
import w4Plot from "./w4_plot.json"; // game_plot, order 40 (The Envelope)
import w1WeekendCoffee from "./w1_weekend_coffee.json"; // weekend, order 0 (After Hours — alone with the pattern)

// Daily calls (911 source, caso_cocina style) — new batch.
import CallZombie from "./call_zombie.json";
import CallDoorForce from "./call_door_force.json";
import CallAteGlass from "./call_ate_glass.json";
import CallGreenElves from "./call_green_elves.json";
import CallMigraine from "./call_migraine.json";
import CallVirtualKitten from "./call_virtual_kitten.json";
import CallCatMissing from "./call_cat_missing.json";
import CallStudentLoan from "./call_student_loan.json";
import CallHeartAttack from "./call_heart_attack.json";
import CallRiot from "./call_riot.json";

// Daily calls — the rest of the authored pool (previously unregistered).
import CallManFell from "./call_a_man_fell_from_a_2nd_floor.json";
import CallGasSmell from "./call_help_it_smells_like_gas.json";
import CallHouseFire from "./call_house_fire.json";
import CallStuckElevator from "./call_i_m_stuck_in_an_elevator.json";
import CallTrappedFire from "./call_i_m_trapped_in_the_fire.json";
import CallLeak from "./call_i_think_there_s_a_leak.json";
import CallCatTree from "./call_my_cat_is_stuck_on_a_tall_tree.json";
import CallBathroomFire from "./call_there_s_a_fire_in_my_bathroom.json";
import CallDrowning from "./call_drowning.json";
import CallPlaneCrash from "./call_plane_crash.json";
import CallFenderBender from "./call_fender_bender.json";
import CallDrunkCaller from "./call_drunk_caller.json";
import CallGhost from "./call_ghost.json";
import CallGiantRoach from "./call_giant_roach.json";
import CallInfestation from "./call_infestation.json";
import CallSuspiciousBoxes from "./call_suspicious_boxes.json";
import casoTrex from "./caso_trex.json";

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
  // Daily calls — new batch (mission@1, category defaults to "daily").
  CallZombie as unknown as Mission,
  CallDoorForce as unknown as Mission,
  CallAteGlass as unknown as Mission,
  CallGreenElves as unknown as Mission,
  CallMigraine as unknown as Mission,
  CallVirtualKitten as unknown as Mission,
  CallCatMissing as unknown as Mission,
  CallStudentLoan as unknown as Mission,
  CallHeartAttack as unknown as Mission,
  CallRiot as unknown as Mission,
  // Daily calls — the rest of the authored pool.
  CallManFell as unknown as Mission,
  CallGasSmell as unknown as Mission,
  CallHouseFire as unknown as Mission,
  CallStuckElevator as unknown as Mission,
  CallTrappedFire as unknown as Mission,
  CallLeak as unknown as Mission,
  CallCatTree as unknown as Mission,
  CallBathroomFire as unknown as Mission,
  CallDrowning as unknown as Mission, // "Someone's Drowning!" (Ahogo.mp4)
  CallPlaneCrash as unknown as Mission, // "A Plane Hit the Building!" (Build.mp4)
  CallFenderBender as unknown as Mission, // "He Dented My Bumper!" (Choque.mp4)
  CallDrunkCaller as unknown as Mission, // "I Looove This Hotline" (Drunk.mp4)
  CallGhost as unknown as Mission, // "There's a Ghost in My House!" (Ghost.mp4 + Ghostbusters)
  CallGiantRoach as unknown as Mission, // "There's a Giant Cockroach!" (Giant Cocoroach.mp4 + Pest Control)
  CallInfestation as unknown as Mission, // "My House Is Full of Pests!" (Plaga.mp4 + Pest Control)
  CallSuspiciousBoxes as unknown as Mission, // "Something's Off Across the Street" (Caja.mp4)
  casoTrex as unknown as Mission, // "T-Rex" narrative-style call
  // Prologue intro scene — in the catalog so getMissionById finds it, but its
  // "intro" category keeps it out of every calendar pool.
  prologue as unknown as Mission,
  // Game Plot arc (served by the calendar: game_plot one per week, weekend on Sat).
  w1Plot as unknown as Mission,
  w2Plot as unknown as Mission,
  w3Plot as unknown as Mission,
  w4Plot as unknown as Mission,
  w1WeekendCoffee as unknown as Mission,
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
  // Special unit — only appears on calls that opt in via their `units` list
  // (e.g. call_zombie). Excluded from the default option set in MissionScreen.
  { id: "zombie_unit", label: "ZOMBIE\nUNIT", icon: "🧟" },
  { id: "dino_control", label: "DINO\nCONTROL", icon: "🦖" },
  { id: "ghost_unit", label: "GHOST\nBUSTERS", icon: "👻" },
  { id: "pest_control", label: "PEST\nCONTROL", icon: "🐛" },
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

/** Default bucket for a mission (missions without a category are "daily"). */
export function getMissionCategory(m: Mission): MissionCategory {
  return m.category ?? "daily";
}

/** All catalog missions in a given calendar bucket (used by the scheduler). */
export function getMissionsByCategory(category: MissionCategory): Mission[] {
  return catalog.filter((m) => getMissionCategory(m) === category);
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
