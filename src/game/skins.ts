/**
 * Avatar skin catalog — the cosmetic economy for the dispatcher avatar.
 *
 * Skins are PURELY cosmetic (identity & status, never gameplay advantage) and
 * come in three tiers, each doing a different monetization job:
 *
 *   "rank"     → unlocked for FREE on reaching a rank. Retention: gives the
 *                free-to-play player a reason to keep ranking up.
 *   "premium"  → bought with gems (hard currency). Direct monetization.
 *   "prestige" → require BOTH a rank AND gems. The most coveted skins — a
 *                player can't get them with money alone or grind alone, which
 *                is exactly why whales pay for them.
 *
 * Images are 2D, generated in Layer AI. Each skin points at an `imageKey` in
 * the SKINS registry (src/game/assets.ts). Until a real Layer URL is pasted
 * there, the avatar renders a styled placeholder — drop the URL in and it
 * lights up automatically (no other changes needed).
 *
 * To add a skin: add an entry here + a key in SKINS in assets.ts. Nothing else.
 */

export type SkinTier = "rank" | "premium" | "prestige";

export type Skin = {
  /** Stable unique id (also the key into the SKINS image registry). */
  id: string;
  name: string;
  description: string;
  tier: SkinTier;
  /**
   * Index into RANKS (src/game/ranks.ts) required to unlock. 0 = no rank gate.
   * Applies to "rank" and "prestige" tiers.
   */
  rankRequired: number;
  /** Gem cost. 0 for "rank" tier. Applies to "premium" and "prestige". */
  gemCost: number;
  /** Accent color used on the wardrobe card (hex string). */
  accent: string;
};

/** The starter skin every player owns and equips from the first launch. */
export const DEFAULT_SKIN_ID = "rookie";

// Starter set — 3 skins, one per tier, all the SAME character (img2img from the
// "rookie" base). Add more later by generating from the same base and appending.
export const SKINS: Skin[] = [
  // ── Rank tier (free default, owned from launch) ───────────────────────────
  {
    id: "rookie",
    name: "Cadete",
    description: "El uniforme estándar de la central. Tu punto de partida.",
    tier: "rank",
    rankRequired: 0,
    gemCost: 0,
    accent: "#64748B",
  },

  // ── Premium tier (gems only) ──────────────────────────────────────────────
  {
    id: "neon_pink",
    name: "Neón Corazón",
    description: "El look telenovela: dramático, rosado y sin disculpas.",
    tier: "premium",
    rankRequired: 0,
    gemCost: 40,
    accent: "#E91E8C",
  },

  // ── Prestige tier (rank + gems — the flex) ────────────────────────────────
  {
    id: "golden_hero",
    name: "Héroe Dorado",
    description: "Solo para Comandantes que además invierten en su leyenda.",
    tier: "prestige",
    rankRequired: 4, // Commander
    gemCost: 100,
    accent: "#FFD700",
  },
];

const SKIN_BY_ID: Record<string, Skin> = Object.fromEntries(
  SKINS.map((s) => [s.id, s])
);

export function getSkin(id: string): Skin | undefined {
  return SKIN_BY_ID[id];
}

/** Per-player context needed to evaluate whether a skin can be unlocked. */
export type UnlockContext = {
  rankIndex: number;
  gems: number;
  owned: string[];
};

export type SkinStatus =
  | "equipped"
  | "owned"
  | "unlockable" // meets all requirements right now
  | "locked_rank" // rank too low (gems may also be missing)
  | "locked_gems"; // rank ok but not enough gems

export function getSkinStatus(
  skin: Skin,
  ctx: UnlockContext,
  equippedId: string
): SkinStatus {
  if (skin.id === equippedId) return "equipped";
  if (ctx.owned.includes(skin.id)) return "owned";
  if (ctx.rankIndex < skin.rankRequired) return "locked_rank";
  if (ctx.gems < skin.gemCost) return "locked_gems";
  return "unlockable";
}

/** True only when rank AND gem requirements are both satisfied. */
export function canUnlock(skin: Skin, ctx: UnlockContext): boolean {
  return (
    !ctx.owned.includes(skin.id) &&
    ctx.rankIndex >= skin.rankRequired &&
    ctx.gems >= skin.gemCost
  );
}
