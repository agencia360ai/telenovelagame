import { CallScenario, DispatchOption, DispatchType } from "../../game/types";
import { borderRunners } from "./border-runners";
import { kitchenFire } from "./kitchen-fire";
import { armedRobbery } from "./armed-robbery";

/**
 * The call registry. To add a new emergency call:
 *   1. create ./my-call.ts exporting a CallScenario
 *   2. import it here and add it to CALLS
 * That's the whole framework — screens read from this list.
 */
export const CALLS: CallScenario[] = [
  borderRunners,
  kitchenFire,
  armedRobbery,
];

/** The units the operator can dispatch (rendered as buttons in a call). */
export const DISPATCH_OPTIONS: DispatchOption[] = [
  { id: "police", label: "POLICE", icon: "🚔" },
  { id: "firefighters", label: "FIRE DEPT", icon: "🚒" },
  { id: "border_patrol", label: "BORDER\nPATROL", icon: "🛂" },
];

export function getCallById(id: string): CallScenario {
  return CALLS.find((c) => c.id === id) ?? CALLS[0];
}

export function getRandomCallId(): string {
  return CALLS[Math.floor(Math.random() * CALLS.length)].id;
}

// Remembers the previous pick so we can avoid back-to-back repeats.
let lastServedCallId: string | null = null;

/**
 * Difficulty-paced call selection (the "flow channel" — match challenge to
 * skill). The very first call is always the easiest available (a safe
 * introduction, per level-design). After that the difficulty ceiling ramps up
 * with experience and rank, and we avoid serving the same call twice in a row.
 * Data-driven: it scales automatically as more CallScenarios are added.
 */
export function getNextCallId(callsHandled: number, rankIndex = 0): string {
  const difficultyOf = (c: CallScenario) => c.difficulty ?? 1;

  // First call ever → easiest one (teach in a no-pressure context).
  if (callsHandled === 0) {
    const easiest = [...CALLS].sort(
      (a, b) => difficultyOf(a) - difficultyOf(b)
    )[0];
    lastServedCallId = easiest.id;
    return easiest.id;
  }

  // Ramp the difficulty ceiling with experience, nudged up by rank.
  let maxDifficulty: number;
  if (callsHandled < 2) maxDifficulty = 1;
  else if (callsHandled < 5) maxDifficulty = 2;
  else maxDifficulty = 3;
  maxDifficulty = Math.min(3, Math.max(maxDifficulty, rankIndex));

  const pool = CALLS.filter((c) => difficultyOf(c) <= maxDifficulty);
  const eligible = pool.length > 0 ? pool : CALLS;

  // Avoid an immediate repeat when there's an alternative.
  const candidates =
    eligible.length > 1
      ? eligible.filter((c) => c.id !== lastServedCallId)
      : eligible;

  const choice = candidates[Math.floor(Math.random() * candidates.length)];
  lastServedCallId = choice.id;
  return choice.id;
}

export function getDispatchLabel(id: DispatchType): string {
  return DISPATCH_OPTIONS.find((o) => o.id === id)?.label.replace("\n", " ") ?? id;
}
