/**
 * Avatar skin catalog — cosmetic identity for the dispatcher avatar.
 *
 * Two genders (picked on first launch, switchable in the wardrobe). For now
 * skins are gated ONLY by rank: your "base" skin upgrades automatically as you
 * rank up. Gems stay in the codebase but are NOT used to unlock skins yet.
 *
 * Each skin points at an `imageKey` in SKIN_IMAGES (src/game/assets.ts).
 */

export type Gender = "female" | "male";
export type SkinTier = "rank" | "premium" | "prestige";

export type Skin = {
  id: string;
  gender: Gender;
  name: string;
  description: string;
  tier: SkinTier;
  /** Index into RANKS required to unlock (0 = from the start). */
  rankRequired: number;
  /** Gem cost. Kept for the future; currently always 0 (rank-gated only). */
  gemCost: number;
  accent: string;
};

/** Default (rank-0) skin id per gender. */
export const DEFAULT_SKIN_BY_GENDER: Record<Gender, string> = {
  female: "f_basic",
  male: "m_basic",
};
/** Back-compat default id. */
export const DEFAULT_SKIN_ID = "f_basic";

// Three looks per gender, mapped to rank milestones (basic → sergeant → dress).
export const SKINS: Skin[] = [
  // ── Female ────────────────────────────────────────────────────────────────
  { id: "f_basic",   gender: "female", name: "Patrol Officer", description: "Standard patrol uniform. Your starting look on the floor.", tier: "rank", rankRequired: 0, gemCost: 0, accent: "#64748B" },
  { id: "f_sgt",     gender: "female", name: "Sergeant",       description: "Sergeant's stripes. You run the room with ease now.",       tier: "rank", rankRequired: 2, gemCost: 0, accent: "#3D7BD6" },
  { id: "f_officer", gender: "female", name: "Dress Officer",  description: "Full dress uniform with medals. A floor legend.",           tier: "rank", rankRequired: 4, gemCost: 0, accent: "#FFD700" },

  // ── Male ──────────────────────────────────────────────────────────────────
  { id: "m_basic",   gender: "male", name: "Patrol Officer", description: "Standard patrol uniform. Your starting look on the floor.", tier: "rank", rankRequired: 0, gemCost: 0, accent: "#64748B" },
  { id: "m_sgt",     gender: "male", name: "Sergeant",       description: "Sergeant's stripes. You run the room with ease now.",       tier: "rank", rankRequired: 2, gemCost: 0, accent: "#3D7BD6" },
  { id: "m_officer", gender: "male", name: "Dress Officer",  description: "Full dress uniform with medals. A floor legend.",           tier: "rank", rankRequired: 4, gemCost: 0, accent: "#FFD700" },

  // ── Premium (bought with gems, available at any rank) ───────────────────────
  { id: "f_sport", gender: "female", name: "Sport", description: "Sporty look, ready for action.", tier: "premium", rankRequired: 0, gemCost: 100, accent: "#22C55E" },
  { id: "m_sport", gender: "male",   name: "Sport", description: "Sporty look, ready for action.", tier: "premium", rankRequired: 0, gemCost: 100, accent: "#22C55E" },
  { id: "f_santa", gender: "female", name: "Santa", description: "Limited holiday edition. 🎅",     tier: "premium", rankRequired: 0, gemCost: 150, accent: "#E11D48" },
  { id: "m_santa", gender: "male",   name: "Santa", description: "Limited holiday edition. 🎅",     tier: "premium", rankRequired: 0, gemCost: 150, accent: "#E11D48" },
];

const SKIN_BY_ID: Record<string, Skin> = Object.fromEntries(
  SKINS.map((s) => [s.id, s])
);

export function getSkin(id: string): Skin | undefined {
  return SKIN_BY_ID[id];
}

/** All skins for a gender: rank skins first (by rank), premium (gem) last. */
export function skinsForGender(gender: Gender): Skin[] {
  const tierOrder = (s: Skin) => (s.tier === "rank" ? 0 : 1);
  return SKINS.filter((s) => s.gender === gender).sort(
    (a, b) =>
      tierOrder(a) - tierOrder(b) ||
      a.rankRequired - b.rankRequired ||
      a.gemCost - b.gemCost
  );
}

/** The skin a player should wear at a given rank (highest unlocked).
 *  Only rank-tier skins auto-equip; premium (gem) skins are never auto-worn. */
export function baseSkinForRank(gender: Gender, rankIndex: number): string {
  const list = skinsForGender(gender).filter((s) => s.tier === "rank");
  let pick = list[0];
  for (const s of list) {
    if (rankIndex >= s.rankRequired) pick = s;
  }
  return pick ? pick.id : DEFAULT_SKIN_BY_GENDER[gender];
}

export type UnlockContext = {
  rankIndex: number;
  gems: number;
  owned: string[];
};

export type SkinStatus =
  | "equipped"
  | "owned"
  | "unlockable"
  | "locked_rank"
  | "locked_gems";

/** Status of a skin for the current player.
 *  - rank skins: unlocked by reaching the required rank.
 *  - premium skins: bought with gems (then "owned"); otherwise "unlockable"
 *    when affordable or "locked_gems" when the player can't afford it yet. */
export function getSkinStatus(
  skin: Skin,
  ctx: UnlockContext,
  equippedId: string
): SkinStatus {
  if (skin.id === equippedId) return "equipped";
  if (skin.tier === "rank") {
    return ctx.rankIndex < skin.rankRequired ? "locked_rank" : "owned";
  }
  // premium (gem) skins
  if (ctx.owned.includes(skin.id)) return "owned";
  return ctx.gems >= skin.gemCost ? "unlockable" : "locked_gems";
}

export function canUnlock(skin: Skin, ctx: UnlockContext): boolean {
  return ctx.rankIndex >= skin.rankRequired;
}
