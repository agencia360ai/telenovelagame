export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_call", name: "First Response", description: "Handle your first call", icon: "📞" },
  { id: "calls_10", name: "Veteran", description: "Handle 10 calls", icon: "🎖️" },
  { id: "calls_25", name: "Seasoned Pro", description: "Handle 25 calls", icon: "🏆" },
  { id: "calls_50", name: "Living Legend", description: "Handle 50 calls", icon: "👑" },
  { id: "streak_3", name: "On a Roll", description: "3 correct in a row", icon: "🔥" },
  { id: "streak_5", name: "Hot Streak", description: "5 correct in a row", icon: "💥" },
  { id: "streak_10", name: "Unstoppable", description: "10 correct in a row", icon: "⚡" },
  { id: "perfect_shift", name: "Perfect Shift", description: "Ace an entire shift", icon: "💎" },
  { id: "shifts_5", name: "Double Shift", description: "Complete 5 shifts", icon: "🌙" },
  { id: "accuracy_90", name: "Sharp Eye", description: "90%+ accuracy (min 10 calls)", icon: "🎯" },
  { id: "speed_demon", name: "Speed Demon", description: "Dispatch in under 3 seconds", icon: "⏱️" },
  { id: "rank_commander", name: "Command Rank", description: "Reach Commander", icon: "🏅" },
];

type CheckableStats = {
  callsHandled: number;
  correctCount: number;
  bestStreak: number;
  currentStreak: number;
  perfectShifts: number;
  shiftsCompleted: number;
  rankIndex: number;
  fastestDispatch: number;
};

const CHECKS: Record<string, (s: CheckableStats) => boolean> = {
  first_call: (s) => s.callsHandled >= 1,
  calls_10: (s) => s.callsHandled >= 10,
  calls_25: (s) => s.callsHandled >= 25,
  calls_50: (s) => s.callsHandled >= 50,
  streak_3: (s) => s.bestStreak >= 3,
  streak_5: (s) => s.bestStreak >= 5,
  streak_10: (s) => s.bestStreak >= 10,
  perfect_shift: (s) => s.perfectShifts >= 1,
  shifts_5: (s) => s.shiftsCompleted >= 5,
  accuracy_90: (s) =>
    s.callsHandled >= 10 && s.correctCount / s.callsHandled >= 0.9,
  speed_demon: (s) => s.fastestDispatch > 0 && s.fastestDispatch <= 3,
  rank_commander: (s) => s.rankIndex >= 4,
};

export function checkNewAchievements(
  stats: CheckableStats,
  unlocked: string[]
): string[] {
  const fresh: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (unlocked.includes(a.id)) continue;
    const check = CHECKS[a.id];
    if (check && check(stats)) fresh.push(a.id);
  }
  return fresh;
}

export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
