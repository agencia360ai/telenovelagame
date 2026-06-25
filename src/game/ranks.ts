export type Rank = {
  id: string;
  name: string;
  minXP: number;
  icon: string;
};

export const RANKS: Rank[] = [
  { id: "trainee", name: "Trainee", minXP: 0, icon: "📋" },
  { id: "dispatcher", name: "Dispatcher", minXP: 50, icon: "📞" },
  { id: "senior", name: "Sr. Dispatcher", minXP: 150, icon: "🎧" },
  { id: "supervisor", name: "Supervisor", minXP: 350, icon: "⭐" },
  { id: "commander", name: "Commander", minXP: 700, icon: "🏅" },
  { id: "chief", name: "Chief Operator", minXP: 1200, icon: "🎖️" },
  { id: "director", name: "Director", minXP: 2000, icon: "🏆" },
];

// End-of-day / end-of-week bonuses (the in-game calendar replaced the old
// per-shift bonus). Awarded by the CalendarContext / WeekComplete flow.
export const DAY_COMPLETE_BONUS = 10;
export const WEEK_COMPLETE_BONUS = 30;
export const PERFECT_WEEK_BONUS = 50;
export const WEEK_COMPLETE_GEMS = 5;
export const PERFECT_WEEK_GEMS = 10;

export function getRankForXP(xp: number): number {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].minXP) return i;
  }
  return 0;
}

export function getRankProgress(xp: number): number {
  const idx = getRankForXP(xp);
  if (idx >= RANKS.length - 1) return 1;
  const current = RANKS[idx];
  const next = RANKS[idx + 1];
  return (xp - current.minXP) / (next.minXP - current.minXP);
}

export function getStreakMultiplier(streak: number): number {
  if (streak >= 10) return 3;
  if (streak >= 5) return 2;
  if (streak >= 3) return 1.5;
  return 1;
}

export function getSpeedBonus(seconds: number): number {
  if (seconds <= 3) return 15;
  if (seconds <= 5) return 10;
  if (seconds <= 10) return 5;
  return 0;
}

export function getSpeedLabel(seconds: number): string {
  if (seconds <= 3) return "LIGHTNING";
  if (seconds <= 5) return "FAST";
  if (seconds <= 10) return "GOOD";
  return "";
}

export function getXPProgress(
  xp: number,
  rankIndex: number
): { current: number; needed: number; percent: number } {
  const currentRank = RANKS[rankIndex] ?? RANKS[0];
  const nextRank = RANKS[rankIndex + 1];
  if (!nextRank) return { current: 0, needed: 0, percent: 1 };
  const range = nextRank.minXP - currentRank.minXP;
  const into = xp - currentRank.minXP;
  return {
    current: into,
    needed: range,
    percent: range > 0 ? into / range : 1,
  };
}
