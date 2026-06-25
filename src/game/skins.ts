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
  { id: "f_basic",   gender: "female", name: "Patrullera",     description: "Uniforme de patrulla. Tu punto de partida en la central.", tier: "rank", rankRequired: 0, gemCost: 0, accent: "#64748B" },
  { id: "f_sgt",     gender: "female", name: "Sargenta",       description: "Galones de sargenta. Ya manejas la sala con soltura.",     tier: "rank", rankRequired: 2, gemCost: 0, accent: "#3D7BD6" },
  { id: "f_officer", gender: "female", name: "Oficial de Gala", description: "Uniforme de gala con medallas. Una leyenda de la central.", tier: "rank", rankRequired: 4, gemCost: 0, accent: "#FFD700" },

  // ── Male ──────────────────────────────────────────────────────────────────
  { id: "m_basic",   gender: "male", name: "Patrullero",      description: "Uniforme de patrulla. Tu punto de partida en la central.", tier: "rank", rankRequired: 0, gemCost: 0, accent: "#64748B" },
  { id: "m_sgt",     gender: "male", name: "Sargento",        description: "Galones de sargento. Ya manejas la sala con soltura.",     tier: "rank", rankRequired: 2, gemCost: 0, accent: "#3D7BD6" },
  { id: "m_officer", gender: "male", name: "Oficial de Gala", description: "Uniforme de gala con medallas. Una leyenda de la central.", tier: "rank", rankRequired: 4, gemCost: 0, accent: "#FFD700" },
];

const SKIN_BY_ID: Record<string, Skin> = Object.fromEntries(
  SKINS.map((s) => [s.id, s])
);

export function getSkin(id: string): Skin | undefined {
  return SKIN_BY_ID[id];
}

/** All skins for a gender, ordered by rank. */
export function skinsForGender(gender: Gender): Skin[] {
  return SKINS.filter((s) => s.gender === gender).sort(
    (a, b) => a.rankRequired - b.rankRequired
  );
}

/** The skin a player should wear at a given rank (highest unlocked). */
export function baseSkinForRank(gender: Gender, rankIndex: number): string {
  const list = skinsForGender(gender);
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

/** Rank-only status (gems are ignored for now). */
export function getSkinStatus(
  skin: Skin,
  ctx: UnlockContext,
  equippedId: string
): SkinStatus {
  if (skin.id === equippedId) return "equipped";
  if (ctx.rankIndex < skin.rankRequired) return "locked_rank";
  return "owned";
}

export function canUnlock(skin: Skin, ctx: UnlockContext): boolean {
  return ctx.rankIndex >= skin.rankRequired;
}
