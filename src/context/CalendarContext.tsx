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
  resolveNextWeekend,
  shortDayLabel,
} from "../lib/calendar/schedule";
import { DEFAULT_WEEK_TEMPLATE } from "../content/calendar/weekTemplate";
import { Mission } from "../lib/missions/types";
import { sortByOrder } from "../content/calendar/gamePlot";
import { getMissionsByCategory } from "../content/missions";
import { useDispatchProgress } from "./DispatchProgressContext";

const STORAGE_KEY = "dispatch_calendar_v1";

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

function buildPools(): MissionPools {
  return {
    daily: getMissionsByCategory("daily"),
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

/** Build a fresh, frozen week and position the player on its first playable day. */
function buildWeek(
  week: number,
  plotIndex: number,
  weekendIndex: number,
  rankIndex: number,
  servedDaily: string[] = []
): CalendarState {
  const pools = buildPools();
  const plotMissionId = resolveNextPlot(buildPlotList(), plotIndex, {
    rankIndex,
    week,
  });
  const weekendMissionId = resolveNextWeekend(buildWeekendList(), weekendIndex);
  const schedule = generateWeek(
    week,
    DEFAULT_WEEK_TEMPLATE,
    pools,
    plotMissionId,
    weekendMissionId,
    Math.random,
    servedDaily
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
  const rankRef = useRef(progress.rankIndex);
  rankRef.current = progress.rankIndex;

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
        prev.servedDaily
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
