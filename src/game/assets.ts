/**
 * Central asset registry.
 *
 * One place that maps logical keys -> where the asset actually lives. Swap a
 * URL here and the whole game updates. Three categories:
 *
 *   VIDEOS  – remote streaming URLs (large files; do NOT bundle them).
 *             Today: Dropbox direct links. Later: a CDN / Supabase Storage.
 *   SFX     – short sound effects, BUNDLED from assets/audio (instant, offline).
 *   MUSIC   – looping background beds, BUNDLED from assets/audio.
 *   MODELS  – 3D models (GLB). Bundled from assets/models or a remote URL.
 *
 * See docs/CONTENT_GUIDE.md for how to add each kind of asset.
 */

// ── Videos (remote) ─────────────────────────────────────────────────────────
export const VIDEOS: Record<string, string> = {
  "border-runners":
    "https://www.dropbox.com/scl/fi/29p7w6ahmv04qsk3aok24/M-1.mp4?rlkey=jrtt9h9fdwaxc0rkznfs8xp88&dl=1",
  "kitchen-fire":
    "https://www.dropbox.com/scl/fi/pmt42dbx9upde7diw4lqp/M-2.mp4?rlkey=n01sjuoodnx0ynd6aapq2qu8c&dl=1",
  "armed-robbery":
    "https://www.dropbox.com/scl/fi/sgpnw5olpjle9k89gpoqu/M-3.mp4?rlkey=v9e6nxyzng47d1686wew2kyoc&dl=1",
};

/** Resolve a CallScenario.video value to something expo-video can play. */
export function resolveVideo(keyOrSource: string | number): string | number {
  if (typeof keyOrSource === "number") return keyOrSource;
  return VIDEOS[keyOrSource] ?? keyOrSource;
}

// ── Sound effects (bundled) ──────────────────────────────────────────────────
export type SfxKey = "tap" | "ring" | "dispatch" | "success" | "fail";

export const SFX: Record<SfxKey, number> = {
  tap: require("../../assets/audio/tap.wav"),
  ring: require("../../assets/audio/ring.wav"),
  dispatch: require("../../assets/audio/dispatch.wav"),
  success: require("../../assets/audio/success.wav"),
  fail: require("../../assets/audio/fail.wav"),
};

export const SFX_VOLUME: Record<SfxKey, number> = {
  tap: 0.4,
  ring: 0.7,
  dispatch: 0.6,
  success: 0.7,
  fail: 0.6,
};

// ── Music beds (bundled, looping) ────────────────────────────────────────────
export type MusicKey = "lobby";

export const MUSIC: Record<MusicKey, number> = {
  lobby: require("../../assets/audio/music-lobby.wav"),
};

export const MUSIC_VOLUME: Record<MusicKey, number> = {
  lobby: 0.5,
};

// ── 3D models (bundled GLB or remote URL) ────────────────────────────────────
export const MODELS: Record<string, string | number> = {
  officer: require("../../assets/models/officer.glb"),
};
