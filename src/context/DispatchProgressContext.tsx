import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * DispatchProgress — the operator's persistent career stats.
 *
 * This is the dispatch game's own progression store (separate from the legacy
 * story economy). Score / calls / best streak survive app restarts via
 * AsyncStorage; the current streak is per-session and resets on launch.
 */
export type DispatchProgress = {
  score: number;
  callsHandled: number;
  correctCount: number;
  currentStreak: number;
  bestStreak: number;
  recordResult: (correct: boolean, reward: number) => void;
  reset: () => void;
};

type State = {
  score: number;
  callsHandled: number;
  correctCount: number;
  currentStreak: number;
  bestStreak: number;
};

const DEFAULTS: State = {
  score: 0,
  callsHandled: 0,
  correctCount: 0,
  currentStreak: 0,
  bestStreak: 0,
};

const STORAGE_KEY = "dispatch_progress_v1";

const DispatchProgressContext = createContext<DispatchProgress>({
  ...DEFAULTS,
  recordResult: () => {},
  reset: () => {},
});

export function DispatchProgressProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<State>(DEFAULTS);
  const loaded = useRef(false);

  // Load persisted stats once.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const saved = JSON.parse(raw);
          setState((s) => ({ ...s, ...saved, currentStreak: 0 }));
        } catch {}
      }
      loaded.current = true;
    });
  }, []);

  // Persist the durable fields whenever they change (after the initial load).
  useEffect(() => {
    if (!loaded.current) return;
    const { score, callsHandled, correctCount, bestStreak } = state;
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ score, callsHandled, correctCount, bestStreak })
    ).catch(() => {});
  }, [state.score, state.callsHandled, state.correctCount, state.bestStreak]);

  const recordResult = useCallback((correct: boolean, reward: number) => {
    setState((prev) => {
      const currentStreak = correct ? prev.currentStreak + 1 : 0;
      return {
        score: prev.score + (correct ? reward : 0),
        callsHandled: prev.callsHandled + 1,
        correctCount: prev.correctCount + (correct ? 1 : 0),
        currentStreak,
        bestStreak: Math.max(prev.bestStreak, currentStreak),
      };
    });
  }, []);

  const reset = useCallback(() => {
    loaded.current = true;
    setState(DEFAULTS);
  }, []);

  return (
    <DispatchProgressContext.Provider value={{ ...state, recordResult, reset }}>
      {children}
    </DispatchProgressContext.Provider>
  );
}

export function useDispatchProgress() {
  return useContext(DispatchProgressContext);
}
