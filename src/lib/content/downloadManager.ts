/**
 * Progressive download / cache manager.
 *
 * Keeps the next few missions' media on disk so the player never waits, while
 * the rest of the catalog stays in the cloud and streams on first use. Uses
 * expo-file-system (legacy API). The module is loaded lazily and every function
 * no-ops gracefully when the dependency or a cache directory isn't available —
 * so enabling cloud content is a config change, not a code change.
 *
 * To enable:  npx expo install expo-file-system   (+ EXPO_PUBLIC_REMOTE_CONTENT)
 */
import { ManifestEntry, AssetEntry } from "./types";

/** Default on-device cache budget for downloaded media. */
export const DEFAULT_CACHE_BUDGET_BYTES = 300 * 1024 * 1024; // 300 MB
/** How many missions ahead of the player to keep warm. */
export const DEFAULT_PREFETCH_AHEAD = 3;

type Fs = any;

let _fs: Fs | null | undefined;
function getFs(): Fs | null {
  if (_fs !== undefined) return _fs;
  try {
    // Literal require so Metro can resolve it once the package is installed;
    // wrapped so an absent dependency simply disables the feature.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _fs = require("expo-file-system/legacy");
  } catch {
    _fs = null;
  }
  return _fs;
}

function root(fs: Fs): string {
  return `${fs.cacheDirectory}missions/`;
}

function extFromUrl(url: string): string {
  const clean = url.split("?")[0];
  const dot = clean.lastIndexOf(".");
  const slash = clean.lastIndexOf("/");
  return dot > slash ? clean.slice(dot) : "";
}

function localPath(fs: Fs, missionId: string, asset: AssetEntry): string {
  const ext = asset.url ? extFromUrl(asset.url) : "";
  return `${root(fs)}${missionId}/${asset.key}${ext}`;
}

async function ensureDir(fs: Fs, dir: string): Promise<void> {
  const info = await fs.getInfoAsync(dir);
  if (!info.exists) await fs.makeDirectoryAsync(dir, { intermediates: true });
}

async function isCached(
  fs: Fs,
  path: string,
  expectedBytes?: number
): Promise<boolean> {
  const info = await fs.getInfoAsync(path);
  if (!info.exists) return false;
  if (expectedBytes && expectedBytes > 0 && info.size) {
    return info.size === expectedBytes;
  }
  return true;
}

/** Download one asset to the cache if it isn't already there. */
export async function ensureAssetCached(
  missionId: string,
  asset: AssetEntry
): Promise<string | null> {
  const fs = getFs();
  if (!fs || !asset.url) return null;
  try {
    const path = localPath(fs, missionId, asset);
    if (await isCached(fs, path, asset.bytes)) return path;
    await ensureDir(fs, `${root(fs)}${missionId}/`);
    const res = await fs.downloadAsync(asset.url, path);
    return res?.uri ?? path;
  } catch {
    return null;
  }
}

/**
 * Ensure assets for missions [currentIndex .. currentIndex + ahead] are on
 * disk. Downloads the nearest mission first; skips already-cached files.
 */
export async function prefetchWindow(
  manifest: ManifestEntry[],
  currentIndex: number,
  ahead = DEFAULT_PREFETCH_AHEAD
): Promise<void> {
  const fs = getFs();
  if (!fs) return;
  const end = Math.min(manifest.length, currentIndex + ahead + 1);
  for (let i = currentIndex; i < end; i++) {
    const entry = manifest[i];
    if (!entry) continue;
    // Required media first; the rest is best-effort.
    const ordered = [...entry.assets].sort(
      (a, b) => roleWeight(a.role) - roleWeight(b.role)
    );
    for (const asset of ordered) {
      await ensureAssetCached(entry.id, asset);
    }
  }
}

function roleWeight(role: AssetEntry["role"]): number {
  // intro/ambient are needed at the very start of a mission.
  return role === "intro" ? 0 : role === "ambient" ? 1 : 2;
}

/** A cached file:// uri for a media key, or null (caller should stream). */
export async function localUriForKey(
  missionId: string,
  key: string,
  url?: string
): Promise<string | null> {
  const fs = getFs();
  if (!fs) return null;
  try {
    const asset: AssetEntry = {
      key,
      type: "video",
      role: "ambient",
      url: url ?? null,
      bytes: 0,
      checksum: null,
    };
    const path = localPath(fs, missionId, asset);
    const info = await fs.getInfoAsync(path);
    return info.exists ? info.uri : null;
  } catch {
    return null;
  }
}

/** Drop oldest mission caches until total size is under the budget. */
export async function evictBeyondBudget(
  maxBytes = DEFAULT_CACHE_BUDGET_BYTES
): Promise<void> {
  const fs = getFs();
  if (!fs) return;
  try {
    const base = root(fs);
    const baseInfo = await fs.getInfoAsync(base);
    if (!baseInfo.exists) return;

    const dirs: string[] = await fs.readDirectoryAsync(base);
    const entries: { path: string; size: number; mtime: number }[] = [];
    for (const dir of dirs) {
      const dirPath = `${base}${dir}`;
      const info = await fs.getInfoAsync(dirPath, { size: true });
      entries.push({
        path: dirPath,
        size: info.size ?? 0,
        mtime: info.modificationTime ?? 0,
      });
    }
    let total = entries.reduce((sum, e) => sum + e.size, 0);
    if (total <= maxBytes) return;

    // Oldest first.
    entries.sort((a, b) => a.mtime - b.mtime);
    for (const e of entries) {
      if (total <= maxBytes) break;
      await fs.deleteAsync(e.path, { idempotent: true });
      total -= e.size;
    }
  } catch {
    // best-effort
  }
}

/** Wipe the entire mission media cache. */
export async function clearCache(): Promise<void> {
  const fs = getFs();
  if (!fs) return;
  try {
    await fs.deleteAsync(root(fs), { idempotent: true });
  } catch {}
}
