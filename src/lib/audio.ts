import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";
import {
  SFX,
  SFX_VOLUME,
  MUSIC,
  MUSIC_VOLUME,
  type SfxKey,
  type MusicKey,
} from "../game/assets";

/**
 * AudioManager — single source of truth for sound in the game.
 *
 *   audio.init()             once at app start (preloads SFX, sets audio mode)
 *   audio.playSfx("tap")     fire-and-forget one-shots
 *   audio.playMusic("lobby") loop a background bed (no-op if already playing it)
 *   audio.stopMusic()        e.g. when a call video takes over the audio
 *   audio.setMuted(bool)     wired to the Settings sound toggle
 *
 * Every call is wrapped defensively so a missing or broken asset can never crash
 * gameplay — sound is an enhancement, not a dependency.
 */
class AudioManager {
  private sfx: Partial<Record<SfxKey, AudioPlayer>> = {};
  private music: AudioPlayer | null = null;
  private musicKey: MusicKey | null = null;
  private muted = false;
  private initialized = false;

  async init() {
    if (this.initialized) return;
    this.initialized = true;

    try {
      await setAudioModeAsync({ playsInSilentMode: true });
    } catch {
      // older runtimes may not support every field; safe to ignore
    }

    (Object.keys(SFX) as SfxKey[]).forEach((key) => {
      try {
        const player = createAudioPlayer(SFX[key]);
        player.volume = SFX_VOLUME[key] ?? 1;
        this.sfx[key] = player;
      } catch {
        // skip a single bad effect rather than failing the whole preload
      }
    });
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (!this.music) return;
    try {
      if (muted) this.music.pause();
      else this.music.play();
    } catch {}
  }

  playSfx(key: SfxKey) {
    if (this.muted) return;
    const player = this.sfx[key];
    if (!player) return;
    try {
      player.seekTo(0);
      player.play();
    } catch {}
  }

  playMusic(key: MusicKey) {
    // Already looping this bed — just make sure it's audible.
    if (this.musicKey === key && this.music) {
      if (!this.muted) {
        try {
          this.music.play();
        } catch {}
      }
      return;
    }

    this.stopMusic();
    try {
      const player = createAudioPlayer(MUSIC[key]);
      player.loop = true;
      player.volume = MUSIC_VOLUME[key] ?? 0.4;
      this.music = player;
      this.musicKey = key;
      if (!this.muted) player.play();
    } catch {}
  }

  stopMusic() {
    if (!this.music) return;
    try {
      this.music.pause();
      this.music.remove();
    } catch {}
    this.music = null;
    this.musicKey = null;
  }
}

export const audio = new AudioManager();
