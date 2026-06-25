/**
 * Game Plot sequence — the ordered story calls.
 *
 * Unlike daily/weekend calls (drawn at random from their pools), plot calls are
 * served in order, one per week, on the week's randomly-chosen plot day. An
 * entry can gate itself behind an `unlock` condition; if the next entry is still
 * locked, that week simply has no plot call (its plot day falls back to a daily
 * call) and the same entry is retried in later weeks.
 *
 * To add a story chapter: author a mission with `"category": "game_plot"` and
 * append it here. Keep this list in narrative order.
 */
export type GamePlotUnlock = {
  /** Require the player to be at least this rank index (see src/game/ranks.ts). */
  minRank?: number;
  /** Require the in-game week to be at least this number. */
  minWeek?: number;
};

export type GamePlotEntry = {
  missionId: string;
  unlock?: GamePlotUnlock;
};

export const GAME_PLOT_SEQUENCE: GamePlotEntry[] = [
  { missionId: "armed-robbery" },
  // { missionId: "next-chapter", unlock: { minRank: 2 } },
];

/** Context the scheduler uses to evaluate an entry's unlock condition. */
export type GamePlotContext = { rankIndex: number; week: number };

export function isPlotUnlocked(entry: GamePlotEntry, ctx: GamePlotContext): boolean {
  const u = entry.unlock;
  if (!u) return true;
  if (u.minRank !== undefined && ctx.rankIndex < u.minRank) return false;
  if (u.minWeek !== undefined && ctx.week < u.minWeek) return false;
  return true;
}
