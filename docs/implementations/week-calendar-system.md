# In-Game Week / Day Calendar System

> Status: implemented · Author: Christian Aldaco + Claude · Date: 2026-06-24

## 1. Problem & goal

The Dispatch mode used to serve **random** missions (`getNextMissionId`) with no notion of
time. We want a **configurable in-game calendar**:

```
Week 1
  Monday    → Daily Call
  Tuesday   → Daily Call
  Wednesday → Daily Call
  Thursday  → Game Plot Call   (assigned to a random weekday)
  Friday    → Daily Call
  Saturday  → Weekend Call
  Sunday    → (none — skipped → next week's Monday)
```

Each day can have **one or more** missions. Days are **configurable** via a template.
At the end of a week the player sees a **summary + reward** screen before advancing.

> These days/weeks are **in-game**, not wall-clock time.

## 2. Decisions (confirmed with the user)

| Topic | Decision |
| --- | --- |
| Game Plot source | **Ordered narrative sequence**, easily configurable, with **optional unlock conditions** (min rank / min week). |
| Shift vs Week | **Replace** the old "Shift" (5 calls) with the Day/Week unit. End-of-shift bonuses move to **end-of-day / end-of-week**. |
| Game-plot day content | **Configurable per template**; default = that day shows **only** the Game Plot call (replaces the daily). |
| Week-complete screen | **Summary + reward** (gems + bonus XP), then advance to next week. |

### What "rank going up" actually was
There was **no** day counter. Rank rises from **XP** earned per correct call
(`src/game/ranks.ts`). The closest thing to "days" was the **Shift** (5 calls) — now
replaced. The old `dailyStreak` is **real-world** time and is left untouched.

## 3. Architecture

### Mission categories (data)
`Mission` gains `category?: "daily" | "game_plot" | "weekend"` (default `"daily"`) and an
optional `order?` for plot sequencing. The 3 bundled missions are categorized:
`kitchen-fire` → daily, `border-runners` → daily, `armed-robbery` → game_plot.

### Configurable calendar (data) — `src/content/calendar/`
- **`weekTemplate.ts`** — the 7-day template the designer edits:
  ```ts
  type DayKind = "daily" | "game_plot" | "weekend";
  type DayTemplate = {
    id: string; label: string;
    slots: DayKind[];            // [] = no calls → day is skipped
    gamePlotEligible?: boolean;  // Mon–Fri: candidate to host the plot call
    keepDailyOnPlotDay?: boolean;// default false (plot day = only the plot call)
  };
  ```
  Default replicates the example above.
- **`gamePlot.ts`** — ordered plot sequence with optional unlock:
  ```ts
  type GamePlotEntry = { missionId: string; unlock?: { minRank?: number; minWeek?: number } };
  export const GAME_PLOT_SEQUENCE: GamePlotEntry[] = [{ missionId: "armed-robbery" }];
  ```

### Pure scheduling logic — `src/lib/calendar/`
- **`types.ts`** — `DayKind`, `ScheduledDay`, `WeekSchedule`, `CalendarState`.
- **`schedule.ts`**:
  - `generateWeek(week, template, pools, plotMissionId, rng)` → a concrete, **frozen**
    `WeekSchedule`. Picks one random `gamePlotEligible` day as the plot day; resolves each
    day's slots into concrete mission ids (daily/weekend random from pools, no repeats
    within the week; plot day gets `plotMissionId`). Empty-slot days stay empty (skipped).
  - `resolveNextPlot(plotIndex, ctx)` → next unlocked `GamePlotEntry.missionId` or `null`.
  - `firstPlayableDay` / `nextPlayableDay` helpers (skip empty days).

### State — `src/context/CalendarContext.tsx`
Mirrors `DispatchProgressContext` (AsyncStorage, key `dispatch_calendar_v1`). Frozen
schedule persists so it doesn't re-randomize across restarts.
```ts
type CalendarState = {
  week; dayIndex; missionIndexInDay; gamePlotIndex;
  schedule: WeekSchedule; completedThisWeek; correctThisWeek;
};
```
API: `getNextMission()` (`{missionId,dayLabel,week}` | `null`), `completeMission(id,correct)`
(advances within day, skips empty days, marks week complete), `isWeekComplete`,
`weekSummary`, `currentLabel`, `startNextWeek()`, `reset()`.

### Replace Shift → Day/Week
- `DispatchProgressContext`: removes shift fields (`shiftProgress/shiftCorrect`) and the
  shift-bonus block in `recordResult` (XP base + streak + speed stay). `shiftsCompleted`/
  `perfectShifts` become `weeksCompleted`/`perfectWeeks`. New `addWeekComplete(perfect,
  bonusXP)` adds bonus XP, bumps week counters, recomputes rank, runs achievements.
- `ranks.ts`: `SHIFT_*` constants → `DAY_COMPLETE_BONUS`, `WEEK_COMPLETE_BONUS`,
  `PERFECT_WEEK_BONUS`, `WEEK_COMPLETE_GEMS`, `PERFECT_WEEK_GEMS`.
- `achievements.ts`: `perfect_shift`→`perfect_week`, `shifts_5`→`weeks_5`.

### Week-complete screen — `src/screens/WeekCompleteScreen.tsx`
Summary (calls resolved, accuracy, best streak) + reward (gems via `economy.earn`, bonus XP
via `progress.addWeekComplete`, awarded once via a mount guard). Button → `startNextWeek()`
→ back to lobby. Route `WeekComplete` added to `AppNavigator`.

### Flow integration
- **Lobby**: `answerCall` uses `calendar.getNextMission()`; serves that mission. Header shows
  `WEEK n · DAY`. The old SHIFT dots become the current day's mission progress. A
  `useEffect` on `isWeekComplete` navigates to `WeekComplete`.
- **MissionScreen**: on dispatch, calls `calendar.completeMission(mission.id, correct)`
  alongside `progress.recordResult`. SHIFT pill → week/day label.

## 4. Files

**New:** `src/content/calendar/weekTemplate.ts`, `src/content/calendar/gamePlot.ts`,
`src/lib/calendar/types.ts`, `src/lib/calendar/schedule.ts`,
`src/context/CalendarContext.tsx`, `src/screens/WeekCompleteScreen.tsx`,
`docs/implementations/week-calendar-system.md`.

**Modified:** `src/lib/missions/types.ts`, `src/content/missions/*.json`,
`src/content/missions/index.ts`, `scripts/validate-missions.ts`, `App.tsx`,
`src/navigation/AppNavigator.tsx`, `src/screens/DispatchLobbyScreen.tsx`,
`src/screens/MissionScreen.tsx`, `src/context/DispatchProgressContext.tsx`,
`src/game/ranks.ts`, `src/game/achievements.ts`, `src/screens/StatsScreen.tsx`,
`src/components/ResultBreakdown.tsx`.

## 5. Content notes
Only 3 missions exist. The system tolerates small pools (repeats allowed when a pool runs
out). For a full weekly feel, add more `daily` and `weekend` missions and extend
`GAME_PLOT_SEQUENCE`. The **weekend** pool is currently empty and falls back to the daily
pool until weekend missions are authored. All of this is JSON/data, not code.

## 6. How to extend
- **Add a daily/weekend call**: drop a mission JSON with `"category": "daily" | "weekend"`,
  register it in `src/content/missions/index.ts`, run `npm run validate-missions`.
- **Add a plot chapter**: author the mission (`"category": "game_plot"`) and append an entry
  to `GAME_PLOT_SEQUENCE` (optionally with `unlock`).
- **Reshape the week**: edit `weekTemplate.ts` (e.g. give Sunday a `weekend` slot, or set
  `keepDailyOnPlotDay: true`).

## 7. Verification
1. `npm run validate-missions` passes with `category`.
2. `npx tsc --noEmit` clean.
3. Run app: lobby shows `WEEK 1 · MON`; answering advances Mon→Tue→…; Sunday is skipped.
4. The random plot weekday serves `armed-robbery`; other weekdays serve daily calls.
5. End of week → `WeekCompleteScreen` (summary + reward) → "Start Week 2" → lobby `WEEK 2`.
6. XP/rank still rise per call; no "SHIFT" UI remains.
7. Kill & relaunch mid-week: schedule and day/mission position persist.
