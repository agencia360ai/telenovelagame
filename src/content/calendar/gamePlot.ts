/**
 * Game Plot sequence — the ordered story calls.
 *
 * Unlike daily calls (drawn at random from their pool), plot calls are served in
 * order, one per week, on the week's randomly-chosen plot day. The order comes
 * from each mission's `order` field (authored in the dispatcher editor), NOT a
 * hand-maintained list. An entry can gate itself behind a `mission.unlock`
 * condition; if the next entry is still locked, that week simply has no plot call
 * (its plot day falls back to a daily call) and the same entry is retried later.
 *
 * To add a story chapter: author a mission with `"category": "game_plot"` and an
 * `"order"` value. Lower order plays first.
 */
import { Mission } from "../../lib/missions/types";

/** Context the scheduler uses to evaluate an entry's unlock condition. */
export type GamePlotContext = { rankIndex: number; week: number };

/** Stable ascending sort by `order` (absent = 0). Used for game_plot and weekend. */
export function sortByOrder(missions: Mission[]): Mission[] {
  return [...missions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/** Whether a sequential mission is unlocked for the given week/rank. */
export function isPlotUnlocked(m: Mission, ctx: GamePlotContext): boolean {
  const u = m.unlock;
  if (!u) return true;
  if (u.minRank !== undefined && ctx.rankIndex < u.minRank) return false;
  if (u.minWeek !== undefined && ctx.week < u.minWeek) return false;
  return true;
}
