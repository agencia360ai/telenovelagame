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
 * Fleet system — UNLOCKS ONLY. Units are not a managed resource anymore: there
 * are no vehicle counts, no busy timers and no purchases. Police and ambulance
 * are available from the start; every other unit is LOCKED and opens up as the
 * player completes more dispatches (staggered by call count). Once unlocked, a
 * unit can always be dispatched.
 *
 * Cash is still earned per correct call (header wallet) for future features.
 *
 * `no_unit` ("no dispatch") is never a unit — it's always available.
 */
export type FleetKind =
  | "police"
  | "ambulance"
  | "firefighters"
  | "animal_control"
  | "pest_control"
  | "ghost_unit"
  | "dino_control"
  | "zombie_unit"
  | "border_patrol";

type UnitCfg = { label: string; icon: string; unlock: number };

// Ordered by unlock. police/ambulance = 0 (always). The rest stagger by calls.
export const FLEET_UNITS: Record<FleetKind, UnitCfg> = {
  police: { label: "Police", icon: "🚔", unlock: 0 },
  ambulance: { label: "Ambulance", icon: "🚑", unlock: 0 },
  firefighters: { label: "Fire Dept", icon: "🚒", unlock: 4 },
  animal_control: { label: "Animal Ctrl", icon: "🐾", unlock: 8 },
  pest_control: { label: "Pest Ctrl", icon: "🐛", unlock: 12 },
  ghost_unit: { label: "Ghostbusters", icon: "👻", unlock: 16 },
  dino_control: { label: "Dino Ctrl", icon: "🦖", unlock: 20 },
  zombie_unit: { label: "Zombie Unit", icon: "🧟", unlock: 24 },
  border_patrol: { label: "Border Patrol", icon: "🛂", unlock: 28 },
};

export const FLEET_KINDS = Object.keys(FLEET_UNITS) as FleetKind[];

function isManaged(kind: string): kind is FleetKind {
  return kind in FLEET_UNITS;
}

/** Pure unlock check — usable outside React (e.g. the calendar's call gate). */
export function unitUnlockedAt(kind: string, callsCompleted: number): boolean {
  if (!isManaged(kind)) return true;
  return callsCompleted >= FLEET_UNITS[kind].unlock;
}

type FleetState = {
  callsCompleted: number;
  cash: number; // earned currency (separate from premium gems)
};

type NextUnlock = { kind: FleetKind; label: string; icon: string; unlock: number };

type Fleet = {
  isUnlocked: (kind: string) => boolean;
  /** Unlocked units can always be dispatched — no counts, no cooldowns. */
  canDispatch: (kind: string) => boolean;
  onDispatch: (kind: string) => void;
  cash: number;
  earnCash: (amount: number) => void;
  /** Spend earned cash; returns false (no deduction) when balance is short. */
  spendCash: (amount: number) => boolean;
  labelOf: (kind: string) => string;
  iconOf: (kind: string) => string;
  unlockCallsOf: (kind: string) => number;
  nextUnlock: () => NextUnlock | null;
  callsCompleted: number;
};

const STORAGE_KEY = "fleet_v3";

const DEFAULT_STATE: FleetState = {
  callsCompleted: 0,
  cash: 0,
};

const FleetContext = createContext<Fleet>({
  isUnlocked: () => false,
  canDispatch: () => true,
  onDispatch: () => {},
  cash: 0,
  earnCash: () => {},
  spendCash: () => false,
  labelOf: () => "",
  iconOf: () => "",
  unlockCallsOf: () => 0,
  nextUnlock: () => null,
  callsCompleted: 0,
});

export function FleetProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FleetState>(DEFAULT_STATE);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const saved = JSON.parse(raw);
          // Older saves also had owned/busy vehicle maps — simply ignored now.
          setState({
            callsCompleted: saved.callsCompleted ?? 0,
            cash: saved.cash ?? 0,
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

  const isUnlocked = useCallback(
    (kind: string): boolean => unitUnlockedAt(kind, state.callsCompleted),
    [state.callsCompleted]
  );

  const canDispatch = useCallback(
    (kind: string): boolean => isUnlocked(kind),
    [isUnlocked]
  );

  const earnCash = useCallback((amount: number) => {
    setState((s) => ({ ...s, cash: s.cash + amount }));
  }, []);

  const spendCash = useCallback(
    (amount: number): boolean => {
      if (state.cash < amount) return false;
      setState((s) => ({ ...s, cash: s.cash - amount }));
      return true;
    },
    [state.cash]
  );

  const onDispatch = useCallback((_kind: string) => {
    setState((s) => ({ ...s, callsCompleted: s.callsCompleted + 1 }));
  }, []);

  const labelOf = useCallback(
    (kind: string) => (isManaged(kind) ? FLEET_UNITS[kind].label : kind),
    []
  );
  const iconOf = useCallback(
    (kind: string) => (isManaged(kind) ? FLEET_UNITS[kind].icon : "🚨"),
    []
  );
  const unlockCallsOf = useCallback(
    (kind: string) => (isManaged(kind) ? FLEET_UNITS[kind].unlock : 0),
    []
  );

  const nextUnlock = useCallback((): NextUnlock | null => {
    const locked = FLEET_KINDS.filter(
      (k) => FLEET_UNITS[k].unlock > state.callsCompleted
    ).sort((a, b) => FLEET_UNITS[a].unlock - FLEET_UNITS[b].unlock);
    if (locked.length === 0) return null;
    const k = locked[0];
    return { kind: k, label: FLEET_UNITS[k].label, icon: FLEET_UNITS[k].icon, unlock: FLEET_UNITS[k].unlock };
  }, [state.callsCompleted]);

  return (
    <FleetContext.Provider
      value={{
        isUnlocked,
        canDispatch,
        onDispatch,
        cash: state.cash,
        earnCash,
        spendCash,
        labelOf,
        iconOf,
        unlockCallsOf,
        nextUnlock,
        callsCompleted: state.callsCompleted,
      }}
    >
      {children}
    </FleetContext.Provider>
  );
}

export function useFleet() {
  return useContext(FleetContext);
}
