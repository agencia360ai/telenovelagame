import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Dispatch story state — the PERSISTENT narrative memory that interlaces the
 * game-plot weeks (terror threat, kidnapping wave, department corruption) with
 * the player's personal life (friends, partner, money).
 *
 * Every mission run is seeded with these variables/flags, so mission JSON can
 * react to past decisions via `variants` / `correct_rules` conditions:
 *
 *   { "when": { "flag": "took_envelope" }, "lines": [...] }
 *   { "when": { "var": "love", "op": ">=", "value": 4 }, "lines": [...] }
 *   { "when": { "var": "cash", "op": "<", "value": 10 }, "lines": [...] }
 *
 * When a mission ends, its runtime variables/flags are merged back here.
 * The reserved variable `cash` is NEVER stored: it is seeded fresh from the
 * fleet wallet each mission, so conditions read the player's REAL money.
 *
 * Notable variables (grown by choice `effects`):
 *   integrity / compliance / don / pawn / case_file / loose_thread — plot arc
 *   bond (friends) / love (partner) / energy — personal arc
 * Notable flags (set by `set_flags`):
 *   w1_called_back, w1_police_sent, w3_unit_sent, w3_filed_away,
 *   took_envelope, envelope_reported
 */

type StoryState = {
  variables: Record<string, number>;
  flags: Record<string, boolean>;
};

type StoryApi = StoryState & {
  /** Merge a finished mission's runtime state into the persistent story. */
  merge: (
    variables: Record<string, number>,
    flags: Record<string, boolean>
  ) => void;
  reset: () => void;
};

const STORAGE_KEY = "dispatch_story_v1";

/** Reserved keys that must not persist (seeded fresh every mission). */
const TRANSIENT_VARS = ["cash", "score_bonus"];

const DEFAULT_STATE: StoryState = { variables: {}, flags: {} };

const DispatchStoryContext = createContext<StoryApi>({
  ...DEFAULT_STATE,
  merge: () => {},
  reset: () => {},
});

export function DispatchStoryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<StoryState>(DEFAULT_STATE);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const saved = JSON.parse(raw);
          setState({
            variables: saved.variables ?? {},
            flags: saved.flags ?? {},
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        loaded.current = true;
      });
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state]);

  const merge = useCallback(
    (variables: Record<string, number>, flags: Record<string, boolean>) => {
      setState((s) => {
        const nextVars = { ...s.variables };
        for (const [k, v] of Object.entries(variables)) {
          if (TRANSIENT_VARS.includes(k)) continue;
          nextVars[k] = v; // runtime holds absolute values (seeded from here)
        }
        return {
          variables: nextVars,
          flags: { ...s.flags, ...flags },
        };
      });
    },
    []
  );

  const reset = useCallback(() => {
    loaded.current = true;
    setState(DEFAULT_STATE);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  return (
    <DispatchStoryContext.Provider value={{ ...state, merge, reset }}>
      {children}
    </DispatchStoryContext.Provider>
  );
}

export function useDispatchStory() {
  return useContext(DispatchStoryContext);
}
