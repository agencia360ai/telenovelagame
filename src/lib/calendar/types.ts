/**
 * Calendar types — the in-game week/day model.
 *
 * A WeekSchedule is generated once per week and then FROZEN (persisted), so it
 * doesn't re-randomize on every app launch. It maps each day to the concrete
 * mission ids the player will handle that day.
 */

/** The kind of call a day slot hosts. */
export type DayKind = "daily" | "game_plot" | "weekend" | "event";

/** One concrete day in a generated week. */
export type ScheduledDay = {
  /** Template day id, e.g. "monday". */
  dayId: string;
  /** Display label, e.g. "Monday". */
  label: string;
  /** Concrete mission ids for the day, in order. `[]` = rest day (skipped). */
  missionIds: string[];
};

/** A fully-resolved week the player works through. */
export type WeekSchedule = {
  week: number;
  days: ScheduledDay[];
  /** Which day hosts the plot call (null if no plot this week). */
  gamePlotDayId: string | null;
  /** The plot mission id placed this week (null if none was unlocked). */
  gamePlotMissionId: string | null;
  /** The weekend mission id placed this week (null if none/exhausted). */
  weekendMissionId: string | null;
  /** Which days host off-duty events this week (may be empty). */
  eventDayIds?: string[];
  /** The event mission ids placed this week, in play order (may be empty). */
  eventMissionIds?: string[];
};

/** Persisted calendar progress. */
export type CalendarState = {
  /** 1-based in-game week. */
  week: number;
  /** Index into `schedule.days` of the day currently being played. */
  dayIndex: number;
  /** Index into the current day's `missionIds`. */
  missionIndexInDay: number;
  /** How many plot entries have been consumed (sequence pointer). */
  gamePlotIndex: number;
  /** How many weekend entries have been consumed (sequence pointer). */
  weekendIndex: number;
  /** How many off-duty event entries have been consumed (sequence pointer). */
  eventIndex: number;
  /** The frozen schedule for the current week. */
  schedule: WeekSchedule;
  /** Calls completed in the current week (for the summary screen). */
  completedThisWeek: number;
  /** Correct calls in the current week. */
  correctThisWeek: number;
  /** Daily call ids already served (across weeks) so they don't repeat until
   *  the whole pool has been seen, then the cycle restarts. */
  servedDaily: string[];
};
