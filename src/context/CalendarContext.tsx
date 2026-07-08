/**
 * CalendarContext — owns the in-game week/day progression.
 *
 * It serves the next scheduled mission to the lobby, advances day-by-day as the
 * player completes calls (skipping rest days), and exposes a week summary so the
 * WeekComplete screen can show results + rewards. The generated week is frozen
 * and persisted so it doesn't re-randomize across launches.
 *
 * Mirrors the persistence pattern of DispatchProgressContext (AsyncStorage).
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CalendarState, WeekSchedule } from "../lib/calendar/types";
import {
  MissionPools,
  firstPlayableDay,
  generateWeek,
  nextPlayableDay,
  resolveNextPlot,
  resolveNextEvents,
  shortDayLabel,
} from "../lib/calendar/schedule";
import { DEFAULT_WEEK_TEMPLATE } from "../content/calendar/weekTemplate";
import { Mission } from "../lib/missions/types";
import { sortByOrder } from "../content/calendar/gamePlot";
import { getMissionsByCategory } from "../content/missions";
import { useDispatchProgress } from "./DispatchProgressContext";
import { unitUnlockedAt, useFleet } from "./FleetContext";

// v2: bumped when call-gating by unlocked units was added, so pre-gating
// frozen weeks (which could serve e.g. a fire call before firefighters unlock)
// are discarded and week 1 is rebuilt with the gate applied.
// v3: the gate now uses the fleet's callsCompleted counter (the one that
// actually unlocks units) instead of progress.callsHandled, which drifted
// ahead — weeks frozen under the old counter could still serve locked calls.
// v4: scheduling rules added (no pranks before call #3, no back-to-back calls
// with the same correct dispatch) — rebuild weeks frozen without them.
// v5: off-duty "event" scenes added (one per week on a random weekday) —
// rebuild so the current week gets its event slot.
// v6: three events per week (friends & partner personal arc).
// v7: student-debt installment events inserted into the sequence.
// v8: crosstown travel event added (paid displacement → plot clue).
// v9: game_plot missions folded INTO the event sequence (no separate plot
// tier/day) — w1..w5 are now events at orders 6/36/63/91/121.
// v10: 12-week narrative package (Hale arc). Plots are back to a weekly
// game_plot slot (12 chapters, `unlock.minWeek` gated), weekends are authored
// for weeks 1/6/11 (matched by `week`), and the week grows to 6 days × 3 calls.
// v11: three events per week, INSERTED between the day's calls (not appended)
// so the standby waits carry personal moments; daily pool fixed to the 30-call
// list (package extras out of rotation).
// v12: off-duty events were weekend-only (all three on Saturday).
// v13: story beats spread across the whole week, hidden random 5–30s wait.
// v14: setting-based split — OFF-SITE beats (the personal-life arc, `offsite`)
// play on the weekend; ON-SITE beats rotate through the weekdays. Rebuild v13.
const STORAGE_KEY = "dispatch_calendar_v14";

/**
 * The unit a call effectively REQUIRES to be resolved — its correct dispatch,
 * or an explicit `requires_unit` flag on the mission. Used to keep calls that
 * need a still-locked unit out of the served pool.
 */
function requiredUnit(m: any): string | null {
  if (m?.requires_unit) return m.requires_unit as string;
  const disp = m?.beats?.find((b: any) => b?.type === "dispatch");
  return disp?.correct ?? null;
}

/** Daily pool, minus calls that need a unit the player hasn't unlocked yet. */
function dailyPoolFor(callsHandled: number): Mission[] {
  return getMissionsByCategory("daily").filter((m) => {
    const req = requiredUnit(m);
    return !req || unitUnlockedAt(req, callsHandled);
  });
}

export type NextMission = { missionId: string; dayLabel: string; week: number };

export type WeekSummary = {
  week: number;
  total: number;
  correct: number;
  accuracy: number;
};

type CalendarApi = {
  week: number;
  dayLabel: string;
  /** Compact header label, e.g. "WEEK 1 · MON". */
  shortLabel: string;
  dayMissionCount: number;
  dayMissionIndex: number;
  isWeekComplete: boolean;
  weekSummary: WeekSummary;
  schedule: WeekSchedule;
  getNextMission: () => NextMission | null;
  completeMission: (missionId: string, correct: boolean) => void;
  startNextWeek: () => void;
  reset: () => void;
};

function buildPools(callsHandled: number): MissionPools {
  return {
    daily: dailyPoolFor(callsHandled),
    weekend: getMissionsByCategory("weekend"),
  };
}

/** game_plot missions sorted by `order` — the plot sequence. */
function buildPlotList(): Mission[] {
  return sortByOrder(getMissionsByCategory("game_plot"));
}

/** weekend missions sorted by `order` — the weekend sequence. */
function buildWeekendList(): Mission[] {
  return sortByOrder(getMissionsByCategory("weekend"));
}

/** All off-duty scenes (events + life moments). */
function offDutyScenes(): Mission[] {
  return [
    ...getMissionsByCategory("event"),
    ...getMissionsByCategory("life_moment"),
  ];
}
/** Off-site scenes (the personal-life arc), sorted by `order` — weekend pool. */
function buildOffsiteList(): Mission[] {
  return sortByOrder(offDutyScenes().filter((m) => (m as any).offsite));
}
/** On-site scenes (at the dispatch center), sorted by `order` — weekday pool. */
function buildOnsiteList(): Mission[] {
  return sortByOrder(offDutyScenes().filter((m) => !(m as any).offsite));
}
/** Deterministic weekly rotation through the on-site pool: `k` scenes for the
 *  given 1-based week, cycling with no repeats until the pool is exhausted. */
function rotateOnsite(list: Mission[], week: number, k: number): string[] {
  if (list.length === 0) return [];
  const start = ((week - 1) * k) % list.length;
  const out: string[] = [];
  for (let i = 0; i < k; i++) out.push(list[(start + i) % list.length].id);
  return out;
}

/** Build a fresh, frozen week and position the player on its first playable day. */
function buildWeek(
  week: number,
  plotIndex: number,
  weekendIndex: number,
  rankIndex: number,
  servedDaily: string[] = [],
  callsHandled: number = 0,
  eventIndex: number = 0
): CalendarState {
  const pools = buildPools(callsHandled);
  const plotMissionId = resolveNextPlot(buildPlotList(), plotIndex, {
    rankIndex,
    week,
  });
  // Weekend scenes are authored for specific weeks (1/6/11) — matched by the
  // mission's `week` field, not a sequential pointer.
  const weekendMissionId =
    buildWeekendList().find((m) => (m as any).week === week)?.id ?? null;
  // Off-site personal-life beats (the arc) play on the weekend, in order; on-site
  // beats rotate through the weekdays. Weekend: 3, weekdays: 2 → 5 scenes/week.
  const eventMissionIds = resolveNextEvents(buildOffsiteList(), eventIndex, 3);
  const onsiteEventIds = rotateOnsite(buildOnsiteList(), week, 2);
  const schedule = generateWeek(
    week,
    DEFAULT_WEEK_TEMPLATE,
    pools,
    plotMissionId,
    weekendMissionId,
    Math.random,
    servedDaily,
    callsHandled,
    eventMissionIds,
    onsiteEventIds
  );
  // Track which dailies have now been served; once the whole pool has been seen,
  // restart the cycle (keep just this week's so we don't immediately repeat).
  const dailyIds = new Set(pools.daily.map((m) => m.id));
  const usedThisWeek = schedule.days
    .flatMap((d) => d.missionIds)
    .filter((id) => dailyIds.has(id));
  let nextServed = Array.from(new Set([...servedDaily, ...usedThisWeek]));
  if (nextServed.length >= pools.daily.length) nextServed = usedThisWeek;
  return {
    week,
    dayIndex: firstPlayableDay(schedule),
    missionIndexInDay: 0,
    gamePlotIndex: plotIndex,
    weekendIndex,
    eventIndex,
    schedule,
    completedThisWeek: 0,
    correctThisWeek: 0,
    servedDaily: nextServed,
  };
}

function isValidState(s: any): s is CalendarState {
  return (
    s &&
    typeof s.week === "number" &&
    typeof s.dayIndex === "number" &&
    typeof s.missionIndexInDay === "number" &&
    s.schedule &&
    Array.isArray(s.schedule.days)
  );
}

const CalendarContext = createContext<CalendarApi | null>(null);

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const progress = useDispatchProgress();
  const fleet = useFleet();
  const rankRef = useRef(progress.rankIndex);
  rankRef.current = progress.rankIndex;
  // Gate calls by the FLEET's dispatch counter — the same one that unlocks
  // units — not progress.callsHandled (which also counts narrative missions
  // and timeouts, drifting ahead and letting still-locked calls through).
  const callsRef = useRef(fleet.callsCompleted);
  callsRef.current = fleet.callsCompleted;

  const [state, setState] = useState<CalendarState>(() => buildWeek(1, 0, 0, 0));
  const loaded = useRef(false);

  // Load persisted calendar (or keep the freshly-generated week 1).
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const saved = JSON.parse(raw);
          if (isValidState(saved)) {
            // Backfill fields added after this state may have been persisted.
            if (typeof saved.weekendIndex !== "number") saved.weekendIndex = 0;
            if (typeof saved.eventIndex !== "number") saved.eventIndex = 0;
            if (saved.schedule && saved.schedule.weekendMissionId === undefined) {
              saved.schedule.weekendMissionId = null;
            }
            if (!Array.isArray(saved.servedDaily)) saved.servedDaily = [];
            setState(saved);
          }
        } catch {}
      }
      loaded.current = true;
    });
  }, []);

  // Persist on change (once initial load has settled).
  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state]);

  const isWeekComplete = state.dayIndex >= state.schedule.days.length;
  const currentDay = state.schedule.days[state.dayIndex];

  const getNextMission = useCallback((): NextMission | null => {
    if (state.dayIndex >= state.schedule.days.length) return null;
    const day = state.schedule.days[state.dayIndex];
    const missionId = day?.missionIds[state.missionIndexInDay];
    if (!missionId) return null;
    return { missionId, dayLabel: day.label, week: state.week };
  }, [state]);

  const completeMission = useCallback((missionId: string, correct: boolean) => {
    setState((prev) => {
      const day = prev.schedule.days[prev.dayIndex];
      if (!day) return prev; // week already complete — ignore stray calls

      let missionIndexInDay = prev.missionIndexInDay + 1;
      let dayIndex = prev.dayIndex;

      // Advance the plot pointer once this week's plot call has been handled.
      const gamePlotIndex =
        prev.schedule.gamePlotMissionId &&
        missionId === prev.schedule.gamePlotMissionId
          ? prev.gamePlotIndex + 1
          : prev.gamePlotIndex;

      // Advance the weekend pointer once this week's weekend call has been handled.
      const weekendIndex =
        prev.schedule.weekendMissionId &&
        missionId === prev.schedule.weekendMissionId
          ? prev.weekendIndex + 1
          : prev.weekendIndex;

      // Advance the event pointer as each off-duty scene of the week plays.
      const eventIndex = (prev.schedule.eventMissionIds ?? []).includes(
        missionId
      )
        ? prev.eventIndex + 1
        : prev.eventIndex;

      if (missionIndexInDay >= day.missionIds.length) {
        missionIndexInDay = 0;
        dayIndex = nextPlayableDay(prev.schedule, prev.dayIndex + 1);
      }

      return {
        ...prev,
        dayIndex,
        missionIndexInDay,
        gamePlotIndex,
        weekendIndex,
        eventIndex,
        completedThisWeek: prev.completedThisWeek + 1,
        correctThisWeek: prev.correctThisWeek + (correct ? 1 : 0),
      };
    });
  }, []);

  const startNextWeek = useCallback(() => {
    setState((prev) =>
      buildWeek(
        prev.week + 1,
        prev.gamePlotIndex,
        prev.weekendIndex,
        rankRef.current,
        prev.servedDaily,
        callsRef.current,
        prev.eventIndex
      )
    );
  }, []);

  const reset = useCallback(() => {
    loaded.current = true;
    setState(buildWeek(1, 0, 0, rankRef.current));
  }, []);

  const weekSummary: WeekSummary = {
    week: state.week,
    total: state.completedThisWeek,
    correct: state.correctThisWeek,
    accuracy:
      state.completedThisWeek > 0
        ? Math.round((state.correctThisWeek / state.completedThisWeek) * 100)
        : 0,
  };

  const value: CalendarApi = {
    week: state.week,
    dayLabel: currentDay?.label ?? "—",
    shortLabel: `WEEK ${state.week} · ${shortDayLabel(currentDay?.label ?? "")}`,
    dayMissionCount: currentDay?.missionIds.length ?? 0,
    dayMissionIndex: state.missionIndexInDay,
    isWeekComplete,
    weekSummary,
    schedule: state.schedule,
    getNextMission,
    completeMission,
    startNextWeek,
    reset,
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar(): CalendarApi {
  const ctx = useContext(CalendarContext);
  if (!ctx) throw new Error("useCalendar must be used within CalendarProvider");
  return ctx;
}
