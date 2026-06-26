/**
 * Calendar scheduler — pure functions that build and walk a week.
 *
 * No React, no I/O: given the week template + the available mission pools, it
 * produces a concrete, frozen WeekSchedule. Selection is random for the daily
 * pool and ordered (by each mission's `order`) for the plot and weekend calls.
 * Kept pure so it's trivially testable and reproducible with a seeded RNG.
 */
import { Mission } from "../missions/types";
import {
  DayTemplate,
  shortDayLabel,
} from "../../content/calendar/weekTemplate";
import {
  GamePlotContext,
  isPlotUnlocked,
} from "../../content/calendar/gamePlot";
import { DayKind, ScheduledDay, WeekSchedule } from "./types";

export { shortDayLabel };

export type MissionPools = {
  daily: Mission[];
  weekend: Mission[];
};

type Rng = () => number;

function pick<T>(arr: T[], rng: Rng): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * The next plot mission id to serve, or null if the next entry is still locked
 * (or the sequence is exhausted). `plotList` is the game_plot missions already
 * sorted by `order`; `plotIndex` is how many plot calls have been consumed.
 */
export function resolveNextPlot(
  plotList: Mission[],
  plotIndex: number,
  ctx: GamePlotContext
): string | null {
  const m = plotList[plotIndex];
  if (!m) return null;
  return isPlotUnlocked(m, ctx) ? m.id : null;
}

/**
 * The next weekend mission id to serve, or null if the sequence is exhausted.
 * `weekendList` is the weekend missions already sorted by `order`.
 */
export function resolveNextWeekend(
  weekendList: Mission[],
  weekendIndex: number
): string | null {
  return weekendList[weekendIndex]?.id ?? null;
}

/**
 * Build a concrete, frozen schedule for `week`.
 * - Picks one random `gamePlotEligible` day as the plot day (only if a plot
 *   mission is available this week).
 * - Resolves every day's slots into concrete mission ids, avoiding repeats
 *   within the week while the pool still has unused entries.
 */
export function generateWeek(
  week: number,
  template: DayTemplate[],
  pools: MissionPools,
  plotMissionId: string | null,
  weekendMissionId: string | null,
  rng: Rng = Math.random,
  /** Daily ids already served in earlier weeks — avoided until the pool runs out. */
  usedDailyInit: string[] = []
): WeekSchedule {
  // Choose the plot day among eligible weekdays (only if we have a plot to
  // place). Never the FIRST eligible day, so the week always opens on a daily
  // call and the story isn't the very first case of the week.
  let gamePlotDayId: string | null = null;
  if (plotMissionId) {
    const eligible = template.filter((d) => d.gamePlotEligible);
    const pickable = eligible.length > 1 ? eligible.slice(1) : eligible;
    const chosen = pick(pickable, rng);
    gamePlotDayId = chosen?.id ?? null;
  }

  // Seed with the dailies already served in earlier weeks so the week avoids
  // repeats across the whole run (not just within the week). When every daily
  // has been seen, `drawFrom` falls back to the full pool (cycle restarts).
  const usedDaily = new Set<string>(usedDailyInit);

  const drawFrom = (pool: Mission[], used: Set<string>): string | undefined => {
    const fresh = pool.filter((m) => !used.has(m.id));
    const choice = pick(fresh.length > 0 ? fresh : pool, rng);
    if (choice) used.add(choice.id);
    return choice?.id;
  };

  const days: ScheduledDay[] = template.map((day) => {
    const isPlotDay = gamePlotDayId === day.id;

    // On the plot day, the plot call replaces the daily call by default; with
    // keepDailyOnPlotDay the plot is appended after the day's normal slots.
    let slots: DayKind[] = day.slots;
    if (isPlotDay && plotMissionId) {
      slots = day.keepDailyOnPlotDay ? [...day.slots, "game_plot"] : ["game_plot"];
    }

    const missionIds: string[] = [];
    for (const kind of slots) {
      let id: string | undefined;
      if (kind === "game_plot") {
        id = plotMissionId ?? undefined;
      } else if (kind === "weekend") {
        // Sequential by `order`. Fall back to the daily pool when no weekend
        // mission is authored / the sequence is exhausted.
        id = weekendMissionId ?? drawFrom(pools.daily, usedDaily);
      } else {
        id = drawFrom(pools.daily, usedDaily);
      }
      if (id) missionIds.push(id);
    }

    return { dayId: day.id, label: day.label, missionIds };
  });

  return {
    week,
    days,
    gamePlotDayId,
    gamePlotMissionId: plotMissionId,
    weekendMissionId,
  };
}

/** Index of the first day that has missions (skips rest days). days.length if none. */
export function firstPlayableDay(schedule: WeekSchedule): number {
  return nextPlayableDay(schedule, 0);
}

/** Index of the next day at/after `from` that has missions. days.length if none. */
export function nextPlayableDay(schedule: WeekSchedule, from: number): number {
  let i = from;
  while (i < schedule.days.length && schedule.days[i].missionIds.length === 0) {
    i++;
  }
  return i;
}
