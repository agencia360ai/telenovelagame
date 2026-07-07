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

/** Prank calls are tagged "prank" in the mission JSON. */
function isPrank(m: Mission): boolean {
  return ((m as any).tags ?? []).includes("prank");
}

/** The call's correct dispatch unit (static), or null when indeterminate. */
function correctUnitOf(m: Mission): string | null {
  const b = (m as any).beats?.find((x: any) => x?.type === "dispatch");
  return b?.correct ?? null;
}

// Pranks never appear in the player's first N career calls.
const NO_PRANK_BEFORE_CALL = 2; // 0-indexed → pranks allowed from call #3

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
 * The next `count` off-duty event mission ids to serve (may return fewer when
 * the sequence is running out). `eventList` is already sorted by `order`.
 */
export function resolveNextEvents(
  eventList: Mission[],
  eventIndex: number,
  count: number
): string[] {
  return eventList.slice(eventIndex, eventIndex + count).map((m) => m.id);
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
  usedDailyInit: string[] = [],
  /** Career calls completed BEFORE this week — gates pranks off the first calls. */
  careerCallsBefore: number = 0,
  /** The week's off-duty event scenes, in play order (empty = none). */
  eventMissionIds: string[] = []
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

  // Spread the week's events over distinct eligible days (avoiding the plot
  // day so story and off-duty scenes don't stack). Days keep template order,
  // so events play in their authored sequence across the week.
  const eventDayIds: string[] = [];
  if (eventMissionIds.length > 0) {
    const eligible = template.filter(
      (d) => d.eventEligible && d.id !== gamePlotDayId
    );
    const pool = [...eligible];
    while (eventDayIds.length < eventMissionIds.length && pool.length > 0) {
      const chosen = pick(pool, rng)!;
      pool.splice(pool.indexOf(chosen), 1);
      eventDayIds.push(chosen.id);
    }
    // Restore template (chronological) order for assignment.
    eventDayIds.sort(
      (a, b) =>
        template.findIndex((d) => d.id === a) -
        template.findIndex((d) => d.id === b)
    );
  }
  // Serve events in authored order as their days come up.
  const eventQueue = [...eventMissionIds];

  // Seed with the dailies already served in earlier weeks so the week avoids
  // repeats across the whole run (not just within the week). When every daily
  // has been seen, `drawFrom` falls back to the full pool (cycle restarts).
  const usedDaily = new Set<string>(usedDailyInit);

  // Running position of the NEXT call in the player's career, and the correct
  // unit of the previously scheduled call — used to enforce:
  //   1. no pranks before career call #3, and
  //   2. no two consecutive calls with the same correct dispatch (a prank may
  //      break the run, since pranks don't send a real unit).
  let callPos = careerCallsBefore;
  let lastUnit: string | null = null;

  const drawDaily = (): string | undefined => {
    const constrain = (arr: Mission[]): Mission[] => {
      let out = arr;
      if (callPos < NO_PRANK_BEFORE_CALL) out = out.filter((m) => !isPrank(m));
      if (lastUnit) {
        out = out.filter((m) => isPrank(m) || correctUnitOf(m) !== lastUnit);
      }
      return out;
    };
    const fresh = pools.daily.filter((m) => !usedDaily.has(m.id));
    // Prefer unseen + constrained; relax the no-repeat rule, then (only if the
    // pool simply can't satisfy them) the constraints themselves.
    let candidates = constrain(fresh);
    if (candidates.length === 0) candidates = constrain(pools.daily);
    if (candidates.length === 0) candidates = fresh.length > 0 ? fresh : pools.daily;
    const choice = pick(candidates, rng);
    if (!choice) return undefined;
    usedDaily.add(choice.id);
    callPos++;
    lastUnit = correctUnitOf(choice);
    return choice.id;
  };

  const days: ScheduledDay[] = template.map((day) => {
    const isPlotDay = gamePlotDayId === day.id;

    // On the plot day, the plot call replaces the daily call by default; with
    // keepDailyOnPlotDay the plot is appended after the day's normal slots.
    let slots: DayKind[] = day.slots;
    if (isPlotDay && plotMissionId) {
      slots = day.keepDailyOnPlotDay ? [...day.slots, "game_plot"] : ["game_plot"];
    }
    // Event days INSERT the off-duty scene between the day's calls (random
    // position after at least one call) so the waits between calls carry the
    // personal life too — not just the end of the shift.
    if (eventDayIds.includes(day.id)) {
      const at = 1 + Math.floor(rng() * slots.length);
      slots = [...slots.slice(0, at), "event", ...slots.slice(at)];
    }

    const missionIds: string[] = [];
    for (const kind of slots) {
      let id: string | undefined;
      if (kind === "game_plot") {
        id = plotMissionId ?? undefined;
        if (id) {
          callPos++;
          lastUnit = null; // plot correct unit may be dynamic — no constraint
        }
      } else if (kind === "event") {
        // Off-duty scene: no dispatch, so it doesn't move the call counters.
        id = eventQueue.shift();
      } else if (kind === "weekend") {
        // Sequential by `order`. Fall back to the daily pool when no weekend
        // mission is authored / the sequence is exhausted.
        if (weekendMissionId) {
          id = weekendMissionId;
          const wm = pools.weekend.find((m) => m.id === weekendMissionId);
          callPos++;
          lastUnit = wm ? correctUnitOf(wm) : null;
        } else {
          id = drawDaily();
        }
      } else {
        id = drawDaily();
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
    eventDayIds,
    eventMissionIds,
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
