/**
 * Streamoji API client — generates 3D avatar GLBs and PNG thumbnails.
 *
 * API endpoints:
 *   POST https://glb.streamoji.com/api/process         → binary GLB
 *   POST https://glb.streamoji.com/api/render-thumbnail → PNG image
 *
 * Requires EXPO_PUBLIC_STREAMOJI_API_KEY. Without a key the helper functions
 * return null and callers fall back to bundled models.
 */
import Constants from "expo-constants";

const GLB_ENDPOINT = "https://glb.streamoji.com/api/process";
const THUMBNAIL_ENDPOINT = "https://glb.streamoji.com/api/render-thumbnail";

/**
 * A Streamoji avatar configuration — asset IDs and color indices that define
 * an avatar's appearance. The exact keys come from the Streamoji catalog;
 * we keep the type open so content authors can paste configs verbatim.
 */
export type AvatarConfig = Record<string, string | number | boolean>;

function getApiKey(): string | null {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, any>;
  return (extra.streamojiApiKey as string) || null;
}

export function isStreamojiEnabled(): boolean {
  return Boolean(getApiKey());
}

/**
 * Generate a 3D avatar GLB from a configuration object.
 * Returns the raw ArrayBuffer (suitable for writing to the file system) or
 * null on failure / missing API key.
 */
export async function fetchAvatarGlb(
  config: AvatarConfig
): Promise<ArrayBuffer | null> {
  const key = getApiKey();
  if (!key) return null;

  try {
    const form = new FormData();
    form.append("options", JSON.stringify(config));

    const res = await fetch(GLB_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!res.ok) return null;
    return res.arrayBuffer();
  } catch {
    return null;
  }
}

/**
 * Generate a PNG thumbnail of an avatar (for 2D previews / chat portraits).
 * Returns a base64 data-URI or null.
 */
export async function fetchAvatarThumbnail(
  config: AvatarConfig
): Promise<string | null> {
  const key = getApiKey();
  if (!key) return null;

  try {
    const form = new FormData();
    form.append("options", JSON.stringify(config));

    const res = await fetch(THUMBNAIL_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
