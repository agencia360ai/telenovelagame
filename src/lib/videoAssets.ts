import { Asset } from "expo-asset";

const videoModules: Record<string, number> = {
  "videos/ch1/M-1.mp4": require("../../assets/videos/M1.mp4"),
  "videos/ch1/M-2.mp4": require("../../assets/videos/M2.mp4"),
  "videos/ch1/M-3.mp4": require("../../assets/videos/M3.mp4"),
};

export async function resolveVideoUri(key: string): Promise<string | null> {
  const mod = videoModules[key];
  if (mod == null) return null;
  const asset = Asset.fromModule(mod);
  if (!asset.localUri) {
    await asset.downloadAsync();
  }
  return asset.localUri ?? asset.uri;
}

export function getVideoAsset(key: string): number | string {
  return videoModules[key] ?? key;
}
