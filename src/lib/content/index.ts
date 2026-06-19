/**
 * Content layer entrypoint — orchestrates cloud catalog sync + prefetch.
 *
 * Wire `bootstrapContent()` into the lobby (fire-and-forget) once cloud content
 * is enabled. It is a no-op until then, so it is safe to call unconditionally:
 *
 *   useEffect(() => { bootstrapContent(getMissionIndex(currentMissionId)); }, []);
 */
import { fetchManifest, isRemoteContentEnabled } from "./contentSource";
import {
  prefetchWindow,
  evictBeyondBudget,
  DEFAULT_PREFETCH_AHEAD,
} from "./downloadManager";
import { setMissionCatalog } from "../../content/missions";
import { RemoteManifest } from "./types";

let cachedManifest: RemoteManifest | null = null;

export function getManifest(): RemoteManifest | null {
  return cachedManifest;
}

/**
 * Sync the catalog from Supabase (merging cloud missions over the bundled set)
 * and warm the cache for the missions around the player's current position.
 * Safe to call on every lobby visit; no-ops when cloud content is off.
 */
export async function bootstrapContent(currentIndex = 0): Promise<void> {
  if (!isRemoteContentEnabled()) return;
  const manifest = await fetchManifest();
  if (!manifest || manifest.length === 0) return;

  cachedManifest = manifest;
  setMissionCatalog(manifest.map((e) => e.definition));

  // Prefetch the next few missions, then trim the cache to budget.
  await prefetchWindow(manifest, currentIndex, DEFAULT_PREFETCH_AHEAD);
  await evictBeyondBudget();
}

export { isRemoteContentEnabled } from "./contentSource";
export { localUriForKey, clearCache } from "./downloadManager";
export * from "./types";
