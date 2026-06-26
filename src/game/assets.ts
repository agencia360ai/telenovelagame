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
// Two roles per scene:
//   "<id>"        → looping background shown DURING the call
//   "<id>-intro"  → full-screen cinematic that plays ONCE before the dialogue
// Host the files (Supabase Storage recommended — see docs/CONTENT_GUIDE.md),
// then paste the public URL here. Dropbox share links work too: end them with
// `?dl=1` so they serve the raw mp4.
export const VIDEOS: Record<string, string | number> = {
  // In-call looping backgrounds (still streamed from Dropbox; large originals).
  "border-runners":
    "https://www.dropbox.com/scl/fi/29p7w6ahmv04qsk3aok24/M-1.mp4?rlkey=jrtt9h9fdwaxc0rkznfs8xp88&dl=1",
  "kitchen-fire":
    "https://www.dropbox.com/scl/fi/pmt42dbx9upde7diw4lqp/M-2.mp4?rlkey=n01sjuoodnx0ynd6aapq2qu8c&dl=1",
  "armed-robbery":
    "https://www.dropbox.com/scl/fi/sgpnw5olpjle9k89gpoqu/M-3.mp4?rlkey=v9e6nxyzng47d1686wew2kyoc&dl=1",
  // Scene video for the "My Kitchen's on Fire" call (caso_cocina).
  "kitchen-on-fire":
    "https://www.dropbox.com/scl/fi/jevsjs3f94pz7aylcojsv/Kitchen-is-on-Fire.mp4?rlkey=gcccxx54we2kmh5t6k41elbz9&dl=1",
  // Scene video for the "I Saw a Zombie" call (call_zombie).
  "call-zombie":
    "https://yonldczzykpqktepipzi.supabase.co/storage/v1/object/public/911%20Clips/Zombie.mp4",
  // Scene video for the "Help, it smells like gas!" call.
  "call-gas":
    "https://yonldczzykpqktepipzi.supabase.co/storage/v1/object/public/911%20Clips/Gas.mp4",
  // Scene video for the "I Can't Pay My Debt" call.
  "call-debt":
    "https://yonldczzykpqktepipzi.supabase.co/storage/v1/object/public/911%20Clips/prankch.mp4",
  // Scene video for the "I Need Bitcoins" call.
  "call-bitcoin-need":
    "https://yonldczzykpqktepipzi.supabase.co/storage/v1/object/public/911%20Clips/ManPhone.mp4",
  // Scene video for the "My cat is stuck on a tall tree" call.
  "call-cat-tree":
    "https://yonldczzykpqktepipzi.supabase.co/storage/v1/object/public/911%20Clips/Gato.mp4",
  // Scene video for the "I'm Having a Heart Attack" call.
  "call-heart-attack":
    "https://yonldczzykpqktepipzi.supabase.co/storage/v1/object/public/911%20Clips/Presion.mp4",
  // Lobby viewport clips: idle desk vs. an incoming call ringing.
  "lobby-idle":
    "https://yonldczzykpqktepipzi.supabase.co/storage/v1/object/public/911%20Clips/Lobby.mp4",
  "lobby-ringing":
    "https://yonldczzykpqktepipzi.supabase.co/storage/v1/object/public/911%20Clips/LobbyCall.mp4",

  // Full-screen intro cutscenes (telenovela establishing shots). Compressed to
  // 720p (~0.5–2.7 MB each) and BUNDLED so they play instantly with no buffering
  // — the intro is the first thing seen each call. Swap a clip by changing the
  // require() path here.
  "border-runners-intro": require("../../assets/videos/border-runners-intro.mp4"),
  "kitchen-fire-intro": require("../../assets/videos/kitchen-fire-intro.mp4"),
  "armed-robbery-intro": require("../../assets/videos/armed-robbery-intro.mp4"),

  // Opening clip — the first thing shown at app launch, before the prologue.
  "intro-clip":
    "https://yonldczzykpqktepipzi.supabase.co/storage/v1/object/public/911%20Clips/IntroPan.mp4",

  // Per-unit DEPLOY clips — one reusable video per dispatch button, played on
  // the "deploying" beat. fire/police/ambulance stream from Supabase Storage
  // (public bucket "911 Clips"); the rest still use a bundled placeholder.
  // ⬇️ To change a clip: replace the URL between the quotes with any hosted
  //    .mp4 URL (Supabase public URL or Dropbox link ending in `?dl=1`).
  "deploy-firefighters":
    "https://yonldczzykpqktepipzi.supabase.co/storage/v1/object/public/911%20Clips/Bomberos.mp4",
  "deploy-police":
    "https://yonldczzykpqktepipzi.supabase.co/storage/v1/object/public/911%20Clips/Police.mp4",
  "deploy-ambulance":
    "https://yonldczzykpqktepipzi.supabase.co/storage/v1/object/public/911%20Clips/Ambulancia.mp4",
  "deploy-animal_control":
    "https://yonldczzykpqktepipzi.supabase.co/storage/v1/object/public/911%20Clips/Animal%20Control.mp4",
  "deploy-zombie_unit":
    "https://yonldczzykpqktepipzi.supabase.co/storage/v1/object/public/911%20Clips/ZombieUnit.mp4",
  "deploy-dino_control":
    "https://yonldczzykpqktepipzi.supabase.co/storage/v1/object/public/911%20Clips/Jeep.mov",
  "deploy-border_patrol": require("../../assets/videos/border-runners-intro.mp4"),
  "deploy-no_unit": require("../../assets/videos/border-runners-intro.mp4"),
};

/**
 * Reusable deploy clip per dispatch unit. The mission player picks the clip by
 * the unit the operator chose, so every "send fire dept" plays the same fire
 * deploy video, every "send police" the police one, etc. Swap the URLs in
 * VIDEOS above (keys "deploy-<unit>") to give each button its own footage.
 */
export const DEPLOY_VIDEOS: Record<string, string> = {
  firefighters: "deploy-firefighters",
  police: "deploy-police",
  ambulance: "deploy-ambulance",
  animal_control: "deploy-animal_control",
  zombie_unit: "deploy-zombie_unit",
  dino_control: "deploy-dino_control",
  border_patrol: "deploy-border_patrol",
  no_unit: "deploy-no_unit",
};

/** Resolve a CallScenario.video value to something expo-video can play. */
export function resolveVideo(keyOrSource: string | number): string | number {
  if (typeof keyOrSource === "number") return keyOrSource;

  const direct = VIDEOS[keyOrSource];
  if (direct) return direct; // a known key with a real URL

  // An "-intro" key that hasn't been hosted yet (empty string): fall back to
  // the scene's base video so the cinematic still plays. Paste the real intro
  // URL into VIDEOS later and it upgrades automatically — no other changes.
  if (keyOrSource.endsWith("-intro")) {
    const base = keyOrSource.slice(0, -"-intro".length);
    if (VIDEOS[base]) return VIDEOS[base];
  }

  return keyOrSource; // assume it's already a raw http(s) URL
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

// ── Cinematic stills (placeholders) ──────────────────────────────────────────
// Full-screen "film" images used where a real video clip doesn't exist yet
// (boot intro, rank-up, result). A value may be a require() number (bundled) or
// a remote URL.
export const IMAGES: Record<string, number | string> = {
  "dispatch-center":
    "https://media.app.layer.ai/workspaces/48383e6c-48d9-40cd-801b-2e20b2e8d7a4/files/af5f73dc-65d2-4de9-a817-dad7518bfbd7/cinematic_establishing_shot_of_a_911_emergency_dispatch_center_at-2026-06-18-233301.png",
  "rank-up":
    "https://media.app.layer.ai/workspaces/48383e6c-48d9-40cd-801b-2e20b2e8d7a4/files/5dabd7fb-87dc-41c0-92cf-d0ba598788b2/cinematic_celebratory_hero_shot_of_a_proud_911_dispatch_operator-2026-06-18-234906.png",
};

/** Resolve an IMAGES key (or raw value) to a React Native image source. */
export function resolveImage(
  keyOrSource: number | string
): number | { uri: string } {
  if (typeof keyOrSource === "number") return keyOrSource;
  const found = IMAGES[keyOrSource];
  if (typeof found === "number") return found;
  if (typeof found === "string" && found) return { uri: found };
  return { uri: keyOrSource };
}

// ── 3D models (bundled GLB or remote URL) ────────────────────────────────────
export const MODELS: Record<string, string | number> = {
  officer: require("../../assets/models/officer.glb"),
};

/** Resolve a MODELS key, require() number, or raw URL to a loadable source. */
export function resolveModel(
  keyOrSource: string | number
): number | { uri: string } {
  if (typeof keyOrSource === "number") return keyOrSource;
  const found = MODELS[keyOrSource];
  if (typeof found === "number") return found;
  if (typeof found === "string" && found) return { uri: found };
  return { uri: keyOrSource };
}

// ── Avatar skins (2D, full-body, same character) ─────────────────────────────
// One entry per skin id in src/game/skins.ts. Bundled PNGs in assets/skins/.
export const SKIN_IMAGES: Record<string, number | string> = {
  // Female (3 looks, by rank): patrol → sergeant → dress.
  f_basic: require("../../assets/skins/f_basic.png"),
  f_sgt: require("../../assets/skins/f_sgt.png"),
  f_officer: require("../../assets/skins/f_officer.png"),
  // Male (3 looks, by rank).
  m_basic: require("../../assets/skins/m_basic.png"),
  m_sgt: require("../../assets/skins/m_sgt.png"),
  m_officer: require("../../assets/skins/m_officer.png"),
  // Premium skins (bought with gems) — both genders.
  f_sport: require("../../assets/skins/f_Sport.png"),
  m_sport: require("../../assets/skins/m_Sport.png"),
  f_santa: require("../../assets/skins/f_Santa.png"),
  m_santa: require("../../assets/skins/m_Santa.png"),
}

/**
 * Resolve a skin id to a React Native image source, or null when no art has
 * been registered yet (callers should render a placeholder on null).
 */
export function resolveSkin(
  id: string
): number | { uri: string } | null {
  const found = SKIN_IMAGES[id];
  if (typeof found === "number") return found;
  if (typeof found === "string" && found) return { uri: found };
  return null;
}
