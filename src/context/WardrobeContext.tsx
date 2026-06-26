/**
 * WardrobeContext — owns the player's chosen GENDER and equipped avatar skin.
 * Persists to AsyncStorage.
 *
 * For now skins are gated ONLY by rank: the equipped skin follows the player's
 * rank automatically (the "base" skin upgrades as you rank up), unless the
 * player manually picks another unlocked skin of the same gender in the
 * wardrobe. Gender is picked once on first launch and can be switched anytime.
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
import {
  Gender,
  DEFAULT_SKIN_ID,
  getSkin,
  baseSkinForRank,
} from "../game/skins";
import { useDispatchProgress } from "./DispatchProgressContext";

const STORAGE_KEY = "dispatch_wardrobe_v2";

type Wardrobe = {
  /** false until persisted state has loaded (avoids routing flicker). */
  ready: boolean;
  /** null until the player has picked a gender (first launch). */
  gender: Gender | null;
  isChosen: boolean;
  /** Pick / switch gender. Clears any manual skin override. */
  chooseGender: (g: Gender) => void;
  /** The skin currently shown (rank-base, or the manual pick if still valid). */
  equippedId: string;
  /** Manually equip an unlocked/owned skin of the current gender. */
  equip: (id: string) => boolean;
  /** Premium skin ids the player has bought with gems. */
  owned: string[];
  /** Record a premium skin as bought (call after spending gems). */
  addOwned: (id: string) => void;
  reset: () => void;
};

const WardrobeContext = createContext<Wardrobe>({
  ready: false,
  gender: null,
  isChosen: false,
  chooseGender: () => {},
  equippedId: DEFAULT_SKIN_ID,
  equip: () => false,
  owned: [],
  addOwned: () => {},
  reset: () => {},
});

export function WardrobeProvider({ children }: { children: React.ReactNode }) {
  const { rankIndex } = useDispatchProgress();

  const [gender, setGender] = useState<Gender | null>(null);
  const [manualSkin, setManualSkin] = useState<string | null>(null);
  const [owned, setOwned] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const saved = JSON.parse(raw);
            if (saved.gender === "female" || saved.gender === "male") {
              setGender(saved.gender);
            }
            if (typeof saved.manualSkin === "string") {
              setManualSkin(saved.manualSkin);
            }
            if (Array.isArray(saved.owned)) {
              setOwned(saved.owned.filter((x: unknown) => typeof x === "string"));
            }
          } catch {}
        }
      })
      .finally(() => {
        loaded.current = true;
        setReady(true);
      });
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ gender, manualSkin, owned })
    ).catch(() => {});
  }, [gender, manualSkin, owned]);

  const effectiveGender: Gender = gender ?? "male";

  // Is a skin available to wear? Rank skins need the rank; premium skins must
  // have been bought (in `owned`).
  const isUnlocked = (s: ReturnType<typeof getSkin>): boolean => {
    if (!s || s.gender !== effectiveGender) return false;
    return s.tier === "rank" ? rankIndex >= s.rankRequired : owned.includes(s.id);
  };

  // The base skin always follows the rank. A manual pick wins only while it's
  // still valid (same gender + still unlocked).
  let equippedId = baseSkinForRank(effectiveGender, rankIndex);
  if (manualSkin) {
    const s = getSkin(manualSkin);
    if (isUnlocked(s)) equippedId = manualSkin;
  }

  const chooseGender = useCallback((g: Gender) => {
    setGender(g);
    setManualSkin(null);
  }, []);

  const equip = useCallback(
    (id: string): boolean => {
      const s = getSkin(id);
      if (!isUnlocked(s)) return false;
      setManualSkin(id);
      return true;
    },
    [effectiveGender, rankIndex, owned]
  );

  const addOwned = useCallback((id: string) => {
    setOwned((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const reset = useCallback(() => {
    setGender(null);
    setManualSkin(null);
    setOwned([]);
  }, []);

  return (
    <WardrobeContext.Provider
      value={{
        ready,
        gender,
        isChosen: gender !== null,
        chooseGender,
        equippedId,
        equip,
        owned,
        addOwned,
        reset,
      }}
    >
      {children}
    </WardrobeContext.Provider>
  );
}

export function useWardrobe() {
  return useContext(WardrobeContext);
}
