export type Rank = {
  name: string;
  minXP: number;
  icon: string;
};

export const RANKS: Rank[] = [
  { name: "Trainee", minXP: 0, icon: "📋" },
  { name: "Dispatcher", minXP: 50, icon: "📞" },
  { name: "Sr. Dispatcher", minXP: 150, icon: "🎧" },
  { name: "Supervisor", minXP: 350, icon: "⭐" },
  { name: "Commander", minXP: 700, icon: "🏅" },
  { name: "Chief", minXP: 1500, icon: "👑" },
];

export const SHIFT_SIZE = 5;
export const SHIFT_COMPLETE_BONUS = 5;
export const PERFECT_SHIFT_BONUS = 10;

export function getRankForXP(xp: number): number {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].minXP) return i;
  }
  return 0;
}

export function getXPProgress(
  xp: number,
  rankIndex: number
): { current: number; needed: number; percent: number } {
  if (rankIndex >= RANKS.length - 1) return { current: 0, needed: 0, percent: 1 };
  const currentMin = RANKS[rankIndex].minXP;
  const nextMin = RANKS[rankIndex + 1].minXP;
  const current = xp - currentMin;
  const needed = nextMin - currentMin;
  return { current, needed, percent: current / needed };
}

export function getStreakMultiplier(streak: number): number {
  if (streak >= 10) return 3;
  if (streak >= 5) return 2;
  if (streak >= 3) return 1.5;
  return 1;
}

export function getSpeedBonus(seconds: number): number {
  if (seconds <= 3) return 5;
  if (seconds <= 5) return 3;
  if (seconds <= 10) return 1;
  return 0;
}

export function getSpeedLabel(seconds: number): string {
  if (seconds <= 3) return "LIGHTNING";
  if (seconds <= 5) return "FAST";
  if (seconds <= 10) return "GOOD";
  return "";
}
