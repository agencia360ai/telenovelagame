/**
 * Layer AI client — generates 2D avatar-skin images.
 *
 * Layer (app.layer.ai) is a web studio for game art with a REST API. In this
 * project Layer is the source of the 2D avatar skins shown in the Wardrobe.
 *
 * TWO WAYS TO USE LAYER — both are supported, pick per your workflow:
 *
 *   1) MANUAL (recommended to start, zero code):
 *      Generate each skin in the Layer web app, export the PNG, host it
 *      (Supabase Storage or any CDN — see EXPO_PUBLIC_CDN_BASE), and paste the
 *      URL into the SKINS registry in src/game/assets.ts. No API key needed.
 *
 *   2) PROGRAMMATIC (optional): set EXPO_PUBLIC_LAYER_API_KEY and call
 *      generateSkinImage() below. Without a key it returns null and the app
 *      falls back to whatever URL is already in the SKINS registry.
 *
 * NOTE: the exact request/response shape of Layer's generation endpoint depends
 * on your Layer plan and the model you wire up. The call below is intentionally
 * thin and defensive so you can drop in the precise endpoint + body from your
 * Layer dashboard without touching the rest of the app. Confirm the contract in
 * the Layer API docs for your workspace before enabling it in production.
 */
import Constants from "expo-constants";

// Adjust to the generation endpoint shown in your Layer workspace API docs.
const GENERATE_ENDPOINT = "https://api.layer.ai/v1/generate";

function getExtra(): Record<string, any> {
  return (Constants.expoConfig?.extra ?? {}) as Record<string, any>;
}

function getApiKey(): string | null {
  return (getExtra().layerApiKey as string) || null;
}

export function getWorkspaceId(): string | null {
  return (getExtra().layerWorkspaceId as string) || null;
}

/** True when a Layer API key is configured (programmatic generation enabled). */
export function isLayerEnabled(): boolean {
  return Boolean(getApiKey());
}

export type SkinGenOptions = {
  /** The text prompt describing the skin/outfit. */
  prompt: string;
  /** Optional negative prompt. */
  negativePrompt?: string;
  /** Output size; square works best for the avatar crop. */
  width?: number;
  height?: number;
};

/**
 * Generate a single skin image with Layer. Returns a hosted image URL (or a
 * data URI, depending on how your endpoint responds) or null on failure /
 * missing key. Callers should fall back to the SKINS registry on null.
 */
export async function generateSkinImage(
  options: SkinGenOptions
): Promise<string | null> {
  const key = getApiKey();
  if (!key) return null;

  try {
    const res = await fetch(GENERATE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workspaceId: getWorkspaceId(),
        prompt: options.prompt,
        negativePrompt: options.negativePrompt,
        width: options.width ?? 1024,
        height: options.height ?? 1024,
      }),
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    // Be liberal about where the URL lives in the response payload.
    return (
      data?.url ??
      data?.imageUrl ??
      data?.image?.url ??
      data?.output?.[0]?.url ??
      null
    );
  } catch {
    return null;
  }
}
