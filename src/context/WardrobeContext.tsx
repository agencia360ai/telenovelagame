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
  /** Manually equip an unlocked skin of the current gender. */
  equip: (id: string) => boolean;
  reset: () => void;
};

const WardrobeContext = createContext<Wardrobe>({
  ready: false,
  gender: null,
  isChosen: false,
  chooseGender: () => {},
  equippedId: DEFAULT_SKIN_ID,
  equip: () => false,
  reset: () => {},
});

export function WardrobeProvider({ children }: { children: React.ReactNode }) {
  const { rankIndex } = useDispatchProgress();

  const [gender, setGender] = useState<Gender | null>(null);
  const [manualSkin, setManualSkin] = useState<string | null>(null);
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
      JSON.stringify({ gender, manualSkin })
    ).catch(() => {});
  }, [gender, manualSkin]);

  const effectiveGender: Gender = gender ?? "female";

  // The base skin always follows the rank. A manual pick wins only while it's
  // still valid (same gender + rank high enough).
  let equippedId = baseSkinForRank(effectiveGender, rankIndex);
  if (manualSkin) {
    const s = getSkin(manualSkin);
    if (s && s.gender === effectiveGender && rankIndex >= s.rankRequired) {
      equippedId = manualSkin;
    }
  }

  const chooseGender = useCallback((g: Gender) => {
    setGender(g);
    setManualSkin(null);
  }, []);

  const equip = useCallback(
    (id: string): boolean => {
      const s = getSkin(id);
      if (!s || s.gender !== effectiveGender || rankIndex < s.rankRequired) {
        return false;
      }
      setManualSkin(id);
      return true;
    },
    [effectiveGender, rankIndex]
  );

  const reset = useCallback(() => {
    setGender(null);
    setManualSkin(null);
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
