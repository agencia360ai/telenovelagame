/**
 * WardrobeContext — owns which avatar skins the player has unlocked and which
 * one is equipped. Persists to AsyncStorage.
 *
 * Unlocking crosses the two economies the game already has:
 *   • rank  → read from DispatchProgressContext (rankIndex)
 *   • gems  → read/spent through EconomyContext
 *
 * Because of that, WardrobeProvider must live INSIDE both EconomyProvider and
 * DispatchProgressProvider in App.tsx.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_SKIN_ID, getSkin } from "../game/skins";
import { useEconomy } from "./EconomyContext";
import { useDispatchProgress } from "./DispatchProgressContext";

const STORAGE_KEY = "dispatch_wardrobe_v1";

export type UnlockResult =
  | { ok: true; reason: "unlocked" | "already" }
  | { ok: false; reason: "not_found" | "rank" | "gems" };

type Wardrobe = {
  owned: string[];
  equippedId: string;
  isOwned: (id: string) => boolean;
  /** Unlock a skin: checks rank, spends gems if required, adds to owned. */
  unlock: (id: string) => UnlockResult;
  /** Equip an owned skin. Returns false if not owned. */
  equip: (id: string) => boolean;
  reset: () => void;
};

const WardrobeContext = createContext<Wardrobe>({
  owned: [DEFAULT_SKIN_ID],
  equippedId: DEFAULT_SKIN_ID,
  isOwned: () => false,
  unlock: () => ({ ok: false, reason: "not_found" }),
  equip: () => false,
  reset: () => {},
});

export function WardrobeProvider({ children }: { children: React.ReactNode }) {
  const { gems, spend } = useEconomy();
  const { rankIndex } = useDispatchProgress();

  const [owned, setOwned] = useState<string[]>([DEFAULT_SKIN_ID]);
  const [equippedId, setEquippedId] = useState<string>(DEFAULT_SKIN_ID);
  const loaded = useRef(false);

  // Load persisted state once.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const saved = JSON.parse(raw);
            const savedOwned: string[] = Array.isArray(saved.owned)
              ? saved.owned
              : [DEFAULT_SKIN_ID];
            // Always guarantee the default skin is owned.
            const merged = savedOwned.includes(DEFAULT_SKIN_ID)
              ? savedOwned
              : [DEFAULT_SKIN_ID, ...savedOwned];
            setOwned(merged);
            if (
              typeof saved.equippedId === "string" &&
              merged.includes(saved.equippedId)
            ) {
              setEquippedId(saved.equippedId);
            }
          } catch {}
        }
      })
      .finally(() => {
        loaded.current = true;
      });
  }, []);

  // Persist on change.
  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ owned, equippedId })
    ).catch(() => {});
  }, [owned, equippedId]);

  const isOwned = useCallback((id: string) => owned.includes(id), [owned]);

  const unlock = useCallback(
    (id: string): UnlockResult => {
      const skin = getSkin(id);
      if (!skin) return { ok: false, reason: "not_found" };
      if (owned.includes(id)) return { ok: true, reason: "already" };
      if (rankIndex < skin.rankRequired) return { ok: false, reason: "rank" };
      if (skin.gemCost > 0) {
        const paid = spend(skin.gemCost);
        if (!paid) return { ok: false, reason: "gems" };
      }
      setOwned((prev) => (prev.includes(id) ? prev : [...prev, id]));
      return { ok: true, reason: "unlocked" };
    },
    [owned, rankIndex, spend]
  );

  const equip = useCallback(
    (id: string): boolean => {
      if (!owned.includes(id)) return false;
      setEquippedId(id);
      return true;
    },
    [owned]
  );

  const reset = useCallback(() => {
    setOwned([DEFAULT_SKIN_ID]);
    setEquippedId(DEFAULT_SKIN_ID);
  }, []);

  return (
    <WardrobeContext.Provider
      value={{ owned, equippedId, isOwned, unlock, equip, reset }}
    >
      {children}
    </WardrobeContext.Provider>
  );
}

export function useWardrobe() {
  return useContext(WardrobeContext);
}
