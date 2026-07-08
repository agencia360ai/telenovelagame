/**
 * Week template — the designer-editable shape of an in-game week.
 *
 * Each day declares which kinds of calls it hosts. A day with no slots is a
 * "rest day": it is skipped and the calendar jumps straight to the next day
 * that has calls (e.g. Sunday → next week's Monday).
 *
 * The Game Plot call is NOT pinned to a fixed day here. Instead, every weekday
 * flagged `gamePlotEligible` is a candidate; the scheduler picks ONE of them at
 * random when it generates the week (see src/lib/calendar/schedule.ts).
 *
 * To reshape the week, just edit DEFAULT_WEEK_TEMPLATE below.
 */
import { DayKind } from "../../lib/calendar/types";

export type DayTemplate = {
  /** Stable id, e.g. "monday". */
  id: string;
  /** Display label, e.g. "Monday" (short label derived in the UI). */
  label: string;
  /** Ordered call kinds for the day. `[]` = rest day (skipped). */
  slots: DayKind[];
  /** Mon–Fri candidates that may host the week's single Game Plot call. */
  gamePlotEligible?: boolean;
  /** Candidates that may host the week's single off-duty event scene. */
  eventEligible?: boolean;
  /** If true, the plot day keeps its daily call(s) AND adds the plot call.
   *  Default (false) = the plot replaces the day's daily call. */
  keepDailyOnPlotDay?: boolean;
};

/**
 * Default week — 12-week narrative package brief (6 days × 3 calls):
 *   Mon–Sat: three Daily calls; off-duty story beats (≥4/week) are spread
 *            across random days and INSERTED between calls — they surface in
 *            the dead time, not at the start or end of a shift.
 *   Sat:     also hosts the authored Weekend scene when one exists.
 *   Sun:     rest day (skipped)
 */
export const DEFAULT_WEEK_TEMPLATE: DayTemplate[] = [
  { id: "monday", label: "Monday", slots: ["daily", "daily", "daily"], gamePlotEligible: true, eventEligible: true, keepDailyOnPlotDay: true },
  { id: "tuesday", label: "Tuesday", slots: ["daily", "daily", "daily"], gamePlotEligible: true, eventEligible: true, keepDailyOnPlotDay: true },
  { id: "wednesday", label: "Wednesday", slots: ["daily", "daily", "daily"], gamePlotEligible: true, eventEligible: true, keepDailyOnPlotDay: true },
  { id: "thursday", label: "Thursday", slots: ["daily", "daily", "daily"], gamePlotEligible: true, eventEligible: true, keepDailyOnPlotDay: true },
  { id: "friday", label: "Friday", slots: ["daily", "daily", "daily"], gamePlotEligible: true, eventEligible: true, keepDailyOnPlotDay: true },
  { id: "saturday", label: "Saturday", slots: ["daily", "daily", "weekend"], eventEligible: true },
  { id: "sunday", label: "Sunday", slots: [] },
];

/** Short 3-letter label for compact UI (e.g. "MON"). */
export function shortDayLabel(label: string): string {
  return label.slice(0, 3).toUpperCase();
}
