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

// Life scenes — personal-life vignettes (category "life", outside the calendar)
// triggered on rank-up. Bully-to-respect arc, keyed by rank index.
import lifeRank1 from "./life_rank1.json";
import lifeRank2 from "./life_rank2.json";
import lifeRank3 from "./life_rank3.json";
import lifeRank4 from "./life_rank4.json";
import lifeRank5 from "./life_rank5.json";
import lifeRank6 from "./life_rank6.json";

// Consequence / fallout events — pay off the player's main-arc choices,
// triggered by story flags (e.g. took_envelope / envelope_reported).
import consequenceVisit from "./consequence_the_visit.json";
import consequenceCase from "./consequence_the_case.json";

// Game Plot — the 12-week Hale arc (Charlie/Mara storyline). One plot call per
// week, in order, each gated to its week via `unlock.minWeek`. Week 12 is the
// hearing-room finale (testify / quiet deal / confess-it-all endings).
import w1Plot from "./w1_plot.json"; // week 1 — The Call That Drops
import w2Plot from "./w2_plot.json"; // week 2 — The Voice
import w3Plot from "./w3_plot.json"; // week 3 — Vans at night
import w4Plot from "./w4_plot.json"; // week 4 — The Envelope
import w5Plot from "./w5_plot.json"; // week 5 — Her Voice Again
import w6Plot from "./w6_plot.json"; // week 6 — The Audit
import w7Plot from "./w7_plot.json"; // week 7 — The Wrong Address
import w8Plot from "./w8_plot.json"; // week 8 — The Partner
import w9Plot from "./w9_plot.json"; // week 9 — Two Alarms
import w10Plot from "./w10_plot.json"; // week 10 — The Raid
import w11Plot from "./w11_plot.json"; // week 11 — The Name on the Log
import w12Plot from "./w12_plot.json"; // week 12 — The Last Shift (finale)
// Weekend scenes — authored for specific weeks (see mission `week` field).
import w1WeekendCoffee from "./w1_weekend_coffee.json"; // week 1 — After Hours
import w6WeekendPartner from "./w6_weekend_partner.json"; // week 6 — Coffee at 3 A.M.
import w11WeekendEve from "./w11_weekend_eve.json"; // week 11 — The Night Before
import w1WeekendMap from "./w1_weekend_map.json"; // interactive-map weekend demo (out of rotation)
import testUsamap from "./test_usamap.json"; // interactive-map USA test (out of rotation)

// Off-duty events — ordered personal vignettes (category "event", three per
// week on random weekdays). No dispatch; choices may cost cash (`cash_cost`).
// Generic friends & partner arc — no named characters.
// Student-debt thread — periodic installments; miss them and the apartment
// is at risk (flags: debt_active, apartment_at_risk, debt_cleared, apartment_lost).
import eventDebtLetter from "./event_debt_letter.json"; // order 5 — The Letter
import eventDebtFirst from "./event_debt_first.json"; // order 32 — First Installment
import eventDebtSecond from "./event_debt_second.json"; // order 62 — Second Installment
import eventDebtDeadline from "./event_debt_deadline.json"; // order 92 — The Deadline
import eventFirstBreak from "./event_first_break.json"; // order 10 — First Break

// City places (category "place") — travel destinations opened from the lobby
// map (SALIR). Played on demand, never scheduled by the calendar.
import placeHome from "./place_home.json";
import placeCafe from "./place_cafe.json";
import placeMarket from "./place_market.json";
import eventFriendText from "./event_friend_text.json"; // order 20 — A Text From an Old Friend
import eventCoffeePlace from "./event_coffee_place.json"; // order 30 — The Coffee Place
import eventCrosstown from "./event_crosstown.json"; // order 34 — The Long Way (paid travel → plot clue)
import eventNightOut from "./event_night_out.json"; // order 40 — Night Out
import eventFirstDate from "./event_first_date.json"; // order 50 — First Date
import eventWalkHome from "./event_walk_home.json"; // order 60 — The Walk Home
import eventFriendHelp from "./event_friend_help.json"; // order 70 — A Friend in Trouble
import eventMovieNight from "./event_movie_night.json"; // order 80 — Movie Night
import eventTheQuestion from "./event_the_question.json"; // order 90 — The Question
import eventTheGift from "./event_the_gift.json"; // order 100 — The Gift
import eventWorldsMeet from "./event_worlds_meet.json"; // order 110 — Worlds Meet
import eventOneMonth from "./event_one_month.json"; // order 120 — One Month

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

// Daily calls — new batch from the 12-week narrative package.
import CallUnderControl from "./call_under_control.json"; // chemical plant "not fire"
import CallBabyBreathing from "./call_baby_breathing.json"; // infant CPR save
import CallQuarryKid from "./call_quarry_kid.json"; // walkie-talkie missing friend
import CallWoodChipper from "./call_wood_chipper.json"; // 2 a.m. wood chipper
import CallOnlyDown from "./call_only_down.json"; // the elevator only goes down
import CallBillboardMan from "./call_billboard_man.json"; // handcuffed to a billboard

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
  // Life scenes (category "life") — served on rank-up, not by the calendar.
  lifeRank1 as unknown as Mission,
  lifeRank2 as unknown as Mission,
  lifeRank3 as unknown as Mission,
  lifeRank4 as unknown as Mission,
  lifeRank5 as unknown as Mission,
  lifeRank6 as unknown as Mission,
  // Consequence / fallout events (category "consequence").
  consequenceVisit as unknown as Mission,
  consequenceCase as unknown as Mission,
  // Game Plot arc (served by the calendar: one plot call per week, in order).
  w1Plot as unknown as Mission,
  w2Plot as unknown as Mission,
  w3Plot as unknown as Mission,
  w4Plot as unknown as Mission,
  w5Plot as unknown as Mission,
  w6Plot as unknown as Mission,
  w7Plot as unknown as Mission,
  w8Plot as unknown as Mission,
  w9Plot as unknown as Mission,
  w10Plot as unknown as Mission,
  w11Plot as unknown as Mission,
  w12Plot as unknown as Mission,
  // Weekend scenes (weeks 1, 6 and 11 — matched by their `week` field).
  w1WeekendCoffee as unknown as Mission,
  w6WeekendPartner as unknown as Mission,
  w11WeekendEve as unknown as Mission,
  // Off-duty events (category "event") — three per week, choices can spend cash.
  eventDebtLetter as unknown as Mission,
  eventDebtFirst as unknown as Mission,
  eventDebtSecond as unknown as Mission,
  eventDebtDeadline as unknown as Mission,
  eventFirstBreak as unknown as Mission,
  eventFriendText as unknown as Mission,
  eventCoffeePlace as unknown as Mission,
  eventNightOut as unknown as Mission,
  eventFirstDate as unknown as Mission,
  eventWalkHome as unknown as Mission,
  eventFriendHelp as unknown as Mission,
  eventMovieNight as unknown as Mission,
  eventTheQuestion as unknown as Mission,
  eventTheGift as unknown as Mission,
  eventWorldsMeet as unknown as Mission,
  eventOneMonth as unknown as Mission,
  // City places — reachable only through the lobby travel map.
  placeHome as unknown as Mission,
  placeCafe as unknown as Mission,
  placeMarket as unknown as Mission,
];

// Demo missions kept available but out of rotation (re-add to the array to use).
void armedRobbery;
void kitchenFire;
void borderRunners;
// Out of rotation since the 12-week package: crosstown travel event (superseded
// by the after-hours city map) and the interactive-map weekend/USA demos (kept
// importable so they're still loadable by id for testing).
void eventCrosstown;
void w1WeekendMap;
void testUsamap;
// Out of rotation: extra package calls — the daily pool is the user's fixed
// 30-call list (re-add here to rotate them back in).
void CallUnderControl;
void CallBabyBreathing;
void CallQuarryKid;
void CallWoodChipper;
void CallOnlyDown;
void CallBillboardMan;

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

/** Special units that only appear on calls that opt in via their `units` list. */
export const SPECIAL_UNITS: DispatchType[] = ["zombie_unit", "dino_control"];

/**
 * Units the player can deploy by default. There is no per-unit purchase/unlock
 * system yet (the shop/wardrobe only unlocks officer skins), so "unlocked" means
 * the standard units: everything except the opt-in SPECIAL_UNITS and the
 * non-vehicle "no_unit". This is the single source of truth — extend it once a
 * real unit-ownership system exists.
 */
export function getUnlockedUnits(): DispatchOption[] {
  return DISPATCH_OPTIONS.filter(
    (o) => !SPECIAL_UNITS.includes(o.id) && o.id !== "no_unit"
  );
}

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

/**
 * The personal-life scene to play when the player reaches a given rank index,
 * or undefined if that rank has none. Matched by the mission's `rank` field.
 */
export function getLifeMissionForRank(rankIndex: number): Mission | undefined {
  return catalog.find(
    (m) =>
      (m as any).category === "life" && (m as any).rank === rankIndex
  );
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