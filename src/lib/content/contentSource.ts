import Constants from "expo-constants";
import { supabase, getMediaUrl } from "../supabase";
import { RemoteManifest, ManifestEntry, AssetEntry } from "./types";

/**
 * Is cloud content turned on? Requires both a configured Supabase project and
 * the EXPO_PUBLIC_REMOTE_CONTENT flag. Off by default → the app uses the
 * bundled missions and never touches the network.
 */
export function isRemoteContentEnabled(): boolean {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, any>;
  return Boolean(extra.remoteContent) && Boolean(supabase);
}

/**
 * Fetch the ordered catalog (published missions + their assets) from the
 * `content_manifest` view. Returns null when remote content is off or the
 * request fails — callers fall back to the bundled missions.
 */
export async function fetchManifest(): Promise<RemoteManifest | null> {
  if (!isRemoteContentEnabled() || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from("content_manifest")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error || !data) return null;

    return (data as any[]).map((row): ManifestEntry => {
      const assets: AssetEntry[] = (row.assets ?? []).map((a: any) => ({
        ...a,
        // Resolve a usable URL: prefer the stored one, else build it from the
        // CDN/Storage base + key.
        url: a.url ?? getMediaUrl(`missions/${row.id}/${a.key}`),
      }));
      return {
        id: row.id,
        title: row.title,
        difficulty: row.difficulty,
        tags: row.tags ?? [],
        reward: row.reward,
        time_limit_seconds: row.time_limit_seconds,
        locale_default: row.locale_default,
        sort_order: row.sort_order,
        version: row.version,
        checksum: row.checksum,
        definition: row.definition,
        assets,
      };
    });
  } catch {
    return null;
  }
}
