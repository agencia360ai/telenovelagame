/**
 * Calendar scheduler — pure functions that build and walk a week.
 *
 * No React, no I/O: given the week template + the available mission pools, it
 * produces a concrete, frozen WeekSchedule. Selection is random where the design
 * calls for it (daily/weekend pools) and ordered for the plot call. Kept pure so
 * it's trivially testable and reproducible with a seeded RNG.
 */
import { Mission } from "../missions/types";
import {
  DayTemplate,
  shortDayLabel,
} from "../../content/calendar/weekTemplate";
import {
  GAME_PLOT_SEQUENCE,
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
 * (or the sequence is exhausted). `plotIndex` is how many plot calls have been
 * consumed so far.
 */
export function resolveNextPlot(
  plotIndex: number,
  ctx: GamePlotContext
): string | null {
  const entry = GAME_PLOT_SEQUENCE[plotIndex];
  if (!entry) return null;
  return isPlotUnlocked(entry, ctx) ? entry.missionId : null;
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
  rng: Rng = Math.random
): WeekSchedule {
  // Choose the plot day among eligible weekdays (only if we have a plot to place).
  let gamePlotDayId: string | null = null;
  if (plotMissionId) {
    const eligible = template.filter((d) => d.gamePlotEligible);
    const chosen = pick(eligible, rng);
    gamePlotDayId = chosen?.id ?? null;
  }

  const usedDaily = new Set<string>();
  const usedWeekend = new Set<string>();

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
        // Fall back to the daily pool until weekend missions are authored.
        id =
          drawFrom(pools.weekend, usedWeekend) ?? drawFrom(pools.daily, usedDaily);
      } else {
        id = drawFrom(pools.daily, usedDaily);
      }
      if (id) missionIds.push(id);
    }

    return { dayId: day.id, label: day.label, missionIds };
  });

  return { week, days, gamePlotDayId, gamePlotMissionId: plotMissionId };
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
