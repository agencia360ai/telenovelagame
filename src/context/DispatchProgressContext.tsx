import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CallResultDetails } from "../game/types";
import {
  RANKS,
  SHIFT_SIZE,
  SHIFT_COMPLETE_BONUS,
  PERFECT_SHIFT_BONUS,
  getRankForXP,
  getStreakMultiplier,
  getSpeedBonus,
  getSpeedLabel,
} from "../game/ranks";
import { checkNewAchievements } from "../game/achievements";

export type DispatchProgress = {
  score: number;
  xp: number;
  callsHandled: number;
  correctCount: number;
  currentStreak: number;
  bestStreak: number;
  rankIndex: number;
  shiftsCompleted: number;
  perfectShifts: number;
  shiftProgress: number;
  unlockedAchievements: string[];
  lastResult: CallResultDetails | null;
  dailyStreak: number;
  lastPlayDate: string;
  recordResult: (correct: boolean, baseReward: number, dispatchSeconds: number) => void;
  clearLastResult: () => void;
  reset: () => void;
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function isYesterday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return d.toISOString().slice(0, 10) === yesterday.toISOString().slice(0, 10);
}

type State = {
  score: number;
  xp: number;
  callsHandled: number;
  correctCount: number;
  currentStreak: number;
  bestStreak: number;
  rankIndex: number;
  shiftsCompleted: number;
  perfectShifts: number;
  shiftProgress: number;
  shiftCorrect: number;
  fastestDispatch: number;
  unlockedAchievements: string[];
  lastResult: CallResultDetails | null;
  dailyStreak: number;
  lastPlayDate: string;
};

const DEFAULTS: State = {
  score: 0,
  xp: 0,
  callsHandled: 0,
  correctCount: 0,
  currentStreak: 0,
  bestStreak: 0,
  rankIndex: 0,
  shiftsCompleted: 0,
  perfectShifts: 0,
  shiftProgress: 0,
  shiftCorrect: 0,
  fastestDispatch: 0,
  unlockedAchievements: [],
  lastResult: null,
  dailyStreak: 0,
  lastPlayDate: "",
};

const STORAGE_KEY = "dispatch_progress_v2";

const DispatchProgressContext = createContext<DispatchProgress>({
  ...DEFAULTS,
  recordResult: () => {},
  clearLastResult: () => {},
  reset: () => {},
  dailyStreak: 0,
  lastPlayDate: "",
});

export function DispatchProgressProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<State>(DEFAULTS);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const saved = JSON.parse(raw);
          const today = todayStr();
          let dailyStreak = saved.dailyStreak ?? 0;
          const lastPlayDate = saved.lastPlayDate ?? "";

          if (lastPlayDate === today) {
            // Already played today — keep streak
          } else if (isYesterday(lastPlayDate)) {
            // Consecutive day — bump streak
            dailyStreak += 1;
          } else if (lastPlayDate) {
            // Missed a day — reset
            dailyStreak = 1;
          }

          setState((s) => ({
            ...s,
            ...saved,
            currentStreak: 0,
            lastResult: null,
            dailyStreak,
            lastPlayDate: lastPlayDate === today ? today : saved.lastPlayDate,
          }));
        } catch {}
      }
      loaded.current = true;
    });
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    const {
      score, xp, callsHandled, correctCount, bestStreak,
      rankIndex, shiftsCompleted, perfectShifts, shiftProgress,
      shiftCorrect, fastestDispatch, unlockedAchievements,
      dailyStreak, lastPlayDate,
    } = state;
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        score, xp, callsHandled, correctCount, bestStreak,
        rankIndex, shiftsCompleted, perfectShifts, shiftProgress,
        shiftCorrect, fastestDispatch, unlockedAchievements,
        dailyStreak, lastPlayDate,
      })
    ).catch(() => {});
  }, [
    state.score, state.xp, state.callsHandled, state.correctCount,
    state.bestStreak, state.rankIndex, state.shiftsCompleted,
    state.perfectShifts, state.shiftProgress, state.shiftCorrect,
    state.fastestDispatch, state.unlockedAchievements,
    state.dailyStreak, state.lastPlayDate,
  ]);

  const recordResult = useCallback(
    (correct: boolean, baseReward: number, dispatchSeconds: number) => {
      setState((prev) => {
        const newStreak = correct ? prev.currentStreak + 1 : 0;
        const newBestStreak = Math.max(prev.bestStreak, newStreak);
        const newCallsHandled = prev.callsHandled + 1;
        const newCorrectCount = prev.correctCount + (correct ? 1 : 0);
        const newFastest =
          correct && dispatchSeconds > 0
            ? prev.fastestDispatch === 0
              ? dispatchSeconds
              : Math.min(prev.fastestDispatch, dispatchSeconds)
            : prev.fastestDispatch;

        const streakMult = correct ? getStreakMultiplier(newStreak) : 1;
        const speedBonusXP = correct ? getSpeedBonus(dispatchSeconds) : 0;
        const speedLabel = correct ? getSpeedLabel(dispatchSeconds) : "";
        const baseXP = correct ? baseReward : 0;
        const streakBonus = correct ? Math.round(baseReward * streakMult) - baseReward : 0;

        let shiftProgress = prev.shiftProgress + 1;
        let shiftCorrect = prev.shiftCorrect + (correct ? 1 : 0);
        let shiftsCompleted = prev.shiftsCompleted;
        let perfectShifts = prev.perfectShifts;
        let shiftBonus = 0;
        let perfectShiftBonus = 0;
        let shiftComplete = false;
        let shiftPerfect = false;

        if (shiftProgress >= SHIFT_SIZE) {
          shiftComplete = true;
          shiftBonus = SHIFT_COMPLETE_BONUS;
          shiftsCompleted += 1;
          if (shiftCorrect === SHIFT_SIZE) {
            shiftPerfect = true;
            perfectShiftBonus = PERFECT_SHIFT_BONUS;
            perfectShifts += 1;
          }
          shiftProgress = 0;
          shiftCorrect = 0;
        }

        const totalXP = baseXP + streakBonus + speedBonusXP + shiftBonus + perfectShiftBonus;
        const newXP = prev.xp + totalXP;
        const newScore = prev.score + totalXP;
        const oldRankIndex = prev.rankIndex;
        const newRankIndex = getRankForXP(newXP);
        const rankedUp = newRankIndex > oldRankIndex;

        const statsForAchievements = {
          callsHandled: newCallsHandled,
          correctCount: newCorrectCount,
          bestStreak: newBestStreak,
          currentStreak: newStreak,
          perfectShifts,
          shiftsCompleted,
          rankIndex: newRankIndex,
          fastestDispatch: newFastest,
        };
        const newAchievements = checkNewAchievements(
          statsForAchievements,
          prev.unlockedAchievements
        );

        const lastResult: CallResultDetails = {
          correct,
          baseReward: baseXP,
          streakMultiplier: streakMult,
          streakBonus,
          speedBonusXP,
          speedLabel,
          shiftBonus,
          perfectShiftBonus,
          totalXP,
          newStreak,
          newAchievements,
          rankedUp,
          newRankName: RANKS[newRankIndex].name,
          newRankIcon: RANKS[newRankIndex].icon,
          shiftComplete,
          shiftPerfect,
        };

        const today = todayStr();
        let dailyStreak = prev.dailyStreak;
        if (prev.lastPlayDate !== today) {
          dailyStreak = isYesterday(prev.lastPlayDate) ? prev.dailyStreak + 1 : 1;
        }

        return {
          score: newScore,
          xp: newXP,
          callsHandled: newCallsHandled,
          correctCount: newCorrectCount,
          currentStreak: newStreak,
          bestStreak: newBestStreak,
          rankIndex: newRankIndex,
          shiftsCompleted,
          perfectShifts,
          shiftProgress,
          shiftCorrect,
          fastestDispatch: newFastest,
          unlockedAchievements: [
            ...prev.unlockedAchievements,
            ...newAchievements,
          ],
          lastResult,
          dailyStreak,
          lastPlayDate: today,
        };
      });
    },
    []
  );

  const clearLastResult = useCallback(() => {
    setState((s) => ({ ...s, lastResult: null }));
  }, []);

  const reset = useCallback(() => {
    loaded.current = true;
    setState(DEFAULTS);
  }, []);

  const value: DispatchProgress = {
    score: state.score,
    xp: state.xp,
    callsHandled: state.callsHandled,
    correctCount: state.correctCount,
    currentStreak: state.currentStreak,
    bestStreak: state.bestStreak,
    rankIndex: state.rankIndex,
    shiftsCompleted: state.shiftsCompleted,
    perfectShifts: state.perfectShifts,
    shiftProgress: state.shiftProgress,
    unlockedAchievements: state.unlockedAchievements,
    lastResult: state.lastResult,
    dailyStreak: state.dailyStreak,
    lastPlayDate: state.lastPlayDate,
    recordResult,
    clearLastResult,
    reset,
  };

  return (
    <DispatchProgressContext.Provider value={value}>
      {children}
    </DispatchProgressContext.Provider>
  );
}

export function useDispatchProgress() {
  return useContext(DispatchProgressContext);
}
