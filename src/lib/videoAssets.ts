const videoAssets: Record<string, number> = {
  "videos/ch1/M-1.mp4": require("../../assets/videos/M 1.mp4"),
  "videos/ch1/M-2.mp4": require("../../assets/videos/M 2.mp4"),
  "videos/ch1/M-3.mp4": require("../../assets/videos/M 3.mp4"),
};

export function getVideoAsset(key: string): number | string {
  return videoAssets[key] ?? key;
}
